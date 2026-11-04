import { SYSTEM_PROMPT, REVIEW_SCHEMA, ROLES, validateReview, validateReport } from '../src/lib/gangrim-policy.mjs';

const strings = keys => ({type:'object',additionalProperties:false,properties:Object.fromEntries(keys.map(k=>[k,{type:'string'}])),required:keys});
export const QUESTION_SCHEMA = strings(['decision','issue','question']);
export const FEEDBACK_SCHEMA = {type:'object',additionalProperties:false,properties:{review:REVIEW_SCHEMA,weakness:{type:'string'},basis:{type:'string'},improvement:{type:'string'},tasks:{type:'array',items:{type:'string'}},report:strings(['question','context','evidence','alternatives','risks','plan','verification'])},required:['review','weakness','basis','improvement','tasks','report']};
const chairPrompt = `\n이 서비스는 회장님 보고 방식의 대화다. 존댓말로 짧고 날카롭게 말하되 모욕하거나 권위로 압박하지 않는다. 브리핑에서 전체 판단을 좌우하는 가장 약한 가정 하나를 겨냥한다. 답에 따라 결정이 달라지는 질문이어야 한다. 흔한 체크리스트나 여러 질문 묶음은 금지다. 이미 답한 것을 다시 묻지 않는다. 충분한 근거가 있으면 강점을 인정하고 억지로 흠을 만들지 않는다. 제출 자료의 사실 주장과 독립 검증은 구분한다. 대화에 없는 이름, 일정, 수치, 동의, 검증 결과를 만들어내지 않는다.`;
export function validateQuestion(value){
  if(!value||['decision','issue','question'].some(k=>typeof value[k]!=='string'||!value[k].trim()||value[k].length>1500))throw Error('핵심 질문 형식 오류');
  if((value.question.match(/[?？]/g)||[]).length!==1 || /[\r\n]/.test(value.question))throw Error('핵심 질문은 한 문장이어야 합니다.');
  return value;
}
export function validateFeedback(value){
  if(!value||['weakness','basis','improvement'].some(k=>typeof value[k]!=='string'||!value[k].trim()||value[k].length>4000))throw Error('피드백 형식 오류');
  if(!Array.isArray(value.tasks)||value.tasks.length<1||value.tasks.length>3||value.tasks.some(x=>typeof x!=='string'||!x.trim()||x.length>2000))throw Error('보완 과제 형식 오류');
  if(!value.report||['question','context','evidence','alternatives','risks','plan','verification'].some(k=>typeof value.report[k]!=='string'||!value.report[k].trim()||value.report[k].length>(['context','evidence'].includes(k)?16000:5000)))throw Error('보고 요약 형식 오류');
  return {...value,review:validateReview(value.review)};
}
async function fileContent(env,files,fail){
  const content=[];
  for(const file of files){
    const obj=await env.FILES.get(file.key);if(!obj)fail('첨부가 누락되어 대화를 중단했습니다.',409);
    const bytes=new Uint8Array(await obj.arrayBuffer());
    if(/\.(txt|md)$/i.test(file.name))content.push({type:'input_text',text:`첨부 ${file.name}:\n${new TextDecoder().decode(bytes)}`});
    else{let bin='';for(let i=0;i<bytes.length;i+=16384)bin+=String.fromCharCode(...bytes.subarray(i,i+16384));const mime=/\.pdf$/i.test(file.name)?'application/pdf':'application/vnd.openxmlformats-officedocument.wordprocessingml.document';content.push({type:'input_file',filename:file.name,file_data:`data:${mime};base64,${btoa(bin)}`});}
  }
  return content;
}
async function ask(env,state,files,phase,fail){
  if(!env.OPENAI_API_KEY||!env.OPENAI_MODEL)fail('AI 연결이 준비되지 않았습니다. 브리핑은 저장되어 있습니다.',503);
  const instruction=phase==='question'
    ? '브리핑을 듣고 의사결정 사안(decision), 가장 중요한 쟁점(issue), 촌철살인의 질문 하나(question)를 작성한다. 지금은 약점 진단이나 과제 목록을 길게 말하지 않는다. 질문은 물음표 하나로 끝나는 한 문장이다. 사전검토 통과나 최종 승인을 하지 않는다.'
    : '직전 핵심 질문과 사용자 답변을 평가한다. 가장 핵심적인 약점(weakness), 브리핑·답변·첨부의 정확한 근거 위치(basis), 개선 방향(improvement), 다음 보고 때 제출할 구체적 과제 1~3개(tasks)를 간결하게 작성한다. report는 전체 대화의 충실한 보고서 초안이다. 미확정 항목은 미확정이라고 쓴다. review는 기존 사전검토 정책에 따른 판단이다. 단순히 답변했다고 통과시키지 않는다. 과제는 통과 건이면 최종 결정에 필요한 실행·검증 항목으로 작성한다.';
  const response=await fetch('https://api.openai.com/v1/responses',{method:'POST',signal:AbortSignal.timeout(90000),headers:{Authorization:`Bearer ${env.OPENAI_API_KEY}`,'Content-Type':'application/json'},body:JSON.stringify({model:env.OPENAI_MODEL,store:false,instructions:SYSTEM_PROMPT+chairPrompt+'\n'+instruction,input:[{role:'user',content:[{type:'input_text',text:JSON.stringify({role:state.role,messages:state.messages})},...await fileContent(env,files,fail)]}],max_output_tokens:phase==='question'?1200:5000,text:{format:{type:'json_schema',name:'chair_'+phase,strict:true,schema:phase==='question'?QUESTION_SCHEMA:FEEDBACK_SCHEMA}}})});
  if(!response.ok)fail('AI 응답을 받지 못했습니다. 저장된 대화에서 다시 시도해주세요.',502);
  const result=await response.json();if(result.status!=='completed')fail('AI 응답이 완료되지 않았습니다. 다시 시도해주세요.',502);
  try{const value=JSON.parse((result.output||[]).flatMap(x=>x.content||[]).filter(x=>x.type==='output_text').map(x=>x.text).join(''));return phase==='question'?validateQuestion(value):validateFeedback(value);}catch{fail('AI 결과 검증에 실패했습니다. 승인 처리하지 않았습니다. 다시 시도해주세요.',502);}
}

