import assert from 'node:assert/strict';
import {EXPANSION_ACTS} from '../src/act-expansion.js';
import {SURVIVAL,createSurvivalSession,advanceSurvivalAct,settleSurvivalKill,survivalAct,survivalBossOrdinal,readSurvivalRecord,recordSurvivalResult} from '../src/survival-rules.js';
import {migrateSurvivalToFiveActs,createSurvivalExpansion} from '../src/survival-expansion.js';
import {captureSurvivalSession,restoreCombatFields,createSurvivalSaveStore,queueSurvivalTitle,settleSurvivalTitles,validSurvivalSave} from '../src/survival-save.js';
import {recordModeBossVictory} from '../src/mode-boss-titles.js';
import {createSurvivalRecordSync,survivalRecordStorage,readSurvivalAccountRecord} from '../src/survival-record-sync.js';

const released=Object.fromEntries(Object.entries(EXPANSION_ACTS).map(([k,v])=>[k,{...v,released:true}]));
const memory=()=>{const rows=new Map();return {rows,getItem:k=>rows.get(k)??null,setItem:(k,v)=>rows.set(k,v)};};
const storage=memory();
const legacy=recordSurvivalResult(storage,{kills:700,time:650,bossesDefeated:3,completedLaps:1,fastestLap:650});
const initial=storage.getItem(SURVIVAL.recordKey);
const result={actCount:5,kills:1234,bossesDefeated:5,time:960,completedLaps:1,fastestLap:960,legacyCompletedLaps:7};
for(const [session,options] of [[result,{}],[result,{acts:released,inspection:true}],[{...result,lab:true},{acts:released}],[{...result,benchmark:{}},{acts:released}],[result,{acts:{...released,crystalGorge:{released:false}}}]]){
 assert.deepEqual(recordSurvivalResult(storage,session,options),legacy);assert.equal(storage.getItem(SURVIVAL.recordKey),initial,'closed/inspection saves remain byte-identical');
}
const five=recordSurvivalResult(storage,result,{acts:released});
assert.equal(five.bestKills,1234);assert.equal(five.bestBosses,5);assert.equal(five.bestTime,960);assert.equal(five.runs,2);
assert.equal(five.wins,1);assert.equal(five.fastestClear,650,'five circuit never changes historical three-act speed');
assert.equal(five.fiveWins,1,'legacy three clears are not credited as new five clears');assert.equal(five.fastestFiveClear,960);
assert.deepEqual(readSurvivalRecord(storage),five);
const faster=recordSurvivalResult(storage,{...result,time:1000,fastestLap:930},{acts:released});assert.equal(faster.fastestFiveClear,930);
const threeAgain=recordSurvivalResult(storage,{kills:500,time:600,bossesDefeated:3,completedLaps:1,fastestLap:600});
assert.equal(threeAgain.wins,2);assert.equal(threeAgain.fastestClear,600);assert.equal(threeAgain.fiveWins,2);assert.equal(threeAgain.fastestFiveClear,930);
const incomplete=recordSurvivalResult(memory(),{...result,completedLaps:0,fastestLap:0},{acts:released});assert.equal(incomplete.fiveWins,0);assert.equal(incomplete.fastestFiveClear,0);assert.equal(incomplete.bestKills,1234);

