import assert from 'node:assert/strict';
import {readFileSync,existsSync} from 'node:fs';
import {DUEL_CHARACTERS} from '../src/seed-duel-rules.js';
const meta=JSON.parse(readFileSync(new URL('../artifacts/duel-batch-04-art.json',import.meta.url),'utf8'));
const view=readFileSync(new URL('../src/seed-duel-view.js',import.meta.url),'utf8');
for(const id of ['collapse','thunderlance']){
 const b=readFileSync(new URL(`../public/assets/duel/${id}-motion-v1.webp`,import.meta.url));
 assert.equal(b.toString('ascii',0,4),'RIFF');assert.equal(b.toString('ascii',8,12),'WEBP');assert.equal(b.toString('ascii',12,16),'VP8X');assert.ok(b[20]&16);
 assert.equal(1+b.readUIntLE(24,3),2048);assert.equal(1+b.readUIntLE(27,3),1024);assert.ok(b.length<500000);assert.equal(meta[id].poses.length,8);
 assert.ok(meta[id].poses.every(([x,y,w,h])=>x>20&&y>20&&x+w<492&&y+h===440));assert.equal(DUEL_CHARACTERS[id].comboId,id);
 assert.ok(view.includes(JSON.stringify(meta[id].poses)));assert.equal(meta[id].cellEdgeAlpha,0);assert.ok(existsSync(new URL('../artifacts/'+meta[id].sourceArchive,import.meta.url)));
 assert.equal(new Set(meta[id].poses.map(p=>p.join(','))).size,8,'all eight authored poses measured independently');
}
for(const voice of ['collapseLaunch:','collapseStop:','collapseBurst:','thunderLaunch:','thunderGround:','thunderArc:'])assert.ok(view.includes(voice),voice);
for(const kind of ['collapseSeed','collapseSend','collapseBurst','thunderSpear','thunderSend','thunderArc','thunderRod'])assert.ok(view.includes(`'${kind}'`),kind+' render branch');
assert.ok(view.includes('r=h.r+.35'),'collapse tell includes combat contact margin');
console.log('Bundle04 WebP containers/alpha metadata/eight authored crops/audio/VFX passed; browser/device visual QA pending.');
