import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import vm from 'node:vm';
import {createFramePacer} from '../src/frame-time.js';

const source=readFileSync(new URL('../src/seed-puzzle-view.js',import.meta.url),'utf8');
const start=source.indexOf(' function renderRate(){'),end=source.indexOf(' // ── HUD',start);
assert(start>=0&&end>start);
const callbacks=new Map(),events=new Map(),draws=[],updates=[];
let serial=0;
const scope={document:{hidden:false},modal:{hidden:true},sprites:new Map(),effects:[],floaters:[],pacer:createFramePacer(),
 requestAnimationFrame:fn=>{callbacks.set(++serial,fn);return serial;},cancelAnimationFrame:id=>callbacks.delete(id),
 listen:(_target,event,fn)=>events.set(event,fn),busy:()=>scope.busyValue,update:dt=>updates.push(dt),draw:now=>draws.push(now)};
vm.createContext(scope);
vm.runInContext('let raf=0,last=0,clock=0,closed=false,gardenMode=false,s={phase:"play"},shake=0,drag=null;'+source.slice(start,end)+`
 this.rate=renderRate;this.loop=loop;
 this.set=(key,value)=>{if(key==='closed')closed=value;else if(key==='garden')gardenMode=value;else if(key==='state')s=value;else if(key==='drag')drag=value;};
 this.status=()=>({raf,last,clock});`,scope);
assert.equal(scope.rate(),24);
scope.modal.hidden=false;assert.equal(scope.rate(),12);scope.modal.hidden=true;
scope.set('garden',true);assert.equal(scope.rate(),24);scope.set('garden',false);
scope.busyValue=true;assert.equal(scope.rate(),60);scope.busyValue=false;
scope.effects.push({});assert.equal(scope.rate(),60);scope.effects.length=0;
scope.floaters.push({});assert.equal(scope.rate(),60);scope.floaters.length=0;
scope.set('drag',{});assert.equal(scope.rate(),60);scope.set('drag',null);
for(const moving of [{tw:{}},{dying:.1},{pop:.1},{y:0,ty:1}]){scope.sprites.set(1,{y:0,ty:0,...moving});assert.equal(scope.rate(),60);scope.sprites.clear();}
scope.sprites.set(1,{y:0,ty:0,pop:0});assert.equal(scope.rate(),24);
scope.loop(1);
const frame=now=>{const [id,fn]=callbacks.entries().next().value;callbacks.delete(id);fn(now);};
for(let n=1;n<=120;n++)frame(1+n*1000/120);
assert(draws.length>=23&&draws.length<=26,'real pacer bounds settled 120Hz input to about24 redraws');
const before=draws.length;
scope.document.hidden=true;events.get('visibilitychange')();assert.equal(callbacks.size,0);assert.equal(scope.status().raf,0);
scope.loop(60000);assert.equal(callbacks.size,0);assert.equal(draws.length,before,'hidden stale callback performs no update or draw');
scope.document.hidden=false;events.get('visibilitychange')();events.get('visibilitychange')();assert.equal(callbacks.size,1,'visible events cannot multiply RAF loops');
frame(60001);assert.equal(updates.at(-1),0,'returning from background never catches up hidden time');
scope.set('closed',true);frame(60020);assert.equal(callbacks.size,0);events.get('visibilitychange')();assert.equal(callbacks.size,0);

// Execute the shipping key handler, with a canvas cursor already selected.
// Native toolbar Enter/Space must neither spend a tool nor swap the board.
const keyStart=source.indexOf(' const KEYS={ArrowLeft:'),keyEnd=source.indexOf(" $('.sp-pause').onclick",keyStart);
const actions=[],keyScope={window:{},modal:{hidden:true},gardenMode:false,armed:'row',cursor:27,selected:28,N:9,keyboard:false,clock:0,
 canAct:()=>true,snap:()=>actions.push('snap'),tryTool:()=>actions.push('tool'),tryMove:()=>actions.push('move'),canTap:()=>false,neighbor:()=>true,
 toolbarUpdate:()=>{},listen:(_target,_event,fn)=>{keyScope.handler=fn;}};
vm.createContext(keyScope);vm.runInContext(source.slice(keyStart,keyEnd),keyScope);
for(const code of ['Enter','Space']){
 keyScope.handler({code,target:{closest:q=>q.includes('button')?{}:null},preventDefault:()=>actions.push('prevent')});
 assert.deepEqual(actions,[]);
}
keyScope.handler({code:'Enter',target:{closest:()=>null},preventDefault:()=>actions.push('prevent')});assert(actions.includes('tool'),'canvas keyboard tool path remains active');
assert(source.includes('aria-label="${t.name}'));
console.log('Puzzle shipping frame/key contracts passed: active60/settled24/menu12, no hidden RAF or catch-up, one resume loop, closed cleanup, native toolbar controls and canvas keys preserved. CPU lifecycle test; no physical battery measurement.');
