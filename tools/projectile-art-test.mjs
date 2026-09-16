import assert from 'node:assert/strict';
import {createProjectileGeometries,projectileGeometry} from '../src/projectile-art.js';

const geos=createProjectileGeometries(),ids=['seed','reflect','split','chain','orbit','pierce','burst','recall','gravity','frost','portal'];
assert.deepEqual(Object.keys(geos).sort(),ids.sort());
for(const [id,geo] of Object.entries(geos)){
 geo.computeBoundingBox();const size={x:geo.boundingBox.max.x-geo.boundingBox.min.x,y:geo.boundingBox.max.y-geo.boundingBox.min.y,z:geo.boundingBox.max.z-geo.boundingBox.min.z};
 assert.ok(geo.getAttribute('position').count>=24,`${id} has an authored silhouette`);
 assert.equal(geo.getAttribute('color').count,geo.getAttribute('position').count,`${id} carries baked tip and facet lighting`);
 assert.ok(new Set([...geo.getAttribute('color').array].map(v=>v.toFixed(2))).size>3,`${id} has more than one flat color value`);
 assert.ok(size.z>.25&&size.x>.08&&size.y>.05,`${id} remains readable from the game camera`);
 assert.ok(geo.name.includes(id));
}
assert.equal(projectileGeometry(geos,'unknown'),geos.seed);
for(const geo of Object.values(geos))geo.dispose();
console.log('Eleven one-mesh projectile silhouettes and the fallback passed.');
