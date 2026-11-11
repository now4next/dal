import {demos} from '../lib/agent-demo';
const root=document.querySelector<HTMLElement>('.showroom')!;
const ko=root.dataset.lang==='ko';
const t=(a:string,b:string)=>ko?a:b;
const examples=demos[ko?'ko':'en'];
const labels=ko?['의사결정 명확성','근거 신뢰도','성과·대안 비교','위험·실현 가능성','실행·검증 준비']:['Decision clarity','Evidence quality','Value and alternatives','Risk and feasibility','Execution readiness'];
const el=(id:string)=>document.getElementById(id)!;
let selected=0,stage=0;
function node(tag:string,text:string,cls=''){const n=document.createElement(tag);n.textContent=text;if(cls)n.className=cls;return n;}
function button(label:string,run:()=>void){const b=document.createElement('button');b.type='button';b.textContent=label;b.addEventListener('click',run);return b;}
function bubble(who:string,text:string,chair=false){const b=node('div','','bubble'+(chair?' chair':''));b.append(node('small',who),node(chair?'strong':'p',text));return b;}
function render(){
 const d=examples[selected],good=stage===2;
 document.querySelectorAll<HTMLButtonElement>('.cases button').forEach((b,i)=>b.setAttribute('aria-pressed',String(i===selected)));
 const conversation=el('conversation');conversation.replaceChildren(bubble(t('보고자 · 가상 브리핑','Reporter · fictional briefing'),d.brief),bubble(t('강림선생 · 핵심 질문','Decision agent · key question'),d.question,true));
 if(stage===1)conversation.append(bubble(t('검토 피드백','Review feedback'),d.weak,true));
 if(good)conversation.append(bubble(t('보고자 · 보완 자료','Reporter · supporting evidence'),d.evidence),bubble(t('강림선생 · 보완 검토','Decision agent · revised review'),t('판단에 필요한 근거와 실행 조건이 보완되었습니다. 아래 항목별 개선과 최종 보고서 예시를 확인하세요.','Evidence and execution conditions are now explicit. Review the criteria and sample report below.'),true));
 const choices=el('choices');choices.replaceChildren();
 if(!good){if(stage===0)choices.append(button(d.weakChoice,()=>{stage=1;render();}));choices.append(button(d.strongChoice,()=>{stage=2;render();}));}
 else choices.append(button(t('완성된 보고서 보기 ↓','View the completed report ↓'),()=>{el('deliverable').scrollIntoView({behavior:'smooth'});}));
 const scores=good?[19,19,19,19,19]:d.scores;
 el('total').textContent=String(scores.reduce((a,b)=>a+b,0));
 el('score-state').textContent=good?t('대표 검토 요청 준비 · 시연','Ready for executive review · demo'):t('보완 필요 · 자료 선택으로 개선해 보세요','Needs work · choose supporting evidence');
 el('criteria').replaceChildren(...scores.map((score,i)=>{const row=node('div','','criterion');const title=node('div','');title.append(node('span',labels[i]),node('strong',`${score} / 20`));row.append(title,node('p',(good?t('보완 반영: ','Added: '):t('19점 목표: ','Target 19: '))+d.actions[i]));return row;}));
 el('report-case').textContent=d.name;el('report-summary').textContent=d.summary;el('report-evidence').textContent=d.evidence;el('report-plan').textContent=d.plan;el('report-risk').textContent=d.risk;el('decision-result').textContent=d.decision;el('decision-result').hidden=true;el('decision').setAttribute('aria-expanded','false');
}
examples.forEach((d,i)=>{const b=button(d.name,()=>{selected=i;stage=0;render();});document.querySelector('.cases')!.append(b);});
el('restart').addEventListener('click',()=>{stage=0;render();});
el('decision').addEventListener('click',()=>{const box=el('decision-result');box.hidden=!box.hidden;el('decision').setAttribute('aria-expanded',String(!box.hidden));});
el('download').addEventListener('click',()=>{
 const d=examples[selected];const text=[t('DAL 의사결정 에이전트 · 가상 결과물','DAL Decision Agent · Illustrative output'),d.name,t('사전 작성된 시뮬레이션입니다. 실제 AI 평가 또는 대표 결정이 아닙니다.','Curated simulation; not a live AI evaluation or an actual executive decision.'),'',d.summary,'',d.evidence,'',d.plan,'',d.risk,'',...labels.map((x,i)=>`${x}: 19/20 — ${d.actions[i]}`),'',d.decision].join('\n');
 const url=URL.createObjectURL(new Blob(['\uFEFF'+text],{type:'text/plain;charset=utf-8'}));const a=document.createElement('a');a.href=url;a.download=`DAL-decision-example-${selected+1}-${ko?'ko':'en'}.txt`;a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);
});
const form=el('inquiry-form') as HTMLFormElement;
function inquiry(){if(!form.reportValidity())return null;const data=new FormData(form);return {subject:`[DAL AI Agent] ${data.get('agent')}`,body:[`${t('관심 분야','Interest')}: ${data.get('agent')}`,`${t('이름 / 조직','Name / organization')}: ${data.get('name')}`,`${t('회신 이메일','Reply email')}: ${data.get('reply')}`,'',`${t('업무와 자료','Workflow and materials')}:`,String(data.get('need'))].join('\n')};}
form.addEventListener('submit',event=>{event.preventDefault();const draft=inquiry();if(!draft)return;const a=document.createElement('a');a.href=`mailto:${root.dataset.email}?subject=${encodeURIComponent(draft.subject)}&body=${encodeURIComponent(draft.body)}`;a.click();el('inquiry-status').textContent=t('메일 작성 화면을 요청했습니다. 아직 전송되지 않았습니다. 메일 앱이 열리지 않으면 문의 내용을 복사해 위 주소로 보내주세요.','Email draft requested; nothing has been sent. If no email app opens, copy your inquiry and send it to the address above.');});
el('copy-inquiry').addEventListener('click',async()=>{const draft=inquiry();if(!draft)return;try{await navigator.clipboard.writeText(`${root.dataset.email}\n${draft.subject}\n\n${draft.body}`);el('inquiry-status').textContent=t('문의 내용을 복사했습니다. 메일에 붙여넣어 직접 전송해 주세요.','Inquiry copied. Paste it into your email and send when ready.');}catch{el('inquiry-status').textContent=t('복사가 허용되지 않았습니다. 입력 내용을 직접 복사해 위 이메일로 보내주세요.','Clipboard unavailable. Copy your entries manually and email the address above.');}});
render();
