import assert from 'node:assert/strict';
import * as THREE from 'three';
import {CONTACT_SHADOW_CAPACITY,contactShadowRadius,createContactShadows} from '../src/contact-shadows.js';

assert.equal(CONTACT_SHADOW_CAPACITY,192);
assert(contactShadowRadius('austin')>contactShadowRadius('warden'));
assert(contactShadowRadius('warden')>contactShadowRadius('hound'));
const scene=new THREE.Scene(),shadows=createContactShadows(scene,3),player=new THREE.Group();
const enemies=['swarm','hound','austin'].map((type,i)=>{const g=new THREE.Group();g.position.set(i+1,0,i);return {type,g};});
assert.equal(shadows.update(player,enemies,[]),3,'The single batch must stay inside its capacity.');
assert.equal(shadows.mesh.count,3);assert.equal(shadows.drawCalls,1);assert.equal(scene.children.filter(o=>o.name==='actor-contact-shadows').length,1);
const minion={g:new THREE.Group(),type:'expansion-minion',expansionActor:true};shadows.update(player,[minion],[],true);assert.equal(shadows.mesh.material.opacity,.62);const matrix=new THREE.Matrix4();shadows.mesh.getMatrixAt(1,matrix);assert(Math.abs(new THREE.Vector3().setFromMatrixScale(matrix).x-.72)<1e-6);shadows.update(player,[],[],false);assert.equal(shadows.mesh.material.opacity,.23);
shadows.update(player,[minion],[],'crosswind');assert.equal(shadows.mesh.material.opacity,.66);shadows.mesh.getMatrixAt(0,matrix);const planted=new THREE.Vector3().setFromMatrixPosition(matrix);assert(Math.abs(planted.x-.2)<1e-6&&Math.abs(planted.z-.22)<1e-6,'Act4 shadow follows the painted upper-left sun');assert(Math.abs(new THREE.Vector3().setFromMatrixScale(matrix).x-.82)<1e-6);
shadows.update(player,[],[],false);shadows.mesh.getMatrixAt(0,matrix);assert(Math.abs(new THREE.Vector3().setFromMatrixPosition(matrix).x)<1e-6,'other modes restore the original centred contact');assert(Math.abs(new THREE.Vector3().setFromMatrixScale(matrix).x-.46)<1e-6);assert.equal(shadows.mesh.count,1);assert.equal(shadows.drawCalls,1);
shadows.dispose();assert.equal(scene.children.length,0);
console.log('Actor contact shadows use one bounded instanced draw call and scale by actor type.');
