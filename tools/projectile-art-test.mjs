import assert from 'node:assert/strict';
import * as THREE from 'three';
import {createProjectileGeometries,projectileGeometry,CRITICAL_PROJECTILE_SCALE,CRITICAL_FRAGMENT_SCALE,projectileVisualScale,applyProjectileTheme} from '../src/projectile-art.js';

const geos=createProjectileGeometries(),ids=['seed','reflect','split','chain','orbit','pierce','burst','recall','gravity','frost','portal'];
assert.deepEqual(Object.keys(geos).sort(),ids.sort());
for(const [id,geo] of Object.entries(geos)){
 geo.computeBoundingBox();const size={x:geo.boundingBox.max.x-geo.boundingBox.min.x,y:geo.boundingBox.max.y-geo.boundingBox.min.y,z:geo.boundingBox.max.z-geo.boundingBox.min.z};
 assert.ok(geo.getAttribute('position').count>=24,`${id} has an authored silhouette`);
 assert.ok(geo.getAttribute('position').count<=480,`${id} stays inside the repeated-shot vertex budget`);
 assert.equal(geo.getAttribute('color').count,geo.getAttribute('position').count,`${id} carries baked tip and facet lighting`);
 assert.ok(new Set([...geo.getAttribute('color').array].map(v=>v.toFixed(2))).size>3,`${id} has more than one flat color value`);
 assert.ok(size.z>.25&&size.x>.08&&size.y>.05,`${id} remains readable from the game camera`);
 assert.ok(geo.name.includes(id));
}
assert.ok(geos.seed.getAttribute('position').count>100,'the common seed shot has a kernel, husk, leaves and growth point');
assert.ok(geos.seed.getAttribute('position').count<=180,'the upgraded seed shot stays mobile-bounded');
assert.equal(projectileGeometry(geos,'unknown'),geos.seed);
assert.equal(CRITICAL_PROJECTILE_SCALE,2,'critical full shots have an unmistakable silhouette');
assert.equal(CRITICAL_FRAGMENT_SCALE,1,'critical fragments stop at normal full-shot size');
assert.equal(projectileVisualScale(false,false),1);
assert.equal(projectileVisualScale(false,true),CRITICAL_PROJECTILE_SCALE);
assert.equal(projectileVisualScale(true,false),.62);
assert.equal(projectileVisualScale(true,true),1,'critical fragments remain readable without filling the screen');
const themedPoses=new Set();
for(const theme of ['botanical','void','cyber','celestial']){
 const mesh=new THREE.Mesh(geos.seed);mesh.rotation.y=.73;applyProjectileTheme(mesh,'seed',theme,.37,1.16);
 assert.equal(mesh.rotation.y,.73,'cosmetic animation keeps the gameplay heading');
 assert.ok([...mesh.scale.toArray(),mesh.rotation.x,mesh.rotation.z].every(Number.isFinite));
 themedPoses.add([...mesh.scale.toArray(),mesh.rotation.x,mesh.rotation.z].map(v=>v.toFixed(3)).join('|'));
}
assert.equal(themedPoses.size,4,'four themes give the same projectile four distinct animated poses');
for(const geo of Object.values(geos))geo.dispose();
console.log('Eleven one-mesh projectile silhouettes, four animated theme poses and the fallback passed.');
