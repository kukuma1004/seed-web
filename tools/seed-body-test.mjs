import assert from 'node:assert/strict';
import {seedFrame} from '../src/seed-body.js';
for(const yaw of [0,.63,-2.2]){
 assert.equal(seedFrame(yaw,yaw),0);
 assert.equal(seedFrame(yaw+Math.PI/2,yaw),1);
 assert.equal(seedFrame(yaw+Math.PI,yaw),2);
 assert.equal(seedFrame(yaw-Math.PI/2,yaw),3);
 assert.equal(seedFrame(yaw+2*Math.PI,yaw),0);
}
console.log('Seed atlas directions follow movement relative to the camera.');
