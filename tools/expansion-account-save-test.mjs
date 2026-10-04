import assert from 'node:assert/strict';
import {createExpansionJourney,advanceExpansionJourney} from '../src/expansion-journey.js';
import {EXPANSION_ACTS} from '../src/act-expansion.js';
import {createExpansionEntry,createExpansionSaveStore,EXPANSION_SAVE_KEY} from '../src/expansion-run-save.js';
import {acquireExpansionSaveLease} from '../src/expansion-save-lease.js';
import {EXPANSION_ACCOUNT_SAVE_KEY,EXPANSION_ACCOUNT_SAVE_LIMIT,expansionAccountSaveKey,expansionAccountSaveLockKey,expansionAccountEligible,createExpansionAccountEntry,validExpansionAccountSave,expansionAccountExitCheckpoint,createExpansionAccountSaveStore,collectExpansionAccountSaves,mergeExpansionAccountSaves} from '../src/expansion-account-save.js';
const copy=v=>JSON.parse(JSON.stringify(v));
const released=Object.fromEntries(Object.entries(EXPANSION_ACTS).map(([id,value])=>[id,{...value,released:true}]));
const run={version:1,cycle:0,region:'garden',stage:0,mode:'entry',hp:100,kills:3,elapsed:15,rules:[],mutated:[],forms:{returnblade:5},inventory:{potion:3,tonic:2,wind:1,shell:1,sprout:1},score:300,choicesTaken:2,choiceKills:3};
function memory(){const data=new Map();return {data,fail:false,getItem:k=>data.get(k)??null,setItem(k,v){if(this.fail)throw Error('quota');data.set(k,v);},removeItem:k=>data.delete(k)};}
// Contract mocks only: real Web Locks implementation acquires these mock locks.
// This is distinct from the server ETag transport mock at the end of the test.
function mockLocks(){const held=new Set();return {held,request(key,options,callback){assert.deepEqual(options,{mode:'exclusive',ifAvailable:true});if(held.has(key))return Promise.resolve(callback(null));held.add(key);return Promise.resolve().then(()=>callback({name:key})).finally(()=>held.delete(key));}};}
const storage=memory(),locks=mockLocks(),contexts=new Map();let clock=1000;
storage.setItem('seed-run-checkpoint-v1','ordinary act1 bytes');storage.setItem('seed-account-profile-v1','ordinary account bytes');
for(const act of ['crosswind','crystalGorge']){
 const journey=createExpansionJourney(act,0,413),inspection=createExpansionSaveStore(storage,act,'owner-a');
 const local=inspection.write(createExpansionEntry(journey,run,[0,0,5]),{fresh:true});assert(local.ok);
 const inspectionBytes=storage.getItem(inspection.key);
 const defaults={owner:'owner-a',currentOwner:'owner-a'};
 assert.equal(createExpansionAccountEntry(journey,run,[0,0,5],defaults),null,'actual unreleased gate rejects issuance');
 assert.deepEqual(collectExpansionAccountSaves(storage,defaults),{});
 for(const bad of [{currentOwner:'owner-b'},{currentOwner:'guest',owner:'guest'},{inspection:true},{practice:true},{owner:''},{acts:{}}]){
  const options={...defaults,acts:released,...bad};assert.equal(expansionAccountEligible(act,options.owner,options),false);assert.equal(createExpansionAccountEntry(journey,run,[0,0,5],options),null);
 }
 assert.equal(validExpansionAccountSave(local.value),false,'an inspection record is not a public account envelope');
 const entry=createExpansionAccountEntry(journey,run,[0,0,5],{...defaults,acts:released,id:'public-'+act});assert(entry);
 assert.equal(entry.entry.revision,0);assert.equal(validExpansionAccountSave(entry),true);
 const lease=await acquireExpansionSaveLease(act,'owner-a',{locks});assert(lease.ok);assert.equal(lease.key,expansionAccountSaveLockKey('owner-a',act));
 const denied=await acquireExpansionSaveLease(act,'owner-a',{locks});assert.equal(denied.reason,'busy');await denied.release();
 const otherLease=await acquireExpansionSaveLease(act,'owner-b',{locks});assert(otherLease.ok);await otherLease.release();
 const ctx={currentOwner:'owner-a',inspection:false,practice:false,acts:released};contexts.set(act,ctx);
 const store=createExpansionAccountSaveStore(storage,act,'owner-a',{context:()=>ctx,lease,now:()=>++clock});
 assert.equal(store.key,`${EXPANSION_ACCOUNT_SAVE_KEY}:owner-a:${act}`);assert.notEqual(store.key,inspection.key);
 assert.equal(store.write(local.value,{fresh:true}).reason,'invalid');assert.equal(storage.getItem(inspection.key),inspectionBytes);
 const emptyBefore=JSON.stringify([...storage.data]);
 assert.equal(createExpansionAccountSaveStore(storage,act,'owner-a',{context:()=>ctx}).write(entry,{fresh:true}).reason,'lease');assert.equal(JSON.stringify([...storage.data]),emptyBefore);
 const wrongLease={ok:true,key:'wrong',active:()=>true};assert.equal(createExpansionAccountSaveStore(storage,act,'owner-a',{context:()=>ctx,lease:wrongLease}).write(entry,{fresh:true}).reason,'lease');
 const first=store.write(entry,{fresh:true});assert(first.ok);assert.equal(first.value.entry.revision,1);assert.equal(first.value.entry.savedAt,clock);
 assert.deepEqual(store.read(),first.value);assert.deepEqual(store.collect(),first.value);
 assert.equal(createExpansionAccountSaveStore(storage,act,'owner-b',{context:()=>({currentOwner:'owner-b',acts:released})}).read(),null);
 // All outgoing gains roll back while health, used potions and reroll loss persist.
 const losses=expansionAccountExitCheckpoint(first.value,{hp:65,inventory:{potion:2,tonic:5,wind:0,shell:1,sprout:1},rerollUsed:true,score:1e6,kills:1000});assert(losses);
 assert.equal(losses.entry.run.hp,65);assert.equal(losses.entry.run.inventory.potion,2);assert.equal(losses.entry.run.inventory.tonic,2);assert.equal(losses.entry.run.inventory.wind,0);
 assert.equal(losses.entry.run.score,300);assert.equal(losses.entry.run.kills,3);assert.equal(losses.entry.run.rerollUsed,true);
 const saved=store.write(losses);assert(saved.ok);assert.equal(saved.value.entry.revision,2);
 assert.equal(store.write(first.value).reason,'conflict');assert.equal(store.finish(first.value).reason,'conflict');
 const before=JSON.stringify([...storage.data]);
 for(const mutation of [c=>c.currentOwner='owner-b',c=>c.inspection=true,c=>c.practice=true,c=>c.acts=EXPANSION_ACTS]){
  const savedContext={...ctx};mutation(ctx);assert.equal(store.read(),null);assert.equal(store.collect(),null);assert.equal(store.write(saved.value).reason,'ineligible');assert.equal(store.finish(saved.value).reason,'ineligible');assert.equal(JSON.stringify([...storage.data]),before);Object.assign(ctx,savedContext);
 }
 const both=collectExpansionAccountSaves(storage,{...defaults,acts:released});assert.deepEqual(both[act==='crosswind'?'act4':'act5'],saved.value);
 const ended=store.finish(saved.value);assert(ended.ok);assert.equal(ended.value.entry.ended,true);assert.equal(store.read().entry.ended,true);assert.equal(store.write(saved.value).reason,'conflict');assert.equal(store.finish(ended.value).reason,'conflict');
 assert.deepEqual(mergeExpansionAccountSaves(saved.value,ended.value,{owner:'owner-a',act}).value,ended.value);
 assert.deepEqual(mergeExpansionAccountSaves(ended.value,saved.value,{owner:'owner-a',act}).value,ended.value,'a stale remote live save cannot resurrect a ended run');
 assert.deepEqual(mergeExpansionAccountSaves(ended.value,undefined,{owner:'owner-a',act}).value,ended.value,'old 3-act payload absence preserves existing 4/5 record');
 const next=createExpansionAccountEntry(journey,run,[0,0,5],{...defaults,acts:released,id:'next-'+act});assert.equal(store.write(next,{fresh:true}).reason,'conflict','fresh replacement requires explicit observed revision');
 const restarted=store.write(next,{fresh:true,expected:ended.value});assert(restarted.ok);
 assert.equal(store.write(next,{fresh:true,expected:ended.value}).reason,'conflict','stale start cannot overwrite newly started progress');
 await lease.release();assert.equal(store.write(restarted.value).reason,'lease');assert.equal(store.finish(restarted.value).reason,'lease');
 const reacquired=await acquireExpansionSaveLease(act,'owner-a',{locks});assert(reacquired.ok);await reacquired.release();
 assert.equal(storage.getItem(inspection.key),inspectionBytes,'public save/finish/restart never changes inspection bytes');
 // Every actual room entrance and boss entrance still reuse existing validation.
 for(let room=0;room<5;room++)assert(createExpansionAccountEntry(createExpansionJourney(act,room,413),{...run,stage:room},[0,0,5],{...defaults,acts:released}));
 const boss=createExpansionJourney(act,4,413);advanceExpansionJourney(boss);assert(createExpansionAccountEntry(boss,{...run,stage:4},[0,0,5],{...defaults,acts:released}));
}
assert.equal(storage.getItem('seed-run-checkpoint-v1'),'ordinary act1 bytes');assert.equal(storage.getItem('seed-account-profile-v1'),'ordinary account bytes');
assert.deepEqual(collectExpansionAccountSaves(storage,{owner:'owner-a',currentOwner:'owner-a'}),{},'the actual closed gates do not collect explicitly issued fixtures');

