import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import vm from 'node:vm';
import * as THREE from 'three';
import {createJourneyPresentation,journeyPresentationContext} from '../src/journey-presentation.js';
import {createJourneyPresentationView} from '../src/journey-presentation-view.js';
import {createJourneySignature,stepJourneySignature,creditJourneySignatureKill} from '../src/journey-act-signatures.js';
import * as expansionApi from '../src/expansion-journey.js';
import {createExpansionBoss,stepExpansionBoss,checkpointExpansionBoss} from '../src/act-expansion-runtime.js';
import {createCrystalSiege,harvestCrystalSiege,buildCrystalSiege,startCrystalSiegeDefense,createCrystalSiegeThreat,stepCrystalSiegeThreat} from '../src/crystal-siege-rules.js';

// Real combat rules with synthetic inputs; not native play/account evidence.
for(const act of ['crosswind','crystalGorge']){
 for(const phase of ['course','boss'])for(const mode of ['playing','cards','forms','evolving']){
  const s={act,phase};assert(journeyPresentationContext('garden',mode,null,null,null,s));
  for(const other of [[{},null,null],[null,{},null],[null,null,{}]])assert(!journeyPresentationContext('garden',mode,...other,s));
 }
 assert(!journeyPresentationContext('garden','playing',null,null,null,{act,phase:'finished'}));
}
for(const expansion of [true,{}, {act:'unknown',phase:'course'}])assert(!journeyPresentationContext('garden','playing',null,null,null,expansion));
const e=createJourneyPresentation(),state=e.state(),sig=createJourneySignature('crosswind'),player={x:3,z:0};
assert(!e.observeTactics(sig));
const enemy=()=>({dead:true,hp:0,expansionActor:true,expansionThreat:{side:'front'},g:{position:{x:6,z:0}}});
assert(creditJourneySignatureKill(sig,enemy(),player));stepJourneySignature(sig,.05,{player});
const exact=JSON.stringify(sig);assert(e.observeTactics(sig));assert.equal(state.kind,'tailwind');assert.equal(JSON.stringify(sig),exact);
const windSerial=state.serial;assert(!e.observeTactics(sig));
assert(creditJourneySignatureKill(sig,enemy(),player));assert(!e.observeTactics(sig));assert.equal(state.serial,windSerial,'a kill chain cannot spam the announcement');
e.cover();assert(!state.active);
for(let i=0;i<24;i++){e.step(.1);stepJourneySignature(sig,.1,{player});e.observeTactics(sig);}
assert(creditJourneySignatureKill(sig,enemy(),player));assert(e.observeTactics(sig),'a later genuinely new wind can announce again');
e.reset();assert(!e.observeTactics(createJourneySignature('crosswind')),'room-entry restore cannot claim an old kill');

function siegeFixture(){
 const siege=createCrystalSiege(0,413),signature=createJourneySignature('crystalGorge'),pad=siege.pads[0];
 assert(harvestCrystalSiege(siege,siege.nodes[0].id,siege.nodes[0]).ok);assert(buildCrystalSiege(siege,pad.id,'turret',pad).ok);
 return {siege,signature,pad};
}
const night=siegeFixture();e.reset();e.observeTactics(night.signature,night.siege);assert(!state.active);
assert(startCrystalSiegeDefense(night.siege).ok);stepJourneySignature(night.signature,.05,{player:night.pad,siege:night.siege});
assert(e.observeTactics(night.signature,night.siege));assert.equal(state.kind,'night');const nightSerial=state.serial;
assert(!e.observeTactics(night.signature,night.siege));assert.equal(state.serial,nightSerial);
e.cover();assert(!state.active);

const paid=siegeFixture();assert(startCrystalSiegeDefense(paid.siege).ok);e.reset();paid.pad.hp=10;
for(let i=0;i<16;i++){
 stepJourneySignature(paid.signature,.1,{player:paid.pad,siege:paid.siege});e.step(.1);
 const before=JSON.stringify(paid.siege);e.observeTactics(paid.signature,paid.siege);assert.equal(JSON.stringify(paid.siege),before,'presentation never pays, repairs or buffs a facility');
}
assert.equal(paid.pad.hp,35);assert.equal(paid.siege.resources,1);assert.equal(state.kind,'repair');
assert.equal(state.x,paid.pad.x);assert.equal(state.z,paid.pad.z);const repairSerial=state.serial;
e.observeTactics(paid.signature,paid.siege);assert.equal(state.serial,repairSerial);
for(let i=0;i<30;i++)e.step(.1);
stepJourneySignature(paid.signature,.1,{player:{x:9,z:7},siege:paid.siege});e.observeTactics(paid.signature,paid.siege);
stepJourneySignature(paid.signature,.1,{player:paid.pad,siege:paid.siege});assert(e.observeTactics(paid.signature,paid.siege));assert.equal(state.kind,'support');
e.law('빙결','keep growth',{x:0,z:0});stepJourneySignature(paid.signature,.1,{player:{x:9,z:7},siege:paid.siege});e.observeTactics(paid.signature,paid.siege);
stepJourneySignature(paid.signature,.1,{player:paid.pad,siege:paid.siege});e.observeTactics(paid.signature,paid.siege);assert.equal(state.kind,'law','support does not overwrite growth');

