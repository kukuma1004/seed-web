import assert from 'node:assert/strict';
import {closedExpansionActs,openExpansionActs} from './expansion-gate-fixtures.mjs';
import {readFileSync} from 'node:fs';
import vm from 'node:vm';
import {createSurvivalSaveStore,captureSurvivalSession,queueSurvivalTitle,settleSurvivalTitles,survivalTitleEvents,SURVIVAL_TITLE_LIMIT,validSurvivalRecord,validSurvivalSave} from '../src/survival-save.js';
import {createSurvivalSession,survivalAct,settleSurvivalKill,survivalBossOrdinal,advanceSurvivalAct} from '../src/survival-rules.js';
import {createSurvivalExpansion,migrateSurvivalToFiveActs} from '../src/survival-expansion.js';
import {survivalExpansionRankProgress} from '../src/survival-ranking.js';
import {createDefense,checkpointDefense,restoreDefense,migrateDefenseToFiveActs,startDefenseWave,stepDefense,defenseHurt,defenseSeedCap,plantDefense} from '../src/seed-defense-rules.js';
import {defenseExpansionRankProgress,defenseRankEntry} from '../src/defense-ranking.js';
import {recordModeBossVictory} from '../src/mode-boss-titles.js';
import {readAccountProfile,writeAccountProfile,ACCOUNT_PROFILE_KEY} from '../src/account-profile.js';
import {collectCloudSnapshot,mergeCloudSnapshots} from '../src/cloud-save.js';
import {routeSurvivalSaveStore} from '../src/survival-save.js';

// Actual pure engines + actual main bridge in a VM. No auth/network/GPU claims.
const main=readFileSync(new URL('../src/main.js',import.meta.url),'utf8');
const memory=()=>{const data=new Map();let fail=false;return {data,get fail(){return fail;},set fail(v){fail=v;},getItem:k=>data.get(k)||null,setItem:(k,v)=>{if(fail&&k===ACCOUNT_PROFILE_KEY)throw Error('quota');data.set(k,v);},removeItem:k=>data.delete(k)};};
function snapshot(session,id='contract-run'){
 return {id,revision:0,session:captureSurvivalSession(session),progress:{hp:40,kills:10,score:100,choicesTaken:2,choiceKills:0,bankedUpgrades:0,elapsed:session.time,levels:{frost:2},forms:{},inventory:{tonic:2}},player:{position:[0,0,0],baseSlideTarget:[0,0,0],baseSlideDir:[1,0,0],lastMove:[1,0,0]},enemies:[],hostiles:[],...(session.act>=3?{expansion:createSurvivalExpansion(session).checkpoint()}: {})};
}
function host(storage,session=createSurvivalSession(17)){
 const nodes=new Map(),owner={uid:'a'},save=createSurvivalSaveStore(storage,'a'),init=save.write(snapshot(session),{fresh:true});assert(init.ok);
 const ctx=vm.createContext({currentBossEpoch:()=>null,survivalSession:session,survivalSaveToken:{id:init.value.id,revision:init.value.revision,writeId:init.value.writeId,owner:'a'},localInspection:false,developerRun:false,
  settleSurvivalTitles,queueSurvivalTitle,survivalTitleEvents,captureSurvivalSession,SURVIVAL_TITLE_LIMIT,createSurvivalSaveStore,
  routeSurvivalSaveStore,survivalSaveContext:{currentOwner:()=>owner.uid,inspection:()=>false},rawStorage:storage,survivalOwner:()=>owner.uid,survivalStore:()=>createSurvivalSaveStore(storage,owner.uid),survivalCloud:{changed(){}},survivalPendingEnd:null,survivalSaveMessage:'',
  awardModeBoss:(mode,runId,boss,ordinal,practice)=>practice||recordModeBossVictory(storage,{mode,runId,boss,ordinal,practice}).saved,
  settleSurvivalKill,survivalBossOrdinal,survivalAct,score:0,fallen:[],enemyShots:[],invuln:0,audio:{play(){}},perf:{event(){}},PE:{enemyDeath:0},$:id=>{if(!nodes.has(id))nodes.set(id,{});return nodes.get(id);},release(){},releaseEnemy(){throw Error('unexpected ordinary actor');}
 });
 vm.runInContext(main.slice(main.indexOf('function settleSurvivalTitle(){'),main.indexOf('function saveSurvival(){')),ctx);
 vm.runInContext(main.slice(main.indexOf('function enemyDown(e){'),main.indexOf('function updateFallen(')),ctx);
 return {ctx,owner,save,kill(boss=survivalAct(ctx.survivalSession).type){ctx.survivalSession.bossSpawned=true;ctx.enemyDown({type:boss,survivalBoss:true});},checkpoint(){const result=save.write({...snapshot(ctx.survivalSession),...ctx.survivalSaveToken});assert(result.ok);ctx.survivalSaveToken.revision=result.value.revision;ctx.survivalSaveToken.writeId=result.value.writeId;return result.value;}};
}

