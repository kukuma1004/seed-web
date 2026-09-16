import assert from 'node:assert/strict';
import * as THREE from 'three';
import {THEME_KEY,THEME_ORDER,THEMES,normalizeTheme,readTheme,writeTheme,nextTheme,themeColor} from '../src/themes.js';
import {createVFX} from '../src/vfx.js';
import {activeColors,createActiveVFX} from '../src/active-vfx.js';

assert.deepEqual(THEME_ORDER,['botanical','void','cyber','celestial']);
assert.equal(new Set(THEME_ORDER.map(id=>THEMES[id].motion)).size,4,'every prototype needs a distinct motion language');
assert.equal(normalizeTheme('missing'),'botanical');
assert.equal(nextTheme('celestial'),'botanical');
assert.equal(themeColor('botanical','seed',0x123456),0x123456);
assert.notEqual(themeColor('void','seed',0x123456),0x123456);

const memory=new Map(),storage={getItem:key=>memory.get(key)??null,setItem:(key,value)=>memory.set(key,value)};
assert.equal(readTheme(storage),'botanical');assert.equal(writeTheme(storage,'cyber'),true);
assert.equal(memory.get(THEME_KEY),'cyber');assert.equal(readTheme(storage),'cyber');

const poses=new Set();
for(const theme of THEME_ORDER){
 const scene=new THREE.Scene(),fx=createVFX(scene,{theme,random:()=>.3});
 fx.burst(new THREE.Vector3(),'seed',12,1);fx.portal(new THREE.Vector3(),new THREE.Vector3(2,0,0));fx.update(.05);
 const root=scene.getObjectByName('seed-vfx'),matrix=new THREE.Matrix4();root.children[0].getMatrixAt(0,matrix);
 poses.add(matrix.elements.slice(12,15).map(v=>v.toFixed(3)).join('|'));
 assert.equal(fx.state().theme,theme);assert.equal(fx.state().batches,4);assert.ok(fx.state().active<=fx.state().capacity);
 fx.dispose();
}
assert.equal(poses.size,4,'theme particles need visibly different procedural motion without extra batches');

const colorProfiles=new Set();
for(const theme of THEME_ORDER){
 const scene=new THREE.Scene(),fx=createActiveVFX(scene,{theme});
 fx.start({state:'OVERDRIVE',forms:['collapse','prism'],archetype:'BLACKHOLE',seconds:2},new THREE.Vector3());fx.update(.1,new THREE.Vector3());
 assert.equal(fx.state().theme,theme);assert.equal(fx.state().drawCalls,5);
 colorProfiles.add(activeColors(['collapse','prism'],theme).join('|'));
 fx.dispose();
}
assert.equal(colorProfiles.size,4,'ultimate palettes need four distinct identities');
console.log('Four free combat themes preserve fixed GPU batches while changing storage, palette and procedural motion.');
