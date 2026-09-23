import assert from 'node:assert/strict';
import {readFileSync,statSync} from 'node:fs';
import {AWAKEN_FORMS,TWIN_FORMS} from '../src/forms.js';
import {buildComboProjectileGeometry} from '../src/combo-projectile.js';
import {FINAL_IDENTITY_COUNT,FINAL_IDENTITY_IDS,finalIdentity,finalProjectileStyle,finalArt} from '../src/final-identity-art.js';

const root=new URL('../',import.meta.url);
const matrix=JSON.parse(readFileSync(new URL('docs/COMBO_162_FINAL_BRANCH_MATRIX.json',root),'utf8'));
const branches=matrix.pairs.flatMap(p=>p.branches);
assert.equal(FINAL_IDENTITY_COUNT.final,72);
assert.equal(FINAL_IDENTITY_COUNT.twin,36);
assert.equal(FINAL_IDENTITY_IDS.length,108);
assert.equal(new Set(FINAL_IDENTITY_IDS).size,108);
assert.deepEqual(new Set(FINAL_IDENTITY_IDS),new Set([...branches.map(x=>x.id),...Object.keys(TWIN_FORMS)]));
for(const pair of matrix.pairs){
 const [a,b]=pair.branches.map(x=>finalIdentity(x.id));
 assert.notEqual(a.dominant,b.dominant,`${pair.fusion}: branches must use distinct cores`);
 assert.notEqual(a.projectile.core,b.projectile.core,`${pair.fusion}: distinguish projectile silhouette`);
 assert.notEqual(a.recipe[1],b.recipe[1],`${pair.fusion}: distinguish solo recipe`);
}
let maxVertices=0,maxTriangles=0;
for(const id of FINAL_IDENTITY_IDS){
 const identity=finalIdentity(id),recipe=finalProjectileStyle(id);
 assert(identity?.visual&&identity?.behavior&&identity?.ultimate?.opening,id);
 assert.match(finalArt(id,'card-art'),/seed-final-identity-atlas-v1-[123]\.webp/);
 assert.equal(recipe.core,identity.projectile.core);
 const geometry=buildComboProjectileGeometry(recipe);
 const vertices=geometry.getAttribute('position').count;
 const triangles=(geometry.index?.count??vertices)/3;
 maxVertices=Math.max(maxVertices,vertices);maxTriangles=Math.max(maxTriangles,triangles);
 assert(vertices<=696&&triangles<=232,`${id}: ${vertices}/${triangles}`);
 geometry.dispose();
}
for(let i=1;i<=3;i++){
 const file=new URL(`public/assets/seed-final-identity-atlas-v1-${i}.webp`,root);
 const bytes=readFileSync(file);
 assert.equal(bytes.toString('ascii',0,4),'RIFF');assert.equal(bytes.toString('ascii',8,12),'WEBP');
 assert(statSync(file).size<650_000,`${file.pathname} mobile transfer budget`);
}
for(const [id,f] of Object.entries(AWAKEN_FORMS)){
 assert.equal(finalIdentity(id)?.recipe[1],f.addedSolo,`${id}: art and playable recipe drift`);
}
console.log(`Final identity art: ${FINAL_IDENTITY_COUNT.final}+${FINAL_IDENTITY_COUNT.twin}, max ${maxVertices} vertices/${maxTriangles} triangles, 3 WebP sheets`);
