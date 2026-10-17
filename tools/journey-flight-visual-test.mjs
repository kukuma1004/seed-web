import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import * as THREE from 'three';
import {journeyFlightCamera} from '../src/journey-flight-camera.js';
import {crystalSiegeCamera} from '../src/crystal-siege-camera.js';
import {crosswindJourneyCamera} from '../src/journey-crosswind-camera.js';
import {journeyPlayerScale} from '../src/journey-player-presentation.js';
import {responsiveView} from '../src/responsive-view.js';
import {ACT3_ARENA,SKYWAY_ROOMS,act3EntryPoint,act3ReinforcementSpawn,act3CrowdType} from '../src/act3.js';
import {ACT3_ART} from '../src/act3-enemies.js';

const cases=[[1280,720],[1024,768],[844,390],[640,360]],measurements=[],passed=[],failures=[];
async function check(name,run){try{await run();passed.push(name);}catch(error){failures.push({name,message:error.message});console.error('FAIL',name,error.message);}}
function makeCamera(width,height,pose){const camera=new THREE.PerspectiveCamera(39,width/height,.1,100);camera.zoom=pose.zoom;camera.position.set(pose.x||0,pose.height,pose.lookZ+pose.offsetZ);camera.lookAt(pose.x||0,0,pose.lookZ);camera.updateProjectionMatrix();camera.updateMatrixWorld();return camera;}
function project(point,camera,width,height){const p=point.clone().project(camera);return{x:(p.x+1)*width/2,y:(1-p.y)*height/2,depth:p.z};}
function inside(p,pose,w,h,label){const epsilon=1e-5;assert(p.x>=pose.side-epsilon&&p.x<=w-pose.side+epsilon,label+' x='+p.x);assert(p.y>=pose.top-epsilon&&p.y<=h-pose.bottom+epsilon,label+' y='+p.y);assert(p.depth>-1&&p.depth<1,label+' depth');}
function billboardCorners(x,z,size,baseline,roll,camera){const up=new THREE.Vector3(0,1,0).applyQuaternion(camera.quaternion),right=new THREE.Vector3(1,0,0).applyQuaternion(camera.quaternion),result=[];for(const u of[-.5,.5])for(const v of[-baseline,1-baseline]){const a=(u*Math.cos(roll)-v*Math.sin(roll))*size,b=(u*Math.sin(roll)+v*Math.cos(roll))*size;result.push(new THREE.Vector3(x,0,z).addScaledVector(right,a).addScaledVector(up,b));}return result;}
const skywaySource=fs.readFileSync(new URL('../src/skyway.js',import.meta.url),'utf8');
function makeSkyway(mobile=false){
 const scene=new THREE.Scene();scene.background=new THREE.Color('#264731');scene.fog=new THREE.FogExp2('#526153',.027);
 const sun=new THREE.DirectionalLight('#fff2d0',1.7),hemi=new THREE.HemisphereLight('#77aabb','#665544',.8),visible=new THREE.Group(),hidden=new THREE.Group();hidden.visible=false;scene.add(sun,hemi,visible,hidden);
 const loads=[],textures=[];class TextureLoader{load(url){loads.push(url);const t=new THREE.Texture({width:1536,height:864});textures.push(t);return t;}}
 const context={THREE:{...THREE,TextureLoader},document:{}};vm.runInNewContext(skywaySource.replace("import * as THREE from 'three';",'').replace('export function createSkyway','function createSkyway').replaceAll('import.meta.env.BASE_URL',"'/seed/'"),context);
 const before={background:scene.background,color:scene.background.clone(),fog:scene.fog,fogColor:scene.fog.color.clone(),density:scene.fog.density,lights:[sun,hemi].map(light=>({light,intensity:light.intensity,color:light.color.clone()}))};
 const view=context.createSkyway(scene,{lights:[sun,hemi],hide:[visible,hidden],mobile});return{scene,view,loads,textures,before,visible,hidden};
}

