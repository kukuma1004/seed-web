import assert from 'node:assert/strict';
import fs from 'node:fs';
import * as THREE from 'three';
import {createShotAuras,shotAuraLook,SHOT_ATLAS_FILE,SHOT_CELLS} from '../src/shot-auras.js';

// Higgsfield 탄환 소재(2026-09-22): 탄 몸체는 그대로, 뒤에 법칙 빛 무늬 + 꼬리 두 장을 한 묶음으로 겹친다.
const LAWS=['seed','reflect','split','chain','orbit','pierce','burst','recall','gravity','frost'];
assert.ok(fs.statSync(new URL('../public/'+SHOT_ATLAS_FILE,import.meta.url)).size<64*1024,'projectile atlas stays a small WebP');

const auras=LAWS.map(id=>shotAuraLook(id).aura);
assert.deepEqual(auras,[0,1,2,3,4,5,6,7,8,9],'each law has its own aura cell');
for(const id of LAWS){
  const look=shotAuraLook(id);assert.ok(look.trail>=SHOT_CELLS.trail&&look.trail<=SHOT_CELLS.mistTrail,'trail cells sit in the last five cells');
  assert.ok(Number.isInteger(look.auraColor)&&Number.isInteger(look.trailColor));
}
assert.equal(shotAuraLook('chain',{critical:true}).aura,SHOT_CELLS.critical,'critical shots wear the burst star');
assert.equal(shotAuraLook('portal').aura,SHOT_CELLS.seed,'unknown tints fall back to the seed look');
assert.equal(shotAuraLook('chain',{trailLaw:'frost'}).trail,SHOT_CELLS.mistTrail,'the second law paints the trail (combination without new art)');
assert.equal(shotAuraLook('split',{trailLaw:'frost',fragment:true}).trail,shotAuraLook('split').trail,'fragments keep their own trail');
assert.ok(shotAuraLook('pierce').aligned&&!shotAuraLook('orbit').aligned,'only directional motifs follow the heading');

const camera=new THREE.PerspectiveCamera(39,16/9,.1,100);camera.position.set(0,22,22);camera.lookAt(0,0,0);camera.updateMatrixWorld();
const shot=(dir,extra={})=>({ob:{position:new THREE.Vector3(0,.67,0)},dir:new THREE.Vector3(...dir).normalize(),life:1,age:.3,tint:'chain',critical:false,fragment:false,visualScale:1,...extra});
{
  const scene=new THREE.Scene(),atlas=new THREE.Texture(),fx=createShotAuras(scene,{atlas,capacity:8});
  assert.equal(scene.children.length,1,'one batch for every projectile');
  assert.equal(fx.mesh.material.customProgramCacheKey(),'seed-vfx-sprite-v1','shares the effect-sprite shader (no new compile)');
  assert.equal(fx.mesh.material.depthWrite,false);assert.equal(fx.mesh.material.blending,THREE.AdditiveBlending);
  const shots=[shot([0,0,-1]),shot([1,0,0]),shot([0,0,1],{life:0}),shot([1,0,1],{critical:true,visualScale:2})];
  assert.equal(fx.sync(shots,camera,{first:'chain',second:'frost'}),6,'two sprites per living shot, dead shots skipped');
  const cells=fx.mesh.geometry.attributes.fxSprite.array;
  assert.equal(cells[0],SHOT_CELLS.mistTrail);assert.equal(cells[2],SHOT_CELLS.chain);assert.equal(cells[10],SHOT_CELLS.critical);
  assert.ok(Math.abs(cells[1])<1e-6,'a shot flying up the screen has an upright trail');
  assert.ok(Math.abs(cells[5]+Math.PI/2)<1e-6,'a shot flying right turns its trail to the right');
  const m=new THREE.Matrix4(),p=new THREE.Vector3();fx.mesh.getMatrixAt(0,m);p.setFromMatrixPosition(m);
  assert.ok(p.z>0,'the trail sits behind the shot');
  assert.ok([...fx.mesh.instanceMatrix.array.slice(0,6*16)].every(Number.isFinite));
  // 진화 탄: 나이·수명이 없을 수 있고, 꼬리는 재료 둘째 법칙(auraTrail). 방향이 없는(머무는) 것은 건너뛴다.
  const bolt={ob:{position:new THREE.Vector3()},dir:new THREE.Vector3(0,0,-1),tint:'reflect',auraTrail:'chain'};
  assert.equal(fx.sync([bolt,{ob:{position:new THREE.Vector3()},tint:'frost'}],camera),2,'evolution bolts join, resting ones are skipped');
  assert.equal(fx.mesh.geometry.attributes.fxSprite.array[0],SHOT_CELLS.crackleTrail,'an evolution bolt uses its second ingredient as the trail');
  assert.ok([...fx.mesh.instanceColor.array.slice(0,6)].every(Number.isFinite),'missing age/life never produces NaN colours');
  const many=Array.from({length:10},()=>shot([0,0,-1]));assert.equal(fx.sync(many,camera),8,'capacity is never exceeded');
  assert.equal(fx.sync([],camera),0);assert.equal(fx.mesh.count,0);
  fx.dispose();assert.equal(scene.children.length,0);
}
{
  const scene=new THREE.Scene(),fx=createShotAuras(scene,{atlas:null});
  assert.equal(fx.sync([shot([0,0,-1])],camera),0,'without the atlas (?vfxtex=0) nothing is drawn');
  fx.dispose();
}
console.log('탄환 소재: 법칙 10종 빛 무늬·치명타·꼬리 조합, 한 묶음·같은 셰이더, 방향·용량·끄기 통과');
