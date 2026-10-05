import assert from 'node:assert/strict';
import {createExpansionCourse,stepExpansionCourse,checkpointExpansionCourse,restoreExpansionCourse,constrainCrystalActor,sweepCrystalTerrain,damageCrystalTerrain} from '../src/act-expansion-runtime.js';

for(const act of ['crosswind','crystalGorge']){
 const player={x:0,z:act==='crosswind'?0:7},fresh=createExpansionCourse(act),old=createExpansionCourse(act,{encounterVersion:1});
 const sample=s=>{let count=0,distances=[];for(let i=0;i<100;i++)for(const e of stepExpansionCourse(s,.1,{player}).spawns){count++;distances.push(Math.hypot(e.position.x-player.x,e.position.z-player.z));assert(e.windup>=.7);assert(e.shots<=2);}return{count,distances};};
 const a=sample(fresh),b=sample(old);assert(a.count>=b.count*1.8,`${act}: pressure arrives frequently without raising the live cap`);assert(Math.max(...a.distances)<9);assert(Math.min(...a.distances)>4.5);
 const raw=checkpointExpansionCourse(old);assert(!Object.hasOwn(raw,'encounterVersion'));const restored=restoreExpansionCourse(JSON.parse(JSON.stringify(raw)));assert.deepEqual(checkpointExpansionCourse(restored),raw,'old exact checkpoint remains valid without reinterpreting wall positions or spent packet IDs');
 const newRaw=checkpointExpansionCourse(fresh);assert.equal(newRaw.encounterVersion,2);assert.deepEqual(checkpointExpansionCourse(restoreExpansionCourse(JSON.parse(JSON.stringify(newRaw)))),newRaw);
}
// Central crossings are obstructed; an outer route remains usable. Destroying
// ONE central crystal immediately opens the short path instead of deleting scenery.
for(let room=0;room<5;room++){
 const s=createExpansionCourse('crystalGorge',{room}),w=s.walls[2],from={x:w.x,z:w.z+1.3},to={x:w.x,z:w.z-1.2};
 const body={...to};constrainCrystalActor(body,.4,s.walls,from);assert(body.z>w.z+.9,'intact gate stops the real swept player path');
 const blocked=sweepCrystalTerrain(s.walls,from,to,{damage:0});assert(blocked.blocked,'intact gate is real projectile cover');
 const side={x:6.5,z:-7};constrainCrystalActor(side,.4,s.walls,{x:6.5,z:7});assert.equal(side.z,-7,'longer outer route remains open to every build');
 const ids=s.walls.map(w=>w.id),before=s.walls.map(w=>w.hp);damageCrystalTerrain(s.walls,{x:w.x,z:w.z},.05,w.hp,'frost');assert(w.broken);assert(s.walls.every((other,i)=>other===w||other.hp===before[i]),'one opening does not erase the whole maze');
 const open={...to};constrainCrystalActor(open,.4,s.walls,from);assert.equal(open.z,to.z);assert(!sweepCrystalTerrain(s.walls,from,to,{damage:0}).blocked);
 const resumed=restoreExpansionCourse(JSON.parse(JSON.stringify(checkpointExpansionCourse(s))));assert.deepEqual(resumed.walls.map(w=>w.id),ids);assert(resumed.walls[2].broken);assert.equal(resumed.walls[2].x,w.x);assert.equal(resumed.walls[2].z,w.z);
}
// Saturation spends no packets and reopening never emits a queued swarm.
const capped=createExpansionCourse('crosswind');for(let i=0;i<1000;i++)assert.equal(stepExpansionCourse(capped,30,{enemyCount:24}).spawns.length,0);assert.equal(capped.spawnIndex,0);
assert(stepExpansionCourse(capped,30,{player:{x:0,z:0}}).spawns.length<=2);
console.log('Fresh 4/5 encounters: near warned pressure, finite density, actual crystal shortcut/cover/outer detour, one-wall opening, versioned old/new checkpoint geometry and saturated resume passed. CPU geometry only; device/balance QA separate.');
