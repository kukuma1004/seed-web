import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import vm from 'node:vm';
import * as THREE from 'three';
import {createJourneyPresentation,journeyPresentationContext} from '../src/journey-presentation.js';
import {createJourneyPresentationView} from '../src/journey-presentation-view.js';
import {AUSTIN,createAustin,tickAustin} from '../src/austin.js';

for(const mode of ['playing','cards','forms','evolving','dash-evolution']){
 assert(journeyPresentationContext('garden',mode));
 for(let excluded=0;excluded<4;excluded++){const other=[false,false,false,false];other[excluded]=true;assert(!journeyPresentationContext('garden',mode,...other));}
}
for(const mode of ['dead','ready','duel','defense','adventure','expedition'])assert(!journeyPresentationContext('garden',mode));
for(const act of ['stadium','skyway','crosswind','crystalGorge'])assert(!journeyPresentationContext(act,'playing'));

let sounds=0;const events=createJourneyPresentation({onBossEntry:()=>sounds++}),state=events.state(),point={x:2,z:4};
const catalog={one:{name:'처음 융합'},two:{name:'다음 진화'}},held=new Map([['one',1]]);
events.reset(held);assert.equal(events.syncForms(held,catalog,true,point),null,'restored builds are a baseline, not a new reward');
held.set('one',2);events.syncForms(held,catalog,true,point);assert(!state.active,'a level increase is not a new form');
held.set('two',1);assert.equal(events.syncForms(held,catalog,true,point),'two');assert.equal(state.kind,'growth');
const serial=state.serial;events.syncForms(held,catalog,true,point);assert.equal(state.serial,serial,'one transaction cannot repeatedly announce its form');
for(let i=0;i<500;i++)assert.equal(events.step(.1,false),state);assert.equal(state.age,0,'pause cannot expire a cue');
for(let i=0;i<20000;i++)assert.equal(events.step(1/60),state);assert(!state.active);events.reset(held);assert(!state.active);

// Actual Austin phase engine, with synthetic HP boundary inputs. No browser,
// account victory, physical-device or player difficulty evidence is implied.
const combatScene=new THREE.Scene(),boss=createAustin(combatScene),before=boss.g.position.clone();
assert(events.observeBoss(boss,AUSTIN.name,'정시 근무'));assert.equal(sounds,1);
assert(boss.g.position.equals(before),'entry presentation cannot move a combat root');
for(let i=0;i<120;i++)events.observeBoss(boss,AUSTIN.name,'정시 근무');assert.equal(sounds,1);
boss.hp=boss.maxHp*AUSTIN.overtime;
const hooks={player:new THREE.Vector3(0,0,4),collide(){},clearBolts(){},bolt(){},hit(){return false;},burst(){},pulse(){},sound(){}};
tickAustin(boss,.01,hooks);assert.equal(boss.phasePending,'overtime');
assert(events.observeBoss(boss,AUSTIN.name,'야근 모드'));assert.equal(state.kind,'phase');assert.equal(state.title,'야근 모드');const phaseSerial=state.serial;
for(let i=0;i<120;i++){tickAustin(boss,.01,hooks);events.observeBoss(boss,AUSTIN.name,'야근 모드');}
assert.equal(state.serial,phaseSerial,'pending and committed phase must share one presentation event');
assert.equal(sounds,1,'phase engine owns its warning sound; presentation does not duplicate it');
const beforeDefeat=boss.g.position.clone();boss.hp=0;assert(!events.defeat(boss,AUSTIN.name,3));boss.dead=true;assert(events.defeat(boss,AUSTIN.name,3));
assert.equal(state.kind,'defeat');assert(!state.detail.includes('보상 지급'));const defeatSerial=state.serial;
assert(!events.defeat(boss,AUSTIN.name,3));assert.equal(state.serial,defeatSerial);
assert(boss.g.position.equals(beforeDefeat),'defeat presentation cannot move a combat root');
assert(!events.defeat({dead:true,hp:NaN},'invalid',3));
events.step(.1);events.cover();assert(!state.active,'defeat must not replay after an arbitrarily long reward choice');
events.syncForms(new Map(),catalog,false,point);events.syncForms(held,catalog,true,point);events.cover();assert(state.active,'a newly selected growth cue must wait for gameplay to resume');

