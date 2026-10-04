import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import * as THREE from 'three';
import * as rules from '../src/expansion-journey.js';
import {createExpansionEntry,createExpansionSaveStore,expansionExitCheckpoint} from '../src/expansion-run-save.js';
import {createExpansionAccountEntry,createExpansionAccountSaveStore,expansionAccountEligible,expansionAccountExitCheckpoint,expansionAccountSaveKey,expansionAccountSaveLockKey} from '../src/expansion-account-save.js';
import {createExpansionAccountSync} from '../src/expansion-account-sync.js';
import {acquireExpansionSaveLease} from '../src/expansion-save-lease.js';
import {normalizeRelics} from '../src/relics.js';
import {levelsToSave,levelsFromSave} from '../src/progression.js';
import {mutationsToSave,mutationsFromSave} from '../src/mutations.js';
import {createDashState} from '../src/dash-evolution.js';
import {emptyInventory,startingInventory,normalizeInventory,addItem} from '../src/inventory.js';
import {normalizeRunBonuses} from '../src/run-bonuses.js';
import {createActiveGauge} from '../src/actives.js';
import {createExpansionPublicCampaign,completeExpansionPublicBoss,advanceExpansionPublicCampaign,settleExpansionPublicTitles,expansionCampaignBoss,EXPANSION_CAMPAIGN_CLEARS} from '../src/expansion-public-campaign.js';
const source=fs.readFileSync('src/main.js','utf8').replaceAll('\r\n','\n');
const launched=source.slice(source.indexOf('async function startPublicExpansionJourney('),source.indexOf('\nfunction spawnExpansionActor(')).replace("import('./expansion-journey.js')",'Promise.resolve(__rules)').replace("import('./expansion-journey-view.js')",'Promise.resolve(__view)').replaceAll('import.meta.env.BASE_URL',"'/'");
const helpers=source.slice(source.indexOf('const expansionPublicFacts='),source.indexOf('const expansionTargets='));
const restart=source.slice(source.indexOf('function restart('),source.indexOf('\nfunction togglePause('));
const released={...rules,EXPANSION_ACTS:Object.fromEntries(Object.entries(rules.EXPANSION_ACTS).map(([k,v])=>[k,{...v,released:true}]))};
const run={version:1,cycle:0,region:'garden',stage:0,mode:'entry',hp:100,kills:3,elapsed:15,rules:[],mutated:[],forms:{returnblade:5},inventory:{potion:3,tonic:2,wind:1,shell:1,sprout:1},score:300,choicesTaken:2,choiceKills:3};
const clone=v=>JSON.parse(JSON.stringify(v));
function locks(){const held=new Set();return {held,request(key,options,fn){assert.deepEqual(options,{mode:'exclusive',ifAvailable:true});if(held.has(key))return Promise.resolve(fn(null));held.add(key);return Promise.resolve().then(()=>fn({name:key})).finally(()=>held.delete(key));}};}
function fixture({acts=released,manager=locks(),prepare=async()=>{},inspection=false}={}){
 const data=new Map(),nodes=new Map();let owner='owner-A',anonymous=false,remote=null,etag=0,getHook=null,fetchFail=false;
 const stats={gets:0,puts:0,clear:0,carry:0,telemetry:[],gardenWaves:0,restarts:0};
 const storage={fail:false,getItem:k=>data.get(k)??null,setItem(k,v){if(this.fail)throw Error('quota');data.set(k,v);},removeItem:k=>data.delete(k)};
 data.set('seed-run-checkpoint-v1','original act1 bytes');data.set('seed-account-profile-v1','original account bytes');data.set('carry','original carry');
 const $=sel=>{if(!nodes.has(sel))nodes.set(sel,{textContent:'',innerHTML:'',hidden:false,disabled:false,classList:{remove(){},add(){},toggle(){}}});return nodes.get(sel);};
 const fetchImpl=async(url,o)=>{if(fetchFail)throw Error('offline');assert.match(url,/seedExpansionSaves\/owner-A\/(crosswind|crystalGorge)\.json/);if(o.method==='PUT'){stats.puts++;if(o.headers['if-match']!==String(etag))return {ok:false,status:412};remote=JSON.parse(o.body);etag++;return {ok:true,status:200};}stats.gets++;const value=clone(remote),tag=String(etag);if(getHook){const hook=getHook;getHook=null;await hook();}return {ok:true,status:200,json:async()=>value,headers:{get:()=>tag}};};
 const c=vm.createContext({__rules:acts,__view:{},console,setTimeout,clearTimeout,Promise,localInspection:inspection,expansionLaunch:0,expansionApi:acts,expansionOwner:()=>owner,
  expansionSaveLease:null,expansionChannel:'inspection',expansionPublicEntry:null,expansionPublicSync:null,expansionFreshExpected:null,expansionSaveOwner:null,expansionEntry:null,expansionJourney:null,expansionPendingBossCheckpoint:null,
  rawStorage:storage,createExpansionSaveStore,createExpansionEntry,expansionExitCheckpoint,createExpansionAccountEntry,createExpansionAccountSaveStore,expansionAccountEligible,expansionAccountExitCheckpoint,createExpansionPublicCampaign,completeExpansionPublicBoss,advanceExpansionPublicCampaign,settleExpansionPublicTitles,expansionCampaignBoss,EXPANSION_CAMPAIGN_CLEARS,awardModeBoss:()=>true,
  createExpansionAccountSync:opts=>createExpansionAccountSync({...opts,fetchImpl}),account:{user:()=>({uid:owner,isAnonymous:anonymous}),tokenSession:async()=>({uid:owner,idToken:'token'})},FIREBASE_APP:{databaseURL:'https://example.invalid'},
  acquireExpansionSaveLease:(act,id)=>acquireExpansionSaveLease(act,id,{locks:manager}),expansionCrystalTexture:{},expansionJourneyView:{setActive(){}},scene:{},stone:{},prepareExpansionEnvironment:prepare,prepareExpansionCover:async()=>{},
  mirrorSession:null,survivalSession:null,trainingSession:null,developerRun:false,labSafe:false,startRegion:'garden',region:'garden',maintenanceOn:false,gameplayPaused:()=>false,showSeasonPause(){},showMaintenance(){},showIntro(){c.mode='ready';},isAct2:r=>r==='stadium',isAct3:r=>r==='skyway',
  enemies:[],fallen:[],shots:[],enemyShots:[],effects:[],player:{position:new THREE.Vector3(),userData:{}},releaseEnemy(){},release(){},$,
  stage:0,mode:'ready',paused:false,hp:100,inventory:clone(run.inventory),rerollUsed:false,chosen:new Set(),mutated:new Set(),levels:new Map(),heldForms:new Map(),mutations:new Map(),cycle:0,
  bankedUpgrades:0,choicesTaken:0,choiceKills:0,kills:0,elapsed:0,runDashes:0,runDamageTaken:0,score:0,wardensDefeated:0,austinsDefeated:0,turretPotionDry:0,relics:normalizeRelics(),runBonuses:normalizeRunBonuses(),dashState:createDashState(),activeGauge:createActiveGauge(),
  normalizeRelics,levelsToSave,levelsFromSave,mutationsToSave,mutationsFromSave,normalizeInventory,startingInventory,addItem,normalizeRunBonuses,createDashState,createActiveGauge,
  touch:{enabled:false,reset(){}},appShell:{enterFullscreen(){}},perfBegin(){},perfFinish(){},playableAct3Region:r=>r,playableRegion:r=>r,location:{},actStore:()=>storage,clearCheckpoint:()=>stats.clear++,claimCarry:()=>{stats.carry++;return {tonic:1};},runStorage:storage,
  webTelemetry:{playStart:a=>stats.telemetry.push(a)},profile:{forms:[]},promptedForms:new Set(),clearEscorts(){},vfx:{clear(){}},wells:[],orbitGroup:{},syncLaws(){},pulls:[],orbitHits:new Map(),growth:{reset(){},select(){},update(){}},playerMotion:{reset(){}},updateFormLabel(){},maxPlayerHp:()=>100,
  document:{querySelectorAll:()=>[]},keys:new Set(),lastMove:new THREE.Vector3(),emptyInventory,emptyRelics:()=>normalizeRelics(),restoredScore:r=>r.score||0,restoredWardens:r=>r.wardens||0,restoredAustins:r=>r.austins||0,clearRunes(){},audio:{setPaused(){},play(){}},finaleEchoes:[],promptedSolo:new Set(),promptedAwaken:new Set(),promptedSecond:new Set(),canFuse:()=>false,bankAndFuse(){},FORMS:{returnblade:{}},syncForms(){},effectiveLaws:()=>new Set(),itemCounts:()=>'',nextJourney:()=>{throw Error('unexpected garden route');},
  wave(){if(c.expansionJourney)c.captureExpansionEntry();else stats.gardenWaves++;},
  pauseBuild:{hide(){},show(){},setSaveStatus(){}},perf:{event(){}},PE:{enemyDeath:1},activeVfx:{clear(){}},cancelActive(){},gate:{visible:false},keyboardDash:false,invuln:0,shellTime:0,burst(){},difficulty:()=>({damage:1}),tryRevive:()=>null,finishRoomAnalysis:()=>null,showEnd:()=>{throw Error('public death must not use act1 ranking');},
 });
 vm.runInContext(helpers,c);vm.runInContext(restart,c);const actual=c.restart;c.restart=(...a)=>{stats.restarts++;return actual(...a);};vm.runInContext(launched,c);vm.runInContext(source.slice(source.indexOf('function hitPlayer('),source.indexOf('\nlet cameraShake=',source.indexOf('function hitPlayer('))),c);vm.runInContext(source.slice(source.indexOf('function showExpansionResult('),source.indexOf('\nfunction exitExpansionJourney(')),c);
 const ownerFacts=()=>({currentOwner:owner,inspection:false,practice:false,acts:acts.EXPANSION_ACTS});
 const getStore=(act,lease=null)=>createExpansionAccountSaveStore(storage,act,'owner-A',{context:ownerFacts,lease});
 async function seed(act,{id='accepted',hp=100,ended=false}={}){const lease=await acquireExpansionSaveLease(act,'owner-A',{locks:manager});assert(lease.ok);const store=getStore(act,lease),first=store.write(createExpansionAccountEntry(rules.createExpansionJourney(act),{...run,hp},[0,0,5],{owner:'owner-A',currentOwner:owner,acts:released.EXPANSION_ACTS,id}),{fresh:true});assert(first.ok);const result=ended?store.finish(first.value):first;await lease.release();return result.value;}
 return {c,data,storage,stats,$,manager,getStore,seed,setOwner:v=>owner=v,setAnonymous:v=>anonymous=v,setRemote:v=>{remote=clone(v);etag++;},remote:()=>remote,onGet:h=>getHook=h,offline:v=>fetchFail=v};
}
// Main's newly connected result text distinguishes local five-circuit wins
// from legacy three-circuit speed and does not claim five-win cloud merging.
{const c=vm.createContext({survivalClock:n=>String(n)});vm.runInContext(source.slice(source.indexOf('function survivalClearRecordLabel('),source.indexOf('const packSurvivalActor=')),c);const r={wins:7,fastestClear:600,fiveWins:1,fastestFiveClear:960};assert.equal(c.survivalClearRecordLabel(r,true),'다섯 막 완주 1회 · 최단 다섯 막 완주 960');assert.equal(c.survivalClearRecordLabel(r),'세 막 완주 7회 · 최단 세 막 완주 600');assert.equal(c.survivalClearRecordLabel({wins:7,fastestClear:600},true),'다섯 막 완주 0회');assert.match(c.survivalLocalClearHistory(r),/이 기기 다섯 막/);}
const tick=()=>new Promise(r=>setImmediate(r));
// The original ordinary journey still clears its own entry and consumes its
// own carry exactly once; only the explicit expansion reset bypasses them.
{const f=fixture();f.c.restart();assert.equal(f.stats.clear,1);assert.equal(f.stats.carry,1);assert.deepEqual(f.stats.telemetry,[1]);assert.equal(f.stats.gardenWaves,1);assert.equal(f.c.inventory.tonic,startingInventory().tonic+1);}
// A real source launcher must stay dormant under original release gates, in
// inspection, anonymous sessions and unsupported Web Locks environments.
for(const act of ['crosswind','crystalGorge']){
 for(const options of [{acts:rules},{inspection:true},{manager:null}]){const f=fixture(options),bytes=JSON.stringify([...f.data]);assert.equal(await f.c.startPublicExpansionJourney(act),false);assert.equal(f.stats.restarts,0);assert.equal(JSON.stringify([...f.data]),bytes);assert.equal(f.stats.puts,0);}
 const f=fixture();f.setAnonymous(true);assert.equal(await f.c.startPublicExpansionJourney(act),false);assert.equal(f.stats.gets,0);
}
for(const act of ['crosswind','crystalGorge']){
 const f=fixture(),inspection=createExpansionSaveStore(f.storage,act,'owner-A');assert(inspection.write(createExpansionEntry(rules.createExpansionJourney(act),{...run,hp:1},[0,0,5]),{fresh:true}).ok);const inspectionBytes=f.storage.getItem(inspection.key);
 assert.equal(await f.c.startPublicExpansionJourney(act,{resume:true}),false,'inspection data is never promoted');assert.equal(f.stats.restarts,0);assert.equal(f.storage.getItem(inspection.key),inspectionBytes);
 assert.equal(await f.c.startPublicExpansionJourney(act),true);assert.equal(f.c.expansionChannel,'public');assert(f.c.ownsExpansionSaveLease());assert.equal(f.c.expansionSaveLease.key,expansionAccountSaveLockKey('owner-A',act));assert.notEqual(f.c.expansionSaveLease.key,expansionAccountSaveKey('owner-A',act));
 assert.equal(f.stats.clear,0);assert.equal(f.stats.carry,0);assert.deepEqual(f.stats.telemetry,[]);assert.equal(f.stats.gardenWaves,0);assert.equal(f.c.developerRun,false);assert.equal(f.getStore(act).read().entry.revision,1);
 assert.equal(f.storage.getItem(inspection.key),inspectionBytes);assert.equal(f.storage.getItem('seed-run-checkpoint-v1'),'original act1 bytes');assert.equal(f.storage.getItem('carry'),'original carry');
 await f.c.syncPublicExpansion();f.c.hp=60;f.c.score=9999;f.c.kills=999;f.c.inventory.tonic=0;assert(f.c.saveExpansionLeave());const accepted=f.getStore(act).read();assert.equal(accepted.entry.run.hp,60);assert.equal(accepted.entry.run.score,0);assert.equal(accepted.entry.run.kills,0);assert.equal(accepted.entry.run.inventory.tonic,0);
 const bytes=JSON.stringify([...f.data]);f.c.hp=NaN;assert.equal(f.c.captureExpansionEntry(),false);assert.equal(JSON.stringify([...f.data]),bytes);f.c.hp=60;f.storage.fail=true;assert.equal(f.c.saveExpansionLeave(),false);assert.equal(f.c.expansionPublicEntry.entry.revision,accepted.entry.revision);f.storage.fail=false;
 f.setOwner('owner-B');assert.equal(f.c.saveExpansionLeave(),false);assert.equal(f.c.finishExpansionEntry(),false);assert.equal(JSON.stringify([...f.data]),bytes);f.setOwner('owner-A');assert(f.c.finishExpansionEntry());assert.equal(f.getStore(act).read().entry.ended,true);await tick();await tick();assert(!f.manager.held.size,'terminal upload settles before releasing lease');const final=f.storage.getItem(expansionAccountSaveKey('owner-A',act));assert.equal(f.c.saveExpansionLeave(),false);assert.equal(f.storage.getItem(expansionAccountSaveKey('owner-A',act)),final);
 assert.equal(JSON.parse(f.remote().checkpoint).entry.ended,true);assert.equal(f.storage.getItem('seed-account-profile-v1'),'original account bytes');
}
// No silent discard of an existing public run; busy and unknown saves remain.
{const f=fixture();await f.seed('crosswind');const bytes=JSON.stringify([...f.data]);assert.equal(await f.c.startPublicExpansionJourney('crosswind'),false);assert.equal(f.stats.restarts,0);assert.equal(f.storage.getItem(expansionAccountSaveKey('owner-A','crosswind')),JSON.parse(bytes).find(([k])=>k===expansionAccountSaveKey('owner-A','crosswind'))[1]);}
{const f=fixture(),lease=await acquireExpansionSaveLease('crosswind','owner-A',{locks:f.manager});assert.equal(await f.c.startPublicExpansionJourney('crosswind'),false);assert.equal(f.stats.gets,0);await lease.release();}
{const f=fixture();f.storage.setItem(expansionAccountSaveKey('owner-A','crosswind'),'{future unknown');const bytes=JSON.stringify([...f.data]);assert.equal(await f.c.startPublicExpansionJourney('crosswind'),false);assert.equal(JSON.stringify([...f.data]),bytes);assert.equal(f.stats.puts,0);}
// Loading art cannot authorize using a checkpoint observed before the lease.
{let load;const f=fixture({prepare:()=>new Promise(r=>load=r)});await f.seed('crosswind');const pending=f.c.startPublicExpansionJourney('crosswind',{resume:true});for(let i=0;i<10&&!load;i++)await tick();const lease=await acquireExpansionSaveLease('crosswind','owner-A',{locks:f.manager}),store=f.getStore('crosswind',lease);assert(store.write(expansionAccountExitCheckpoint(store.read(),{hp:35,inventory:run.inventory})).ok);await lease.release();load();assert(await pending);assert.equal(f.c.hp,35);await f.c.releaseExpansionSaveLease();}
// A same-account clean remote checkpoint can be restored; no old act1 writes.
{const f=fixture(),entry=await f.seed('crystalGorge',{hp:42});f.storage.removeItem(expansionAccountSaveKey('owner-A','crystalGorge'));f.setRemote({version:1,ownerUid:'owner-A',act:'crystalGorge',revision:1,checkpoint:JSON.stringify(entry)});assert(await f.c.startPublicExpansionJourney('crystalGorge',{resume:true}));assert.equal(f.c.hp,42);assert.equal(f.stats.clear,0);assert.equal(f.stats.carry,0);await f.c.releaseExpansionSaveLease();}
// UID or route cancellation between GET and PUT must not write or install.
for(const cancel of ['owner','route','restart']){const f=fixture();await f.seed('crosswind');const saved=f.storage.getItem(expansionAccountSaveKey('owner-A','crosswind'));f.onGet(()=>{if(cancel==='owner')f.setOwner('owner-B');else if(cancel==='restart')f.c.restart();else f.c.expansionLaunch++;});assert.equal(await f.c.startPublicExpansionJourney('crosswind',{resume:true}),false);assert.equal(f.stats.puts,0);assert.equal(f.stats.restarts,cancel==='restart'?1:0);assert.equal(f.storage.getItem(expansionAccountSaveKey('owner-A','crosswind')),saved);assert.equal(f.manager.held.size,0);}
// An ended candidate is replaced only with a new run and its exact expected
// terminal revision under the lease; its inspector history remains separate.
{const f=fixture(),ended=await f.seed('crosswind',{ended:true});assert(await f.c.startPublicExpansionJourney('crosswind'));assert.notEqual(f.c.expansionEntry.id,ended.entry.id);assert.equal(f.c.expansionEntry.revision,1);await f.c.syncPublicExpansion();await f.c.releaseExpansionSaveLease();}
// Offline resume retains accepted entry; offline fresh cannot supersede a
// server timeline or erase an unacknowledged death tombstone.
{const f=fixture();await f.seed('crosswind');f.offline(true);assert(await f.c.startPublicExpansionJourney('crosswind',{resume:true}));await f.c.releaseExpansionSaveLease();}
for(const ended of [false,true]){const f=fixture();if(ended)await f.seed('crosswind',{ended:true});f.offline(true);const bytes=JSON.stringify([...f.data]);assert.equal(await f.c.startPublicExpansionJourney('crosswind'),false);assert.equal(JSON.stringify([...f.data]),bytes);}
// Actual death route terminates the candidate store without deleting act1 or
// invoking its score/ranking report. Finish UI stays visible after lease loss.
{const f=fixture();assert(await f.c.startPublicExpansionJourney('crystalGorge'));await f.c.syncPublicExpansion();f.c.invuln=0;f.c.hitPlayer(1000);assert.equal(f.c.mode,'ready');assert.equal(f.stats.clear,0);assert(f.getStore('crystalGorge').read().entry.ended);assert.match(f.$('#overlay').innerHTML,/보상·랭킹 연결은 아직 준비 중/);await tick();await tick();assert.equal(f.manager.held.size,0);}
console.log('Public 4/5 main source launcher + real restart/save/finish with canonical store/sync passed: gated/UID/channel/lease/CAS/unknown/attrition/terminal/cancel and old account/carry preservation. Web Locks and Firebase ETags mocked; no live-account/device claim.');

export {fixture,released,run,source};
