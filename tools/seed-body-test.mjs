import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {AWAKEN_BODY_TILES,BODY_SIZE,EVOLUTION_SIZE,FUSION_BODY_TILES,SEED_AWAKEN_BODY_ART,SEED_BODY_ART,SEED_FUSION_BODY_ART,SEED_SOLO_BODY_ART,THEME_CREST_ART,SOLO_BODY_TILES,dominantSoloForm,rankedEvolutionForms,seedFrame,stableSeedFrame} from '../src/seed-body.js';
import {ACTOR_ART_GEOMETRIES,ACTOR_MOTION_GEOMETRIES,actorArtRotation,actorFrameGeometry,actorArtFile} from '../src/actor-art.js';
for(const yaw of [0,.63,-2.2]){
 assert.equal(seedFrame(yaw,yaw),0);
 assert.equal(seedFrame(yaw+Math.PI/2,yaw),1);
 assert.equal(seedFrame(yaw+Math.PI,yaw),2);
 assert.equal(seedFrame(yaw-Math.PI/2,yaw),3);
 assert.equal(seedFrame(yaw+2*Math.PI,yaw),0);
}
assert.equal(stableSeedFrame(Math.PI/4+.05,0,0),0,'Small joystick noise at a diagonal must not flip the body frame');
assert.equal(stableSeedFrame(Math.PI/4+.2,0,0),1,'A deliberate turn must still change the body frame');
console.log('Seed atlas directions follow movement relative to the camera.');
assert.equal(SEED_BODY_ART,'cute/seed-body-v1.webp');
assert(BODY_SIZE<1.26&&BODY_SIZE>=1.1,'The chibi seed should be smaller without becoming hard to read.');
console.log('The chibi seed uses the normalised cute locomotion art and a compact presentation scale.');
assert.equal(SEED_SOLO_BODY_ART,'cute/seed-solo-v1.webp');
assert.deepEqual([...new Set(Object.values(SOLO_BODY_TILES))],[0,1,2,3,4,5,6,7,8]);
assert.equal(dominantSoloForm(new Map([['fullbloom',4],['blackhole',7]])),'blackhole');
assert.equal(dominantSoloForm(new Map([['winterbreath',5],['mirrormaze',5]])),'winterbreath');
assert.equal(dominantSoloForm(new Map([['collapse',12]])),null);
assert.equal(SEED_FUSION_BODY_ART,'cute/seed-fusion-v1.webp');
assert.equal(SEED_AWAKEN_BODY_ART,'cute/seed-awaken-v1.webp');
assert.equal(Object.keys(AWAKEN_BODY_TILES).length,10);
assert.deepEqual(rankedEvolutionForms(new Map([['bigcrunch',9]])),['bigcrunch'],'Awakened fusions use their dedicated body.');
assert.deepEqual(rankedEvolutionForms(new Map([['gravityspear',8]])),['glassspear','blackhole'],'Twin awakenings expose both visual halves.');
assert.deepEqual([...new Set(Object.values(FUSION_BODY_TILES))],[0,1,2,3,4,5,6,7,8,9]);
assert.deepEqual(rankedEvolutionForms(new Map([['collapse',6],['winterbreath',7],['prism',7]])),['winterbreath','prism']);
assert.deepEqual(rankedEvolutionForms(new Map([['collapse',7],['winterbreath',7]])),['collapse','winterbreath'],'Equal levels keep acquisition order.');
assert(EVOLUTION_SIZE>=BODY_SIZE&&EVOLUTION_SIZE<1.3);
const soloPng=readFileSync(new URL('../public/assets/'+SEED_SOLO_BODY_ART,import.meta.url));
assert.equal(soloPng.toString('ascii',0,4),'RIFF');assert.equal(soloPng.toString('ascii',8,12),'WEBP');
assert.ok(soloPng.length<500_000,'Solo body atlas must stay within the mobile transfer budget.');
const fusionPng=readFileSync(new URL('../public/assets/'+SEED_FUSION_BODY_ART,import.meta.url));
assert.equal(fusionPng.toString('ascii',0,4),'RIFF');assert.equal(fusionPng.toString('ascii',8,12),'WEBP');
assert.ok(fusionPng.length<500_000,'Compact fusion sprite atlas stays within the mobile budget');
const awakenPng=readFileSync(new URL('../public/assets/'+SEED_AWAKEN_BODY_ART,import.meta.url));
assert.equal(awakenPng.toString('ascii',0,4),'RIFF');assert.equal(awakenPng.toString('ascii',8,12),'WEBP');
assert.ok(awakenPng.length<500_000,'Awakened body atlas must stay within the mobile transfer budget.');
for(const file of [SEED_BODY_ART,SEED_SOLO_BODY_ART,SEED_FUSION_BODY_ART,SEED_AWAKEN_BODY_ART]){
 const data=readFileSync(new URL('../public/assets/'+file,import.meta.url));
 assert.equal(data.toString('ascii',12,16),'VP8X');
 assert.ok(data[20]&16,'Sprite WebP must retain transparency');
 assert.deepEqual([data.readUIntLE(24,3)+1,data.readUIntLE(27,3)+1],file===SEED_BODY_ART?[512,512]:[1024,768],'Tile layout must match the runtime UV grid');
}
const themeCrests=readFileSync(new URL('../public/assets/'+THEME_CREST_ART,import.meta.url));
assert.equal(themeCrests.toString('ascii',0,4),'RIFF');assert.equal(themeCrests.toString('ascii',8,12),'WEBP');assert.ok(themeCrests.length<300_000);
console.log('Twenty-nine base and awakened evolutions have unique body tiles; twins expose both visual halves.');
for(const phase of ['normal','overtime','deadline',undefined,0,.7])for(const state of ['stalk','jabTell','jab','sweep','recover']){
 assert(Number.isFinite(actorArtRotation(state,2.4,phase)),`Invalid sprite rotation: ${phase}/${state}`);
}
assert.equal(actorArtRotation('stalk',2,.7),Math.sin(18+.7)*.025);
console.log('Austin named phases and mob gait phases produce finite sprite poses.');
assert.equal(new Set(Object.values(ACTOR_ART_GEOMETRIES)).size,5);
assert.equal(new Set(ACTOR_MOTION_GEOMETRIES).size,8);const motionGrid={columns:4,rows:2};
for(let i=0;i<8;i++){
 const geometry=actorFrameGeometry(i,motionGrid),uv=geometry.getAttribute('uv'),column=i%4,row=1-Math.floor(i/4);
 assert.equal(geometry,ACTOR_MOTION_GEOMETRIES[i]);assert.equal(actorFrameGeometry(i+8,motionGrid),geometry);
 for(let n=0;n<uv.count;n++){assert(uv.getX(n)>=column/4&&uv.getX(n)<=(column+1)/4);assert(uv.getY(n)>=row/2&&uv.getY(n)<=(row+1)/2);}
}
for(let frame=0;frame<4;frame++)assert.equal(actorFrameGeometry(frame+4),actorFrameGeometry(frame));
assert.equal(actorArtFile('enemy-act3-flight-atlas-v2.webp',{reducedTextures:true}),'cute/enemy-act3-flight-atlas-v2.webp');
assert.equal(actorArtFile('boss-act3-johan-atlas-v2.webp',{reducedTextures:true}),'mobile/boss-act3-johan-atlas-v2.webp');
console.log('Directional actor art reuses one atlas with four shared UV planes.');
