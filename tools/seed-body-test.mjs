import assert from 'node:assert/strict';
import {BODY_SIZE,SEED_BODY_ART,seedFrame} from '../src/seed-body.js';
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
for(const phase of ['normal','overtime','deadline',undefined,0,.7])for(const state of ['stalk','jabTell','jab','sweep','recover']){
 assert(Number.isFinite(actorArtRotation(state,2.4,phase)),`Invalid sprite rotation: ${phase}/${state}`);
}
assert.equal(actorArtRotation('stalk',2,.7),Math.sin(18+.7)*.025);
console.log('Austin named phases and mob gait phases produce finite sprite poses.');
