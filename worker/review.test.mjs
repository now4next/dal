import test from 'node:test';
import assert from 'node:assert/strict';
import { DatabaseSync } from 'node:sqlite';
import { readFileSync } from 'node:fs';
import worker from './index.mjs';
import { ROLES, validateReview, POLICY_VERSION } from '../src/lib/gangrim-policy.mjs';
import { validateQuestion, validateFeedback } from './briefing.mjs';
import {normalizeReadiness,readinessOf} from '../src/lib/readiness.mjs';
import {translate} from '../src/lib/decision-copy.mjs';

const report=()=>({title:'검증용 가상 보고',author:'테스트',role:ROLES[0],question:'시범 운영 여부',context:'목표: 시간 30% 절감',evidence:'내부 측정 보고서 1쪽',alternatives:'현행 유지 또는 시범',risks:'정확성 저하, 사람 검수',plan:'담당자 A, 4주',verification:'전후 비교 및 오류 점검',deadline:new Date(Date.now()+86400000).toISOString(),consent:true});
const points=(n=19)=>Object.fromEntries(['decision','evidence','value','feasibility','execution'].map(id=>[id,{score:n,basis:'테스트 제출자료 1쪽',actions:n<19?['추적 가능한 검증 자료 추가']:[]}]));
const ready=()=>({readiness:points(),verdict:'ready',summary:'테스트 전용 응답',findings:[{statement:'목표 제시',evidence:'배경 항목'}],unknowns:[],blockers:[],feedback:[],questions:[],recommendation:'최종 결정 요청 준비'});
function fixture(){
  const db=new DatabaseSync(':memory:');db.exec(readFileSync(new URL('migrations/0001.sql',import.meta.url),'utf8'));db.exec(readFileSync(new URL('migrations/0002_briefings.sql',import.meta.url),'utf8'));
  const objects=new Map();
  const env={ALLOWED_ORIGINS:'https://dal.fyi',OWNER_TOKEN:'test-owner-credential-only',OPENAI_API_KEY:'test-not-a-real-key',OPENAI_MODEL:'test-model',DB:{async batch(queries){db.exec('BEGIN');try{const results=[];for(const query of queries)results.push(await query.run());db.exec('COMMIT');return results;}catch(error){db.exec('ROLLBACK');throw error;}},prepare(sql){let args=[];const query={bind(...a){args=a;return query;},async first(){return db.prepare(sql).get(...args)||null;},async all(){return {results:db.prepare(sql).all(...args)};},async run(){return {meta:{changes:Number(db.prepare(sql).run(...args).changes)}};}};return query;}},FILES:{async put(key,value){objects.set(key,value);},async get(key){const b=objects.get(key);return b?{async arrayBuffer(){return b.buffer.slice(b.byteOffset,b.byteOffset+b.byteLength);}}:null;}}};
  const call=async(path,method='GET',data,headers={})=>{const res=await worker.fetch(new Request('https://api.test'+path,{method,headers:{Origin:'https://dal.fyi',...headers},body:data===undefined?undefined:JSON.stringify(data)}),env);return {status:res.status,data:await res.json()};};
  return {env,db,call};
}
async function submit(f){const result=await f.call('/api/reports','POST',{report:report(),files:[]});assert.equal(result.status,201);return {...result.data,headers:{'X-Case-Token':result.data.token}};}
function mockReview(fn=ready){const original=globalThis.fetch;globalThis.fetch=async()=>new Response(JSON.stringify({status:'completed',output:[{content:[{type:'output_text',text:JSON.stringify(fn())}]}]}));return()=>{globalThis.fetch=original;};}

