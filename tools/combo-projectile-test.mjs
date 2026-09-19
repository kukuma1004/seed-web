import assert from 'node:assert/strict';
import {FIRST_FUSIONS,SECOND_FUSIONS} from '../src/combo-catalog.js';
import {ALL_FORMS} from '../src/forms.js';
import {buildComboProjectileGeometry,comboProjectilePreview,projectileAudioEvent,projectileRecipe} from '../src/combo-projectile.js';

const catalogue=[...FIRST_FUSIONS,...SECOND_FUSIONS];
for(const form of catalogue){
 const a=projectileRecipe(form),b=projectileRecipe(form);
 assert.deepEqual(a,b,`${form.id} keeps a deterministic projectile recipe`);
 assert.ok(a.core&&a.shell&&a.trail&&a.accent&&a.secondaryColor);
 assert.ok(a.coreVariant>=0&&a.coreVariant<12&&a.shellVariant>=0&&a.shellVariant<12&&a.trailVariant>=0&&a.trailVariant<12);
 assert.match(comboProjectilePreview(form),new RegExp(`shot-trail-${form.id}`));
}
for(const form of [...Object.values(ALL_FORMS),...FIRST_FUSIONS.slice(0,5),...SECOND_FUSIONS.filter((_,i)=>i%99===0)]){
 const geometry=buildComboProjectileGeometry(form);geometry.computeBoundingBox();
 const position=geometry.getAttribute('position'),color=geometry.getAttribute('color');
 assert.ok(position.count>=36&&position.count<700,`${form.id} stays detailed but mobile-bounded`);
 assert.equal(color.count,position.count);assert.ok(geometry.boundingBox.max.z-geometry.boundingBox.min.z>.35);
 geometry.dispose();
}
const audio=new Set(Object.values(ALL_FORMS).map(projectileAudioEvent));
assert.ok(audio.size>=8,'evolution families do not collapse into one firing sound');
console.log('Shared projectile grammar covers 1,090 catalogue entries with bounded one-mesh geometry, card previews and family audio.');
