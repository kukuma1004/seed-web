// Reproduces the reported level-30+ twin loadout using authored form attacks,
// the real formHit/twin interaction bridge and live crowd spawn/movement code.
// No base shots, ultimates, crits, banked fusion bonus, titles or potions:
// this measures crowd pressure against a LOWER bound of that build's damage.
// Node CPU simulation, not a mobile/GPU benchmark or a human clear rate.
// Continue after synthetic death to measure contact exposure; no survival claim.
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import vm from 'node:vm';
import * as THREE from 'three';
import {createFormCombat} from '../src/form-combat.js';
import {createTwinInteractionEngine} from '../src/twin-interactions.js';
import {ALL_FORMS as FORMS,TWIN_FORMS} from '../src/forms.js';
import {damageScale,lawStats,buildLevel} from '../src/progression.js';
import {createDashState,tickDash,spendDash} from '../src/dash-evolution.js';
import {survivalBenchmarkMove} from '../src/survival-benchmark.js';
import {createSpatialIndex} from '../src/spatial-index.js';
import {constrainToArena,reflectArenaBoundary} from '../src/arena.js';
import {SURVIVAL,createSurvivalSession,survivalEnemySpec,survivalSpawn,tickSurvival,tickSurvivalRush} from '../src/survival-rules.js';
const source=readFileSync(new URL('../src/main.js',import.meta.url),'utf8');
function body(start,end){const i=source.indexOf(start),j=source.indexOf(end,i+start.length);assert(i>=0&&j>i);return source.slice(i,j);}
const reportForms=[['meteorspear',36],['burstpetals',33],['glassmaze',18],['spearthunder',38],['mirrorguard',10]];
export function simulate({lap=2,seed=17,moving=false,seconds=90,hpFactor=1}={}){
 const session={...createSurvivalSession(seed),lap},player={position:new THREE.Vector3(),userData:{}},scene=new THREE.Scene();
 const grid=createSpatialIndex(2.5),levels=new Map([['frost',39]]),LS=lawStats(levels);
 session.buildLevel=buildLevel(levels,new Map(reportForms));
 const vfx=new Proxy({},{get:()=>()=>{}});let kills=0,damage=0,contact=0,hp=100,invuln=0,peak=0,nearFrames=0,frames=0,minDistance=100,bolts=0,firstHit=null,deathAt=null;
 const ctx=vm.createContext({THREE,SURVIVAL,survivalSession:session,expansionTerrain:null,survivalSpawn,survivalEnemySpec:(kind,s)=>{const stats=survivalEnemySpec(kind,s);return {...stats,hp:stats.hp*hpFactor};},
  enemies:[],player,arena:SURVIVAL.arena,enemyIndex:grid,separationEnemies:[],survivalRushes:0,survivalCue:new THREE.Vector3(),tickSurvivalRush,constrainToArena,vfx,
  hitPlayer(amount){if(invuln>0)return;contact++;firstHit??=ctx.elapsed;hp-=amount;if(hp<=0)deathAt??=ctx.elapsed;invuln=.65;},
  FORMS,TWIN_FORMS,createTwinInteractionEngine,elapsed:0,levels,chosen:new Set(['frost']),LS,bankedUpgrades:0,damageScale,
  relics:{},runBonuses:{},relicFormScale:()=>1,runPowerScale:()=>1,gardenPower:()=>1,totalCritChance:()=>0,rng:()=>.5,
  DIRECT_FORMS:new Set(),blocksShield:()=>false,isBoss:()=>false,combatAnalysis:{utility(){}},audio:{play(){}},line(){},wells:[],collide:p=>constrainToArena(p,.4,SURVIVAL.arena),
  damageEnemy(e,amount){if(e.dead)return;damage+=Math.min(e.hp,amount);e.hp-=amount;if(e.hp<=0){e.dead=true;kills++;}}
 });
 vm.runInContext(body('function spawnSurvivalEnemy(', 'function spawnSurvivalBoss(')+body('function moveSurvivalEnemy(', 'function finishSurvival(')+body('const twinMarks=', 'function formOptions('),ctx);
 const engines=reportForms.flatMap(([id,level])=>(TWIN_FORMS[id]?.parts||[id]).map((part,index)=>{
  const combat=createFormCombat(scene,{player,enemies:()=>ctx.enemies,nearby:(p,r,out)=>grid.queryInto(p,r,out),hit:ctx.formHit,blocked:()=>false,boundary:(a,b,d)=>reflectArenaBoundary(a,b,d,SURVIVAL.arena),constrain:ctx.collide,vfx,renderless:true,maxBolts:128});
  combat.set(part,level,{twin:!!TWIN_FORMS[id],twinId:TWIN_FORMS[id]?id:null,openingDelay:2+index*5});return {combat,part,cd:0};
 }));
 const dt=1/60,dir=new THREE.Vector3(),move=new THREE.Vector3(),dashDir=new THREE.Vector3(),dash=createDashState();let dashTime=0;const started=performance.now();
 for(let frame=0;frame<seconds/dt;frame++){
  ctx.elapsed=frame*dt;invuln=Math.max(0,invuln-dt);ctx.enemies=ctx.enemies.filter(e=>!e.dead);
  if(moving){tickDash(dash,dt);const danger=survivalBenchmarkMove(ctx.elapsed,player.position,ctx.enemies,move);if(danger&&dashTime<=0){const spent=spendDash(dash);if(spent){dashTime=spent.duration;invuln=Math.max(invuln,spent.invuln);dashDir.copy(move).normalize();}}if(dashTime>0){dashTime-=dt;player.position.addScaledVector(dashDir,17*dt);}else player.position.addScaledVector(move,6.09*dt);ctx.collide(player.position);}
  const event=tickSurvival(session,dt,ctx.enemies.length);for(let i=0;i<event.spawn;i++)ctx.spawnSurvivalEnemy();
  peak=Math.max(peak,ctx.enemies.length);grid.rebuild(ctx.enemies);
  const target=ctx.enemies.reduce((best,e)=>!best||e.g.position.distanceToSquared(player.position)<best.g.position.distanceToSquared(player.position)?e:best,null);
  for(const engine of engines){engine.cd-=dt;if(target&&engine.cd<=0&&!FORMS[engine.part]?.passive){dir.copy(target.g.position).sub(player.position).normalize();engine.cd=engine.combat.fire(player.position,dir,target.g.position);}engine.combat.update(dt);bolts=Math.max(bolts,engine.combat.state().bolts);}
  ctx.survivalRushes=ctx.enemies.filter(e=>!e.dead&&(e.rushState==='brace'||e.rushState==='rush')).length;
  grid.rebuild(ctx.enemies);
  for(const e of ctx.enemies){if(e.dead)continue;e.slow=Math.max(0,e.slow-dt);e.frostLock=Math.max(0,e.frostLock-dt);ctx.moveSurvivalEnemy(e,dt*(e.frostLock>0?.06:e.slow>0?LS.frostFactor:1),dt,ctx.elapsed);}
  const nearest=Math.min(100,...ctx.enemies.filter(e=>!e.dead).map(e=>e.g.position.distanceTo(player.position)));minDistance=Math.min(minDistance,nearest);if(nearest<3)nearFrames++;frames++;
 }
 for(const {combat} of engines)combat.dispose();
 return {lap:lap+1,seed,moving,hpFactor,seconds,kills,contact,firstHit,deathAt,hp:Math.max(0,Math.round(hp)),peak,nearPercent:Math.round(nearFrames/frames*100),minDistance:+minDistance.toFixed(2),dps:Math.round(damage/seconds),maxBolts:bolts,cpuMs:Math.round(performance.now()-started)};
}
const factor=Number(process.env.SURVIVAL_QA_HP_FACTOR)||1;
for(const moving of [false,true]){const result=simulate({moving,hpFactor:factor});assert(result.peak<=300);assert(result.maxBolts<=128);console.log(JSON.stringify(result));}
