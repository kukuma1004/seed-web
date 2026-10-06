import assert from 'node:assert/strict';
import {existsSync,readFileSync} from 'node:fs';
import {createServer} from 'vite';
import {createRoster,recruitInstance,setParty} from '../src/expedition/roster.js';
import {newExpeditionRoute,advanceExpeditionRoute,EXPEDITION_GARDENS} from '../src/expedition/world.js';

// Exercise the real UI module against a tiny DOM surface. The mock controller
// records commands so this tests the view boundary without simulating rules.
let fieldDOM=false;
class Element {
 constructor(){this.dataset={};this.style={};this.hidden=false;this.disabled=false;this.innerHTML='';this.textContent='';this.handlers=new Map();this.children=new Map();this.classList={add(){},remove(){},toggle(){}};}
 querySelector(selector){if(!this.children.has(selector)){const node=new Element();if(fieldDOM&&selector==='.exv-explore'){node.dataset.field='layered';node.style.setProperty=(key,value)=>{node.style[key]=value;};node.getBoundingClientRect=()=>({width:512,height:320});}this.children.set(selector,node);}return this.children.get(selector);}
 querySelectorAll(){return [];}
 addEventListener(type,fn){this.handlers.set(type,fn);}
 removeEventListener(type,fn){if(this.handlers.get(type)===fn)this.handlers.delete(type);}
 emit(type,target){this.handlers.get(type)?.({target,pointerId:3,preventDefault(){},code:target?.code||''});}
 append(child){this.child=child;}
 remove(){this.removed=true;}
 contains(){return true;}
 closest(){return this;}
 setPointerCapture(){}
 setAttribute(){}
}
const original={document:globalThis.document,window:globalThis.window,Image:globalThis.Image,requestAnimationFrame:globalThis.requestAnimationFrame,cancelAnimationFrame:globalThis.cancelAnimationFrame,setTimeout:globalThis.setTimeout,clearTimeout:globalThis.clearTimeout};
const doc=new Element(),win=new Element(),host=new Element(),timers=new Map(),frames=new Map();let timerId=0,rafId=0,cancelledRaf=0;
doc.hidden=false;doc.createElement=()=>new Element();globalThis.document=doc;globalThis.window=win;
globalThis.Image=class{set src(value){this._src=value;}get src(){return this._src;}};
globalThis.requestAnimationFrame=fn=>{frames.set(++rafId,fn);return rafId;};globalThis.cancelAnimationFrame=id=>{cancelledRaf++;frames.delete(id);};
globalThis.setTimeout=(fn,delay)=>{timers.set(++timerId,{fn,delay});return timerId;};globalThis.clearTimeout=id=>timers.delete(id);

