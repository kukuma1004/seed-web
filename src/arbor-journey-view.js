import * as THREE from 'three';
import {ARBOR_ACT1_BOSS_SIZE} from './journey-actor-scale.js';
import {createArborGardenPresentation} from './arbor-garden-presentation.js';
import {journeySurfaceLight} from './journey-surface-light.js';

// Authored scenery only. Root collision, spawning and boss attacks belong to
// arbor-journey.js; the four reusable presentations never invent hitboxes.
export const ARBOR_ART=Object.freeze({
 floor:'assets/arbor/arbor-courtyard-v2.webp',floorMobile:'assets/arbor/arbor-courtyard-v2-mobile.webp',
 root:'assets/arbor/arbor-root-v1.webp',rootMobile:'assets/arbor/arbor-root-v1-mobile.webp',
 boss:'assets/arbor/arbo-motion-v1.webp',bossMobile:'assets/arbor/arbo-motion-v1-mobile.webp',
 menu:'assets/arbor/arbor-courtyard-v2.webp',bossColumns:2,bossRows:2,bossSize:ARBOR_ACT1_BOSS_SIZE,
});
export const ARBOR_VIEW_LIMITS=Object.freeze({roots:4,floorWidth:72,floorDepth:72,lights:0,raf:0,drawCalls:23,geometries:9,materials:23,textures:6});
const FRAMES=Object.freeze({idle:0,warn:1,windup:1,charge:1,attack:2,slam:2,recover:3,recovery:3});
const SECTOR_TINTS=Object.freeze([0xc1d5d4,0xb7cdca,0xcbd4c9,0xb8ced1,0xc5d1c6]);
const BASE_URL=import.meta.env?.BASE_URL||'./';
const finite=(v,fallback=0)=>Number.isFinite(v)?v:fallback;
const clamp=(v,lo,hi)=>Math.max(lo,Math.min(hi,v));

function courtPavingGeometry(){
 // Reuse only the painted stone interior. The original image's giant frame
 // roots/foreground daisies must not become another false wall inside play.
 // Mirrored neighbours meet on identical source pixels, with paver scale kept
 // close to Act1 instead of stretching the whole courtyard into the arena.
 const positions=[],uv=[];
 for(let row=0;row<2;row++)for(let col=0;col<2;col++){
  const x=-36+col*36,z=-36+row*36,corners=[[x,0,z],[x,0,z+36],[x+36,0,z+36],[x+36,0,z]],tex=[[0,1],[0,0],[1,0],[1,1]];
  for(const index of [0,1,2,0,2,3]){positions.push(...corners[index]);const [u,v]=tex[index];uv.push(.28+(col?1-u:u)*.44,.25+(row?1-v:v)*.49);}
 }
 const g=new THREE.BufferGeometry();g.setAttribute('position',new THREE.Float32BufferAttribute(positions,3));g.setAttribute('uv',new THREE.Float32BufferAttribute(uv,2));g.computeVertexNormals();return g;
}

