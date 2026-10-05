import assert from 'node:assert/strict';
import {createSurvivalSession,advanceSurvivalAct} from '../src/survival-rules.js';
import {createSurvivalExpansion} from '../src/survival-expansion.js';
import {createSurvivalSiege,checkpointSurvivalSiege,survivalSiegeActive,SURVIVAL_OBJECTIVE} from '../src/survival-crystal-siege.js';
import {captureSurvivalObjectiveSnapshot,validSurvivalObjectiveSave,validSurvivalObjectiveRecord} from '../src/survival-objective-save.js';
import {createSurvivalSaveStore,routeSurvivalSaveStore,validSurvivalSave} from '../src/survival-save.js';
import {decodeSurvivalCloud,createSurvivalSync} from '../src/survival-sync.js';
import {survivalExpansionRankProgress} from '../src/survival-ranking.js';

const enabled={[SURVIVAL_OBJECTIVE]:{version:1,released:true}},closed={[SURVIVAL_OBJECTIVE]:{version:1,released:false}};
const data=new Map(),storage={getItem:k=>data.get(k)||null,setItem:(k,v)=>data.set(k,v)};
let uid='p1';const opts={objectives:()=>enabled,currentOwner:()=>uid,inspection:()=>false};
function world(session,id='new-run'){
 return {id,revision:0,session,progress:{hp:100,kills:0,score:0,choicesTaken:0,choiceKills:0,bankedUpgrades:0,elapsed:0,levels:{},forms:{},inventory:{}},
  player:{position:[0,0,0],baseSlideTarget:[0,0,0],baseSlideDir:[0,0,0],lastMove:[0,0,0]},pending:null,enemies:[],hostiles:[],...(session.act>=3?{expansion:createSurvivalExpansion(session).checkpoint()}:{})};
}
const firstSession=createSurvivalSession(11,{actCount:5,objective:SURVIVAL_OBJECTIVE});
const first=captureSurvivalObjectiveSnapshot(world(firstSession),{owner:uid});
assert(first&&first.version===2&&first.siege===null);
const modern=createSurvivalSaveStore(storage,uid,opts);
assert.equal(modern.write(first,{fresh:true}).ok,true);
assert.equal(validSurvivalSave({...modern.read(),version:1}),false,'old validator rejects all new objective bytes');
assert.equal(routeSurvivalSaveStore(storage,uid,opts).kind,'objective');
assert.equal(routeSurvivalSaveStore(storage,uid,{...opts,objectives:()=>closed}).kind,'objective-locked');
assert.equal(createSurvivalSaveStore(storage,uid,{...opts,objectives:()=>closed}).read(),null);
const saved=modern.read();
let siegeSession={...saved.session,act:4,time:720,legStartedAt:720};
const siege=createSurvivalSiege(siegeSession);
const fifth=captureSurvivalObjectiveSnapshot({...world(siegeSession),revision:saved.revision,writeId:saved.writeId,parent:saved.parent},{owner:uid,siege,threats:[]});
assert(validSurvivalObjectiveSave({...fifth,revision:saved.revision,writeId:saved.writeId,savedAt:Date.now()},{owner:uid,enabled}));
assert.equal(survivalSiegeActive(siegeSession),true);
assert.equal(modern.write(fifth).ok,true);
assert.equal(modern.read().siege.state.crystal.core.hp,siege.crystal.core.hp);
const tampered=structuredClone(modern.read());tampered.siege.state.crystal.resources=999;assert.equal(validSurvivalObjectiveSave(tampered,{owner:uid,enabled}),false);
const review=structuredClone(modern.read());review.session.lab='siege';review.session.siegeReview=true;assert.equal(validSurvivalObjectiveSave(review,{owner:uid,enabled}),false);
assert.equal(modern.end('new-run',2,modern.read().writeId),true);
assert.equal(validSurvivalObjectiveRecord(modern.readRecord(),{owner:uid,enabled}),true);
const nextLap=createSurvivalSession(13,{actCount:5,objective:SURVIVAL_OBJECTIVE});
for(let act=0;act<5;act++){nextLap.won=true;nextLap.bossesDefeated++;assert(advanceSurvivalAct(nextLap));}
nextLap.completedLaps=1;assert.equal(nextLap.act,0);assert.equal(nextLap.lap,1);assert.equal(nextLap.objective,SURVIVAL_OBJECTIVE);
const next=captureSurvivalObjectiveSnapshot(world(nextLap,'next-lap'),{owner:uid});
assert.equal(modern.write(next,{fresh:true}).ok,true,'completed circuit starts next lap cleanly');
assert.equal(modern.read().session.lap,1);
assert.equal(survivalExpansionRankProgress(nextLap,{objectives:closed}).eligible,false);
assert.equal(survivalExpansionRankProgress(nextLap,{objectives:enabled}).eligible,true);
assert.equal(survivalExpansionRankProgress({...nextLap,objective:undefined},{objectives:closed}).eligible,true,'legacy ranking remains pinned');

