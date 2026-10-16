import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {runInNewContext} from 'node:vm';
import * as THREE from 'three';
import {crosswindJourneyCamera} from '../src/journey-crosswind-camera.js';
import {journeyPlayerScale} from '../src/journey-player-presentation.js';
import {createCameraFeel} from '../src/camera-feel.js';
import {createExpansionJourneyView} from '../src/expansion-journey-view.js';
import {createExpansionJourney} from '../src/expansion-journey.js';
import {crosswindReflectorPanels} from '../src/act-expansion.js';
import {crosswindUndertowFields,applyCrosswindUndertow,CROSSWIND_UNDERTOW} from '../src/crosswind-undertow.js';
import {constrainToArena} from '../src/arena.js';
import {reflectMirrorPanels} from '../src/mirror-fighter.js';

const main=readFileSync(new URL('../src/main.js',import.meta.url),'utf8'),arenaStart=main.indexOf('arena=s.siege?'),arenaEnd=main.indexOf(';',arenaStart)+1;
const scaleHost=main.slice(main.indexOf(' const journeyReadable='),main.indexOf(' contactShadows.update(',main.indexOf(' const journeyReadable=')));
assert(scaleHost.includes('journeyPlayerScale(canvasRect.width,canvasRect.height,expansionJourney?.act)'));
for(const region of ['garden','stadium','skyway'])for(const variant of ['native','survival','mirror','training','crosswind','siege'])for(const [width,height] of [[1280,720],[640,360]]){
 const player=new THREE.Object3D();player.scale.setScalar(1.42);
 const context={region,arborJourney:null,expansionJourney:variant==='crosswind'?{act:'crosswind'}:variant==='siege'?{act:'crystalGorge',siege:{}}:null,survivalSession:variant==='survival'?{}:null,mirrorSession:variant==='mirror'?{}:null,trainingSession:variant==='training'?{}:null,isAct3:r=>r==='skyway',player,canvasRect:{width,height},journeyPlayerScale};
 runInNewContext(scaleHost,context);
 assert.equal(player.scale.x,['crosswind','siege'].includes(variant)||variant==='native'&&region==='skyway'?journeyPlayerScale(width,height,context.expansionJourney?.act):1.42,'native Journey3/4/5 keeps a readable Seed silhouette');
}
assert(arenaStart>=0&&arenaEnd>arenaStart,'exercise the shipping host arena, not a duplicate arena fixture');
const hostArena=(phase,encounterVersion)=>{
 const context={s:{act:'crosswind',phase,course:{encounterVersion}},canyon:false,distance:48,length:140};
 runInNewContext(main.slice(arenaStart,arenaEnd),context);return context.arena;
};
const camera=new THREE.PerspectiveCamera(39,1,.1,100),point=new THREE.Vector3(),matrix=new THREE.Matrix4(),bounds=new THREE.Box3();
const projection=[];
for(const [width,height] of [[1280,720],[1024,768],[844,390],[640,360]])for(const [phase,version] of [['course',3],['course',1],['boss',3]]){
 const arena=hostArena(phase,version),layout=crosswindJourneyCamera(width,height,arena.halfDepth);
 assert.equal(layout,crosswindJourneyCamera(width,height,arena.halfDepth));assert(Object.isFrozen(layout));assert.equal(layout.followZ,1);assert.equal(layout.leadScale,.35);
 const feel=createCameraFeel();let actorPixels=0;
 for(let frame=0;frame<600;frame++){
  const playerX=frame===0?99:99+frame*6.09/60,playerZ=Math.sin(frame*.015)*(arena.halfDepth-.4),pose=feel.follow(1/60,{playerX,playerZ,moveX:6.09/60,moveZ:0,followX:1,followZ:1,leadScale:.35,baseZoom:layout.zoom,biasX:layout.biasX,biasZ:layout.biasZ,snapDistance:layout.snapDistance});
  camera.aspect=width/height;camera.zoom=pose.zoom;camera.position.set(pose.x,layout.height,layout.offsetZ+pose.z);camera.lookAt(pose.x,0,pose.z);camera.updateProjectionMatrix();camera.updateMatrixWorld();
  point.set(playerX,0,playerZ).project(camera);assert(Math.abs(point.x)<.35&&Math.abs(point.y)<.45,'entry at x99 and lane movement keep the player visible immediately');
  const foot=point.y;point.set(playerX,0,playerZ).addScaledVector(new THREE.Vector3(0,1,0).applyQuaternion(camera.quaternion),1.18*journeyPlayerScale(width,height,'crosswind')).project(camera);actorPixels=(point.y-foot)*height/2;
  assert(actorPixels>=(height<=520?35:60));
 }
 projection.push({width,height,phase,halfDepth:arena.halfDepth,zoom:layout.zoom,actorPixels});
}

