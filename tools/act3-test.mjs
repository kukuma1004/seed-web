import assert from 'node:assert/strict';
import {existsSync,readFileSync} from 'node:fs';
import * as THREE from 'three';
import {ACT3_REGION,ACT3_RELEASED,ACT3_PRESSURE,act3RoomPressure,SKYWAY_ROOMS,ACT3_ARENA,isAct3,act3Unlocked,act3Available,playableAct3Region,act3Storage,act3CrowdType,act3ReinforcementSpawn,act3SupplyDrop} from '../src/act3.js';
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
assert.equal(act3Unlocked({bosses:['alwaysbeginner']}),true);assert.equal(act3Unlocked({bosses:['austin']}),true);assert.equal(act3Unlocked(null),true,'beta players may choose act 3 immediately');assert.equal(isAct3(ACT3_REGION),true);assert.equal(REGION_NAMES.skyway,'폭풍의 항로');
assert.ok(ACT3_PRESSURE.hp>1&&ACT3_PRESSURE.speed>1&&ACT3_PRESSURE.projectile>1&&ACT3_PRESSURE.bossTempo>1);
assert.ok(ACT3_PRESSURE.hp>ACT2_PRESSURE.hp&&ACT3_PRESSURE.speed>ACT2_PRESSURE.speed&&ACT3_PRESSURE.projectile>ACT2_PRESSURE.projectile&&ACT3_PRESSURE.bossTempo>ACT2_PRESSURE.bossTempo,'act 3 stays a measured step above act 2');
assert.ok(ACT3_PRESSURE.crowdInterval<ACT2_PRESSURE.crowdInterval,'act 3 formations reinforce faster without raising the live actor cap');
assert.ok(ACT3_PRESSURE.projectileCapLow<ACT3_PRESSURE.projectileCapNormal&&ACT3_PRESSURE.projectileCapNormal<=64,'hostile projectiles stay capped for phones');
const opening=act3RoomPressure(0),second=act3RoomPressure(1),late=act3RoomPressure(3);
assert.ok(opening.crowdInitial<second.crowdInitial&&second.crowdInitial<late.crowdInitial,'flight density grows by room');
assert.ok(opening.crowdInterval>second.crowdInterval&&second.crowdInterval>late.crowdInterval,'opening reinforcements leave a dodge window');
assert.ok(opening.projectile<second.projectile&&second.projectile<late.projectile,'opening missiles travel slower');
assert.ok(opening.projectileCapNormal<second.projectileCapNormal&&second.projectileCapNormal<late.projectileCapNormal,'opening screen has a lower missile ceiling');
assert.ok(Array.from({length:24},(_,i)=>act3CrowdType(i,0)).every(type=>type!=='sky-bomber'),'first-room reinforcements never add three-shot bombers');
assert.equal(Array.from({length:12},(_,i)=>act3CrowdType(i,1)).filter(type=>type==='sky-bomber').length,1,'second room introduces one bomber per formation');
const crowd=Array.from({length:12},(_,i)=>act3CrowdType(i,3));
assert.equal(crowd.filter(type=>type==='sky-diver').length,3,'late formations give three committed body threats per twelve actors');
assert.equal(crowd.filter(type=>type!=='sky-diver').length,9,'shooting roles still leave room for fragile committed threats');
assert.equal(Array.from({length:12},(_,i)=>act3CrowdType(i,0)).filter(type=>type==='sky-diver').length,2,'opening formations teach two divers before the late mix');
assert.ok(ACT3_MINIONS['sky-diver'].hp<ACT3_MINIONS['sky-scout'].hp,'the committed charger remains a fragile priority target');
for(let i=0;i<14;i++)assert.ok(insideArena(act3ReinforcementSpawn(i),.5,ACT3_ARENA),'reinforcement lane stays inside the route');
assert.ok(act3ReinforcementSpawn(3).x-act3ReinforcementSpawn(2).x<2,'중앙 편대는 분열탄도 닿을 만큼 밀집한다');
assert.equal(act3SupplyDrop('sky-carrier',2,false,{tonic:4}),'tonic','후반 방 보급 모함을 잡으면 물약을 얻는다');
assert.equal(act3SupplyDrop('sky-carrier',2,true,{tonic:4}),null,'방마다 첫 보급만 준다');
assert.equal(act3SupplyDrop('sky-carrier',3,false,{tonic:5}),null,'가방 상한을 넘지 않는다');
assert.equal(act3SupplyDrop('sky-scout',3,false,{tonic:0}),null,'일반 잡몹은 물약을 만들지 않는다');

