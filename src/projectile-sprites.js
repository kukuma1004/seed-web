import * as THREE from 'three';

// The game retains each projectile's simulated object and collision. Only its
// render body changes, using the same camera-facing plane proven in the lab.
export const PROJECTILE_DNA_ATLAS='seed-projectile-botanical-v2.png';
export const PROJECTILE_DNA_CELLS=Object.freeze({
 seed:0,reflect:1,split:2,chain:3,orbit:4,pierce:5,burst:6,recall:7,
 gravity:8,frost:9,portal:10,critical:11,hostile:12,boss:13,austin:14,storm:15
});
export const MIRROR_SHOT_COLOR=0xe957b8;

export function projectileCellGeometry(index,columns=4,rows=4){
 const geometry=new THREE.PlaneGeometry(1,1),uv=geometry.getAttribute('uv');
 const col=index%columns,row=rows-1-Math.floor(index/columns),edge=.0015;
 for(let i=0;i<uv.count;i++)uv.setXY(i,(col+edge+uv.getX(i)*(1-2*edge))/columns,(row+edge+uv.getY(i)*(1-2*edge))/rows);
 uv.needsUpdate=true;geometry.name=`seed-projectile-dna-${index}`;return geometry;
}

export function createProjectileSprites(scene,camera,{mobile=false,baseUrl='',capacity=480,haloAtlas=null,onReady=()=>{}}={}){
 const file=`${baseUrl}assets/${mobile?'mobile/':''}${PROJECTILE_DNA_ATLAS}`;
 let ready=false,comboReady=false,ballReady=false,enabled=true;
 const texture=new THREE.TextureLoader().load(file,()=>{ready=true;onReady(texture);},undefined,()=>{ready=false;});
 texture.colorSpace=THREE.SRGBColorSpace;
 texture.minFilter=THREE.LinearMipmapLinearFilter;
 texture.magFilter=THREE.LinearFilter;
 // Existing painted card projectile sheet is also the combat sheet. It is
 // uploaded once, then all visible evolution shots share twelve 2D batches.
 const comboTexture=new THREE.TextureLoader().load(`${baseUrl}assets/${mobile?'mobile/':''}combo-projectiles-botanical-v2.png`,()=>{comboReady=true;onReady(comboTexture);},undefined,()=>{comboReady=false;});
 const ballTexture=new THREE.TextureLoader().load(`${baseUrl}assets/boss-always-ball-v1.webp`,()=>{ballReady=true;onReady(ballTexture);},undefined,()=>{ballReady=false;});
 for(const art of [comboTexture,ballTexture]){art.colorSpace=THREE.SRGBColorSpace;art.minFilter=THREE.LinearMipmapLinearFilter;art.magFilter=THREE.LinearFilter;}
 const material=new THREE.MeshBasicMaterial({map:texture,transparent:true,alphaTest:.07,depthWrite:false,depthTest:true,side:THREE.FrontSide,toneMapped:false});
 const comboMaterial=new THREE.MeshBasicMaterial({map:comboTexture,transparent:true,alphaTest:.07,depthWrite:false,depthTest:true,side:THREE.FrontSide,toneMapped:false});
 const ballMaterial=new THREE.MeshBasicMaterial({map:ballTexture,transparent:true,alphaTest:.07,depthWrite:false,depthTest:true,side:THREE.FrontSide,toneMapped:false});
 // The blue storm painting vanishes against the act-3 clouds. Recolor only its
 // luminance in one shared instanced batch; no second texture or per-bolt mesh.
 const stormMaterial=material.clone();
 stormMaterial.onBeforeCompile=shader=>{shader.fragmentShader=shader.fragmentShader.replace('#include <map_fragment>',`#include <map_fragment>
  float stormInk=dot(diffuseColor.rgb,vec3(.2126,.7152,.0722));
  vec3 stormEmber=mix(vec3(.18,.025,.025),vec3(1.,.31,.035),smoothstep(.1,.72,stormInk));
  diffuseColor.rgb=mix(stormEmber,vec3(1.,.96,.68),smoothstep(.7,1.,stormInk));`);};
 stormMaterial.customProgramCacheKey=()=> 'seed-storm-amber-v1';
 const geometries=Array.from({length:16},(_,index)=>projectileCellGeometry(index));
 const batches=new Array(16).fill(null),counts=new Uint16Array(16);
 const comboGeometries=Array.from({length:12},(_,index)=>projectileCellGeometry(index,4,3));
 const comboBatches=new Array(12).fill(null),comboCounts=new Uint16Array(12);
 const ballGeometry=new THREE.PlaneGeometry(1,1);let ballBatch=null,ballCount=0;
 const dummy=new THREE.Object3D(),right=new THREE.Vector3(),up=new THREE.Vector3(),travel=new THREE.Vector3(),roll=new THREE.Quaternion(),zAxis=new THREE.Vector3(0,0,1);
 // The reflected seed must keep the player's law silhouette, but its attack
 // needs a hostile cue. One shared painterly ring marks every mirror shot.
 const haloCapacity=Math.min(capacity,64),haloGeometry=haloAtlas?projectileCellGeometry(3):new THREE.RingGeometry(.39,.48,20);
 const haloMaterial=new THREE.MeshBasicMaterial({map:haloAtlas,color:MIRROR_SHOT_COLOR,transparent:true,opacity:.9,blending:haloAtlas?THREE.AdditiveBlending:THREE.NormalBlending,depthWrite:false,depthTest:true,side:THREE.DoubleSide,toneMapped:false});
 const mirrorHalos=new THREE.InstancedMesh(haloGeometry,haloMaterial,haloCapacity);
 mirrorHalos.name='seed-mirror-hostile-rims';mirrorHalos.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
 mirrorHalos.frustumCulled=false;mirrorHalos.castShadow=false;mirrorHalos.receiveShadow=false;mirrorHalos.renderOrder=11;mirrorHalos.count=0;mirrorHalos.visible=false;scene.add(mirrorHalos);
 // One bounded wake batch gives enemy thorns a warm travel cue on green stone.
 // It has no simulation history, particles, lights or per-frame allocations.
 const wakeCapacity=Math.min(capacity,mobile?64:128),wakeGeometry=new THREE.PlaneGeometry(1,1);
 const wp=wakeGeometry.getAttribute('position');wp.setXY(0,-.5,0);wp.setXY(1,.5,.5);wp.setXY(2,-.5,0);wp.setXY(3,.5,-.5);wp.needsUpdate=true;
 const wakeMaterial=new THREE.MeshBasicMaterial({color:0xffffff,transparent:true,opacity:.78,depthWrite:false,depthTest:true,side:THREE.DoubleSide,toneMapped:false});
 // A tapered ember ribbon keeps a sharp warm centre without a flat triangle.
 // Reuse the existing wake batch; UV shading adds no particles or textures.
 wakeMaterial.onBeforeCompile=shader=>{
  shader.vertexShader='varying vec2 seedWakeUv;\n'+shader.vertexShader;
  shader.vertexShader=shader.vertexShader.replace('#include <begin_vertex>','#include <begin_vertex>\n seedWakeUv=uv;');
  shader.fragmentShader='varying vec2 seedWakeUv;\n'+shader.fragmentShader;
  shader.fragmentShader=shader.fragmentShader.replace('#include <color_fragment>',`#include <color_fragment>
   float centre=1.-smoothstep(.08,.5,abs(seedWakeUv.y-.5));
   float along=smoothstep(0.,.8,seedWakeUv.x);
   diffuseColor.a*=centre*along;
   diffuseColor.rgb=mix(diffuseColor.rgb,vec3(1.,.96,.79),centre*along*.5);`);
 };
 wakeMaterial.customProgramCacheKey=()=> 'seed-botanical-wake-v3';
 const wakes=new THREE.InstancedMesh(wakeGeometry,wakeMaterial,wakeCapacity);wakes.name='seed-hostile-short-wakes';wakes.instanceMatrix.setUsage(THREE.DynamicDrawUsage);wakes.frustumCulled=false;wakes.renderOrder=11;wakes.count=0;scene.add(wakes);
 // Both allegiances share the existing ribbon draw. Hostile cues get first
 // priority; omit split fragments to keep a dense volley legible.
 wakes.instanceColor=new THREE.InstancedBufferAttribute(new Float32Array(wakeCapacity*3).fill(1),3);wakes.instanceColor.setUsage(THREE.DynamicDrawUsage);
 const wakeColor=new THREE.Color(),playerWakeLimit=mobile?12:28;
 const wakePalette={seed:0x98e9c2,reflect:0xb6dcff,split:0xffcf78,chain:0xc6c0ff,orbit:0xc2a2ed,pierce:0xb5e5ff,burst:0xffbf74,recall:0xcfb1ed,gravity:0xb7a1de,frost:0xc9efff};
 let wakeCount=0,playerWakeCount=0;
 function addWake(p,length,width,hex){
  travel.set(p.dir.x||0,0,p.dir.z||0);if(travel.lengthSq()<.0001)return;
  travel.normalize();const angle=Math.atan2(travel.dot(up),travel.dot(right)),k=Math.min(1.5,p.visualScale||1);
  dummy.position.copy(p.ob.position).addScaledVector(travel,-(length*.5+.09)*k);
  dummy.position.y=Math.max(dummy.position.y,.4);
  dummy.quaternion.copy(camera.quaternion).multiply(roll.setFromAxisAngle(zAxis,angle));
  dummy.scale.set(length*k,width*k,1);dummy.updateMatrix();wakes.setMatrixAt(wakeCount,dummy.matrix);
  wakeColor.setHex(hex);wakes.setColorAt(wakeCount++,wakeColor);
 }
 const active=()=>ready&&enabled;
 let used=0,hidden=0,mirrorCount=0;
 function make(cell,size,family='law'){
  const geometry=family==='combo'?comboGeometries[cell]:family==='ball'?ballGeometry:geometries[cell];
  const paint=family==='combo'?comboMaterial:family==='ball'?ballMaterial:cell===PROJECTILE_DNA_CELLS.storm?stormMaterial:material;
  const mesh=new THREE.InstancedMesh(geometry,paint,size);
  mesh.name=`seed-projectile-${family}-${cell}`;mesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
  mesh.frustumCulled=false;mesh.castShadow=false;mesh.receiveShadow=false;
  mesh.renderOrder=12;mesh.count=0;mesh.visible=false;scene.add(mesh);
  return {mesh,capacity:size};
 }
 function batchFor(cell,family){
  if(family==='combo')return comboBatches[cell]||(comboBatches[cell]=make(cell,Math.min(64,capacity),'combo'));
  if(family==='ball')return ballBatch||(ballBatch=make(0,Math.min(64,capacity),'ball'));
  return batches[cell]||(batches[cell]=make(cell,Math.min(64,capacity)));
 }
 function add(p,cell,size,family='law'){
  const ob=p.ob;if(!ob)return;
  // Comet Corolla uses its authored 2.5D bud in both orbit and flight.
  if(p.kind==='comethalo'&&ob.userData.cometSprite){ob.visible=true;ob.userData.spriteHidden=false;return;}
  const sprite=enabled&&used<capacity&&(family==='combo'?comboReady:family==='ball'?ballReady:ready);
  ob.visible=!sprite;ob.userData.spriteHidden=sprite;
  if(!sprite)return;
  let batch=batchFor(cell,family),index=family==='combo'?comboCounts[cell]:family==='ball'?ballCount:counts[cell];
  if(index>=batch.capacity){
   const replacement=make(cell,Math.min(capacity,batch.capacity*2),family);
   replacement.mesh.instanceMatrix.array.set(batch.mesh.instanceMatrix.array);
   batch.mesh.removeFromParent();batch.mesh.dispose();
   if(family==='combo')comboBatches[cell]=replacement;else if(family==='ball')ballBatch=replacement;else batches[cell]=replacement;
   batch=replacement;
  }
  travel.set(p.dir?.x||0,0,p.dir?.z||0);const angle=p.dir?Math.atan2(travel.dot(up),travel.dot(right)):0;
  const visualSize=(family==='combo'?1.35:family==='ball'?1.05:.9)*(p.visualScale||size||1);
  const age=Number.isFinite(p.age)?p.age:0,breath=family==='law'?1+Math.sin(age*9+cell*.71)*.025:1;
  // 2026-09-28 사용자 신고(여정 · 얼어붙은 블랙홀): 땅에 붙은 큰 그림(차가운 우물·말뚝)은 판 가운데가 땅 높이라
  // 아래 절반이 바닥에 묻혀 잘려 보였다. 판의 아래 끝이 바닥 위에 오도록 올린다(작은 탄은 그대로).
  dummy.position.copy(ob.position);const half=visualSize*.5*.8;if(dummy.position.y<half)dummy.position.y=half;
  dummy.quaternion.copy(camera.quaternion).multiply(roll.setFromAxisAngle(zAxis,angle));
  dummy.scale.set(visualSize*breath,visualSize/breath,1);dummy.updateMatrix();
  batch.mesh.setMatrixAt(index,dummy.matrix);
  if(family==='combo')comboCounts[cell]++;else if(family==='ball')ballCount++;else counts[cell]++;
  used++;hidden++;
 }
 function sync(playerAndFormShots,enemyShots){
  counts.fill(0);comboCounts.fill(0);ballCount=0;used=0;hidden=0;mirrorCount=0;wakeCount=0;playerWakeCount=0;camera.updateMatrixWorld();
  right.set(1,0,0).applyQuaternion(camera.quaternion);up.set(0,1,0).applyQuaternion(camera.quaternion);
  for(const p of playerAndFormShots){
   if(p.life<=0||!p.ob)continue;
   if(p.spriteKey==='combo'){add(p,Math.max(0,Math.min(11,p.spriteCell|0)),1,'combo');continue;}
   add(p,PROJECTILE_DNA_CELLS[p.critical?'critical':p.tint]??PROJECTILE_DNA_CELLS.seed,1);
  }
  for(const p of enemyShots){
   if(p.life<=0||!p.ob)continue;
   if(p.mirror&&mirrorCount<haloCapacity&&(!haloAtlas||haloAtlas.image?.width)){
    dummy.position.copy(p.ob.position);dummy.quaternion.copy(camera.quaternion);
    const size=(p.visualScale||1)*(haloAtlas?1.5:1.6)*(1+.045*Math.sin((p.age||0)*12));
    dummy.scale.set(size,size,1);dummy.updateMatrix();mirrorHalos.setMatrixAt(mirrorCount++,dummy.matrix);
   }
   if(p.spriteKey==='baseball'){add(p,0,1,'ball');continue;}
   const key=p.mirror?p.law||'seed':p.spriteKey||((p.boss||p.pierce)?'boss':'hostile');
   if(active()&&!p.mirror&&p.dir&&wakeCount<wakeCapacity){
    addWake(p,.88,.09,0xff6738);
   }
   add(p,PROJECTILE_DNA_CELLS[key]??PROJECTILE_DNA_CELLS.hostile,key==='hostile'?.75:key==='boss'?1.12:key==='storm'?(p.boss?1.34:1.16):1);
  }
  if(active())for(const p of playerAndFormShots){
   if(playerWakeCount>=playerWakeLimit||wakeCount>=wakeCapacity)break;
   if(p.life<=0||!p.ob?.userData.spriteHidden||p.fragment||!p.dir||p.spriteKey==='combo')continue;
   const before=wakeCount;addWake(p,p.tint==='pierce'?1.08:.74,.035,wakePalette[p.tint]??wakePalette.seed);playerWakeCount+=wakeCount-before;
  }
  const flush=(batch,count)=>{if(!batch)return;const mesh=batch.mesh;mesh.count=count;mesh.visible=count>0;if(count){const attr=mesh.instanceMatrix;attr.clearUpdateRanges();attr.addUpdateRange(0,count*16);attr.needsUpdate=true;}};
  for(let cell=0;cell<batches.length;cell++)flush(batches[cell],counts[cell]);
  for(let cell=0;cell<comboBatches.length;cell++)flush(comboBatches[cell],comboCounts[cell]);
  flush(ballBatch,ballCount);flush({mesh:wakes},wakeCount);
  if(wakeCount){wakes.instanceColor.clearUpdateRanges();wakes.instanceColor.addUpdateRange(0,wakeCount*3);wakes.instanceColor.needsUpdate=true;}
  mirrorHalos.count=mirrorCount;mirrorHalos.visible=mirrorCount>0;
  if(mirrorCount){const attr=mirrorHalos.instanceMatrix;attr.clearUpdateRanges();attr.addUpdateRange(0,mirrorCount*16);attr.needsUpdate=true;}
  return used;
 }
 function setEnabled(value){enabled=Boolean(value);return active();}
 function dispose(){wakes.removeFromParent();wakes.dispose();wakeGeometry.dispose();wakeMaterial.dispose();for(const batch of [...batches,...comboBatches,ballBatch])if(batch){batch.mesh.removeFromParent();batch.mesh.dispose();}mirrorHalos.removeFromParent();mirrorHalos.dispose();haloGeometry.dispose();haloMaterial.dispose();for(const geometry of [...geometries,...comboGeometries,ballGeometry])geometry.dispose();stormMaterial.dispose();material.dispose();comboMaterial.dispose();ballMaterial.dispose();texture.dispose();comboTexture.dispose();ballTexture.dispose();}
 return {sync,setEnabled,active,baseTexture:texture,comboTexture,state:()=>({active:active(),ready,comboReady,ballReady,drawn:used,batches:[...batches,...comboBatches,ballBatch].filter(b=>b?.mesh.count).length,formDrawn:comboCounts.reduce((a,b)=>a+b,0),baseballs:ballCount,mirrorRims:mirrorCount,hostileWakes:wakeCount-playerWakeCount,playerWakes:playerWakeCount,hidden,capacity,file}),dispose};
}
