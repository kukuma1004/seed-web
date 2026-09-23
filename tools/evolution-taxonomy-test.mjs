import assert from 'node:assert/strict';
import fs from 'node:fs';
import {LAWS} from '../src/laws.js';
import {CURATED_FORMS,FORMS,SOLO_FORMS,AWAKEN_FORMS,TWIN_FORMS,SECOND_FORMS,ALL_FORMS,DISCOVERY_FORMS} from '../src/forms.js';
import {awakenOptions} from '../src/progression.js';

const matrix=JSON.parse(fs.readFileSync(new URL('../docs/COMBO_162_FINAL_BRANCH_MATRIX.json',import.meta.url),'utf8'));
const branches=matrix.pairs.flatMap(pair=>pair.branches);
assert.deepEqual([Object.keys(LAWS).length,Object.keys(SOLO_FORMS).length,Object.keys(CURATED_FORMS).length,branches.length,Object.keys(TWIN_FORMS).length],[9,9,36,72,36]);
assert.equal(9+9+36+72+36,162);
assert.equal(matrix.pairs.length,36);
assert.equal(new Set(matrix.pairs.map(pair=>pair.fusion)).size,36);
assert.equal(new Set(branches.map(branch=>branch.id)).size,72);
assert.equal(new Set(branches.map(branch=>branch.designId)).size,72);
assert.equal(new Set(Object.values(TWIN_FORMS).map(t=>t.parts.slice().sort().join('+'))).size,36);

for(const pair of matrix.pairs){
 assert.deepEqual(pair.branches.map(b=>b.addedLaw).sort(),pair.laws.slice().sort(),`${pair.fusion}: two lead laws`);
 for(const branch of pair.branches){
  assert.equal(branch.fusion,pair.fusion);
  assert.equal(SOLO_FORMS[branch.addedSolo]?.requires[0],branch.addedLaw);
  if(branch.status==='implemented_existing'){
   const playable=AWAKEN_FORMS[branch.id];assert.ok(playable);
   assert.equal(playable.base,pair.fusion);assert.equal(playable.addedSolo,branch.addedSolo);
   assert.deepEqual(awakenOptions(new Map([[pair.fusion,5],[branch.addedSolo,5]])),[{id:branch.id,from:[pair.fusion,branch.addedSolo]}]);
  }else{
   assert.equal(branch.status,'design_only');assert.ok(!ALL_FORMS[branch.id]);
  }
 }
}
assert.equal(branches.filter(b=>b.status==='implemented_existing').length,Object.keys(AWAKEN_FORMS).length);
assert.equal(Object.keys(FORMS).length,30,'six authored fusions remain held for visual QA');
assert.ok(Object.values(SECOND_FORMS).every(f=>ALL_FORMS[f.id]&&!DISCOVERY_FORMS[f.id]),'old research IDs survive while the player book hides them');
assert.equal(Object.keys(DISCOVERY_FORMS).length,30+9+11+36);
console.log('162-recipe taxonomy: 9 laws, 9 solos, 36 fusions, 72 unique final branches, 36 independent twins; held branches and legacy records stay separate.');
