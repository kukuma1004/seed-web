import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import vm from 'node:vm';
import {createModeBossOutbox,modeBossOutboxKey} from '../src/mode-boss-outbox.js';
import {recordModeBossVictory} from '../src/mode-boss-titles.js';
import {readAccountProfile} from '../src/account-profile.js';
const data=new Map(),storage={get length(){return data.size;},key:i=>[...data.keys()][i]??null,getItem:k=>data.get(k)??null,setItem:(k,v)=>data.set(k,String(v)),removeItem:k=>data.delete(k)};
let owner='A',practice=false;
const box=()=>createModeBossOutbox(storage,'A',{currentOwner:()=>owner,practice:()=>practice});
const a={mode:'defense',runId:'same-run',boss:'crosswindKeeper',ordinal:1},b={...a,boss:'crystalGardener'};
assert(box().enqueue(a));assert(box().enqueue(b));assert.equal(data.size,2);
assert(box().enqueue(a));assert.equal(data.size,2);
assert.equal(box().requiresTree(a),false);assert(box().enqueue(a,{durableTree:true}));assert.equal(box().requiresTree(a),true);
assert(box().enqueue(a));assert.equal(box().requiresTree(a),true,'retry cannot erase the pre-counter tree intent');
assert.equal(box().retry(()=>false),false);assert.equal(data.size,2,'failed grants survive ending a run');
let first=true;
assert.equal(box().retry(e=>{const result=recordModeBossVictory(storage,e);assert(result.saved);if(first){first=false;return false;}return true;}),false);
assert.equal(readAccountProfile(storage).crosswindWins,1,'account write can precede a discovery failure');
assert(box().retry(e=>recordModeBossVictory(storage,e).saved));
assert.equal(readAccountProfile(storage).crosswindWins,1,'retry repairs delivery without a second count');
assert.equal(readAccountProfile(storage).crystalWins,1);
assert.equal([...data.keys()].filter(k=>k.startsWith(modeBossOutboxKey('A'))).length,0);
// All three linked modes use the same durable route for all five real bosses.
for(const mode of ['defense','survival','journey'])for(const boss of ['austin','alwaysbeginner','tempestcarrier','crosswindKeeper','crystalGardener']){
 const event={mode,runId:'linked-five',boss,ordinal:1};
 assert(box().enqueue(event));assert.equal(box().retry(()=>false),false);
 assert(createModeBossOutbox(storage,'A').retry(e=>recordModeBossVictory(storage,e).saved));
}
// Simulated simultaneous devices on the same origin write separate event keys.
const left=box(),right=box();assert(left.enqueue(a));assert(right.enqueue(b));assert(left.ack(a));const calls=[];
assert(right.retry(e=>(calls.push(e),true)));assert.deepEqual(calls,[b]);
assert(box().enqueue(a));owner='B';assert.equal(box().retry(()=>{throw Error('wrong account');}),false);assert.equal(box().ack(a),false);assert.equal(box().enqueue(b),false);owner='A';
practice=true;assert.equal(box().retry(()=>true),false);assert.equal(box().ack(a),false);practice=false;assert(box().ack(a));
for(const e of [{...a,ordinal:0},{...a,mode:'unknown',boss:'austin'},{...a,runId:'../../bad'},{...a,inspection:true}])assert.equal(box().enqueue(e),false);
const broken=modeBossOutboxKey('A')+':unrecognized';storage.setItem(broken,'{broken');const before=storage.getItem(broken);assert.equal(box().retry(()=>true),false);assert.equal(storage.getItem(broken),before);storage.removeItem(broken);
assert(box().enqueue(a));assert.equal(box().retry(()=>{owner='B';return true;}),false);owner='A';assert(box().retry(()=>true),'UID switch before ack preserves the receipt');
const denied=createModeBossOutbox({...storage,setItem(){throw Error('quota');}},'A');assert.equal(denied.enqueue(a),false);
// Execute the actual main delivery bridge with a failure between profile and discovery.
const main=readFileSync(new URL('../src/main.js',import.meta.url),'utf8'),start=main.indexOf('function modeBossOutbox(){'),end=main.indexOf('function remember(',start);
let discoveryOk=false,flushes=0;const toast={textContent:''};
const ctx=vm.createContext({createModeBossOutbox,recordModeBossVictory,readAccountProfile,currentJourneyOwner:null,rawStorage:storage,runStorage:storage,account:{user:()=>({uid:'A'})},localInspection:false,developerRun:false,$:()=>toast,profile:{},readDiscoveries:()=>({bosses:discoveryOk?['crosswindKeeper']:[]}),remember:()=>({saved:discoveryOk}),MODE_BOSSES:{crosswindKeeper:{act:4}},awardExpansionBossTree:()=>true,cloud:{flush:async()=>{flushes++;}},dominantLaw:()=>null,effectiveLevels:()=>new Map(),levels:new Map(),heldForms:new Map()});
vm.runInContext(main.slice(start,end),ctx);
assert.equal(ctx.awardModeBoss('defense','new-run','crosswindKeeper',1),false);
assert.equal(readAccountProfile(storage).crosswindWins,5);storage.setItem('seed-cloud-owner-v1','A');ctx.remember=()=>({saved:true});ctx.retryModeBossRewards();assert.equal(flushes,0,'a skipped or silently dropped discovery cannot acknowledge the receipt');discoveryOk=true;ctx.retryModeBossRewards();
assert.equal(readAccountProfile(storage).crosswindWins,5);assert.equal(flushes,1);assert(box().retry(()=>{throw Error('should be empty');}));
console.log('Mode boss delivery: five-boss receipts, partial-write retry, run-independent retention, per-event tab writes, inspection/UID/quota isolation and actual host repair passed. Counter cloud union remains a separate issue.');
