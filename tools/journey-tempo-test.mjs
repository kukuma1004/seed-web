import assert from 'node:assert/strict';
import {readFileSync,writeFileSync} from 'node:fs';
import vm from 'node:vm';
import * as THREE from 'three';
import {journeyTravelScale,journeyReinforcementScale} from '../src/journey-tempo.js';
import {act3RoomPressure,isAct3} from '../src/act3.js';
import {crowdInterval} from '../src/crowd.js';
import {createExpansionCourse,stepExpansionCourse,checkpointExpansionCourse,restoreExpansionCourse,crosswindCourseLength,CROSSWIND_DENSE_PACKETS} from '../src/act-expansion-runtime.js';
import {createExpansionJourney,stepExpansionJourney,checkpointExpansionJourney} from '../src/expansion-journey.js';
import {startCrystalSiegeDefense} from '../src/crystal-siege-rules.js';

// Shipping movement/spawn expressions plus real finite course and siege rules.
// This is CPU/host evidence, not human play or mobile performance certification.
const source=readFileSync(new URL('../src/main.js',import.meta.url),'utf8');
const movement=source.match(/player\.position\.addScaledVector\(move,(dt\*PLAYER_SPEED.*?)\);if\(expansionJourney/)?.[1];
const cadence=source.match(/crowdTimer=(crowdInterval\(cycle\).*?);\}/)?.[1];
assert(movement&&cadence,'shipping movement and reinforcement expressions found');
const oldMovement=movement.replace('*journeyTravelScale(region,expansionJourney?.act,Boolean(survivalSession||mirrorSession||trainingSession))','');
assert.notEqual(movement,oldMovement,'negative control actually removes the new factor');
const cases=[
 ['garden',null,false,false,false,1],['stadium',null,false,false,false,1],
 ['skyway',null,false,false,false,1.08],['garden','crosswind',false,false,false,1.12],
 ['garden','crystalGorge',false,false,false,1.12],['skyway',null,true,false,false,1],
 ['skyway',null,false,true,false,1],['skyway',null,false,false,true,1],
 ['garden','crosswind',true,false,false,1],['garden','crystalGorge',false,true,false,1]
];
for(const hz of [20,60])for(const [region,act,survival,mirror,training,ratio] of cases){
 const scope={dt:1/hz,PLAYER_SPEED:6.09,ACT3_PLAYER_SPEED:1.16,isAct3,region,
  expansionJourney:act?{act}:null,survivalSession:survival?{}:null,mirrorSession:mirror?{}:null,trainingSession:training?{}:null,
  journeyTravelScale,runMoveScale:()=>1.07,runBonuses:{},masteryRate:()=>.04,titleState:{moveSpeed:1.05},playerSlow:0,hasteTime:0,ITEMS:{wind:{speed:1.3}}};
 vm.createContext(scope);
 const move=new THREE.Vector3(1,0,1).normalize(),now=new THREE.Vector3(),before=new THREE.Vector3();
 for(let i=0;i<hz*2;i++){now.addScaledVector(move,vm.runInContext(movement,scope));before.addScaledVector(move,vm.runInContext(oldMovement,scope));}
 assert(Math.abs(now.length()/before.length()-ratio)<1e-10,'real shipping movement keeps stat factors and scoped tempo');
 scope.playerSlow=1;scope.hasteTime=1;
 assert(Math.abs(vm.runInContext(movement,scope)/vm.runInContext(oldMovement,scope)-ratio)<1e-10,'slow/haste remain multiplicative');
}
for(const stage of [0,1,2,3,4])for(const cycle of [0,20,99]){
 const c={crowdInterval,cycle,isAct3,region:'skyway',act3RoomPressure,stage,isAct2:()=>false,ACT2_PRESSURE:{},journeyReinforcementScale,mirrorSession:null,trainingSession:null};vm.createContext(c);
 assert(Math.abs(vm.runInContext(cadence,c)-crowdInterval(cycle)*act3RoomPressure(stage).crowdInterval*.82)<1e-12);
 c.mirrorSession={};assert(Math.abs(vm.runInContext(cadence,c)-crowdInterval(cycle)*act3RoomPressure(stage).crowdInterval)<1e-12);
 c.mirrorSession=null;c.trainingSession={};assert(Math.abs(vm.runInContext(cadence,c)-crowdInterval(cycle)*act3RoomPressure(stage).crowdInterval)<1e-12);
}
const copy=o=>JSON.parse(JSON.stringify(o)),metrics=[];
function courseRun(room,fastPacing,hz){
 let s=createExpansionCourse('crosswind',{room,seed:413}),actors=0;const length=crosswindCourseLength(s);
 for(let f=0;f<hz*120;f++){
  const context={fastPacing,player:{x:Math.min(length,s.time*6.09*(fastPacing?1.12:1)),z:Math.sin(s.time)*2.5}};
  const out=stepExpansionCourse(s,1/hz,context);actors+=out.spawns.length;
  assert(out.spawns.length<=2);for(const e of out.spawns){assert(e.windup>=.7&&e.shots===1);}
  if(f===hz*2){const restored=restoreExpansionCourse(copy(checkpointExpansionCourse(s)));assert.deepEqual(copy(checkpointExpansionCourse(restored)),copy(checkpointExpansionCourse(s)));s=restored;}
  if(out.finish)return {seconds:s.time,actors,packets:s.spawnIndex};
 }
 throw Error('finite course failed to finish');
}
for(const hz of [20,60])for(let room=0;room<5;room++){
 const before=courseRun(room,false,hz),after=courseRun(room,true,hz);
 assert(after.seconds<before.seconds*.92,'advancing legal control encounters finish sooner');
 assert.equal(after.actors,before.actors);assert.equal(after.packets,CROSSWIND_DENSE_PACKETS[room]);
 metrics.push({hz,room,before,after});
}
for(const revision of [1,2]){
 const a=createExpansionCourse('crosswind',{encounterVersion:revision}),b=restoreExpansionCourse(copy(checkpointExpansionCourse(a)));
 for(let i=0;i<500;i++){assert.deepEqual(copy(stepExpansionCourse(a,.05,{player:{x:i*.2,z:0}})),copy(stepExpansionCourse(b,.05,{fastPacing:true,player:{x:i*.2,z:0}})));}
}
const held=createExpansionCourse('crosswind');let heldCount=0;
for(let i=0;i<600;i++)heldCount+=stepExpansionCourse(held,.1,{fastPacing:true,player:{x:0,z:0}}).spawns.length;
assert.equal(held.spawnIndex,4);assert.equal(heldCount,6,'standing still cannot spend later packets');
const capped=createExpansionCourse('crosswind');
for(let i=0;i<1000;i++)assert.equal(stepExpansionCourse(capped,100,{fastPacing:true,player:{x:48,z:0},enemyCount:24}).spawns.length,0);
assert.equal(capped.spawnIndex,0);assert(stepExpansionCourse(capped,100,{fastPacing:true,player:{x:48,z:0}}).spawns.length<=2,'no background/cap catch-up burst');
const original=createExpansionCourse('crosswind');
for(let i=0;i<50;i++)stepExpansionCourse(original,.05,{fastPacing:true,player:{x:i*.15,z:1}});
const fork=restoreExpansionCourse(copy(checkpointExpansionCourse(original)));
for(let i=0;i<250;i++){const c={fastPacing:true,player:{x:8+i*.15,z:1}};assert.deepEqual(copy(stepExpansionCourse(original,.05,c)),copy(stepExpansionCourse(fork,.05,c)));}
const siege=createExpansionJourney('crystalGorge',0,413,{siege:true,quickPrep:true});startCrystalSiegeDefense(siege.siege);
const siegeControl=createExpansionJourney('crystalGorge',0,413,{siege:true,quickPrep:true});startCrystalSiegeDefense(siegeControl.siege);
for(let i=0;i<900;i++){
 const context={player:{x:-3,z:4},enemies:[]};
 assert.deepEqual(copy(stepExpansionJourney(siege,1/60,{...context,fastPacing:true})),copy(stepExpansionJourney(siegeControl,1/60,context)));
}
assert.deepEqual(checkpointExpansionJourney(siege),checkpointExpansionJourney(siegeControl),'Act5 finite wave/timing/economy save stays unchanged');
const hostCall=source.match(/const out=expansionApi\.stepExpansionJourney\(expansionJourney,siegeDt,(\{player:player\.position.*?\})\);/)?.[1];assert(hostCall);
const host={expansionJourney:{act:'crosswind'},siegeDt:.05,player:{position:{x:0,z:0}},expansionSiegeInputs:[],enemies:[],enemyShots:[]};vm.createContext(host);
assert.equal(vm.runInContext(`(${hostCall})`,host).fastPacing,true,'real Journey host opts in');
assert(!readFileSync(new URL('../src/survival-expansion.js',import.meta.url),'utf8').includes('fastPacing:true'),'shared survival course does not opt in');
writeFileSync(new URL('../artifacts/journey-tempo-metrics-20261013.json',import.meta.url),JSON.stringify({kind:'CPU rules and source-host tests, not native/device',metrics},null,2));
console.log('Journey tempo PASS: real movement/cadence scopes, faster finite routes, fixed warnings/220 actors, no stationary farm/catchup, deterministic resume, unchanged legacy/shared siege.');
console.log(JSON.stringify(metrics.filter(m=>m.hz===60).map(m=>({room:m.room+1,before:+m.before.seconds.toFixed(2),after:+m.after.seconds.toFixed(2),actors:m.after.actors}))));
