import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import vm from 'node:vm';
import * as THREE from 'three';
import {titleState} from '../src/titles.js';
import {JOURNEY_DUEL_ART} from '../src/journey-duel-art.js';
import {journeyDuelCrop} from '../src/journey-duel-body.js';

const source=readFileSync(new URL('../src/seed-title.js',import.meta.url),'utf8'),css=readFileSync(new URL('../src/seed-title.css',import.meta.url),'utf8');
const factory=source.slice(source.indexOf('export function createSeedTitle(')).replace('export function createSeedTitle(','function createSeedTitle(');
let vectorAllocations=0,layoutReads=0;
class FixedVector extends THREE.Vector3{constructor(...args){super(...args);vectorAllocations++;}}
class Element{
 constructor(){this.styleWrites=0;this.hiddenWrites=0;this.textWrites=0;this._hidden=false;this._text='';this.style=new Proxy({},{set:(o,k,v)=>{this.styleWrites++;o[k]=v;return true;}});}
 set hidden(v){this._hidden=v;this.hiddenWrites++;}get hidden(){return this._hidden;}
 set textContent(v){this._text=v;this.textWrites++;}get textContent(){return this._text;}
 get offsetWidth(){layoutReads++;throw Error('per-frame layout read');}get offsetHeight(){layoutReads++;throw Error('per-frame layout read');}
 get clientWidth(){layoutReads++;throw Error('per-frame layout read');}get clientHeight(){layoutReads++;throw Error('per-frame layout read');}
 getBoundingClientRect(){layoutReads++;throw Error('per-frame layout read');}remove(){this.removed=true;}
}
function harness(state=titleState){
 const elements=[],document={body:{append:e=>elements.push(e)},createElement:()=>new Element()},scope=vm.createContext({THREE:{...THREE,Vector3:FixedVector},titleState:state,document});
 vm.runInContext(factory,scope);return {create:scope.createSeedTitle,elements};
}
const camera=new THREE.OrthographicCamera(-8,8,4.5,-4.5,.1,100);camera.position.set(0,19,19);camera.lookAt(0,0,0);camera.zoom=1.18;camera.updateProjectionMatrix();camera.updateMatrixWorld();
const rect={left:32,top:18,width:1280,height:720},scene=new THREE.Scene(),player=new THREE.Group(),body=new THREE.Group();scene.add(player);player.add(body);player.scale.setScalar(1.25);
const base=new THREE.Sprite(new THREE.SpriteMaterial()),evolution=new THREE.Sprite(new THREE.SpriteMaterial()),duel=new THREE.Sprite(new THREE.SpriteMaterial()),ghost=new THREE.Sprite(new THREE.SpriteMaterial({depthFunc:THREE.GreaterDepth}));
base.center.set(.5,.0625);base.scale.set(1.18,1.18,1);evolution.center.set(.5,.0625);evolution.scale.set(1.22,1.22,1);duel.center.set(.23,.035);duel.scale.set(2.1,2.5,1);ghost.scale.set(100,100,1);body.add(base,evolution,duel,ghost);player.userData.titleSprites=[base,evolution,duel,ghost];evolution.visible=duel.visible=false;
const h=harness(),view=h.create(player,{austin:true}),element=view.root;
function anchor(){const found=/translate3d\(([-\d.]+)px,([-\d.]+)px,0\)/.exec(element.style.transform||'');assert(found,'visible title has a transform anchor');return {x:+found[1],y:+found[2]};}
// Independent world-corner reference to the renderer's billboard surface.
function paintedTop(sprite,cam=camera,viewport=rect){
 sprite.updateWorldMatrix(true,false);const p=sprite.getWorldPosition(new THREE.Vector3()),scale=sprite.getWorldScale(new THREE.Vector3()),q=cam.quaternion,angle=sprite.material.rotation||0;let top=Infinity;
 for(const x of [0,1])for(const y of [0,1]){
  const dx=(x-sprite.center.x)*scale.x,dy=(y-sprite.center.y)*scale.y;
  const point=new THREE.Vector3(dx*Math.cos(angle)-dy*Math.sin(angle),dx*Math.sin(angle)+dy*Math.cos(angle),0).applyQuaternion(q).add(p).project(cam);
  top=Math.min(top,viewport.top+(1-point.y)*viewport.height/2);
 }return top;
}
function assertClear(sprite,viewport=rect,cam=camera){view.update(cam,viewport,true);assert.equal(element.hidden,false);const p=anchor(),top=paintedTop(sprite,cam,viewport);assert(p.y<=top-7.7,'the bottom of the title clears the actual painted top by eight pixels');return p;}
let cases=0;
for(const scale of [.85,1.25,1.75])for(const roll of [-.25,0,.25]){
 player.scale.setScalar(scale);body.rotation.set(.1,0,-.07);base.material.rotation=roll;assertClear(base);cases++;
}
player.scale.setScalar(1.25);body.rotation.set(0,0,0);base.visible=false;evolution.visible=true;const evolved=assertClear(evolution);evolution.visible=false;duel.visible=true;const large=assertClear(duel);assert(large.y<evolved.y,'a tall evolution/duel crop lifts its title without changing the camera');cases+=2;
duel.center.set(.78,.04);duel.material.rotation=.23;assertClear(duel);cases++;
camera.rotateZ(.16);camera.updateMatrixWorld();assertClear(duel);cases++;camera.rotateZ(-.16);camera.updateMatrixWorld();
duel.visible=false;base.visible=true;base.material.rotation=0;body.rotation.set(0,0,0);
const small={left:0,top:0,width:640,height:360};assertClear(base,small);cases++;
const perspective=new THREE.PerspectiveCamera(44,16/9,.1,100);perspective.position.set(0,19,19);perspective.lookAt(0,0,0);perspective.zoom=1.18;perspective.updateProjectionMatrix();perspective.updateMatrixWorld();assertClear(base,rect,perspective);base.visible=false;duel.visible=true;assertClear(duel,rect,perspective);duel.visible=false;base.visible=true;cases+=2;
let authoredCropCases=0;base.visible=false;duel.visible=true;duel.material.rotation=.12;
for(const art of Object.values(JOURNEY_DUEL_ART))for(let pose=0;pose<art.frames.length;pose++)for(const flip of [false,true]){
 const crop=journeyDuelCrop(art,pose,flip);duel.center.set(crop.centerX,crop.foot);duel.scale.set(crop.width,crop.height,1);view.update(perspective,small);const top=paintedTop(duel,perspective,small);
 if(top-8-22>=small.top+8.25){assert(!element.hidden);assert(anchor().y<=top-7.7,'every authored action/mirrored pivot stays below its title');}else assert(element.hidden,'insufficient space for an authored action hides only its cosmetic title');authoredCropCases++;
}
duel.visible=false;base.visible=true;
player.position.x=-7;view.update(camera,small);assert(!element.hidden);assert(anchor().x>=8,'near-left titles stay within the canvas');player.position.x=7;view.update(camera,small);assert(!element.hidden);assert(anchor().x<=small.width-8,'near-right titles stay within the canvas');player.position.x=0;cases+=2;
player.position.z=-7;view.update(camera,small);assert(element.hidden,'insufficient top clearance hides the cosmetic title instead of covering the seed');player.position.z=0;
for(const bad of [{...small,width:0},{...small,height:NaN},{...small,left:Infinity}]){view.update(camera,bad);assert(element.hidden);}
view.update(camera,small,false);assert(element.hidden);player.visible=false;view.update(camera,small);assert(element.hidden);player.visible=true;
body.visible=false;view.update(camera,small);assert(element.hidden,'hidden body ancestry cannot leave a floating title');body.visible=true;
// Stable poses do not rewrite DOM styles or allocate projection vectors.
view.update(camera,small);const writes=element.styleWrites,hiddenWrites=element.hiddenWrites,vectors=vectorAllocations,textWrites=element.textWrites;
for(let i=0;i<6000;i++)view.update(camera,small);
assert.equal(element.styleWrites,writes);assert.equal(element.hiddenWrites,hiddenWrites);assert.equal(element.textWrites,textWrites);assert.equal(vectorAllocations,vectors);assert.equal(layoutReads,0);
const stationaryVectorAllocations=vectorAllocations-vectors;
view.setDiscovered(153,162);assert.equal(view.state().shown,titleState({austin:true,discovered:153,total:162}).shown);assert.equal(element.textWrites,textWrites,'stat-only title updates keep unchanged DOM text');
// Long future/custom localised names truncate inside a bounded screen width.
const long=harness(()=>({shown:'거목의 정원을 끝까지 지켜낸 오래도록 기억될 씨앗의 수호자'.repeat(3)})).create(player,{});player.position.x=-7;long.update(camera,small);assert(!long.root.hidden);const longAnchor=/translate3d\(([-\d.]+)px,([-\d.]+)px/.exec(long.root.style.transform);assert.equal(long.root.style.maxWidth,'220px');assert(+longAnchor[1]>=118,'a longest-width label cannot extend beyond the left safe inset');player.position.x=7;long.update(camera,small);assert(+/translate3d\(([-\d.]+)px/.exec(long.root.style.transform)[1]<=522);player.position.x=0;long.dispose();
assert(css.includes('overflow:hidden')&&css.includes('text-overflow:ellipsis')&&css.includes('height:22px'),'actual stylesheet bounds long names and makes height deterministic');assert(!/requestAnimationFrame|setInterval|setTimeout/.test(factory),'title does not add a second loop/timer');
view.dispose();view.dispose();assert(element.hidden&&element.removed);const disposedWrites=element.styleWrites;view.update(camera,rect);assert.equal(element.styleWrites,disposedWrites);assert.equal(layoutReads,0);
console.log(JSON.stringify({test:'Seed title actual billboard clearance',projectionCases:cases,authoredCropCases,stationaryFrames:6000,perFrameLayoutReads:layoutReads,perFrameVectorAllocations:stationaryVectorAllocations,stationaryStyleWrites:element.styleWrites-writes,clearancePx:8,ghostsExcluded:true,longNames:'ellipsis and canvas-safe clamp',boundary:'hide when no space above art',claim:'actual Three projection + authored crop metadata + fake DOM; native pixels/device typography separately verified'}));
