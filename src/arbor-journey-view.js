import * as THREE from 'three';

// Authored scenery only. Root collision, spawning and boss attacks belong to
// arbor-journey.js; the four reusable presentations never invent hitboxes.
export const ARBOR_ART=Object.freeze({
 floor:'assets/arbor/arbor-courtyard-v1.webp',floorMobile:'assets/arbor/arbor-courtyard-v1-mobile.webp',
 root:'assets/arbor/arbor-root-v1.webp',rootMobile:'assets/arbor/arbor-root-v1-mobile.webp',
 boss:'assets/arbor/arbo-motion-v1.webp',bossMobile:'assets/arbor/arbo-motion-v1-mobile.webp',
 menu:'assets/arbor/arbor-courtyard-v1.webp',bossColumns:2,bossRows:2,bossSize:4.2,
});
export const ARBOR_VIEW_LIMITS=Object.freeze({roots:4,floorWidth:72,floorDepth:72,lights:0,raf:0,drawCalls:18,geometries:4,materials:19,textures:3});
const FRAMES=Object.freeze({idle:0,warn:1,windup:1,charge:1,attack:2,slam:2,recover:3,recovery:3});
const SECTOR_TINTS=Object.freeze([0xffffff,0xe7f1de,0xffebca,0xe5edec,0xf4e3bd]);
const BASE_URL=import.meta.env?.BASE_URL||'./';
const finite=(v,fallback=0)=>Number.isFinite(v)?v:fallback;
const clamp=(v,lo,hi)=>Math.max(lo,Math.min(hi,v));

