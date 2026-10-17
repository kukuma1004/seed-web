import assert from 'node:assert/strict';
import {circuitArborGrant} from '../src/circuit-arbor-rewards.js';
import {createArborVictoryRecords,arborVictoryKey} from '../src/arbor-victory-records.js';
import {CIRCUIT_ACTS,EXPANSION_ACTS,publicCircuitActCount} from '../src/act-expansion.js';
const data=new Map(),storage={getItem:k=>data.get(k)??null,setItem:(k,v)=>data.set(k,String(v))};
let owner='real-owner',normalRunId=null;
const journal=createArborVictoryRecords({storage,account:{user:()=>({uid:owner,isAnonymous:false})},databaseURL:'https://unused.invalid',context:()=>({currentOwner:owner,released:true,inspection:false,practice:false,anonymous:false,normalRunId}),now:()=>9000});
const grant=(mode,n)=>{const events=[{boss:'arbor',ordinal:n}],proof=mode==='survival'?{actCount:6,circuit:'arbor-six-v1',arborBossWins:n}:{version:8,actCount:6,runId:'same-run',bossWins:{arbor:n}};return circuitArborGrant(mode,'same-run',n,proof,events);};
for(const mode of ['survival','defense'])for(let n=1;n<=3;n++){const g=grant(mode,n);assert(g);normalRunId=g.id;assert(journal.record({runId:g.id,ordinal:g.ordinal}));assert(journal.record({runId:g.id,ordinal:g.ordinal}));normalRunId=null;}
assert.deepEqual(journal.read(),{wins:6,clears:2,pending:2});
normalRunId='journey-source';for(let n=1;n<=3;n++)assert(journal.record({runId:normalRunId,ordinal:n}));normalRunId=null;
assert.equal(journal.read().wins,9);assert.equal(journal.read().clears,3);
const fourth=grant('survival',4);assert.notEqual(fourth.id,grant('survival',3).id);assert.equal(fourth.ordinal,1);normalRunId=fourth.id;assert(journal.record({runId:fourth.id,ordinal:1}));normalRunId=null;assert.equal(journal.read().wins,10);
const bytes=storage.getItem(arborVictoryKey(owner));
for(const mode of ['survival','defense']){
 assert.equal(circuitArborGrant(mode,'same-run',1,{actCount:5,circuit:'arbor-six-v1',version:8,runId:'same-run',arborBossWins:100,bossWins:{arbor:100}},[{boss:'arbor',ordinal:1}]),null);
 assert.equal(circuitArborGrant(mode,'same-run',1,{...mode==='survival'?{actCount:6,circuit:'arbor-six-v1',arborBossWins:1}:{version:8,actCount:6,runId:'same-run',bossWins:{arbor:1}},lab:'inspect'},[{boss:'arbor',ordinal:1}]),null);
 assert.equal(circuitArborGrant(mode,'same-run',1,{},[]),null);
}
const stale=grant('survival',5);normalRunId=null;assert.equal(journal.record({runId:stale.id,ordinal:stale.ordinal}),false);assert.equal(storage.getItem(arborVictoryKey(owner)),bytes);
owner='another-owner';assert.equal(journal.record({runId:stale.id,ordinal:stale.ordinal}),false);assert.equal(storage.getItem(arborVictoryKey('real-owner')),bytes);
assert.equal(Object.keys(EXPANSION_ACTS).length,2,'Journey must not acquire a duplicate unsupported Arbor expansion');
assert.equal(publicCircuitActCount(),6);assert.equal(publicCircuitActCount(EXPANSION_ACTS),5);assert.equal(publicCircuitActCount({...CIRCUIT_ACTS,arbor:{released:false}}),5);assert.equal(publicCircuitActCount({...CIRCUIT_ACTS,crosswind:{released:false}}),3);
console.log('Linked Arbor rewards PASS: actual existing journal, shared first/3-clear/10-win totals, retry idempotence, mode/run isolation, stale/inspection/old-circuit rejection; no server/account-device claim.');
