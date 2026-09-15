import assert from 'node:assert/strict';
import * as THREE from 'three';
import {createVFX} from '../src/vfx.js';

for(const mobile of [false,true]){
  const scene=new THREE.Scene(),fx=createVFX(scene,{mobile,random:()=>.5});
  const root=scene.children[0],meshes=[...root.children],a=new THREE.Vector3(1,0,2),b=new THREE.Vector3(4,0,3),dir=new THREE.Vector3(0,0,-1);
  const beforeA=a.clone(),beforeB=b.clone();
  for(let i=0;i<70;i++){
    fx.impact(a,'reflect',true);fx.explosion(a,'burst',1.6,true);fx.reflect(a,dir);fx.split(a,dir,5);fx.arc(a,b);fx.dash(a,.3);fx.evolution(a,'chain');fx.trail(a,b);
  }
  fx.update(.016);
  assert.deepEqual(a,beforeA);assert.deepEqual(b,beforeB,'VFX must never move gameplay objects');
  assert.deepEqual(root.children,meshes,'Effects must reuse five GPU batches');
  assert.ok(fx.state().events.flame>0&&fx.state().events.explosion>0,'Explosions add a bounded flame crown');
  assert.ok(fx.state().active<=fx.state().capacity);
  for(const mesh of meshes){
    assert.equal(mesh.castShadow,false);assert.equal(mesh.material.depthWrite,false);
    assert.ok([...mesh.instanceMatrix.array].every(Number.isFinite));
  }
  for(let i=0;i<160;i++)fx.update(.016);
  assert.equal(fx.state().active,0,'All effects, including delayed evolution rays, must expire');
  fx.evolution(a,'split');fx.clear();fx.update(1);assert.equal(fx.state().active,0,'Clear cancels delayed effects across rooms/restarts');
  const disposed=[];for(const mesh of meshes){mesh.geometry.addEventListener('dispose',()=>disposed.push('geometry'));mesh.material.addEventListener('dispose',()=>disposed.push('material'));}
  fx.dispose();assert.equal(scene.children.length,0);assert.equal(disposed.length,10);
}
console.log('VFX capacity, flame-layer explosions, input isolation, finite transforms, expiry, reset and GPU resource disposal passed.');
