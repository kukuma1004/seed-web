import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import vm from 'node:vm';
import * as THREE from 'three';
import {journeyCombatCamera} from '../src/journey-combat-camera.js';
import {journeyFlightCamera} from '../src/journey-flight-camera.js';
import {crosswindJourneyCamera} from '../src/journey-crosswind-camera.js';
import {crystalSiegeCamera} from '../src/crystal-siege-camera.js';
import {createCameraFeel} from '../src/camera-feel.js';
import {responsiveView} from '../src/responsive-view.js';
import {journeyPlayerScale} from '../src/journey-player-presentation.js';

const source=readFileSync(new URL('../src/main.js',import.meta.url),'utf8'),start=source.indexOf(' const skyCamera=isAct3(region)&&!mirrorSession;'),end=source.indexOf('presentJourneySignature();',start);
assert(start>0&&end>start);
const host=new vm.Script('(function(){'+source.slice(start,end)+'})()'),viewports=[[1280,720,false],[1024,768,true],[844,390,true],[640,360,true]],metrics=[];
let projected=0;
for(const[w,h,touch]of viewports)for(const act of['skyway','crosswind','crystalGorge']){
 const viewLayout=responsiveView(w,h,touch),pose=journeyCombatCamera(w,h,act,viewLayout),camera=new THREE.PerspectiveCamera(39,w/h,.1,100),player={position:new THREE.Vector3()},look=new THREE.Vector3(),feel=createCameraFeel();
 const context=vm.createContext({isAct3:r=>r==='skyway',region:act==='skyway'?'skyway':'garden',mirrorSession:null,trainingSession:null,expansionJourney:act==='skyway'?null:{act,phase:'course',course:{encounterVersion:3},...(act==='crystalGorge'?{siege:{}}:{})},survivalSession:null,survivalSiege:null,survivalExpansion:null,canvasRect:{width:w,height:h},journeyFlightCamera,crosswindJourneyCamera,crystalSiegeCamera,camera,look,visualDt:1/60,cameraMoveX:0,cameraMoveZ:0,player,viewLayout,ACT3_VIEW_ZOOM:.88,ACT3_VIEW_BIAS:-2,MIRROR_VIEW:{followX:.2,followZ:.2,zoom:1.1},seedVisualReview:true,cameraShake:0,rng:()=>.5,stage:0,inAustinRoom:()=>false,cameraFeel:feel});
 let minPixels=Infinity;
 for(let frame=0;frame<720;frame++){
  const section=Math.floor(frame/180),t=frame%180/60;
  // Restored distant Act4 entry, return to zero, far lane edges and held movement.
  player.position.set(act==='crosswind'?[99,0,132,12][section]+t*5:Math.sin(t)*6,0,Math.cos(t)*(act==='skyway'?7.2:6.2));
  if(act==='crystalGorge'&&section===3)context.expansionJourney.phase='boss';
  context.cameraMoveX=.07;context.cameraMoveZ=-.03;
  const before=player.position.toArray();host.runInContext(context);assert.deepEqual(player.position.toArray(),before,'camera cannot move gameplay state');
  assert.equal(camera.zoom,viewLayout.zoom*1.55,'nearby combat, never a full-map fit');assert.equal(camera.position.y,19);assert.equal(camera.position.z-look.z,19);
  const foot=player.position.clone().project(camera),up=new THREE.Vector3(0,1,0).applyQuaternion(camera.quaternion),top=player.position.clone().addScaledVector(up,1.18*journeyPlayerScale(w,h,act)).project(camera);
  assert(Math.abs(foot.x)<.5&&Math.abs(foot.y)<.5,'seed stays in the middle half of the screen even on entry/resume');
  const px=(top.y-foot.y)*h/2;assert(px>=65,'readable seed, including 640px landscape');minPixels=Math.min(minPixels,px);assert(top.y<1-2*pose.top/h,'head stays below HUD '+JSON.stringify({act,w,h,frame,foot:foot.y,top:top.y,camera:look.toArray()}));projected++;
 }
 // At the same location the view is 55% closer, independent of visual rig size.
 const reference=new THREE.PerspectiveCamera(39,w/h,.1,100);reference.zoom=viewLayout.zoom;reference.position.copy(camera.position);reference.quaternion.copy(camera.quaternion);reference.updateProjectionMatrix();reference.updateMatrixWorld();
 const up=new THREE.Vector3(0,1,0).applyQuaternion(camera.quaternion),foot=player.position.clone().project(reference),top=player.position.clone().addScaledVector(up,1.18*journeyPlayerScale(w,h,act)).project(reference),nowFoot=player.position.clone().project(camera),nowTop=player.position.clone().addScaledVector(up,1.18*journeyPlayerScale(w,h,act)).project(camera);
 assert(Math.abs((nowTop.y-nowFoot.y)/(top.y-foot.y)-1.55)<1e-10);
 const groundAtEdge=new THREE.Raycaster();groundAtEdge.setFromCamera(new THREE.Vector2(0,1),camera);const hit=new THREE.Vector3();assert(groundAtEdge.ray.intersectPlane(new THREE.Plane(new THREE.Vector3(0,1,0),0),hit));
 metrics.push({act,viewport:[w,h],zoom:pose.zoom,minSeedPixels:+minPixels.toFixed(1),nearbyForwardWorldUnits:+hit.distanceTo(player.position).toFixed(2)});
}
// Existing other-mode follow behavior is identical when snapDistance is absent.
const old=new vm.Script(readFileSync(new URL('./fixtures/camera-feel-v90.mjs',import.meta.url),'utf8').replace('export function createCameraFeel','function createCameraFeel')+';createCameraFeel()').runInNewContext({});
const unchanged=createCameraFeel();for(let frame=0;frame<1200;frame++){const options={playerX:Math.sin(frame*.03)*12,playerZ:Math.cos(frame*.04)*8,moveX:.04,moveZ:.01,followX:.5,followZ:.4,baseZoom:1.32};assert.equal(JSON.stringify(unchanged.follow(1/60,options)),JSON.stringify(old.follow(1/60,options)));}
// Damage still has its actual tint/pose feedback; native3/4/5 never blank the rig.
const blink=source.match(/player\.visible=Boolean\(expansionJourney\|\|[^;]+;/)?.[0];assert(blink);
for(const region of['skyway','garden'])for(const act of[null,'crosswind','crystalGorge'])for(const time of[.05,.1,.15,.2,1.05]){
 const c={player:{visible:false},region,expansionJourney:act?{act}:null,survivalSession:null,mirrorSession:null,trainingSession:null,isAct3:r=>r==='skyway',invuln:1,time};vm.runInNewContext(blink,c);assert.equal(c.player.visible,Boolean(act||region==='skyway')||Math.floor(time*20)%2===0);
}
const first=journeyCombatCamera(1280,720);for(let i=0;i<20000;i++)assert.equal(journeyCombatCamera(1280,720),first);assert(Object.isFrozen(first));
console.log(JSON.stringify({projectedFrames:projected,otherModeParityFrames:1200,metrics},null,2));
console.log('PASS actual shipping camera owner, 12 viewport/act cases, distant entry/boss continuity, Act1-relative55% scale, preserved other-mode follow and native damage visibility. CPU Three projection/VM; not device/browser play proof.');
