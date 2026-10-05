import {validCheckpoint,roomExitCheckpoint} from './run-save.js';
import {checkpointExpansionJourney,restoreExpansionJourney} from './expansion-journey.js';
import {restoreCrystalSiege} from './crystal-siege-rules.js';
// Separate local-inspection key: the ordinary journey/account saves are never
// overwritten. Resume restarts a room; losses persist, unfinished gains do not.
export const EXPANSION_SAVE_KEY='seed-expansion-entry-v1';
const copy=value=>JSON.parse(JSON.stringify(value));
const uid=()=>globalThis.crypto?.randomUUID?.()||`${Date.now()}-${Math.random()}`;
const recognizedEnd=value=>value?.version===1&&value.ended===true&&typeof value.id==='string'&&value.id.length>0&&value.id.length<=100&&Number.isInteger(value.revision)&&value.revision>0&&Number.isFinite(value.savedAt)&&value.savedAt>0;
export function validExpansionEntry(value){
 try{
  if(value?.version!==1||value.policy!=='room-entry'||typeof value.id!=='string'||!value.id||value.id.length>100||!Number.isInteger(value.revision)||value.revision<0||!validCheckpoint(value.run))return false;
  if(!['course','boss'].includes(value.journey?.phase)||value.run.stage!==value.journey.room||value.run.region!=='garden'||value.run.mode!=='entry')return false;
  const restored=restoreExpansionJourney(value.journey);if(!restored)return false;
  // Reject future/corrupt runtime state instead of silently clamping it away.
  if(JSON.stringify(checkpointExpansionJourney(restored))!==JSON.stringify(value.journey))return false;
  if(value.journey.phase==='course'&&value.journey.course.time!==0)return false;
  if(value.journey.phase==='course'&&value.journey.siege&&(value.journey.siege.phase!=='prep'||value.journey.siege.elapsed!==0||value.journey.siege.spawnIndex!==0))return false;
  return Array.isArray(value.position)&&value.position.length===3&&value.position.every(n=>Number.isFinite(n)&&Math.abs(n)<=10000);
 }catch{return false;}
}
export function createExpansionEntry(journey,run,position,{id=uid(),revision=0}={}){
 const value={version:1,policy:'room-entry',id,revision,journey:checkpointExpansionJourney(journey),run:copy(run),position:[...position]};
 return validExpansionEntry(value)?value:null;
}
export function expansionExitCheckpoint(entry,losses){
 if(!validExpansionEntry(entry))return null;
 const run=roomExitCheckpoint(entry.run,losses);if(!run)return null;run.rerollUsed=entry.run.rerollUsed===true||losses?.rerollUsed===true;
 const next={...copy(entry),run};
 if(entry.journey.siege&&losses?.siege){
  let current;try{current=restoreCrystalSiege(losses.siege);}catch{return null;}
  const saved=next.journey.siege;if(current.room!==saved.room||current.core.hp<=0)return null;
  saved.core.hp=Math.min(saved.core.hp,current.core.hp);saved.resources=Math.min(saved.resources,current.resources);
  // Keep entrance facilities and levels, retaining only actual damage. Newly
  // planted facilities, upgrades and harvested nodes are unfinished gains.
  for(const pad of saved.pads)if(pad.kind){const live=current.pads.find(p=>p.id===pad.id);if(!live||live.kind!==pad.kind)return null;pad.hp=Math.min(pad.hp,live.hp);}
 }
 return validExpansionEntry(next)?next:null;
}
export function createExpansionSaveStore(storage,act,owner='guest'){
 const key=`${EXPANSION_SAVE_KEY}:${encodeURIComponent(owner)}:${act}`;
 const raw=()=>{try{return JSON.parse(storage?.getItem(key)||'null');}catch{return null;}};
 return {key,read(){const value=raw();return validExpansionEntry(value)&&value.journey.act===act?value:null;},
  write(value,{fresh=false}={}){
   if(!validExpansionEntry(value)||value.journey.act!==act)return {ok:false,reason:'invalid'};
   try{
    const original=storage.getItem(key),before=raw();
    if(!fresh&&(!validExpansionEntry(before)||before.id!==value.id||before.revision!==value.revision))return {ok:false,reason:'conflict'};
    const next={...copy(value),revision:(fresh?0:before.revision)+1,savedAt:Date.now()},json=JSON.stringify(next);
    if(json.length>100000)return {ok:false,reason:'invalid'};
    // Unknown versions and malformed bytes must survive later rolling backups.
    if(original&&!validExpansionEntry(before)&&!recognizedEnd(before)){
     const quarantine=key+':unrecognized';if(!storage.getItem(quarantine))storage.setItem(quarantine,original);
     else if(storage.getItem(quarantine)!==original)return {ok:false,reason:'unrecognized'};
    }
    if(before)storage.setItem(key+':previous',JSON.stringify(before));
    // Catch a competing writer during backup. localStorage is not transactional:
    // callers must also hold the exclusive run lease across these sync writes.
    if(storage.getItem(key)!==original)return {ok:false,reason:'conflict'};
    storage.setItem(key,json);return storage.getItem(key)===json?{ok:true,value:next}:{ok:false,reason:'storage'};
   }catch{return {ok:false,reason:'storage'};}
  },
  finish(expected){try{const original=storage.getItem(key),before=raw();if(before?.id!==expected?.id||before?.revision!==expected?.revision)return false;const json=JSON.stringify({version:1,ended:true,id:before.id,revision:before.revision+1,savedAt:Date.now()});if(storage.getItem(key)!==original)return false;storage.setItem(key,json);return storage.getItem(key)===json;}catch{return false;}}
 };
}
