import assert from 'node:assert/strict';
import {recordModeBossVictory} from '../src/mode-boss-titles.js';
import {normalizeBossRuns,mergeBossRuns} from '../src/boss-title-ledger.js';
import {readAccountProfile,writeAccountProfile} from '../src/account-profile.js';
import {readFileSync} from 'node:fs';
import vm from 'node:vm';
const data=new Map(),store={getItem:k=>data.get(k)||null,setItem:(k,v)=>data.set(k,v)};
writeAccountProfile(store,{austinWins:8});
const event={mode:'defense',runId:'same-run',boss:'austin',ordinal:1};
let r=recordModeBossVictory(store,event);assert.deepEqual(r.awards,['austin']);assert.equal(r.wins,9);
assert(!recordModeBossVictory(store,event).counted);assert.equal(readAccountProfile(store).austinWins,9);
r=recordModeBossVictory(store,{...event,mode:'survival'});assert.equal(r.wins,10);assert.deepEqual(r.awards,['austin','austinveteran']);
r=recordModeBossVictory(store,{...event,ordinal:2});assert(!r.awards.includes('austinclear'));
r=recordModeBossVictory(store,{...event,ordinal:3});assert(r.awards.includes('austinclear'));
for(const boss of ['alwaysbeginner','tempestcarrier']){for(let n=1;n<=10;n++)r=recordModeBossVictory(store,{...event,boss,ordinal:n});assert.equal(r.awards.length,3);assert.equal(r.wins,10);}
const before=JSON.stringify(readAccountProfile(store));for(const extra of [{practice:true},{mode:'journey'},{ordinal:0},{runId:'__proto__:no'},{boss:'warden'}])assert(!recordModeBossVictory(store,{...event,...extra}).saved);assert.equal(JSON.stringify(readAccountProfile(store)),before);
const merged=mergeBossRuns({'survival:run':{at:10,austin:3}},{'survival:run':{at:20,austin:1,alwaysbeginner:2}});assert.equal(merged['survival:run'].austin,3);assert.equal(merged['survival:run'].alwaysbeginner,2);
// Adventure uses the same account receipt path. Reloading or merging an older
// checkpoint must retain its high-water mark, not award the same boss again.
for(const boss of ['austin','alwaysbeginner','tempestcarrier']){
 const attempt={mode:'adventure',runId:'adventure-reload',boss,ordinal:1,now:200};
 const countBefore=readAccountProfile(store)[boss==='austin'?'austinWins':boss==='alwaysbeginner'?'alwaysWins':'johanWins'];
 assert.equal(recordModeBossVictory(store,attempt).counted,true);
 const after=readAccountProfile(store);assert.equal(after.bossRuns['adventure:adventure-reload'][boss],1);
 assert.equal(recordModeBossVictory(store,attempt).counted,false);
 const old=normalizeBossRuns({'adventure:adventure-reload':{at:100,[boss]:0}});
 after.bossRuns=mergeBossRuns(after.bossRuns,old);writeAccountProfile(store,after);
 assert.equal(recordModeBossVictory(store,attempt).counted,false);
 assert.equal(readAccountProfile(store)[boss==='austin'?'austinWins':boss==='alwaysbeginner'?'alwaysWins':'johanWins'],countBefore+1);
}
for(const id of ['journey:r','adventure:','adventure:a/b','adventure:'+ 'x'.repeat(91)])assert.equal(Object.keys(normalizeBossRuns({[id]:{at:1,austin:1}})).length,0);
assert.equal(Object.keys(normalizeBossRuns(Object.fromEntries(Array.from({length:100},(_,i)=>['defense:r'+i,{at:i,austin:1}])))).length,64);
const broken={getItem:()=>null,setItem:()=>{throw Error('quota');}};assert(!recordModeBossVictory(broken,event).saved);
// Execute the real survival retry bridge: a failed write remains in its
// checkpoint's primitive fields; practice and switched accounts cannot grant.
const main=readFileSync(new URL('../src/main.js',import.meta.url),'utf8');
const calls=[],ctx=vm.createContext({survivalSession:{titleBoss:'tempestcarrier',titleOrdinal:3},localInspection:false,developerRun:false,survivalSaveToken:{id:'saved-run',owner:'same'},survivalOwner:()=> 'same',awardModeBoss:(...args)=>{calls.push(args);return false;}});
vm.runInContext(main.slice(main.indexOf('function settleSurvivalTitle(){'),main.indexOf('function saveSurvival(){')),ctx);
ctx.settleSurvivalTitle();assert.equal(ctx.survivalSession.titleBoss,'tempestcarrier');assert.deepEqual(calls[0],['survival','saved-run','tempestcarrier',3,false]);
ctx.awardModeBoss=(...args)=>{calls.push(args);return true;};ctx.survivalSaveToken.owner='different';ctx.settleSurvivalTitle();assert.equal(calls.at(-1).at(-1),true);assert.equal(ctx.survivalSession.titleBoss,undefined);
// Execute the actual adventure view bridge with deterministic timers and real
// account receipts. These are VM checks, not browser/device validation.
const view=readFileSync(new URL('../src/seed-adventure-view.js',import.meta.url),'utf8');
const bridge=view.slice(view.indexOf('function resetBossAccount(){'),view.indexOf('// 판의 진행'));
assert(bridge.includes('function syncBossAccount(){'));
const adventureData=new Map();let failNext=false;
const adventureStore={getItem:k=>adventureData.get(k)||null,setItem:(k,v)=>{if(failNext){failNext=false;throw Error('quota');}adventureData.set(k,v);}};
function adventureBridge(runId,bossesDefeated){
 const timers=new Map(),attempts=[];let serial=0;
 const b=vm.createContext({s:{runId,bossesDefeated},document:{hidden:false},closed:false,practice:false,
  bossRetryTimer:0,lastBossRun:'',settledBosses:new Set(),ROOMS_PER_ACT:4,
  adventureRoomInfo:room=>({actInfo:{boss:['austin','alwaysbeginner','tempestcarrier'][Math.floor(room/4)]}}),
  onBossDefeated:e=>{attempts.push(e);return recordModeBossVictory(adventureStore,{...e,mode:'adventure'}).saved;},
  setTimeout:(fn,delay)=>{assert.equal(delay,2000);timers.set(++serial,fn);return serial;},clearTimeout:id=>timers.delete(id)
 });
 vm.runInContext(bridge,b);
 return {b,timers,attempts,retry(){assert.equal(timers.size,1);const [id,fn]=timers.entries().next().value;timers.delete(id);fn();}};
}
const retry=adventureBridge('retry-room',1);failNext=true;retry.b.syncBossAccount();
assert.equal(readAccountProfile(adventureStore).austinWins,0);assert.equal(retry.b.settledBosses.size,0);
retry.b.syncBossAccount();assert.equal(retry.attempts.length,1,'failed writes are throttled, not retried each frame');
retry.retry();assert.equal(retry.b.settledBosses.size,1);assert.equal(retry.timers.size,0);
assert.equal(readAccountProfile(adventureStore).austinWins,1);
retry.b.syncBossAccount();assert.equal(retry.attempts.length,2,'settled bosses are skipped');
const restored=adventureBridge('retry-room',1);restored.b.syncBossAccount();
assert.equal(readAccountProfile(adventureStore).austinWins,1,'saved door reload cannot duplicate a receipt');
retry.b.s.runId='new-seed';retry.b.syncBossAccount();
assert.equal(readAccountProfile(adventureStore).austinWins,2,'the same boss on a new run is counted');
const two=adventureBridge('two-doors',2);failNext=true;two.b.syncBossAccount();
assert.equal(readAccountProfile(adventureStore).alwaysWins,1);assert.equal(two.b.settledBosses.size,1);
two.retry();assert.equal(two.b.settledBosses.size,2);assert.equal(readAccountProfile(adventureStore).austinWins,3);
assert.equal(readAccountProfile(adventureStore).alwaysWins,1,'retrying one failed act does not duplicate the other');
const training=adventureBridge('practice',3);training.b.practice=true;training.b.syncBossAccount();
assert.equal(training.attempts.length,0);assert.equal(training.b.settledBosses.size,3);
const hidden=adventureBridge('hidden-retry',1);failNext=true;hidden.b.syncBossAccount();hidden.b.document.hidden=true;hidden.retry();
assert.equal(hidden.attempts.length,1);assert.equal(hidden.timers.size,0);
hidden.b.document.hidden=false;hidden.b.syncBossAccount();assert.equal(hidden.b.settledBosses.size,1,'foreground resumes a suspended retry');
const closing=adventureBridge('close-retry',1);failNext=true;closing.b.syncBossAccount();closing.b.resetBossAccount();
assert.equal(closing.timers.size,0);assert.equal(closing.b.bossRetryTimer,0);assert.equal(closing.b.settledBosses.size,0);
closing.b.closed=true;closing.b.syncBossAccount();assert.equal(closing.attempts.length,1);
assert(view.includes("resetBossAccount();lastForm=null;combat?.dispose();s=createAdventure"));
assert(view.includes('resetBossAccount();combat?.dispose();s=run;lastForm=s.formId;'));
assert(view.includes("listen(window,'pageshow',()=>{syncBossAccount();"));
const modal=view.slice(view.indexOf('function syncModal(){'),view.indexOf("if(key==='setup')"));
assert(modal.indexOf('syncAccount();')>=0&&modal.indexOf('syncAccount();')<modal.indexOf("if(key===modalKey)"));
console.log('Shared boss titles: first/10/3 same-run, all three mode receipts, merge/duplicate reload, actual adventure failed-write retry, partial checkpoint repair, new-run reset, hidden/close/practice exclusion passed. VM only; browser/device QA pending.');
