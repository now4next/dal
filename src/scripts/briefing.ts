import {t,english,locale} from './language';
import {api,node,receipts,remember,deviceSaved,setDeviceSaved,loadProject,statusOf,decisionOf,saveText,type Receipt} from './project-client';
import {scoreView,reportView} from './report-view';
import {readinessOf,isReadyForExecutive} from '../lib/readiness.mjs';
const root=document.querySelector<HTMLElement>('.gangrim');
if(root){
  const $=<T extends HTMLElement=HTMLElement>(id:string)=>document.getElementById(id) as T;
  let session:any=null,report:any=null,token='',working=false,refreshing=false;
  let inspected:Receipt|null=null;
  const cache=new Map<string,{session:any;report:any}>();
  const composer=$<HTMLFormElement>('briefing-form'),message=$<HTMLTextAreaElement>('briefing-message');
  const handoff=$<HTMLDialogElement>('handoff-dialog'),projectDialog=$<HTMLDialogElement>('project-dialog');
  const names:Record<string,string>={question:t('결정할 사안'),context:t('배경·목표'),evidence:t('근거·자료'),alternatives:t('성과·대안'),risks:t('위험·대응'),plan:t('실행 계획'),verification:t('검증 계획')};
  const panel=(id:string)=>document.dispatchEvent(new CustomEvent('gangrim-panel',{detail:id}));
  const receipt=():Receipt=>({id:session.id,token,title:session.state.title||session.state.focus?.decision||session.state.messages[0].text.slice(0,65),kind:'briefing'});
  const review=()=>session?.state.pending?null:report?.review||session?.state.feedback?.review||(session?.state.focus?.readiness?{readiness:session.state.focus.readiness}:null);
  const canSend=()=>isReadyForExecutive(review())&&(!report||report.status==='ready');
  function sync(){for(const b of root!.querySelectorAll<HTMLButtonElement>('[data-chat-action]'))b.disabled=working;$<HTMLButtonElement>('briefing-handoff').disabled=working||!canSend();}
  function notice(text:string){$('briefing-status').textContent=text;}
  async function busy(fn:()=>Promise<void>){if(working)return;working=true;sync();notice(t('검토 중…'));try{await fn();}catch(e){notice((e as Error).message);$('handoff-status').textContent=(e as Error).message;}finally{working=false;sync();}}
  function draft(box:HTMLElement,data:any){box.replaceChildren();if(!data)return;node('h3',t('핵심 요약'),box);node('p',data.executive_summary||data.question,box);const details=document.createElement('details');box.append(details);node('summary',t('세부 설명'),details);for(const [key,label]of Object.entries(names)){node('h4',label,details);node('p',data[key],details);}if(session?.files.length){node('h3',t('첨부 자료'),box);for(const f of session.files)node('p',f.name,box);}}
  function render(){
    const state=session?.state,log=$('briefing-log');log.replaceChildren();
    if(!state){node('p',t('준비하신 내용과 자료를 보내주세요.'),node('article','',log)).className='chat-question';}
    for(const m of state?.messages||[]){const card=node('article','',log);card.className='chat-message '+(m.role==='user'?'chat-user':'chat-ai');node('span',m.role==='user'?t('보고자'):t('강림선생 · AI'),card).className='chat-speaker';
      if(m.feedback){const f=m.feedback;node('p',f.weakness,card).className='chat-weakness';if(f.next_question)node('p',f.next_question,card).className='chat-question';else node('p',isReadyForExecutive(f.review)?t('보고 준비가 되었습니다. 정리된 내용과 자료를 확인한 후 대표에게 보고해 주세요.'):t('보완할 내용과 자료를 준비해 주세요.'),card).className='chat-question';
        const score=readinessOf(f.review);node('p',score?t(`보고 준비도 ${score.total}점 · 대표 전달 기준 95점`):t('이전 검토 · 새 답변 후 준비도를 평가합니다.'),card).className='chat-score';
        const details=document.createElement('details');card.append(details);node('summary',t('이번 보고에서 더 준비할 내용'),details);node('p',f.improvement,details);const ul=node('ul','',details);for(const task of f.tasks)node('li',task,ul);node('p',t('판단 근거: ')+f.basis,details);
      }else{node('p',m.text,card).className=m.role==='assistant'?'chat-question':'';if(m.files?.length)node('small',m.files.join(' · '),card);}
    }
    $('active-project-title').textContent=state?(state.title||state.focus?.decision||t('보고 대화')):t('어떤 내용을 보고하시겠습니까?');
    $('briefing-initial').hidden=!!session;$('briefing-consent-row').hidden=!!session;$<HTMLInputElement>('briefing-consent').required=!session;
    composer.hidden=!!state?.report_id;$('briefing-example').hidden=!!session;$('briefing-export').hidden=!session;
    message.disabled=state?.stage==='briefing'||!!state?.pending;message.required=!message.disabled;message.placeholder=state?t('질문에 답변하시거나 보완한 자료를 보내주세요.'):t('핵심 내용과 검토가 필요한 결정을 말씀해 주세요.');
    $<HTMLButtonElement>('briefing-send').textContent=state?.pending?t('다시 검토'):state?.stage==='briefing'?t('질문 받기'):state?t('답변 보내기'):t('보고하기');
    const score=readinessOf(review());$('readiness-total').textContent=score?String(score.total):'—';
    $('readiness-guide').textContent=state?.pending?t('새 답변 재평가 필요'):canSend()?t('95점 이상 · 대표 전달 가능'):report?statusOf(report):score?(score.total>=95?t('95점 이상 · 핵심 근거 확인 중'):t(`95점까지 ${95-score.total}점`)):t('95점 이상부터 대표 전달');
    if(score)scoreView($('readiness-breakdown'),review());else $('readiness-breakdown').textContent=t('첫 문답 후 5개 항목을 평가합니다.');
    const body=report?.body||state?.feedback?.report;$('briefing-draft-wrap').hidden=!body;draft($('briefing-draft'),body);
    if(session)remember(receipt());sync();
  }
  async function selected(next:Receipt){const loaded=await loadProject(next);if(!loaded.session){await showProject(next,loaded);return;}session=loaded.session;report=loaded.report;token=next.token;message.value='';$<HTMLInputElement>('briefing-files').value='';render();panel('briefing-panel');notice(report?statusOf(report):t('저장된 보고를 불러왔습니다.'));}
  async function attachments(){const chosen=Array.from($<HTMLInputElement>('briefing-files').files||[]);if(chosen.length+(session?.files.length||0)>3||chosen.some(f=>f.size>5000000)||chosen.reduce((n,f)=>n+f.size,0)+(session?.files.reduce((n:number,f:any)=>n+f.size,0)||0)>10000000)throw Error(t('첨부는 총 3개, 파일당 5MB, 합계 10MB까지입니다.'));return Promise.all(chosen.map(async file=>({name:file.name,data:await new Promise<string>((resolve,reject)=>{const reader=new FileReader();reader.onload=()=>resolve(String(reader.result).split(',')[1]);reader.onerror=()=>reject(Error(t('첨부를 읽을 수 없습니다.')));reader.readAsDataURL(file);})})));}
  composer.addEventListener('submit',e=>{e.preventDefault();busy(async()=>{const text=message.value.trim();let files=await attachments();
    if(!session){session=await api('/api/briefings',{data:{language:english?'en':'ko',title:$<HTMLInputElement>('briefing-title').value,author:$<HTMLInputElement>('briefing-author').value,role:$<HTMLSelectElement>('briefing-role').value,message:text,files,consent:$<HTMLInputElement>('briefing-consent').checked}});token=session.token;files=[];message.value='';$<HTMLInputElement>('briefing-files').value='';render();}
    try{session=await api(`/api/briefings/${session.id}/turn`,{token,data:{version:session.version,message:session.state.stage==='briefing'||session.state.pending?'':text,files}});}catch(error){try{session=await api(`/api/briefings/${session.id}`,{token});if(session.state.pending){message.value='';$<HTMLInputElement>('briefing-files').value='';}render();}catch{}throw error;}report=null;message.value='';$<HTMLInputElement>('briefing-files').value='';render();notice(t('저장됨'));logBottom();
  });});
  function logBottom(){const cards=$('briefing-log').querySelectorAll('article');cards[cards.length-1]?.scrollIntoView({behavior:'smooth',block:'start'});}
  $('briefing-new').onclick=()=>{if(working)return;session=null;report=null;token='';composer.reset();render();notice('');};
  $('briefing-example').onclick=()=>{message.value=t('[가상 보고] AI 경영진단 서비스를 출시하려고 합니다. 자동 진단 기능은 만들었지만 실제 고객의 구매 의향과 의사결정 변화는 아직 확인하지 못했습니다. 다음 달 추가 개발 투자를 요청합니다. 무엇을 더 준비해야 할까요?');$<HTMLInputElement>('briefing-title').value=t('AI 진단 서비스 출시 검토');message.focus();};
  $('briefing-export').onclick=()=>{if(session)saveText(t('강림선생-프로젝트-접수정보.txt'),t(`프로젝트번호: ${session.id}\n조회키: ${token}\nhttps://dal.fyi/${english?'':'ko/'}gangrim/\n조회키 보유자는 이 프로젝트를 열람할 수 있습니다. 안전하게 보관해주세요.`));};
  $('open-projects-link').onclick=e=>{e.preventDefault();panel('projects-panel');};
  $('handoff-close').onclick=()=>handoff.close();$('project-dialog-close').onclick=()=>projectDialog.close();
  function handoffPreview(){if(!canSend())return;draft($('handoff-preview'),report?.body||session.state.feedback.report);$('handoff-status').textContent='';$('handoff-meta').hidden=!!report;$<HTMLInputElement>('handoff-author').required=!report;$<HTMLInputElement>('handoff-deadline').required=!report;$<HTMLInputElement>('handoff-author').value=['보고자 미입력','Reporter not specified'].includes(session.state.author)?'':session.state.author;$<HTMLInputElement>('handoff-agree').checked=false;handoff.showModal();}
  $('briefing-handoff').onclick=handoffPreview;
  $('handoff-form').addEventListener('submit',e=>{e.preventDefault();busy(async()=>{
    if(!canSend()||!$<HTMLInputElement>('handoff-agree').checked)throw Error(t('준비도 95점 이상과 보고 내용 확인이 필요합니다.'));
    if(!report){await api(`/api/briefings/${session.id}/report`,{token,data:{version:session.version,confirm:true,author:$<HTMLInputElement>('handoff-author').value,deadline:new Date($<HTMLInputElement>('handoff-deadline').value).toISOString()}});const loaded=await loadProject(receipt());session=loaded.session;report=loaded.report;}
    await api(`/api/reports/${report.id}/escalate`,{token,data:{revision:report.revision}});const loaded=await loadProject(receipt());session=loaded.session;report=loaded.report;render();handoff.close();panel('projects-panel');await refreshProjects();notice(t('대표에게 전달됐습니다.'));
  });});
  async function refreshProjects(){if(refreshing)return;refreshing=true;const list=$('projects-list');const saved=receipts();if(!saved.length){list.replaceChildren();node('p',t('아직 보고 프로젝트가 없습니다. 보고 대화에서 시작하거나 접수 정보로 불러오세요.'),list);$('projects-status').textContent='';refreshing=false;return;}
    const loaded=await Promise.all(saved.map(async r=>{try{return {receipt:r,loaded:await loadProject(r)};}catch(e){return {receipt:r,error:(e as Error).message};}}));list.replaceChildren();
    for(const item of loaded){const r=item.receipt;const card=node('article','',list);card.className='project-card';node('h3',r.title,card);if(item.loaded){cache.set(r.id,item.loaded);const score=item.loaded.session?.state.pending?null:readinessOf(item.loaded.report?.review||item.loaded.session?.state.feedback?.review||(item.loaded.session?.state.focus?.readiness?{readiness:item.loaded.session.state.focus.readiness}:null));node('p',score?t(`준비도 ${score.total}점 / 100`):t('준비도 평가 전'),card);const b=node('button',statusOf(item.loaded.report,item.loaded.session)+t(' · 확인'),card)as HTMLButtonElement;b.type='button';b.className='project-state-button';b.dataset.result=String(!!decisionOf(item.loaded.report));b.onclick=()=>showProject(r,item.loaded);}
      else{node('p',item.error||t('조회할 수 없습니다.'),card);}}
    $('projects-status').textContent=t('현재 상태로 갱신됨');refreshing=false;
  }
  async function showProject(r:Receipt,loaded?:{session:any;report:any}){try{inspected=r;const current=loaded||await loadProject(r);const box=$('project-dialog-body'),actions=$('project-dialog-actions');box.replaceChildren();actions.replaceChildren();$('project-dialog-status').textContent='';
    if(current.report)reportView(box,current.report,{token:r.token},text=>{$('project-dialog-status').textContent=text;});
    else{node('h2',r.title,box);node('p',statusOf(null,current.session),box);if(current.session.state.pending)node('p',t('새 답변 재평가 필요'),box);else scoreView(node('div','',box),current.session.state.feedback?.review||(current.session.state.focus?.readiness?{readiness:current.session.state.focus.readiness}:null));}
    const add=(label:string,fn:()=>Promise<void>)=>{const b=node('button',label,actions)as HTMLButtonElement;b.type='button';b.className='btn sec';b.onclick=async()=>{b.disabled=true;try{await fn();}catch(e){$('project-dialog-status').textContent=(e as Error).message;}finally{b.disabled=false;}};};
    if(current.session&&!current.session.state.report_id)add(t('대화 이어가기'),async()=>{await selected(r);projectDialog.close();});
    if(current.session&&current.report&&['ready','needs_revision','hold','submitted'].includes(current.report.status))add(t('대화로 보완하기'),async()=>{session=await api(`/api/briefings/${r.id}/reopen`,{token:r.token,data:{version:current.session.version}});token=r.token;report=null;message.value='';render();panel('briefing-panel');projectDialog.close();notice(t('보완한 내용과 자료를 보내주세요.'));});
    if(current.session&&current.report?.status==='ready'&&isReadyForExecutive(current.report.review))add(t('대표에게 보고'),async()=>{await selected(r);projectDialog.close();handoffPreview();});
    add(t('상태 새로고침'),async()=>showProject(r));if(!projectDialog.open)projectDialog.showModal();
  }catch(e){$('projects-status').textContent=(e as Error).message;}}
  $('projects-refresh').onclick=()=>refreshProjects();
  document.addEventListener('gangrim-panel-opened',((e:CustomEvent)=>{if(e.detail==='projects-panel')refreshProjects();})as EventListener);
  document.addEventListener('gangrim-projects-changed',()=>{if(!$('projects-panel').hidden)refreshProjects();});
  setInterval(()=>{if(!document.hidden&&!$('projects-panel').hidden)refreshProjects();},30000);
  async function importReceipt(id:string,key:string){if(!/^[a-f0-9-]{36}$/.test(id)||!/^[a-f0-9]{64}$/.test(key))throw Error(t('프로젝트 번호와 조회키 형식을 확인해주세요.'));let r:Receipt={id,token:key,title:t('불러온 보고 프로젝트'),kind:'briefing'};let loaded;try{loaded=await loadProject(r);r.title=loaded.session.state.title||loaded.session.state.focus?.decision||loaded.session.state.messages[0].text.slice(0,65);}catch(e){if((e as any).status!==404)throw e;r.kind='report';loaded=await loadProject(r);r.title=loaded.report.body.title;}remember(r);await refreshProjects();await showProject(r,loaded);}
  $('project-import-form').addEventListener('submit',async e=>{e.preventDefault();try{await importReceipt($<HTMLInputElement>('project-import-id').value.trim(),$<HTMLInputElement>('project-import-token').value.trim());}catch(e){$('projects-status').textContent=(e as Error).message;}});
  $('project-import-file').addEventListener('change',async()=>{try{const f=$<HTMLInputElement>('project-import-file').files?.[0];if(!f)return;if(f.size>10000)throw Error(t('접수 정보 파일을 확인해주세요.'));const text=await f.text();const id=text.match(/(?:Project ID|프로젝트번호|대화번호|접수번호):\s*([a-f0-9-]{36})/)?.[1],key=text.match(/(?:Project key|조회키):\s*([a-f0-9]{64})/)?.[1];if(!id||!key)throw Error(t('프로젝트 번호와 조회키를 찾지 못했습니다.'));await importReceipt(id,key);}catch(e){$('projects-status').textContent=(e as Error).message;}finally{$<HTMLInputElement>('project-import-file').value='';}});
  $<HTMLInputElement>('project-device-save').checked=deviceSaved();$('project-device-save').addEventListener('change',()=>{try{setDeviceSaved($<HTMLInputElement>('project-device-save').checked);$('projects-status').textContent=$<HTMLInputElement>('project-device-save').checked?t('이 기기에 접수 정보를 보관합니다.'):t('이후에는 이 탭에서만 보관합니다.');}catch(e){$('projects-status').textContent=(e as Error).message;}});
  render();
}
