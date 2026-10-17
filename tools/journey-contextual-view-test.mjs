import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import * as THREE from 'three';
import {createMirrorPanels,MIRROR_PANELS} from '../src/mirror-fighter.js';
import {createCrystalSiegeView,CRYSTAL_SIEGE_PRESENTATION} from '../src/crystal-siege-view.js';
import {createExpansionJourneyView} from '../src/expansion-journey-view.js';
import {createCrystalSiege,buildCrystalSiege,startCrystalSiegeDefense} from '../src/crystal-siege-rules.js';

// Small DOM adapter only for this view's normal buttons; game rules and Three
// objects below are the shipping modules, not reimplemented fixture behavior.
class Element{
 constructor(tag='div'){this.tagName=tag;this.children=[];this.dataset={};this.attrs={};this.style={};this.hidden=false;this.disabled=false;this.textContent='';}
 append(...nodes){for(const n of nodes){n.parent=this;this.children.push(n);}}
 remove(){if(this.parent)this.parent.children=this.parent.children.filter(n=>n!==this);}
 setAttribute(k,v){this.attrs[k]=String(v);if(k==='hidden')this.hidden=true;if(k.startsWith('data-'))this.dataset[k.slice(5)]=v;}
 blur(){this.blurred=true;}
 set innerHTML(html){this.html=html;this.children=[];const stack=[this];for(const token of html.match(/<[^>]*>|[^<]+/g)||[]){if(token.startsWith('</')){stack.pop();continue;}if(!token.startsWith('<')){stack.at(-1).textContent+=token;continue;}const tag=token.match(/^<([\w-]+)/)?.[1];if(!tag)continue;const node=new Element(tag);for(const attr of token.matchAll(/([\w-]+)(?:="([^"]*)")?/g)){if(attr[1]!==tag)node.setAttribute(attr[1],attr[2]??'');}stack.at(-1).append(node);if(!token.endsWith('/>'))stack.push(node);}}
 querySelectorAll(selector){const all=[];for(const n of this.children){if(selector.startsWith('[')?Object.hasOwn(n.attrs,selector.slice(1,-1)):n.tagName===selector)all.push(n);all.push(...n.querySelectorAll(selector));}return all;}
 querySelector(selector){return this.querySelectorAll(selector)[0]||null;}
}
const body=new Element(),oldDocument=globalThis.document;
globalThis.document={body,createElement:tag=>new Element(tag)};
try{
 const scene=new THREE.Scene(),state=createCrystalSiege(),player={x:0,z:0},calls=[],textures=[];
 const loader={load(){const t=new THREE.Texture();textures.push(t);return t;}};
 const view=createCrystalSiegeView(scene,loader,'/seed-web/',{onBuild:(id,kind)=>{calls.push(buildCrystalSiege(state,id,kind,player));},onStart:()=>calls.push(startCrystalSiegeDefense(state))});
 const menu=body.children.find(n=>n.id==='crystal-siege-build'),context=menu.querySelector('[data-context]'),start=menu.querySelector('[data-start]'),choices=menu.querySelector('[data-choices]'),buttons=menu.querySelectorAll('[data-kind]');
 const update=(options={})=>view.update(state,player,{visible:true,interactive:true,...options});
 update();assert.equal(context.hidden,true);assert.equal(choices.hidden,true);assert.equal(menu.hidden,false,'far from pads only start is exposed');
 Object.assign(player,{x:-3,z:-2.5});update();assert.equal(context.hidden,false);assert.equal(context.textContent,'이 화단에 심기');assert.equal(choices.hidden,true);
 context.onclick();assert.equal(choices.hidden,false);assert.equal(view.preparationHeld(),true);update();assert(body.children.find(n=>n.id==='crystal-siege-ui').html.includes('준비 시간 멈춤'));buttons[0].onclick();assert.equal(view.preparationHeld(),false);update();assert.equal(calls.at(-1).ok,true);assert.equal(state.resources,0);assert.equal(state.pads[0].kind,'turret');assert.equal(choices.hidden,true);assert(context.textContent.includes('강화'));assert.equal(context.disabled,true,'cannot upgrade without paid resources');
 const facility=scene.getObjectByName('crystal-siege-facility-0'),worldCount=scene.children[0].children.length,paidState=JSON.stringify(state.pads);
 const settledSize=()=>CRYSTAL_SIEGE_PRESENTATION.facility+(state.pads[0].kind==='turret'?Math.max(0,state.pads[0].level-1)*CRYSTAL_SIEGE_PRESENTATION.levelStep:0);
 update({dt:.08});assert(facility.scale.x>settledSize(),'paid planting produces a short sprite settle cue above its actual presentation size');
 for(let i=0;i<5;i++)update({dt:.1});assert.equal(facility.scale.x,settledSize());assert.equal(facility.scale.y,settledSize());assert.equal(scene.children[0].children.length,worldCount);assert.equal(JSON.stringify(state.pads),paidState,'presentation changes neither facility combat nor object budget');
 state.resources=3;update();context.onclick();update();assert.equal(state.pads[0].level,2);assert(context.textContent.includes('심장 우선'));assert.equal(context.disabled,true);
 update({dt:.08});assert(facility.scale.x>settledSize(),'paid upgrade settles around its level-specific size');for(let i=0;i<5;i++)update({dt:.1});assert.equal(facility.scale.x,settledSize());
 state.pads[0].hp=0;state.resources=3;update();assert(context.textContent.includes('다시 심기'));context.onclick();update();assert.equal(state.pads[0].level,2);assert(state.pads[0].hp>0,'normal rule retains paid level on rebuild');
 Object.assign(player,{x:3,z:2.5});state.resources=2;update();context.onclick();assert.equal(buttons[0].disabled,true);assert.equal(buttons[1].disabled,false);const count=calls.length;buttons[0].onclick();assert.equal(calls.length,count,'disabled actions emit no build intent');
 update({interactive:false});assert.equal(menu.hidden,true);assert.equal(choices.hidden,true);assert.equal(view.preparationHeld(),false);context.onclick();start.onclick();assert.equal(calls.length,count,'stale paused controls emit no intent');
 update();context.onclick();Object.assign(player,{x:0,z:0});update();assert.equal(choices.hidden,true,'walking away closes the stale pad choice');assert.equal(context.hidden,true);
 start.onclick();update();assert.equal(state.phase,'defense');assert.equal(menu.hidden,true,'combat has no build controls');
 view.hide();assert.equal(menu.hidden,true);let freed=0;for(const t of textures)t.addEventListener('dispose',()=>freed++);view.dispose();view.dispose();assert.equal(freed,textures.length);assert.equal(body.children.length,0);assert.equal(scene.children.length,0);update();assert.equal(scene.children.length,0);
}finally{globalThis.document=oldDocument;}

const scene=new THREE.Scene(),shared=new THREE.Texture(),tile=new THREE.Texture(),view=createExpansionJourneyView(scene,shared),sourceRepeat=tile.repeat.toArray();let borrowedDisposed=0;tile.addEventListener('dispose',()=>borrowedDisposed++);
const road=view.root.getObjectByName('crosswind-painted-corridor-floor');view.setCrosswindFloorTexture(tile);assert.equal(road.visible,true);assert.notEqual(road.material.map,tile);assert.deepEqual(tile.repeat.toArray(),sourceRepeat);assert.deepEqual(road.material.map.repeat.toArray(),[57,14/4]);assert.equal(road.material.map.wrapS,THREE.RepeatWrapping);const sampler=road.material.map;view.setCrosswindFloorTexture(tile);assert.equal(road.material.map,sampler,'reentry does not multiply texture clones');
view.setTerrainOnly(true);assert.equal(road.visible,false);view.setTerrainOnly(false);assert.equal(road.visible,true);view.setCourse('crystalGorge');assert.equal(road.visible,false);view.setCourse('crosswind');assert.equal(road.visible,true);
const panels=[{x:1,z:2,w:.8,d:2.8},{x:8,z:-2,w:.8,d:2.8}],before=JSON.stringify(panels),marks=view.root.getObjectByName('crosswind-reflector-contact-marks');view.syncReflectors(panels);view.setReflectorsActive(true);assert.equal(marks.count,8);assert.equal(marks.visible,true);assert.equal(JSON.stringify(panels),before,'decals never mutate collider state');view.setReflectorsActive(false);assert.equal(marks.visible,false);view.setCourse('crystalGorge');assert.equal(marks.count,0);assert.equal(marks.visible,false);
let samplerDisposed=0;sampler.addEventListener('dispose',()=>samplerDisposed++);view.dispose();view.dispose();assert.equal(borrowedDisposed,0);assert.equal(samplerDisposed,1);assert.equal(scene.children.length,0);
const css=readFileSync(new URL('../src/journey.css',import.meta.url),'utf8');assert(css.includes('min-height:44px'));assert(css.includes('safe-area-inset-bottom'));assert(css.includes('button:focus-visible'));
console.log('Contextual siege shipping views passed: normal paid build/upgrade/rebuild, disabled/paused/away controls, combat clearing, owned disposal; stone sampler ownership, terrain isolation, bounded collider-matching reflector marks. CPU DOM adapter checks, not live browser/device acceptance.');

const mirrorScene=new THREE.Scene(),mirrors=createMirrorPanels(mirrorScene),pane=new THREE.Matrix4(),pBefore=JSON.stringify(panels),geometries=[...mirrors.geometries],materials=[...mirrors.materials];
mirrors.setPanels(panels,{lowProfile:true});mirrors.mesh.getMatrixAt(0,pane);
assert(Math.abs(new THREE.Vector3().setFromMatrixScale(pane).y-.7)<1e-6);
assert.equal(mirrors.mesh.material.side,THREE.FrontSide);assert.equal(JSON.stringify(panels),pBefore);
assert.equal(mirrorScene.children.length,2);assert.deepEqual(mirrors.geometries,geometries);assert.deepEqual(mirrors.materials,materials);
mirrors.setPanels();mirrors.mesh.getMatrixAt(0,pane);
assert(Math.abs(new THREE.Vector3().setFromMatrixScale(pane).y-1.55)<1e-6);assert.equal(mirrors.mesh.count,MIRROR_PANELS.length);assert.equal(mirrors.mesh.material.color.getHex(),0x9cdef0);assert.equal(mirrors.mesh.material.side,THREE.DoubleSide);
for(const x of [...geometries,...materials])x.dispose();mirrorScene.clear();
console.log('Crosswind short-pane presentation: fixed two batches, untouched colliders, Tower appearance restored PASS.');
