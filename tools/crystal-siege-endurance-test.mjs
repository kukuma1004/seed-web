import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import vm from 'node:vm';
import * as THREE from 'three';
import * as journey from '../src/expansion-journey.js';
import * as siege from '../src/crystal-siege-rules.js';
import {createExpansionEntry,expansionExitCheckpoint,createExpansionSaveStore,validExpansionEntry} from '../src/expansion-run-save.js';
import {createExpansionAccountEntry} from '../src/expansion-account-save.js';
import {constrainToArena} from '../src/arena.js';
const main=readFileSync(new URL('../src/main.js',import.meta.url),'utf8'),passed=[],failed=[],measurements=[],earnedEntries=[];
const group=(name,fn)=>{try{fn();passed.push(name);}catch(e){failed.push({name,error:e.stack});}};
const source=(name,next)=>main.slice(main.indexOf('function '+name+'('),main.indexOf('\nfunction '+next+'(',main.indexOf('function '+name+'(')));
const updateSource=source('updateExpansionCourse','tickExpansionActor'),actorSource=source('tickExpansionActor','waveExpansionJourney');
const copy=x=>JSON.parse(JSON.stringify(x)),near=(a,b,msg)=>assert(Math.abs(a-b)<1e-6,msg+' '+a+' != '+b);
const initialRun={version:1,cycle:0,region:'garden',stage:0,mode:'entry',hp:100,kills:0,elapsed:0,rules:[],mutated:[],forms:{},inventory:{potion:2},score:0,choicesTaken:0,choiceKills:0};
function host(j){
 const ctx={expansionJourney:j,expansionJourneyView:{beginFrame(){},setSiegePhase(){},tell(){}},syncExpansionCrystals(){},roomCleared:false,expansionSiegeInputs:[],enemies:[],enemyShots:[],player:{position:new THREE.Vector3(-3,0,4)},expansionSiegeApi:siege,expansionApi:journey,expansionTerrain:null,crowdLeft:1,kills:0,playerDamage:0,turretDamage:0,coreHits:0,failure:null,
  spawnExpansionActor(spec){const e={dead:false,hp:spec.hp,maxHp:spec.hp,type:spec.type,expansionActor:true,hit:0,g:{position:new THREE.Vector3(spec.position.x,0,spec.position.z),rotation:{}},expansionThreat:journey.createExpansionThreat(spec)};ctx.enemies.push(e);return e;},
  damageEnemy(e,n,_chain,_critical,meta){if(e.dead)return;const before=e.hp;e.hp-=n*(e.state==='recover'?1.35:1);ctx[meta?.kind==='siege-turret'?'turretDamage':'playerDamage']+=Math.min(before,Math.max(0,before-e.hp));if(e.hp<=0){e.dead=true;ctx.kills++;}},
  line(){},V:THREE.Vector3,audio:{play(){}},$:()=>({textContent:''}),finishExpansionEntry:()=>true,showExpansionResult:(won,ended)=>{ctx.failure={won,ended};},collide:p=>constrainToArena(p,.65,{shape:'rect',halfWidth:7.5,halfDepth:6.5}),expansionBolt:()=>assert.fail('Siege minions must not use classic ranged bolts'),releaseEnemy(){}};
 vm.createContext(ctx);vm.runInContext(updateSource+'\n'+actorSource,ctx);return ctx;
}
// No enemy is removed without paid facility damage or the explicitly described
// bounded synthetic player hits. This exercises actual host closures and real
// threat movement, not empty enemies/forced room completion.
function course({seed,hz,layout,shotDamage=0}){
 const j=journey.createExpansionJourney('crystalGorge',0,seed,{siege:true}),h=host(j),dt=1/hz,result={seed,hz,layout,shotDamage,waves:[],spawned:0,maxLive:0,seconds:0,boss:false};let shotClock=0;
 for(let room=0;room<5;room++){
  const s=j.siege,startKills=h.kills,startTurret=h.turretDamage,startPlayer=h.playerDamage,coreBefore=s.core.hp;h.player.position.set(-3,0,4);h.enemies.length=0;
  const actions=layout==='none'?[]:[...s.nodes.map(n=>({point:n,kind:'node'})),...s.pads.map(p=>({point:p,kind:layout==='mixed'?(p.id==='pad-0'?'turret':p.id==='pad-1'?'snare':'wall'):'turret'}))];let next=0,prep=0;
  while(s.phase==='prep'&&prep<22){const a=actions[next];if(a){const dx=a.point.x-h.player.position.x,dz=a.point.z-h.player.position.z,d=Math.hypot(dx,dz),step=Math.min(d,6.09*dt);if(d){h.player.position.x+=dx/d*step;h.player.position.z+=dz/d*step;}if(Math.hypot(a.point.x-h.player.position.x,a.point.z-h.player.position.z)<.1){if(a.kind==='node')assert(a.point.harvested,'Actual main proximity harvesting must own receipt');else{siege.buildCrystalSiege(s,a.point.id,a.kind,h.player.position);if(a.point.level===1&&s.resources>=(a.kind==='turret'?3:2))siege.buildCrystalSiege(s,a.point.id,a.kind,h.player.position);}next++;}}
   h.updateExpansionCourse(dt);prep+=dt;result.seconds+=dt;
  }
  assert.equal(s.phase,'defense');const setup={harvested:s.nodes.filter(n=>n.harvested).length,facilities:s.pads.map(p=>({kind:p.kind,level:p.level,hp:p.hp})),resources:s.resources,completedPrepActions:next};
  h.player.position.set(0,0,0);let seconds=0;
  while(s.phase==='defense'&&seconds<180){
   const before=s.spawned;h.updateExpansionCourse(dt);result.spawned+=s.spawned-before;assert(s.spawned-before<=2);
   shotClock-=dt;if(shotDamage>0&&shotClock<=0){const e=h.enemies.filter(e=>!e.dead&&e.g.position.distanceTo(h.player.position)<=6).sort((a,b)=>a.g.position.distanceTo(h.player.position)-b.g.position.distanceTo(h.player.position))[0];if(e){h.damageEnemy(e,shotDamage,false,false,{kind:'synthetic-player'});shotClock=.22;}}
   for(const e of h.enemies)if(!e.dead){const hp=s.core.hp;h.tickExpansionActor(e,dt);h.coreHits+=hp-s.core.hp;assert(Number.isFinite(e.g.position.x)&&Number.isFinite(e.g.position.z)&&e.hp>0);}
   h.enemies=h.enemies.filter(e=>!e.dead);result.maxLive=Math.max(result.maxLive,h.enemies.length);assert(h.enemies.length<=24);seconds+=dt;result.seconds+=dt;
  }
  result.waves.push({room,phase:s.phase,seconds:+seconds.toFixed(3),coreBefore,coreAfter:s.core.hp,kills:h.kills-startKills,turretDamage:+(h.turretDamage-startTurret).toFixed(2),playerDamage:+(h.playerDamage-startPlayer).toFixed(2),live:h.enemies.length,...setup});
  if(s.phase!=='clear'){assert.equal(s.phase,'failed','No stuck saturated wave');h.updateExpansionCourse(dt);assert.deepEqual(h.failure,{won:false,ended:true});break;}
  assert.equal(h.enemies.length,0);assert.equal(s.spawned,siege.CRYSTAL_SIEGE_PACKETS[room]+Math.floor(siege.CRYSTAL_SIEGE_PACKETS[room]/2));
  assert(journey.advanceExpansionJourney(j));
  const entry=createExpansionEntry(j,{...initialRun,stage:j.room},j.phase==='boss'?[-4,0,0]:[-3,0,4]);assert(entry&&validExpansionEntry(entry));assert.deepEqual(journey.checkpointExpansionJourney(journey.restoreExpansionJourney(copy(entry.journey))),entry.journey);earnedEntries.push(entry);
 }
 result.boss=j.phase==='boss';result.kills=h.kills;result.seconds=+result.seconds.toFixed(3);
 if(result.boss){assert.equal(result.spawned,165);assert.equal(result.kills,165);assert.equal(j.boss.id,'crystalGardener');assert(j.course.walls.length>0);const facilities=copy(j.siege.pads);const out=journey.stepExpansionJourney(j,1/hz,{position:{x:5,z:0},player:{x:-4,z:0},walls:j.course.walls,hpRatio:1});assert(!out.hits&&!out.snares);assert.deepEqual(j.siege.pads,facilities,'Classic boss intentionally excludes facility attacks');}
 return result;
}
group('Actual host end-to-end alive threats, finite damage, five waves and boss checkpoint',()=>{for(const hz of [20,60])for(const seed of [1,413,900])for(const policy of [{layout:'none',shotDamage:0},{layout:'turrets',shotDamage:0},{layout:'mixed',shotDamage:20},{layout:'turrets',shotDamage:20},{layout:'mixed',shotDamage:40},{layout:'turrets',shotDamage:40}])measurements.push(course({seed,hz,...policy}));assert(measurements.some(x=>x.boss),'At least one explicitly bounded synthetic combat route must reach boss');assert(measurements.filter(x=>x.layout==='none').every(x=>!x.boss),'Unopposed real threats must destroy heart');});
group('Actual stronger overlapping snare must retain stronger movement reduction',()=>{
 const j=journey.createExpansionJourney('crystalGorge',0,1,{siege:true}),s=j.siege,h=host(j);for(const n of s.nodes)assert(siege.harvestCrystalSiege(s,n.id,n).ok);assert(siege.buildCrystalSiege(s,'pad-0','snare',s.pads[0]).ok);assert(siege.buildCrystalSiege(s,'pad-0','snare',s.pads[0]).ok);assert(siege.buildCrystalSiege(s,'pad-1','snare',s.pads[1]).ok);siege.startCrystalSiegeDefense(s);const e=h.spawnExpansionActor({id:'overlap',type:'shooter',position:{x:0,z:-2.5},hp:100,speed:2,damage:5,windup:.75,shots:1,cooldown:1,bulletSpeed:5});h.updateExpansionCourse(.05);assert.equal(e.expansionThreat.slowFor,.8);near(e.expansionThreat.slowFactor,.45,'A weaker later facility must not overwrite active stronger snare');
});
group('Actual host staggered weak refresh cannot extend a removed stronger facility effect',()=>{
 const j=journey.createExpansionJourney('crystalGorge',0,31,{siege:true}),s=j.siege,h=host(j);for(const n of s.nodes)assert(siege.harvestCrystalSiege(s,n.id,n).ok);siege.buildCrystalSiege(s,'pad-0','snare',s.pads[0]);siege.buildCrystalSiege(s,'pad-0','snare',s.pads[0]);siege.buildCrystalSiege(s,'pad-1','snare',s.pads[1]);siege.startCrystalSiegeDefense(s);const e=h.spawnExpansionActor({id:'expiry',type:'shooter',position:{x:0,z:-2.5},hp:100,speed:2,damage:5,windup:.75,shots:1,cooldown:1,bulletSpeed:5});Object.assign(e.expansionThreat,{phase:'recover',timer:5});
 for(let n=0;n<20;n++){h.updateExpansionCourse(.05);h.tickExpansionActor(e,.05);}assert.equal(e.expansionThreat.slowFactor,.45);assert(e.expansionThreat.siegeSnares.find(x=>x.id==='pad-0').remaining>.7,'Naturally staggered .95 second strong refire');s.pads[0].hp=0;
 for(let n=0;n<15;n++){h.updateExpansionCourse(.05);h.tickExpansionActor(e,.05);}assert(e.expansionThreat.slowFor>0,'Later weak .1.1 second refresh remains active');near(e.expansionThreat.slowFactor,.6,'Strong .8 second slot expires independently of weak refresh');assert(!e.expansionThreat.siegeSnares.some(x=>x.id==='pad-0'));
 s.pads[1].hp=0;for(let n=0;n<17;n++){h.updateExpansionCourse(.05);h.tickExpansionActor(e,.05);}near(e.expansionThreat.slowFactor,1,'All actual effects expire');near(e.expansionThreat.slowFor,0,'No permanent residual snare');assert.equal(e.expansionThreat.siegeSnares.length,0);
});
group('Snare slot IDs and four facilities are bounded with invalid receipt denial',()=>{
 const s=siege.createCrystalSiege();siege.startCrystalSiegeDefense(s);const m=siege.createCrystalSiegeThreat({id:'slot',position:{x:5,z:0},hp:10,speed:2,damage:5});for(let i=0;i<4;i++)assert(siege.applyCrystalSiegeSnare(m,{facilityId:'pad-'+i,factor:i?.6:.45,duration:.8}));assert.equal(m.siegeSnares.length,4);for(const id of ['pad-4','foreign','pad--1'])assert.equal(siege.applyCrystalSiegeSnare(m,{facilityId:id,factor:.1,duration:100}),false);assert.equal(m.siegeSnares.length,4);for(let n=0;n<100;n++){assert(siege.applyCrystalSiegeSnare(m,{facilityId:'pad-1',factor:.6,duration:.8}));siege.stepCrystalSiegeThreat(m,.05,s);assert(m.siegeSnares.length<=4);if(n>18)near(m.slowFactor,.6,'Repeated weak calls cannot keep expired strong slot');}for(let n=0;n<20;n++)siege.stepCrystalSiegeThreat(m,.05,s);assert(m.siegeSnares.length===0&&m.slowFactor===1&&m.slowFor===0);
});
group('Earned carry and actual persisted attrition survive repeated resume and next wave',()=>{
 const earned=earnedEntries.find(e=>e.journey.phase==='course'&&e.journey.room===1&&e.journey.siege.pads.some(p=>p.kind==='wall'&&p.level===2));assert(earned,'Require actually won prior wave carrying a paid wall');const s=journey.restoreExpansionJourney(copy(earned.journey)),pad=s.siege.pads.find(p=>p.kind==='wall'),map=new Map(),storage={getItem:k=>map.get(k)||null,setItem:(k,v)=>map.set(k,v)},store=createExpansionSaveStore(storage,'crystalGorge','endurance:siege-review');let entry=store.write(copy(earned),{fresh:true}).value;assert(entry);pad.hp=12;s.siege.core.hp=35;s.siege.resources=0;siege.startCrystalSiegeDefense(s.siege);for(let n=0;n<100;n++)journey.stepExpansionJourney(s,.05,{enemies:[]});const exit=expansionExitCheckpoint(entry,{hp:68,inventory:{potion:1},siege:siege.checkpointCrystalSiege(s.siege)});assert(exit&&store.write(exit).ok);entry=store.read();const restored=journey.restoreExpansionJourney(entry.journey);assert(restored.siege.phase==='prep'&&restored.siege.spawnIndex===0&&restored.siege.elapsed===0);assert.equal(restored.siege.core.hp,35);assert.equal(restored.siege.resources,0);assert.equal(restored.siege.pads.find(p=>p.id===pad.id).hp,12);assert.equal(restored.siege.pads.find(p=>p.id===pad.id).level,2);assert(restored.siege.nodes.every(n=>!n.harvested),'New-wave nodes are available after earned prior harvest');assert.equal(createExpansionAccountEntry(restored,{...initialRun,stage:1},[-3,0,4],{owner:'endurance',currentOwner:'endurance'}),null);const second=expansionExitCheckpoint(entry,{hp:60,inventory:{potion:0},siege:siege.checkpointCrystalSiege(restored.siege)});assert(store.write(second).ok);assert.equal(store.read().journey.siege.core.hp,35);assert.equal(store.read().journey.siege.pads.find(p=>p.id===pad.id).hp,12);
});
console.log(JSON.stringify({passed,failed,measurements},null,2));
console.log('Actual Node rules/VM host progression and save evidence; player20 or40 per .22 seconds is an explicit bounded synthetic hit policy, not full combat/browser/device balance or boss victory certification.');
if(failed.length)process.exitCode=1;
