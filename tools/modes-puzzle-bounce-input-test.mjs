import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import vm from 'node:vm';
import {createFramePacer} from '../src/frame-time.js';
import * as rules from '../src/seed-bounce-rules.js';
import {createBounceFeedback,drawBounceEffect} from '../src/bounce-feedback.js';
import {createSeedCanvasPaint} from '../src/seed-canvas-presentation.js';

// Execute the shipping view/controller with real rules and a bounded DOM/Canvas mock.
// This verifies ownership and intents, not live visual quality or physical touch.
class Target{
 constructor(){this.events=new Map();}
 addEventListener(name,fn){if(!this.events.has(name))this.events.set(name,new Set());this.events.get(name).add(fn);}
 removeEventListener(name,fn){this.events.get(name)?.delete(fn);}
 emit(name,event={}){for(const fn of this.events.get(name)||[])fn({preventDefault(){},...event});}
}
function environment(viewText=null){
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
 const context={...rules,createSeedCanvasPaint,createFramePacer,createBounceFeedback,drawBounceEffect,window,document,Image,devicePixelRatio:1,Date:{now:()=>67},console,requestAnimationFrame:fn=>{callbacks.set(++next,fn);return next;},cancelAnimationFrame:id=>callbacks.delete(id),createBounce:seed=>(captured=rules.createBounce(seed))};
 let source=(viewText??readFileSync(new URL('../src/seed-bounce-view.js',import.meta.url),'utf8')).replace(/^import .*;\r?\n/gm,'').replace(/import\.meta\.env\.BASE_URL/g,"'./'").replace('export function mountSeedBounce','function mountSeedBounce');
 vm.runInNewContext(source+'\nthis.mount=mountSeedBounce;',context);
 let closed=0;const view=context.mount({audio,onClose:()=>closed++}),root=document.body.last,canvas=root.querySelector('canvas');
 for(const image of images){image.naturalWidth=256;image.naturalHeight=128;image.onload?.();}
 const frame=now=>{const batch=[...callbacks.values()];callbacks.clear();for(const fn of batch)fn(now);};
 return {context,window,document,root,canvas,images,audio,callbacks,frame,view,get run(){return captured;},get closed(){return closed;},get draws(){return draws;}};
}
import * as puzzle from '../src/seed-puzzle-rules.js';
const puzzleSource=readFileSync(new URL('../src/seed-puzzle-view.js',import.meta.url),'utf8');
const toolSource=puzzleSource.slice(puzzleSource.indexOf(' function tryTool('),puzzleSource.indexOf(' function arm('));
function toolHost(source=toolSource){
 const s=puzzle.createPuzzle(puzzle.PUZZLE_STAGE_BY_ID.s12,17);s.hole[0]=1;s.cells[0]=null;
 let paid=0;const scope={s,puzzleToolReason:puzzle.puzzleToolReason,PUZZLE_TOOLS:puzzle.PUZZLE_TOOLS,PUZZLE_SHOP:puzzle.PUZZLE_SHOP,usePuzzleTool:puzzle.usePuzzleTool,armed:'hammer',active:true,toast:()=>{},snap:()=>{},canAct:()=>scope.active&&s.phase==='play',pay:()=>{paid++;return true;},toolbarUpdate:()=>{},run:()=>{},audio:{play(){}}};
 vm.createContext(scope);vm.runInContext(source+'\nthis.tool=tryTool;',scope);return {scope,s,get paid(){return paid;}};
}
{
 const host=toolHost();const before=JSON.stringify(host.s);
 for(const tool of ['hammer','row','col','unknown'])for(const i of [-1,0,81,NaN,1.5])host.scope.tool(tool,i);
 assert.equal(host.paid,0,'invalid/hole tools never charge the wallet');assert.equal(JSON.stringify(host.s),before,'invalid tool intents cannot mutate records, score, RNG or board');
 for(const tool of ['hammer','row','col','shuffle'])for(let i=0;i<81;i++){
  const s=puzzle.createPuzzle(puzzle.PUZZLE_STAGE_BY_ID.s12,17),before=JSON.stringify(s),reason=puzzle.puzzleToolReason(s,tool,i);assert.equal(JSON.stringify(s),before,'preflight is pure');
  const result=puzzle.usePuzzleTool(s,tool,i);assert.equal(result.ok,reason===null,'preflight and shipping execution share legality');
 }
 const legal=toolHost();legal.s.stone[1]=2;legal.s.cells[1]=null;legal.scope.tool('hammer',1);assert.equal(legal.paid,1,'valid stone hit pays exactly once');assert.equal(legal.s.stone[1],1);assert.equal(legal.s.tools,1);
 const ending=toolHost();ending.scope.snap=()=>ending.scope.active=false;ending.scope.tool('hammer',1);assert.equal(ending.paid,0,'snap cannot charge after controller ownership changes');
 const refused=toolHost();refused.scope.pay=()=>false;const saved=JSON.stringify(refused.s);refused.scope.tool('hammer',1);assert.equal(JSON.stringify(refused.s),saved,'refused payment does not execute the tool');
 // Negative control: removing only the shipping preflight reproduces the JP leak.
 const unsafe=toolHost(toolSource.replace("const reason=puzzleToolReason(s,tool,i);if(reason){toast(reason);return;}",''));unsafe.scope.tool('hammer',0);assert.equal(unsafe.paid,1,'negative control proves invalid-target detector is non-vacuous');
}

