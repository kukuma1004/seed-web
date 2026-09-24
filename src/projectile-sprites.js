import * as THREE from 'three';

// The game retains each projectile's simulated object and collision. Only its
// render body changes, using the same camera-facing plane proven in the lab.
export const PROJECTILE_DNA_ATLAS='seed-projectile-dna-v1.png';
export const PROJECTILE_DNA_CELLS=Object.freeze({
 seed:0,reflect:1,split:2,chain:3,orbit:4,pierce:5,burst:6,recall:7,
 gravity:8,frost:9,portal:10,critical:11,hostile:12,boss:13,austin:14,storm:15
});
export const MIRROR_SHOT_COLOR=0xe957b8;

function cellGeometry(index){
 const geometry=new THREE.PlaneGeometry(1,1),uv=geometry.getAttribute('uv');
 const col=index%4,row=3-Math.floor(index/4),edge=.0015;
 for(let i=0;i<uv.count;i++)uv.setXY(i,(col+edge+uv.getX(i)*(1-2*edge))*.25,(row+edge+uv.getY(i)*(1-2*edge))*.25);
 uv.needsUpdate=true;geometry.name=`seed-projectile-dna-${index}`;return geometry;
}

export function createProjectileSprites(scene,camera,{mobile=false,baseUrl='',capacity=480,haloAtlas=null,onReady=()=>{}}={}){
 const file=`${baseUrl}assets/${mobile?'mobile/':''}${PROJECTILE_DNA_ATLAS}`;
 let ready=false,enabled=true;
 const texture=new THREE.TextureLoader().load(file,()=>{ready=true;onReady(texture);},undefined,()=>{ready=false;});
 texture.colorSpace=THREE.SRGBColorSpace;
 texture.minFilter=THREE.LinearMipmapLinearFilter;
 texture.magFilter=THREE.LinearFilter;
 const material=new THREE.MeshBasicMaterial({map:texture,transparent:true,alphaTest:.07,depthWrite:false,depthTest:true,side:THREE.FrontSide,toneMapped:false});
 // The blue storm painting vanishes against the act-3 clouds. Recolor only its
 // luminance in one shared instanced batch; no second texture or per-bolt mesh.
 const stormMaterial=material.clone();
 stormMaterial.onBeforeCompile=shader=>{shader.fragmentShader=shader.fragmentShader.replace('#include <map_fragment>',`#include <map_fragment>
  float stormInk=dot(diffuseColor.rgb,vec3(.2126,.7152,.0722));
  vec3 stormEmber=mix(vec3(.18,.025,.025),vec3(1.,.31,.035),smoothstep(.1,.72,stormInk));
  diffuseColor.rgb=mix(stormEmber,vec3(1.,.96,.68),smoothstep(.7,1.,stormInk));`);};
 stormMaterial.customProgramCacheKey=()=> 'seed-storm-amber-v1';
 const geometries=Array.from({length:16},(_,index)=>cellGeometry(index));
 const batches=new Array(16).fill(null),counts=new Uint16Array(16);
 const dummy=new THREE.Object3D(),right=new THREE.Vector3(),up=new THREE.Vector3(),travel=new THREE.Vector3(),roll=new THREE.Quaternion(),zAxis=new THREE.Vector3(0,0,1);
 // The reflected seed must keep the player's law silhouette, but its attack
 // needs a hostile cue. One shared painterly ring marks every mirror shot.
 const haloCapacity=Math.min(capacity,64),haloGeometry=haloAtlas?cellGeometry(3):new THREE.RingGeometry(.39,.48,20);
 const haloMaterial=new THREE.MeshBasicMaterial({map:haloAtlas,color:MIRROR_SHOT_COLOR,transparent:true,opacity:.9,blending:haloAtlas?THREE.AdditiveBlending:THREE.NormalBlending,depthWrite:false,depthTest:true,side:THREE.DoubleSide,toneMapped:false});
 const mirrorHalos=new THREE.InstancedMesh(haloGeometry,haloMaterial,haloCapacity);
 mirrorHalos.name='seed-mirror-hostile-rims';mirrorHalos.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
 mirrorHalos.frustumCulled=false;mirrorHalos.castShadow=false;mirrorHalos.receiveShadow=false;mirrorHalos.renderOrder=11;mirrorHalos.count=0;mirrorHalos.visible=false;scene.add(mirrorHalos);
 const active=()=>ready&&enabled;
 let used=0,hidden=0,mirrorCount=0;
 function make(cell,size){
  const mesh=new THREE.InstancedMesh(geometries[cell],cell===PROJECTILE_DNA_CELLS.storm?stormMaterial:material,size);
  mesh.name=`seed-projectile-dna-${cell}`;mesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
  mesh.frustumCulled=false;mesh.castShadow=false;mesh.receiveShadow=false;
  mesh.renderOrder=12;mesh.count=0;mesh.visible=false;scene.add(mesh);
  return {mesh,capacity:size};
 }
 function batchFor(cell){return batches[cell]||(batches[cell]=make(cell,Math.min(64,capacity)));}
 function add(p,cell,size){
  const ob=p.ob;if(!ob||!p.dir)return;
  // Comet Corolla uses its authored 2.5D bud in both orbit and flight.
  if(p.kind==='comethalo'&&ob.userData.cometSprite){ob.visible=true;ob.userData.spriteHidden=false;return;}
  const sprite=active()&&used<capacity;
  ob.visible=!sprite;ob.userData.spriteHidden=sprite;
  if(!sprite)return;
  let batch=batchFor(cell),index=counts[cell];
  if(index>=batch.capacity){
   const replacement=make(cell,Math.min(capacity,batch.capacity*2));
   replacement.mesh.instanceMatrix.array.set(batch.mesh.instanceMatrix.array);
   batch.mesh.removeFromParent();batch.mesh.dispose();batches[cell]=batch=replacement;
  }
  travel.set(p.dir.x,0,p.dir.z);const angle=Math.atan2(travel.dot(up),travel.dot(right));
  dummy.position.copy(ob.position);dummy.quaternion.copy(camera.quaternion).multiply(roll.setFromAxisAngle(zAxis,angle));
  const visualSize=.82*(p.visualScale||size||1);dummy.scale.set(visualSize,visualSize,1);dummy.updateMatrix();
  batch.mesh.setMatrixAt(index,dummy.matrix);counts[cell]++;used++;hidden++;
 }
 function sync(playerAndFormShots,enemyShots){
  counts.fill(0);used=0;hidden=0;mirrorCount=0;camera.updateMatrixWorld();
  right.set(1,0,0).applyQuaternion(camera.quaternion);up.set(0,1,0).applyQuaternion(camera.quaternion);
  for(const p of playerAndFormShots){
   if(p.life<=0||!p.ob)continue;
   add(p,PROJECTILE_DNA_CELLS[p.critical?'critical':p.tint]??PROJECTILE_DNA_CELLS.seed,1);
  }
  for(const p of enemyShots){
   if(p.life<=0||!p.ob)continue;
   if(p.mirror&&mirrorCount<haloCapacity&&(!haloAtlas||haloAtlas.image?.width)){
    dummy.position.copy(p.ob.position);dummy.quaternion.copy(camera.quaternion);
    const size=(p.visualScale||1)*(haloAtlas?1.5:1.6)*(1+.045*Math.sin((p.age||0)*12));
    dummy.scale.set(size,size,1);dummy.updateMatrix();mirrorHalos.setMatrixAt(mirrorCount++,dummy.matrix);
   }
   // A baseball keeps its hand-painted red seams and physical ball shape.
   if(p.spriteKey==='baseball'){p.ob.visible=true;p.ob.userData.spriteHidden=false;continue;}
   const key=p.mirror?p.law||'seed':p.spriteKey||((p.boss||p.pierce)?'boss':'hostile');
   add(p,PROJECTILE_DNA_CELLS[key]??PROJECTILE_DNA_CELLS.hostile,key==='hostile'?.75:key==='boss'?1.12:key==='storm'?(p.boss?1.34:1.16):1);
  }
  for(let cell=0;cell<batches.length;cell++){
   const batch=batches[cell];if(!batch)continue;
   const count=counts[cell],mesh=batch.mesh;mesh.count=count;mesh.visible=count>0;
   if(count){const attr=mesh.instanceMatrix;attr.clearUpdateRanges();attr.addUpdateRange(0,count*16);attr.needsUpdate=true;}
  }
  mirrorHalos.count=mirrorCount;mirrorHalos.visible=mirrorCount>0;
  if(mirrorCount){const attr=mirrorHalos.instanceMatrix;attr.clearUpdateRanges();attr.addUpdateRange(0,mirrorCount*16);attr.needsUpdate=true;}
  return used;
 }
 function setEnabled(value){enabled=Boolean(value);return active();}
 function dispose(){for(const batch of batches)if(batch){batch.mesh.removeFromParent();batch.mesh.dispose();}mirrorHalos.removeFromParent();mirrorHalos.dispose();haloGeometry.dispose();haloMaterial.dispose();for(const geometry of geometries)geometry.dispose();stormMaterial.dispose();material.dispose();texture.dispose();}
 return {sync,setEnabled,active,state:()=>({active:active(),ready,drawn:used,batches:batches.filter(b=>b?.mesh.count).length,mirrorRims:mirrorCount,hidden,capacity,file}),dispose};
}
