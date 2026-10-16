import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import * as THREE from 'three';
import * as rules from '../src/arbor-journey.js';
import * as boss from '../src/arbor-boss.js';
import * as save from '../src/arbor-run-save.js';
import * as ordinary from '../src/run-save.js';
import {acquireExpansionSaveLease} from '../src/expansion-save-lease.js';
import {createWarden,tickWarden,SEAL,DUO_WARDEN} from '../src/warden.js';
import {createShield} from '../src/shield.js';
import {disposeObject} from '../src/resources.js';
import {journeyRunId} from '../src/journey-run-id.js';
import {createDashState,DASH_EVOLUTIONS} from '../src/dash-evolution.js';
import {createActiveGauge} from '../src/actives.js';
import {normalizeRunBonuses} from '../src/run-bonuses.js';
import {normalizeRelics} from '../src/relics.js';
import {mutationsToSave,mutationsFromSave} from '../src/mutations.js';
import {levelsFromSave,levelsToSave} from '../src/progression.js';
import {ITEMS,addItem,startingInventory,normalizeInventory,tryRevive} from '../src/inventory.js';
import {LAWS} from '../src/laws.js';
import {segmentHitsCover} from '../src/collision.js';
import {canUseExit} from '../src/journey.js';
import {escortWave,escortTypes} from '../src/boss-escorts.js';
import {safeArenaSpawn} from '../src/arena.js';