// The real kill bridge used to overwrite Austin's failed receipt on the next
// boss. Keep every event, including multiple ordinals of one boss, in FIFO.
for(const failAt of [0,1,2]){
 const storage=memory(),h=host(storage);let number=0;
 h.ctx.awardModeBoss=(mode,runId,boss,ordinal,practice)=>{
  if(number++===failAt)return false;
  return practice||recordModeBossVictory(storage,{mode,runId,boss,ordinal,practice}).saved;
 };
 for(let n=0;n<3;n++){h.kill();assert(advanceSurvivalAct(h.ctx.survivalSession));}
 h.ctx.settleSurvivalTitle();
 assert.deepEqual(['austinWins','alwaysWins','johanWins'].map(k=>readAccountProfile(storage)[k]),[1,1,1]);
}
{
 const storage=memory(),h=host(storage);storage.fail=true;
 for(let n=0;n<6;n++){h.kill();assert(advanceSurvivalAct(h.ctx.survivalSession));}
 assert.equal(survivalTitleEvents(h.ctx.survivalSession).length,6);
 const saved=h.checkpoint();assert(validSurvivalSave(saved));
 h.ctx.localInspection=true;const authenticBytes=storage.getItem(h.save.key);assert(h.ctx.retryStoredSurvivalTitles());assert.equal(storage.getItem(h.save.key),authenticBytes,'inspection cannot acknowledge a pulled authentic pending receipt as practice');h.ctx.localInspection=false;
 assert.deepEqual(saved.session.pendingBossTitles.map(e=>[e.boss,e.ordinal]),[['austin',1],['alwaysbeginner',1],['tempestcarrier',1],['austin',2],['alwaysbeginner',2],['tempestcarrier',2]]);
 // Restore only from serialized JSON, never a shared in-memory queue object.
 h.ctx.survivalSession=JSON.parse(JSON.stringify(saved.session));
 const before=JSON.stringify(h.ctx.survivalSession);h.owner.uid='b';assert.equal(h.ctx.settleSurvivalTitle(),false);assert.equal(JSON.stringify(h.ctx.survivalSession),before);assert.equal(readAccountProfile(storage).austinWins,0);
 h.owner.uid='a';storage.fail=false;assert(h.ctx.settleSurvivalTitle());
 assert.deepEqual(['austinWins','alwaysWins','johanWins'].map(k=>readAccountProfile(storage)[k]),[2,2,2]);
 h.ctx.survivalSession=JSON.parse(JSON.stringify(saved.session));h.ctx.settleSurvivalTitle();
 assert.equal(readAccountProfile(storage).austinWins,2,'duplicate saved resume cannot grant another victory');
 h.ctx.localInspection=true;queueSurvivalTitle(h.ctx.survivalSession,'austin',3);h.ctx.settleSurvivalTitle();assert.equal(readAccountProfile(storage).austinWins,2,'local inspection does not award');assert.equal(survivalTitleEvents(h.ctx.survivalSession).length,1,'inspection also cannot consume an existing authentic queue');
 h.ctx.survivalSession=createSurvivalSession(55);h.kill();assert.equal(survivalTitleEvents(h.ctx.survivalSession).length,0,'practice kills do not create future payable events');
}
{
 const storage=memory(),h=host(storage);storage.fail=true;h.kill();
 const saved=h.checkpoint();
 h.ctx.survivalPendingEnd={...h.ctx.survivalSaveToken,session:captureSurvivalSession(h.ctx.survivalSession)};
 h.owner.uid='b';assert.equal(h.ctx.persistSurvivalEnd(),false);assert(h.ctx.survivalPendingEnd,'unpaid end remains pending until its original account returns');
 assert.equal(createSurvivalSaveStore(storage,'b').readRecord(),null,'UID change cannot write a death marker to the other account');
 h.owner.uid='a';assert(h.ctx.persistSurvivalEnd());
 const ended=h.save.readRecord();assert(ended.ended&&validSurvivalRecord(ended));assert.equal(ended.pendingBossTitles.length,1);assert.equal(h.save.read(),null);
 assert.equal(h.save.write(snapshot(createSurvivalSession(19),'new-run'),{fresh:true}).reason,'rewards','a new run cannot erase unpaid ended rewards');
 h.owner.uid='a';assert.equal(h.ctx.retryStoredSurvivalTitles(),false);assert.equal(h.save.readRecord().pendingBossTitles.length,1);
 storage.fail=false;assert(h.ctx.retryStoredSurvivalTitles());assert.equal(readAccountProfile(storage).austinWins,1);assert.equal(h.save.readRecord().pendingBossTitles.length,0);
 assert(h.ctx.retryStoredSurvivalTitles());assert.equal(readAccountProfile(storage).austinWins,1);
 assert(h.save.write(snapshot(createSurvivalSession(19),'new-run'),{fresh:true}).ok);
 assert(!h.save.end(saved.id,saved.revision,saved.writeId),'a stale finished run cannot end a newer run');
}
{
 const storage=memory(),h=host(storage);storage.fail=true;h.kill();h.checkpoint();
 const token={...h.ctx.survivalSaveToken};assert(h.save.end(token.id,token.revision,token.writeId,{pendingBossTitles:[]}));
 h.ctx.survivalPendingEnd={...token,session:captureSurvivalSession(h.ctx.survivalSession)};
 assert.equal(h.ctx.persistSurvivalEnd(),false,'a different ended marker cannot silently acknowledge a pending event');assert(h.ctx.survivalPendingEnd);
}
// Account success followed by checkpoint ACK failure is safely retried against
// the real high-water ledger. No lost counter and no duplicate award.
{
 const storage=memory(),h=host(storage);storage.fail=true;h.kill();h.checkpoint();storage.fail=false;
 const original=storage.setItem;let ackFail=true;storage.setItem=(k,v)=>{if(ackFail&&k===h.save.key)throw Error('checkpoint-quota');original(k,v);};
 assert.equal(h.ctx.retryStoredSurvivalTitles(),false);assert.equal(readAccountProfile(storage).austinWins,1);assert.equal(h.save.read().session.pendingBossTitles.length,1);
 ackFail=false;assert(h.ctx.retryStoredSurvivalTitles());assert.equal(readAccountProfile(storage).austinWins,1);assert.equal(h.save.read().session.pendingBossTitles.length,0);
}
// Legacy primitive pending fields survive v1 loading and are promoted once;
// never reinterpret an ordinal high-water as that many historical victories.
{
 const session={...createSurvivalSession(8),titleBoss:'austin',titleOrdinal:3};
 assert.deepEqual(survivalTitleEvents(session),[{boss:'austin',ordinal:3}]);
 const storage=memory();settleSurvivalTitles(session,e=>recordModeBossVictory(storage,{mode:'survival',runId:'legacy',...e}).saved);
 assert.equal(readAccountProfile(storage).austinWins,1);
 const pending=createSurvivalSession(9);for(let n=1;n<=SURVIVAL_TITLE_LIMIT;n++)assert(queueSurvivalTitle(pending,'austin',n));
 assert.equal(queueSurvivalTitle(pending,'austin',SURVIVAL_TITLE_LIMIT+1),false);assert.equal(survivalTitleEvents(pending).length,SURVIVAL_TITLE_LIMIT);
 const cap=vm.createContext({survivalSession:pending,survivalTitleEvents,SURVIVAL_TITLE_LIMIT,survivalTitleRetryAt:0,settleSurvivalTitle:()=>false,saveSurvival(){},$:()=>({}),advanceSurvivalAct(){throw Error('full unpaid queue advanced');}});
 vm.runInContext(main.slice(main.indexOf('function continueSurvival(){'),main.indexOf('function updateSurvival(')),cap);cap.continueSurvival();cap.continueSurvival();
 for(const invalid of [{pendingBossTitles:[{boss:'austin',ordinal:0}]},{pendingBossTitles:[{boss:'austin',ordinal:1},{boss:'austin',ordinal:1}]},{titleBoss:'__proto__',titleOrdinal:1}])assert.equal(survivalTitleEvents(invalid),null);
}

