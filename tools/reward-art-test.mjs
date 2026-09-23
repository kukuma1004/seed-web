import assert from 'node:assert/strict';
import {RELICS} from '../src/relics.js';
import {ITEMS} from '../src/inventory.js';
import {relicArt,RELIC_ATLAS} from '../src/relic-art.js';
import {itemArt,ITEM_ATLAS} from '../src/item-art.js';
import {formArt,SOLO_ATLAS,FUSION_ATLAS,AWAKEN_ATLAS,FIRST_CANDIDATE_ATLAS,SECOND_ATLAS} from '../src/form-art.js';
import {lawArt,LAW_ATLAS} from '../src/law-art.js';
import {FORMS,CURATED_FORMS,GENERATED_FORMS,SOLO_FORMS,AWAKEN_FORMS,TWIN_FORMS,SECOND_FORMS} from '../src/forms.js';
import {COMBO_ART} from '../src/combo-art.js';
import fs from 'node:fs';

for(const id of Object.keys(RELICS)){
 const html=relicArt(id);
 assert.match(html,new RegExp(RELIC_ATLAS));
 assert.match(html,/relic-art/);
}
for(const id of Object.keys(ITEMS)){
 const html=itemArt(id);
 assert.match(html,new RegExp(ITEM_ATLAS));
 assert.match(html,new RegExp(`potion-icon ${id}`));
}
assert.equal(relicArt('missing'),'');
assert.equal(itemArt('missing'),'');
assert.equal(new Set(Object.keys(RELICS).map(relicArt)).size,4);
assert.equal(new Set(Object.keys(ITEMS).map(itemArt)).size,5);
for(const id of Object.keys(SOLO_FORMS))assert.match(formArt(id),new RegExp(SOLO_ATLAS));
for(const id of Object.keys(CURATED_FORMS))assert.match(formArt(id),new RegExp(`${FUSION_ATLAS}|${COMBO_ART.cores}|${FIRST_CANDIDATE_ATLAS}`));
for(const id of Object.keys(SECOND_FORMS))assert.match(formArt(id),new RegExp(SECOND_ATLAS));
for(const id of Object.keys(GENERATED_FORMS))assert.match(formArt(id),new RegExp(COMBO_ART.cores));
for(const id of Object.keys(AWAKEN_FORMS))assert.match(formArt(id),new RegExp(AWAKEN_FORMS[id].finalCandidate?'seed-final-identity-atlas-v1-':id==='pulsegravity'?'seed-pulsegravity-v1-ui.webp':AWAKEN_ATLAS));
assert.ok(fs.statSync(new URL('../public/assets/seed-pulsegravity-v1-ui.webp',import.meta.url)).size<120_000,'new final-branch art stays mobile-sized');
for(const id of Object.keys(TWIN_FORMS))assert.match(formArt(id),/twin-identity-art.*seed-final-identity-atlas-v1-/);
assert.equal(new Set(Object.keys(SOLO_FORMS).map(formArt)).size,Object.keys(SOLO_FORMS).length);
for(const id of ['reflect','split','pierce','orbit','burst','gravity','recall','frost','chain','portal'])assert.match(lawArt(id),new RegExp(LAW_ATLAS));
assert.equal(LAW_ATLAS,'seed-law-atlas-v4-ui.webp');
assert.equal(lawArt('missing'),'', 'unknown laws do not point at an invalid atlas tile');
assert.ok(fs.statSync(new URL(`../public/assets/${LAW_ATLAS}`,import.meta.url)).size<300_000,'law atlas stays mobile-sized');
assert.ok(fs.statSync(new URL(`../public/assets/${FIRST_CANDIDATE_ATLAS}`,import.meta.url)).size<300_000,'first candidate atlas stays mobile-sized');
assert.ok(fs.statSync(new URL(`../public/assets/${SECOND_ATLAS}`,import.meta.url)).size<350_000,'second fusion atlas stays mobile-sized');
console.log('Every reward, law and evolution uses its production atlas and solo choices have distinct tiles.');
