import {installSiegeFeedbackHost} from './siege-feedback-host-fixture.mjs';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import * as THREE from 'three';
import * as siege from '../src/crystal-siege-rules.js';
import * as journey from '../src/expansion-journey.js';
import {createExpansionEntry,validExpansionEntry} from '../src/expansion-run-save.js';
import {constrainToArena} from '../src/arena.js';
import {expansionPurposeText,expansionPurposeHint,expansionExitText,crystalBossGuardSpawns,keepCrystalBossApproachOpen} from '../src/journey-purpose.js';
import {createJourneySignature,stepJourneySignature} from '../src/journey-act-signatures.js';

// The historical host remains a Lv1/Lv2 save/combat regression. This independent
// policy raises only that fixture's preparation cap to Lv5, then runs the real
// shipping Journey signature before every extracted main course/actor step.
// Each preparation still walks, harvests and pays to build. Only defense nights
// are stationary/zero-attack; this is not a claim of a wholly input-free run.
const main=fs.readFileSync(new URL('../src/main.js',import.meta.url),'utf8'),baseline=fs.readFileSync(new URL('./crystal-siege-endurance-test.mjs',import.meta.url),'utf8');
const source=(name,next)=>{const start=main.indexOf('function '+name+'('),end=main.indexOf('\nfunction '+next+'(',start);assert(start>0&&end>start);return main.slice(start,end);};
const hostSource=baseline.slice(baseline.indexOf('function host(j){'),baseline.indexOf('// No enemy is removed'));
let courseSource=baseline.slice(baseline.indexOf('function course({'),baseline.indexOf("group('Actual host end-to-end"));
assert.equal(courseSource.split('if(a.point.level<2||a.point.hp<=0)').length,2,'legacy baseline owns an explicit Lv2 cap');
courseSource=courseSource.replace('if(a.point.level<2||a.point.hp<=0)','if(a.point.level<5||a.point.hp<=0)').replace(' return result;',' result.command=j.siege.journeyCommand===true;result.rally=j.siege.journeyRallyPad;result.maxPaidLevel=h.maxPaidLevel;result.commandTicks=h.commandTicks;result.rallyTicks=h.rallyTicks;return result;');
assert(courseSource.includes('result.commandTicks=h.commandTicks'));
const context={installSiegeFeedbackHost,expansionPurposeText,expansionPurposeHint,expansionExitText,crystalBossGuardSpawns,keepCrystalBossApproachOpen,THREE,siege,journey,assert,vm,createExpansionEntry,validExpansionEntry,constrainToArena,source,updateSource:source('updateExpansionCourse','tickExpansionActor'),actorSource:source('tickExpansionActor','waveExpansionJourney'),copy:value=>JSON.parse(JSON.stringify(value)),earnedEntries:[],initialRun:{version:1,cycle:0,region:'garden',stage:0,mode:'entry',hp:100,kills:0,elapsed:0,rules:[],mutated:[],forms:{},inventory:{potion:2},score:0,choicesTaken:0,choiceKills:0}};
vm.createContext(context);vm.runInContext(hostSource+'\n'+courseSource,context);
const originalHost=context.host;
context.host=j=>{
 const h=originalHost(j),update=h.updateExpansionCourse;let oldSiege=null,signature=null;h.commandTicks=0;h.rallyTicks=0;h.maxPaidLevel=0;
 h.updateExpansionCourse=dt=>{
  if(j.siege!==oldSiege){oldSiege=j.siege;signature=createJourneySignature('crystalGorge',j.room);}
  stepJourneySignature(signature,dt,{player:h.player.position,siege:j.siege,boss:j.phase==='boss',cleared:false});
  if(j.siege.journeyCommand===true)h.commandTicks++;if(j.siege.journeyRallyPad)h.rallyTicks++;for(const p of j.siege.pads)if(p.kind==='turret')h.maxPaidLevel=Math.max(h.maxPaidLevel,p.level);
  return update(dt);
 };
 return h;
};
const zeroAttack=[],active=[];
for(const hz of[20,60])for(const seed of[1,413,900])for(const quickPrep of[false,true]){
 const result=context.course({seed,hz,layout:'turrets',shotDamage:0,quickPrep});
 assert.equal(result.command,true,'real Journey command hook must run');assert.equal(result.rally,null,'stationary center is outside all paid command radii');assert.equal(result.rallyTicks,0);assert(result.commandTicks>0);assert(result.maxPaidLevel>=3,'this must exercise advanced upgrades, not silently repeat the Lv2 baseline');assert.equal(result.boss,false,'advanced purchased turrets without player offense or local command must not clear all five nights');assert.equal(result.waves.at(-1).phase,'failed');assert.equal(result.waves.at(-1).coreAfter,0);assert(result.waves.every(w=>w.playerDamage===0));
 zeroAttack.push({seed,hz,quickPrep,maxPaidLevel:result.maxPaidLevel,boss:result.boss,failedNight:result.waves.at(-1).room+1,seconds:result.seconds,commandTicks:result.commandTicks,rallyTicks:result.rallyTicks});
}
for(const hz of[20,60])for(const quickPrep of[false,true]){
 const result=context.course({seed:413,hz,layout:'balanced',shotDamage:40,quickPrep});assert.equal(result.command,true);assert(result.waves.some(w=>w.playerDamage>0));active.push({seed:413,hz,quickPrep,boss:result.boss,maxPaidLevel:result.maxPaidLevel,seconds:result.seconds});
}
assert(active.some(r=>r.boss),'an explicitly bounded active route must remain possible');assert(active.some(r=>r.maxPaidLevel===5),'a paid Lv5 turret must remain attainable');
console.log(JSON.stringify({zeroAttackPolicies:zeroAttack.length,zeroAttackReachedBoss:zeroAttack.filter(r=>r.boss).length,zeroAttack,activePolicies:active.length,activeReachedBoss:active.filter(r=>r.boss).length,active},null,2));
console.log('Actual imported Journey signature/rules and extracted shipping main host/actors; fixed seeds at20/60Hz. Preparation uses explicit synthetic movement/harvest/build and active controls use40 damage per .22s. Not native inputs, human difficulty, normal-account cloud, physical performance or final boss victory proof.');