// Five-act coordinate migration never synthesizes titles/clears. Every later
// victory is driven by a real engine kill, including act5 -> next act1.
{
 const old={...createSurvivalSession(21),lap:2,act:2,bossesDefeated:8,completedLaps:2,time:1800,legStartedAt:1700,titleBoss:'tempestcarrier',titleOrdinal:2};
 const migrated=migrateSurvivalToFiveActs(snapshot(old));assert.equal(migrated.session.completedLaps,0);assert.equal(migrated.session.legacyCompletedLaps,2);assert.equal(migrated.session.bossesDefeated,8);assert.deepEqual(survivalTitleEvents(migrated.session),survivalTitleEvents(old));
 assert.equal(survivalExpansionRankProgress(migrated.session,{acts:closedExpansionActs}).eligible,false);
 const s=migrated.session;for(let n=0;n<3;n++){s.bossSpawned=true;settleSurvivalKill(s,{boss:true});assert(advanceSurvivalAct(s));}
 assert.equal(s.act,0);assert.equal(s.lap,3);assert.equal(s.completedLaps,1);assert.equal(s.bossesDefeated,11);
}
{
 const legacy=createDefense(30);legacy.wave=72;legacy.bossWins={austin:2,alwaysbeginner:2,tempestcarrier:2};legacy.pendingBosses=[12,24,36,48,60,72].map((wave,i)=>({wave,boss:['austin','alwaysbeginner','tempestcarrier'][i%3],ordinal:Math.floor(i/3)+1}));
 const migrated=migrateDefenseToFiveActs(checkpointDefense(legacy));assert(migrated);assert.equal(migrated.wave,120);assert.equal(migrated.migratedWaves,48);assert.equal(defenseSeedCap(migrated),defenseSeedCap(legacy));
 assert.deepEqual(migrated.bossWins,{...legacy.bossWins,crosswindKeeper:0,crystalGardener:0});assert.equal(defenseExpansionRankProgress(migrated).cleared,72);assert.equal(defenseRankEntry({...migrated,phase:'lost'},{uid:'a',name:'테스터',acts:closedExpansionActs}),null);
 const restored=restoreDefense(checkpointDefense(migrated));assert(restored);assert.deepEqual(restored.pendingBosses,migrated.pendingBosses);assert.deepEqual(restored.bossWins,migrated.bossWins);
 const s=createDefense(32,{actCount:5});assert(plantDefense(s,2));while(s.wave<60){assert(startDefenseWave(s));let ticks=0;while(s.phase==='wave'){stepDefense(s,.1,{update(){for(const e of s.enemies)defenseHurt(s,e,e.hp,true);}});assert(++ticks<2000);}}
 assert.deepEqual(s.bossWins,{austin:1,alwaysbeginner:1,tempestcarrier:1,crosswindKeeper:1,crystalGardener:1});assert(startDefenseWave(s));assert.equal(s.wave,61);assert.equal(s.bossWins.austin,1);
}

// Known unresolved production counter defect. This assertion documents the
// current helper result, not correctness: independent valid receipts are
// unioned while cumulative wins use max, losing one confirmed offline win.
const a=memory(),b=memory();for(const storage of [a,b])writeAccountProfile(storage,{austinWins:8});
assert(recordModeBossVictory(a,{mode:'survival',runId:'pc-run',boss:'austin',ordinal:1}).counted);
assert(recordModeBossVictory(b,{mode:'survival',runId:'phone-run',boss:'austin',ordinal:1}).counted);
const merged=mergeCloudSnapshots(collectCloudSnapshot(a),collectCloudSnapshot(b));
assert.equal(merged.account.austinWins,9);assert.equal(Object.keys(merged.account.bossRuns).length,2);
console.log('Expansion account contracts: real survival kill/FIFO failures/UID/practice/resume, ended pending/ACK failure, legacy ordinal/cap, 5->1 engines and 3->5 migration passed. Known cloud max-counter loss reproduced (expected earned 10, actual 9, receipts 2). VM/pure engine only; no authenticated/device QA.');
