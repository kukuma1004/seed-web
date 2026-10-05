import assert from 'node:assert/strict';
import {createExpansionCourse,stepExpansionCourse,checkpointExpansionCourse,restoreExpansionCourse,sweepCrystalTerrain,damageCrystalTerrain,constrainCrystalActor,solidCrystalCover,createExpansionBoss,stepExpansionBoss,checkpointExpansionBoss,restoreExpansionBoss,applyCrystalTerrainActions,EXPANSION_RUNTIME_LIMITS as LIMIT} from '../src/act-expansion-runtime.js';
import {EXPANSION_ACTS} from '../src/act-expansion.js';

const copy=value=>JSON.parse(JSON.stringify(value));
const laws=['burst','orbit','reflect','pierce','gravity','chain','frost','split','recall'];
assert.equal(typeof EXPANSION_ACTS.crosswind.released,'boolean');
assert.equal(typeof EXPANSION_ACTS.crystalGorge.released,'boolean');

// Horizontal movement and scroll are actual world progress, not camera-relative
// projectile motion. Rear entries require a later room and a readable warning.
const room=createExpansionCourse('crosswind',{seed:452,room:0,origin:{x:20,z:0}});
let front=0,rear=0,maxSpawns=0;
for(let i=0;i<700;i++){
 const o=stepExpansionCourse(room,.05,{player:{x:20+i*.12,z:0}});
 maxSpawns=Math.max(maxSpawns,o.spawns.length);
 for(const e of o.spawns){if(e.side==='rear')rear++;else front++;assert.equal(e.shots,1);assert.ok(e.position.x>o.camera.x+4&&e.position.x<o.camera.x+5);}
}
assert.ok(front>10);assert.equal(rear,0);assert.equal(room.distance,699*.12);assert.ok(maxSpawns<=LIMIT.spawnsPerStep);
const sequel=createExpansionCourse('crosswind',{room:2,seed:452});
for(let i=0;i<750;i++)for(const e of stepExpansionCourse(sequel,.05,{player:{x:0,z:0}}).spawns)if(e.side==='rear'){rear++;assert.ok(e.windup>=1);assert.ok(e.position.x<-6&&e.position.x>-7);}
assert.ok(rear>0);
const full=createExpansionCourse('crosswind',{room:4});
for(let i=0;i<400;i++)assert.equal(stepExpansionCourse(full,.05,{enemyCount:24}).spawns.length,0);
const resumedWave=stepExpansionCourse(full,15,{enemyCount:0});assert.ok(resumedWave.spawns.length<=2);assert.ok(full.time<21,'background dt cannot create catch-up minutes');
const endpoint=createExpansionCourse('crosswind');let endEvents=0;
for(let i=0;i<1500;i++)endEvents+=stepExpansionCourse(endpoint,.1,{travel:.1}).events.filter(e=>e.type==='course-end').length;
assert.equal(endpoint.distance,96);assert.equal(endEvents,1);assert.equal(stepExpansionCourse(endpoint,.05).spawns.length,0);

// Canyon completion requires time under pressure AND physically crossing the
// exit. Advancing its timer alone must never silently clear a stationary run.
const canyon=createExpansionCourse('crystalGorge',{room:4,origin:{x:17,z:11}});
for(let i=0;i<400;i++)assert(!stepExpansionCourse(canyon,.1,{player:{x:17,z:18}}).finish);
assert.equal(canyon.distance,0);
const crossed=stepExpansionCourse(canyon,.1,{player:{x:17,z:4}});
assert(crossed.finish);assert.equal(crossed.events.filter(e=>e.type==='course-end').length,1);
const retreat=stepExpansionCourse(canyon,.1,{player:{x:17,z:18}});
assert(retreat.finish);assert.equal(retreat.events.length,0);assert.equal(retreat.spawns.length,0);
const rush=createExpansionCourse('crystalGorge');
for(let i=0;i<210;i++)assert(!stepExpansionCourse(rush,.1,{player:{x:0,z:-8}}).finish);
let rushEnd=false;for(let i=0;i<20;i++)rushEnd ||= stepExpansionCourse(rush,.1,{player:{x:0,z:-8}}).finish;
assert(rushEnd);assert.equal(rush.distance,14);
assert.equal(restoreExpansionCourse({...checkpointExpansionCourse(rush),distance:1e9}).distance,14);

