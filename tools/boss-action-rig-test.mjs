import assert from 'node:assert/strict';
import fs from 'node:fs';
import {austinActionPose,alwaysActionPose,johanActionPose,bossBodyMotion,createBossMotionTracker} from '../src/boss-action-rig.js';

const body={position:{y:0}};
const still=bossBodyMotion({type:'alwaysbeginner',body,state:'recover',time:0,vx:0,vz:0});
const running=bossBodyMotion({type:'alwaysbeginner',body,state:'stalk',time:.3,vx:9,vz:3,travel:2});
assert.ok(Math.abs(still.roll)<1e-8);
assert.ok(running.roll<0&&Math.abs(running.roll)<=.13,'running bank stays subtle and directional');
assert.ok(Math.abs(running.y)<.08,'footfall stays within the existing visual silhouette');
assert.ok(Math.abs(bossBodyMotion({type:'tempestcarrier',body,state:'stalk',time:1,vx:100,vz:0}).roll)<=.13,'flight bank clamps sudden motion');
assert.ok(Math.abs(bossBodyMotion({type:'alwaysbeginner',body:{position:{y:.7}},state:'recover',time:0}).y)<.02,'recovery returns to the floor instead of accumulating bob');

function fakeBoss(type){return {type,state:'recover',g:{position:{x:0,z:0}},body:{position:{y:0},rotation:{x:0,z:0},scale:{x:1,y:1}},artRoll:0};}
for(const type of ['austin','alwaysbeginner','tempestcarrier']){
 const actor=fakeBoss(type),update=createBossMotionTracker(actor);let maxHeight=0,maxPitch=0;
 for(let frame=0;frame<3600;frame++){
  if(frame>=600&&frame<2400)actor.g.position.z+=.035;
  update(frame/60);
  // Repeated visual refreshes without a fresh combat tick must also be safe.
  if(frame%17===0)update(frame/60);
  maxHeight=Math.max(maxHeight,Math.abs(actor.body.position.y));
  maxPitch=Math.max(maxPitch,Math.abs(actor.body.rotation.x));
 }
 assert.ok(maxHeight<.09,`${type} height does not drift over a 60-second fight`);
 assert.ok(maxPitch<.1,`${type} pitch does not drift over a 60-second fight`);
 assert.ok(Math.abs(actor.body.position.y)<.025&&Math.abs(actor.body.rotation.x)<.025,`${type} settles after movement`);
}

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

const cannons=johanActionPose({state:'tell',pattern:0,volleyStep:0},.2);
const spiral=johanActionPose({state:'barrage',pattern:1,volleyStep:3,turnSign:-1},.8);
const turn=johanActionPose({state:'barrage',pattern:2,volleyStep:4,turnSign:1},.8);
const phase=johanActionPose({state:'recover',moveName:'폭풍핵 변환'},1.1);
assert.equal(cannons.cannons,true);assert.equal(spiral.core,true);assert.equal(turn.thrusters,true);assert.ok(phase.phase&&phase.core,'Johan phase change opens both storm layers');

for(const file of ['boss-austin-punch-v1.webp','boss-always-bat-v1.webp','boss-always-ball-v1.webp','boss-johan-cannons-v1.webp','boss-johan-core-v1.webp','boss-johan-thrusters-v1.webp','boss-johan-phase-v1.webp']){
 const path=new URL('../public/assets/'+file,import.meta.url);assert.ok(fs.existsSync(path),file);assert.ok(fs.statSync(path).size<80000,`${file} stays mobile-light`);
}
for(const file of ['boss-johan-cannons-v1.webp','boss-johan-core-v1.webp','boss-johan-thrusters-v1.webp','boss-johan-phase-v1.webp']){
 const mobile=new URL('../public/assets/mobile/'+file,import.meta.url);assert.ok(fs.existsSync(mobile),`mobile ${file}`);assert.ok(fs.statSync(mobile).size<40000,`mobile ${file} stays light`);
}
console.log('Boss action rigs: punch, bat, pitch and Johan cannon/core/thruster actions passed.');
