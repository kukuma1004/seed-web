import assert from 'node:assert/strict';
import {CRYSTAL_DEFENSE_OBJECTIVE,expansionObjectiveReleased} from '../src/expansion-objective.js';
import {readFileSync} from 'node:fs';
import vm from 'node:vm';
import * as THREE from 'three';
import * as journey from '../src/expansion-journey.js';
import * as siege from '../src/crystal-siege-rules.js';
import {checkpointExpansionBoss} from '../src/act-expansion-runtime.js';
import {createExpansionEntry,validExpansionEntry} from '../src/expansion-run-save.js';
import {constrainToArena} from '../src/arena.js';
import {createCrystalSiegeView} from '../src/crystal-siege-view.js';

const main=readFileSync(new URL('../src/main.js',import.meta.url),'utf8');
const harness=readFileSync(new URL('./crystal-siege-endurance-test.mjs',import.meta.url),'utf8');
const copy=x=>JSON.parse(JSON.stringify(x)),near=(a,b)=>assert(Math.abs(a-b)<1e-7,`${a} != ${b}`);
const source=(name,next)=>main.slice(main.indexOf('function '+name+'('),main.indexOf('\nfunction '+next+'(',main.indexOf('function '+name+'(')));
const updateSource=source('updateExpansionCourse','tickExpansionActor'),actorSource=source('tickExpansionActor','waveExpansionJourney');
const hostSource=harness.slice(harness.indexOf('function host(j){'),harness.indexOf('// No enemy is removed'));
const courseSource=harness.slice(harness.indexOf('function course({'),harness.indexOf("group('Actual host end-to-end")).replace(' return result;',' this.lastHost=h;this.lastJourney=j;return result;');
const scope={THREE,journey,siege,assert,vm,createExpansionEntry,validExpansionEntry,constrainToArena,source,updateSource,actorSource,copy,earnedEntries:[],initialRun:{version:1,cycle:0,region:'garden',stage:0,mode:'entry',hp:100,kills:0,elapsed:0,rules:[],mutated:[],forms:{},inventory:{potion:2},score:0,choicesTaken:0,choiceKills:0}};
vm.createContext(scope);vm.runInContext(hostSource+'\n'+courseSource,scope);
const passed=[],measurements=[];
const group=(name,run)=>{run();passed.push(name);console.log('PASS',name);};

function actualHost(saved){
 const j=journey.restoreExpansionJourney(copy(saved)),h=scope.host(j);assert(j);
 Object.assign(h,{survivalSession:null,activeGauge:{},isBoss:e=>!!e.expansionBoss,chargeActive(){},bossCharge:()=>0,elapsed:0,chosen:new Set(),vfx:{impact(){}},combatAnalysis:{damage(_kind,n){h.applied=(h.applied||0)+n;},utility(){},kill(){}},enemyDown:()=>assert.fail('This bounded review does not kill the original boss'),expansionTerrainDirty:false,lines:[],line(a,b){h.lines.push({a:{x:a.x,z:a.z},b:{x:b.x,z:b.z}});}});
 h.expansionTerrain=journey.createCrystalCombatBridge(j.course.walls);h.expansionBolt=q=>h.enemyShots.push(copy(q));h.collide=()=>{};
 vm.runInContext(source('damageEnemy','enemyDown'),h);
 const e={dead:false,expansionActor:true,expansionBoss:true,type:'expansion-boss',hp:2400,maxHp:2400,g:{position:new THREE.Vector3(3,0,-2.5),rotation:{}},state:'recover',takenScale:1,hit:0};h.enemies.push(e);return{j,h,e};
}

