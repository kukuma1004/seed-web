import assert from 'node:assert/strict';
import {existsSync,readFileSync} from 'node:fs';
import * as THREE from 'three';
import {ACT3_REGION,ACT3_RELEASED,ACT3_PRESSURE,SKYWAY_ROOMS,ACT3_ARENA,isAct3,act3Unlocked,act3Available,playableAct3Region,act3Storage,act3CrowdType,act3ReinforcementSpawn} from '../src/act3.js';
import {ACT2_PRESSURE} from '../src/act2.js';
import {ACT3_GEOMETRIES,ACT3_ART,ACT3_MINIONS,isAct3Minion,createAct3Minion,tickAct3Minion,createAct3Warden,tickAct3Warden,createTempestCarrier,tickTempestCarrier,damageTempestCarrier,TEMPEST_CARRIER} from '../src/act3-enemies.js';
import {createSkyway} from '../src/skyway.js';
import {roomFor} from '../src/journey.js';
import {arenaFor,insideArena,shouldBuildArenaBoundary} from '../src/arena.js';
import {trapsFor} from '../src/traps.js';
import {turretSpots} from '../src/turret.js';
import {REGION_NAMES,writeCheckpoint,readCheckpoint} from '../src/run-save.js';
import {KILL_POINTS} from '../src/score.js';

const V=THREE.Vector3;
assert.equal(ACT3_RELEASED,true,'act 3 is released');
assert.equal(act3Available({hostname:'localhost'}),true);assert.equal(act3Available({hostname:'kukuma1004.github.io'}),true);
assert.equal(playableAct3Region(ACT3_REGION,{hostname:'kukuma1004.github.io'}),ACT3_REGION);assert.equal(playableAct3Region(ACT3_REGION,{hostname:'localhost'}),ACT3_REGION);
assert.equal(act3Unlocked({bosses:['alwaysbeginner']}),true);assert.equal(act3Unlocked({bosses:['austin']}),false);assert.equal(isAct3(ACT3_REGION),true);assert.equal(REGION_NAMES.skyway,'폭풍의 항로');
assert.ok(ACT3_PRESSURE.hp>1&&ACT3_PRESSURE.speed>1&&ACT3_PRESSURE.projectile>1&&ACT3_PRESSURE.bossTempo>1);
assert.ok(ACT3_PRESSURE.hp>ACT2_PRESSURE.hp&&ACT3_PRESSURE.speed>ACT2_PRESSURE.speed&&ACT3_PRESSURE.projectile>ACT2_PRESSURE.projectile&&ACT3_PRESSURE.bossTempo>ACT2_PRESSURE.bossTempo,'act 3 stays a measured step above act 2');
assert.ok(ACT3_PRESSURE.crowdInterval<ACT2_PRESSURE.crowdInterval,'act 3 formations reinforce faster without raising the live actor cap');
assert.ok(ACT3_PRESSURE.projectileCapLow<ACT3_PRESSURE.projectileCapNormal&&ACT3_PRESSURE.projectileCapNormal<=64,'hostile projectiles stay capped for phones');
const crowd=Array.from({length:12},(_,i)=>act3CrowdType(i,3));
assert.equal(crowd.filter(type=>type==='sky-diver').length,1,'chargers are rare');
assert.ok(crowd.filter(type=>type!=='sky-diver').length>=11,'shooters dominate the route');
assert.ok(ACT3_MINIONS['sky-diver'].hp<ACT3_MINIONS['sky-scout'].hp,'the rare charger is fragile');
for(let i=0;i<14;i++)assert.ok(insideArena(act3ReinforcementSpawn(i),.5,ACT3_ARENA),'reinforcement lane stays inside the route');

