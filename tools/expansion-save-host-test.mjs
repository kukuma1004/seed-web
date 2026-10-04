import * as inspectionPreview from '../src/expansion-boss-inspection.js';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import * as THREE from 'three';
import * as rules from '../src/expansion-journey.js';
import {createExpansionEntry,createExpansionSaveStore,expansionExitCheckpoint} from '../src/expansion-run-save.js';
import {acquireExpansionSaveLease} from '../src/expansion-save-lease.js';
const source=fs.readFileSync('src/main.js','utf8').replaceAll('\r\n','\n');
const start=source.indexOf('async function startExpansionJourney('),end=source.indexOf('\nfunction spawnExpansionActor(',start);
const launcher=source.slice(start,end).replace("import('./expansion-journey.js')",'Promise.resolve(__rules)').replace("import('./expansion-journey-view.js')",'Promise.resolve(__view)').replace("import('./expansion-boss-inspection.js')",'Promise.resolve(__preview)').replaceAll('import.meta.env.BASE_URL',"'/'");
const run={version:1,cycle:0,region:'garden',stage:0,mode:'entry',hp:100,kills:3,elapsed:15,rules:[],mutated:[],forms:{returnblade:5},inventory:{potion:3,tonic:2,wind:1,shell:1,sprout:1},score:300,choicesTaken:2,choiceKills:3};
function fixture({locks=null,prepare=()=>Promise.resolve()}={}){
 const data=new Map(),dom={textContent:''},storage={getItem:k=>data.get(k)||null,setItem:(k,v)=>data.set(k,v)};let owner='owner-A';
 const c=vm.createContext({__preview:inspectionPreview,__rules:rules,__view:{},localInspection:true,expansionLaunch:0,expansionApi:rules,expansionOwner:()=>owner,expansionSaveLease:null,rawStorage:storage,createExpansionSaveStore,createExpansionEntry,expansionExitCheckpoint,
  acquireExpansionSaveLease:(act,id)=>acquireExpansionSaveLease(act,id,{locks}),expansionCrystalTexture:{},expansionJourneyView:{},scene:{},stone:{},prepareExpansionEnvironment:prepare,prepareExpansionCover:()=>Promise.resolve(),
  expansionSaveOwner:null,expansionEntry:null,expansionJourney:null,expansionChannel:'inspection',expansionPublicEntry:null,expansionPublicSync:null,expansionFreshExpected:null,expansionPendingBossCheckpoint:null,mirrorSession:null,survivalSession:null,trainingSession:null,developerRun:false,labSafe:false,startRegion:null,
  restart:r=>{c.restarts++;c.restored=r;},restarts:0,enemies:[],fallen:[],player:{position:new THREE.Vector3()},releaseEnemy(){},wave(){},$:()=>dom,stage:0,mode:'ready',paused:false,hp:65,inventory:run.inventory,rerollUsed:false,
 });
 vm.runInContext(launcher,c);
 const helpers=source.slice(source.indexOf('function releaseExpansionSaveLease('),source.indexOf('function captureExpansionEntry('));vm.runInContext(helpers,c);
 vm.runInContext("const expansionStore=act=>createExpansionSaveStore(rawStorage,act,expansionSaveOwner||expansionOwner());",c);
 for(const name of ['saveExpansionLeave','finishExpansionEntry']){const a=source.indexOf('function '+name+'('),b=source.indexOf('\n}',a)+2;vm.runInContext(source.slice(a,b),c);}
 const store=createExpansionSaveStore(storage,'crosswind',owner),first=store.write(createExpansionEntry(rules.createExpansionJourney('crosswind'),run,[0,0,5]),{fresh:true});assert(first.ok);
 return {c,store,data,dom,setOwner:v=>owner=v};
}
function manager(){const held=new Set();return {request(key,options,callback){const yes=!held.has(key);if(yes)held.add(key);return Promise.resolve().then(()=>callback(yes?{name:key}:null)).finally(()=>{if(yes)held.delete(key);});}};}
// Unsupported or busy launch never restarts a game or writes the stored build.
{const f=fixture(),bytes=JSON.stringify([...f.data]);assert.equal(await f.c.startExpansionJourney(0,'crosswind',{resume:true}),false);assert.equal(f.c.restarts,0);assert.equal(JSON.stringify([...f.data]),bytes);}
{const locks=manager(),f=fixture({locks}),other=await acquireExpansionSaveLease('crosswind','owner-A',{locks}),bytes=JSON.stringify([...f.data]);assert.equal(await f.c.startExpansionJourney(0,'crosswind',{resume:true}),false);assert.equal(f.c.restarts,0);assert.equal(JSON.stringify([...f.data]),bytes);assert(other.active());await other.release();}
// Another tab saves attrition while scenery is loading. Resume must read the
// newer accepted revision only after acquiring exclusive ownership.
{let continueLoad;const f=fixture({locks:manager(),prepare:()=>new Promise(r=>continueLoad=r)}),launch=f.c.startExpansionJourney(0,'crosswind',{resume:true});
 for(let n=0;n<10&&!continueLoad;n++)await new Promise(r=>setImmediate(r));assert(continueLoad);
 assert(f.store.write(expansionExitCheckpoint(f.store.read(),{hp:40,inventory:run.inventory})).ok);continueLoad();assert.equal(await launch,true);assert.equal(f.c.restored.hp,40);assert.equal(f.c.expansionEntry.revision,2);
 assert(f.c.ownsExpansionSaveLease());assert(f.c.saveExpansionLeave());assert.equal(f.store.read().run.hp,40,'exit cannot heal the accepted room entry');
 f.setOwner('owner-B');assert.equal(f.c.saveExpansionLeave(),false);assert.equal(f.c.finishExpansionEntry(),false);f.setOwner('owner-A');
 await f.c.releaseExpansionSaveLease();const bytes=JSON.stringify([...f.data]);assert.equal(f.c.saveExpansionLeave(),false);assert.equal(f.c.finishExpansionEntry(),false);assert.equal(JSON.stringify([...f.data]),bytes,'released execution cannot modify the next tab\'s save');
}
// Account changes during lock acquisition release the grant and do not launch.
{const locks=manager(),f=fixture({locks});const acquire=f.c.acquireExpansionSaveLease;f.c.acquireExpansionSaveLease=async(...a)=>{const lease=await acquire(...a);f.setOwner('owner-B');return lease;};assert.equal(await f.c.startExpansionJourney(),false);assert.equal(f.c.restarts,0);const next=await acquireExpansionSaveLease('crosswind','owner-A',{locks});assert(next.active());await next.release();}
// Finishing a real accepted checkpoint closes it and releases run ownership.
{const f=fixture({locks:manager()});assert(await f.c.startExpansionJourney(0,'crosswind',{resume:true}));assert(f.c.finishExpansionEntry());assert.equal(f.store.read(),null);assert.equal(f.c.expansionSaveLease,null);assert.equal(f.c.expansionEntry,null);}
// A failed install must not strand a lease or invalidate the accepted save.
// A quota failure may leave a fresh run without an accepted entry. Its finish
// releases ownership without deleting the earlier run that was never replaced.
{const locks=manager(),f=fixture({locks}),bytes=JSON.stringify([...f.data]);assert(await f.c.startExpansionJourney());assert.equal(f.c.expansionEntry,null);assert(f.c.finishExpansionEntry());assert.equal(f.c.expansionSaveLease,null);assert.equal(JSON.stringify([...f.data]),bytes);await new Promise(r=>setImmediate(r));const next=await acquireExpansionSaveLease('crosswind','owner-A',{locks});assert(next.active());await next.release();}
for(const part of ['restart','wave']){const locks=manager(),f=fixture({locks}),bytes=JSON.stringify([...f.data]);f.c[part]=()=>{throw new Error('failed '+part);};assert.equal(await f.c.startExpansionJourney(0,'crosswind',{resume:true}),false);assert.equal(f.c.expansionSaveLease,null);assert.equal(f.c.expansionJourney,null);assert.equal(JSON.stringify([...f.data]),bytes);const next=await acquireExpansionSaveLease('crosswind','owner-A',{locks});assert(next.active());await next.release();}
console.log('Actual expansion launcher/exit/finish: fail-closed launch, read after exclusive grant, newer attrition, UID guard, released-writer rejection and finish release passed. Node VM/Web Locks mock; no browser/device claim.');

// A scripted boss scene must preserve an existing accepted room-entry save.
{const f=fixture({locks:manager()}),bytes=JSON.stringify([...f.data]);assert(await f.c.startExpansionJourney(0,'crosswind',{bossPreview:true}));assert.equal(f.c.expansionJourney.phase,'boss');assert.equal(f.c.expansionJourney.inspectionPreview,true);assert.equal(f.c.expansionEntry,null);assert.equal(f.c.canSaveExpansion(),false);assert.equal(f.c.saveExpansionLeave(),false);assert.equal(JSON.stringify([...f.data]),bytes);assert(f.c.finishExpansionEntry());assert.equal(JSON.stringify([...f.data]),bytes);}
for(const options of [{bossPreview:true,resume:true},{bossPreview:true,publicRun:true}]){const f=fixture({locks:manager()}),bytes=JSON.stringify([...f.data]);assert.equal(await f.c.startExpansionJourney(0,'crosswind',options),false);assert.equal(f.c.restarts,0);assert.equal(JSON.stringify([...f.data]),bytes);}
console.log('Actual local boss launcher preserves existing room save and excludes account/resume/finish writes.');
