import assert from 'node:assert/strict';
import fs from 'node:fs';
import * as THREE from 'three';
import {createExpansionJourneyView} from '../src/expansion-journey-view.js';
import {createExpansionEnvironmentArt} from '../src/expansion-environment-art.js';
import {crosswindUndertowFields} from '../src/crosswind-undertow.js';
import {createExpansionJourney} from '../src/expansion-journey.js';
const scene=new THREE.Scene(),ground=new THREE.Texture(),atlas=new THREE.Texture(),view=createExpansionJourneyView(scene,ground),root=view.root;
const batches=root.children.filter(o=>o.name.startsWith('crosswind-undertow-')),bowl=batches[0],geometry=bowl.geometry,frames=geometry.getAttribute('gardenSandFrame');
assert.equal(frames.count,2);const count=root.children.length,uv=geometry.getAttribute('uv');for(let i=0;i<uv.count;i++){assert(uv.getX(i)>=0&&uv.getX(i)<=1);assert(uv.getY(i)>=0&&uv.getY(i)<=1);}
let disposed=0;atlas.addEventListener('dispose',()=>disposed++);view.setCrosswindSandTexture(atlas);assert.equal(bowl.material.map,atlas);assert.equal(bowl.material.vertexColors,false);assert.equal(bowl.material.opacity,1);
const shader={vertexShader:'#include <common>\n#include <uv_vertex>'};bowl.material.onBeforeCompile(shader);assert(shader.vertexShader.includes('attribute float gardenSandFrame'));assert(shader.vertexShader.includes('vMapUv.x=(vMapUv.x+gardenSandFrame)*.5'));
const course=createExpansionJourney('crosswind',0,413).course;let warning=false,pull=false;
for(let i=0;i<10000;i++){course.time=i/60;const fields=crosswindUndertowFields(course);view.syncUndertow(fields);let index=0;for(const f of fields){if(f.phase==='off')continue;assert.equal(frames.getX(index++),f.phase==='warning'?0:1);warning ||= f.phase==='warning';pull ||= f.phase==='pull';}assert.equal(bowl.count,index);assert.equal(root.children.length,count);assert.equal(bowl.material.map,atlas);assert.equal(bowl.geometry,geometry);}
assert(warning&&pull);assert(batches.slice(1).every(b=>!b.visible),'painted hollow replaces the obsolete flat outline and spiral overlays');view.dispose();view.dispose();assert.equal(disposed,0,'view borrows the cache-owned image');assert.equal(scene.children.length,0);view.setCrosswindSandTexture(new THREE.Texture());assert.equal(disposed,0);
for(const mobile of [false,true]){const urls=[],cache=createExpansionEnvironmentArt({mobile,loader:{async loadAsync(url){urls.push(url);return new THREE.Texture();}}});const a=cache.load('crosswindSand'),b=cache.load('crosswindSand');assert.equal(a,b);const t=await a;assert.equal(urls.length,1);const expected='assets/expansion/act4-sand-depression'+(mobile?'-mobile':'')+'-v2.webp';assert.equal(urls[0],expected);const bytes=fs.readFileSync('public/'+expected);assert.equal(bytes.toString('ascii',8,12),'WEBP');assert(bytes.length<(mobile?65536:250000));let released=0;t.addEventListener('dispose',()=>released++);cache.dispose();cache.dispose();assert.equal(released,1);}
console.log('Sand art PASS: actual phase maps to warning/active UV cell, fixed2 instances through10k real fields, unchanged footprint, one borrowed image, mobile/desktop lazy asset budgets and disposal. GPU shader compile and image appearance are separate native-browser checks.');
