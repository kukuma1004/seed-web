import assert from 'node:assert/strict';
import * as THREE from 'three';
import {activeColors,createActiveVFX,glowFalloff,haloBand,beamFalloff} from '../src/active-vfx.js';

// Light, not stickers: the gradients fade to black (no light under additive blending) at their edges.
assert.ok(glowFalloff(.5,.5)>.95&&glowFalloff(0,.5)===0&&glowFalloff(.95,.95)===0,'floor glow fades out before the rim');
assert.ok(beamFalloff(.5,0)>.9&&beamFalloff(.5,1)===0,'beam fades out toward the top');
assert.ok(haloBand(0,.5)>.9&&haloBand(0,0)<.1&&haloBand(0,1)<.1,'halo is a thin band');
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
  assert.ok(!root.children.some(o=>/wheel|petal/.test(o.geometry.name||'')),'no flat petal wheels on the floor');
  for(const object of root.children){
    assert.equal(object.material.depthWrite,false);assert.equal(object.material.blending,THREE.AdditiveBlending);
    if(object.instanceMatrix)assert.ok([...object.instanceMatrix.array].every(Number.isFinite));
  }

  player.set(-4,0,6);fx.update(.2,player);
  assert.deepEqual(root.position.toArray(),[-4,0,6]);
  fx.finish({state:'OVERDRIVE',forms:['collapse','prism']},player);
  fx.update(.4,player);
  assert.equal(fx.state().mode,'finale');
  fx.update(.6,player);
  assert.equal(fx.state().visible,false);
  fx.start({state:'SIGNATURE',forms:['f09-reflect-portal'],tags:['BOUNCE','RIFT'],seconds:3},player);fx.update(.2,player);
  const riftWave=root.getObjectByName('active-wave');assert.ok(riftWave.visible&&Math.abs(riftWave.scale.x-riftWave.scale.z)>1,'rift signatures open an oval gate instead of another circular blast');
  fx.clear();
  assert.equal(fx.state().instances,0);
  fx.dispose();
  assert.equal(scene.children.length,0);
}

console.log('Active VFX colors, draw-call budget, finite transforms, finale, reset and disposal passed.');
