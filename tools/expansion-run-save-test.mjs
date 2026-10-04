import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import vm from 'node:vm';
import {createExpansionJourney,advanceExpansionJourney} from '../src/expansion-journey.js';
import {createExpansionEntry,validExpansionEntry,expansionExitCheckpoint,createExpansionSaveStore} from '../src/expansion-run-save.js';
const copy=v=>JSON.parse(JSON.stringify(v)),data=new Map(),storage={getItem:k=>data.get(k)||null,setItem:(k,v)=>data.set(k,v)};
const run={version:1,cycle:0,region:'garden',stage:0,mode:'entry',hp:100,kills:3,elapsed:15,rules:[],mutated:[],forms:{returnblade:5},inventory:{potion:3,tonic:2,wind:1,shell:1,sprout:1},score:300,choicesTaken:2,choiceKills:3};
storage.setItem('seed-run-checkpoint-v1','ordinary save untouched');
for(const act of ['crosswind','crystalGorge']){
 const journey=createExpansionJourney(act,0,413),entry=createExpansionEntry(journey,run,[0,0,5]);assert(entry);
 const a=createExpansionSaveStore(storage,act,'owner-a'),b=createExpansionSaveStore(storage,act,'owner-b');
 const initial=a.write(entry,{fresh:true});assert(initial.ok);assert.equal(b.read(),null);assert.equal(initial.value.revision,1);
 const altered=expansionExitCheckpoint(initial.value,{hp:65,inventory:{potion:2,tonic:5,wind:0,shell:1,sprout:1}});
 assert.equal(altered.run.hp,65);assert.equal(altered.run.inventory.tonic,2,'an unfinished-room drop cannot be farmed on restart');
 assert.equal(altered.run.inventory.potion,2);assert.equal(altered.run.inventory.wind,0);
 assert.equal(altered.run.kills,3);assert.equal(altered.run.score,300);assert.equal(altered.run.choicesTaken,2);
 assert(expansionExitCheckpoint(initial.value,{hp:90,inventory:run.inventory,rerollUsed:true}).run.rerollUsed,'a spent reroll cannot be restored');
 const newer=a.write(altered);assert(newer.ok);assert.equal(a.write(initial.value).reason,'conflict','a stale tab cannot overwrite attrition');
 assert.equal(a.read().run.forms.returnblade,5);assert.equal(a.read().run.hp,65);
 assert.equal(expansionExitCheckpoint(newer.value,{hp:100,inventory:run.inventory}).run.hp,65,'repeated exits cannot heal the entrance save');
 const progress=createExpansionEntry(journey,{...run,forms:{'not-a-form':1}},[0,0,5]);assert.equal(progress,null);
 for(const corrupt of [v=>v.version=2,v=>v.run.stage=4,v=>v.journey.course.time=1,v=>v.journey.course.seed=-1,v=>v.position[0]=Infinity,v=>v.journey.course.distance=Infinity]){
  const value=copy(newer.value);corrupt(value);assert(!validExpansionEntry(value));assert.equal(a.write(value).reason,'invalid');
 }
 assert.equal(a.finish(initial.value),false);assert(a.finish(newer.value));assert.equal(a.read(),null);
 assert.equal(a.write(newer.value).reason,'conflict','a finished run cannot be resurrected by a stale writer');
 // Each actual room/boss entrance is valid; outgoing course rewards are
 // captured only after advancing, not alongside respawned course enemies.
 for(let i=0;i<5;i++){const s=createExpansionJourney(act,i,413);assert(createExpansionEntry(s,{...run,stage:i},[0,0,5]));}
 const boss=createExpansionJourney(act,4,413);advanceExpansionJourney(boss);assert(createExpansionEntry(boss,{...run,stage:4},[0,0,5]));
}
assert.equal(storage.getItem('seed-run-checkpoint-v1'),'ordinary save untouched');
const failed=createExpansionSaveStore({getItem:()=>null,setItem:()=>{throw new Error('quota');}},'crosswind');
assert.equal(failed.write(createExpansionEntry(createExpansionJourney(),run,[0,0,5]),{fresh:true}).reason,'storage');
for(const original of ['{broken-json',{version:2,important:'future progress'},{version:99,ended:true,important:'future progress'}]){
 const bytes=typeof original==='string'?original:JSON.stringify(original),m=new Map(),store=createExpansionSaveStore({getItem:k=>m.get(k)||null,setItem:(k,v)=>m.set(k,v)},'crosswind');
 m.set(store.key,bytes);const start=store.write(createExpansionEntry(createExpansionJourney(),run,[0,0,5]),{fresh:true});assert(start.ok);
 assert.equal(m.get(store.key+':unrecognized'),bytes);assert(store.write(start.value).ok);assert.equal(m.get(store.key+':unrecognized'),bytes,'a rolling backup must not erase unknown original bytes');
}
{
 const m=new Map();let competing=false,store;
 const local={getItem:k=>m.get(k)||null,setItem:(k,v)=>{m.set(k,v);if(competing&&k===store.key+':previous'){competing=false;const b=store.read();assert(store.write(expansionExitCheckpoint(b,{hp:40,inventory:run.inventory})).ok);}}};
 store=createExpansionSaveStore(local,'crosswind');const first=store.write(createExpansionEntry(createExpansionJourney(),run,[0,0,5]),{fresh:true});competing=true;
 assert.equal(store.write(expansionExitCheckpoint(first.value,{hp:65,inventory:run.inventory})).reason,'conflict');assert.equal(store.read().run.hp,40);
}
console.log('Expansion entry saves: both acts/5 rooms/boss, full build/potions, attrition-only exit, no reward farming/healing, owner/act isolation, stale-tab conflicts, finish tombstone, malformed/future/quota and ordinary-save preservation passed; no cloud/device claim.');
// Execute the real reroll event handler: a developer-only room must never
// mark the ordinary account checkpoint as spent while using its local draft.
const source=readFileSync(new URL('../src/main.js',import.meta.url),'utf8'),handler=source.split('\n').find(line=>line.includes("$('#reroll-laws').onclick="));assert(handler);
for(const practice of [true,false]){
 const button={},ordinary={id:'ordinary',rerollUsed:false};let writes=0,choices=0;
 const context=vm.createContext({$:()=>button,mode:'cards',rerollUsed:false,survivalSession:null,developerRun:practice,expansionJourney:practice?{}:null,mid:true,actStore:()=>ordinary,readCheckpoint:()=>ordinary,writeCheckpoint:(_,value)=>{writes++;Object.assign(ordinary,value);},cardChoice:()=>choices++});
 vm.runInContext(handler,context);button.onclick();assert.equal(writes,practice?0:1);assert.equal(ordinary.rerollUsed,!practice);assert.equal(choices,1);assert(context.rerollUsed);
}
console.log('Actual reroll handler: local expansion leaves ordinary account checkpoint untouched; ordinary reroll still persists once.');
