import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {BODY_SIZE,EVOLUTION_SIZE,SEED_BODY_ART,SEED_SOLO_BODY_ART,SOLO_BODY_TILES,dominantSoloForm,seedFrame} from '../src/seed-body.js';
import {actorArtRotation} from '../src/actor-art.js';
for(const yaw of [0,.63,-2.2]){
 assert.equal(seedFrame(yaw,yaw),0);
 assert.equal(seedFrame(yaw+Math.PI/2,yaw),1);
 assert.equal(seedFrame(yaw+Math.PI,yaw),2);
 assert.equal(seedFrame(yaw-Math.PI/2,yaw),3);
 assert.equal(seedFrame(yaw+2*Math.PI,yaw),0);
}
console.log('Seed atlas directions follow movement relative to the camera.');
assert.equal(SEED_BODY_ART,'seed-body-directions-v5.png');
assert(BODY_SIZE<1.26&&BODY_SIZE>=1.1,'The chibi seed should be smaller without becoming hard to read.');
console.log('The chibi seed uses the compact v5 art and a smaller presentation scale.');
assert.equal(SEED_SOLO_BODY_ART,'seed-solo-bodies-v1.png');
assert.deepEqual([...new Set(Object.values(SOLO_BODY_TILES))],[0,1,2,3,4,5,6,7,8]);
assert.equal(dominantSoloForm(new Map([['fullbloom',4],['blackhole',7]])),'blackhole');
assert.equal(dominantSoloForm(new Map([['winterbreath',5],['mirrormaze',5]])),'mirrormaze');
assert.equal(dominantSoloForm(new Map([['collapse',12]])),null);
assert(EVOLUTION_SIZE>=BODY_SIZE&&EVOLUTION_SIZE<1.3);
const soloPng=readFileSync(new URL('../public/assets/'+SEED_SOLO_BODY_ART,import.meta.url));
assert.equal(soloPng.toString('ascii',1,4),'PNG');
assert.equal(soloPng.readUInt32BE(16)*3,soloPng.readUInt32BE(20)*4,'Solo body atlas must remain exactly 4:3.');
assert.equal(soloPng[25],6,'Solo body atlas must keep RGBA transparency.');
console.log('Nine solo evolutions have unique body tiles and deterministic strongest-form presentation.');
for(const phase of ['normal','overtime','deadline',undefined,0,.7])for(const state of ['stalk','jabTell','jab','sweep','recover']){
 assert(Number.isFinite(actorArtRotation(state,2.4,phase)),`Invalid sprite rotation: ${phase}/${state}`);
}
assert.equal(actorArtRotation('stalk',2,.7),Math.sin(18+.7)*.025);
console.log('Austin named phases and mob gait phases produce finite sprite poses.');
