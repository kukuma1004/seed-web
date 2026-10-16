import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import * as THREE from 'three';
import {crystalSiegeCamera} from '../src/crystal-siege-camera.js';
import {journeyFlightCamera} from '../src/journey-flight-camera.js';
import {crosswindJourneyCamera} from '../src/journey-crosswind-camera.js';
import {CRYSTAL_GARDEN_ART,CRYSTAL_GARDEN_MOBILE_ART,CRYSTAL_TURRET_ART,CRYSTAL_TURRET_MOBILE_ART,crystalTurretTexture,CRYSTAL_GARDEN_FRAMES,crystalGardenTexture,crystalGardenArtStyle,crystalGardenFloorContactTexture} from '../src/crystal-garden-art.js';
import {createCrystalSiegeView} from '../src/crystal-siege-view.js';
import {createCrystalSiege} from '../src/crystal-siege-rules.js';
import {createExpansionEnvironmentArt} from '../src/expansion-environment-art.js';
import {createExpansionJourneyView} from '../src/expansion-journey-view.js';
import {responsiveView} from '../src/responsive-view.js';

const passed=[],failures=[],measurements={camera:[],assets:[],view:[]};
async function group(name,run){try{await run();passed.push(name);}catch(error){failures.push({name,error});console.error('FAIL',name,error.message);}}
const freeze=value=>{if(value&&typeof value==='object'&&!Object.isFrozen(value)){for(const child of Object.values(value))freeze(child);Object.freeze(value);}return value;};
const viewportCases=[[1280,720],[1024,768],[844,390],[640,360]];
const safeArea=(width,height)=>({top:height<=520?60:80,bottom:height<=520?62:92,side:width<=700?20:36});
function makeCamera(width,height,pose){const camera=new THREE.PerspectiveCamera(39,width/height,.1,100);camera.zoom=pose.zoom;camera.position.set(0,pose.height,pose.lookZ+pose.offsetZ);camera.lookAt(0,0,pose.lookZ);camera.updateProjectionMatrix();camera.updateMatrixWorld();return camera;}
function screen(point,camera,width,height){const p=point.clone().project(camera);return{x:(p.x+1)*width/2,y:(1-p.y)*height/2,depth:p.z};}
function inside(point,bounds,width,height,label){const epsilon=1e-5;assert(point.x>=bounds.side-epsilon&&point.x<=width-bounds.side+epsilon,label+' horizontal safe area');assert(point.y>=bounds.top-epsilon&&point.y<=height-bounds.bottom+epsilon,label+' vertical safe area');assert(point.depth>-1&&point.depth<1,label+' camera clip planes');}

await group('Close conservatory camera follows the seed and keeps nearby harvest props in four safe areas',()=>{
 for(const[width,height]of viewportCases){
  const pose=crystalSiegeCamera(width,height),bounds=safeArea(width,height);assert.equal(pose.zoom,responsiveView(width,height,height<=520).zoom);assert.equal(pose.followX,1);assert.equal(pose.followZ,1);
  for(const player of [{x:-3,z:4},{x:7.5,z:-6.5},{x:-7.5,z:6.5}]){
   const camera=makeCamera(width,height,{...pose,lookZ:player.z+pose.biasZ});camera.position.x=player.x;camera.lookAt(player.x,0,player.z+pose.biasZ);camera.updateMatrixWorld();
   const up=new THREE.Vector3(0,1,0).applyQuaternion(camera.quaternion),foot=screen(new THREE.Vector3(player.x,0,player.z),camera,width,height),top=screen(new THREE.Vector3(player.x,0,player.z).addScaledVector(up,1.18*1.25),camera,width,height);
   inside(foot,bounds,width,height,'tracked seed foot');inside(top,bounds,width,height,'tracked seed top');assert(foot.y-top.y>=35);
   measurements.camera.push({width,height,player,zoom:pose.zoom,playerPixels:foot.y-top.y});
  }
 }
});

