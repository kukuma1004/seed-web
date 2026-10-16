import assert from 'node:assert/strict';
import {CRYSTAL_TURRET_MAX_LEVEL,CRYSTAL_SIEGE_VERSION,CRYSTAL_SIEGE_PACKETS,createCrystalSiege,buildCrystalSiege,harvestCrystalSiege,startCrystalSiegeDefense,stepCrystalSiege,stepCrystalSiegeBossFacilities,stepCrystalSiegePaidFacilities,checkpointCrystalSiege,restoreCrystalSiege,crystalSiegeBuildCost,crystalSiegeMaxLevel,crystalSiegeFacilityStats,crystalSiegeFacilityMaxHp} from '../src/crystal-siege-rules.js';
import {createJourneySignature,stepJourneySignature} from '../src/journey-act-signatures.js';

const copy=value=>structuredClone(value),groups=[],paidEntries=[],measurements={upgradeCosts:[],boss:[],cadence:[]};
const HP=[45,60,78,98,120],DAMAGE=[24,40,48,58,70],RANGE=[5.4,5.9,6.1,6.35,6.6],PERIOD=[.65,.5,.47,.44,.4];
const PAD_KEYS=['cooldown','hp','id','kind','level','x','z'];
const ENTRY_KEYS=['core','elapsed','nodes','paceVersion','pads','phase','resources','room','seed','spawnClock','spawnIndex','spawned','version'];
function same(a,b){assert.deepEqual(checkpointCrystalSiege(a),checkpointCrystalSiege(b));}
function allResources(state){for(const n of state.nodes)assert(harvestCrystalSiege(state,n.id,n).ok);}
function clearRound(state){assert(startCrystalSiegeDefense(state).ok);let emitted=0;for(let i=0;i<1000&&state.phase!=='clear';i++)emitted+=stepCrystalSiege(state,.1,{enemies:[]}).spawns.length;assert.equal(state.phase,'clear');assert.equal(state.spawnIndex,CRYSTAL_SIEGE_PACKETS[state.room]);assert.equal(emitted,state.spawnIndex+Math.floor(state.spawnIndex/2));return emitted;}
function upgrade(state){const p=state.pads[0],before=state.resources,cost=crystalSiegeBuildCost(p,'turret'),result=buildCrystalSiege(state,p.id,'turret',p);assert(result.ok);assert.equal(result.cost,cost);assert.equal(state.resources,before-cost);assert.equal(p.hp,HP[p.level-1]);assert.equal(p.cooldown,0);return result;}
function paidCampaign(){let previous=null,state=null,spent=0,emitted=0;for(let room=0;room<5;room++){state=createCrystalSiege(room,413+room,previous);allResources(state);while(state.pads[0].level<5&&state.resources>=crystalSiegeBuildCost(state.pads[0],'turret')){state.pads[0].hp=state.pads[0].kind?1:0;const result=upgrade(state);spent+=result.cost;measurements.upgradeCosts.push(result.cost);}emitted+=clearRound(state);previous=checkpointCrystalSiege(state);paidEntries.push(previous);}assert.equal(spent,37);assert.equal(emitted,165);assert.equal(state.resources,26);return state;}

assert.equal(CRYSTAL_SIEGE_VERSION,1);assert.equal(CRYSTAL_TURRET_MAX_LEVEL,5);assert.equal(crystalSiegeMaxLevel('turret'),5);assert.equal(crystalSiegeMaxLevel('snare'),2);assert.equal(crystalSiegeMaxLevel('wall'),2);assert.equal(crystalSiegeMaxLevel('unknown'),0);
const earned=paidCampaign();assert.deepEqual(measurements.upgradeCosts,[3,3,6,10,15]);assert.equal(earned.pads[0].level,5);assert.equal(earned.pads[0].hp,120);assert.equal(crystalSiegeBuildCost(earned.pads[0],'turret'),0);assert.equal(buildCrystalSiege(earned,earned.pads[0].id,'turret',earned.pads[0]).reason,'phase');
groups.push('Five actual resource ledgers fund one Lv5 turret across rooms; 37 spent, 26 retained, 165 bounded packets unchanged');

