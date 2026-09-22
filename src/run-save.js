import {MAX_RUN_CYCLE} from './journey.js';
import {validRelics} from './relics.js';
import {LAWS} from './laws.js';
import {ALL_FORMS,isFormEligible} from './forms.js';
import {validActiveGauge,validActiveCooldown} from './actives.js';
import {normalizeInventory,validInventory} from './inventory.js';
import {validMutations} from './mutations.js';
import {validDashEvolution} from './dash-evolution.js';
import {validRunBonuses} from './run-bonuses.js';
import {SLOT_CAP} from './progression.js';
import {roomPoints} from './score.js';
import {MASTERY_STEP,MASTERY_STAT_CAP} from './garden.js';
import {ALWAYS_BEGINNER_MAX_HP,ALWAYS_CLEAR_MAX_HP} from './titles.js';

// 저장에 담을 수 있는 최대 생명력 = 정원 생명력 강화 상한(+5%) + 가장 큰 칭호 보너스(+20) + 여유 5.
// 예전 상한 110은 칭호·정원 강화가 생기기 전 값이었다. 그래서 '초심을 지킨 자'(+10)에 정원 생명력이 0.1%만 붙어도,
// '초심을 완성한 자'(+20)가 있으면 언제나 방 입구 저장이 무효가 되어 조용히 실패했고, '저장하고 나가기'는
// "저장 기록이 없습니다"에서 멈췄다(2026-09-22 사용자 신고). 새 생명력 보너스가 생기면 이 값도 함께 올린다(run-save-test가 검사).
export const MAX_SAVED_HP=Math.ceil(100*(1+MASTERY_STEP*MASTERY_STAT_CAP))+Math.max(ALWAYS_BEGINNER_MAX_HP,ALWAYS_CLEAR_MAX_HP)+5;
export const SAVE_KEY='seed-run-checkpoint-v1';
export const REGION_NAMES={garden:'깊은 정원',ruins:'붉은 회랑',stadium:'야간 경기장',skyway:'폭풍의 항로'};
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
 if(!validCount(s?.playDashes)||!validCount(s?.playDamage))return false;
 if(!validCount(s?.turretPotionDry))return false;
 if(!validMutations(s?.mutations))return false;
 if(!validInventory(s?.inventory)||!validRelics(s?.relics)||!validDashEvolution(s?.dashEvolution)||!validRunBonuses(s?.runBonuses))return false;
 if(s?.mode==='austin'&&s.stage!==4)return false;
 return Boolean(s&&s.version===1&&Number.isInteger(s.cycle)&&s.cycle>=0&&s.cycle<1000000&&Number.isInteger(s.stage)&&s.stage>=0&&s.stage<=4&&['entry','crossroads','austin'].includes(s.mode)&&Object.hasOwn(REGION_NAMES,s.region)&&Number.isFinite(s.hp)&&s.hp>0&&s.hp<=MAX_SAVED_HP&&Number.isInteger(s.kills)&&s.kills>=0&&Number.isFinite(s.elapsed)&&s.elapsed>=0&&Array.isArray(s.rules)&&s.rules.length<=SLOT_CAP&&new Set(s.rules).size===s.rules.length&&s.rules.every(id=>Object.hasOwn(LAWS,id))&&Array.isArray(s.mutated)&&new Set(s.mutated).size===s.mutated.length&&s.mutated.every(id=>s.rules.includes(id)));
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
 if(map(s.inventory))next.inventory=normalizeInventory(s.inventory);
 if(s.guideTarget!=null&&!form(s.guideTarget))next.guideTarget=null;
 if(s.form!=null&&!form(s.form))next.form=null;
 return next;
}
export function readCheckpoint(storage){try{const s=withoutHidden(JSON.parse(storage.getItem(SAVE_KEY)));return validCheckpoint(s)?s:null;}catch{return null;}}
export function writeCheckpoint(storage,s){if(!validCheckpoint(s))return false;try{storage.setItem(SAVE_KEY,JSON.stringify(s));return true;}catch{return false;}}
export function clearCheckpoint(storage){try{storage.removeItem(SAVE_KEY);return true;}catch{return false;}}
// A checkpoint represents the room entrance. Leaving halfway restarts the full
// room, so gains made inside it must not survive while the enemies respawn.
// Losses do survive: otherwise reloading heals damage and refunds drunk potions.
export function roomExitCheckpoint(entry,{hp,inventory}={}){
 if(!validCheckpoint(entry))return null;
 const before=normalizeInventory(entry.inventory),after=normalizeInventory(inventory),spent={};
 for(const id of Object.keys(before))spent[id]=Math.min(before[id],after[id]);
 const currentHp=Number.isFinite(hp)&&hp>0?hp:entry.hp;
 return {...entry,hp:Math.max(.01,Math.min(entry.hp,currentHp)),inventory:spent};
}
// Each journey after a warden is faster. Speed reaches its readable cap, while
// health keeps growing gently after journey 20. Player evolution levels never
// stop growing, so capping enemy health made very long runs progressively
// easier and let the score multiplier rise without resistance.
// 2026-09-21: 씨앗은 끝까지 세지는데 적은 여정 13(속도)·15(탄속)·26(공격력)에서 멈춰, 뒤쪽 여정이 시간만 잡아먹었다.
// 한 판이 찐보스 열 번(50번째 여정)에서 끝나므로 거기까지 적의 위협도 계속 오른다. 앞쪽 곡선은 그대로 두고,
// 멈추던 지점부터 완만하게 이어 올린다. 체력은 원래도 계속 올라 그대로 둔다(더 올리면 시간만 길어진다).
// 50번째 여정을 넘긴 옛 저장은 50번째 값에 머문다.
export const LATE_SCALING=Object.freeze({speed:Object.freeze({from:12,slope:.01}),projectileSpeed:Object.freeze({from:14,slope:.005}),damage:Object.freeze({from:25,slope:.03}),bossTempo:Object.freeze({from:12,slope:.004})});
const tail=(c,{from,slope})=>Math.max(0,Math.min(c,MAX_RUN_CYCLE)-from)*slope;
export function difficulty(cycle){
 const c=Math.max(0,Number(cycle)||0),early=Math.min(c,20),late=Math.max(0,c-20);
 return {hp:1+early*.24+late*.16,speed:Math.min(1.9,1+c*.08)+tail(c,LATE_SCALING.speed),projectileSpeed:Math.min(1.35,1+c*.025)+tail(c,LATE_SCALING.projectileSpeed),bossHp:1+early*.3+late*.2,damage:Math.min(2.5,1+c*.06)+tail(c,LATE_SCALING.damage),bossTempo:Math.min(1.3,1+c*.025)+tail(c,LATE_SCALING.bossTempo)};
}
export function replaceLaw(rules,mutated,oldId,newId){
 if(!rules.includes(oldId)||rules.includes(newId)||!Object.hasOwn(LAWS,newId))throw new Error('Invalid law replacement');
 return {rules:rules.map(id=>id===oldId?newId:id),mutated:mutated.filter(id=>id!==oldId)};
}