test('submitter cannot see another report or owner queue',async()=>{const f=fixture();const a=await submit(f);const b=await submit(f);assert.equal((await f.call(`/api/reports/${a.id}`,'GET',undefined,b.headers)).status,403);assert.equal((await f.call('/api/owner/queue')).status,401);const own=await f.call(`/api/reports/${a.id}`,'GET',undefined,a.headers);assert.equal(own.status,200);assert.equal(own.data.token_hash,undefined);});
test('AI unavailable never creates approval or final request',async()=>{const f=fixture();const a=await submit(f);delete f.env.OPENAI_API_KEY;assert.equal((await f.call(`/api/reports/${a.id}/review`,'POST',{revision:1},a.headers)).status,503);assert.equal((await f.call(`/api/reports/${a.id}/escalate`,'POST',{revision:1},a.headers)).status,409);});
test('latest review required; submitter cannot approve; owner can decide only escalated version',async()=>{const restore=mockReview();try{const f=fixture();const a=await submit(f);const path=`/api/reports/${a.id}`;assert.equal((await f.call(path+'/decision','POST',{revision:1,decision:'approved',reason:'test'},{Authorization:'Bearer '+f.env.OWNER_TOKEN})).status,409);assert.equal((await f.call(path+'/review','POST',{revision:1},a.headers)).data.status,'ready');assert.equal((await f.call(path+'/escalate','POST',{revision:1},a.headers)).data.status,'awaiting_owner');assert.equal((await f.call(path+'/decision','POST',{revision:1,decision:'approved',reason:'test'},a.headers)).status,403);const queue=await f.call('/api/owner/queue','GET',undefined,{Authorization:'Bearer '+f.env.OWNER_TOKEN});assert.equal(queue.data.items.length,1);assert.equal((await f.call(path+'/decision','POST',{revision:1,decision:'approved',reason:'검증 완료'},{Authorization:'Bearer '+f.env.OWNER_TOKEN})).data.status,'approved');assert.equal((await f.call(path,'PUT',{revision:1,report:report(),files:[]},a.headers)).status,409);}finally{restore();}});
test('revisions invalidate approval and preserve audit snapshot',async()=>{const restore=mockReview();try{const f=fixture();const a=await submit(f);const path=`/api/reports/${a.id}`;await f.call(path+'/review','POST',{revision:1},a.headers);assert.equal((await f.call(path,'PUT',{revision:1,report:report(),files:[]},a.headers)).data.revision,2);const fresh=(await f.call(path,'GET',undefined,a.headers)).data;assert.equal(fresh.review,null);assert.equal(fresh.status,'submitted');assert.equal(JSON.parse(fresh.events[1].detail).policy,POLICY_VERSION);assert.ok(JSON.parse(fresh.events.at(-1).detail).body);assert.equal((await f.call(path+'/escalate','POST',{revision:2},a.headers)).status,409);assert.equal((await f.call(path+'/review','POST',{revision:1},a.headers)).status,409);}finally{restore();}});
test('uncertainty and missing evidence cannot be approved by model',()=>{assert.equal(validateReview({...ready(),unknowns:['未検証']}).verdict,'needs_revision');assert.equal(validateReview({...ready(),findings:[]}).verdict,'needs_revision');assert.throws(()=>validateReview({...ready(),findings:[{statement:'claim',evidence:''}]}));});
test('invalid AI output fails closed',async()=>{const restore=mockReview(()=>({verdict:'ready'}));try{const f=fixture();const a=await submit(f);assert.equal((await f.call(`/api/reports/${a.id}/review`,'POST',{revision:1},a.headers)).status,502);assert.equal((await f.call(`/api/reports/${a.id}`,'GET',undefined,a.headers)).data.status,'submitted');}finally{restore();}});
test('review result cannot approve concurrently changed document',async()=>{const f=fixture();const a=await submit(f);const original=globalThis.fetch;let release;let entered;const started=new Promise(resolve=>entered=resolve);globalThis.fetch=async()=>{entered();await new Promise(resolve=>release=resolve);return new Response(JSON.stringify({status:'completed',output:[{content:[{type:'output_text',text:JSON.stringify(ready())}]}]}));};try{const pending=f.call(`/api/reports/${a.id}/review`,'POST',{revision:1},a.headers);await started;assert.equal((await f.call(`/api/reports/${a.id}`,'PUT',{revision:1,report:report(),files:[]},a.headers)).status,200);release();assert.equal((await pending).status,409);const row=(await f.call(`/api/reports/${a.id}`,'GET',undefined,a.headers)).data;assert.equal(row.revision,2);assert.equal(row.review,null);}finally{globalThis.fetch=original;}});
test('public submission limits and malformed attachments',async()=>{const f=fixture();const invalid=report();invalid.consent=false;assert.equal((await f.call('/api/reports','POST',{report:invalid})).status,400);assert.equal((await f.call('/api/reports','POST',{report:report(),files:[{name:'evil.pdf',data:btoa('not pdf')}]})).status,400);for(let i=0;i<9;i++)assert.equal((await f.call('/api/reports','POST',{report:report()})).status,201);assert.equal((await f.call('/api/reports','POST',{report:report()})).status,429);});
test('untrusted origins cannot change reports',async()=>{const f=fixture();assert.equal((await f.call('/api/reports','POST',{report:report()},{Origin:'https://evil.test'})).status,403);});