for(let level=1;level<=5;level++){
 const pad={kind:'turret',level,hp:HP[level-1]},stats=crystalSiegeFacilityStats(pad);assert(Object.isFrozen(stats));assert.equal(crystalSiegeFacilityStats(pad),stats,'shared immutable stats do not allocate each combat tick');assert.deepEqual(stats,{kind:'turret',level,maxHp:HP[level-1],damage:DAMAGE[level-1],range:RANGE[level-1],period:PERIOD[level-1]});assert.equal(crystalSiegeFacilityMaxHp(pad),HP[level-1]);assert(stats.period>=.4);
}
for(const pad of[null,{kind:null,level:0},{kind:'turret',level:6},{kind:'turret',level:1.5},{kind:'snare',level:3},{kind:'wall',level:0},{kind:'unknown',level:1}]){assert.equal(crystalSiegeFacilityStats(pad),null);assert.equal(crystalSiegeFacilityMaxHp(pad),0);}
assert.equal(crystalSiegeBuildCost(null,'turret'),3);assert.equal(crystalSiegeBuildCost(null,'unknown'),0);
groups.push('Explicit five-level HP/damage/range/cadence and bounded invalid stat lookups');

for(let level=1;level<5;level++){
 const state=restoreCrystalSiege(checkpointCrystalSiege(earned));state.phase='prep';state.elapsed=0;state.spawnIndex=state.spawned=0;const p=state.pads[0];Object.assign(p,{level,hp:1,cooldown:.3});const cost=crystalSiegeBuildCost(p,'turret');state.resources=cost-1;const before=copy(state);assert.deepEqual(buildCrystalSiege(state,p.id,'turret',p),{ok:false,reason:'resources'});same(state,before);state.resources=cost;const result=upgrade(state);assert.equal(result.level,level+1);assert.equal(state.resources,0);assert.equal(p.hp,HP[level],'paid upgrade heals the new maximum, preserving old Lv1->2 behavior');
}
for(const kind of['snare','wall']){
 const state=createCrystalSiege(),p=state.pads[0];allResources(state);assert(buildCrystalSiege(state,p.id,kind,p).ok);p.hp=1;const result=buildCrystalSiege(state,p.id,kind,p);assert(result.ok&&result.level===2&&result.cost===2);assert.equal(p.hp,kind==='wall'?110:55);const before=copy(state);assert.equal(crystalSiegeBuildCost(p,kind),0);assert.equal(buildCrystalSiege(state,p.id,kind,p).reason,'max-level');same(state,before);
}
groups.push('Exact resource denial is non-mutating; paid upgrade heals; snare and wall remain two levels');

for(let level=1;level<=5;level++){
 const state=createCrystalSiege(4),p=state.pads[0];Object.assign(p,{kind:'turret',level,hp:0,cooldown:.3});const cost=3+Math.floor((level-1)/2);assert.equal(crystalSiegeBuildCost(p,'turret'),cost);state.resources=cost-1;const before=copy(state);assert.equal(buildCrystalSiege(state,p.id,'turret',p).reason,'resources');same(state,before);state.resources=cost;const result=buildCrystalSiege(state,p.id,'turret',p);assert(result.ok&&result.rebuilt&&result.level===level);assert.equal(result.cost,cost);assert.equal(p.hp,HP[level-1]);assert.equal(p.cooldown,0);assert.equal(state.resources,0);if(level===5)assert.equal(buildCrystalSiege(state,p.id,'turret',p).reason,'max-level');
}
groups.push('Destroyed Lv1..5 rebuilding retains level and costs 3/3/4/4/5; no free reset or upgrade');

