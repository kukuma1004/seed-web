import {normalizeBossRuns} from './boss-title-ledger.js';
import {readBossVictoryAccount,projectBossVictoryProfile} from './boss-victory-account.js';
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
// Reserve all approved journey acts in the existing account record. This does
// not release acts 4/5 or grant scores from developer inspection runs.
const BEST_ACTS=['act1','act2','act3','act4','act5'];
export const normalizeBestScores=value=>Object.fromEntries(BEST_ACTS.map(act=>[act,Number.isSafeInteger(value?.[act])?Math.max(0,Math.min(1e12,value[act])):0]));
export const mergeBestScores=(a,b)=>{const left=normalizeBestScores(a),right=normalizeBestScores(b);return Object.fromEntries(BEST_ACTS.map(act=>[act,Math.max(left[act],right[act])]));};
export function recordBestScore(profile,act,score){
 const next=normalizeAccountProfile(profile);
 if(BEST_ACTS.includes(act)&&Number.isSafeInteger(score)&&score>next.bestScores[act])next.bestScores[act]=Math.min(1e12,score);
 return next;
}
const EMPTY=()=>({version:1,badges:[],skins:[],equippedTitle:'',appliedGrants:[],lastRewardAt:0,bestScores:normalizeBestScores(),austinWins:0,alwaysWins:0,johanWins:0,crosswindWins:0,crystalWins:0,bossRuns:{}});

export function normalizeAccountProfile(value){
 return {
  version:1,
  badges:ids(value?.badges,null,40),
  skins:ids(value?.skins,null,80),
  equippedTitle:title(value?.equippedTitle),
  appliedGrants:ids(value?.appliedGrants,null,100),
  lastRewardAt:Number.isFinite(value?.lastRewardAt)?Math.max(0,Math.floor(value.lastRewardAt)):0,
  bestScores:normalizeBestScores(value?.bestScores),
  bossRuns:normalizeBossRuns(value?.bossRuns),
  austinWins:Number.isSafeInteger(value?.austinWins)?Math.max(0,Math.min(100000,value.austinWins)):0,
  alwaysWins:Number.isSafeInteger(value?.alwaysWins)?Math.max(0,Math.min(100000,value.alwaysWins)):0,
  johanWins:Number.isSafeInteger(value?.johanWins)?Math.max(0,Math.min(100000,value.johanWins)):0,
  crosswindWins:Number.isSafeInteger(value?.crosswindWins)?Math.max(0,Math.min(100000,value.crosswindWins)):0,
  crystalWins:Number.isSafeInteger(value?.crystalWins)?Math.max(0,Math.min(100000,value.crystalWins)):0
 };
}

const cloudOwner=storage=>storage?.getItem('seed-cloud-owner-v1');
export function readAccountProfile(storage,ownerUid=cloudOwner(storage)){
 let profile;try{profile=normalizeAccountProfile(JSON.parse(storage?.getItem(ACCOUNT_PROFILE_KEY)));}catch{profile=EMPTY();}
 // A corrupt/newer V2 cache must not silently fall back to historical numbers.
 return ownerUid?projectBossVictoryProfile(storage,profile,ownerUid):profile;
}

export function writeAccountProfile(storage,value,ownerUid){
 try{
  if(ownerUid===undefined)ownerUid=cloudOwner(storage);
  let profile=normalizeAccountProfile(value);
  if(ownerUid&&readBossVictoryAccount(storage,ownerUid)){
   const raw=storage.getItem(ACCOUNT_PROFILE_KEY),previous=raw===null?null:JSON.parse(raw);
   if(previous!==null&&(!previous||typeof previous!=='object'||Array.isArray(previous)||previous.version!==1))return false;
   // Derived event totals are a view. Keep the original local counters/history
   // intact, and serialize the frozen server baseline separately for cloud saves.
   profile={...(previous||{}),...profile};
   for(const field of ['austinWins','alwaysWins','johanWins','crosswindWins','crystalWins','bossRuns']){
    if(previous&&Object.hasOwn(previous,field))profile[field]=previous[field];else delete profile[field];
   }
  }
  const raw=JSON.stringify(profile);storage?.setItem(ACCOUNT_PROFILE_KEY,raw);return storage?.getItem(ACCOUNT_PROFILE_KEY)===raw;
 }catch{return false;}
}

export function accountBadgeLine(profile){
 const badges=normalizeAccountProfile(profile).badges.map(id=>BADGES[id]?.name||id).filter(Boolean);
 return badges.join(' · ');
}
