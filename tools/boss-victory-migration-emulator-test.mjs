import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createMockUserToken} from '@firebase/util';
import {collectCloudSnapshot} from '../src/cloud-save.js';
import {withBossMigrationProtocol,validBossMigrationSeal,initializeBossLedgerFromSeal,createBossMigrationSeal} from '../src/boss-victory-migration.js';
import {createBossMigrationRules,assertBossMigrationRules} from './boss-victory-migration-rules.mjs';
import {createBossMigrationRestAdmin,migrateBossVictoryUser} from './boss-victory-admin-migration.mjs';
import {bossVictoryCounts} from '../src/boss-victory-events.js';
import {createBossVictoryEventSync,decodeBossVictoryCloud} from '../src/boss-victory-event-sync.js';

assert.equal(process.env.FIREBASE_DATABASE_EMULATOR_HOST,'127.0.0.1:19004');
const project='demo-seed-linked',base='http://127.0.0.1:19004',owner='migration-owner',epoch='migration-20261005';
const token=(uid,provider='password')=>createMockUserToken({sub:uid,firebase:{sign_in_provider:provider}},project);
const storage=()=>{const m=new Map();return {get length(){return m.size;},key:i=>[...m.keys()][i]??null,getItem:k=>m.get(k)??null,setItem:(k,v)=>m.set(k,v),removeItem:k=>m.delete(k)};};
async function request(path,{method='GET',value,authentication=token(owner),admin=false}={}){
 const url=new URL(base+'/'+path+'.json');url.searchParams.set('ns',project);if(authentication&&!admin)url.searchParams.set('auth',authentication);
 return fetch(url,{method,headers:{'Content-Type':'application/json',...(admin?{Authorization:'Bearer owner'}:{})},...(value===undefined?{}:{body:JSON.stringify(value)})});
}
async function allow(path,options){const r=await request(path,options);assert(r.ok,`${path}: ${r.status} ${await r.clone().text()}`);return r;}
async function deny(path,options){const r=await request(path,options);assert.equal(r.status,401,`${path}: ${r.status} ${await r.clone().text()}`);}
const read=async path=>(await allow(path,{admin:true})).json();
const baseRules=JSON.parse(readFileSync('docs/firebase-rules-with-seed.json','utf8')),rules=createBossMigrationRules(baseRules);
await allow('.settings/rules',{method:'PUT',value:rules,admin:true});
await allow('',{method:'PUT',value:{seedExpansionRelease:{crosswind:true,crystalGorge:true}},admin:true});
const admin=createBossMigrationRestAdmin({databaseURL:base,namespace:project,authorization:async()=> 'owner'});
assert(assertBossMigrationRules(await admin.rules()));
function fixture(wins=8){const save=collectCloudSnapshot(storage());save.account.austinWins=wins;save.discoveries.bosses=['austin','austinveteran'];return save;}
const path='seedUsers/'+owner,ledgerPath='seedBossVictories/'+owner;
await allow(path,{method:'PUT',value:{save:fixture(),privateSibling:{retain:'exact'}},admin:true});
let old=await read(path+'/save');
await allow(path+'/save',{method:'PUT',value:old});
assert.equal((await migrateBossVictoryUser({admin,ownerUid:owner,epoch})).kind,'dry-run');
await assert.rejects(()=>migrateBossVictoryUser({admin,ownerUid:owner,epoch,apply:true}),/client-not-ready/);
assert.equal((await read(path)).bossMigration,undefined);
await deny('seedBossMigrationReady',{method:'PUT',value:{version:2,clientReady:true}});
await allow('seedBossMigrationReady',{method:'PUT',value:{version:2,clientReady:true},admin:true});
// An old client writes after the admin GET. Its change must force a real ETag
// 412 and be included in the freshly read server baseline/archive.
let raced=false,conflicts=0;
const raceAdmin={...admin,compareAndSet:async(p,v,etag)=>{
 if(!raced&&p===path){raced=true;await allow(path+'/save/account/austinWins',{method:'PUT',value:9});}
 const ok=await admin.compareAndSet(p,v,etag);if(!ok)conflicts++;return ok;
}};
const result=await migrateBossVictoryUser({admin:raceAdmin,ownerUid:owner,epoch,apply:true});
assert.equal(conflicts,1);assert.equal(result.baseline.austinWins,9);
const sealed=await read(path),seal=sealed.bossMigration;
assert(validBossMigrationSeal(seal));assert.equal(seal.archive.save.account.austinWins,9);
assert.deepEqual(sealed.privateSibling,{retain:'exact'});assert.deepEqual(sealed.save,seal.archive.save);
assert.deepEqual(seal.legacyEntitlements.bosses,['austin','austinveteran']);
await deny(path+'/save',{method:'PUT',value:old});await deny(path+'/save',{method:'DELETE'});
await deny(path,{method:'PUT',value:{save:old}});await deny(path,{method:'DELETE'});
await deny(path,{method:'PATCH',value:{save:old,bossMigration:null}});
await deny(path+'/bossMigration',{method:'DELETE'});
await deny(path+'/bossMigration/baseline/austinWins',{method:'PUT',value:100});
const current=withBossMigrationProtocol(sealed.save,seal,owner);
current.player.name='Migrated seed';current.revision++;current.updatedAt=Date.now();
await allow(path+'/save',{method:'PUT',value:current});
for(const bad of [
 {...current,bossProtocol:{...current.bossProtocol,epoch:'different-epoch'}},
 {...current,bossProtocol:{...current.bossProtocol,ownerUid:'other'}},
 {...current,bossProtocol:{...current.bossProtocol,extra:1}},
 {...current,account:{...current.account,austinWins:10}}
])await deny(path+'/save',{method:'PUT',value:bad});
await deny(path+'/save/account/austinWins',{method:'PUT',value:10});
await deny(path+'/save/account/austinWins',{method:'DELETE'});
await deny(path+'/save/account',{method:'DELETE'});
await deny(path+'/save/bossProtocol',{method:'DELETE'});
for(const authentication of [null,token('other'),token(owner,'anonymous')])await deny(path+'/save',{method:'PUT',value:current,authentication});
const device=()=>createBossVictoryEventSync({storage:storage(),account:{user:()=>({uid:owner,isAnonymous:false}),tokenSession:async()=>({uid:owner,idToken:token(owner)})},ownerUid:owner,epoch,baseline:seal.baseline,databaseURL:base,fetchImpl:(url,o)=>{const u=new URL(url);u.searchParams.set('ns',project);return fetch(u,o);}});
const pc=device(),phone=device(),event=runId=>({mode:'journey',runId,boss:'austin',ordinal:1});
pc.queue.enqueue(event('pc'));phone.queue.enqueue(event('phone'));assert((await pc.sync()).ok);assert((await phone.sync()).ok);
pc.queue.enqueue(event('copied'));phone.queue.enqueue(event('copied'));assert((await Promise.all([pc.sync(),phone.sync()])).every(r=>r.ok));
const ledger=await read(ledgerPath);assert.equal(bossVictoryCounts(decodeBossVictoryCloud(ledger)).austinWins,12);
assert.equal((await read(path+'/save')).account.austinWins,9,'legacy serialized count remains the frozen baseline');
assert.equal(pc.queue.pending().length,0);assert.equal(phone.queue.pending().length,0);
await migrateBossVictoryUser({admin,ownerUid:owner,epoch,apply:true});
assert.deepEqual(await read(ledgerPath),ledger,'repeat migration never discards events');
assert.deepEqual((await read(path)).bossMigration,seal,'repeat migration never rewrites the original archive');
await assert.rejects(()=>migrateBossVictoryUser({admin,ownerUid:owner,epoch:'different-epoch',apply:true}),/migration-conflict/);
// A ledger cannot accept events before its matching seal exists.
const unsealed='migration-unsealed',unsealedSave=fixture(4),unsealedSeal=createBossMigrationSeal(unsealed,epoch,unsealedSave);
await allow('seedUsers/'+unsealed,{method:'PUT',value:{save:unsealedSave},admin:true});
await allow('seedBossVictories/'+unsealed,{method:'PUT',value:initializeBossLedgerFromSeal(null,unsealedSeal),admin:true});
await deny(`seedBossVictories/${unsealed}/events/journey:unsealed:austin:1`,{method:'PUT',value:{epoch,...event('unsealed')},authentication:token(unsealed)});
// Known conflicting metadata must be rejected before freezing an old client.
const conflict='migration-conflict',conflictSave=fixture(3),conflictSeal=createBossMigrationSeal(conflict,'other-epoch',conflictSave);
await allow('seedUsers/'+conflict,{method:'PUT',value:{save:conflictSave},admin:true});
await allow('seedBossVictories/'+conflict,{method:'PUT',value:initializeBossLedgerFromSeal(null,conflictSeal),admin:true});
await assert.rejects(()=>migrateBossVictoryUser({admin,ownerUid:conflict,epoch,apply:true}),/migration-conflict/);
assert.equal((await read('seedUsers/'+conflict)).bossMigration,undefined);
const retryOwner='migration-retry-conflict',retryPath='seedUsers/'+retryOwner,retrySave=fixture(8);
await allow(retryPath,{method:'PUT',value:{save:retrySave},admin:true});
await allow('seedBossVictories/'+retryOwner,{method:'PUT',value:initializeBossLedgerFromSeal(null,createBossMigrationSeal(retryOwner,epoch,retrySave)),admin:true});
let retryRaced=false,retryConflicts=0;
const retryAdmin={...admin,compareAndSet:async(p,v,etag)=>{
 if(!retryRaced&&p===retryPath){retryRaced=true;await allow(retryPath+'/save/account/austinWins',{method:'PUT',value:9,authentication:token(retryOwner)});}
 const ok=await admin.compareAndSet(p,v,etag);if(!ok)retryConflicts++;return ok;
}};
await assert.rejects(()=>migrateBossVictoryUser({admin:retryAdmin,ownerUid:retryOwner,epoch,apply:true}),/migration-conflict/);
assert.equal(retryConflicts,1);assert.equal((await read(retryPath)).bossMigration,undefined);
assert.equal((await read(retryPath+'/save')).account.austinWins,9);
// Crash after freezing: old writes stop immediately, archive survives, retry
// with the same epoch initializes only the missing ledger.
const interrupted='migration-interrupted',interruptedPath='seedUsers/'+interrupted;
const empty=fixture(2);delete empty.discoveries.bosses;
await allow(interruptedPath,{method:'PUT',value:{save:empty},admin:true});
const crashAdmin={...admin,compareAndSet:async(p,v,etag)=>{if(p.startsWith('seedBossVictories/'))throw Error('injected-disconnect');return admin.compareAndSet(p,v,etag);}};
await assert.rejects(()=>migrateBossVictoryUser({admin:crashAdmin,ownerUid:interrupted,epoch,apply:true}),/injected-disconnect/);
const frozen=await read(interruptedPath);assert(validBossMigrationSeal(frozen.bossMigration));
await deny(interruptedPath+'/save',{method:'PUT',value:empty,authentication:token(interrupted)});
const halfCurrent=withBossMigrationProtocol(frozen.save,frozen.bossMigration,interrupted);
await deny(interruptedPath+'/save',{method:'PUT',value:halfCurrent,authentication:token(interrupted)});
assert.equal(await read('seedBossVictories/'+interrupted),null);
await migrateBossVictoryUser({admin,ownerUid:interrupted,epoch,apply:true});
assert.deepEqual(await read(interruptedPath),frozen);
await allow(interruptedPath+'/save',{method:'PUT',value:halfCurrent,authentication:token(interrupted)});
assert.deepEqual(await read('.settings/rules'),rules);
console.log('Real demo RTDB migration passed: full rules compile/preserve siblings, real old-write ETag 412, exact server baseline/archive, old-client overwrite/delete and protocol/count bypass denials, owner-only readiness/seal, migrated profile writes, actual PC+phone event union/copy dedupe, interrupted seal resume, conflicting ledger preflight and immutable retry. No production rules/accounts migrated.');
