import assert from 'node:assert/strict';
import {survivalAct,survivalActTime,survivalScaling,advanceSurvivalAct,tickSurvivalRush,SURVIVAL,createSurvivalSession,survivalPressure,survivalEnemySpec,survivalSpawn,survivalChoiceKills,tickSurvival,settleSurvivalKill,survivalOutcome,readSurvivalRecord,recordSurvivalResult} from '../src/survival-rules.js';

// Seeded runs replay exactly, including players travelling along every edge.
const a=createSurvivalSession(413),b=createSurvivalSession(413),c=createSurvivalSession(414),kinds=new Set();
let diverged=false;
for(let i=0;i<1200;i++){
 const player={x:24*Math.sin(i*.3),z:20*Math.cos(i*.3)};
 a.time=b.time=c.time=i;
 const one=survivalSpawn(a,player),two=survivalSpawn(b,player),other=survivalSpawn(c,player);
 assert.deepEqual(one,two);diverged ||= one.x!==other.x||one.z!==other.z;
 assert.ok(Math.hypot(one.x-player.x,one.z-player.z)>=10);
 assert.ok(Math.abs(one.x)<=24-1.2&&Math.abs(one.z)<=20-1.2);
 kinds.add(one.kind);
}
assert.ok(diverged);assert.deepEqual([...kinds].sort(),['brute','runner','swarm']);
assert.equal(survivalSpawn(createSurvivalSession(),{x:0,z:0},{halfWidth:2,halfDepth:2}),null);
assert.deepEqual(createSurvivalSession(413),createSurvivalSession(413),'retry resets timers, kills, boss and RNG');

// The first side rotates each minute; packets share a sector and pincer leaves gaps.
const sector=p=>Math.abs(p.x)>Math.abs(p.z)?(p.x>0?0:2):(p.z>0?1:3);
for(const [time,expected] of [[3,1],[23,2],[40,4]]){
 const pack=createSurvivalSession(0);pack.time=time;
 const spots=Array.from({length:24},()=>survivalSpawn(pack,{x:0,z:0}));
 assert.equal(new Set(spots.map(sector)).size,expected);
 for(let i=0;i<24;i+=6)assert.equal(new Set(spots.slice(i,i+6).map(sector)).size,1);
 assert(spots.every(p=>Math.hypot(p.x,p.z)>=11&&Math.hypot(p.x,p.z)<17));
}
const minuteOne=createSurvivalSession(0),minuteTwo=createSurvivalSession(0);minuteOne.time=3;minuteTwo.time=63;
assert.notEqual(sector(survivalSpawn(minuteOne,{x:0,z:0})),sector(survivalSpawn(minuteTwo,{x:0,z:0})));
const breather=createSurvivalSession(1);breather.time=54;let breathingFeed=0;
for(let i=0;i<50;i++)breathingFeed+=tickSurvival(breather,.1,0).spawn;
assert(breathingFeed>=42&&breathingFeed<=48,'lighter feed continues between surges');
const sparse=createSurvivalSession(2),busy=createSurvivalSession(2);sparse.time=busy.time=120;
tickSurvival(sparse,.01,0);tickSurvival(busy,.01,80);
assert.equal(sparse.spawnTimer,busy.spawnTimer*.85,'only sparse fields replenish a little sooner');
const freshStats=survivalEnemySpec('swarm',120);settleSurvivalKill(sparse);assert.deepEqual(survivalEnemySpec('swarm',120),freshStats,'clear speed never raises enemy HP or damage');

// All roles have contact stats only; fast fragile runners and slow durable brutes.
for(let second=0;second<=600;second++){
 const pressure=survivalPressure(second);
 assert.ok(pressure.cap>0&&pressure.cap<=SURVIVAL.maxEnemies);
 assert.ok(pressure.spawnInterval>0);
 for(const kind of kinds){
  const spec=survivalEnemySpec(kind,second);
  assert.ok(Object.values(spec).every(value=>Number.isFinite(value)&&value>0));
  assert.equal('projectile' in spec,false);
 }
}
assert.ok(survivalEnemySpec('runner',0).speed>survivalEnemySpec('swarm',0).speed);
assert.ok(survivalEnemySpec('brute',0).hp>survivalEnemySpec('swarm',0).hp);
assert.ok(survivalPressure(55).cap<survivalPressure(45).cap,'each wave gives a brief relief beat');
assert.ok(survivalPressure(35).cap>survivalPressure(30).cap);
assert.equal(SURVIVAL.duration,270,'boss is scheduled within five combat minutes');
assert.equal(survivalPressure(200).cap,300,'late density arrives before the fourth minute');
assert.equal(survivalPressure(35).hpScale,survivalPressure(30).hpScale,'faster population ramp must not accelerate durability');
assert.equal(survivalPressure(35).speedScale,survivalPressure(30).speedScale);

