import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import vm from 'node:vm';
import {createDuelTrial} from '../src/duel-trial.js';
import {DUEL_RELEASE_ORDER,DUEL_RELEASE_CHARACTERS,DUEL_INSPECTION_ORDER} from '../src/seed-duel-rules.js';

const policy=createDuelTrial({order:['pierce','locked','private'],characters:{pierce:{},locked:{},private:{inspectionOnly:true}}});
assert.equal(policy.selectable('locked',false),false);
const normalToken=policy.token();policy.enter();
assert.equal(policy.selectable('locked',false),true);assert.equal(policy.selectable('private',true),false);
assert.equal(policy.canRecord(),false);policy.leave();
assert.equal(policy.canRecord(normalToken),false,'old async result token is invalid after entering/leaving a trial');
assert.equal(policy.selectable('locked',false),false);assert.equal(policy.canRecord(),true);
policy.close();assert.equal(policy.canRecord(),false);policy.enter();assert.equal(policy.active,false);

// Actual shipping controller executed with real combat/catalog/story modules.
// Only DOM/Canvas/audio are mocked. Result fixtures are unit evidence, not a human playthrough.
const raw=readFileSync(new URL('../src/seed-duel-view.js',import.meta.url),'utf8'),imports={};
for(const match of raw.matchAll(/^import \{([^}]+)\} from '([^']+)';/gm)){
 const module=await import(new URL('../src/'+match[2].replace('./',''),import.meta.url));
 for(const item of match[1].split(',')){const [source,target]=item.trim().split(/\s+as\s+/);imports[target||source]=module[source];}
}
class Target{constructor(){this.events=new Map();}addEventListener(n,f){if(!this.events.has(n))this.events.set(n,new Set());this.events.get(n).add(f);}removeEventListener(n,f){this.events.get(n)?.delete(f);}}
function environment({resultNote='NORMAL RANK'}={}){
 const gradient={addColorStop(){}},ctx=new Proxy({createLinearGradient:()=>gradient,createRadialGradient:()=>gradient,measureText:()=>({width:20}),getImageData:()=>({data:new Uint8ClampedArray(4)})},{get:(o,k)=>o[k]??(()=>{}),set:(o,k,v)=>(o[k]=v,true)});
 class Node extends Target{
  constructor(tag='div'){super();this.tag=tag;this.children=[];this.nodes=new Map();this.hidden=false;this.isConnected=true;this.dataset={};this.style={setProperty(){}};this.classList={add(){},remove(){},toggle(){}};}
  set innerHTML(value){for(const n of this.children)n.isConnected=false;this.html=value;this.nodes.clear();this.children=[];for(const m of value.matchAll(/<(button|canvas|div|p|span|header|footer|select|strong|i|b|nav)\b([^>]*)>/g)){const n=new Node(m[1]),attrs=m[2];for(const a of attrs.matchAll(/([\w-]+)="([^"]*)"/g)){if(a[1]==='class')for(const name of a[2].split(' '))if(!this.nodes.has('.'+name))this.nodes.set('.'+name,n);if(a[1]==='id')this.nodes.set('#'+a[2],n);if(a[1].startsWith('data-'))n.dataset[a[1].slice(5).replace(/-([a-z])/g,(_,c)=>c.toUpperCase())]=a[2];}n.disabled=/\bdisabled\b/.test(attrs);this.children.push(n);if(!this.nodes.has(m[1]))this.nodes.set(m[1],n);}}
  get innerHTML(){return this.html||'';}
  querySelector(selector){if(selector.includes(' '))return this.querySelector(selector.split(' ').at(-1));return this.nodes.get(selector)||this.children.map(n=>n.querySelector(selector)).find(Boolean)||null;}
  querySelectorAll(selector){const sels=selector.split(',');return [...new Set(sels.flatMap(sel=>{const name=/\[data-(.+)\]/.exec(sel)?.[1]?.replace(/-([a-z])/g,(_,c)=>c.toUpperCase());return name?[...this.children.filter(n=>n.dataset[name]!==undefined),...this.children.flatMap(n=>n.querySelectorAll(sel))]:[];}))];}
  getContext(){return ctx;}getBoundingClientRect(){return {width:1280,height:720,left:0,top:0};}append(n){this.last=n;this.children.push(n);}setAttribute(){}remove(){this.isConnected=false;}setPointerCapture(){}
 }
 const document=new Target();document.hidden=false;document.body=new Node();document.createElement=tag=>new Node(tag);
 const window=new Target();window.matchMedia=()=>({matches:false});
 const callbacks=new Map();let fixtureTime=0;let sequence=0,run=null,progress=0,rank=0,save=0,ranking=0,closed=0;
 const store=new Map(),storage={getItem:k=>store.get(k)||null,setItem:(k,v)=>store.set(k,v)};
 const context={...imports,window,document,Image:class{constructor(){this.naturalWidth=0;this.naturalHeight=0;}},devicePixelRatio:1,location:{hostname:'test.invalid',search:''},URLSearchParams,console,Date,performance:{now:()=>fixtureTime},
  createCanvasVfx:()=>new Proxy({},{get:()=>()=>{}}),deferDuelPortraits:()=>()=>{},
  requestAnimationFrame:fn=>{callbacks.set(++sequence,fn);return sequence;},cancelAnimationFrame:id=>callbacks.delete(id),setTimeout:fn=>{callbacks.set(++sequence,fn);return sequence;},clearTimeout:id=>callbacks.delete(id),
  createDuel:opts=>(run=imports.createDuel(opts)),
 };
 const source=raw.replace(/^import .*;\r?\n/gm,'').replace(/import\.meta\.env\.BASE_URL/g,"'./'").replace('export function mountSeedDuel','function mountSeedDuel').replace('return {close};','return {close,fixtureResult:result,fixtureStoryWin:recordStoryWin,fixtureDrill:()=>({idx:drill.idx,done:[...drill.done],name:DRILLS[drill.idx].name}),fixturePracticeStep:(dt,i)=>{const other=dummyInput(dt);stepCombat(dt,i,other);drillEvents(s.events);s.events.length=0;}};');
 vm.runInNewContext(source+'\nthis.mount=mountSeedDuel;',context);
 const view=context.mount({storage,onProgress:()=>progress++,onResult:()=>{rank++;return resultNote;},onSaveAccount:async()=>{save++;return true;},onRanking:()=>ranking++,onClose:()=>closed++});
 const root=document.body.last,modal=root.querySelector('.sd-modal');
 const mode=id=>root.querySelectorAll('[data-match-mode]').find(n=>n.dataset.matchMode===id).onclick();
 const card=id=>root.querySelectorAll('[data-pick]').find(n=>n.dataset.pick===id);
 return {root,modal,view,mode,card,store,callbacks,fixtureClock:v=>fixtureTime=v,get run(){return run;},get counts(){return {progress,rank,save,ranking,closed};}};
}
{
 const e=environment();assert.equal(e.callbacks.size,0);assert.ok(e.card('burst').disabled,'same permanent locked character is grey before trial');
 e.mode('trial');assert.equal(e.card('burst').disabled,false);e.card('burst').onclick();
 e.modal.querySelector('.sd-go').onclick();assert.equal(e.run.fighters[0].char,'burst');assert.match(e.root.querySelector('.sd-story-hud').textContent,/체험/);
 e.root.querySelector('.sd-pause').onclick();assert.match(e.modal.innerHTML,/캐릭터 체험 · 기록 없음/);assert.equal(e.callbacks.size,0);
 e.modal.querySelector('.sd-resume').onclick();assert.equal(e.callbacks.size,1);
 e.run.phase='over';e.run.winner=0;e.run.wins=[2,0];e.view.fixtureStoryWin();e.view.fixtureResult();
 assert.match(e.modal.innerHTML,/체험 대전 승리/);assert.equal(e.modal.querySelector('.sd-rank-open'),null);assert.deepEqual(e.counts,{progress:0,rank:0,save:0,ranking:0,closed:0});assert.equal(e.store.size,0);
 e.modal.querySelector('.sd-again').onclick();assert.equal(e.run.fighters[0].char,'burst');assert.equal(e.run.wins[0],0);
 e.root.querySelector('.sd-pause').onclick();e.modal.querySelector('.sd-pickagain').onclick();
 e.modal.querySelector('.sd-practice').onclick();assert.equal(e.run.practice,true);assert.equal(e.run.fighters[0].char,'burst');
 e.view.fixtureResult();assert.equal(e.counts.rank,0);e.modal.querySelector('.sd-normal').onclick();assert.equal(e.card('burst').disabled,true);
 e.modal.querySelector('.sd-go').onclick();assert.equal(e.run.fighters[0].char,'pierce');e.run.phase='over';e.run.winner=0;e.run.wins=[2,0];e.view.fixtureResult();assert.equal(e.counts.rank,1,'normal battle still submits its result');
 e.modal.querySelector('.sd-rank-open').onclick();assert.equal(e.counts.ranking,1);e.view.close();e.view.close();assert.equal(e.counts.closed,1);assert.equal(e.callbacks.size,0);
}
{
 const e=environment();e.modal.querySelector('.sd-story-open').onclick();e.modal.querySelector('.sd-story-continue').onclick();e.modal.querySelector('.sd-story-fight').onclick();
 e.run.phase='over';e.run.winner=0;e.run.wins=[2,0];e.view.fixtureStoryWin();e.view.fixtureResult();assert.equal(e.counts.progress,1);assert.equal(e.counts.rank,1);assert.ok(e.store.size>0,'normal story still writes permanent progress');e.view.close();
}

{
 let finish;const resultNote=new Promise(resolve=>{finish=resolve;}),e=environment({resultNote});
 e.modal.querySelector('.sd-go').onclick();e.run.phase='over';e.run.winner=0;e.run.wins=[2,0];e.view.fixtureResult();
 const oldStatus=e.modal.querySelector('.sd-rank-status'),oldText=oldStatus.textContent;
 e.modal.querySelector('.sd-pickagain').onclick();e.mode('trial');finish('LATE NORMAL RANK');await Promise.resolve();await Promise.resolve();
 assert.equal(oldStatus.textContent,oldText,'late normal result cannot update detached/changed trial screen');assert.doesNotMatch(e.modal.innerHTML,/LATE NORMAL RANK/);e.view.close();
}
// Added learning entry uses real practice setup and the shipping dummy/step/
// receipt functions. It cannot unlock or submit even on lesson success.
for(const id of ['pierce','burst','gravity']){
 const e=environment();e.mode('trial');assert.equal(e.root.querySelectorAll('[data-pick]').length,3,'trial starts with three distinct approaches');
 e.card(id).onclick();assert.match(e.modal.innerHTML,/선택한 씨앗의 싸움법/);e.modal.querySelector('.sd-practice').onclick();
 assert.equal(e.view.fixtureDrill().idx,9);assert.equal(e.run.fighters[0].char,id);
 for(let n=0;n<300&&!e.view.fixtureDrill().done.includes(9);n++){
  const [p,other]=e.run.fighters,input={aimX:1,aimY:0};
  if(id==='burst'){input.heavy=n>=18;input.x=Math.hypot(p.x-other.x,p.y-other.y)>1.9?1:0;}
  else if(n===18)input[id==='gravity'?'skill1':'attack']=true;
  e.view.fixturePracticeStep(1/60,input);
 }
 assert(e.view.fixtureDrill().done.includes(9),id+' actual contact completes its selected style lesson');
 e.fixtureClock(1500);e.view.fixturePracticeStep(1/60,{});assert.equal(e.view.fixtureDrill().idx,0,'style success flows into unchanged basic combo lesson');
 assert.equal(e.store.size,0);assert.deepEqual(e.counts,{progress:0,rank:0,save:0,ranking:0,closed:0});
 e.view.close();assert.equal(e.callbacks.size,0);
}
{
 const e=environment();e.mode('trial');
 e.root.querySelectorAll('[data-filter]').find(n=>n.dataset.filter==='all').onclick();assert.equal(e.root.querySelectorAll('[data-pick]').length,DUEL_RELEASE_ORDER.length,'full roster remains accessible');
 const last=DUEL_RELEASE_ORDER.at(-1);e.card(last).onclick();assert.match(e.modal.innerHTML,new RegExp(DUEL_RELEASE_CHARACTERS[last].name));
 e.modal.querySelector('.sd-practice').onclick();assert.equal(e.view.fixtureDrill().idx,0,'advanced characters retain original contextual combo preparation');e.view.close();
}

assert.ok(DUEL_RELEASE_ORDER.every(id=>!DUEL_RELEASE_CHARACTERS[id].inspectionOnly));
const privateIds=DUEL_INSPECTION_ORDER.filter(id=>!DUEL_RELEASE_ORDER.includes(id));
const releasedTrial=createDuelTrial({order:DUEL_RELEASE_ORDER,characters:DUEL_RELEASE_CHARACTERS});releasedTrial.enter();assert.ok(privateIds.every(id=>!releasedTrial.selectable(id,true)));
console.log('PASS Duel trial shipping controller + real rules: same locked character normal/trial, public-only roster, battle/practice/retry/pause/normal reset, no trial storage/result/progress/flush, preserved normal story/rank, session token/close. DOM model; live/device validation separate.');
