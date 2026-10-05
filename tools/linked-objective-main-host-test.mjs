import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import vm from 'node:vm';
import * as THREE from 'three';
import * as survival from '../src/survival-rules.js';
import * as siege from '../src/survival-crystal-siege.js';
import {createSurvivalExpansion} from '../src/survival-expansion.js';
import {captureCombatFields,restoreCombatFields,captureSurvivalSession,createSurvivalSaveStore,validSurvivalSave,SURVIVAL_SAVE_KEY,survivalTitleEvents,queueSurvivalTitle,SURVIVAL_TITLE_LIMIT} from '../src/survival-save.js';
import {captureSurvivalObjectiveSnapshot,validSurvivalObjectiveSave,survivalObjectiveParent} from '../src/survival-objective-save.js';
import {CRYSTAL_DEFENSE_OBJECTIVE as objective} from '../src/expansion-objective.js';
import {normalizeInventory,addItem} from '../src/inventory.js';
import {normalizeRunBonuses} from '../src/run-bonuses.js';
import {mutationsToSave,mutationsFromSave} from '../src/mutations.js';
import {createDashState} from '../src/dash-evolution.js';
import {createActiveGauge,cancelActive,ACTIVE} from '../src/actives.js';
const main=readFileSync(new URL('../src/main.js',import.meta.url),'utf8');
const clone=x=>JSON.parse(JSON.stringify(x));
const terminal={version:1,ended:true,id:'finished-original',revision:2,savedAt:1000,writeId:'finished-original-write',pendingBossTitles:[]};
const parent=survivalObjectiveParent(terminal);assert(parent);
function source(name){const start=main.indexOf('function '+name+'('),brace=main.indexOf('{',main.indexOf('){',start));assert(start>=0&&brace>start,name);let depth=0;for(let end=brace;end<main.length;end++){if(main[end]==='{')depth++;if(main[end]==='}'&&!--depth)return main.slice(start,end+1);}throw Error(name);}
const updateStart=main.indexOf('function update(dt,time){'),updateEnd=main.indexOf('if(skywayAdvance>0)',updateStart);
assert(updateStart>=0&&updateEnd>updateStart);const updatePrefix=main.slice(updateStart,updateEnd)+'}';
let cases=0;
// This executes the actual early-return prefix, rather than inspecting guard text.
for(let act=0;act<5;act++)for(const mode of ['playing','evolving','forms'])for(const change of ['gate','owner'])for(const won of [false,true]){
 const session=survival.createSurvivalSession(413,{actCount:5,objective});Object.assign(session,{act,won,transitionTime:1.99});const original=JSON.stringify(session),calls={pause:0,growth:0,advance:0,art:0};const toast={};
 const c=vm.createContext({survivalSession:session,survivalSaveToken:{owner:'owner'},survivalOwner:()=>change==='owner'?'foreign':'owner',CRYSTAL_DEFENSE_OBJECTIVE:objective,expansionObjectiveReleased:()=>change!=='gate',mode,paused:false,evolutionTime:.99,evolutionDuration:1,expansionJourney:null,
  togglePause(){calls.pause++;c.paused=true;},$:()=>toast,growth:{update(){calls.growth++;}},continueSurvival(){calls.advance++;},updateFallen(){throw Error('authority lost before victory processing');},performance:{now:()=>0},perfMark(){},PS:{animation:0},player:{userData:{updateArt(){calls.art++;}}},mirrorReadyRing:{visible:true},camera:{}});
 vm.runInContext(updatePrefix,c);c.update(.1,3);c.update(.1,4);
 assert.equal(JSON.stringify(session),original,`${act} ${mode} ${change} won=${won}`);assert.equal(c.evolutionTime,.99);assert.equal(calls.growth,0);assert.equal(calls.advance,0);assert.equal(calls.art,0);assert.equal(calls.pause,mode==='playing'?1:0);assert.match(toast.textContent,/보존/);cases++;
}
for(const modern of [false,true]){
 const session=survival.createSurvivalSession(413,{actCount:5,...(modern?{objective}:{})});Object.assign(session,{won:true,transitionTime:1.99});let advanced=0,grown=0;
 const c=vm.createContext({survivalSession:session,survivalSaveToken:{owner:'owner'},survivalOwner:()=>modern?'owner':'foreign',CRYSTAL_DEFENSE_OBJECTIVE:objective,expansionObjectiveReleased:()=>modern,mode:'playing',paused:false,expansionJourney:null,growth:{update(){grown++;}},performance:{now:()=>0},perfMark(){},PS:{animation:0},updateFallen(){},continueSurvival(){advanced++;}});
 vm.runInContext(updatePrefix,c);c.update(.1,2);assert.equal(advanced,1);assert.equal(grown,1);assert.equal(session.transitionTime,2.09);
}
console.log(`PASS actual update prefix ${cases} authority-loss cases: all acts, choices, evolution and won; legitimate and classic transitions remain live`);

