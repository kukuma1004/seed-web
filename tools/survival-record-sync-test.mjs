import assert from 'node:assert/strict';
import {createSurvivalRecordSync,readSurvivalAccountRecord,survivalRecordStorage} from '../src/survival-record-sync.js';
import {recordSurvivalResult} from '../src/survival-rules.js';
const memory=()=>{const m=new Map();return {getItem:k=>m.get(k)||null,setItem:(k,v)=>m.set(k,v)};};
let remote=null,revision=0,offline=false,race=null;
const fetchImpl=async(url,o)=>{
 assert(url.includes('/seedSurvivalRecords/u.json?auth='));if(offline)throw Error('offline');
 if(o.method==='PUT'){if(race){race();race=null;}if(o.headers['if-match']!==String(revision))return {ok:false,status:412};remote=JSON.parse(o.body);revision++;return {ok:true,status:200};}
 return {ok:true,json:async()=>structuredClone(remote),headers:{get:()=>String(revision)}};
};
const device=()=>{const storage=memory(),account={user:()=>({uid:'u'}),tokenSession:async()=>({uid:'u',idToken:'test'})};return {storage,sync:createSurvivalRecordSync({storage,account,databaseURL:'https://example.invalid',fetchImpl})};};
const pc=device(),phone=device();
recordSurvivalResult(survivalRecordStorage(pc.storage,'u'),{kills:500,time:950,bossesDefeated:3,completedLaps:1,fastestLap:950});
assert.equal((await pc.sync.sync()).kind,'synced');await phone.sync.sync();
assert.equal(readSurvivalAccountRecord(phone.storage,'u').bestKills,500);assert.equal(readSurvivalAccountRecord(phone.storage,'u').fastestClear,950);
assert.equal(readSurvivalAccountRecord(phone.storage,'u').wins,0,'device counters do not pretend to be synced totals');
recordSurvivalResult(survivalRecordStorage(phone.storage,'u'),{kills:800,time:990,bossesDefeated:3,completedLaps:1,fastestLap:990});
await phone.sync.sync();await pc.sync.sync();assert.equal(readSurvivalAccountRecord(pc.storage,'u').bestKills,800);assert.equal(readSurvivalAccountRecord(pc.storage,'u').fastestClear,950);
offline=true;recordSurvivalResult(survivalRecordStorage(pc.storage,'u'),{kills:1000,time:1200});assert.equal((await pc.sync.sync()).kind,'offline');
offline=false;race=()=>{remote={...remote,bestBosses:6};revision++;};await pc.sync.sync();assert.equal(remote.bestBosses,6);assert.equal(remote.bestKills,1000);
assert.equal(readSurvivalAccountRecord(pc.storage,'other').bestKills,0,'different accounts never inherit records');
console.log('Account personal best: PC to phone to PC, offline recovery, faster clear, race and identity isolation passed');
