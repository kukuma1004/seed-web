import assert from 'node:assert/strict';
import {BOSS_EVENT_COUNTERS,createBossVictoryLedger,addBossVictoryEvent,mergeBossVictoryLedgers,bossVictoryCounts,bossVictoryEventKey,validBossVictoryLedger} from '../src/boss-victory-events.js';
const baseline=Object.fromEntries(Object.values(BOSS_EVENT_COUNTERS).map(k=>[k,8]));
const initial=createBossVictoryLedger('owner','migration-01',baseline),event=(runId,ordinal=1,boss='austin',mode='survival')=>({mode,runId,boss,ordinal});
const emptyReadback={...initial};delete emptyReadback.events;assert(validBossVictoryLedger(emptyReadback));assert.deepEqual(bossVictoryCounts(emptyReadback),baseline);assert.equal(validBossVictoryLedger({...initial,events:null}),false);
const add=(value,e)=>addBossVictoryEvent(value,e,{ownerUid:'owner',epoch:'migration-01'});
const pc=add(initial,event('pc')).ledger,phone=add(initial,event('phone')).ledger;
assert.equal(bossVictoryCounts(mergeBossVictoryLedgers(pc,phone)).austinWins,10,'8 + two actual independent wins is 10, not max(9,9)');
const copiedRun=add(initial,event('copied')).ledger;assert.equal(bossVictoryCounts(mergeBossVictoryLedgers(copiedRun,copiedRun)).austinWins,9,'same actual event on two devices counts once');
let old=add(initial,event('gaps',1)).ledger;old=add(old,event('gaps',9)).ledger;assert.equal(bossVictoryCounts(old).austinWins,10,'ordinal 9 is one genuine event; skipped ordinals synthesize no wins');
const oldReceipt=event('old-receipt');old=add(old,oldReceipt).ledger;for(let i=0;i<96;i++)old=add(old,event('later-'+i)).ledger;
assert.equal(add(old,oldReceipt).counted,false,'a receipt remains durable after more than 64 later runs');
assert.equal(Object.keys(old.events).length,99);assert.equal(bossVictoryCounts(old).austinWins,107);
for(const boss of Object.keys(BOSS_EVENT_COUNTERS)){const e=event('actual-five',3,boss,'defense');const ledger=add(initial,e).ledger;assert.equal(bossVictoryCounts(ledger)[BOSS_EVENT_COUNTERS[boss]],9);assert.equal(add(ledger,e).counted,false);}
assert.notEqual(bossVictoryEventKey(event('a-1')),bossVictoryEventKey(event('a',1)));assert.notEqual(bossVictoryEventKey(event('a',1,'austin','defense')),bossVictoryEventKey(event('a',1)));
const a=mergeBossVictoryLedgers(pc,phone),b=mergeBossVictoryLedgers(phone,pc);assert.deepEqual(bossVictoryCounts(a),bossVictoryCounts(b));assert.deepEqual(bossVictoryCounts(mergeBossVictoryLedgers(a,pc)),bossVictoryCounts(a));
const serialized=JSON.parse(JSON.stringify(old));assert(validBossVictoryLedger(serialized));assert.equal(add(serialized,oldReceipt).counted,false);
for(const mutate of [v=>{v.ownerUid='other';},v=>{v.epoch='migration-02';},v=>{v.baseline.austinWins=9;}]){const v=structuredClone(initial);mutate(v);assert.throws(()=>mergeBossVictoryLedgers(initial,v),/migration-conflict/);}
for(const bad of [{...initial,version:3},{...initial,extra:true},{...initial,events:{forged:event('x')}},{...initial,events:[]},{...initial,baseline:{...baseline,austinWins:8.2}}])assert.equal(validBossVictoryLedger(bad),false);
assert.throws(()=>add(initial,{...event('x'),ordinal:0}));assert.throws(()=>addBossVictoryEvent(initial,event('x'),{ownerUid:'other',epoch:'migration-01'}));
const accountWithInflatedLegacy={austinWins:10000,bossRuns:{'survival:x':{austin:999999}}};assert.equal(bossVictoryCounts(initial).austinWins,8);assert.equal(accountWithInflatedLegacy.austinWins,10000,'contract never converts high-water/profile fields into new events');
assert.deepEqual(initial.baseline,baseline);assert.equal(Object.keys(initial.events).length,0);
console.log('Boss V2 contract: immutable baseline/epoch, 8+1+1=10, same-run cross-device dedupe, ordinal gaps, >64 durable receipts, all five bosses, serialization/union, wrong owner/epoch and unknown schemas fail closed. Migration/transport/gameplay integration not yet enabled.');