await group('Resize camera cache returns immutable identities and evicts old viewport fits',()=>{
 const first=crystalSiegeCamera(1280,720);assert(Object.isFrozen(first));
 for(let i=0;i<20000;i++)assert.equal(crystalSiegeCamera(1280,720),first,'unchanged viewport must not allocate a new pose');
 for(let i=0;i<32;i++)assert(Number.isFinite(crystalSiegeCamera(710+i,390).zoom));
 assert.notEqual(crystalSiegeCamera(1280,720),first,'finite cache evicts old resize keys');
 for(const[w,h]of[[0,0],[-1,-1],[NaN,Infinity]]){const pose=crystalSiegeCamera(w,h);assert(Number.isFinite(pose.height)&&Number.isFinite(pose.offsetZ)&&Number.isFinite(pose.zoom));}
});

await group('Actual main camera wiring applies only to Journey siege and caps ultimate zoom without touching other modes',()=>{
 const main=fs.readFileSync(new URL('../src/main.js',import.meta.url),'utf8'),start=main.indexOf(' const skyCamera=isAct3(region)&&!mirrorSession;'),end=main.indexOf('presentJourneySignature();',start);assert(start>0&&end>start);
 const source=main.slice(start,end);
 for(const[width,height]of viewportCases)for(const variant of['journey-prep','journey-boss','journey4','survival','classic']){
  const siege=variant.startsWith('journey-'),expansionJourney=variant==='journey4'?{act:'crosswind',phase:'course',course:{encounterVersion:3}}:siege?{act:'crystalGorge',siege:{},phase:variant==='journey-boss'?'boss':'course'}:null;
  const camera=new THREE.PerspectiveCamera(39,width/height,.1,100),viewLayout=responsiveView(width,height,height<=520);let followOptions;
  const context={isAct3:()=>false,region:'garden',mirrorSession:null,expansionJourney,survivalSession:variant==='survival'?{}:null,survivalSiege:null,survivalExpansion:null,canvasRect:{width,height},crystalSiegeCamera,journeyFlightCamera,crosswindJourneyCamera,trainingSession:null,camera,look:new THREE.Vector3(),visualDt:1/60,cameraMoveX:0,cameraMoveZ:0,player:{position:new THREE.Vector3(7,0,5)},viewLayout,ACT3_VIEW_ZOOM:1,ACT3_VIEW_BIAS:0,MIRROR_VIEW:{followX:.2,followZ:.2,zoom:1},seedVisualReview:false,cameraShake:0,rng:()=>.5,cameraFeel:{follow(_dt,opts){followOptions=opts;return{x:4,z:2,zoom:opts.baseZoom*1.038};}}};
  vm.runInNewContext(source,context);
  if(siege||variant==='journey4'){const pose=siege?crystalSiegeCamera(width,height,viewLayout):crosswindJourneyCamera(width,height,5.4,viewLayout);assert.equal(camera.zoom,pose.maxZoom);assert.equal(camera.position.x,4);assert.equal(camera.position.y,pose.height);assert.equal(context.look.z,2);assert.equal(camera.position.z-context.look.z,pose.offsetZ);assert.equal(followOptions.leadScale,.35);assert.equal(followOptions.followX,1);assert.equal(followOptions.followZ,1);assert.equal(followOptions.snapDistance,4.5);}
  else{assert.equal(followOptions.baseZoom,viewLayout.zoom*(variant==='survival'?1.12:1));assert(Math.abs(camera.zoom-followOptions.baseZoom*1.038)<1e-12,'other modes retain their previous ultimate punch');assert.equal(camera.position.y,22);assert.equal(camera.position.z-context.look.z,15.5);}
 }
});

await group('Atlas six crops share the loaded Source, cover every cell once and preserve the borrowed sampler',()=>{
 const atlas=new THREE.Texture(),before={repeat:atlas.repeat.toArray(),offset:atlas.offset.toArray(),source:atlas.source},cells=[];
 for(const[kind,index]of Object.entries(CRYSTAL_GARDEN_FRAMES)){
  const texture=crystalGardenTexture(atlas,kind);assert.notEqual(texture,atlas);assert.equal(texture.source,atlas.source);assert.deepEqual(texture.repeat.toArray(),[1/3,1/2]);assert.deepEqual(texture.offset.toArray(),[(index%3)/3,index<3?.5:0]);
  const style=crystalGardenArtStyle(kind);assert.equal(style.backgroundSize,'300% 200%');assert.equal(style.backgroundPosition,`${index%3*50}% ${index<3?0:100}%`);cells.push(texture.offset.toArray().join(':'));texture.dispose();
 }
 assert.equal(cells.length,6);assert.equal(new Set(cells).size,6);assert.deepEqual(atlas.repeat.toArray(),before.repeat);assert.deepEqual(atlas.offset.toArray(),before.offset);assert.equal(atlas.source,before.source);assert.throws(()=>crystalGardenTexture(atlas,'missing'));assert.throws(()=>crystalGardenArtStyle('missing'));atlas.dispose();
});

