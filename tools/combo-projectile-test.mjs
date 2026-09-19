import assert from 'node:assert/strict';
import {FIRST_FUSIONS,SECOND_FUSIONS} from '../src/combo-catalog.js';
import {ALL_FORMS} from '../src/forms.js';
import {COMBO_PROJECTILE_BUDGET,buildComboProjectileGeometry,comboProjectilePreview,projectileAudioEvent,projectileRecipe} from '../src/combo-projectile.js';

const catalogue=[...FIRST_FUSIONS,...SECOND_FUSIONS];
for(const form of catalogue){
 const a=projectileRecipe(form),b=projectileRecipe(form);
 assert.deepEqual(a,b,`${form.id} keeps a deterministic projectile recipe`);
 assert.ok(a.core&&a.shell&&a.trail&&a.accent&&a.secondaryColor);
 assert.ok(a.coreVariant>=0&&a.coreVariant<12&&a.shellVariant>=0&&a.shellVariant<12&&a.trailVariant>=0&&a.trailVariant<12);
 assert.match(comboProjectilePreview(form),new RegExp(`shot-trail-${form.id}`));
}
let peakVertices=0,peakTriangles=0;
for(const form of [...Object.values(ALL_FORMS),...FIRST_FUSIONS,...SECOND_FUSIONS]){
 const geometry=buildComboProjectileGeometry(form);geometry.computeBoundingBox();
 const position=geometry.getAttribute('position'),color=geometry.getAttribute('color');
 const triangles=(geometry.index?.count||position.count)/3;
 peakVertices=Math.max(peakVertices,position.count);peakTriangles=Math.max(peakTriangles,triangles);
 assert.ok(position.count>=36&&position.count<=COMBO_PROJECTILE_BUDGET.maxVertices,`${form.id} stays detailed but mobile-bounded`);
 assert.ok(triangles<=COMBO_PROJECTILE_BUDGET.maxTriangles,`${form.id} stays inside the triangle budget`);
 assert.equal(color.count,position.count);assert.ok(geometry.boundingBox.max.z-geometry.boundingBox.min.z>.35);
 geometry.dispose();
}
assert.deepEqual(COMBO_PROJECTILE_BUDGET,{liveGeometries:1,meshesPerProjectile:1,materialsPerProjectile:1,textures:0,maxVertices:700,maxTriangles:234});
assert.equal(new Set(catalogue.map(form=>{const r=projectileRecipe(form);return [r.core,r.shell,r.trail,r.coreVariant,r.shellVariant,r.trailVariant,r.twist,r.mark,r.accent,r.secondaryColor].join('|');})).size,catalogue.length,'all 1,035 fusion recipes have a distinct visual gene');
const audio=new Set(Object.values(ALL_FORMS).map(projectileAudioEvent));
assert.ok(audio.size>=8,'evolution families do not collapse into one firing sound');
console.log(`Shared projectile grammar covers 1,090 catalogue entries; all 1,035 fusion meshes fit one draw with peaks ${peakVertices} vertices / ${peakTriangles} triangles.`);
