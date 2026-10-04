import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import vm from 'node:vm';

// Exercise the shipped handler. A focused control must receive the native
// Enter/Space action instead of the global combat handler cancelling it.
const main=readFileSync(new URL('../src/main.js',import.meta.url),'utf8');
const start=main.indexOf("window.addEventListener('keydown',e=>");
const end=main.indexOf("window.addEventListener('keyup'",start);
assert(start>=0&&end>start);
const handlers={},context={window:{addEventListener:(event,fn)=>handlers[event]=fn},
 mode:'playing',paused:false,keys:new Set(),keyboardDash:false,pauses:0,
 togglePause:()=>context.pauses++};
vm.runInNewContext(main.slice(start,end),context);
function send(code,tag=null){
 let cancelled=false;
 handlers.keydown({code,repeat:false,target:{closest:selector=>tag&&selector.split(',').includes(tag)?{}:null},preventDefault:()=>cancelled=true});
 return cancelled;
}
for(const mode of ['ready','playing','evolving','developer-lab']){
 context.mode=mode;
 for(const tag of ['button','summary','a','select'])for(const code of ['Space','Enter']){
  context.keys.clear();context.keyboardDash=false;
  assert.equal(send(code,tag),false,`${mode}: ${tag} keeps ${code} activation`);
  assert.equal(context.keys.size,0);assert.equal(context.keyboardDash,false);
 }
}
context.mode='playing';assert.equal(send('Space'),true);assert.equal(context.keyboardDash,true);assert(context.keys.has('Space'));
context.keyboardDash=false;context.keys.clear();assert.equal(send('KeyP','button'),false);assert.equal(context.pauses,1);
assert.equal(send('Space','input'),false);assert.equal(context.keyboardDash,false);
console.log('Shipped keyboard handler: native focused-control activation, gameplay dodge, pause shortcut and text-input isolation passed.');