await group('Four authored growth cells are distinct, bounded and use one shared image',()=>{
 const atlas=new THREE.Texture(),offsets=[];for(let level=2;level<=5;level++){const t=crystalTurretTexture(atlas,level);assert.equal(t.source,atlas.source);assert.deepEqual(t.repeat.toArray(),[.5,.5]);offsets.push(t.offset.toArray().join(':'));t.dispose();}assert.equal(new Set(offsets).size,4);assert.throws(()=>crystalTurretTexture(atlas,1));assert.throws(()=>crystalTurretTexture(atlas,6));atlas.dispose();
});

await group('Generated 64px contact texture has a bounded soft alpha falloff and independent ownership',()=>{
 const a=crystalGardenFloorContactTexture(),b=crystalGardenFloorContactTexture();assert(a.isDataTexture&&b.isDataTexture);assert.notEqual(a.source,b.source);assert.equal(a.image.width,64);assert.equal(a.image.height,64);assert.equal(a.image.data.byteLength,16384);assert.equal(a.minFilter,THREE.LinearFilter);assert.equal(a.magFilter,THREE.LinearFilter);assert.equal(a.colorSpace,THREE.SRGBColorSpace);
 const alpha=(x,y)=>a.image.data[(y*64+x)*4+3];assert(alpha(31,31)>140&&alpha(31,31)<=160);assert.equal(alpha(0,0),0);assert.equal(alpha(63,63),0);assert(alpha(31,16)<alpha(31,24)&&alpha(31,24)<alpha(31,31));
 for(let y=0;y<64;y++)for(let x=0;x<64;x++){const i=(y*64+x)*4;assert.deepEqual([...a.image.data.slice(i,i+3)],[8,24,22]);assert.equal(alpha(x,y),alpha(63-x,63-y));}
 let released=0;for(const texture of[a,b])texture.addEventListener('dispose',()=>released++);a.dispose();b.dispose();assert.equal(released,2);
});

// Decode dimensions from the actual WebP bitstream rather than file names.
// This measures RGBA decoded-memory bounds; browser/Pillow decoding is separate.
function webpSize(bytes){assert.equal(bytes.toString('ascii',0,4),'RIFF');assert.equal(bytes.toString('ascii',8,12),'WEBP');assert.equal(bytes.readUInt32LE(4)+8,bytes.length);let result=null;for(let p=12;p+8<=bytes.length;){const kind=bytes.toString('ascii',p,p+4),length=bytes.readUInt32LE(p+4),d=p+8;assert(d+length<=bytes.length,'complete WebP chunk');if(kind==='VP8X')result={width:1+bytes.readUIntLE(d+4,3),height:1+bytes.readUIntLE(d+7,3)};else if(!result&&kind==='VP8L'){assert.equal(bytes[d],0x2f);const bits=bytes.readUInt32LE(d+1);result={width:(bits&16383)+1,height:((bits>>>14)&16383)+1};}else if(!result&&kind==='VP8 '){assert.equal(bytes.toString('hex',d+3,d+6),'9d012a');result={width:bytes.readUInt16LE(d+6)&16383,height:bytes.readUInt16LE(d+8)&16383};}p=d+length+(length%2);}assert(result,'WebP dimensions found');return result;}

