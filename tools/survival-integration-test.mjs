import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import vm from 'node:vm';
import * as THREE from 'three';
import {survivalAct,survivalActTime,survivalScaling,advanceSurvivalAct,tickSurvivalRush,SURVIVAL,SURVIVAL_BASES,SURVIVAL_SLIDE,createSurvivalSession,survivalEnemySpec,survivalSpawn,survivalChoiceKills,tickSurvival,survivalOutcome,readSurvivalRecord,recordSurvivalResult} from '../src/survival-rules.js';
import {createSpatialIndex} from '../src/spatial-index.js';
import {constrainToArena} from '../src/arena.js';
import {baseSlideFor,stadiumBaseAt,BASE_SLIDE} from '../src/stadium.js';
import {emptyInventory,addItem} from '../src/inventory.js';

// Run the actual integration functions against the real spawn/grid/inventory
// rules. No renderer/network/browser is needed to check their state transitions.
const main=readFileSync(new URL('../src/main.js',import.meta.url),'utf8');
function between(start,end){const i=main.indexOf(start),j=main.indexOf(end,i+start.length);assert(i>=0&&j>i);return main.slice(i,j);}
const dom=new Map(),$=id=>{if(!dom.has(id))dom.set(id,{textContent:''});return dom.get(id);};
let bossSpawns=0,hits=0;
const session=createSurvivalSession(4123);session.nextSupply=90;
const ctx=vm.createContext({THREE,SURVIVAL,survivalAct,survivalActTime,survivalScaling,tickSurvivalRush,vfx:{pulse(){}},survivalSession:session,survivalEnemySpec,survivalSpawn,survivalChoiceKills,tickSurvival,constrainToArena,addItem,
 enemies:[],player:{position:new THREE.Vector3()},arena:SURVIVAL.arena,inventory:emptyInventory(),itemBarKey:'old',audio:{play(){}},$,
 spawnSurvivalBoss(){bossSpawns++;},enemyIndex:createSpatialIndex(2.5),separationEnemies:[],hitPlayer(a){hits+=a;}});
vm.runInContext(between('function spawnSurvivalEnemy(', 'function spawnSurvivalBoss(')+between('function updateSurvival(', 'function finishSurvival('),ctx);
for(let i=0;i<400;i++)ctx.spawnSurvivalEnemy();assert.equal(ctx.enemies.length,300,'runtime actor cap');
assert(ctx.enemies.every(e=>e.type==='swarm'&&e.survivalKind&&e.g.children.length===0),'ordinary actors have no per-actor renderer');
assert.equal(ctx.enemies.filter(e=>e.g.parent).length,0);
ctx.survivalSession.time=89.99;ctx.updateSurvival(.02);assert.equal(ctx.inventory.tonic,1);assert.equal(ctx.survivalSession.nextSupply,180);
ctx.inventory.tonic=5;ctx.survivalSession.time=179.99;ctx.updateSurvival(.02);assert.equal(ctx.inventory.tonic,5,'supply observes carry cap');
ctx.survivalSession.time=SURVIVAL.duration-.01;ctx.updateSurvival(.02);assert.equal(bossSpawns,1);ctx.updateSurvival(1);assert.equal(bossSpawns,1,'single boss transition');
ctx.survivalSession.finished=true;const endedAt=ctx.survivalSession.time;ctx.updateSurvival(20);assert.equal(ctx.survivalSession.time,endedAt);

ctx.enemies=[];ctx.survivalSession=createSurvivalSession(2);
const enemy=ctx.spawnSurvivalEnemy({x:5,z:0,kind:'runner'});ctx.enemyIndex.rebuild(ctx.enemies);
ctx.moveSurvivalEnemy(enemy,.1,.1,1);assert(enemy.g.position.x<5&&enemy.g.position.x>0);assert.equal(hits,0,'distant mobs cannot damage player');
enemy.g.position.set(.2,0,0);enemy.timer=0;ctx.moveSurvivalEnemy(enemy,.01,.01,2);assert.equal(hits,enemy.damage);
ctx.moveSurvivalEnemy(enemy,.01,.01,2.01);assert.equal(hits,enemy.damage,'contact cooldown');
enemy.g.position.set(100,0,-100);ctx.moveSurvivalEnemy(enemy,.01,.01,3);assert(enemy.g.position.x<=SURVIVAL.arena.halfWidth-enemy.radius);assert(enemy.g.position.z>=-SURVIVAL.arena.halfDepth+enemy.radius);

