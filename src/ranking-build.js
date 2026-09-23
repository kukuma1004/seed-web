import {ALL_FORMS} from './forms.js';
import {LAWS} from './laws.js';
import {RELICS} from './relics.js';

// What a finished run was built from, kept beside its ranking line.
// Stored as short strings ("split:5,chain:2") so the database rules can check the length simply.
export const BUILD_TEXT_MAX=120;
const pairs=(map,known)=>[...map].filter(([id,lv])=>Object.hasOwn(known,id)&&Number.isInteger(lv)&&lv>=1&&lv<=999)
 .sort((a,b)=>b[1]-a[1]).map(([id,lv])=>`${id}:${lv}`).join(',').slice(0,BUILD_TEXT_MAX);
const count=v=>Number.isInteger(v)&&v>=0&&v<=100000?v:0;

export function buildRecord({levels=new Map(),forms=new Map(),relic=null,wardens=0,austins=0}={}){
 return {laws:pairs(levels,LAWS),forms:pairs(forms,ALL_FORMS),relic:relic&&Object.hasOwn(RELICS,relic)?relic:'',wardens:count(wardens),austins:count(austins)};
}
export function validBuild(b){
 return Boolean(b&&typeof b==='object'&&['laws','forms','relic'].every(k=>typeof b[k]==='string'&&b[k].length<=BUILD_TEXT_MAX)&&Number.isInteger(b.wardens)&&b.wardens>=0&&Number.isInteger(b.austins)&&b.austins>=0);
}
// Unknown ids from a newer or older game are skipped, never shown as raw text.
const parsePairs=(text,known)=>String(text||'').split(',').map(part=>part.split(':')).filter(([id,lv])=>Object.hasOwn(known,id)&&/^\d{1,3}$/.test(lv||'')).map(([id,lv])=>[id,Number(lv)]);
export function parseBuild(b){
 if(!validBuild(b))return null;
 return {laws:parsePairs(b.laws,LAWS),forms:parsePairs(b.forms,ALL_FORMS),relic:Object.hasOwn(RELICS,b.relic)?b.relic:null,wardens:b.wardens,austins:b.austins};
}
// Plain text version (tests, titles and screen readers).
export function buildText(b){
 const p=parseBuild(b);if(!p)return '';
 const parts=[...p.forms.map(([id,lv])=>`${ALL_FORMS[id].name} Lv.${lv}`),...p.laws.map(([id,lv])=>`${LAWS[id].name} Lv.${lv}`)];
 if(p.relic)parts.push(`유물 ${RELICS[p.relic].name}`);
 return parts.join(' · ');
}
export function bossText(b,act=1){
 const p=parseBuild(b);if(!p)return '';
 const boss=act===3?'폭풍비행사 요한':act===2?'항상초심':'오스틴';
 return `문지기 ${p.wardens}${p.austins?` · ${boss} ${p.austins}회 격파`:''}`;
}