const focus=()=>({readiness:points(10),decision:'추가 개발 여부',issue:'지불 의향 미확인',question:'실제로 돈을 내겠다는 고객을 확인하셨습니까?'});
const critique=()=>({next_question:'',review:ready(),weakness:'고객 수요 검증 부족',basis:'브리핑의 고객 인터뷰 미실시 항목',improvement:'실제 고객으로 검증 범위를 좁혀주세요.',tasks:['고객의 지불 의향 검증 결과를 보고해주세요.'],report:{executive_summary:'테스트용 대표 보고 핵심 요약',question:'추가 개발 여부',context:'고객 인터뷰 미실시',evidence:'미확인',alternatives:'시범 또는 보류',risks:'수요 부족',plan:'담당자 미확정',verification:'고객 인터뷰 예정'}});
async function briefing(f){const r=await f.call('/api/briefings','POST',{message:'고객 인터뷰 없이 AI 진단 서비스를 출시하려 합니다.',role:ROLES[0],consent:true});assert.equal(r.status,201);return {...r.data,headers:{'X-Case-Token':r.data.token},path:'/api/briefings/'+r.data.id};}
test('briefing asks exactly one question, persists answer and feedback, requires confirmation before handoff',async()=>{const f=fixture();const a=await briefing(f);let restore=mockReview(focus);try{
 assert.equal((await f.call(a.path+'/report','POST',{version:1,confirm:true,deadline:report().deadline},a.headers)).status,409);
 const question=await f.call(a.path+'/turn','POST',{version:1,message:''},a.headers);assert.equal(question.status,200);assert.equal(question.data.state.stage,'question');assert.equal(question.data.state.feedback,null);assert.equal(question.data.state.messages.length,2);
 restore();restore=mockReview(critique);
 const answer=await f.call(a.path+'/turn','POST',{version:2,message:'まだ検証していません。'},a.headers);assert.equal(answer.status,200);assert.equal(answer.data.state.stage,'feedback');assert.equal(answer.data.state.messages.length,4);
 assert.equal((await f.call(a.path+'/report','POST',{version:3,confirm:false,deadline:report().deadline},a.headers)).status,409);
 const result=await f.call(a.path+'/report','POST',{version:3,confirm:true,deadline:report().deadline,author:'테스트 보고자'},a.headers);assert.equal(result.status,200);assert.equal(result.data.report_id,a.id);
 const actual=await f.call('/api/reports/'+a.id,'GET',undefined,a.headers);assert.equal(actual.data.review_revision,1);assert.equal(actual.data.events[0].kind,'briefing_confirmed');
 assert.equal((await f.call(a.path+'/turn','POST',{version:4,message:'변경'},a.headers)).status,409);
 assert.equal((await f.call('/api/reports/'+a.id+'/escalate','POST',{revision:1},a.headers)).status,200);
 assert.equal((await f.call('/api/reports/'+a.id+'/decision','POST',{revision:1,decision:'approved',reason:'테스트'},a.headers)).status,403);
 }finally{restore();}});
