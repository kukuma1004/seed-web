import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {DUEL_CHARACTERS} from '../src/seed-duel-rules.js';
import {DUEL_BATCH07_AUDIO} from '../src/seed-duel-batch07.js';
// Shipping bytes bind these locally measured crops. Native review archives are
// deliberately not test prerequisites: clean checkouts must remain reproducible.
const meta=JSON.parse(readFileSync(new URL('./duel-motion-art-fixture.json',import.meta.url),'utf8')).characters;
const view=readFileSync(new URL('../src/seed-duel-view.js',import.meta.url),'utf8');
for(const id of ['fullbloom','rewind']){
 const b=readFileSync(new URL(`../public/assets/duel/${id}-motion-v1.webp`,import.meta.url));
 assert.equal(b.length,meta[id].bytes);assert.equal(createHash('sha256').update(b).digest('hex'),meta[id].sha256);
 assert.equal(b.toString('ascii',0,4),'RIFF');assert.equal(b.toString('ascii',8,12),'WEBP');assert.equal(b.toString('ascii',12,16),'VP8X');assert.ok(b[20]&16);
 assert.equal(1+b.readUIntLE(24,3),2048);assert.equal(1+b.readUIntLE(27,3),1024);assert.ok(b.length<500000);assert.equal(meta[id].poses.length,8);
 assert.ok(meta[id].poses.every(([x,y,w,h])=>x>20&&y>20&&x+w<492&&y+h===440));assert.equal(DUEL_CHARACTERS[id].comboId,id);assert.equal(DUEL_CHARACTERS[id].solo,true);
 assert.ok(view.includes(JSON.stringify(meta[id].poses)));assert.equal(meta[id].cellEdgeAlpha,0);assert.equal(new Set(meta[id].poses.map(p=>p.join(','))).size,8);
}
assert.ok(view.includes("['solo',`단독 진화"));assert.ok(view.includes("rosterFilter==='solo'?duelCharacterKind(id)==='solo'"));assert.ok(!view.includes("Boolean(DUEL_CHARACTERS[id].comboId)"));assert.ok(view.includes('...DUEL_BATCH07_AUDIO'));for(const voice of Object.values(DUEL_BATCH07_AUDIO)){assert.ok(['shot','reflect'].includes(voice[0]));assert.ok(voice[1].pitch>0);}
for(const kind of ['fullFork','fullBed','fullCore','fullPetal','rewindLeaf'])assert.ok(view.includes(`'${kind}'`));
assert.ok(view.includes('DUEL_BATCH07_KINDS.includes(h.kind)'));assert.ok(view.includes('h.skipR'));assert.ok(view.includes('q.pause>0'));assert.ok(view.includes("q.owner===0?"));
console.log('Bundle07 shipping alpha WebP/eight distinct crops/common foot anchors/audio/tell/VFX references passed. Native edge contamination remains visible after native cleanup attempts; visual/device approval is pending.');
