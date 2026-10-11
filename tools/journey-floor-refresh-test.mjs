import assert from 'node:assert/strict';
import {readFileSync,statSync} from 'node:fs';
import {runInNewContext} from 'node:vm';
import * as THREE from 'three';
import {createExpansionEnvironmentArt} from '../src/expansion-environment-art.js';
import {createExpansionJourneyView} from '../src/expansion-journey-view.js';
import {createCrystalSiege,stepCrystalSiege,checkpointCrystalSiege,restoreCrystalSiege} from '../src/crystal-siege-rules.js';
import {constrainToArena} from '../src/arena.js';
import {createExpansionJourney} from '../src/expansion-journey.js';
import {createExpansionEntry,validExpansionEntry} from '../src/expansion-run-save.js';

for(const mobile of [false,true]){
 const urls=[],cache=createExpansionEnvironmentArt({mobile,loader:{loadAsync:async url=>{urls.push(url);return new THREE.Texture();}}});
 for(const [act,revision,name] of [['crosswindFloor',3,'act4-crosswind-floor'],['crystalGorge',2,'act5-crystal-gorge-plate']]){
  const a=cache.load(act),b=cache.load(act);assert.equal(a,b);await a;
  const path=`assets/expansion/${name}${mobile?'-mobile':''}-v${revision}.webp`;
  assert.equal(urls.at(-1),path);const bytes=readFileSync('public/'+path);
  assert.equal(bytes.subarray(0,4).toString(),'RIFF');assert.equal(bytes.subarray(8,12).toString(),'WEBP');
  assert(statSync('public/'+path).size<(mobile?100000:300000),'bounded image download per map');
 }
 cache.dispose();
}

// Execute the actual host arena assignment, then apply the shipping collision
// constraint. The newly gained flank must be reachable, and still bounded.
const main=readFileSync(new URL('../src/main.js',import.meta.url),'utf8'),start=main.indexOf('arena=s.siege&&s.phase'),end=main.indexOf(';',start)+1;
assert(start>=0&&end>start);
const context={s:{siege:{},phase:'course',course:{encounterVersion:3}},canyon:true,distance:0,length:140};
runInNewContext(main.slice(start,end),context);const arena=context.arena;
assert.equal(arena.halfWidth*2,17);assert.equal(arena.halfDepth*2,15);
const p={x:8,z:7};constrainToArena(p,.2,arena);assert.equal(p.x,8);assert.equal(p.z,7,'old edge is no longer a player wall');
const escaped={x:100,z:100};constrainToArena(escaped,.2,arena);assert(escaped.x<=8.5&&escaped.z<=7.5);
context.s.phase='boss';runInNewContext(main.slice(start,end),context);assert.equal(context.arena.halfWidth,8.5);assert.equal(context.arena.halfDepth,10,'boss depth is not reduced');

const siege=createCrystalSiege(0,413),original=checkpointCrystalSiege(siege),restored=restoreCrystalSiege(original);
assert.deepEqual(checkpointCrystalSiege(restored),original,'floor/layout requires no checkpoint migration');
const run={version:1,cycle:0,region:'garden',stage:0,mode:'entry',hp:100,kills:3,elapsed:15,rules:[],mutated:[],forms:{returnblade:5},inventory:{potion:3,tonic:2,wind:1,shell:1,sprout:1},score:300,choicesTaken:2,choiceKills:3};
const entry=createExpansionEntry(createExpansionJourney('crystalGorge',0,413,{siege:true}),run,[8,0,7]);
assert(entry&&validExpansionEntry(JSON.parse(JSON.stringify(entry))),'existing room-entry decoder accepts the new player flank without schema mutation');
const spawn=stepCrystalSiege(siege,.1);assert.equal(spawn.spawns.length,0);
siege.phase='defense';for(let i=0;i<4;i++)stepCrystalSiege(siege,.1);
assert.equal(siege.out.spawns.length,1);assert(Math.abs(siege.out.spawns[0].position.x)<=7.3);assert(Math.abs(siege.out.spawns[0].position.z)<=6.3,'enemy ingress stays close to the core');

const scene=new THREE.Scene(),ground=new THREE.Texture(),tile=new THREE.Texture(),plate=new THREE.Texture(),view=createExpansionJourneyView(scene,ground);
view.setCrosswindFloorTexture(tile);view.setPlate('crystalGorge',plate);view.setCourse('crystalGorge',{plateBounds:{width:38,depth:28}});const count=view.root.children.length;
for(let i=0;i<500;i++){view.setSiegePhase(i%2?'prep':'defense');view.beginFrame();}
assert.equal(view.root.children.length,count,'no extra lights/particles/frame scene allocation');view.dispose();assert.equal(scene.children.length,0);
console.log('Journey floor refresh PASS: revised desktop/mobile art, size budgets, actual wider host collision bounds, unchanged checkpoint and inner ingress, fixed scene resources. Not physical-device QA.');