test('briefing access is isolated and uncertain AI feedback cannot bypass report gate',async()=>{const f=fixture();const a=await briefing(f),b=await briefing(f);assert.equal((await f.call(a.path,'GET',undefined,b.headers)).status,403);let restore=mockReview(focus);try{await f.call(a.path+'/turn','POST',{version:1,message:''},a.headers);restore();restore=mockReview(()=>({...critique(),next_question:'수요를 어떤 근거로 확인하셨습니까?',review:{...ready(),unknowns:['수요 미확인']}}));const r=await f.call(a.path+'/turn','POST',{version:2,message:'수요는 미확인입니다.'},a.headers);assert.equal(r.data.state.feedback.review.verdict,'needs_revision');await f.call(a.path+'/report','POST',{version:3,confirm:true,deadline:report().deadline},a.headers);assert.equal((await f.call('/api/reports/'+a.id+'/escalate','POST',{revision:1},a.headers)).status,409);const resumed=await f.call(a.path,'GET',undefined,a.headers);assert.equal(resumed.data.state.messages.length,4);assert.equal(resumed.data.token_hash,undefined);assert.equal(resumed.data.token,undefined);}finally{restore();}});
test('rebriefing invalidates earlier feedback and stale or duplicate turns are blocked',async()=>{const f=fixture();const a=await briefing(f);let restore=mockReview(focus);try{await f.call(a.path+'/turn','POST',{version:1,message:''},a.headers);restore();restore=mockReview(critique);await f.call(a.path+'/turn','POST',{version:2,message:'답변'},a.headers);restore();restore=mockReview(()=>({...critique(),next_question:'수요를 어떻게 확인하셨습니까?',review:{...ready(),readiness:points(10)}}));const next=await f.call(a.path+'/turn','POST',{version:3,message:'새 검증 자료로 보완 보고'},a.headers);assert.equal(next.data.state.stage,'feedback');assert.equal(next.data.state.feedback.review.readiness.total,50);assert.equal((await f.call(a.path+'/report','POST',{version:3,confirm:true,deadline:report().deadline},a.headers)).status,409);assert.equal((await f.call(a.path+'/turn','POST',{version:3,message:'중복'},a.headers)).status,409);}finally{restore();}});
test('invalid or failed chair response leaves saved briefing recoverable without approval',async()=>{const f=fixture();const a=await briefing(f);const restore=mockReview(()=>({...focus(),question:'고객은요? 예산은요?'}));try{assert.equal((await f.call(a.path+'/turn','POST',{version:1,message:''},a.headers)).status,502);const resumed=await f.call(a.path,'GET',undefined,a.headers);assert.equal(resumed.data.status,'active');assert.equal(resumed.data.version,1);assert.equal(resumed.data.state.messages.length,1);assert.equal((await f.call(a.path+'/report','POST',{version:1,confirm:true},a.headers)).status,409);}finally{restore();}});
test('concurrent chair calls cannot append conflicting turns',async()=>{const f=fixture();const a=await briefing(f);const original=globalThis.fetch;let release,enter;const started=new Promise(r=>enter=r);globalThis.fetch=async()=>{enter();await new Promise(r=>release=r);return new Response(JSON.stringify({status:'completed',output:[{content:[{type:'output_text',text:JSON.stringify(focus())}]}]}));};try{const first=f.call(a.path+'/turn','POST',{version:1,message:''},a.headers);await started;assert.equal((await f.call(a.path+'/turn','POST',{version:1,message:''},a.headers)).status,409);release();assert.equal((await first).status,200);assert.equal((await f.call(a.path,'GET',undefined,a.headers)).data.state.messages.length,2);}finally{globalThis.fetch=original;}});
test('chair schema rejects multi-question output and missing actionable tasks',()=>{assert.throws(()=>validateQuestion({...focus(),question:'누구입니까? 왜입니까?'}));assert.throws(()=>validateFeedback({...critique(),tasks:[]}));});

