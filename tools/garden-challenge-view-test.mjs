import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import * as rules from '../src/garden-challenge-rules.js';
import * as records from '../src/garden-challenge-records.js';
import {LAWS} from '../src/laws.js';
import {GARDEN_OBJECT_ART} from '../src/garden-theme-art.js';
import {advanceFrame,createFramePacer} from '../src/frame-time.js';
import {createSeedCanvasPaint} from '../src/seed-canvas-presentation.js';
class Target{constructor(){this.events=new Map();}addEventListener(k,f){if(!this.events.has(k))this.events.set(k,new Set());this.events.get(k).add(f);}removeEventListener(k,f){this.events.get(k)?.delete(f);}emit(k,e={}){for(const f of this.events.get(k)||[])f({preventDefault(){},stopImmediatePropagation(){},target:{closest:()=>null},detail:0,...e});}}
function environment({fail=false,reduced=false}={}){
 let viewport={width:1280,height:720,left:0,top:0},draws=0,captured=null;
 const ctx=new Proxy({createRadialGradient:()=>({addColorStop(){}}),measureText:()=>({width:20})},{get:(o,k)=>o[k]??(()=>{draws++;}),set:(o,k,v)=>(o[k]=v,true)});
 class Node extends Target{
  constructor(tag='div'){super();this.tagName=tag;this.children=[];this.attrs={};this.dataset={};this.style={setProperty(){}};this.disabled=false;this.hidden=false;this.classes=new Set();this.classList={add:(...n)=>n.forEach(x=>this.classes.add(x)),remove:(...n)=>n.forEach(x=>this.classes.delete(x)),toggle:(n,on)=>{if(on??!this.classes.has(n))this.classes.add(n);else this.classes.delete(n);}};}
  append(n){this.children.push(n);n.parent=this;}
  setAttribute(k,v){this.attrs[k]=String(v);if(k==='class')this.classes=new Set(v.split(' '));}
  set innerHTML(html){this.html=html;this.children=[];const stack=[this];for(const token of html.matchAll(/<\/?([a-z][\w-]*)\b[^>]*>/gi)){const raw=token[0],tag=token[1];if(raw.startsWith('</')){if(stack.length>1){const finished=stack.pop();finished.html=html.slice(finished.htmlStart,token.index);}continue;}const n=new Node(tag);n.htmlStart=token.index+raw.length;for(const a of raw.matchAll(/([\w-]+)="([^"]*)"/g)){n.setAttribute(a[1],a[2]);if(a[1].startsWith('data-'))n.dataset[a[1].slice(5)]=a[2];}n.disabled=/\bdisabled\b/.test(raw);n.hidden=/\bhidden\b/.test(raw);stack.at(-1).append(n);if(!['br','img','input','hr','meta'].includes(tag))stack.push(n);}}
  get innerHTML(){return this.html||'';}
  matches(selector){const bare=selector.replace(':not(:disabled)','');if(selector.includes(':not(:disabled)')&&this.disabled)return false;if(bare[0]==='.')return this.classes.has(bare.slice(1));if(bare[0]==='['){const key=bare.slice(1,-1).slice(5);return this.dataset[key]!==undefined;}return this.tagName===bare;}
  descendants(){return this.children.flatMap(n=>[n,...n.descendants()]);}
  querySelectorAll(selector){const parts=selector.split(' ');let nodes=[this];for(const part of parts)nodes=nodes.flatMap(n=>n.descendants().filter(c=>c.matches(part)));return [...new Set(nodes)];}
  querySelector(selector){return this.querySelectorAll(selector)[0]||null;}
  getContext(){return ctx;}getBoundingClientRect(){return this.classes.has('gc-stick')?{width:84,height:84,left:22,top:viewport.height-100}:viewport;}
  focus(){}setPointerCapture(){}releasePointerCapture(){}remove(){this.removed=true;}
 }
 const window=new Target(),media=new Target(),document=new Target(),images=[],queue=new Map(),values=new Map([['seed-profile','untouched']]),writes=[],audioCalls=[];let serial=0,closed=0,now=0;
 window.matchMedia=()=>Object.assign(media,{matches:reduced});window.devicePixelRatio=2;document.hidden=false;document.createElement=t=>new Node(t);document.body=new Node();
 class Image{constructor(){this.naturalWidth=0;this.naturalHeight=0;images.push(this);}set src(v){this.path=v;}}
 const audio={play:(id,o)=>audioCalls.push([id,o]),unlock(){},setScene:v=>{audio.scene=v;},setPaused:v=>{audio.paused=v;},setMuted:v=>{audio.muted=v;},tick(){},state:()=>({musicScene:'garden',paused:false,muted:false})};
 const storage={getItem:k=>values.get(k)??null,setItem:(k,v)=>{writes.push(k);values.set(k,v);}};
 const scope={...rules,...records,createSeedCanvasPaint,LAWS,GARDEN_OBJECT_ART,advanceFrame,createFramePacer,window,document,Image,console,Date:{now:()=>33},requestAnimationFrame:f=>{queue.set(++serial,f);return serial;},cancelAnimationFrame:id=>queue.delete(id),createGardenChallenge:(...args)=>(captured=rules.createGardenChallenge(...args))};
 let source=fs.readFileSync(new URL('../src/garden-challenge-view.js',import.meta.url),'utf8').replace(/^import .*;\r?\n/gm,'').replaceAll('import.meta.env.BASE_URL',"'./'").replace('export function mountGardenChallenge','function mountGardenChallenge');
 vm.runInNewContext(source+'\nthis.mount=mountGardenChallenge;',scope);const view=scope.mount({audio,storage,onClose:()=>closed++}),root=document.body.children[0];
 for(const im of images){if(fail)im.onerror?.();else{im.naturalWidth=768;im.naturalHeight=512;im.onload?.();}}
 const frame=(milliseconds=17)=>{now+=milliseconds;const callbacks=[...queue.values()];queue.clear();for(const f of callbacks)f(now);};
 const frames=n=>{for(let i=0;i<n;i++)frame();};
 return {view,root,window,document,images,queue,frame,frames,audio,audioCalls,values,writes,media,get run(){return captured;},get closed(){return closed;},get draws(){return draws;},size:(w,h)=>{viewport={...viewport,width:w,height:h};window.emit('resize');}};
}
const button=(e,name)=>e.root.querySelector(name);
{
 const e=environment();assert.equal(e.queue.size,0);assert.equal(button(e,'.gc-start').disabled,false);button(e,'.gc-start').onclick();assert.equal(e.queue.size,1);e.frames(3);e.window.emit('keydown',{code:'KeyD'});e.frames(30);e.window.emit('keyup',{code:'KeyD'});assert(e.run.player.x>1.5,'keyboard actually moves player');
 const mute=button(e,'.gc-mute'),hudTarget={closest:selector=>selector==='button'?mute:null};mute.onclick();const afterMute=e.run.player.x;e.window.emit('keydown',{code:'KeyD',target:hudTarget});e.frames(20);e.window.emit('keyup',{code:'KeyD',target:hudTarget});assert(e.run.player.x>afterMute+1,'HUD mute focus cannot block movement');
 let spaceBlocked=false;e.window.emit('keydown',{code:'Space',target:hudTarget,preventDefault:()=>{spaceBlocked=true;}});assert.equal(spaceBlocked,false,'focused button keeps native Space activation');mute.onclick();
 e.window.emit('keydown',{code:'Space',repeat:false});e.frames(1);assert(e.run.player.dashCd>2);e.window.emit('keydown',{code:'Space',repeat:true});e.frames(4);assert(e.run.player.dashCd<2.8);
 const stick=button(e,'.gc-stick');stick.emit('pointerdown',{pointerId:1,clientX:100,clientY:662});stick.emit('pointercancel',{pointerId:2});const x=e.run.player.x;e.frames(10);assert(e.run.player.x>x,'other finger cannot cancel movement');stick.emit('pointercancel',{pointerId:1});
 e.window.emit('blur');assert.equal(e.queue.size,0);const frozen=JSON.stringify(e.run);e.frame(10000);assert.equal(JSON.stringify(e.run),frozen);button(e,'.gc-resume').onclick();assert.equal(e.queue.size,1);
 e.document.hidden=true;e.document.emit('visibilitychange');assert.equal(e.queue.size,0);e.document.hidden=false;e.document.emit('visibilitychange');assert.equal(e.queue.size,0,'return requires explicit resume');button(e,'.gc-resume').onclick();
 e.run.kills=e.run._growthKills;e.frames(3);assert.equal(e.run.phase,'choice');assert.equal(e.queue.size,0);assert(e.root.querySelectorAll('[data-choice]').length===11,'all nine laws plus two options accessible');await e.root.querySelectorAll('[data-choice]').find(n=>n.dataset.choice==='burst').onclick();assert.equal(e.run.levels.burst,1);assert.equal(e.queue.size,1);
 e.run.kills=e.run._growthKills;e.frames(3);await e.root.querySelectorAll('[data-choice]').find(n=>n.dataset.choice==='chain').onclick();e.run.kills=e.run._growthKills;e.frames(3);await e.root.querySelectorAll('[data-choice]').find(n=>n.dataset.choice.startsWith('fusion:')).onclick();assert(e.run.fusion);assert(e.audioCalls.some(([id])=>id==='fusion'));
 e.size(640,360);assert.equal(e.queue.size,1);e.media.emit('change',{matches:true});e.view.close();e.view.close();assert.equal(e.closed,1);assert.equal(e.queue.size,0);assert(e.images.every(i=>i.onload===null&&i.onerror===null));assert.equal(e.window.events.get('keydown').size,0);assert.equal(e.audio.scene,'garden');assert.equal(e.writes.length,0,'unfinished practice is not a completed result');
}
for(const result of ['won','lost']){
 const e=environment();button(e,'.gc-start').onclick();e.frames(3);
 if(result==='lost'){e.run.player.hp=.1;const n=e.run.enemies[0];Object.assign(n,{active:true,type:'hound',x:0,y:0,hp:1000,maxHp:1000,attackTime:999});}
 else{for(const choice of ['burst','chain','fusion:chainburst','tempo','vigor']){e.run.kills=e.run._growthKills;e.frames(3);await e.root.querySelectorAll('[data-choice]').find(n=>n.dataset.choice===choice).onclick();}e.run.time=125;e.frames(3);const n=e.run.enemies.find(n=>n.active&&n.type==='boss');n.x=1;n.y=0;n.hp=1;}
 for(let i=0;i<60&&e.run.phase==='playing';i++)e.frame();assert.equal(e.run.phase,result);assert.equal(e.queue.size,0);assert(button(e,'.gc-retry'));assert.equal(e.writes.length,1);assert.equal(e.values.get('seed-profile'),'untouched');assert.equal(e.writes[0],records.GARDEN_CHALLENGE_RECORD_KEY);assert(button(e,'.gc-modal').innerHTML.includes('수집한 공급 꽃'));if(result==='won'){const row=JSON.parse(e.values.get(records.GARDEN_CHALLENGE_RECORD_KEY)).recent[0];assert(row.build.includes('빠른 꽃잎 1회'));assert(row.build.some(x=>x.includes('단단한 새싹 1회')));assert(button(e,'.gc-modal').innerHTML.includes('최대 생명 +14'));assert(button(e,'.gc-journal').innerHTML.includes('빠른 꽃잎 1회'),'recent journal shows the complete build, not just fusion name');}button(e,'.gc-retry').onclick();assert.equal(e.run.time,0);assert.equal(e.run.player.hp,100);assert.equal(e.run.score,0);e.view.close();
}
{
 const e=environment({fail:true});assert(button(e,'.gc-start').disabled);assert.equal(button(e,'.gc-load-retry').hidden,false);button(e,'.gc-load-retry').onclick();for(const im of e.images.slice(7)){im.naturalWidth=768;im.naturalHeight=512;im.onload?.();}assert.equal(button(e,'.gc-start').disabled,false);e.view.close();
}
for(const exitWhileResuming of [false,true]){
 const e=environment();button(e,'.gc-start').onclick();e.frames(3);e.run.kills=e.run._growthKills;e.frames(3);let done;e.audio.setPaused=v=>v===false?new Promise(resolve=>{done=resolve;}):undefined;const before=e.audioCalls.length,pending=e.root.querySelectorAll('[data-choice]')[0].onclick();assert.equal(e.audioCalls.length,before);const finish=done;if(exitWhileResuming)e.view.close();finish();await pending;if(exitWhileResuming)assert.equal(e.audioCalls.length,before);else assert.equal(e.audioCalls.at(-1)[0],'evolve');e.view.close();
}
const src=fs.readFileSync(new URL('../src/garden-challenge-view.js',import.meta.url),'utf8');assert(src.includes('bx+(x+CHALLENGE.width/2)*scale'));assert(src.includes("shot.owner==='enemy'?'#fa9978'"));assert(src.includes("h.kind==='gravity'"));assert(src.includes("type==='boss'"));assert(src.includes("type==='heal'"));
console.log('Garden Challenge shipping controller PASS: actual rules via DOM/Canvas mock; move/dodge/pointer cancel, pause/hidden, six-choice wiring, real win/loss/retry/local-save, loading retry, audio async teardown, centered world and threat distinctions. This is not native browser/device proof.');
