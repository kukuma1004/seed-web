import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import vm from 'node:vm';
import * as THREE from 'three';
import {createSurvivalSession,survivalActCount,SURVIVAL} from '../src/survival-rules.js';
import {createSurvivalSaveStore,routeSurvivalSaveStore,captureSurvivalSession,captureCombatFields} from '../src/survival-save.js';
import {captureSurvivalObjectiveSnapshot} from '../src/survival-objective-save.js';
import {captureSurvivalSixSnapshot,validSurvivalSixSave} from '../src/survival-six-save.js';
import * as siege from '../src/survival-crystal-siege.js';

// Execute the shipping entry and snapshot functions. Only the dynamic module
// boundary and final native world mount are substituted; this is CPU/VM QA.
const source=readFileSync(new URL('../src/main.js',import.meta.url),'utf8');
const functionSource=name=>{const start=source.indexOf('function '+name+'('),end=source.indexOf('\nfunction ',start+10);assert(start>=0&&end>start,name);return source.slice(start,end);};
const entrySource=functionSource('startSurvival').replace("import('./survival-crystal-siege.js')","Promise.resolve(siegeModule)");
const memory=()=>{const data=new Map();return {data,getItem:k=>data.get(k)||null,setItem:(k,v)=>data.set(k,v)};};
const makeWorld=(session,id='retained-run')=>({id,revision:0,session,progress:{hp:61,kills:0,score:0,choicesTaken:1,choiceKills:0,bankedUpgrades:0,elapsed:0,levels:{return:2},forms:{},inventory:{tonic:2}},player:{position:[1,0,2],baseSlideTarget:[0,0,0],baseSlideDir:[0,0,0],lastMove:[0,0,0]},pending:null,enemies:[],hostiles:[]});
const MOUNT=Symbol('native-world-mount');let checks=0;
function setup({record=null,objective=true,inspection=false,viewsReady=true,storeData=memory()}={}){
 let owner='p1',mounts=0,readyCalls=0,preparations=0;const nodes=new Map();
 const node=id=>{if(!nodes.has(id))nodes.set(id,{textContent:'',hidden:false,classList:{add(){},remove(){}}});return nodes.get(id);};
 const saveContext={sixActs:true,objectives:objective,currentOwner:()=>owner,inspection:()=>inspection};
 if(record)storeData.setItem((record.version===2?'seed-survival-checkpoint-v2:':'seed-survival-checkpoint-v1:')+'p1',JSON.stringify(record));
 const ctx=vm.createContext({Promise,Date,Math,structuredClone,console,siegeModule:siege,
  survivalEntry:{valid:token=>token?.owner===owner},bossRecordReady:()=>{readyCalls++;return true;},localInspection:inspection,survivalOwner:()=>owner,
  account:{user:()=>({uid:owner,isAnonymous:false})},survivalStore:()=>routeSurvivalSaveStore(storeData,owner,saveContext).store,
  freshExpansionObjective:()=>objective?siege.SURVIVAL_OBJECTIVE:null,CRYSTAL_DEFENSE_OBJECTIVE:siege.SURVIVAL_OBJECTIVE,expansionObjectiveReleased:()=>true,
  survivalSiegeApi:viewsReady?siege:null,expansionSiegeView:viewsReady?{}:null,expansionJourneyView:viewsReady?{}:null,
  prepareExpansionAssets:async()=>{preparations++;ctx.expansionJourneyView={};},prepareCrystalSiegeView:async()=>{ctx.expansionSiegeView={};},prepareExpansionEnvironment:()=>{},prepareExpansionCover:()=>{},
  survivalStartBlocked:message=>{node('#toast').textContent=message;},releaseExpansionSaveLease:async()=>{},expansionLaunch:0,
  publicCircuitActCount:()=>6,survivalActCount,requireName:()=>true,retryStoredSurvivalTitles:()=>true,
  document:{body:{classList:{add(){},remove(){}}}},$:node,gameplayPaused:()=>false,maintenanceOn:false,showIntro(){throw Error('unexpected intro');},
  createSurvivalSession,SURVIVAL,SURVIVAL_BENCHES:{},createSurvivalBenchmark:()=>null,rawStorage:storeData,
  restart(){mounts++;throw MOUNT;}
 });
 vm.runInContext(entrySource,ctx);
 const run=async(lab=null,saved=null,token={owner})=>{try{await ctx.startSurvival(lab,saved,null,token);}catch(e){if(e!==MOUNT)throw e;}};
 return {ctx,run,storeData,saveContext,node,owner:()=>owner,setOwner:value=>{owner=value;},mounts:()=>mounts,readyCalls:()=>readyCalls,preparations:()=>preparations};
}
function legacyRecord(acts,{withObjective=false}={}){
 const data=memory(),session=createSurvivalSession(31,{actCount:acts,...(withObjective?{objective:siege.SURVIVAL_OBJECTIVE}:{})}),store=createSurvivalSaveStore(data,'p1',{objectives:withObjective});
 const base=makeWorld(session),snapshot=withObjective?captureSurvivalObjectiveSnapshot(base,{owner:'p1'}):base;assert(store.write(snapshot,{fresh:true}).ok);return store.read();
}
for(const record of [legacyRecord(3),legacyRecord(5),legacyRecord(5,{withObjective:true})]){
 for(const resume of [true,false]){
  const h=setup({record}),before=[...h.storeData.data];await h.run(null,resume?record:null);assert.equal(h.mounts(),1);
  assert.equal(survivalActCount(h.ctx.survivalSession),survivalActCount(record.session));assert.equal(h.ctx.survivalSession.objective,record.objective);
  assert.deepEqual([...h.storeData.data],before,'preflight never edits, promotes or ends a retained timeline');
  if(resume)assert.equal(h.ctx.survivalSaveToken.id,record.id);else assert.notEqual(h.ctx.survivalSaveToken.id,record.id,'explicit restart is a new run in the same old namespace');checks++;
 }
}
const fresh=setup({viewsReady:false});await fresh.run();assert.equal(fresh.mounts(),1);assert.equal(fresh.preparations(),1);assert.equal(fresh.ctx.survivalSession.actCount,6);assert.equal(fresh.ctx.survivalSession.objective,siege.SURVIVAL_OBJECTIVE);assert.match(fresh.ctx.survivalSaveToken.id,/^[A-Za-z0-9_-]{1,68}$/,'fallback run ID is accepted by the retained boss receipt bridge');checks++;
const localSiege=setup({inspection:true});await localSiege.run('siege');assert.equal(localSiege.mounts(),1);assert.equal(localSiege.ctx.survivalSession.actCount,5);assert.equal(localSiege.ctx.survivalSession.act,4);assert.equal(localSiege.ctx.survivalSession.siegeReview,true);assert(localSiege.ctx.survivalSiege);checks++;
for(const [lab,count]of [['act6',6],['six',6],['route6',6],['stress6',6],['act4',5],['act5',5],['five',5],['route',3],['boss',3]]){const h=setup({inspection:true});await h.run(lab);assert.equal(h.ctx.survivalSession.actCount||3,count);checks++;}
const stale=setup();stale.setOwner('other');await stale.run(null,null,{owner:'p1'});assert.equal(stale.mounts(),0);assert.equal(stale.readyCalls(),0);checks++;
const pending=setup({objective:false,viewsReady:false});let release;pending.ctx.prepareExpansionAssets=()=>new Promise(resolve=>{release=()=>{pending.ctx.expansionJourneyView={};resolve();};});const blocked=pending.run();await Promise.resolve();pending.setOwner('other');release();await blocked;assert.equal(pending.mounts(),0);assert.match(pending.node('#toast').textContent,/계정/);assert.equal(pending.storeData.data.size,0);checks++;

