const host = document.querySelector<HTMLElement>('.gangrim');
if(host){
  const $=<T extends HTMLElement=HTMLElement>(id:string)=>document.getElementById(id) as T;
  const api=host.dataset.api?.replace(/\/$/,'')||'';
  const form=$<HTMLFormElement>('briefing-form');
  let session:any=null, token='',working=false;
  const message=$<HTMLTextAreaElement>('briefing-message');
  const submit=$<HTMLButtonElement>('briefing-send');
  const draftKeys:Record<string,string>={question:'의사결정 사안',context:'배경과 목표',evidence:'근거와 확인 결과',alternatives:'대안과 비교',risks:'위험과 대응',plan:'실행 계획',verification:'검증 계획'};
  function say(text:string){$('briefing-status').textContent=text;}
  function el(tag:string,text:string,parent:HTMLElement){const node=document.createElement(tag);node.textContent=text;parent.append(node);return node;}
  function openReport(){if(session?.state.report_id)document.dispatchEvent(new CustomEvent('gangrim-open-report',{detail:{id:session.state.report_id,token}}));}
  async function call(path:string,data?:any){if(!api)throw Error('AI 접수 서버가 연결되지 않았습니다. 운영 페이지에서 이용해주세요.');const res=await fetch(api+path,{method:data===undefined?'GET':'POST',headers:{'Content-Type':'application/json',...(token?{'X-Case-Token':token}:{})},body:data===undefined?undefined:JSON.stringify(data),signal:AbortSignal.timeout(110000)});const result=await res.json();if(!res.ok)throw Error(result.error||'요청을 처리하지 못했습니다.');return result;}
  async function busy(fn:()=>Promise<void>){if(working)return;working=true;for(const b of host!.querySelectorAll<HTMLButtonElement>('[data-chat-action]'))b.disabled=true;say('강림선생이 보고 내용을 검토하고 있습니다. 잠시 기다려주세요.');try{await fn();say('저장되었습니다. 대화번호와 조회키를 보관하시면 나중에 이어갈 수 있습니다.');}catch(e){say((e as Error).message);}finally{working=false;for(const b of host!.querySelectorAll<HTMLButtonElement>('[data-chat-action]'))b.disabled=false;}}
  function render(){
    const log=$('briefing-log');log.replaceChildren();
    el('p','준비하신 내용을 보고해주세요. 무엇을 결정해드려야 하는지도 함께 말씀해주세요.',el('article','',log)).className='chair-welcome';
    const state=session?.state;
    for(const m of state?.messages||[]){const card=el('article','',log);card.className='chair-message '+(m.role==='user'?'chair-user':'chair-assistant');el('span',m.role==='user'?(m.kind==='answer'?'질문에 대한 답변':'브리핑'):'강림선생 · AI 사전검토',card).className='chair-speaker';
      if(m.feedback){const f=m.feedback;for(const [label,text] of [['핵심 약점',f.weakness],['판단 근거',f.basis],['개선 방향',f.improvement]]){el('h3',label,card);el('p',text,card);}el('h3','다시 보고할 과제',card);const list=el('ol','',card);for(const task of f.tasks)el('li',task,list);el('span',f.review.verdict==='ready'?'사전검토 통과 · 보고서 확인 필요':f.review.verdict==='hold'?'판단 보류':'보완 후 다시 보고해주세요',card).className='chair-verdict';}
      else{el(m.kind==='question'?'h3':'p',m.text,card);if(m.files?.length)el('small','첨부: '+m.files.join(', '),card);}
    }
    $('briefing-empty-summary').hidden=!!state;
    $('briefing-summary-content').hidden=!state;
    $('briefing-receipt').hidden=!session;
    $('briefing-initial').hidden=!!session;
    $('briefing-consent-row').hidden=!!session;
    $<HTMLInputElement>('briefing-consent').required=!session;
    $('briefing-confirm').hidden=state?.stage!=='feedback';
    $('briefing-open-report').hidden=!state?.report_id;
    $('briefing-composer').hidden=!!state?.report_id;
    if(session){$<HTMLInputElement>('briefing-id').value=session.id;$<HTMLInputElement>('briefing-token').value=token;
      $('briefing-stage').textContent=state.stage==='question'?'02 · 핵심 질문에 답변':state.stage==='feedback'?'03 · 약점 확인과 보완 보고':state.stage==='report'?'04 · 보고서 확인 완료':'01 · 브리핑 저장됨';
      $('briefing-decision').textContent=state.focus?.decision||'브리핑을 읽고 결정할 사안을 정리합니다.';
      $('briefing-issue').textContent=state.focus?.issue||'핵심 쟁점을 검토하고 있습니다.';
      const tasks=$('briefing-tasks');tasks.replaceChildren();for(const task of state.feedback?.tasks||[])el('li',task,tasks);if(!state.feedback)el('li','핵심 질문에 답변하시면 보완 과제를 정리합니다.',tasks);
      const draft=$('briefing-draft');draft.replaceChildren();if(state.feedback){for(const [key,label] of Object.entries(draftKeys)){el('h4',label,draft);el('p',state.feedback.report[key],draft);}el('h4','아직 확인되지 않은 사항',draft);for(const item of [...state.feedback.review.unknowns,...state.feedback.review.blockers])el('p',item,draft);}
      $('briefing-author-confirm-wrap').hidden=state.stage!=='feedback';
      $<HTMLInputElement>('briefing-final-author').value=state.author==='보고자 미입력'?'':state.author;
    }
    const stage=state?.stage;
    $('briefing-message-label').textContent=stage==='question'?'핵심 질문에 답변해주세요':stage==='feedback'?'보완한 내용을 다시 보고해주세요':'준비하신 내용을 자유롭게 브리핑해주세요';
    message.disabled=stage==='briefing';message.required=stage!=='briefing';
    message.placeholder=stage==='question'?'질문에 대한 판단과 근거를 말씀해주세요. 아직 모르는 부분은 그대로 알려주세요.':stage==='feedback'?'개선 방향을 반영한 내용과 추가로 확인한 근거를 보고해주세요.':'무엇을 하려는지, 어떤 결정을 원하는지 설명해주세요. 문서도 함께 첨부할 수 있습니다.';
    submit.textContent=stage==='briefing'?'핵심 질문 받기':stage==='question'?'답변하고 핵심 진단 받기':stage==='feedback'?'보완 보고하고 다시 질문 받기':'브리핑하고 핵심 질문 받기';
  }
  async function files(){const chosen=Array.from($<HTMLInputElement>('briefing-files').files||[]);if(chosen.length+(session?.files.length||0)>3||chosen.some(f=>f.size>5000000)||chosen.reduce((n,f)=>n+f.size,0)+(session?.files.reduce((n:number,f:any)=>n+f.size,0)||0)>10000000)throw Error('대화당 첨부는 총 3개, 파일당 5MB, 합계 10MB까지입니다.');return Promise.all(chosen.map(async f=>({name:f.name,data:await new Promise<string>((resolve,reject)=>{const reader=new FileReader();reader.onload=()=>resolve(String(reader.result).split(',')[1]);reader.onerror=()=>reject(Error('첨부를 읽을 수 없습니다.'));reader.readAsDataURL(f);})})));}
  form.addEventListener('submit',e=>{e.preventDefault();busy(async()=>{
    let attached=await files();const text=message.value.trim();
    if(!session){token='';session=await call('/api/briefings',{message:text,files:attached,author:$<HTMLInputElement>('briefing-author').value,role:$<HTMLSelectElement>('briefing-role').value,consent:$<HTMLInputElement>('briefing-consent').checked});token=session.token;attached=[];message.value='';$<HTMLInputElement>('briefing-files').value='';render();}
    session=await call(`/api/briefings/${session.id}/turn`,{version:session.version,message:session.state.stage==='briefing'?'':text,files:attached});message.value='';$<HTMLInputElement>('briefing-files').value='';render();
    const cards=$('briefing-log').querySelectorAll('article');cards[cards.length-1]?.scrollIntoView({behavior:'smooth',block:'start'});
  });});
  $('briefing-resume').addEventListener('submit',e=>{e.preventDefault();busy(async()=>{const id=$<HTMLInputElement>('briefing-resume-id').value.trim();token=$<HTMLInputElement>('briefing-resume-token').value.trim();session=await call('/api/briefings/'+encodeURIComponent(id));message.value='';render();});});
  $('briefing-new').addEventListener('click',()=>{if(working)return;session=null;token='';form.reset();message.value='';render();say('새 브리핑을 시작합니다. 이전 대화는 대화번호와 조회키로 이어갈 수 있습니다.');});
  $('briefing-example').addEventListener('click',()=>{if(session){say('새 브리핑에서 예시를 사용할 수 있습니다.');return;}message.value='[가상 연동 시험] 중소기업을 위한 AI 경영진단 서비스를 출시하려고 합니다. 진단 항목 50개와 자동 보고서 기능을 만들었습니다. 고객 인터뷰, 지불 의향, 진단 결과로 고객이 바꿀 의사결정은 아직 확인하지 못했습니다. 다음 달 개발에 추가 투자해도 되는지 검토해주세요.';say('가상 예시입니다. 브리핑 버튼을 누르면 실제 AI 핵심 질문을 받습니다.');});
  $('briefing-export').addEventListener('click',()=>{if(!session)return;const blob=new Blob([`강림선생 대화 보관 정보\n대화번호: ${session.id}\n조회키: ${token}\nhttps://dal.fyi/ko/gangrim/\n조회키를 가진 사람은 대화를 열람할 수 있습니다. 안전하게 보관해주세요.`],{type:'text/plain;charset=utf-8'});const url=URL.createObjectURL(blob);const a=document.createElement('a');a.href=url;a.download='강림선생-대화보관.txt';a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);});
  $('briefing-confirm-form').addEventListener('submit',e=>{e.preventDefault();busy(async()=>{if(!session)return;const result=await call(`/api/briefings/${session.id}/report`,{version:session.version,confirm:$<HTMLInputElement>('briefing-draft-agree').checked,author:$<HTMLInputElement>('briefing-final-author').value,deadline:new Date($<HTMLInputElement>('briefing-deadline').value).toISOString()});session=await call(`/api/briefings/${session.id}`);render();say('보고서가 확정되었습니다. AI 사전검토 통과 건만 최종 결정 요청을 할 수 있습니다.');openReport();});});
  $('briefing-open-report').addEventListener('click',openReport);
  render();
}
