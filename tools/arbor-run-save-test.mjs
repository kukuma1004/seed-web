import assert from 'node:assert/strict';
import {createArborJourney,stepArborJourney,creditArborKill,advanceArborJourney,checkpointArborJourney,restoreArborJourney} from '../src/arbor-journey.js';
import {ARBOR_SAVE_KEY,arborSaveKey,validArborEntry,createArborEntry,arborLeaveEntry,createArborSaveStore} from '../src/arbor-run-save.js';
import {acquireExpansionSaveLease} from '../src/expansion-save-lease.js';

const owner='arbor-cpu-owner',clone=v=>JSON.parse(JSON.stringify(v)),tests=[];
const test=(name,body)=>tests.push({name,body});
const baseRun=s=>({version:1,region:'garden',mode:'entry',cycle:s.round,stage:s.sector,hp:90,kills:s.kills,elapsed:s.time,
 rules:['reflect','split'],mutated:['split'],levels:{reflect:2,split:1},forms:{},score:s.kills*20,choicesTaken:4,choiceKills:7,
 wardens:s.wardens,austins:s.bossWins,inventory:{potion:3,tonic:2,wind:1,shell:1,sprout:0}});
const entry=(s=createArborJourney(),revision=0,id='arbor-cpu-run',who=owner)=>createArborEntry(s,baseRun(s),who,{id,revision});
function memory(initial=null){
 const data=new Map(initial===null?[]:[[arborSaveKey(owner),initial]]);
 return {data,reads:0,writes:0,onGet:null,onSet:null,getItem(key){this.reads++;this.onGet?.(key,this.reads,this);return data.get(key)??null;},setItem(key,value){this.onSet?.(key,value,this);this.writes++;data.set(key,value);}};
}
function fixture(initial=null,options={}){
 const storage=memory(initial);let current=owner,active=true,clock=100;
 const lease={ok:true,key:`seed-expansion-entry-v1:${encodeURIComponent(owner)}:arbor`,active:()=>active};
 const store=createArborSaveStore(storage,owner,{currentOwner:()=>current,lease,now:()=>clock,...options});
 return {storage,store,lease,setOwner:v=>{current=v;},setActive:v=>{active=v;},setClock:v=>{clock=v;}};
}
test('fresh room-entry round trip uses its own owner key, strict canonical world and verified revision',()=>{
 const f=fixture(),v=entry();assert.ok(v);assert.equal(validArborEntry(v,owner),true);
 const result=f.store.write(v,{fresh:true});assert.equal(result.ok,true);assert.equal(result.value.revision,1);assert.equal(result.value.savedAt,100);
 assert.equal(f.store.key,`${ARBOR_SAVE_KEY}:${encodeURIComponent(owner)}`);assert.deepEqual(f.store.read(),result.value);
 assert.deepEqual(checkpointArborJourney(restoreArborJourney(result.value.world)),v.world);
 const same=clone(result.value);same.run.hp=80;f.setClock(101);const next=f.store.write(same);assert.equal(next.ok,true);assert.equal(next.value.revision,2);assert.equal(next.value.savedAt,101);
});
test('real engine 15 warden and 3 boss boundaries all save, resume and finally finish',()=>{
 const f=fixture(),s=createArborJourney();let durable=f.store.write(entry(s),{fresh:true}).value,boundaries=1,wardens=0,bosses=0;
 for(let i=0;i<25000&&s.phase!=='complete';i++){
  const out=stepArborJourney(s,.1,{player:{x:Math.sin(i*.07)*9,z:Math.cos(i*.05)*7},alive:s.pending.length});
  for(const a of [...s.pending]){assert.equal(creditArborKill(s,a.id,a.role),true);if(a.role==='warden')wardens++;if(a.role==='boss')bosses++;}
  if(s.phase==='cleared'||s.phase==='complete'){
   const next=entry(s,durable.revision,durable.id);assert.ok(next);const result=f.store.write(next);assert.equal(result.ok,true);durable=result.value;boundaries++;
   assert.deepEqual(checkpointArborJourney(restoreArborJourney(f.store.read().world)),checkpointArborJourney(s));
   if(s.phase==='cleared'){
    assert.equal(advanceArborJourney(s),true);const advanced=entry(s,durable.revision,durable.id);assert.ok(advanced);const saved=f.store.write(advanced);assert.equal(saved.ok,true);durable=saved.value;boundaries++;
   }
  }
  assert.ok(out.spawns.length<=2);
 }
 assert.equal(wardens,15);assert.equal(bosses,3);assert.equal(s.phase,'complete');assert.equal(durable.world.phase,'complete');assert.equal(durable.world.kills,288);
 assert.equal(f.store.finish(durable),true);assert.equal(f.store.read(),null);
 const ended=JSON.parse(f.storage.data.get(f.store.key));assert.equal(ended.kind,'arbor-ended');assert.equal(ended.revision,durable.revision+1);assert.equal(ended.owner,owner);
 assert.equal(f.store.write(durable).ok,false,'ended run cannot be resurrected by stale ordinary write');
 console.log(`  ${boundaries} durable boundaries / 15 wardens / 3 bosses / 288 receipts (CPU model)`);
});
test('unfinished actors, skipped boss and fake completion never become durable',()=>{
 const f=fixture(),s=createArborJourney();stepArborJourney(s,.1);assert.equal(entry(s),null);assert.equal(f.storage.writes,0);
 const v=entry();
 for(const mutate of [x=>{x.world.phase='boss';},x=>{x.world.bossWins=3;x.run.austins=3;},x=>{x.world.phase='complete';},x=>{x.run.stage=1;},x=>{x.run.wardens=1;},x=>{x.world.unrecognized=true;},x=>{x.run.mode='austin';}]){
  const invalid=clone(v);mutate(invalid);assert.equal(validArborEntry(invalid),false);assert.equal(f.store.write(invalid,{fresh:true}).ok,false);
 }
 assert.equal(f.storage.writes,0);assert.equal(f.store.finish({id:v.id,revision:0}),false);
});
test('leaving an unfinished room keeps losses while rolling back kills, drops and upgrades',()=>{
 const source=entry(),before=clone(source),losses={hp:41,inventory:{potion:2,tonic:5,wind:0,shell:0,sprout:1},kills:999,score:999999,levels:{reflect:99},forms:{}};
 const safe=arborLeaveEntry(source,losses);assert.ok(safe);assert.equal(safe.run.hp,41);
 assert.deepEqual(safe.run.inventory,{potion:2,tonic:2,wind:0,shell:0,sprout:0});
 for(const key of ['kills','score','choicesTaken','choiceKills','levels','forms','wardens','austins'])assert.deepEqual(safe.run[key],source.run[key],key);
 assert.deepEqual(safe.world,source.world);assert.deepEqual(source,before);
 assert.equal(arborLeaveEntry(source,{hp:120,inventory:source.run.inventory}).run.hp,90);
 const f=fixture();const saved=f.store.write(source,{fresh:true});assert.equal(saved.ok,true);safe.revision=saved.value.revision;assert.equal(f.store.write(safe).ok,true);
 assert.equal(arborLeaveEntry({...source,world:{...source.world,phase:'boss'}},losses),null);
});
test('unknown, future and malformed finished bytes stay byte-for-byte intact',()=>{
 const values=['','{not json','null','{"version":2,"kind":"arbor-ended","owner":"arbor-cpu-owner"}',
  JSON.stringify({version:1,kind:'arbor-ended',owner}),
  JSON.stringify({version:1,kind:'arbor-ended',owner,id:'ended',revision:-1,savedAt:9}),
  JSON.stringify({version:1,kind:'arbor-ended',owner,id:'ended',revision:1,savedAt:9,futureFlag:true}),
  JSON.stringify({version:1,kind:'arbor-ended',owner:'another-owner',id:'ended',revision:1,savedAt:9}),
  JSON.stringify({...entry(),world:{...entry().world,phase:'complete'}})];
 for(const original of values){const f=fixture(original);assert.equal(f.store.read(),null);assert.equal(f.store.write(entry(),{fresh:true}).ok,false);assert.equal(f.store.finish(entry()),false);assert.equal(f.storage.data.get(f.store.key),original);assert.equal(f.storage.writes,0);}
});
test('stale revision, new-run overwrite and ended-run replay use explicit boundaries',()=>{
 const f=fixture(),first=f.store.write(entry(),{fresh:true}).value,bytes=f.storage.data.get(f.store.key);
 assert.equal(f.store.write(entry()).ok,false);assert.equal(f.store.finish(entry()),false);assert.equal(f.storage.data.get(f.store.key),bytes);
 const replacement=entry(createArborJourney(),0,'arbor-next-run');
 assert.equal(f.store.write(replacement,{fresh:true}).ok,false);assert.equal(f.store.write(replacement,{fresh:true,expected:{id:first.id,revision:0}}).ok,false);
 const next=f.store.write(replacement,{fresh:true,expected:first});assert.equal(next.ok,true);assert.equal(next.value.id,'arbor-next-run');assert.equal(next.value.revision,1);
 assert.equal(f.store.finish(first),false);assert.equal(f.store.finish(next.value),true);
 assert.equal(f.store.write(next.value).ok,false);assert.equal(f.store.write(entry(createArborJourney(),0,'after-ended'),{fresh:true}).ok,true);
});
test('owner and lease boundaries block all write and finish paths',()=>{
 for(const mode of ['owner','inactive','wrong-key','not-ok','missing']){
  const f=fixture(),first=f.store.write(entry(),{fresh:true}).value,bytes=f.storage.data.get(f.store.key);
  let store=f.store;
  if(mode==='owner')f.setOwner('different');if(mode==='inactive')f.setActive(false);if(mode==='wrong-key')f.lease.key+='wrong';if(mode==='not-ok')f.lease.ok=false;
  if(mode==='missing')store=createArborSaveStore(f.storage,owner);
  assert.equal(store.write(first).ok,false);assert.equal(store.finish(first),false);assert.equal(f.storage.data.get(f.store.key),bytes);
 }
 const f=fixture(),other=entry(createArborJourney(),0,'other','different');assert.equal(f.store.write(other,{fresh:true}).ok,false);
 const malformed=createArborSaveStore(f.storage,'',{lease:{ok:true,key:'seed-expansion-entry-v1::arbor',active:()=>true}});assert.equal(malformed.write(entry(),{fresh:true}).ok,false);
 for(const active of [undefined,()=>{throw Error('lock lost');},()=>1]){
  const store=createArborSaveStore(f.storage,owner,{lease:{ok:true,key:f.store.lockKey,active}});assert.equal(store.write(entry(),{fresh:true}).ok,false);assert.equal(store.finish(entry()),false);
 }
});
test('last-moment same-revision byte conflicts protect write and finish',()=>{
 for(const operation of ['write','finish']){
  const f=fixture(),first=f.store.write(entry(),{fresh:true}).value,foreign=JSON.stringify({...first,run:{...first.run,hp:33}}),writes=f.storage.writes;
  f.storage.reads=0;f.storage.onGet=(key,count,storage)=>{if(count===3)storage.data.set(key,foreign);};
  assert.equal(operation==='write'?f.store.write(first).ok:f.store.finish(first),false);
  assert.equal(f.storage.writes,writes);assert.equal(f.storage.data.get(f.store.key),foreign);
 }
});
test('owner switch and foreign write during read block final write and finish',()=>{
 for(const operation of ['write','finish'])for(const event of ['owner','lease','bytes']){
  const f=fixture(),first=f.store.write(entry(),{fresh:true}).value,original=f.storage.data.get(f.store.key),other=JSON.stringify({...first,revision:99}),startingWrites=f.storage.writes;
  f.storage.reads=0;let changed=false;
  f.storage.onGet=(key,count,storage)=>{
   if(!changed&&count===(operation==='write'?2:1)){changed=true;if(event==='owner')f.setOwner('different');else if(event==='lease')f.setActive(false);else storage.data.set(key,other);}
  };
  const result=operation==='write'?f.store.write(first).ok:f.store.finish(first);assert.equal(result,false,`${operation}/${event}`);
  assert.equal(f.storage.writes,startingWrites,`${operation}/${event} does not overwrite`);assert.equal(f.storage.data.get(f.store.key),event==='bytes'?other:original);
 }
});
test('storage refusal, read failure and oversize preserve the prior durable entry',()=>{
 for(const failure of ['read','throw-set','silent-set']){
  const f=fixture(),first=f.store.write(entry(),{fresh:true}).value,bytes=f.storage.data.get(f.store.key);
  if(failure==='read')f.storage.onGet=()=>{throw Error('read denied');};
  if(failure==='throw-set')f.storage.onSet=()=>{throw Error('disk full');};
  if(failure==='silent-set')f.storage.setItem=()=>{};
  assert.equal(f.store.write(first).ok,false);assert.equal(f.store.finish(first),false);assert.equal(f.storage.data.get(f.store.key),bytes);
 }
 const f=fixture(),first=f.store.write(entry(),{fresh:true}).value,bytes=f.storage.data.get(f.store.key),huge={...first,extra:'x'.repeat(100001)};
 assert.equal(f.store.write(huge).ok,false);assert.equal(f.storage.data.get(f.store.key),bytes);
});
test('actual expansion lease adapter grants one writer and revokes released owners',async()=>{
 const held=new Set(),locks={request(key,options,callback){if(held.has(key))return Promise.resolve(callback(null));held.add(key);return Promise.resolve(callback({name:key})).finally(()=>held.delete(key));}};
 const a=await acquireExpansionSaveLease('arbor',owner,{locks}),b=await acquireExpansionSaveLease('arbor',owner,{locks});assert.equal(a.ok,true);assert.equal(b.ok,false);
 const storage=memory(),firstStore=createArborSaveStore(storage,owner,{lease:a,now:()=>101}),secondStore=createArborSaveStore(storage,owner,{lease:b});
 const first=firstStore.write(entry(),{fresh:true});assert.equal(first.ok,true);assert.equal(secondStore.write(first.value).ok,false);
 await a.release();assert.equal(firstStore.write(first.value).ok,false);assert.equal(firstStore.finish(first.value),false);
 const c=await acquireExpansionSaveLease('arbor',owner,{locks});assert.equal(c.ok,true);const resumed=createArborSaveStore(storage,owner,{lease:c,now:()=>102});assert.equal(resumed.write(first.value).ok,true);await c.release();
 const unsupported=await acquireExpansionSaveLease('arbor',owner,{locks:{}});assert.equal(unsupported.ok,false);
});
for(const {name,body} of tests){await body();console.log(`PASS ${name}`);}
console.log(`arbor-run-save: ${tests.length} checks passed (CPU/storage/Web Locks mock; no cloud or device claim)`);
