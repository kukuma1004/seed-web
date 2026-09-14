import assert from 'node:assert/strict';
import {RELICS} from '../src/relics.js';
import {ITEMS} from '../src/inventory.js';
import {relicArt,RELIC_ATLAS} from '../src/relic-art.js';
import {itemArt,ITEM_ATLAS} from '../src/item-art.js';

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
console.log('Every relic and item uses one distinct production atlas tile.');
