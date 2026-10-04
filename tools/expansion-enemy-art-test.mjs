import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import * as THREE from 'three';
import {createSurvivalArt} from '../src/survival-art.js';
import {EXPANSION_ENEMY_ART,expansionEnemyArt,expansionEnemyFrame,paintExpansionEnemy} from '../src/expansion-actor-art.js';
import {ACTOR_THREAT_GEOMETRIES,actorArtFile,actorFrameGeometry} from '../src/actor-art.js';
import * as journeyRules from '../src/expansion-journey.js';
// Exercise the real billboard callback with a tilted camera and scaled parent.
// Impact height changes must preserve the source sheet's contact anchor.
const actorSource=fs.readFileSync('src/actor-art.js','utf8'),billboardStart=actorSource.indexOf('function billboard('),billboardEnd=actorSource.indexOf('\nexport function attachActorArt',billboardStart);
const poseContext=vm.createContext({THREE,parentWorld:new THREE.Quaternion(),inverseParent:new THREE.Quaternion(),rollQuaternion:new THREE.Quaternion(),cameraUp:new THREE.Vector3(),localOffset:new THREE.Vector3(),localUp:new THREE.Vector3(0,1,0),localForward:new THREE.Vector3(0,0,1)});
vm.runInContext(actorSource.slice(billboardStart,billboardEnd),poseContext);
for(const size of [1.95,4.1,4.4])for(const impact of [0,.5,1])for(const roll of [-.105,0,.105]){
 const parent=new THREE.Group();parent.rotation.y=.9;parent.scale.setScalar(1.22);parent.position.set(3,0,4);parent.updateMatrixWorld();
 const camera=new THREE.PerspectiveCamera();camera.position.set(0,22,15);camera.lookAt(0,0,0);camera.updateMatrixWorld();
 const sprite=new THREE.Mesh(new THREE.PlaneGeometry(1,1));sprite.scale.set(size*(1+impact*.045),size*(1-impact*.035),1);parent.add(sprite);
 poseContext.billboard(sprite,camera,size,62/512);sprite.userData.roll=roll;sprite.onBeforeRender();sprite.updateMatrixWorld();
 const contact=new THREE.Vector3(0,.5-450/512,0).applyMatrix4(sprite.matrixWorld);
 assert(contact.distanceTo(parent.position)<1e-6,'impact squash and roll must not move the painted foot');sprite.geometry.dispose();
}
const main=fs.readFileSync('src/main.js','utf8'),start=main.indexOf('function spawnExpansionActor('),end=main.indexOf('\nfunction expansionBolt(',start);
for(const act of ['crosswind','crystalGorge']){
 const attached=[],context=vm.createContext({THREE,expansionChannel:'inspection',scene:new THREE.Scene(),expansionJourney:journeyRules.createExpansionJourney(act),expansionApi:journeyRules,camera:{},release(){},expansionEnemyArt,enemies:[],attachActorArt:(e,c,r,art)=>attached.push({e,art})});
 vm.runInContext(main.slice(start,end),context);
 for(const type of ['scout','lobber','charger']){
  const e=context.spawnExpansionActor({type,hp:100,position:{x:5,z:1},cooldown:2,windup:.8,speed:1,shots:1,bulletSpeed:5,damage:9});assert.equal(e.hp,100);assert.equal(attached.at(-1).art.file,EXPANSION_ENEMY_ART[act].file);e.expansionThreat.phase='charge';assert.equal(attached.at(-1).art.atlasFrame(e),expansionEnemyFrame(type,true));
 }
}
for(const [act,art] of Object.entries(EXPANSION_ENEMY_ART)){
 for(const reducedTextures of [false,true]){
  const file=actorArtFile(art.file,{reducedTextures}),b=fs.readFileSync('public/assets/'+file);assert.equal(b.toString('ascii',0,4),'RIFF');assert(b[20]&16);
  assert.equal(b.readUIntLE(24,3)+1,reducedTextures?768:1536);assert.equal(b.readUIntLE(27,3)+1,reducedTextures?512:1024);assert(b.length<(reducedTextures?120000:400000));
 }
 const meta=JSON.parse(fs.readFileSync('public/assets/'+art.file.replace('.webp','.json'),'utf8'));assert.equal(meta.baselinePixels,450);assert.deepEqual(meta.grid,[3,2]);assert.equal(meta.frames.length,6);
 const opts=expansionEnemyArt(act);for(const [role,column] of [['scout',0],['lobber',1],['charger',2]]){
  const model={type:role,phase:'windup',timer:.4,cooldown:2},actor={expansionThreat:model};assert.equal(opts.atlasFrame(actor),column);model.phase='recover';model.timer=2;assert.equal(opts.atlasFrame(actor),column+3);model.timer=1;assert.equal(opts.atlasFrame(actor),column);
 }
 const calls=[],ctx={drawImage:(...args)=>calls.push(args)},image={complete:true,naturalWidth:768,width:768,height:512};
 for(const kind of ['fast','shield','swarm'])assert(paintExpansionEnemy(ctx,{kind,x:2,y:3},image,4));assert.deepEqual(calls.map(a=>a[1]),[512,256,0]);assert(calls.every(a=>a[6]+a[8]*450/512===3));
}
for(let i=0;i<6;i++)assert.equal(actorFrameGeometry(i,{columns:3,rows:2}),ACTOR_THREAT_GEOMETRIES[i]);
const original=THREE.TextureLoader.prototype.load,loaded=[];THREE.TextureLoader.prototype.load=function(url){const t=new THREE.Texture();t.userData.url=url;loaded.push(t);return t;};
try{
 for(const mobile of [false,true]){
  loaded.length=0;const scene=new THREE.Scene(),camera=new THREE.PerspectiveCamera();camera.position.set(0,20,15);camera.lookAt(0,0,0);camera.updateMatrixWorld();
  const art=createSurvivalArt(scene,camera,{baseUrl:'/seed/',mobile,capacity:300});art.setActive(true);assert(!loaded.some(t=>t.userData.url.includes('expansion/')));
  const actors=Array.from({length:300},(_,i)=>{const g=new THREE.Group();g.position.set(i%20-10,0,Math.floor(i/20)-7);return {g,survivalKind:['swarm','runner','brute'][i%3],phase:i,rushState:i%2?'rush':'brace',timer:0,hit:0};});
  for(const act of [3,4]){
   art.setAct(act);const file=actorArtFile(EXPANSION_ENEMY_ART[act===3?'crosswind':'crystalGorge'].file,{reducedTextures:mobile});assert(loaded.some(t=>t.userData.url==='/seed/assets/'+file));
   const root=scene.getObjectByName('survival-garden-art'),geometryCount=new Set(root.children.filter(o=>o.name.startsWith('survival-')&&o.isInstancedMesh).map(o=>o.geometry)).size;
   for(let frame=0;frame<120;frame++)assert.equal(art.update(actors,frame/60),300);
   assert.equal(art.state().maxBodyBatches,12);assert.equal(art.state().bodyBatches,6);assert.equal(art.state().overflow,0);
   const body=root.getObjectByName('survival-runner-1'),m=new THREE.Matrix4();body.getMatrixAt(0,m);
   // Authored contact anchor survives the actual rush Y-scale and camera tilt.
   const foot=new THREE.Vector3(0,.5-450/512,0).applyMatrix4(m),expected=actors[1].g.position;
   assert(Math.abs(foot.x-expected.x)<1e-5&&Math.abs(foot.z-expected.z)<1e-5&&foot.y>=.035-1e-5&&foot.y<.08);
   assert.equal(new Set(root.children.filter(o=>o.name.startsWith('survival-')&&o.isInstancedMesh).map(o=>o.geometry)).size,geometryCount);
  }
  const before=loaded.length;art.setAct(3);art.update(actors,3);assert.equal(loaded.length,before,'re-entering acts reuses same resolution texture');art.dispose();assert.equal(scene.children.length,0);
 }
}finally{THREE.TextureLoader.prototype.load=original;}
console.log('Act4/5 enemy art: actual role/pose crops, baseline, resolution cache, fixed 12 buffers and 300 actors×120 updates per act passed. No live gameplay, GPU FPS or device claim.');