export function createArborJourneyView(scene,{camera=null,lowQuality=false,loader=null,base=BASE_URL}={}){
 const world=new THREE.Group();world.name='arbor-journey';world.visible=false;scene.add(world);
 const materials=new Set(),geometries=new Set(),textures=new Set(),assets=[];
 let disposed=false,enabled=false,sector=-1,clock=0,updates=0,poseWrites=0,bossActor=null,bossFrame=-1,bossAttackUntil=-1;
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
 const floorGeometry=ownGeometry(new THREE.PlaneGeometry(72,72).rotateX(-Math.PI/2));
 const floorMaterial=bind(ownMaterial(new THREE.MeshBasicMaterial({color:0xa3ae88,toneMapped:false})),floorAsset);
 const floor=new THREE.Mesh(floorGeometry,floorMaterial);floor.name='arbor-painted-courtyard';floor.position.y=.043;world.add(floor);
 const footprintGeometry=ownGeometry(new THREE.PlaneGeometry(1,1).rotateX(-Math.PI/2));
 const edgeGeometry=ownGeometry(new THREE.BufferGeometry().setFromPoints([
  new THREE.Vector3(-.5,0,-.5),new THREE.Vector3(.5,0,-.5),new THREE.Vector3(.5,0,-.5),new THREE.Vector3(.5,0,.5),
  new THREE.Vector3(.5,0,.5),new THREE.Vector3(-.5,0,.5),new THREE.Vector3(-.5,0,.5),new THREE.Vector3(-.5,0,-.5),
 ]));
 const fallbackGeometry=ownGeometry(new THREE.CapsuleGeometry(.22,.8,2,8).rotateZ(Math.PI/2));
 const fallbackMaterial=ownMaterial(new THREE.MeshBasicMaterial({color:0x76643c,toneMapped:false}));
 const rootSlots=[];
 for(let i=0;i<ARBOR_VIEW_LIMITS.roots;i++){
  const slot=new THREE.Group();slot.name='arbor-root-'+i;world.add(slot);slot.visible=false;
  const shadowMaterial=ownMaterial(new THREE.MeshBasicMaterial({color:0x243024,transparent:true,opacity:.22,depthWrite:false,toneMapped:false}));
  const shadow=new THREE.Mesh(footprintGeometry,shadowMaterial);shadow.name='arbor-root-contact';shadow.position.y=.052;slot.add(shadow);
  const tellMaterial=ownMaterial(new THREE.MeshBasicMaterial({color:0xffdb86,transparent:true,opacity:0,depthWrite:false,toneMapped:false}));
  const tell=new THREE.Mesh(footprintGeometry,tellMaterial);tell.name='arbor-root-emergence-warning';tell.position.y=.068;slot.add(tell);
  const edgeMaterial=ownMaterial(new THREE.LineBasicMaterial({color:0xffe0a1,transparent:true,opacity:.5,depthWrite:false,toneMapped:false}));
  const edge=new THREE.LineSegments(edgeGeometry,edgeMaterial);edge.name='arbor-root-collision-edge';edge.position.y=.074;slot.add(edge);
  const artMaterial=bind(ownMaterial(new THREE.SpriteMaterial({transparent:true,alphaTest:.08,depthWrite:false,toneMapped:false,color:0xffffff})),rootAsset);
  const art=new THREE.Sprite(artMaterial);art.name='arbor-raised-living-root';art.center.set(.5,.12);art.position.y=.075;slot.add(art);
  const fallback=new THREE.Mesh(fallbackGeometry,fallbackMaterial);fallback.name='arbor-root-loading-shape';fallback.position.y=.36;slot.add(fallback);
  rootSlots.push({slot,shadow,tell,edge,art,fallback,x:NaN,z:NaN,w:NaN,d:NaN,angle:NaN,rise:0,artWidth:1,artHeight:1});
 }
 const bossMaterial=bind(ownMaterial(new THREE.SpriteMaterial({transparent:true,alphaTest:.08,depthWrite:false,toneMapped:false,color:0xffffff})),bossAsset);
 const bossSprite=new THREE.Sprite(bossMaterial);bossSprite.name='arbor-arbo-authored-motion';bossSprite.center.set(.5,.075);bossSprite.scale.set(4.2,4.2,1);bossSprite.position.y=.08;bossSprite.visible=false;

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
 function setActive(value){if(disposed)return;enabled=!!value;world.visible=enabled;if(!enabled)bossSprite.visible=false;}
 function update(state,player,{dt=0,active=true,reducedMotion=false,boss=null}={}){
  if(disposed||!enabled||!active||!state)return;
  updates++;clock+=clamp(finite(dt),0,.1);
  const nextSector=clamp(finite(state.sector)|0,0,4);
  if(sector!==nextSector){sector=nextSector;floor.rotation.y=(sector%4)*Math.PI/2;floorMaterial.color.setHex(floorAsset.ready?SECTOR_TINTS[sector]:0xa3ae88);}
  else if(floorAsset.ready&&floorMaterial.color.getHex()===0xa3ae88)floorMaterial.color.setHex(SECTOR_TINTS[sector]);
  const roots=Array.isArray(state.roots)?state.roots:[];
  for(let i=0;i<rootSlots.length;i++){
   const p=rootSlots[i],r=roots[i];p.slot.visible=!!r;if(!r)continue;
   const w=clamp(finite(r.w,4),.3,6),d=clamp(finite(r.d,1),.3,6),x=finite(r.x),z=finite(r.z),angle=finite(r.angle);
   if(p.x!==x||p.z!==z||p.w!==w||p.d!==d||p.angle!==angle){
    p.x=x;p.z=z;p.w=w;p.d=d;p.angle=angle;p.slot.position.set(x,0,z);p.slot.rotation.y=angle;p.shadow.scale.set(w*1.035,1,d*1.15);p.tell.scale.set(w,1,d);p.edge.scale.set(w,1,d);
    // Sprites face the camera, so align the painted long axis to the actual
    // ground axis after the fixed Act1 19/19 projection. Vertical cover must
    // remain a long visible barrier, rather than a tiny horizontal root.
    const vertical=d>w,long=vertical?d:w,minor=vertical?w:d;
    const projectedX=vertical?Math.sin(angle):Math.cos(angle),projectedY=(vertical?-Math.cos(angle):Math.sin(angle))*Math.SQRT1_2;
    p.art.material.rotation=Math.atan2(projectedY,projectedX);p.art.center.set(.5,vertical?.5:.12);
    p.artWidth=long*1.1*Math.hypot(projectedX,projectedY);p.artHeight=vertical?minor*1.1:long/2.55;
    p.fallback.rotation.y=vertical?Math.PI/2:0;p.fallback.scale.set(long/1.24,.8,minor/.44);poseWrites++;
   }
   const phase=r.phase||'rest';
   const target=phase==='active'?1:phase==='lower'?.34:0;
   const step=clamp(finite(dt),0,.1);
   p.rise=reducedMotion?target:Math.abs(p.rise-target)<.001?target:p.rise+(target-p.rise)*Math.min(1,step*16);
   // Solid state is read from rules, not this animation. Rest is a shallow
   // dark seam; warn is an exact amber rectangle, active has a gold outline.
   p.shadow.visible=phase!=='rest';
   p.tell.visible=phase==='warn';p.tell.material.opacity=phase==='warn'?(reducedMotion?.2:.14+.07*(1+Math.sin(clock*6))):0;
   p.edge.visible=phase==='warn'||phase==='active'||phase==='lower';p.edge.material.opacity=phase==='warn'?.9:phase==='active'?.42:.2;
   p.art.visible=rootAsset.ready&&p.rise>.025;p.art.scale.set(p.artWidth,Math.max(.015,p.artHeight*p.rise),1);p.art.material.opacity=phase==='lower'?.65:1;
   p.fallback.visible=!rootAsset.ready&&p.rise>.025;p.fallback.scale.y=.8*p.rise;
  }
  if(boss){const actor=boss.actor||boss.g||boss;const phase=boss.phase||boss.state||'idle';setBossArt(actor,phase);}
  else if(bossActor)bossSprite.visible=enabled&&bossAsset.ready&&state.phase==='boss';
  if(bossSprite.visible){const breath=reducedMotion?0:Math.sin(clock*2.2)*.012;bossSprite.scale.set(4.2*(bossFrame===2?1.055:bossFrame===1?.975:1+breath),4.2*(bossFrame===2?.94:bossFrame===1?1.035:1-breath*.5),1);bossSprite.position.y=bossFrame===1?.14:.08;}
 }
 function hide(){setActive(false);}
 function diagnostics(){
  let meshes=0,visibleMeshes=0,groups=0;world.traverse(o=>{if(o.isMesh||o.isSprite||o.isLineSegments){meshes++;if(world.visible&&o.visible)visibleMeshes++;}else if(o.isGroup)groups++;});
  return {disposed,active:enabled,sector,updates,poseWrites,roots:rootSlots.length,meshes,visibleMeshes,groups,geometries:geometries.size,materials:materials.size,textures:textures.size,lights:0,raf:0,drawCallsMax:18,actorBossSprite:!!bossActor,loaded:assets.filter(a=>a.ready).length,failed:assets.filter(a=>a.failed).length,lowQuality,floorWidth:72,floorDepth:72,cameraOwned:false,playerScaleOwned:false};
 }
 function dispose(){if(disposed)return;disposed=true;enabled=false;clearBossArt();world.removeFromParent();for(const m of materials)m.dispose();for(const g of geometries)g.dispose();for(const t of textures)t.dispose();}
 return {setActive,update,setBossArt,clearBossArt,hide,dispose,diagnostics};
}