test('94 is blocked and 95 passes; claimed totals and legacy unscored ready cannot bypass gate',async()=>{
 const f=fixture(),a=await submit(f),path='/api/reports/'+a.id;
 const raw=points();raw.execution={score:18,basis:'검증 책임자 미확인',actions:['검증 책임자 지정']};
 let restore=mockReview(()=>({...ready(),readiness:raw}));try{
   const result=await f.call(path+'/review','POST',{revision:1},a.headers);assert.equal(result.data.review.readiness.total,94);assert.equal(result.data.status,'needs_revision');assert.equal((await f.call(path+'/escalate','POST',{revision:1},a.headers)).status,409);
   const forged={...ready(),readiness:{...normalizeReadiness(raw),total:100}};f.db.prepare("UPDATE reports SET status='ready',review=?,review_revision=1 WHERE id=?").run(JSON.stringify(forged),a.id);
   assert.equal((await f.call(path+'/escalate','POST',{revision:1},a.headers)).status,409);
   const legacy=ready();delete legacy.readiness;f.db.prepare('UPDATE reports SET review=? WHERE id=?').run(JSON.stringify(legacy),a.id);assert.equal((await f.call(path+'/escalate','POST',{revision:1},a.headers)).status,409);
   restore();restore=mockReview(ready);const valid=await f.call(path+'/review','POST',{revision:1},a.headers);assert.equal(valid.data.review.readiness.total,95);assert.equal((await f.call(path+'/escalate','POST',{revision:1},a.headers)).status,200);
 }finally{restore();}
});
test('representative starts thinking explicitly and replies with a reason per project',async()=>{
 const f=fixture(),a=await submit(f),b=await submit(f),path='/api/reports/'+a.id;const auth={Authorization:'Bearer '+f.env.OWNER_TOKEN};const restore=mockReview();try{
 await f.call(path+'/review','POST',{revision:1},a.headers);await f.call(path+'/escalate','POST',{revision:1},a.headers);
 assert.equal((await f.call(path+'/decision','POST',{revision:1,decision:'thinking'},a.headers)).status,403);
 assert.equal((await f.call(path+'/decision','POST',{revision:1,decision:'thinking'},auth)).data.status,'reviewing_owner');
 assert.equal((await f.call(path+'/decision','POST',{revision:1,decision:'approved',reason:''},auth)).status,409);
 assert.equal((await f.call(path+'/decision','POST',{revision:1,decision:'approved',reason:'검증 결과와 자원 계획을 확인했습니다.'},auth)).status,200);
 const own=await f.call(path,'GET',undefined,a.headers);const last=own.data.events.at(-1);assert.equal(last.kind,'owner_decision');assert.equal(JSON.parse(last.detail).reason,'검증 결과와 자원 계획을 확인했습니다.');assert.equal((await f.call(path,'GET',undefined,b.headers)).status,403);
 assert.equal((await f.call('/api/owner/projects')).status,401);assert.equal((await f.call('/api/owner/projects','GET',undefined,auth)).data.items.length,1);
 }finally{restore();}
});
test('representative requests revision; same project reopens, old score invalidates, then can resubmit a new revision',async()=>{
 const f=fixture(),a=await briefing(f);const auth={Authorization:'Bearer '+f.env.OWNER_TOKEN};let restore=mockReview(focus);try{
 await f.call(a.path+'/turn','POST',{version:1,message:''},a.headers);restore();restore=mockReview(critique);await f.call(a.path+'/turn','POST',{version:2,message:'테스트 답변'},a.headers);await f.call(a.path+'/report','POST',{version:3,confirm:true,deadline:report().deadline},a.headers);
 const rp='/api/reports/'+a.id;await f.call(rp+'/escalate','POST',{revision:1},a.headers);assert.equal((await f.call(a.path+'/reopen','POST',{version:4},a.headers)).status,409);
 await f.call(rp+'/decision','POST',{revision:1,decision:'needs_revision',reason:'검증 지표를 보완해주세요.'},auth);
 const project=await f.call(a.path,'GET',undefined,a.headers);assert.equal(project.data.project.decision.reason,'검증 지표를 보완해주세요.');
 const reopened=await f.call(a.path+'/reopen','POST',{version:4},a.headers);assert.equal(reopened.status,200);assert.equal(reopened.data.state.report_id,null);
 const old=await f.call(rp,'GET',undefined,a.headers);assert.equal(old.data.status,'preparing');assert.equal(old.data.review,null);assert.equal(old.data.revision,2);
 assert.equal((await f.call(rp+'/escalate','POST',{revision:2},a.headers)).status,409);assert.equal((await f.call(rp+'/review','POST',{revision:2},a.headers)).status,409);
 const evaluated=await f.call(a.path+'/turn','POST',{version:5,message:'검증 결과 추가'},a.headers);assert.equal(evaluated.status,200);await f.call(a.path+'/report','POST',{version:6,confirm:true,deadline:report().deadline},a.headers);
 assert.equal((await f.call(rp+'/escalate','POST',{revision:2},a.headers)).status,200);const again=await f.call(a.path,'GET',undefined,a.headers);assert.equal(again.data.project.decision,null);
 }finally{restore();}
});
test('new answer invalidates old readiness even when AI fails; retry does not duplicate saved answer',async()=>{
 const f=fixture(),a=await briefing(f);let restore=mockReview(focus);try{await f.call(a.path+'/turn','POST',{version:1,message:''},a.headers);restore();restore=mockReview(critique);await f.call(a.path+'/turn','POST',{version:2,message:'첫 답변'},a.headers);
 restore();restore=mockReview(()=>({bad:'invalid model response'}));assert.equal((await f.call(a.path+'/turn','POST',{version:3,message:'근거가 바뀐 새 답변'},a.headers)).status,502);
 const saved=await f.call(a.path,'GET',undefined,a.headers);assert.equal(saved.data.state.feedback,null);assert.equal(saved.data.state.pending,true);assert.equal(saved.data.state.messages.length,5);assert.equal((await f.call(a.path+'/report','POST',{version:3,confirm:true,deadline:report().deadline},a.headers)).status,409);
 restore();restore=mockReview(critique);const retry=await f.call(a.path+'/turn','POST',{version:3,message:''},a.headers);assert.equal(retry.status,200);assert.equal(retry.data.state.messages.length,6);assert.equal(retry.data.state.pending,false);
 }finally{restore();}
});
test('private attachments require case or representative authentication',async()=>{
 const f=fixture();const submitted=await f.call('/api/reports','POST',{report:report(),files:[{name:'근거.txt',data:btoa('private test evidence')}]});const a=submitted.data,b=await submit(f);const path=`/api/reports/${a.id}/attachments/0`;
 assert.equal((await f.call(path,'GET',undefined,b.headers)).status,403);
 const response=await worker.fetch(new Request('https://api.test'+path,{headers:{Origin:'https://dal.fyi','X-Case-Token':a.token}}),f.env);assert.equal(response.status,200);assert.equal(await response.text(),'private test evidence');assert.ok(response.headers.get('Content-Disposition').includes('UTF-8'));
});
test('malformed or duplicated score criteria are rejected and totals are recomputed',()=>{const good=normalizeReadiness(points());assert.equal(good.total,95);assert.equal(readinessOf({readiness:{...good,total:1}}).total,95);assert.throws(()=>normalizeReadiness({...points(),evidence:{score:21,basis:'자료',actions:[]}}));assert.throws(()=>normalizeReadiness({items:[...good.items.slice(0,4),good.items[0]]}));});
test('decision status cannot commit if its decision reason audit fails',async()=>{const f=fixture(),a=await submit(f),path='/api/reports/'+a.id;const restore=mockReview();try{await f.call(path+'/review','POST',{revision:1},a.headers);await f.call(path+'/escalate','POST',{revision:1},a.headers);f.db.exec("CREATE TRIGGER fail_decision_audit BEFORE INSERT ON events WHEN NEW.kind='owner_decision' BEGIN SELECT RAISE(ABORT,'simulated failure'); END;");const failed=await f.call(path+'/decision','POST',{revision:1,decision:'approved',reason:'테스트 이유'},{Authorization:'Bearer '+f.env.OWNER_TOKEN});assert.notEqual(failed.status,200);const row=await f.call(path,'GET',undefined,a.headers);assert.equal(row.data.status,'awaiting_owner');assert.ok(!row.data.events.some(e=>e.kind==='owner_decision'));}finally{restore();}});