function host(act=0,{pending=false,evolution=false,withParent=true}={}){
 const session=survival.createSurvivalSession(413,{actCount:5,objective});Object.assign(session,{act,time:act*180,legStartedAt:act*180,bossesDefeated:act,crosswindBossWins:act===4?1:0});
 const dom=new Map(),calls={construct:0,choice:0,evolution:0,pause:0};const data=new Map(),storage={getItem:k=>data.get(k)??null,setItem:(k,v)=>data.set(k,v)};
 const c=vm.createContext({THREE,V:THREE.Vector3,...survival,CRYSTAL_DEFENSE_OBJECTIVE:objective,survivalSession:session,survivalSiegeApi:siege,survivalSiege:act===4?siege.createSurvivalSiege(session):null,survivalOwner:()=> 'owner',survivalSiegeOwner:'owner',survivalExpansion:act>=3?createSurvivalExpansion(session):null,
  survivalSaveToken:{id:'source-host',revision:1,writeId:'source-host-write',owner:'owner',...(withParent?{parent:clone(parent)}:{})},captureSurvivalObjectiveSnapshot,captureCombatFields,captureSurvivalSession,restoreCombatFields,createSurvivalExpansion,normalizeInventory,normalizeRunBonuses,mutationsToSave,mutationsFromSave,createDashState,createActiveGauge,ACTIVE,
  enemies:[],enemyShots:[],player:{position:new THREE.Vector3(1,0,2)},levels:new Map([['split',3],['chain',3]]),heldForms:new Map([['prism',4]]),mutations:new Map(),mutated:new Set(),inventory:{tonic:2},runBonuses:{},rerollUsed:false,
  hp:91,kills:14,score:140,choicesTaken:2,choiceKills:10,bankedUpgrades:2,elapsed:32,runDashes:2,runDamageTaken:9,hasteTime:0,shellTime:0,potionCD:0,selectedItem:null,dashState:createDashState(),dashLock:0,activeGauge:createActiveGauge(30,0),shootCD:.12,playerSlow:0,invuln:.1,
  baseSlideTime:0,baseSlideCooldown:.4,baseSlideLock:-1,baseSlideTarget:new THREE.Vector3(),baseSlideDir:new THREE.Vector3(),lastMove:new THREE.Vector3(0,0,1),survivalPendingChoice:pending?['split']:null,runBonusOffer:[],mode:evolution?'evolving':'playing',paused:false,
  combatAnalysis:{snapshot:()=>({start:0,damage:0,sources:[],buckets:[],sourceBuckets:[]}),restore(){}},packSurvivalActor:e=>({fields:captureCombatFields(e),position:e.g.position.toArray(),rotation:e.g.rotation.y}),
  $:id=>{if(!dom.has(id))dom.set(id,{textContent:'',hidden:false});return dom.get(id);},releaseEnemy(){},syncLaws(){},syncForms(){},growth:{select(){}},effectiveLaws:()=>new Set(),drawRoom(){},playerMotion:{reset(){}},audio:{setScene(){}},musicSceneFor:x=>x,
  cardChoice(){calls.choice++;c.mode='cards';},finishEvolutionChoices(){calls.evolution++;c.mode='forms';},togglePause(){calls.pause++;c.paused=!c.paused;},survivalCloud:{changed(){}},settleSurvivalTitle(){},rawStorage:storage,
  survivalStore:()=>createSurvivalSaveStore(storage,'owner',{objectives:true}),
  spawnSurvivalEnemy(spot){calls.construct++;c.survivalSession.rngState=7;c.survivalSession.spawnIndex+=9;const e={g:new THREE.Object3D()};e.g.position.set(spot.x,0,spot.z);c.enemies.push(e);return e;},
  spawnSurvivalBoss(){calls.construct++;c.survivalSession.rngState=8;c.survivalSession.bossSpawned=true;const e={g:new THREE.Object3D()};c.enemies.push(e);return e;}
 });
 for(const name of ['captureSurvivalSiegeThreats','captureSurvivalSnapshot','restoreSurvivalWorld','saveSurvival'])vm.runInContext(source(name),c);
 return {c,calls,storage,data};
}
for(let act=0;act<5;act++)for(const choice of ['playing','pending','evolving']){
 const h=host(act,{pending:choice==='pending',evolution:choice==='evolving'}),{c}=h;
 const snap=clone(c.captureSurvivalSnapshot());Object.assign(snap,{version:2,savedAt:1000});assert(validSurvivalObjectiveSave(snap,{owner:'owner'}),`${act} ${choice}: actual capture valid`);assert.equal(validSurvivalSave({...snap,version:1}),false,'Downcast public bytes are not legacy');
 assert.deepEqual(snap.parent,parent);assert.equal(snap.siege===null,act!==4);const rng=snap.session.rngState;
 c.restoreSurvivalWorld(snap);assert.equal(c.survivalSession.rngState,rng);assert.deepEqual(clone(c.survivalSaveToken.parent),parent);assert.equal(c.survivalSaveToken.owner,'owner');assert.equal(c.hp,91);assert.equal(c.levels.get('split'),3);assert.equal(c.inventory.tonic,2);assert.deepEqual(c.player.position.toArray(),[1,0,2]);
 assert.equal(h.calls.choice,choice==='pending'?1:0);assert.equal(h.calls.evolution,choice==='evolving'?1:0);assert.equal(h.calls.pause,choice==='playing'?1:0);
 const recaptured=clone(c.captureSurvivalSnapshot());assert.deepEqual(recaptured.parent,parent);assert.equal(recaptured.session.objective,objective);assert.equal(recaptured.siege===null,act!==4);
}
console.log('PASS actual capture/restore: 15 all-act pending/evolution/playing worlds preserve terminal parent, build, potions and public objective identity');

