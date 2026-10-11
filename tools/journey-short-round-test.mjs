import assert from 'node:assert/strict';
import {createExpansionCourse,stepExpansionCourse,checkpointExpansionCourse,restoreExpansionCourse,EXPANSION_COURSE_PACKETS,EXPANSION_CIRCUIT_KILLS} from '../src/act-expansion-runtime.js';
import {EXPANSION_ACTS} from '../src/act-expansion.js';
import {ACT3_PRESSURE,act3RoomPressure,act3ReinforcementSpawn,ACT3_ARENA} from '../src/act3.js';
import {insideArena} from '../src/arena.js';

// Runtime contract probes, not a player/boss-clear or physical-device benchmark.
const dt=.05,copy=v=>JSON.parse(JSON.stringify(v)),traces=[];
for(let room=0;room<5;room++){
 const s=createExpansionCourse('crosswind',{room,seed:413}),length=EXPANSION_ACTS.crosswind.rooms[room].length,times=[],distances=[];
 // Deliberate advance with substantial dodge time: 2.4 units/sec is below
 // half the shipping 6.09-unit/sec movement speed, not an injected victory.
 while(s.time<100){
  const x=s.time*2.4,o=stepExpansionCourse(s,dt,{player:{x,z:Math.sin(s.time)*2.8},enemyCount:0,projectileCount:0});
  if(o.spawns.length){times.push(s.time);distances.push(s.distance);assert(o.spawns.length<=2);for(const e of o.spawns){assert(e.behavior==='crosswind');assert(e.shots===1);assert(e.windup>=.7);}}
  if(o.finish)break;
 }
 assert(s.finishAnnounced);assert(times[0]<.6,'first visible entry is prompt');
 assert(distances.at(-1)>=length*.89,`room ${room}: pressure extends to the exit approach`);
 const gaps=times.slice(1).map((t,i)=>t-times[i]);
 assert(Math.max(...gaps)<4,`room ${room}: advancing cannot create long empty packet gaps`);
 assert.equal(s.spawnIndex,EXPANSION_COURSE_PACKETS[room]);
 traces.push({room:room+1,length,lastEntry:Number(times.at(-1).toFixed(2)),finish:Number(s.time.toFixed(2)),maxEntryGap:Number(Math.max(...gaps).toFixed(2))});
}

// Distance and elapsed pressure independently release packets. Standing still
// cannot clear or farm indefinitely; saturation spends no scoring budget.
const stopped=createExpansionCourse('crosswind',{seed:101});let count=0;
for(let i=0;i<2000;i++)count+=stepExpansionCourse(stopped,dt,{player:{x:0,z:0}}).spawns.length;
assert.equal(stopped.spawnIndex,EXPANSION_COURSE_PACKETS[0]);assert.equal(count,27);assert(!stopped.finishAnnounced);assert.equal(stopped.distance,0);
for(let i=0;i<200;i++)assert.equal(stepExpansionCourse(stopped,dt).spawns.length,0);
const capped=createExpansionCourse('crosswind',{room:3,seed:101});
for(let i=0;i<600;i++)assert.equal(stepExpansionCourse(capped,dt,{player:{x:50,z:0},enemyCount:24}).spawns.length,0);
assert.equal(capped.spawnIndex,0);
assert(stepExpansionCourse(capped,20,{player:{x:50,z:0}}).spawns.length<=2,'background/resume cannot release catch-up waves');

// A checkpoint in the middle of a distance hold must keep identical future
// random draws, packets and clocks after JSON restore, with no schema change.
const holding=createExpansionCourse('crosswind',{room:2,seed:241});
for(let i=0;i<80;i++)stepExpansionCourse(holding,dt,{player:{x:0,z:0}});
assert.equal(holding.spawnIndex,3);assert.equal(holding.spawnClock,0);
const saved=checkpointExpansionCourse(holding),restored=restoreExpansionCourse(copy(saved));
assert.deepEqual(checkpointExpansionCourse(restored),saved);
for(let i=0;i<1000;i++){
 const c={player:{x:i*.07,z:1},enemyCount:i%80<10?24:0,projectileCount:i%91<8?48:0};
 assert.deepEqual(copy(stepExpansionCourse(holding,dt,c)),copy(stepExpansionCourse(restored,dt,c)));
}
assert.equal(EXPANSION_CIRCUIT_KILLS,166,'existing ranking ceiling remains unchanged');
// Legacy v1 retains its immediate clock-driven wave scheduling and geometry.
const legacy=createExpansionCourse('crosswind',{encounterVersion:1,seed:3});
for(let i=0;i<100;i++)stepExpansionCourse(legacy,dt,{player:{x:0,z:0}});
assert(legacy.spawnIndex>=3);assert(!Object.hasOwn(checkpointExpansionCourse(legacy),'encounterVersion'));
assert.deepEqual(checkpointExpansionCourse(restoreExpansionCourse(checkpointExpansionCourse(legacy))),checkpointExpansionCourse(legacy));

assert.deepEqual([0,1,2,3,4].map(i=>act3RoomPressure(i).projectileCapNormal),[32,40,38,44,48]);
assert.equal(ACT3_PRESSURE.projectileCapNormal,48);
for(let i=0;i<28;i++){
 const p=act3ReinforcementSpawn(i);assert(insideArena(p,.5,ACT3_ARENA));assert(Math.abs(p.x)<=6.6);
}
console.log(JSON.stringify({ok:true,traces,stationaryActors:count,rankingKillCeiling:EXPANSION_CIRCUIT_KILLS,straightTravelSeconds:EXPANSION_ACTS.crosswind.rooms.reduce((n,r)=>n+r.length,0)/6.09},null,2));
