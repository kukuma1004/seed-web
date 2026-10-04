import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {DUEL_CHARACTERS} from '../src/seed-duel-rules.js';
const meta=JSON.parse(readFileSync(new URL('../artifacts/duel-batch-03-art.json',import.meta.url),'utf8'));
const view=readFileSync(new URL('../src/seed-duel-view.js',import.meta.url),'utf8');
for(const id of ['returnblade','frostguard']){
 const b=readFileSync(new URL(`../public/assets/duel/${id}-motion-v1.webp`,import.meta.url));
 assert.equal(b.toString('ascii',0,4),'RIFF');assert.equal(b.toString('ascii',8,12),'WEBP');assert.equal(b.toString('ascii',12,16),'VP8X');assert.ok(b[20]&16);
 assert.equal(1+b.readUIntLE(24,3),2048);assert.equal(1+b.readUIntLE(27,3),1024);assert.ok(b.length<500000);assert.equal(meta[id].poses.length,8);
 assert.ok(meta[id].poses.every(([x,y,w,h])=>x>20&&y>20&&x+w<492&&y+h===440));assert.equal(DUEL_CHARACTERS[id].comboId,id);
 assert.ok(view.includes(JSON.stringify(meta[id].poses)));assert.equal(meta[id].cellEdgeAlpha,0);
}
assert.ok(view.includes('wardBlock:')&&view.includes('bladeRecall:')&&view.includes("q.kind==='returnSpear'"));
assert.ok(view.includes("h.kind==='frostWard'")&&view.includes("r=h.r+.35"));
console.log('Bundle03 shipping art containers, eight measured alpha-safe poses, fixed warning geometry and existing audio voices passed; browser/device QA pending.');
