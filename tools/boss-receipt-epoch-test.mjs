import assert from 'node:assert/strict';
import {addJourneyBossReceipt,validJourneyBossReceipts} from '../src/journey-boss-receipts.js';
import {queueSurvivalTitle,survivalTitleEvents,settleSurvivalTitles,captureSurvivalSession,createSurvivalSaveStore} from '../src/survival-save.js';
import {createSurvivalSession} from '../src/survival-rules.js';
import {createExpansionPublicCampaign,completeExpansionPublicBoss,validExpansionPublicCampaign,validExpansionCampaignTransition,expansionCampaignCanReplace,ackExpansionPublicTitle,advanceExpansionPublicCampaign,settleExpansionPublicTitles} from '../src/expansion-public-campaign.js';
import {createDefense,setDefenseBossEpoch,checkpointDefense,restoreDefense,defenseHurt,migrateDefenseToFiveActs} from '../src/seed-defense-rules.js';

const epoch='boss-epoch-02',otherEpoch='boss-epoch-03',copy=value=>JSON.parse(JSON.stringify(value));
const hasEpoch=event=>Object.hasOwn(event,'bossEpoch');
const malformed=['bad','bad.epoch','../epoch','x'.repeat(97),12,{},null,undefined];

// Receipt identity includes the epoch. An old pending tuple cannot become a
// V2 event merely because the same delivery is retried after migration.
const oldJourney=addJourneyBossReceipt([],'austin',1),journey=addJourneyBossReceipt(oldJourney,'austin',2,epoch);
assert(!hasEpoch(oldJourney[0]));assert(!hasEpoch(journey[0]));assert.equal(journey[1].bossEpoch,epoch);
assert.deepEqual(oldJourney,[{boss:'austin',ordinal:1}]);
assert.equal(addJourneyBossReceipt(journey,'austin',2,epoch),journey);
assert.throws(()=>addJourneyBossReceipt(journey,'austin',2,otherEpoch),/epoch-conflict/);
assert.throws(()=>addJourneyBossReceipt(journey,'austin',1,epoch),/epoch-conflict/);
assert.throws(()=>addJourneyBossReceipt(journey,'austin',2),/epoch-conflict/);
assert(validJourneyBossReceipts(copy(journey)));
for(const bossEpoch of malformed)assert(!validJourneyBossReceipts([{boss:'austin',ordinal:1,bossEpoch}]));
for(const bossEpoch of malformed.filter(e=>e!==null&&e!==undefined))assert.throws(()=>addJourneyBossReceipt([],'austin',1,bossEpoch));

const session={pendingBossTitles:[{boss:'austin',ordinal:1}],titleBoss:'austin',titleOrdinal:1,time:2};
assert(queueSurvivalTitle(session,'austin',2,epoch));
assert(queueSurvivalTitle(session,'austin',2,epoch));
const survivalBefore=copy(session);
assert(!queueSurvivalTitle(session,'austin',1,epoch));assert(!queueSurvivalTitle(session,'austin',2,otherEpoch));
assert.deepEqual(session,survivalBefore,'epoch conflicts never rewrite prior receipts');
assert.deepEqual(captureSurvivalSession(session).pendingBossTitles,survivalBefore.pendingBossTitles);
assert.deepEqual(survivalTitleEvents(copy(session)),survivalBefore.pendingBossTitles);
const delivered=[];
assert(!settleSurvivalTitles(session,event=>{delivered.push(copy(event));return event.ordinal===1;}));
assert(!hasEpoch(delivered[0]));assert.equal(delivered[1].bossEpoch,epoch);
assert.deepEqual(survivalTitleEvents(session),[{boss:'austin',ordinal:2,bossEpoch:epoch}]);
const mirrorOnly={titleBoss:'alwaysbeginner',titleOrdinal:1};
assert.deepEqual(survivalTitleEvents(mirrorOnly),[{boss:'alwaysbeginner',ordinal:1}]);
for(const bossEpoch of malformed)assert.equal(survivalTitleEvents({pendingBossTitles:[{boss:'austin',ordinal:1,bossEpoch}]}),null);
for(const bossEpoch of malformed.filter(e=>e!==null&&e!==undefined))assert(!queueSurvivalTitle({},'austin',1,bossEpoch));

