const root = document.querySelector<HTMLElement>('.gangrim');
if (root) {
  const api = root.dataset.api?.replace(/\/$/, '') || '';
  const get = <T extends HTMLElement = HTMLElement>(id: string) => document.getElementById(id) as T;
  const form = get<HTMLFormElement>('report-form');
  const lookup = get<HTMLFormElement>('lookup-form');
  let current: any = null;
  let caseToken = '';
  let ownerToken = '';
  let editing = false;
  const states: Record<string,string> = {submitted:'접수 완료 · AI 검토 대기',reviewing:'AI 검토 중',ready:'사전검토 통과 · 최종 결정 요청 가능',needs_revision:'보완 요청',hold:'검토 보류',awaiting_owner:'강병준 최종 결정 대기',approved:'강병준 최종 승인',rejected:'강병준 최종 반려'};
  function notice(text:string){get('notice').textContent=text;get('notice').hidden=false;}
  function panel(id:string){for(const el of root!.querySelectorAll<HTMLElement>('[role=tabpanel]'))el.hidden=el.id!==id;for(const el of root!.querySelectorAll('[role=tab]'))el.setAttribute('aria-selected',String((el as HTMLElement).dataset.panel===id));}
  for(const button of root.querySelectorAll<HTMLButtonElement>('[role=tab]'))button.addEventListener('click',()=>panel(button.dataset.panel!));
  async function request(path:string,method='GET',data?:any,asOwner=false){
    if(!api)throw new Error('아직 운영 접수 서버가 연결되지 않았습니다. 화면에서 작성할 수 있지만 제출·AI 검토·최종 결정은 실행되지 않습니다.');
    const headers:Record<string,string>={'Content-Type':'application/json'};
    if(asOwner&&ownerToken)headers.Authorization=`Bearer ${ownerToken}`;else if(caseToken)headers['X-Case-Token']=caseToken;
    const res=await fetch(`${api}${path}`,{method,headers,body:data===undefined?undefined:JSON.stringify(data),signal:AbortSignal.timeout(110000)});
    const json=await res.json().catch(()=>({error:'서버 응답을 읽을 수 없습니다.'}));if(!res.ok)throw new Error(json.error||'요청 실패');return json;
  }
  async function busy(button:HTMLButtonElement,fn:()=>Promise<void>){button.disabled=true;const old=button.textContent;button.textContent='처리 중…';try{await fn();}catch(e){notice((e as Error).message);}finally{button.disabled=false;button.textContent=old;}}
  function element(tag:string,text:string,parent:HTMLElement){const el=document.createElement(tag);el.textContent=text;parent.append(el);return el;}
  function action(parent:HTMLElement,label:string,fn:()=>Promise<void>){const b=element('button',label,parent) as HTMLButtonElement;b.type='button';b.className='btn sec';b.onclick=()=>busy(b,fn);return b;}
  function list(parent:HTMLElement,label:string,items:string[]){element('h4',label,parent);if(!items.length){element('p','없음',parent);return;}const ul=element('ul','',parent);for(const item of items)element('li',item,ul);}
  function draw(row:any,asOwner=false){
    const box=get(asOwner?'owner-result':'case-result');box.replaceChildren();box.hidden=false;box.className='gr-result';current=row;
    element('h3',row.body.title,box);element('p',`${states[row.status]||row.status} · 문서 v${row.revision}`,box).className='gr-state';
    element('p',`보고자 ${row.body.author} · ${row.body.role}\n마감 ${new Date(row.body.deadline).toLocaleString('ko-KR')}`,box);
    const details=document.createElement('details');box.append(details);element('summary','제출 내용과 첨부 목록',details);
    for(const [field,label] of Object.entries({question:'의사결정 질문',context:'배경·목표',evidence:'근거',alternatives:'대안',risks:'위험',plan:'실행 계획',verification:'검증 계획'})){element('h4',label,details);element('p',row.body[field],details);}
    element('p','첨부: '+((row.files||[]).map((f:any)=>f.name).join(', ')||'없음'),details);
    if(row.review){const review=row.review;element('h4','강림선생 검토 의견',box);element('p',review.summary,box);list(box,'자료에서 확인한 내용',review.findings.map((f:any)=>`${f.statement}\n근거 위치: ${f.evidence}`));list(box,'미확인 사항',review.unknowns);list(box,'진행을 막는 사항',review.blockers);list(box,'보완 피드백',review.feedback);list(box,'확인할 질문',review.questions);element('h4','판단과 권고',box);element('p',review.recommendation,box);}
    element('p','AI는 제출 자료를 검토합니다. 외부 사실의 독립 검증이나 사람의 최종 승인을 대신하지 않습니다.',box).className='gr-review-note';
    const buttons=element('div','',box);buttons.className='gr-actions';
    if(!asOwner){
      action(buttons,'상태 새로고침',async()=>load(row.id));
      if(['submitted','needs_revision','hold','ready'].includes(row.status)){
        action(buttons,row.review?'수정 내용 없이 재검토':'강림선생에게 AI 검토 요청',async()=>{await request(`/api/reports/${row.id}/review`,'POST',{revision:row.revision});await load(row.id);});
        action(buttons,'보고서 보완하기',async()=>{for(const [k,v] of Object.entries(row.body)){const input=form.elements.namedItem(k) as HTMLInputElement;if(input&&k!=='consent')input.value=String(v);}get<HTMLInputElement>('documents').value='';editing=true;get('form-mode').textContent=`v${row.revision} 보완 중 · 첨부는 다시 선택해주세요. 저장하면 이전 통과 상태가 무효화됩니다.`;get('submit-report').textContent='수정본 접수';panel('submit-panel');form.scrollIntoView({behavior:'smooth'});});
      }
      if(row.status==='ready')action(buttons,'강병준에게 최종 결정 요청',async()=>{await request(`/api/reports/${row.id}/escalate`,'POST',{revision:row.revision});await load(row.id);});
    }else{
      if(row.status==='awaiting_owner'){
        const label=element('label','최종 결정 사유',box);const reason=document.createElement('textarea');reason.rows=3;reason.maxLength=5000;label.append(reason);
        for(const [decision,label] of [['approved','최종 승인'],['needs_revision','보완 요청'],['rejected','최종 반려']])action(buttons,label,async()=>{if(!reason.value.trim())throw new Error('최종 결정 사유를 입력해주세요.');await request(`/api/reports/${row.id}/decision`,'POST',{revision:row.revision,decision,reason:reason.value},true);await queue();draw(await request(`/api/reports/${row.id}`,'GET',undefined,true),true);});
      }
    }
    if(row.events?.length){const history=document.createElement('details');box.append(history);element('summary','버전·검토·최종 결정 이력',history);for(const e of row.events){element('p',`${new Date(e.created_at).toLocaleString('ko-KR')} · v${e.revision} · ${e.kind}`,history);if(e.kind==='owner_decision'){const d=JSON.parse(e.detail);element('p',d.reason,history);}}}
  }
  async function load(id:string){draw(await request(`/api/reports/${id}`));}
  async function files(){const selected=Array.from(get<HTMLInputElement>('documents').files||[]);if(selected.length>3||selected.some(f=>f.size>5000000)||selected.reduce((s,f)=>s+f.size,0)>10000000)throw new Error('첨부는 최대 3개, 파일당 5MB, 합계 10MB입니다.');return Promise.all(selected.map(async file=>({name:file.name,data:await new Promise<string>((resolve,reject)=>{const reader=new FileReader();reader.onload=()=>resolve(String(reader.result).split(',')[1]);reader.onerror=()=>reject(new Error('첨부를 읽을 수 없습니다.'));reader.readAsDataURL(file);})})));}
  form.addEventListener('submit',e=>{e.preventDefault();busy(get<HTMLButtonElement>('submit-report'),async()=>{
    const data=Object.fromEntries(new FormData(form));data.consent=(form.elements.namedItem('consent') as HTMLInputElement).checked as any;
    data.deadline=new Date(String(data.deadline)).toISOString();const payload={report:data,files:await files(),revision:current?.revision};
    if(editing){await request(`/api/reports/${current.id}`,'PUT',payload);editing=false;get('submit-report').textContent='보고서 접수 →';get('form-mode').textContent='AI의 사전검토 통과는 최종 승인이 아닙니다.';panel('lookup-panel');await load(current.id);}
    else{caseToken='';const result=await request('/api/reports','POST',payload);caseToken=result.token;(lookup.elements.namedItem('id') as HTMLInputElement).value=result.id;(lookup.elements.namedItem('token') as HTMLInputElement).value=result.token;notice(`접수 완료. 아래 접수번호와 조회키를 안전한 곳에 보관해주세요.\n접수번호: ${result.id}\n조회키: ${result.token}\n이 탭을 닫으면 조회키는 화면에서 사라집니다.`);panel('lookup-panel');await load(result.id);}
  });});
  lookup.addEventListener('submit',e=>{e.preventDefault();busy(lookup.querySelector('button')!,async()=>{caseToken=(lookup.elements.namedItem('token') as HTMLInputElement).value.trim();await load((lookup.elements.namedItem('id') as HTMLInputElement).value.trim());});});
  async function queue(){const result=await request('/api/owner/queue','GET',undefined,true);const box=get('owner-queue');box.replaceChildren();if(!result.items.length)element('p','최종 결정을 기다리는 보고서가 없습니다.',box);for(const row of result.items){const b=element('button',`${row.body.title} · ${row.body.author} · v${row.revision}`,box) as HTMLButtonElement;b.className='gr-queue-item';b.onclick=()=>busy(b,async()=>draw(await request(`/api/reports/${row.id}`,'GET',undefined,true),true));}}
  get<HTMLFormElement>('owner-form').addEventListener('submit',e=>{e.preventDefault();const f=e.currentTarget as HTMLFormElement;busy(f.querySelector('button')!,async()=>{ownerToken=(f.elements.namedItem('owner') as HTMLInputElement).value;await queue();});});
  get('fill-example').addEventListener('click',()=>{
    if(editing){notice('수정 중에는 작성 예시로 덮어쓸 수 없습니다.');return;}
    const deadline=new Date(Date.now()+7*86400000);const local=new Date(deadline.getTime()-deadline.getTimezoneOffset()*60000).toISOString().slice(0,16);
    const values={title:'[작성 예시] 신규 진단 서비스 시범 운영',author:'예시 보고자',question:'고객 3곳을 대상으로 4주간 시범 운영을 시작해도 되는지 검토 요청드립니다.',context:'이 내용은 실제 사업 자료가 아닌 작성 예시입니다. 목표는 분석 보고서 작성시간 30% 단축이며 실제 기준값은 아직 측정하지 않았습니다.',evidence:'아직 검증 자료가 없습니다. 시범 운영 전 기준값과 고객 동의서를 추가로 확인해야 합니다.',alternatives:'① 현 상태 유지 ② 고객 1곳부터 시작 ③ 고객 3곳 동시 진행. 비용과 효과 비교는 추가 확인이 필요합니다.',risks:'자료 유출·분석 오류 위험. 익명화와 사람의 결과 검수를 시행하며 오류가 반복되면 중단합니다.',plan:'담당: 예시 담당자. 1주차 기준 측정, 2~3주차 운영, 4주차 평가. 예산은 미확정입니다.',verification:'실행 전·후 동일 업무의 작성시간과 검수 오류율을 비교합니다. 최종 마감 2일 전까지 검증 및 수정합니다.',deadline:local};
    for(const [k,v]of Object.entries(values))(form.elements.namedItem(k) as HTMLInputElement).value=v;
    notice('가상 작성 예시를 채웠습니다. 실제 제출이 아니며 미확인 사항이 포함되어 있습니다.');
  });
  (async()=>{const state=get('connection');if(!api){state.textContent='운영 연결 전 · 현재 화면은 작성·검토 흐름 미리보기입니다. 실제 접수나 AI 검토는 수행되지 않습니다.';state.dataset.off='true';return;}try{const health=await request('/api/health');state.textContent=health.configured?'접수·AI 검토 서비스 연결됨':'서버 연결됨 · AI 또는 최종 결정권자 설정 대기';state.dataset.off=String(!health.configured);}catch{state.textContent='접수 서버 연결을 확인할 수 없습니다. 제출 전 운영자에게 문의해주세요.';state.dataset.off='true';}})();
}
