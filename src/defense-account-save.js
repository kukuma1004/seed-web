import {CRYSTAL_DEFENSE_OBJECTIVE,EXPANSION_OBJECTIVES,defenseObjectiveEligible} from './defense-objective.js';
import {checkpointDefense,restoreDefense} from './seed-defense-rules.js';
import {defensePreparationKey,readDefensePreparation} from './defense-save-route.js';

export const DEFENSE_ACCOUNT_LIMIT=100000;
export const defenseAccountKey=(owner,circuit)=>`seed-defense-account-v1:${encodeURIComponent(owner)}:${circuit}`;
const bytes=value=>JSON.stringify(value);
const uuid=()=>globalThis.crypto?.randomUUID?.()||`${Date.now()}-${Math.random()}-${Math.random()}`;
const keys=new Set(['version','ownerUid','circuit','id','revision','writeId','ended','checkpoint']);
export function validDefenseAccountRecord(record,owner,circuit){
 if(!record||![1,2].includes(record.version)||record.ownerUid!==owner||record.circuit!==circuit||![3,5].includes(circuit)||typeof record.id!=='string'||! /^[\w-]{1,90}$/.test(record.id)||!Number.isSafeInteger(record.revision)||record.revision<1||typeof record.writeId!=='string'||record.writeId.length<1||record.writeId.length>120||typeof record.ended!=='boolean'||Object.keys(record).some(k=>!keys.has(k)&&!(record.version===2&&['objective','previousObjective'].includes(k))))return false;
 if(record.version===2&&(circuit!==5||record.objective!==CRYSTAL_DEFENSE_OBJECTIVE))return false;
 if(record.previousObjective!==undefined){if(typeof record.previousObjective!=='string'||record.previousObjective.length>DEFENSE_ACCOUNT_LIMIT)return false;let parent;try{parent=JSON.parse(record.previousObjective);}catch{return false;}if(parent?.version!==1||!parent.ended||parent.id===record.id||!validDefenseAccountRecord(parent,owner,circuit))return false;}
 if(bytes(record).length>DEFENSE_ACCOUNT_LIMIT)return false;
 if(record.ended)return record.checkpoint===null;
 if(['siegeReview','inspectionPreview','practice','developerRun','lab'].some(k=>Boolean(record.checkpoint?.[k])))return false;
 if(record.version===2?record.checkpoint?.version!==7||record.checkpoint?.objective!==record.objective:record.checkpoint?.objective!==undefined||record.checkpoint?.version===7)return false;
 const restored=restoreDefense(record.checkpoint);
 return Boolean(restored&&restored.runId===record.id&&(restored.actCount??3)===circuit&&bytes(record).length<=DEFENSE_ACCOUNT_LIMIT);
}

