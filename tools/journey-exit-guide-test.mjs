import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import vm from 'node:vm';
import * as THREE from 'three';
import {EXIT,canUseExit} from '../src/journey.js';
import {journeyExitButtonLabel,journeyRouteCue} from '../src/journey-purpose.js';
import {createJourneyPresentation,journeyPresentationContext} from '../src/journey-presentation.js';
import {createJourneyPresentationView} from '../src/journey-presentation-view.js';
import {createExpansionJourney,advanceExpansionJourney} from '../src/expansion-journey.js';

const main=readFileSync('src/main.js','utf8').replaceAll('\r\n','\n');
const start=main.indexOf('function presentJourneyTransition(){'),end=main.indexOf('\nfunction ring(',start),hostSource=main.slice(start,end);
function host(){
 const controller=createJourneyPresentation(),arena={exit:{x:-2,z:-6.5,radius:1.75}},levels=[];
 const c={arena,EXIT,region:'garden',stage:0,cycle:0,austinsDefeated:0,mode:'playing',paused:false,roomCleared:false,exitOpen:false,
  survivalSession:null,mirrorSession:null,trainingSession:null,expansionJourney:null,expansionPublicEntry:null,expansionChannel:'inspection',
  journeyPresentation:controller,journeyPresentationContext,journeyRouteCue,finalBossName:()=> '실제 보스',finalBossAhead:()=>false,audio:{setMusicIntensity:n=>levels.push(n)}};
 vm.createContext(c);vm.runInContext(hostSource,c);return {c,controller,guide:controller.state().exitGuide};
}
for(const region of ['garden','stadium','skyway']){
 const {c,controller,guide}=host();let copyCalls=0;c.journeyRouteCue=input=>{copyCalls++;return journeyRouteCue(input);};c.region=region;c.presentJourneyTransition();assert(!guide.active);
 c.roomCleared=true;c.presentJourneyTransition();assert(!guide.active,'clear alone cannot mark an exit');
 c.exitOpen=true;c.mode='cards';c.presentJourneyTransition();assert(!guide.active,'choose the reward first');
 c.mode='playing';c.presentJourneyTransition();assert.equal(guide.active,region!=='skyway');
 const serial=controller.state().serial;
 for(let i=0;i<200;i++){controller.step(.1);c.presentJourneyTransition();}
 assert(!controller.state().active);assert.equal(controller.state().serial,serial,'the banner is still once per room');
 assert.equal(copyCalls,1,'steady guide frames do not allocate new route copy');
 assert.equal(guide.active,region!=='skyway','manual direction survives the short banner; automatic flight needs none');
 assert.equal(guide.x,region==='skyway'?0:c.arena.exit.x);
 c.exitOpen=false;c.presentJourneyTransition();assert(!guide.active,'next-room loading cannot retain an old exit');
}
for(const flag of ['paused','survivalSession','mirrorSession','trainingSession']){
 const {c,guide}=host();c.roomCleared=c.exitOpen=true;c.presentJourneyTransition();assert(guide.active);
 c[flag]=true;c.presentJourneyTransition();assert(!guide.active);
}
for(const mode of ['ready','cards','forms','relics','evolving','dash-evolution','dead','duel','defense','adventure','expedition','garden']){
 const {c,guide}=host();c.roomCleared=c.exitOpen=true;c.presentJourneyTransition();c.mode=mode;c.presentJourneyTransition();assert(!guide.active,mode);
}
for(const act of ['crosswind','crystalGorge']){
 const {c,guide}=host();c.region=act;c.expansionJourney=createExpansionJourney(act,0,413);c.roomCleared=c.exitOpen=true;c.presentJourneyTransition();
 assert(guide.active);assert.equal(guide.radius,c.arena.exit.radius);
 c.arena.exit={x:8,z:1,radius:2};c.presentJourneyTransition();assert.equal(guide.x,8);assert.equal(guide.z,1);assert.equal(guide.radius,2);
 c.expansionJourney.phase='finished';c.presentJourneyTransition();assert(!guide.active);
}
// Real interaction rule shares the marked centre/radius, but still owns input,
// pause and actual travel. Presentation cannot open or move the player.
const {c,controller,guide}=host();c.roomCleared=c.exitOpen=true;const arenaBefore=JSON.stringify(c.arena);c.presentJourneyTransition();
assert.equal(JSON.stringify(c.arena),arenaBefore);assert.deepEqual({...guide},{active:true,...c.arena.exit});
for(const offset of [guide.radius-.01,guide.radius+.01])assert.equal(canUseExit({open:true,mode:'playing',paused:false,x:guide.x+offset,z:guide.z,exit:guide}),offset<guide.radius);
for(const point of [null,{x:NaN,z:1,radius:2},{x:1,z:Infinity,radius:2},{x:1,z:2,radius:0}]){controller.trackExit(point);assert(!guide.active);}
controller.trackExit(c.arena.exit);controller.cover();assert(!guide.active);controller.trackExit(c.arena.exit);controller.reset();assert(!guide.active);
const auto=main.match(/if\(skywayAdvance>0\)\{skywayAdvance-=dt;if\(skywayAdvance<=0&&exitOpen&&isAct3\(region\)\)\{useExit\(true\);return;\}\}/)?.[0];assert(auto,'real automatic Act 3 branch is retained');
let advances=0;const timer={skywayAdvance:.95,dt:.1,exitOpen:true,region:'skyway',isAct3:r=>r==='skyway',useExit:()=>advances++};vm.createContext(timer);
for(let i=0;i<10;i++)vm.runInContext('(()=>{'+auto+'})()',timer);assert.equal(advances,1);

