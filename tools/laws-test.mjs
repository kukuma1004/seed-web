import assert from 'node:assert/strict';
import * as THREE from 'three';
import {LAWS,offerLaws,hitBudget,acquireTarget,synergyHint} from '../src/laws.js';
import {createSeedEvolution} from '../src/evolution.js';
import {safeSpawn,CROWD_TOTALS,CROWD_CAP} from '../src/crowd.js';
import {ROOMS} from '../src/journey.js';
import {segmentHitsCover} from '../src/collision.js';
assert.equal(Object.keys(LAWS).length,10);
const seen=new Set();for(let i=0;i<100;i++){const held=[],upgrades=[];for(let pick=0;pick<8;pick++){
 const offered=offerLaws(held,upgrades,{mutation:pick===7});assert.ok(offered.length>0&&offered.length<=3);assert.equal(new Set(offered).size,offered.length);
 offered.forEach(id=>{assert.ok(LAWS[id]);assert.ok(!upgrades.includes(id));seen.add(id);});
 const id=offered.find(id=>!held.includes(id))||offered[0];if(held.includes(id))upgrades.push(id);else held.push(id);assert.ok(held.length<=5);
}}
assert.equal(seen.size,10);assert.equal(hitBudget(new Set(['pierce']),new Set()),3);assert.equal(hitBudget(new Set(['pierce']),new Set(['pierce'])),5);
assert.ok(synergyHint('gravity',['burst']).includes('폭발'));
const player=new THREE.Vector3(),enemies=[{g:{position:new THREE.Vector3(1,0,0)}},{g:{position:new THREE.Vector3(0,0,3)}}];
assert.equal(acquireTarget(player,enemies,[{x:.5,z:0,w:.2,d:1}],segmentHitsCover),enemies[1]);
enemies[1].dead=true;assert.equal(acquireTarget(player,enemies,[{x:.5,z:0,w:.2,d:1}],segmentHitsCover),null);
for(const room of ROOMS)for(let i=0;i<20;i++){const p=safeSpawn({x:0,z:5},room.covers,i);assert.ok(p);assert.ok(Math.hypot(p.x,p.z-5)>4);assert.equal(segmentHitsCover(p,p,room.covers,.65),false);}
assert.equal(CROWD_TOTALS.reduce((a,b)=>a+b,0),90);assert.equal(CROWD_CAP,14);
const actor=new THREE.Group(),growth=createSeedEvolution(actor),initial=actor.children.length;
for(const id of Object.keys(LAWS)){growth.reset();growth.select([id]);growth.update(.02,1,true,.5);assert.deepEqual(growth.state().visible,[id]);assert.equal(actor.children.length,initial);}
console.log('Ten law offers, build capacity, mutations, synergies, visible forms, automatic target occlusion and safe crowd spawns passed.');
