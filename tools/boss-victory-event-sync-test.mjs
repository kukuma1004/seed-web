import assert from 'node:assert/strict';
import {createBossVictoryLedger,BOSS_EVENT_COUNTERS,bossVictoryCounts,bossVictoryCloudKey,bossVictoryEventKey} from '../src/boss-victory-events.js';
import {createBossVictoryEventSync,decodeBossVictoryCloud} from '../src/boss-victory-event-sync.js';
const baseline=Object.fromEntries(Object.values(BOSS_EVENT_COUNTERS).map(k=>[k,8])),epoch='migration-01';
let remote=createBossVictoryLedger('owner',epoch,baseline),getHook=null,putHook=null,childHook=null,mode='ok',puts=0,reads=0,conflicts=0;
const storage=()=>{const map=new Map();return {map,get length(){return map.size;},key:i=>[...map.keys()][i]??null,getItem:k=>map.get(k)??null,setItem:(k,v)=>map.set(k,v),removeItem:k=>map.delete(k)};};
const fetchImpl=async(url,o)=>{
 assert.match(url,/\/seedBossVictories\/owner(?:\/events\/[^/]+)?\.json\?auth=test$/);if(mode==='offline')throw Error('offline');if(mode==='permission')return {ok:false,status:403};
 const path=decodeURIComponent(new URL(url).pathname).replace('/seedBossVictories/owner','').replace(/\.json$/,'');
 const cloud=()=>remote===null?null:{...remote,events:Object.fromEntries(Object.values(remote.events).map(event=>[bossVictoryCloudKey(event),{epoch:remote.epoch,...event}]))};
 const child=()=>cloud()?.events[path.slice('/events/'.length)]??null;
 const etag=value=>value===null?'empty':JSON.stringify(value);
 if(o.method==='PUT'){
  assert(path.startsWith('/events/'),'never PUT an entire ledger or migration metadata');puts++;
  if(putHook){const hook=putHook;putHook=null;await hook();}
  if(o.headers['if-match']!==etag(child())){conflicts++;return {ok:false,status:412};}
  const {epoch:incomingEpoch,...event}=JSON.parse(o.body);assert.equal(incomingEpoch,remote.epoch);assert.equal(path,'/events/'+bossVictoryCloudKey(event));assert.equal(child(),null,'immutable creation only');remote.events[bossVictoryEventKey(event)]=event;return {ok:true,status:200};
 }
 reads++;const value=structuredClone(path?child():cloud()),tag=etag(value);
 const hook=path?childHook:getHook;if(hook){if(path)childHook=null;else getHook=null;await hook();}
 return {ok:true,status:200,json:async()=>value,headers:{get:()=>tag}};
};
function device(){const s=storage(),user={uid:'owner',isAnonymous:false};let practice=false;const account={user:()=>user,tokenSession:async()=>({uid:user.uid,idToken:'test'})};const sync=createBossVictoryEventSync({storage:s,account,ownerUid:'owner',epoch,baseline,databaseURL:'https://example.invalid',fetchImpl,practice:()=>practice});return {s,user,sync,setPractice:v=>practice=v};}
const event=(runId,ordinal=1)=>({mode:'survival',runId,boss:'austin',ordinal});
const emptyCloud={version:2,ownerUid:'owner',epoch,baseline};assert.deepEqual(decodeBossVictoryCloud(emptyCloud).events,{});
const validCloud={...emptyCloud,events:{[bossVictoryCloudKey(event('codec'))]:{epoch,...event('codec')}}};assert.equal(bossVictoryCounts(decodeBossVictoryCloud(validCloud)).austinWins,9);
for(const bad of [{...validCloud,extra:true},{...validCloud,events:null},{...validCloud,events:[]},{...validCloud,events:{wrong:{epoch,...event('codec')}}},{...validCloud,events:{[bossVictoryCloudKey(event('codec'))]:{epoch:'another-epoch',...event('codec')}}},{...validCloud,events:{[bossVictoryCloudKey(event('codec'))]:{epoch,...event('codec'),extra:true}}}])assert.throws(()=>decodeBossVictoryCloud(bad),/migration/);
const pc=device(),phone=device();assert(pc.sync.queue.enqueue(event('pc')));assert(phone.sync.queue.enqueue(event('phone')));
assert((await pc.sync.sync()).ok);assert((await phone.sync.sync()).ok);assert.equal(bossVictoryCounts(remote).austinWins,10);assert.equal(phone.sync.queue.pending().length,0);
assert(phone.sync.queue.enqueue(event('pc')));const before=puts;await phone.sync.sync();assert.equal(puts,before);assert.equal(bossVictoryCounts(remote).austinWins,10);
// Offline queue and UID boundaries keep exact events until observed readback.
assert(pc.sync.queue.enqueue(event('offline')));mode='offline';assert.equal((await pc.sync.sync()).kind,'offline');assert.equal(pc.sync.queue.pending().length,1);mode='ok';await pc.sync.sync();assert.equal(bossVictoryCounts(remote).austinWins,11);
assert(pc.sync.queue.enqueue(event('lost-readback')));putHook=()=>{mode='offline';};assert.equal((await pc.sync.sync()).kind,'offline');assert.equal(pc.sync.queue.pending().length,1);const once=bossVictoryCounts(remote).austinWins;mode='ok';await pc.sync.sync();assert.equal(bossVictoryCounts(remote).austinWins,once);assert.equal(pc.sync.queue.pending().length,0);
// Independent children never overwrite each other when device A writes during B's read.
assert(pc.sync.queue.enqueue(event('race-pc')));assert(phone.sync.queue.enqueue(event('race-phone')));
getHook=()=>pc.sync.sync();assert((await phone.sync.sync()).ok);assert.equal(bossVictoryCounts(remote).austinWins,once+2);
// The same immutable child races: 412 reread confirms one server event.
pc.sync.queue.enqueue(event('same-race'));phone.sync.queue.enqueue(event('same-race'));childHook=()=>pc.sync.sync();const raceBefore=bossVictoryCounts(remote).austinWins;assert((await phone.sync.sync()).ok);assert.equal(bossVictoryCounts(remote).austinWins,raceBefore+1);assert(conflicts>0);
// New events during PUT are not ACKed as if they had already reached the server.
assert(pc.sync.queue.enqueue(event('before-put')));putHook=()=>{pc.sync.queue.enqueue(event('during-put'));};const pending=await pc.sync.sync();assert.equal(pending.kind,'pending');assert.equal(pc.sync.queue.pending().length,1);await pc.sync.sync();assert.equal(pc.sync.queue.pending().length,0);
const saved=structuredClone(remote);remote=null;assert(pc.sync.queue.enqueue(event('not-migrated')));const p=puts;assert.equal((await pc.sync.sync()).kind,'not-migrated');assert.equal(puts,p);assert.equal(pc.sync.queue.pending().length,1);remote={...saved,epoch:'migration-02'};assert.equal((await pc.sync.sync()).kind,'migration');assert.equal(pc.sync.queue.pending().length,1);remote=saved;await pc.sync.sync();
let d=device();d.sync.queue.enqueue(event('uid-get'));getHook=()=>{d.user.uid='other';};assert.equal((await d.sync.sync()).kind,'account');d.user.uid='owner';assert.equal(d.sync.queue.pending().length,1);
d=device();d.sync.queue.enqueue(event('uid-put'));putHook=()=>{d.user.uid='other';};assert.equal((await d.sync.sync()).kind,'account');d.user.uid='owner';assert.equal(d.sync.queue.pending().length,1);await d.sync.sync();assert.equal(d.sync.queue.pending().length,0);
d=device();d.setPractice(true);assert.equal(d.sync.queue.enqueue(event('private')),false);const readBefore=reads;assert.equal((await d.sync.sync()).kind,'account');assert.equal(reads,readBefore);
// Unrecognized queue bytes and failed deletes survive; no false successful ACK.
d=device();d.sync.queue.enqueue(event('unknown'));const path=[...d.s.map.keys()][0];d.s.setItem(path,'{broken');const bytes=d.s.getItem(path);assert.equal((await d.sync.sync()).kind,'invalid');assert.equal(d.s.getItem(path),bytes);
d=device();d.sync.queue.enqueue(event('delete-failure'));const originalRemove=d.s.removeItem;d.s.removeItem=()=>{throw Error('quota');};assert.equal((await d.sync.sync()).kind,'ack');assert.equal(d.sync.queue.pending().length,1);d.s.removeItem=originalRemove;const count=bossVictoryCounts(remote).austinWins;await d.sync.sync();assert.equal(bossVictoryCounts(remote).austinWins,count);
// Bounded network batches preserve the rest; no unbounded PUT loop in one flush.
d=device();for(let i=0;i<40;i++)d.sync.queue.enqueue(event('batch-'+i));const batch=await d.sync.sync();assert.equal(batch.kind,'pending');assert.equal(d.sync.queue.pending().length,8);assert((await d.sync.sync()).ok);assert.equal(d.sync.queue.pending().length,0);
console.log('Boss V2 append-only transport: actual-event two-device union, immutable per-event PUT, same-event ETag 412 reread, readback-only ACK, lost readback/deduped retry, bounded batches, new events during PUT, no client baseline creation, UID/practice isolation, unknown bytes and failed delete preservation passed. Dormant: production migration/gameplay cutover not enabled.');