// Mid-room clock/random/spawn progression and exact broken routes survive JSON.
for(const act of ['crosswind','crystalGorge']){
 const original=createExpansionCourse(act,{room:3,seed:124});
 for(let i=0;i<123;i++)stepExpansionCourse(original,.05,{travel:.08});
 if(original.walls.length){original.walls[0].hp=0;original.walls[0].broken=true;original.walls[1].hp=37;}
 const restored=restoreExpansionCourse(copy(checkpointExpansionCourse(original)));
 for(let i=0;i<210;i++)assert.deepEqual(copy(stepExpansionCourse(original,.05,{travel:.08})),copy(stepExpansionCourse(restored,.05,{travel:.08})));
 assert.deepEqual(checkpointExpansionCourse(original),checkpointExpansionCourse(restored));
}
const corrupted=restoreExpansionCourse({version:1,act:'crystalGorge',room:99,time:NaN,distance:Infinity,spawnIndex:-3,walls:[{id:'crystal-4-0',hp:-200},{id:'crystal-4-1',hp:1e99},{id:'unrelated',hp:0}]});
assert.equal(corrupted.room,4);assert.equal(corrupted.time,0);assert.equal(corrupted.spawnIndex,0);assert.equal(corrupted.walls[0].broken,true);assert.equal(corrupted.walls[1].hp,corrupted.walls[1].maxHp);

// Every original law opens a route with damage; no law is a compulsory key.
for(const law of laws){
 const s=createExpansionCourse('crystalGorge',{room:0,encounterVersion:1}),wall=s.walls[0];
 for(let i=0;i<20&&!wall.broken;i++)sweepCrystalTerrain(s.walls,{x:-7,z:-5},{x:0,z:-5},{damage:10,law});
 assert.equal(wall.broken,true,law);assert.equal(solidCrystalCover(s.walls).some(o=>o.id===wall.id),false,law);
}
const spear=createExpansionCourse('crystalGorge',{encounterVersion:1});
const across=sweepCrystalTerrain(spear.walls,{x:-8,z:-5},{x:8,z:-5},{damage:11,law:'pierce'});
assert.equal(across.blocked,false);assert.equal(across.hits.length,2);assert.equal(spear.walls[0].hp,109);assert.equal(spear.walls[1].hp,109);
const reflect=createExpansionCourse('crystalGorge',{encounterVersion:1});
const bounce=sweepCrystalTerrain(reflect.walls,{x:-8,z:-5},{x:8,z:-5},{damage:0,law:'reflect',maxBounces:2});assert.ok(bounce.blocked&&bounce.reflected);assert.ok(bounce.point.x<-3.6);assert.equal(bounce.dir.x,-1);
assert.equal(sweepCrystalTerrain(reflect.walls,{x:-8,z:-5},{x:8,z:-5},{damage:0,law:'reflect',maxBounces:2,bounces:2}).reflected,false);
const explosion=createExpansionCourse('crystalGorge',{encounterVersion:1});assert.equal(damageCrystalTerrain(explosion.walls,{x:-3,z:-5},.4,20,'burst')[0].damage,30);
const actor={x:8,z:-5};constrainCrystalActor(actor,.45,reflect.walls,{x:-8,z:-5});assert.ok(actor.x<-4,'fast actor cannot cross a crystal between frames');
const overlap={x:-3,z:-5};constrainCrystalActor(overlap,.45,reflect.walls);assert.ok(Math.abs(overlap.x+3)>1||Math.abs(overlap.z+5)>1,'saved overlapping actor is ejected');