// Terminal records retain the exact event epoch through retries and partial
// acknowledgements, including a legacy receipt before the first V2 receipt.
const rows=new Map(),storage={getItem:key=>rows.get(key)??null,setItem:(key,value)=>rows.set(key,value)};
const store=createSurvivalSaveStore(storage,'epoch-owner');
const terminal={version:1,ended:true,id:'terminal-run',revision:1,savedAt:123,pendingBossTitles:[{boss:'austin',ordinal:1},{boss:'austin',ordinal:2,bossEpoch:epoch}]};
rows.set(store.key,JSON.stringify(terminal));
assert(store.readRecord());
const partial=store.retryTitles(event=>event.ordinal===1);assert(!partial.ok);
assert.deepEqual(store.readRecord().pendingBossTitles,[{boss:'austin',ordinal:2,bossEpoch:epoch}]);
let terminalEvent=null;assert(store.retryTitles(event=>{terminalEvent=copy(event);return true;}).ok);
assert.equal(terminalEvent.bossEpoch,epoch);
const liveStore=createSurvivalSaveStore(storage,'live-epoch-owner'),liveSession=createSurvivalSession(123);
assert(queueSurvivalTitle(liveSession,'austin',1));assert(queueSurvivalTitle(liveSession,'austin',2,epoch));
const live=liveStore.write({id:'live-run',revision:0,session:captureSurvivalSession(liveSession),
 progress:{hp:100,kills:0,score:0,choicesTaken:0,choiceKills:0,bankedUpgrades:0,elapsed:0,levels:{},forms:{},inventory:{}},
 player:{position:[0,0,0],baseSlideTarget:[0,0,0],baseSlideDir:[0,0,0],lastMove:[0,0,0]},enemies:[],hostiles:[]},{fresh:true});
assert(live.ok);assert.deepEqual(survivalTitleEvents(liveStore.read().session),survivalTitleEvents(liveSession));
assert(liveStore.end(live.value.id,live.value.revision,live.value.writeId,liveSession));
assert.deepEqual(liveStore.readRecord().pendingBossTitles,survivalTitleEvents(liveSession),'end retains exact legacy and V2 epochs');

for(const act of ['crosswind','crystalGorge']){
 const initial=createExpansionPublicCampaign(act,{receiptRunId:'epoch-campaign'}),oldClear=completeExpansionPublicBoss(initial,act),clear=completeExpansionPublicBoss(initial,act,epoch);
 assert(oldClear&&clear);assert(!hasEpoch(oldClear.pendingBossTitles[0]));assert.equal(clear.pendingBossTitles[0].bossEpoch,epoch);
 assert(validExpansionPublicCampaign(copy(clear),act));
 assert(validExpansionCampaignTransition(initial,clear,act),'actual epoch-bearing death is a valid transition');
 assert(validExpansionCampaignTransition(initial,oldClear,act),'old epochless death remains compatible');
 const rewritten={...clear,pendingBossTitles:[{...clear.pendingBossTitles[0],bossEpoch:otherEpoch}]};
 assert(!validExpansionCampaignTransition(clear,rewritten,act));
 assert(!expansionCampaignCanReplace(clear,rewritten,act));
 assert(!expansionCampaignCanReplace(oldClear,clear,act));
 assert(!expansionCampaignCanReplace(clear,oldClear,act));
 assert(expansionCampaignCanReplace(clear,copy(clear),act));
 const ack=ackExpansionPublicTitle(clear,act);assert(validExpansionCampaignTransition(clear,ack,act,{ack:true}));
 const nextLap=advanceExpansionPublicCampaign(ack,act),nextDeath=completeExpansionPublicBoss(nextLap,act,otherEpoch);
 assert(validExpansionCampaignTransition(nextLap,nextDeath,act));assert.equal(nextDeath.pendingBossTitles[0].bossEpoch,otherEpoch);
 let credited=null;
 const value={act,campaign:clear};
 const result=settleExpansionPublicTitles({ackTitle:v=>({ok:true,value:{...v,campaign:ackExpansionPublicTitle(v.campaign,act)}})},value,(_run,event)=>{credited=copy(event);return true;});
 assert(result.ok);assert.equal(credited.bossEpoch,epoch);
 for(const bossEpoch of malformed){const bad=copy(clear);bad.pendingBossTitles[0].bossEpoch=bossEpoch;assert(!validExpansionPublicCampaign(bad,act));}
 for(const bossEpoch of malformed.filter(e=>e!==null&&e!==undefined))assert.equal(completeExpansionPublicBoss(initial,act,bossEpoch),null);
}

