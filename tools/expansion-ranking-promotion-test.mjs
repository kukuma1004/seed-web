import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import vm from 'node:vm';
import {EXPANSION_ACTS,expansionCircuitReleased,publicCircuitActCount} from '../src/act-expansion.js';
import {createSurvivalSession} from '../src/survival-rules.js';
import {survivalExpansionRankProgress} from '../src/survival-ranking.js';
import {defenseRankEntry,defenseExpansionRankProgress,validDefenseRank,defenseRankScore} from '../src/defense-ranking.js';
import {migrateSurvivalToFiveActs} from '../src/survival-expansion.js';

const both=Object.fromEntries(Object.entries(EXPANSION_ACTS).map(([k,v])=>[k,{...v,released:true}]));
for(const acts of [EXPANSION_ACTS,{...both,crosswind:{...both.crosswind,released:false}},{...both,crystalGorge:{...both.crystalGorge,released:false}}]){
 assert.equal(expansionCircuitReleased(acts),false);assert.equal(publicCircuitActCount(acts),3);
 assert.equal(survivalExpansionRankProgress(createSurvivalSession(3,{actCount:5}),{acts}).eligible,false);
}
assert.equal(publicCircuitActCount(both),5);assert.equal(survivalExpansionRankProgress(createSurvivalSession(3,{actCount:5}),{acts:both}).eligible,true);
for(const flags of [{inspection:true},{lab:true},{benchmark:{}}]){
 const session={...createSurvivalSession(3,{actCount:5}),...flags};assert.equal(survivalExpansionRankProgress(session,{acts:both,inspection:flags.inspection}).eligible,false);
}
const tower={formId:'returnblade',level:5},old={phase:'lost',wave:37,coreHp:0,kills:200,time:500,towers:[tower]},identity={uid:'a',name:'씨앗'};
const legacy=defenseRankEntry(old,identity);assert(validDefenseRank(legacy));assert.equal(legacy.cleared,36);
assert.deepEqual(defenseRankEntry(old,{...identity,acts:both}),legacy,'existing three-act rank bytes/score stay unchanged');
const migrated={...old,actCount:5,wave:61,migratedWaves:24};
assert.equal(defenseRankEntry(migrated,identity),null,'closed gate never accepts an inspection migration');
const promoted=defenseRankEntry(migrated,{...identity,acts:both});assert(validDefenseRank(promoted));assert.equal(promoted.cleared,36);assert.equal(promoted.score,legacy.score,'24 unplayed routing waves confer no rank score');
const later=defenseRankEntry({...migrated,wave:73},{...identity,acts:both});assert.equal(later.cleared,48);assert.equal(later.score-defenseRankScore(promoted),12*100000);
for(const flags of [{inspection:true},{practice:true}])assert.equal(defenseRankEntry(migrated,{...identity,acts:both,...flags}),null);
assert.equal(defenseRankEntry({...migrated,practice:true},{...identity,acts:both}),null);
assert.equal(defenseRankEntry({...migrated,migratedWaves:-24},{...identity,acts:both}),null);
assert.equal(defenseRankEntry({...migrated,migratedWaves:100},{...identity,acts:both}),null);
assert.equal(defenseRankEntry({...migrated,phase:'won'},{...identity,acts:both}),null,'five-act endless cannot claim the old 12-wave win shortcut');
assert.equal(defenseExpansionRankProgress(migrated).eligible,false);assert.equal(defenseExpansionRankProgress(migrated,{acts:both}).eligible,true);assert.equal(defenseExpansionRankProgress(migrated,{acts:both,inspection:true}).eligible,false);
assert.equal(EXPANSION_ACTS.crosswind.released,false);assert.equal(EXPANSION_ACTS.crystalGorge.released,false);
// Execute the actual launch prefix, including asynchronous scenery preparation.
// A resumed checkpoint must never be rebound to a UID which changed during load.
const main=readFileSync(new URL('../src/main.js',import.meta.url),'utf8'),start=main.indexOf('function startSurvival('),end=main.indexOf(' if(!localInspection&&!requireName())return;',start);
const prefix=main.slice(start,end)+' return {fiveActs,saved};\n}';
function host({released=false,inspection=false,ready=true}={}){
 let owner='A',resolve;const toast={textContent:''},c=vm.createContext({expansionLaunch:0,releaseExpansionSaveLease:()=>{},publicCircuitActCount:()=>released?5:3,localInspection:inspection,expansionJourneyView:ready?{}:null,survivalOwner:()=>owner,prepareExpansionAssets:()=>new Promise(r=>resolve=r),migrateSurvivalToFiveActs,$:()=>toast});
 vm.runInContext(prefix,c);return {c,toast,setOwner:v=>owner=v,complete:()=>{c.expansionJourneyView={};resolve();}};
}
const oldSave={id:'kept-run',revision:4,session:{...createSurvivalSession(3),time:900,act:2,lap:1,completedLaps:1,fastestLap:800},progress:{forms:{returnblade:5},inventory:{tonic:2},hp:45}};
const closed=host();assert.equal(closed.c.startSurvival(null,{...oldSave,session:{...oldSave.session,actCount:5}}),undefined);assert.match(closed.toast.textContent,/보존|그대로/);
const launched=host({released:true}).c.startSurvival(null,oldSave);assert.equal(launched.fiveActs,true);assert.equal(launched.saved.id,'kept-run');assert.equal(launched.saved.revision,4);assert.equal(launched.saved.session.actCount,5);assert.equal(launched.saved.progress.hp,45);assert.equal(launched.saved.progress.inventory.tonic,2);assert.equal(oldSave.session.actCount,undefined,'original bytes are not mutated before accepted next checkpoint');
const loading=host({released:true,ready:false}),promise=loading.c.startSurvival(null,oldSave);loading.setOwner('B');loading.complete();assert.equal(await promise,undefined);assert.match(loading.toast.textContent,/계정이 바뀌/);
console.log('Connected circuit rank promotion: both-acts gate required, real gates remain false, legacy three-act rows unchanged, inspection/practice excluded, migration routing earns zero extra score; no server publish or main route promotion.');
