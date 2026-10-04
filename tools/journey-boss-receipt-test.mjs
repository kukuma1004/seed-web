import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import vm from 'node:vm';
import {addJourneyBossReceipt} from '../src/journey-boss-receipts.js';
import {journeyRunId} from '../src/journey-run-id.js';
import {SAVE_KEY,validCheckpoint,readCheckpoint,writeCheckpoint,roomExitCheckpoint} from '../src/run-save.js';
import {collectCloudSnapshot,normalizeCloudSnapshot} from '../src/cloud-save.js';
import {MODE_BOSSES,recordModeBossVictory} from '../src/mode-boss-titles.js';
import {readAccountProfile,writeAccountProfile} from '../src/account-profile.js';
import {readDiscoveries,recordDiscovery} from '../src/discoveries.js';
import {createModeBossOutbox} from '../src/mode-boss-outbox.js';
const memory=()=>{const rows=new Map();return {get length(){return rows.size;},key:i=>[...rows.keys()][i]??null,getItem:k=>rows.get(k)??null,setItem:(k,v)=>rows.set(k,String(v)),removeItem:k=>rows.delete(k)};};
const old={version:1,cycle:4,region:'garden',stage:4,mode:'austin',hp:100,kills:30,elapsed:100,rules:['recall'],mutated:[],wardens:5,austins:0,savedAt:123};
assert(validCheckpoint(old));
const legacy=journeyRunId(old);
assert.equal(journeyRunId(JSON.parse(JSON.stringify(old))),legacy,'identical old saves on two devices share identity');
assert.equal(journeyRunId({...old,forms:{},guideTarget:null}),legacy,'RTDB omits empty objects and null children');
assert.equal(journeyRunId(Object.fromEntries(Object.entries(old).reverse())),legacy,'JSON property order is not identity');
assert.notEqual(journeyRunId({...old,savedAt:124}),legacy,'different legacy snapshots are not claimed to be the same run');
assert.equal(journeyRunId(null,{createId:()=> 'new-run'}),'new-run');
assert.throws(()=>journeyRunId({...old,runId:'../invalid'}));
for(const runId of [null,12,'','x'.repeat(91),'../bad'])assert(!validCheckpoint({...old,runId}));
const saved={...old,runId:legacy},storage=memory();
assert(writeCheckpoint(storage,saved,150));
assert.equal(journeyRunId(readCheckpoint(storage)),legacy);
const room=roomExitCheckpoint(readCheckpoint(storage),{hp:60,inventory:{}});
assert.equal(room.runId,legacy);
assert(writeCheckpoint(storage,room,200));
assert.equal(readCheckpoint(storage).runId,legacy,'save-and-exit changes time, never identity');
const cloud=normalizeCloudSnapshot(collectCloudSnapshot(storage,{now:300}));
assert.equal(cloud.checkpoints.act1.runId,legacy,'account snapshot preserves the run identity');

// Execute the real production delivery bridge. Journey 1..3 owns the same
// durable counter/discovery path without granting the legacy tree twice.
const source=readFileSync(new URL('../src/main.js',import.meta.url),'utf8');
let allowDiscovery=false,treeGrants=0;
const toast={textContent:''};
const ctx=vm.createContext({currentJourneyOwner:'owner',rawStorage:storage,runStorage:storage,account:{user:()=>({uid:'owner'})},localInspection:false,developerRun:false,
 createModeBossOutbox,addJourneyBossReceipt,readCheckpoint,writeCheckpoint,actStore:()=>storage,currentJourneyRunId:legacy,pendingJourneyBossTitles:[],survivalSession:null,expansionJourney:null,paused:false,togglePause:()=>{ctx.paused=true;},MODE_BOSSES,recordModeBossVictory,readAccountProfile,readDiscoveries,profile:readDiscoveries(storage),
 remember:(_kind,id)=>allowDiscovery?recordDiscovery(storage,readDiscoveries(storage),'bosses',id):{saved:false},$:()=>toast,
 dominantLaw:()=>null,effectiveLevels:()=>new Map(),levels:new Map(),heldForms:new Map(),cloud:{flush:()=>Promise.resolve()},
 awardExpansionBossTree:()=>{treeGrants++;return true;}});
