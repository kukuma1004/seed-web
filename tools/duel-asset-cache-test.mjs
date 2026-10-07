import assert from 'node:assert/strict';
import {trimDuelCombatAssets} from '../src/duel-asset-cache.js';
import {DUEL_NATIVE_MOTION,nativeMotionKey} from '../src/duel-native-motion.js';
const ids=Object.keys(DUEL_NATIVE_MOTION),background={src:'garden',onload:()=>{}},assets={arena:background},removed=[];
let obsoletePaints=0,currentPaints=0,peak=0;
for(let i=0;i<ids.length*3;i++){
 const pair=[ids[i%ids.length],ids[(i+1)%ids.length]],keep=pair.flatMap(id=>DUEL_NATIVE_MOTION[id].files.map((_,file)=>nativeMotionKey(id,file)));
 const previous=Object.entries(assets).filter(([key])=>!keep.includes(key)&&key!=='arena');
 const released=trimDuelCombatAssets(assets,keep);removed.push(...released);
 for(const [,image] of previous){assert.equal(image.onload,null);assert.equal(image.onerror,null);assert(image.src.startsWith('assets/'));if(image.onload)image.onload();}
 const oldSelected=Object.fromEntries(keep.filter(key=>assets[key]).map(key=>[key,assets[key]]));
 for(const id of pair)for(let file=0;file<DUEL_NATIVE_MOTION[id].files.length;file++){
  const key=nativeMotionKey(id,file);assets[key]??={src:'assets/'+DUEL_NATIVE_MOTION[id].files[file],onload:()=>currentPaints++,onerror:()=>obsoletePaints++};
 }
 for(const [key,image] of Object.entries(oldSelected))assert.equal(assets[key],image,'overlapping active images are reused');
 assert.equal(assets.arena,background);assert.equal(background.src,'garden');assert.equal(Object.keys(assets).length,keep.length+1);assert(keep.length<=4);peak=Math.max(peak,Object.keys(assets).length-1);
 for(const key of keep)assets[key].onload();
}
// Legacy authored motion sheets share the bounded policy, while similarly named unrelated art stays owned.
const legacy={src:'assets/legacy',onload:()=>obsoletePaints++};assets['motion-old']=legacy;assets['motionless-decoration']=background;
trimDuelCombatAssets(assets,[]);assert.equal(legacy.onload,null);assert.equal(legacy.src,'assets/legacy');assert.equal(assets['motionless-decoration'],background);assert.equal(Object.keys(assets).length,2);
assert(removed.length>100&&currentPaints>100);assert.equal(obsoletePaints,0);
console.log('Duel image-reference cache PASS: '+ids.length*3+' canonical native pair switches, peak '+peak+' combat sheets, overlapping reuse / obsolete callbacks removed / shared backgrounds preserved. Simulated image objects; physical GPU reclamation and battery remain unverified.');