// Actual adapter emits the actor packets; only rendering construction is stubbed.
{
 const {c,calls}=host(4);siege.startSurvivalSiege(c.survivalSiege);let packets=[];for(let i=0;i<4;i++)packets.push(...siege.stepSurvivalSiege(c.survivalSiege,.1,{player:{x:0,z:0},enemies:[],session:c.survivalSession}).spawns);assert.equal(packets.length,3);
 c.enemies=packets.map(p=>{const g=new THREE.Object3D();g.position.set(p.x,0,p.z);return{g,hp:p.spec.hp,maxHp:p.spec.hp,survivalKind:p.kind,survivalSiegeId:p.id,survivalSiegeThreat:siege.createSurvivalSiegeThreat(p)};});
 const snapshot=clone(c.captureSurvivalSnapshot());snapshot.savedAt=1000;assert(validSurvivalObjectiveSave(snapshot,{owner:'owner'}));const original=clone(snapshot.session),ids=snapshot.enemies.map(e=>e.fields.survivalSiegeId);c.restoreSurvivalWorld(snapshot);
 assert.equal(calls.construct,3);assert.deepEqual(clone(c.survivalSession),original,'Constructors must not consume saved RNG or spawn cursor');assert.deepEqual(clone(c.enemies.map(e=>e.survivalSiegeThreat.id)),ids);assert.equal(new Set(c.enemies.map(e=>e.survivalSiegeThreat)).size,3);assert(validSurvivalObjectiveSave(clone(c.captureSurvivalSnapshot()),{owner:'owner'}));
}
console.log('PASS actual siege packets round-trip through main actor capture/restore: precise IDs, 3 live models and construction RNG reset');

