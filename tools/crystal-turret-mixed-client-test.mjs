import assert from 'node:assert/strict';
import vm from 'node:vm';
import {readFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import * as runtime from '../src/act-expansion-runtime.js';
import * as run from '../src/run-save.js';
import * as campaign from '../src/expansion-public-campaign.js';
import * as objective from '../src/expansion-objective.js';
import * as rules from '../src/crystal-siege-rules.js';
import * as journey from '../src/expansion-journey.js';
import * as entries from '../src/expansion-run-save.js';
import * as saves from '../src/expansion-account-save.js';
import * as syncs from '../src/expansion-account-sync.js';
import {EXPANSION_ACTS} from '../src/act-expansion.js';

// Execute the last publicly shipped code, rather than a hand-written old client.
const fixture=JSON.parse(readFileSync(new URL('./crystal-turret-v89-fixture.json',import.meta.url),'utf8'));
assert.equal(fixture.baseline,'e6f9efc1e35276a5bf8b3c8c37b6eaa932ea150f');
function oldModule(path,dependencies){
 const {source,sha256}=fixture.modules[path];assert.equal(createHash('sha256').update(source).digest('hex'),sha256);
 const names=[...source.matchAll(/export (?:const|function) (\w+)/g)].map(x=>x[1]);
 const code=source.replace(/^import .*;\r?\n/gm,'').replace(/^export \{[^\n]*;\r?\n/gm,'').replace(/\bexport\s+(?=(?:const|function))/g,'');
 return vm.runInNewContext(code+'\n;({'+names.join(',')+'})',{...dependencies,AbortController,setTimeout,clearTimeout,globalThis});
}
const oldRules=oldModule('src/crystal-siege-rules.js',{});
const oldJourney=oldModule('src/expansion-journey.js',{...runtime,...objective,...oldRules,EXPANSION_ACTS});
const oldEntries=oldModule('src/expansion-run-save.js',{...run,...oldRules,...oldJourney});
const oldSaves=oldModule('src/expansion-account-save.js',{...campaign,...objective,...oldEntries,EXPANSION_ACTS});
const oldSyncs=oldModule('src/expansion-account-sync.js',{...oldSaves,EXPANSION_ACTS,acquireExpansionSaveLease:()=>assert.fail('Use the supplied exclusive lease')});
const owner='mixed-client-fixture',act='crystalGorge',key=saves.expansionAccountSaveKey(owner,act),meta='seed-expansion-account-sync-v1:'+owner+':'+act;
const checkpoint={version:1,cycle:0,region:'garden',stage:0,mode:'entry',hp:100,kills:0,elapsed:0,rules:[],mutated:[],forms:{},inventory:{potion:3},score:0,choicesTaken:0,choiceKills:0};
const memory=()=>{const data=new Map();return{data,getItem:k=>data.get(k)??null,setItem:(k,v)=>data.set(k,v)};};
function device(api=saves,Sync=syncs,storage=memory()){
 const lease={ok:true,key:saves.expansionAccountSaveLockKey(owner,act),active:()=>true};
 const facts={currentOwner:owner,inspection:false,practice:false,acts:EXPANSION_ACTS};
 const store=api.createExpansionAccountSaveStore(storage,act,owner,{context:()=>facts,lease,now:()=>1000});
 let remote=null,gets=0,puts=0;
 const sync=Sync.createExpansionAccountSync({storage,act,acts:EXPANSION_ACTS,context:()=>facts,activeLease:()=>lease,account:{user:()=>({uid:owner,isAnonymous:false}),tokenSession:async()=>({uid:owner,idToken:'fixture'})},databaseURL:'https://example.invalid',fetchImpl:async(url,options)=>{
  if(options.method==='PUT'){puts++;remote=JSON.parse(options.body);return{ok:true,status:200};}
  gets++;return{ok:true,json:async()=>remote,headers:{get:()=> 'etag'}};
 }});
 return{storage,store,sync,counts:()=>({gets,puts}),remote:v=>{if(v!==undefined)remote=v;return remote;}};
}
function record(level){
 const state=journey.createExpansionJourney(act,0,713,{siege:true,objective:objective.CRYSTAL_DEFENSE_OBJECTIVE});
 Object.assign(state.siege.pads[0],{kind:'turret',level,hp:[45,60,78,98,120][level-1]-7,cooldown:.2});
 const value=saves.createExpansionAccountEntry(state,checkpoint,[0,0,4],{owner,currentOwner:owner,acts:EXPANSION_ACTS,id:'run-'+level});assert(value);
 const d=device(),saved=d.store.write(value,{fresh:true});assert(saved.ok);return saved.value;
}
for(const level of [1,2]){
 const value=record(level),bytes=JSON.stringify(value);assert(oldSaves.validExpansionAccountSave(value));
 const legacy=device(oldSaves,oldSyncs);legacy.storage.setItem(key,bytes);assert.equal(JSON.stringify(legacy.store.read()),bytes);
 const restored=oldJourney.restoreExpansionJourney(value.entry.journey);assert.equal(JSON.stringify(oldJourney.checkpointExpansionJourney(restored)),JSON.stringify(value.entry.journey));
 assert.equal(JSON.stringify(journey.checkpointExpansionJourney(journey.restoreExpansionJourney(value.entry.journey))),JSON.stringify(value.entry.journey));
}
for(const level of [3,4,5]){
 const value=record(level),bytes=JSON.stringify(value),cloud={version:1,ownerUid:owner,act,revision:7,checkpoint:bytes};
 assert.throws(()=>oldRules.restoreCrystalSiege(value.entry.journey.siege));assert(!oldSaves.validExpansionAccountSave(value));
 for(const localFuture of [false,true])for(const choice of [null,'local','remote']){
  const legacy=device(oldSaves,oldSyncs),prior=JSON.stringify(record(2));legacy.storage.setItem(key,localFuture?bytes:prior);legacy.storage.setItem(meta,JSON.stringify({version:1,revision:7,record:prior}));legacy.remote(cloud);
  const before=JSON.stringify([...legacy.storage.data]),server=JSON.stringify(legacy.remote());
  assert.equal((await legacy.sync.sync({allowPull:true,choice,expected:{revision:7,local:prior,etag:'etag'}})).kind,'invalid');
  assert.equal(legacy.counts().puts,0);assert.equal(JSON.stringify(legacy.remote()),server);assert.equal(JSON.stringify([...legacy.storage.data]),before);
  if(localFuture){assert.equal(legacy.store.write(record(1),{fresh:true}).reason,'unrecognized');assert.equal(legacy.store.finish(record(2)).ok,false);assert.equal(legacy.storage.getItem(key),bytes);}
 }
 const fresh=device();fresh.remote(cloud);assert.equal((await fresh.sync.sync({allowPull:true})).kind,'synced');assert.equal(fresh.counts().puts,0);assert.equal(JSON.stringify(fresh.store.read()),bytes);
 const upgraded=device(saves,syncs,fresh.storage);assert.equal(upgraded.store.read().entry.journey.siege.pads[0].level,level);
 const loss=saves.expansionAccountExitCheckpoint(upgraded.store.read(),{hp:80,inventory:{potion:2}}),saved=upgraded.store.write(loss);assert(saved.ok);assert.equal(saved.value.entry.journey.siege.pads[0].level,level);
}
console.log('PASS: actual public 1.0.89 modules preserve Lv1/2, block Lv3/4/5 local and remote writes (18 cases), preserve all bytes, and current clients resume advanced turrets without downgrade. Mock storage/network; not normal-account/device proof.');
