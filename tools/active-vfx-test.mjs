import assert from 'node:assert/strict';
import * as THREE from 'three';
import {activeColors,createActiveVFX} from '../src/active-vfx.js';
import {ALL_FORMS} from '../src/forms.js';
import {LAWS} from '../src/laws.js';

const expectedColors=[...new Set(['collapse','prism'].flatMap(id=>ALL_FORMS[id].requires).map(id=>LAWS[id].color))];
assert.deepEqual(activeColors(['collapse','prism']),expectedColors);

for(const mobile of [false,true]){
  const scene=new THREE.Scene(),fx=createActiveVFX(scene,{mobile});
  const root=scene.getObjectByName('active-vfx');
  assert.ok(root);
  assert.equal(root.children.length,5,'The active effect must stay at five draw calls.');

  const player=new THREE.Vector3(3,0,-2);
  fx.start({state:'OVERDRIVE',forms:['collapse','prism'],seconds:5},player);
  fx.update(.16,player);
  assert.deepEqual(fx.state().forms,['collapse','prism']);
  assert.equal(fx.state().mode,'running');
  assert.equal(fx.state().instances,mobile?10:16);
  assert.equal(fx.state().drawCalls,5);
  assert.ok(root.visible);
  for(const object of root.children){
    assert.equal(object.material.depthWrite,false);
    if(object.instanceMatrix)assert.ok([...object.instanceMatrix.array].every(Number.isFinite));
  }

  player.set(-4,0,6);fx.update(.2,player);
  assert.deepEqual(root.position.toArray(),[-4,0,6]);
  fx.finish({state:'OVERDRIVE',forms:['collapse','prism']},player);
  fx.update(.4,player);
  assert.equal(fx.state().mode,'finale');
  fx.update(.6,player);
  assert.equal(fx.state().visible,false);
  fx.clear();
  assert.equal(fx.state().instances,0);
  fx.dispose();
  assert.equal(scene.children.length,0);
}

console.log('Active VFX colors, draw-call budget, finite transforms, finale, reset and disposal passed.');