// A ground-hugging, curved root keeps the authored blocker bounds. Both its
// opaque bark and painted skin share this one geometry: turning north/south
// never turns a billboard sideways or hides its painting behind a flat beam.
// The existing frontal root painting supplies moss along the crown and bark
// on the flanks. All shape/colour work happens once, without lights or shaders.
function livingRootGeometry(){
 const positions=[],colors=[],uvs=[],lengthSteps=16,archSteps=8;
 // One continuous, opaque moss-to-bark patch of arbor-root-v1 (1024x374;
 // mobile halves both). Its 420..510 / 100..178 interior follows the grain.
 // Sampling the full arch column-by-column made transverse caterpillar rings;
 // the small longitudinal patch keeps one unbroken moss vein down the crown.
 const vertex=(u,j)=>{
  const a=j*Math.PI/archSteps,crown=Math.sin(a),along=Math.sin(u*Math.PI),bend=Math.sin(u*Math.PI*2)*along*.11;
  const width=.5*(.10+.90*Math.pow(along,.55)),height=.07+.93*Math.pow(along,.7),grain=.92+.06*Math.sin(a*10+.7*along)+.02*Math.cos(a*17+u*1.4);
  const moss=clamp((crown-.72)/.24,0,1),ridge=1-.07*Math.sin(a*5+u*.35)**2*crown;
  const bark=[.105+crown*.045,.057+crown*.035,.022+crown*.012],green=[.09,.155,.04],color=bark.map((value,index)=>(value*(1-moss)+green[index]*moss)*grain);
  const paintU=(420+90*u+.5)/1024,paintV=1-(178-78*Math.pow(crown,.7)+.5)/374;
  return {p:[u-.5,height*Math.pow(crown,.85)*ridge,bend+Math.cos(a)*width],c:color,uv:[paintU,paintV]};
 };
 const triangle=(a,b,c)=>{for(const v of [a,b,c]){positions.push(...v.p);colors.push(...v.c);uvs.push(...v.uv);}};
 for(let i=0;i<lengthSteps;i++)for(let j=0;j<archSteps;j++){
  const a=vertex(i/lengthSteps,j),b=vertex((i+1)/lengthSteps,j),c=vertex((i+1)/lengthSteps,j+1),d=vertex(i/lengthSteps,j+1);
  triangle(a,b,c);triangle(a,c,d);
 }
 for(const u of [0,1])for(let j=0;j<archSteps;j++){
  const a=vertex(u,j),b=vertex(u,j+1),base={p:[u-.5,0,0],c:[.065,.038,.017],uv:[(420+90*u+.5)/1024,1-178.5/374]};
  u===0?triangle(a,b,base):triangle(a,base,b);
 }
 // Round ends and a wandering ridge still occupy exactly the old width/depth
 // and unit height. Runtime scales only the visual emergence, never rules.
 let minZ=Infinity,maxZ=-Infinity,maxY=0;for(let i=0;i<positions.length;i+=3){maxY=Math.max(maxY,positions[i+1]);minZ=Math.min(minZ,positions[i+2]);maxZ=Math.max(maxZ,positions[i+2]);}
 for(let i=0;i<positions.length;i+=3){positions[i+1]/=maxY;positions[i+2]=(positions[i+2]-minZ)/(maxZ-minZ)-.5;}
 const g=new THREE.BufferGeometry();g.setAttribute('position',new THREE.Float32BufferAttribute(positions,3));g.setAttribute('color',new THREE.Float32BufferAttribute(colors,3));g.setAttribute('uv',new THREE.Float32BufferAttribute(uvs,2));g.computeVertexNormals();g.computeBoundingBox();return g;
}

