import copy from './decision-copy.json' with {type:'json'};
export function translate(text,language='ko'){
 if(language!=='en'||!text)return text;
 if(copy[text]!==undefined)return copy[text];
 if(copy[text.trim()]!==undefined)return copy[text.trim()];
 let match;
 if((match=text.match(/^보고 준비도 (\d+)점 · 대표 전달 기준 95점$/)))return `Readiness ${match[1]}/100 · CEO threshold 95`;
 if((match=text.match(/^95점까지 (\d+)점$/)))return `${match[1]} points to reach 95`;
 if((match=text.match(/^준비도 (\d+)점 \/ 100$/)))return `Readiness ${match[1]}/100`;
 if((match=text.match(/^준비도 (\d+) \/ 100 · 전달 기준 95점$/)))return `Readiness ${match[1]}/100 · Submission threshold 95`;
 if((match=text.match(/^(.*?)  (\d+)\/20 → 목표 (\d+)\/20$/)))return `${translate(match[1],'en')} ${match[2]}/20 → Target ${match[3]}/20`;
 if(text.startsWith('프로젝트번호:'))return text.replace('프로젝트번호:','Project ID:').replace('조회키:','Project key:').replace('조회키 보유자는 이 프로젝트를 열람할 수 있습니다. 안전하게 보관해주세요.','Anyone with this key can access the project. Keep it secure.');
 return text;
}