await check('Close flight view preserves readable seed scale and reveals the wider corridor through movement',()=>{
 for(const[w,h]of cases){
  const pose=journeyFlightCamera(w,h),scale=journeyPlayerScale(w,h);assert.equal(scale,1.25);
  assert.equal(pose.height,19);assert.equal(pose.offsetZ,19);assert.equal(pose.zoom,responsiveView(w,h,h<=520).zoom);
  for(const player of [{x:0,z:5.5},{x:-8.7,z:-7.8},{x:8.7,z:7}]){
   const local={...pose,x:player.x,lookZ:player.z+pose.biasZ},camera=makeCamera(w,h,local);
   const foot=project(new THREE.Vector3(player.x,0,player.z),camera,w,h),up=new THREE.Vector3(0,1,0).applyQuaternion(camera.quaternion);
   const top=project(new THREE.Vector3(player.x,0,player.z).addScaledVector(up,1.18*scale),camera,w,h);
   inside(foot,pose,w,h,'tracked seed foot');inside(top,pose,w,h,'tracked seed top');assert(foot.y-top.y>=35);
   measurements.push({viewport:[w,h],player,zoom:pose.zoom,playerPixels:foot.y-top.y});
  }
 }
});

await check('Shipping main uses the native Journey3 fit for ordinary rooms and boss, caps punch and preserves every other camera owner',()=>{
 const main=fs.readFileSync(new URL('../src/main.js',import.meta.url),'utf8'),start=main.indexOf(' const skyCamera=isAct3(region)&&!mirrorSession;'),end=main.indexOf('presentJourneySignature();',start);assert(start>0&&end>start);const host=main.slice(start,end);
 const variants=['native3','native3-boss','survival3','training3','mirror3','expansion3','classic','act2','survival1','journey4','journey5'];let runs=0;
 for(const[w,h]of cases)for(const variant of variants)for(const punch of[1,1.038]){
  const native=variant.startsWith('native3'),region=native||variant.endsWith('3')?'skyway':variant==='act2'?'stadium':'garden',survival=variant.startsWith('survival'),mirror=variant==='mirror3',training=variant==='training3',expansionJourney=variant==='journey4'?{act:'crosswind',phase:'course',course:{encounterVersion:2}}:variant==='journey5'?{act:'crystalGorge',phase:'course',siege:{}}:variant==='expansion3'?{act:'crystalGorge',phase:'course'}:null;
  const camera=new THREE.PerspectiveCamera(39,w/h,.1,100),viewLayout=responsiveView(w,h,h<=520);let follows,flightCalls=0;
  const context={isAct3:r=>r==='skyway',region,mirrorSession:mirror?{}:null,trainingSession:training?{}:null,arborJourney:null,expansionJourney,survivalSession:survival?{}:null,survivalSiege:null,survivalExpansion:null,canvasRect:{width:w,height:h},journeyFlightCamera:(...args)=>{flightCalls++;return journeyFlightCamera(...args);},crystalSiegeCamera,crosswindJourneyCamera,camera,look:new THREE.Vector3(),visualDt:1/60,cameraMoveX:2,cameraMoveZ:-1,player:{position:new THREE.Vector3(8,0,7)},viewLayout,ACT3_VIEW_ZOOM:.88,ACT3_VIEW_BIAS:-2,MIRROR_VIEW:{followX:.2,followZ:.2,zoom:1.1},seedVisualReview:false,cameraShake:0,rng:()=>.5,stage:variant==='native3-boss'?4:0,inAustinRoom:()=>variant==='native3-boss',cameraFeel:{follow(_dt,opts){follows=opts;return{x:4,z:-3,zoom:opts.baseZoom*punch};}}};
  vm.runInNewContext(host,context);assert.equal(flightCalls,native?1:0,variant+' camera ownership');
  if(native){const pose=journeyFlightCamera(w,h,viewLayout);assert.equal(camera.zoom,pose.zoom*punch);assert.equal(camera.position.x,4);assert.equal(camera.position.y,pose.height);assert.equal(context.look.z,-3);assert(Math.abs(camera.position.z-context.look.z-pose.offsetZ)<1e-12);assert.equal(follows.leadScale,.35);assert.equal(follows.followX,1);assert.equal(follows.followZ,1);assert.equal(follows.snapDistance,4.5);}
  else if(variant==='journey4'){const pose=crosswindJourneyCamera(w,h,5.4,viewLayout);assert.equal(camera.position.x,4,'Act4 retains lateral camera follow');assert.equal(camera.zoom,pose.zoom*punch);assert.equal(context.look.z,-3);}
  else if(variant==='journey5'){const pose=crystalSiegeCamera(w,h,viewLayout);assert.equal(camera.position.x,4);assert.equal(camera.zoom,pose.zoom*punch);assert.equal(context.look.z,-3);}
  else{const sky=region==='skyway'&&!mirror,expected=viewLayout.zoom*(survival?1.12:sky?.88:mirror?1.1:1);assert.equal(follows.baseZoom,expected,variant+' original device zoom');assert.equal(camera.zoom,expected*punch,variant+' original ultimate punch');assert.equal(camera.position.x,4);assert.equal(context.look.z,-3);assert.equal(camera.position.y,22);assert.equal(camera.position.z-context.look.z,15.5);}
  runs++;
 }
 measurements.push({shippingMainCameraCases:runs,native3BossUsesSamePose:true,otherCameraOwnersPreserved:true});
});

