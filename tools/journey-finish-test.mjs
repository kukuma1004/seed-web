import assert from 'node:assert/strict';
import {createArborJourney,stepArborJourney,creditArborKill,advanceArborJourney,checkpointArborJourney,restoreArborJourney,ARBOR_ENCOUNTERS} from '../src/arbor-journey.js';
import {createArborBoss,stepArborBoss} from '../src/arbor-boss.js';
import {titleState} from '../src/titles.js';
import {effectiveTitleCombatBonuses} from '../src/title-combat-bonuses.js';
import {validRun,runAct,ACT} from '../src/online-ranking.js';
const clone=v=>JSON.parse(JSON.stringify(v));
const histories=[];
for(const legacy of [false,true]){
 const s=createArborJourney();if(legacy)delete s.encounterVersion;
 const packets=Array.from({length:5},()=>[]),counts=[0,0,0];
 for(let frame=0;frame<40000&&s.phase!=='complete';frame++){
  const out=stepArborJourney(s,.05,{player:{x:0,z:0},alive:s.pending.length});
  for(const a of out.spawns){counts[s.round]++;if(a.role==='mob'&&s.round===0)packets[s.sector].push({...a});}
  const raw=checkpointArborJourney(s);assert.deepEqual(checkpointArborJourney(restoreArborJourney(clone(raw))),raw);
  for(const a of [...s.pending])assert(creditArborKill(s,a.id,a.role));
  if(s.phase==='cleared')assert(advanceArborJourney(s));
 }
 assert.equal(s.phase,'complete');assert.deepEqual(counts,[86,96,106]);assert.equal(s.wardens,15);assert.equal(s.bossWins,3);
 histories.push(packets);
 if(legacy)assert.equal('encounterVersion' in checkpointArborJourney(s),false);
 else assert.equal(s.encounterVersion,2);
}
const v2=histories[0],old=histories[1];
assert.equal(new Set(v2.map(p=>p.slice(0,6).map(a=>a.type).join(','))).size,5);
assert(v2[0].every(a=>a.z<0),'threshold approaches from the front');
assert(v2[1].some(a=>a.x<-4)&&v2[1].some(a=>a.x>4),'fork alternates actual flanks');
assert(v2[2].some(a=>a.z<-4)&&v2[2].some(a=>a.z>4),'pool leaves the lateral escape');
assert(old[0].some(a=>a.z>0),'legacy RNG remains omnidirectional');
assert.equal(ARBOR_ENCOUNTERS.length,5);
for(let r=0;r<3;r++){
 const b=createArborBoss(r,{encounterVersion:2}),expected=[[0,1,2],[1,0,2],[0,1,0,2]][r],seen=[b.pattern];
 for(let i=0;i<4000&&b.cycles===0;i++){const was=b.sequenceIndex;const out=stepArborBoss(b,.1,{player:{x:0,z:1}});assert(out.bolts.length<=7);assert(out.zones.length<=1);if(b.sequenceIndex!==was&&b.cycles===0)seen.push(b.pattern);}
 assert.equal(b.cycles,1);assert.deepEqual(seen,expected);
 assert.deepEqual(createArborBoss(r).sequence,[0,1,2]);
}
const none=titleState(),first=titleState({arbor:true}),veteran=titleState({arbor:true,arborVeteran:true}),clear=titleState({arbor:true,arborVeteran:true,arborClear:true});
assert.equal(none.attackCadence,1);assert.equal(first.attackCadence,1.01);assert.equal(veteran.attackCadence,1.03);assert.equal(clear.clearStatBonus,.01);
assert.equal(clear.powerBonus,0);assert.equal(clear.cooldownBonus,0);
assert.equal(effectiveTitleCombatBonuses(clear).cadence,1.04);
assert.equal(new Set(clear.titles.map(x=>x.id)).size,3);
for(let cycle=0;cycle<3;cycle++){
 const cap=[86,182,288][cycle],entry={uid:'ordinary',name:'씨앗',act:ACT.ARBOR,cycle,stage:4,kills:cap,score:[13000,27000,39750][cycle],time:300*(cycle+1),at:Date.now(),done:cycle===2};
 assert.equal(runAct(entry),6);assert(validRun(entry));assert(!validRun({...entry,kills:cap+1}));
 if(cycle<2)assert(!validRun({...entry,done:true}));
}
assert(!validRun({uid:'ordinary',name:'씨앗',act:6,cycle:3,stage:4,kills:300,score:40000,time:2000,at:Date.now()}));
console.log('Journey finish: old/new full 288-actor ledgers, five directional encounters, three bounded boss sequences, six-act title stacking and ranking boundaries PASS (CPU, not natural/device play).');