// Execute the actual TD damage hook. Adopting an epoch after restoring an old
// checkpoint must affect only later deaths, never its pending old victory.
const oldDefense=createDefense(123);oldDefense.wave=12;
defenseHurt(oldDefense,{hp:1,maxHp:1,kind:'boss',bossId:'austin',x:10,y:10},10);
assert.equal(oldDefense.pendingBosses.length,1);assert(!hasEpoch(oldDefense.pendingBosses[0]));
const oldCheckpoint=checkpointDefense(oldDefense);assert(!hasEpoch(oldCheckpoint));
const restored=restoreDefense(copy(oldCheckpoint));assert(restored);assert(!hasEpoch(restored));
const originalPending=copy(restored.pendingBosses);
assert(setDefenseBossEpoch(restored,epoch));assert.deepEqual(restored.pendingBosses,originalPending);
restored.wave=48;
const boss={hp:1,maxHp:1,kind:'boss',bossId:'austin',x:10,y:10};
defenseHurt(restored,boss,10);defenseHurt(restored,boss,10);
assert.deepEqual(restored.pendingBosses,[{boss:'austin',ordinal:1,wave:12},{boss:'austin',ordinal:2,wave:48,bossEpoch:epoch}]);
const withEpoch=checkpointDefense(restored),roundtrip=restoreDefense(copy(withEpoch));
assert(roundtrip);assert.equal(roundtrip.bossEpoch,epoch);assert.deepEqual(roundtrip.pendingBosses,restored.pendingBosses);
const fiveActs=migrateDefenseToFiveActs(withEpoch);assert(fiveActs);assert.equal(fiveActs.bossEpoch,epoch);
assert.deepEqual(fiveActs.pendingBosses.map(({wave,...receipt})=>receipt),restored.pendingBosses.map(({wave,...receipt})=>receipt),'circuit remapping preserves receipt epochs without inventing skipped wins');
assert(setDefenseBossEpoch(roundtrip,otherEpoch));assert.deepEqual(roundtrip.pendingBosses,restored.pendingBosses,'future epoch adoption does not upgrade stored receipts');
assert.equal(createDefense(123,{bossEpoch:epoch}).bossEpoch,epoch);
for(const bossEpoch of malformed){
 const before=copy(roundtrip);assert(!setDefenseBossEpoch(roundtrip,bossEpoch));assert.deepEqual(roundtrip,before);
 assert.equal(restoreDefense({...withEpoch,bossEpoch}),null);
 const bad=copy(withEpoch);bad.pendingBosses[1].bossEpoch=bossEpoch;assert.equal(restoreDefense(bad),null);
}
for(const bossEpoch of malformed.filter(e=>e!==null&&e!==undefined))assert.throws(()=>createDefense(123,{bossEpoch}));
console.log('Boss receipt epochs passed: optional legacy preservation, immutable epoch identity, malformed epoch refusal, survival FIFO/capture/terminal retry, expansion completion/ACK/replacement, actual TD deaths and post-restore epoch adoption.');
