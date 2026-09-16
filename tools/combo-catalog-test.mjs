import assert from 'node:assert/strict';
import fs from 'node:fs';
import {COMBO_COUNTS,COMBO_LAWS,FIRST_FUSIONS,SECOND_FUSIONS,secondFusionOf} from '../src/combo-catalog.js';
import {COMBO_ART,comboArt,comboProjectileArt} from '../src/combo-art.js';

assert.deepEqual(COMBO_COUNTS,{laws:10,first:45,second:990});
assert.equal(new Set(FIRST_FUSIONS.map(v=>v.id)).size,45);
assert.equal(new Set(FIRST_FUSIONS.map(v=>v.name)).size,45);
assert.equal(new Set(SECOND_FUSIONS.map(v=>v.id)).size,990);
assert.equal(new Set(SECOND_FUSIONS.map(v=>v.name)).size,990);
assert.equal(SECOND_FUSIONS.filter(v=>v.family==='resonance').length,360);
assert.equal(SECOND_FUSIONS.filter(v=>v.family==='convergence').length,630);
for(const law of COMBO_LAWS)assert.equal(FIRST_FUSIONS.filter(v=>v.laws.includes(law.id)).length,9);
for(const fusion of FIRST_FUSIONS)assert.equal(SECOND_FUSIONS.filter(v=>v.parts.includes(fusion.id)).length,44);
for(const combo of SECOND_FUSIONS){
 assert.notEqual(combo.parts[0],combo.parts[1]);
 assert.ok(combo.visual.coreTile>=0&&combo.visual.coreTile<12);
 assert.ok(combo.visual.shellTile>=0&&combo.visual.shellTile<12);
 assert.ok(combo.visual.projectileTile>=0&&combo.visual.projectileTile<12);
 assert.ok(combo.budget.damage>=1&&combo.budget.damage<=1.08);
}
assert.equal(secondFusionOf(FIRST_FUSIONS[0].id,FIRST_FUSIONS[1].id),SECOND_FUSIONS[0]);
assert.equal(secondFusionOf(FIRST_FUSIONS[0].id,FIRST_FUSIONS[0].id),null);
for(const file of Object.values(COMBO_ART)){
 const path=new URL(`../public/assets/${file}`,import.meta.url);
 assert.ok(fs.statSync(path).size<500_000,`${file} stays below the mobile atlas budget`);
}
assert.match(comboArt(SECOND_FUSIONS[0]),/combo-core/);
assert.match(comboProjectileArt(SECOND_FUSIONS[0]),/combo-projectiles-v1\.webp/);
console.log('combo catalogue: 10 laws, 45 first fusions, 990 second fusions');

