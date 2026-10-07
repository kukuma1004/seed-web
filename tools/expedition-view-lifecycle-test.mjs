import assert from 'node:assert/strict';
import {build} from 'esbuild';
import {createRoster,recruitInstance,setParty} from '../src/expedition/roster.js';
import {newExpeditionRoute,advanceExpeditionRoute} from '../src/expedition/world.js';
import {emptyExpeditionNursery} from '../src/expedition/nursery.js';
import {createExpeditionCombat} from '../src/expedition/combat.js';

// Delayed controller responses reproduce the view/transport race. This is a
// mocked lifecycle test, not a physical mobile suspend or Google-account test.
class Element {
 constructor(){this.dataset={};this.style={};this.hidden=false;this.disabled=false;this.innerHTML='';this.textContent='';this.handlers=new Map();this.children=new Map();this.classList={add(){},remove(){},toggle(){}};}
 querySelector(selector){if(!this.children.has(selector))this.children.set(selector,new Element());return this.children.get(selector);}
 querySelectorAll(){return [];}
 addEventListener(type,fn){this.handlers.set(type,fn);}
 removeEventListener(type,fn){if(this.handlers.get(type)===fn)this.handlers.delete(type);}
 emit(type,target){this.handlers.get(type)?.({target,pointerId:1,preventDefault(){},code:target?.code||''});}
 append(child){this.child=child;}
 remove(){this.removed=true;}
 contains(){return true;}
 closest(){return this;}
 setAttribute(){}
}
const originals=Object.fromEntries(['document','window','Image','requestAnimationFrame','cancelAnimationFrame','setTimeout','clearTimeout'].map(key=>[key,globalThis[key]]));
const doc=new Element(),win=new Element(),host=new Element(),timers=new Map(),frames=new Map();let nextId=0;
doc.hidden=false;doc.createElement=()=>new Element();globalThis.document=doc;globalThis.window=win;
globalThis.Image=class{};
globalThis.requestAnimationFrame=fn=>{frames.set(++nextId,fn);return nextId;};globalThis.cancelAnimationFrame=id=>frames.delete(id);

