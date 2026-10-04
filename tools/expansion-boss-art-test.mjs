import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import * as THREE from 'three';
import {EXPANSION_BOSS_ART,expansionBossFrame,expansionActorArt,paintExpansionBoss} from '../src/expansion-actor-art.js';
import {actorArtFile,ACTOR_MOTION_GEOMETRIES} from '../src/actor-art.js';
import {createExpansionBoss,stepExpansionBoss} from '../src/act-expansion-runtime.js';
import {createExpansionJourney} from '../src/expansion-journey.js';
for(const id of Object.keys(EXPANSION_BOSS_ART)){
 const art=expansionActorArt(id);assert.equal(art.atlasColumns,4);assert.equal(art.atlasRows,2);assert.equal(art.baseline,62/512);assert.equal(art.topDownFacing,undefined);
 assert.equal(expansionBossFrame(null),0);assert.equal(expansionBossFrame({pattern:-1,state:'recover'}),0);
 for(let pattern=0;pattern<3;pattern++)for(const [state,frame] of [['tell',1+pattern*2],['attack',2+pattern*2],['recover',7]]){
  const model={pattern,state},saved=JSON.stringify(model);assert.equal(art.atlasFrame({expansionMotion:model,hit:0}),frame);assert.equal(art.atlasFrame({expansionMotion:model,hit:.01}),frame,'rapid damage must not conceal attack preparation');assert.equal(JSON.stringify(model),saved);
 }
 for(const reducedTextures of [false,true]){
  const file=actorArtFile(art.file,{reducedTextures}),bytes=fs.readFileSync('public/assets/'+file);
  assert.equal(bytes.toString('ascii',0,4),'RIFF');assert.equal(bytes.toString('ascii',8,12),'WEBP');assert(bytes[20]&16);
  assert.equal(bytes.readUIntLE(24,3)+1,reducedTextures?1024:2048);assert.equal(bytes.readUIntLE(27,3)+1,reducedTextures?512:1024);
  assert(bytes.length<(reducedTextures?120000:400000));
 }
 const meta=JSON.parse(fs.readFileSync('public/assets/'+art.file.replace('.webp','.json'),'utf8'));
 assert.equal(meta.baselinePixels,450);assert.deepEqual(meta.grid,[4,2]);assert.equal(meta.frames.length,8);assert(meta.frames.every(f=>f.anchor[1]===450/512));
 // Canonical clock drives all eight reused UV frames, including recovery.
 const boss=createExpansionBoss(id),frames=new Set([art.atlasFrame({expansionMotion:boss})]);
 for(let tick=0;tick<7200;tick++){stepExpansionBoss(boss,1/60,{position:{x:0,z:0},player:{x:4,z:1},hpRatio:.8});frames.add(art.atlasFrame({expansionMotion:boss}));}
 assert.deepEqual([...frames].sort(),[0,1,2,3,4,5,6,7]);
 const draws=[],ctx={drawImage:(...args)=>draws.push(args)},image={complete:true,naturalWidth:1024,width:1024,height:512},enemy={x:5,y:7,expansionBoss:{pattern:2,state:'attack'}};
 const before=JSON.stringify(enemy);assert(paintExpansionBoss(ctx,enemy,image,8.8));assert.deepEqual(draws[0].slice(1,5),[512,256,256,256]);assert.equal(draws[0][6]+draws[0][8]*(450/512),7);assert.equal(JSON.stringify(enemy),before);assert.equal(paintExpansionBoss(ctx,enemy,null,8),false);
}
assert.equal(ACTOR_MOTION_GEOMETRIES.length,8);
// Execute the real journey spawn path, retaining the canonical model pointer.
const main=fs.readFileSync('src/main.js','utf8'),start=main.indexOf('function spawnExpansionActor('),end=main.indexOf('\nfunction expansionBolt(',start);
const attached=[],journey=createExpansionJourney('crosswind');journey.boss=createExpansionBoss(journey.bossId);
const context=vm.createContext({THREE,scene:new THREE.Scene(),expansionJourney:journey,expansionApi:{EXPANSION_ACTS:{crosswind:{bossName:'captain'}}},camera:{},release(){},expansionActorArt,ACT3_ART:{},enemies:[],attachActorArt:(e,c,r,art)=>attached.push({e,art})});
vm.runInContext(main.slice(start,end),context);const actor=context.spawnExpansionActor({position:{x:5,z:0}},true);
assert.equal(actor.expansionMotion,journey.boss);assert.equal(attached[0].art.file,EXPANSION_BOSS_ART.crosswindKeeper.file);journey.boss.pattern=1;journey.boss.state='attack';assert.equal(attached[0].art.atlasFrame(actor),4);
console.log('Original eight-pose boss sheets: desktop/mobile sizes, source anchors, shared UV identity, canonical clock and real journey spawn/Canvas cropping passed. Browser/GPU/device QA pending.');
