import assert from 'node:assert/strict';
import {EXPEDITION_GARDENS,EXPEDITION_ENEMIES} from '../src/expedition/world.js';
import {EXPEDITION_STORY_SCENES,EXPEDITION_RESTORATION_IDS,expeditionRestorationProgress,selectExpeditionStory,readExpeditionStory,expeditionStoryJournal} from '../src/expedition/story.js';
import {renderExpeditionReturnStory,renderExpeditionBossNote} from '../src/expedition/home-panels.js';

const gardens=Object.values(EXPEDITION_GARDENS),empty=[];
for(const g of gardens){
 const story=[`story:${g.id}:restore`,`story:${g.id}:boss-intro`];
 const s={lastResult:{kind:'return',boss:true,gardenId:g.id},roster:{story},route:{gardenId:g.id},battle:{units:[{side:'enemy',boss:true,dead:false}]}};
 const restored=readExpeditionStory(story[0],story).scene,intro=readExpeditionStory(story[1],story).scene;
 assert(renderExpeditionReturnStory(s).includes(restored.title));assert(renderExpeditionReturnStory(s).includes(restored.body));
 assert(renderExpeditionBossNote(s).includes(intro.body));
 assert.equal(renderExpeditionReturnStory({...s,lastResult:{...s.lastResult,boss:false}}),'');
}
assert.equal(gardens.length,8);
assert.equal(EXPEDITION_STORY_SCENES.length,26,'prologue + 8 × 3 scenes + endgame');
assert.equal(new Set(EXPEDITION_STORY_SCENES.map(s=>s.id)).size,26);
assert.equal(EXPEDITION_RESTORATION_IDS.length,8);
assert.deepEqual(expeditionRestorationProgress(empty),{restoredGardenIds:[],restoredCount:0,total:8,treeReady:false});
const oldReceipts=gardens.map(g=>`${g.id}:return`);
assert.equal(expeditionRestorationProgress(oldReceipts).restoredCount,0,'old generic return is not a restoration');
assert.equal(selectExpeditionStory({trigger:'tree-endgame'},oldReceipts),null);
assert.equal(readExpeditionStory('story:prologue',empty),null,'undiscovered scene stays closed in the journal');

const prologue=selectExpeditionStory({trigger:'prologue'},empty);
assert.equal(prologue.firstDiscovery,true);
assert.equal(prologue.recordId,'story:prologue');
assert.match(prologue.scene.body,/아홉 가지 법칙/);
const record=['story:prologue'];
assert.equal(selectExpeditionStory({trigger:'prologue'},record).recordId,null,'repeating a trigger cannot grant a new receipt');
assert.deepEqual(readExpeditionStory('story:prologue',record),{scene:prologue.scene,firstDiscovery:false,recordId:null});

for(const g of gardens){
 assert.equal(EXPEDITION_ENEMIES[`${g.id}-boss`].name,g.boss);
 assert.equal(selectExpeditionStory({trigger:'boss-intro',gardenId:g.id},empty),null,'approach proof is required');
 assert.equal(selectExpeditionStory({trigger:'boss-outro',gardenId:g.id,bossReady:true},empty),null,'defeat proof is required');
 assert.equal(selectExpeditionStory({trigger:'garden-restore',gardenId:g.id,bossDefeated:true},empty),null,'successful return is required');
 assert.equal(selectExpeditionStory({trigger:'garden-restore',gardenId:g.id,returned:true},empty),null,'boss defeat is required');
 const intro=selectExpeditionStory({trigger:'boss-intro',gardenId:g.id,bossReady:true},record);
 const outro=selectExpeditionStory({trigger:'boss-outro',gardenId:g.id,bossDefeated:true},record);
 const restore=selectExpeditionStory({trigger:'garden-restore',gardenId:g.id,bossDefeated:true,returned:true},record);
 for(const selected of [intro,outro,restore]){
  assert.ok(selected?.firstDiscovery);
  assert.equal(selected.recordId,selected.scene.id);
  assert.equal(selected.scene.gardenId,g.id);
  assert.equal(selected.scene.homeArt,g.homeArt);
  assert.ok(selected.scene.body.length>25 && selected.scene.body.length<170,'mobile-readable Korean prose');
  record.push(selected.recordId);
 }
 assert.match(intro.scene.title,new RegExp(g.boss));
 assert.match(outro.scene.title,new RegExp(g.boss));
}
assert.equal(selectExpeditionStory({trigger:'boss-intro',gardenId:'greenhouse',bossReady:true},record),null,'greenhouse is not a ninth combat garden');
assert.equal(selectExpeditionStory({trigger:'boss-intro',gardenId:'__proto__',bossReady:true},record),null);
assert.equal(expeditionRestorationProgress(record).treeReady,true);
const endgame=selectExpeditionStory({trigger:'tree-endgame'},record);
assert.equal(endgame.recordId,'story:tree:endgame');
assert.match(endgame.scene.body,/온실의 생명전류/);
assert.equal(selectExpeditionStory({trigger:'tree-endgame'},record.filter(id=>id!==EXPEDITION_RESTORATION_IDS[0])),null);
assert.equal(expeditionStoryJournal(record).length,25,'endgame is not marked discovered until recorded');
record.push(endgame.recordId);
assert.equal(expeditionStoryJournal(record).length,26);
assert.equal(readExpeditionStory(endgame.recordId,record).recordId,null);
assert.equal(selectExpeditionStory({trigger:'tree-endgame'},record).recordId,null);
assert.equal(selectExpeditionStory({trigger:'missing',gardenId:'meadow',bossReady:true},record),null);
assert.ok(EXPEDITION_STORY_SCENES.every(s=>!Object.hasOwn(s,'reward')&&!Object.hasOwn(s,'loot')));
assert.equal(record.length,26,'read-only selectors never modify history');
console.log('expedition story PASS: 26 scenes, eight canonical bosses, first-discovery/read separation, restoration gate');
