import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import vm from 'node:vm';
import * as THREE from 'three';
import {ACT3_ARENA,act3EntryPoint,act3ReinforcementSpawn} from '../src/act3.js';
import {constrainToArena,insideArena} from '../src/arena.js';
import {createAct3Minion,tickAct3Minion,createTempestCarrier,tickTempestCarrier} from '../src/act3-enemies.js';
import {createExpansionCourse,stepExpansionCourse,checkpointExpansionCourse,restoreExpansionCourse} from '../src/act-expansion-runtime.js';
import {createExpansionThreat,stepExpansionThreat} from '../src/expansion-journey.js';
import {createCrystalSiege,startCrystalSiegeDefense,stepCrystalSiege,createCrystalSiegeThreat,stepCrystalSiegeThreat,checkpointCrystalSiege,restoreCrystalSiege} from '../src/crystal-siege-rules.js';
import {journeyCombatCamera} from '../src/journey-combat-camera.js';
import {responsiveView} from '../src/responsive-view.js';

const main=readFileSync(new URL('../src/main.js',import.meta.url),'utf8');
const arenaStart=main.indexOf('  arena=s.siege'),arenaEnd=main.indexOf('\n  gate.position',arenaStart);assert(arenaStart>=0&&arenaEnd>arenaStart);
function expansionArena(act,phase='course'){
 const c={s:{act,phase,siege:act==='crystalGorge'?{}:null,course:{encounterVersion:3}},canyon:act==='crystalGorge',length:phase==='boss'?62:140,distance:48};
 vm.runInNewContext(main.slice(arenaStart,arenaEnd),c);return c.arena;
}
const crosswind=expansionArena('crosswind'),crystal=expansionArena('crystalGorge');
assert.equal(ACT3_ARENA.halfWidth,15);assert.equal(ACT3_ARENA.halfDepth,13);
assert.equal(crosswind.halfDepth,9);assert.equal(crystal.halfWidth,13);assert.equal(crystal.halfDepth,11);
assert.equal(expansionArena('crosswind','boss').halfDepth,9);assert.equal(expansionArena('crystalGorge','boss').halfWidth,13);
const collideStart=main.indexOf('function collide('),collideEnd=main.indexOf('function runBonusCard',collideStart);assert(collideStart>0&&collideEnd>collideStart);
let movementChecks=0;
for(const [act,arena]of [['skyway',ACT3_ARENA],['crosswind',crosswind],['crystalGorge',crystal]]){
 const player={position:new THREE.Vector3()},ctx={player,arena,expansionJourney:act==='skyway'?null:{act,phase:'course',course:{distance:48}},constrainToArena,expansionTerrain:null,obstacles:[]};
 const collide=vm.runInNewContext(main.slice(collideStart,collideEnd)+';collide',ctx);
 const targets=act==='crosswind'?[[10,8.4],[10,-8.4]]:act==='skyway'?[[14,12],[-14,12],[14,-12],[-14,-12]]:[[12.4,0],[-12.4,0],[0,10.4],[0,-10.4],[8.5,7],[-8.5,-7]];
 for(const [x,z]of targets){player.position.set(x,0,z);collide(player.position,.4);assert(Math.abs(player.position.x-x)<1e-8&&Math.abs(player.position.z-z)<1e-8,'shipping collision must allow the newly opened space');movementChecks++;}
 player.position.set(1e4,0,1e4);collide(player.position,.4);assert(insideArena(player.position,.4,arena),'new perimeter remains solid');
}
// Same camera/rig scale; expanded world coordinates cannot reintroduce a fit zoom.
for(const [w,h,touch]of [[1280,720,false],[640,360,true]])for(const act of ['skyway','crosswind','crystalGorge'])assert.equal(journeyCombatCamera(w,h,act,responsiveView(w,h,touch)).zoom,responsiveView(w,h,touch).zoom);

let entries=0,minEntry=Infinity,maxEntry=0;
for(const [x,z]of [[14,12],[-14,12],[14,-12],[-14,-12],[0,0]])for(let i=0;i<28;i++){
 const authored=act3ReinforcementSpawn(i),p=act3EntryPoint(authored.x,authored.z,{x,z},ACT3_ARENA),d=Math.hypot(p.x-x,p.z-z);
 assert(insideArena(p,.6,ACT3_ARENA));assert(d>=3.4-1e-8,'no entry on top of the seed');assert(d<=12,'reinforcements remain near the explored lane');minEntry=Math.min(minEntry,d);maxEntry=Math.max(maxEntry,d);entries++;
}
const actorResults=[];
for(const [x,z]of [[13.5,11.5],[-13.5,-11.5]])for(const type of ['sky-scout','sky-bomber','sky-diver','sky-carrier']){
 const scene=new THREE.Scene(),e=createAct3Minion(scene,type,()=>.25),entry=act3EntryPoint(-5,-5,{x,z},ACT3_ARENA);e.g.position.set(entry.x,0,entry.z);
 const player=new THREE.Vector3(x,0,z);let bolts=0;
 const ctx={player,roamingArena:ACT3_ARENA,collide:(p,r)=>constrainToArena(p,r,ACT3_ARENA),bolt:()=>bolts++,hit:()=>false,sound:()=>{}};
 for(let i=0;i<1200;i++)tickAct3Minion(e,1/60,i/60,ctx);
 assert(e.attacks>0,type+' must still engage outer lanes');assert(insideArena(e.g.position,.5,ACT3_ARENA));actorResults.push({type,x,z,attacks:e.attacks,bolts});
}
// Exercise the actual host's wide-boss context, then the actual Johan AI.
const ctxStart=main.indexOf('const act3Ctx='),ctxEnd=main.indexOf('\n',ctxStart);assert(ctxStart>0);
const hostCtx=vm.runInNewContext(main.slice(ctxStart,ctxEnd)+';act3Ctx',{survivalSession:null,mirrorSession:null,trainingSession:null,region:'skyway',isAct3:r=>r==='skyway',arena:ACT3_ARENA,player:{position:new THREE.Vector3()}});
assert.equal(hostCtx.arenaMode,true);assert.equal(hostCtx.arena,ACT3_ARENA);
const bossScene=new THREE.Scene(),boss=createTempestCarrier(bossScene),bossPlayer=new THREE.Vector3(13,0,10);boss.g.position.set(0,0,-2);let bossBolts=0;
const bossCtx={player:bossPlayer,arenaMode:hostCtx.arenaMode,arena:hostCtx.arena,collide:(p,r)=>constrainToArena(p,r,ACT3_ARENA),bolt:()=>bossBolts++,hit:()=>false,sound:()=>{},clearBolts:()=>{},summon:()=>{}};
for(let i=0;i<1800;i++)tickTempestCarrier(boss,1/60,i/60,bossCtx);
assert(bossBolts>0&&boss.attacks>2);assert(boss.g.position.distanceTo(bossPlayer)<14,'Johan follows the expanded field instead of being parked at the old centre');

