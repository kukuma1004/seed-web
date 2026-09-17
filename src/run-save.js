import {validRelics} from './relics.js';
import {LAWS} from './laws.js';
import {ALL_FORMS,isFormEligible} from './forms.js';
import {validActiveGauge,validActiveCooldown} from './actives.js';
import {validInventory} from './inventory.js';
import {validMutations} from './mutations.js';
import {validDashEvolution} from './dash-evolution.js';
import {SLOT_CAP} from './progression.js';
import {roomPoints} from './score.js';
export const SAVE_KEY='seed-run-checkpoint-v1';
export const REGION_NAMES={garden:'깊은 정원',ruins:'붉은 회랑',stadium:'야간 경기장'};
const validLevels=s=>s?.levels===undefined||(s.levels&&typeof s.levels==='object'&&!Array.isArray(s.levels)&&Object.entries(s.levels).every(([id,v])=>Array.isArray(s.rules)&&s.rules.includes(id)&&Number.isInteger(v)&&v>=1&&v<=999));
const validCount=v=>v===undefined||(Number.isInteger(v)&&v>=0&&v<100000);
export function validCheckpoint(s){
 if(!validLevels(s)||!validCount(s?.choicesTaken)||!validCount(s?.choiceKills))return false;
 if(s?.forms!==undefined){
  if(!s.forms||typeof s.forms!=='object'||Array.isArray(s.forms))return false;
  const entries=Object.entries(s.forms);
  if(!entries.every(([id,v])=>Object.hasOwn(ALL_FORMS,id)&&Number.isInteger(v)&&v>=1&&v<=999))return false;
  if(!Array.isArray(s.rules)||s.rules.length+entries.length>SLOT_CAP)return false;
 }
 if(s?.form!=null&&!isFormEligible(s.form,s.rules))return false;
 if(s?.guideTarget!=null&&!Object.hasOwn(ALL_FORMS,s.guideTarget))return false;
 if(!validActiveGauge(s?.activeGauge)||!validActiveCooldown(s?.activeCooldown))return false;
 if(s?.rerollUsed!==undefined&&typeof s.rerollUsed!=='boolean')return false;
 // Score, boss counts and potions arrived later; older saves simply do not have them.
 if(s?.score!==undefined&&!(Number.isInteger(s.score)&&s.score>=0&&s.score<1e12))return false;
 if(!validCount(s?.wardens)||!validCount(s?.austins)||(s?.austins||0)>Math.floor((s?.wardens||0)/5))return false;
 if(!validCount(s?.turretPotionDry))return false;
 if(!validMutations(s?.mutations))return false;
 if(!validInventory(s?.inventory)||!validRelics(s?.relics)||!validDashEvolution(s?.dashEvolution))return false;
 if(s?.mode==='austin'&&s.stage!==4)return false;
 return Boolean(s&&s.version===1&&Number.isInteger(s.cycle)&&s.cycle>=0&&s.cycle<1000000&&Number.isInteger(s.stage)&&s.stage>=0&&s.stage<=4&&['entry','crossroads','austin'].includes(s.mode)&&Object.hasOwn(REGION_NAMES,s.region)&&Number.isFinite(s.hp)&&s.hp>0&&s.hp<=100&&Number.isInteger(s.kills)&&s.kills>=0&&Number.isFinite(s.elapsed)&&s.elapsed>=0&&Array.isArray(s.rules)&&s.rules.length<=SLOT_CAP&&new Set(s.rules).size===s.rules.length&&s.rules.every(id=>Object.hasOwn(LAWS,id))&&Array.isArray(s.mutated)&&new Set(s.mutated).size===s.mutated.length&&s.mutated.every(id=>s.rules.includes(id)));
}
// 2026-09-14 저녁 이전 저장에는 점수와 문지기 수가 없다. 그대로 이어하면 처치 수·시간만 남고
// 점수가 0이라, 랭킹에 앞뒤가 안 맞는 기록이 올라간다(실제로 세 판이 그렇게 올라갔다).
// 지나온 여정만큼을 게임의 점수 규칙으로, 그것도 가장 싼 잡몹 기준으로 낮춰 잡아 채운다.
export function restoredScore(save){
 if(Number.isInteger(save?.score))return save.score;
 const cycle=Math.max(0,save?.cycle|0),kills=Math.max(0,save?.kills|0),perCycle=kills/(cycle+1);
 let total=0;
 for(let c=0;c<=cycle;c++){
  total+=perCycle*20*(1+c*.5);
  if(c<cycle)for(let stage=0;stage<5;stage++)total+=roomPoints(stage,c);
 }
 return Math.round(total);
}
// 여정을 넘어왔다면 그만큼 문지기를 이긴 것이고, 오스틴은 문지기 다섯마다 하나다.
export function restoredWardens(save){return Number.isInteger(save?.wardens)?save.wardens:Math.max(0,save?.cycle|0);}
export function restoredAustins(save){return Number.isInteger(save?.austins)?save.austins:Math.floor(restoredWardens(save)/5);}
// 2026-09-17에 숨긴 차원 법칙이나 자동 조합이 든 저장은 버리지 않는다. 그 법칙·조합만 빼고 나머지로 이어한다.
export function withoutHidden(s){
 if(!s||typeof s!=='object'||!Array.isArray(s.rules))return s;
 const law=id=>Object.hasOwn(LAWS,id),form=id=>Object.hasOwn(ALL_FORMS,id),map=v=>v&&typeof v==='object'&&!Array.isArray(v);
 const next={...s,rules:s.rules.filter(law)};
 if(Array.isArray(s.mutated))next.mutated=s.mutated.filter(law);
 if(map(s.levels))next.levels=Object.fromEntries(Object.entries(s.levels).filter(([id])=>law(id)));
 if(map(s.forms))next.forms=Object.fromEntries(Object.entries(s.forms).filter(([id])=>form(id)));
 if(s.guideTarget!=null&&!form(s.guideTarget))next.guideTarget=null;
 if(s.form!=null&&!form(s.form))next.form=null;
 return next;
}
export function readCheckpoint(storage){try{const s=withoutHidden(JSON.parse(storage.getItem(SAVE_KEY)));return validCheckpoint(s)?s:null;}catch{return null;}}
export function writeCheckpoint(storage,s){if(!validCheckpoint(s))return false;try{storage.setItem(SAVE_KEY,JSON.stringify(s));return true;}catch{return false;}}
export function clearCheckpoint(storage){try{storage.removeItem(SAVE_KEY);return true;}catch{return false;}}
// Each journey after a warden is faster. The old region choice is gone; saved regions only name the place.
export function difficulty(cycle){return {hp:1+Math.min(cycle,20)*.24,speed:Math.min(1.9,1+cycle*.08),bossHp:1+Math.min(cycle,20)*.3};}
export function replaceLaw(rules,mutated,oldId,newId){
 if(!rules.includes(oldId)||rules.includes(newId)||!Object.hasOwn(LAWS,newId))throw new Error('Invalid law replacement');
 return {rules:rules.map(id=>id===oldId?newId:id),mutated:mutated.filter(id=>id!==oldId)};
}