export async function briefingRoute(req,env,h){
  const {body,json,fail,sha,secret,now,quota,attachments,owner}=h;
  const path=new URL(req.url).pathname;
  if(path==='/api/briefings'&&req.method==='POST'){
    const input=await body(req);if(input.consent!==true)fail('문서 처리와 AI 검토 안내를 확인해주세요.');
    if(typeof input.message!=='string'||!input.message.trim()||input.message.length>24000)fail('브리핑을 24,000자 이내로 입력해주세요.');
    if(!ROLES.includes(input.role))fail('검토 관점을 선택해주세요.');
    if(input.author!==undefined&&(typeof input.author!=='string'||input.author.length>100))fail('보고자를 100자 이내로 입력해주세요.');
    await quota(env,`submit:${now().slice(0,10)}:${await sha(req.headers.get('CF-Connecting-IP')||'local')}`,10);
    const id=crypto.randomUUID(),token=secret(),time=now();const files=await attachments(env,id,1,input.files||[]);
    const state={stage:'briefing',author:input.author?.trim()||'보고자 미입력',role:input.role,messages:[{role:'user',kind:'briefing',text:input.message.trim(),files:files.map(f=>f.name)}],focus:null,feedback:null,report_id:null};
    await env.DB.prepare('INSERT INTO briefings(id,token_hash,state,file_meta,created_at,updated_at) VALUES(?,?,?,?,?,?)').bind(id,await sha(token),JSON.stringify(state),JSON.stringify(files),time,time).run();
    return json({id,token,version:1,status:'active',state,files:files.map(({key,...f})=>f)},201);
  }
  const match=path.match(/^\/api\/briefings\/([a-f0-9-]{36})(?:\/(turn|report))?$/);if(!match)fail('대화 경로를 찾을 수 없습니다.',404);
  const [,id,action]=match;const row=await env.DB.prepare('SELECT * FROM briefings WHERE id=?').bind(id).first();if(!row)fail('대화를 찾을 수 없습니다.',404);
  if(!owner(req,env)&&await sha(req.headers.get('X-Case-Token')||'')!==row.token_hash)fail('이 대화의 조회 권한이 없습니다.',403);
  if(row.status==='processing'&&Date.parse(row.updated_at)<Date.now()-120000){const recovered=await env.DB.prepare("UPDATE briefings SET status='active' WHERE id=? AND version=? AND status='processing' AND updated_at=?").bind(id,row.version,row.updated_at).run();if(recovered.meta.changes)row.status='active';}
  const present=()=>({id,version:row.version,status:row.status,state:JSON.parse(row.state),files:JSON.parse(row.file_meta).map(({key,...f})=>f)});
  if(req.method==='GET'&&!action)return json(present());
  if(req.method!=='POST')fail('허용되지 않은 요청입니다.',405);
  const input=await body(req);if(input.version!==row.version)fail('다른 창에서 대화가 변경됐습니다. 다시 불러와주세요.',409);
  const state=JSON.parse(row.state);if(row.status!=='active'||state.report_id)fail('진행 중이거나 보고서로 확정된 대화입니다. 다시 불러와주세요.',409);
  if(action==='report'){
    if(state.stage!=='feedback'||!state.feedback||input.confirm!==true)fail('질문에 답변하고 정리된 보고서를 확인해주세요.',409);
    const title=state.feedback.report.question.slice(0,170);
    const report=validateReport({...state.feedback.report,title,author:input.author?.trim()||state.author,role:state.role,deadline:input.deadline,consent:true});
    const review=validateReview(state.feedback.review);const time=now();
    state.report_id=id;state.stage='report';
    const lock=await env.DB.prepare("UPDATE briefings SET status='processing',updated_at=? WHERE id=? AND version=? AND status='active'").bind(time,id,row.version).run();if(!lock.meta.changes)fail('다른 요청이 진행 중입니다.',409);
    try{
      const existing=await env.DB.prepare('SELECT id FROM reports WHERE id=?').bind(id).first();
      if(existing)fail('이미 보고서로 확정되었습니다. 다시 불러와주세요.',409);
      await env.DB.batch([
        env.DB.prepare('INSERT INTO reports(id,token_hash,body,file_meta,review,review_revision,status,created_at,updated_at) VALUES(?,?,?,?,?,1,?,?,?)').bind(id,row.token_hash,JSON.stringify(report),row.file_meta,JSON.stringify(review),review.verdict,time,time),
        env.DB.prepare('INSERT INTO events(report_id,revision,kind,detail,created_at) VALUES(?,1,?,?,?)').bind(id,'briefing_confirmed',JSON.stringify({messages:state.messages,focus:state.focus,feedback:state.feedback,model:env.OPENAI_MODEL}),time),
        env.DB.prepare("UPDATE briefings SET state=?,version=version+1,status='active',updated_at=? WHERE id=? AND version=? AND status='processing'").bind(JSON.stringify(state),time,id,row.version),
      ]);
      return json({report_id:id,version:row.version+1,status:review.verdict});
    }catch(error){await env.DB.prepare("UPDATE briefings SET status='active' WHERE id=? AND version=? AND status='processing'").bind(id,row.version).run();throw error;}
  }
  if(action!=='turn')fail('허용되지 않은 요청입니다.',405);
  const message=input.message?.trim()||'';if(typeof input.message!=='string'||input.message.length>16000)fail('답변은 16,000자 이내로 입력해주세요.');
  if(state.stage!=='briefing'&&!message)fail('답변 또는 보완 브리핑을 입력해주세요.');
  if(state.messages.length>=12)fail('대화가 길어졌습니다. 현재 보고서를 확인하거나 새 브리핑으로 정리해주세요.',409);
  if(state.messages.reduce((n,m)=>n+m.text.length,0)+message.length>64000)fail('대화 분량 한도에 도달했습니다. 새 브리핑으로 정리해주세요.',413);
  const oldFiles=JSON.parse(row.file_meta);if(oldFiles.length+(input.files?.length||0)>3)fail('한 대화의 첨부는 총 3개까지 가능합니다.');
  await quota(env,`chat:${now().slice(0,10)}:${id}`,8);await quota(env,`ai:${now().slice(0,10)}`,Math.min(500,Math.max(1,Number(env.DAILY_AI_LIMIT)||50)));
  const lock=await env.DB.prepare("UPDATE briefings SET status='processing',updated_at=? WHERE id=? AND version=? AND status='active'").bind(now(),id,row.version).run();if(!lock.meta.changes)fail('다른 요청이 진행 중입니다.',409);
  try{
    const added=await attachments(env,id,row.version+1,input.files||[]);const files=[...oldFiles,...added];if(files.reduce((n,f)=>n+f.size,0)>10000000)fail('대화의 첨부 합계는 10MB 이하입니다.',413);
    const phase=state.stage==='question'?'feedback':'question';
    if(state.stage!=='briefing')state.messages.push({role:'user',kind:phase==='feedback'?'answer':'revision',text:message,files:added.map(f=>f.name)});
    const result=await ask(env,state,files,phase,fail);
    state.stage=phase;if(phase==='question'){state.focus=result;state.feedback=null;state.messages.push({role:'assistant',kind:'question',text:result.question});}
    else{state.feedback=result;state.messages.push({role:'assistant',kind:'feedback',text:`핵심 약점: ${result.weakness}\n근거: ${result.basis}\n개선 방향: ${result.improvement}\n다시 보고할 과제:\n${result.tasks.join('\n')}`,feedback:result});}
    const updated=await env.DB.prepare("UPDATE briefings SET state=?,file_meta=?,version=version+1,status='active',updated_at=? WHERE id=? AND version=? AND status='processing'").bind(JSON.stringify(state),JSON.stringify(files),now(),id,row.version).run();if(!updated.meta.changes)fail('대화가 변경돼 결과를 적용하지 않았습니다.',409);
    return json({id,version:row.version+1,status:'active',state,files:files.map(({key,...f})=>f)});
  }catch(error){await env.DB.prepare("UPDATE briefings SET status='active' WHERE id=? AND version=? AND status='processing'").bind(id,row.version).run();throw error;}
}
