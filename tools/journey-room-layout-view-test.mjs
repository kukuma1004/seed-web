import assert from 'node:assert/strict';
import * as THREE from 'three';
import {journeyRoomLayout} from '../src/journey-room-layouts.js';
import {createJourneyRoomLayoutView} from '../src/journey-room-layout-view.js';

const scene=new THREE.Scene(),existingGeometry=new THREE.BoxGeometry(),existingMaterial=new THREE.MeshBasicMaterial(),existing=new THREE.Mesh(existingGeometry,existingMaterial);scene.add(existing);
let sharedDisposals=0;existingGeometry.addEventListener('dispose',()=>sharedDisposals++);existingMaterial.addEventListener('dispose',()=>sharedDisposals++);
const view=createJourneyRoomLayoutView(scene),root=scene.getObjectByName('journey-room-layout');assert(root&&!root.visible);assert.equal(root.children.length,6);
assert(!root.children.some(o=>o.isLight||o.isSprite||o.material.map));
const geometries=new Set(root.children.map(o=>o.geometry)),materials=new Set(root.children.map(o=>o.material)),batches=[...root.children],matrixAttributes=batches.map(b=>b.instanceMatrix);
let geometryDisposals=0,materialDisposals=0,batchDisposals=0;for(const g of geometries)g.addEventListener('dispose',()=>geometryDisposals++);for(const m of materials)m.addEventListener('dispose',()=>materialDisposals++);for(const b of batches)b.addEventListener('dispose',()=>batchDisposals++);
const matrix=new THREE.Matrix4(),position=new THREE.Vector3(),scale=new THREE.Vector3(),rotation=new THREE.Quaternion();let inspected=0,maxCalls=0,maxInstances=0;
for(let i=0;i<1500;i++){
 const layout=journeyRoomLayout(3+i%3,i,i*7),x=i%3===1?11:0,z=i%3===1?-1:0,snapshot=JSON.stringify(layout);
 assert(view.setLayout(layout,{x,z}));const state=view.diagnostics();maxCalls=Math.max(maxCalls,state.drawCalls);maxInstances=Math.max(maxInstances,state.instances);
 assert.equal(JSON.stringify(layout),snapshot,'the renderer cannot mutate collision or save data');assert.equal(state.coverCount,4);assert.equal(state.decorCount,layout.decor.length);assert(state.drawCalls<=6&&state.geometries===5&&state.materials===4&&state.textures===0&&state.lights===0);assert(state.coverCount+state.decorCount<=16);
 const stone=root.getObjectByName('journey-low-stone');assert.equal(stone.count,layout.cover.length);
 for(let n=0;n<stone.count;n++){
  const cover=layout.cover[n];stone.getMatrixAt(n,matrix);matrix.decompose(position,rotation,scale);assert(Math.abs(position.x-cover.x-x)<1e-5&&Math.abs(position.z-cover.z-z)<1e-5);assert(Math.abs(scale.x-cover.w)<1e-5&&Math.abs(scale.z-cover.d)<1e-5,'visible body matches actual collision footprint');assert(scale.y>=.35-1e-6&&scale.y<=.58+1e-6,'cover stays below the seed silhouette');assert(Math.abs(rotation.x)+Math.abs(rotation.y)+Math.abs(rotation.z)<1e-8,'rectangular colliders do not hide a rotated visual slab');inspected++;
 }
 for(let j=0;j<batches.length;j++){assert.equal(batches[j],root.children[j]);assert.equal(batches[j].instanceMatrix,matrixAttributes[j],'stage changes retain fixed matrix storage');assert(batches[j].count<=batches[j].instanceMatrix.count);}
 assert.equal(root.children.length,6);assert.equal(new Set(root.children.map(o=>o.geometry)).size,geometries.size);assert.equal(new Set(root.children.map(o=>o.material)).size,materials.size);
}
view.hide();assert(!root.visible);assert.equal(view.diagnostics().drawCalls,0);view.setLayout(journeyRoomLayout(3));assert(!root.visible,'changing layout does not wake a hidden mode');view.setActive(true);assert(root.visible);
assert.equal(view.setLayout(null),false);assert(!root.visible);assert(root.children.every(b=>b.count===0));view.setLayout(journeyRoomLayout(5),{x:NaN,z:Infinity});assert.deepEqual(view.diagnostics().offset,{x:0,z:0});
view.setLayout({name:'malformed bounds',cover:[{x:NaN,z:0,w:1,d:1},null],decor:[null,{x:NaN,z:0}]});assert(!root.visible,'invalid footprint never leaves stale scenery');
view.setLayout({name:'bounded packets',cover:Array.from({length:100},(_,i)=>({x:i,z:0,w:1,d:1,h:1,kind:'ruin'})),decor:Array.from({length:100},(_,i)=>({x:i,z:3,kind:'tile-band'}))});assert.equal(view.diagnostics().coverCount,6);assert.equal(view.diagnostics().decorCount,10);assert(view.diagnostics().drawCalls<=6);
view.dispose();view.dispose();assert.equal(scene.getObjectByName('journey-room-layout'),undefined);assert(scene.children.includes(existing));assert.equal(geometryDisposals,5);assert.equal(materialDisposals,4);assert.equal(batchDisposals,6);assert.equal(sharedDisposals,0,'only renderer-owned resources are disposed');assert.equal(view.setLayout(journeyRoomLayout(3)),false);view.setActive(true);assert.equal(view.diagnostics().drawCalls,0);assert.equal(view.diagnostics().geometries,0);
const low=createJourneyRoomLayoutView(scene,{lowQuality:true});low.setLayout(journeyRoomLayout(3));const lowState=low.diagnostics();assert(lowState.drawCalls<=6&&lowState.instances<maxInstances);low.dispose();assert.equal(scene.children.length,1);
console.log(JSON.stringify({test:'Journey native room scenery actual Three scene',layoutChanges:1500,exactCoverChecks:inspected,maxCalls,maxInstances,geometries:5,materials:4,lights:0,textures:0,disposal:'owned resources once; existing scene preserved',claim:'scene/render structure only; browser pixels measured separately'}));
