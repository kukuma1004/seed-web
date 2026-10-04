import assert from 'node:assert/strict';
import {acquireExpansionSaveLease} from '../src/expansion-save-lease.js';
import {createExpansionSaveStore} from '../src/expansion-run-save.js';

// Mock the Web Locks contract, including the request promise remaining pending
// until the granted callback settles. This is not a browser concurrency test.
function manager({deferSettlement=false}={}){
 const held=new Set(),calls=[],settlements=[];
 const locks={request(key,options,callback){
  calls.push({key,options});assert.deepEqual(options,{mode:'exclusive',ifAvailable:true});
  assert.equal(options.steal,undefined);
  const granted=!held.has(key);if(granted)held.add(key);
  return Promise.resolve().then(()=>callback(granted?{name:key,mode:'exclusive'}:null)).then(()=>{
   if(granted)held.delete(key);
   if(deferSettlement)return new Promise(resolve=>settlements.push(resolve));
  });
 }};
 return {locks,held,calls,settlements};
}
const tick=async()=>{for(let i=0;i<8;i++)await Promise.resolve();};
const m=manager(),owner='uid: 한/글';
const first=await acquireExpansionSaveLease('crosswind',owner,{locks:m.locks});
assert(first.ok&&first.active());
assert.equal(first.key,createExpansionSaveStore({},'crosswind',owner).key);
assert(m.held.has(first.key));
const second=await acquireExpansionSaveLease('crosswind',owner,{locks:m.locks});
assert.equal(second.reason,'busy');assert(!second.active());await second.release();
assert(first.active(),'denied client must not release the current owner');
const otherOwner=await acquireExpansionSaveLease('crosswind','other',{locks:m.locks});
const otherAct=await acquireExpansionSaveLease('crystalGorge',owner,{locks:m.locks});
assert(otherOwner.active()&&otherAct.active());assert.equal(m.held.size,3);
const released=first.release();assert(!first.active());assert.equal(first.release(),released,'release is idempotent');
await released;assert(!m.held.has(first.key));
const resumed=await acquireExpansionSaveLease('crosswind',owner,{locks:m.locks});
assert(resumed.ok&&resumed.active());await Promise.all([resumed.release(),otherOwner.release(),otherAct.release()]);assert.equal(m.held.size,0);

// The acquire result precedes callback completion; release still waits for the
// outer request to settle even if called immediately after acquiring.
const delayed=manager({deferSettlement:true});
const fast=await acquireExpansionSaveLease('crosswind','fast',{locks:delayed.locks});
let complete=false;const release=fast.release().then(()=>{complete=true;});
await tick();assert(!complete);assert.equal(delayed.settlements.length,1);
delayed.settlements[0]();await release;assert(complete&&!fast.active());

for(const locks of [null,{}, {request:null}]){
 const lease=await acquireExpansionSaveLease('crosswind','unsupported',{locks});
 assert.equal(lease.reason,'unsupported');assert(!lease.active());await lease.release();
}
for(const locks of [{request(){throw new Error('denied');}}, {request(){return Promise.reject(new Error('denied'));}}, {get request(){throw new Error('getter denied');}}, {request(){return Promise.resolve();}}]){
 const lease=await acquireExpansionSaveLease('crosswind','failure',{locks});
 assert.equal(lease.reason,'unavailable');assert(!lease.active());await lease.release();
}
// Loss of the API after grant invalidates the lease and must not leak an
// unhandled rejection or leave release waiting on its hold promise.
let rejectRequest;
const failing={request(key,options,callback){void callback({name:key}).catch(()=>{});return new Promise((resolve,reject)=>{rejectRequest=reject;});}};
const lost=await acquireExpansionSaveLease('crosswind','lost',{locks:failing});assert(lost.active());
rejectRequest(new Error('manager failed'));await tick();assert(!lost.active());await lost.release();
console.log('Expansion save lease: same-key exclusion, owner/act isolation, callback hold, immediate/idempotent release, settlement wait, reacquire and fail-closed paths passed. Mock Web Locks contract only; browser/device concurrency unverified.');
