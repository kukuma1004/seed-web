import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import vm from 'node:vm';
import * as THREE from 'three';
import {createJourneyPresentation,journeyPresentationContext} from '../src/journey-presentation.js';
import {createJourneyPresentationView} from '../src/journey-presentation-view.js';
import {AUSTIN,createAustin,tickAustin} from '../src/austin.js';
import {ALWAYS_BEGINNER,ALWAYS_PHASES,createAlwaysBeginner,tickAlwaysBeginner} from '../src/always-beginner.js';
import {BASE_SLIDE,STADIUM_BASES,baseSlideFor,stadiumBaseAt} from '../src/stadium.js';

for(const mode of ['playing','cards','forms','evolving','dash-evolution']){
 assert(journeyPresentationContext('garden',mode));
 assert(journeyPresentationContext('stadium',mode));
 for(const act of ['garden','stadium'])for(let excluded=0;excluded<4;excluded++){const other=[false,false,false,false];other[excluded]=true;assert(!journeyPresentationContext(act,mode,...other));}
}
for(const mode of ['dead','ready','duel','defense','adventure','expedition'])assert(!journeyPresentationContext('garden',mode));
for(const act of ['skyway','crosswind','crystalGorge'])assert(!journeyPresentationContext(act,'playing'));

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

// The stadium engine owns its two real transitions and sounds. Observing
// pending -> committed cannot retrigger, move a boss, or replace its telegraphs.
events.reset();const always=createAlwaysBeginner(combatScene),alwaysAt=always.g.position.clone();
assert(events.observeBoss(always,ALWAYS_BEGINNER.name,ALWAYS_PHASES.rookie.label));
assert(always.g.position.equals(alwaysAt));
assert.equal(state.kicker,'밤구장의 결전');assert(state.detail.includes('베이스'));assert(!state.detail.includes('시계'));
for(const [hp,next] of [[.65,'rally'],[.32,'finish']]){
 always.hp=always.maxHp*hp;tickAlwaysBeginner(always,.01,hooks);assert.equal(always.phasePending,next);
 assert(events.observeBoss(always,ALWAYS_BEGINNER.name,ALWAYS_PHASES[next].label));const serial=state.serial;
 assert.equal(state.title,ALWAYS_PHASES[next].label);assert(!state.kicker.includes('오스틴'));
 for(let i=0;i<125;i++){tickAlwaysBeginner(always,.01,hooks);const position=always.g.position.clone();events.observeBoss(always,ALWAYS_BEGINNER.name,ALWAYS_PHASES[next].label);assert(always.g.position.equals(position));}
 assert.equal(always.phase,next);assert.equal(state.serial,serial);
}
always.hp=0;always.dead=true;assert(events.defeat(always,ALWAYS_BEGINNER.name,2));assert.equal(state.kicker,'구장에 환호가 번진다');
assert.equal(sounds,2,'only one added entry cue, no duplicate phase warnings');

