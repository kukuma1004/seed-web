import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {DUEL_ORDER,DUEL_CHARACTERS} from '../src/seed-duel-rules.js';
// Inspect the shipping WebP container, not the generated intermediate filenames.
for(const id of ['gravitymirror','chainburst']){
 const b=readFileSync(new URL(`../public/assets/duel/${id}-motion-v1.webp`,import.meta.url));
 assert.equal(b.toString('ascii',0,4),'RIFF');assert.equal(b.toString('ascii',8,12),'WEBP');assert.ok(b.length<500000,'one sheet under500kB');
 assert.equal(b.toString('ascii',12,16),'VP8X');assert.ok(b[20]&16,'true alpha retained');
 assert.equal(1+b.readUIntLE(24,3),2048);assert.equal(1+b.readUIntLE(27,3),1024);
 assert.ok(DUEL_ORDER.includes(id));assert.equal(DUEL_CHARACTERS[id].comboId,id);
}
const view=readFileSync(new URL('../src/seed-duel-view.js',import.meta.url),'utf8');
for(const id of ['gravitymirror','chainburst'])assert.ok(view.includes(`${id}:[[`)&&view.includes('FUSION_POSES[f.char][frame]'));
assert.ok(view.includes("mirrorLaunch:['shotGravity'")&&view.includes("emberRelay:['chain'"));
console.log('Duel fusion02 art: two shipping eight-pose2048x1024 alpha WebP sheets under500kB, measured source rectangles and existing audio voices linked. Live/device visual QA remains separate.');
