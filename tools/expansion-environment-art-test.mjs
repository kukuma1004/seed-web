import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import * as THREE from 'three';
import * as rules from '../src/expansion-journey.js';
import {createExpansionEnvironmentArt,EXPANSION_ENVIRONMENTS} from '../src/expansion-environment-art.js';
import {createExpansionJourneyView} from '../src/expansion-journey-view.js';
import {paintDefenseCrystal} from '../src/seed-defense-art.js';
import {EXPANSION_BOSS_ART,EXPANSION_ENEMY_ART} from '../src/expansion-actor-art.js';
import {actorArtFile} from '../src/actor-art.js';
import {defenseWaveInfo} from '../src/seed-defense-rules.js';

const calls=[],textures=[],loader={async loadAsync(url){calls.push(url);const t=new THREE.Texture();textures.push(t);return t;}};
for(const mobile of [false,true]){
 const cache=createExpansionEnvironmentArt({loader,baseUrl:'/seed-web/',mobile});
 const first=cache.load('crosswind'),second=cache.load('crosswind');assert.equal(first,second,'concurrent requests share one decode');
 const t=await first;assert.equal(await cache.load('crosswind'),t);assert.equal(cache.loaded,1);
 assert.equal(t.wrapS,THREE.ClampToEdgeWrapping);assert.equal(t.wrapT,THREE.ClampToEdgeWrapping);assert.deepEqual(t.repeat.toArray(),[1,1]);
 const url=calls.at(-1);assert.equal(url,`/seed-web/assets/expansion/act4-crosswind-plate${mobile?'-mobile':''}-v1.webp`);
 assert(fs.existsSync('public'+url.replace('/seed-web','')));
 const count=calls.length;assert.equal(await cache.load('unknown'),null);assert.equal(calls.length,count);
 const gorge=await cache.load('crystalGorge');assert.equal(cache.loaded,2);assert.notEqual(gorge,t);
 const cover=await cache.loadCover();assert.equal(cache.loaded,3);assert.equal(calls.at(-1),'/seed-web/assets/expansion/crystal-cover-v1.webp','same small cover sheet for both device classes');
 let disposed=0;for(const texture of [t,gorge,cover])texture.addEventListener('dispose',()=>disposed++);cache.dispose();cache.dispose();assert.equal(disposed,3);assert.equal(await cache.load('crosswind'),null);
}
let attempts=0;const failed=createExpansionEnvironmentArt({loader:{loadAsync(){if(++attempts===1)throw new Error('offline');return new THREE.Texture();}}});
await assert.rejects(failed.load('crosswind'));assert.equal(failed.loaded,0);assert(await failed.load('crosswind'));assert.equal(attempts,2);failed.dispose();
let deliver;const leaving=createExpansionEnvironmentArt({loader:{loadAsync:()=>new Promise(r=>deliver=r)}});
const pending=leaving.load('crosswind');await Promise.resolve();leaving.dispose();const late=new THREE.Texture();let lateDisposed=0;late.addEventListener('dispose',()=>lateDisposed++);deliver(late);assert.equal(await pending,null);assert.equal(lateDisposed,1);

