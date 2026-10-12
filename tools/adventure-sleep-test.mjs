import assert from 'node:assert/strict';
import vm from 'node:vm';
import {readFileSync} from 'node:fs';
const source=readFileSync(new URL('../src/seed-adventure-view.js',import.meta.url),'utf8');
const lifecycle=source.slice(source.indexOf(' function stop(){'),source.indexOf(' function close(){'));
const listeners=source.slice(source.indexOf("listen(window,'keydown'"),source.indexOf('// Read-only QA snapshot.'));
const window={},document={hidden:false},hooks=new Map();let requests=0,cancels=0,resets=0,bossSyncs=0;
const audio={states:[],setPaused(v){this.states.push(v);}};
const ctx=vm.createContext({window,document,s:{phase:'playing'},closed:false,paused:false,raf:0,last:99,deadline:99,pacer:null,bossRetryTimer:0,audio,
 requestAnimationFrame:()=>++requests,cancelAnimationFrame:()=>cancels++,createFramePacer:()=>({}),loop:()=>{},draw:()=>{},syncModal:()=>{},resize:()=>{},resetInput:()=>resets++,syncBossAccount:()=>bossSyncs++,clearTimeout:()=>{},keys:new Set(),listen:(target,event,fn)=>hooks.set((target===document?'doc':'win')+event,fn)});
vm.runInContext(lifecycle+listeners,ctx);ctx.start();ctx.start();assert.equal(requests,1,'one owner/one pending RAF');
document.hidden=true;hooks.get('docvisibilitychange')();assert.equal(ctx.raf,0);assert.equal(ctx.paused,true);assert.equal(ctx.last,0);assert.equal(ctx.deadline,0);assert.equal(audio.states.at(-1),true);assert.ok(cancels>=1&&resets>=1);
document.hidden=false;hooks.get('docvisibilitychange')();hooks.get('winpageshow')();assert.equal(requests,1,'returning from background stays paused until explicit resume');assert.ok(bossSyncs>=1);
ctx.pause(false);assert.equal(requests,2);assert.equal(audio.states.at(-1),false);hooks.get('winblur')();assert.equal(ctx.raf,0);assert.equal(ctx.paused,true);
ctx.pause(false);hooks.get('winpagehide')();assert.equal(ctx.raf,0);assert.equal(audio.states.at(-1),true);
ctx.s.phase='choice';ctx.paused=false;document.hidden=true;hooks.get('docvisibilitychange')();ctx.start();assert.equal(ctx.raf,0,'reward/hidden screen cannot restart a render loop');
ctx.closed=true;document.hidden=false;ctx.s.phase='playing';ctx.start();assert.equal(ctx.raf,0,'closed view cannot wake');
console.log('PASS actual Adventure lifecycle: singleRAF; blur/hide/pagehide stop/reset/audio pause; return stays paused; menu/closed cannot wake. Controlled VM lifecycle, not battery measurement.');