const danger=siegeFixture();startCrystalSiegeDefense(danger.siege);danger.siege.core.hp=52;e.reset();e.observeTactics(danger.signature,danger.siege);
const threat=createCrystalSiegeThreat({id:'real-hit',position:{x:.1,z:0},hp:30,speed:2,damage:8});let alerts=0;
for(let i=0;i<70;i++){
 stepCrystalSiegeThreat(threat,.05,danger.siege,{player:{x:7,z:6}});stepJourneySignature(danger.signature,.05,{player:{x:7,z:6},siege:danger.siege});e.step(.05);
 const before=state.serial;e.observeTactics(danger.signature,danger.siege);if(state.serial!==before&&state.kind==='core-alert')alerts++;
}
assert(danger.siege.core.hp<50);assert.equal(alerts,1,'real core hits warn once, not every frame');e.reset();e.observeTactics(danger.signature,danger.siege);assert(!state.active,'restoring a damaged core is not a new hit');

for(const id of ['crosswindKeeper','crystalGardener']){
 const model=createExpansionBoss(id,{seed:413}),actor={expansionBoss:true,expansionMotion:model,hp:2400,maxHp:2400,config:{name:expansionApi.EXPANSION_ACTS[id==='crosswindKeeper'?'crosswind':'crystalGorge'].bossName},g:{position:new THREE.Vector3(5,0,0)}};
 e.reset();let openings=0;const seen=new Set();
 for(let i=0;i<650;i++){
  if(i===180)actor.hp=2400*.54;if(i===400)actor.hp=2400*.24;
  const out=stepExpansionBoss(model,.05,{position:actor.g.position,player:{x:0,z:3},walls:[],hpRatio:actor.hp/actor.maxHp});
  e.step(.05);const before=JSON.stringify(checkpointExpansionBoss(model)),serial=state.serial;e.observeExpansionBoss(actor,out);assert.equal(JSON.stringify(checkpointExpansionBoss(model)),before);
  if(state.serial!==serial){seen.add(state.kind);if(state.kind==='opportunity'){openings++;assert.equal(expansionApi.expansionBossDamageMultiplier(id==='crosswindKeeper'?'crosswind':'crystalGorge',model.state,out.coreOpen),id==='crosswindKeeper'?1.35:1.3);}}
  if(i===0){assert.equal(state.kind,'boss');assert(!state.detail.includes('시계'));}
  if(i===180||i===400)assert.equal(state.kind,'phase');
  const same=state.serial;e.observeExpansionBoss(actor,out);assert.equal(state.serial,same,'repeated reads cannot retrigger a boss opportunity');
 }
 assert(openings>=2);assert(seen.has('phase'));actor.hp=0;assert(!e.defeat(actor,actor.config.name,3));actor.dead=true;assert(e.defeat(actor,actor.config.name,3));assert.equal(state.kicker,id==='crosswindKeeper'?'횡풍 너머에 길이 열린다':'수정 정원에 빛이 돌아온다');
 e.reset();assert(e.defeat(actor,actor.config.name,null));assert.equal(state.detail,'로컬 보스 시연 · 계정 기록과 보상 제외');assert(!state.detail.includes('/3'));
 e.cover();assert(!state.active);
}

// Same fixed mesh pool anchors a repair to the actual paid facility.
const toast={textContent:'습격 시작 · 정원의 심장을 지키세요'},node=()=>({children:[],dataset:{},style:{},hidden:false,textContent:'',setAttribute(){},append(...c){this.children.push(...c);},remove(){}});
const doc={body:{append(){}},createElement:node,getElementById:id=>id==='toast'?toast:null},scene=new THREE.Scene(),view=createJourneyPresentationView(scene,{document:doc}),root=scene.children[0];
e.reset();const f=siegeFixture();e.observeTactics(f.signature,f.siege);startCrystalSiegeDefense(f.siege);stepJourneySignature(f.signature,.1,{player:f.pad,siege:f.siege});e.observeTactics(f.signature,f.siege);e.step(.1);view.update(state,player,true,false,false,.1);assert.equal(toast.textContent,'');
const entryHint='전진·처치 → 순풍! / 모래 회피·반사판 활용';
for(const [text,expected] of [[entryHint,''],['저장하지 못했어요','저장하지 못했어요']]){e.reset();toast.textContent=text;const w=createJourneySignature('crosswind');w.tailwind=1;e.observeTactics(w);e.step(.1);view.update(state,player,true,false,false,.1);assert.equal(toast.textContent,expected,'remove only the exact duplicate entry hint; retain failures');}
e.reset();startCrystalSiegeDefense(f.siege);f.pad.hp=10;
for(let i=0;i<16;i++){stepJourneySignature(f.signature,.1,{player:f.pad,siege:f.siege});e.step(.1);e.observeTactics(f.signature,f.siege);}
assert.equal(state.kind,'repair');view.update(state,{x:9,z:7},true,true,false,.1);assert.equal(root.position.x,f.pad.x);assert.equal(root.position.z,f.pad.z);assert.equal(root.children.length,3);view.dispose();