const act='crosswind',eligible={owner:'owner-a',currentOwner:'owner-a',acts:released},entry=createExpansionAccountEntry(createExpansionJourney(act),run,[0,0,5],{...eligible,id:'edge-fixture'});
const context=()=>eligible,lease=await acquireExpansionSaveLease(act,'owner-a',{locks});
for(const unknown of ['{broken',JSON.stringify({version:99,precious:'future progress'}),JSON.stringify({version:2,channel:'public-journey',entry:{ended:true}})]){
 const m=memory(),store=createExpansionAccountSaveStore(m,act,'owner-a',{context,lease});m.setItem(store.key,unknown);
 assert.equal(store.read(),null);assert.equal(store.collect(),null);assert.equal(store.write(entry,{fresh:true}).reason,'unrecognized');assert.equal(store.finish(entry).ok,false);assert.equal(m.getItem(store.key),unknown);
}
const m=memory(),store=createExpansionAccountSaveStore(m,act,'owner-a',{context,lease,now:()=>++clock});m.fail=true;assert.equal(store.write(entry,{fresh:true}).reason,'storage');assert.equal(m.getItem(store.key),null);m.fail=false;
const valid=store.write(entry,{fresh:true});assert(valid.ok);
for(const corrupt of [v=>v.ownerUid='owner-b',v=>v.act='crystalGorge',v=>v.version=2,v=>v.eligibility='inspection',v=>v.entry.journey.course.time=1,v=>v.entry.position[0]=Infinity,v=>v.entry.revision=Number.MAX_SAFE_INTEGER+1,v=>v.extra='x'.repeat(EXPANSION_ACCOUNT_SAVE_LIMIT)]){
 const value=copy(valid.value);corrupt(value);assert.equal(validExpansionAccountSave(value,{owner:'owner-a',act}),false);const before=m.getItem(store.key);assert.equal(store.write(value).reason,'invalid');assert.equal(m.getItem(store.key),before);
}
const oversized=copy(valid.value);oversized.entry.run.futureMemo='x'.repeat(EXPANSION_ACCOUNT_SAVE_LIMIT);assert.equal(validExpansionAccountSave(oversized),false,'bounded bytes also applies to otherwise permitted entry fields');assert.equal(store.write(oversized).reason,'invalid');
m.fail=true;assert.equal(store.finish(valid.value).reason,'storage');assert.equal(m.getItem(store.key),JSON.stringify(valid.value));m.fail=false;
const equalDifferent=copy(valid.value);equalDifferent.entry.run.hp=90;assert.equal(mergeExpansionAccountSaves(valid.value,equalDifferent,{owner:'owner-a',act}).reason,'conflict');
const otherOwner=copy(valid.value);otherOwner.ownerUid='owner-b';assert.equal(mergeExpansionAccountSaves(valid.value,otherOwner,{owner:'owner-a',act}).ok,false);
const anotherRun=copy(valid.value);anotherRun.entry.id='independent-phone-run';anotherRun.entry.savedAt+=10000;assert.equal(mergeExpansionAccountSaves(valid.value,anotherRun,{owner:'owner-a',act}).reason,'conflict','different runs must not lose one timeline to savedAt LWW');
const future=copy(valid.value);future.version=2;assert.equal(mergeExpansionAccountSaves(valid.value,future,{owner:'owner-a',act}).reason,'unrecognized');
// An auth change during a supplied callback is rechecked before any mutation.
const switched={...eligible};const switchedStore=createExpansionAccountSaveStore(m,act,'owner-a',{context:()=>switched,lease,now:()=>{switched.currentOwner='owner-b';return ++clock;}});
const beforeSwitch=m.getItem(store.key);assert.equal(switchedStore.write(valid.value).reason,'ineligible');assert.equal(m.getItem(store.key),beforeSwitch);
const switchedRead={...eligible},readStorage={getItem:k=>{switchedRead.currentOwner='owner-b';return m.getItem(k);}};
assert.equal(createExpansionAccountSaveStore(readStorage,act,'owner-a',{context:()=>switchedRead}).collect(),null,'collection rechecks owner after reading storage');
await lease.release();
assert.equal((await acquireExpansionSaveLease(act,'owner-a',{locks:{}})).reason,'unsupported');

