import {validBossRunId} from './boss-title-ledger.js';

// V2 migration contract, deliberately not wired into account normalization yet.
// The authoritative server must establish one immutable baseline/epoch before
// new events are accepted. Legacy high-water rows cannot recover lost history.
export const BOSS_EVENT_COUNTERS=Object.freeze({austin:'austinWins',alwaysbeginner:'alwaysWins',tempestcarrier:'johanWins',crosswindKeeper:'crosswindWins',crystalGardener:'crystalWins'});
export const BOSS_VICTORY_EVENT_LIMIT=10000;
const fields=Object.values(BOSS_EVENT_COUNTERS),keys=(v,allowed)=>v&&typeof v==='object'&&!Array.isArray(v)&&Object.keys(v).every(k=>allowed.includes(k));
const owner=v=>typeof v==='string'&&v.length>0&&v.length<=128;
const epoch=v=>typeof v==='string'&&/^[\w-]{6,96}$/.test(v);
const validEvent=e=>keys(e,['mode','runId','boss','ordinal'])&&Object.keys(e).length===4&&validBossRunId(e.mode+':'+e.runId)&&Object.hasOwn(BOSS_EVENT_COUNTERS,e.boss)&&Number.isSafeInteger(e.ordinal)&&e.ordinal>=1&&e.ordinal<=1000000;
export function bossVictoryEventKey(event){
 if(!validEvent(event))throw Error('invalid-event');
 // Injective ASCII encoding. Firebase keys forbid periods/slashes and the
 // identity must remain identical when the same run resumes on another device.
 return [...`${event.mode}:${event.runId}:${event.boss}:${event.ordinal}`].map(c=>c.charCodeAt(0).toString(16).padStart(2,'0')).join('');
}
export function validBossVictoryLedger(value){
 // Firebase RTDB omits an empty object on readback. An unstarted epoch can
 // therefore have no events child; explicit null/unknown payloads still fail.
 if(!keys(value,['version','ownerUid','epoch','baseline','events'])||!Object.hasOwn(value,'version')||!Object.hasOwn(value,'ownerUid')||!Object.hasOwn(value,'epoch')||!Object.hasOwn(value,'baseline')||value.version!==2||!owner(value.ownerUid)||!epoch(value.epoch)||!keys(value.baseline,fields)||Object.keys(value.baseline).length!==5||fields.some(k=>!Number.isSafeInteger(value.baseline[k])||value.baseline[k]<0||value.baseline[k]>100000)||value.events!==undefined&&!keys(value.events,Object.keys(value.events||{})))return false;
 const entries=Object.entries(value.events||{});if(entries.length>BOSS_VICTORY_EVENT_LIMIT)return false;
 return entries.every(([key,event])=>validEvent(event)&&key===bossVictoryEventKey(event));
}
export function createBossVictoryLedger(ownerUid,migrationEpoch,baseline){
 const value={version:2,ownerUid,epoch:migrationEpoch,baseline:{...baseline},events:{}};
 if(!validBossVictoryLedger(value))throw Error('invalid-baseline');return value;
}
const copy=value=>({version:2,ownerUid:value.ownerUid,epoch:value.epoch,baseline:{...value.baseline},events:Object.fromEntries(Object.entries(value.events||{}).map(([key,event])=>[key,{...event}]))});
export function addBossVictoryEvent(value,event,{ownerUid,epoch:migrationEpoch}={}){
 if(!validBossVictoryLedger(value)||value.ownerUid!==ownerUid||value.epoch!==migrationEpoch||!validEvent(event))throw Error('invalid-event-context');
 const key=bossVictoryEventKey(event),next=copy(value);
 if(Object.hasOwn(next.events,key))return {ledger:next,counted:false};
 if(Object.keys(next.events).length>=BOSS_VICTORY_EVENT_LIMIT)throw Error('ledger-full');
 next.events[key]={...event};return {ledger:next,counted:true};
}
export function mergeBossVictoryLedgers(a,b){
 if(!validBossVictoryLedger(a)||!validBossVictoryLedger(b)||a.ownerUid!==b.ownerUid||a.epoch!==b.epoch||fields.some(k=>a.baseline[k]!==b.baseline[k]))throw Error('migration-conflict');
 const next=copy(a);for(const [key,event] of Object.entries(b.events||{}))if(!Object.hasOwn(next.events,key))next.events[key]={...event};
 if(Object.keys(next.events).length>BOSS_VICTORY_EVENT_LIMIT)throw Error('ledger-full');return next;
}
export function bossVictoryCounts(value){
 if(!validBossVictoryLedger(value))throw Error('invalid-ledger');const counts={...value.baseline};
 for(const event of Object.values(value.events||{})){const field=BOSS_EVENT_COUNTERS[event.boss];counts[field]=Math.min(100000,counts[field]+1);}return counts;
}