const node=()=>({dataset:{},style:{},hidden:true,textContent:'',setAttribute(){},append(){},remove(){}}),doc={body:{append(){}},createElement:node};
const scene=new THREE.Scene(),view=createJourneyPresentationView(scene,{document:doc}),root=scene.children[0],arcs=root.children.slice(0,2),leaves=root.children[2],events=createJourneyPresentation(),state=events.state(),player={x:0,z:0};
const geometry=root.children.map(m=>m.geometry),materials=root.children.map(m=>m.material);
assert.equal(view.metrics().meshes,3);assert.equal(view.metrics().textures,0);
const update=(reduced=false,low=false)=>view.update(state,player,true,reduced,low,1/60);
for(const target of [{x:8,z:0,radius:1.65},{x:-8,z:0,radius:1.75},{x:0,z:8,radius:2},{x:0,z:-8,radius:2}]){
 events.trackExit(target);update();assert(root.visible&&leaves.visible);assert.equal(leaves.count,6);
 for(const arc of arcs){assert.equal(arc.position.x,target.x);assert.equal(arc.position.z,target.z);assert(Math.abs(arc.scale.x*.94-target.radius)<1e-9);}
 for(let i=0;i<6;i++){
  const matrix=new THREE.Matrix4();leaves.getMatrixAt(i,matrix);
  const centre=new THREE.Vector3().applyMatrix4(matrix),tip=new THREE.Vector3(0,.64,0).applyMatrix4(matrix).sub(centre);
  assert(tip.dot(new THREE.Vector3(target.x,0,target.z))>0,'all six leaves point towards the actual exit');
  assert(centre.length()<1.7,'a local direction fan is not a fake straight path through walls');
 }
}
const matrixVersion=leaves.instanceMatrix.version,matrices=Array.from(leaves.instanceMatrix.array),serial=state.serial;
for(let i=0;i<20000;i++){events.trackExit({x:0,z:-8,radius:2});events.step(1/60);update(i%2===0);}
assert.equal(leaves.instanceMatrix.version,matrixVersion,'idle/reduced-motion frames do not upload static leaf transforms');
assert.deepEqual(Array.from(leaves.instanceMatrix.array),matrices);assert.equal(state.serial,serial);
assert.deepEqual(root.children.map(m=>m.geometry),geometry);assert.deepEqual(root.children.map(m=>m.material),materials);
player.x=1;update();assert.equal(leaves.instanceMatrix.version,matrixVersion+1,'moving the player updates direction once');
player.x=0;player.z=-7;update();assert(root.visible&&!leaves.visible,'near the exit only the real interaction wreath remains');
player.z=0;update(false,true);assert(root.visible&&leaves.visible);assert.equal(leaves.count,2,'low quality retains the two functional direction leaves');update(true,false);assert(leaves.visible);assert.equal(leaves.count,6);
// A flight, celebration or covered menu cannot leave old transforms cached.
events.beginSlide({duration:.4,targetX:3,targetZ:2},player);update();assert.equal(arcs[0].position.x,3);
events.law('성장','연출 우선',player);update();assert.equal(arcs[0].position.x,0);assert.equal(arcs[0].scale.x,1);
events.cover();assert(!state.exitGuide.active);events.reset();events.trackExit({x:0,z:-8,radius:2});update();assert.equal(root.rotation.y,0);assert.equal(root.scale.x,1);assert.equal(arcs[0].position.z,-8);
const restoredVersion=leaves.instanceMatrix.version;view.update(state,player,false);assert(!root.visible);update();assert.equal(leaves.instanceMatrix.version,restoredVersion+1);
events.observeBoss({hp:10,type:'austin',g:{position:player}},'오스틴');update();assert(!root.visible,'boss instructions take priority over an old route');
events.reset();events.trackExit({x:0,z:-8,radius:2});update();let geometryDisposals=0,materialDisposals=0;
for(const g of new Set(geometry))g.addEventListener('dispose',()=>geometryDisposals++);for(const m of new Set(materials))m.addEventListener('dispose',()=>materialDisposals++);
view.dispose();view.dispose();assert.equal(scene.children.length,0);assert.equal(geometryDisposals,2);assert.equal(materialDisposals,2);

