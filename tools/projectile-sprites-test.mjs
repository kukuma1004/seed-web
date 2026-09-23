import assert from 'node:assert/strict';
import * as THREE from 'three';
import {createProjectileSprites,PROJECTILE_DNA_CELLS,MIRROR_SHOT_COLOR} from '../src/projectile-sprites.js';

const originalLoad=THREE.TextureLoader.prototype.load;
let finishLoad;
THREE.TextureLoader.prototype.load=function(_url,onLoad){
  const texture=new THREE.Texture();finishLoad=()=>onLoad(texture);return texture;
};
try{
  const scene=new THREE.Scene(),camera=new THREE.PerspectiveCamera(55,1,.1,100);
  camera.position.set(0,15,15);camera.lookAt(0,0,0);camera.updateMatrixWorld();
  const haloAtlas=new THREE.Texture({width:512,height:512});
  const sprites=createProjectileSprites(scene,camera,{capacity:24,haloAtlas});
  const shot=(tint,i)=>({ob:new THREE.Object3D(),dir:new THREE.Vector3(1,0,0),life:2,tint,visualScale:1,critical:false});
  const player=Object.keys(PROJECTILE_DNA_CELLS).slice(0,12).map(shot);
  const enemy=Array.from({length:25},(_,i)=>({ob:new THREE.Object3D(),dir:new THREE.Vector3(0,0,1),life:2,boss:i%2===0}));
  sprites.sync(player,enemy);
  assert.equal(sprites.state().drawn,0,'3D geometry remains visible until the atlas loads');
  assert.ok(player.every(p=>p.ob.visible!==false));
  finishLoad();sprites.sync(player,enemy);
  assert.equal(sprites.state().drawn,24,'the sprite budget is bounded');
  assert.equal(sprites.state().hidden,24);
  assert.ok(player.every(p=>p.ob.userData.spriteHidden),'all law bodies use the new atlas');
  assert.ok(enemy.slice(0,12).every(p=>p.ob.userData.spriteHidden));
  assert.ok(enemy.slice(12).every(p=>!p.ob.userData.spriteHidden),'overflow falls back to the original body');
  const batches=scene.children.filter(c=>c.isInstancedMesh&&c.count>0);
  assert.ok(batches.length<=16&&batches.length>0,'one shared atlas, at most one draw per visible cell');
  assert.equal(new Set(batches.map(b=>b.material)).size,1);
  assert.ok(batches.every(b=>[...b.instanceMatrix.array].every(Number.isFinite)));
  const mirror={...shot('split'),mirror:true,law:'split',age:.4};
  sprites.sync([], [mirror]);
  assert.equal(sprites.state().mirrorRims,1,'the reflected law keeps its silhouette and gets a hostile rim');
  assert.equal(scene.getObjectByName('seed-projectile-dna-2').count,1);
  const rim=scene.getObjectByName('seed-mirror-hostile-rims');
  assert.equal(rim.count,1);assert.equal(rim.material.color.getHex(),MIRROR_SHOT_COLOR);
  sprites.setEnabled(false);sprites.sync(player,enemy);
  assert.ok([...player,...enemy].every(p=>p.ob.visible&&p.ob.userData.spriteHidden===false),'3D fallback restores all bodies');
  sprites.dispose();
  const fallbackScene=new THREE.Scene(),fallback=createProjectileSprites(fallbackScene,camera,{capacity:8});
  finishLoad();fallback.setEnabled(false);fallback.sync([], [{...shot('seed'),mirror:true,law:'seed'}]);
  assert.equal(fallback.state().mirrorRims,1,'a mirror rim remains visible with the old 3D body and no VFX atlas');
  assert.equal(fallbackScene.getObjectByName('seed-mirror-hostile-rims').geometry.type,'RingGeometry');
  fallback.dispose();
}finally{THREE.TextureLoader.prototype.load=originalLoad;}
console.log('Projectile DNA atlas load, 16-cell batching, hostile mirror rims, capacity fallback, finite transforms and 3D toggle passed.');
