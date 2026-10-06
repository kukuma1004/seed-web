import assert from 'node:assert/strict';
import {LAWS} from '../src/laws.js';
import {DISCOVERY_FORMS} from '../src/forms.js';
import {EXPEDITION_SPECIES,EXPEDITION_TAXONOMY,XP_THRESHOLDS,expeditionStats} from '../src/expedition/species.js';
const canonical=new Set([...Object.keys(LAWS),...Object.keys(DISCOVERY_FORMS)]);
assert.deepEqual(new Set(Object.keys(EXPEDITION_SPECIES)),canonical);
assert.deepEqual(EXPEDITION_TAXONOMY,{base:9,solo:9,fusion:36,final:72,twin:36});
assert.equal(Object.keys(EXPEDITION_SPECIES).length,162);
assert.deepEqual(XP_THRESHOLDS,[0,20,50,95,160,250,360,500,680,900]);
for(const s of Object.values(EXPEDITION_SPECIES)){
 assert(s.role&&s.trigger&&s.weakness&&s.behavior,s.id);
 assert(s.laws.every(l=>Object.hasOwn(LAWS,l)),s.id);
 assert(s.parents.every(p=>canonical.has(p)),s.id);
 assert.equal(s.name,(LAWS[s.id]||DISCOVERY_FORMS[s.id]).name);
 assert.equal(s.duelCharacterId,null,'No name-inferred duel identity');
 if(s.kind==='twin'){assert.equal(s.representation,'pair');assert.equal(expeditionStats(s.id),null);assert.equal(s.parents.length,2);assert(s.parents.every(p=>EXPEDITION_SPECIES[p].kind==='solo'));}
 else {assert(expeditionStats(s.id,10).hp>expeditionStats(s.id,1).hp);assert(s.actionPattern.skill1.length>0);}
 if(s.kind==='final'){const f=DISCOVERY_FORMS[s.id];assert.deepEqual(s.parents,[f.base,f.addedSolo]);assert.equal(s.dominantLaw,DISCOVERY_FORMS[f.addedSolo].requires[0]);}
 for(const operations of Object.values(s.actionPattern))for(const op of operations){assert(Number.isFinite(op.ratio)&&op.ratio>=0&&op.ratio<=3,s.id);assert(['damage','chill','vulnerable','conductive','protection','pull','delay','return','counter','split'].includes(op.type),s.id);}
}
// These paired attacks differ in actual space/time/control mechanics, not color.
const skill=id=>JSON.stringify(EXPEDITION_SPECIES[id].actionPattern.skill1);
assert.notEqual(skill('collapse'),skill('tidepull'));
assert.notEqual(skill('icicle'),skill('rimeback'));
assert.notEqual(skill('stormanchor'),skill('thunderlance'));
assert.notEqual(skill('final-comethalo-burst'),skill('final-comethalo-orbit'));
console.log('PASS canonical 162 IDs/recipes/taxonomy; twins remain pairs; candidate turn adapters and branch space/time contracts. Not 162 balance/art approval.');
