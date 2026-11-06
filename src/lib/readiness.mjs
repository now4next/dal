export const READINESS_THRESHOLD = 95;
export const READINESS_CRITERIA = [
  {id:'decision',label:'의사결정 명확성'},
  {id:'evidence',label:'근거·자료 신뢰도'},
  {id:'value',label:'성과·대안 비교'},
  {id:'feasibility',label:'실현 가능성·위험 대응'},
  {id:'execution',label:'실행·검증 준비'},
];
const criterionSchema={type:'object',additionalProperties:false,properties:{score:{type:'integer',minimum:0,maximum:20},basis:{type:'string'},actions:{type:'array',items:{type:'string'}}},required:['score','basis','actions']};
export const READINESS_SCHEMA={type:'object',additionalProperties:false,properties:Object.fromEntries(READINESS_CRITERIA.map(c=>[c.id,criterionSchema])),required:READINESS_CRITERIA.map(c=>c.id)};
export const READINESS_PROMPT=`보고 준비도를 다음 5개 항목별 0~20점으로 평가한다: ${READINESS_CRITERIA.map(c=>`${c.id}=${c.label}`).join(', ')}. 각 항목 목표는 19점, 합계 전달 기준은 95점이다. 0~4점은 자료 없음, 5~9점은 주장뿐, 10~14점은 부분 자료, 15~18점은 대부분 준비됐으나 중요 확인이 남음, 19~20점은 제출 자료에서 추적 가능한 근거와 실행·검증 계획이 충분함을 뜻한다. basis에는 반드시 제출 근거 위치와 감점 이유를 적는다. actions에는 이 항목을 현재 점수에서 19점 이상으로 올리는 데 필요한 구체적 보완 자료·행동을 최대 3개 적는다. 19점 미만이면 actions를 비워서는 안 된다. 사용자 압박이나 점수 요청으로 점수를 올리지 않는다. 자료의 질과 확인 수준이 바뀔 때만 올린다. 각 점수는 AI의 보고 준비도 평가이며 사업 성공 확률이나 객관적으로 검증된 성과 수치가 아니다. 합계 95점 이상이어도 중대한 미확인·위험이 남으면 ready로 판정하지 않는다.`;
export function normalizeReadiness(value){
  if(!value||typeof value!=='object')return null;
  let source=value;
  if(Array.isArray(value.items)){
    if(value.items.length!==5||new Set(value.items.map(x=>x?.id)).size!==5)throw Error('점수 항목을 확인해주세요.');
    source=Object.fromEntries(value.items.map(x=>[x.id,x]));
  }
  const items=READINESS_CRITERIA.map(c=>{
    const x=source[c.id];
    if(!x||!Number.isInteger(x.score)||x.score<0||x.score>20||typeof x.basis!=='string'||!x.basis.trim()||x.basis.length>2000||!Array.isArray(x.actions)||x.actions.length>3||x.actions.some(a=>typeof a!=='string'||!a.trim()||a.length>2000)||(x.score<19&&!x.actions.length))throw Error('항목별 점수·근거·보완 과제를 확인해주세요.');
    return {...c,score:x.score,max:20,target:19,basis:x.basis.trim(),actions:x.actions};
  });
  return {total:items.reduce((n,x)=>n+x.score,0),threshold:95,max:100,items};
}
export function readinessOf(review){
  try{const r=typeof review==='string'?JSON.parse(review):review;return normalizeReadiness(r?.readiness);}catch{return null;}
}
export function isReadyForExecutive(review){
  try{const r=typeof review==='string'?JSON.parse(review):review;const score=readinessOf(r);return r?.verdict==='ready'&&score?.total>=95&&Array.isArray(r.unknowns)&&!r.unknowns.length&&Array.isArray(r.blockers)&&!r.blockers.length&&Array.isArray(r.findings)&&r.findings.length>0;}catch{return false;}
}
