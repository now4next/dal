import {translate} from '../lib/decision-copy.mjs';
export const english=document.documentElement.lang==='en';
export const locale=english?'en-US':'ko-KR';
export const t=(text:string)=>translate(text,english?'en':'ko');
