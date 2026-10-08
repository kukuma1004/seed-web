import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import vm from 'node:vm';
import * as THREE from 'three';
import * as journey from '../src/expansion-journey.js';
import * as siege from '../src/crystal-siege-rules.js';
import {crystalBossGuardSpawns,keepCrystalBossApproachOpen} from '../src/journey-purpose.js';
import {createExpansionEntry,validExpansionEntry} from '../src/expansion-run-save.js';
import {constrainToArena} from '../src/arena.js';
import {validRun} from '../src/online-ranking.js';
const main=readFileSync('src/main.js','utf8').replaceAll('\r\n','\n'),harness=readFileSync('tools/crystal-siege-endurance-test.mjs','utf8');
const source=(name,next)=>main.slice(main.indexOf('function '+name+'('),main.indexOf('\nfunction '+next+'(',main.indexOf('function '+name+'(')));
const copy=x=>JSON.parse(JSON.stringify(x));
const scope={THREE,journey,siege,crystalBossGuardSpawns,keepCrystalBossApproachOpen,assert,vm,createExpansionEntry,validExpansionEntry,constrainToArena,copy,earnedEntries:[],
 updateSource:source('updateExpansionCourse','tickExpansionActor'),actorSource:source('tickExpansionActor','waveExpansionJourney'),
 initialRun:{version:1,cycle:0,region:'garden',stage:0,mode:'entry',hp:100,kills:0,elapsed:0,rules:[],mutated:[],forms:{},inventory:{potion:2},score:0,choicesTaken:0,choiceKills:0}};