test('English projects retain their language through questions, feedback, handoff and revision',async()=>{
 const f=fixture(),created=await f.call('/api/briefings','POST',{language:'en',message:'Fictional pilot report',role:ROLES[0],consent:true});
 assert.equal(created.data.state.language,'en');assert.equal(created.data.state.author,'Reporter not specified');
 const path='/api/briefings/'+created.data.id,headers={'X-Case-Token':created.data.token},original=globalThis.fetch;const prompts=[];
 globalThis.fetch=async(_url,options)=>{const req=JSON.parse(options.body);prompts.push(req.instructions);const result=req.text.format.name==='chair_question'?{...focus(),question:'What evidence validates the pilot?'}:critique();return new Response(JSON.stringify({status:'completed',output:[{content:[{type:'output_text',text:JSON.stringify(result)}]}]}));};
 try{
  assert.equal((await f.call(path+'/turn','POST',{version:1,message:''},headers)).status,200);
  assert.equal((await f.call(path+'/turn','POST',{version:2,message:'Fictional supporting evidence'},headers)).status,200);
  for(const prompt of prompts){assert.match(prompt,/every user-facing value in English/);assert.doesNotMatch(prompt,/모든 응답은 한국어로/);}
  assert.equal((await f.call(path+'/report','POST',{version:3,confirm:true,author:'Test reporter',deadline:report().deadline},headers)).status,200);
  const rp='/api/reports/'+created.data.id;assert.equal((await f.call(rp,'GET',undefined,headers)).data.body.language,'en');
  await f.call(rp+'/escalate','POST',{revision:1},headers);await f.call(rp+'/decision','POST',{revision:1,decision:'needs_revision',reason:'Add the measured baseline.'},{Authorization:'Bearer '+f.env.OWNER_TOKEN});
  const reopened=await f.call(path+'/reopen','POST',{version:4},headers);assert.match(reopened.data.state.messages.at(-1).text,/CEO revision request: Add the measured baseline/);
 }finally{globalThis.fetch=original;}
});

test('English readiness labels preserve scores, targets and receipt access details',()=>{
 assert.equal(translate('의사결정 명확성  14/20 → 목표 19/20','en'),'Decision clarity 14/20 → Target 19/20');
 assert.equal(translate('95점까지 35점','en'),'35 points to reach 95');
 assert.equal(translate('대표님 생각 중','en'),'CEO reviewing');
 assert.equal(translate('결과 도착','ko'),'결과 도착');
 assert.match(translate('프로젝트번호: 123\n조회키: abc\nhttps://dal.fyi/gangrim/','en'),/Project ID: 123\nProject key: abc/);
 assert.equal(translate('An original user statement','en'),'An original user statement');
});