// A real accepted base transfer has a separate bounded channel. Important
// boss notices stay intact, and landing only fires at the actual destination.
events.reset();events.observeBoss(createAlwaysBeginner(combatScene),ALWAYS_BEGINNER.name,'초심');
const notice=state.serial,travel=state.travel,slideStart={...STADIUM_BASES[0]},slide=baseSlideFor(slideStart);
assert(!events.beginSlide(null,slideStart));assert(!events.beginSlide(slide,{x:NaN,z:0}));
assert(events.beginSlide(slide,slideStart));assert.equal(state.serial,notice);assert.equal(state.kind,'boss');
assert(!events.beginSlide(slide,slideStart),'one accepted transfer cannot repeatedly restart its accent');
assert(!events.landSlide(slideStart),'no invented landing at the departure plate');
events.step(.1,false);assert.equal(travel.age,0);assert.equal(state.age,0);
assert(events.landSlide({x:slide.targetX,z:slide.targetZ}));assert.equal(travel.stage,'land');
assert(!events.landSlide({x:slide.targetX,z:slide.targetZ}));
for(let i=0;i<10;i++)events.step(.1);assert(!travel.active);assert.equal(state.serial,notice);
assert(events.beginSlide(slide,slideStart));events.cancelSlide();assert(!travel.active);
assert(events.beginSlide(slide,slideStart));events.reset();assert(!travel.active,'restart/restore cannot carry a stale route');
assert(events.beginSlide(slide,slideStart));events.cover();assert(!travel.active,'covered reward screens discard a stale route');
assert(events.beginSlide(slide,slideStart));for(let i=0;i<20000;i++){events.step(.1);assert.equal(state.travel,travel);}assert(!travel.active,'an interrupted route cannot live forever');

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
events.reset();events.beginSlide(slide,slideStart);view.update(state,point,true,true,false,.1);
assert(root.visible&&banner.hidden);assert.equal(root.children.length,3,'base feedback reuses the celebration mesh pool');
for(const arc of root.children.slice(0,2)){assert.equal(arc.position.x,slide.targetX);assert.equal(arc.position.z,slide.targetZ);}
const route=Array.from(leaves.instanceMatrix.array);events.step(.1);view.update(state,point,true,true,false,.1);assert.deepEqual(Array.from(leaves.instanceMatrix.array),route,'reduced-motion route is static');
view.update(state,point,true,false,true,.1);assert(!leaves.visible&&root.visible);
events.landSlide({x:slide.targetX,z:slide.targetZ});view.update(state,point,true,false,false,.1);assert(!leaves.visible,'landing is a short ground accent, not a new particle burst');
events.law('새 법칙','성장이 경로보다 우선',point);view.update(state,point,true,false,false,.1);
assert.equal(root.position.x,point.x);for(const arc of root.children.slice(0,2)){assert.equal(arc.position.x,0);assert.equal(arc.scale.x,1,'reusing a route cannot leave growth arcs at the old destination');}
for(const from of STADIUM_BASES){
 events.reset();const trip=baseSlideFor(from);events.beginSlide(trip,from);view.update(state,point,true,true,false,.1);
 const matrix=new THREE.Matrix4();leaves.getMatrixAt(2,matrix);
 const centre=new THREE.Vector3().applyMatrix4(matrix),tip=new THREE.Vector3(0,.64,0).applyMatrix4(matrix).sub(centre),direction=new THREE.Vector3(trip.dx,0,trip.dz);
 assert(tip.dot(direction)>.3,'each flattened leaf points toward its actual next base');
 const geometries=root.children.map(x=>x.geometry),materials=root.children.map(x=>x.material);
 for(let i=0;i<120;i++){events.step(1/60);view.update(state,point,true,false,false,1/60);}
 assert.deepEqual(root.children.map(x=>x.geometry),geometries);assert.deepEqual(root.children.map(x=>x.material),materials);
}
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
function completion(saved,region='garden'){
 const c={mode:'playing',region,developerRun:false,survivalSession:null,mirrorSession:null,trainingSession:null,expansionJourney:null,paused:false,journeyCompletionPending:false,
  score:900,elapsed:120,decorations:0,results:0,currentJourneyOwner:'guest',account:{user:()=>null},runStorage:{},enemyShots:[],
  isAct2:()=>region==='stadium',isAct3:()=>false,CLEAR_ALL_STATS:.01,JOHAN_CLEAR_TITLE:'j',ALWAYS_CLEAR_TITLE:'a',AUSTIN_CLEAR_TITLE:'s',
  seedTitle:{isJohanClearUnlocked:()=>false,isAlwaysClearUnlocked:()=>false,isAustinClearUnlocked:()=>false},
  remember:()=>({saved}),readDiscoveries:()=>({bosses:saved?[region==='stadium'?'alwaysclear':'austinclear']:[]}),protectJourneyBossReceipts:()=>saved,clearCheckpoint:()=>saved,actStore:()=>({}),
  clearBonus:()=>123,release(){},pauseBuild:{setSaveStatus(){}},$:()=>({textContent:''}),
  journeyPresentationView:{decorateClear(){c.decorations++;}},togglePause(){c.paused=true;},showEnd(){c.results++;}};
 vm.createContext(c);vm.runInContext(completeSource,c);return c;
}
const blocked=completion(false);assert.equal(blocked.completeRun(),false);assert.equal(blocked.score,900);assert.equal(blocked.results,0);assert.equal(blocked.decorations,0);assert(blocked.paused&&blocked.journeyCompletionPending);
const durable=completion(true);assert.equal(durable.completeRun(),true);assert.equal(durable.score,1023);assert.equal(durable.results,1);assert.equal(durable.decorations,1);assert.equal(durable.completeRun(),true);assert.equal(durable.score,1023);assert.equal(durable.decorations,1,'result decoration is not a second completion');
const stadiumBlocked=completion(false,'stadium');assert.equal(stadiumBlocked.completeRun(),false);assert.equal(stadiumBlocked.decorations,0);assert.equal(stadiumBlocked.score,900);
const stadiumDurable=completion(true,'stadium');assert.equal(stadiumDurable.completeRun(),true);assert.equal(stadiumDurable.decorations,1);assert.equal(stadiumDurable.score,1023);