// Actual store download replacement: exact local CAS, remote revisions kept,
// live/end stale protection, unknown originals/backups and backup-time races.
const pullLease=await acquireExpansionSaveLease(act,'owner-a',{locks}),pullMemory=memory(),pullStore=createExpansionAccountSaveStore(pullMemory,act,'owner-a',{context,lease:pullLease});
assert.equal(pullStore.replace(null,valid.value).ok,true);assert.deepEqual(pullStore.read(),valid.value);assert.equal(pullStore.read().entry.revision,valid.value.entry.revision);
assert.equal(pullStore.replace(valid.value,otherOwner).reason,'invalid');assert.equal(pullStore.replace(valid.value,future).reason,'invalid');assert.deepEqual(pullStore.read(),valid.value);
const downloaded=copy(valid.value);downloaded.entry.revision+=4;downloaded.entry.savedAt+=100;downloaded.entry.run.hp=60;
assert.equal(pullStore.replace(null,downloaded).reason,'conflict');
const notExact=copy(valid.value);notExact.entry.run.hp=99;assert.equal(pullStore.replace(notExact,downloaded).reason,'conflict');
assert(pullStore.replace(valid.value,downloaded).ok);assert.equal(pullMemory.getItem(pullStore.key+':previous'),JSON.stringify(valid.value));assert.deepEqual(pullStore.read(),downloaded);
assert.equal(pullStore.replace(downloaded,valid.value).reason,'conflict');assert.equal(pullStore.replace(downloaded,anotherRun).reason,'conflict');
const remoteEnd={...copy(downloaded),entry:{version:1,ended:true,id:downloaded.entry.id,revision:downloaded.entry.revision+1,savedAt:downloaded.entry.savedAt+1}};
assert(pullStore.replace(downloaded,remoteEnd).ok);assert.equal(pullStore.replace(remoteEnd,downloaded).reason,'conflict');
const offlineLive=copy(downloaded);offlineLive.entry.revision=remoteEnd.entry.revision+100;
assert.deepEqual(mergeExpansionAccountSaves(offlineLive,remoteEnd,{owner:'owner-a',act}).value,remoteEnd,'lower revision terminal wins over an offline live branch');
assert.deepEqual(mergeExpansionAccountSaves(remoteEnd,offlineLive,{owner:'owner-a',act}).value,remoteEnd);
assert.equal(pullStore.replace(remoteEnd,offlineLive,{allowEnded:true,allowDifferentRun:true}).reason,'conflict','same-run end cannot be resurrected by any opt-in');
pullMemory.setItem(pullStore.key+':previous','future backup bytes');const laterEnd=copy(remoteEnd);laterEnd.entry.revision++;assert.equal(pullStore.replace(remoteEnd,laterEnd).reason,'unrecognized');assert.equal(pullMemory.getItem(pullStore.key+':previous'),'future backup bytes');assert.deepEqual(pullStore.read(),remoteEnd);
pullMemory.removeItem(pullStore.key+':previous');pullMemory.fail=true;assert.equal(pullStore.replace(remoteEnd,laterEnd).reason,'storage');pullMemory.fail=false;assert.deepEqual(pullStore.read(),remoteEnd);
pullMemory.setItem(pullStore.key,'future primary bytes');assert.equal(pullStore.replace(null,downloaded).reason,'unrecognized');assert.equal(pullMemory.getItem(pullStore.key),'future primary bytes');
const raceMemory=memory();let race=false,raceStore;const raceStorage={getItem:k=>raceMemory.getItem(k),setItem(k,v){raceMemory.setItem(k,v);if(race&&k===raceStore.key+':previous'){race=false;raceMemory.setItem(raceStore.key,JSON.stringify(laterEnd));}}};
raceStore=createExpansionAccountSaveStore(raceStorage,act,'owner-a',{context,lease:pullLease});assert(raceStore.replace(null,downloaded).ok);race=true;assert.equal(raceStore.replace(downloaded,remoteEnd).reason,'conflict');assert.deepEqual(raceStore.read(),laterEnd);
const terminalMemory=memory(),terminalStore=createExpansionAccountSaveStore(terminalMemory,act,'owner-a',{context,lease:pullLease});assert(terminalStore.replace(null,offlineLive).ok);
assert.equal(terminalStore.replace(offlineLive,remoteEnd).reason,'conflict','lower end revision installation needs confirmed-server opt-in');assert(terminalStore.replace(offlineLive,remoteEnd,{allowEnded:true}).ok);
assert.equal(terminalStore.replace(remoteEnd,anotherRun).reason,'conflict');assert(terminalStore.replace(remoteEnd,anotherRun,{allowDifferentRun:true}).ok,'explicit conflict choice may install a different run while default remains closed');
const blockedContext={...eligible,inspection:true},blockedStore=createExpansionAccountSaveStore(terminalMemory,act,'owner-a',{context:()=>blockedContext,lease:pullLease});
assert.equal(blockedStore.replace(anotherRun,remoteEnd,{allowDifferentRun:true,allowEnded:true}).reason,'ineligible');assert.deepEqual(terminalStore.read(),anotherRun);
const forkMemory=memory(),forkStore=createExpansionAccountSaveStore(forkMemory,act,'owner-a',{context,lease:pullLease});assert(forkStore.replace(null,valid.value).ok);
assert.equal(forkStore.replace(valid.value,equalDifferent).reason,'conflict');assert(forkStore.replace(valid.value,equalDifferent,{allowFork:true}).ok,'server-confirmed same revision fork may be installed explicitly');
assert.equal(forkStore.replace(equalDifferent,anotherRun,{allowFork:true}).reason,'conflict','fork option cannot choose another run');
assert(forkStore.replace(equalDifferent,remoteEnd).ok);assert.equal(forkStore.replace(remoteEnd,offlineLive,{allowFork:true}).reason,'conflict','fork option cannot resurrect a terminal');
await pullLease.release();assert.equal(pullStore.replace(null,valid.value).reason,'lease');

// Separate server transport mock: two clients observe the same ETag; only one
// conditional publish succeeds. Real Firebase rules, ETags and auth are untested.
let server=null,etag=0;const get=()=>({value:copy(server),etag}),put=(value,expected)=>{if(expected!==etag)return {ok:false,status:412};server=copy(value);etag++;return {ok:true,etag};};
const pc=get(),phone=get();assert(put(valid.value,pc.etag).ok);assert.equal(put(valid.value,phone.etag).status,412);assert.deepEqual(get().value,valid.value);
const fetched=get();assert.deepEqual(mergeExpansionAccountSaves(undefined,fetched.value,{owner:'owner-a',act}).value,valid.value);
assert.notEqual(expansionAccountSaveKey('owner-a',act),`${EXPANSION_SAVE_KEY}:owner-a:${act}`);
console.log('Expansion public account candidate: explicit gated envelopes, both acts/rooms/attrition, raw-inspection exclusion, UID/lease/failure/unknown preservation, stale/end/restart and legacy absence merge passed. Web Locks and server ETag mocks only; no host/cloud wiring or release.');
