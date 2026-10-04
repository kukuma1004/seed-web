import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {normalizeAccountProfile,readAccountProfile,writeAccountProfile} from '../src/account-profile.js';
import {MODE_BOSSES,recordModeBossVictory} from '../src/mode-boss-titles.js';
import {collectCloudSnapshot,mergeCloudSnapshots} from '../src/cloud-save.js';
import {normalizeBossRuns} from '../src/boss-title-ledger.js';

// This is an audit/reproduction, NOT an assertion that the observed results
// are correct. In particular, 9 below is the existing P1, not the earned 10.
const memory=profile=>{
 const data=new Map(),storage={getItem:key=>data.get(key)??null,setItem:(key,value)=>data.set(key,value)};
 writeAccountProfile(storage,profile);return storage;
};
const snapshot=storage=>collectCloudSnapshot(storage,{revision:1,updatedAt:1000});
const victory=(storage,runId,ordinal=1,boss='austin',now=10)=>recordModeBossVictory(storage,{mode:'survival',runId,boss,ordinal,now});
const merge=(a,b,prefer='remote')=>mergeCloudSnapshots(a,b,{prefer});

// Every boss has the same independent-device loss. Duplicate upload and merge
// order remain idempotent because max intentionally ignores both increments.
for(const [boss,{counter}] of Object.entries(MODE_BOSSES)){
 const devices=['pc','phone','tablet'].map(id=>{
  const storage=memory({[counter]:8});assert.equal(victory(storage,id,1,boss).wins,9);
  assert.equal(victory(storage,id,1,boss).counted,false);return snapshot(storage);
 });
 for(const prefer of ['local','remote']){
  const pair=merge(devices[0],devices[1],prefer);assert.equal(pair.account[counter],9,'P1: earned 10, observed 9');
  assert.equal(Object.keys(pair.account.bossRuns).length,2);
  assert.equal(merge(pair,devices[0],prefer).account[counter],9,'duplicate/stale upload is idempotent');
  assert.equal(merge(pair,pair,prefer).account[counter],9);
  const left=merge(pair,devices[2],prefer),right=merge(devices[0],merge(devices[2],devices[1],prefer),prefer);
  assert.deepEqual(left.account,right.account);assert.equal(left.account[counter],9,'P1: three devices earned 11, observed 9');
 }
}

// Ordinal is a retry high-water mark, not the number of actual credited wins.
// A skipped ordinal still grants precisely ONE victory, not all skipped ones.
{
 const storage=memory({austinWins:8});assert.equal(victory(storage,'skipped',1).wins,9);
 assert.equal(victory(storage,'skipped',9).wins,10);
 assert.equal(readAccountProfile(storage).bossRuns['survival:skipped'].austin,9);
 assert.equal(victory(storage,'skipped',8).counted,false);
 const a=memory({austinWins:8}),b=memory({austinWins:8});victory(a,'a',9);victory(b,'b',9);
 const pair=merge(snapshot(a),snapshot(b));
 const ordinalSum=Object.values(pair.account.bossRuns).reduce((sum,row)=>sum+row.austin,0);
 assert.equal(ordinalSum,18,'using ordinals as actual counts would falsely award 18 instead of earned 10');
 assert.equal(pair.account.austinWins,9);
}

// Information-loss witness using ONLY real production recording/normalizing:
// two valid histories produce exactly the same inputs to a merge, yet the
// correct totals differ. No clever client merge of these inputs can know which.
{
 const stale=memory({austinWins:8});victory(stale,'old-offline',1,'austin',1);
 const already=memory({austinWins:8}),unseen=memory({austinWins:8});
 victory(already,'old-offline',1,'austin',1);victory(already,'archive-a',1,'austin',2);
 victory(unseen,'archive-a',1,'austin',2);victory(unseen,'archive-b',1,'austin',3);
 for(let n=0;n<64;n++)for(const storage of [already,unseen])victory(storage,'recent-'+n,1,'austin',100+n);
 assert.deepEqual(snapshot(already),snapshot(unseen),'64-row truncation erased the distinguishing receipt');
 assert.equal(readAccountProfile(already).austinWins,74);
 assert.equal(Object.keys(readAccountProfile(already).bossRuns).length,64);
 assert.equal(readAccountProfile(already).bossRuns['survival:old-offline'],undefined);
 for(const prefer of ['local','remote']){
  const a=merge(snapshot(already),snapshot(stale),prefer),b=merge(snapshot(unseen),snapshot(stale),prefer);
  assert.deepEqual(a,b,'identical observed merge inputs force identical outputs');
  assert.equal(a.account.austinWins,74,'correct for already credited history; unseen history needs 75');
  assert.equal(merge(a,snapshot(stale),prefer).account.austinWins,74);
 }
 // A restored old preparation screen also gets counted twice once its receipt
 // was evicted. This pre-existing boundary cannot be repaired by a total delta.
 assert.equal(victory(already,'old-offline',1,'austin',200).counted,true);
 assert.equal(readAccountProfile(already).austinWins,75,'P1: duplicate old victory credited after truncation');
}

// Keep the actual existing normalization bounds and malformed-data behavior
// visible; do not synthesize credits from arbitrary ledger numbers or timestamps.
{
 const runs=normalizeBossRuns({'survival:bad':{at:Infinity,austin:'9',alwaysbeginner:-2},'unknown:id':{at:1,austin:9}});
 assert.equal(runs['survival:bad'].at,0);assert.equal(runs['survival:bad'].austin,0);
 assert.equal(runs['survival:bad'].alwaysbeginner,0);assert.equal(Object.keys(runs).length,1);
 assert.equal(normalizeAccountProfile({austinWins:1e9}).austinWins,100000);
 assert.equal(normalizeAccountProfile({austinWins:'9'}).austinWins,0);
}

// Read the already saved rules artifact only. The account object is open below
// its hasChildren validator, so a versioned nested receipt field is possible;
// root save siblings are explicitly closed. No Firebase network calls here.
{
 const rules=JSON.parse(readFileSync(new URL('../artifacts/firebase-live-rules-after-expansion.json',import.meta.url),'utf8'));
 const save=rules.rules.seedUsers.$uid.save;
 assert.deepEqual(save.account,{'.validate':'newData.hasChildren()'});
 assert.equal(save.$other['.validate'],false);
}
console.log('AUDIT ONLY: independent two-device 8+1+1 -> 9 reproduced for all five bosses; stale/duplicate retries and three-device order checked.');
console.log('BLOCKER PROVED: identical real 64-row-truncated profiles require different correct totals (74 vs 75); ordinals cannot serve as counts.');
console.log('Existing local duplicate after ledger eviction reproduced. Account nested rules allow new schema, but no fix or remote/device verification is claimed.');
