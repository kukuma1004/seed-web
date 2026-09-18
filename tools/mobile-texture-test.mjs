import assert from 'node:assert/strict';
import {existsSync,statSync} from 'node:fs';
import {actorArtFile} from '../src/actor-art.js';

for(const file of ['enemy-hound-v4.png','boss-austin-v1.png','enemy-pitcher-v1.webp','boss-always-beginner-v1.webp']){
 const reduced=actorArtFile(file,{reducedTextures:true}),path=new URL(`../public/assets/${reduced}`,import.meta.url);
 assert.notEqual(reduced,file);assert.ok(existsSync(path));assert.ok(statSync(path).size>10_000);
 assert.equal(actorArtFile(file,{reducedTextures:false}),file);
}
assert.equal(actorArtFile('unknown.webp',{reducedTextures:true}),'unknown.webp');
console.log('Mobile actor textures: mapped reduced atlases exist and desktop art remains unchanged passed.');
