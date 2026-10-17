import {validCheckpoint,roomExitCheckpoint} from './run-save.js';
import {checkpointArborJourney,restoreArborJourney,arborRoomIndex} from './arbor-journey.js';

export const ARBOR_SAVE_KEY='seed-arbor-entry-v1';
const copy=v=>JSON.parse(JSON.stringify(v));
const validOwner=v=>typeof v==='string'&&v.length>0&&v.length<=160;
const validId=v=>typeof v==='string'&&v.length>0&&v.length<=100;
const validEnded=(v,owner)=>v?.version===1&&v.kind==='arbor-ended'&&v.owner===owner&&validOwner(owner)&&validId(v.id)&&Number.isSafeInteger(v.revision)&&v.revision>=1&&Number.isFinite(v.savedAt)&&v.savedAt>=0&&Object.keys(v).every(key=>['version','kind','owner','id','revision','savedAt'].includes(key));
export const arborSaveKey=owner=>`${ARBOR_SAVE_KEY}:${encodeURIComponent(owner)}`;
export function validArborEntry(v,owner=v?.owner){
 try{
  if(v?.version!==1||v.kind!=='arbor-room-entry'||!validOwner(owner)||v.owner!==owner||!validId(v.id)||!Number.isSafeInteger(v.revision)||v.revision<0||!validCheckpoint(v.run))return false;
  const s=restoreArborJourney(v.world);if(!s||JSON.stringify(checkpointArborJourney(s))!==JSON.stringify(v.world))return false;
  if(v.run.region!=='garden'||v.run.mode!=='entry'||v.run.cycle!==s.round||v.run.stage!==arborRoomIndex(s)||v.run.wardens!==s.wardens||v.run.austins!==s.bossWins)return false;
  // Only a real boundary is durable: retry cannot carry unfinished kills and
  // upgrades into a freshly populated room, nor replay a completed guardian.
  return (s.phase==='cleared'||s.phase==='complete'||s.phase==='boss'&&!s.pending.length||s.phase==='skirmish'&&!s.pending.length&&!s.spawnIndex)&&Number.isFinite(v.savedAt)&&v.savedAt>=0;
 }catch{return false;}
}
function newArborRunId(){const provider=globalThis.crypto;return provider&&typeof provider.randomUUID==='function'?provider.randomUUID():`arbor-${Date.now()}`;}
export function createArborEntry(state,run,owner,{id=newArborRunId(),revision=0}={}){
 const v={version:1,kind:'arbor-room-entry',owner,id,revision,savedAt:0,world:checkpointArborJourney(state),run:copy(run)};
 return validArborEntry(v)?v:null;
}
export function arborLeaveEntry(entry,losses){
 if(!validArborEntry(entry))return null;
 const run=roomExitCheckpoint(entry.run,losses);return run?{...copy(entry),run}:null;
}
export function createArborSaveStore(storage,owner,{currentOwner=()=>owner,lease=null,now=Date.now}={}){
 const key=arborSaveKey(owner),lockKey=`seed-expansion-entry-v1:${encodeURIComponent(owner)}:arbor`;
 const eligible=()=>{try{return validOwner(owner)&&currentOwner()===owner&&lease?.ok===true&&lease.key===lockKey&&typeof lease.active==='function'&&lease.active()===true;}catch{return false;}};
 const read=()=>{try{const v=JSON.parse(storage.getItem(key)||'null');return validArborEntry(v,owner)?v:null;}catch{return null;}};
 const write=(v,{fresh=false,expected=null}={})=>{
  if(!eligible()||!validArborEntry(v,owner))return {ok:false,reason:'owner-or-lease'};
  try{
   const original=storage.getItem(key),before=read();
   if(original!==null&&!before){let ended;try{ended=JSON.parse(original);}catch{}if(!validEnded(ended,owner))return {ok:false,reason:'unrecognized'};}
   if(fresh?before&&(!expected||before.id!==expected.id||before.revision!==expected.revision):!before||before.id!==v.id||before.revision!==v.revision)return {ok:false,reason:'conflict'};
   const next={...copy(v),revision:(fresh?0:before.revision)+1,savedAt:now()};if(!validArborEntry(next,owner))return {ok:false,reason:'invalid'};
   const bytes=JSON.stringify(next);if(bytes.length>100000)return {ok:false,reason:'oversize'};
   if(!eligible()||storage.getItem(key)!==original)return {ok:false,reason:'conflict'};
   storage.setItem(key,bytes);return storage.getItem(key)===bytes?{ok:true,value:next}:{ok:false,reason:'storage'};
  }catch{return {ok:false,reason:'storage'};}
 };
 return {key,lockKey,read,write,finish(expected){
  if(!eligible())return false;
  try{
   const original=storage.getItem(key),before=read();if(!before||before.id!==expected?.id||before.revision!==expected.revision)return false;
   const ended={version:1,kind:'arbor-ended',owner,id:before.id,revision:before.revision+1,savedAt:now()};if(!validEnded(ended,owner))return false;
   const bytes=JSON.stringify(ended);if(!eligible()||storage.getItem(key)!==original)return false;
   storage.setItem(key,bytes);return storage.getItem(key)===bytes;
  }catch{return false;}
 }};
}