for(const hz of [20,60]){
 const receipt=scope.course({seed:413,hz,layout:'turrets',shotDamage:40});assert(receipt.boss&&receipt.kills===165);
 const saved=journey.checkpointExpansionJourney(scope.lastJourney),dt=1/hz;
 group(`${hz}Hz actual earned carry and repeated boss restore`,()=>{
  for(let n=0;n<3;n++){const j=journey.restoreExpansionJourney(copy(saved));assert.deepEqual(journey.checkpointExpansionJourney(j),saved);assert.deepEqual(j.siege.pads,saved.siege.pads);assert.equal(j.siege.resources,saved.siege.resources);assert.equal(j.siege.core.hp,saved.siege.core.hp);}
  const j=journey.restoreExpansionJourney(copy(saved));
  for(const p of j.siege.pads)if(p.kind&&p.hp>0)for(const w of j.course.walls){const overlap=Math.abs(w.x-p.x)<w.w/2+.75&&Math.abs(w.z-p.z)<w.d/2+.75;if(overlap)assert(w.broken&&w.hp===0,'Alive paid facility must not be buried at boss entry or restore');}
  // A valid old local boss checkpoint can contain the original intact wall:
  // restore must reconcile the two independently persisted course/siege fields.
  const old=copy(saved);old.course.walls.find(w=>w.id==='crystal-4-0').hp=148;const recovered=journey.restoreExpansionJourney(old);assert(recovered);assert(recovered.course.walls.find(w=>w.id==='crystal-4-0').broken);assert.deepEqual(recovered.siege.pads,saved.siege.pads);assert.equal(recovered.siege.resources,saved.siege.resources);
  const ordinary=journey.createExpansionJourney('crystalGorge',4,413);journey.advanceExpansionJourney(ordinary);assert(ordinary.course.walls.every(w=>!w.broken),'Classic public boss retains all original walls');
 });
 group(`${hz}Hz real damageEnemy excludes generic recovery bonus; core-open multiplier applies once`,()=>{
  for(const scale of [1,1.3]){const{j,h,e}=actualHost(saved);e.takenScale=scale;const before=siege.checkpointCrystalSiege(j.siege);h.updateExpansionCourse(0);assert.equal(e.hp,2400);
   for(let n=0;n<hz*3;n++)h.updateExpansionCourse(dt);
   near(2400-e.hp,78*scale);near(h.applied,78*scale);assert.equal(j.siege.core.hp,before.core.hp);assert.equal(j.siege.resources,before.resources);assert.deepEqual(j.siege.nodes,before.nodes);assert.equal(j.siege.spawned,before.spawned);assert.equal(j.siege.out.snares.length,0);assert.equal(j.siege.out.spawns.length,0);
   measurements.push({hz,actualBossScale:scale,actualTurretDamage3s:+h.applied.toFixed(4),syntheticCourseKills:receipt.kills});}
 });
 group(`${hz}Hz canonical cover takes paid shot before boss and opens only after real destruction`,()=>{
  const{j,h,e}=actualHost(saved);for(const p of j.siege.pads)if(p.id!=='pad-1')p.hp=0;const pad=j.siege.pads[1];assert(pad.kind==='turret'&&pad.level===2);pad.cooldown=0;e.g.position.set(3,0,2);
  const cover=j.course.walls.find(w=>w.id==='crystal-4-4');assert(cover&&!cover.broken);const before=cover.hp;h.updateExpansionCourse(dt);near(cover.hp,before-13);near(e.hp,2400);assert(h.expansionTerrainDirty);assert(h.lines.at(-1).b.z<cover.z&&h.lines.at(-1).b.z<e.g.position.z,'Blocked VFX ends on nearest free side of cover');
  cover.hp=26;h.expansionTerrain.sync();for(let n=0;n<4*hz&&e.hp===2400;n++)h.updateExpansionCourse(dt);assert(cover.broken&&cover.hp===0);near(2400-e.hp,13);assert(!j.siege.out.snares.length);
  pad.hp=0;const hp=e.hp;for(let n=0;n<hz;n++)h.updateExpansionCourse(dt);near(e.hp,hp);
 });
 group(`${hz}Hz actual boss regrowth defers occupied facilities and returns after their destruction`,()=>{
  const{j,h,e}=actualHost(saved),occupied=j.course.walls.find(w=>w.id==='crystal-4-0'),free=j.course.walls.find(w=>w.id==='crystal-4-3');assert(occupied.broken);free.hp=0;free.broken=true;h.expansionTerrain.sync();e.g.position.set(5,0,0);h.player.position.set(-4,0,-4);
  const invoke=()=>{Object.assign(j.boss,{state:'attack',pattern:1,timer:.4,shotIndex:0,regrow:[occupied.id,free.id]});h.tickExpansionActor(e,dt);};invoke();assert(occupied.broken&&occupied.hp===0,'Actual main occupied actors include paid pad, preventing regrowth');assert(!free.broken&&free.hp>0,'Safe empty crystal still regrows');
  j.siege.pads[2].hp=0;invoke();assert(!occupied.broken&&occupied.hp>0,'A destroyed facility no longer permanently suppresses original regrowth');
 });
 group(`${hz}Hz original authored boss state, targeting, finite bolts and vulnerability are preserved`,()=>{
  const{j,h,e}=actualHost(saved);e.g.position.set(5,0,0);h.player.position.set(-4,0,0);const baseline=journey.restoreExpansionJourney(copy(saved));baseline.siege=null;let bolts=0;
  for(let n=0;n<hz*18;n++){
   const o=journey.stepExpansionJourney(baseline,dt,{position:e.g.position,player:h.player.position,walls:baseline.course.walls,activeProjectiles:h.enemyShots.length,hpRatio:e.hp/e.maxHp});h.tickExpansionActor(e,dt);bolts+=o.bolts.length;
   assert.deepEqual(checkpointExpansionBoss(j.boss),checkpointExpansionBoss(baseline.boss));assert.equal(e.takenScale,journey.expansionBossDamageMultiplier(j.act,e.state,o.coreOpen));
  }
  assert(bolts>0&&bolts<=72);assert.equal(h.enemyShots.length,bolts);assert(h.enemyShots.every(q=>Number.isFinite(q.position.x)&&Number.isFinite(q.dir.x)));
 });
}

