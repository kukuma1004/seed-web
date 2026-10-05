import assert from 'node:assert/strict';
import {closedExpansionActs,openExpansionActs} from './expansion-gate-fixtures.mjs';
import {readFileSync} from 'node:fs';
import {EXPANSION_ACTS} from '../src/act-expansion.js';
import {createExpansionJourney} from '../src/expansion-journey.js';
import {createExpansionSaveStore,createExpansionEntry} from '../src/expansion-run-save.js';
import {createExpansionAccountSaveStore,createExpansionAccountEntry,expansionAccountSaveKey,expansionAccountExitCheckpoint} from '../src/expansion-account-save.js';
import {createExpansionAccountSync,decodeExpansionAccountCloud} from '../src/expansion-account-sync.js';
import {acquireExpansionSaveLease} from '../src/expansion-save-lease.js';

// Explicit test fixture only. The real content remains unreleased.
assert.equal(typeof EXPANSION_ACTS.crosswind.released,'boolean');assert.equal(typeof EXPANSION_ACTS.crystalGorge.released,'boolean');
const released=openExpansionActs;
const run={version:1,cycle:0,region:'garden',stage:0,mode:'entry',hp:100,kills:3,elapsed:15,rules:[],mutated:[],forms:{returnblade:5},inventory:{potion:3,tonic:2,wind:1,shell:1,sprout:1},score:300,choicesTaken:2,choiceKills:3};
const clone=v=>structuredClone(v),memory=()=>{const m=new Map();return {m,getItem:k=>m.get(k)??null,setItem:(k,v)=>m.set(k,v)};};
function locks(){const held=new Set();return {request:async(key,options,fn)=>{if(held.has(key))return fn(null);held.add(key);try{return await fn({name:key});}finally{held.delete(key);}}};}
let remote=null,etag=0,getHook=null,putHook=null,mode='ok',gets=0,puts=0,omitEtag=false;
const fetchImpl=async(url,options)=>{
 assert.match(url,/\/seedExpansionSaves\/a\/(crosswind|crystalGorge)\.json\?auth=token$/);
 assert.equal(options.cache,'no-store');
 if(mode==='offline')throw Error('offline');if(mode==='permission')return {ok:false,status:403};
 if(options.method==='PUT'){
  puts++;if(putHook){const h=putHook;putHook=null;await h(options);}
  if(options.headers['if-match']!==String(etag))return {ok:false,status:412};
  remote=JSON.parse(options.body);etag++;return {ok:true,status:200};
 }
 gets++;assert.equal(options.headers['X-Firebase-ETag'],'true');const value=clone(remote),tag=String(etag);
 if(getHook){const h=getHook;getHook=null;await h();}
 return {ok:true,status:200,json:async()=>value,headers:{get:()=>omitEtag?null:tag}};
};
function device({act='crosswind',acts=released}={}){
 const s=memory(),u={uid:'a',isAnonymous:false},manager=locks(),facts={inspection:false,practice:false};let lease=null,active=false;
 const account={user:()=>u,tokenSession:async()=>({uid:u.uid,idToken:'token'})};
 const context=()=>({...facts,currentOwner:u.uid,acts});
 const getStore=()=>createExpansionAccountSaveStore(s,act,'a',{context,lease});
 const acquire=()=>acquireExpansionSaveLease(act,'a',{locks:manager});
 const sync=createExpansionAccountSync({storage:s,account,act,acts,context:()=>facts,databaseURL:'https://example.invalid',fetchImpl,isActive:()=>active,activeLease:()=>lease,acquireLease:acquire});
 async function edit(fn,{keep=false}={}){if(!lease?.active())lease=await acquire();assert(lease.ok);const store=getStore();const result=fn(store);if(!keep){await lease.release();lease=null;}return result;}
 async function start(id='run',options={}){return edit(store=>store.write(createExpansionAccountEntry(createExpansionJourney(act,0,413),run,[0,0,5],{owner:'a',currentOwner:u.uid,acts,id}),{fresh:true,...options}));}
 async function change(hp,options={}){return edit(store=>store.write(expansionAccountExitCheckpoint(store.read(),{hp,inventory:{...run.inventory,tonic:0}})),options);}
 return {s,u,facts,account,sync,edit,start,change,read:()=>getStore().read(),active:v=>active=v,release:async()=>{if(lease)await lease.release();lease=null;}};
}
for(const act of ['crosswind','crystalGorge']){
 remote=null;etag=0;const pc=device({act}),phone=device({act});
 assert((await pc.start('roundtrip')).ok);assert.equal((await pc.sync.flush()).kind,'synced');
 assert.equal((await phone.sync.sync({allowPull:true})).pulled,true);assert.deepEqual(phone.read(),pc.read());
 assert.equal(phone.read().entry.run.forms.returnblade,5);assert.equal(phone.read().entry.run.inventory.tonic,2);
 const count=puts;await phone.sync.sync({allowPull:true});assert.equal(puts,count,'unchanged checkpoint does not write');
 // Two devices derive different room attrition from the same entry revision.
 assert((await pc.change(70)).ok);assert.equal((await pc.sync.flush()).kind,'synced');assert((await phone.change(60)).ok);
 const conflict=await phone.sync.sync({allowPull:true});assert.equal(conflict.kind,'conflict');assert.equal(phone.read().entry.run.hp,60);assert.equal(decodeExpansionAccountCloud(remote,{owner:'a',act}).record.entry.run.hp,70);
 // Explicit local selection is ETag-checked; remote bytes get a backup.
 assert.equal((await phone.sync.sync({allowPull:true,choice:'local',expected:conflict.expected})).kind,'synced');assert(phone.s.getItem(expansionAccountSaveKey('a',act)+':previous-cloud'));
 assert.equal((await pc.sync.sync({allowPull:true})).pulled,true);assert.equal(pc.read().entry.run.hp,60);
 // New timelines also require a conflict choice, never device-clock LWW.
 assert((await pc.start('pc-new',{expected:pc.read()})).ok);assert.equal((await pc.sync.flush()).kind,'synced');
 assert((await phone.start('phone-new',{expected:phone.read()})).ok);
 const different=await phone.sync.sync({allowPull:true});assert.equal(different.kind,'conflict');assert.equal(phone.read().entry.id,'phone-new');
 const picked=await phone.sync.sync({allowPull:true,choice:'remote',expected:different.expected});assert.equal(picked.kind,'synced');assert.equal(phone.read().entry.id,'pc-new');assert(phone.s.getItem(expansionAccountSaveKey('a',act)+':previous'));
 // A stale conflict card cannot discard a newer server revision.
 assert((await phone.change(30)).ok);assert((await pc.change(40)).ok);await pc.sync.flush();const old=await phone.sync.sync({allowPull:true});
 assert((await pc.change(35)).ok);await pc.sync.flush();assert.equal((await phone.sync.sync({choice:'local',expected:old.expected})).kind,'conflict');
 const newer=await phone.sync.sync({allowPull:true});await phone.sync.sync({choice:'remote',allowPull:true,expected:newer.expected});
 // While a combat world is active, clean remote progress is offered, not applied.
 assert((await pc.change(25)).ok);await pc.sync.flush();phone.active(true);const before=clone(phone.read());assert.equal((await phone.sync.sync({allowPull:true})).kind,'remote');assert.deepEqual(phone.read(),before);phone.active(false);await phone.sync.sync({allowPull:true});
 // Remote death defeats even a locally higher revision of the same run.
 assert((await pc.edit(store=>store.finish(store.read()))).ok);await pc.sync.flush();await phone.change(20);await phone.change(15);
 assert.equal((await phone.sync.sync({allowPull:true})).kind,'synced');assert.equal(phone.read().entry.ended,true);
 assert((await pc.start('fresh-after-end',{expected:pc.read()})).ok);mode='offline';assert.equal((await pc.sync.flush()).kind,'offline');assert.equal(pc.read().entry.id,'fresh-after-end');mode='permission';assert.equal((await pc.sync.flush()).kind,'permission');mode='ok';await pc.sync.flush();
 // Changed checkpoint while uploading stays dirty, then flush uploads new bytes.
 await pc.change(65,{keep:true});putHook=()=>pc.change(55,{keep:true});assert.equal((await pc.sync.flush()).kind,'synced');assert.equal(decodeExpansionAccountCloud(remote,{owner:'a',act}).record.entry.run.hp,55);await pc.release();
 // Missing ETag never falls back to unconditional PUT.
 await pc.change(45);omitEtag=true;const writes=puts;assert.equal((await pc.sync.flush()).kind,'offline');assert.equal(puts,writes);omitEtag=false;await pc.sync.flush();
 // Account switches and gate closures during GET cannot mutate either device.
 getHook=()=>{pc.u.uid='b';};assert.equal((await pc.sync.sync({allowPull:true})).kind,'account');pc.u.uid='a';
 getHook=()=>{pc.facts.inspection=true;};assert.equal((await pc.sync.sync({allowPull:true})).kind,'ineligible');pc.facts.inspection=false;
 // 412 is an explicit conflict; no blind retry overwrite.
 await pc.change(35);putHook=()=>{remote={...remote,revision:remote.revision+1};etag++;};const race=await pc.sync.flush();assert.equal(race.kind,'conflict');assert.equal(decodeExpansionAccountCloud(remote,{owner:'a',act}).record.entry.run.hp,45);
 await pc.release();await phone.release();
}
// Real gates prevent all public account network I/O, including inspection drafts.
const gated=device({acts:closedExpansionActs}),draft=createExpansionSaveStore(gated.s,'crosswind','a');assert(draft.write(createExpansionEntry(createExpansionJourney(),run,[0,0,5]),{fresh:true}).ok);
const requests=gets+puts;assert.equal((await gated.sync.flush()).kind,'ineligible');assert.equal(gets+puts,requests);assert.equal(gated.s.getItem(expansionAccountSaveKey('a','crosswind')),null);
const unsigned=device();unsigned.u.isAnonymous=true;assert.equal((await unsigned.sync.sync()).kind,'ineligible');assert.equal(gets+puts,requests);
// Future/corrupt local, cloud and metadata bytes remain intact.
for(const corrupt of ['{broken',JSON.stringify({version:2,important:'future'})]){
 const d=device();d.s.setItem(expansionAccountSaveKey('a','crosswind'),corrupt);const writes=puts;assert.equal((await d.sync.sync({allowPull:true})).kind,'invalid');assert.equal(d.s.getItem(expansionAccountSaveKey('a','crosswind')),corrupt);assert.equal(puts,writes);
}
for(const value of [{version:99,important:'future'}, {...remote,ownerUid:'b'}, {...remote,checkpoint:'{}'}, {...remote,checkpoint:' '.repeat(100001)}])assert.throws(()=>decodeExpansionAccountCloud(value,{owner:'a',act:'crystalGorge'}));
// A response lost after successful PUT is acknowledged by exact bytes on retry.
remote=null;etag=0;const recovery=device();await recovery.start('lost-response');
putHook=options=>{remote=JSON.parse(options.body);etag++;throw Error('response lost');};assert.equal((await recovery.sync.flush()).kind,'offline');const lostPuts=puts;assert.equal((await recovery.sync.flush()).kind,'synced');assert.equal(puts,lostPuts);
// Current run lease is shared by the sync; borrowed leases stay alive afterward.
await recovery.change(85,{keep:true});const peer=device();const peerStore=await peer.start('other');assert(peerStore.ok);
getHook=()=>recovery.change(75,{keep:true});assert.equal((await recovery.sync.flush()).kind,'synced');assert.equal(decodeExpansionAccountCloud(remote,{owner:'a',act:'crosswind'}).record.entry.run.hp,75);await recovery.release();
// Unknown metadata and backups are not normalized away or overwritten.
const badMeta=device();await badMeta.start('meta');const metaKey='seed-expansion-account-sync-v1:a:crosswind',futureMeta=JSON.stringify({version:2,important:'future-sync'});badMeta.s.setItem(metaKey,futureMeta);const beforeMetaWrites=puts;assert.equal((await badMeta.sync.sync()).kind,'invalid');assert.equal(badMeta.s.getItem(metaKey),futureMeta);assert.equal(puts,beforeMetaWrites);
await recovery.change(65);const backupKey=expansionAccountSaveKey('a','crosswind')+':previous-cloud';recovery.s.setItem(backupKey,'future cloud backup');const backupWrites=puts;assert.equal((await recovery.sync.flush()).kind,'invalid');assert.equal(recovery.s.getItem(backupKey),'future cloud backup');assert.equal(puts,backupWrites);
// Failed local pull cannot erase a save, acknowledge it, or upload over it.
const quotaStore={getItem:()=>null,setItem:()=>{throw Error('quota');}};
const quota=createExpansionAccountSync({storage:quotaStore,account:recovery.account,act:'crosswind',acts:released,databaseURL:'https://example.invalid',fetchImpl,acquireLease:(a,o)=>acquireExpansionSaveLease(a,o,{locks:locks()})});const quotaPuts=puts;assert.equal((await quota.sync({allowPull:true})).kind,'storage');assert.equal(puts,quotaPuts);
const denied=createExpansionAccountSync({storage:memory(),account:recovery.account,act:'crosswind',acts:released,databaseURL:'https://example.invalid',fetchImpl,acquireLease:()=>Promise.resolve({ok:false,reason:'busy',active:()=>false,release:async()=>{}})});const busyRequests=gets+puts;assert.equal((await denied.sync()).kind,'busy');assert.equal(gets+puts,busyRequests);
// Token acquisition is bounded even when the auth provider hangs.
const timeout=createExpansionAccountSync({storage:memory(),account:{user:()=>({uid:'a',isAnonymous:false}),tokenSession:()=>new Promise(()=>{})},act:'crosswind',acts:released,databaseURL:'https://example.invalid',fetchImpl,acquireLease:(a,o)=>acquireExpansionSaveLease(a,o,{locks:locks()}),timeout:10});assert.equal((await timeout.sync()).kind,'offline');
const source=readFileSync(new URL('../src/expansion-account-sync.js',import.meta.url),'utf8');assert(!source.includes('mergeExpansionAccountSaves('),'runtime never uses revision-only pure merge to join independent combat timelines');
const rules=JSON.parse(readFileSync(new URL('../docs/firebase-rules-with-seed.json',import.meta.url),'utf8')).rules,privateRule=rules.seedExpansionSaves.$uid.$act;
assert.equal(rules['.read'],false);assert.equal(rules['.write'],false);assert.equal(rules.seedExpansionRelease['.write'],false);assert(privateRule['.read'].includes('auth.uid == $uid'));assert(privateRule['.write'].includes("root.child('seedExpansionRelease').child($act).val() == true"));assert(privateRule['.write'].includes('newData.exists()'));assert(privateRule.revision['.validate'].includes('data.val() + 1'));assert.equal(privateRule.$other['.validate'],false);
console.log('Expansion cloud candidate: both acts mocked PC-phone-PC, exact build/potions/attrition, explicit timeline choices/ETags, stale choices, death, concurrent upload, UID/gate, corrupt preservation, no unconditional PUT and auth timeout passed; explicit closed/open gate isolation verified and no live/device QA is claimed.');
