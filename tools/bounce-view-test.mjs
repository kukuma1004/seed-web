import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import vm from 'node:vm';
import {createFramePacer} from '../src/frame-time.js';
import * as rules from '../src/seed-bounce-rules.js';
import {createBounceFeedback,drawBounceEffect} from '../src/bounce-feedback.js';

// Execute the shipping view/controller with real rules and a bounded DOM/Canvas mock.
// This verifies ownership and intents, not live visual quality or physical touch.
class Target{
 constructor(){this.events=new Map();}
 addEventListener(name,fn){if(!this.events.has(name))this.events.set(name,new Set());this.events.get(name).add(fn);}
 removeEventListener(name,fn){this.events.get(name)?.delete(fn);}
 emit(name,event={}){for(const fn of this.events.get(name)||[])fn({preventDefault(){},...event});}
}
function environment(){
 let draws=0;const ctx=new Proxy({},{get:(object,key)=>key==='measureText'?()=>({width:20}):object[key]??(()=>{draws++;}),set:(object,key,value)=>(object[key]=value,true)});
 class Node extends Target{
  constructor(tag='div'){super();this.tag=tag;this.children=[];this.nodes=new Map();this.hidden=false;this.disabled=false;this.dataset={};this.style={setProperty(){}};this.classList={add(){},remove(){},toggle(){}};}
  set innerHTML(value){this.html=value;this.nodes.clear();this.children=[];for(const match of value.matchAll(/<(button|canvas|div|p|span|header|footer|article)\b([^>]*)>/g)){const node=new Node(match[1]),attrs=match[2];for(const a of attrs.matchAll(/([\w-]+)="([^"]*)"/g)){if(a[1]==='class')for(const name of a[2].split(' '))this.nodes.set('.'+name,node);if(a[1].startsWith('data-'))node.dataset[a[1].slice(5)]=a[2];}node.disabled=/\bdisabled\b/.test(attrs);this.children.push(node);if(!this.nodes.has(match[1]))this.nodes.set(match[1],node);}}
  get innerHTML(){return this.html||'';}
  querySelector(selector){return this.nodes.get(selector)||this.children.map(node=>node.querySelector(selector)).find(Boolean)||null;}
  querySelectorAll(selector){const name=/\[data-(.+)\]/.exec(selector)?.[1];return name?[...new Set([...this.children.filter(n=>n.dataset[name]!==undefined),...this.children.flatMap(n=>n.querySelectorAll(selector))])]:[];}
  getContext(){return ctx;}
  getBoundingClientRect(){return {width:1280,height:720,left:0,top:0};}
  append(node){this.last=node;}
  setAttribute(){}focus(){}setPointerCapture(){}remove(){this.removed=true;}
 }
 const window=new Target();window.matchMedia=()=>({matches:false});const document=new Target();document.hidden=false;document.createElement=tag=>new Node(tag);document.body=new Node();
 const callbacks=new Map(),images=[];let next=0,captured=null;const audio={count:0,play(){this.count++;},setPaused(){},unlock(){},musicScene:'garden',setScene(id){this.musicScene=id;},state(){return {musicScene:this.musicScene,contextState:'running',muted:false,supported:true};}};
 class Image{constructor(){this.naturalWidth=0;this.naturalHeight=0;images.push(this);}set src(value){this.path=value;}}
 const context={...rules,createFramePacer,createBounceFeedback,drawBounceEffect,window,document,Image,devicePixelRatio:1,Date:{now:()=>67},console,requestAnimationFrame:fn=>{callbacks.set(++next,fn);return next;},cancelAnimationFrame:id=>callbacks.delete(id),createBounce:seed=>(captured=rules.createBounce(seed))};
 let source=readFileSync(new URL('../src/seed-bounce-view.js',import.meta.url),'utf8').replace(/^import .*;\r?\n/gm,'').replace(/import\.meta\.env\.BASE_URL/g,"'./'").replace('export function mountSeedBounce','function mountSeedBounce');
 vm.runInNewContext(source+'\nthis.mount=mountSeedBounce;',context);
 let closed=0;const view=context.mount({audio,onClose:()=>closed++}),root=document.body.last,canvas=root.querySelector('canvas');
 for(const image of images){image.naturalWidth=256;image.naturalHeight=128;image.onload?.();}
 const frame=now=>{const batch=[...callbacks.values()];callbacks.clear();for(const fn of batch)fn(now);};
 return {context,window,document,root,canvas,images,audio,callbacks,frame,view,get run(){return captured;},get closed(){return closed;},get draws(){return draws;}};
}
{
 const e=environment(),modal=e.root.querySelector('.sb-modal');assert.equal(e.callbacks.size,0,'menu is idle without RAF');assert.equal(modal.querySelector('.sb-start').disabled,false);modal.querySelector('.sb-start').onclick();assert.equal(e.run.phase,'aim');assert.equal(e.callbacks.size,0,'aim does not consume frames/battery');
 e.canvas.emit('pointerdown',{pointerId:1,clientX:600,clientY:180});e.canvas.emit('pointercancel',{pointerId:1});e.canvas.emit('pointerup',{pointerId:1,clientX:600,clientY:180});assert.equal(e.run.phase,'aim','cancelled pointer cannot fire');
 e.window.emit('keydown',{code:'ArrowLeft'});e.window.emit('keydown',{code:'Space'});assert.equal(e.run.phase,'flying');assert.equal(e.callbacks.size,1,'one owner starts flight');
 e.frame(100);e.frame(120);assert.ok(e.run.time>0);
 e.window.emit('blur');assert.equal(e.callbacks.size,0,'blur stops the real loop');const paused=JSON.stringify(e.run);e.frame(500);assert.equal(JSON.stringify(e.run),paused);
 modal.querySelector('.sb-resume').onclick();assert.equal(e.callbacks.size,1,'explicit resume owns exactly one RAF');
 for(let n=0;n<500&&e.run.phase==='flying';n++)e.frame(500+n*20);
 assert.equal(e.run.phase,'aim');assert.equal(e.callbacks.size,0,'returned volley sleeps');assert.equal(e.run.turn,2);assert.match(e.root.querySelector('.sb-status').textContent,/2\/14/,'final volley state reaches HUD even outside throttle window');
 e.root.querySelector('.sb-fire').onclick();for(let n=0;n<500&&e.run.phase==='flying';n++)e.frame(20000+n*20);
 assert.equal(e.run.phase,'choice');assert.equal(e.callbacks.size,0,'earned growth sleeps');assert.ok(modal.querySelectorAll('[data-growth]').length>=2);
 modal.querySelectorAll('[data-growth]')[0].onclick();assert.equal(e.run.phase,'aim');assert.ok(e.run.laws.length>0||e.run.damage>2||e.run.volleySize>12);
 e.audio.setScene('boss');e.view.close();e.view.close();assert.equal(e.audio.musicScene,'garden','child exit restores parent music');assert.equal(e.closed,1);assert.equal(e.callbacks.size,0);assert.equal(e.window.events.get('keydown').size,0,'close releases input');assert.ok(e.images.every(im=>im.onload===null&&im.onerror===null));
}
{
 const e=environment();e.root.querySelector('.sb-modal').querySelector('.sb-start').onclick();e.canvas.emit('pointerdown',{pointerId:3,clientX:320,clientY:200});e.canvas.emit('pointerup',{pointerId:4,clientX:320,clientY:200});assert.equal(e.run.phase,'aim','other finger cannot release owned shot');e.canvas.emit('pointercancel',{pointerId:4});e.canvas.emit('pointerup',{pointerId:3,clientX:320,clientY:200});assert.equal(e.run.phase,'flying','ignored second finger cancellation preserves first shot');e.document.hidden=true;e.document.emit('visibilitychange');assert.equal(e.callbacks.size,0);e.document.hidden=false;e.document.emit('visibilitychange');assert.equal(e.callbacks.size,0,'visibility does not silently resume');
 e.view.close();
}
const parent=readFileSync(new URL('../src/seed-puzzle-view.js',import.meta.url),'utf8');
// Declared adversarial boundary fixture: a growth choice may advance a nearly
// breached row. This is a unit state fixture, not a natural browser playthrough.
{
 const e=environment(),modal=e.root.querySelector('.sb-modal');modal.querySelector('.sb-start').onclick();
 for(let volley=0;volley<2;volley++){
  e.root.querySelector('.sb-fire').onclick();for(let n=0;n<500&&e.run.phase==='flying';n++)e.frame(volley*20000+n*20);
 }
 assert.equal(e.run.phase,'choice');const enemy=e.run.enemies.find(x=>x.active);enemy.y=rules.BOUNCE_CONFIG.heartLine-enemy.h/2-.05;
 modal.querySelectorAll('[data-growth]')[0].onclick();assert.equal(e.run.phase,'lost');assert.equal(e.callbacks.size,0);assert.ok(modal.querySelector('.sb-retry'),'loss caused by growth renders retry immediately');
 modal.querySelector('.sb-retry').onclick();assert.equal(e.run.phase,'aim');assert.equal(e.run.turn,1);assert.equal(e.run.score,0);e.view.close();
}
// A real AudioContext resumes asynchronously after growth. Cues must wait,
// and closing during that wait must not resurrect audio/scene work.
for(const exitDuringResume of [false,true]){
 const e=environment(),modal=e.root.querySelector('.sb-modal');modal.querySelector('.sb-start').onclick();
 for(let v=0;v<2;v++){e.root.querySelector('.sb-fire').onclick();for(let n=0;n<500&&e.run.phase==='flying';n++)e.frame(v*20000+n*20);}
 assert.equal(e.run.phase,'choice');let finish;const count=e.audio.count;
 e.audio.setPaused=value=>value===false?new Promise(resolve=>{finish=resolve;}):undefined;
 const pending=modal.querySelectorAll('[data-growth]')[0].onclick();
 assert.equal(e.audio.count,count,'growth cue waits for actual resume');
 const resume=finish;if(exitDuringResume)e.view.close();resume();await pending;
 if(exitDuringResume)assert.equal(e.audio.count,count,'closing while resuming cannot emit stale cue');
 else assert.ok(e.audio.count>count,'cue follows completed resume');
 e.view.close();
}
assert.match(parent,/if\(bounceChild\|\|bounceLoading\|\|root.hidden\)return/,'parent cannot steal child Escape/Space');
assert.match(parent,/if\(closed\|\|document.hidden\|\|bounceChild\|\|bounceLoading\|\|root.hidden\)return/,'parent painter dormant during child');
assert.match(parent,/bounceChild\?\.close\(\)/,'closing parent disposes child');
assert.match(parent,/await import\('\.\/seed-bounce-view.js'\)/,'new mode is lazy-loaded');
console.log('PASS actual bounce controller: pointer ownership/cancel, keyboard, launch/return, earned choice, blur/explicit resume, one RAF, idle/close cleanup and parent input/RAF gating. DOM mock, not physical device proof.');

