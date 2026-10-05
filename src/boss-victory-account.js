import {BOSS_EVENT_COUNTERS,validBossVictoryLedger,mergeBossVictoryLedgers,addBossVictoryEvent,bossVictoryCounts} from './boss-victory-events.js';
import {decodeBossVictoryCloud,createBossVictoryEventQueue} from './boss-victory-event-sync.js';
import {validBossMigrationSeal} from './boss-victory-migration.js';

const fields=Object.values(BOSS_EVENT_COUNTERS),object=v=>v&&typeof v==='object'&&!Array.isArray(v);
const clone=v=>JSON.parse(JSON.stringify(v));
const exact=(v,keys)=>object(v)&&Object.keys(v).length===keys.length&&keys.every(k=>Object.hasOwn(v,k));
const canonical=v=>JSON.stringify(Array.isArray(v)?v.map(x=>JSON.parse(canonical(x))):object(v)?Object.fromEntries(Object.keys(v).sort().map(k=>[k,JSON.parse(canonical(v[k]))])):v);
const validOwner=v=>typeof v==='string'&&/^[\w-]{1,128}$/.test(v);
export const bossVictoryAccountKey=ownerUid=>{if(!validOwner(ownerUid))throw Error('account');return 'seed-boss-account-v2:'+encodeURIComponent(ownerUid);};
function validContext(v){
 if(!exact(v,['version','ownerUid','epoch','baseline','legacyEntitlements'])||v.version!==2||!validOwner(v.ownerUid)||typeof v.epoch!=='string'||! /^[\w-]{6,96}$/.test(v.epoch)||!exact(v.baseline,fields)||fields.some(k=>!Number.isSafeInteger(v.baseline[k])||v.baseline[k]<0||v.baseline[k]>100000))return false;
 const ent=v.legacyEntitlements;
 return exact(ent,['version','bosses'])&&ent.version===1&&Array.isArray(ent.bosses)&&ent.bosses.length<=2000&&ent.bosses.every(id=>typeof id==='string'&&id.length>0&&id.length<=64)&&new Set(ent.bosses).size===ent.bosses.length;
}
function validate(value,ownerUid){
 if(!exact(value,['context','ledger'])||!validContext(value.context)||value.context.ownerUid!==ownerUid||!validBossVictoryLedger(value.ledger)||value.ledger.ownerUid!==ownerUid||value.ledger.epoch!==value.context.epoch||fields.some(k=>value.ledger.baseline[k]!==value.context.baseline[k]))throw Error('migration');
 return value;
}
export function readBossVictoryAccount(storage,ownerUid){
 const path=bossVictoryAccountKey(ownerUid),raw=storage.getItem(path);
 if(raw===null)return null;
 let value;try{value=JSON.parse(raw);}catch{throw Error('migration');}
 return clone(validate(value,ownerUid));
}
export function installBossVictoryAccount(storage,{ownerUid,seal,ledger}){
 if(!validBossMigrationSeal(seal)||seal.ownerUid!==ownerUid)throw Error('migration');
 const context={version:2,ownerUid,epoch:seal.epoch,baseline:{...seal.baseline},legacyEntitlements:{version:1,bosses:[...(seal.legacyEntitlements.bosses||[])]}};
 const incoming=validBossVictoryLedger(ledger)?clone(ledger):decodeBossVictoryCloud(ledger);
 let value=validate({context,ledger:incoming},ownerUid);
 const path=bossVictoryAccountKey(ownerUid),previous=storage.getItem(path),prior=previous===null?null:readBossVictoryAccount(storage,ownerUid);
 if(prior){if(canonical(prior.context)!==canonical(context))throw Error('migration');value={context,ledger:mergeBossVictoryLedgers(prior.ledger,incoming)};}
 // Never replace unrecognized bytes, including a newer client schema.
 if(storage.getItem(path)!==previous)throw Error('conflict');
 const raw=JSON.stringify(value);storage.setItem(path,raw);
 if(storage.getItem(path)!==raw)throw Error('storage');
 return readBossVictoryAccount(storage,ownerUid);
}
export function projectBossVictoryProfile(storage,profile,ownerUid){
 const value=readBossVictoryAccount(storage,ownerUid);if(!value)return profile;
 let ledger=value.ledger;
 const queue=createBossVictoryEventQueue({storage,ownerUid,epoch:value.context.epoch});
 for(const event of queue.pending())ledger=addBossVictoryEvent(ledger,event,{ownerUid,epoch:value.context.epoch}).ledger;
 return {...profile,...bossVictoryCounts(ledger)};
}
export function queueBossAccountVictory(storage,{ownerUid,event,practice=false}){
 try{
  if(practice!==false)return false;
  const currentOwner=storage.getItem('seed-cloud-owner-v1');if(currentOwner!==null&&currentOwner!==ownerUid)return false;
  const value=readBossVictoryAccount(storage,ownerUid);if(!value)return false;
  // Check the combined ledger capacity before acknowledging a durable queue write.
  let ledger=value.ledger;const queue=createBossVictoryEventQueue({storage,ownerUid,epoch:value.context.epoch});
  for(const pending of queue.pending())ledger=addBossVictoryEvent(ledger,pending,{ownerUid,epoch:value.context.epoch}).ledger;
  addBossVictoryEvent(ledger,event,{ownerUid,epoch:value.context.epoch});
  return queue.enqueue(event);
 }catch{return false;}
}
export function serializeBossVictoryProfile(storage,profile,ownerUid){
 const value=readBossVictoryAccount(storage,ownerUid);
 if(!value)return {profile,bossProtocol:null};
 return {profile:{...profile,...value.context.baseline},bossProtocol:{version:2,ownerUid,epoch:value.context.epoch}};
}
