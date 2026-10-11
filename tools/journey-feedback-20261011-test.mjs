import assert from 'node:assert/strict';
import {createExpansionCourse,stepExpansionCourse,checkpointExpansionCourse,restoreExpansionCourse} from '../src/act-expansion-runtime.js';
import {createCrystalSiege,startCrystalSiegeDefense,stepCrystalSiege,checkpointCrystalSiege,restoreCrystalSiege,buildCrystalSiege,harvestCrystalSiege} from '../src/crystal-siege-rules.js';

const clone=v=>JSON.parse(JSON.stringify(v));
const measurements=[];
// Fast travel must not outrun the newly promised dense formation budget.
for(const hz of [20,60]) for(let room=0;room<5;room++){
 let s=createExpansionCourse('crosswind',{room,seed:413}),count=0,maxPacket=0;
 for(let frame=0;frame<hz*90;frame++){
  const out=stepExpansionCourse(s,1/hz,{player:{x:frame/hz*6,z:0}});
  count+=out.spawns.length;maxPacket=Math.max(maxPacket,out.spawns.length);
  if(frame===hz*2)s=restoreExpansionCourse(clone(checkpointExpansionCourse(s)));
  if(out.finish)break;
 }
 assert.equal(count,[36,39,45,48,51][room]);assert(maxPacket<=2);
 assert.equal(s.distance,[48,56,60,64,44][room]);
 measurements.push({room,hz,kills:count,length:s.distance,seconds:+s.time.toFixed(2)});
}
const legacy=createExpansionCourse('crosswind',{encounterVersion:2});
legacy.distance=80;assert.equal(restoreExpansionCourse(clone(checkpointExpansionCourse(legacy))).distance,80,'old progress and original96-unit route survive');
assert.equal(stepExpansionCourse(legacy,.1,{player:{x:85,z:0}}).finish,false);
// New nights finish as soon as the last actual threat is dead. A living enemy,
// pending packet, pause, or saturated wave cannot grant an early clear.
for(const hz of [20,60]){
 const s=createCrystalSiege(0,9);startCrystalSiegeDefense(s);
 const last={id:'last',x:0,z:0,hp:1};
 for(let i=0;i<hz*16;i++)stepCrystalSiege(s,1/hz,{enemies:[last]});
 assert.equal(s.phase,'defense');assert.equal(s.spawned,27);
 assert.equal(stepCrystalSiege(s,0,{enemies:[]}).clear,false);
 assert.equal(stepCrystalSiege(s,1/hz,{enemies:[]}).clear,true);
 assert(s.elapsed<17);assert.deepEqual(checkpointCrystalSiege(restoreCrystalSiege(clone(checkpointCrystalSiege(s)))),checkpointCrystalSiege(s));
 const old=clone(checkpointCrystalSiege(s));delete old.paceVersion;
 assert.throws(()=>restoreCrystalSiege(old),'old25-second validation is not weakened');
 old.elapsed=25;assert.equal(restoreCrystalSiege(old).paceVersion,undefined);
 assert.throws(()=>restoreCrystalSiege({...old,paceVersion:3}));
}
// Paid upgrades strengthen the weapon and cover more approaches. Priority is
// the core-threatening actor, rather than a harmless nearer distraction.
const s=createCrystalSiege();for(const n of s.nodes)harvestCrystalSiege(s,n.id,n);
assert(buildCrystalSiege(s,'pad-0','turret',s.pads[0]).ok);
startCrystalSiegeDefense(s);
let out=stepCrystalSiege(s,.1,{enemies:[{id:'approach',x:1,z:-2.5,hp:90}]});
assert.deepEqual(out.hits,[{id:'approach',facilityId:'pad-0',damage:24}]);
s.phase='prep';assert(buildCrystalSiege(s,'pad-0','turret',s.pads[0]).ok);startCrystalSiegeDefense(s);
out=stepCrystalSiege(s,.1,{enemies:[{id:'distraction',x:-3,z:-3,hp:90},{id:'core-danger',x:0,z:.5,hp:90}]});
assert.deepEqual(out.hits,[{id:'core-danger',facilityId:'pad-0',damage:40}]);assert.equal(out.hits.length,1);
console.log('Journey feedback rules PASS',JSON.stringify(measurements));
console.log('Normal account, Android device, screenshots, FPS and human difficulty remain separate checks.');

for(const hz of [20,60]){const s=createExpansionCourse('crosswind',{seed:413});let mobs=0;for(let n=0;n<hz*10;n++)mobs+=stepExpansionCourse(s,1/hz,{player:{x:0,z:0}}).spawns.length;assert(mobs>=14&&mobs<=18,'Stationary opening maintains density without spending every later packet');assert(!s.finishAnnounced&&s.spawnIndex<24);}
