import {DUEL_BATCH30} from '../src/seed-duel-batch30.js';
import {DUEL_BATCH29} from '../src/seed-duel-batch29.js';
import {DUEL_BATCH28} from '../src/seed-duel-batch28.js';
import {DUEL_BATCH27} from '../src/seed-duel-batch27.js';
import {DUEL_BATCH26} from '../src/seed-duel-batch26.js';
import {DUEL_BATCH25} from '../src/seed-duel-batch25.js';
import {DUEL_BATCH24} from '../src/seed-duel-batch24.js';
import {DUEL_BATCH23} from '../src/seed-duel-batch23.js';
import {DUEL_BATCH22} from '../src/seed-duel-batch22.js';
import {DUEL_BATCH21} from '../src/seed-duel-batch21.js';
import {DUEL_BATCH20} from '../src/seed-duel-batch20.js';
import {DUEL_BATCH19} from '../src/seed-duel-batch19.js';
import {DUEL_BATCH18} from '../src/seed-duel-batch18.js';
import {DUEL_BATCH17} from '../src/seed-duel-batch17.js';
import {DUEL_BATCH16} from '../src/seed-duel-batch16.js';
import {DUEL_BATCH15} from '../src/seed-duel-batch15.js';
import {DUEL_BATCH14} from '../src/seed-duel-batch14.js';
import {DUEL_BATCH13} from '../src/seed-duel-batch13.js';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import vm from 'node:vm';
import {DUEL_ORDER} from '../src/seed-duel-rules.js';
import {DUEL_BATCH08} from '../src/seed-duel-batch08.js';
import {DUEL_BATCH09} from '../src/seed-duel-batch09.js';
import {DUEL_BATCH10} from '../src/seed-duel-batch10.js';
import {DUEL_BATCH11} from '../src/seed-duel-batch11.js';
import {DUEL_BATCH12} from '../src/seed-duel-batch12.js';

const view=readFileSync(new URL('../src/seed-duel-view.js',import.meta.url),'utf8');
const fixture=JSON.parse(readFileSync(new URL('./duel-final-08-art-fixture.json',import.meta.url),'utf8'));
const motion=view.match(/const MOTION=.*?;/)[0];
const file=view.match(/const motionFile=.*?;/)[0];
const choose=view.match(/const motionFrame=.*?;\r?\nconst clamp=/)[0].replace(/\r?\nconst clamp=$/,'');
const context={DUEL_BATCH30,DUEL_BATCH29,DUEL_BATCH28,DUEL_BATCH27,DUEL_BATCH26,DUEL_BATCH25,DUEL_BATCH24,DUEL_BATCH23,DUEL_BATCH22,DUEL_BATCH21,DUEL_BATCH20,DUEL_BATCH19,DUEL_BATCH18,DUEL_BATCH17,DUEL_BATCH16,DUEL_BATCH15,DUEL_BATCH14,DUEL_BATCH13,DUEL_ORDER,DUEL_BATCH08,DUEL_BATCH09,DUEL_BATCH10,DUEL_BATCH11,DUEL_BATCH12};
vm.createContext(context);
vm.runInContext(`${motion}${file}${choose};this.motion=MOTION;this.file=motionFile;this.frame=motionFrame;`,context);
for(const meta of fixture){
 assert(context.motion.includes(meta.id),'a loaded candidate sheet must reach the actual motion renderer');
 assert.equal(context.file(meta.id),'duel/'+meta.id+'-motion-v2.webp');
 const bytes=readFileSync(new URL('../public/'+meta.path,import.meta.url));
 assert.equal(bytes.length,meta.bytes);assert.equal(createHash('sha256').update(bytes).digest('hex'),meta.sha256);
 assert.equal(bytes.toString('ascii',0,4),'RIFF');assert.equal(bytes.toString('ascii',8,12),'WEBP');
 assert.equal(bytes.toString('ascii',12,16),'VP8X');assert.ok(bytes[20]&16,'alpha must survive game asset conversion');
 assert.equal(1+bytes.readUIntLE(24,3),1774);assert.equal(1+bytes.readUIntLE(27,3),887);
 assert.ok(meta.bytes<450000);assert.equal(meta.poses.length,8);
 assert.equal(new Set(meta.poses.map(p=>p.rgbaSha256)).size,8,'all eight measured pose crops contain different pixels');
 assert.ok(meta.poses.every(p=>p.edgeAlpha128Count===0),'no opaque silhouette may bleed into an adjacent atlas cell');
 assert.equal(DUEL_BATCH08[meta.id].artReady,false,'measured assets alone cannot imply human/device approval');
}
for(const [pose,expected] of [
 [{state:'idle'},0],...Array.from({length:3},(_,step)=>[{state:'attack',t:.2,step},step+1]),
 [{state:'heavy',t:.2},4],[{state:'heavy',t:.05},5],[{state:'idle',blocking:true},6],[{state:'hit'},7]
])assert.equal(context.frame(pose),expected,'the shipped frame picker must expose all eight authored motions');
assert.equal(context.file('pierce'),'duel/pierce-motion-v1.webp','existing characters retain their exact asset path');
assert.equal(DUEL_ORDER.length,36);assert(!DUEL_ORDER.includes('bigcrunch'));
assert.ok(view.includes('FINAL08_FEET[f.char][frame]/443.5'),'measured foot anchors keep standing poses on the collision ring');
console.log('Final08 native-alpha16pose assets and actual frame renderer passed; all opaque cell edges empty, public36 unchanged. Human full-animation/mobile/balance approval remains separate.');
