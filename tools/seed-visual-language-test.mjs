import assert from 'node:assert/strict';
import vm from 'node:vm';
import {readFileSync} from 'node:fs';
import * as THREE from 'three';
import {SEED_VISUAL_LANGUAGE as DNA,seedVisualEnabled,seedVisualReviewEnabled,paintSeedContact,projectSeedDirection,createSeedShotPresentation} from '../src/seed-visual-language.js';
import {applySpriteLighting,SPRITE_LIGHTING_VERSION} from '../src/sprite-lighting.js';
import {createContactShadows} from '../src/contact-shadows.js';

for(const hostname of ['kukuma1004.github.io','example.com','127.0.0.1.evil.test'])assert.equal(seedVisualReviewEnabled({hostname,search:'?inspect=1&visual25d=1'}),false);
for(const search of ['', '?visual25d=1','?inspect=1','?inspect=0&visual25d=1','?inspect=1&visual25d=0'])assert.equal(seedVisualReviewEnabled({hostname:'127.0.0.1',search}),false);
for(const hostname of ['localhost','127.0.0.1','[::1]','::1'])assert.equal(seedVisualReviewEnabled({hostname,search:'?inspect=1&visual25d=1'}),true);
for(const hostname of ['kukuma1004.github.io','localhost','127.0.0.1','example.com'])assert.equal(seedVisualEnabled({hostname,search:''}),true,'approved styling is on for normal web/native clients');
assert.equal(seedVisualEnabled({hostname:'localhost',search:'?inspect=1&visual25d=0'}),false,'local baseline comparison only');
assert.equal(seedVisualEnabled({hostname:'kukuma1004.github.io',search:'?inspect=1&visual25d=0'}),true,'public query cannot disable approved visuals');
assert.equal(seedVisualEnabled(null),false,'renderless legacy mocks remain explicit');
assert.equal(Object.keys(DNA.laws).length,9);
const source=readFileSync(new URL('../src/seed-adventure-view.js',import.meta.url),'utf8');
const pointLine=source.split('\n').find(l=>l.trimStart().startsWith('function point('));
const begin=source.indexOf(' const explicit='),end=source.indexOf(' stepAdventure(s,dt,',begin);
assert.ok(begin>=0&&end>begin);
// Use the actual view's forward projection and actual mouse inverse, not copies.
for(const depthScale of [1,DNA.depthScale])for(const scale of [30,62.6])for(const origin of [[0,0],[-735,402]]){
 const c=vm.createContext({ox:origin[0],oy:origin[1],scale,depthScale,s:{player:{x:5,y:8}},aim:{x:0,y:0},aimDragged:false,mouseHeld:true,mouse:null,moving:false,pointerAttack:false,keys:new Set()});
 vm.runInContext(pointLine+'\nfunction applyAim(){'+source.slice(begin,end)+'}\nglobalThis.probe={point,applyAim};',c);
 for(const [dx,dy] of [[3,0],[0,-3],[-3,2],[1,4],[-4,-1]]){
  c.mouse=c.probe.point(5+dx,8+dy);c.probe.applyAim();
  assert.ok(Math.abs(c.aim.x-dx)<1e-10&&Math.abs(c.aim.y-dy)<1e-10,'actual mouse aim inverts depth at all camera origins');
  const screenAngle=Math.atan2(c.mouse.y-c.probe.point(5,8).y,c.mouse.x-c.probe.point(5,8).x);
  assert.ok(Math.abs(projectSeedDirection(c.aim.x,c.aim.y,depthScale)-screenAngle)<1e-10);
 }
}
let alpha=.6,stack=[],ellipses=0;
const ctx={get globalAlpha(){return alpha;},set globalAlpha(v){alpha=v;},save(){stack.push(alpha);},restore(){alpha=stack.pop();},beginPath(){},ellipse(){ellipses++;},fill(){}};
paintSeedContact(ctx,10,20,30);assert.equal(ellipses,2);assert.equal(alpha,.6);assert.equal(stack.length,0);
paintSeedContact(ctx,NaN,20,30);assert.equal(ellipses,2);
globalThis.location={hostname:'127.0.0.1',search:'?inspect=1&visual25d=1'};
const mat=applySpriteLighting(new THREE.SpriteMaterial(),{atlasGrid:[4,3]});
const shader={fragmentShader:'#include <common>\n#include <map_fragment>'};mat.onBeforeCompile(shader);
assert.deepEqual(shader.uniforms.seedLightGrid.value.toArray(),[4,3]);
assert.ok(shader.fragmentShader.includes('fract(vMapUv*seedLightGrid)'),'shade is local to each authored atlas cell');
assert.equal(mat.customProgramCacheKey(),SPRITE_LIGHTING_VERSION+':garden-depth-v1');
const scene=new THREE.Scene(),shadow=createContactShadows(scene,3),actor=new THREE.Group();
assert.equal(shadow.drawCalls,1);assert.equal(shadow.update(actor,[]),1);
assert.equal(shadow.mesh.geometry.type,'PlaneGeometry');
const shadowShader={vertexShader:'#include <common>\n#include <uv_vertex>',fragmentShader:'#include <common>\n#include <color_fragment>'};
shadow.mesh.material.onBeforeCompile(shadowShader);assert.ok(shadowShader.fragmentShader.includes('smoothstep(.12,1.,seedContactR)'));
shadow.dispose();assert.equal(scene.children.length,0);delete globalThis.location;
for(const hz of [20,60,120]){
 const shot=createSeedShotPresentation({enabled:true});shot.pulse();assert.equal(shot.value(),1);
 for(let t=0;t<.1-1e-9;t+=1/hz)shot.step(1/hz);
 assert.ok(Math.abs(shot.value()-.375)<1e-9,'shot kick uses simulation dt, not frame count');
 shot.step(10);assert.equal(shot.value(),0);shot.pulse();shot.reset();assert.equal(shot.value(),0);
}
const off=createSeedShotPresentation();off.pulse();off.step(0);assert.equal(off.value(),0);
const reduced=createSeedShotPresentation({enabled:true,reducedMotion:true});reduced.pulse();assert.equal(reduced.value(),.25);
console.log('PASS visual review origin gates, actual Adventure mouse/ground projection, nine-law palette, two bounded contact layers, cell-local sprite shader and one disposed shadow batch. CPU/render contracts; no device performance claim.');
