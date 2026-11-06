import {t,english,locale} from './language';
import {api,node,statusOf} from './project-client';
import {reportView} from './report-view';
import {canDecide} from '../lib/gangrim-policy.mjs';
const root=document.querySelector<HTMLElement>('.gangrim');
if(root){
  const $=<T extends HTMLElement=HTMLElement>(id:string)=>document.getElementById(id) as T;
  function panel(id:string){for(const el of root!.querySelectorAll<HTMLElement>('[role=tabpanel]'))el.hidden=el.id!==id;for(const button of root!.querySelectorAll<HTMLElement>('[role=tab]'))button.setAttribute('aria-selected',String(button.dataset.panel===id));document.dispatchEvent(new CustomEvent('gangrim-panel-opened',{detail:id}));}
  for(const button of root.querySelectorAll<HTMLElement>('[role=tab]'))button.onclick=()=>panel(button.dataset.panel!);
  document.addEventListener('gangrim-panel',((e:CustomEvent)=>panel(e.detail))as EventListener);
  api('/api/health').then(h=>{$('connection').textContent=h.configured?t('AI 연결됨'):t('서비스 준비 중');}).catch(()=>{$('connection').textContent=t('연결 확인 필요');});
  let owner='';
  async function queue(){const result=await api('/api/owner/projects',{owner});const list=$('owner-queue');list.replaceChildren();if(!result.items.length)node('p',t('접수된 보고 프로젝트가 없습니다.'),list);for(const row of result.items){const card=node('article','',list);card.className='project-card';node('h3',row.title,card);node('p',t(`${row.author} · ${row.score===null?t('준비도 평가 전'):row.score+t('점')}`),card);const b=node('button',statusOf(row)+t(' · 열기'),card)as HTMLButtonElement;b.className='project-state-button';b.type='button';b.onclick=()=>show(row.id);}}
  async function show(id:string){try{const row=await api('/api/reports/'+id,{owner});const box=$('owner-result');box.hidden=false;reportView(box,row,{owner},t=>{$('owner-status').textContent=t;});if(canDecide(row)){
    const actions=node('section','',box);actions.className='owner-actions';
    async function decide(decision:string,reason=''){for(const b of actions.querySelectorAll('button'))b.disabled=true;try{await api('/api/reports/'+id+'/decision',{owner,data:{revision:row.revision,decision,reason}});await queue();await show(id);document.dispatchEvent(new Event('gangrim-projects-changed'));}catch(e){$('owner-status').textContent=(e as Error).message;for(const b of actions.querySelectorAll('button'))b.disabled=false;}}
    if(row.status==='awaiting_owner'){const start=node('button',t('검토 시작'),actions)as HTMLButtonElement;start.className='btn sec';start.type='button';start.onclick=()=>decide('thinking');}
    const label=node('label',t('의사결정 이유'),actions);const reason=document.createElement('textarea');reason.rows=4;reason.maxLength=5000;label.append(reason);
    const buttons=node('div','',actions);buttons.className='dialog-actions';for(const [decision,title]of [['approved',english?'Approve':t('승인')],['needs_revision',english?'Request revision':t('보완 요청')],['rejected',english?'Decline':t('반려')]]){const b=node('button',title,buttons)as HTMLButtonElement;b.className='btn sec';b.type='button';b.onclick=()=>{if(!reason.value.trim()){$('owner-status').textContent=t('의사결정 이유를 입력해주세요.');reason.focus();return;}decide(decision,reason.value.trim());};}
  }box.scrollIntoView({behavior:'smooth',block:'start'});}catch(e){$('owner-status').textContent=(e as Error).message;}}
  $('owner-form').addEventListener('submit',async e=>{e.preventDefault();owner=$<HTMLInputElement>('owner-key').value.trim();$('owner-status').textContent=t('불러오는 중…');try{await queue();$('owner-status').textContent='';}catch(e){$('owner-status').textContent=(e as Error).message;}});
}