const scene=new THREE.Scene(),ground=new THREE.Texture(),tile=new THREE.Texture({width:1024,height:1024}),panorama=new THREE.Texture({width:2048,height:1024}),canyon=new THREE.Texture();
const view=createExpansionJourneyView(scene,ground),root=view.root,road=root.getObjectByName('crosswind-painted-corridor-floor'),plate=root.getObjectByName('expansion-environment-plate'),curbs=root.getObjectByName('crosswind-beveled-boundary'),marks=root.getObjectByName('crosswind-reflector-contact-marks');
const borrowed={tileRepeat:tile.repeat.toArray(),tileWrap:tile.wrapS,panoramaRepeat:panorama.repeat.toArray(),panoramaWrap:panorama.wrapS};
let borrowedDisposals=0,ownedDisposals=0;for(const texture of [ground,tile,panorama,canyon])texture.addEventListener('dispose',()=>borrowedDisposals++);
view.setPlate('crosswind',panorama);view.setCrosswindFloorTexture(tile);const ownedTile=road.material.map,ownedPanorama=plate.material.map;
for(const texture of [ownedTile,ownedPanorama])texture.addEventListener('dispose',()=>ownedDisposals++);
view.setActive(true);
for(const [phase,version] of [['course',3],['course',1],['boss',3]]){
 const arena=hostArena(phase,version);view.setCourse('crosswind',{halfDepth:arena.halfDepth});root.updateMatrixWorld(true);
 assert(!road.visible&&plate.visible,'integrated paving, wall contact and palm shadows use one painting');
 assert(Math.abs(ownedPanorama.repeat.x-plate.scale.x/(plate.scale.y*2))<1e-10,'legacy and boss widths retain the image source aspect too');
 const coverage=new THREE.Box3().setFromObject(plate),ray=new THREE.Raycaster(),groundPlane=new THREE.Plane(new THREE.Vector3(0,1,0),-.02),hit=new THREE.Vector3();
 for(const [w,h] of [[1280,720],[1024,768],[844,390],[640,360]])for(const x of [0,99]){
  const fit=crosswindJourneyCamera(w,h,arena.halfDepth);camera.aspect=w/h;camera.zoom=fit.zoom;camera.position.set(x,fit.height,fit.lookZ+fit.offsetZ);camera.lookAt(x,0,fit.lookZ);camera.updateProjectionMatrix();camera.updateMatrixWorld();
  for(const u of [-1,1])for(const v of [-1,1]){ray.setFromCamera(new THREE.Vector2(u,v),camera);assert(ray.ray.intersectPlane(groundPlane,hit));assert(hit.x>=coverage.min.x&&hit.x<=coverage.max.x&&hit.z>=coverage.min.z&&hit.z<=coverage.max.z,'painting covers all viewport corners without uncovered background bars');}
 }
 bounds.setFromObject(road);assert(Math.abs(bounds.min.z+arena.halfDepth)<1e-6&&Math.abs(bounds.max.z-arena.halfDepth)<1e-6,'painted road and actual movement wall agree exactly');
 const escaped={x:0,z:100};constrainToArena(escaped,.4,arena);assert(Math.abs(escaped.z+.4-bounds.max.z)<1e-6,'shipping player-radius constraint reaches the visible floor edge');
 assert(Math.abs(ownedTile.repeat.x-38)<1e-8);assert(Math.abs(ownedTile.repeat.y-arena.halfDepth/3)<1e-8,'six-world-unit stone sampling across modern and legacy widths');
 curbs.geometry.computeBoundingBox();
 for(let i=0;i<curbs.count;i++){
  curbs.getMatrixAt(i,matrix);bounds.copy(curbs.geometry.boundingBox).applyMatrix4(matrix);const inner=i%2?bounds.min.z:-bounds.max.z;
  assert(Math.abs(inner-arena.halfDepth)<1e-5,'stone inner face begins exactly at the shipping movement limit');
 }
}
view.setCourse('crosswind',{halfDepth:5.4});view.setReflectorsActive(true);
const panels=crosswindReflectorPanels(22);view.syncReflectors(panels);assert.equal(marks.count,16);marks.geometry.computeBoundingBox();
for(let p=0;p<panels.length;p++){
 const panel=panels[p],union=new THREE.Box3();
 for(let i=0;i<4;i++){marks.getMatrixAt(p*4+i,matrix);union.union(bounds.copy(marks.geometry.boundingBox).applyMatrix4(matrix));}
 assert(Math.abs(union.min.x-(panel.x-panel.w/2))<1e-5&&Math.abs(union.max.x-(panel.x+panel.w/2))<1e-5);
 assert(Math.abs(union.min.z-(panel.z-panel.d/2))<1e-5&&Math.abs(union.max.z-(panel.z+panel.d/2))<1e-5,'contact marks trace actual slab dimensions');
 const next={x:panel.x,z:panel.z+1},dir={x:0,z:1};assert(reflectMirrorPanels({x:panel.x,z:panel.z-1},next,dir,[panel],0));assert.equal(dir.z,-1);
 const outside=panel.x+panel.w/2+.01;assert.equal(reflectMirrorPanels({x:outside,z:panel.z-1},{x:outside,z:panel.z+1},{x:0,z:1},[panel],0),false,'decorative marks do not promise an extra reflecting wall');
}