vm.createContext(scope);
vm.runInContext(harness.slice(harness.indexOf('function host(j){'),harness.indexOf('// No enemy is removed'))+'\n'+harness.slice(harness.indexOf('function course({'),harness.indexOf("group('Actual host end-to-end")).replace(' return result;',' this.lastHost=h;this.lastJourney=j;return result;'),scope);
assert(scope.course({seed:413,hz:60,layout:'turrets',shotDamage:40}).boss);
const saved=scope.earnedEntries.find(e=>e.journey.phase==='boss');assert(saved&&validExpansionEntry(saved));
assert(saved.journey.course.walls.filter(w=>Math.abs(w.z)<w.d/2+.75).every(w=>w.hp>0),'pre-change boss entry keeps its original central crystals');
assert.deepEqual(journey.checkpointExpansionJourney(journey.restoreExpansionJourney(copy(saved.journey))),saved.journey,'legacy boss entry remains byte-for-byte canonical before gameplay preparation');
function bossHost(){
 const j=journey.restoreExpansionJourney(copy(saved.journey)),h=scope.host(j);
 h.expansionBolt=()=>{};h.hitPlayer=()=>{};
 h.expansionTerrain=journey.createCrystalCombatBridge(j.course.walls);
 h.collide=(p,r,previous)=>{constrainToArena(p,r,{shape:'rect',halfWidth:8,halfDepth:10});h.expansionTerrain.constrain(p,r,previous);};
 const boss={expansionBoss:true,expansionMotion:j.boss,hp:2400,maxHp:2400,hit:0,g:{position:new THREE.Vector3(5,0,0),rotation:{}}};h.enemies.push(boss);
 return {j,h,boss};
}
// Real main boss tick consumes the real regrowth event. Source VM UI/model
// constructors are stubbed; synthetic course attacks are explicit above.
for(const hz of [20,60]){
 const {j,h,boss}=bossHost(),dt=1/hz;
 for(const pad of j.siege.pads)pad.hp=0;
 const hp=j.siege.core.hp;for(let i=0;i<hz*25&&!h.enemies.some(e=>e.siegeGuard);i++)h.tickExpansionActor(boss,dt);
 const guards=h.enemies.filter(e=>e.siegeGuard);assert.equal(guards.length,2);assert.equal(j.siege.core.hp,hp);
 assert(validExpansionEntry(createExpansionEntry(j,saved.run,[-4,0,0])),'opened runtime corridor also remains a valid new entrance');
 const before=guards[0].g.position.clone();h.tickExpansionActor(guards[0],0);assert(guards[0].g.position.equals(before));
 for(let i=0;i<hz*25&&j.siege.core.hp===hp;i++)for(const e of guards)h.tickExpansionActor(e,dt);
 assert(j.siege.core.hp<hp,'cleared fifth-night state must not leave boss guards inert');
 assert(guards[0].g.position.distanceTo(before)>1,'guards actually approach the core');
 const count=h.enemies.length;for(let i=0;i<hz*20;i++)h.tickExpansionActor(boss,dt);assert.equal(h.enemies.length,count,'same HP phase cannot repeatedly farm guards');
 j.siege.core.hp=1;for(let i=0;i<hz*5&&j.siege.core.hp;i++)for(const e of guards)h.tickExpansionActor(e,dt);
 assert.equal(j.siege.phase,'failed');h.updateExpansionCourse(dt);assert.equal(h.failure.won,false,'boss phase core failure ends the actual host');
}
// Every real HP phase reaches the heart through the reserved lane while the
// actual bridge still blocks actors against the other twelve crystals.
for(let phase=0;phase<3;phase++){
 const {j,h,boss}=bossHost();boss.hp=boss.maxHp*[1,.5,.2][phase];for(const pad of j.siege.pads)pad.hp=0;
 const hp=j.siege.core.hp;for(let n=0;n<60*45&&j.siege.core.hp===hp;n++){h.tickExpansionActor(boss,1/60);for(const e of h.enemies)if(e.siegeGuard)h.tickExpansionActor(e,1/60);}
 assert(j.siege.core.hp<hp,`real crystals cannot deadlock phase ${phase} guards`);
 assert(j.course.walls.some(w=>!w.broken),'remaining crystals still provide cover');
 assert(j.course.walls.filter(w=>Math.abs(w.z)<w.d/2+.75).every(w=>w.broken),'regrowth cannot close the core approach');
}
{
 const {j,h,boss}=bossHost();for(const p of j.siege.pads)p.hp=0;
 const guard=h.spawnExpansionActor({id:'guard-facility',type:'charger',position:{x:-3,z:-2.5},hp:100,speed:1.6,damage:7,shots:1,windup:1,cooldown:1,bulletSpeed:5,siegeGuard:true});
 Object.assign(j.siege.pads[0],{kind:'snare',hp:40,level:1,cooldown:0});boss.g.position.copy(guard.g.position);h.updateExpansionCourse(.1);
 assert.equal(guard.expansionThreat.slowFactor,.6);assert.equal(boss.slow,undefined,'boss never inherits the guard snare');
 Object.assign(j.siege.pads[0],{kind:'turret',hp:45,level:1,cooldown:0});boss.g.position.set(7,0,6);const hp=guard.hp;h.updateExpansionCourse(.1);assert(guard.hp<hp,'paid turret targets real guard');
 const core=j.siege.core.hp;h.damageEnemy(guard,1000,false,false,{kind:'synthetic-player'});for(let i=0;i<300;i++){h.updateExpansionCourse(.05);if(!guard.dead)h.tickExpansionActor(guard,.05);}assert.equal(j.siege.core.hp,core,'intercepted guard cannot damage core');
 const restored=journey.restoreExpansionJourney(copy(saved.journey));assert(restored&&restored.phase==='boss');assert.deepEqual(journey.checkpointExpansionJourney(restored),saved.journey,'room-entry restore preserves paid facilities, objective and original canonical boss');
}
{
 const loop=main.slice(main.indexOf('for(let p of enemyShots){'),main.indexOf('\n\nperfMark(PS.enemyShots)',main.indexOf('for(let p of enemyShots){')));
 const p={ob:new THREE.Object3D(),dir:new THREE.Vector3(1,0,0),life:.01,speed:5,damage:12,committedLane:true};p.ob.position.x=11;
 const c=vm.createContext({enemyShots:[p],dt:1/30,stage:0,previousEnemyShot:new THREE.Vector3(),expansionTerrain:null,arena:{},obstacles:[],invuln:0,player:{position:new THREE.Vector3(11.65,0,0),userData:{}},hits:0,hitPlayer(){c.hits++;},reflectArenaBoundary:()=>false,segmentHitsCover:()=>false});
 vm.runInContext(loop,c);assert(Math.abs(p.ob.position.x-11.05)<1e-8);assert.equal(c.hits,0,'expired lane never reaches the untelegraphed player');
 p.life=0;p.ob.position.x=11.65;vm.runInContext(loop,c);assert.equal(c.hits,0,'already expired lane cannot hit');
}
{
 const sent=[],c=vm.createContext({expansionChannel:'public',cycle:4,enemyShots:[],difficulty:()=>({projectileSpeed:2}),V:THREE.Vector3,skywayBolt:(_p,_d,s)=>sent.push(s)});
 vm.runInContext(source('expansionBolt','updateExpansionCourse'),c);
 c.expansionBolt({position:{x:1,z:1},dir:{x:1,z:0},spec:{speed:5,life:2,committedLane:true}});
 assert.equal(sent[0].speed*sent[0].life,10,'public difficulty preserves the warned lane endpoint');
 c.expansionBolt({position:{x:1,z:1},dir:{x:1,z:0},spec:{speed:5,life:2}});assert.equal(sent[1].life,2,'ordinary/boss shots preserve existing lifetime');
}
{
 // Boss-created attacks cannot expand the released ranking/choice ledger.
 const c=vm.createContext({expansionTerrain:null,survivalSession:null,chosen:new Set(),activeGauge:{},elapsed:300,kills:165,choiceKills:12,score:3300,expansionChannel:'public',bossReceipts:0,
  perf:{event(){}},PE:{enemyDeath:0},audio:{play(){}},vfx:{impact(){}},combatAnalysis:{damage(){},kill(){},utility(){}},isBoss:e=>Boolean(e.expansionBoss),bossCharge:()=>1,killCharge:()=>1,chargeActive(){},releaseEnemy(){},saveExpansionBossVictory(){c.bossReceipts++;return true;}});
 vm.runInContext(source('damageEnemy','enemyDown')+'\n'+source('enemyDown','updateFallen'),c);
 for(let n=0;n<6;n++){const e={expansionActor:true,siegeGuard:true,hp:50,maxHp:50,g:{position:new THREE.Vector3()}};c.damageEnemy(e,100,false);assert(e.dead);c.enemyDown(e);}
 assert.equal(c.kills,165);assert.equal(c.choiceKills,12);assert.equal(c.score,3300);assert.equal(c.bossReceipts,0);
 const boss={expansionActor:true,expansionBoss:true,hp:2400,maxHp:2400,g:{position:new THREE.Vector3()}};c.damageEnemy(boss,5000,false);
 assert.equal(c.kills,166);assert.equal(c.choiceKills,13);assert.equal(c.score,9300);assert.equal(c.bossReceipts,1);
 assert(validRun({uid:'test-owner',name:'테스트',act:5,score:c.score,kills:c.kills,cycle:0,stage:4,time:300,at:1000,done:false}));
}
console.log('Journey purpose actual main host PASS: earned boss entrance, real regrowth guards approach/core failure 20/60Hz, paid guard-only snares/turrets, interception, immutable room-entry restore, public warned endpoint and unchanged 166-kill ranking/choice ledger after six guards. Source VM/synthetic attacks; browser/account/device separate.');
