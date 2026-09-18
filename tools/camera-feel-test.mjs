import assert from 'node:assert/strict';
import {createCameraFeel} from '../src/camera-feel.js';

const camera=createCameraFeel();
let pose=camera.follow(1/60,{playerX:0,playerZ:0,moveX:0,moveZ:0,baseZoom:1.3});
assert.equal(pose.zoom,1.3,'ordinary framing has no dynamic enemy-count zoom');
for(let i=0;i<20;i++)pose=camera.follow(1/60,{playerX:i*.08,playerZ:0,moveX:.08,moveZ:0,followX:.5,followZ:.4,baseZoom:1.3});
assert.ok(pose.lookAhead.x>.35&&pose.x>0,'deliberate movement creates a bounded look-ahead');
const before=pose.lookAhead.x;for(let i=0;i<30;i++)pose=camera.follow(1/60,{playerX:1.6,playerZ:0,moveX:.0001,moveZ:0,followX:.5,followZ:.4,baseZoom:1.3});
assert.ok(pose.lookAhead.x<before*.2,'tiny stick noise decays instead of moving the camera');
camera.triggerUltimate(true);assert.equal(camera.stepEffects(.01),.08,'only an ultimate requests a short simulation hold');
pose=camera.follow(.01,{baseZoom:1.3});assert.notEqual(pose.zoom,1.3,'ultimate activation owns a brief camera punch');
for(let i=0;i<60;i++){camera.stepEffects(1/60);pose=camera.follow(1/60,{baseZoom:1.3});}
assert.ok(Math.abs(pose.zoom-1.3)<1e-6,'camera returns exactly to the fixed device zoom');
console.log('Camera deadzone, movement look-ahead and ultimate-only punch passed.');