let vite;
try{
 vite=await createServer({server:{middlewareMode:true},appType:'custom'});
 const {mountExpedition}=await vite.ssrLoadModule('/src/expedition/view.js');
 assert.equal(typeof mountExpedition,'function');
 const roster=createRoster({owner:'ui-owner',channel:'review'});
 const ids=['pierce','split','orbit','frost','burst','gravity','reflect','recall','chain'].map((speciesId,n)=>{const id=`unit-${n}`;assert.ok(recruitInstance(roster,{instanceId:id,speciesId}));return id;});
 assert.ok(setParty(roster,ids.slice(0,8)));
 const {emptyExpeditionNursery}=await vite.ssrLoadModule('/src/expedition/nursery.js');
 const model={screen:'home',roster,meta:{...emptyExpeditionNursery(),cores:{chain:0},awakenMaterials:0},route:null,battle:null,notice:'',saveState:'saved',events:[],lastResult:null};
 const calls=[],audioCalls=[],ticks=[];let ownerNow='ui-owner',nextEvents=[];
 const controller={state:()=>model,dispatch(intent){calls.push(intent);if(intent.type==='depart'){model.route=newExpeditionRoute({runId:'ui-run',gardenId:intent.gardenId,difficulty:intent.difficulty,partyIds:roster.party});advanceExpeditionRoute(model.route);model.screen='explore';}else if(intent.type==='move')model.route.position+=intent.dx*intent.dt*4;else if(intent.type==='interact'){model.screen='battle';model.battle={battleId:'ui-battle',phase:'fight',round:1,units:[{id:'unit-0',instanceId:'unit-0',speciesId:'pierce',side:'ally',slot:0,hp:92,maxHp:92,level:1,status:{}},{id:'enemy-0',instanceId:'enemy-0',speciesId:'meadow-normal-0',side:'enemy',slot:0,hp:40,maxHp:40,level:1,status:{}}],order:['unit-0','enemy-0'],acted:[],pending:[],warnings:[]};}return{ok:true,events:nextEvents,saveState:'saved'};},close(){this.closed=true;}};
 const timersBeforeMount=timers.size,timerIdsBeforeMount=new Set(timers.keys());
 const sharedAudio={setScene:id=>audioCalls.push(id),setPaused:()=>{},unlock:()=>{},tick:dt=>ticks.push(dt),play:()=>{}};
 const view=mountExpedition({host,storage:{},owner:'ui-owner',currentOwner:()=>ownerNow,createController:()=>controller,audio:sharedAudio});
 const root=host.child,main=root.querySelector('.exv-main');
 assert.match(main.innerHTML,/여덟 전투 정원/);
 for(const g of Object.values(EXPEDITION_GARDENS))assert.match(main.innerHTML,new RegExp(g.name));
 assert.match(main.innerHTML,/전열/);assert.match(main.innerHTML,/대기/);
 assert.equal(frames.size,0,'idle HOME never schedules a render frame');
 assert.deepEqual(audioCalls,['garden'],'mount selects HOME music even after another mode');
 assert.equal(timers.size,timersBeforeMount+1,'one foreground music clock, independent of rendering');
 const button=(key,value)=>Object.assign(new Element(),{dataset:{[key]:value}});
 // Choosing a form must never spend a core. A separate explicit click commits.
 const {EXPEDITION_SPECIES}=await vite.ssrLoadModule('/src/expedition/species.js');
 const chosen=Object.values(EXPEDITION_SPECIES).find(s=>s.kind==='solo'&&s.parents.includes('pierce'));
 const seed=roster.instances[ids[0]],previousLevel=seed.level;seed.level=5;model.meta.cores.pierce=1;
 const group=new Element(),select=group.querySelector('[data-evolve]');select.dataset.evolve=seed.instanceId;select.value=chosen.id;select.matches=q=>q==='[data-evolve]';select.closest=()=>group;
 root.emit('change',select);assert.equal(calls.length,0);assert.equal(group.querySelector('[data-evolve-confirm]').disabled,false);assert.match(group.querySelector('[data-evolve-info]').textContent,/관통 법칙핵 1\/1/);
 const confirm=button('evolveConfirm',seed.instanceId);confirm.closest=q=>q==='.exv-evolution'?group:confirm;
 model.meta.cores.pierce=0;root.emit('click',confirm);assert.equal(calls.length,0,'recheck resources before committing');
 model.meta.cores.pierce=1;root.emit('click',confirm);await Promise.resolve();await Promise.resolve();assert.deepEqual(calls.pop(),{type:'evolve',instanceId:seed.instanceId,to:chosen.id});
 seed.level=previousLevel;model.meta.cores.pierce=0;
 root.emit('click',button('intent','depart'));await Promise.resolve();await Promise.resolve();
 assert.deepEqual(calls[0],{type:'depart',gardenId:'meadow',difficulty:1});
 assert.match(main.innerHTML,/exv-explore/);assert.equal(view.isActive(),true);
 assert.equal(frames.size,0,'idle exploration never schedules a render frame');
 const movementBefore=calls.filter(x=>x.type==='move').length;
 // Vite may own another 100ms timer while its watcher starts. Exercise the
 // newly mounted view's clock, not an unrelated pre-existing timer.
 const [musicId,music]=[...timers].find(([id,timer])=>!timerIdsBeforeMount.has(id)&&timer.delay===100);
 timers.delete(musicId);music.fn();
 assert.deepEqual(ticks,[.1]);assert.equal(frames.size,0);assert.equal(calls.filter(x=>x.type==='move').length,movementBefore,'music does not move or save the party');
 root.emit('pointerdown',button('hold','1'));await Promise.resolve();await Promise.resolve();
 assert.equal(frames.size,1,'holding move creates exactly one RAF');
 root.emit('pointerup',new Element());assert.equal(frames.size,0,'release cancels movement RAF');
 win.emit('keydown',{code:'KeyD'});await Promise.resolve();await Promise.resolve();assert.equal(frames.size,1);
 win.emit('keyup',{code:'KeyD'});assert.equal(frames.size,0,'keyboard release also stops rendering');
 doc.hidden=true;doc.emit('visibilitychange');await Promise.resolve();await Promise.resolve();
 assert.equal(timers.size,timersBeforeMount,'background cancels music and enemy timers');assert.equal(frames.size,0);
 doc.hidden=false;doc.emit('visibilitychange');assert.equal(timers.size,timersBeforeMount,'a backgrounded run waits for explicit resume');
 root.querySelector('.exv-notice').textContent='원정이 일시정지됐어요';
 root.emit('click',button('intent','resume'));await Promise.resolve();await Promise.resolve();await Promise.resolve();
 assert.equal(root.querySelector('.exv-notice').textContent,'','successful resume clears the stale pause notice');
 assert.equal(timers.size,timersBeforeMount+1,'resuming restores one music clock');assert.equal(frames.size,0);
 root.emit('click',button('intent','interact'));await Promise.resolve();await Promise.resolve();
 assert.match(main.innerHTML,/기본공격/);assert.match(main.innerHTML,/기술 1/);assert.match(main.innerHTML,/각성기/);assert.match(main.innerHTML,/대기 3/);
 assert.match(main.innerHTML,/후열<\/span><span>전열 →/);assert.match(main.innerHTML,/← 전열/);
 assert.match(main.innerHTML,/관통 발현/);assert.match(main.innerHTML,/한 열 타격/);
 model.battle.units[0].level=8;
 model.battle.units.splice(1,0,{id:'unit-1',instanceId:'unit-1',speciesId:'split',side:'ally',slot:1,hp:80,maxHp:80,level:8,status:{}});
 model.battle.resonances=[{id:'split-pierce:unit-0:unit-1',speciesId:'split-pierce',memberIds:['unit-0','unit-1'],actions:[],used:false}];
 root.emit('click',button('target','enemy-0'));
 assert.match(main.innerHTML,/data-resonance=/,'eligible pair adds a separate resonance button');
 root.emit('click',button('resonance','split-pierce:unit-0:unit-1'));await Promise.resolve();await Promise.resolve();
 assert.ok(calls.some(x=>x.type==='resonance'&&x.resonanceId==='split-pierce:unit-0:unit-1'&&x.targetId==='enemy-0'));
 root.emit('click',button('action','guard'));await Promise.resolve();await Promise.resolve();
 assert.ok(calls.some(x=>x.type==='action'&&x.kind==='guard'));
 nextEvents=[{type:'action',unitId:'unit-0',kind:'attack',seq:1},{type:'damage',unitId:'unit-0',targetId:'enemy-0',amount:16,absorbed:0,seq:2}];
 root.emit('click',button('action','attack'));await Promise.resolve();await Promise.resolve();
 assert.match(main.innerHTML,/exv-impact/);assert.match(main.innerHTML,/−16/);assert.match(main.innerHTML,/exv-pose-sequence/);assert.match(main.innerHTML,/--pose-preparation-x:0%/);assert.match(main.innerHTML,/--pose-impact-x:66.666/);assert.equal(frames.size,0,'sprite phase progression uses no RAF loop');
 const [feedbackId,feedback]=[...timers].find(([,timer])=>timer.delay===720);
 assert.ok(feedback,'one short feedback timer');timers.delete(feedbackId);feedback.fn();nextEvents=[];
 root.emit('click',button('target','enemy-0'));assert.doesNotMatch(main.innerHTML,/class="exv-impact"/,'selection never replays expired damage');
 assert.equal(frames.size,0,'finite attack feedback never starts a render loop');
 model.battle.order=['enemy-0','unit-0'];root.emit('click',button('target','enemy-0'));
 assert.ok(timers.size>timersBeforeMount,'enemy action must be scheduled once');
 const beforeOwnerChange=calls.length;ownerNow='different-owner';root.emit('click',button('action','guard'));
 assert.equal(calls.length,beforeOwnerChange,'changed owner cannot command a battle');
 assert.equal(timers.size,timersBeforeMount,'owner change cancels the pending enemy action');
 view.close();assert.equal(controller.closed,true);assert.equal(root.removed,true);assert.ok(cancelledRaf>=1);assert.equal(timers.size,timersBeforeMount);assert.equal(root.handlers.size,0);assert.equal(win.handlers.size,0);assert.equal(doc.handlers.size,0);
 ownerNow='ui-owner';model.screen='home';model.battle=null;model.route=null;
 for(let n=0;n<20;n++){
  const cycle=mountExpedition({host,owner:'ui-owner',currentOwner:()=>ownerNow,createController:()=>controller,audio:sharedAudio});
  assert.equal(timers.size,timersBeforeMount+1);assert.equal(frames.size,0);cycle.close();
  assert.equal(timers.size,timersBeforeMount);assert.equal(frames.size,0);assert.equal(win.handlers.size,0);assert.equal(doc.handlers.size,0);
 }
 for(const outcome of [{ok:true},{ok:false,reason:'durable pending retained'}]){
  let resolveClose,exited=0,observed;model.review=false;model.saveState='pending';
  const asyncController={state:()=>model,dispatch:controller.dispatch,close:()=>new Promise(resolve=>{resolveClose=resolve;})};
  const accountView=mountExpedition({host,owner:'ui-owner',currentOwner:()=>ownerNow,createController:()=>asyncController,audio:sharedAudio,onClose:result=>{exited++;observed=result;}}),accountRoot=host.child;
  assert.equal(accountRoot.querySelector('.exv-save').textContent,'이동 기록 저장 대기');assert.equal(accountRoot.querySelector('.exv-brand span').textContent,'원정대 · 계정 기록');
  const leaving=accountView.close();assert.equal(accountRoot.removed,undefined);assert.equal(exited,0);assert.equal(accountRoot.querySelector('.exv-save').textContent,'저장 확인 중');assert.equal(timers.size,timersBeforeMount);assert.equal(win.handlers.size,0);
  accountView.close();resolveClose(outcome);await leaving;assert.equal(accountRoot.removed,true);assert.equal(exited,1);assert.deepEqual(observed,outcome);
 }
 const oldResizeObserver=globalThis.ResizeObserver,observers=new Set();
 globalThis.ResizeObserver=class{constructor(callback){this.callback=callback;observers.add(this);}observe(target){this.target=target;}disconnect(){this.target=null;}};
 try{
  fieldDOM=true;model.screen='explore';model.battle=null;model.route=newExpeditionRoute({runId:'field-run',gardenId:'meadow',difficulty:1,partyIds:roster.party});advanceExpeditionRoute(model.route);
  for(let n=0;n<20;n++){
   const fieldView=mountExpedition({host,owner:'ui-owner',currentOwner:()=>ownerNow,createController:()=>controller}),fieldRoot=host.child,field=fieldRoot.querySelector('.exv-main').querySelector('.exv-explore'),observer=[...observers].at(-1);
   assert.equal(observer.target,field);assert.equal(field.style['--field-width'],'640px');assert.equal(frames.size,0,'a stationary layered field never starts RAF');
   observer.callback([{target:field,contentRect:{width:390,height:793}}]);assert.equal(field.style['--field-width'],'1189.5px');assert.equal(field.style['--field-height'],'793px');assert.equal(frames.size,0);
   if(n===0){fieldRoot.emit('click',button('intent','interact'));await Promise.resolve();await Promise.resolve();assert.equal(observer.target,null,'exploration observer detaches on battle');model.screen='explore';model.battle=null;}
   fieldView.close();assert.equal(observer.target,null,'close detaches the only field observer');assert.equal(frames.size,0);assert.equal(timers.size,timersBeforeMount);assert.equal(win.handlers.size,0);assert.equal(doc.handlers.size,0);
  }
 }finally{fieldDOM=false;if(oldResizeObserver===undefined)delete globalThis.ResizeObserver;else globalThis.ResizeObserver=oldResizeObserver;}
 delete model.review;model.saveState='saved';
 for(const id of ['meadow','blossom','autumn','snow','moon','fire','shadow','dream'])assert.ok(existsSync(new URL(`../public/assets/garden/v2/${id}/base.webp`,import.meta.url)));
 const css=readFileSync(new URL('../src/expedition/view.css',import.meta.url),'utf8');assert.match(css,/min-height:44px/);assert.match(css,/max-width:850px/);assert.match(css,/max-width:500px/);
 console.log('expedition view contract PASS: eight gardens, 5+3, explore→battle, idle RAF0, foreground music, background stop, 20 mount/close mock cycles');
}finally{
 await vite?.close();for(const [key,value]of Object.entries(original)){if(value===undefined)delete globalThis[key];else globalThis[key]=value;}
}
