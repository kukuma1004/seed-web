import * as THREE from 'three';

// 같은 모양·같은 재질의 탄환을 한 번의 그리기로 모은다(2026-09-21 성능 측정: 무거운 조합에서 내 탄환 50~110개가
// 각각 드로콜 하나씩을 썼다). 탄환의 위치·회전·크기 계산과 충돌은 그대로 Object3D에서 하고,
// 그리기 직전에 행렬만 옮긴다. 탄환 재질은 불투명 단색이라 겹치는 순서가 바뀌어도 화면은 같다.
export function shotObject(geometry,material){
 const ob=new THREE.Object3D();ob.userData.shotGeometry=geometry;ob.userData.shotMaterial=material;return ob;
}
// 적 탄환처럼 여러 조각으로 된 탄: 불투명 조각만 묶음으로 보내고, 반투명 후광은 원래대로 장면에 둔다
// (반투명은 그리는 순서가 화면에 드러나므로 묶지 않는다). 조각은 부모에 붙이지 않고 userData에만 둔다.
export function addShotParts(group,parts){group.userData.shotParts=(group.userData.shotParts||[]).concat(parts);return group;}
const partMatrix=new THREE.Matrix4();
export function createShotBatches(scene,{initial=64}={}){
 const byGeometry=new Map(),all=[];
 function make(geometry,material,capacity){
  const mesh=new THREE.InstancedMesh(geometry,material,capacity);
  mesh.name='seed-shot-batch';mesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
  mesh.frustumCulled=false;mesh.castShadow=false;mesh.receiveShadow=false;mesh.count=0;mesh.visible=false;
  scene.add(mesh);return mesh;
 }
 function batchFor(geometry,material){
  let byMaterial=byGeometry.get(geometry);if(!byMaterial){byMaterial=new Map();byGeometry.set(geometry,byMaterial);}
  let batch=byMaterial.get(material);
  if(!batch){batch={geometry,material,capacity:initial,count:0,mesh:make(geometry,material,initial)};byMaterial.set(material,batch);all.push(batch);}
  return batch;
 }
 // 한 판에 탄환이 예상보다 많아지면 두 배로 늘린다(줄이지는 않는다).
 function grow(batch){
  const next=make(batch.geometry,batch.material,batch.capacity*2);
  next.instanceMatrix.array.set(batch.mesh.instanceMatrix.array);
  batch.mesh.removeFromParent();batch.mesh.dispose();batch.mesh=next;batch.capacity*=2;
 }
 function put(geometry,material,matrix){
  const batch=batchFor(geometry,material);
  if(batch.count>=batch.capacity)grow(batch);
  batch.mesh.setMatrixAt(batch.count++,matrix);
 }
 function sync(...lists){
  for(const batch of all)batch.count=0;
  for(const list of lists)for(const p of list){
   const ob=p.ob;if(!ob)continue;
   const geometry=ob.userData.shotGeometry,parts=ob.userData.shotParts;
   if(!geometry&&!parts)continue;
   ob.updateMatrix();
   if(geometry)put(geometry,ob.userData.shotMaterial,ob.matrix);
   if(parts)for(const part of parts){part.updateMatrix();put(part.userData.shotGeometry,part.userData.shotMaterial,partMatrix.multiplyMatrices(ob.matrix,part.matrix));}
  }
  for(const batch of all){
   const mesh=batch.mesh,count=batch.count;
   if(mesh.count===0&&count===0)continue;
   mesh.count=count;mesh.visible=count>0;
   if(count){const attr=mesh.instanceMatrix;attr.clearUpdateRanges();attr.addUpdateRange(0,count*16);attr.needsUpdate=true;}
  }
 }
 function clear(){for(const batch of all){batch.count=0;batch.mesh.count=0;batch.mesh.visible=false;}}
 // 셰이더 미리 준비용: 지금까지 만든 묶음과 앞으로 쓸 모양·재질 조합을 한 번씩 만들어 둔다.
 function prepare(pairs){for(const [geometry,material] of pairs)batchFor(geometry,material);}
 return {sync,clear,prepare,state:()=>({batches:all.length,instances:all.reduce((n,b)=>n+b.count,0),drawn:all.filter(b=>b.count>0).length})};
}
