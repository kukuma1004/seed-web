import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import {pathToFileURL} from 'node:url';
import * as THREE from 'three';
import {DECOR,decorScene} from '../src/garden-decor.js';
import {DECOR_PROP_ART,DECOR_PROP_CELLS,DECOR_PROP_REGIONS} from '../src/garden-decor-art.js';
import {emptyGarden} from '../src/garden.js';

// Actual Three objects + production Canvas code; image IO alone is mocked.
// This does not establish WebGL FPS, rendered pixels or physical-device quality.
const stats={canvases:0,gradients:0,draws:[]};
function context(canvas){return {canvas,save(){},restore(){},beginPath(){},rect(){},clip(){},fillRect(){},arc(){},ellipse(){},fill(){},translate(){},rotate(){},
 createRadialGradient(){stats.gradients++;return {addColorStop(){}};},
 drawImage(image,...args){if(image.src&&args.length===8)canvas.tile={src:image.src,index:image.src.endsWith(DECOR_PROP_ART)?DECOR_PROP_REGIONS.findIndex((r,i)=>Math.abs(args[0]-(i%4+r[0])*image.naturalWidth/4)<.01&&Math.abs(args[1]-(Math.floor(i/4)+r[1])*image.naturalHeight/3)<.01):Math.round(args[1]/args[3])*4+Math.round(args[0]/args[2])};stats.draws.push({image,args});}};}
