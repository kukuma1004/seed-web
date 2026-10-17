import {arborSaveKey,validArborEntry} from './arbor-run-save.js';
import {arborAccountEligible,validArborEnded} from './arbor-account-eligibility.js';
export {arborAccountEligible,validArborEnded} from './arbor-account-eligibility.js';

// Public provenance is deliberately separate from the already published local
// entry. An old UID entry may be a developer run; reading it never promotes it.
export const ARBOR_ACCOUNT_KEY='seed-arbor-account-record-v1';
export const ARBOR_ACCOUNT_LIMIT=100000;
export const arborAccountKey=owner=>`${ARBOR_ACCOUNT_KEY}:${encodeURIComponent(owner)}`;
export const arborAccountLockKey=owner=>`seed-expansion-entry-v1:${encodeURIComponent(owner)}:arbor`;
const copy=v=>JSON.parse(JSON.stringify(v));
const same=(a,b)=>JSON.stringify(a)===JSON.stringify(b);
const keys=(v,list)=>v&&typeof v==='object'&&!Array.isArray(v)&&Object.keys(v).every(k=>list.includes(k));
const id=v=>typeof v==='string'&&v.length>0&&v.length<=100;
const uid=v=>typeof v==='string'&&v.length>0&&v.length<=128&&!/^(guest|anonymous|inspection|inspection-boss|practice)(:|$)/i.test(v)&&!['__proto__','constructor','prototype'].includes(v);
const integer=(v,min=0,max=1000000000)=>Number.isSafeInteger(v)&&v>=min&&v<=max;
const reviewMarked=v=>['inspectionPreview','siegeReview','developerRun','lab','practice','inspection','isAnonymous'].some(k=>Boolean(v?.[k]));
const RUN_KEYS=['version','runId','cycle','region','stage','mode','hp','rules','mutated','levels','banked','choicesTaken','choiceKills','kills','elapsed','playDashes','playDamage','forms','guideTarget','form','inventory','runBonuses','relics','dashEvolution','activeGauge','activeCooldown','mutations','rerollUsed','score','wardens','austins','turretPotionDry'];
export function validArborPublicEntry(v,owner=v?.owner){
 if(validArborEnded(v,owner))return true;
 return keys(v,['version','kind','owner','id','revision','savedAt','world','run'])&&uid(owner)&&validArborEntry(v,owner)&&integer(v.revision,1)&&integer(v.savedAt,1,Number.MAX_SAFE_INTEGER)&&keys(v.run,RUN_KEYS)&&!reviewMarked(v.run)&&!reviewMarked(v.world);
}
const validParent=v=>keys(v,['id','revision'])&&Object.keys(v).length===2&&id(v.id)&&integer(v.revision,1);
export function validArborAccountRecord(v,{owner=v?.ownerUid}={}){
 try{
  return keys(v,['version','channel','eligibility','ownerUid','entry','previousRun'])&&v.version===1&&v.channel==='public-arbor'&&v.eligibility==='released-v1'&&uid(owner)&&v.ownerUid===owner&&validArborPublicEntry(v.entry,owner)&&(v.previousRun===undefined||validParent(v.previousRun)&&v.previousRun.id!==v.entry.id)&&JSON.stringify(v).length<=ARBOR_ACCOUNT_LIMIT;
 }catch{return false;}
}
export const arborRecordStamp=v=>v?.entry?{id:v.entry.id,revision:v.entry.revision}:null;
export const arborFollowsEnded=(next,ended)=>Boolean(validArborAccountRecord(next)&&validArborAccountRecord(ended)&&validArborEnded(ended.entry)&&next.entry.id!==ended.entry.id&&same(next.previousRun,arborRecordStamp(ended)));
const initialEntry=e=>e?.kind==='arbor-room-entry'&&e.revision===1&&e.world.round===0&&e.world.sector===0&&e.world.phase==='skirmish'&&e.world.time===0&&e.world.kills===0&&e.world.wardens===0&&e.world.bossWins===0&&e.world.spawnIndex===0&&!e.world.pending.length&&!e.world.killIds.length&&e.run.kills===0&&e.run.elapsed===0&&(e.run.score??0)===0&&(e.run.choicesTaken??0)===0&&(e.run.wardens??0)===0&&(e.run.austins??0)===0;