// Touching bodies must not continue walking into the seed centre.
ctx.enemies=[];const front=ctx.spawnSurvivalEnemy({x:2,z:0,kind:'swarm'});
for(let i=0;i<180;i++){ctx.enemyIndex.rebuild(ctx.enemies);ctx.moveSurvivalEnemy(front,1/60,1/60,i/60);}
assert(front.g.position.x>=front.radius+.29);
// Exact overlapping bodies spread, and frozen bodies never separate for free.
ctx.enemies=[];
for(let i=0;i<20;i++){const e=ctx.spawnSurvivalEnemy({x:3,z:0,kind:'swarm'});e.phase=i*.7;}
for(let i=0;i<180;i++){ctx.enemyIndex.rebuild(ctx.enemies);for(const e of ctx.enemies)ctx.moveSurvivalEnemy(e,1/60,1/60,i/60);}
let nearest=0;
for(const a of ctx.enemies)nearest+=Math.min(...ctx.enemies.filter(b=>b!==a).map(b=>a.g.position.distanceTo(b.g.position)));
console.log('Crowd nearest mean',nearest/ctx.enemies.length);assert(nearest/ctx.enemies.length>.35,'crowd must spread instead of sharing one point');
const frozen=ctx.enemies[0],before=frozen.g.position.clone();ctx.moveSurvivalEnemy(frozen,0,1/60,4);assert(frozen.g.position.equals(before));

const crowd=Array.from({length:120},(_,i)=>({g:{position:new THREE.Vector3(i*.0001,0,0)}}));
ctx.enemyIndex.rebuild(crowd);const neighbours=[];ctx.enemyIndex.queryInto({x:0,z:0},1,neighbours,9,false);assert.equal(neighbours.length,9,'separation query is bounded inside the grid, not after sorting all actors');
for(let i=0;i<1000;i++)ctx.enemyIndex.rebuild(i%2?crowd:[]);ctx.enemyIndex.rebuild(crowd);assert.equal(ctx.enemyIndex.queryInto({x:0,z:0},1,[]).length,120,'bucket reuse never retains stale actors');