// Run the shipping HUD expression as well as the pure copy helper. Mobile
// strips only the keyboard suffix; stage/win information must remain intact.
const hud=main.match(/setText\(\$\('#exit-room'\),journeyExitButtonLabel\([^\n]*?\}\)\);/)?.[0];assert(hud);
for(const expansion of [null,...['crosswind','crystalGorge'].flatMap(act=>{const course=createExpansionJourney(act,4,413),boss=createExpansionJourney(act,4,413);advanceExpansionJourney(boss);return [course,boss];})]){
 for(const stage of [0,4])for(const bossAhead of [false,true])for(const wins of [1,2,3]){
  const campaign=expansion?{bossWins:{[expansion.act==='crosswind'?'crosswindKeeper':'crystalGardener']:wins}}:null;
  const input={stage,bossAhead,expansion,campaign},pc=journeyExitButtonLabel(input),mobile=journeyExitButtonLabel({...input,touch:true});
  assert(pc.endsWith(' · E'));assert.equal(pc.slice(0,-4),mobile);assert(!mobile.endsWith(' · E'));
  const element={},context={stage,finalBossAhead:()=>bossAhead,touch:{enabled:true},expansionJourney:expansion,expansionChannel:'public',expansionPublicEntry:{campaign},journeyExitButtonLabel,$:()=>element,setText:(e,t)=>{e.textContent=t;}};
  vm.createContext(context);vm.runInContext(hud,context);assert.equal(element.textContent,mobile);
 }
}
console.log('Journey exit guide PASS: actual all-act host/exit radius, automatic flight, mode/reward/priority isolation, persistent bounded Three pool, 20k idle frames without matrix uploads, motion/low/pause/disposal, shipping mobile and keyboard HUD labels. Engine/VM/Three only; native browser/device play remains separate.');
