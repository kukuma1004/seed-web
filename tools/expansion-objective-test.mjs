import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import vm from 'node:vm';
import * as journey from '../src/expansion-journey.js';
import {CRYSTAL_DEFENSE_OBJECTIVE as ID,EXPANSION_OBJECTIVES,freshExpansionObjective} from '../src/expansion-objective.js';
import {createExpansionAccountEntry,validExpansionAccountSave,createExpansionAccountSaveStore,expansionAccountSaveLockKey,expansionAccountExitCheckpoint,mergeExpansionAccountSaves} from '../src/expansion-account-save.js';
import {createExpansionEntry,createExpansionSaveStore} from '../src/expansion-run-save.js';
import {completeExpansionPublicBoss,ackExpansionPublicTitle,advanceExpansionPublicCampaign} from '../src/expansion-public-campaign.js';
import {createExpansionAccountSync} from '../src/expansion-account-sync.js';
import * as siegeApi from '../src/crystal-siege-rules.js';
const copy=v=>JSON.parse(JSON.stringify(v)),act='crystalGorge',owner='objective-owner';
const closed={[ID]:{version:1,released:false}},open={[ID]:{version:1,released:true}},facts={currentOwner:owner,inspection:false,practice:false,acts:journey.EXPANSION_ACTS,objectives:open};
const run={version:1,cycle:0,region:'garden',stage:0,mode:'entry',hp:100,kills:31,elapsed:80,rules:[],mutated:[],forms:{returnblade:7},inventory:{potion:3,wind:2,sprout:1},score:1234,choicesTaken:5,choiceKills:2};
const memory=()=>{const data=new Map();return{data,getItem:k=>data.get(k)??null,setItem:(k,v)=>data.set(k,String(v))};};
let clock=1000;const lease={ok:true,key:expansionAccountSaveLockKey(owner,act),active:()=>true};
const fresh=(id='new')=>createExpansionAccountEntry(journey.createExpansionJourney(act,0,413,{siege:true,objective:ID}),run,[0,0,5],{owner,...facts,id});
assert.equal(freshExpansionObjective(act),ID);assert.equal(freshExpansionObjective(act,closed),null);assert.equal(freshExpansionObjective(act,open),ID);assert.equal(freshExpansionObjective('crosswind',open),null);assert.equal(EXPANSION_OBJECTIVES[ID].released,true,'public rollout selects the new objective only for fresh runs');
const raw=journey.createExpansionJourney(act,0,413,{siege:true}),inspection=createExpansionEntry(raw,run,[0,0,5]);
for(const j of [raw,{...raw,inspectionPreview:true},{...raw,siegeReview:true}])assert.equal(createExpansionAccountEntry(j,run,[0,0,5],{owner,...facts}),null);
assert.equal(createExpansionAccountEntry(journey.createExpansionJourney(act,0,413,{siege:true,objective:ID}),run,[0,0,5],{owner,...facts,objectives:closed}),null);
for(const flag of ['siegeReview','developerRun','lab','practice'])assert.equal(createExpansionAccountEntry(journey.createExpansionJourney(act,0,413,{siege:true,objective:ID}),{...run,[flag]:true},[0,0,5],{owner,...facts}),null);
const entry=fresh();assert(entry&&entry.version===2&&entry.objective===ID);assert(validExpansionAccountSave(entry));
for(const mutate of [v=>delete v.objective,v=>v.version=1,v=>delete v.entry.journey.objective,v=>delete v.entry.journey.siege,v=>v.entry.journey.objective='legacy',v=>v.act='crosswind']){const bad=copy(entry);mutate(bad);assert.equal(validExpansionAccountSave(bad),false);}
const m=memory(),local=createExpansionSaveStore(m,act,owner+':siege-review');assert(local.write(inspection,{fresh:true}).ok);const reviewBytes=m.getItem(local.key);
const ctx={...facts};const store=createExpansionAccountSaveStore(m,act,owner,{context:()=>ctx,lease,now:()=>++clock});
assert.equal(store.write({...entry,entry:inspection},{fresh:true}).reason,'invalid');assert.equal(m.getItem(local.key),reviewBytes);
let saved=store.write(entry,{fresh:true});assert(saved.ok);saved=saved.value;assert.deepEqual(store.read(),saved);
const original=m.getItem(store.key);ctx.objectives=closed;assert.equal(store.read(),null);assert.equal(store.write(saved).reason,'ineligible');assert.equal(store.finish(saved).reason,'ineligible');assert.equal(m.getItem(store.key),original);ctx.objectives=open;
// Mid-room save retains only entrance gains, actual spent resources/core/potions.
const live=copy(saved.entry.journey.siege);live.core.hp=70;live.resources=1;const outgoing=expansionAccountExitCheckpoint(saved,{hp:80,inventory:{potion:2,wind:2,sprout:1},siege:live});assert(outgoing);assert.equal(outgoing.entry.journey.objective,ID);assert.equal(outgoing.entry.journey.siege.core.hp,70);assert.equal(outgoing.entry.journey.siege.resources,1);assert.equal(outgoing.entry.run.inventory.potion,2);assert.equal(outgoing.entry.run.score,run.score);assert.equal(outgoing.entry.run.forms.returnblade,7);
const ended=store.finish(saved);assert(ended.ok&&ended.value.version===2&&ended.value.objective===ID&&ended.value.entry.ended);assert(validExpansionAccountSave(ended.value));
// An old application recognizes neither live nor terminal new objective.
const oldSource=readFileSync(new URL('./expansion-objective-legacy-validator-fixture.mjs',import.meta.url),'utf8');
const old=vm.createContext({ownerValid:o=>typeof o==='string'&&o!=='guest',actValid:a=>['crosswind','crystalGorge'].includes(a),validExpansionPublicCampaign:()=>true,validEnd:e=>e?.ended===true,validExpansionEntry:()=>true,EXPANSION_ACCOUNT_SAVE_LIMIT:100000});vm.runInContext(oldSource,old);
assert.equal(old.validExpansionAccountSave(saved),false);assert.equal(old.validExpansionAccountSave(ended.value),false);
const legacy=createExpansionAccountEntry(journey.createExpansionJourney(act),run,[0,0,5],{owner,...facts,id:saved.entry.id});legacy.entry.revision=100;legacy.entry.savedAt=5000;
assert.equal(mergeExpansionAccountSaves(legacy,saved,{owner,act}).reason,'conflict');assert.equal(mergeExpansionAccountSaves(legacy,ended.value,{owner,act}).reason,'conflict');assert.equal(store.replace(ended.value,legacy,{allowDifferentRun:true,allowEnded:true,allowFork:true}).reason,'conflict');
// Real production lap closure pins the original objective, including legacy.
const main=readFileSync(new URL('../src/main.js',import.meta.url),'utf8'),lap=main.slice(main.indexOf('function advancePublicExpansionLap(){'),main.indexOf('function exitExpansionJourney(){'));
// Run the actual host callbacks with original paid-facility rules. The fake
// view captures DOM callbacks; it supplies no account permissions or victory.
const prepare=main.slice(main.indexOf('async function prepareCrystalSiegeView(){'),main.indexOf('async function expansionArtCache(){')).replace("await import('./crystal-siege-view.js')",'fixtureView');
for(const [inspection,channel,objective,allowed,paused,mode,works]of [[false,'public',ID,true,false,'playing',true],[false,'public',ID,false,false,'playing',false],[false,'public',null,true,false,'playing',false],[false,'public',ID,true,true,'playing',false],[false,'public',ID,true,false,'ready',false],[true,'inspection',null,false,false,'playing',true]]){
 const j=journey.createExpansionJourney(act,0,413,{siege:true,objective}),pad=j.siege.pads[0],toast={textContent:''};let callbacks;
 const c={expansionSiegeApi:siegeApi,expansionSiegeView:null,fixtureView:{createCrystalSiegeView:(s,t,b,o)=>(callbacks=o,{})},scene:{},texloader:{},localInspection:inspection,expansionChannel:channel,expansionJourney:j,canSaveExpansion:()=>allowed,mode,paused,player:{position:{x:pad.x,z:pad.z}},survivalSession:null,survivalSiegeActive:()=>false,canUseSurvivalSiege:()=>false,$:()=>toast,audio:{play:()=>{}}};
 // Vite's asset base is irrelevant to this fake view; keep all callback code.
 vm.createContext(c);vm.runInContext(prepare.replace('import.meta.env.BASE_URL',"'/'"),c);await c.prepareCrystalSiegeView();callbacks.onBuild(pad.id,'turret');callbacks.onStart();assert.equal(pad.kind,works?'turret':null);assert.equal(j.siege.resources,works?0:3);assert.equal(j.siege.phase,works?'defense':'prep');
}
for(const siege of [false,true]){
 const j=journey.createExpansionJourney(act,0,413,{siege,objective:siege?ID:null});let record=createExpansionAccountEntry(j,run,[0,0,5],{owner,...facts,id:'lap-'+siege});record.campaign=ackExpansionPublicTitle(completeExpansionPublicBoss(record.campaign,act),act);
 const c={canSaveExpansion:()=>true,settleExpansionTitles:()=>true,advanceExpansionPublicCampaign,expansionPublicEntry:record,expansionJourney:j,expansionApi:journey,expansionRunSnapshot:()=>copy(run),maxPlayerHp:()=>100,hp:75,JOURNEY_HEAL:25,createExpansionEntry,expansionEntry:record.entry,expansionStore:()=>({write:value=>({ok:true,value})}),wave:()=>{},cycle:0,stage:0};vm.createContext(c);vm.runInContext(lap,c);assert(c.advancePublicExpansionLap());assert.equal(c.expansionJourney.objective??null,siege?ID:null);assert.equal(!!c.expansionJourney.siege,siege);assert.equal(c.expansionEntry.run.forms.returnblade,7);assert.equal(c.expansionEntry.run.inventory.sprout,1);assert.equal(c.expansionEntry.run.score,1234);assert.equal(c.cycle,1);
}
// GET/backup gate changes must stop PUT even though the act itself stays open.
for(const point of ['get','backup']){
 const storage=memory(),state={...facts};const st=createExpansionAccountSaveStore(storage,act,owner,{context:()=>state,lease,now:()=>++clock}),value=st.write(fresh('cloud-'+point),{fresh:true}).value;
 const previous=copy(value);previous.entry.revision=0; // remote committed separate older entrance
 previous.entry.revision=1;previous.entry.savedAt=999;previous.entry.run.hp=90;
 storage.setItem('seed-expansion-account-sync-v1:'+owner+':'+act,JSON.stringify({version:1,revision:1,record:JSON.stringify(previous)}));
 const baseSet=storage.setItem;storage.setItem=(k,v)=>{baseSet(k,v);if(point==='backup'&&k.endsWith(':previous-cloud'))state.objectives=closed;};
 let puts=0;const sync=createExpansionAccountSync({storage,act,account:{user:()=>({uid:owner,isAnonymous:false}),tokenSession:async()=>({uid:owner,idToken:'mock'})},databaseURL:'https://mock.invalid',context:()=>state,activeLease:()=>lease,fetchImpl:async(url,opts)=>{if(opts.method==='PUT'){puts++;throw Error('Unexpected write');}if(point==='get')state.objectives=closed;return{ok:true,headers:{get:()=> 'etag'},json:async()=>({version:1,ownerUid:owner,act,revision:1,checkpoint:JSON.stringify(previous)})};}});
 const result=await sync.sync();assert(['invalid','ineligible'].includes(result.kind),point+': '+result.kind);assert.equal(puts,0);assert.equal(storage.getItem(st.key),JSON.stringify(value));
}
console.log('New5 objective: legacy/review isolation, v2 live+terminal identity, OFF gates, original run carry/lap pinning, merge/replace conflict and GET/backup zero PUT PASS. Unit/VM/mock transport; physical devices and authenticated cloud remain separate.');