group('Actual cover sweep visits nearest wall first, including unsorted canonical wall storage',()=>{
 const j=journey.createExpansionJourney('crystalGorge',4,413);const nearWall=j.course.walls.find(w=>w.id==='crystal-4-4'),farWall=j.course.walls.find(w=>w.id==='crystal-4-12');
 const bridge=journey.createCrystalCombatBridge([nearWall,farWall]);const p=bridge.sweep({x:3,z:-6},{x:3,z:3},{damage:13,radius:.1});assert.equal(p.hits[0].id,farWall.id);near(farWall.hp,farWall.maxHp-13);near(nearWall.hp,nearWall.maxHp);assert(p.blocked);
});

group('Actual frame guard pauses facilities during pause and selection screens',()=>{
 const start=main.indexOf('function update(dt,time){'),end=main.indexOf('if(survivalSession?.won)',start);assert(end>start);const prefix=main.slice(start,end)+'updateExpansionCourse(dt); }';
 const h={CRYSTAL_DEFENSE_OBJECTIVE,expansionObjectiveReleased,survivalSession:null,expansionJourney:null,mode:'playing',paused:false,performance:{now:()=>0},growth:{update(){}},perfMark(){},PS:{animation:0},mirrorReadyRing:{visible:false},player:{userData:{updateArt(){}}},camera:{},cameraMoveX:0,cameraMoveZ:0,updates:0,updateExpansionCourse(){h.updates++;}};
 vm.createContext(h);vm.runInContext(prefix,h);for(const mode of ['ready','dead','choice','forms']){h.mode=mode;h.paused=false;h.update(.05,0);}h.mode='playing';h.paused=true;h.update(.05,0);assert.equal(h.updates,0);h.paused=false;h.update(.05,0);assert.equal(h.updates,1);
});

group('Actual view hides harvest/build during boss and preserves only living facility sprites',()=>{
 class Element{constructor(){this.hidden=false;this.dataset={};this.children=[];}append(...children){this.children.push(...children);}setAttribute(){}remove(){}querySelectorAll(){return this.buttons??= ['turret','snare','wall'].map(kind=>{const e=new Element();e.dataset.kind=kind;return e;});}querySelector(q){return q==='span'?(this.span??=new Element()):(this.start??=new Element());}}
 const old=globalThis.document,doc={head:new Element(),body:new Element(),createElement:()=>new Element()};globalThis.document=doc;
 try{const scene=new THREE.Scene(),v=createCrystalSiegeView(scene,{load:()=>new THREE.Texture()},'/');const s=siege.createCrystalSiege(4,1);Object.assign(s.pads[0],{kind:'turret',level:1,hp:45});Object.assign(s.pads[1],{kind:'wall',level:1,hp:0});s.phase='prep';v.update(s,{x:-3,z:-2.5},{visible:true,interactive:true,boss:true});const world=scene.children[0],sprites=world.children.filter(x=>x.isSprite),[hud,menu]=doc.body.children;assert(world.visible&&!hud.hidden&&menu.hidden);assert(sprites.slice(1,7).every(x=>!x.visible));assert(sprites[7].visible&&!sprites[8].visible);assert(hud.innerHTML.includes('보스 결전'));
  v.update(s,{x:-3,z:-2.5},{visible:true,interactive:false,boss:false});assert(menu.hidden);v.update(s,{x:-3,z:-2.5},{visible:false,interactive:true,boss:true});assert(!world.visible&&hud.hidden&&menu.hidden);v.dispose();assert.equal(scene.children.length,0);
 }finally{globalThis.document=old;}
 assert(main.includes("boss:expansionJourney?.phase==='boss'"),'Actual frame provides explicit boss display context');
});
console.log(JSON.stringify({passed,measurements},null,2));
console.log('Node actual rules + source-extracted main damage/update/actor/frame guard and real THREE view with fake DOM. Course uses explicitly bounded synthetic player hits; not actual browser/device inputs, boss win, account/cloud or release certification.');