await check('Immutable camera fit reuses one identity for 20k frames and bounds its resize cache',()=>{
 const pose=journeyFlightCamera(1280,720);assert(Object.isFrozen(pose));for(let i=0;i<20000;i++)assert.equal(journeyFlightCamera(1280,720),pose);
 for(let i=0;i<40;i++)assert(Number.isFinite(journeyFlightCamera(700+i,390).zoom));assert.notEqual(journeyFlightCamera(1280,720),pose);
 for(const[w,h]of[[0,0],[-1,-1],[NaN,Infinity]]){const p=journeyFlightCamera(w,h);assert(Number.isFinite(p.height)&&Number.isFinite(p.offsetZ)&&Number.isFinite(p.zoom));}
});

function webpSize(bytes){
 assert.equal(bytes.toString('ascii',0,4),'RIFF');assert.equal(bytes.toString('ascii',8,12),'WEBP');assert.equal(bytes.readUInt32LE(4)+8,bytes.length);let result=null;
 for(let p=12;p+8<=bytes.length;){const kind=bytes.toString('ascii',p,p+4),length=bytes.readUInt32LE(p+4),d=p+8;assert(d+length<=bytes.length,'complete WebP chunk');if(kind==='VP8X')result={width:1+bytes.readUIntLE(d+4,3),height:1+bytes.readUIntLE(d+7,3)};else if(!result&&kind==='VP8L'){assert.equal(bytes[d],0x2f);const bits=bytes.readUInt32LE(d+1);result={width:(bits&16383)+1,height:((bits>>>14)&16383)+1};}else if(!result&&kind==='VP8 '){assert.equal(bytes.toString('hex',d+3,d+6),'9d012a');result={width:bytes.readUInt16LE(d+6)&16383,height:bytes.readUInt16LE(d+8)&16383};}p=d+length+(length%2);}
 assert(result,'WebP dimensions found');return result;
}
await check('Real desktop/mobile landscape WebPs retain source aspect with bounded transfer and one-image RGBA decode budgets',()=>{
 for(const mobile of[false,true]){
  const asset='assets/'+(mobile?'mobile/':'')+'act3-storm-route-v2.webp',bytes=fs.readFileSync(new URL('../public/'+asset,import.meta.url)),size=webpSize(bytes),decodedBytes=size.width*size.height*4;
  assert.equal(size.width/size.height,16/9);assert(size.width<=(mobile?960:1536));assert(size.height<=(mobile?540:864));assert(bytes.length<=(mobile?160:384)*1024);assert(decodedBytes<=(mobile?2.1:5.1)*1024*1024);
  measurements.push({asset,...size,transferBytes:bytes.length,decodedBytes});
 }
});

