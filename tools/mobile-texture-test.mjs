import assert from 'node:assert/strict';
import {existsSync,statSync,readFileSync} from 'node:fs';
import {actorArtFile,CUTE_ACTOR_ART} from '../src/actor-art.js';

for(const [original,file] of Object.entries(CUTE_ACTOR_ART)){
 const path=new URL(`../public/assets/${file}`,import.meta.url);
 assert.ok(existsSync(path),file);assert.ok(statSync(path).size>1000,file);
 const data=readFileSync(path),size=file.includes('turret')?256:512;
 assert.equal(data.toString('ascii',12,16),'VP8X');assert.ok(data[20]&16,'Actor alpha must survive packing');
 assert.deepEqual([data.readUIntLE(24,3)+1,data.readUIntLE(27,3)+1],[size,size],'Actor UV layout and bounded resolution');
 assert.ok(data.length<150_000,'One compact atlas per common role');
 assert.equal(actorArtFile(original,{reducedTextures:false}),file);
 assert.equal(actorArtFile(original,{reducedTextures:true}),file,'common art is already phone-sized');
 assert.equal(actorArtFile(file,{reducedTextures:true}),file,'resolved URLs remain stable');
}
assert.equal(actorArtFile('mobile/enemy-hound-v4.webp'),CUTE_ACTOR_ART['enemy-hound-v4.png']);
for(const file of ['boss-austin-v1.png','boss-always-beginner-v1.webp','boss-act3-johan-atlas-v2.webp','warden-memory-v4.png']){
 const reduced=actorArtFile(file,{reducedTextures:true}),path=new URL(`../public/assets/${reduced}`,import.meta.url);
 assert.notEqual(reduced,file);assert.ok(existsSync(path));assert.ok(statSync(path).size>10_000);
 assert.equal(actorArtFile(file,{reducedTextures:false}),file);
}
assert.equal(actorArtFile('unknown.webp',{reducedTextures:true}),'unknown.webp');
console.log('Actor textures: shared compact common paintings, stable URLs and preserved boss/warden quality variants passed.');
