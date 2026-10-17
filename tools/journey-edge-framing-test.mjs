import assert from 'node:assert/strict';
import * as THREE from 'three';
import {responsiveView} from '../src/responsive-view.js';
import {frameJourneySeed} from '../src/journey-edge-framing.js';
import {arenaFor,constrainToArena} from '../src/arena.js';
let samples=0,previousClips=0;
for(const [w,h,touch] of [[1280,720,false],[960,540,true],[844,390,true],[667,375,true],[1280,800,true]])for(const [height,zOffset]of [[22,15.5],[19,19]]){
 const view=responsiveView(w,h,touch),camera=new THREE.PerspectiveCamera(39,w/h,.1,100);
 camera.zoom=view.zoom;camera.updateProjectionMatrix();
 for(const region of ['garden','stadium'])for(let stage=0;stage<5;stage++)for(let lap=0;lap<2;lap++)for(let angle=0;angle<32;angle++){
  const player={x:30*Math.cos(angle*Math.PI/16),z:30*Math.sin(angle*Math.PI/16)};constrainToArena(player,.4,arenaFor(stage,lap,region));
  const original={x:player.x*view.followX,z:.4+player.z*view.followZ,zoom:view.zoom};
  const project=pose=>{camera.position.set(pose.x,height,pose.z+zOffset);camera.lookAt(pose.x,0,pose.z);camera.updateMatrixWorld();const foot=new THREE.Vector3(player.x,0,player.z).applyMatrix4(camera.matrixWorldInverse);return [foot.clone().add(new THREE.Vector3(0,2.82,0)).applyMatrix4(camera.projectionMatrix),foot.add(new THREE.Vector3(0,-.34,0)).applyMatrix4(camera.projectionMatrix)];};
  const top=Math.min(h*.3,h<=520?92:156),bottom=Math.min(h*.3,h<=520?112:132),side=Math.min(w*.16,w<=700?36:48);
  const before=project(original);if((1-before[0].y)*h/2<top||(1-before[1].y)*h/2>h-bottom)previousClips++;
  const safe=frameJourneySeed({...original},player,w,h,height,zOffset),[head,feet]=project(safe);
  assert((1-head.y)*h/2>=top-1e-8,'hat stays below HUD');assert((1-feet.y)*h/2<=h-bottom+1e-8,'feet stay above bottom controls');
  assert((1-Math.abs(head.x))*w/2>=side-1e-8,'body does not leave a side');assert.equal(safe.zoom,view.zoom,'no camera zoom or size change');
  if((1-before[0].y)*h/2>=top&&(1-before[1].y)*h/2<=h-bottom&&Math.abs(original.x-safe.x)<1e-9)assert.equal(safe.z,original.z,'safe centre framing remains exact');
  samples++;
 }
}
assert(previousClips>0,'regression exercises previously obscured edges');
const base={x:0,z:.4,zoom:1.18};assert.equal(frameJourneySeed(base,{x:0,z:2},1280,720,19,19),base,'no new camera pose allocation');
console.log(`${samples} Act1/2 boundary projections safe, ${previousClips} old edge/HUD clips reproduced; zoom/rig/collision unchanged.`);