const scene=new THREE.Scene(),sharedFloor=new THREE.Texture(),plate4=new THREE.Texture(),plate5=new THREE.Texture();
const view=createExpansionJourneyView(scene,sharedFloor);view.setActive(true);const plate=view.root.getObjectByName('expansion-environment-plate');
const floor=view.root.children.find(o=>o.isInstancedMesh&&o.geometry.parameters.width===8),planeGeometry=plate.geometry,material=plate.material;
assert.equal(plate.visible,false);assert.equal(floor.visible,true);
view.setPlate('crosswind',plate4);assert.equal(plate.visible,true);assert.equal(floor.visible,false);assert.equal(material.map,plate4);
view.root.updateMatrixWorld(true);const box=new THREE.Box3().setFromObject(plate);assert(box.min.x<=-11&&box.max.x>=140,'finite scenery covers actual course and rear entries');
const definition=EXPANSION_ENVIRONMENTS.crosswind;
const bandMin=definition.z+(.29-.5)*definition.depth,bandMax=definition.z+(.63-.5)*definition.depth;
assert(bandMin<=-7&&bandMax>=7,'real movement stays on the painted stone band, not in clouds');
view.setTerrainOnly(true);assert.equal(plate.visible,false);assert.equal(floor.visible,false,'survival keeps its existing ground');
view.setPlate('crystalGorge',plate5);assert.equal(material.map,plate4,'a late inactive load cannot replace the current act');
view.setCourse('crystalGorge');assert.equal(plate.visible,false);assert.equal(material.map,plate5);view.setTerrainOnly(false);assert.equal(plate.visible,true);
assert.equal(plate.geometry,planeGeometry);assert.equal(plate.material,material);assert.equal(floor.count,12);
for(let i=0;i<60;i++){view.setCourse(i%2?'crosswind':'crystalGorge');view.beginFrame();view.tell({position:{x:0,z:0},dir:{x:1,z:0}});}
assert.equal(view.root.children.filter(o=>o.name==='expansion-environment-plate').length,1,'one opaque plate draw, no tiled transparent layers');
let sharedDisposed=0;for(const t of [sharedFloor,plate4,plate5])t.addEventListener('dispose',()=>sharedDisposed++);view.dispose();view.setPlate('crosswind',new THREE.Texture());assert.equal(sharedDisposed,0);assert.equal(scene.children.length,0);
// Execute the production async launcher against delayed asset IO. A slow
// image must not reopen a cancelled mode or restore another account's build.
const main=fs.readFileSync(new URL('../src/main.js',import.meta.url),'utf8');
const start=main.indexOf('async function startExpansionJourney('),end=main.indexOf('function spawnExpansionActor(',start);
assert(start>0&&end>start);const launcher=main.slice(start,end).replace("import('./expansion-journey.js')",'Promise.resolve(__rules)').replace("import('./expansion-journey-view.js')",'Promise.resolve(__view)').replaceAll('import.meta.env.BASE_URL',"'/seed-web/'");
let owner='owner-A',restarts=0;const waits=[];
const ctx=vm.createContext({__rules:rules,__view:{},localInspection:true,expansionLaunch:0,expansionSaveLease:null,acquireExpansionSaveLease:async(act,uid)=>({ok:true,key:uid+':'+act,active:()=>true,release:async()=>{}}),expansionApi:rules,expansionOwner:()=>owner,rawStorage:{},createExpansionSaveStore:(storage,act,uid)=>{ctx.lastReadOwner=uid;return {key:uid+':'+act,read:()=>null};},expansionStore:()=>{throw new Error('resume must not read previous active account');},expansionCrystalTexture:{},expansionJourneyView:{},scene:{},stone:{},
 prepareExpansionEnvironment:()=>new Promise(resolve=>waits.push(resolve)),prepareExpansionCover:()=>Promise.resolve(),expansionSaveOwner:null,expansionEntry:null,expansionJourney:null,mirrorSession:null,survivalSession:null,trainingSession:null,developerRun:false,labSafe:false,startRegion:null,
 restart:()=>restarts++,enemies:[],fallen:[],player:{position:new THREE.Vector3()},releaseEnemy(){},wave(){},$:()=>({textContent:''}),stage:0,mode:'ready',paused:false});
vm.runInContext(launcher,ctx);
async function waitFor(n){for(let i=0;i<15&&waits.length<n;i++)await new Promise(resolve=>setImmediate(resolve));assert.equal(waits.length,n);}
ctx.expansionSaveOwner='previous-owner';owner='owner-B';assert.equal(await ctx.startExpansionJourney(0,'crosswind',{resume:true}),false);assert.equal(ctx.lastReadOwner,'owner-B');assert.equal(restarts,0);owner='owner-A';ctx.expansionSaveOwner=null;
const changed=ctx.startExpansionJourney();await waitFor(1);owner='owner-B';waits[0]();assert.equal(await changed,false);assert.equal(restarts,0);
const older=ctx.startExpansionJourney(0,'crosswind');await waitFor(2);const newer=ctx.startExpansionJourney(0,'crystalGorge');await waitFor(3);waits[2]();assert.equal(await newer,true);waits[1]();assert.equal(await older,false);assert.equal(restarts,1);assert.equal(ctx.expansionJourney.act,'crystalGorge');assert.equal(ctx.expansionSaveOwner,'owner-B');
const cancelled=ctx.startExpansionJourney();await waitFor(4);ctx.expansionLaunch++;waits[3]();assert.equal(await cancelled,false);assert.equal(restarts,1);
const coverBytes=fs.readFileSync('public/assets/expansion/crystal-cover-v1.webp');assert(coverBytes.length<200000);assert.equal(coverBytes.toString('ascii',0,4),'RIFF');assert.equal(coverBytes.toString('ascii',8,12),'WEBP');assert(coverBytes[20]&16);assert.equal(coverBytes.readUIntLE(24,3)+1,1536);assert.equal(coverBytes.readUIntLE(27,3)+1,512);
const packing=JSON.parse(fs.readFileSync('public/assets/expansion/crystal-cover-v1.json','utf8'));assert.deepEqual(packing.frames.map(f=>f.name),['intact','damaged','broken']);for(const f of packing.frames)assert.deepEqual(f.anchor,[.5,.88]);
const coverView=createExpansionJourneyView(new THREE.Scene(),new THREE.Texture()),coverTexture=new THREE.Texture(),coverCamera=new THREE.PerspectiveCamera();coverCamera.rotation.set(-.65,0,0);coverCamera.updateMatrixWorld();
coverView.setCoverTexture(coverTexture);const batches=['intact','damaged','broken'].map(name=>coverView.root.getObjectByName('expansion-crystal-'+name));
const initialGeometry=batches.map(o=>o.geometry),initialMaterial=batches[0].material;assert(batches.every(o=>o.material===initialMaterial&&o.material.map===coverTexture));
const walls=[{x:0,z:0,w:1.2,d:1.2,hp:100,maxHp:100,broken:false},{x:3,z:0,w:1.2,d:1.2,hp:40,maxHp:100,broken:false},{x:6,z:0,w:1.2,d:1.2,hp:0,maxHp:100,broken:true}];
const untouched=JSON.stringify(walls);coverView.syncCrystals(walls,coverCamera);assert.deepEqual(batches.map(o=>o.count),[1,1,1]);assert.equal(JSON.stringify(walls),untouched,'visual debris does not regrow collision or change HP');
for(let frame=0;frame<3;frame++){const uv=batches[frame].geometry.getAttribute('uv');for(let n=0;n<uv.count;n++){assert(uv.getX(n)>=frame/3-1e-7&&uv.getX(n)<=(frame+1)/3+1e-7);assert(uv.getY(n)===0||uv.getY(n)===1);}
 const m=new THREE.Matrix4();batches[frame].getMatrixAt(0,m);const foot=new THREE.Vector3(0,(.12-.5)*2.1+(.88-.5)*2.1,0).applyMatrix4(m);assert(Math.abs(foot.y-.025)<1e-5,'every stage stays anchored on the same floor');}