vm.runInContext(source.slice(source.indexOf('function protectJourneyBossReceipts(){'),source.indexOf('function remember(')),ctx);
writeAccountProfile(storage,{austinWins:8});
assert.equal(ctx.awardModeBoss('journey',legacy,'austin',1),false,'partial discoveries retain receipt');
assert.equal(readAccountProfile(storage).austinWins,9);
allowDiscovery=true;storage.setItem('seed-cloud-owner-v1','owner');ctx.retryModeBossRewards();
assert.equal(readAccountProfile(storage).austinWins,9,'retry after count write does not add another win');
assert(readDiscoveries(storage).bosses.includes('austin'));
assert.equal(ctx.awardModeBoss('journey',legacy,'austin',1),true);
assert.equal(readAccountProfile(storage).austinWins,9);
assert.equal(ctx.awardModeBoss('journey',legacy,'austin',2),true);
assert.equal(readAccountProfile(storage).austinWins,10);
assert(readDiscoveries(storage).bosses.includes('austinveteran'));
assert.equal(ctx.awardModeBoss('journey',legacy,'austin',3),true);
assert(!readDiscoveries(storage).bosses.includes('austinclear'),'Journey completeRun retains first-clear notification ownership');
for(const boss of ['alwaysbeginner','tempestcarrier']){
 assert(ctx.awardModeBoss('journey',legacy,boss,1));
 assert(ctx.awardModeBoss('journey',legacy,boss,1));
 assert.equal(readAccountProfile(storage)[MODE_BOSSES[boss].counter],1);
}
assert.equal(treeGrants,0,'legacy mastery and no-hit tree hook remains its single reward path');
ctx.developerRun=true;assert(ctx.awardModeBoss('journey','practice','austin',1));
assert.equal(readAccountProfile(storage).austinWins,11);
assert(!recordModeBossVictory({...storage,setItem(){}},{mode:'journey',runId:'silent-drop',boss:'austin',ordinal:1}).saved,'a silently discarded counter write is not success');

// Actual death branches must call this tested bridge; no direct +1 remains.
const hooks=source.slice(source.indexOf("if(e.type==='austin'){austinsDefeated++"),source.indexOf('else if(main){wardensDefeated++'));
assert.equal((hooks.match(/recordJourneyBossTitle\(e.type,austinsDefeated\)/g)||[]).length,3);
assert(!hooks.includes('writeAccountProfile('));
assert(source.includes('currentJourneyRunId=journeyRunId(restore)'));
assert(source.includes('writeCheckpoint(actStore(),{version:1,runId:currentJourneyRunId,'));
assert.equal(JSON.parse(storage.getItem(SAVE_KEY)).runId,legacy);
assert.equal(writeCheckpoint({...storage,setItem(){}},{...saved,runId:'discarded'},400),false,'discarded identity writes cannot report a saved room');

// Run the three real death branches, preserving their existing loot/mastery
// calls. This is a VM mechanics check, not a browser or physical-device run.
let mastery=0;
Object.assign(ctx,{developerRun:false,currentJourneyRunId:'actual-death-run',austinsDefeated:0,bossRewardLine:'',itemBarKey:'',inventory:{},rng:()=>.5,
 seedTitle:{isUnlocked:()=>false,isAlwaysBeginnerUnlocked:()=>false,isJohanUnlocked:()=>false},
 earnCoins:(_s,n)=>({coins:n}),grantFinalBossGardenMemory:()=>{mastery++;return {line:'memory'};},
 austinDrops:()=>[],addItem:()=>true,ITEMS:{},grantGoldenFruitPotion:()=>'',
 AUSTIN:{name:'austin'},ALWAYS_BEGINNER:{name:'always'},TEMPEST_CARRIER:{name:'johan'},
 AUSTIN_TITLE:'title',AUSTIN_TITLE_PERK:{text:'perk'},AUSTIN_VETERAN_TITLE:'veteran',
 ALWAYS_BEGINNER_TITLE:'title',ALWAYS_BEGINNER_TITLE_PERK:{text:'perk'},ALWAYS_VETERAN_TITLE:'veteran',
 JOHAN_TITLE:'title',JOHAN_VETERAN_TITLE:'veteran'});