// Actual main fresh save receives store-created ancestry, then keeps it on every capture.
{
 const {c,storage}=host(0,{withParent:false});storage.setItem(SURVIVAL_SAVE_KEY+':owner',JSON.stringify(terminal));c.survivalSaveToken.revision=0;delete c.survivalSaveToken.writeId;assert(c.saveSurvival());assert.deepEqual(clone(c.survivalSaveToken.parent),parent);assert(c.saveSurvival());assert.equal(c.survivalSaveToken.revision,2);assert.deepEqual(c.survivalStore().read().parent,parent);assert.equal(storage.getItem(SURVIVAL_SAVE_KEY+':owner'),JSON.stringify(terminal));
 c.survivalSession.lab='siege';c.survivalSession.siegeReview=true;assert.equal(captureSurvivalObjectiveSnapshot(clone(c.captureSurvivalSnapshot()),{owner:'owner'}),null);
}
console.log('PASS actual main save inherits immutable store-made parent across revision2 without changing legacy terminal; review rejected');
{
 const {c,storage}=host(4,{withParent:false});storage.setItem(SURVIVAL_SAVE_KEY+':owner',JSON.stringify(terminal));c.survivalSaveToken.revision=0;delete c.survivalSaveToken.writeId;assert(c.saveSurvival());
 const callbacks=[];Object.assign(c,{survivalTitleEvents,SURVIVAL_TITLE_LIMIT,cancelActive,addItem,queueMicrotask:fn=>callbacks.push(fn),fallen:[],shots:[],effects:[],release(){},clearForms(){},activeVfx:{clear(){}},finaleEchoes:[],wells:[],pulls:[],orbitHits:new Map(),vfx:{clear(){}},clearEscorts(){},touch:{reset(){}},keys:new Set(),maxPlayerHp:()=>100});
 c.player.userData={};vm.runInContext(source('continueSurvival'),c);c.survivalSession.bossSpawned=true;survival.settleSurvivalKill(c.survivalSession,{boss:true});const bossCount=c.survivalSession.bossesDefeated;
 survival.settleSurvivalKill(c.survivalSession,{boss:true});assert.equal(c.survivalSession.bossesDefeated,bossCount);const ordinal=survival.survivalBossOrdinal(c.survivalSession,'crystalGardener');assert.equal(ordinal,1);assert(queueSurvivalTitle(c.survivalSession,'crystalGardener',ordinal,'epoch-source-host'));assert(queueSurvivalTitle(c.survivalSession,'crystalGardener',ordinal,'epoch-source-host'));assert.equal(survivalTitleEvents(c.survivalSession).length,1);
 const levels=clone(Object.fromEntries(c.levels)),forms=clone(Object.fromEntries(c.heldForms));c.continueSurvival();assert.equal(c.survivalSession.act,0);assert.equal(c.survivalSession.lap,1);assert.equal(c.survivalSession.objective,objective);assert.equal(c.survivalSiege,null);assert.equal(c.survivalSession.bossSpawned,false);assert.equal(c.survivalSession.won,false);assert.equal(c.hp,100);assert.equal(c.inventory.tonic,3);assert.deepEqual(Object.fromEntries(c.levels),levels);assert.deepEqual(Object.fromEntries(c.heldForms),forms);assert.equal(callbacks.length,1);callbacks[0]();
 const saved=c.survivalStore().read();assert(saved);assert.equal(saved.session.act,0);assert.equal(saved.siege,null);assert.equal(saved.session.crystalBossWins,1);assert.equal(saved.session.pendingBossTitles.length,1);assert.deepEqual(saved.parent,parent);assert.equal(storage.getItem(SURVIVAL_SAVE_KEY+':owner'),JSON.stringify(terminal));
}
console.log('PASS actual continueSurvival fifth boss→lap1 Act1 retains build/parent and original bonus; duplicate boss/title receipt remains single');
console.log('Node source VM + actual pure engine/save APIs. Actor render constructors intentionally stubbed; no browser, real account/device or human difficulty approval.');