for(let tick=0;tick<100;tick++){walls[0].hp=tick%2?40:100;coverView.syncCrystals(walls,coverCamera);coverView.setCoverTexture(coverTexture);assert.equal(batches.reduce((n,o)=>n+o.count,0),3);assert(batches.every((o,i)=>o.geometry===initialGeometry[i]&&o.material===initialMaterial));}
coverView.setCourse('crosswind');assert(batches.every(o=>o.count===0));let coverDisposed=0;coverTexture.addEventListener('dispose',()=>coverDisposed++);coverView.dispose();assert.equal(coverDisposed,0);coverTexture.dispose();
const canvasCalls=[],canvas=new Proxy({drawImage:(...args)=>canvasCalls.push(args)},{get:(o,k)=>k in o?o[k]:()=>{}}),coverImage={complete:true,naturalWidth:1536,width:1536,height:512};
const paintedWalls=[{x:2,z:5,w:3.8,d:3.8,hp:100,maxHp:100,broken:false},{x:2,z:5,w:3.8,d:3.8,hp:49,maxHp:100,broken:false},{x:2,z:5,w:3.8,d:3.8,hp:0,maxHp:100,broken:true}];
const stateBefore=JSON.stringify(paintedWalls);for(const w of paintedWalls)assert(paintDefenseCrystal(canvas,w,coverImage));assert.deepEqual(canvasCalls.map(c=>c[1]),[0,512,1024]);for(const c of canvasCalls){assert.equal(c[3],512);assert(Math.abs(c[6]+c[7]*.88)<1e-7);}
assert.equal(JSON.stringify(paintedWalls),stateBefore);assert.equal(paintDefenseCrystal(canvas,paintedWalls[2],null),false);assert(paintDefenseCrystal(canvas,paintedWalls[0],null));assert.equal(canvasCalls.length,3,'fallback never draws a stale image');
const defenseSource=fs.readFileSync(new URL('../src/seed-defense-view.js',import.meta.url),'utf8'),loaderStart=defenseSource.indexOf(' function updateExpansionVisuals(){'),loaderEnd=defenseSource.indexOf('\n function draw(',loaderStart);assert(loaderStart>0&&loaderEnd>loaderStart);
const canvasLoads=[],canvasCtx=vm.createContext({expansionVisualWave:-1,state:{wave:1,actCount:3},assets:{},defenseWaveInfo,EXPANSION_BOSS_ART,EXPANSION_ENEMY_ART,actorArtFile,load:(id,file)=>{canvasLoads.push(file);canvasCtx.assets[id]={};}});vm.runInContext(defenseSource.slice(loaderStart,loaderEnd),canvasCtx);
for(const wave of [1,12,24,36,48,60]){canvasCtx.state.wave=wave;canvasCtx.updateExpansionVisuals();}assert.equal(canvasLoads.length,0,'existing three-act clients decode no expansion assets');
canvasCtx.state={wave:49,actCount:5};for(let i=0;i<200;i++)canvasCtx.updateExpansionVisuals();assert.deepEqual(canvasLoads,['expansion/crystal-cover-v1.webp','expansion/boss-crystal-motion-mobile-v1.webp','expansion/enemy-crystal-motion-mobile-v1.webp']);canvasCtx.state.wave=50;canvasCtx.updateExpansionVisuals();assert.equal(canvasLoads.length,3,'one cover/boss/enemy sheet decoded across waves');canvasCtx.state.wave=37;canvasCtx.updateExpansionVisuals();assert.deepEqual(canvasLoads.slice(-2),['expansion/boss-crosswind-motion-mobile-v1.webp','expansion/enemy-crosswind-motion-mobile-v1.webp']);
console.log('Expansion scenery: lazy active-size cache, failed/late load lifecycle, finite stone alignment, terrain-only isolation and shared texture ownership passed; no GPU or live screenshot claim.');