const previousDocument=globalThis.document,previousImage=globalThis.Image;
globalThis.document={createElement(tag){assert.equal(tag,'canvas');stats.canvases++;const canvas={width:0,height:0};canvas.getContext=()=>canvas.ctx??=(context(canvas));return canvas;}};
const images=[];
globalThis.Image=class {constructor(){images.push(this);this.complete=false;this.naturalWidth=0;this.naturalHeight=0;}set src(url){this._src=url;this.complete=true;this.naturalWidth=url.includes('sanctuary')?1600:1200;this.naturalHeight=900;queueMicrotask(()=>this.onload?.());}get src(){return this._src;}};
const originalLoad=THREE.TextureLoader.prototype.load,loads=[];
THREE.TextureLoader.prototype.load=function(url,onLoad){const texture=new THREE.Texture({width:1600,height:900});loads.push({url,texture});queueMicrotask(()=>onLoad?.(texture));return texture;};
const sourceModule=async name=>{
 let source=await fs.readFile(new URL('../src/'+name,import.meta.url),'utf8');
 source=source.replaceAll('import.meta.env.BASE_URL',JSON.stringify('/seed/'));
 source=source.replace(/from '(\.\/[^']+)'/g,(_,path)=>`from '${new URL('../src/'+path.slice(2),import.meta.url).href}'`);
 source=source.replace("from 'three'",`from '${import.meta.resolve('three')}'`);
 return import('data:text/javascript;base64,'+Buffer.from(source).toString('base64'));
};
try{
 const {createGardenScene}=await sourceModule('garden-scene.js');
 const garden=emptyGarden();garden.decor=DECOR.map(d=>d.id);
 const view=createGardenScene();await Promise.resolve();view.resize(1280,720);view.setGarden(garden);view.update(.016);
 const atlas=loads.find(l=>l.url.endsWith(DECOR_PROP_ART));assert.ok(atlas,'BASE_URL prop texture requested');
 const propMeshes=()=>{const meshes=[];view.scene.traverse(o=>{if(o.isMesh&&o.material.map===atlas.texture)meshes.push(o);});return meshes;};
 const all=propMeshes();assert.equal(all.length,DECOR_PROP_CELLS,'all twelve furniture cells connected');
 assert.equal(new Set(all.map(o=>o.material)).size,1,'uncolored furniture shares one material');
 const geometryDisposals=[],materialDisposals=[];for(const mesh of all){mesh.geometry.addEventListener('dispose',()=>geometryDisposals.push(mesh));mesh.material.addEventListener('dispose',()=>materialDisposals.push(mesh));mesh.geometry.computeBoundingBox();assert.equal(mesh.geometry.boundingBox.min.y,0);assert.equal(mesh.geometry.boundingBox.max.y,1);assert.equal(mesh.parent.userData.rigid,true);}
 view.setGarden({...garden,decor:[...garden.decor]});assert.deepEqual(propMeshes(),all,'unchanged decor preserves objects');
 view.setGarden({...garden,decorPositions:{restBench:{u:.8,v:.6}}});assert.equal(propMeshes().find(o=>o.parent.userData.anchor.u===.8)?.parent.userData.anchor.v,.6,'3D reanchors the saved moved furniture');assert.equal(propMeshes().length,12);
 view.setGarden({...garden,decor:[]});assert.equal(propMeshes().length,0);assert.equal(geometryDisposals.length,0,'rebuild never disposes shared cell geometry');assert.equal(materialDisposals.length,0,'rebuild never disposes shared atlas material');
 view.setGarden(garden);assert.equal(propMeshes().length,DECOR_PROP_CELLS);assert.equal(loads.filter(l=>l.url.endsWith(DECOR_PROP_ART)).length,1,'rebuild does not reload atlas');
 const ambient=[];view.scene.traverse(o=>{if(o.isInstancedMesh)ambient.push(o.count);});assert.ok(ambient.includes(46),'firefly instance cap holds with extra gardens');

 const {createPuzzleGarden}=await sourceModule('seed-puzzle-garden.js');
 const painter=createPuzzleGarden({base:'/seed/'});await Promise.resolve();assert.ok(painter.ready());
 const canvas={},ctx=context(canvas),rect={x:0,y:0,w:1280,h:720};stats.draws.length=0;
 painter.draw(ctx,rect,garden,0);const initialAllocations=stats.canvases,initialGradients=stats.gradients;
 const propTiles=new Set(stats.draws.filter(d=>d.image.tile?.src.endsWith(DECOR_PROP_ART)).map(d=>d.image.tile.index));assert.equal(propTiles.size,12,'Canvas selects every prop tile');
 const flyStamps=stats.draws.filter(d=>d.args.length===4&&d.image.width===64&&d.image.height===64);assert.equal(flyStamps.length,46+decorScene(garden.decor).items.filter(it=>it.kind==='lantern').length,'46 fireflies + actual lantern lights');
 for(let i=0;i<60;i++)painter.draw(ctx,rect,{...garden,decor:[...garden.decor]},i/60);
 assert.equal(stats.canvases,initialAllocations,'steady render allocates no Canvas tiles or light stamps');assert.equal(stats.gradients,initialGradients,'steady render creates no gradients');
 stats.draws.length=0;const movedLayout=painter.draw(ctx,rect,{...garden,decorPositions:{restBench:{u:.8,v:.6}}},1.1);const movedBench=stats.draws.find(d=>d.image.tile?.src.endsWith(DECOR_PROP_ART)&&d.image.tile.index===0);assert.ok(movedBench);assert.ok(Math.abs(movedBench.args[0]+movedBench.args[2]/2-movedLayout.at(.8,.6)[0])<.01,'Canvas bench root uses saved horizontal placement');assert.ok(Math.abs(movedBench.args[1]+movedBench.args[3]-movedLayout.at(.8,.6)[1])<.01,'Canvas bench root uses saved vertical placement');
 stats.draws.length=0;painter.draw(ctx,rect,{...garden,decor:[]},2);assert.equal(stats.draws.some(d=>d.image.tile?.src.endsWith(DECOR_PROP_ART)),false,'removed decor absent immediately');
 painter.draw(ctx,rect,garden,3);assert.equal(stats.canvases,initialAllocations,'restored decor reuses extracted tiles');
 const props=images.find(im=>im.src.endsWith(DECOR_PROP_ART));props.naturalWidth=0;assert.equal(painter.ready(),false,'missing furniture asset cannot report ready');
 painter.dispose();painter.dispose();assert.equal(painter.ready(),false,'closed painter reports not ready');
 console.log(JSON.stringify({ok:true,propCells:12,sharedMaterial:true,rebuildDisposals:0,steadyCanvasAllocations:0,steadyGradientAllocations:0,ambientCap:46,limits:'Image IO mocked; no WebGL/device/pixel proof'}));
}finally{THREE.TextureLoader.prototype.load=originalLoad;globalThis.document=previousDocument;globalThis.Image=previousImage;}
