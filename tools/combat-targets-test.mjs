import assert from 'node:assert/strict';
import {performance} from 'node:perf_hooks';
import {Vector3} from 'three';
import {createNearestTargetPicker} from '../src/combat-targets.js';

const actor=(id,x,y,z,hp=10,dead=false)=>({id,hp,dead,g:{position:new Vector3(x,y,z)}});
const source=actor('source',0,0,0);
const legacy=(enemies,origin,radius,count,requireHp=true)=>enemies
 .filter(e=>e!==origin&&(requireHp?e.hp>0:!e.dead)&&e.g.position.distanceTo(origin.g.position)<radius)
 .sort((a,b)=>a.g.position.distanceTo(origin.g.position)-b.g.position.distanceTo(origin.g.position)).slice(0,count);
const ids=rows=>rows.map(row=>row.id);
const pick=createNearestTargetPicker(),formPick=createNearestTargetPicker({requireHp:false});
const boundary=[source,actor('first',1,0,0),actor('equal',-1,0,0),actor('above',0,1,0),actor('edge',2,0,0),actor('no-hp',.1,0,0,0),actor('dead-but-positive',.2,0,0,5,true)];
for(const count of [0,1,2,4,100,Infinity])for(const requireHp of [true,false]){
 assert.deepEqual(ids((requireHp?pick:formPick)(boundary,source,2,count)),ids(legacy(boundary,source,2,count,requireHp)));
}
assert.deepEqual(ids(pick(boundary,source,2,4)),['dead-but-positive','first','equal','above'],'stable ties, strict range and existing hp-based eligibility');
const reusable=pick(boundary,source,2,3);
assert.equal(pick(boundary,source,2,1),reusable,'result array reused');
assert.equal(pick([],source,2,3),reusable);
assert.equal(reusable.length,0,'removed enemies do not stay referenced');
let seed=97131;
const rng=()=>((seed=(Math.imul(seed,1664525)+1013904223)>>>0)/2**32);
for(let trial=0;trial<1200;trial++){
 const origin=actor('source',rng()*8-4,rng()*3,rng()*8-4),size=Math.floor(rng()*301),radius=.1+rng()*20,count=Math.floor(rng()*16);
 const enemies=Array.from({length:size},(_,i)=>actor(i,rng()*30-15,rng()*5,rng()*30-15,rng()<.2?0:10,rng()<.12));
 enemies.splice(Math.floor(size/2),0,origin);
 for(const requireHp of [true,false])assert.deepEqual(ids((requireHp?pick:formPick)(enemies,origin,radius,count)),ids(legacy(enemies,origin,radius,count,requireHp)),`crowd${trial}/${requireHp}`);
 if(enemies.length>1){enemies[0].g.position.copy(origin.g.position);assert.deepEqual(ids(pick(enemies,origin,radius,count)),ids(legacy(enemies,origin,radius,count)));}
}
// A fixed crowded combat workload, not a device/GPU or battery measurement.
const crowd=Array.from({length:300},(_,i)=>actor(i,rng()*16-8,rng()*.2,rng()*16-8));
const measure=fn=>{let checksum=0;const before=performance.now();for(let i=0;i<8000;i++){const result=fn(crowd,source,7,6);checksum+=result[0]?.id||0;}return {ms:+(performance.now()-before).toFixed(2),checksum};};
for(let i=0;i<1000;i++){legacy(crowd,source,7,6);pick(crowd,source,7,6);}
const before=measure(legacy),after=measure(pick);assert.equal(after.checksum,before.checksum);
console.log(JSON.stringify({cases:2400,crowd:300,calls:8000,before,after,cpuRatio:+(before.ms/after.ms).toFixed(2),physicalDevice:false}));
console.log('Nearest chain targets preserve legacy selection/order with a reusable bounded result.');
