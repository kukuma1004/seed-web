import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';

const html=fs.readFileSync(new URL('../index.html',import.meta.url),'utf8');
const script=html.match(/<script id="seed-boot-watchdog">([\s\S]*?)<\/script>/)?.[1];
assert.ok(script,'Recovery must run before the module graph or account initialization can stall');
assert.ok(html.indexOf('seed-boot-watchdog')<html.indexOf('type="module"'));
assert.ok(html.indexOf('seed-boot-watchdog')<html.indexOf('</head>'),'Run before Vite inserts external stylesheet links');

function scenario({parsed=true}={}){
 const classes=new Set(),timers=new Map(),listeners=new Map();
 let observer,removed=0,reloads=0;
 const root={classList:{contains:v=>classes.has(v),add:v=>classes.add(v),remove:v=>classes.delete(v)}};
 const button={addEventListener:(kind,fn)=>listeners.set(kind,fn)};
 const panel={hidden:true,remove(){removed++;},querySelector:()=>button};
 const context={document:{documentElement:root,getElementById:id=>parsed&&id==='seed-boot-status'?panel:null,addEventListener:(kind,fn)=>listeners.set(kind,fn)},
  setTimeout:(fn,ms)=>{timers.set(ms,fn);return ms;},clearTimeout:id=>timers.delete(id),
  MutationObserver:class{constructor(fn){observer={fn,connected:false};}observe(){observer.connected=true;}disconnect(){observer.connected=false;}},
  location:{reload(){reloads++;}}};
 vm.runInNewContext(script,context);
 return {classes,panel,timers,listeners,parse(){parsed=true;},get observer(){return observer;},get removed(){return removed;},get reloads(){return reloads;},reveal(){classes.add('seed-loaded');observer.fn();}};
}
const fast=scenario();
assert.equal(fast.panel.hidden,true);fast.reveal();
assert.equal(fast.timers.size,0);assert.equal(fast.observer.connected,false);assert.equal(fast.removed,1);
const stalled=scenario();
assert.equal(stalled.timers.size,1);stalled.timers.get(15_000)();
assert.equal(stalled.panel.hidden,false);assert.equal(stalled.classes.has('seed-boot-delayed'),true);
assert.equal(stalled.classes.has('seed-loaded'),false,'Timeout must not bypass account/save gates');
stalled.listeners.get('click')();assert.equal(stalled.reloads,1);
stalled.reveal();assert.equal(stalled.removed,1);assert.equal(stalled.classes.has('seed-boot-delayed'),false);
assert.equal(stalled.observer.connected,false);
const race=scenario();race.classes.add('seed-loaded');race.timers.get(15_000)();
assert.equal(race.panel.hidden,true);assert.equal(race.classes.has('seed-boot-delayed'),false);
const early=scenario({parsed:false});early.parse();early.timers.get(15_000)();
assert.equal(early.panel.hidden,false,'Head timer must find the later parsed body panel');
const slowHtml=scenario({parsed:false});slowHtml.timers.get(15_000)();slowHtml.parse();slowHtml.listeners.get('DOMContentLoaded')();
assert.equal(slowHtml.panel.hidden,false);
assert.doesNotMatch(script,/localStorage|sessionStorage|fetch\(|account\.|cloud\.|requestAnimationFrame/);
console.log('PASS startup recovery: fast, stalled, late completion, reload and reveal race; no auth/save bypass');
