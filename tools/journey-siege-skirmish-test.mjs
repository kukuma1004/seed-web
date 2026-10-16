import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import vm from 'node:vm';
import * as THREE from 'three';
import {createJourneySiegeSkirmish,stepJourneySiegeSkirmish,journeySiegeSkirmishAim,journeySiegeSkirmishHolds,JOURNEY_SIEGE_SKIRMISH as R} from '../src/journey-siege-skirmish.js';
import {createExpansionThreat} from '../src/expansion-journey.js';
import {createCrystalSiege,startCrystalSiegeDefense,checkpointCrystalSiege,stepCrystalSiegeThreat} from '../src/crystal-siege-rules.js';
const groups=[];
function setup(){
 const siege=createCrystalSiege(0,413);startCrystalSiegeDefense(siege);
 const model=createExpansionThreat({id:'siege-0-0-0',type:'shooter',position:{x:0,z:-5},hp:70,speed:2.05,damage:7,windup:.75,cooldown:1,bulletSpeed:5,shots:1,side:'front'});model.phase='approach';
 const actor={expansionActor:true,expansionThreat:model,hp:70,g:{position:new THREE.Vector3(0,0,-5),rotation:{y:0}}};
 return {s:createJourneySiegeSkirmish(),c:{journey:{act:'crystalGorge',phase:'course',siege},actors:[actor],player:{x:0,z:0},projectiles:0,enabled:true},actor};
}
function until(f,predicate,limit=120){for(let i=0;i<limit;i++){const out=stepJourneySiegeSkirmish(f.s,.05,f.c);if(predicate(out))return out;}throw Error('expected combat event not reached');}
{
 const f=setup(),before=JSON.stringify(checkpointCrystalSiege(f.c.journey.siege));
 const aim=until(f,o=>o.started);assert.equal(aim.tells.length,1);assert.equal(aim.bolts.length,0);assert(journeySiegeSkirmishHolds(f.s,f.actor));
 const dir={...aim.tells[0].direction};f.c.player.x=3;
 const fired=until(f,o=>o.bolts.length);assert.deepEqual(fired.bolts[0].dir,dir,'aim commits before the dodge, never tracks');
 assert.equal(fired.bolts.length,1);assert.equal(fired.bolts[0].spec.damage,7);assert.equal(fired.bolts[0].spec.committedLane,true);
 assert.equal(JSON.stringify(checkpointCrystalSiege(f.c.journey.siege)),before,'adapter never mutates saved siege, resources or HP');
 groups.push('locked warning then one straight bolt; siege checkpoint byte-equivalent');
}
{
 function shotDistance(dodge){const f=setup();until(f,o=>o.started);if(dodge)f.c.player.x=3;const out=until(f,o=>o.bolts.length),q=out.bolts[0];let best=Infinity;
  for(let t=0;t<q.spec.life;t+=.01){const travel=1.05+t*q.spec.speed;best=Math.min(best,Math.hypot(q.position.x+q.dir.x*travel-f.c.player.x,q.position.z+q.dir.z*travel-f.c.player.z));}return best;}
 assert(shotDistance(false)<.1,'stationary player is actually in the warned shot path');assert(shotDistance(true)>2.9,'lateral dodge clears the real muzzle-offset path');
 groups.push('stationary-hit versus lateral-dodge outcomes through actual shot data');
}
for(const [label,mutate] of [
 ['Survival-like disabled',f=>f.c.enabled=false],['other act',f=>f.c.journey.act='crosswind'],['boss',f=>f.c.journey.phase='boss'],['preparation',f=>f.c.journey.siege.phase='prep'],['cleared',f=>f.c.journey.siege.phase='clear'],['core lost',f=>f.c.journey.siege.core.hp=0],['dead',f=>f.actor.dead=true],['zero HP',f=>f.actor.hp=0],['boss actor',f=>f.actor.expansionBoss=true],['boss guard',f=>f.actor.siegeGuard=true],['frozen',f=>f.actor.frostLock=.4],['near player',f=>f.c.player.z=-3],['far player',f=>f.c.player.z=5],['outside fitted view',f=>f.actor.g.position.x=7.1],['full projectile cap',f=>f.c.projectiles=48],['invalid player',f=>f.c.player.x=NaN],['view rejected',f=>f.c.canAim=()=>false]
]){const f=setup();mutate(f);for(let i=0;i<80;i++){const o=stepJourneySiegeSkirmish(f.s,.1,f.c);assert.equal(o.tells.length+o.bolts.length,0,label);}assert(!journeySiegeSkirmishHolds(f.s,f.actor),label);}
groups.push('17 mode, phase, visibility, proximity, death, freeze and cap exclusions');
{
 for(const cancel of [f=>f.actor.dead=true,f=>f.actor.hp=0,f=>f.actor.frostLock=.5,f=>f.c.actors=[],f=>f.c.journey.phase='boss',f=>f.c.journey.siege.phase='clear']){
  const f=setup();until(f,o=>o.started);cancel(f);for(let i=0;i<30;i++)assert.equal(stepJourneySiegeSkirmish(f.s,.05,f.c).bolts.length,0);assert(!journeySiegeSkirmishHolds(f.s,f.actor));
 }
 const f=setup();until(f,o=>o.started);f.c.projectiles=48;for(let i=0;i<24;i++)assert.equal(stepJourneySiegeSkirmish(f.s,.05,f.c).bolts.length,0);f.c.projectiles=0;
 const out=stepJourneySiegeSkirmish(f.s,.01,f.c);assert.equal(out.bolts.length,0,'clearing cap does not replay a cancelled shot');
 const shifted=setup();until(shifted,o=>o.started);shifted.actor.g.position.z+=1.2;
 assert.equal(stepJourneySiegeSkirmish(shifted.s,.05,shifted.c).bolts.length,0);assert(!journeySiegeSkirmishHolds(shifted.s,shifted.actor),'knockback immediately cancels the held old origin');
 until(shifted,o=>o.started);const newShot=until(shifted,o=>o.bolts.length).bolts[0];assert.equal(newShot.position.z,shifted.actor.g.position.z,'a later fresh warning may fire only from the new actor origin');
 groups.push('killing/freezing/knockback interrupts windup; saturated warning cancels instead of catch-up');
}
{
 const f=setup();until(f,o=>o.started);const time=f.s.clock,timer=f.s.slots[0].timer;
 for(const dt of [0,-1,NaN,Infinity]){assert.equal(stepJourneySiegeSkirmish(f.s,dt,f.c).bolts.length,0);assert.equal(f.s.clock,time);assert.equal(f.s.slots[0].timer,timer);}
 assert.equal(stepJourneySiegeSkirmish(f.s,20,f.c).bolts.length,0,'background delta clamps to .1 and cannot skip warning');
 groups.push('pause and invalid delta hold; large delta cannot skip aim');
}
{
 const f=setup(),slots=[...f.s.slots],output=f.s.out,tells=output.tells,bolts=output.bolts;let count=0,last=-Infinity;
 for(let i=0;i<10000;i++){const o=stepJourneySiegeSkirmish(f.s,.02,f.c);assert.equal(o,output);assert.equal(o.tells,tells);assert.equal(o.bolts,bolts);assert(o.tells.length<=R.maxTells);assert(o.bolts.length<=1);if(o.bolts.length){assert(f.s.clock-last>=R.shotGap-1e-8);last=f.s.clock;count++;}}
 assert(count>50);assert.deepEqual(f.s.slots,slots);assert(f.s.slots.length===2);groups.push('10k steps reuse two slots and output buffers; bounded tells and shot cadence');
}
{
 const source=readFileSync(new URL('../src/main.js',import.meta.url),'utf8'),start=source.indexOf('function tickExpansionActor('),end=source.indexOf('\nfunction waveExpansionJourney(',start),body=source.slice(start,end),f=setup();until(f,o=>o.started);
 let legacyCalls=0;const ctx=vm.createContext({THREE,V:THREE.Vector3,expansionJourney:f.c.journey,journeySiegeSkirmish:f.s,journeySiegeSkirmishAim,player:{position:new THREE.Vector3()},expansionSiegeApi:{stepCrystalSiegeThreat:(...args)=>{legacyCalls++;return stepCrystalSiegeThreat(...args);}},expansionApi:{expansionFacing:()=>({x:1,z:0})},enemyShots:[],collide:()=>{},expansionJourneyView:{tell:()=>{}},isBoss:()=>false});
 vm.runInContext(body,ctx);const before=f.actor.g.position.clone();ctx.tickExpansionActor(f.actor,.05);assert.equal(legacyCalls,0);assert.equal(f.actor.state,'windup');assert(f.actor.g.position.equals(before),'actual host holds warned origin');
 f.s.slots.forEach(q=>{q.actor=null;q.phase='idle';});ctx.tickExpansionActor(f.actor,.05);assert.equal(legacyCalls,1,'actual host resumes the unchanged core-directed AI');
 assert(source.includes('stepJourneySiegeSkirmish(journeySiegeSkirmish,dt,journeySkirmishContext)'));assert(source.includes('for(const q of attacks.bolts)expansionBolt(q)'));groups.push('actual host actor bridge: warned origin held, original heart AI resumed');
}
{
 const source=readFileSync(new URL('../src/main.js',import.meta.url),'utf8');
 const extract=name=>{const start=source.indexOf('function '+name+'('),line=source.slice(start,source.indexOf('\n',start)).trim();assert(line.endsWith('}'),'shipping bolt adapter remains one complete function line');return line;};
 for(const speedScale of [1,1.8]){
  const f=setup();until(f,o=>o.started);const q=until(f,o=>o.bolts.length).bolts[0];
  const context=vm.createContext({THREE,V:THREE.Vector3,enemyShots:[],qualityLevel:1,stage:0,act3RoomPressure:()=>({projectileCapNormal:48}),expansionChannel:speedScale===1?'inspection':'public',cycle:0,difficulty:()=>({projectileSpeed:speedScale})});
  // Execute both actual host adapters, including the muzzle offset and the
  // public difficulty speed/life adjustment, not a copy of the intended math.
  vm.runInContext(extract('skywayBolt')+'\n'+extract('expansionBolt'),context);
  context.expansionBolt(q);assert.equal(context.enemyShots.length,1);const p=context.enemyShots[0],end=p.ob.position.clone().addScaledVector(p.dir,p.life*p.speed),tellEnd=new THREE.Vector3(q.position.x,0,q.position.z).addScaledVector(new THREE.Vector3(q.dir.x,0,q.dir.z),R.range);
  assert(Math.hypot(end.x-tellEnd.x,end.z-tellEnd.z)<1e-8,'real shot never exceeds the drawn warning, including public speed scaling');
 }
 groups.push('actual shipping muzzle + public projectile scaling end at the exact warning endpoint');
}
console.log('Journey Act5 dodge-and-shoot adapter PASS',groups.length,JSON.stringify(groups));
console.log('Deterministic combat/host seams, not browser, device or normal-account proof.');