// Independent old schema fixtures: all pad values and exact field sets below
// existed before growth. New combat arrays must not rewrite a legacy record.
for(const paceVersion of[undefined,2])for(const kind of['turret','snare','wall'])for(const level of[1,2]){
 const oldMax={turret:[45,60],snare:[40,55],wall:[75,110]}[kind][level-1];
 const legacy={version:1,...(paceVersion?{paceVersion}:{}),room:0,seed:712,phase:'prep',elapsed:4.3,spawnClock:.35,spawnIndex:0,spawned:0,core:{x:0,z:0,hp:87},resources:0,nodes:[[-5,-4.5],[0,-4.5],[5,-4.5],[-5,4.5],[0,4.5],[5,4.5]].map(([x,z],i)=>({id:`node-0-${i}`,x,z,harvested:i===0})),pads:[[-3,-2.5],[3,-2.5],[-3,2.5],[3,2.5]].map(([x,z],i)=>({id:`pad-${i}`,x,z,kind:i===0?kind:null,level:i===0?level:0,hp:i===0?oldMax-7:0,cooldown:i===0?.2:0}))};
 const original=copy(legacy),restored=restoreCrystalSiege(legacy),serialized=checkpointCrystalSiege(restored);assert.deepEqual(serialized,original);assert.deepEqual(legacy,original);assert.equal(crystalSiegeFacilityMaxHp(restored.pads[0]),oldMax);assert.deepEqual(Object.keys(serialized.pads[0]).sort(),PAD_KEYS);assert.deepEqual(Object.keys(serialized).sort(),ENTRY_KEYS.filter(key=>paceVersion||key!=='paceVersion'));
}
const saved=checkpointCrystalSiege(earned);assert.deepEqual(checkpointCrystalSiege(restoreCrystalSiege(saved)),saved);assert.deepEqual(Object.keys(saved).sort(),ENTRY_KEYS);assert.deepEqual(Object.keys(saved.pads[0]).sort(),PAD_KEYS);
const next=createCrystalSiege(3,44,paidEntries[2]);assert.equal(next.pads[0].level,5);assert.equal(next.pads[0].hp,120);assert.equal(next.pads[0].cooldown,0);
groups.push('Twelve independent legacy Lv1/Lv2 checkpoints roundtrip byte-equivalent fields; Lv5 checkpoint and adjacent carry preserve schema/paid HP');

for(let level=1;level<=5;level++){
 const state=restoreCrystalSiege(saved),p=state.pads[0];Object.assign(p,{level,hp:HP[level-1],cooldown:0});const enemies=Object.freeze([Object.freeze({id:'near-pad',x:p.x,z:p.z+.1,hp:1e6}),Object.freeze({id:'near-core',x:0,z:0,hp:1e6})]),before=JSON.stringify(enemies),hit=stepCrystalSiegeBossFacilities(state,.01,enemies);assert.equal(hit.hits.length,1);assert.equal(hit.hits[0].id,level===1?'near-pad':'near-core');assert.equal(hit.hits[0].damage,DAMAGE[level-1]);assert.equal(p.cooldown,PERIOD[level-1]);assert.equal(hit.spawns.length,0);assert.equal(hit.snares.length,0);assert.equal(JSON.stringify(enemies),before);p.cooldown=0;state.journeyRallyPad=p.id;assert.equal(stepCrystalSiegeBossFacilities(state,.01,enemies).hits[0].damage,DAMAGE[level-1]*1.5,'existing earned rally multiplier stays exact');delete state.journeyRallyPad;
 p.cooldown=0;assert.equal(stepCrystalSiegeBossFacilities(state,.01,[{id:'just-out',x:p.x,z:p.z+RANGE[level-1]+.001,hp:1}]).hits.length,0);p.cooldown=0;assert.equal(stepCrystalSiegeBossFacilities(state,.01,[{id:'inside',x:p.x,z:p.z+RANGE[level-1]-.001,hp:1}]).hits.length,1);p.hp=0;p.cooldown=0;assert.equal(stepCrystalSiegeBossFacilities(state,.01,enemies).hits.length,0);
 measurements.boss.push({level,hp:HP[level-1],damage:DAMAGE[level-1],range:RANGE[level-1],period:PERIOD[level-1]});
}
groups.push('All five boss levels emit actual damage/range/cadence; Lv2+ keeps core priority; no enemy mutation, boss snare or dead-turret fire');