await group('Actual desktop/mobile WebPs stay within finite transfer and decoded RGBA budgets',()=>{
 let desktopBytes=0,mobileBytes=0,desktopDecoded=16384,mobileDecoded=16384;
 for(const[asset,mobile,atlas]of[[CRYSTAL_GARDEN_ART,false,true],[CRYSTAL_GARDEN_MOBILE_ART,true,true],[CRYSTAL_TURRET_ART,false,false],[CRYSTAL_TURRET_MOBILE_ART,true,false],['assets/expansion/act5-crystal-gorge-plate-v3.webp',false,false],['assets/expansion/act5-crystal-gorge-plate-mobile-v3.webp',true,false]]){
  const bytes=fs.readFileSync(new URL('../public/'+asset,import.meta.url)),size=webpSize(bytes),decoded=size.width*size.height*4;assert(size.width<=1536&&size.height<=1536,'no oversized imagery');if(mobile)assert(size.width<=768&&size.height<=768,'mobile decode is genuinely reduced');if(atlas){assert.equal(size.width%3,0);assert.equal(size.height%2,0);assert.equal(size.width/3,size.height/2,'six square cells');}
  if(mobile){mobileBytes+=bytes.length;mobileDecoded+=decoded;}else{desktopBytes+=bytes.length;desktopDecoded+=decoded;}measurements.assets.push({asset,...size,bytes:bytes.length,rgbaBytes:decoded});
 }
 assert(desktopBytes<=1800*1024&&mobileBytes<=640*1024,'transfer budget includes both atlas and panorama');assert(desktopDecoded<=18*1024*1024&&mobileDecoded<=6*1024*1024,'one shared atlas source, one panorama and one contact texture');
 measurements.assetTotals={desktopBytes,mobileBytes,desktopDecoded,mobileDecoded};
});

class Element{
 constructor(){this.hidden=false;this.dataset={};this.children=[];this.style={};this.attributes={};this.nodes=new Map();this.writes=0;this._html='';this.textContent='';this.disabled=false;}
 set innerHTML(value){this._html=value;this.writes++;}get innerHTML(){return this._html;}
 append(...children){for(const child of children){this.children.push(child);child.parent=this;}}
 setAttribute(k,v){this.attributes[k]=v;}remove(){this.removed=true;if(this.parent)this.parent.children=this.parent.children.filter(child=>child!==this);}
 blur(){}querySelector(q){if(!this.nodes.has(q)){const el=new Element();if(q==='[data-choices]')el.hidden=true;this.nodes.set(q,el);}return this.nodes.get(q);}
 querySelectorAll(){return this.buttons??=['turret','snare','wall'].map(kind=>{const el=new Element();el.dataset.kind=kind;return el;});}
}

