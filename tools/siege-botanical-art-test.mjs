import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import * as THREE from 'three';
import {SIEGE_ART_FILE,SIEGE_ART_FRAMES,siegeArtTexture,siegeArtStyle,siegeArtAspect,paintSiegeHeart} from '../src/siege-art.js';

const asset=readFileSync(new URL('../public/'+SIEGE_ART_FILE,import.meta.url));
assert.equal(asset.toString('ascii',0,4),'RIFF');assert.equal(asset.toString('ascii',8,12),'WEBP');
assert(asset.byteLength<180000,'one small atlas replaces unrelated borrowed plants');
assert.equal(asset.toString('ascii',12,16),'VP8X');assert(asset[20]&16,'generated alpha is retained');
const width=1+asset.readUIntLE(24,3),height=1+asset.readUIntLE(27,3);
assert.equal(width,1536);assert.equal(height,559);
const source=new THREE.Texture();source.colorSpace=THREE.SRGBColorSpace;
const original={repeat:source.repeat.toArray(),offset:source.offset.toArray()};
const crops=[];
for(const [kind,f] of Object.entries(SIEGE_ART_FRAMES)){
 assert(f.x>=0&&f.x+f.w<=2079&&f.y>=0&&f.y+f.h<=756);
 const t=siegeArtTexture(source,kind);crops.push(t);
 assert.notEqual(t,source);assert.equal(t.source,source.source);assert.equal(t.colorSpace,source.colorSpace);
 assert.equal(t.repeat.x,f.w/2079);assert.equal(t.offset.y,(756-f.y-f.h)/756);
 assert(siegeArtAspect(kind)>1&&siegeArtAspect(kind)<1.2);
 const style=siegeArtStyle(kind);assert(!style.backgroundPosition.includes('NaN'));assert(!style.backgroundSize.includes('Infinity'));
}
assert.deepEqual(source.repeat.toArray(),original.repeat);assert.deepEqual(source.offset.toArray(),original.offset);
assert.throws(()=>siegeArtTexture(source,'enemy'),/Unknown/);
const draws=[],ctx={drawImage:(...args)=>draws.push(args)},image={complete:true,naturalWidth:width,naturalHeight:height};
assert.equal(paintSiegeHeart(ctx,{complete:false},12,9,3),false);assert.equal(draws.length,0);
assert.equal(paintSiegeHeart(ctx,image,12,9,3),true);assert.equal(draws.length,1);
const [,sx,sy,sw,sh,dx,dy,dw,dh]=draws[0];assert(sx+sw<=width&&sy+sh<=height);assert.equal(dx,10.5);assert.equal(dw,3);assert.equal(dh,3*siegeArtAspect('heart'));assert(Math.abs(dy+dh*.93-9)<1e-8);
let originalDisposed=false;source.addEventListener('dispose',()=>originalDisposed=true);
crops.forEach(t=>t.dispose());assert.equal(originalDisposed,false,'cropped sampler disposal protects borrowed source');source.dispose();
console.log('Botanical siege atlas: alpha, bounded bytes, four distinct normalized frames, correct aspect, shared source ownership PASS. CPU/asset check; live framing is separate.');