await check('Actual skyway scene covers every viewport without stretching, shader seams, cloned samplers or out-of-source UVs',()=>{
 for(const mobile of[false,true]){
  const f=makeSkyway(mobile),{view}=f;assert.equal(f.loads.length,0,'lazy before first entry');view.setActive(true);const sea=view.group.getObjectByName('skyway-painted-route'),map=sea.material.map;
  assert.equal(f.loads[0],'/seed/assets/'+(mobile?'mobile/':'')+'act3-storm-route-v2.webp');assert.equal(f.loads.length,1);assert.equal(map.source,f.textures[0].source);assert.equal(map.wrapS,THREE.ClampToEdgeWrapping);assert.equal(map.wrapT,THREE.ClampToEdgeWrapping);assert(!skywaySource.includes('onBeforeCompile'),'one ordinary texture sample');
  for(const[w,h]of[...cases,[390,844]]){
   const camera=makeCamera(w,h,journeyFlightCamera(w,h));
   for(let i=0;i<70;i++){view.tick(.1);sea.onBeforeRender(null,f.scene,camera);assert(Math.abs(map.repeat.x*map.image.width/(map.repeat.y*map.image.height)-w/h)<1e-10,'source pixel crop matches view aspect');assert(map.offset.x>=0&&map.offset.y>=0&&map.offset.x+map.repeat.x<=1&&map.offset.y+map.repeat.y<=1,'bounded crop never exposes an image seam');}
   const matrix=sea.matrixWorld,positions=sea.geometry.attributes.position;for(let i=0;i<positions.count;i++){const p=project(new THREE.Vector3().fromBufferAttribute(positions,i).applyMatrix4(matrix),camera,w,h);assert(p.x<=0||p.x>=w);assert(p.y<=0||p.y>=h);}
  }
  // If an image loader reports dimensions different from its nominal 16:9,
  // source dimensions remain the authority rather than stretching that image.
  map.image={width:1600,height:1000};sea.onBeforeRender(null,f.scene,makeCamera(1024,768,journeyFlightCamera(1024,768)));assert(Math.abs(map.repeat.x*1600/(map.repeat.y*1000)-4/3)<1e-10);
  view.setActive(false);view.setActive(true);assert.equal(f.loads.length,1);assert.equal(sea.material.map,map);view.dispose();
 }
});

await check('Finite rain pools remain fixed for 20k frames, pause/idle cause no uploads and mobile animation is slower at 30Hz',()=>{
 for(const mobile of[false,true]){
  const f=makeSkyway(mobile),{view}=f;view.setActive(true);const ids=view.group.children.map(o=>o.uuid),resources=[...view.materials,...view.geometries],edges=view.group.getObjectByName('skyway-far-rain'),near=view.group.getObjectByName('skyway-near-rain');assert.equal(view.state().instances,mobile?20:30);assert.equal(edges.count+near.count,mobile?20:30);assert.equal(view.group.children.length,3);
  for(let i=0;i<20000;i++)view.tick(1/60);assert.deepEqual(view.group.children.map(o=>o.uuid),ids);assert.deepEqual([...view.materials,...view.geometries],resources);assert.equal(f.loads.length,1);
  const distance=view.state().distance,version=edges.instanceMatrix.version,matrix=edges.instanceMatrix.array.slice();for(let i=0;i<300;i++)view.tick(.1,false);assert.equal(view.state().distance,distance);assert.equal(edges.instanceMatrix.version,version);assert.deepEqual(edges.instanceMatrix.array,matrix);
  view.setSpeed(0);for(let i=0;i<30;i++)view.tick(.1);view.tick(NaN);view.tick(-1);assert.equal(edges.instanceMatrix.version,version,'zero travel must not upload matrices');view.setSpeed(6.8);
  view.setActive(false);for(let i=0;i<30;i++)view.tick(.1);assert.equal(edges.instanceMatrix.version,version);view.setActive(true);
  const before=edges.instanceMatrix.version,startDistance=view.state().distance;for(let i=0;i<60;i++)view.tick(1/60);assert.equal(edges.instanceMatrix.version-before,mobile?30:60);const travel=view.state().distance-startDistance;assert(Math.abs(travel-(mobile?4.896:6.8))<.11,'mobile travel is slower without changing combat simulation');
  measurements.push({rainMobile:mobile,instances:view.state().instances,uploadsPer60Frames:edges.instanceMatrix.version-before,travelAtOneSecond:+travel.toFixed(2)});view.dispose();
 }
});

