import {t,english,locale} from './language';
import {readinessOf} from '../lib/readiness.mjs';
import {node,decisionOf,statusOf,downloadAttachment} from './project-client';
const fieldNames:Record<string,string>={question:t('결정할 사안'),context:t('배경·목표'),evidence:t('근거·자료'),alternatives:t('대안·성과'),risks:t('위험·대응'),plan:t('실행 계획'),verification:t('검증 계획')};
export function scoreView(box:HTMLElement,review:any){
  box.replaceChildren();const score=readinessOf(review);if(!score){node('p',t('준비도 평가 전'),box);return;}
  node('p',t(`준비도 ${score.total} / 100 · 전달 기준 95점`),box).className='score-caption';
  for(const item of score.items){const section=node('section','',box);section.className='score-item';node('h4',t(`${item.label}  ${item.score}/20 → 목표 ${item.target}/20`),section);const meter=document.createElement('meter');meter.min=0;meter.max=20;meter.value=item.score;meter.setAttribute('aria-label',t(item.label));section.append(meter);node('p',item.basis,section);const ul=node('ul','',section);for(const action of item.actions)node('li',action,ul);if(!item.actions.length)node('p',t('현재 근거 수준 유지'),section);}
  node('small',t('AI가 제출 자료를 바탕으로 평가한 보고 준비도입니다.'),box);
}
export function reportView(box:HTMLElement,report:any,access:{token?:string;owner?:string},onError:(text:string)=>void){
  box.replaceChildren();node('h2',report.body.title,box);node('p',`${statusOf(report)} · ${report.body.author} · v${report.revision}`,box).className='project-meta';
  const decision=decisionOf(report);const result=node('section','',box);result.className='decision-result';
  if(decision){node('h3',t('대표의 의사결정'),result);node('strong',({approved:t('승인'),rejected:t('반려'),needs_revision:t('보완 요청')} as Record<string,string>)[decision.decision]||decision.decision,result);node('p',decision.reason,result);node('small',new Date(decision.at).toLocaleString(locale),result);}
  else if(['awaiting_owner','reviewing_owner'].includes(report.status)){node('h3',statusOf(report),result);node('p',report.status==='reviewing_owner'?t('대표가 검토를 시작했습니다. 결정과 이유가 도착하면 이 프로젝트에서 확인할 수 있습니다.'):t('대표에게 전달됐습니다. 검토 시작과 의사결정 결과는 이곳에 표시됩니다.'),result);}
  else{node('h3',statusOf(report),result);node('p',t('준비도 95점 이상이며 중대한 미확인 사항이 없어야 대표에게 전달됩니다.'),result);}
  node('h3',t('핵심 요약'),box);node('p',report.body.executive_summary||report.review?.summary||report.body.question,box);
  const details=document.createElement('details');box.append(details);node('summary',t('세부 설명과 근거'),details);for(const [key,label]of Object.entries(fieldNames)){node('h4',label,details);node('p',report.body[key],details);}
  const scores=document.createElement('details');box.append(scores);node('summary',t('항목별 준비도와 보완 사항'),scores);const scoreBox=node('div','',scores);scoreView(scoreBox,report.review);
  if(report.files?.length){node('h3',t('첨부 자료'),box);for(const [i,file]of report.files.entries()){const b=node('button',file.name,box) as HTMLButtonElement;b.type='button';b.className='attachment-button';b.onclick=async()=>{b.disabled=true;try{await downloadAttachment(report,i,access.token,access.owner);}catch(e){onError((e as Error).message);}finally{b.disabled=false;}};}}
  if(report.events?.length){const history=document.createElement('details');box.append(history);node('summary',t('보고·의사결정 이력'),history);for(const e of report.events){const label=({briefing_confirmed:t('보고서 정리'),briefing_reopened:t('보완 시작'),escalated:t('대표 전달'),owner_started:t('대표 검토 시작'),owner_decision:t('대표 의사결정'),submitted:t('접수'),reviewed:t('준비도 평가'),revised:t('보고서 수정')} as Record<string,string>)[e.kind]||e.kind;node('p',`${new Date(e.created_at).toLocaleString(locale)} · ${label} · v${e.revision}`,history);if(e.kind==='owner_decision')node('p',JSON.parse(e.detail).reason,history);}}
}
