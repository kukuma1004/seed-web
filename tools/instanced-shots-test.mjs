import assert from 'node:assert/strict';
import * as THREE from 'three';
import {createShotBatches,shotObject,addShotParts} from '../src/instanced-shots.js';

// 인스턴스 버퍼는 Float32라 소수 일곱째 자리 안쪽까지만 같다.
const same=(a,b)=>a.elements.every((v,i)=>Math.abs(v-b.elements[i])<1e-6);
const scene=new THREE.Scene(),geo=new THREE.IcosahedronGeometry(.2,0),opaque=new THREE.MeshBasicMaterial(),other=new THREE.MeshBasicMaterial();
const batches=createShotBatches(scene,{initial:2});
// 내 탄환: 위치·회전·크기가 예전 Mesh의 행렬과 똑같이 들어간다
const ob=shotObject(geo,opaque);ob.position.set(1,.67,-2);ob.rotation.set(.1,.7,.2);ob.scale.set(1.2,.9,1);
const reference=new THREE.Mesh(geo,opaque);reference.position.copy(ob.position);reference.rotation.copy(ob.rotation);reference.scale.copy(ob.scale);scene.add(reference);scene.updateMatrixWorld(true);
batches.sync([{ob}]);
const mesh=scene.children.find(c=>c.isInstancedMesh);const m=new THREE.Matrix4();mesh.getMatrixAt(0,m);
assert.ok(same(m,reference.matrixWorld),'묶음 행렬 = 예전 개별 물체의 월드 행렬');
assert.equal(mesh.count,1);assert.equal(mesh.visible,true);assert.equal(mesh.castShadow,false);assert.equal(mesh.frustumCulled,false);
// 여러 조각 탄: 불투명 조각은 (탄 행렬 × 조각 행렬), 반투명 고리는 원래 장면에 남는다
const g=new THREE.Group();g.position.set(-3,.65,4);g.rotation.y=1.3;scene.add(g);
const halo=new THREE.Mesh(new THREE.RingGeometry(.2,.3,8),new THREE.MeshBasicMaterial({transparent:true}));g.add(halo);
const spike=shotObject(geo,other);spike.position.set(.36,0,0);spike.quaternion.setFromAxisAngle(new THREE.Vector3(0,0,1),.5);
addShotParts(g,[shotObject(geo,opaque),spike]);
const refSpike=new THREE.Mesh(geo,other);refSpike.position.copy(spike.position);refSpike.quaternion.copy(spike.quaternion);g.add(refSpike);scene.updateMatrixWorld(true);
batches.sync([{ob}],[{ob:g}]);
const spikeBatch=scene.children.filter(c=>c.isInstancedMesh).find(c=>c.material===other);spikeBatch.getMatrixAt(0,m);
assert.ok(same(m,refSpike.matrixWorld),'가시 조각 행렬 = 예전 자식 물체의 월드 행렬');
assert.equal(mesh.count,2,'같은 모양·재질 핵은 같은 묶음');assert.equal(halo.parent,g,'반투명 고리는 묶지 않는다');
// 용량을 넘으면 늘어나고, 탄이 없으면 그리지 않는다
batches.sync(Array.from({length:5},()=>({ob:shotObject(geo,opaque)})));
assert.equal(batches.state().instances,5);
batches.sync([]);assert.equal(scene.children.filter(c=>c.isInstancedMesh).every(c=>c.count===0&&!c.visible),true);
console.log('탄환 묶음 그리기: 예전 개별 물체와 같은 행렬, 반투명 고리는 분리 통과');
// 셰이더 미리 준비: 묶음으로 그리는 탄 재질과, 등불이 꺼진 조명 상태(2막·3막)까지 준비해야 판 시작 때 새 컴파일이 0개다.
{
 const fs=await import('node:fs');
 const main=fs.readFileSync(new URL('../src/main.js',import.meta.url),'utf8');
 assert.match(main,/projectileSprites\.sync\(projectileBodyList,enemyShots\)/,'all live shots use painted 2D batches');
 assert.doesNotMatch(main,/createProjectileGeometries\(|shotBatches\.sync\(/,'production avoids the old projectile meshes');
 assert.match(main,/const litLanterns=lanternLights\.filter\(l=>l\.visible\);[\s\S]*for\(const l of litLanterns\)l\.visible=false;[\s\S]*for\(const l of litLanterns\)l\.visible=true;/,'등불이 꺼진 조명 상태도 미리 준비해야 한다');
 assert.match(main,/function warmShaders\(\)[\s\S]*shaderWarmGroup\.removeFromParent\(\)/,'견본은 컴파일 뒤 장면에서 뺀다');
}
console.log('셰이더 미리 준비 목록 검사 통과');
