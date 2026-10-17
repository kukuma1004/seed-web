import assert from 'node:assert/strict';
import {createArborJourney} from '../src/arbor-journey.js';
import {createArborEntry,createArborSaveStore,arborLeaveEntry,arborSaveKey} from '../src/arbor-run-save.js';
import {arborAccountKey,createArborAccountRecords} from '../src/arbor-account-records.js';
import {createArborAccountSync,decodeArborAccountCloud} from '../src/arbor-account-sync.js';
import {acquireExpansionSaveLease} from '../src/expansion-save-lease.js';

const clone=v=>structuredClone(v),tests=[];
const test=(name,body)=>tests.push({name,body});
const memory=()=>{const data=new Map();return {data,onGet:null,onSet:null,getItem(k){this.onGet?.(k);return data.get(k)??null;},setItem(k,v){this.onSet?.(k,v);data.set(k,v);},removeItem(k){data.delete(k);}};};
function locks(){const held=new Set();return {request:async(key,options,fn)=>{assert.equal(options.mode,'exclusive');assert.equal(options.ifAvailable,true);if(held.has(key))return fn(null);held.add(key);try{return await fn({name:key});}finally{held.delete(key);}}};}
const initialRun={version:1,cycle:0,region:'garden',stage:0,mode:'entry',hp:100,kills:0,elapsed:0,rules:[],mutated:[],forms:{},inventory:{potion:3,tonic:2,wind:1,shell:0,sprout:0},score:0,choicesTaken:0,choiceKills:0,wardens:0,austins:0};
function transport(){
 const t={remote:null,etag:0,gets:0,puts:0,getHook:null,putHook:null,mode:'ok',omitEtag:false};
 t.fetch=async(url,options)=>{
  assert.match(url,/^https:\/\/example.invalid\/seedArborSaves\/a.json\?auth=token$/);assert.equal(options.cache,'no-store');
  if(t.mode==='offline')throw Error('offline');if(t.mode==='permission')return {ok:false,status:403};
  if(options.method==='PUT'){
   t.puts++;if(t.putHook){const hook=t.putHook;t.putHook=null;await hook(options);}
   if(options.headers['if-match']!==String(t.etag))return {ok:false,status:412};
   const next=JSON.parse(options.body);assert.equal(next.revision,(t.remote?.revision||0)+1);assert.equal(next.ownerUid,'a');
   t.remote=next;t.etag++;if(t.mode==='lose-response'){t.mode='ok';throw Error('network response lost');}return {ok:true,status:200};
  }
  t.gets++;assert.equal(options.headers['X-Firebase-ETag'],'true');const value=clone(t.remote),etag=String(t.etag);
  if(t.getHook){const hook=t.getHook;t.getHook=null;await hook();}
  return {ok:true,status:200,json:async()=>value,headers:{get:key=>key==='ETag'&&!t.omitEtag?etag:null}};
 };
 return t;
}
function device(t,{manager=locks(),storage=memory(),supported=true}={}){
 const u={uid:'a',isAnonymous:false},facts={released:true,inspection:false,practice:false,developerRun:false};let lease=null,active=false,now=100;
 const account={user:()=>u,tokenSession:async()=>({uid:u.uid,idToken:'token'})};
 const context=()=>({...facts,currentOwner:u.uid,anonymous:u.isAnonymous});
 const records=()=>createArborAccountRecords(storage,'a',{context,lease});
 const raw=()=>createArborSaveStore(storage,'a',{currentOwner:()=>u.uid,lease,now:()=>++now});
 const acquire=(act,owner)=>acquireExpansionSaveLease(act,owner,{locks:supported?manager:null});
 const sync=createArborAccountSync({storage,account,context,databaseURL:'https://example.invalid/',fetchImpl:t.fetch,isActive:()=>active,activeLease:()=>lease,acquireLease:acquire});
 async function edit(fn,{keep=false}={}){if(!lease?.active())lease=await acquire('arbor','a');assert(lease.ok);try{return fn(raw(),records());}finally{if(!keep){await lease.release();lease=null;}}}
 const start=(id='arbor-public',options={})=>edit((store,record)=>{const before=record.read(),written=store.write(createArborEntry(createArborJourney(),initialRun,'a',{id}),{fresh:true});assert(written.ok);return options.legacy?written:record.begin(written.value,{expected:before});});
 const change=(hp,options={})=>edit((store,record)=>{const next=store.write(arborLeaveEntry(store.read(),{hp,inventory:{...initialRun.inventory,tonic:1,wind:0}}));assert(next.ok);return options.capture===false?next:record.capture(next.value);},options);
 const finish=()=>edit((store,record)=>{assert(store.finish(store.read()));return record.finish(JSON.parse(storage.getItem(store.key)));});
 return {u,facts,storage,account,sync,edit,start,change,finish,read:()=>records().read(),raw:()=>raw().read(),active:v=>active=v,release:async()=>{if(lease)await lease.release();lease=null;},lease:v=>lease=v};
}