class Element{
 constructor(tag){this.tagName=tag;this.children=[];this.dataset={};this.hidden=false;this.textContent='';this.style={};this.attributes={};this.classes=new Set();this.classList={add:x=>this.classes.add(x)};}
 append(...children){for(const c of children){c.parent=this;this.children.push(c);}}
 setAttribute(k,v){this.attributes[k]=v;}
 remove(){if(this.parent)this.parent.children=this.parent.children.filter(x=>x!==this);}
 querySelector(selector){return this.children.find(x=>selector==='h2'?x.tagName==='h2':x.classes.has(selector.slice(1)))||null;}
}
const toast=new Element('div');toast.textContent='다음 진화 Lv.1 · 두 법칙이 한 칸으로 합쳐졌습니다';
const doc={body:new Element('body'),createElement:tag=>new Element(tag),getElementById:id=>id==='toast'?toast:null},scene=new THREE.Scene(),view=createJourneyPresentationView(scene,{document:doc});
const root=scene.getObjectByName('journey-celebration'),banner=doc.body.children[0],leaves=root.children[2];
assert.equal(root.children.length,3);assert.equal(doc.body.children.length,1);assert.equal(banner.children.length,3);
for(const mesh of root.children)assert(mesh.material.forceSinglePass,'flat translucent leaves/arcs must not silently double the three-draw budget');
assert.equal(banner.attributes['aria-live'],'polite');
events.law('관통','곧게 뻗는 첫 법칙',point,0xb7ead4);events.step(.2);view.update(state,point,true,false,false,.1);
assert(root.visible);assert(banner.hidden,'first law already has a growth panel; do not stack a second banner');
events.syncForms(new Map(),catalog,false,point);events.syncForms(held,catalog,true,point);events.step(.1);view.update(state,point,true,true,false,.1);
assert(!banner.hidden);assert.equal(banner.children[1].textContent,'다음 진화');
assert.equal(toast.textContent,'','remove only the matching duplicate fusion toast');
toast.textContent='회피 봉인 · 걸어서 피하세요';events.reset();events.syncForms(held,catalog,true,point);events.step(.1);view.update(state,point,true,true,false,.1);assert.equal(toast.textContent,'회피 봉인 · 걸어서 피하세요','danger notices must remain visible');
const stable=Array.from(leaves.instanceMatrix.array);events.step(.1);view.update(state,point,true,true,false,.1);
assert.deepEqual(Array.from(leaves.instanceMatrix.array),stable,'reduced motion keeps leaf poses stationary');assert.equal(root.rotation.y,0);assert.equal(root.scale.x,1);
view.update(state,point,true,false,true,.1);assert(!leaves.visible,'low quality keeps only two thin arcs');
view.update(state,point,false,false,false,.1);assert(!root.visible&&banner.hidden,'pause and other modes hide all owned visuals');
const panel=new Element('section'),heading=new Element('h2'),score=new Element('div');score.classes.add('final-score');panel.append(heading,score);heading.textContent='여정 완주';view.decorateClear(panel);
assert(heading.classes.has('journey-clear-heading'));assert.equal(heading.textContent,'여정 완주');
let geometryDisposals=0,materialDisposals=0;for(const g of new Set(root.children.map(m=>m.geometry)))g.addEventListener('dispose',()=>geometryDisposals++);for(const m of new Set(root.children.map(m=>m.material)))m.addEventListener('dispose',()=>materialDisposals++);
view.dispose();view.dispose();assert.equal(scene.children.length,0);assert.equal(doc.body.children.length,0);assert.equal(geometryDisposals,2);assert.equal(materialDisposals,2);

const main=readFileSync('src/main.js','utf8'),css=readFileSync('src/journey-presentation.css','utf8'),viewSource=readFileSync('src/journey-presentation-view.js','utf8');
assert(main.indexOf('journeyPresentationView.decorateClear')>main.indexOf('showEnd(null,{cleared:true,newTitle,bonus})'),'clear flourish follows durable completion, never awards it');
assert(main.includes("!reset&&journeyPresentationEnabled()&&['cards','forms'].includes(mode)"));
assert(main.includes('boss.phasePending||boss.phase'),'warn for the actual pending phase, without waiting for the first faster attack');
assert(main.includes("journeyPresentationEnabled()&&!paused&&['playing','evolving'].includes(mode)"));
assert(!/requestAnimationFrame|setInterval|setTimeout|TextureLoader|PointLight/.test(viewSource));
assert(css.includes('pointer-events:none'));assert(css.includes('prefers-reduced-motion'));assert(css.includes('max-height:500px'));
// Execute the actual completion host, including its failed durable-save branch.
// Storage/UI adapters are explicit mocks; this is not live account evidence.
const normalized=main.replaceAll('\r\n','\n'),completeSource=normalized.slice(normalized.indexOf('function completeRun('),normalized.indexOf('\nfunction finalBossName('));
function completion(saved){
 const c={mode:'playing',region:'garden',developerRun:false,survivalSession:null,mirrorSession:null,trainingSession:null,expansionJourney:null,paused:false,journeyCompletionPending:false,
  score:900,elapsed:120,decorations:0,results:0,currentJourneyOwner:'guest',account:{user:()=>null},runStorage:{},enemyShots:[],
  isAct2:()=>false,isAct3:()=>false,CLEAR_ALL_STATS:.01,JOHAN_CLEAR_TITLE:'j',ALWAYS_CLEAR_TITLE:'a',AUSTIN_CLEAR_TITLE:'s',
  seedTitle:{isJohanClearUnlocked:()=>false,isAlwaysClearUnlocked:()=>false,isAustinClearUnlocked:()=>false},
  remember:()=>({saved}),readDiscoveries:()=>({bosses:saved?['austinclear']:[]}),protectJourneyBossReceipts:()=>saved,clearCheckpoint:()=>saved,actStore:()=>({}),
  clearBonus:()=>123,release(){},pauseBuild:{setSaveStatus(){}},$:()=>({textContent:''}),
  journeyPresentationView:{decorateClear(){c.decorations++;}},togglePause(){c.paused=true;},showEnd(){c.results++;}};
 vm.createContext(c);vm.runInContext(completeSource,c);return c;
}
const blocked=completion(false);assert.equal(blocked.completeRun(),false);assert.equal(blocked.score,900);assert.equal(blocked.results,0);assert.equal(blocked.decorations,0);assert(blocked.paused&&blocked.journeyCompletionPending);
const durable=completion(true);assert.equal(durable.completeRun(),true);assert.equal(durable.score,1023);assert.equal(durable.results,1);assert.equal(durable.decorations,1);assert.equal(durable.completeRun(),true);assert.equal(durable.score,1023);assert.equal(durable.decorations,1,'result decoration is not a second completion');
console.log('Journey presentation: actual Austin phase boundary, event duplicates, restore/pause/mode isolation, stable state, reduced motion, bounded Three resources/disposal and durable-clear ordering PASS.');
