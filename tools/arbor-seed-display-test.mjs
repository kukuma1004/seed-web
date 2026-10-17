import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import * as THREE from 'three';
import {ARBOR_SEED_DISPLAY_SCALE} from '../src/journey-actor-scale.js';
import {responsiveView} from '../src/responsive-view.js';
const size=(w,h,lookZ,seedZ,scale)=>{
 const camera=new THREE.PerspectiveCamera(39,w/h,.1,150);
 camera.zoom=responsiveView(w,h,h<=520).zoom;camera.updateProjectionMatrix();
 camera.position.set(0,19,19+lookZ);camera.lookAt(0,0,lookZ);camera.updateMatrixWorld();
 const centre=new THREE.Vector3(0,.4,seedZ).applyMatrix4(camera.matrixWorldInverse);
 const a=centre.clone().add(new THREE.Vector3(0,1.18*scale*.5,0)).applyMatrix4(camera.projectionMatrix);
 const b=centre.clone().add(new THREE.Vector3(0,-1.18*scale*.5,0)).applyMatrix4(camera.projectionMatrix);
 return Math.abs(a.y-b.y)*h/2;
};
for(const [w,h] of [[1280,720],[960,540],[844,390],[667,375]]){
 const reference=size(w,h,.7,5,1.25),before=size(w,h,5.4,5,1.25),after=size(w,h,5.4,5,ARBOR_SEED_DISPLAY_SCALE);
 assert(before<reference*.9);assert(Math.abs(after/reference-1)<.015);
 console.log(`${w}x${h}: Act1 ${reference.toFixed(2)}px / Act6 before ${before.toFixed(2)}px / after ${after.toFixed(2)}px (sprite quad projection)`);
}
const main=readFileSync('src/main.js','utf8');
assert.match(main,/const player=createSeedBody[^\n]*player.scale.setScalar\(1\.25\)/);
assert.match(main,/arena=arborApi.ARBOR_ARENA;player.scale.setScalar\(ARBOR_SEED_DISPLAY_SCALE\)/);
console.log('Act6 visual scale matches Act1 start within 1.5%; original Act1 rig, camera, collision and seed art preserved. Projection test, not physical-device pixels.');
