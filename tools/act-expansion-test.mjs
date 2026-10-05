import assert from 'node:assert/strict';
import {EXPANSION_ACTS,expansionCircuitReleased,publicCircuitActCount,crosswindFormation,createCrystalWalls,hitCrystalWall,restoreCrystalWalls} from '../src/act-expansion.js';
import {closedExpansionActs,openExpansionActs} from './expansion-gate-fixtures.mjs';
// The opening has no ambush or dense fan, later rear shots give more warning.
for(let i=0;i<36;i++){assert.equal(crosswindFormation(i,0).side,'front');assert.equal(crosswindFormation(i,0).shots,1);}
assert.equal(crosswindFormation(5,1).side,'rear');assert.ok(crosswindFormation(5,1).windup>crosswindFormation(4,1).windup);
assert.equal(Array.from({length:90},(_,i)=>crosswindFormation(i,3)).filter(e=>e.type==='charger').length,10);
// Any law can open a route. A piercing build can pass an intact obstacle,
// reflection can use it, explosion can open it faster without a mandatory pick.
for(const law of ['orbit','chain','frost','split','recall','gravity','pierce','reflect','burst']){
 const wall=createCrystalWalls(2)[0];for(let i=0;i<20&&!wall.broken;i++)hitCrystalWall(wall,20,law);
 assert.ok(wall.broken,`${law} opens a path`);assert.equal(wall.hp,0);assert.equal(hitCrystalWall(wall,40,law).damage,0);
}
const wall=createCrystalWalls(0)[0];assert.equal(hitCrystalWall(wall,10,'pierce').passes,true);assert.equal(wall.broken,false);
assert.equal(hitCrystalWall(wall,10,'reflect').reflects,true);
const walls=createCrystalWalls(4);hitCrystalWall(walls[0],500,'burst');hitCrystalWall(walls[1],15,'chain');
assert.deepEqual(restoreCrystalWalls(4,JSON.parse(JSON.stringify(walls))),walls);
assert.equal(restoreCrystalWalls(0,[{id:'crystal-0-0',hp:-99}])[0].broken,true);
assert.equal(restoreCrystalWalls(0,[{id:'crystal-0-1',hp:Infinity}])[1].hp,120);
assert.equal(typeof EXPANSION_ACTS.crosswind.released,'boolean');assert.equal(typeof EXPANSION_ACTS.crystalGorge.released,'boolean');
for(const acts of [closedExpansionActs,{...openExpansionActs,crosswind:closedExpansionActs.crosswind},{...openExpansionActs,crystalGorge:closedExpansionActs.crystalGorge}]){
 assert.equal(expansionCircuitReleased(acts),false);assert.equal(publicCircuitActCount(acts),3);
}
assert.equal(expansionCircuitReleased(openExpansionActs),true);assert.equal(publicCircuitActCount(openExpansionActs),5);
assert.ok(createCrystalWalls(4).length<=EXPANSION_ACTS.crystalGorge.budget.breakableWalls);
console.log('Act expansion: forward/rear warning, build counterplay, bounded walls, checkpoint restoration passed; mode integration pending.');