export function createArborJourneyView(scene,{camera=null,lowQuality=false,loader=null,base=BASE_URL}={}){
 const world=new THREE.Group();world.name='arbor-journey';world.visible=false;scene.add(world);
 const materials=new Set(),geometries=new Set(),textures=new Set(),assets=[];
 let disposed=false,enabled=false,sector=-1,clock=0,updates=0,poseWrites=0,bossActor=null,bossFrame=-1,bossAttackUntil=-1,impactEvents=0,impactWrites=0;
 const ownMaterial=m=>(materials.add(m),m),ownGeometry=g=>(geometries.add(g),g);
 const textureLoader=loader||new THREE.TextureLoader();
 function loadAsset(file){
  const record={file,texture:null,ready:false,failed:false,materials:[]};assets.push(record);
  const ready=t=>{if(disposed){if(t&&!textures.has(t))t.dispose();return;}record.ready=true;record.texture=t;t.colorSpace=THREE.SRGBColorSpace;textures.add(t);for(const material of record.materials){material.map=t;material.needsUpdate=true;}};
  try{const t=textureLoader.load(base+file,ready,undefined,()=>{record.failed=true;});if(t){record.texture=t;t.colorSpace=THREE.SRGBColorSpace;textures.add(t);}}catch{record.failed=true;}
  return record;
 }
 function bind(material,record){record.materials.push(material);if(record.ready){material.map=record.texture;material.needsUpdate=true;}return material;}
 const floorAsset=loadAsset(lowQuality?ARBOR_ART.floorMobile:ARBOR_ART.floor);
 const rootAsset=loadAsset(lowQuality?ARBOR_ART.rootMobile:ARBOR_ART.root);
 const bossAsset=loadAsset(lowQuality?ARBOR_ART.bossMobile:ARBOR_ART.boss);
 const floorGeometry=ownGeometry(courtPavingGeometry());
 const floorMaterial=bind(ownMaterial(new THREE.MeshBasicMaterial({color:0xa3ae88,toneMapped:false})),floorAsset);
 journeySurfaceLight(floorMaterial,{courtPosition:true});
 const floor=new THREE.Mesh(floorGeometry,floorMaterial);floor.name='arbor-painted-courtyard';floor.position.y=.043;floor.scale.set(28/72,1,24/72);world.add(floor);
 const gardenCourt=createArborGardenPresentation(world,{loadAsset,bind,ownGeometry,ownMaterial,lowQuality});
 const footprintGeometry=ownGeometry(new THREE.PlaneGeometry(1,1).rotateX(-Math.PI/2));
 const edgeGeometry=ownGeometry(new THREE.BufferGeometry().setFromPoints([
  new THREE.Vector3(-.5,0,-.5),new THREE.Vector3(.5,0,-.5),new THREE.Vector3(.5,0,-.5),new THREE.Vector3(.5,0,.5),
  new THREE.Vector3(.5,0,.5),new THREE.Vector3(-.5,0,.5),new THREE.Vector3(-.5,0,.5),new THREE.Vector3(-.5,0,-.5),
 ]));
 const fallbackGeometry=ownGeometry(livingRootGeometry());
 const fallbackMaterial=ownMaterial(new THREE.MeshBasicMaterial({vertexColors:true,toneMapped:false}));
 const rootSlots=[];
 for(let i=0;i<ARBOR_VIEW_LIMITS.roots;i++){
  const slot=new THREE.Group();slot.name='arbor-root-'+i;world.add(slot);slot.visible=false;
  const shadowMaterial=ownMaterial(new THREE.MeshBasicMaterial({color:0x172419,transparent:true,opacity:.36,depthWrite:false,toneMapped:false}));
  const shadow=new THREE.Mesh(footprintGeometry,shadowMaterial);shadow.name='arbor-root-contact';shadow.position.y=.052;slot.add(shadow);
  const tellMaterial=ownMaterial(new THREE.MeshBasicMaterial({color:0xffdb86,transparent:true,opacity:0,depthWrite:false,toneMapped:false}));
  const tell=new THREE.Mesh(footprintGeometry,tellMaterial);tell.name='arbor-root-emergence-warning';tell.position.y=.068;slot.add(tell);
  const edgeMaterial=ownMaterial(new THREE.LineBasicMaterial({color:0xf1b64e,transparent:true,opacity:.5,depthWrite:false,toneMapped:false}));
  const edge=new THREE.LineSegments(edgeGeometry,edgeMaterial);edge.name='arbor-root-collision-edge';edge.position.y=.074;slot.add(edge);
  const artMaterial=bind(ownMaterial(new THREE.MeshBasicMaterial({transparent:true,alphaTest:.08,depthWrite:false,toneMapped:false,color:0xffffff,polygonOffset:true,polygonOffsetFactor:-1,polygonOffsetUnits:-1})),rootAsset);
  const art=new THREE.Mesh(fallbackGeometry,artMaterial);art.name='arbor-raised-living-root';art.position.y=.073;slot.add(art);
  const fallback=new THREE.Mesh(fallbackGeometry,fallbackMaterial);fallback.name='arbor-root-loading-shape';fallback.position.y=.07;slot.add(fallback);
  rootSlots.push({slot,shadow,tell,edge,art,fallback,x:NaN,z:NaN,w:NaN,d:NaN,angle:NaN,rise:0,artWidth:1,artHeight:1,solid:false,hitTime:0});
 }
 const bossMaterial=bind(ownMaterial(new THREE.SpriteMaterial({transparent:true,alphaTest:.08,depthWrite:true,toneMapped:false,color:0xffffff})),bossAsset);
 const bossSprite=new THREE.Sprite(bossMaterial);bossSprite.name='arbor-arbo-authored-motion';bossSprite.center.set(.5,.075);bossSprite.scale.set(ARBOR_ART.bossSize,ARBOR_ART.bossSize,1);bossSprite.position.y=.08;bossSprite.visible=false;

 function setBossArt(actor,phase='idle'){
  if(disposed)return null;
  const group=actor?.g||actor;
  if(!group?.isObject3D)return null;
  if(bossActor!==group){bossSprite.removeFromParent();group.add(bossSprite);bossActor=group;}
  let index=Number.isInteger(phase)?clamp(phase,0,3):(FRAMES[phase]??0);
  // An emitted fan/slam is a one-step engine event. Hold its authored impact
  // pose for a readable 160ms before the next recover call restores the core.
  if(index===2)bossAttackUntil=clock+.16;else if(index===3&&clock<bossAttackUntil)index=2;
  if(bossAsset.texture&&(bossFrame!==index||bossAsset.texture.repeat.x!==.5)){
   bossAsset.texture.repeat.set(.5,.5);bossAsset.texture.offset.set((index%2)*.5,(1-Math.floor(index/2))*.5);bossAsset.texture.updateMatrix();bossFrame=index;
  }
  bossSprite.visible=enabled&&bossAsset.ready;
  return bossSprite;
 }
 function clearBossArt(){bossSprite.visible=false;bossSprite.removeFromParent();bossActor=null;bossFrame=-1;bossAttackUntil=-1;}
 function resetRootImpacts(){for(const p of rootSlots){if(p.hitTime){p.art.material.color.setRGB(1,1,1);impactWrites++;}p.hitTime=0;p.solid=false;}}
 function setActive(value){if(disposed)return;enabled=!!value;world.visible=enabled;gardenCourt.setActive(enabled);if(!enabled){bossSprite.visible=false;resetRootImpacts();}}
 function impactRoot(x,z){
  if(disposed||!enabled||!Number.isFinite(x)||!Number.isFinite(z))return false;
  let target=null,nearest=Infinity;
  for(const p of rootSlots){
   if(!p.slot.visible||!p.solid)continue;
   const dx=x-p.x,dz=z-p.z,c=Math.cos(p.angle),s=Math.sin(p.angle),lx=dx*c-dz*s,lz=dx*s+dz*c,distance=dx*dx+dz*dz;
   if(Math.abs(lx)<=p.w*.5+1e-7&&Math.abs(lz)<=p.d*.5+1e-7&&distance<nearest){target=p;nearest=distance;}
  }
  if(!target)return false;
  target.hitTime=.13;target.art.material.color.setRGB(1.45,1.3,1.08);impactEvents++;impactWrites++;return true;
 }
 function update(state,player,{dt=0,active=true,reducedMotion=false,boss=null}={}){
  if(disposed||!enabled||!active||!state)return;
  updates++;clock+=clamp(finite(dt),0,.1);
  const nextSector=clamp(finite(state.sector)|0,0,4);
  if(sector!==nextSector){sector=nextSector;gardenCourt.setSector(sector);floor.rotation.y=0;floorMaterial.color.setHex(floorAsset.ready?SECTOR_TINTS[sector]:0xa3ae88);}
  else if(floorAsset.ready&&floorMaterial.color.getHex()===0xa3ae88)floorMaterial.color.setHex(SECTOR_TINTS[sector]);
  gardenCourt.refresh();
  const roots=Array.isArray(state.roots)?state.roots:[];
  for(let i=0;i<rootSlots.length;i++){
   const p=rootSlots[i],r=roots[i];p.slot.visible=!!r;if(!r){p.solid=false;p.hitTime=0;p.art.material.color.setRGB(1,1,1);continue;}
   const w=clamp(finite(r.w,4),.3,6),d=clamp(finite(r.d,1),.3,6),x=finite(r.x),z=finite(r.z),angle=finite(r.angle);
   if(p.x!==x||p.z!==z||p.w!==w||p.d!==d||p.angle!==angle){
    p.x=x;p.z=z;p.w=w;p.d=d;p.angle=angle;p.slot.position.set(x,0,z);p.slot.rotation.y=angle;p.shadow.scale.set(w*1.035,1,d*1.15);p.tell.scale.set(w,1,d);p.edge.scale.set(w,1,d);if(p.hitTime){p.hitTime=0;p.art.material.color.setRGB(1,1,1);impactWrites++;}
    // Paint follows the real curved surface in world space. Rotating a long
    // north/south root therefore preserves its mossy top and rounded ends.
    const vertical=d>w,long=vertical?d:w,minor=vertical?w:d;
    p.artWidth=long;p.artHeight=minor;p.art.rotation.y=p.fallback.rotation.y=vertical?Math.PI/2:0;
    p.art.scale.set(long,.65,minor);p.fallback.scale.set(long,.65,minor);poseWrites++;
   }
   const phase=r.phase||'rest';
   p.solid=phase==='active'&&r.active!==false;
   if(p.hitTime&&(!p.solid||dt>0)){p.hitTime=p.solid?Math.max(0,p.hitTime-clamp(finite(dt),0,.1)):0;const flash=p.hitTime/.13;p.art.material.color.setRGB(1+flash*.45,1+flash*.3,1+flash*.08);impactWrites++;}
   const target=phase==='active'?1:0;
   const step=clamp(finite(dt),0,.1);
   p.rise=reducedMotion?target:Math.abs(p.rise-target)<.001?target:p.rise+(target-p.rise)*Math.min(1,step*16);
   // Solid state is read from rules, not this animation. Only emergence is
   // outlined; active cover reads as shaded bark and its grounded silhouette.
   p.shadow.visible=phase!=='rest';
   p.tell.visible=phase==='warn';p.tell.material.opacity=phase==='warn'?(reducedMotion?.2:.14+.07*(1+Math.sin(clock*6))):0;
   p.edge.visible=phase==='warn';p.edge.material.opacity=phase==='warn'?.68:0;
   const raised=phase==='active'?Math.max(.5,p.rise):p.rise;
   p.art.visible=rootAsset.ready&&raised>.025&&phase!=='warn'&&phase!=='rest';p.art.scale.y=.65*raised;p.art.material.opacity=phase==='lower'?.55:1;
   p.fallback.visible=raised>.025&&phase!=='warn'&&phase!=='rest';p.fallback.scale.y=.65*raised;
  }
  if(boss){const actor=boss.actor||boss.g||boss;const phase=boss.phase||boss.state||'idle';setBossArt(actor,phase);}
  else if(bossActor)bossSprite.visible=enabled&&bossAsset.ready&&state.phase==='boss';
  if(bossSprite.visible){const breath=reducedMotion?0:Math.sin(clock*2.2)*.012;bossSprite.scale.set(ARBOR_ART.bossSize*(bossFrame===2?1.055:bossFrame===1?.975:1+breath),ARBOR_ART.bossSize*(bossFrame===2?.94:bossFrame===1?1.035:1-breath*.5),1);bossSprite.position.y=bossFrame===1?.14:.08;}
 }
 function hide(){setActive(false);}
 function diagnostics(){
  let meshes=0,visibleMeshes=0,groups=0;world.traverse(o=>{if(o.isMesh||o.isSprite||o.isLineSegments){meshes++;if(world.visible&&o.visible)visibleMeshes++;}else if(o.isGroup)groups++;});
  return {disposed,active:enabled,sector,updates,poseWrites,impactEvents,impactWrites,impactPending:rootSlots.reduce((n,p)=>n+(p.hitTime>0?1:0),0),roots:rootSlots.length,meshes,visibleMeshes,groups,geometries:geometries.size,materials:materials.size,textures:textures.size,lights:0,raf:0,drawCallsMax:23,actorBossSprite:!!bossActor,loaded:assets.filter(a=>a.ready).length,failed:assets.filter(a=>a.failed).length,lowQuality,floorWidth:72,floorDepth:72,cameraOwned:false,playerScaleOwned:false,garden:gardenCourt.diagnostics()};
 }
 function dispose(){if(disposed)return;resetRootImpacts();disposed=true;enabled=false;gardenCourt.dispose();clearBossArt();world.removeFromParent();for(const m of materials)m.dispose();for(const g of geometries)g.dispose();for(const t of textures)t.dispose();}
 return {setActive,update,setBossArt,clearBossArt,impactRoot,hide,dispose,diagnostics};
}