const settle=async()=>{for(let n=0;n<12;n++)await Promise.resolve();};
const button=(key,value)=>Object.assign(new Element(),{dataset:{[key]:value}});
let vite,groups=0;
try{
 // Bundle the shipping module once; avoid the Windows Vite SSR dependency stall.
 const compiled=await build({entryPoints:['src/expedition/view.js'],bundle:true,platform:'node',format:'esm',loader:{'.css':'empty'},define:{'import.meta.env':'{"BASE_URL":"/"}'},write:false});
 const {mountExpedition}=await import('data:text/javascript;base64,'+Buffer.from(compiled.outputFiles[0].text).toString('base64'));
 // Vite SSR uses native timers; only the mounted game receives fake clocks.
 globalThis.setTimeout=(fn,delay)=>{timers.set(++nextId,{fn,delay});return nextId;};globalThis.clearTimeout=id=>timers.delete(id);
 const timerBaseline=timers.size;
 function fixture(screen='explore',queuedMovement=false){
  doc.hidden=false;let owner='lifecycle-owner',resolveFlight,flight=null,delayedType='move',pauseFailure=false;
  const roster=createRoster({owner,channel:'review'}),ids=['pierce','split','orbit','frost','burst','gravity','reflect','recall'].map((speciesId,n)=>{const id=`seed-${n}`;assert.ok(recruitInstance(roster,{instanceId:id,speciesId}));return id;});assert.ok(setParty(roster,ids));
  const route=newExpeditionRoute({runId:'lifecycle-run',gardenId:'meadow',difficulty:1,partyIds:ids});advanceExpeditionRoute(route);
  const model={screen,roster,meta:{...emptyExpeditionNursery(),cores:{},awakenMaterials:0},route,battle:null,notice:'',saveState:'saved',events:[],lastResult:null,paused:false,review:false};
  if(screen==='battle')model.battle=createExpeditionCombat({battleId:'race-battle',allies:[{id:'seed-0',instanceId:'seed-0',speciesId:'pierce',slot:0,hp:92,maxHp:92,level:1,speed:99}],enemies:[{id:'enemy',instanceId:'enemy',speciesId:'meadow-normal-0',slot:0,hp:40,maxHp:40,level:1,speed:1}]});
  const calls=[],sounds=[],audioPause=[],durable={position:route.position,actions:0};
  const apply=intent=>{
   if(intent.type==='pause'){
    if(pauseFailure){model.saveState='error';model.paused=true;return {ok:false,reason:'durable original retained'};}
    durable.position=model.route.position;model.saveState='saved';model.paused=Boolean(intent.paused);
   }else if(intent.type==='move'){model.route.position+=.4;model.saveState='pending';}
   else if(intent.type==='depart')model.screen='explore';
   else if(intent.type==='interact'){model.screen='battle';model.battle={battleId:'event-battle',units:[],order:[],acted:[]};}
   else if(intent.type==='action'){durable.actions++;model.battle.acted=['seed-0'];}
   return {ok:true,events:intent.type==='action'?[{type:'action',unitId:'seed-0',kind:'attack',seq:1},{type:'damage',unitId:'seed-0',targetId:'enemy',amount:10,seq:2}]:[]};
  };
  const controller={state:()=>model,canMoveWhileSaving:()=>queuedMovement&&flight!==null&&delayedType==='move'&&!model.paused,dispatch(intent){calls.push({...intent});if(flight&&queuedMovement&&intent.type==='move')return apply(intent);assert.equal(flight,null,'no overlapping paid controller commands');if(intent.type===delayedType){flight=new Promise(resolve=>{resolveFlight=()=>{flight=null;resolve(apply(intent));};});return flight;}return apply(intent);},async close(){if(flight)await flight;durable.position=model.route.position;}};
  const audio={setScene(){},setPaused:value=>audioPause.push(value),tick(){},play:id=>sounds.push(id)};
  const view=mountExpedition({host,owner,currentOwner:()=>owner,createController:()=>controller,audio}),root=host.child;
  return {view,root,model,calls,sounds,audioPause,durable,resolve:()=>{assert.ok(resolveFlight);resolveFlight();},delay:type=>{delayedType=type;},owner:value=>{owner=value;},pauseFailure:()=>{pauseFailure=true;}};
 }
 function cleanup(f){f.view.close();assert.equal(timers.size,timerBaseline);assert.equal(frames.size,0);assert.equal(doc.handlers.size,0);assert.equal(win.handlers.size,0);assert.equal(f.root.handlers.size,0);doc.hidden=false;}
 for(const trigger of ['button','escape']){
  const f=fixture('home');win.emit('blur');assert.equal(f.calls.length,0,'idle HOME blur does not issue a save');assert.equal(f.model.paused,false);
  if(trigger==='button')f.root.emit('click',button('intent','pause'));else win.emit('keydown',{code:'Escape'});await settle();
  assert.equal(f.model.paused,true,'manual HOME pause retains its overlay');assert.equal(f.root.querySelector('.exv-pause-layer').hidden,false);assert.equal(timers.size,timerBaseline);
  f.root.emit('click',button('intent','resume'));await settle();assert.equal(f.model.paused,false);assert.equal(timers.size,timerBaseline+1);cleanup(f);groups++;
 }
 for(const trigger of ['visibilitychange','blur','pagehide']){
  const f=fixture();const before=f.model.route.position;f.root.emit('click',button('travel',''));assert.equal(f.calls.length,1);
  if(trigger==='visibilitychange'){doc.hidden=true;doc.emit(trigger);}else win.emit(trigger);
  assert.equal(timers.size,timerBaseline);assert.equal(frames.size,0);assert.equal(f.view.isActive(),false);assert.equal(f.calls.length,1,'pause waits for accepted command');
  assert.equal(f.root.querySelector('.exv-save').textContent,'서버 저장 확인 중');
  f.resolve();await settle();
  assert.deepEqual(f.calls.map(x=>x.type),['move','pause']);assert.equal(f.calls[1].paused,true);assert.equal(f.model.paused,true);assert.equal(f.durable.position,before+.4);assert.equal(f.model.saveState,'saved');
  assert.equal(timers.size,timerBaseline);assert.equal(frames.size,0);assert.equal(f.sounds.length,0);
  doc.hidden=false;doc.emit('visibilitychange');assert.equal(f.view.isActive(),false,'return never resumes a suspended run');
  f.root.emit('click',button('intent','resume'));await settle();assert.equal(f.model.paused,false);assert.equal(f.view.isActive(),true);assert.equal(timers.size,timerBaseline+1);assert.equal(frames.size,0,'held keys were cleared');cleanup(f);groups++;
 }
 {
  const f=fixture('home');f.delay('depart');f.root.emit('click',button('intent','depart'));doc.hidden=true;doc.emit('visibilitychange');f.resolve();await settle();
  assert.deepEqual(f.calls.map(x=>x.type),['depart','pause']);assert.equal(f.model.screen,'explore');assert.equal(f.model.paused,true);assert.equal(timers.size,timerBaseline);assert.equal(f.sounds.length,0);cleanup(f);groups++;
 }
 {
  const f=fixture('battle');
  f.delay('action');f.root.emit('click',button('action','attack'));doc.hidden=true;doc.emit('visibilitychange');win.emit('blur');f.resolve();await settle();
  assert.deepEqual(f.calls.map(x=>x.type),['action','pause'],'duplicate suspend signals coalesce');assert.equal(f.durable.actions,1);assert.equal(f.model.paused,true);assert.equal(timers.size,timerBaseline,'next enemy turn never starts');assert.equal(f.sounds.length,0,'late combat result never plays hidden sound');cleanup(f);groups++;
 }
 {
  const f=fixture();f.root.emit('click',button('intent','pause'));await settle();f.delay('pause');f.root.emit('click',button('intent','resume'));doc.hidden=true;doc.emit('visibilitychange');f.delay('none');f.resolve();await settle();
  assert.deepEqual(f.calls.map(x=>[x.type,x.paused]),[['pause',true],['pause',false],['pause',true]]);assert.equal(f.model.paused,true);assert.equal(f.view.isActive(),false);assert.equal(timers.size,timerBaseline);assert.equal(f.audioPause.at(-1),true,'resume ACK cannot restart suspended audio');cleanup(f);groups++;
 }
 {
  const f=fixture();f.root.emit('click',button('travel',''));win.emit('blur');f.owner('other-owner');f.resolve();await settle();assert.deepEqual(f.calls.map(x=>x.type),['move'],'queued pause must not cross UID boundary');assert.equal(f.view.isActive(),false);assert.equal(timers.size,timerBaseline);assert.equal(frames.size,0);cleanup(f);groups++;
 }
 {
  const f=fixture();f.root.emit('click',button('travel',''));doc.hidden=true;doc.emit('visibilitychange');const closing=f.view.close();f.resolve();await closing;await settle();assert.deepEqual(f.calls.map(x=>x.type),['move'],'close owns its final flush, no late dispatch');assert.equal(f.root.removed,true);assert.equal(f.durable.position,f.model.route.position);assert.equal(timers.size,timerBaseline);assert.equal(doc.handlers.size,0);assert.equal(win.handlers.size,0);assert.equal(f.audioPause.at(-1),true,'late close completion must leave background audio suspended');doc.hidden=false;groups++;
 }
 {
  const f=fixture();f.pauseFailure();f.root.emit('click',button('travel',''));win.emit('blur');f.resolve();await settle();assert.equal(f.model.saveState,'error');assert.equal(f.view.isActive(),false);assert.equal(timers.size,timerBaseline);assert.equal(f.root.querySelector('.exv-save').textContent,'저장 오류 · 진행 중단');assert.match(f.root.querySelector('.exv-notice').textContent,/durable original retained/);assert.equal(f.root.querySelector('.exv-pause-layer').querySelector('[data-intent="resume"]').disabled,true,'cannot resume before durable recovery');cleanup(f);groups++;
 }
 {
  const f=fixture(),before=f.model.route.position;
  f.root.emit('click',button('travel',''));f.root.emit('click',button('travel',''));
  assert.equal(f.calls.length,1,'duplicate event click cannot overlap accepted work');assert.equal(frames.size,0);
  win.emit('blur');f.resolve();await settle();
  assert.deepEqual(f.calls.map(x=>x.type),['move','pause']);assert.equal(f.durable.position,before+.4);cleanup(f);groups++;
 }
 {
  const f=fixture('battle');f.delay('action');
  assert.equal([...timers.values()].filter(t=>t.delay===380).length,0,'automation defaults off');
  f.root.emit('click',button('autoBattle',''));assert.equal([...timers.values()].filter(t=>t.delay===380).length,1);
  const [id,timer]=[...timers].find(([,t])=>t.delay===380);timers.delete(id);timer.fn();
  assert.equal(f.calls.length,1);assert.equal(f.calls[0].type,'action');
  doc.hidden=true;doc.emit('visibilitychange');f.resolve();await settle();
  assert.deepEqual(f.calls.map(i=>i.type),['action','pause']);assert.equal(timers.size,timerBaseline);assert.equal(frames.size,0);assert.equal(f.sounds.length,0);cleanup(f);groups++;
 }
 {
  const f=fixture('battle');f.root.emit('click',button('autoBattle',''));f.root.emit('click',button('autoBattle',''));
  assert.equal([...timers.values()].filter(t=>t.delay===380).length,0,'turn automation cancels immediately');cleanup(f);groups++;
 }
 {
  const f=fixture();f.delay('none');f.root.emit('click',button('travel',''));
  for(let n=0;n<100;n++)await settle();
  assert.equal(f.calls.filter(i=>i.type==='move').length,32,'bounded audited arrival');
  assert.equal(f.calls.at(-1).type,'interact');assert.equal(f.calls.length,33);
  assert.equal(f.model.screen,'battle');assert.equal(frames.size,0,'event starts without any RAF');cleanup(f);groups++;
 }
 {
  const f=fixture();win.emit('keydown',{code:'KeyD'});win.emit('keydown',{code:'ArrowLeft'});await settle();
  assert.equal(f.calls.length,0,'physical walking keys no longer change progress');assert.equal(frames.size,0);
  assert.equal(f.root.querySelector('.exv-explore-controls').hidden,true);cleanup(f);groups++;
 }
 {
  const f=fixture();f.root.emit('click',button('travel',''));win.emit('blur');
  assert.equal(frames.size,0);assert.equal(f.calls.length,1);assert.equal(f.calls[0].type,'move');f.resolve();await settle();
  assert.deepEqual(f.calls.map(i=>i.type),['move','pause'],'suspension blocks event transition after arrival receipt');cleanup(f);groups++;
 }
 {
  const f=fixture();f.delay('none');f.model.route.step=3;f.root.emit('click',button('law','pierce'));
  for(let n=0;n<100;n++)await settle();
  assert.equal(f.calls.at(-1).type,'choice');assert.equal(f.calls.at(-1).lawId,'pierce');assert.equal(f.calls.filter(i=>i.type==='choice').length,1);
  assert.equal(f.calls.filter(i=>i.type==='interact').length,0,'explicit discovery does not trigger a different event');cleanup(f);groups++;
 }
 console.log(`expedition delayed lifecycle PASS: ${groups} groups; queued pause/flush, hidden sound+enemy stop, UID/close/error boundaries (mock)`);
}finally{globalThis.setTimeout=originals.setTimeout;globalThis.clearTimeout=originals.clearTimeout;await vite?.close();for(const [key,value]of Object.entries(originals)){if(value===undefined)delete globalThis[key];else globalThis[key]=value;}}