vm.runInContext('function actualDeath(e){'+hooks+'}',ctx);
for(const boss of ['austin','alwaysbeginner','tempestcarrier']){
 ctx.austinsDefeated=0;ctx.pendingJourneyBossTitles=[];
 const count=readAccountProfile(storage)[MODE_BOSSES[boss].counter];
 ctx.actualDeath({type:boss});
 assert.equal(readAccountProfile(storage)[MODE_BOSSES[boss].counter],count+1);
 ctx.austinsDefeated=0;ctx.actualDeath({type:boss});
 assert.equal(readAccountProfile(storage)[MODE_BOSSES[boss].counter],count+1,'replaying a copied room does not repeat its account win');
}
// A broken shared queue must not lose the actual death. The independent
// journey delivery copy survives even a terminal checkpoint deletion.
const corrupt='seed-mode-boss-outbox-v1:owner:unknown';storage.setItem(corrupt,'{unknown');
ctx.currentJourneyRunId='blocked-shared';ctx.austinsDefeated=0;ctx.pendingJourneyBossTitles=[];
const countBeforeFailure=readAccountProfile(storage).austinWins;
ctx.actualDeath({type:'austin'});
assert.equal(readAccountProfile(storage).austinWins,countBeforeFailure);
assert.equal(readCheckpoint(storage).pendingBossTitles[0].boss,'austin');
assert.equal(ctx.journeyBossOutbox().retry(()=>false),false);
storage.removeItem(SAVE_KEY);storage.removeItem(corrupt);ctx.retryModeBossRewards();
assert.equal(readAccountProfile(storage).austinWins,countBeforeFailure+1);
assert(ctx.journeyBossOutbox().retry(()=>{throw Error('receipt must be acknowledged');}));
assert.equal(mastery,7,'existing loot/mastery behavior is preserved, not claimed idempotent by this counter change');
// Both delivery channels can fail while checkpoint writes still work. Keep
// the pending event and block replacing this run before a durable copy exists.
ctx.currentJourneyRunId='both-queues-blocked';ctx.pendingJourneyBossTitles=[];ctx.austinsDefeated=0;
assert(writeCheckpoint(storage,{...old,runId:ctx.currentJourneyRunId}));
ctx.rawStorage={...storage,get length(){return storage.length;},setItem(k,v){if(k.startsWith('seed-mode-boss-outbox-')||k.startsWith('seed-journey-boss-outbox-'))throw Error('blocked-prefix');storage.setItem(k,v);}};
ctx.actualDeath({type:'austin'});
assert.equal(ctx.paused,true);assert.equal(ctx.protectJourneyBossReceipts(),false);
assert.deepEqual(readCheckpoint(storage).pendingBossTitles,[{boss:'austin',ordinal:1}]);
vm.runInContext(source.slice(source.indexOf('function restart('),source.indexOf('\nfunction togglePause(')),ctx);
const entryBefore=storage.getItem(SAVE_KEY);ctx.restart();
assert.equal(storage.getItem(SAVE_KEY),entryBefore,'fresh run cannot erase the last pending copy');
assert.equal(ctx.currentJourneyRunId,'both-queues-blocked');
ctx.rawStorage=storage;
assert(ctx.protectJourneyBossReceipts());assert(ctx.settleJourneyBossTitles());
assert.equal(readCheckpoint(storage).pendingBossTitles.length,0);
// Account changes cannot copy an active run receipt to another UID.
ctx.pendingJourneyBossTitles=[{boss:'austin',ordinal:2}];ctx.currentJourneyOwner='previous-owner';
assert.equal(ctx.protectJourneyBossReceipts(),false);assert.equal(ctx.persistJourneyBossTitles(),false);
const accountBeforeSwitch=JSON.stringify(readAccountProfile(storage));assert.equal(ctx.settleJourneyBossTitles(),false);
assert.equal(JSON.stringify(readAccountProfile(storage)),accountBeforeSwitch,'UID switch never credits the replacement account');
assert.equal(storage.getItem(SAVE_KEY),JSON.stringify(readCheckpoint(storage)));
vm.runInContext(source.slice(source.indexOf('function saveBoundary('),source.indexOf('// After a warden')),ctx);
vm.runInContext(source.slice(source.indexOf('function saveLeaveState(){'),source.indexOf('// 일시정지 → 나가기.')),ctx);
Object.assign(ctx,{stage:0,mode:'playing',roomCleared:false});
const previousEntry=storage.getItem(SAVE_KEY);
assert.equal(ctx.saveBoundary(0),false);assert.equal(ctx.saveLeaveState(),false);
assert.equal(storage.getItem(SAVE_KEY),previousEntry,'both real writers reject a switched UID');
ctx.pendingJourneyBossTitles=[];
const foreign={...old,runId:'foreign',bossReceiptOwner:'previous-owner',pendingBossTitles:[{boss:'austin',ordinal:1}]};
assert(validCheckpoint(foreign));assert(!validCheckpoint({...foreign,bossReceiptOwner:undefined}));
ctx.restart(foreign);
assert.equal(ctx.currentJourneyOwner,'previous-owner','foreign pending checkpoint cannot be rebound to the current UID');
assert.equal(storage.getItem(SAVE_KEY),previousEntry);
const pendingCloud=normalizeCloudSnapshot(collectCloudSnapshot(storage)).checkpoints.act1;
assert.equal(pendingCloud.bossReceiptOwner,'owner');
console.log('Journey receipts passed: shared legacy identity, save/cloud continuity, 3 actual boss hooks, partial retry, 10-win/clear titles, no double tree and no-op storage. Legacy max-count merge and 64-row eviction still require V2 migration.');
