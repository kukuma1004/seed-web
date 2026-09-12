import assert from 'node:assert/strict';
import * as THREE from 'three';
import {createSeedEvolution} from '../src/evolution.js';
const player=new THREE.Group(),growth=createSeedEvolution(player);
const originalCount=player.children.length;
growth.select(['reflect']);growth.update(.1,0,true,.5);
assert.deepEqual(growth.state().visible,['reflect']);
growth.select(['reflect','split']);growth.update(.1,1,false);
assert.deepEqual(growth.state().forms,['reflect','split']);
assert.equal(growth.state().primary,'reflect');
assert.deepEqual(growth.state().visible,['reflect','split']);
growth.fire();growth.update(.016,2,false);
for(let i=0;i<20;i++){
  growth.reset();growth.select(['chain','reflect']);growth.update(.1,i,true,.8);
}
assert.equal(player.children.length,originalCount,'Choosing/restarting must reuse body parts');
growth.reset();assert.deepEqual(growth.state().visible,[]);assert.equal(player.scale.x,1.35);
console.log('All law forms, combination retention, reset and body reuse passed.');