const run=createSurvivalSession(42);
assert.equal(tickSurvival(run,.01,0).spawn,6);
assert.equal(tickSurvival(run,30,300).spawn,0,'a saturated arena admits no enemies');
assert.ok(tickSurvival(run,120,0).spawn<=6,'a long frame never catches up with hundreds of spawns');
assert.equal(tickSurvival(run,.01,0).spawn,0,'no remaining catch-up budget next frame');
const paused=structuredClone(run);
// Menus do not call tick. Invalid/zero steps must also be inert.
for(const dt of [0,-1,NaN,Infinity])assert.deepEqual(tickSurvival(run,dt,0),{spawn:0,boss:false});
assert.deepEqual(run,paused);
run.time=SURVIVAL.duration-.25;
assert.equal(tickSurvival(run,.2,0).boss,false);
assert.deepEqual(tickSurvival(run,.05,0),{spawn:0,boss:true});
assert.equal(run.won,false,'reaching the boss does not win');
assert.equal(tickSurvival(run,20,SURVIVAL.maxBossAdds).spawn,0,'boss adds capped separately');
assert.equal(tickSurvival(run,20,SURVIVAL.maxBossAdds-1).spawn,1);
assert.equal(tickSurvival(run,20,0).boss,false,'boss event fires once');
settleSurvivalKill(run);assert.equal(run.kills,1);assert.equal(run.won,false);
settleSurvivalKill(run,{boss:true});assert.equal(run.won,true);assert.equal(run.kills,2);
const won=structuredClone(run);
settleSurvivalKill(run,{boss:true});tickSurvival(run,1,0);assert.deepEqual(run,won);
const fresh=createSurvivalSession();settleSurvivalKill(fresh,{boss:true});assert.equal(fresh.won,false);

// An ideal clear of every batch offers the intended 28–50 law choices.
const ideal=createSurvivalSession();let progress=0,choices=0;
for(let i=0;i<SURVIVAL.duration*100;i++){
 progress+=tickSurvival(ideal,.01,0).spawn;
 while(progress>=survivalChoiceKills(choices)){progress-=survivalChoiceKills(choices);choices++;}
}
assert.ok(choices>=28&&choices<=50,`expected 28–50 choices, got ${choices}`);
assert.equal(survivalChoiceKills(-1),8);assert.equal(survivalChoiceKills(1000),300);