// Real pointer handlers with an explicit two-finger gesture fixture. A second
// finger's cancellation cannot steal or terminate the first finger's swap.
const pointerSource=puzzleSource.slice(puzzleSource.indexOf(" listen(canvas,'pointerdown'"),puzzleSource.indexOf(" listen(window,'blur'"));
function puzzlePointers(source=pointerSource){
 const handlers=new Map(),moves=[];const scope={gardenMode:false,drag:null,selected:-1,armed:null,keyboard:false,canvas:{setPointerCapture(){}},audio:{unlock(){}},cs:40,N:9,s:{},canAct:()=>true,cellAt:x=>x>=80?2:0,neighbor:()=>false,listen:(_t,n,f)=>handlers.set(n,f),endGardenDrag:()=>{},canTap:()=>false,spriteAt:()=>true,tryMove:(a,b)=>moves.push([a,b])};
 vm.createContext(scope);vm.runInContext(source,scope);return {scope,moves,emit:(name,id,x=0,y=0)=>handlers.get(name)({pointerId:id,offsetX:x,offsetY:y,preventDefault(){}})};
}
for(const cancel of ['pointercancel','lostpointercapture']){
 const p=puzzlePointers();p.emit('pointerdown',1);p.emit('pointerdown',2,80);assert.equal(p.scope.drag.id,1,'second finger cannot replace initial cell');p.emit(cancel,2);assert.equal(p.scope.drag.id,1,'unowned cancel cannot remove first gesture');p.emit('pointermove',2,120);assert.equal(p.moves.length,0);p.emit('pointermove',1,30);assert.deepEqual(p.moves,[[0,1]],'first finger still submits its original adjacent swap');
 const q=puzzlePointers();q.emit('pointerdown',1);q.emit(cancel,1);q.emit('pointermove',1,30);assert.equal(q.moves.length,0,'owned cancel prevents stale swap');
}
const stolen=puzzlePointers(pointerSource.replace('if(drag&&drag.id!==e.pointerId)return;',''));stolen.emit('pointerdown',1);stolen.emit('pointerdown',2,80);assert.equal(stolen.scope.drag.id,2,'negative control reproduces second-finger selection theft');

async function toChoice(e){
 const modal=e.root.querySelector('.sb-modal');modal.querySelector('.sb-start').onclick();
 for(let v=0;v<2;v++){e.root.querySelector('.sb-fire').onclick();for(let n=0;n<500&&e.run.phase==='flying';n++)e.frame(v*20000+n*20);}
 assert.equal(e.run.phase,'choice');return modal;
}
async function resumeProbe({source=null,pause=false,reject=false,exit=false}={}){
 const e=environment(source),modal=await toChoice(e);let finish,fail;e.audio.setPaused=value=>value===false?new Promise((resolve,reject)=>{finish=resolve;fail=reject;}):undefined;
 const pending=modal.querySelectorAll('[data-growth]')[0].onclick();assert.equal(e.run.phase,'aim');const resume=finish,rejection=fail,turn=e.run.turn,score=e.run.score;
 const fire=e.root.querySelector('.sb-fire');e.window.emit('keydown',{code:'Space'});fire.onclick();e.canvas.emit('pointerdown',{pointerId:55,clientX:600,clientY:180});e.canvas.emit('pointerup',{pointerId:55,clientX:600,clientY:180});
 const blocked=e.run.phase==='aim'&&e.callbacks.size===0;
 if(source){resume();await pending;e.view.close();return blocked;}
 assert.ok(blocked,'growth modal owns keyboard, fire and pointer until audio settles');assert.equal(fire.disabled,true);assert.equal(e.run.turn,turn);assert.equal(e.run.score,score);
 if(pause){e.window.emit('keydown',{code:'Escape'});assert.ok(modal.querySelector('.sb-resume'),'pause remains accessible during audio wait');}
 if(exit)e.view.close();if(reject)rejection(new Error('declared audio resume rejection'));else resume();await pending;
 if(exit){assert.equal(e.callbacks.size,0);assert.equal(e.closed,1);return;}
 if(pause){assert.ok(modal.querySelector('.sb-resume'));modal.querySelector('.sb-resume').onclick();}
 assert.equal(fire.disabled,false,'audio rejection/unpause cannot strand the fire control');fire.onclick();assert.equal(e.run.phase,'flying');assert.equal(e.callbacks.size,1);
 for(let n=0;n<500&&e.run.phase==='flying';n++)e.frame(60000+n*20);fire.onclick();for(let n=0;n<500&&e.run.phase==='flying';n++)e.frame(80000+n*20);
 assert.equal(e.run.phase,'choice');assert.ok(modal.querySelectorAll('[data-growth]').some(b=>!b.disabled),'later growth is not hidden by a stale pending marker');e.view.close();
}
for(const opts of [{},{pause:true},{reject:true},{exit:true}])await resumeProbe(opts);
const bounceSource=readFileSync(new URL('../src/seed-bounce-view.js',import.meta.url),'utf8');
assert.equal(await resumeProbe({source:bounceSource.replace('resuming=true;','resuming=false;')}),false,'negative control reproduces a premature launch under the growth overlay');
console.log('PASS Puzzle/Bounce shipping intent audit: pure tool preflight324 target cases; no invalid/refused JP spend; async growth owns fire/keyboard/pointer; pending pause, audio rejection, close, later growth; three negative controls reproduce defects; Puzzle two-finger swap ownership. CPU/DOM mock only.');