// Capture the shipping host's real six-act world shape and pass it through the
// real owner-scoped CAS store, rather than constructing another parallel save.
const c=fresh.ctx;
Object.assign(c,{captureSurvivalSession,captureCombatFields,captureSurvivalSixSnapshot,captureSurvivalObjectiveSnapshot,
 combatAnalysis:{snapshot:()=>null},survivalExpansion:null,survivalSiege:null,captureSurvivalSiegeThreats:()=>[],
 hp:61,kills:0,score:0,choicesTaken:1,choiceKills:0,bankedUpgrades:0,elapsed:0,runDashes:0,runDamageTaken:0,
 levels:new Map([['return',2]]),heldForms:new Map(),inventory:{tonic:2},mutations:new Map(),mutationsToSave:()=>[],runBonuses:{},rerollUsed:false,
 hasteTime:0,shellTime:0,potionCD:0,selectedItem:'tonic',dashState:{id:null,charges:0,recharge:0},dashLock:0,activeGauge:{value:0,cooldown:0,plan:null},ACTIVE:{cooldownSeconds:0},shootCD:0,playerSlow:0,invuln:0,
 player:{position:new THREE.Vector3(1,0,2)},baseSlideTime:0,baseSlideCooldown:0,baseSlideLock:-1,baseSlideTarget:new THREE.Vector3(),baseSlideDir:new THREE.Vector3(),lastMove:new THREE.Vector3(),survivalPendingChoice:null,enemies:[],enemyShots:[],mode:'playing'});
const packStart=source.indexOf('const packSurvivalActor=');assert(packStart>=0);vm.runInContext(source.slice(packStart,source.indexOf('\n',packStart))+'\n'+functionSource('captureSurvivalSnapshot'),c);const snapshot=c.captureSurvivalSnapshot();assert.equal(snapshot.version,3);assert.equal(snapshot.owner,'p1');assert.equal(snapshot.circuit,'arbor-six-v1');
const written=routeSurvivalSaveStore(fresh.storeData,'p1',fresh.saveContext).store.write(snapshot,{fresh:true});assert(written.ok);assert(validSurvivalSixSave(written.value));assert.equal(written.value.progress.hp,61);assert.equal(written.value.progress.levels.return,2);assert.equal(written.value.progress.inventory.tonic,2);assert.deepEqual(written.value.player.position,[1,0,2]);assert(fresh.storeData.getItem('seed-survival-checkpoint-v3:p1'));assert.equal(fresh.storeData.getItem('seed-survival-checkpoint-v1:p1'),null);assert.equal(fresh.storeData.getItem('seed-survival-checkpoint-v2:p1'),null);checks++;
console.log(JSON.stringify({pass:true,checks,scope:'Actual shipping startSurvival preflight and captureSurvivalSnapshot in VM; native mount and dynamic chunk boundary substituted; no browser, real account or device claim'}));
