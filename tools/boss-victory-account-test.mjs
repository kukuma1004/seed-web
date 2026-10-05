import assert from 'node:assert/strict';
import {createBossMigrationSeal} from '../src/boss-victory-migration.js';
import {createBossVictoryLedger,addBossVictoryEvent,bossVictoryCloudKey,bossVictoryEventKey} from '../src/boss-victory-events.js';
import {bossVictoryAccountKey,readBossVictoryAccount,installBossVictoryAccount,projectBossVictoryProfile,queueBossAccountVictory,serializeBossVictoryProfile} from '../src/boss-victory-account.js';
import {ACCOUNT_PROFILE_KEY,readAccountProfile,writeAccountProfile} from '../src/account-profile.js';
class Memory{
 constructor(){this.data=new Map();this.fail=false;this.drop=false;}
 get length(){return this.data.size;}key(i){return [...this.data.keys()][i]??null;}
 getItem(k){return this.data.get(k)??null;}
 setItem(k,v){if(this.fail)throw Error('quota');if(!this.drop)this.data.set(k,String(v));}
 removeItem(k){this.data.delete(k);}
}
const uid='account-test',epoch='migration-02',copy=v=>JSON.parse(JSON.stringify(v));
const rawProfile={version:1,austinWins:8,alwaysWins:0,johanWins:2,crosswindWins:0,crystalWins:0,bossRuns:{'journey:old':{austin:3,at:20}},bestScores:{act1:123},extraHistoricalField:'keep'};
const seal=createBossMigrationSeal(uid,epoch,{version:1,account:rawProfile,discoveries:{bosses:['austin','austinveteran']}},1000);
const empty=createBossVictoryLedger(uid,epoch,seal.baseline),first={mode:'journey',runId:'pc-one',boss:'austin',ordinal:1},second={...first,runId:'phone-two'};
const confirmed=addBossVictoryEvent(empty,first,{ownerUid:uid,epoch}).ledger;
const m=new Memory();m.setItem('seed-cloud-owner-v1',uid);m.setItem(ACCOUNT_PROFILE_KEY,JSON.stringify(rawProfile));
assert.equal(readBossVictoryAccount(m,uid),null);
const unchanged={...rawProfile};assert.equal(projectBossVictoryProfile(m,unchanged,uid),unchanged);
installBossVictoryAccount(m,{ownerUid:uid,seal,ledger:confirmed});
assert.equal(readAccountProfile(m).austinWins,9);
assert(queueBossAccountVictory(m,{ownerUid:uid,event:second}));
assert.equal(readAccountProfile(m).austinWins,10,'distinct server and pending device victories are unioned');
assert(queueBossAccountVictory(m,{ownerUid:uid,event:copy(first)}));
assert(queueBossAccountVictory(m,{ownerUid:uid,event:copy(second)}));
assert.equal(readAccountProfile(m).austinWins,10,'copied run receipts count once across server and pending queue');
assert.equal(unchanged.austinWins,8,'projection never mutates raw historical profile');
assert.equal(readAccountProfile(m).johanWins,2);
const frozen=serializeBossVictoryProfile(m,readAccountProfile(m),uid);
assert.equal(frozen.profile.austinWins,8);assert.deepEqual(frozen.bossProtocol,{version:2,ownerUid:uid,epoch});
assert.equal(frozen.profile.bestScores.act1,123);
const projected=readAccountProfile(m);projected.bestScores.act1=456;projected.bossRuns={};
assert(writeAccountProfile(m,projected));
const actual=JSON.parse(m.getItem(ACCOUNT_PROFILE_KEY));
assert.equal(actual.austinWins,8);assert.deepEqual(actual.bossRuns,rawProfile.bossRuns);assert.equal(actual.extraHistoricalField,'keep');
assert.equal(actual.bestScores.act1,456);assert.equal(readAccountProfile(m).austinWins,10);
const cloud={...empty,events:{[bossVictoryCloudKey(first)]:{epoch,...first}}};
assert.equal(installBossVictoryAccount(m,{ownerUid:uid,seal,ledger:cloud}).ledger.events[bossVictoryEventKey(first)].runId,first.runId);
installBossVictoryAccount(m,{ownerUid:uid,seal,ledger:empty});
assert(readBossVictoryAccount(m,uid).ledger.events[bossVictoryEventKey(first)],'stale server response cannot discard confirmed events');
const stored=m.getItem(bossVictoryAccountKey(uid));
assert.throws(()=>installBossVictoryAccount(m,{ownerUid:uid,seal:{...seal,epoch:'another-epoch'},ledger:empty}));
assert.throws(()=>installBossVictoryAccount(m,{ownerUid:'foreign',seal,ledger:confirmed}));
assert.throws(()=>installBossVictoryAccount(m,{ownerUid:uid,seal,ledger:{...empty,baseline:{...empty.baseline,austinWins:99}}}));
assert.equal(m.getItem(bossVictoryAccountKey(uid)),stored);
assert(!queueBossAccountVictory(m,{ownerUid:uid,event:{...first,runId:'practice'},practice:true}));
assert(!queueBossAccountVictory(m,{ownerUid:'foreign',event:first}));
m.setItem('seed-cloud-owner-v1','foreign');assert(!queueBossAccountVictory(m,{ownerUid:uid,event:{...first,runId:'after-signout'}}));m.setItem('seed-cloud-owner-v1',uid);
assert.equal(readAccountProfile(m).austinWins,10);
const prefix=`seed-boss-victory-v2:${uid}:${epoch}:`,unknownQueue=prefix+'future';
m.setItem(unknownQueue,'{"version":3}');
assert.throws(()=>readAccountProfile(m));assert(!queueBossAccountVictory(m,{ownerUid:uid,event:{...first,runId:'blocked'}}));
assert.equal(m.getItem(unknownQueue),'{"version":3}');m.removeItem(unknownQueue);
m.setItem('seed-mode-boss-outbox-v1:'+uid+':legacy','{"unknown":"do not convert"}');
assert.equal(readAccountProfile(m).austinWins,10,'legacy outboxes never become V2 victories');
for(const unknown of ['not-json','{"version":3}',JSON.stringify({...JSON.parse(stored),extra:true}),JSON.stringify({...JSON.parse(stored),context:{...JSON.parse(stored).context,ownerUid:'foreign'}})]){
 m.setItem(bossVictoryAccountKey(uid),unknown);
 assert.throws(()=>readBossVictoryAccount(m,uid));assert.throws(()=>readAccountProfile(m));
 assert.throws(()=>installBossVictoryAccount(m,{ownerUid:uid,seal,ledger:empty}));assert(!writeAccountProfile(m,projected));
 assert.equal(m.getItem(bossVictoryAccountKey(uid)),unknown,'unknown cache bytes are preserved');
}
m.setItem(bossVictoryAccountKey(uid),stored);m.fail=true;
assert(!queueBossAccountVictory(m,{ownerUid:uid,event:{...first,runId:'quota'}}));assert(!writeAccountProfile(m,projected));
assert.throws(()=>installBossVictoryAccount(m,{ownerUid:uid,seal,ledger:empty}));
m.fail=false;m.drop=true;
assert(!queueBossAccountVictory(m,{ownerUid:uid,event:{...first,runId:'dropped'}}));
const newer=addBossVictoryEvent(confirmed,{...first,runId:'server-new'},{ownerUid:uid,epoch}).ledger;
assert.throws(()=>installBossVictoryAccount(m,{ownerUid:uid,seal,ledger:newer}),/storage/);m.drop=false;
assert.equal(readBossVictoryAccount(m,uid).ledger.events[bossVictoryEventKey({...first,runId:'server-new'})],undefined);
const absent=new Memory();absent.setItem('seed-cloud-owner-v1',uid);
assert(writeAccountProfile(absent,rawProfile));assert.equal(readAccountProfile(absent).austinWins,8);
assert.deepEqual(serializeBossVictoryProfile(absent,rawProfile,uid),{profile:rawProfile,bossProtocol:null});
assert(!queueBossAccountVictory(absent,{ownerUid:uid,event:first}));
const capacity=new Memory(),full=copy(empty);
for(let i=0;i<10000;i++){const event={...first,runId:'capacity-'+i};full.events[bossVictoryEventKey(event)]=event;}
installBossVictoryAccount(capacity,{ownerUid:uid,seal,ledger:full});
assert(!queueBossAccountVictory(capacity,{ownerUid:uid,event:{...first,runId:'over-capacity'}}),'combined verified/pending event cap fails closed');
assert(queueBossAccountVictory(capacity,{ownerUid:uid,event:{...first,runId:'capacity-0'}}),'already confirmed tuple remains idempotent at capacity');
const unreadable={getItem(){throw Error('unavailable');},setItem(){throw Error('unavailable');}};
assert(!writeAccountProfile(unreadable,projected),'storage owner lookup failure is a failed write');
console.log('Boss V2 account projection passed: immutable baseline, confirmed/pending union, copied receipt dedupe, frozen serialization, preserved legacy bytes, owner/practice isolation and failed/unknown storage. No server accounts were migrated.');
