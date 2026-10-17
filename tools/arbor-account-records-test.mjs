import assert from 'node:assert/strict';
import {createArborJourney,stepArborJourney,creditArborKill,advanceArborJourney} from '../src/arbor-journey.js';
import {arborSaveKey,createArborEntry,createArborSaveStore,arborLeaveEntry} from '../src/arbor-run-save.js';
import {arborAccountKey,arborAccountLockKey,arborAccountEligible,validArborAccountRecord,validArborPublicEntry,validArborEnded,arborFollowsEnded,createArborAccountRecords} from '../src/arbor-account-records.js';

const owner='arbor-public-owner',clone=v=>structuredClone(v),tests=[];
const test=(name,body)=>tests.push({name,body});
function memory(){const data=new Map();return {data,onSet:null,onGet:null,getItem(key){this.onGet?.(key);return data.get(key)??null;},setItem(key,value){this.onSet?.(key,value);data.set(key,value);},removeItem(key){data.delete(key);}};}
function run(s){return {version:1,cycle:s.round,region:'garden',stage:s.sector,mode:'entry',hp:100,kills:s.kills,elapsed:s.time,rules:[],mutated:[],forms:{},inventory:{potion:3,tonic:2,wind:1,shell:0,sprout:0},score:s.kills*25,choicesTaken:0,choiceKills:0,wardens:s.wardens,austins:s.bossWins};}
function fixture(){
 const storage=memory(),facts={currentOwner:owner,released:true,inspection:false,practice:false,anonymous:false};let active=true;
 const lease={ok:true,key:arborAccountLockKey(owner),active:()=>active,release:async()=>{active=false;}};
 const raw=createArborSaveStore(storage,owner,{currentOwner:()=>facts.currentOwner,lease,now:()=>100});
 const records=createArborAccountRecords(storage,owner,{context:()=>facts,lease});
 const start=(id='public-run')=>raw.write(createArborEntry(createArborJourney(),run(createArborJourney()),owner,{id}),{fresh:true});
 return {storage,facts,lease,raw,records,start,active:v=>{active=v;}};
}

