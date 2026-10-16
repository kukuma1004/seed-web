import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import * as rules from '../src/arbor-journey.js';
import {validCheckpoint,roomExitCheckpoint} from '../src/run-save.js';

// Vite shares the ordinary save validators with the DOM-heavy main chunk.
// Inject those two exact source APIs, retain and execute the entire minified
// Arbor codec, and discover its aliases from its exported call sites. No main
// renderer module or art side effect is executed in this renderless contract.
const files=fs.readdirSync('dist/assets').filter(name=>/^arbor-run-save-[\w-]+\.js$/.test(name));
assert.equal(files.length,1,'build before running the production save contract');
const file=`dist/assets/${files[0]}`,compiled=fs.readFileSync(file,'utf8');
const exportMatch=compiled.match(/export\{([^}]+)\};?/);assert.ok(exportMatch,'built ESM exports');
const publicNames=Object.fromEntries(exportMatch[1].split(',').map(term=>{const [local,name]=term.trim().split(/\s+as\s+/);return [name||local,local];}));
function builtFunction(name){const local=publicNames[name];assert.ok(local,name);const token=`function ${local}(`,start=compiled.indexOf(token);assert.ok(start>=0,name);const end=compiled.indexOf('function ',start+token.length);return compiled.slice(start,end<0?compiled.indexOf('export{'):end);}
const validLocal=builtFunction('validArborEntry').match(/!([\w$]+)\([\w$]+\.run\)/)?.[1];
const exitLocal=builtFunction('arborLeaveEntry').match(/([\w$]+)\([\w$]+\.run,[\w$]+\)/)?.[1];
assert.ok(validLocal&&exitLocal&&validLocal!==exitLocal,'ordinary validator/exit bindings are independently identified');
const dependencies={[validLocal]:validCheckpoint,[exitLocal]:roomExitCheckpoint};
let importCount=0;
const body=compiled.replace(/import(?:\{([^}]+)\}from)?["']([^"']+)["'];?/g,(statement,names,module)=>{
 importCount++;
 if(!names){assert.match(module,/form-art-/,'only a known visual side effect is skipped');return '';}
 for(const term of names.split(',')){
  const [imported,local=imported]=term.trim().split(/\s+as\s+/);
  if(module.includes('arbor-journey-')){assert.equal(typeof rules[imported],'function',imported);dependencies[local]=rules[imported];}
  else{assert.match(module,/index-/);assert.equal(typeof dependencies[local],'function',`known ordinary API binding ${local}`);}
 }
 return '';
}).replace(exportMatch[0],`globalThis.__built={${Object.entries(publicNames).map(([name,local])=>`${JSON.stringify(name)}:${local}`).join(',')}};`);
assert.ok(importCount>=2);
const run=s=>({version:1,region:'garden',mode:'entry',cycle:s.round,stage:s.sector,hp:90,kills:s.kills,elapsed:s.time,rules:[],mutated:[],forms:{},inventory:{tonic:2},wardens:s.wardens,austins:s.bossWins});
const clone=value=>JSON.parse(JSON.stringify(value));
function load(crypto){
 const c=vm.createContext({...dependencies,crypto,Date:class extends Date{static now(){return 123456;}}});
 // ESM is always strict: a free temporary in a default parameter must throw,
 // rather than accidentally becoming a global as it would in a sloppy VM.
 vm.runInContext(`'use strict';${body}`,c,{filename:file});assert.equal(Object.hasOwn(c,'t'),false);return {c,api:c.__built};
}
let checks=0;
{
 let calls=0;const provider={randomUUID(){assert.equal(this,provider,'Crypto method keeps its required receiver');return `production-uuid-${++calls}`;}};
 const {c,api}=load(provider),s=rules.createArborJourney(),a=api.createArborEntry(s,run(s),'owner'),b=api.createArborEntry(s,run(s),'owner',{});
 assert.ok(a&&b);assert.equal(a.id,'production-uuid-1');assert.equal(b.id,'production-uuid-2');assert.equal(calls,2);assert.equal(Object.hasOwn(c,'t'),false);assert.ok(api.validArborEntry(a));assert.deepEqual(clone(a.world),rules.checkpointArborJourney(s));checks++;
 console.log('PASS minified default ID calls Crypto.randomUUID with receiver and has no free temporary');
}
for(const crypto of [undefined,null,{}, {randomUUID:null}]){
 const {api}=load(crypto),s=rules.createArborJourney(),entry=api.createArborEntry(s,run(s),'owner');assert.ok(entry);assert.equal(entry.id,'arbor-123456');assert.ok(api.validArborEntry(entry));
}
checks++;console.log('PASS minified codec supports all missing/unavailable Crypto fallbacks');
{
 const {api}=load({randomUUID(){throw Error('explicit IDs must bypass provider');}}),s=rules.createArborJourney(),v=api.createArborEntry(s,run(s),'owner',{id:'explicit-id',revision:2});assert.ok(v);assert.equal(v.id,'explicit-id');assert.equal(v.revision,2);checks++;
 console.log('PASS minified explicit IDs bypass default evaluation');
}
{
 const {api}=load({randomUUID:()=> 'built-store-id'}),s=rules.createArborJourney(),data=new Map(),storage={getItem:key=>data.get(key)??null,setItem:(key,value)=>data.set(key,value)},lease={ok:true,key:'seed-expansion-entry-v1:owner:arbor',active:()=>true};
 const store=api.createArborSaveStore(storage,'owner',{lease,now:()=>100}),first=store.write(api.createArborEntry(s,run(s),'owner'),{fresh:true});assert.equal(first.ok,true);assert.equal(first.value.revision,1);
 const leave=api.arborLeaveEntry(first.value,{hp:44,inventory:{tonic:1}});assert.equal(leave.run.hp,44);assert.equal(leave.run.inventory.tonic,1);assert.equal(store.write(leave).ok,true);
 const latest=store.read(),fake={...latest,world:{...latest.world,phase:'complete'}};assert.equal(api.validArborEntry(fake),false);assert.equal(store.write(fake).ok,false);assert.equal(store.finish(first.value),false);assert.equal(store.finish(latest),true);assert.equal(store.read(),null);checks++;
 console.log('PASS minified create/write/attrition/conflict/invalid-complete/finish executes actual codec');
}
console.log(`arbor-production-save: ${checks} minified runtime checks passed (${files[0]}; source validators injected, no browser/device claim)`);