assert.equal(SKYWAY_ROOMS.length,5);assert.equal(arenaFor(0,0,ACT3_REGION),ACT3_ARENA);
assert.equal(shouldBuildArenaBoundary(ACT3_REGION),false,'the scrolling route has no visible front/back room walls');assert.equal(shouldBuildArenaBoundary('garden'),true);
SKYWAY_ROOMS.forEach((room,stage)=>{
 assert.equal(roomFor(stage,0,ACT3_REGION),room);assert.equal(roomFor(stage,4,ACT3_REGION),room);
 for(const [type,x,z] of room.enemies){assert.ok(isAct3Minion(type)||type==='act3warden',type);assert.ok(insideArena({x,z},.5,ACT3_ARENA),`${room.name}: ${type}`);}
 assert.deepEqual(trapsFor(stage,0,ACT3_REGION),[]);assert.deepEqual(turretSpots(stage,0,ACT3_REGION),[]);
});
assert.equal(new Set(SKYWAY_ROOMS.flatMap(room=>room.enemies.map(([type])=>type)).filter(isAct3Minion)).size,4,'all four flight roles appear');
const main=readFileSync(new URL('../src/main.js',import.meta.url),'utf8'),developerStart=main.slice(main.indexOf('function startDeveloperEncounter'),main.indexOf('function showDeveloperLab'));
assert.match(main,/id="start-act3"/,'act 3 appears in the journey menu');
assert.match(main,/id="start-act3"[\s\S]*?onclick=\(\)=>enter\(saved3\|\|null,ACT3_REGION\)/,'act 3 starts or restores its own run');
assert.match(main,/if\(isAct3\(region\)\)return; \/\/ The shared board accepts only Acts 1 and 2/,'act 3 never posts into the existing online leaderboards');
assert.match(main,/playableAct3Region\(playableRegion\(r\),globalThis\.location,developerRun\)/,'the public administrator lab must bypass only the unreleased act-3 gate');
assert.doesNotMatch(developerStart,/restart\(\);[\s\S]*wave\(\)/,'the developer lab must build the selected encounter once instead of stacking it over the first room');
assert.match(developerStart,/act3field:\{region:ACT3_REGION,stage:1[\s\S]*act3warden:\{region:ACT3_REGION,stage:4[\s\S]*act3boss:\{region:ACT3_REGION,stage:4/,'all three act-3 laboratory entries target the skyway');
for(const type of ['sky-scout','sky-diver','sky-bomber','sky-carrier','act3warden','tempestcarrier'])assert.ok(KILL_POINTS[type]>0,type);
assert.ok(Object.values(ACT3_GEOMETRIES).every(geometry=>geometry.attributes?.position?.count>0),'all procedural flight meshes are valid');
assert.deepEqual(ACT3_ART.tempestcarrier.frames,[1,2,3],'the boss owns a visual phase for each health band');
for(const file of new Set(Object.values(ACT3_ART).map(art=>art.file))){
 assert.ok(existsSync(new URL(`../public/assets/${file}`,import.meta.url)),`${file} exists`);
 assert.ok(existsSync(new URL(`../public/assets/mobile/${file}`,import.meta.url)),`mobile ${file} exists`);
}

{
 const data=new Map(),storage={getItem:key=>data.get(key)??null,setItem:(key,value)=>data.set(key,String(value)),removeItem:key=>data.delete(key)},act3=act3Storage(storage);
 const save={version:1,cycle:0,region:ACT3_REGION,stage:2,mode:'entry',hp:90,rules:[],mutated:[],kills:4,elapsed:12,wardens:0,austins:0};
 assert.equal(writeCheckpoint(act3,save),true);assert.equal(readCheckpoint(storage),null,'act 1 cannot see act 3 checkpoint');assert.equal(readCheckpoint(act3).region,ACT3_REGION);
}

function world(player=new V(0,0,1)){
 const bolts=[],hits=[],summons=[];return {bolts,hits,summons,ctx:{player,collide:()=>{},hit:value=>{hits.push(value);return true;},bolt:(pos,dir,spec)=>bolts.push({pos:pos.clone(),dir:dir.clone(),spec}),sound:()=>{},summon:types=>summons.push(...types)}};
}
const scene=new THREE.Scene();
for(const type of ['sky-scout','sky-diver','sky-bomber','sky-carrier']){
 const w=world(),e=createAct3Minion(scene,type,()=>.25);e.g.position.set(0,0,-5);e.timer=0;const states=new Set();
 for(let time=0;time<5;time+=.04){tickAct3Minion(e,.04,time,w.ctx);states.add(e.state);}
 assert.equal(e.homeReady,true,`${type} owns a stable formation anchor`);assert.ok(Number.isFinite(e.artRoll),`${type} bank animation stays finite`);
 assert.ok(w.bolts.length||states.has('commit'),`${type} produces a shot or a real charge`);
 if(type==='sky-bomber')assert.ok(w.bolts.length>=3,'bomber completes its warning and fan attack');
}
{
 const w=world(),e=createAct3Warden(scene);e.g.position.set(0,0,-5);e.timer=0;const moves=new Set();
 for(let time=0;time<9;time+=.04){tickAct3Warden(e,.04,time,w.ctx);if(e.moveName)moves.add(e.moveName);}
 assert.ok(moves.size>=3,'warden cycles through all three signatures');assert.ok(w.bolts.length>10,'warden emits bounded readable bullet patterns');
}
{
 const w=world(),e=createTempestCarrier(scene);e.g.position.set(0,0,-5.4);e.timer=0;const moves=new Set();
 const burst=damageTempestCarrier(e,e.maxHp);assert.ok(burst<=e.maxHp*TEMPEST_CARRIER.damage.burst+.001,'one hit cannot erase a boss phase');assert.equal(damageTempestCarrier(e,100),0,'same-frame excess damage waits for the budget');
 e.hp=e.maxHp*.3;e.damageAllowance=e.maxHp*TEMPEST_CARRIER.damage.burst;e.state='stalk';e.timer=0;
 for(let time=0;time<24;time+=.04){tickTempestCarrier(e,.04,time,w.ctx);if(e.moveName&&!e.moveName.includes('변환'))moves.add(e.moveName);}
 assert.equal(e.config.name,'폭풍비행사 요한');assert.equal(e.phaseIndex,2,'last third enters storm-core phase');assert.ok(moves.size>=5,'boss owns five distinct signatures');assert.ok(moves.has('크루이프 턴'),'Johan owns the reversal signature');assert.ok(w.bolts.length>=180,'boss creates sustained multi-speed and curved barrages');assert.ok(w.bolts.length<600,'emitted patterns remain bounded before the runtime projectile cap');assert.deepEqual(w.summons,['sky-bomber','sky-scout'],'storm-core transition brings a small shooting escort');
}
{
 const skyScene=new THREE.Scene();skyScene.background=new THREE.Color(0x102010);skyScene.fog=new THREE.FogExp2(0x102010,.02);const light=new THREE.HemisphereLight(0xffffff,0x334455,1),garden=new THREE.Group();garden.visible=true;skyScene.add(light,garden);
 const sky=createSkyway(skyScene,{lights:[light],hide:[garden],mobile:true});assert.equal(sky.group.visible,false);sky.setActive(true);const before=sky.state();sky.tick(1,true);const after=sky.state();
 assert.equal(sky.group.visible,true);assert.equal(garden.visible,false);assert.ok(after.distance>before.distance);assert.equal(after.drawCalls,3);assert.equal(after.openEnds,true);assert.equal(after.parallaxLayers,3);assert.ok(after.instances<100,'scrolling environment stays batched');
 sky.setActive(false);assert.equal(garden.visible,true);assert.equal(sky.group.visible,false);
}
console.log('Act 3: public gate, separate save, five rooms, flight roles, warden, boss patterns and batched scrolling passed.');
