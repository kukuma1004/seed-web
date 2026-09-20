import assert from 'node:assert/strict';
import fs from 'node:fs';
import {austinActionPose,alwaysActionPose} from '../src/boss-action-rig.js';

assert.equal(austinActionPose({state:'stalk'}).visible,false);
const tell=austinActionPose({state:'jabTell',timer:.2,dashes:0});
const hit=austinActionPose({state:'jab',timer:.18,dashes:0});
assert.equal(tell.visible,true);assert.equal(hit.visible,true);assert.ok(hit.z>tell.z&&hit.width>tell.width,'Austin glove visibly reaches forward');
assert.equal(austinActionPose({state:'jab',timer:.18,dashes:1}).side,-1,'successive punches swap hands');

const swing=alwaysActionPose({state:'swingTell',timer:.1,phase:'rookie'});
const swingRelease=alwaysActionPose({state:'recover',timer:.3,phase:'rookie'},{swing:.05,pitch:0});
assert.equal(swing.kind,'swing');assert.equal(swingRelease.batEcho,true);assert.notEqual(swing.rotation,swingRelease.rotation,'bat crosses the body on release');
const windup=alwaysActionPose({state:'pitchTell',timer:.4,phase:'rookie'});
const release=alwaysActionPose({state:'recover',timer:.3,phase:'rookie'},{swing:0,pitch:.04});
assert.equal(windup.kind,'pitch');assert.ok(release.z>windup.z&&release.y<windup.y,'ball leaves the raised throwing hand');

for(const file of ['boss-austin-punch-v1.webp','boss-always-bat-v1.webp','boss-always-ball-v1.webp']){
 const path=new URL('../public/assets/'+file,import.meta.url);assert.ok(fs.existsSync(path),file);assert.ok(fs.statSync(path).size<80000,`${file} stays mobile-light`);
}
console.log('Boss action rigs: alternating punch, bat swing, pitch release and mobile assets passed.');
