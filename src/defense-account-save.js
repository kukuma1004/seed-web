import {checkpointDefense,restoreDefense} from './seed-defense-rules.js';
import {defensePreparationKey,readDefensePreparation} from './defense-save-route.js';

export const DEFENSE_ACCOUNT_LIMIT=100000;
export const defenseAccountKey=(owner,circuit)=>`seed-defense-account-v1:${encodeURIComponent(owner)}:${circuit}`;
const bytes=value=>JSON.stringify(value);
const uuid=()=>globalThis.crypto?.randomUUID?.()||`${Date.now()}-${Math.random()}-${Math.random()}`;
const keys=new Set(['version','ownerUid','circuit','id','revision','writeId','ended','checkpoint']);
export function validDefenseAccountRecord(record,owner,circuit){
 if(!record||record.version!==1||record.ownerUid!==owner||record.circuit!==circuit||![3,5].includes(circuit)||typeof record.id!=='string'||! /^[\w-]{1,90}$/.test(record.id)||!Number.isSafeInteger(record.revision)||record.revision<1||typeof record.writeId!=='string'||record.writeId.length<1||record.writeId.length>120||typeof record.ended!=='boolean'||Object.keys(record).some(k=>!keys.has(k)))return false;
 if(record.ended)return record.checkpoint===null;
 const restored=restoreDefense(record.checkpoint);
 return Boolean(restored&&restored.runId===record.id&&(restored.actCount??3)===circuit&&bytes(record).length<=DEFENSE_ACCOUNT_LIMIT);
}

// Separate transport bytes protect account saves from older clients which only
// understand the device preparation. Reads migrate a copy, never the original.
export function createDefenseAccountStore({storage,owner,circuit=3,currentOwner=()=>owner,lease,acts}={}){
 const key=defenseAccountKey(owner,circuit),legacyKey=defensePreparationKey(owner,circuit,{acts});
 const writable=()=>currentOwner()===owner&&lease?.ok&&lease.key===key&&lease.active();
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
   if(!writable())return {ok:false,reason:'account'};
   if(bytes(readRecord())!==bytes(expected))return {ok:false,reason:'conflict'};
   if(!validDefenseAccountRecord(next,owner,circuit))return {ok:false,reason:'invalid'};
   const previous=storage.getItem(key+':previous');
   if(previous!==null){let recovery;try{recovery=JSON.parse(previous);}catch{return {ok:false,reason:'invalid'};}if(!validDefenseAccountRecord(recovery,owner,circuit))return {ok:false,reason:'invalid'};}
   if(expected)persist(key+':previous',expected);
   if(!writable()||bytes(readRecord())!==bytes(expected))return {ok:false,reason:'conflict'};
   persist(key,next);return {ok:true,value:next};
  }catch(error){return {ok:false,reason:error.message==='invalid'?'invalid':'storage'};}
 }
 return {key,readRecord,replace,
  read(){const r=readRecord();return r&&!r.ended?restoreDefense(r.checkpoint):null;},
  write(expected,state){
   const checkpoint=checkpointDefense(state);if(!checkpoint)return {ok:false,reason:'phase'};
   const next={version:1,ownerUid:owner,circuit,id:state.runId,revision:(expected?.revision||0)+1,writeId:uuid(),ended:false,checkpoint};
   if(expected&&!expected.ended&&expected.id!==state.runId)return {ok:false,reason:'conflict'};
   return replace(expected,next);
  },
  end(expected,id){
   if(expected&&expected.id!==id)return {ok:false,reason:'conflict'};
   return replace(expected,{version:1,ownerUid:owner,circuit,id,revision:(expected?.revision||0)+1,writeId:uuid(),ended:true,checkpoint:null});
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