for(const hz of[20,60])for(let level=1;level<=5;level++){
 const state=restoreCrystalSiege(saved),p=state.pads[0];Object.assign(p,{level,hp:HP[level-1],cooldown:0});let count=0,damage=0;const enemy=[{id:'boss',x:p.x,z:p.z,hp:1e8}];for(let i=0;i<hz*4;i++){const o=stepCrystalSiegeBossFacilities(state,1/hz,enemy);assert(o.hits.length<=1);count+=o.hits.length;damage+=o.hits.reduce((n,h)=>n+h.damage,0);assert(p.cooldown>=0&&p.cooldown<=PERIOD[level-1]);}assert(count<=Math.ceil(4/PERIOD[level-1])+1);assert(count>=Math.floor(4/(PERIOD[level-1]+1/hz)),'frame quantization may delay a shot but cannot accelerate the turret');assert.equal(damage,count*DAMAGE[level-1]);const before=p.cooldown;assert.equal(stepCrystalSiegeBossFacilities(state,0,enemy).hits.length,0);assert.equal(p.cooldown,before);assert(stepCrystalSiegeBossFacilities(state,1e6,enemy).hits.length<=1,'a resumed frame cannot catch up with an infinite volley');measurements.cadence.push({hz,level,shotsIn4s:count,damage});
}
groups.push('20/60Hz finite cadence preserves .40 lower period bound; zero dt and large resume dt cannot burst');

for(let level=3;level<=5;level++){
 const state=restoreCrystalSiege(saved),p=state.pads[0],enemy=[{id:'boss',x:0,z:0,hp:1e8}];Object.assign(p,{level,hp:HP[level-1],cooldown:0});state.journeyCommand=true;state.journeyRallyPad=null;
 let out=stepCrystalSiegeBossFacilities(state,.01,enemy);assert.equal(out.hits[0].damage,40);assert.equal(p.cooldown,.5);assert.equal(p.hp,HP[level-1]);assert.equal(crystalSiegeFacilityStats(p).maxHp,HP[level-1]);
 p.cooldown=0;assert.equal(stepCrystalSiegeBossFacilities(state,.01,[{id:'outside-baseline',x:p.x,z:p.z+6,hp:1}]).hits.length,0,'uncommanded advanced turret keeps Lv2 range');
 p.cooldown=0;state.journeyRallyPad=p.id;out=stepCrystalSiegeBossFacilities(state,.01,enemy);assert.equal(out.hits[0].damage,DAMAGE[level-1]*1.5);assert.equal(p.cooldown,PERIOD[level-1]);
 p.cooldown=0;assert.equal(stepCrystalSiegeBossFacilities(state,.01,[{id:'advanced-range',x:p.x,z:p.z+RANGE[level-1]-.001,hp:1}]).hits.length,1);
 p.cooldown=0;state.journeyRallyPad='pad-1';out=stepCrystalSiegeBossFacilities(state,.01,enemy);assert.equal(out.hits[0].damage,40,'leaving this pad immediately removes advanced firing stats');assert.equal(p.cooldown,.5);assert.equal(p.hp,HP[level-1]);
 for(const flag of[undefined,false,null,1,'true']){state.journeyCommand=flag;state.journeyRallyPad=null;p.cooldown=0;out=stepCrystalSiegeBossFacilities(state,.01,enemy);assert.equal(out.hits[0].damage,DAMAGE[level-1]);assert.equal(p.cooldown,PERIOD[level-1]);}
}
groups.push('Journey-command-only Lv3+ baseline cap preserves purchased HP; entering/leaving one pad changes exact damage/range/cadence; other modes untouched');

{
 const state=restoreCrystalSiege(saved),pad=state.pads[0];state.journeyCommand=true;state.journeyRallyPad=pad.id;const serialized=checkpointCrystalSiege(state);assert(!Object.hasOwn(serialized,'journeyCommand')&&!Object.hasOwn(serialized,'journeyRallyPad'));assert.deepEqual(serialized,saved);
 const restored=restoreCrystalSiege(serialized);assert(!Object.hasOwn(restored,'journeyCommand')&&!Object.hasOwn(restored,'journeyRallyPad'));const signature=createJourneySignature('crystalGorge',4);
 stepJourneySignature(signature,.01,{player:{x:0,z:0},siege:restored,boss:true});assert.equal(restored.journeyCommand,true);assert.equal(restored.journeyRallyPad,null);restored.pads[0].cooldown=0;assert.equal(stepCrystalSiegeBossFacilities(restored,.01,[{id:'boss',x:0,z:0,hp:1e8}]).hits[0].damage,40,'real first signature tick restores inactive limits before combat');
 stepJourneySignature(signature,.01,{player:{x:pad.x,z:pad.z},siege:restored,boss:true});assert.equal(restored.journeyRallyPad,pad.id);restored.pads[0].cooldown=0;assert.equal(stepCrystalSiegeBossFacilities(restored,.01,[{id:'boss',x:0,z:0,hp:1e8}]).hits[0].damage,105);
 stepJourneySignature(signature,.01,{player:{x:0,z:0},siege:restored,boss:true});assert.equal(restored.journeyRallyPad,null);assert.deepEqual(Object.keys(checkpointCrystalSiege(restored)).sort(),ENTRY_KEYS);
}
groups.push('Command/rally are ephemeral, never checkpointed; actual first signature tick rebuilds the correct inactive or nearby command state');