// Execute the shipping movement branch rather than a duplicate toy controller.
// Synthetic inputs prove host timing and isolation, not physical-device play.
const start=main.indexOf('let sliding=false;if(player.userData.dashTime>0)'),end=main.indexOf('if(sliding)constrainToArena',start);assert(start>0&&end>start);
const movement=new vm.Script('(()=>{'+main.slice(start,end)+'})()');
for(const survival of [false,true]){
 const transfer=createJourneyPresentation(),c={dt:.04,region:'stadium',survivalSession:survival?{act:1}:null,mirrorSession:null,trainingSession:null,expansionJourney:null,roomCleared:false,
  player:{position:new THREE.Vector3(0,0,4.2),userData:{dashTime:0}},move:new THREE.Vector3(),lastMove:new THREE.Vector3(),baseSlideDir:new THREE.Vector3(),baseSlideTarget:new THREE.Vector3(),baseSlideRemaining:new THREE.Vector3(),baseSlideTime:0,baseSlideCooldown:0,baseSlideLock:-1,
  BASE_SLIDE,STADIUM_BASES,SURVIVAL_BASES:STADIUM_BASES,SURVIVAL_SLIDE:{speed:BASE_SLIDE.speed,cooldown:.8},stadiumBaseAt,baseSlideFor,
  stadium:{baseAt:stadiumBaseAt,tryBaseSlide:(point,cooldown,blocked)=>baseSlideFor(point,cooldown,true,blocked)},isAct3:()=>false,PLAYER_SPEED:6,journeyTravelScale:()=>1,journeySignatureMoveScale:()=>1,journeySignature:{},runMoveScale:()=>1,runBonuses:{},masteryRate:()=>0,titleState:{moveSpeed:1},playerSlow:0,hasteTime:0,vfx:{dash(){},pulse(){}},audio:{play(){}},
  journeyPresentation:transfer,journeyPresentationEnabled:()=>!survival};
 vm.createContext(c);movement.runInContext(c);assert(c.baseSlideTime>0);assert.equal(transfer.state().travel.active,!survival);
 const duration=c.baseSlideTime;for(let i=0;i<20&&c.baseSlideTime>0;i++)movement.runInContext(c);
 assert.equal(c.baseSlideTime,0);assert.equal(c.player.position.x,STADIUM_BASES[1].x);assert.equal(c.player.position.z,STADIUM_BASES[1].z);assert.equal(c.baseSlideLock,1);
 assert.equal(transfer.state().travel.stage,survival?'none':'land');assert(duration>.4&&duration<.5,'presentation preserves the actual transfer speed');
 c.baseSlideCooldown=0;movement.runInContext(c);assert.equal(c.baseSlideTime,0,'landing lock still prevents an automatic next transfer');
}
// Boss-specific loot heading uses textContent, including when returning from
// a candidate, and skipping keeps the original completion callback.
const relicSource=readFileSync('src/relic-ui.js','utf8').replace(/^import .*;\r?$/gm,'').replaceAll('export function ','function ');
const relicContext={};vm.createContext(relicContext);vm.runInContext(relicSource,relicContext);
assert(main.includes('relicFx,finalBossName()'));
for(const name of ['오스틴','항상초심','<img src=x onerror=alert(1)>']){
 const label={textContent:''},skip={},root={hidden:true,innerHTML:'',querySelectorAll:()=>[],querySelector:selector=>selector==='[data-relic-source]'?label:skip};
 let skipped=false;relicContext.showRelicChoice(root,{},[],value=>{skipped=value===null;},null,name);
 assert.equal(label.textContent,name+'의 유물함');assert(!root.innerHTML.includes(name));skip.onclick();assert(skipped);
}
console.log('Journey presentation: Austin/Always phase engines, actual base movement/landing/lock, survival isolation, pause/restore, bounded Three reuse/reduced motion/disposal, both durable clears and actual-boss loot heading PASS.');