const journey=createExpansionJourney('crosswind',0,42),course=journey.course;course.time=2.4;
const fields=crosswindUndertowFields(course),undertow=root.children.filter(o=>o.name.startsWith('crosswind-undertow-'));
assert.equal(undertow.length,3);view.syncUndertow(fields);const positions=new THREE.Vector3();
for(const batch of undertow){
 assert(batch.isInstancedMesh&&batch.count<=2);assert(batch.material.forceSinglePass);const attribute=batch.geometry.getAttribute('position');
 for(let i=0;i<batch.count;i++){
  batch.getMatrixAt(i,matrix);let maxRadius=0;
  for(let vertex=0;vertex<attribute.count;vertex++){
   positions.fromBufferAttribute(attribute,vertex).applyMatrix4(matrix);maxRadius=Math.max(maxRadius,Math.hypot(positions.x-fields[i].x,positions.z-fields[i].z));assert(positions.y>.037,'depression stays above the actual road plane');
  }
  assert(maxRadius<=CROSSWIND_UNDERTOW.radius+1e-5,'sand visual never exceeds the gameplay influence radius');
  if(batch!==undertow[2])assert(Math.abs(maxRadius-CROSSWIND_UNDERTOW.radius)<1e-5,'bowl and thin rim share the exact pull boundary');
 }
}
const active=fields.find(f=>f.phase==='pull'),outside={x:active.x+CROSSWIND_UNDERTOW.radius+.001,z:active.z},inside={x:active.x+CROSSWIND_UNDERTOW.radius-.1,z:active.z};
assert(!applyCrosswindUndertow(course,outside,.1));assert(applyCrosswindUndertow(course,inside,.1),'the visible bowl edge agrees with the real force application');
const count=root.children.length,resources=root.children.map(o=>[o.geometry,o.material]),lightCount=root.children.filter(o=>o.isLight).length;
for(let frame=0;frame<10000;frame++){course.time=frame/60;view.syncUndertow(crosswindUndertowFields(course));view.beginFrame();}
assert.equal(root.children.length,count);assert.equal(lightCount,0);assert.deepEqual(root.children.map(o=>[o.geometry,o.material]),resources,'10k updates reuse every object, geometry and material');
assert.equal(road.material.map,ownedTile);assert.equal(plate.material.map,ownedPanorama);
view.setTerrainOnly(true);assert(!road.visible&&!plate.visible&&!curbs.visible&&!marks.visible);assert(undertow.every(o=>!o.visible),'Survival terrain-only excludes journey decoration');
view.setTerrainOnly(false);view.setPlate('crystalGorge',canyon);view.setCourse('crystalGorge',{plateBounds:{width:48,depth:42},crystalGarden:true});
assert.equal(plate.material.map,canyon);assert.deepEqual(plate.scale.toArray(),[48,42,1]);view.setSiegePhase('defense');assert.equal(plate.material.color.getHex(),0xd3dde6);
assert(!road.visible&&!curbs.visible&&!marks.visible&&undertow.every(o=>!o.visible&&o.count===0),'Act5 keeps its established plate and owns no Act4 cues');
assert.deepEqual({tileRepeat:tile.repeat.toArray(),tileWrap:tile.wrapS,panoramaRepeat:panorama.repeat.toArray(),panoramaWrap:panorama.wrapS},borrowed,'cached source textures retain their original sampling');
let disposed=0;for(const b of undertow)for(const r of [b.geometry,b.material])r.addEventListener('dispose',()=>disposed++);
view.dispose();view.dispose();assert.equal(disposed,6);assert.equal(ownedDisposals,2);assert.equal(borrowedDisposals,0);assert.equal(scene.children.length,0);
console.log(JSON.stringify({result:'PASS',projection,objects:count,undertowDraws:3,maxFields:2,frames:10000,lights:lightCount,checks:'actual THREE camera/geometry, shipping host collision, actual reflector and undertow force, fixed ownership and Act5/Survival isolation. CPU scene verification; live browser/device QA remains separate.'},null,2));
