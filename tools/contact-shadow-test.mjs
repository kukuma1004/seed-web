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
shadows.dispose();assert.equal(scene.children.length,0);
console.log('Actor contact shadows use one bounded instanced draw call and scale by actor type.');