// Execute shipped function bodies against real rules/save/Three objects.
// DOM, asset loading, audio and renderer are bounded test adapters, not a browser.
const source=fs.readFileSync('src/main.js','utf8').replaceAll('\r\n','\n');
const noop=()=>{},clone=v=>JSON.parse(JSON.stringify(v));
function actual(name,next=null){
 const token=source.includes(`async function ${name}(`)?`async function ${name}(`:`function ${name}(`;
 const start=source.indexOf(token);assert.ok(start>=0,name);
 if(next){const end=source.indexOf(next,start);assert.ok(end>start);return source.slice(start,end).replaceAll('import.meta.env.BASE_URL',"'/'");}
 const lineEnd=source.indexOf('\n',start),first=source.slice(start,lineEnd);
 if(first.endsWith('}'))return first.replaceAll('import.meta.env.BASE_URL',"'/'");
 const end=source.indexOf('\n}',start);assert.ok(end>start);return source.slice(start,end+2).replaceAll('import.meta.env.BASE_URL',"'/'");
}
function node(){return {textContent:'',innerHTML:'',hidden:false,disabled:false,onclick:null,dataset:{},style:{setProperty:noop},classList:{add:noop,remove:noop,toggle:noop,contains:()=>false},focus:noop,insertAdjacentHTML:noop,querySelector:()=>node(),querySelectorAll:()=>[]};}
function manager(){const held=new Set();return {held,request(key,options,callback){const yes=!held.has(key);if(yes)held.add(key);return Promise.resolve().then(()=>callback(yes?{name:key}:null)).finally(()=>{if(yes)held.delete(key);});}};}
const normalRun={version:1,cycle:2,stage:1,region:'garden',mode:'entry',hp:77,rules:['reflect'],mutated:[],kills:60,elapsed:55,inventory:{tonic:1}};
function fixture(){
 const data=new Map([[ordinary.SAVE_KEY,JSON.stringify(normalRun)],['seed-profile-sentinel','unaltered'],['seed-ranking-sentinel','unaltered']]),normalBytes=JSON.stringify([...data]),dom=new Map(),locks=manager(),sounds=[],pulses=[];
 let uid='normal-owner',storageFail=false,receiptOK=true,writes=0,normalWrites=0;
 const storage={getItem:key=>data.get(key)??null,setItem(key,value){if(storageFail)throw Error('quota');writes++;if(key===ordinary.SAVE_KEY)normalWrites++;data.set(key,value);}};
 const $=id=>{if(!dom.has(id))dom.set(id,node());return dom.get(id);};
 const stageNodes=Array.from({length:5},node),document={querySelectorAll:selector=>selector==='#stages span'?stageNodes:[],body:{classList:{add:noop,remove:noop}}};
 const scene=new THREE.Scene(),mats={amber:new THREE.MeshBasicMaterial({color:0xffcc55})},shared=new Set(Object.values(mats));
 const view={hide:noop,setActive:noop,setBossArt:noop,clearBossArt:noop};
 const c=vm.createContext({console,Math,Date,Set,Map,Object,Promise,URLSearchParams,THREE,V:THREE.Vector3,location:{search:''},document,$,scene,mats,camera:new THREE.PerspectiveCamera(),
  __rules:rules,__boss:boss,__save:save,__view:{createArborJourneyView:()=>view},__errors:[],
  account:{user:()=>({uid})},arborOwner:()=>`${c.localInspection?'inspection:':''}${uid}`,acquireExpansionSaveLease:(act,owner)=>acquireExpansionSaveLease(act,owner,{locks}),
  rawStorage:storage,runStorage:storage,arborJourney:null,arborApi:null,arborBossApi:null,arborSaveApi:null,arborView:null,arborEntry:null,arborStore:null,arborLease:null,arborBoss:null,arborLaunch:0,
  arborContext:{},arborBossContext:{},localInspection:false,developerRun:false,maintenanceOn:false,mobileDevice:false,qualityLevel:1,mode:'ready',paused:false,
  bossRecordReady:()=>true,gameplayPaused:()=>false,protectJourneyBossReceipts:()=>receiptOK,
  expansionJourney:null,expansionTerrain:null,expansionJourneyView:null,expansionSiegeView:null,expansionChannel:'inspection',expansionPublicEntry:null,expansionPendingBossCheckpoint:null,
  mirrorSession:null,survivalSession:null,trainingSession:null,arborStore:null,arborEntry:null,arborLease:null,
  player:new THREE.Group(),arenaGroup:new THREE.Group(),roomCover:new THREE.Group(),trapGroup:new THREE.Group(),hiddenGarden:[],gate:new THREE.Group(),obstacles:[],traps:[],
  stadium:{setActive:noop},skyway:{setActive:noop},mirrorPanels:{setActive:noop},survivalArt:null,journeyRoomView:{hide:noop},
  touch:{enabled:false,reset:noop},keys:new Set(),pauseBuild:{show:noop,hide:noop,setSaveStatus:s=>{c.lastSaveStatus=s;}},audio:{play:id=>sounds.push(id),setScene:noop,setPaused:noop},
  vfx:{clear:noop,pulse:(position,color,radius,life)=>pulses.push({position:position.clone(),color,radius,life}),burst:noop,impact:noop,evolution:noop},
  activeVfx:{clear:noop},growth:{reset:noop,select:noop,update:noop},playerMotion:{reset:noop},combatAnalysis:{begin:noop,cancel:noop,damage:noop,kill:noop,utility:noop},
  heldForms:new Map(),levels:new Map(),chosen:new Set(),mutated:new Set(),mutations:new Map(),promptedForms:new Set(),promptedSolo:new Set(),promptedAwaken:new Set(),promptedSecond:new Set(),
  enemies:[],fallen:[],shots:[],enemyShots:[],effects:[],wells:[],pulls:[],orbitHits:new Map(),finaleEchoes:[],orbitGroup:new THREE.Group(),lastMove:new THREE.Vector3(0,0,1),
  profile:{forms:[]},guideTarget:null,rerollUsed:false,inventory:startingInventory(),relics:normalizeRelics(),runBonuses:normalizeRunBonuses(),dashState:createDashState(),activeGauge:createActiveGauge(),
  runReflection:{reset:noop,hit:noop},webTelemetry:{playPause:noop,playStart:()=>{throw Error('Act 1 telemetry from Act 6');}},
  currentJourneyRunId:'before-run',currentJourneyOwner:uid,pendingJourneyBossTitles:[],maxPlayerHp:()=>100,
  playableRegion:x=>x,playableAct3Region:x=>x,journeyRunId,levelsFromSave,levelsToSave,createDashState,createActiveGauge,normalizeRunBonuses,normalizeRelics,normalizeInventory,startingInventory,mutationsToSave,mutationsFromSave,
  restoredScore:ordinary.restoredScore,restoredWardens:ordinary.restoredWardens,restoredAustins:ordinary.restoredAustins,
  createWarden,tickWarden,createShield,SEAL,DUO_WARDEN,DASH_EVOLUTIONS,ITEMS,LAWS,addItem,tryRevive,escortWave,escortTypes,safeArenaSpawn,pendingEscorts:[],
  withDepartureSupplies:(store,callback)=>({ok:callback({tonic:2,wind:1})===true}),
  clearForms:noop,cancelActive:noop,perfFinish:noop,dashEvolutionCards:()=>'',formatScore:n=>String(n),formatTime:n=>String(n),showIntro:()=>{c.mode='ready';},showJourneys:noop,
  attachActorArt:noop,attachBossActionRig:noop,createMotion:()=>({update:noop}),rng:()=>.43,levelPressure:()=>1,effectiveLaws:()=>[],
  release:object=>disposeObject(object,shared),releaseEnemy:e=>disposeObject(e.g,shared),collide:noop,
  setText:(element,value)=>{element.textContent=value;},musicSceneFor:()=>'',crowdTotal:()=>0,isAct2:()=>false,isAct3:()=>false,isAct2Minion:()=>false,isAct3Minion:()=>false,isRelayPart:()=>false,
  createJourneySignature:()=>null,journeySignatureView:{hide:noop},finishRoomAnalysis:()=>null,burst:noop,bossCharge:()=>0,chargeActive:noop,killCharge:()=>0,
  perf:{event:noop},PE:{enemyDeath:1,shot:2},isBoss:e=>e.type==='warden'||e.arborBoss,
  difficulty:ordinary.difficulty,canUseExit,enemyBounces:n=>n,enemyBolt:position=>{const g=new THREE.Object3D();g.position.copy(position);return g;},
  clockFloor:null,survivalExpansion:null,journeySignature:null,journeySiegeSkirmish:null,journeyRoomLayoutState:null,cardChoiceOwner:null,
  ring:(parent,r,color)=>{const m=new THREE.Mesh(new THREE.RingGeometry(.9,1,8),new THREE.MeshBasicMaterial());parent.add(m);return m;},
  enemyGeos:{tellHound:new THREE.PlaneGeometry(1,1),tellCaster:new THREE.RingGeometry(1,1.2,8)},mesh:(geo,mat,parent,x=0,y=0,z=0)=>{const m=new THREE.Mesh(geo,mat);m.position.set(x,y,z);parent.add(m);return m;},
  frameWaveCalls:0,normalWrites:()=>normalWrites,
 });
 for(const key of ['hp','cycle','stage','score','elapsed','kills','choicesTaken','choiceKills','bankedUpgrades','wardensDefeated','austinsDefeated','runDashes','runDamageTaken','turretPotionDry','hasteTime','shellTime','potionCD','invuln','shootCD','playerSlow','dashLock','cameraShake','skywayAdvance','crowdTimer','crowdIndex','trapClock','orbitHitCD','baseSlideTime','baseSlideCooldown','escortWaves','roomStartKills'])c[key]=0;
 c.hp=100;c.region='garden';c.startRegion='garden';c.austinRoom=false;c.roomCleared=false;c.exitOpen=false;c.crowdLeft=0;c.bossDefeated=false;c.relicRewardPending=false;c.dashRewardPending=false;c.selectedItem=null;c.runBonusOffer=[];
 for(const key of ['syncLaws','syncForms','clearEscorts','clearRunes','updateFormLabel','perfBegin','clearCheckpoint','settleJourneyBossTitles','updateJourneySignature','perfMark'])c[key]=noop;
 c.syncLaws=()=>{c.chosen.clear();for(const key of c.levels.keys())c.chosen.add(key);};
 c.copiedEvolution=()=>null;c.player.userData={stepShot:noop,resetShot:noop,halo:{rotation:{z:0}}};c.orbitGroup.visible=false;
 c.enemyVector=new THREE.Vector3();c.previousEnemy=new THREE.Vector3();c.LS={frostFactor:.7};c.PS={orbit:0,enemyAI:1,spawn:2};
 for(const name of ['canSaveArbor','arborSnapshot','captureArborBoundary','saveArborLeave','drawArborRoom','syncArborRoots','arborEncounterText','waveArborJourney','spawnArborActor','updateArborJourney','tickArborBoss','settleArborActor','openArborExit','exitArborJourney','showArborResult','expansionRunSnapshot','enemy','swarm','spawnWardenAt','bossBolt','stadiumBolt','offerDashEvolution','damageEnemy','enemyDown','hitPlayer','inAustinRoom','clearEscorts','updateEscorts'])vm.runInContext(actual(name),c,{filename:`actual-main-${name}`});
 const launcher=actual('startArborJourney').replace("import('./arbor-journey.js')",'Promise.resolve(__rules)').replace("import('./arbor-boss.js')",'Promise.resolve(__boss)').replace("import('./arbor-run-save.js')",'Promise.resolve(__save)').replace("import('./arbor-journey-view.js')",'Promise.resolve(__view)').replace('}catch(error){','}catch(error){__errors.push(error);');vm.runInContext(launcher,c);
 vm.runInContext(actual('drawRoom'),c);vm.runInContext(actual('wave'),c);
 vm.runInContext(actual('restart','\nfunction togglePause('),c);
 const rawUpdate=actual('update','\n// 판 시간');vm.runInContext(rawUpdate,c);
 c.togglePause=()=>{c.paused=!c.paused;};
 const crowd=source.slice(source.indexOf('crowdTimer-=dt;'),source.indexOf('perfMark(PS.spawn);',source.indexOf('crowdTimer-=dt;')));vm.runInContext(`function __crowdStep(dt){${crowd}}`,c);
 const enemyLine=source.split('\n').find(line=>line.includes('const enemyDifficulty=difficulty(cycle,region);for(let e of enemies)'));
 vm.runInContext(`function __enemyStep(dt,time){${enemyLine}}`,c);
 vm.runInContext(actual('useExit'),c);
 return {c,data,dom,$,locks,storage,normalBytes,sounds,pulses,setOwner:value=>{uid=value;},setFail:value=>{storageFail=value;},setReceipt:value=>{receiptOK=value;},writes:()=>writes,
  async cleanup(){if(c.arborLease)await c.arborLease.release();},normalUnchanged(){assert.equal(data.get(ordinary.SAVE_KEY),JSON.stringify(normalRun));assert.equal(data.get('seed-profile-sentinel'),'unaltered');assert.equal(data.get('seed-ranking-sentinel'),'unaltered');assert.equal(normalWrites,0);}};
}
const tests=[];const test=(name,body)=>tests.push({name,body});
function defeat(f,actor){const before=f.c.kills;f.c.damageEnemy(actor,actor.hp+1,false);assert.equal(actor.dead,true);assert.equal(f.c.kills,before+1);}
function tick(f){f.c.elapsed+=.1;f.c.updateArborJourney(.1);f.c.enemies=f.c.enemies.filter(e=>!e.dead);}
function clearSector(f){
 for(let frame=0;frame<2000&&f.c.arborJourney.phase!=='cleared';frame++){
  tick(f);for(const actor of [...f.c.enemies])defeat(f,actor);f.c.enemies=f.c.enemies.filter(e=>!e.dead);
 }
 assert.equal(f.c.arborJourney.phase,'cleared');
 f.c.openArborExit();if(f.c.mode==='dash-evolution')f.$('#keep-dash').onclick();
}
test('actual launcher + restart + wave capture a normal-owner Act 6 boundary without Act 1 writes',async()=>{
 const f=fixture();assert.equal(await f.c.startArborJourney(),true,f.c.__errors.map(e=>e.stack).join('\n'));assert.equal(f.c.mode,'playing');assert.ok(f.c.arborEntry);assert.equal(f.c.arborEntry.owner,'normal-owner');assert.equal(f.c.arborEntry.run.stage,0);assert.equal(f.c.arborEntry.run.inventory.tonic,2);assert.equal(f.c.arena.shape,'rect');
 assert.equal(save.validArborEntry(f.c.arborEntry),true);tick(f);assert.equal(f.c.enemies.length,2);assert.ok(f.c.enemies.every(e=>e.arborId));f.normalUnchanged();await f.cleanup();
});
test('actual death receipts clear one sector, save its reward and preserve exit on a failed advance',async()=>{
 const f=fixture();assert.ok(await f.c.startArborJourney());clearSector(f);assert.equal(f.c.arborJourney.wardens,1);assert.equal(f.c.arborEntry.world.phase,'cleared');assert.equal(f.c.exitOpen,true);
 const before=f.c.arborEntry.revision;f.setFail(true);f.c.exitArborJourney();assert.equal(f.c.arborJourney.sector,0);assert.equal(f.c.arborEntry.revision,before);assert.equal(f.c.exitOpen,true);
 f.setFail(false);f.c.player.position.set(13,0,11);f.c.useExit();assert.equal(f.c.arborJourney.sector,0,'remote exit press does not teleport');f.c.player.position.set(f.c.arena.exit.x,0,f.c.arena.exit.z);f.c.useExit();assert.equal(f.c.arborJourney.sector,1);assert.equal(f.c.arborJourney.phase,'skirmish');assert.equal(f.c.arborEntry.world.sector,1);assert.equal(f.c.stage,1);assert.equal(f.c.arborEntry.revision,before+1,'advance saves once, wave does not duplicate it');f.normalUnchanged();await f.cleanup();
});
test('clear-boundary write failure stays paused and opens after an explicit retry',async()=>{
 const f=fixture();assert.ok(await f.c.startArborJourney());
 for(let i=0;i<2000&&f.c.arborJourney.phase!=='cleared';i++){tick(f);for(const a of [...f.c.enemies])defeat(f,a);f.c.enemies=f.c.enemies.filter(a=>!a.dead);}
 f.c.dashRewardPending=false;f.setFail(true);f.c.openArborExit();assert.equal(f.c.paused,true);assert.equal(f.c.exitOpen,false);assert.equal(f.c.arborEntry.world.phase,'skirmish');
 f.setFail(false);f.c.paused=false;f.c.updateArborJourney(.1);assert.equal(f.c.exitOpen,true);assert.equal(f.c.arborEntry.world.phase,'cleared');f.normalUnchanged();await f.cleanup();
});
test('actual 15 wardens and 3 bosses finish, terminate the save and allow fresh result retry',async()=>{
 const f=fixture();assert.ok(await f.c.startArborJourney());let bossSpawns=0;
 for(let i=0;i<18000&&f.c.mode!=='ready';i++){
  tick(f);for(const a of [...f.c.enemies]){if(a.arborBoss){bossSpawns++;assert.equal(f.c.arborJourney.wardens,(f.c.arborJourney.round+1)*5);}defeat(f,a);}f.c.enemies=f.c.enemies.filter(a=>!a.dead);
  if(f.c.arborJourney.phase==='cleared'||f.c.arborJourney.phase==='complete'){
   f.c.openArborExit();if(f.c.mode==='dash-evolution')f.$('#keep-dash').onclick();if(f.c.exitOpen)f.c.exitArborJourney();
  }
 }
 assert.equal(f.c.arborJourney.wardens,15);assert.equal(f.c.arborJourney.bossWins,3);assert.equal(bossSpawns,3);assert.equal(f.c.mode,'ready');assert.equal(f.c.arborStore.read(),null);assert.equal(f.c.arborLease,null);
 await new Promise(resolve=>setImmediate(resolve));assert.equal(await f.c.startArborJourney(),true);assert.equal(f.c.arborJourney.wardens,0);f.normalUnchanged();await f.cleanup();
});
test('actual player death ends only the Act 6 entry and result retry starts a new run',async()=>{
 const f=fixture();assert.ok(await f.c.startArborJourney());f.c.invuln=0;f.c.shellTime=0;f.c.hitPlayer(1000,'test');assert.equal(f.c.mode,'ready');assert.equal(f.c.arborStore.read(),null);await new Promise(resolve=>setImmediate(resolve));assert.ok(await f.c.startArborJourney());f.normalUnchanged();await f.cleanup();
});
test('same saved entry can resume repeatedly and failed setup releases its freshly acquired lease',async()=>{
 const f=fixture();assert.ok(await f.c.startArborJourney());assert.ok(f.c.saveArborLeave());await f.cleanup();f.c.arborJourney=null;f.c.arborLease=null;f.c.mode='ready';
 assert.ok(await f.c.startArborJourney({resume:true}));assert.ok(f.c.saveArborLeave());await f.cleanup();f.c.arborJourney=null;f.c.arborLease=null;f.c.mode='ready';
 assert.ok(await f.c.startArborJourney({resume:true}));f.normalUnchanged();await f.cleanup();
 const failed=fixture();failed.c.restart=()=>{throw Error('failed renderer setup');};assert.equal(await failed.c.startArborJourney(),false);
 const lease=await acquireExpansionSaveLease('arbor','normal-owner',{locks:failed.locks});assert.equal(lease.active(),true);await lease.release();failed.normalUnchanged();
});
test('actual first update ownership guard stops before animation, input, AI or save work',async()=>{
 const f=fixture();assert.ok(await f.c.startArborJourney());const point=f.c.player.position.clone(),bytes=JSON.stringify([...f.data]),time=f.c.arborJourney.time;f.setOwner('another-owner');f.c.update(.1,1);assert.equal(f.c.paused,true);assert.deepEqual(f.c.player.position,point);assert.equal(f.c.arborJourney.time,time);assert.equal(JSON.stringify([...f.data]),bytes);assert.equal(f.c.saveArborLeave(),false);f.normalUnchanged();await f.cleanup();
});
test('actual legacy crowd branch stays off, caster/warden bolts cap at 48 and roots block them',async()=>{
 const f=fixture();assert.ok(await f.c.startArborJourney());let calls=0;f.c.spawnCrowd=()=>calls++;f.c.crowdTimer=0;f.c.__crowdStep(.1);assert.equal(calls,0);
 f.c.enemyShots=Array.from({length:47},()=>({}));for(let i=0;i<20;i++)f.c.bossBolt(new THREE.Vector3(),new THREE.Vector3(0,0,1),1);assert.equal(f.c.enemyShots.length,48);assert.equal(f.c.enemyShots[47].pierce,false);
 const root=f.c.arborJourney.roots[0];root.phase='active';root.active=true;f.c.syncArborRoots();assert.equal(f.c.obstacles[0],root);
 assert.equal(segmentHitsCover({x:root.x-4,z:root.z},{x:root.x+4,z:root.z},f.c.obstacles,.13),true);
 const e=f.c.enemy('caster',0,-5);e.state='tell';e.timer=0;f.c.enemies=[e];f.c.enemyShots=Array.from({length:47},()=>({}));f.c.__enemyStep(.1,1);assert.equal(f.c.enemyShots.length,48);assert.notEqual(f.c.enemyShots[47].pierce,true);f.normalUnchanged();await f.cleanup();
});
test('actual escort scheduler cannot add untracked allies to Act 6 or expansion guardians',async()=>{
 for(const scenario of ['arbor-boss','arbor-warden','crosswind-warden','crystal-warden']){
  const f=fixture();assert.ok(await f.c.startArborJourney());const s=f.c.arborJourney,before=JSON.stringify(rules.checkpointArborJourney(s));
  const e=createWarden(f.c.scene,f.c.mats);e.hp=e.maxHp*.25;f.c.enemies=[e];f.c.stage=4;
  if(scenario==='arbor-boss')e.arborBoss=true;
  if(scenario==='arbor-warden')e.arborId='actual-warden';
  if(scenario.startsWith('crosswind')||scenario.startsWith('crystal')){f.c.arborJourney=null;f.c.expansionJourney={act:scenario.startsWith('crosswind')?'crosswind':'crystalGorge',phase:'course'};e.expansionWarden=true;}
  const children=f.c.scene.children.length;for(let i=0;i<100;i++)f.c.updateEscorts(.1);
  assert.equal(f.c.enemies.length,1,scenario);assert.equal(f.c.pendingEscorts.length,0,scenario);assert.equal(f.c.escortWaves,0,scenario);assert.equal(f.c.scene.children.length,children,scenario);assert.equal(JSON.stringify(rules.checkpointArborJourney(s)),before,scenario);f.normalUnchanged();await f.cleanup();
 }
});
test('actual ordinary Act 1 escort waves still warn, spawn within four-live cap and retire on boss death',()=>{
 const f=fixture();f.c.arborJourney=null;f.c.expansionJourney=null;f.c.stage=4;f.c.cycle=0;f.c.arena=rules.ARBOR_ARENA;f.c.player.position.set(0,0,5);
 const e=createWarden(f.c.scene,f.c.mats);e.g.position.set(0,0,-5);f.c.enemies=[e];
 f.c.updateEscorts(.1);assert.equal(f.c.escortWaves,1);assert.equal(f.c.pendingEscorts.length,2);assert.equal(f.c.enemies.length,1,'one-second markers precede actual escorts');
 for(let i=0;i<11;i++)f.c.updateEscorts(.1);assert.equal(f.c.pendingEscorts.length,0);assert.equal(f.c.enemies.filter(a=>a.escort&&!a.dead).length,2);
 e.hp=e.maxHp*.65;for(let i=0;i<12;i++)f.c.updateEscorts(.1);assert.equal(f.c.escortWaves,2);assert.equal(f.c.enemies.filter(a=>a.escort&&!a.dead).length,4);
 e.hp=e.maxHp*.3;for(let i=0;i<50;i++)f.c.updateEscorts(.1);assert.equal(f.c.escortWaves,3);assert.equal(f.c.enemies.filter(a=>a.escort&&!a.dead).length,4);
 e.dead=true;f.c.updateEscorts(.1);assert.equal(f.c.pendingEscorts.length,0);assert.equal(f.c.enemies.filter(a=>a.escort&&!a.dead).length,0);f.normalUnchanged();
});
test('actual boss tick shows all three root warnings and recovery has one damage multiplier',async()=>{
 const f=fixture();assert.ok(await f.c.startArborJourney());const e=f.c.spawnArborActor({id:'test-boss',role:'boss',type:'warden',x:0,z:-4.4,hp:2800});let warned=0,hits=0;
 for(let i=0;i<3000&&hits<3;i++){
  f.c.player.position.set(Math.sin(i*.04)*7,0,4);const count=f.pulses.length;f.c.tickArborBoss(e,.02);
  for(const p of f.pulses.slice(count)){if(p.color==='amber')warned++;if(p.color==='burst')hits++;}
 }
 assert.equal(warned,3);assert.equal(hits,3);e.state='recover';e.takenScale=1.35;e.hp=1000;f.c.damageEnemy(e,100,false);assert.equal(e.hp,865);await f.cleanup();
});
test('actual reroll callback does not read or write the ordinary Act 1 checkpoint',async()=>{
 const f=fixture();assert.ok(await f.c.startArborJourney());
 f.c.runBonusOffer=[];f.c.awakenable=()=>false;
 Object.assign(f.c,{offerChoices:()=>['reflect'],withMutationOffer:x=>x,eligibleForms:()=>[],canTakeEvolution:()=>false,gardenFx:{lawWeights:{},freshBonus:0},gardenGuideLaw:()=>null,parseMutationChoice:()=>null,offeredFusion:()=>null,offeredForm:()=>null,slotsUsed:()=>0,SLOT_CAP:6,lawArt:()=>'',formArt:()=>'',lawStats:()=>({}),levelOf:(levels,id)=>levels.get(id)||0,synergyHint:()=>'',formLawHint:()=>'',rerollUnlocked:()=>true,FIRST_FORMS:{},DISCOVERY_FORMS:{},orbitCore:()=>null,secondFusionOptions:()=>[],soloReady:()=>[],awakenOptions:()=>[],FORMS:{},LAW_PRESENTATION:{},choiceGoal:()=>12,readCheckpoint:s=>ordinary.readCheckpoint(s),writeCheckpoint:(...args)=>ordinary.writeCheckpoint(...args),actStore:()=>f.storage});
 vm.runInContext(actual('cardChoice'),f.c);f.c.cardChoice(true);assert.equal(typeof f.$('#reroll-laws').onclick,'function');f.$('#reroll-laws').onclick();assert.equal(f.c.rerollUsed,true);f.normalUnchanged();await f.cleanup();
});
test('failed first boundary preserves unknown bytes, stops launch and releases ownership',async()=>{
 const f=fixture();f.data.set(save.arborSaveKey('normal-owner'),'unknown future entry');const bytes=JSON.stringify([...f.data]);assert.equal(await f.c.startArborJourney(),false);assert.equal(f.c.mode,'ready');assert.equal(JSON.stringify([...f.data]),bytes);assert.equal(f.c.arborJourney,null);const lease=await acquireExpansionSaveLease('arbor','normal-owner',{locks:f.locks});assert.equal(lease.active(),true);await lease.release();f.normalUnchanged();
});
for(const {name,body} of tests){await body();console.log(`PASS ${name}`);}
console.log(`arbor-main-host: ${tests.length} actual-source host checks passed (Node VM/Three/DOM and Web Locks mocks; no browser/device claim)`);