// Boundaries that must remain explicit while the existing journey is reused.
assert.match(main,/if\(!restore&&!developerRun&&!survivalSession\)clearCheckpoint/);
assert.match(main,/if\(!restore&&!developerRun&&!survivalSession\)for\(const \[id,n\] of Object.entries\(claimCarry/);
assert.match(between('function saveBoundary(', '// After a warden'),/if\(survivalSession\)return true/);
assert.match(between('function saveLeaveState(', '// 일시정지'),/if\(survivalSession\)return saveSurvival\(\)/);
assert.match(between('function hitPlayer(', 'let cameraShake='),/if\(survivalSession\)\{finishSurvival\(false\);return;\}/);
assert.match(main,/if\(!survivalSession&&!trainingSession&&!enemies.length/,'empty moment must not finish survival');
const down=between('function enemyDown(', 'function updateFallen(');assert(down.indexOf('if(survivalSession)')<down.indexOf('earnCoins('),'boss reward interception precedes journey writes');
assert.match(main,/recordSurvivalResult\(survivalRecordStorage\(rawStorage/,'account-scoped survival record, separate from journey');
assert.match(main,/survivalSession&&shots.length>=MAX_SHOTS/,'base/fragment projectile hard ceiling');
assert.match(main,/if\(!mirrorSession&&!survivalSession\?\.lab&&mode/,'synthetic load cannot get paused by choices');
console.log('Survival integration: real spawn/movement/contact/supply/boss transitions, bounded grid, save/stash/reward isolation passed.');

// Exercise the real finish handler: death cannot grant a win, repeat callbacks
// cannot duplicate a record, and practice retry stays practice.
const nodes=new Map(),node=id=>{
 if(!nodes.has(id))nodes.set(id,{classList:{add(){},remove(){}},innerHTML:'',textContent:'',insertAdjacentHTML(){}});
 return nodes.get(id);
};
let writes=0,retryLab,homeVisits=0,setupVisits=0,stored=null;
const finishContext=vm.createContext({survivalSaveToken:null,
 rankingDecision:()=>({eligible:false}),developerRun:false,localInspection:false,score:100,playerName:'씨앗',adminMode:false,betaTesterMode:false,account:{user:()=>null},paceTrusted:()=>true,paceGame:1,paceReal:1,
 survivalPersonalRecord:()=>readSurvivalRecord(finishContext.rawStorage),survivalRecordStorage:s=>s,survivalOwner:()=> 'guest',
 document:{body:{classList:{add(){}}}},elapsed:34,
 survivalSession:{...createSurvivalSession(),time:510,bossSpawned:true,kills:800},
 enemies:[{survivalBoss:true,hp:2150,maxHp:8600}],survivalAct,survivalOutcome,readSurvivalRecord,recordSurvivalResult,
 rawStorage:{getItem:()=>stored,setItem:(key,value)=>{assert.equal(key,SURVIVAL.recordKey);stored=value;writes++;}},
 $:node,finishRoomAnalysis:()=>null,combatAnalysisSummary:()=>'',survivalClock:t=>String(t),
 perfFinish(){},touch:{reset(){}},keys:new Set(),pauseBuild:{hide(){}},cancelActive(){},activeGauge:{},activeVfx:{clear(){}},
 audio:{setPaused(){},setScene(){}},startSurvival:lab=>{retryLab=lab;},showIntro:()=>homeVisits++,showSurvivalSetup:()=>setupVisits++
});
vm.runInContext(between('function finishSurvival(', 'function wave('),finishContext);
finishContext.finishSurvival(true); // untrusted/stale callback cannot grant a clear
assert.equal(JSON.parse(stored).wins,0);
assert.match(node('#overlay').innerHTML,/25%/);
finishContext.finishSurvival(false);assert.equal(writes,1,'result settled once');
node('#survival-retry').onclick();assert.equal(retryLab,undefined);
node('#survival-setup').onclick();assert.equal(homeVisits,1);assert.equal(setupVisits,1);
finishContext.survivalSession={...createSurvivalSession(),time:920,bossSpawned:true,won:true,completedLaps:1,fastestLap:920,bossesDefeated:3,lab:'duel'};
finishContext.finishSurvival();assert.equal(writes,1,'lab victory never writes');
node('#survival-retry').onclick();assert.equal(retryLab,'duel');
finishContext.survivalSession={...createSurvivalSession(),time:920,bossSpawned:true,won:true,completedLaps:1,fastestLap:920,bossesDefeated:3};
finishContext.finishSurvival();assert.equal(JSON.parse(stored).wins,1);assert.equal(JSON.parse(stored).fastestClear,920);
console.log('Survival results: boss remaining HP, verified wins, idempotence, practice retry and local record isolation passed.');

// Late collision callbacks in the death frame cannot change the shown outcome.
const ended=vm.createContext({survivalSession:{finished:true,won:false}});
vm.runInContext(between('function damageEnemy(', 'function enemyDown('),ended);
const survivor={hp:1,dead:false};ended.damageEnemy(survivor,100);
assert.deepEqual(survivor,{hp:1,dead:false});
console.log('Survival terminal state: late damage ignored after result settlement.');

// Larger act-2 diamond: geometry coordinates and trigger coordinates are shared.
for(let i=0;i<4;i++){
 const base=SURVIVAL_BASES[i],next=SURVIVAL_BASES[base.next];
 const slide=baseSlideFor(base,0,true,-1,SURVIVAL_BASES,SURVIVAL_SLIDE.speed);
 assert.equal(slide.index,i);assert.equal(slide.targetX,next.x);assert.equal(slide.targetZ,next.z);
 assert(Math.abs(slide.duration*slide.speed-Math.hypot(next.x-base.x,next.z-base.z))<1e-9);
 assert.equal(stadiumBaseAt(next,BASE_SLIDE.radius,SURVIVAL_BASES),base.next);
 assert.equal(baseSlideFor(next,0,true,base.next,SURVIVAL_BASES,18),null,'landing base remains locked even after cooldown');
 assert.equal(baseSlideFor(base,0,false,-1,SURVIVAL_BASES,18),null,'no hidden triggers in act 1 or 3');
 assert.equal(baseSlideFor(base,1,true,-1,SURVIVAL_BASES,18),null);
}
assert.equal(baseSlideFor({x:0,z:0},0,true,-1,SURVIVAL_BASES,18),null);
const slideBranch=between('const occupiedBase=', 'if(sliding)constrainToArena');
assert(!slideBranch.includes('invuln='),'base travel never grants immunity');
assert(main.includes('survivalBase=survivalSession?.act===1'));

// Exercise the real world transition. Keep build/progress; discard old hazards.
let nextWorld=0,released=0;
const travel=vm.createContext({queueMicrotask:()=>{},
 survivalSession:{...createSurvivalSession(9),act:1,won:true,time:600,bossesDefeated:2},advanceSurvivalAct,
 enemies:[{id:1}],fallen:[{e:{id:2}}],shots:[{ob:{id:3}}],enemyShots:[{ob:{id:4}}],effects:[{ob:{id:5}}],releaseEnemy(){released++;},release(){released++;},
 heldForms:new Map([['prism',4]]),levels:new Map([['chain',3]]),bankedUpgrades:12,choiceKills:123,choicesTaken:25,score:54321,
 clearForms(){},cancelActive(){},activeGauge:{value:42},activeVfx:{clear(){}},finaleEchoes:[1],wells:[1],pulls:[1],orbitHits:new Map(),vfx:{clear(){}},clearEscorts(){},
 cachedTarget:{},targetTimer:1,player:{position:new THREE.Vector3(11,0,0),userData:{dashTime:.1}},playerMotion:{reset(){}},shootCD:2,playerSlow:2,baseSlideTime:1,baseSlideCooldown:1,baseSlideLock:1,
 touch:{reset(){}},keys:new Set(['KeyD']),keyboardDash:true,invuln:0,hp:60,maxPlayerHp:()=>100,inventory:{tonic:4},addItem,itemBarKey:'old',
 drawRoom(){nextWorld++;},syncForms(){},$:node,survivalAct,audio:{setScene(){}},musicSceneFor:()=>'',finishSurvival(){throw Error('normal transition cannot finish the run');}
});
vm.runInContext(between('function continueSurvival(', 'function updateSurvival('),travel);
travel.continueSurvival();assert.equal(nextWorld,1);assert.equal(released,5);
assert.equal(travel.survivalSession.act,2);assert.equal(travel.survivalSession.bossSpawned,false);
assert.equal(travel.hp,85);assert.equal(travel.inventory.tonic,5);assert.equal(travel.choiceKills,123);assert.equal(travel.choicesTaken,25);
assert.equal(travel.heldForms.get('prism'),4);assert.equal(travel.levels.get('chain'),3);assert.equal(travel.bankedUpgrades,12);assert.equal(travel.score,54321);
assert.equal(travel.enemies.length+travel.enemyShots.length+travel.shots.length+travel.effects.length+travel.fallen.length,0);
assert.equal(travel.baseSlideTime,0);assert.equal(travel.baseSlideLock,-1);assert.equal(travel.player.position.length(),0);
travel.continueSurvival();assert.equal(nextWorld,1,'duplicate transition cannot give rewards twice');
console.log('Survival cycle: build retained, hazards removed, capped recovery, real base targeting/lock and no slide immunity passed.');
