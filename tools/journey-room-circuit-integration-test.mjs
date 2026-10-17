import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createArborJourney,stepArborJourney,creditArborKill,advanceArborJourney,arborRoomIndex,arborRunMaxKills} from '../src/arbor-journey.js';
import {createArborEntry,validArborEntry} from '../src/arbor-run-save.js';
import {validArborPublicEntry} from '../src/arbor-account-records.js';
import {createExpansionJourney,stepExpansionJourney,advanceExpansionJourney,expansionRoomCircuitKillBudget} from '../src/expansion-journey.js';
import {expansionGuardianId,creditExpansionGuardian} from '../src/expansion-guardians.js';
import {createExpansionEntry,validExpansionEntry} from '../src/expansion-run-save.js';
import {JOURNEY_ROOM_CIRCUIT_KILLS,ARBOR_ROOM_CIRCUIT_KILLS,CROSSWIND_GATE_ARENAS} from '../src/journey-room-circuit.js';
import {validRun} from '../src/online-ranking.js';
import {insideArena} from '../src/arena.js';
import {journeyRoomLayout} from '../src/journey-room-layouts.js';
const base=(stage=0)=>({version:1,cycle:0,region:'garden',stage,mode:'entry',hp:90,kills:0,elapsed:0,rules:[],mutated:[],forms:{},inventory:{potion:0,tonic:0,wind:0,shell:0,sprout:0},score:0,choicesTaken:0,choiceKills:0,wardens:0,austins:0});
let entries=0;
const s=createArborJourney(null,{roomCircuit:true});
for(let frame=0;frame<60000&&s.phase!=='complete';frame++){
 if(!s.spawnIndex&&!s.pending.length||s.phase==='cleared'||s.phase==='complete'){
  const run={...base(arborRoomIndex(s)),cycle:s.round,kills:s.kills,elapsed:s.time,wardens:s.wardens,austins:s.bossWins};
  const entry=createArborEntry(s,run,'cpu-room-circuit',{id:'circuit-account',revision:entries+1});assert(entry);entry.savedAt=entries+1;
  assert(validArborEntry(entry));assert(validArborPublicEntry(entry));
  const wrong=structuredClone(entry);wrong.run.stage=(wrong.run.stage+1)%5;assert(!validArborEntry(wrong));entries++;
 }
 if(s.phase==='cleared'){assert(advanceArborJourney(s));continue;}
 const out=stepArborJourney(s,.1,{player:{x:0,z:5},alive:s.pending.length});for(const actor of [...s.pending])assert(creditArborKill(s,actor.id,actor.role));
}
assert.equal(s.phase,'complete');assert.equal(s.kills,1488);assert.equal(s.wardens,15);assert.equal(s.bossWins,3);
for(let round=0;round<3;round++)assert.equal(arborRunMaxKills(round,{roomCircuit:true}),ARBOR_ROOM_CIRCUIT_KILLS[round]);
for(const act of ['crosswind','crystalGorge']){
 const j=createExpansionJourney(act,0,413,{roomCircuit:true,siege:act==='crystalGorge'});let normal=0,gates=0,lastCourse=null;
 for(let guard=0;guard<100000&&j.phase==='course';guard++){
  if(j.course!==lastCourse){assert(createExpansionEntry(j,base(j.room),[0,0,5],{id:'expansion-circuit'}),`${act} gate${j.guardians.cleared} room${j.room}`);lastCourse=j.course;}
  if(j.room===4){assert(creditExpansionGuardian(j,expansionGuardianId(j)));const e={version:1,policy:'room-entry',id:'bad-credit',revision:0,journey:null,run:base(4),position:[0,0,5]};
   // The live cleared state may be restored for rollback, but is not a new entrance.
   assert.equal(createExpansionEntry(j,e.run,e.position,{id:e.id}),null);gates++;assert(advanceExpansionJourney(j));continue;}
  const out=stepExpansionJourney(j,.1,{player:{x:1000,z:0},enemyCount:0,enemies:[],fastPacing:true,projectileCount:0,laneHalfDepth:8.1});normal+=out.spawns.length;
  if(out.finish)assert(advanceExpansionJourney(j));
 }
 assert.equal(j.phase,'boss');assert.equal(gates,5);assert.equal(normal+6,expansionRoomCircuitKillBudget(act));assert.equal(normal+6,JOURNEY_ROOM_CIRCUIT_KILLS[act==='crosswind'?4:5]);
 assert(createExpansionEntry(j,base(4),[0,0,5],{id:'boss-entrance'}));
}
for(const arena of CROSSWIND_GATE_ARENAS){assert(insideArena(arena.start,.4,arena));assert(insideArena(arena.exit,.4,arena));for(const p of arena.spawns)assert(insideArena(p,.6,arena));}
const layouts=Array.from({length:5},(_,gate)=>journeyRoomLayout('crosswind',4,gate,{gateRoom:true}));assert.equal(new Set(layouts.map(l=>JSON.stringify(l.cover))).size,5);assert(layouts.every(l=>l.courseLength===28));
const rankBase={uid:'cpu',name:'새싹',score:20000,stage:4,cycle:0,kills:0,time:10000,at:1,done:false};
for(const act of [4,5,6])for(let cycle=0;cycle<3;cycle++){const max=act===6?ARBOR_ROOM_CIRCUIT_KILLS[cycle]:JOURNEY_ROOM_CIRCUIT_KILLS[act]*(cycle+1),r={...rankBase,act,cycle,kills:max,score:max*25+6000};assert(validRun(r));assert(!validRun({...r,kills:max+1}));}
const main=readFileSync('src/main.js','utf8');assert(main.includes('arborApi.arborRoomIndex(arborEntry.world)!==arborApi.arborRoomIndex(arborJourney)'));assert(main.includes('roomCircuit:expansionApi.expansionRoomCircuit(expansionJourney)'));
console.log(`Room circuit integration PASS: ${entries} Arbor entrance/clear/account bindings, actual Act4/5 finite packets and5 warden admissions, live-credit entrance rejection,5 real gate polygons, accurate untruncated ranking budgets. Module simulation, not natural browser wins.`);