// Separate transport bytes protect account saves from older clients which only
// understand the device preparation. Reads migrate a copy, never the original.
export function createDefenseAccountStore({storage,owner,circuit=3,currentOwner=()=>owner,lease,acts,objectives=EXPANSION_OBJECTIVES}={}){
 const key=defenseAccountKey(owner,circuit),legacyKey=defensePreparationKey(owner,circuit,{acts});
 const objectiveAllowed=r=>!r||defenseObjectiveEligible({objective:r.version===2?r.objective:null,actCount:r.circuit},{owner,currentOwner:currentOwner(),objectives:typeof objectives==='function'?objectives():objectives});
 const writable=r=>currentOwner()===owner&&lease?.ok&&lease.key===key&&lease.active()&&objectiveAllowed(r);
 const persist=(path,value)=>{const text=bytes(value);storage.setItem(path,text);if(storage.getItem(path)!==text)throw Error('storage');};
 const readRecord=()=>{
  let raw;try{raw=storage.getItem(key);}catch{throw Error('storage');}
  if(raw!==null){let value;try{value=JSON.parse(raw);}catch{throw Error('invalid');}if(!validDefenseAccountRecord(value,owner,circuit))throw Error('invalid');return value;}
  const legacyRaw=storage.getItem(legacyKey);
  const old=readDefensePreparation(storage,legacyKey,{owner,actCount:circuit});
  if(legacyRaw!==null&&!old)throw Error('invalid');
  if(!old)return null;
  return {version:1,ownerUid:owner,circuit,id:old.runId,revision:1,writeId:'legacy-'+old.runId,ended:false,checkpoint:checkpointDefense(old)};
 };
 function replace(expected,next){
  try{
   if(!writable(next)||!objectiveAllowed(expected))return {ok:false,reason:'account'};
   if(bytes(readRecord())!==bytes(expected))return {ok:false,reason:'conflict'};
   if(!validDefenseAccountRecord(next,owner,circuit))return {ok:false,reason:'invalid'};
   if(expected&&((expected.version===2?expected.objective:null)!==(next.version===2?next.objective:null)||expected.id===next.id&&expected.previousObjective!==next.previousObjective))return {ok:false,reason:'conflict'};
   const previous=storage.getItem(key+':previous');
   if(previous!==null){let recovery;try{recovery=JSON.parse(previous);}catch{return {ok:false,reason:'invalid'};}if(!validDefenseAccountRecord(recovery,owner,circuit))return {ok:false,reason:'invalid'};}
   if(expected)persist(key+':previous',expected);
   if(!writable(next)||!objectiveAllowed(expected)||bytes(readRecord())!==bytes(expected))return {ok:false,reason:'conflict'};
   persist(key,next);return {ok:true,value:next};
  }catch(error){return {ok:false,reason:error.message==='invalid'?'invalid':'storage'};}
 }
 function replaceFresh(expected,next){
  try{if(!expected?.ended||expected.version!==1||next.version!==2||expected.id===next.id||next.previousObjective!==bytes(expected)||!validDefenseAccountRecord(expected,owner,circuit)||!validDefenseAccountRecord(next,owner,circuit))return {ok:false,reason:'invalid'};
   if(!writable(next)||!objectiveAllowed(expected)||bytes(readRecord())!==bytes(expected))return {ok:false,reason:'conflict'};
   const backup=storage.getItem(key+':previous');if(backup!==null&&!validDefenseAccountRecord(JSON.parse(backup),owner,circuit))return {ok:false,reason:'invalid'};
   persist(key+':previous',expected);if(!writable(next)||bytes(readRecord())!==bytes(expected))return {ok:false,reason:'conflict'};
   persist(key,next);return {ok:true,value:next};
  }catch{return {ok:false,reason:'storage'};}
 }
 return {key,readRecord,replace,adoptFresh:replaceFresh,
  read(){const r=readRecord();return r&&!r.ended&&objectiveAllowed(r)?restoreDefense(r.checkpoint):null;},
  write(expected,state){
   const checkpoint=checkpointDefense(state);if(!checkpoint)return {ok:false,reason:'phase'};
   if(['siegeReview','inspectionPreview','practice','developerRun','lab'].some(k=>Boolean(state?.[k])))return {ok:false,reason:'invalid'};
   const next={version:state.objective?2:1,...(state.objective?{objective:state.objective}:{}),ownerUid:owner,circuit,id:state.runId,revision:(expected?.revision||0)+1,writeId:uuid(),ended:false,checkpoint};
   if(expected&&!expected.ended&&expected.id!==state.runId)return {ok:false,reason:'conflict'};
   if(expected?.previousObjective!==undefined)next.previousObjective=expected.previousObjective;
   if(expected&&(expected.version===2?expected.objective:null)!==(next.version===2?next.objective:null)){if(!expected.ended||next.version!==2)return {ok:false,reason:'conflict'};next.previousObjective=bytes(expected);return replaceFresh(expected,next);}
   return replace(expected,next);
  },
  end(expected,id){
   if(expected&&expected.id!==id)return {ok:false,reason:'conflict'};
   return replace(expected,{version:expected?.version??1,...(expected?.version===2?{objective:expected.objective,...(expected.previousObjective===undefined?{}:{previousObjective:expected.previousObjective})}:{}),ownerUid:owner,circuit,id,revision:(expected?.revision||0)+1,writeId:uuid(),ended:true,checkpoint:null});
  }
 };
}

// The whole mounted preparation owns its local slot. Unsupported environments
// keep the original device save path instead of pretending to hold a mutex.
export function acquireDefenseAccountLease(owner,circuit,{locks=globalThis.navigator?.locks}={}){
 const key=defenseAccountKey(owner,circuit);
 return new Promise(resolve=>{
  let finish,active=false,answered=false;const hold=new Promise(r=>{finish=r;});
  const answer=value=>{if(!answered){answered=true;resolve(value);}};
  const denied=reason=>({ok:false,reason,key,active:()=>false,release:async()=>{}});
  if(typeof locks?.request!=='function'){answer(denied('unsupported'));return;}
  try{
   const request=locks.request(key,{mode:'exclusive',ifAvailable:true},async lock=>{
    if(!lock){answer(denied('busy'));return;}
    active=true;answer({ok:true,key,active:()=>active,release:async()=>{active=false;finish();await request;}});await hold;active=false;
   });
   Promise.resolve(request).then(()=>{active=false;answer(denied('unavailable'));},()=>{active=false;finish();answer(denied('unavailable'));});
  }catch{active=false;finish();answer(denied('unavailable'));}
 });
}
