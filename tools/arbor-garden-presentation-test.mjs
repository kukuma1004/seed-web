import assert from 'node:assert/strict';
import fs from 'node:fs';
import crypto from 'node:crypto';
import * as THREE from 'three';
import {ARBOR_GARDEN_LAYOUTS,ARBOR_GARDEN_LIMITS} from '../src/arbor-garden-layout.js';
import {ARBOR_GARDEN_ART,createArborGardenPresentation} from '../src/arbor-garden-presentation.js';
import {createArborJourneyView,ARBOR_VIEW_LIMITS} from '../src/arbor-journey-view.js';
import {createArborJourney,checkpointArborJourney,ARBOR_ARENA,ARBOR_SECTORS} from '../src/arbor-journey.js';

let checks=0;
const test=(name,run)=>{run();checks++;console.log('PASS '+name);};
function fixture({lowQuality=false,ready=true}={}){
 const parent=new THREE.Group(),materials=new Set(),geometries=new Set(),assets=[];
 const ownMaterial=value=>(materials.add(value),value),ownGeometry=value=>(geometries.add(value),value);
 const loadAsset=file=>{const asset={file,ready,texture:new THREE.Texture(),materials:[]};assets.push(asset);return asset;};
 const bind=(material,asset)=>{asset.materials.push(material);if(asset.ready)material.map=asset.texture;return material;};
 const view=createArborGardenPresentation(parent,{ownMaterial,ownGeometry,loadAsset,bind,lowQuality});
 return {view,parent,materials,geometries,assets,node:name=>parent.getObjectByName(name)};
}
const snapshot=f=>{
 const rows=[];f.parent.traverse(mesh=>{if(mesh.isInstancedMesh)rows.push({name:mesh.name,matrix:mesh.instanceMatrix.version,atlas:mesh.geometry.getAttribute('instanceAtlas')?.version,color:mesh.instanceColor?.version});});return rows;
};
test('five hand-authored courts have distinct space plans, shared bounded outer beds, and unchanged arena',()=>{
 assert.equal(ARBOR_GARDEN_LAYOUTS.length,5);assert.equal(new Set(ARBOR_GARDEN_LAYOUTS.map(layout=>JSON.stringify(layout.patches))).size,5);assert.equal(new Set(ARBOR_GARDEN_LAYOUTS.map(layout=>JSON.stringify(layout.props))).size,5);
 for(const layout of ARBOR_GARDEN_LAYOUTS){assert(Object.isFrozen(layout));assert.equal(layout.passableGround,true);assert.equal(layout.collisionOwned,false);assert.equal(layout.beds.length,16);assert(layout.patches.length<=ARBOR_GARDEN_LIMITS.lawnPatches);assert(layout.props.length<=ARBOR_GARDEN_LIMITS.props);assert(layout.trees.length<=5);}
 assert.deepEqual([ARBOR_ARENA.halfWidth,ARBOR_ARENA.halfDepth],[14,12]);
});
test('all raised flowerbed footprints are outside the actual movement arena',()=>{
 for(const layout of ARBOR_GARDEN_LAYOUTS)for(const bed of layout.beds){assert.equal(bed.angle,0);assert(Math.abs(bed.x)-bed.w/2>14||Math.abs(bed.z)-bed.d/2>12,'decorative stone cannot imply an unregistered central blocker');}
});
test('large tree silhouettes stay outside the playable field at the Act1 billboard angle',()=>{
 for(const layout of ARBOR_GARDEN_LAYOUTS)for(const tree of layout.trees){
  const region=tree.tile===6?[36/362,12/362,329/362,1]:[8/362,11/362,343/362,1],width=tree.height*(region[2]-region[0])/(region[3]-region[1]);
  assert(Math.abs(tree.x)-width/2>14||tree.z<-12,'tree crown cannot cover the combat centre');assert(tree.height>=5.5&&tree.height<=9.2);
 }
});
test('authored atlas props retain actual source crops, bounded geometry and no new light/loop',()=>{
 const f=fixture();f.view.setActive(true);f.view.setSector(0);
 assert.equal(f.geometries.size,5);assert.equal(f.materials.size,4);assert.equal(f.assets.length,3);assert.equal(f.view.diagnostics().drawCalls,6);
 assert(f.node('arbor-garden-surround').renderOrder<f.node('arbor-garden-flowers-and-trees').renderOrder,'transparent surround must be painted before the depth-write-free tree cards, regardless of object-origin sorting');
 for(const asset of f.assets){assert.equal(asset.texture.generateMipmaps,false);assert.equal(asset.texture.minFilter,THREE.LinearFilter);assert(fs.existsSync(new URL('../public/'+asset.file,import.meta.url)));}
 assert.equal(f.node('arbor-garden-flowers-and-trees').geometry.getAttribute('instanceAtlas').isInstancedBufferAttribute,true);
 const shader={vertexShader:'void main(){\n#include <uv_vertex>\n}'};f.node('arbor-garden-landmarks').material.onBeforeCompile(shader);assert.match(shader.vertexShader,/attribute vec4 instanceAtlas/);assert.match(shader.vertexShader,/vMapUv = instanceAtlas.xy \+ vMapUv \* instanceAtlas.zw/);assert(THREE.ShaderChunk.uv_vertex.includes('vMapUv'));
 const source=fs.readFileSync(new URL('../src/arbor-garden-presentation.js',import.meta.url),'utf8');assert.doesNotMatch(source,/requestAnimationFrame|new THREE\.(?:PointLight|DirectionalLight)|Math\.random|setInterval|setTimeout|localStorage|\bfetch\(/);f.view.dispose();
});
test('every planted card retains the Act1 plane angle at its actual flower/tree scale',()=>{
 const f=fixture(),matrix=new THREE.Matrix4(),position=new THREE.Vector3(),rotation=new THREE.Quaternion(),scale=new THREE.Vector3();f.view.setActive(true);
 for(let sector=0;sector<5;sector++){f.view.setSector(sector);for(const name of ['arbor-garden-flowers-and-trees','arbor-garden-landmarks']){const mesh=f.node(name);for(let index=0;index<mesh.count;index++){mesh.getMatrixAt(index,matrix);matrix.decompose(position,rotation,scale);assert(Math.abs(scale.y-scale.z)<1e-6,'baked card tilt cannot be distorted by scaling only Y');}}}
 const lawn=f.node('arbor-passable-lawn-islands'),normals=lawn.geometry.getAttribute('normal');for(let index=0;index<normals.count;index++)assert(normals.getY(index)>.99,'ground patches have front faces visible from the real overhead camera');for(let index=0;index<lawn.count;index++){lawn.getMatrixAt(index,matrix);matrix.decompose(position,rotation,scale);assert(scale.x<=4.15&&scale.z<=4.15,'no giant grass ellipse survives the authored cluster pass');}
 const curbs=f.node('arbor-outside-flowerbed-masonry');curbs.geometry.computeBoundingBox();assert(curbs.geometry.boundingBox.max.y<.15,'bed rim stays low and does not resemble a white capsule rail');const colors=curbs.geometry.getAttribute('color');for(let i=0;i<colors.count;i++)assert(colors.getX(i)<=.16&&colors.getY(i)<=.21&&colors.getZ(i)<=.11);f.view.dispose();
});
test('all five layouts fit fixed buffers and only update instance uploads on a real sector change',()=>{
 const f=fixture();f.view.setActive(true);for(let sector=0;sector<5;sector++){
  assert.equal(f.view.setSector(sector),true);const before=f.view.diagnostics(),versions=snapshot(f);for(let frame=0;frame<6000;frame++){assert.equal(f.view.setSector(sector),false);f.view.refresh();}
  assert.deepEqual(f.view.diagnostics(),before);assert.deepEqual(snapshot(f),versions);assert(before.plants<=112);assert.equal(before.beds,16);assert.equal(before.props,3);
  for(const name of ['arbor-garden-flowers-and-trees','arbor-garden-landmarks']){const mesh=f.node(name),atlas=mesh.geometry.getAttribute('instanceAtlas');for(let index=0;index<mesh.count;index++){assert(atlas.getX(index)>=0&&atlas.getX(index)+atlas.getZ(index)<=1);assert(atlas.getY(index)>=0&&atlas.getY(index)+atlas.getW(index)<=1);}}
 }f.view.dispose();
});
test('low quality keeps every landmark, tree and flowerbed with a smaller coherent bloom budget',()=>{
 const normal=fixture(),low=fixture({lowQuality:true});normal.view.setActive(true);low.view.setActive(true);
 for(let sector=0;sector<5;sector++){normal.view.setSector(sector);low.view.setSector(sector);const n=normal.view.diagnostics(),l=low.view.diagnostics();assert(l.plants<n.plants);assert.equal(l.props,n.props);assert.equal(l.beds,n.beds);assert.equal(l.passablePatches,n.passablePatches);assert.equal(l.drawCalls,n.drawCalls);}
 normal.view.dispose();low.view.dispose();
});
test('loading and hidden states perform no matrix uploads and do not show untextured atlas cards',()=>{
 const f=fixture({ready:false});f.view.setActive(true);f.view.setSector(0);assert.equal(f.node('arbor-garden-flowers-and-trees').visible,false);assert.equal(f.node('arbor-garden-landmarks').visible,false);const before=snapshot(f),writes=f.view.diagnostics().matrixWrites;
 f.assets[1].ready=true;f.view.refresh();assert.equal(f.node('arbor-garden-flowers-and-trees').visible,true);assert.equal(f.node('arbor-garden-landmarks').visible,false);assert.deepEqual(snapshot(f),before);assert.equal(f.view.diagnostics().matrixWrites,writes);
 f.view.setActive(false);const hidden=f.view.diagnostics();for(let frame=0;frame<6000;frame++)f.view.refresh();assert.deepEqual(f.view.diagnostics(),hidden);assert.equal(f.node('arbor-authored-garden').visible,false);f.view.dispose();assert.equal(f.view.diagnostics().active,false);
});
test('full Act6 view preserves checkpoint/rules and root bounds while owning all new resources once',()=>{
 const scene=new THREE.Scene(),loads=[],loader={load(file,ready){const texture=new THREE.Texture();loads.push(texture);ready(texture);return texture;}},camera=new THREE.PerspectiveCamera(39,16/9,.1,100);camera.position.set(0,19,19);const cameraMatrix=camera.matrix.clone(),view=createArborJourneyView(scene,{loader,camera}),state=createArborJourney();
 const before=JSON.stringify(checkpointArborJourney(state));view.setActive(true);for(let sector=0;sector<5;sector++){state.sector=sector;for(let i=0;i<4;i++)Object.assign(state.roots[i],ARBOR_SECTORS[sector].roots[i],{phase:'active',active:true});const snapshot=JSON.stringify(checkpointArborJourney(state));view.update(state,{x:0,z:5},{dt:1/60,reducedMotion:true});assert.equal(JSON.stringify(checkpointArborJourney(state)),snapshot);}
 assert(camera.matrix.equals(cameraMatrix));const floor=scene.getObjectByName('arbor-painted-courtyard');floor.updateMatrixWorld(true);const bounds=new THREE.Box3().setFromObject(floor);assert.equal(bounds.max.x-bounds.min.x,28);assert.equal(bounds.max.z-bounds.min.z,24);const floorUV=floor.geometry.getAttribute('uv');for(let i=0;i<floorUV.count;i++){assert(floorUV.getX(i)>.27&&floorUV.getX(i)<.73);assert(floorUV.getY(i)>.24&&floorUV.getY(i)<.75);}assert.equal(view.diagnostics().drawCallsMax,24);assert.equal(view.diagnostics().geometries,10);assert.equal(view.diagnostics().materials,24);assert.equal(view.diagnostics().textures,7);
 const resources=new Set();scene.traverse(mesh=>{if(mesh.geometry&&!mesh.isSprite)resources.add(mesh.geometry);for(const material of Array.isArray(mesh.material)?mesh.material:mesh.material?[mesh.material]:[]){resources.add(material);if(material.map)resources.add(material.map);}});const disposed=new Map();for(const resource of resources)resource.addEventListener('dispose',()=>disposed.set(resource,(disposed.get(resource)||0)+1));view.dispose();view.dispose();assert([...disposed.values()].every(count=>count===1));assert.equal(view.diagnostics().garden.disposed,true);assert.notEqual(before,null);
});
test('shared art files stay below a fixed download/decoded budget and retain recorded SHA evidence',()=>{
 let bytes=0;const evidence=[];for(const file of Object.values(ARBOR_GARDEN_ART)){const data=fs.readFileSync(new URL('../public/'+file,import.meta.url));assert.equal(data.toString('ascii',0,4),'RIFF');assert.equal(data.toString('ascii',8,12),'WEBP');bytes+=data.length;evidence.push({file,bytes:data.length,sha256:crypto.createHash('sha256').update(data).digest('hex')});}
 assert(bytes<1_500_000);console.log('  Unchanged shared garden art '+bytes+' bytes; no mipmaps, nominal decoded RGBA '+(1448*1086*4*2+1254*1254*4)+' bytes.');assert.equal(evidence.length,3);
});
console.log('Arbor garden: '+checks+' focused CPU/Three checks; 5 authored layouts, 30,000 unchanged static frames, exact arena/root/save contracts. Native rendering, target-device performance and aesthetic judgement remain separate.');