{
 const run=active=>{const state=restoreCrystalSiege(saved);for(const p of state.pads)Object.assign(p,{kind:'turret',level:5,hp:120,cooldown:0});state.journeyCommand=true;state.journeyRallyPad=active?'pad-0':null;const damage=new Map(state.pads.map(p=>[p.id,0])),shots=new Map(state.pads.map(p=>[p.id,0]));for(let frame=0;frame<600;frame++){const out=stepCrystalSiegeBossFacilities(state,1/60,[{id:'boss',x:0,z:0,hp:1e9}]);for(const hit of out.hits){damage.set(hit.facilityId,damage.get(hit.facilityId)+hit.damage);shots.set(hit.facilityId,shots.get(hit.facilityId)+1);assert.equal(hit.damage,active&&hit.facilityId==='pad-0'?105:40);}for(const p of state.pads)assert.equal(p.hp,120);}return{damage,shots};};
 const inactive=run(false),active=run(true);for(const[id,damage]of inactive.damage){assert.equal(damage,inactive.shots.get(id)*40);assert(damage/10<=80+4&&damage/10>=76,'uncommanded Lv5 turret stays within quantized Lv2 80 DPS');if(id!=='pad-0')assert.equal(active.damage.get(id),damage,'only the actually commanded turret gets extra firepower');}assert(active.damage.get('pad-0')>inactive.damage.get('pad-0')*2.5);assert.equal(40/.5,80);assert.equal(105/.4,262.5);measurements.commandDps={nominalInactive:80,nominalOneCommanded:262.5,tenSecondInactive:Object.fromEntries(inactive.damage),tenSecondOneCommanded:Object.fromEntries(active.damage)};
}
groups.push('Four bought Lv5 turrets retain 120 HP but inactive 80 DPS each; only one nearby commanded turret gains 262.5 nominal DPS');

for(const paceVersion of[undefined,2]){
 const state=createCrystalSiege();if(!paceVersion)delete state.paceVersion;Object.assign(state.pads[0],{kind:'snare',level:2,hp:55});state.phase='defense';const enemies=[{id:'a',x:-3,z:-2.5,hp:1},{id:'b',x:-3,z:-2,hp:1}];const out=stepCrystalSiegePaidFacilities(state,.1,enemies);assert(out.snares.length===(paceVersion?2:1));assert(out.snares.every(hit=>hit.factor===.45&&hit.duration===.8));assert(Math.abs(state.pads[0].cooldown-.95)<1e-12);assert.equal(out.hits.length,0);
}
for(const mutate of[p=>p.level=6,p=>p.level=0,p=>p.level=NaN,p=>p.level=2.5,p=>p.hp=121,p=>p.hp=-1,p=>p.hp=Infinity,p=>p.cooldown=NaN,p=>p.cooldown=1.10001,p=>p.kind='cannon',p=>p.damage=70]){const bad=copy(saved);mutate(bad.pads[0]);assert.throws(()=>restoreCrystalSiege(bad));}
for(const kind of['wall','snare']){const bad=copy(saved);Object.assign(bad.pads[0],{kind,level:3,hp:1});assert.throws(()=>restoreCrystalSiege(bad));}
for(const mutate of[s=>s.version=2,s=>s.maxTurretLevel=5,s=>s.resources=64]){const bad=copy(saved);mutate(bad);assert.throws(()=>restoreCrystalSiege(bad));}
groups.push('Legacy two-level snare behavior unchanged; invalid level/HP/cooldown/kind/new fields/schema rejected');

console.log(JSON.stringify({passed:groups.length,groups,measurements},null,2));
console.log('Actual imported renderless rule/build/restore/facility combat. Finite no-live-enemy packet progression is a synthetic ledger fixture, not player kills, a browser boss victory, account cloud, device performance or release proof.');