// Only this mode's v3 record is written. Old single-act records survive intact.
const memory=new Map([['seed-run-save','unchanged'],['seed-ranking','unchanged'],['seed-survival-record-v2','old']]);
const storage={getItem:key=>memory.get(key)||null,setItem:(key,value)=>memory.set(key,value)};
assert.deepEqual(readSurvivalRecord(storage),{bestKills:0,bestTime:0,wins:0,runs:0,fastestClear:0,bestBosses:0});
assert.equal(recordSurvivalResult(storage,{kills:200,time:300,won:true,bossesDefeated:1}).wins,0,'Austin alone is not a three-act clear');
const journey=createSurvivalSession(55),baseScale=survivalScaling(journey);
const heldBuild={forms:['prism','frostnet'],levels:[4,5],choiceKills:123,inventory:{tonic:3}};
const buildBefore=structuredClone(heldBuild);
for(let leg=0;leg<7;leg++){
 const start=journey.time,act=leg%3;
 assert.equal(journey.act,act);assert.equal(journey.lap,Math.floor(leg/3));assert.equal(survivalActTime(journey),0);
 assert.equal(survivalAct(journey).type,['austin','alwaysbeginner','tempestcarrier'][act]);
 assert.equal(advanceSurvivalAct(journey),false,'time alone cannot skip a boss');
 journey.time=start+269.9;assert.equal(tickSurvival(journey,.2,0).boss,true);
 assert.equal(tickSurvival(journey,2,0).boss,false);
 journey.time+=30;settleSurvivalKill(journey,{boss:true});const defeated=journey.bossesDefeated;
 settleSurvivalKill(journey,{boss:true});assert.equal(journey.bossesDefeated,defeated);
 assert.equal(journey.completedLaps,Math.floor((leg+1)/3));
 assert.equal(advanceSurvivalAct(journey),true);assert.equal(advanceSurvivalAct(journey),false);
 assert.equal(journey.nextSupply,journey.time+90);assert.equal(journey.bossSpawned,false);assert.equal(journey.won,false);
 assert(survivalPressure(journey).cap<=300);assert.deepEqual(heldBuild,buildBefore);
}
assert(survivalScaling(journey).hp>baseScale.hp);assert(survivalScaling(journey).projectile>baseScale.projectile);
for(const lap of [0,1,20,1000,1e10]){const scale=survivalScaling({act:2,lap});assert(Object.values(scale).every(Number.isFinite));assert(scale.speed<=1.3&&scale.projectile<=1.3&&scale.tempo<=1.4);assert(survivalPressure({act:2,lap,time:250}).cap<=300);}
const record=recordSurvivalResult(storage,journey);assert.equal(record.wins,2);assert.equal(record.bestBosses,7);assert(record.fastestClear>=810);
assert.equal(memory.get('seed-run-save'),'unchanged');assert.equal(memory.get('seed-ranking'),'unchanged');assert.equal(memory.get('seed-survival-record-v2'),'old');assert.equal(memory.size,4);
memory.set(SURVIVAL.recordKey,'broken json');assert.equal(readSurvivalRecord(storage).runs,0);
memory.set(SURVIVAL.recordKey,JSON.stringify({bestKills:-20,bestTime:1e12,wins:99,runs:2}));
assert.deepEqual(readSurvivalRecord(storage),{bestKills:0,bestTime:86400,wins:99,runs:2,fastestClear:0,bestBosses:0});
const denied={getItem(){throw Error('denied');},setItem(){throw Error('full');}};
for(const target of [null,undefined,denied]){assert.doesNotThrow(()=>readSurvivalRecord(target));assert.doesNotThrow(()=>recordSurvivalResult(target,null));}
const resultSession={...createSurvivalSession(),act:1,time:700,legStartedAt:400,bossSpawned:true};
assert.equal(survivalOutcome(resultSession,{boss:{hp:.1,maxHp:8600}}).value,'1%');
assert.equal(survivalOutcome(resultSession,{boss:{hp:4300,maxHp:8600}}).value,'50%');
assert.equal(survivalOutcome(resultSession).bossSeconds,30);assert.match(survivalOutcome(resultSession).title,/항상초심/);
assert.equal(survivalOutcome({...resultSession,completedLaps:2}).value,'2순환');
assert.equal(survivalOutcome({time:270,bossSpawned:false}).value,'99%');
const failed={...createSurvivalSession(),time:500,bossSpawned:true,finished:true};const failureSnapshot=structuredClone(failed);
settleSurvivalKill(failed,{boss:true});tickSurvival(failed,1,0);assert.equal(advanceSurvivalAct(failed),false);assert.deepEqual(failed,failureSnapshot);
console.log(`Survival: 3-act transitions, replay scaling, bounded pools, separate records and ${choices} choices per act passed.`);

const r={survivalKind:'runner',g:{position:{x:0,z:0}},phase:0,rushClock:0};
assert.equal(tickSurvivalRush(r,.01,{x:5,z:0},3),false,'maximum three simultaneous rushes');
assert.equal(tickSurvivalRush(r,.01,{x:5,z:0},0),true);
assert.equal(r.rushState,'brace');assert.equal(r.rushX,1);
tickSurvivalRush(r,.66,{x:0,z:5},1);assert.equal(r.rushState,'rush');assert.equal(r.rushX,1);assert.equal(r.rushZ,0,'rush never homes after direction cue');
const frozen=structuredClone(r);tickSurvivalRush(r,0,{x:-5,z:0},1);assert.deepEqual(r,frozen);
tickSurvivalRush(r,.73,{x:0,z:5},1);assert.equal(r.rushState,'recover');
tickSurvivalRush(r,.81,{x:0,z:5},0);assert.equal(r.rushState,null);assert(r.rushClock>2);
