import assert from 'node:assert/strict';
import * as THREE from 'three';
import {createExpansionJourneyView} from '../src/expansion-journey-view.js';

const scene=new THREE.Scene(),ground=new THREE.Texture(),art=new THREE.Texture({width:1536,height:864}),canyon=new THREE.Texture(),view=createExpansionJourneyView(scene,ground);
const plate=view.root.getObjectByName('expansion-environment-plate'),curbs=view.root.getObjectByName('crosswind-beveled-boundary'),seams=view.root.getObjectByName('crosswind-inset-copper-seams'),ivy=view.root.getObjectByName('crosswind-boundary-ivy');
const borrowed={repeat:art.repeat.toArray(),wrapS:art.wrapS,offset:art.offset.toArray()},matrix=new THREE.Matrix4(),position=new THREE.Vector3();let sourceDisposals=0,ownedDisposals=0;
art.addEventListener('dispose',()=>sourceDisposals++);ground.addEventListener('dispose',()=>sourceDisposals++);canyon.addEventListener('dispose',()=>sourceDisposals++);
view.setPlate('crosswind',art);const sampler=plate.material.map;sampler.addEventListener('dispose',()=>ownedDisposals++);
assert.notEqual(sampler,art);assert.equal(sampler.wrapS,THREE.MirroredRepeatWrapping);assert.equal(sampler.wrapT,THREE.ClampToEdgeWrapping);
assert(Math.abs(sampler.repeat.x-228/(32.2*(16/9)))<1e-10,'painted trees keep image aspect at world size');assert.equal(sampler.repeat.y,1);
assert.deepEqual({repeat:art.repeat.toArray(),wrapS:art.wrapS,offset:art.offset.toArray()},borrowed,'no mutation of cache sampling');
view.setPlate('crosswind',art);assert.equal(plate.material.map,sampler,'reentry preserves single owned sampler');
view.setCourse('crosswind',{halfDepth:5.4});assert.deepEqual(plate.scale.toArray(),[228,32.2,1]);assert.equal(curbs.count,72);assert.equal(seams.count,72);assert.equal(ivy.count,108);
const resources=[curbs.geometry,curbs.material,seams.geometry,seams.material,ivy.geometry,ivy.material],objectCount=view.root.children.length;
for(let i=0;i<curbs.count;i++){curbs.getMatrixAt(i,matrix);position.setFromMatrixPosition(matrix);assert(Math.abs(position.z)>5.4,'scenery clears real movement bounds');assert(Math.abs(position.z)<5.8);}
for(let frame=0;frame<500;frame++)view.beginFrame();assert.equal(view.root.children.length,objectCount);assert.deepEqual([curbs.geometry,curbs.material,seams.geometry,seams.material,ivy.geometry,ivy.material],resources,'no per-frame scenery resources');
view.setTerrainOnly(true);assert.equal(plate.visible,false);for(const o of [curbs,seams,ivy])assert.equal(o.visible,false,'Survival terrain bridge excludes decorative borders');
view.setTerrainOnly(false);for(const o of [curbs,seams,ivy])assert.equal(o.visible,false,'painted stone walls replace the fallback bars');
view.setPlate('crosswind',null);for(const o of [curbs,seams,ivy])assert.equal(o.visible,true,'missing panorama still has visible movement boundaries');
view.setPlate('crosswind',art);
view.setPlate('crystalGorge',canyon);view.setCourse('crystalGorge',{plateBounds:{width:20,depth:17}});assert.equal(plate.material.map,canyon);assert.deepEqual(plate.scale.toArray(),[20,17,1]);for(const o of [curbs,seams,ivy])assert.equal(o.visible,false,'Act5 uses unchanged authored compact plate');
view.setCourse('crosswind');curbs.getMatrixAt(0,matrix);position.setFromMatrixPosition(matrix);assert(Math.abs(Math.abs(position.z)-7.31)<1e-5,'legacy corridor scenery adapts without changing collider width');
let freed=0;for(const r of resources)r.addEventListener('dispose',()=>freed++);view.dispose();view.dispose();assert.equal(freed,resources.length);assert.equal(sourceDisposals,0);assert.equal(ownedDisposals,1);assert.equal(scene.children.length,0);
console.log('Crosswind world presentation PASS: source-aspect mirrored panorama, three fixed authored border batches, unchanged bounds, no frame allocations, Survival/Act5 isolation, borrowed texture ownership. CPU scene validation, not live visual/device acceptance.');