// V1 terminal ancestry is exact serialized bytes, and cannot change mid-run.
const oldStore=createSurvivalSaveStore(storage,'p2');const legacyWorld=world(createSurvivalSession(2),'old-run');assert(oldStore.write(legacyWorld,{fresh:true}).ok);assert(oldStore.end('old-run',1));
const fresh=createSurvivalSaveStore(storage,'p2',{...opts,currentOwner:()=> 'p2'}),newWorld=captureSurvivalObjectiveSnapshot(world(createSurvivalSession(3,{actCount:5,objective:SURVIVAL_OBJECTIVE}),'after-old'),{owner:'p2'});
assert.equal(fresh.write(newWorld,{fresh:true}).ok,true);assert.equal(fresh.read().parent.bytes,JSON.stringify(oldStore.readRecord()));
const brokenParent=structuredClone(fresh.read());brokenParent.parent=null;brokenParent.revision++;assert.equal(fresh.replace(fresh.readRecord(),brokenParent).reason,'parent');
assert.equal(fresh.write({...fresh.read(),parent:null}).reason,'parent');

// Same cloud path: old decoder must reject v2 without sending a PUT.
const remote={version:2,revision:1,checkpoint:JSON.stringify(modern.readRecord())};assert.throws(()=>decodeSurvivalCloud(remote));
assert.equal(decodeSurvivalCloud(remote,{objectives:enabled,owner:'p1'}).record.version,2);
let puts=0;const account={user:()=>({uid:'p1',isAnonymous:false}),tokenSession:async()=>({uid:'p1',idToken:'token'})};
const fetchImpl=async (_url,options={})=>{if(options.method==='PUT')puts++;return {ok:true,status:200,headers:{get:()=> 'etag-1'},json:async()=>remote};};
const oldSync=createSurvivalSync({storage,account,databaseURL:'https://example.test',fetchImpl,currentOwner:()=> 'p1'});
assert.equal((await oldSync.sync()).kind,'invalid');assert.equal(puts,0);
const oldRemoteRecord=oldStore.readRecord(),legacyRemote={version:1,revision:3,checkpoint:JSON.stringify(oldRemoteRecord)};
let transitionPuts=0;const transitionFetch=async (_url,request={})=>{if(request.method==='PUT')transitionPuts++;return{ok:true,status:200,headers:{get:()=> 'etag-legacy'},json:async()=>legacyRemote};};
const transition=createSurvivalSync({storage,account:{user:()=>({uid:'p2',isAnonymous:false}),tokenSession:async()=>({uid:'p2',idToken:'token'})},databaseURL:'https://example.test',fetchImpl:transitionFetch,currentOwner:()=> 'p2',objectives:()=>enabled});
assert.equal((await transition.sync()).kind,'conflict');assert.equal(transitionPuts,0,'copied terminal alone cannot authorize cloud migration');
storage.setItem('seed-survival-sync-v1:p2',JSON.stringify({revision:3,writeId:oldRemoteRecord.writeId,recordId:JSON.stringify(oldRemoteRecord)}));
assert.equal((await transition.sync()).kind,'synced');assert.equal(transitionPuts,1,'acknowledged exact terminal may migrate with conditional PUT');
const forgedRemote={...fresh.readRecord(),parent:null,revision:2,writeId:'new-remote-write'};
assert(validSurvivalObjectiveRecord(forgedRemote,{owner:'p2',enabled}),'fixture is otherwise a valid v2 record');
const mismatched={version:2,revision:4,checkpoint:JSON.stringify(forgedRemote)};let mismatchPuts=0;
storage.setItem('seed-survival-sync-v1:objective-v2:p2',JSON.stringify({revision:4,writeId:forgedRemote.writeId,recordId:JSON.stringify(forgedRemote)}));
const mismatchSync=createSurvivalSync({storage,account:{user:()=>({uid:'p2',isAnonymous:false}),tokenSession:async()=>({uid:'p2',idToken:'token'})},databaseURL:'https://example.test',currentOwner:()=> 'p2',objectives:()=>enabled,fetchImpl:async (_url,request={})=>{if(request.method==='PUT')mismatchPuts++;return{ok:true,status:200,headers:{get:()=> 'etag-v2'},json:async()=>mismatched};}});
assert.equal((await mismatchSync.sync()).kind,'conflict');assert.equal(mismatchPuts,0,'same-run v2 cannot discard terminal ancestry, even with modern ACK metadata');
const phoneData=new Map([['seed-survival-checkpoint-v1:p2',JSON.stringify(oldRemoteRecord)]]);
const phoneStorage={getItem:k=>phoneData.get(k)||null,setItem:(k,v)=>phoneData.set(k,v)};
const phoneRemote={version:2,revision:5,checkpoint:JSON.stringify(fresh.readRecord())};let phonePuts=0;
const phoneSync=createSurvivalSync({storage:phoneStorage,account:{user:()=>({uid:'p2',isAnonymous:false}),tokenSession:async()=>({uid:'p2',idToken:'token'})},databaseURL:'https://example.test',currentOwner:()=> 'p2',objectives:()=>enabled,fetchImpl:async (_url,request={})=>{if(request.method==='PUT')phonePuts++;return{ok:true,status:200,headers:{get:()=> 'etag-phone'},json:async()=>phoneRemote};}});
assert.equal((await phoneSync.sync({allowPull:true})).kind,'conflict');assert.equal(phonePuts,0,'unconfirmed legacy terminal cannot adopt remote child');
phoneStorage.setItem('seed-survival-sync-v1:p2',JSON.stringify({revision:3,writeId:oldRemoteRecord.writeId,recordId:JSON.stringify(oldRemoteRecord)}));
assert.equal((await phoneSync.sync({allowPull:true})).kind,'synced');assert.equal(phonePuts,0);assert.equal(createSurvivalSaveStore(phoneStorage,'p2',{objectives:()=>enabled,currentOwner:()=> 'p2'}).read()?.id,'after-old');

// A JS callback at the backup or clock boundary may switch account/gate.
let gate=true,owner='p1';const raceStorage={getItem:k=>data.get(k)||null,setItem:(k,v)=>{if(k.endsWith(':previous'))gate=false;data.set(k,v);}};
const racer=createSurvivalSaveStore(raceStorage,'p1',{objectives:()=>gate,currentOwner:()=>owner});const current=racer.readRecord();
assert.equal(racer.replace(current,{...current,revision:current.revision+1}).ok,false);assert.equal(racer.readRecord(),null);
owner='p2';assert.equal(racer.end(current.id,current.revision),false);
console.log('PASS Survival public objective: distinct v2 owner/gate route, live fifth-act siege/resource validation, completed lap, exact v1 terminal parent, old-client cloud fail-closed, review exclusion and account-race guard');
