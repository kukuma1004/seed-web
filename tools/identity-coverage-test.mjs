import assert from 'node:assert/strict';
import {LAWS} from '../src/laws.js';
import {CURATED_FORMS,SOLO_FORMS,AWAKEN_FORMS,TWIN_FORMS} from '../src/forms.js';
import {SIGNATURES,ultimateArchetype,ULTIMATE_ARCHETYPES} from '../src/actives.js';
import {AUDIO_EVENTS,ultimateAudioEvent} from '../src/audio.js';
import {buildComboProjectileGeometry,projectileAudioEvent,projectileRecipe} from '../src/combo-projectile.js';
import {finalProjectileStyle} from '../src/final-identity-art.js';

// One lightweight contract for all 162 planned identities, including held
// entries. Rendering one geometry at a time mirrors the equipped-only runtime.
const base=Object.keys(LAWS).map(id=>({id,requires:[id]}));
const evolutions=[...Object.values(SOLO_FORMS),...Object.values(CURATED_FORMS),...Object.values(AWAKEN_FORMS),...Object.values(TWIN_FORMS)];
const all=[...base,...evolutions];
assert.deepEqual([base.length,Object.keys(SOLO_FORMS).length,Object.keys(CURATED_FORMS).length,Object.keys(AWAKEN_FORMS).length,Object.keys(TWIN_FORMS).length],[9,9,36,72,36]);
assert.equal(new Set(all.map(form=>form.id)).size,162);
let maxVertices=0,maxTriangles=0;
for(const form of all){
 const recipe=projectileRecipe(form),geometry=buildComboProjectileGeometry(recipe);
 const vertices=geometry.getAttribute('position').count,triangles=(geometry.index?.count??vertices)/3;
 maxVertices=Math.max(maxVertices,vertices);maxTriangles=Math.max(maxTriangles,triangles);
 assert.ok(vertices<=696&&triangles<=232,`${form.id}: mobile projectile budget ${vertices}/${triangles}`);
 assert.ok(AUDIO_EVENTS[projectileAudioEvent(form)],`${form.id}: missing shot audio`);
 if(finalProjectileStyle(form.id)){
  const authored=finalProjectileStyle(form.id);
  assert.equal(recipe.core,authored.core,`${form.id}: card/combat core drift`);
  assert.equal(recipe.audio,authored.audio,`${form.id}: card/combat sound drift`);
 }
 if(!LAWS[form.id]){
  assert.ok(SIGNATURES[form.id]?.name,`${form.id}: missing signature`);
  const family=ultimateArchetype([form.id]).id;
  assert.ok(ULTIMATE_ARCHETYPES[family],`${form.id}: missing ultimate VFX family`);
  assert.ok(AUDIO_EVENTS[ultimateAudioEvent(family)],`${form.id}: missing ultimate audio`);
 }
 geometry.dispose();
}
console.log(`Identity coverage: 162 recipes, 153 signature/ultimate presentations, max ${maxVertices} vertices/${maxTriangles} triangles`);