function simulateBoss(id,{steps=5000,hpRatio=.22,checkpointAt=-1,full=false}={}){
 let s=createExpansionBoss(id,{seed:465}),position={x:8,z:0};const terrain=createExpansionCourse('crystalGorge',{room:4});
 for(const w of terrain.walls){w.broken=true;w.hp=0;}
 let live=[],count=0,peak=0,largest=0;const seen=new Set(),tells=new Map(),firstShot=new Map(),recoveries=new Set(),contacts=new Set(),trace=[];
 for(let i=0;i<steps;i++){
  const player={x:0,z:Math.sin(i*.008)*4.2};live=live.filter(e=>(e.life-=.05)>0);
  const o=stepExpansionBoss(s,.05,{position,player,walls:terrain.walls,activeProjectiles:full?48:live.length,hpRatio});
  position.x+=o.move.x;position.z+=o.move.z;
  assert.ok(o.bolts.length<=LIMIT.boltsPerStep);assert.ok(o.terrain.length<=3);assert.ok(o.telegraphs.length<=3);
  for(const e of o.events){if(e.type==='boss-tell'){seen.add(e.pattern);tells.set(s.sequence,{time:i*.05,duration:e.duration});}if(e.type==='boss-recovery'){recoveries.add(e.pattern);assert.ok(e.duration>=1.15);}}
  if(o.bolts.length&&!firstShot.has(s.sequence)){firstShot.set(s.sequence,i*.05);const t=tells.get(s.sequence);assert.ok(t&&i*.05-t.time+.0001>=t.duration,`${id}: no shot before its tell`);}
  for(const q of o.bolts){assert.ok(Number.isFinite(q.dir.x)&&Number.isFinite(q.dir.z));assert.ok(Math.abs(Math.hypot(q.dir.x,q.dir.z)-1)<1e-8);assert.ok(q.spec.speed<=8);assert.ok(q.spec.life<=4.2);live.push({life:q.spec.life});count++;trace.push({i,bolt:copy(q)});}
  for(const c of o.contacts){contacts.add(c.hitId);assert.ok(c.radius===1.05&&c.damage===24);}
  applyCrystalTerrainActions(terrain.walls,o.terrain);peak=Math.max(peak,live.length);largest=Math.max(largest,o.bolts.length);
  if(i===checkpointAt)s=restoreExpansionBoss(copy(checkpointExpansionBoss(s)),id);
  if(i%13===0)trace.push({state:s.state,pattern:s.pattern,timer:s.timer,sequence:s.sequence,position:{...position},shots:count,walls:terrain.walls.map(w=>w.hp)});
 }
 return {s,count,peak,largest,seen,recoveries,contacts,trace};
}
for(const id of ['crosswindKeeper','crystalGardener']){
 const original=simulateBoss(id),resumed=simulateBoss(id,{checkpointAt:233});
 assert.deepEqual(resumed.trace,original.trace,`${id}: checkpoint replays same future`);
 const short=simulateBoss(id,{steps:600});
 for(const checkpointAt of [32,48,97,112,173,198])assert.deepEqual(simulateBoss(id,{steps:600,checkpointAt}).trace,short.trace,`${id}: tell/commit/recovery save at ${checkpointAt}`);
 assert.equal(original.seen.size,3);assert.equal(original.recoveries.size,3);assert.ok(original.count>100);assert.ok(original.count<1250,'finite sustained firing rate');assert.ok(original.peak<=48);assert.ok(original.largest<=8);
 const saturated=simulateBoss(id,{full:true});assert.equal(saturated.count,0);assert.equal(saturated.seen.size,3,'saturation does not deadlock progression');
 const pause=createExpansionBoss(id);stepExpansionBoss(pause,900,{position:{x:8,z:0},player:{x:0,z:0}});assert.ok(pause.timer>=1.09);
 console.log(`${id}: ${original.count} bolts / 250 s, peak ${original.peak}, max per step ${original.largest}, 3 tells + recoveries, save/resume deterministic`);
}
assert.ok(simulateBoss('crosswindKeeper',{steps:600}).contacts.size>0);

// Regrowth cannot seal the central lane and is rechecked after the player moves
// into a warned tile. Open core exposes damage bonus only in commit/recovery.
const walls=createExpansionCourse('crystalGorge',{room:2}).walls;for(const w of walls){w.hp=0;w.broken=true;}
const gardener=createExpansionBoss('crystalGardener');gardener.sequence=1;gardener.timer=.01;
let o=stepExpansionBoss(gardener,.05,{position:{x:8,z:0},player:{x:0,z:0},walls});assert.equal(gardener.regrow.length,3);const chosen=walls.find(w=>w.id===gardener.regrow[0]);
while(gardener.state==='tell')stepExpansionBoss(gardener,.05,{position:{x:8,z:0},player:chosen,walls});
o=stepExpansionBoss(gardener,.05,{position:{x:8,z:0},player:chosen,walls});assert.equal(o.terrain.some(a=>a.id===chosen.id),false);assert.ok(o.terrain.every(a=>Math.abs(walls.find(w=>w.id===a.id).x)>=2.5));
const core=createExpansionBoss('crystalGardener');core.sequence=2;core.timer=.01;
stepExpansionBoss(core,.05,{position:{x:8,z:0},player:{x:0,z:3.4}});
assert.equal(stepExpansionBoss(core,.05,{position:{x:8,z:0},player:{x:0,z:3.4}}).coreOpen,false);
while(core.state==='tell')stepExpansionBoss(core,.05,{position:{x:8,z:0},player:{x:0,z:3.4}});
o=stepExpansionBoss(core,.05,{position:{x:8,z:0},player:{x:0,z:3.4}});assert.equal(o.coreOpen,true);assert.ok(o.bolts.every(q=>Math.abs(q.position.z-3.4)>=1.65));
console.log('Act 4/5 runtime: world progress, bounded pacing, nine-law swept terrain, checkpoint replay, finite distinct boss patterns passed. Mode adapters/visuals/device QA are not part of this test.');
