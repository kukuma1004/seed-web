import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import vm from 'node:vm';
import {createDefense,checkpointDefense,plantDefense} from '../src/seed-defense-rules.js';
import {defensePreparationKey} from '../src/defense-save-route.js';
import {EXPANSION_ACTS} from '../src/act-expansion.js';
import {createDefenseAccountStore,defenseAccountKey,acquireDefenseAccountLease} from '../src/defense-account-save.js';
import {createDefenseAccountSync,decodeDefenseAccountCloud} from '../src/defense-account-sync.js';

const acts=Object.fromEntries(Object.entries(EXPANSION_ACTS).map(([id,a])=>[id,{...a,released:true}]));
const memory=()=>{const map=new Map();return {map,getItem:k=>map.get(k)??null,setItem:(k,v)=>map.set(k,v),removeItem:k=>map.delete(k)};};
const server=new Map();let requests=0,puts=0,getHook=null,putHook=null,mode='ok';
const fetchImpl=async(url,options)=>{
 requests++;assert.match(url,/\/seedDefenseSaves\/owner-A\/[35]\.json\?auth=test$/);const path=url.split('?')[0],remote=server.get(path)||{revision:0,value:null};
 if(mode==='offline')throw Error('network');if(mode==='permission')return {ok:false,status:403};
 if(options.method==='PUT'){
  puts++;if(putHook){const hook=putHook;putHook=null;await hook();}
  if(options.headers['if-match']!==String((server.get(path)||remote).revision))return {ok:false,status:412};
  const value=JSON.parse(options.body);server.set(path,{revision:remote.revision+1,value});return {ok:true,status:200};
 }
 const value=structuredClone(remote.value);if(getHook){const hook=getHook;getHook=null;await hook();}
 return {ok:true,status:200,json:async()=>value,headers:{get:()=>String(remote.revision)}};
};
function device(circuit=3){const storage=memory(),user={uid:'owner-A',isAnonymous:false};let held=true,active=false,practice=false;
 const account={user:()=>user,tokenSession:async()=>({uid:user.uid,idToken:'test'})},lease={ok:true,key:defenseAccountKey(user.uid,circuit),active:()=>held};
 const sync=createDefenseAccountSync({storage,account,owner:user.uid,circuit,lease,acts,databaseURL:'https://example.invalid',fetchImpl,isActive:()=>active,practice:()=>practice});
 return {storage,user,account,lease,sync,store:sync.store,setActive:v=>active=v,setHeld:v=>held=v,setPractice:v=>practice=v};
}
const save=(device,state)=>{const r=device.store.write(device.store.readRecord(),state);assert(r.ok,r.reason);return r.value;};
const pc=device(),phone=device(),original=createDefense(71);plantDefense(original,0);
const oldKey=defensePreparationKey('owner-A',3),oldBytes=JSON.stringify(checkpointDefense(original));pc.storage.setItem(oldKey,oldBytes);
assert.equal(pc.store.readRecord().writeId,'legacy-'+original.runId);assert.equal(pc.storage.getItem(pc.store.key),null);
assert.equal((await pc.sync.flush()).kind,'synced');assert.equal((await phone.sync.sync({allowPull:true})).pulled,true);
assert.deepEqual(phone.store.readRecord().checkpoint,pc.store.readRecord().checkpoint);assert.equal(pc.storage.getItem(oldKey),oldBytes);
assert.equal(phone.store.read().towers[0].laws[0],original.towers[0].laws[0]);
const before=puts;await phone.sync.sync({allowPull:true});assert.equal(puts,before);
let p=pc.store.read();p.currency=310;save(pc,p);await pc.sync.flush();let q=phone.store.read();q.currency=270;save(phone,q);
const conflict=await phone.sync.sync({allowPull:true});assert.equal(conflict.kind,'conflict');assert.equal(phone.store.read().currency,270);
p=pc.store.read();p.currency=350;save(pc,p);await pc.sync.flush();assert.equal((await phone.sync.sync({allowPull:true,choice:'local',expected:conflict.expected})).kind,'conflict');
const newer=await phone.sync.sync({allowPull:true});assert.equal((await phone.sync.sync({allowPull:true,choice:'remote',expected:newer.expected})).kind,'synced');assert.equal(phone.store.read().currency,350);assert(phone.storage.getItem(phone.store.key+':previous'));
q=phone.store.read();q.currency=400;save(phone,q);p=pc.store.read();p.currency=360;save(pc,p);await pc.sync.flush();
const localChoice=await phone.sync.sync({allowPull:true});assert.equal((await phone.sync.sync({allowPull:true,choice:'local',expected:localChoice.expected})).kind,'synced');assert(phone.storage.getItem(phone.store.key+':previous-cloud'));
pc.setActive(true);assert.equal((await pc.sync.sync({allowPull:true})).kind,'remote');assert.equal(pc.store.read().currency,360);pc.setActive(false);await pc.sync.sync({allowPull:true});assert.equal(pc.store.read().currency,400);
// A terminal record prevents resurrecting the same run's old preparation.
assert(phone.store.end(phone.store.readRecord(),q.runId).ok);await phone.sync.flush();p=pc.store.read();p.currency=500;save(pc,p);assert.equal((await pc.sync.sync({allowPull:true})).kind,'synced');assert.equal(pc.store.read(),null);assert(pc.store.readRecord().ended);
const next=createDefense(99);save(pc,next);mode='offline';assert.equal((await pc.sync.flush()).kind,'offline');assert.equal(pc.store.read().runId,next.runId);mode='permission';assert.equal((await pc.sync.flush()).kind,'permission');mode='ok';await pc.sync.flush();
// Unknown bytes cannot be erased, even before the first GET.
let d=device(),n=requests;d.storage.setItem(d.store.key,'{broken');assert.equal((await d.sync.sync({allowPull:true})).kind,'invalid');assert.equal(requests,n);assert.equal(d.storage.getItem(d.store.key),'{broken');
d=device();d.storage.setItem(oldKey,JSON.stringify({...checkpointDefense(createDefense(2)),version:999}));n=requests;assert.equal((await d.sync.sync()).kind,'invalid');assert.equal(requests,n);
d=device();save(d,createDefense(3));d.storage.setItem(d.store.key+':sync',JSON.stringify({version:99}));n=requests;assert.equal((await d.sync.sync()).kind,'invalid');assert.equal(requests,n);
// UID changes after GET and during PUT never ACK another owner or pull into it.
d=device();getHook=()=>{d.user.uid='other';};const retained=d.storage.getItem(d.store.key);assert.equal((await d.sync.sync({allowPull:true})).kind,'account');assert.equal(d.storage.getItem(d.store.key),retained);
d=device();save(d,createDefense(4));const c=await d.sync.sync({allowPull:true});assert.equal(c.kind,'conflict');putHook=()=>{d.user.uid='other';};assert.equal((await d.sync.sync({choice:'local',expected:c.expected})).kind,'account');assert.equal(d.storage.getItem(d.store.key+':sync'),null);
// Guest, practice, closed five-act gates and lost leases never write remotely.
for(const kind of ['guest','practice','lease','closed']){d=device(kind==='closed'?5:3);if(kind==='guest')d.user.isAnonymous=true;if(kind==='practice')d.setPractice(true);if(kind==='lease')d.setHeld(false);if(kind==='closed')d.sync=createDefenseAccountSync({storage:d.storage,account:d.account,owner:'owner-A',circuit:5,lease:d.lease,databaseURL:'https://example.invalid',fetchImpl});n=requests;await d.sync.sync();assert.equal(requests,n,kind);}
// Same-origin stale tab tokens cannot silently overwrite newer local writes.
d=device(5);let five=createDefense(5,{actCount:5});five.wave=48;five.currency=1000;save(d,five);const stale=d.store.readRecord();five.currency=1050;save(d,five);assert.equal(d.store.write(stale,five).reason,'conflict');
assert.equal((await d.sync.flush()).kind,'synced');const fivePhone=device(5);await fivePhone.sync.sync({allowPull:true});assert.equal(fivePhone.store.read().wave,48);assert.equal(fivePhone.store.read().actCount,5);assert.equal(fivePhone.store.read().currency,1050);
// A write during upload is dirty, then flushed, rather than incorrectly ACKed.
five=d.store.read();five.currency=1100;save(d,five);putHook=()=>{five.currency=1200;save(d,five);};assert.equal((await d.sync.sync()).kind,'local');assert.equal((await d.sync.flush()).kind,'synced');await fivePhone.sync.sync({allowPull:true});assert.equal(fivePhone.store.read().currency,1200);
// A server writer landing between GET and PUT causes a real conditional-write
// rejection; the local bytes stay intact and require a fresh choice.
five=d.store.read();five.currency=1300;save(d,five);const retainedFive=d.storage.getItem(d.store.key);
getHook=()=>{for(const [path,r] of server)if(path.endsWith('/5.json'))server.set(path,{revision:r.revision+1,value:{...r.value,revision:r.value.revision+1}});};
assert.equal((await d.sync.sync()).kind,'conflict');assert.equal(d.storage.getItem(d.store.key),retainedFive);
// Failed disk writes and unrecognized recovery copies never replace a record.
const beforeQuota=d.store.readRecord(),originalSet=d.storage.setItem;d.storage.setItem=()=>{throw Error('quota');};assert.equal(d.store.write(beforeQuota,five).reason,'storage');assert.deepEqual(d.store.readRecord(),beforeQuota);d.storage.setItem=originalSet;
d.storage.setItem(d.store.key+':previous','unknown-recovery');assert.equal(d.store.write(beforeQuota,five).reason,'invalid');assert.equal(d.storage.getItem(d.store.key+':previous'),'unknown-recovery');
// Actual view save/terminal methods use the transport; isolated views never do.
const view=readFileSync('src/seed-defense-view.js','utf8'),start=view.indexOf('function save(){'),end=view.indexOf('function sound(',start);let writes=0,ends=0,blocked=false;
const ctx=vm.createContext({state:createDefense(9),isolated:()=>blocked,checkpointDefense,preparation:{write:()=>{writes++;return {ok:true};},end:()=>{ends++;return {ok:true};},label:()=> 'local'},saveNote:''});vm.runInContext(view.slice(start,end),ctx);ctx.save();ctx.clearSave();assert.equal(writes,1);assert.equal(ends,1);blocked=true;ctx.save();ctx.clearSave();assert.equal(writes,1);assert.equal(ends,1);
// Native Web Lock contract: second tab denied, release makes slot reusable.
const held=new Set(),locks={request:async(key,options,fn)=>{if(held.has(key))return fn(null);held.add(key);try{return await fn({name:key});}finally{held.delete(key);}}};
const lease1=await acquireDefenseAccountLease('lock',3,{locks});assert(lease1.active());assert.equal((await acquireDefenseAccountLease('lock',3,{locks})).reason,'busy');await lease1.release();const lease2=await acquireDefenseAccountLease('lock',3,{locks});assert(lease2.active());await lease2.release();
console.log('TD account transport: original-preserving migration, PC→phone→PC preparation, unique timeline conflicts/choice, stale ETag/revision, active world, death, five-act wave48, writes during upload, unknown bytes, UID/practice/guest/lease isolation and real view seams passed. Simulated devices, not authenticated physical devices.');
