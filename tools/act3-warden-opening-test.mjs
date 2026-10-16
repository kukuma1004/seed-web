import assert from 'node:assert/strict';
import * as THREE from 'three';
import {ACT3_MATERIALS,createAct3Warden,tickAct3Warden,createTempestCarrier,tickTempestCarrier} from '../src/act3-enemies.js';
import {ACT3_ARENA} from '../src/act3.js';
import {constrainToArena} from '../src/arena.js';

const scene=new THREE.Scene(),warden=createAct3Warden(scene),player=new THREE.Vector3(3,0,4),shots=[];
warden.g.position.set(-2,0,-4);warden.timer=0;
const context={player,collide:(p,r)=>constrainToArena(p,r,ACT3_ARENA),hit(){},bolt:(p,d,spec)=>shots.push({...spec}),sound(){}};
const objects=[],geometries=[],materials=[];scene.traverse(o=>{objects.push(o);if(o.geometry)geometries.push(o.geometry);if(o.material)materials.push(o.material);});
const fixedGeometry=warden.tell.geometry,fixedLine=warden.line.geometry,body=warden.body;
let recoveries=0,warningAfterRecovery=0,previous='',green=false;const patterns=new Set();
for(let frame=0;frame<3000;frame++){
 tickAct3Warden(warden,1/60,frame/60,context);
 if(warden.state==='recover'&&warden.timer>0){
  assert(warden.tell.visible);assert.equal(warden.tell.material,ACT3_MATERIALS.opening);assert.equal(warden.tell.scale.x,1.3);assert(!warden.line.visible);green=true;
  if(previous!=='recover'){recoveries++;patterns.add(warden.pattern);}
 }else{
  assert.equal(warden.tell.material,ACT3_MATERIALS.bossWarning,'every next warning restores hostile material');
  if(warden.state==='tell'){
   if(green){warningAfterRecovery++;green=false;}
   if(previous==='tell')assert.equal(warden.tell.visible,warden.pattern!==1,'charge uses its actual line, other attacks use hostile ring');
  }else assert(!warden.tell.visible,'stalking or committed charges never borrow the recovery ring');
 }
 assert.equal(warden.tell.geometry,fixedGeometry);assert.equal(warden.line.geometry,fixedLine);assert.equal(warden.body,body);assert.equal(warden.tell.parent,warden.g,'ground cue stays outside the banking visual body');
 previous=warden.state;
}
assert(recoveries>=9&&warningAfterRecovery>=8);assert.deepEqual([...patterns].sort(),[0,1,2]);assert(shots.length>0);
const after=[];scene.traverse(o=>after.push(o));assert.deepEqual(after,objects,'3,000 actual AI frames reuse the same object pool');assert.equal(new Set(geometries).size,3);assert.equal(new Set(materials).size,2);
// Johan retains his own phase/barrage rules and hostile tell. The new opening
// belongs to the ordinary fifth-room warden, never the boss damage budget.
const boss=createTempestCarrier(new THREE.Scene());boss.g.position.set(0,0,-2);boss.state='recover';boss.timer=.4;
tickTempestCarrier(boss,1/60,0,context);assert(!boss.tell.visible);assert.equal(boss.tell.material,ACT3_MATERIALS.bossWarning);
console.log('Act3 warden opening PASS: actual three attack/recovery cycles, green only during genuine recovery, hostile warning material restored, 3,000 fixed-object frames and unchanged Johan tell. Engine/Three evidence, not native play.');
