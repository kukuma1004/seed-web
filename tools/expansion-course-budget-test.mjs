import assert from 'node:assert/strict';
import {EXPANSION_COURSE_PACKETS,EXPANSION_CIRCUIT_KILLS,createExpansionCourse,stepExpansionCourse,checkpointExpansionCourse,restoreExpansionCourse} from '../src/act-expansion-runtime.js';
assert.equal(EXPANSION_CIRCUIT_KILLS,166);
for(const act of ['crosswind','crystalGorge']){
 let total=1;
 for(let room=0;room<5;room++){
  let course=createExpansionCourse(act,{room,seed:19}),kills=0;
  for(let n=0;n<6000;n++){
   const output=stepExpansionCourse(course,.1,{player:{x:0,z:0},enemyCount:0,projectileCount:0});kills+=output.spawns.length;assert(!output.finish,'budget exhaustion cannot replace physically crossing');
   if(n===90)course=restoreExpansionCourse(JSON.parse(JSON.stringify(checkpointExpansionCourse(course))));
  }
  assert.equal(course.spawnIndex,EXPANSION_COURSE_PACKETS[room]);assert.equal(kills,EXPANSION_COURSE_PACKETS[room]+Math.floor(EXPANSION_COURSE_PACKETS[room]/2));total+=kills;
  const old=checkpointExpansionCourse(course),restored=restoreExpansionCourse({...old,spawnIndex:old.spawnIndex+20});
  assert.deepEqual(checkpointExpansionCourse(restored),{...old,spawnIndex:old.spawnIndex+20},'previous inspector progress is not clamped away');
  assert.equal(stepExpansionCourse(restored,.1,{player:{x:0,z:0}}).spawns.length,0);
  const crossing=stepExpansionCourse(course,.1,{player:act==='crosswind'?{x:1000,z:0}:{x:0,z:-8}});assert(crossing.finish);assert.equal(crossing.spawns.length,0);
 }
 assert.equal(total,EXPANSION_CIRCUIT_KILLS);
}
const capped=createExpansionCourse('crosswind',{room:4});
for(let n=0;n<2000;n++)assert.equal(stepExpansionCourse(capped,.1,{enemyCount:24}).spawns.length,0);
assert.equal(capped.spawnIndex,0);let emitted=0;for(let n=0;n<20;n++){const out=stepExpansionCourse(capped,.1,{enemyCount:0});assert(out.spawns.length<=2);emitted+=out.spawns.length;}assert(emitted>0&&emitted<=5,'capacity reopens at the regular bounded packet cadence, without a missed-wave burst');
console.log('Both expansion courses: exact 166-kill fresh circuit budget, crossing still required, stationary farming cap, JSON resume, preserved older progress and no saturated catch-up passed.');
