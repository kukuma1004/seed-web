import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import * as THREE from 'three';
import {DECOR} from '../src/garden-decor.js';
import {emptyGarden,SEED_IDS} from '../src/garden.js';
import {seedVisualReviewEnabled} from '../src/seed-visual-language.js';

// Real Three graph and raycasting, mocked image decoding. No rendered-pixel,
// phone frame-rate, battery or native-touch acceptance is implied.
const originalLoad=THREE.TextureLoader.prototype.load,originalDocument=globalThis.document;
THREE.TextureLoader.prototype.load=function(url,onLoad){const t=new THREE.Texture({width:1600,height:900});queueMicrotask(()=>onLoad?.(t));return t;};
globalThis.document={createElement(){return {width:64,height:64,getContext(){return {createRadialGradient(){return {addColorStop(){}};},fillRect(){}};}};}};
const source=await fs.readFile(new URL('../src/garden-scene.js',import.meta.url),'utf8');
const rewritten=source.replaceAll('import.meta.env.BASE_URL',JSON.stringify('/seed/')).replace(/from '(\.\/[^']+)'/g,(_,path)=>`from '${new URL('../src/'+path.slice(2),import.meta.url).href}'`).replace("from 'three'",`from '${import.meta.resolve('three')}'`);
try{
 const {createGardenScene,GARDEN_PLOT_ANCHORS}=await import('data:text/javascript;base64,'+Buffer.from(rewritten).toString('base64'));
 const g=emptyGarden();g.decor=DECOR.map(d=>d.id);g.plots=Array.from({length:6},(_,i)=>({seed:SEED_IDS[i],growth:9,branch:'flower'}));
 const legacy=createGardenScene({visualReview:false}),review=createGardenScene({visualReview:true});await Promise.resolve();
 for(const v of [legacy,review]){v.resize(1280,720);v.setGarden(g,{austinDefeated:true});v.update(.016);}
 const contacts=v=>v.scene.children.filter(c=>Number.isInteger(c.userData.gardenContactLayer));
 assert.equal(contacts(legacy).length,0,'shipping graph gains no contact passes');assert.equal(contacts(review).length,2,'review shares exactly two unlit passes');
 const layers=contacts(review);assert.ok(layers.every(l=>l.count>6&&l.count<=96));assert.equal(layers[0].count,layers[1].count);
 const snapshot=()=>layers.map(l=>[l.count,...l.instanceMatrix.array]);const seated=snapshot();for(let i=0;i<120;i++)review.update(1/60);assert.deepEqual(snapshot(),seated,'steady animation never rebuilds contact transforms');
 for(const anchor of GARDEN_PLOT_ANCHORS){assert.deepEqual(review.pick(anchor.u,anchor.v),legacy.pick(anchor.u,anchor.v),'contacts cannot steal authored plot selection');}
 const before=snapshot();review.setGarden({...g,decorPositions:{restBench:{u:.8,v:.6}}},{austinDefeated:true});assert.notDeepEqual(snapshot(),before,'saved furniture movement reanchors its contact');
 const items=[];review.scene.traverse(o=>{if(o.userData.sharedGardenArt&&o.parent?.userData.anchor&&o.parent?.userData.art)items.push(o);});
 for(const mesh of items)assert.equal(mesh.renderOrder,20+Math.round(mesh.parent.userData.anchor.v*400),'one root depth ordering across decorative objects');
 const resized=snapshot();review.resize(844,390);assert.notDeepEqual(snapshot(),resized,'crop projection changes root contacts with actual scene');
 assert.equal(seedVisualReviewEnabled({hostname:'kukuma1004.github.io',search:'?inspect=1&visual25d=1'}),false);assert.equal(seedVisualReviewEnabled({hostname:'127.0.0.1',search:'?inspect=1&visual25d=1'}),true);
 const css=(await fs.readFile(new URL('../src/seed-visual25d.css',import.meta.url),'utf8')).replace(/\/\*[\s\S]*?\*\//g,'');
 for(const m of css.matchAll(/(?:^|[{}])\s*([^{}]+)\{/g)){if(m[1].trim().startsWith('@media'))continue;for(const selector of m[1].split(/,(?=body)/))assert.ok(selector.trim().startsWith('body.seed-visual25d'),`unscoped CSS ${selector}`);}
 assert.ok(!css.includes('backdrop-filter:blur'),'shared review adds no fullscreen blur');
 console.log(JSON.stringify({ok:true,contactPasses:2,rootAnchors:6,contactCap:96,steadyMatrixRebuilds:0,legacyAddedPasses:0,artAssetsAdded:0,limits:'Three/CPU graphs and CSS gate only; native rendering is checked separately'}));
}finally{THREE.TextureLoader.prototype.load=originalLoad;globalThis.document=originalDocument;}