test('PC → phone → PC preserves exact real room checkpoint, forms/potions/owner and skips unchanged PUT',async()=>{
 const t=transport(),pc=device(t),phone=device(t);assert((await pc.start()).ok);
 await pc.edit((raw,records)=>{const before=raw.read(),next=raw.write({...before,run:{...before.run,rules:['reflect'],levels:{reflect:3},forms:{returnblade:5}}});assert(next.ok);assert(records.capture(next.value).ok);});
 assert.equal((await pc.sync.flush()).kind,'synced');
 assert.equal((await phone.sync.prepare()).pulled,true);assert.deepEqual(phone.read(),pc.read());assert.deepEqual(phone.raw().run.inventory,initialRun.inventory);
 assert.equal(phone.raw().run.forms.returnblade,5);assert.equal(phone.raw().run.levels.reflect,3);
 const count=t.puts;assert.equal((await phone.sync.prepare()).kind,'synced');assert.equal(t.puts,count);
 assert((await phone.change(62)).ok);assert.equal((await phone.sync.flush()).kind,'synced');assert.equal((await pc.sync.prepare()).pulled,true);
 assert.equal(pc.raw().hp,undefined,'raw value is an entry, not the run itself');assert.equal(pc.raw().run.hp,62);
});
test('independent attrition forks, stale conflict cards and same-revision forks need current explicit choice',async()=>{
 const t=transport(),pc=device(t),phone=device(t);await pc.start();await pc.sync.flush();await phone.sync.prepare();await pc.change(70);await pc.sync.flush();await phone.change(60);
 const conflict=await phone.sync.prepare();assert.equal(conflict.kind,'conflict');assert.equal(phone.raw().run.hp,60);assert.equal(decodeArborAccountCloud(t.remote,{owner:'a'}).record.entry.run.hp,70);
 assert.equal((await phone.sync.sync({choice:'local',expected:conflict.expected})).kind,'synced');assert(phone.storage.getItem(arborAccountKey('a')+':previous-cloud'));
 await pc.sync.prepare();await phone.change(50);await pc.change(40);await pc.sync.flush();const old=await phone.sync.prepare();await pc.change(35);await pc.sync.flush();
 assert.equal((await phone.sync.sync({choice:'remote',allowPull:true,expected:old.expected})).kind,'conflict');const latest=await phone.sync.prepare();assert.equal((await phone.sync.sync({choice:'remote',allowPull:true,expected:latest.expected})).kind,'synced');assert.equal(phone.raw().run.hp,35);
});
test('active combat offers newer remote progress without replacing a running world',async()=>{
 const t=transport(),pc=device(t),phone=device(t);await pc.start();await pc.sync.flush();await phone.sync.prepare();await pc.change(60);await pc.sync.flush();phone.active(true);
 const bytes=phone.storage.getItem(arborSaveKey('a'));assert.equal((await phone.sync.prepare()).kind,'remote');assert.equal(phone.storage.getItem(arborSaveKey('a')),bytes);phone.active(false);assert.equal((await phone.sync.prepare()).pulled,true);
});
test('remote terminal beats a higher local active revision; next run requires exact terminal ancestry',async()=>{
 const t=transport(),pc=device(t),phone=device(t);await pc.start('terminal');await pc.sync.flush();await phone.sync.prepare();await pc.finish();await pc.sync.flush();await phone.change(90);await phone.change(85);await phone.change(80);
 const chosen=await phone.sync.prepare();assert.equal(chosen.kind,'synced');assert.equal(phone.raw(),null);assert.equal(phone.read().entry.kind,'arbor-ended');
 assert((await pc.start('after-terminal')).ok);assert.equal((await pc.sync.flush()).kind,'synced');assert.equal((await phone.sync.prepare()).pulled,true);assert.equal(phone.read().entry.id,'after-terminal');
});
test('different fresh runs are not ordered by device clock or their identical local revision',async()=>{
 const t=transport(),pc=device(t),phone=device(t);await pc.start('pc');await phone.start('phone');await pc.sync.flush();const conflict=await phone.sync.prepare();assert.equal(conflict.kind,'conflict');assert.equal(phone.read().entry.id,'phone');
 assert.equal((await phone.sync.sync({choice:'remote',allowPull:true,expected:conflict.expected})).kind,'synced');assert.equal(phone.read().entry.id,'pc');assert(phone.storage.getItem(arborSaveKey('a')+':previous-account'));
});
test('acknowledged marker survives missing boundary capture and finish; raw legacy never uploads or auto-promotes',async()=>{
 const t=transport(),pc=device(t);await pc.start();await pc.sync.flush();await pc.change(53,{capture:false});assert.equal(pc.read().entry.run.hp,100);assert.equal((await pc.sync.flush()).kind,'synced');assert.equal(pc.read().entry.run.hp,53);
 const empty=transport(),old=device(empty);await old.start('published-old',{legacy:true});const raw=old.storage.getItem(arborSaveKey('a'));assert.equal((await old.sync.prepare()).kind,'legacy');assert.equal(empty.puts,0);assert.equal(old.storage.getItem(arborAccountKey('a')),null);assert.equal(old.storage.getItem(arborSaveKey('a')),raw);
 const linked=device(t);await linked.start('published-old',{legacy:true});const conflict=await linked.sync.prepare();assert.equal(conflict.kind,'conflict');assert.equal((await linked.sync.sync({choice:'remote',allowPull:true,expected:conflict.expected})).kind,'synced');assert(linked.storage.getItem(arborSaveKey('a')+':previous-account'));
});
test('offline/permission/unknown remote cannot license an overwrite; missing ETag never uses unconditional PUT',async()=>{
 const t=transport(),d=device(t);await d.start();t.mode='offline';assert.equal((await d.sync.flush()).kind,'offline');assert.equal(t.puts,0);t.mode='permission';assert.equal((await d.sync.flush()).kind,'permission');assert.equal(t.puts,0);
 t.mode='ok';t.omitEtag=true;assert.equal((await d.sync.flush()).kind,'offline');assert.equal(t.puts,0);t.omitEtag=false;await d.sync.flush();await d.change(75);
 const valid=clone(t.remote);t.remote={version:99,important:'future'};assert.equal((await d.sync.flush()).kind,'invalid');assert.equal(t.puts,1);assert.equal(t.remote.important,'future');t.remote=valid;
});
test('future local/meta/backup bytes remain exact and do not authorize cloud writes',async()=>{
 for(const location of ['entry','record','meta','backup']){
  const t=transport(),d=device(t);await d.start();await d.sync.flush();await d.change(60);
  const key=location==='entry'?arborSaveKey('a'):location==='record'?arborAccountKey('a'):location==='meta'?'seed-arbor-account-sync-v1:a':arborAccountKey('a')+':previous-cloud';
  const future='{"version":99,"doNotDelete":"future"}';d.storage.setItem(key,future);const count=t.puts;assert.equal((await d.sync.flush()).kind,'invalid',location);assert.equal(d.storage.getItem(key),future);assert.equal(t.puts,count);
 }
});
test('missing server data after an acknowledgment cannot erase local progress or start an offline overwrite',async()=>{
 const t=transport(),d=device(t);await d.start();await d.sync.flush();await d.change(80);t.remote=null;t.etag++;const writes=t.puts;
 assert.equal((await d.sync.prepare()).kind,'conflict');assert.equal(t.puts,writes);assert.equal(d.raw().run.hp,80);
});
test('lost successful PUT response is acknowledged by exact bytes on retry without duplicate upload',async()=>{
 const t=transport(),d=device(t);await d.start();t.mode='lose-response';assert.equal((await d.sync.flush()).kind,'offline');assert.equal(t.puts,1);const json=JSON.stringify(t.remote);assert.equal((await d.sync.flush()).kind,'synced');assert.equal(t.puts,1);assert.equal(JSON.stringify(t.remote),json);
});
test('412 collision is surfaced once; local changes during PUT are uploaded only on a fresh GET/CAS',async()=>{
 const t=transport(),d=device(t);await d.start();await d.sync.flush();await d.change(70,{keep:true});t.putHook=()=>d.change(55,{keep:true});assert.equal((await d.sync.flush()).kind,'synced');assert.equal(decodeArborAccountCloud(t.remote,{owner:'a'}).record.entry.run.hp,55);await d.release();
 await d.change(40);const remoteBefore=clone(t.remote);t.putHook=()=>{t.remote={...t.remote,revision:t.remote.revision+1};t.etag++;};assert.equal((await d.sync.flush()).kind,'conflict');assert.equal(decodeArborAccountCloud(t.remote,{owner:'a'}).record.entry.run.hp,55);assert.equal(d.raw().run.hp,40);assert.equal(t.remote.revision,remoteBefore.revision+1);
});
test('account/gate/lease changes during asynchronous I/O stop mutation and protect prior metadata',async()=>{
 for(const type of ['owner','inspection','lease']){
  const t=transport(),d=device(t);await d.start();t.getHook=async()=>{if(type==='owner')d.u.uid='b';else if(type==='inspection')d.facts.inspection=true;else await d.release();};
  if(type==='lease')await d.change(90,{keep:true});
  const result=await d.sync.flush();assert.equal(result.kind,type==='owner'?'account':type==='inspection'?'ineligible':'lease');
  assert.equal(t.puts,0);await d.release();
 }
 const t=transport(),d=device(t);await d.start();const lease=await acquireExpansionSaveLease('arbor','a',{locks:locks()});d.lease({...lease,key:'wrong'});assert.equal((await d.sync.flush()).kind,'lease');assert.equal(t.gets,0);await lease.release();
});
test('inspection/practice/anonymous/closed release and unavailable lock all fail before network I/O',async()=>{
 for(const flag of ['inspection','practice','developerRun','anonymous','released']){
  const t=transport(),d=device(t);await d.start();if(flag==='anonymous')d.u.isAnonymous=true;else d.facts[flag]=flag!=='released';assert.equal((await d.sync.flush()).kind,'ineligible');assert.equal(t.gets+t.puts,0);
 }
 const t=transport(),d=device(t,{supported:false});assert.equal((await d.sync.prepare()).kind,'unsupported');assert.equal(t.gets+t.puts,0);
 const manager=locks(),held=await acquireExpansionSaveLease('arbor','a',{locks:manager}),busy=device(t,{manager});assert.equal((await busy.sync.prepare()).kind,'busy');assert.equal(t.gets+t.puts,0);await held.release();
});
test('storage refusal, token owner mismatch and interrupted two-key pull fail closed then recover',async()=>{
 const t=transport(),pc=device(t),phone=device(t);await pc.start();await pc.sync.flush();
 phone.storage.onSet=key=>{if(key===arborSaveKey('a'))throw Error('disk full');};assert.equal((await phone.sync.prepare()).kind,'storage');assert.equal(phone.read(),null);assert(phone.storage.getItem(arborAccountKey('a')+':pull-journal'));
 phone.storage.onSet=null;assert.equal((await phone.sync.prepare()).kind,'synced');assert.deepEqual(phone.read(),pc.read());assert.equal(phone.storage.getItem(arborAccountKey('a')+':pull-journal'),null);
 const wrong=device(t);wrong.account.tokenSession=async()=>({uid:'other',idToken:'token'});const count=t.gets;assert.equal((await wrong.sync.prepare()).kind,'account');assert.equal(t.gets,count);
 const denied=device(t);denied.storage.onGet=()=>{throw Error('access denied');};assert.equal((await denied.sync.prepare()).kind,'storage');assert.equal(t.gets,count);
});
test('cloud envelope rejects invalid owner/version/checkpoint/revision and unknown keys',()=>{
 for(const value of [{version:99},{version:1,ownerUid:'b',revision:1,checkpoint:'{}'},{version:1,ownerUid:'a',revision:1,checkpoint:'{}'},{version:1,ownerUid:'a',revision:0,checkpoint:'{}'},{version:1,ownerUid:'a',revision:1,checkpoint:'x'.repeat(100001)}])assert.throws(()=>decodeArborAccountCloud(value,{owner:'a'}));
 assert.deepEqual(decodeArborAccountCloud(null,{owner:'a'}),{revision:0,record:null});
});

for(const {name,body} of tests){await body();console.log('PASS '+name);}console.log(`Arbor account sync: ${tests.length} checks passed (mock transport; no player/server writes).`);
