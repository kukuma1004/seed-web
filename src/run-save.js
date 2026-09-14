import {LAWS} from './laws.js';
import {FORMS,isFormEligible} from './forms.js';
export const SAVE_KEY='seed-run-checkpoint-v1';
export const REGION_NAMES={garden:'깊은 정원',ruins:'붉은 회랑'};
const validLevels=s=>s?.levels===undefined||(s.levels&&typeof s.levels==='object'&&!Array.isArray(s.levels)&&Object.entries(s.levels).every(([id,v])=>Array.isArray(s.rules)&&s.rules.includes(id)&&Number.isInteger(v)&&v>=1&&v<=999));
const validCount=v=>v===undefined||(Number.isInteger(v)&&v>=0&&v<100000);
export function validCheckpoint(s){
 if(!validLevels(s)||!validCount(s?.choicesTaken)||!validCount(s?.choiceKills))return false;
 if(s?.form!=null&&!isFormEligible(s.form,s.rules))return false;
 if(s?.guideTarget!=null&&!Object.hasOwn(FORMS,s.guideTarget))return false;
 if(s?.rerollUsed!==undefined&&typeof s.rerollUsed!=='boolean')return false;
 return Boolean(s&&s.version===1&&Number.isInteger(s.cycle)&&s.cycle>=0&&s.cycle<1000000&&Number.isInteger(s.stage)&&s.stage>=0&&s.stage<=4&&['entry','crossroads'].includes(s.mode)&&Object.hasOwn(REGION_NAMES,s.region)&&Number.isFinite(s.hp)&&s.hp>0&&s.hp<=100&&Number.isInteger(s.kills)&&s.kills>=0&&Number.isFinite(s.elapsed)&&s.elapsed>=0&&Array.isArray(s.rules)&&s.rules.length<=5&&new Set(s.rules).size===s.rules.length&&s.rules.every(id=>Object.hasOwn(LAWS,id))&&Array.isArray(s.mutated)&&new Set(s.mutated).size===s.mutated.length&&s.mutated.every(id=>s.rules.includes(id)));
}
export function readCheckpoint(storage){try{const s=JSON.parse(storage.getItem(SAVE_KEY));return validCheckpoint(s)?s:null;}catch{return null;}}
export function writeCheckpoint(storage,s){if(!validCheckpoint(s))return false;try{storage.setItem(SAVE_KEY,JSON.stringify(s));return true;}catch{return false;}}
export function clearCheckpoint(storage){try{storage.removeItem(SAVE_KEY);return true;}catch{return false;}}
export function difficulty(cycle,region){return {hp:1+Math.min(cycle,20)*.24,speed:Math.min(1.65,1+cycle*.055)*(region==='ruins'?1.1:1),bossHp:1+Math.min(cycle,20)*.3};}
export function replaceLaw(rules,mutated,oldId,newId){
 if(!rules.includes(oldId)||rules.includes(newId)||!Object.hasOwn(LAWS,newId))throw new Error('Invalid law replacement');
 return {rules:rules.map(id=>id===oldId?newId:id),mutated:mutated.filter(id=>id!==oldId)};
}