await group('Real view keeps one bounded render pool across state changes, hide/show and fresh setup; disposes all owned resources once',()=>{
 const previousDocument=globalThis.document,doc={body:new Element(),createElement:()=>new Element()};globalThis.document=doc;
 try{
  const scene=new THREE.Scene();
  for(const mobile of[false,true])for(let cycle=0;cycle<3;cycle++){
   const loads=[],clones=[],atlases=[new THREE.Texture(),new THREE.Texture()];for(const atlas of atlases){const clone=atlas.clone.bind(atlas);atlas.clone=()=>{const texture=clone();clones.push(texture);return texture;};}const view=createCrystalSiegeView(scene,{load:url=>{loads.push(url);return atlases[loads.length-1];}},'/seed/',{mobile}),world=scene.children[0];assert.equal(scene.children.length,1);assert.equal(loads[0],'/seed/'+(mobile?CRYSTAL_GARDEN_MOBILE_ART:CRYSTAL_GARDEN_ART));assert.equal(loads.length,2);assert.equal(clones.length,10);assert.equal(doc.body.children.length,2);
   const objects=[...world.children],sprites=objects.filter(o=>o.isSprite),contacts=world.getObjectByName('crystal-garden-ground-contacts');assert.equal(objects.length,22);assert.equal(sprites.length,15);assert.equal(contacts.instanceMatrix.count,11);assert(!objects.some(o=>o.isLight));
   const resources=new Set([...atlases,...clones]),ownedGeometry=new Set(),borrowedGeometry=new Set(),materials=new Set();for(const object of objects){if(object.geometry)(object.isSprite?borrowedGeometry:ownedGeometry).add(object.geometry);if(object.material){materials.add(object.material);if(object.material.map)resources.add(object.material.map);}}
   assert.equal(resources.size,13);assert.equal(new Set([...resources].map(t=>t.source)).size,3,'two shared authored atlases and one generated shadow');const disposal=new Map();for(const resource of[...resources,...ownedGeometry,...borrowedGeometry,...materials,contacts]){disposal.set(resource,0);resource.addEventListener('dispose',()=>disposal.set(resource,disposal.get(resource)+1));}
   const fixedIds=objects.map(o=>o.uuid),fixedMaps=new Set([...resources]),player=freeze({x:-3,z:-2.5});
   for(let room=0;room<5;room++){
    const canonical=createCrystalSiege(room,413);for(let i=0;i<4;i++)Object.assign(canonical.pads[i],{kind:['turret','snare','wall','turret'][i],level:i%2+1,hp:45});const state=freeze(canonical),before=JSON.stringify(state);
    for(let frame=0;frame<300;frame++)view.update(state,player,{visible:true,interactive:frame%3!==0,dt:1/60});assert.equal(JSON.stringify(state),before,'presentation must not write canonical state');assert.equal(contacts.count,11);assert.deepEqual(world.children.map(o=>o.uuid),fixedIds);assert.equal(loads.length,2);
    for(let repeat=0;repeat<8;repeat++){view.hide();assert(!world.visible);assert(doc.body.children.every(el=>el.hidden));view.update(state,player,{visible:true,interactive:true,dt:0});assert.equal(contacts.count,11);}
    const night=structuredClone(state);night.phase='defense';for(const n of night.nodes)n.harvested=true;const nightBefore=JSON.stringify(night);view.update(freeze(night),player,{visible:true,interactive:true,boss:true,dt:.1});assert.equal(contacts.count,5);assert(world.children.filter(o=>o.name.startsWith('crystal-garden-harvest-')).every(o=>!o.visible));assert.equal(JSON.stringify(night),nightBefore);assert([...materials].every(m=>!m.map||fixedMaps.has(m.map)));
   }
   view.dispose();view.dispose();assert.equal(scene.children.length,0);assert.equal(doc.body.children.length,0);for(const resource of[...resources,...ownedGeometry,...materials,contacts])assert.equal(disposal.get(resource),1,'owned resource is released exactly once');for(const resource of borrowedGeometry)assert.equal(disposal.get(resource),0,'Three shared Sprite geometry is borrowed');view.update(createCrystalSiege(0,1),player,{visible:true,interactive:true});assert.equal(scene.children.length,0);assert.equal(doc.body.children.length,0);
   measurements.view.push({mobile,cycle,objects:objects.length,sprites:sprites.length,maxContacts:11,textureObjects:resources.size,textureSources:3,loads:loads.length});
  }
 }finally{globalThis.document=previousDocument;}
});

await group('Damaged facilities show actual HP ratio, break into a rebuild pad and retain paid upgrade art',()=>{
 const previousDocument=globalThis.document,doc={body:new Element(),createElement:()=>new Element()};globalThis.document=doc;
 try{const scene=new THREE.Scene(),view=createCrystalSiegeView(scene,{load:()=>new THREE.Texture()},'/'),s=createCrystalSiege(0,413),pad=s.pads[0],player={x:pad.x,z:pad.z};Object.assign(pad,{kind:'turret',level:5,hp:120});
 view.update(s,player,{visible:true,interactive:true});const root=scene.children[0],fill=root.getObjectByName('crystal-garden-facility-hp-fill'),tower=root.getObjectByName('crystal-siege-facility-0');assert.equal(fill.count,0);assert(tower.visible);assert.deepEqual(tower.material.map.repeat.toArray(),[.5,.5]);
 pad.hp=30;view.update(s,player,{visible:true,interactive:true,dt:.05});assert.equal(fill.count,1);const m=new THREE.Matrix4();fill.getMatrixAt(0,m);assert(Math.abs(new THREE.Vector3().setFromMatrixScale(m).x-.35)<1e-6,'quarter HP gives quarter fill');
 pad.hp=0;view.update(s,player,{visible:true,interactive:true,dt:.05});assert.equal(fill.count,0);assert(!tower.visible);assert(doc.body.children[1].querySelector('[data-context]').textContent.includes('파괴됨 · 다시 심기'));
 pad.hp=120;view.update(s,player,{visible:true,interactive:true,dt:.05});assert(tower.visible);assert.equal(fill.count,0);assert(doc.body.children[1].querySelector('[data-context]').textContent.includes('최대 강화'));view.dispose();
 }finally{globalThis.document=previousDocument;}
});

