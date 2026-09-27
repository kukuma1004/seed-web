import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
const main=fs.readFileSync('src/main.js','utf8');
const fn=main.slice(main.indexOf('async function showSeedDefense(){'),main.indexOf('\nfunction showDungeon(){')).replace("import('./seed-defense-view.js')",'load()');
function harness(){const els=new Map();const el=k=>{if(!els.has(k))els.set(k,{hidden:false,textContent:'',classList:{remove(){}}});return els.get(k)};let resolve,reject;let mounts=0,backs=0,reloads=0;let timeout;
 const ctx={defenseLoadSerial:0,mode:'ready',touch:{reset(){}},keys:new Set(),stopAnimation(){},$:el,setTimeout:f=>(timeout=f,1),clearTimeout(){timeout=null},load:()=>new Promise((a,b)=>{resolve=a;reject=b}),location:{reload(){reloads++}},performance:{now:()=>1},Date,startAnimation(){},showDungeon(){backs++},console:{error(){}},document:{querySelector:()=>null,body:{classList:{remove(){}}}},account:{user:()=>null},localInspection:false,developerRun:false,rawStorage:{},audio:{},defenseScreen:null};
 vm.createContext(ctx);vm.runInContext(fn,ctx);
 return {ctx,el,start:()=>ctx.showSeedDefense(),success:()=>resolve({mountSeedDefense:()=>{mounts++;return {}}}),fail:()=>reject(Error('missing old chunk')),slow:()=>timeout(),get mounts(){return mounts},get backs(){return backs},get reloads(){return reloads}};
}
let h=harness(),p=h.start();assert.equal(h.el('#overlay').hidden,false);assert.match(h.el('#overlay').innerHTML,/정원을 준비/);h.slow();assert.equal(h.el('#defense-load-reload').hidden,false);h.success();await p;assert.equal(h.mounts,1);assert.equal(h.el('#overlay').hidden,true);
h=harness();p=h.start();h.el('#defense-load-back').onclick();h.success();await p;assert.equal(h.mounts,0);assert.equal(h.backs,1);
h=harness();p=h.start();h.fail();await p;assert.equal(h.el('#overlay').hidden,false);assert.match(h.el('#defense-load-status').textContent,/저장 기록은 지우지/);h.el('#defense-load-reload').onclick();assert.equal(h.reloads,1);
console.log('Defense entry: loading, delay, success, cancel race, rejected import and reload passed.');
