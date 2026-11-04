import { POLICY_VERSION, SYSTEM_PROMPT, REVIEW_SCHEMA, validateReport, validateReview, canEscalate, canDecide } from '../src/lib/gangrim-policy.mjs';
import { briefingRoute } from './briefing.mjs';

const enc = new TextEncoder();
const sha = async x => [...new Uint8Array(await crypto.subtle.digest('SHA-256',enc.encode(x)))].map(n=>n.toString(16).padStart(2,'0')).join('');
const secret = () => [...crypto.getRandomValues(new Uint8Array(32))].map(n=>n.toString(16).padStart(2,'0')).join('');
const json = (data,status=200) => new Response(JSON.stringify(data),{status,headers:{'Content-Type':'application/json; charset=utf-8','Cache-Control':'no-store','X-Content-Type-Options':'nosniff'}});
const fail = (msg,status=400) => { throw Object.assign(new Error(msg),{status}); };
const now = () => new Date().toISOString();
async function body(req,max=15000000) {
  let size=0; const parts=[]; const reader=req.body?.getReader(); if(!reader) fail('요청 내용이 없습니다.');
  while(true){const {done,value}=await reader.read(); if(done)break; size+=value.length; if(size>max){await reader.cancel();fail('첨부를 포함한 요청은 15MB 이하만 가능합니다.',413);} parts.push(value);}
  const all=new Uint8Array(size);let offset=0; for(const p of parts){all.set(p,offset);offset+=p.length;}
  try{return JSON.parse(new TextDecoder().decode(all));}catch{fail('올바른 JSON 요청이 필요합니다.');}
}
async function quota(env,key,limit){
  const result=await env.DB.prepare('INSERT INTO quotas(key,count) VALUES(?,1) ON CONFLICT(key) DO UPDATE SET count=count+1 WHERE count < ? RETURNING count').bind(key,limit).first();
  if(!result) fail('오늘 처리 한도에 도달했습니다. 나중에 다시 시도해주세요.',429);
}
async function event(env,id,revision,kind,detail){await env.DB.prepare('INSERT INTO events(report_id,revision,kind,detail,created_at) VALUES(?,?,?,?,?)').bind(id,revision,kind,JSON.stringify(detail),now()).run();}
function owner(req,env){const token=req.headers.get('Authorization')?.replace(/^Bearer /,'');return !!env.OWNER_TOKEN && token===env.OWNER_TOKEN;}
async function access(req,env,id){
  const row=await env.DB.prepare('SELECT * FROM reports WHERE id=?').bind(id).first();
  if(!row)fail('접수 건을 찾을 수 없습니다.',404);
  if(!owner(req,env) && await sha(req.headers.get('X-Case-Token')||'')!==row.token_hash)fail('이 접수 건의 조회 권한이 없습니다.',403);
  return row;
}
function present(row){const {token_hash,...safe}=row;return {...safe,body:JSON.parse(row.body),review:row.review?JSON.parse(row.review):null,files:JSON.parse(row.file_meta)};}
async function attachments(env,id,revision,files){
  if(!Array.isArray(files)||files.length>3)fail('첨부는 최대 3개입니다.');
  const validated=[];let total=0;
  for(const f of files){
    if(typeof f.name!=='string'||f.name.length>180||!(/\.(pdf|docx|txt|md)$/i.test(f.name))||typeof f.data!=='string'||!/^[A-Za-z0-9+/]*={0,2}$/.test(f.data))fail('PDF, DOCX, TXT, MD 파일만 지원합니다.');
    let bytes; try{bytes=Uint8Array.from(atob(f.data),c=>c.charCodeAt(0));}catch{fail('첨부 파일을 읽을 수 없습니다.');}
    total+=bytes.length;if(bytes.length>5000000||total>10000000)fail('파일당 5MB, 합계 10MB 이하로 첨부해주세요.',413);
    const ext=f.name.toLowerCase().split('.').pop();
    if(ext==='pdf'&&new TextDecoder().decode(bytes.slice(0,5))!=='%PDF-')fail('PDF 파일 형식이 올바르지 않습니다.');
    if(ext==='docx'&&(bytes[0]!==80||bytes[1]!==75))fail('DOCX 파일 형식이 올바르지 않습니다.');
    const key=`${id}/${revision}/${crypto.randomUUID()}`;
    validated.push({key,name:f.name,size:bytes.length,bytes});
  }
  const result=[];for(const f of validated){await env.FILES.put(f.key,f.bytes,{httpMetadata:{contentType:'application/octet-stream'}});const {bytes,...meta}=f;result.push(meta);}
  return result;
}
async function review(env,row){
  if(!env.OPENAI_API_KEY||!env.OPENAI_MODEL)fail('AI 검토 연결이 아직 설정되지 않았습니다. 접수 내용은 보관됐으며 검토 승인은 생성되지 않습니다.',503);
  const content=[{type:'input_text',text:'검토할 보고서 데이터:\n'+row.body}];
  for(const f of JSON.parse(row.file_meta)){
    const obj=await env.FILES.get(f.key);if(!obj)fail('첨부가 누락되어 검토를 중단했습니다.',409);
    const bytes=new Uint8Array(await obj.arrayBuffer());
    if(/\.(txt|md)$/i.test(f.name))content.push({type:'input_text',text:`첨부 ${f.name}:\n${new TextDecoder().decode(bytes)}`});
    else{let bin='';for(let i=0;i<bytes.length;i+=16384)bin+=String.fromCharCode(...bytes.subarray(i,i+16384));
      const mime=/\.pdf$/i.test(f.name)?'application/pdf':'application/vnd.openxmlformats-officedocument.wordprocessingml.document';
      content.push({type:'input_file',filename:f.name,file_data:`data:${mime};base64,${btoa(bin)}`});}
  }
  const response=await fetch('https://api.openai.com/v1/responses',{method:'POST',signal:AbortSignal.timeout(90000),headers:{Authorization:`Bearer ${env.OPENAI_API_KEY}`,'Content-Type':'application/json'},body:JSON.stringify({model:env.OPENAI_MODEL,store:false,instructions:SYSTEM_PROMPT,input:[{role:'user',content}],max_output_tokens:4500,text:{format:{type:'json_schema',name:'gangrim_review',strict:true,schema:REVIEW_SCHEMA}}})});
  if(!response.ok)fail('AI 검토 서비스 오류로 통과 처리를 하지 않았습니다. 잠시 후 다시 시도해주세요.',502);
  const result=await response.json();if(result.status!=='completed')fail('AI 검토가 완료되지 않았습니다.',502);
  const text=(result.output||[]).flatMap(x=>x.content||[]).filter(x=>x.type==='output_text').map(x=>x.text).join('');
  try{return validateReview(JSON.parse(text));}catch{fail('AI 검토 결과의 형식 검증에 실패했습니다. 통과 처리되지 않았습니다.',502);}
}
async function route(req,env){
  const path=new URL(req.url).pathname;const method=req.method;
  if(path==='/api/health')return json({configured:!!(env.DB&&env.FILES&&env.OPENAI_API_KEY&&env.OPENAI_MODEL&&env.OWNER_TOKEN),policy:POLICY_VERSION});
  if(!env.DB||!env.FILES)fail('접수 서버가 아직 연결되지 않았습니다.',503);
  if(path==='/api/briefings'||path.startsWith('/api/briefings/'))return briefingRoute(req,env,{body,json,fail,sha,secret,now,quota,attachments,owner});
  if(path==='/api/reports'&&method==='POST'){
    const input=await body(req);const report=validateReport(input.report);
    const key=await sha(req.headers.get('CF-Connecting-IP')||'local');await quota(env,`submit:${now().slice(0,10)}:${key}`,10);
    const id=crypto.randomUUID();const token=secret();const files=await attachments(env,id,1,input.files||[]);const time=now();
    await env.DB.prepare('INSERT INTO reports(id,token_hash,body,file_meta,created_at,updated_at) VALUES(?,?,?,?,?,?)').bind(id,await sha(token),JSON.stringify(report),JSON.stringify(files),time,time).run();
    await event(env,id,1,'submitted',{policy:POLICY_VERSION,body:report,files});return json({id,token,revision:1,status:'submitted'},201);
  }
  if(path==='/api/owner/queue'&&method==='GET'){
    if(!owner(req,env))fail('최종 결정권자 인증이 필요합니다.',401);
    const rows=await env.DB.prepare("SELECT * FROM reports WHERE status='awaiting_owner' AND review_revision=revision ORDER BY updated_at DESC LIMIT 100").all();return json({items:rows.results.map(present)});
  }
  const match=path.match(/^\/api\/reports\/([a-f0-9-]{36})(?:\/(review|escalate|decision))?$/);if(!match)fail('경로를 찾을 수 없습니다.',404);
  const [,id,action]=match;const row=await access(req,env,id);
  if(method==='GET'&&!action){const events=await env.DB.prepare('SELECT revision,kind,detail,created_at FROM events WHERE report_id=? ORDER BY id').bind(id).all();return json({...present(row),events:events.results});}
  const input=await body(req,15000000);
  if(input.revision!==row.revision)fail('보고서 버전이 변경됐습니다. 새로 조회해주세요.',409);
  if(method==='PUT'&&!action){
    if(['awaiting_owner','approved','rejected'].includes(row.status))fail('최종 결정 단계에서는 문서를 수정할 수 없습니다.',409);
    const report=validateReport(input.report);const next=row.revision+1;
    const files=await attachments(env,id,next,input.files||[]);
    const updated=await env.DB.prepare("UPDATE reports SET body=?,file_meta=?,revision=?,status='submitted',review=NULL,review_revision=NULL,updated_at=? WHERE id=? AND revision=? AND status NOT IN ('awaiting_owner','approved','rejected')").bind(JSON.stringify(report),JSON.stringify(files),next,now(),id,row.revision).run();
    if(!updated.meta.changes)fail('다른 변경이 진행됐습니다. 새로 조회해주세요.',409);await event(env,id,next,'revised',{previous:row.revision,body:report,files});return json({status:'submitted',revision:next});
  }
  if(method==='POST'&&action==='review'){
    if(!env.OPENAI_API_KEY||!env.OPENAI_MODEL)fail('AI 연결 설정이 필요합니다. 검토 완료로 처리하지 않았습니다.',503);
    if(['awaiting_owner','approved','rejected','reviewing'].includes(row.status))fail('현재 상태에서는 재검토할 수 없습니다.',409);
    await quota(env,`review:${now().slice(0,10)}:${id}`,3);await quota(env,`ai:${now().slice(0,10)}`,Math.min(500,Math.max(1,Number(env.DAILY_AI_LIMIT)||50)));
    const locked=await env.DB.prepare("UPDATE reports SET status='reviewing',updated_at=? WHERE id=? AND revision=? AND status=?").bind(now(),id,row.revision,row.status).run();
    if(!locked.meta.changes)fail('검토가 이미 진행 중입니다.',409);
    try{const result=await review(env,row);
      if(Date.parse(JSON.parse(row.body).deadline)<=Date.now()){result.verdict='hold';result.blockers.push('검토 중 최종 마감이 경과했습니다. 일정 보완이 필요합니다.');}
      const updated=await env.DB.prepare("UPDATE reports SET review=?,review_revision=?,status=?,updated_at=? WHERE id=? AND revision=? AND status='reviewing'").bind(JSON.stringify(result),row.revision,result.verdict,now(),id,row.revision).run();
      if(!updated.meta.changes)fail('검토 중 문서가 수정돼 결과를 폐기했습니다. 최신 버전을 재검토해주세요.',409);
      await event(env,id,row.revision,'reviewed',{...result,model:env.OPENAI_MODEL,policy:POLICY_VERSION});return json({review:result,revision:row.revision,status:result.verdict});
    }catch(error){await env.DB.prepare("UPDATE reports SET status='submitted' WHERE id=? AND revision=? AND status='reviewing'").bind(id,row.revision).run();throw error;}
  }
  if(method==='POST'&&action==='escalate'){
    if(!canEscalate(row))fail('현재 버전의 강림선생 사전검토 통과가 필요합니다.',409);
    if(Date.parse(JSON.parse(row.body).deadline)<=Date.now())fail('마감이 경과했습니다. 일정을 수정하고 재검토해주세요.',409);
    const result=await env.DB.prepare("UPDATE reports SET status='awaiting_owner',updated_at=? WHERE id=? AND revision=? AND status='ready' AND review_revision=revision").bind(now(),id,row.revision).run();
    if(!result.meta.changes)fail('보고서 상태가 변경됐습니다.',409);await event(env,id,row.revision,'escalated',{});return json({status:'awaiting_owner'});
  }
  if(method==='POST'&&action==='decision'){
    if(!owner(req,env))fail('사람 강병준의 최종 결정 권한이 필요합니다.',403);
    if(!canDecide(row)||!['approved','rejected','needs_revision'].includes(input.decision)||typeof input.reason!=='string'||!input.reason.trim()||input.reason.length>5000)fail('현재 검토 버전과 최종 결정·사유를 확인해주세요.',409);
    const result=await env.DB.prepare("UPDATE reports SET status=?,updated_at=? WHERE id=? AND revision=? AND status='awaiting_owner' AND review_revision=revision").bind(input.decision,now(),id,row.revision).run();
    if(!result.meta.changes)fail('보고서 상태가 변경됐습니다.',409);await event(env,id,row.revision,'owner_decision',{decision:input.decision,reason:input.reason.trim()});return json({status:input.decision});
  }
  fail('허용되지 않은 요청입니다.',405);
}
export default {async fetch(req,env){
  const origin=req.headers.get('Origin');const allowed=(env.ALLOWED_ORIGINS||'https://dal.fyi').split(',').map(s=>s.trim());
  if(origin&&!allowed.includes(origin))return json({error:'허용되지 않은 사이트입니다.'},403);
  if(req.method==='OPTIONS')return new Response(null,{status:204,headers:{'Access-Control-Allow-Origin':origin||allowed[0],'Access-Control-Allow-Methods':'GET,POST,PUT,OPTIONS','Access-Control-Allow-Headers':'Content-Type,Authorization,X-Case-Token','Vary':'Origin'}});
  let response;try{response=await route(req,env);}catch(error){response=json({error:error.status ? error.message : '요청을 처리하지 못했습니다. 입력 내용을 확인하거나 나중에 다시 시도해주세요.'},error.status||400);}
  if(origin)response.headers.set('Access-Control-Allow-Origin',origin);response.headers.set('Vary','Origin');return response;
}};
