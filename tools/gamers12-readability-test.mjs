import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import * as THREE from 'three';
import {rankedEvolutions} from '../src/evolution-rank.js';
import {ALL_FORMS,baseFormOf,TWIN_FORMS} from '../src/forms.js';
import {LAWS} from '../src/laws.js';
import {applySpriteLighting} from '../src/sprite-lighting.js';
import {THEMES,normalizeTheme} from '../src/themes.js';
import {seedVisualEnabled,createSeedShotPresentation,createSeedHurtPresentation} from '../src/seed-visual-language.js';
import {createJourneyDuelBody} from '../src/journey-duel-body.js';
import {createArborJourneyView} from '../src/arbor-journey-view.js';

// The shipping factory, with only its browser URL and image transport adapted.
// No WebGL/pixel claim: native screenshots cover the actual depth composition.
const source=fs.readFileSync(new URL('../src/seed-body.js',import.meta.url),'utf8');
const jobs=[];
class TextureLoader {load(url,ok){const texture=new THREE.Texture();jobs.push({texture,ok});return texture;}}
const scope={THREE:{...THREE,TextureLoader},rankedEvolutions,ALL_FORMS,baseFormOf,TWIN_FORMS,LAWS,applySpriteLighting,THEMES,normalizeTheme,seedVisualEnabled,createSeedShotPresentation,createSeedHurtPresentation,createJourneyDuelBody};
vm.runInNewContext(source.replace(/^import .*$/gm,'').replace(/export (const|function)/g,'$1').replaceAll('import.meta.env.BASE_URL',"'/seed/'"),scope);
const finish=()=>{while(jobs.length){const job=jobs.shift();job.ok?.(job.texture);}};
for(const criticalOcclusion of [false,true]){
 const scene=new THREE.Scene(),body=scope.createSeedBody(scene,{occlusion:true,criticalOcclusion});finish();
 for(const level of [0,1,2,0]){
  body.userData.setQuality(level);
  const ghosts=body.children.filter(o=>o.isSprite&&o.material.depthFunc===THREE.GreaterDepth);
  assert.equal(ghosts.filter(o=>o.visible).length,criticalOcclusion||level>0?1:0);
  if(criticalOcclusion)assert.equal(ghosts[0].material.opacity,.76);
 }
 const count=body.children.length;
 for(let i=0;i<6000;i++)body.userData.setQuality(0);
 assert.equal(body.children.length,count,'critical silhouette reuses the existing ghost');
 body.userData.setEvolution(new Map([['collapse',6]]),new Map());finish();
 body.userData.setQuality(0);
 const ghosts=body.children.filter(o=>o.isSprite&&o.material.depthFunc===THREE.GreaterDepth&&o.visible);
 assert.equal(ghosts.length,criticalOcclusion?1:0,'evolution fallback preserves the quality contract');
 body.userData.disposeJourneyIdentity();
}

const duelRoot=new THREE.Group(),duel=createJourneyDuelBody(duelRoot,{occlusionOpacity:.76,loader:new TextureLoader(),baseURL:'/seed/'});
duel.select('collapse');duel.setEnabled(true);finish();
assert.equal(duelRoot.getObjectByName('journey-duel-body-occlusion').material.opacity,.76);
duel.setOcclusion(false);assert(!duelRoot.getObjectByName('journey-duel-body-occlusion').visible,'other owners can still disable their ghost');duel.dispose();

const scene=new THREE.Scene(),loads=[],view=createArborJourneyView(scene,{loader:{load(_url,ok){const t=new THREE.Texture();loads.push(()=>ok(t));return t;}},base:'/seed/'});
for(const load of loads)load();view.setActive(true);
const actor=new THREE.Group();scene.add(actor);const sprite=view.setBossArt(actor,'idle');
assert(sprite.material.depthWrite&&sprite.material.alphaTest>0,'only opaque boss pixels occlude the hero; transparent padding cannot');
view.dispose();

const main=fs.readFileSync(new URL('../src/main.js',import.meta.url),'utf8');
assert(main.includes('createSeedBody(scene,{occlusion:qualityLevel>0,criticalOcclusion:true})'));
const prep=main.slice(main.indexOf('async function prepareExpansionEnvironment('),main.indexOf('async function prepareExpansionCover('));
assert(prep.includes("if(act==='crosswind')try{const art=await expansionArtCache(),texture=await art.loadCrosswindFloor()"),'loaded panorama must not suppress the small-paver road asset');
assert(!prep.includes("!expansionJourneyView.hasPlate('crosswind')"));
console.log('12-perspective readability regression PASS: real seed factory quality/evolution, bounded existing ghost, independent opponent control, actual boss depth mask and panorama+road shipping load. CPU contracts; not human/device evidence.');
