export const ACCOUNT_PROFILE_KEY='seed-account-profile-v1';
export const FOUNDING_BADGE='founding-tester';
export const FOUNDING_SEED='founder';

export const BADGES=Object.freeze({
 [FOUNDING_BADGE]:Object.freeze({id:FOUNDING_BADGE,name:'SEED Founding Tester',label:'창립 테스터',description:'SEED의 첫 비공개 테스트에 함께한 기록'})
});

const ids=(value,known=null,limit=100)=>[...new Set(Array.isArray(value)?value.filter(id=>typeof id==='string'&&id.length<=48&&(!known||known.has(id))):[])].slice(0,limit);
const EMPTY=()=>({version:1,badges:[],skins:[],appliedGrants:[],lastRewardAt:0});

export function normalizeAccountProfile(value){
 return {
  version:1,
  badges:ids(value?.badges,null,40),
  skins:ids(value?.skins,null,80),
  appliedGrants:ids(value?.appliedGrants,null,100),
  lastRewardAt:Number.isFinite(value?.lastRewardAt)?Math.max(0,Math.floor(value.lastRewardAt)):0
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
