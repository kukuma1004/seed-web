import {createExpansionPublicCampaign,validExpansionPublicCampaign,validExpansionCampaignTransition,ackExpansionPublicTitle,expansionCampaignCanReplace} from './expansion-public-campaign.js';
import {EXPANSION_ACTS} from './act-expansion.js';
import {EXPANSION_SAVE_KEY,createExpansionEntry,validExpansionEntry,expansionExitCheckpoint} from './expansion-run-save.js';
import {CRYSTAL_DEFENSE_OBJECTIVE,EXPANSION_OBJECTIVES,expansionObjectiveReleased} from './expansion-objective.js';
export const expansionAccountObjective=value=>value?.version===2?value.objective:null;
export function expansionAccountObjectiveEligible(value,{objectives=EXPANSION_OBJECTIVES}={}){return !expansionAccountObjective(value)||expansionObjectiveReleased(value.act,value.objective,objectives);}

// A public account checkpoint is never the inspection checkpoint at the old
// key. Creation, collection and mutation all require current release/auth facts.
export const EXPANSION_ACCOUNT_SAVE_KEY='seed-expansion-account-entry-v1';
export const EXPANSION_ACCOUNT_SAVE_LIMIT=100000;
const copy=value=>JSON.parse(JSON.stringify(value));
const ownerValid=owner=>typeof owner==='string'&&owner.length>0&&owner.length<=128&&owner!=='guest'&&!['__proto__','constructor','prototype'].includes(owner);
const actValid=act=>act==='crosswind'||act==='crystalGorge';
export const expansionAccountSaveKey=(owner,act)=>`${EXPANSION_ACCOUNT_SAVE_KEY}:${encodeURIComponent(owner)}:${act}`;
// Share the existing exclusive owner+act run lock: inspection and public
// clients cannot write different versions of that player's act concurrently.
export const expansionAccountSaveLockKey=(owner,act)=>`${EXPANSION_SAVE_KEY}:${encodeURIComponent(owner)}:${act}`;
export function expansionAccountEligible(act,owner,{currentOwner,inspection=false,practice=false,acts=EXPANSION_ACTS}={}){
 return ownerValid(owner)&&actValid(act)&&currentOwner===owner&&inspection===false&&practice===false&&acts?.[act]?.released===true;
}
const validEnd=e=>e?.version===1&&e.ended===true&&typeof e.id==='string'&&e.id.length>0&&e.id.length<=100&&Number.isSafeInteger(e.revision)&&e.revision>0&&Number.isSafeInteger(e.savedAt)&&e.savedAt>0&&Object.keys(e).every(k=>['version','ended','id','revision','savedAt'].includes(k));
const reviewMarked=value=>['inspectionPreview','siegeReview','developerRun','lab','practice'].some(key=>Boolean(value?.[key]));
// Structural validation does not itself establish eligibility. A stored
// public record remains recognizable while its release gate is closed.
export function validExpansionAccountSave(value,{owner,act}={}){
 try{
  if(!value||![1,2].includes(value.version)||value.channel!=='public-journey'||value.eligibility!=='released'||!ownerValid(value.ownerUid)||!actValid(value.act))return false;
  if(Object.keys(value).some(k=>!['version','channel','eligibility','ownerUid','act','entry','campaign',...(value.version===2?['objective','previousObjective']:[])].includes(k)))return false;
  if(value.version===2&&(value.act!=='crystalGorge'||value.objective!==CRYSTAL_DEFENSE_OBJECTIVE))return false;
  if(value.previousObjective!==undefined){
   if(typeof value.previousObjective!=='string'||value.previousObjective.length>EXPANSION_ACCOUNT_SAVE_LIMIT)return false;
   const previous=JSON.parse(value.previousObjective);
   if(previous?.version!==1||!validEnd(previous.entry)||!validExpansionAccountSave(previous,{owner:value.ownerUid,act:value.act})||previous.entry.id===value.entry?.id||previous.campaign?.pendingBossTitles.length)return false;
  }
  if(owner!==undefined&&value.ownerUid!==owner||act!==undefined&&value.act!==act)return false;
  if(value.campaign!==undefined&&!validExpansionPublicCampaign(value.campaign,value.act))return false;
  const e=value.entry;
  if(reviewMarked(e?.run)||reviewMarked(e?.journey))return false;
  // Untagged review siege never becomes a public record. Objective identity
  // survives in the envelope even after finish removes the live journey.
  if(!e?.ended&&(value.version===2?e?.journey?.objective!==value.objective||e?.journey?.siege===undefined:e?.journey?.siege!==undefined||e?.journey?.objective!==undefined))return false;
  if(!validEnd(e)&&(!validExpansionEntry(e)||e.ended!==undefined||e.journey.act!==value.act))return false;
  if(value.campaign&&!e.ended&&(e.run.cycle!==value.campaign.lap||value.campaign.bossCleared&&e.journey.phase!=='boss'))return false;
  if(!Number.isSafeInteger(e.revision)||e.revision<0||e.savedAt!==undefined&&(!Number.isSafeInteger(e.savedAt)||e.savedAt<=0))return false;
  return JSON.stringify(value).length<=EXPANSION_ACCOUNT_SAVE_LIMIT;
 }catch{return false;}
}
export function createExpansionAccountEntry(journey,run,position,{owner,currentOwner,inspection=false,practice=false,acts=EXPANSION_ACTS,objectives=EXPANSION_OBJECTIVES,id}={}){
 if(!expansionAccountEligible(journey?.act,owner,{currentOwner,inspection,practice,acts}))return null;
 if(reviewMarked(journey)||reviewMarked(run))return null;
 const entry=createExpansionEntry(journey,run,position,id===undefined?{}:{id});
 const value={version:journey.objective?2:1,channel:'public-journey',eligibility:'released',ownerUid:owner,act:journey.act,entry,campaign:createExpansionPublicCampaign(journey.act),...(journey.objective?{objective:journey.objective}:{})};
 return validExpansionAccountSave(value)&&expansionAccountObjectiveEligible(value,{objectives})?value:null;
}
export function expansionAccountExitCheckpoint(value,losses){
 if(!validExpansionAccountSave(value)||value.entry.ended)return null;
 const entry=expansionExitCheckpoint(value.entry,losses);
 return entry?{...copy(value),entry}:null;
}
const stamp=value=>`${value.entry.id}:${value.entry.revision}`;
const committed=value=>validExpansionAccountSave(value)&&value.entry.revision>0&&Number.isSafeInteger(value.entry.savedAt)&&value.entry.savedAt>0;
// Sync writes are guarded by an externally acquired real Web Locks lease.
// This module does not fake locks, perform network I/O or claim server CAS.
export function createExpansionAccountSaveStore(storage,act,owner,{context=()=>({}),lease=null,now=Date.now}={}){
 const key=expansionAccountSaveKey(owner,act),lockKey=expansionAccountSaveLockKey(owner,act);
 const eligible=()=>{try{return expansionAccountEligible(act,owner,context());}catch{return false;}};
 const locked=()=>{try{return lease?.ok===true&&lease.key===lockKey&&lease.active()===true;}catch{return false;}};
 const raw=()=>{try{return storage.getItem(key);}catch{return null;}};
 const parse=bytes=>{try{return JSON.parse(bytes);}catch{return null;}};
 const recognized=value=>committed(value)&&validExpansionAccountSave(value,{owner,act});
 const objectiveEligible=value=>{try{return expansionAccountObjectiveEligible(value,context());}catch{return false;}};
 const mutate=(value,{fresh=false,expected=null,ack=false}={})=>{
  if(!eligible())return {ok:false,reason:'ineligible'};
  if(!objectiveEligible(value))return {ok:false,reason:'ineligible'};
  if(!locked())return {ok:false,reason:'lease'};
  if(!validExpansionAccountSave(value,{owner,act})||value.entry.ended&&!ack)return {ok:false,reason:'invalid'};
  try{
   const original=storage.getItem(key),before=parse(original);
   if(original!==null&&!recognized(before))return {ok:false,reason:'unrecognized'};
   if(before&&!objectiveEligible(before))return {ok:false,reason:'ineligible'};
   if(fresh){
    if(value.previousObjective!==undefined)return {ok:false,reason:'invalid'};
    if(before&&expansionAccountObjective(before)!==expansionAccountObjective(value)&&!before.entry.ended)return {ok:false,reason:'objective'};
    if(before?.campaign?.pendingBossTitles.length)return {ok:false,reason:'pending'};
    if(value.entry.revision!==0||value.entry.savedAt!==undefined||before&&(!recognized(expected)||stamp(before)!==stamp(expected)||value.entry.id===before.entry.id))return {ok:false,reason:'conflict'};
   }else if(!before||before.entry.ended&&!ack||stamp(before)!==stamp(value)||expansionAccountObjective(before)!==expansionAccountObjective(value))return {ok:false,reason:'conflict'};
   if(!fresh&&before.previousObjective!==value.previousObjective)return {ok:false,reason:'conflict'};
   if(!fresh&&(before.campaign||value.campaign)&&!validExpansionCampaignTransition(before.campaign,value.campaign,act,{ack}))return {ok:false,reason:'campaign'};
   if(ack&&(JSON.stringify(before.entry)!==JSON.stringify(value.entry)||!before.campaign?.pendingBossTitles.length))return {ok:false,reason:'invalid'};
   const time=now();if(!Number.isSafeInteger(time)||time<=0)return {ok:false,reason:'invalid'};
   const next={...copy(value),entry:{...copy(value.entry),revision:fresh?1:before.entry.revision+1,savedAt:time}};
   // Exact terminal ancestry is assigned by the store, never inferred from
   // a review checkpoint or caller-supplied revision. Keep it through local
   // losses/finish until the first successful ETag upload confirms this run.
   if(fresh&&before&&expansionAccountObjective(before)!==expansionAccountObjective(next))next.previousObjective=original;
   if(!validExpansionAccountSave(next,{owner,act}))return {ok:false,reason:'invalid'};
   // Check auth/gate/lease once more after caller-supplied time and serialization.
   if(!eligible()||!locked()||!objectiveEligible(next))return {ok:false,reason:'ineligible'};
   if(storage.getItem(key)!==original)return {ok:false,reason:'conflict'};
   const bytes=JSON.stringify(next);storage.setItem(key,bytes);
   return storage.getItem(key)===bytes?{ok:true,value:next}:{ok:false,reason:'storage'};
  }catch{return {ok:false,reason:'storage'};}
 };
 const read=()=>{if(!eligible())return null;const value=parse(raw());return eligible()&&recognized(value)&&objectiveEligible(value)?copy(value):null;};
 return {key,lockKey,read,collect:read,
  write:mutate,
  ackTitle(expected){const campaign=ackExpansionPublicTitle(expected?.campaign,act);return campaign?mutate({...copy(expected),campaign},{ack:true}):{ok:false,reason:'invalid'};},
  // Cloud pull installs an already committed public envelope. It retains its
  // revision and timestamp and cannot silently replace a different run.
  replace(expected,downloaded,{allowDifferentRun=false,allowEnded=false,allowFork=false,allowObjectiveParent=false}={}){
   if(!eligible())return {ok:false,reason:'ineligible'};
   if(!locked())return {ok:false,reason:'lease'};
   if(!recognized(downloaded)||expected!==null&&expected!==undefined&&!recognized(expected))return {ok:false,reason:'invalid'};
   if(!objectiveEligible(downloaded))return {ok:false,reason:'ineligible'};
   try{
    const original=storage.getItem(key),before=parse(original);
    if(original!==null&&!recognized(before))return {ok:false,reason:'unrecognized'};
    if(original===null?expected!==null&&expected!==undefined:JSON.stringify(before)!==JSON.stringify(expected))return {ok:false,reason:'conflict'};
    const next=copy(downloaded),bytes=JSON.stringify(next);
    if(before){
     if(expansionAccountObjective(before)!==expansionAccountObjective(next)&&!(allowObjectiveParent===true&&before.version===1&&before.entry.ended&&next.version===2&&next.previousObjective===original&&before.entry.id!==next.entry.id&&!before.campaign?.pendingBossTitles.length))return {ok:false,reason:'conflict'};
     const sameRun=before.entry.id===next.entry.id,confirmedEnd=allowEnded===true&&next.entry.ended===true;
     if(sameRun&&before.previousObjective!==next.previousObjective)return {ok:false,reason:'conflict'};
     if((before.campaign?.pendingBossTitles.length&&!sameRun)||sameRun&&!expansionCampaignCanReplace(before.campaign,next.campaign,act))return {ok:false,reason:'conflict'};
     if(!sameRun&&allowDifferentRun!==true||sameRun&&(before.entry.ended&&!next.entry.ended||next.entry.revision<before.entry.revision&&!confirmedEnd||next.entry.revision===before.entry.revision&&bytes!==original&&!confirmedEnd&&allowFork!==true))return {ok:false,reason:'conflict'};
     // Unknown backup bytes are also preserved instead of replacing them with
     // a rolling public backup during later syncs.
     const backup=storage.getItem(key+':previous');if(backup!==null&&!recognized(parse(backup)))return {ok:false,reason:'unrecognized'};
     storage.setItem(key+':previous',original);
    }
    if(!eligible()||!locked()||!objectiveEligible(next))return {ok:false,reason:'ineligible'};
    if(storage.getItem(key)!==original)return {ok:false,reason:'conflict'};
    storage.setItem(key,bytes);
    return storage.getItem(key)===bytes?{ok:true,value:next}:{ok:false,reason:'storage'};
   }catch{return {ok:false,reason:'storage'};}
  },
  finish(expected){
   if(!eligible())return {ok:false,reason:'ineligible'};
   if(!locked())return {ok:false,reason:'lease'};
   try{
    const original=storage.getItem(key),before=parse(original);
    if(!recognized(before)||!recognized(expected)||stamp(before)!==stamp(expected)||before.entry.ended||expansionAccountObjective(before)!==expansionAccountObjective(expected))return {ok:false,reason:'conflict'};
    if(!objectiveEligible(before))return {ok:false,reason:'ineligible'};
    const time=now();if(!Number.isSafeInteger(time)||time<=0)return {ok:false,reason:'invalid'};
    const next={...before,entry:{version:1,ended:true,id:before.entry.id,revision:before.entry.revision+1,savedAt:time}};
    if(!validExpansionAccountSave(next,{owner,act}))return {ok:false,reason:'invalid'};
    if(!eligible()||!locked()||!objectiveEligible(next))return {ok:false,reason:'ineligible'};
    if(storage.getItem(key)!==original)return {ok:false,reason:'conflict'};
    const bytes=JSON.stringify(next);storage.setItem(key,bytes);
    return storage.getItem(key)===bytes?{ok:true,value:copy(next)}:{ok:false,reason:'storage'};
   }catch{return {ok:false,reason:'storage'};}
  }
 };
}
export function collectExpansionAccountSaves(storage,{owner,currentOwner,inspection=false,practice=false,acts=EXPANSION_ACTS,objectives=EXPANSION_OBJECTIVES}={}){
 const checkpoints={};
 for(const [act,label] of [['crosswind','act4'],['crystalGorge','act5']]){
  const value=createExpansionAccountSaveStore(storage,act,owner,{context:()=>({currentOwner,inspection,practice,acts,objectives})}).collect();
  if(value)checkpoints[label]=value;
 }
 return checkpoints;
}
// Pure proposal for the cloud adapter: old three-act payload absence cannot
// erase a public checkpoint. Same-run revisions outrank clocks, including end.
// Equal revision with different bytes is an explicit conflict, not hidden LWW.
export function mergeExpansionAccountSaves(local,remote,{owner,act}={}){
 const present=value=>value!==null&&value!==undefined;
 for(const value of [local,remote])if(present(value)&&(!committed(value)||!validExpansionAccountSave(value,{owner,act})))return {ok:false,reason:'unrecognized'};
 if(!present(local)||!present(remote))return {ok:true,value:copy(local??remote??null)};
 if(local.ownerUid!==remote.ownerUid||local.act!==remote.act)return {ok:false,reason:'owner'};
 if(expansionAccountObjective(local)!==expansionAccountObjective(remote))return {ok:false,reason:'conflict'};
 if(local.entry.id===remote.entry.id){
  if(local.previousObjective!==remote.previousObjective)return {ok:false,reason:'conflict'};
  const winner=Boolean(local.entry.ended)!==Boolean(remote.entry.ended)?(local.entry.ended?local:remote):(local.entry.revision>=remote.entry.revision?local:remote),other=winner===local?remote:local;
  if(!expansionCampaignCanReplace(other.campaign,winner.campaign,act||local.act))return {ok:false,reason:'conflict'};
  // Finishing a run is terminal even if an offline live branch accumulated
  // a larger local entry revision. Transport confirmation governs installation.
  if(Boolean(local.entry.ended)!==Boolean(remote.entry.ended))return {ok:true,value:copy(local.entry.ended?local:remote)};
  if(local.entry.revision===remote.entry.revision&&JSON.stringify(local)!==JSON.stringify(remote))return {ok:false,reason:'conflict'};
  return {ok:true,value:copy(local.entry.revision>=remote.entry.revision?local:remote)};
 }
 return {ok:false,reason:'conflict'};
}