// The host continues using createArborSaveStore. It explicitly begins a new
// public run after the first local write, then captures acknowledged boundaries.
// A cloud pull is the only operation here that installs the gameplay entry.
export function createArborAccountRecords(storage,owner,{context=()=>({}),lease=null}={}){
 const key=arborAccountKey(owner),entryKey=arborSaveKey(owner),lockKey=arborAccountLockKey(owner),journalKey=key+':pull-journal';
 const eligible=()=>{try{return arborAccountEligible(owner,context());}catch{return false;}};
 const locked=()=>{try{return lease?.ok===true&&lease.key===lockKey&&lease.active()===true;}catch{return false;}};
 const parse=raw=>{try{return JSON.parse(raw);}catch{return null;}};
 const guard=()=>!eligible()?'ineligible':!locked()?'lease':null;
 const get=()=>{const raw=storage.getItem(key),value=parse(raw);return {raw,value:validArborAccountRecord(value,{owner})?value:null};};
 const persist=(name,raw)=>{storage.setItem(name,raw);if(storage.getItem(name)!==raw)throw Error('storage');};
 function prepare(){
  const denied=guard();if(denied)return {ok:false,reason:denied};
  try{
   const raw=storage.getItem(journalKey);if(raw===null)return {ok:true,recovered:false};const j=parse(raw);
   if(!keys(j,['version','owner','beforeRecord','beforeEntry','nextRecord','nextEntry'])||j.version!==1||j.owner!==owner||![j.beforeRecord,j.beforeEntry].every(v=>v===null||typeof v==='string')||![j.nextRecord,j.nextEntry].every(v=>typeof v==='string')||!validArborAccountRecord(parse(j.nextRecord),{owner})||!validArborPublicEntry(parse(j.nextEntry),owner)||!same(parse(j.nextRecord).entry,parse(j.nextEntry))||j.beforeRecord!==null&&!validArborAccountRecord(parse(j.beforeRecord),{owner})||j.beforeEntry!==null&&!validArborPublicEntry(parse(j.beforeEntry),owner))return {ok:false,reason:'unrecognized'};
   const record=storage.getItem(key),entry=storage.getItem(entryKey);
   if(![j.beforeRecord,j.nextRecord].includes(record)||![j.beforeEntry,j.nextEntry].includes(entry))return {ok:false,reason:'conflict'};
   if(guard()||storage.getItem(journalKey)!==raw||storage.getItem(key)!==record||storage.getItem(entryKey)!==entry)return {ok:false,reason:'conflict'};
   if(record!==j.nextRecord)persist(key,j.nextRecord);
   if(guard()||storage.getItem(entryKey)!==entry)return {ok:false,reason:'conflict'};
   if(entry!==j.nextEntry)persist(entryKey,j.nextEntry);
   if(guard()||storage.getItem(key)!==j.nextRecord||storage.getItem(entryKey)!==j.nextEntry||storage.getItem(journalKey)!==raw)return {ok:false,reason:'conflict'};
   storage.removeItem(journalKey);if(storage.getItem(journalKey)!==null)throw Error('storage');
   return {ok:true,recovered:true};
  }catch{return {ok:false,reason:'storage'};}
 }
 function put(value,expected,entryRaw){
  const denied=guard();if(denied)return {ok:false,reason:denied};
  if(!validArborAccountRecord(value,{owner}))return {ok:false,reason:'invalid'};
  try{
   if(storage.getItem(journalKey)!==null)return {ok:false,reason:'pending-pull'};
   const before=get();if(before.raw!==null&&!before.value)return {ok:false,reason:'unrecognized'};
   if(!same(before.value,expected))return {ok:false,reason:'conflict'};
   if(storage.getItem(entryKey)!==entryRaw)return {ok:false,reason:'conflict'};
   if(guard()||storage.getItem(key)!==before.raw)return {ok:false,reason:'conflict'};
   persist(key,JSON.stringify(value));return {ok:true,value:copy(value)};
  }catch{return {ok:false,reason:'storage'};}
 }
 const read=()=>{try{if(!eligible()||storage.getItem(journalKey)!==null)return null;return copy(get().value);}catch{return null;}};
 function capture(entry,{ended=false}={}){
  const denied=guard();if(denied)return {ok:false,reason:denied};
  if(!validArborPublicEntry(entry,owner)||Boolean(validArborEnded(entry,owner))!==ended)return {ok:false,reason:'invalid'};
  try{
   const before=get(),entryRaw=storage.getItem(entryKey);
   if(before.raw!==null&&!before.value)return {ok:false,reason:'unrecognized'};
   if(!before.value)return {ok:false,reason:'legacy'};
   if(!same(parse(entryRaw),entry))return {ok:false,reason:'conflict'};
   const old=before.value.entry;
   if(old.id!==entry.id||validArborEnded(old)&&!validArborEnded(entry)||entry.revision<old.revision||entry.revision===old.revision&&!same(old,entry))return {ok:false,reason:'conflict'};
   return put({...copy(before.value),entry:copy(entry)},before.value,entryRaw);
  }catch{return {ok:false,reason:'storage'};}
 }
 return {key,entryKey,lockKey,journalKey,read,collect:read,prepare,
  begin(entry,{expected=null}={}){
   const denied=guard();if(denied)return {ok:false,reason:denied};
   if(!validArborPublicEntry(entry,owner)||!initialEntry(entry))return {ok:false,reason:'invalid'};
   try{
    const before=get(),entryRaw=storage.getItem(entryKey);
    if(before.raw!==null&&!before.value)return {ok:false,reason:'unrecognized'};
    if(!same(before.value,expected)||before.value&&(!validArborEnded(before.value.entry)||before.value.entry.id===entry.id)||!same(parse(entryRaw),entry))return {ok:false,reason:'conflict'};
    const value={version:1,channel:'public-arbor',eligibility:'released-v1',ownerUid:owner,entry:copy(entry),...(before.value?{previousRun:arborRecordStamp(before.value)}:{})};
    return put(value,before.value,entryRaw);
   }catch{return {ok:false,reason:'storage'};}
  },
  capture,
  finish:entry=>capture(entry,{ended:true}),
  replace(expected,downloaded,{allowDifferentRun=false,allowEnded=false,allowFork=false}={}){
   const denied=guard();if(denied)return {ok:false,reason:denied};
   if(!validArborAccountRecord(downloaded,{owner})||expected!==null&&expected!==undefined&&!validArborAccountRecord(expected,{owner}))return {ok:false,reason:'invalid'};
   try{
    const before=get(),entryRaw=storage.getItem(entryKey),entry=parse(entryRaw);
    if(before.raw!==null&&!before.value||entryRaw!==null&&!validArborPublicEntry(entry,owner))return {ok:false,reason:'unrecognized'};
    if(!same(before.value,expected??null))return {ok:false,reason:'conflict'};
    // A legacy local run is kept until the player explicitly chooses cloud.
    if(entry&&!before.value&&!allowDifferentRun)return {ok:false,reason:'legacy'};
    if(before.value){
     const a=before.value.entry,b=downloaded.entry,sameRun=a.id===b.id,confirmedEnd=allowEnded&&validArborEnded(b);
     if(sameRun&&(!same(before.value.previousRun,downloaded.previousRun)||validArborEnded(a)&&!validArborEnded(b)||!confirmedEnd&&(b.revision<a.revision||b.revision===a.revision&&!same(before.value,downloaded)&&!allowFork))||!sameRun&&!allowDifferentRun)return {ok:false,reason:'conflict'};
    }
    for(const [backup,value,valid] of [[key+':previous',before.raw,v=>validArborAccountRecord(v,{owner})],[entryKey+':previous-account',entryRaw,v=>validArborPublicEntry(v,owner)]]){
     if(value===null)continue;const old=storage.getItem(backup);if(old!==null&&!valid(parse(old)))return {ok:false,reason:'unrecognized'};
     persist(backup,value);
    }
    if(guard()||storage.getItem(key)!==before.raw||storage.getItem(entryKey)!==entryRaw)return {ok:false,reason:'conflict'};
    // A two-key localStorage pull has a durable intent journal. A failed or
    // interrupted second write can only finish this exact accepted pull, never
    // invent a new snapshot or overwrite competing/unknown bytes on recovery.
    if(storage.getItem(journalKey)!==null)return {ok:false,reason:'pending-pull'};
    const journal={version:1,owner,beforeRecord:before.raw,beforeEntry:entryRaw,nextRecord:JSON.stringify(downloaded),nextEntry:JSON.stringify(downloaded.entry)};
    persist(journalKey,JSON.stringify(journal));const installed=prepare();
    return installed.ok?{ok:true,value:copy(downloaded)}:installed;
   }catch{return {ok:false,reason:'storage'};}
  }
 };
}
