import assert from 'node:assert/strict';
import {existsSync,statSync} from 'node:fs';
import {fileURLToPath} from 'node:url';
import {EXPEDITION_SPECIES} from '../src/expedition/species.js';
import {EXPEDITION_GARDENS,EXPEDITION_ENEMIES} from '../src/expedition/world.js';
import {formArt} from '../src/form-art.js';
import {expeditionAllyArt,expeditionEnemyArt,expeditionGardenArt,expeditionAssetUrl,expeditionCssAssetUrl,expeditionGardenAssetBatch,expeditionArtAudit} from '../src/expedition/art.js';

const file=path=>fileURLToPath(new URL(`../public/assets/${path}`,import.meta.url));
const audit=expeditionArtAudit();
assert.deepEqual(audit,{allies:{total:162,reusable:67,placeholder:95,ready:0},enemies:{total:56,placeholder:0,authoredCandidate:56,missing:0,motionCandidate:14,motionReady:0,ready:0},gardens:{total:8,reusable:8,threeLayerReady:0}});
for(const id of Object.keys(EXPEDITION_SPECIES)){
 const art=expeditionAllyArt(id);
 assert.equal(art.ready,false);
 if(art.status==='reusable'){assert.ok(existsSync(file(art.path)),`missing audited motion ${id}`);assert.equal(art.cols,4);assert.equal(art.rows,2);}
 else {assert.equal(art.status,'placeholder');assert.equal(art.path,null);assert.equal(art.cols,null);assert.equal(art.rows,null);assert.equal(art.placeholder,'formArt');assert.ok(formArt(id),`no card fallback ${id}`);}
}
for(const [id,enemy] of Object.entries(EXPEDITION_ENEMIES)){
 const art=expeditionEnemyArt(id);assert.equal(art.ready,false);assert.equal(art.rank,enemy.rank);
 if(enemy.gardenId==='blossom')assert.equal(art.facing,'left','inspected native blossom portraits must face the allied inner column without a second mirror');
 if(enemy.rank==='boss'){
  assert.equal(art.status,'authored_candidate');
  if(id==='meadow-boss'||id==='blossom-boss'){
   assert.equal(art.reason,'authored_motion_candidate_final_gameplay_device_qa_pending');
   assert.equal(art.cols,4);assert.equal(art.rows,2);assert.equal(art.facing,'left');assert.equal(art.poseOffsets.length,8);
   assert.ok(existsSync(file(art.motionPath)));assert.ok(statSync(file(art.motionPath)).size<300000);
   assert.equal(expeditionAssetUrl(art.motionPath,'./'),`./assets/${art.motionPath}`);
  }else{assert.equal(art.reason,'painted_static_candidate_motion_and_gameplay_qa_missing');assert.equal(art.motionPath,null);}
  assert.ok(existsSync(file(art.path)));assert.ok(existsSync(file(art.thumbPath)));
  assert.equal(expeditionAssetUrl(art.thumbPath,'/seed-web/'),`/seed-web/assets/expedition/bosses/${enemy.gardenId}-thumb-v1.webp`);
  assert.deepEqual(art.defects,id==='moon-boss'?['antler_tip_has_insufficient_margin']:[]);
 }
 else {
  assert.equal(art.status,'authored_candidate');
  if(/^(meadow|blossom)-(normal-[0-3]|elite-[01])$/.test(id)){
   assert.equal(art.cols,4);assert.equal(art.rows,2);assert.equal(art.facing,'left');assert.ok(existsSync(file(art.motionPath)));assert.ok(statSync(file(art.motionPath)).size<300000,'first native enemy atlas transfer budget');
   assert.equal(expeditionAssetUrl(art.motionPath,'./'),`./assets/${art.motionPath}`);assert.equal(art.poseOffsets.length,8);assert.ok(Object.isFrozen(art.poseOffsets));
  }else{assert.equal(art.cols,null);assert.equal(art.rows,null);assert.equal(art.motionPath,null);}
  assert.ok(existsSync(file(art.path)),`missing authored figure ${id}`);
  assert.ok(existsSync(file(art.thumbPath)),`missing authored thumb ${id}`);
  assert.ok(statSync(file(art.path)).size<100_000,`oversized 512px detail ${id}`);
  assert.ok(statSync(file(art.thumbPath)).size<20_000,`oversized 128px thumb ${id}`);
  assert.ok(Array.isArray(art.defects));
  assert.equal(expeditionAssetUrl(art.thumbPath,'/seed-web/'),`/seed-web/assets/expedition/enemies/${id}-thumb-v1.webp`);
 }
}
for(const id of Object.keys(EXPEDITION_GARDENS)){
 const layered=['meadow','blossom','autumn','snow','moon','fire','shadow','dream'].includes(id);
 const art=expeditionGardenArt(id);assert.equal(art.ready,false);assert.equal(art.path,EXPEDITION_GARDENS[id].homeArt);
 assert.ok(existsSync(file(art.path)));assert.deepEqual(art.missingLayers,layered?[]:['far','middle','foreground']);
 if(layered){assert.equal(art.status,'layered_candidate');assert.deepEqual(Object.keys(art.layers),['far','middle','foreground']);for(const path of Object.values(art.layers)){assert.ok(existsSync(file(path)));assert.ok(statSync(file(path)).size<260000);assert.ok(expeditionAssetUrl(path,'./').startsWith('./assets/expedition/fields/'));}}
 else assert.equal(art.layers,null);
 assert.ok(existsSync(file(art.thumbPath)));assert.ok(statSync(file(art.thumbPath)).size<30000);assert.match(expeditionAssetUrl(art.thumbPath,'/seed-web/'),/home-thumb-v1.webp$/);
 const urls=expeditionGardenAssetBatch(id,{partySpeciesIds:Object.keys(EXPEDITION_SPECIES),includeEncounter:true,base:'/seed-web/'});
 assert.ok(urls.length<=(layered?18:16),'garden batch must be bounded to current field layers + eight party sheets + six region enemies + one boss thumb');
 assert.ok(!urls.some(url=>url.includes('/expedition/fields/')&&!url.includes(`/expedition/fields/${id}-`)),'another garden field must never preload');
 assert.ok(urls.every(url=>url.startsWith('/seed-web/assets/')));
 assert.ok(urls.every(url=>existsSync(file(url.slice('/seed-web/assets/'.length)))));
 assert.ok(urls.includes(`/seed-web/assets/expedition/bosses/${id}-thumb-v1.webp`));
 assert.ok(!urls.includes(`/seed-web/assets/expedition/bosses/${id}-v1.webp`),'encounter batch must prefer the small thumb');
 for(const enemy of Object.values(EXPEDITION_ENEMIES).filter(e=>e.gardenId===id&&e.rank!=='boss')){
  assert.ok(urls.includes(`/seed-web/assets/expedition/enemies/${enemy.id}-thumb-v1.webp`));
  assert.ok(!urls.includes(`/seed-web/assets/expedition/enemies/${enemy.id}-v1.webp`),'only the current garden enemy thumb is eager');
 }
 assert.ok(!urls.some(url=>url.includes('/expedition/enemies/')&&!url.includes(`/expedition/enemies/${id}-`)),'another garden enemy must never preload');
}
assert.equal(expeditionAssetUrl('duel/pierce-motion-v1.webp','/seed-web/'),'/seed-web/assets/duel/pierce-motion-v1.webp');
assert.equal(expeditionAssetUrl('duel/pierce-motion-v1.webp','./'),'./assets/duel/pierce-motion-v1.webp','Vite relative BASE_URL is supported');
const homePath=expeditionGardenArt('meadow').thumbPath;
assert.equal(expeditionCssAssetUrl(homePath,'./','https://example.com/seed-web/?release=qa'),`https://example.com/seed-web/assets/${homePath}`);
assert.equal(expeditionCssAssetUrl(homePath,'/seed-web/','https://example.com/seed-web/'),`https://example.com/seed-web/assets/${homePath}`);
assert.equal(expeditionCssAssetUrl(homePath,'./','http://localhost/index.html'),`http://localhost/assets/${homePath}`);
assert.equal(expeditionCssAssetUrl('../secret','./','http://localhost/'),null);
assert.equal(expeditionCssAssetUrl(homePath,'./',undefined),null);
assert.deepEqual(expeditionGardenAssetBatch('meadow',{partySpeciesIds:['pierce'],base:'./'}),['./assets/expedition/fields/meadow-far-v1.webp','./assets/expedition/fields/meadow-middle-v1.webp','./assets/expedition/fields/meadow-foreground-v1.webp','./assets/duel/pierce-motion-v1.webp']);
assert.equal(expeditionAssetUrl('../secret','/seed-web/'),null);
assert.equal(expeditionAssetUrl('duel/pierce-motion-v1.webp','../'),null);
assert.equal(expeditionAssetUrl('duel/pierce-motion-v1.webp','./../'),null);
assert.equal(expeditionAssetUrl('duel/pierce-motion-v1.webp','javascript:evil'),null);
assert.deepEqual(expeditionGardenAssetBatch('greenhouse'),[],'safe area is not a ninth combat garden');
assert.equal(expeditionAllyArt('unknown'),null);assert.equal(expeditionEnemyArt('unknown'),null);assert.equal(expeditionGardenArt('unknown'),null);
console.log('expedition art audit PASS: 162 allies, 56 authored enemy candidates, fourteen connected motion candidates/zero final motion-ready, bounded lazy URLs');
