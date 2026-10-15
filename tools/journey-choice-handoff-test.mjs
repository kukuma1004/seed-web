import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import vm from 'node:vm';
import {LAWS,synergyHint} from '../src/laws.js';
import {ALL_FORMS,FORMS,DISCOVERY_FORMS,eligibleForms,soloReady,formUpgradeLine} from '../src/forms.js';
import * as progression from '../src/progression.js';
import {RUN_BONUSES,applyRunBonus,emptyRunBonuses} from '../src/run-bonuses.js';
import {RELICS,RELIC_STORAGE,ownedRelics,keepRelic,emptyRelics} from '../src/relics.js';
import {DASH_EVOLUTIONS,createDashState} from '../src/dash-evolution.js';

const source=readFileSync(new URL('../src/main.js',import.meta.url),'utf8');
const fn=name=>{const start=source.indexOf('function '+name+'('),end=source.indexOf('\nfunction ',start+1);assert(start>=0&&end>start,name);return source.slice(start,end);};
const classes=()=>({add(){},remove(){}});
// Explicit DOM adapter for actual render/event handlers, not a browser claim.
// Replacing innerHTML creates new buttons; retained old callbacks model queued
// clicks/keys from the previous pane. No layout, hit testing or pixels here.
function ui(){
 let renders=0;
 const parse=html=>Array.from(html.matchAll(/<button\b([^>]*)>/g),match=>{
  const attributes=Object.fromEntries(Array.from(match[1].matchAll(/([\w-]+)="([^"]*)"/g),a=>[a[1],a[2]]));
  const dataset={};for(const [key,value] of Object.entries(attributes))if(key.startsWith('data-'))dataset[key.slice(5).replace(/-([a-z])/g,(_,c)=>c.toUpperCase())]=value;
  return {attributes,dataset,onclick:null,closest:()=>bonus};
 });
 const matches=(node,selector)=>selector.startsWith('#')?node.attributes.id===selector.slice(1):Object.hasOwn(node.attributes,selector.slice(1,-1));
 const label={textContent:''},toast={textContent:''};
 const bonus={classList:classes(),set innerHTML(value){this.html=value;root.buttons=root.buttons.filter(b=>!b.attributes['data-run-bonus']);}};
 const root={hidden:false,classList:classes(),buttons:[],html:'',
  set innerHTML(value){this.html=value;this.buttons=parse(value);renders++;},get innerHTML(){return this.html;},
  insertAdjacentHTML(_where,value){this.html+=value;this.buttons.push(...parse(value));},
  querySelectorAll(selector){return this.buttons.filter(b=>matches(b,selector));},
  querySelector(selector){return selector==='[data-relic-source]'?label:this.querySelectorAll(selector)[0]||null;}
 };
 const $=selector=>selector==='#overlay'?root:selector==='#toast'?toast:root.querySelector(selector);
 return {root,$,label,toast,renders:()=>renders,document:{querySelectorAll:selector=>root.querySelectorAll(selector)}};
}
function cardHost({bonus=['move','power'],survival=false}={}){
 const dom=ui(),events={resets:0,saves:0,exit:0,mirror:0,evolution:0,sounds:[],pulse:0};
 const c=vm.createContext({...progression,LAWS,FORMS:ALL_FORMS,FIRST_FORMS:FORMS,DISCOVERY_FORMS,eligibleForms,soloReady,formUpgradeLine,synergyHint,
  ...dom,mode:'playing',touch:{reset(){events.resets++;}},keys:new Set(),keyboardDash:false,cardChoiceOwner:null,
  guideTarget:null,profile:{forms:[]},chosen:new Set(['burst']),levels:new Map([['burst',1]]),heldForms:new Map(),mutations:new Map(),mutated:new Set(),
  canTakeEvolution:()=>true,gardenGuideLaw:()=>null,gardenFx:{},mirrorSession:null,runBonuses:emptyRunBonuses(),runBonusOffer:bonus,
  survivalSession:survival?{}:null,survivalPendingChoice:null,kills:0,roomCleared:false,invuln:0,shootCD:7,
  hp:70,maxPlayerHp:()=>100,choicesTaken:0,rng:()=>.99,bossPet:{id:null},inAustinRoom:()=>false,finalBossName:()=>'',choiceGoal:()=>12,
  parseMutationChoice:()=>null,lawArt:()=>'',formArt:()=>'',formLawHint:()=>'',orbitCore:()=>null,rerollUnlocked:()=>true,rerollUsed:false,
  secondFusionOptions:()=>[],awakenOptions:()=>[],awakenable:()=>true,developerRun:true,expansionJourney:null,
  runBonusCard:id=>`<button data-run-bonus="${id}">${id}</button>`,applyRunBonus,RUN_BONUSES,displayHp:String,
  player:{position:{}},vfx:{pulse(){events.pulse++;},burst(){},evolution(){}},audio:{play:id=>events.sounds.push(id)},
  syncLaws(){c.chosen=new Set(c.levels.keys());},beginEvolution(){events.evolution++;c.mode='evolving';c.touch.reset();c.keys.clear();c.keyboardDash=false;},
  saveSurvival(){events.saves++;},openExit(){events.exit++;},advanceMirrorFloor(){events.mirror++;},
  withMutationOffer:offered=>offered,offerChoices:()=>['burst'],rareRunBonusOffers:()=>[],rareRunBonusChance:()=>.02});
 vm.runInContext(fn('cardChoice')+'\n'+fn('finishChoice'),c);
 return {c,dom,events,open:(offers=['burst'])=>c.cardChoice(true,offers)};
}
{
 const h=cardHost({survival:true});h.open();const bonus=h.dom.root.querySelectorAll('[data-run-bonus]'),law=h.dom.root.querySelector('[data-choice]');
 bonus[0].onclick();for(let i=0;i<20000;i++){bonus[0].onclick();bonus[1].onclick();}
 assert.equal(h.c.runBonuses.move,1,'one rare bonus per law choice, even if the pane stays open');assert.equal(h.c.runBonuses.power,0);
 assert.equal(h.events.pulse,1);assert.equal(h.events.saves,1,'do not persist a half-complete choice transaction');assert.equal(h.c.mode,'cards');
 law.onclick();law.onclick();assert.equal(h.c.levels.get('burst'),2);assert.equal(h.events.evolution,1);
 h.c.keys.add('KeyW');h.c.keyboardDash=true;h.c.finishChoice();assert.equal(h.c.mode,'playing');assert(h.dom.root.hidden);
 assert.equal(h.c.keys.size,0);assert.equal(h.c.keyboardDash,false);assert.equal(h.c.survivalPendingChoice,null);assert.equal(h.c.runBonusOffer,null);assert.equal(h.events.saves,2);
}
{
 const h=cardHost();h.open();const oldBonus=h.dom.root.querySelector('[data-run-bonus]'),oldLaw=h.dom.root.querySelector('[data-choice]'),reroll=h.dom.$('#reroll-laws');
 reroll.onclick();const count=h.dom.renders();oldBonus.onclick();oldLaw.onclick();reroll.onclick();
 assert.equal(h.dom.renders(),count,'stale reroll cannot replace the new pane');assert.equal(h.c.runBonuses.move,0);assert.equal(h.c.levels.get('burst'),1);
 h.dom.root.querySelectorAll('[data-run-bonus]')[1].onclick();assert.equal(h.c.runBonuses.power,1);assert.equal(h.c.mode,'cards');
}
{
 const h=cardHost({bonus:['heal','power']});h.c.hp=100;h.open();const buttons=h.dom.root.querySelectorAll('[data-run-bonus]');
 buttons[0].onclick();assert.equal(h.c.runBonusOffer.length,2,'a rejected full-health heal must leave the valid bonus available');buttons[1].onclick();assert.equal(h.c.runBonuses.power,1);
}
{
 const h=cardHost({survival:true});h.open();h.c.keys.add('KeyD');h.c.keyboardDash=true;h.c.roomCleared=true;
 const old=h.dom.root.querySelector('[data-choice]');h.open([]);
 assert(h.dom.root.hidden,'an empty/consumed fixed offer closes the previous pane');assert.equal(h.c.mode,'playing');assert.equal(h.c.keys.size,0);assert.equal(h.c.keyboardDash,false);
 assert.equal(h.events.exit,1);assert.equal(h.events.saves,2);assert.equal(h.c.survivalPendingChoice,null);assert.equal(h.c.runBonusOffer,null);assert(h.c.invuln>=.7);assert.equal(h.c.shootCD,0);
 old.onclick();assert.equal(h.c.levels.get('burst'),1);
}
{
 const h=cardHost({bonus:[]});h.c.mirrorSession={floor:2};h.c.roomCleared=true;h.open([]);
 assert(h.dom.root.hidden);assert.equal(h.events.mirror,1);assert.equal(h.events.exit,0);assert.equal(h.events.saves,0,'mirror routing must not become a survival save');
}
// Navigation callbacks from a previous card render may not reopen submenus.
{
 const h=cardHost();let opened=0;Object.assign(h.c,{eligibleForms:()=>[{id:'fake'}],FORMS:{...ALL_FORMS,fake:{name:'fixture'}},offerForm(){opened++;h.c.mode='forms';}});
 h.open();const old=h.dom.$('#change-form');h.open();old.onclick();assert.equal(opened,0);h.dom.$('#change-form').onclick();assert.equal(opened,1);
}

const relicSource=readFileSync(new URL('../src/relic-ui.js',import.meta.url),'utf8').replace(/^import .*;\r?\n/gm,'').replace(/export /g,'');
function relicHost(state=emptyRelics()){
 const dom=ui(),done=[];const c=vm.createContext({RELICS,RELIC_STORAGE,ownedRelics,keepRelic,relicArt:()=>''});vm.runInContext(relicSource,c);
 return {dom,state,done,open(offers=['mirror','crystal','coil'],name='보스'){c.showRelicChoice(dom.root,state,offers,id=>done.push(id),null,name);}};
}
{
 const h=relicHost();h.open();const list=h.dom.root.querySelectorAll('[data-relic]'),skip=h.dom.$('#skip-relic');
 list[0].onclick();const keep=h.dom.root.querySelectorAll('[data-keep]')[0],back=h.dom.$('#relic-back');
 list[1].onclick();assert(h.dom.root.innerHTML.includes(RELICS.mirror.name),'a stale list choice cannot replace the current detail');
 back.onclick();keep.onclick();assert.equal(h.state.equipped,null,'a dismissed detail cannot award its relic');
 h.dom.root.querySelectorAll('[data-relic]')[1].onclick();h.dom.root.querySelectorAll('[data-keep]')[0].onclick();
 const renders=h.dom.renders();for(let i=0;i<20000;i++){skip.onclick();back.onclick();list[2].onclick();keep.onclick();}
 assert.equal(h.dom.renders(),renders,'discarded callbacks must not rebuild the overlay');
 assert.equal(h.state.equipped,'crystal');assert.deepEqual(h.state.stored,[]);assert.deepEqual(h.done,['crystal']);
}
{
 const h=relicHost();h.open();h.dom.root.querySelector('[data-relic]').onclick();const old=h.dom.root.querySelector('[data-keep]');
 h.open(['coil'],'<img onerror=alert(1)>');old.onclick();assert.equal(h.state.equipped,null,'a new chest on the shared overlay invalidates the previous chest');
 assert.equal(h.dom.label.textContent,'<img onerror=alert(1)>의 유물함');assert(!h.dom.root.innerHTML.includes('<img onerror='));
 const skip=h.dom.$('#skip-relic');skip.onclick();skip.onclick();assert.deepEqual(h.done,[null]);assert.equal(h.state.equipped,null);
}
{
 const h=relicHost({equipped:'echo',stored:['core','coil','stride']});h.open(['mirror']);h.dom.root.querySelector('[data-relic]').onclick();
 const replace=h.dom.root.querySelectorAll('[data-replace]');replace[1].onclick();replace[2].onclick();
 assert.deepEqual(h.state,{equipped:'echo',stored:['core','mirror','stride']});assert.deepEqual(h.done,['mirror']);
}
{
 const h=relicHost({equipped:'mirror',stored:[]});h.open(['mirror','coil']);h.dom.root.querySelector('[data-relic]').onclick();
 h.dom.root.querySelector('[data-keep]').onclick();assert.equal(h.done.length,0,'a failed keep must not complete the chest');
 h.dom.$('#relic-back').onclick();h.dom.root.querySelectorAll('[data-relic]')[1].onclick();h.dom.root.querySelectorAll('[data-keep]')[1].onclick();
 assert.deepEqual(h.state,{equipped:'mirror',stored:['coil']});assert.deepEqual(h.done,['coil']);
}

// Execute the actual dash reward and the ordinary exit->relic callback. Only
// event-boundary resets are added; no frame loop, combat math or save format.
for(const choose of [false,true]){
 const h=cardHost();let resumed=0;Object.assign(h.c,{dashRewardPending:true,dashState:createDashState(),DASH_EVOLUTIONS,createDashState,wardensDefeated:1,
  dashEvolutionCards:()=>Object.keys(DASH_EVOLUTIONS).map(id=>`<button data-dash-evolution="${id}"></button>`).join('')});
 vm.runInContext(fn('offerDashEvolution'),h.c);assert(h.c.offerDashEvolution(()=>resumed++));h.c.keys.add('KeyW');h.c.keyboardDash=true;
 const pick=choose?h.dom.root.querySelector('[data-dash-evolution]'):h.dom.$('#keep-dash');pick.onclick();pick.onclick();
 assert.equal(h.c.keys.size,0);assert.equal(h.c.keyboardDash,false);assert(h.dom.root.hidden);assert.equal(resumed,1);assert.equal(h.c.mode,'playing');
}
{
 const h=cardHost();let kept,exits=0;Object.assign(h.c,{relicRewardPending:true,relics:emptyRelics(),dashRewardPending:false,
  relicOffers:()=>['mirror'],relicFx:()=>null,showRelicChoice(_root,_state,_offers,done){kept=done;},
  stage:0,saveBoundary(){exits++;},gate:{visible:false},isAct3:()=>false,region:'garden',exitOpen:false});
 vm.runInContext(fn('openExit'),h.c);h.c.openExit();assert.equal(h.c.mode,'relics');h.c.keys.add('KeyA');h.c.keyboardDash=true;kept();
 assert.equal(h.c.keys.size,0);assert.equal(h.c.keyboardDash,false);assert(h.dom.root.hidden);assert.equal(h.c.mode,'playing');assert(h.c.exitOpen);assert.equal(exits,1);
}
console.log('Journey choice handoff PASS: real card/relic/dash/exit handlers with explicit DOM adapters and real progression/bonus/relic rules; once-only rewards, stale-pane rejection, failed-pick retry, empty-offer close, pending-save boundaries and return-input reset. No browser/touch-device/FPS claim.');
