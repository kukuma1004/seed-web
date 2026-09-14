import assert from 'node:assert/strict';
import {LAWS} from '../src/laws.js';
import {FORMS,isFormEligible,eligibleForms} from '../src/forms.js';
import {DISCOVERIES_KEY,normalizeDiscoveries,readDiscoveries,recordDiscovery,growthGuide,rerollUnlocked,guideOffer} from '../src/discoveries.js';

for(const form of Object.values(FORMS)){
 assert.ok(isFormEligible(form.id,form.requires));
 assert.ok(isFormEligible(form.id,new Set(form.requires)));
 assert.equal(isFormEligible(form.id,form.requires.slice(1)),false);
 assert.ok(form.requires.every(id=>Object.hasOwn(LAWS,id)));
 assert.ok(form.name&&form.strength&&form.weakness);
}
assert.equal(isFormEligible('toString',Object.keys(LAWS)),false);
assert.equal(isFormEligible('collapse',null),false);
assert.deepEqual(eligibleForms(['gravity','burst','recall','pierce']).map(x=>x.id),['collapse','returnblade']);
assert.equal(eligibleForms(Object.keys(LAWS)).length,3);

const empty={version:1,forms:[],bosses:[]};
const values=new Map();const storage={getItem:key=>values.get(key)??null,setItem:(key,value)=>values.set(key,value)};
assert.deepEqual(readDiscoveries(storage),empty);
for(const corrupt of ['{bad','null','[]','{"version":2,"forms":["collapse"]}']){
 values.set(DISCOVERIES_KEY,corrupt);assert.deepEqual(readDiscoveries(storage),empty);
}
assert.deepEqual(normalizeDiscoveries({version:1,forms:['collapse','collapse','__proto__',null,'frostguard'],bosses:['warden','invalid','warden']}),{version:1,forms:['collapse','frostguard'],bosses:['warden']});
assert.deepEqual(readDiscoveries({getItem(){throw Error('blocked');}}),empty);
assert.equal(growthGuide(empty),false);assert.equal(rerollUnlocked(empty),false);
let result=recordDiscovery(storage,empty,'forms','collapse');
assert.ok(result.saved&&result.newlyDiscovered);
assert.deepEqual(empty,{version:1,forms:[],bosses:[]},'Discovery does not mutate its input profile');
assert.deepEqual(readDiscoveries(storage),result.profile);
assert.ok(growthGuide(result.profile));assert.equal(rerollUnlocked(result.profile),false);
const duplicate=recordDiscovery(storage,result.profile,'forms','collapse');
assert.equal(duplicate.newlyDiscovered,false);assert.equal(duplicate.profile.forms.length,1);
for(const [kind,id] of [['forms','unknown'],['form','collapse'],['bosses','collapse'],['__proto__','warden']]){
 const invalid=recordDiscovery(storage,result.profile,kind,id);
 assert.equal(invalid.saved,false);assert.equal(invalid.newlyDiscovered,false);
 assert.deepEqual(invalid.profile,result.profile);
}
const failed=recordDiscovery({setItem(){throw Error('quota');}},result.profile,'forms','frostguard');
assert.equal(failed.saved,false);assert.ok(failed.newlyDiscovered);
assert.deepEqual(failed.profile.forms,['collapse','frostguard']);
result=recordDiscovery(storage,failed.profile,'forms','returnblade');
assert.ok(rerollUnlocked(result.profile));
result=recordDiscovery(storage,result.profile,'bosses','warden');
assert.deepEqual(result.profile.bosses,['warden']);
assert.equal(recordDiscovery(storage,result.profile,'bosses','warden').newlyDiscovered,false);
// Run-save replacement/death uses a separate key and cannot erase discovery.
values.set('seed-run-checkpoint-v1','some run');values.delete('seed-run-checkpoint-v1');
assert.deepEqual(readDiscoveries(storage),result.profile);

const discovered={version:1,forms:['collapse'],bosses:[]};
const offer=['reflect','chain','frost'];
assert.deepEqual(guideOffer(offer,[],'collapse',discovered),['reflect','chain','gravity']);
assert.deepEqual(offer,['reflect','chain','frost'],'Guidance does not mutate its input offer');
assert.deepEqual(guideOffer(offer,['gravity'],'collapse',discovered),['reflect','chain','burst']);
assert.deepEqual(guideOffer(offer,['gravity','burst'],'collapse',discovered),offer);
assert.deepEqual(guideOffer(offer,['gravity'],'collapse',empty),offer,'Undiscovered forms do not guide a run');
assert.deepEqual(guideOffer(offer,['gravity'],'returnblade',discovered),offer);
assert.deepEqual(guideOffer(offer,['gravity','orbit','frost','chain','reflect'],'collapse',discovered),offer,'Full slots never force a replacement');
assert.deepEqual(guideOffer(['burst','chain','frost'],['gravity'],'collapse',discovered),['burst','chain','frost']);
assert.deepEqual(guideOffer(['invalid','reflect','reflect'],new Set(['gravity']),'collapse',discovered),['reflect','burst']);
assert.deepEqual(guideOffer(null,null,'collapse',discovered),['gravity']);
// All legal loadouts remain bounded, unique, and preserve a missing ingredient
// whenever a discovered target has space for one.
const ids=Object.keys(LAWS);let checked=0;
for(let mask=0;mask<1<<ids.length;mask++){
 const held=ids.filter((_,i)=>mask&(1<<i));if(held.length>5)continue;
 for(const form of Object.values(FORMS)){
  const output=guideOffer(offer,held,form.id,result.profile);
  assert.ok(output.length<=3&&new Set(output).size===output.length);
  assert.ok(output.every(id=>Object.hasOwn(LAWS,id)));
  const missing=form.requires.find(id=>!held.includes(id));
  if(missing&&held.length<5)assert.ok(output.includes(missing));
  checked++;
 }
}
console.log(`Form eligibility, durable discoveries, failure recovery, unlocks and ${checked} guided loadouts passed.`);
