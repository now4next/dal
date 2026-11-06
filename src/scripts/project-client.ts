export type Receipt={id:string;token:string;title:string;kind:'briefing'|'report'};
const origin=()=>document.querySelector<HTMLElement>('.gangrim')?.dataset.api?.replace(/\/$/,'')||'';
export async function api(path:string,options:{data?:any;token?:string;owner?:string}={}){
  if(!origin())throw Error('보고 서비스에 연결되지 않았습니다. 공개 사이트에서 다시 확인해주세요.');
  const response=await fetch(origin()+path,{method:options.data===undefined?'GET':'POST',headers:{'Content-Type':'application/json',...(options.token?{'X-Case-Token':options.token}:{}),...(options.owner?{Authorization:'Bearer '+options.owner}:{})},body:options.data===undefined?undefined:JSON.stringify(options.data),signal:AbortSignal.timeout(110000)});
  const data=await response.json().catch(()=>({error:'서버 응답을 읽을 수 없습니다.'}));if(!response.ok)throw Object.assign(Error(data.error||'요청을 처리하지 못했습니다.'),{status:response.status});return data;
}
export function node(tag:string,text:string,parent:HTMLElement){const el=document.createElement(tag);el.textContent=text;parent.append(el);return el;}
export function decisionOf(report:any){const events=report?.events?.filter((e:any)=>e.kind==='owner_decision'&&e.revision===report.revision)||[];const event=events.at(-1);return event?{...JSON.parse(event.detail),at:event.created_at}:null;}
export function statusOf(report:any,session?:any){
  if(report){if(decisionOf(report))return '결과 도착';return ({awaiting_owner:'대표 전달 완료',reviewing_owner:'대표님 생각 중',ready:'대표 전달 준비',approved:'결과 도착',rejected:'결과 도착',needs_revision:'보완 필요',hold:'추가 확인 필요',preparing:'보고 준비 중',submitted:'검토 대기',reviewing:'AI 검토 중'} as Record<string,string>)[report.status]||'보고 준비 중';}
  return session?.status==='processing'?'AI 검토 중':session?.state.feedback?'보완 대화 중':'보고 대화 중';
}
const sessionKey='gangrim-projects-v1',deviceKey='gangrim-device-projects-v1';
function valid(value:any):value is Receipt{return value&&/^[a-f0-9-]{36}$/.test(value.id)&&/^[a-f0-9]{64}$/.test(value.token)&&['briefing','report'].includes(value.kind)&&typeof value.title==='string';}
function read(storage:Storage,key:string){try{const a=JSON.parse(storage.getItem(key)||'[]');return Array.isArray(a)?a.filter(valid).slice(0,20):[];}catch{return [];}}
export function receipts():Receipt[]{const all=[...read(sessionStorage,sessionKey),...read(localStorage,deviceKey)];return all.filter((x,i)=>all.findIndex(y=>y.id===x.id)===i).slice(0,20);}
export function deviceSaved(){try{return localStorage.getItem(deviceKey)!==null;}catch{return false;}}
export function remember(item:Receipt){const all=[item,...receipts().filter(x=>x.id!==item.id)].slice(0,20);try{sessionStorage.setItem(sessionKey,JSON.stringify(all));if(deviceSaved())localStorage.setItem(deviceKey,JSON.stringify(all));}catch{}document.dispatchEvent(new Event('gangrim-projects-changed'));}
export function setDeviceSaved(enabled:boolean){try{if(enabled)localStorage.setItem(deviceKey,JSON.stringify(receipts()));else localStorage.removeItem(deviceKey);}catch{throw Error('이 브라우저에서 기기 보관을 사용할 수 없습니다.');}}
export async function loadProject(receipt:Receipt){
  let session:any=null,report:any=null;
  if(receipt.kind==='briefing'){session=await api('/api/briefings/'+receipt.id,{token:receipt.token});if(session.state.report_id)report=await api('/api/reports/'+session.state.report_id,{token:receipt.token});}
  else report=await api('/api/reports/'+receipt.id,{token:receipt.token});
  return {session,report};
}
export function saveText(filename:string,text:string){const blob=new Blob([text],{type:'text/plain;charset=utf-8'});const url=URL.createObjectURL(blob);const a=document.createElement('a');a.href=url;a.download=filename;a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);}
export async function downloadAttachment(report:any,index:number,token='',owner=''){
  const response=await fetch(`${origin()}/api/reports/${report.id}/attachments/${index}`,{headers:owner?{Authorization:'Bearer '+owner}:{'X-Case-Token':token}});
  if(!response.ok)throw Error('첨부를 내려받을 권한이 없거나 자료가 없습니다.');const url=URL.createObjectURL(await response.blob());const a=document.createElement('a');a.href=url;a.download=report.files[index].name;a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);
}