const packets=[],widePackets=[],normal=createExpansionCourse('crosswind',{room:3,seed:712}),wide=createExpansionCourse('crosswind',{room:3,seed:712});
for(let i=0;i<900;i++){
 const player={x:Math.min(i*.1,64),z:0},base={player,enemyCount:0,projectileCount:0};
 for(const [s,list,extra]of [[normal,packets,{}],[wide,widePackets,{laneHalfDepth:8.1}]]){const o=stepExpansionCourse(s,.1,{...base,...extra});for(const q of o.spawns)list.push(structuredClone(q));}
}
assert.deepEqual(checkpointExpansionCourse(wide),checkpointExpansionCourse(normal),'widening changes neither route length, seed, time, finite packet budget nor save schema');
assert.deepEqual(widePackets.map(q=>[q.id,q.type,q.hp,q.damage,q.windup]),packets.map(q=>[q.id,q.type,q.hp,q.damage,q.windup]));
assert(widePackets.some(q=>Math.abs(q.position.z)>4.5));for(const q of widePackets){assert.equal(q.laneMin,-8.1);assert.equal(q.laneMax,8.1);}
assert.deepEqual(checkpointExpansionCourse(restoreExpansionCourse(checkpointExpansionCourse(wide))),checkpointExpansionCourse(wide));
let wideShots=0;
for(const z of [-8.4,8.4])for(const type of ['shooter','lobber','charger']){
 const e=createExpansionThreat({id:type,type,behavior:'crosswind',role:'front',laneCenter:-Math.sign(z)*8.1,laneMin:-8.1,laneMax:8.1,weave:1,position:{x:21.8,z:-Math.sign(z)*8.1},hp:100,speed:2.1,cooldown:1.7,bulletSpeed:5.2,damage:12,shots:1,windup:1.15});let attacks=0;
 for(let i=0;i<1800;i++){const o=stepExpansionThreat(e,1/60,{player:{x:15,z},projectiles:0});wideShots+=o.bolts.length;attacks+=o.bolts.length+Number(Boolean(o.contact));}
 assert(attacks>0,type+' must engage the outer lane');assert(Math.abs(e.position.z)<=9.1,'only a committed short charger pass may cross the formation limit');
}
// Core, construction, resource distances and ingress stay compact. Running into
// the extra patrol space does not win the siege or protect an undefended heart.
const siege=createCrystalSiege(0,712),checkpoint=checkpointCrystalSiege(siege);assert.deepEqual(checkpointCrystalSiege(restoreCrystalSiege(checkpoint)),checkpoint);
assert.deepEqual(siege.nodes.map(n=>[n.x,n.z]),[[-5,-4.5],[0,-4.5],[5,-4.5],[-5,4.5],[0,4.5],[5,4.5]]);
startCrystalSiegeDefense(siege);const threats=[];
for(let i=0;i<1200&&siege.phase!=='failed';i++){
 const o=stepCrystalSiege(siege,.05,{player:{x:12.4,z:10.4},enemies:threats.map(e=>({id:e.id,x:e.position.x,z:e.position.z,hp:e.hp}))});for(const q of o.spawns)threats.push(createCrystalSiegeThreat(q));
 for(const e of threats)stepCrystalSiegeThreat(e,.05,siege,{player:{x:12.4,z:10.4}});
 assert(threats.length<=24);
}
assert.equal(siege.phase,'failed');assert.equal(siege.core.hp,0,'retreating outside the core cannot auto-clear the finite siege');
console.log(JSON.stringify({movementChecks,entries,minEntry,maxEntry,actorResults,bossAttacks:boss.attacks,bossBolts,unchangedPacketActors:packets.length,wideShots,undefendedCore:siege.core.hp},null,2));
console.log('PASS actual shipping collision/context, real wide-lane enemy and boss engines, finite shared packet/save parity and unchanged inner siege economy. CPU/VM/Three only; native browser/device and human difficulty remain separate.');