await group('Queued UI callbacks cannot build or start after the owning view is disposed',()=>{
 const previousDocument=globalThis.document,doc={body:new Element(),createElement:()=>new Element()};globalThis.document=doc;
 try{const events=[],scene=new THREE.Scene(),view=createCrystalSiegeView(scene,{load:()=>new THREE.Texture()},'/',{onBuild:(...args)=>events.push(args),onStart:()=>events.push('start')}),state=createCrystalSiege(0,1);view.update(state,{x:-3,z:-2.5},{visible:true,interactive:true});const menu=doc.body.children[1];menu.querySelector('[data-context]').onclick();view.dispose();menu.buttons[0].onclick();menu.querySelector('[data-context]').onclick();menu.querySelector('[data-start]').onclick();assert.deepEqual(events,[]);assert.equal(scene.children.length,0);assert.equal(doc.body.children.length,0);}finally{globalThis.document=previousDocument;}
});

await group('New panorama is lazy/shared and late IO cannot revive disposed cache; other mode plates remain unchanged',async()=>{
 const calls=[],loader={async loadAsync(url){calls.push(url);return new THREE.Texture();}},cache=createExpansionEnvironmentArt({loader,baseUrl:'/seed/',mobile:true}),a=cache.load('crystalGarden'),b=cache.load('crystalGarden');assert.equal(a,b);const garden=await a;assert.equal(calls.length,1);assert.equal(calls[0],'/seed/assets/expansion/act5-crystal-gorge-plate-mobile-v3.webp');assert.equal(await cache.load('crystalGarden'),garden);
 const legacy=await cache.load('crystalGorge');assert.equal(calls[1],'/seed/assets/expansion/act5-crystal-gorge-plate-mobile-v2.webp');assert.notEqual(legacy,garden);
 const scene=new THREE.Scene(),floor=new THREE.Texture(),view=createExpansionJourneyView(scene,floor),plate=view.root.getObjectByName('expansion-environment-plate'),ids=view.root.children.map(o=>o.uuid);view.setPlate('crystalGorge',legacy);view.setPlate('crystalGarden',garden);view.setCourse('crystalGorge',{crystalGarden:true});assert.equal(plate.material.map,garden);view.setCourse('crystalGorge');assert.equal(plate.material.map,legacy);view.setCourse('crosswind');assert.notEqual(plate.material.map,garden);
 let releasedGarden=0,releasedLegacy=0;garden.addEventListener('dispose',()=>releasedGarden++);legacy.addEventListener('dispose',()=>releasedLegacy++);for(let i=0;i<30;i++){view.setCourse('crystalGorge',{crystalGarden:true});view.setActive(i%2===0);}assert.deepEqual(view.root.children.map(o=>o.uuid),ids);view.dispose();view.dispose();assert.equal(releasedGarden,0);assert.equal(releasedLegacy,0);cache.dispose();cache.dispose();assert.equal(releasedGarden,1);assert.equal(releasedLegacy,1);
 let deliver;const pendingCache=createExpansionEnvironmentArt({loader:{loadAsync:()=>new Promise(resolve=>deliver=resolve)}}),pending=pendingCache.load('crystalGarden');await Promise.resolve();pendingCache.dispose();const late=new THREE.Texture();let releasedLate=0;late.addEventListener('dispose',()=>releasedLate++);deliver(late);assert.equal(await pending,null);assert.equal(releasedLate,1);assert.equal(pendingCache.loaded,0);assert.equal(await pendingCache.load('crystalGarden'),null);
});

console.log(JSON.stringify({passed:passed.length,groups:passed,failures:failures.map(({name,error})=>({name,message:error.message})),measurements},null,2));
console.log('Actual imported Three objects/camera and source-extracted main camera with fake DOM/loader; WebP bitstream dimensions and decoded RGBA budgets. Not native browser, GPU/FPS/thermal, physical touch, image decode quality or normal-account play proof.');
assert.equal(failures.length,0,failures.map(({name,error})=>name+': '+error.message).join('\n'));
