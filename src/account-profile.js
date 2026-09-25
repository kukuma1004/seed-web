export const ACCOUNT_PROFILE_KEY='seed-account-profile-v1';
export const FOUNDING_BADGE='founding-tester';
export const FOUNDING_SEED='founder';
export const FIRST_GARDEN_BADGE='first-garden-pioneer';

export const BADGES=Object.freeze({
 [FOUNDING_BADGE]:Object.freeze({id:FOUNDING_BADGE,name:'SEED Founding Tester',label:'창립 테스터',description:'SEED의 첫 비공개 테스트에 함께한 기록'}),
 [FIRST_GARDEN_BADGE]:Object.freeze({id:FIRST_GARDEN_BADGE,name:'첫 정원의 선구자',label:'첫 정원의 선구자',description:'베타 시즌 1.1 이전 명예의 전당 TOP 10 기록'})
});

const ids=(value,known=null,limit=100)=>[...new Set(Array.isArray(value)?value.filter(id=>typeof id==='string'&&id.length<=48&&(!known||known.has(id))):[])].slice(0,limit);
const title=value=>typeof value==='string'&&value.length<=48?value:'';
const BEST_ACTS=['act1','act2','act3'];
export const normalizeBestScores=value=>Object.fromEntries(BEST_ACTS.map(act=>[act,Number.isSafeInteger(value?.[act])?Math.max(0,Math.min(1e12,value[act])):0]));
export const mergeBestScores=(a,b)=>{const left=normalizeBestScores(a),right=normalizeBestScores(b);return Object.fromEntries(BEST_ACTS.map(act=>[act,Math.max(left[act],right[act])]));};
export function recordBestScore(profile,act,score){
 const next=normalizeAccountProfile(profile);
 if(BEST_ACTS.includes(act)&&Number.isSafeInteger(score)&&score>next.bestScores[act])next.bestScores[act]=Math.min(1e12,score);
 return next;
}
const EMPTY=()=>({version:1,badges:[],skins:[],equippedTitle:'',appliedGrants:[],lastRewardAt:0,bestScores:normalizeBestScores(),austinWins:0});

export function normalizeAccountProfile(value){
 return {
  version:1,
  badges:ids(value?.badges,null,40),
  skins:ids(value?.skins,null,80),
  equippedTitle:title(value?.equippedTitle),
  appliedGrants:ids(value?.appliedGrants,null,100),
  lastRewardAt:Number.isFinite(value?.lastRewardAt)?Math.max(0,Math.floor(value.lastRewardAt)):0,
  bestScores:normalizeBestScores(value?.bestScores),
  austinWins:Number.isSafeInteger(value?.austinWins)?Math.max(0,Math.min(100000,value.austinWins)):0
 };
}

export function readAccountProfile(storage){
 try{return normalizeAccountProfile(JSON.parse(storage?.getItem(ACCOUNT_PROFILE_KEY)));}catch{return EMPTY();}
}

export function writeAccountProfile(storage,value){
 try{storage?.setItem(ACCOUNT_PROFILE_KEY,JSON.stringify(normalizeAccountProfile(value)));return true;}catch{return false;}
}

export function accountBadgeLine(profile){
 const badges=normalizeAccountProfile(profile).badges.map(id=>BADGES[id]?.name||id).filter(Boolean);
 return badges.join(' · ');
}
