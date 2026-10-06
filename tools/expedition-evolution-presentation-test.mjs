import assert from 'node:assert/strict';
import {EXPEDITION_SPECIES,LAW_DNA} from '../src/expedition/species.js';
import {expeditionEvolutionOptions} from '../src/expedition/evolution-presentation.js';
import {createExpeditionController} from '../src/expedition/controller.js';
import {expeditionSessionKey} from '../src/expedition/session.js';
import {grantInstanceXP,evolveInstance} from '../src/expedition/roster.js';

let checked=0;
for(const from of Object.values(EXPEDITION_SPECIES).filter(s=>['base','fusion'].includes(s.kind))){
 const owner='evolution-ui-review',key=expeditionSessionKey(owner,'review'),map=new Map(),storage={getItem:k=>map.get(k)??null,setItem:(k,v)=>map.set(k,v)};let n=0;
 let c=createExpeditionController({storage,owner,idFactory:()=>`evolution-${++n}`});c.close();
 const home=JSON.parse(map.get(key)),base=from.kind==='base'?from.id:from.parents[0],i=Object.values(home.roster.instances).find(i=>i.speciesId===base);
 assert(i);assert(grantInstanceXP(home.roster,i.instanceId,500,'synthetic-level-eight'));
 if(from.kind==='fusion')assert(evolveInstance(home.roster,i.instanceId,from.id,{receiptId:'synthetic-parent',home:true,validateEvolution:()=>true}));
 const options=expeditionEvolutionOptions(home.roster.instances[i.instanceId],home.meta);
 assert.equal(options.length,from.kind==='base'?9:2);
 const unchanged=JSON.stringify(home);assert(options.every(o=>!o.ready));assert.equal(JSON.stringify(home),unchanged);
 for(const option of options){
  const s=JSON.parse(unchanged);s.meta.cores[option.law]=option.cost;
  if(option.species.kind==='final'){
   // A different individual's condition must never enable this seed's awakening.
   s.meta.awakenMaterials=1;s.meta.highRisk=[`other-seed:${option.law}`];
   assert(!expeditionEvolutionOptions(s.roster.instances[i.instanceId],s.meta).find(o=>o.species.id===option.species.id).ready);
   s.meta.highRisk=[`${i.instanceId}:${option.law}`];
  }
  const ready=expeditionEvolutionOptions(s.roster.instances[i.instanceId],s.meta).find(o=>o.species.id===option.species.id);assert(ready.ready);
  map.set(key,JSON.stringify(s));c=createExpeditionController({storage,owner,idFactory:()=>`evolution-${++n}`});
  const result=c.dispatch({type:'evolve',instanceId:i.instanceId,to:option.species.id});assert(result.ok,result.reason);
  assert.equal(c.state().meta.cores[option.law],0);assert.equal(c.state().roster.instances[i.instanceId].speciesId,option.species.id);
  const raw=map.get(key);assert(!c.dispatch({type:'evolve',instanceId:i.instanceId,to:option.species.id}).ok);assert.equal(map.get(key),raw);
  checked++;c.close();
 }
}
assert.equal(checked,153);
for(const species of Object.values(EXPEDITION_SPECIES)){
 const i={instanceId:'locked',speciesId:species.id,status:'alive',hp:10,level:4},meta={cores:Object.fromEntries(Object.keys(LAW_DNA).map(l=>[l,20])),awakenMaterials:20,highRisk:[]};
 assert.deepEqual(expeditionEvolutionOptions(i,meta),[]);i.level=8;i.status='dead';assert.deepEqual(expeditionEvolutionOptions(i,meta),[]);
}
assert.deepEqual(expeditionEvolutionOptions(null),[]);
console.log(`PASS ${checked} canonical evolution choices agree with real controller consumption, immutable conditions, individual risk, repeat rejection; synthetic local storage only.`);