assert.equal(SKYWAY_ROOMS.length,5);assert.equal(arenaFor(0,0,ACT3_REGION),ACT3_ARENA);
assert.equal(shouldBuildArenaBoundary(ACT3_REGION),false,'the scrolling route has no visible front/back room walls');assert.equal(shouldBuildArenaBoundary('garden'),true);
SKYWAY_ROOMS.forEach((room,stage)=>{
 assert.equal(roomFor(stage,0,ACT3_REGION),room);assert.equal(roomFor(stage,4,ACT3_REGION),room);
 for(const [type,x,z] of room.enemies){assert.ok(isAct3Minion(type)||type==='act3warden',type);assert.ok(insideArena({x,z},.5,ACT3_ARENA),`${room.name}: ${type}`);}
 assert.deepEqual(trapsFor(stage,0,ACT3_REGION),[]);assert.deepEqual(turretSpots(stage,0,ACT3_REGION),[]);
});
assert.equal(new Set(SKYWAY_ROOMS.flatMap(room=>room.enemies.map(([type])=>type)).filter(isAct3Minion)).size,4,'all four flight roles appear');
const main=readFileSync(new URL('../src/main.js',import.meta.url),'utf8'),developerStart=main.slice(main.indexOf('function startDeveloperEncounter'),main.indexOf('function showDeveloperLab'));
assert.match(main,/actCard\('start-act3',3/,'act 3 appears in the journey menu');
assert.match(main,/actCard\('start-act3',3[\s\S]*?onclick=\(\)=>enter\(saved3\|\|null,ACT3_REGION\)/,'act 3 starts or restores its own run');
assert.match(main,/act:isAct3\(region\)\?ACT\.JOHAN/,'act 3 records use the Johan leaderboard');
assert.match(main,/data-board="johan"/,'Johan has a visible online leaderboard tab');
assert.match(main,/speed:spec\.speed\*difficulty\(cycle,region\)\.projectileSpeed\*act3RoomPressure\(stage\)\.projectile/,'actual missiles use the room-specific speed');
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
 const bolts=[],hits=[],summons=[];return {bolts,hits,summons,time:0,ctx:{player,collide:()=>{},hit:value=>{hits.push(value);return true;},bolt:(pos,dir,spec)=>bolts.push({pos:pos.clone(),dir:dir.clone(),spec}),sound:()=>{},summon:types=>summons.push(...types)}};
}
function stepMinion(e,w,dt=.02){w.time+=dt;tickAct3Minion(e,dt,w.time,w.ctx);}
function untilMinion(e,w,predicate,max=10){
 const end=w.time+max;while(w.time<end&&!predicate())stepMinion(e,w);
 assert.ok(predicate(),`${e.type} reaches the expected phase within ${max}s of real actor time`);
}
const scene=new THREE.Scene();
{
 const w=world(new V(0,0,5.5)),e=createAct3Minion(scene,'sky-scout',()=>.25);e.g.position.set(0,0,-5);
 untilMinion(e,w,()=>e.state==='tell');const warningAt=w.time,lockedAim=e.dir.clone();
 assert.equal(w.bolts.length,0,'scout enters and approaches without firing');
 assert.ok(e.g.position.z>-3&&e.g.position.distanceTo(w.ctx.player)<6,'scout is a close priority before its warning');
 w.ctx.player.x=6;for(let i=0;i<20;i++)stepMinion(e,w);
 assert.equal(w.bolts.length,0,'the warning gives real movement time before the shot');
 untilMinion(e,w,()=>w.bolts.length>0);
 assert.ok(w.time-warningAt>=.5-1e-9,'the single aimed shot follows the full warning');
 assert.equal(w.bolts.length,1,'one completed warning fires one missile, without a hidden volley');
 assert.ok(w.bolts[0].dir.distanceTo(lockedAim)<1e-9,'moving after the warning locks does not retarget the shot');
 untilMinion(e,w,()=>e.state==='recover');assert.equal(w.bolts.length,1,'crossing pass adds no extra missiles');
 const resting=e.g.position.clone();for(let i=0;i<25;i++)stepMinion(e,w);
 assert.ok(e.g.position.distanceTo(resting)<1e-9,'scout remains stationary through a genuine recovery window');
 assert.equal(w.bolts.length,1,'recovery cannot shoot');
 untilMinion(e,w,()=>w.bolts.length===2);assert.equal(e.attacks,2,'later shots require another complete attack cycle');
}
for(const type of ['sky-scout','sky-diver','sky-bomber','sky-carrier']){
 const w=world(),e=createAct3Minion(scene,type,()=>.25);e.g.position.set(0,0,-5);const states=new Set();
 while(w.time<5){stepMinion(e,w);states.add(e.state);}
 assert.equal(e.homeReady,true,`${type} owns a stable formation anchor`);assert.ok(Number.isFinite(e.artRoll),`${type} bank animation stays finite`);
 assert.ok(states.has('entry')&&states.has('tell')&&states.has('recover'),`${type} progresses naturally through entry, warning and recovery`);
 assert.ok(w.bolts.length||states.has('commit'),`${type} produces a shot or a real charge`);
 if(type==='sky-bomber'||type==='sky-carrier')assert.equal(w.bolts.length,e.attacks*3,`${type} completes bounded three-shot openings`);
}
{
 const w=world(new V(0,0,5.5)),divers=crowd.filter(type=>type==='sky-diver').map((type,i)=>{
  const e=createAct3Minion(scene,type,()=>.25);e.g.position.set((i-1)*4,0,-6.2);return e;
 }),states=divers.map(()=>new Set());
 while(w.time<6){w.time+=.02;divers.forEach((e,i)=>{tickAct3Minion(e,.02,w.time,w.ctx);states[i].add(e.state);});}
 assert.equal(divers.length,3);
 states.forEach(phases=>assert.ok(phases.has('tell')&&phases.has('commit')&&phases.has('recover'),'each late diver warns, commits and recovers in elapsed time'));
 assert.ok(divers.every(e=>e.attacks===1&&e.g.position.z>5.5),'all three passes reach the lower player before restarting');
 assert.equal(w.hits.length,3,'each committed body pass hits a stationary target at most once');
 assert.equal(w.bolts.length,0,'the three-diver pressure creates no extra projectile hail');
}
{
 const normal=world(),frozen=world(),a=createAct3Minion(scene,'sky-scout',()=>.25),b=createAct3Minion(scene,'sky-scout',()=>.25);
 for(const enemy of [a,b])enemy.g.position.set(0,0,-5);
 b.slow=1;
 untilMinion(a,normal,()=>a.state==='tell');untilMinion(b,frozen,()=>b.state==='tell');
 assert.equal(normal.bolts.length,0);assert.equal(frozen.bolts.length,0,'freeze fixture also waits for the real warning');
 untilMinion(a,normal,()=>normal.bolts.length>0);untilMinion(b,frozen,()=>frozen.bolts.length>0);
 assert.equal(normal.bolts.length,1);assert.equal(frozen.bolts.length,1);
 assert.ok(frozen.bolts[0].spec.speed<normal.bolts[0].spec.speed*.85,'빙결은 새로 발사한 적탄 속도도 낮춘다');
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