// Use actual checkpoint migration/serialization and account receipt functions.
// A high old lap or migration mid-circuit must still start each NEW boss at 1.
function snapshot(session){return {version:1,id:'migrated-run',revision:0,session:captureSurvivalSession(session),progress:{hp:40,kills:7,score:70,choicesTaken:2,choiceKills:1,bankedUpgrades:4,elapsed:session.time,levels:{frost:2},forms:{prism:3},inventory:{tonic:3}},player:{position:[0,0,0],baseSlideTarget:[0,0,0],baseSlideDir:[1,0,0],lastMove:[1,0,0]},enemies:[],hostiles:[],expansion:session.act>=3?createSurvivalExpansion(session).checkpoint():null};}
for(const startAct of [0,1,2]){
 const original=snapshot({...createSurvivalSession(17),act:startAct,lap:2,completedLaps:2,fastestLap:650,bossesDefeated:6,time:1600,legStartedAt:1500});
 const bytes=JSON.stringify(original),migrated=migrateSurvivalToFiveActs(original);assert.equal(JSON.stringify(original),bytes);
 let s=migrated.session;const account=memory(),checkpoints=memory(),store=createSurvivalSaveStore(checkpoints,'tester');let token=null;
 const seen={crosswindKeeper:0,crystalGardener:0};
 for(let step=0;step<16;step++){
  const boss=survivalAct(s).type;s.time+=190;s.bossSpawned=true;settleSurvivalKill(s,{boss:true});
  const ordinal=survivalBossOrdinal(s,boss);
  if(boss in seen){
   seen[boss]++;assert.equal(ordinal,seen[boss],`migration act${startAct}: ${boss} exact new victory`);
   assert(queueSurvivalTitle(s,boss,ordinal));let award;
   assert(settleSurvivalTitles(s,e=>{award=recordModeBossVictory(account,{mode:'survival',runId:'migrated-run',...e});return award.saved;}));
   assert.equal(award.wins,seen[boss]);assert.equal(award.awards.includes(boss==='crosswindKeeper'?'crosswindclear':'crystalclear'),seen[boss]>=3);
   assert.equal(recordModeBossVictory(account,{mode:'survival',runId:'migrated-run',boss,ordinal}).counted,false,'checkpoint ACK retry never duplicates victory');
  }else assert.equal(ordinal,s.lap+1,'existing three bosses retain prior semantics');
  const saved=snapshot(s);if(token){saved.revision=token.revision;saved.writeId=token.writeId;}
  const written=store.write(saved,{fresh:!token});assert(written.ok);token=written.value;assert(validSurvivalSave(store.read()));
  const fields=store.read().session;s=restoreCombatFields(createSurvivalSession(17,{actCount:5}),fields,()=>{});
  // The real restore host copies the separately serialized receipt FIFO.
  s.pendingBossTitles=fields.pendingBossTitles;assert.equal(s.crosswindBossWins,seen.crosswindKeeper);assert.equal(s.crystalBossWins,seen.crystalGardener);
  assert(advanceSurvivalAct(s));
 }
 assert(seen.crosswindKeeper>=3&&seen.crystalGardener>=3);
 const bad=store.read();bad.session.crosswindBossWins=-1;assert(!validSurvivalSave(bad));
}

// Existing Firebase best wire stays unchanged; no unposted five-clear fields.
// Shared kills/bosses/time now survive mock PC -> phone -> PC synchronization.
let remote=null,revision=0;
const fetchImpl=async (_url,o)=>o.method==='PUT'?(o.headers['if-match']===String(revision)?(remote=JSON.parse(o.body),revision++,{ok:true,status:200}):{ok:false,status:412}):{ok:true,json:async()=>structuredClone(remote),headers:{get:()=>String(revision)}};
const device=()=>{const storage=memory(),account={user:()=>({uid:'tester'}),tokenSession:async()=>({uid:'tester',idToken:'mock'})};return {storage,sync:createSurvivalRecordSync({storage,account,databaseURL:'https://example.invalid',fetchImpl})};};
const pc=device(),phone=device();recordSurvivalResult(survivalRecordStorage(pc.storage,'tester'),result,{acts:released});
assert.equal((await pc.sync.sync()).kind,'synced');assert.equal((await phone.sync.sync()).kind,'synced');
for(const [key,value] of [['bestKills',1234],['bestBosses',5],['bestTime',960]])assert.equal(readSurvivalAccountRecord(phone.storage,'tester')[key],value);
assert.equal(readSurvivalAccountRecord(pc.storage,'tester').fiveWins,1);assert.equal(readSurvivalAccountRecord(phone.storage,'tester').fiveWins,undefined,'circuit counters remain explicitly device-local');
assert.deepEqual(Object.keys(remote).sort(),['version','bestKills','bestBosses','bestTime','fastestClear'].sort());
recordSurvivalResult(survivalRecordStorage(phone.storage,'tester'),{...result,kills:2000,bossesDefeated:6,time:1300,completedLaps:0},{acts:released});
await phone.sync.sync();await pc.sync.sync();assert.equal(readSurvivalAccountRecord(pc.storage,'tester').bestKills,2000);assert.equal(readSurvivalAccountRecord(pc.storage,'other').bestKills,0);
console.log('Five-act public records, closed/inspection isolation, old-record preservation, mid-circuit migration title ordinals, checkpoint reload/retry and mock account best sync passed. Physical devices/server publication unverified.');
