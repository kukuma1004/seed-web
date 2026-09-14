import assert from 'node:assert/strict';
import {emptyRelics,validRelics,normalizeRelics,keepRelic,equipRelic,relicOffers,relicLawStats,relicFormScale,relicEffect} from '../src/relics.js';
import {FORMS} from '../src/forms.js';
import {lawStats} from '../src/progression.js';
import {validCheckpoint,writeCheckpoint,readCheckpoint,clearCheckpoint} from '../src/run-save.js';
const r=emptyRelics();assert.ok(keepRelic(r,'mirror'));
assert.ok(keepRelic(r,'crystal','store'));assert.ok(keepRelic(r,'coil','store'));assert.ok(keepRelic(r,'core','store'));
assert.deepEqual(r,{equipped:'mirror',stored:['crystal','coil','core']});
assert.ok(!keepRelic(r,'mirror'));assert.ok(!keepRelic(r,'invalid'));assert.equal(relicOffers(r).length,0);
assert.ok(equipRelic(r,'coil'));assert.equal(r.equipped,'coil');assert.deepEqual(r.stored,['crystal','mirror','core']);
const base=lawStats(new Map([['reflect',1],['split',1],['chain',1],['gravity',1]]));
const active=relicLawStats(base,r);assert.equal(active.chainTargets,base.chainTargets+1);assert.equal(active.splitCount,base.splitCount);assert.equal(active.reflectBounces,base.reflectBounces);
assert.equal(relicFormScale(r,['pierce','chain']),1.12);assert.equal(relicFormScale(r,['reflect','split']),1);
assert.equal(relicLawStats(lawStats(new Map()),r).chainTargets,0,'no free law from relic');
assert.equal(relicLawStats(lawStats(new Map([['chain',999]])),r).chainTargets,7,'a relic passes the law cap by exactly one step');
assert.ok(validRelics(undefined));assert.deepEqual(normalizeRelics(undefined),emptyRelics());
for(const bad of [null,[],{}, {equipped:'mirror',stored:['mirror']},{equipped:null,stored:['core','core']},{equipped:'no',stored:[]},{equipped:null,stored:['mirror','crystal','coil','core']}])assert.ok(!validRelics(bad));
const save={version:1,cycle:4,stage:4,mode:'austin',region:'garden',hp:100,rules:['reflect'],mutated:[],kills:0,elapsed:0,forms:{frostguard:2,prism:3,stormcrown:2},wardens:5,austins:0};
assert.ok(validCheckpoint(save),'legacy save still valid, including three forms');
const data=new Map(),storage={getItem:k=>data.get(k),setItem:(k,v)=>data.set(k,v),removeItem:k=>data.delete(k)};
assert.ok(writeCheckpoint(storage,{...save,relics:r}));assert.deepEqual(readCheckpoint(storage).relics,r);
assert.ok(!writeCheckpoint(storage,{...save,relics:{equipped:'coil',stored:['coil']}}));assert.deepEqual(readCheckpoint(storage).relics,r);
clearCheckpoint(storage);assert.equal(readCheckpoint(storage),null);
const copy=normalizeRelics(r);copy.stored.pop();assert.equal(r.stored.length,3,'save snapshots do not alias inventory');

// The effect line shows before → after for this build, and says plainly when a relic does nothing.
const fx=(id,laws,forms=new Map())=>relicEffect(id,lawStats(new Map(laws)),forms);
const coilNow=fx('coil',[['chain',1]]);assert.equal(coilNow.state,'active');assert.deepEqual(coilNow.lines,['연쇄 대상 2명 → 3명']);
assert.equal(fx('core',[['gravity',1]]).lines[0],'중력장 반경 2.2 → 2.8','fractional radius is shown to one decimal');
assert.equal(fx('core',[['gravity',3]]).lines[0],'중력장 반경 3.8 → 4.4 · 최대치 초과','the tag appears whenever the result passes the cap');
const noMirror=fx('mirror',[['chain',1]]);assert.equal(noMirror.state,'missing');assert.equal(noMirror.lines.length,0);assert.match(noMirror.note,/반사 법칙을 얻거나 반사가 재료인 진화/);
assert.match(fx('crystal',[]).note,/분열이 재료인/,'subject particle follows the final consonant');
const over=fx('coil',[['chain',8]]);assert.equal(over.state,'active');assert.equal(over.lines[0],'연쇄 대상 6명 → 7명 · 최대치 초과');
assert.equal(fx('core',[['gravity',9]]).lines[0],'중력장 반경 4.2 → 4.8 · 최대치 초과');
for(const [id,law] of [['mirror','reflect'],['crystal','split'],['coil','chain'],['core','gravity']])for(const lv of [1,2,3,5,8,20]){
 const base=lawStats(new Map([[law,lv]])),key={mirror:'reflectBounces',crystal:'splitCount',coil:'chainTargets',core:'gravityRadius'}[id];
 const up=relicLawStats(base,{equipped:id,stored:[]})[key];assert.ok(up>base[key],`${id} always raises ${key} at Lv.${lv}`);assert.ok(up-base[key]<=.6+1e-9||up-base[key]===1,'overflow is one step, never unbounded');
}
const chainForm=Object.keys(FORMS).find(f=>FORMS[f].requires.includes('chain'));
const viaForm=fx('coil',[],new Map([[chainForm,2]]));assert.equal(viaForm.state,'active','a form made from chain still benefits');assert.deepEqual(viaForm.lines,[`${FORMS[chainForm].name} 피해 +12%`]);
const both=fx('coil',[['chain',8]],new Map([[chainForm,1]]));assert.equal(both.state,'active');assert.equal(both.lines.length,2,'over-cap stat and form damage both listed');
console.log('Relics: one active + three stored, swaps, effect isolation, caps, legacy saves, death cleanup and build-aware effect lines passed.');