const main=readFileSync('src/main.js','utf8').replaceAll('\r\n','\n');
// Shipping boss host drives the actual expansion engine and the observer.
const start=main.indexOf('function tickExpansionActor('),end=main.indexOf('\nfunction waveExpansionJourney(',start),journey=expansionApi.createExpansionJourney('crosswind',4,413);expansionApi.advanceExpansionJourney(journey);
const hostActor={g:new THREE.Group(),expansionBoss:true,expansionMotion:journey.boss,hp:2400,maxHp:2400,hit:0,config:{name:'횡풍의 수호자'}},hostPresentation=createJourneyPresentation();
const host={V:THREE.Vector3,enemyShots:[],expansionJourney:journey,expansionApi,player:{position:new THREE.Vector3()},expansionTerrain:null,collide(){},expansionJourneyView:{tell(){}},journeyPresentation:hostPresentation,journeyPresentationEnabled:()=>true,audio:{play(){}},$:()=>({textContent:''}),hitPlayer(){},expansionBolt(){}};
vm.createContext(host);vm.runInContext(main.slice(start,end),host);for(let i=0;i<130;i++){hostPresentation.step(.05);host.tickExpansionActor(hostActor,.05);}assert(hostPresentation.state().serial>=2);
// The real presentation host suppresses course-only hints in Act 4's boss
// arena while preserving Act 5's functional support/repair view in that arena.
const presentStart=main.indexOf('function presentJourneySignature('),presentEnd=main.indexOf('\nfunction updateEscorts(',presentStart);
const shown={expansionJourney:{act:'crosswind',phase:'boss'},mode:'playing',paused:false,roomCleared:false,survivalSession:null,mirrorSession:null,trainingSession:null,journeySignaturePresentation:{},journeySignature:{},player:{position:player},journeySignatureView:{update(){}}};
vm.createContext(shown);vm.runInContext(main.slice(presentStart,presentEnd),shown);shown.presentJourneySignature();assert(!shown.journeySignaturePresentation.visible);
shown.expansionJourney.phase='course';shown.presentJourneySignature();assert(shown.journeySignaturePresentation.visible);
shown.expansionJourney={act:'crystalGorge',phase:'boss',siege:{}};shown.presentJourneySignature();assert(shown.journeySignaturePresentation.visible);assert.equal(shown.journeySignaturePresentation.siege,shown.expansionJourney.siege);
// Execute actual exit + result hosts: failed durable finalization never
// reaches celebration or destroys the existing boss entry.
function resultFixture({saved=true,won=true,ended=true}={}){
 const nodes=new Map(),c={expansionJourney:{act:'crosswind',phase:'boss'},expansionChannel:'inspection',expansionApi,exitOpen:true,touch:{reset(){}},keys:new Set(),rankSerial:0,mode:'playing',paused:false,
  pauseBuild:{hide(){}},perfFinish(){},activeVfx:{clear(){}},cancelActive(){},activeGauge:{},gate:{visible:true},$:id=>{if(!nodes.has(id))nodes.set(id,{hidden:false,innerHTML:'',textContent:''});return nodes.get(id);},showIntro(){},
  finishExpansionEntry:()=>saved,journeyPresentationView:{decorateClear(){c.decorations++;}},decorations:0};
 vm.createContext(c);vm.runInContext(main.slice(main.indexOf('function showExpansionResult('),main.indexOf('\nfunction advancePublicExpansionLap(')),c);vm.runInContext(main.slice(main.indexOf('function exitExpansionJourney('),main.indexOf('\nfor(const material',main.indexOf('function exitExpansionJourney('))),c);
 return c;
}
const blocked=resultFixture({saved:false});blocked.exitExpansionJourney();assert.equal(blocked.expansionJourney.phase,'boss');assert(blocked.exitOpen);assert.equal(blocked.decorations,0);
const done=resultFixture();done.exitExpansionJourney();assert.equal(done.expansionJourney.phase,'finished');assert.equal(done.decorations,1);done.exitExpansionJourney();assert.equal(done.decorations,1);
for(const [won,ended] of [[false,true],[true,false]]){const c=resultFixture();c.expansionJourney.phase='finished';c.showExpansionResult(won,ended);assert.equal(c.decorations,0);}
console.log('Journey 4/5 presentation: real credited wind, paid support/repair/core hits, real boss phase/opportunity engines and shipping host, fixed repair visuals, mode isolation, and durable result gate PASS. CPU/DOM adapters; not a physical device or account run.');