await check('Reduced motion removes decorative rain and freezes drift without changing scene ownership or enemy logic',()=>{
 for(const mobile of[false,true]){
  const {view,scene}=makeSkyway(mobile);view.setActive(true);view.tick(.1);
  const sea=view.group.getObjectByName('skyway-painted-route'),edges=view.group.getObjectByName('skyway-far-rain'),near=view.group.getObjectByName('skyway-near-rain'),camera=makeCamera(640,360,journeyFlightCamera(640,360));
  sea.onBeforeRender(null,scene,camera);const offset=sea.material.map.offset.clone(),distance=view.state().distance,version=edges.instanceMatrix.version;
  for(let i=0;i<6000;i++){view.tick(1/60,true,true);sea.onBeforeRender(null,scene,camera);}
  assert(!edges.visible&&!near.visible);assert.equal(view.state().distance,distance);assert.equal(edges.instanceMatrix.version,version);assert(sea.material.map.offset.equals(offset));assert(sea.visible);
  view.tick(.1,true,false);assert(edges.visible&&near.visible);assert(view.state().distance>distance);view.dispose();
 }
 const main=fs.readFileSync(new URL('../src/main.js',import.meta.url),'utf8');assert(main.includes("skyway.tick(visualDt,mode==='playing'&&!paused,journeyReducedMotion)"));
});

await check('Activation restores borrowed scene/color/fog/light/visibility and idempotent disposal releases only owned resources',()=>{
 for(const backgroundKind of['color','texture','none']){
  const f=makeSkyway(),{view,scene,before}=f;if(backgroundKind==='texture')scene.background=new THREE.Texture();if(backgroundKind==='none')scene.background=null;const original=scene.background,lightValues=before.lights.map(({light})=>({intensity:light.intensity,color:light.color.clone()}));
  let borrowedDisposed=0,ownedDisposed=0;original?.addEventListener?.('dispose',()=>borrowedDisposed++);const owned=[...view.materials,...view.geometries];for(const resource of owned)resource.addEventListener('dispose',()=>ownedDisposed++);
  for(let i=0;i<25;i++){view.setActive(true);view.setActive(true);assert.equal(f.visible.visible,false);assert.equal(f.hidden.visible,false);view.setActive(false);assert.equal(scene.background,original);assert.equal(scene.fog,before.fog);assert(scene.fog.color.equals(before.fogColor));assert.equal(scene.fog.density,before.density);assert.equal(f.visible.visible,true);assert.equal(f.hidden.visible,false);for(let j=0;j<before.lights.length;j++){const light=before.lights[j].light;assert.equal(light.intensity,lightValues[j].intensity);assert(light.color.equals(lightValues[j].color));}if(original?.isColor)assert(original.equals(before.color));}
  view.setActive(true);view.group.getObjectByName('skyway-painted-route').material.map.addEventListener('dispose',()=>ownedDisposed++);view.dispose();view.dispose();assert.equal(scene.background,original);assert.equal(scene.fog,before.fog);assert.equal(f.visible.visible,true);assert.equal(f.hidden.visible,false);assert(!scene.children.includes(view.group));assert.equal(ownedDisposed,owned.length+1);assert.equal(borrowedDisposed,0);const loads=f.loads.length;view.setActive(true);view.tick(.1);assert.equal(f.loads.length,loads);assert.equal(view.state().active,false);
 }
});

console.log(JSON.stringify({passed:passed.length,groups:passed,failures,measurements},null,2));
console.log('CPU imported Three camera/geometry validation with actual arena/actor specs; skyway uses a fake browser texture-loader boundary. This is not browser rendering, real image decode, physical device/FPS/thermal or normal-account play evidence.');
assert.equal(failures.length,0,failures.map(x=>x.name+': '+x.message).join('\n'));
