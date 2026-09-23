import assert from 'node:assert/strict';
import * as THREE from 'three';
import fs from 'node:fs';
import {createVFX,VFX_ATLAS_FILE,VFX_CELLS} from '../src/vfx.js';

for(const mobile of [false,true]){
  const scene=new THREE.Scene(),fx=createVFX(scene,{mobile,random:()=>.5});
  const root=scene.children[0],meshes=[...root.children],a=new THREE.Vector3(1,0,2),b=new THREE.Vector3(4,0,3),dir=new THREE.Vector3(0,0,-1);
  const beforeA=a.clone(),beforeB=b.clone();
  for(let i=0;i<70;i++){
    fx.impact(a,'reflect',true);fx.explosion(a,'burst',1.6,true);fx.reflect(a,dir);fx.split(a,dir,5);fx.arc(a,b);fx.portal(a,b);fx.dash(a,.3);fx.evolution(a,'chain');fx.trail(a,b);
    fx.bossPitch(a,dir,0);fx.bossPitch(a,dir,.8);fx.bossRush(a,b);fx.bossSwing(a,dir);fx.bossWave(a,.4);fx.bossPhase(a,i%2?'rally':'finish');
  }
  fx.update(.016);
  assert.deepEqual(a,beforeA);assert.deepEqual(b,beforeB,'VFX must never move gameplay objects');
  assert.deepEqual(root.children,meshes,'Effects must reuse four GPU batches');
  assert.equal(meshes.length,4);assert.equal(fx.state().batches,4);
  assert.ok(!meshes.some(m=>m.geometry.name==='seed-vfx-broken-shock-crown'),'the floor shock crown is gone');
  assert.equal(meshes[1].geometry.name,'seed-vfx-tapered-streak');
  assert.ok(fx.state().events.pulse>0,'pulse calls stay valid but draw nothing');
  assert.ok(fx.state().events.flame>0&&fx.state().events.explosion>0,'Explosions add a bounded flame crown');
  assert.ok(fx.state().events.portal>0,'Portals reuse the fixed spark and beam batches');
  for(const event of ['bossPitch','bossRush','bossSwing','bossWave','bossPhase'])assert.ok(fx.state().events[event]>0,`${event} reuses the fixed VFX batches`);
  assert.ok(fx.state().active<=fx.state().capacity);
  for(const [draw,lowSegments,highSegments] of [
    [()=>fx.lance(a,b,'icicle'),2,4],
    [()=>fx.frostWeb(a,b),1,3],
    [()=>fx.rewindTrace(a,b,true),1,2],
    [()=>fx.mirrorArc(a,b,2),2,3],
    [()=>fx.gardenVortex(a,1.5),3,5],
    [()=>fx.sunburst(a,1.5),6,10]
  ]){
    fx.clear();fx.setQuality(0);draw();fx.update(.10);fx.update(.016);fx.update(.016);
    assert.equal(meshes[1].count,lowSegments,'low-end devices draw the minimal attack silhouette');
    fx.clear();fx.setQuality(2);draw();fx.update(.10);fx.update(.016);fx.update(.016);
    assert.equal(meshes[1].count,highSegments,'higher quality adds detail within the shared beam batch');
  }
  assert.deepEqual(a,beforeA);assert.deepEqual(b,beforeB,'authored attack visuals do not move hit endpoints');
  assert.equal(fx.state().events.lance,2);assert.equal(fx.state().events.frostWeb,2);assert.equal(fx.state().events.rewindTrace,2);
  assert.equal(fx.state().events.mirrorArc,2);assert.equal(fx.state().events.gardenVortex,2);assert.equal(fx.state().events.sunburst,2);
  fx.clear();fx.setQuality(0);fx.explosion(a,'burst',1.6,true);fx.update(.016);const lowCount=fx.state().active;
  fx.clear();fx.setQuality(2);fx.explosion(a,'burst',1.6,true);fx.update(.016);assert.ok(lowCount<fx.state().active,'low quality emits fewer particles from the same effect');
  for(const mesh of meshes){
    assert.equal(mesh.castShadow,false);assert.equal(mesh.material.depthWrite,false);
    assert.ok([...mesh.instanceMatrix.array].every(Number.isFinite));
  }
  for(let i=0;i<160;i++)fx.update(.016);
  assert.equal(fx.state().active,0,'All effects, including delayed evolution rays, must expire');
  fx.evolution(a,'split');fx.clear();fx.update(1);assert.equal(fx.state().active,0,'Clear cancels delayed effects across rooms/restarts');
  const disposed=[];for(const mesh of meshes){mesh.geometry.addEventListener('dispose',()=>disposed.push('geometry'));mesh.material.addEventListener('dispose',()=>disposed.push('material'));}
  fx.dispose();assert.equal(scene.children.length,0);assert.equal(disposed.length,8);
}
// The atlas covers the four existing batches without adding meshes or lights.
{
  const atlasFile=new URL('../public/'+VFX_ATLAS_FILE,import.meta.url);
  assert.ok(fs.statSync(atlasFile).size<64*1024,'effect atlas stays a small WebP');
  const atlas=new THREE.Texture(),scene=new THREE.Scene(),fx=createVFX(scene,{atlas,random:()=>.3}),a=new THREE.Vector3(1,0,2);
  const meshes=[...scene.children[0].children],sprites=meshes.filter(m=>m.geometry.name==='seed-vfx-sprite');
  assert.equal(meshes.length,4,'the atlas keeps the same four GPU batches');
  assert.equal(sprites.length,4,'sparks, streaks, flames and dash ghosts become atlas sprites');
  for(const mesh of sprites){
    assert.equal(mesh.material.map,atlas);assert.equal(mesh.material.customProgramCacheKey(),'seed-vfx-sprite-v1');
    assert.equal(mesh.material.blending,THREE.AdditiveBlending);assert.equal(mesh.material.depthWrite,false);
  }
  const camera=new THREE.PerspectiveCamera(60,1,.1,100);camera.position.set(0,9,12);camera.lookAt(0,0,0);camera.updateMatrixWorld();fx.setCamera(camera);
  fx.explosion(a,'burst',1.6,true);for(const id of ['frost','chain','split','gravity','seed'])fx.impact(a,id,true);fx.arc(a,a.clone().add(new THREE.Vector3(2,0,0)));fx.dash(a,.3);fx.update(.016);
  for(const mesh of sprites){
    assert.ok(mesh.count>0);const cells=mesh.geometry.attributes.fxSprite.array;
    for(let i=0;i<mesh.count;i++){const cell=cells[i*2];assert.ok(Number.isInteger(cell)&&cell>=0&&cell<16,'atlas cell in range');assert.ok(Number.isFinite(cells[i*2+1]));}
  }
  const flames=meshes[2];flames.geometry.computeBoundingBox();
  assert.equal(flames.geometry.boundingBox.min.y,0,'the flame sprite is anchored at its base');
  for(let i=0;i<flames.count;i++)assert.equal(flames.geometry.attributes.fxSprite.array[i*2],VFX_CELLS.flame);
  fx.clear();fx.lance(a,a.clone().add(new THREE.Vector3(3,0,1)),'icicle');fx.update(.016);
  const beamMatrix=new THREE.Matrix4();meshes[1].getMatrixAt(0,beamMatrix);
  const beamNormal=new THREE.Vector3(0,0,1).transformDirection(beamMatrix),cameraNormal=new THREE.Vector3(0,0,1).applyQuaternion(camera.quaternion);
  assert.ok(beamNormal.dot(cameraNormal)>.99,'flat beam sprites face the gameplay camera instead of becoming edge-on');
  assert.equal(fx.state().textured,true);
  const shader={vertexShader:THREE.ShaderLib.basic.vertexShader,fragmentShader:THREE.ShaderLib.basic.fragmentShader};sprites[0].material.onBeforeCompile(shader);
  assert.ok(shader.vertexShader.includes('attribute vec2 fxSprite')&&shader.vertexShader.includes('vMapUv=(uv+')&&!shader.vertexShader.includes('#include <project_vertex>'),'sprite shader patch applies to this three.js version');
  fx.dispose();
}
console.log('VFX capacity, flame-layer explosions, input isolation, finite transforms, expiry, reset, GPU resource disposal and the effect atlas passed.');