test('new public provenance is explicit; old UID entries are readable locally and never promoted',()=>{
 const f=fixture(),saved=f.start();assert(saved.ok);const before=f.storage.getItem(arborSaveKey(owner));
 assert.equal(f.records.read(),null);assert.equal(f.records.capture(saved.value).reason,'legacy');assert.equal(f.storage.getItem(arborSaveKey(owner)),before);
 const marked=f.records.begin(saved.value);assert(marked.ok);assert.equal(marked.value.entry.id,'public-run');assert(validArborAccountRecord(marked.value,{owner}));assert.equal(f.records.begin(saved.value).reason,'conflict');
 assert.deepEqual(f.raw.read(),saved.value);assert.equal(f.storage.getItem(arborSaveKey(owner)),before,'provenance never rewrites the gameplay entry');
});
test('only a committed genuinely initial checkpoint can begin; inspection/guest/anonymous/practice stay separate',()=>{
 for(const bad of ['guest','anonymous','inspection:a','inspection-boss:a','practice:a','__proto__'])assert.equal(arborAccountEligible(bad,{currentOwner:bad,released:true}),false,bad);
 for(const [flag,value] of [['inspection',true],['practice',true],['anonymous',true],['developerRun',true],['released',false],['currentOwner','other']]){
  const f=fixture(),saved=f.start();f.facts[flag]=value;assert.equal(f.records.begin(saved.value).ok,false);assert.equal(f.storage.getItem(arborAccountKey(owner)),null);
 }
 for(const mutate of [e=>e.revision=0,e=>e.run.kills=10,e=>e.run.elapsed=1,e=>e.run.score=30,e=>e.run.choicesTaken=1,e=>e.run.developerRun=true,e=>e.extra='future',e=>e.savedAt=0]){
  const f=fixture(),entry=clone(f.start().value);mutate(entry);assert.equal(f.records.begin(entry).ok,false);assert.equal(f.records.read(),null);
 }
});
test('strict public codec rejects owner/future/unknown/prototype/review fields and oversized record bytes',()=>{
 const f=fixture(),v=f.records.begin(f.start().value).value;
 for(const mutate of [x=>x.version=2,x=>x.ownerUid='other',x=>x.channel='inspection',x=>x.extra=true,x=>x.entry.run.futureVersion=2,x=>x.entry.world.lab=true,x=>x.entry.run.practice=true,x=>x.previousRun={id:x.entry.id,revision:1},x=>x.previousRun={id:'older',revision:1,extra:true},x=>x.entry.run.guideTarget='x'.repeat(100000)]){
  const value=clone(v);mutate(value);assert.equal(validArborAccountRecord(value,{owner}),false);
 }
 assert.equal(validArborEnded({...v.entry,kind:'arbor-ended'}),false);
});
test('real save store loss checkpoint and all 15 guardian / 3 boss boundary transitions retain provenance',()=>{
 const f=fixture(),world=createArborJourney();let saved=f.start().value;assert(f.records.begin(saved).ok);
 const loss=f.raw.write(arborLeaveEntry(saved,{hp:68,inventory:{potion:2,tonic:2,wind:0,shell:0,sprout:0}}));assert(loss.ok);assert(f.records.capture(loss.value).ok);assert.equal(f.records.read().entry.run.hp,68);
 saved=loss.value;let boundaries=0;
 for(let frame=0;frame<25000&&world.phase!=='complete';frame++){
  stepArborJourney(world,.1,{player:{x:0,z:5},alive:world.pending.length});for(const actor of [...world.pending])assert(creditArborKill(world,actor.id,actor.role));
  if(['cleared','complete'].includes(world.phase)){
   const next=createArborEntry(world,run(world),owner,{id:saved.id,revision:saved.revision}),result=f.raw.write(next);assert(result.ok);saved=result.value;assert(f.records.capture(saved).ok);boundaries++;
   if(world.phase==='cleared'){assert(advanceArborJourney(world));const advanced=f.raw.write(createArborEntry(world,run(world),owner,{id:saved.id,revision:saved.revision}));assert(advanced.ok);saved=advanced.value;assert(f.records.capture(saved).ok);boundaries++;}
  }
 }
 assert.equal(world.wardens,15);assert.equal(world.bossWins,3);assert.equal(world.kills,288);assert.equal(boundaries,35);
 assert(f.raw.finish(saved));const ended=JSON.parse(f.storage.getItem(f.raw.key));assert(f.records.finish(ended).ok);assert(validArborEnded(f.records.read().entry));assert.equal(f.records.capture(saved).reason,'conflict');
 const old=f.records.read(),fresh=f.start('next-public').value,marked=f.records.begin(fresh,{expected:old});assert(marked.ok);assert(arborFollowsEnded(marked.value,old));assert.equal(marked.value.previousRun.revision,ended.revision);
 console.log('  actual codec/store: 35 progressed boundaries / 15 wardens / 3 bosses / 288 kill receipts');
});
test('lease and owner are checked at mutation; stale revisions and concurrent gameplay entry are not captured',()=>{
 const f=fixture(),entry=f.start().value;assert(f.records.begin(entry).ok);const before=f.storage.getItem(f.records.key);
 f.active(false);assert.equal(f.records.capture(entry).reason,'lease');f.active(true);f.facts.currentOwner='other';assert.equal(f.records.capture(entry).reason,'ineligible');f.facts.currentOwner=owner;
 const changed=f.raw.write({...entry,run:{...entry.run,hp:70}}).value;assert(changed);assert.equal(f.records.capture(entry).reason,'conflict');assert.equal(f.storage.getItem(f.records.key),before);assert(f.records.capture(changed).ok);
 const hostile={...f.lease,key:'wrong'};const wrong=createArborAccountRecords(f.storage,owner,{context:()=>f.facts,lease:hostile});assert.equal(wrong.capture(changed).reason,'lease');
});
test('pull replacement retains raw entry identity/revision, backs up both keys and rejects terminal resurrection',()=>{
 const f=fixture(),initial=f.records.begin(f.start().value).value,next=clone(initial);next.entry.revision++;next.entry.run.hp=45;
 assert(f.records.replace(initial,next).ok);assert.deepEqual(f.raw.read(),next.entry);assert.equal(JSON.parse(f.storage.getItem(f.records.key+':previous')).entry.run.hp,100);
 const ended={...clone(next),entry:{version:1,kind:'arbor-ended',owner,id:next.entry.id,revision:2,savedAt:200}};
 assert(f.records.replace(next,ended,{allowEnded:true}).ok);assert.equal(f.raw.read(),null);assert.equal(f.records.replace(ended,next,{allowFork:true,allowEnded:true}).reason,'conflict');
 const different=clone(initial);different.entry.id='remote-other';assert.equal(f.records.replace(ended,different).reason,'conflict');assert(f.records.replace(ended,different,{allowDifferentRun:true}).ok);
});
test('partial pull writes recover exact accepted bytes with a durable journal under the same lease',()=>{
 const f=fixture(),initial=f.records.begin(f.start().value).value,next=clone(initial);next.entry.revision++;next.entry.run.hp=25;
 f.storage.onSet=key=>{if(key===f.raw.key)throw Error('disk-full');};assert.equal(f.records.replace(initial,next).reason,'storage');assert(f.storage.getItem(f.records.journalKey));assert.equal(f.records.read(),null);assert.equal(f.raw.read().run.hp,100);
 f.storage.onSet=null;assert.deepEqual(f.records.prepare(),{ok:true,recovered:true});assert.deepEqual(f.records.read(),next);assert.equal(f.raw.read().run.hp,25);assert.equal(f.storage.getItem(f.records.journalKey),null);
});
test('future bytes at raw/public/journal/backup keys survive pull and mutation untouched',()=>{
 for(const target of ['entry','public','journal','backup']){
  const f=fixture(),initial=f.records.begin(f.start().value).value,next=clone(initial);next.entry.revision++;next.entry.run.hp=25;
  const key=target==='entry'?f.raw.key:target==='public'?f.records.key:target==='journal'?f.records.journalKey:f.records.key+':previous';
  const future='{"version":99,"important":"preserve"}';f.storage.setItem(key,future);
  assert.equal(f.records.replace(initial,next).ok,false,target);assert.equal(f.storage.getItem(key),future,target);assert.equal(f.records.capture(next.entry).ok,false,target);
 }
});
test('legacy raw data requires explicit remote selection and is backed up; unknown legacy remains unmodified',()=>{
 const source=fixture(),remote=source.records.begin(source.start().value).value;
 const f=fixture(),local=f.start('old-device-only').value;assert.equal(f.records.replace(null,remote).reason,'legacy');assert(f.records.replace(null,remote,{allowDifferentRun:true}).ok);assert.deepEqual(JSON.parse(f.storage.getItem(f.raw.key+':previous-account')),local);
 const future=fixture();future.storage.setItem(future.raw.key,'{"version":99}');assert.equal(future.records.replace(null,remote,{allowDifferentRun:true}).ok,false);assert.equal(future.storage.getItem(future.raw.key),'{"version":99}');
});

for(const {name,body} of tests){await body();console.log('PASS '+name);}console.log(`Arbor account records: ${tests.length} checks passed.`);
