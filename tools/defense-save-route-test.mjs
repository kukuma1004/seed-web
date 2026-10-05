import assert from 'node:assert/strict';
import {closedExpansionActs,openExpansionActs} from './expansion-gate-fixtures.mjs';
import {readFileSync} from 'node:fs';
import vm from 'node:vm';
import {EXPANSION_ACTS} from '../src/act-expansion.js';
import {createDefense,checkpointDefense,restoreDefense} from '../src/seed-defense-rules.js';
import {defensePreparationKey,readDefensePreparation,canWriteDefensePreparation} from '../src/defense-save-route.js';
const both=openExpansionActs;
const data=new Map(),storage={getItem:k=>data.get(k)??null,setItem:(k,v)=>data.set(k,v),removeItem:k=>data.delete(k)};
const owner='account-A',oldKey=defensePreparationKey(owner,3),inspectionKey=defensePreparationKey(owner,5,{acts:closedExpansionActs}),newKey=defensePreparationKey(owner,5,{acts:both});
assert.notEqual(newKey,inspectionKey);assert.notEqual(newKey,oldKey);
const experiment=checkpointDefense(createDefense(3,{actCount:5}));storage.setItem(inspectionKey,JSON.stringify(experiment));
const before=storage.getItem(inspectionKey);assert.equal(readDefensePreparation(storage,newKey,{owner,actCount:5}),null,'inspection bytes cannot become a public preparation');
const legacy=checkpointDefense(createDefense(7));storage.setItem(oldKey,JSON.stringify(legacy));const oldBytes=storage.getItem(oldKey);
const converted=readDefensePreparation(storage,newKey,{owner,actCount:5});assert(converted);assert.equal(converted.actCount,5);assert.equal(converted.runId,legacy.runId);assert.equal(converted.currency,legacy.currency);assert.equal(converted.coreHp,legacy.coreHp);assert.equal(storage.getItem(oldKey),oldBytes);assert.equal(storage.getItem(inspectionKey),before);assert.equal(storage.getItem(newKey),null,'read conversion is not a write');
assert.equal(readDefensePreparation(storage,defensePreparationKey('account-B',5,{acts:both}),{owner:'account-B',actCount:5}),null);
const accepted=checkpointDefense(converted);assert(accepted&&restoreDefense(accepted));storage.setItem(newKey,JSON.stringify(accepted));assert.equal(readDefensePreparation(storage,newKey,{owner,actCount:5}).runId,legacy.runId);assert(canWriteDefensePreparation(storage,newKey,{actCount:5}));
const source=readFileSync(new URL('../src/seed-defense-view.js',import.meta.url),'utf8'),start=source.indexOf('function save(){'),end=source.indexOf('function sound(',start);
const context=vm.createContext({storage,key:newKey,actCount:5,state:converted,isolated:()=>false,checkpointDefense,canWriteDefensePreparation,preparation:null,saveNote:''});vm.runInContext(source.slice(start,end),context);
for(const unknown of ['{broken',JSON.stringify({...accepted,version:999}),JSON.stringify(legacy)]){
 storage.setItem(newKey,unknown);assert.equal(readDefensePreparation(storage,newKey,{owner,actCount:5}),null);assert.equal(canWriteDefensePreparation(storage,newKey,{actCount:5}),false);context.save();context.clearSave();assert.equal(storage.getItem(newKey),unknown,'actual view cannot replace or clear unrecognized preparation bytes');assert.equal(storage.getItem(oldKey),oldBytes);assert.equal(storage.getItem(inspectionKey),before);
}
console.log('TD save routing: separate public/inspection keys, read-only legacy migration, same run/build/HP, UID separation and real view protection of unknown/cross-route bytes passed; explicit closed/open release fixtures verified.');
