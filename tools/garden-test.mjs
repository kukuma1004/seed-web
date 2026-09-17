import assert from 'node:assert/strict';
import {SEEDS,SEED_IDS,GUARDIAN,FOUNDER,PLOTS,FRAGMENTS_PER_SEED,MAX_RECORDS,STAGE_POINTS,PLAY_STYLES,
 stageOf,nextStagePoints,emptyGarden,normalizeGarden,readGarden,writeGarden,harvestFromRun,addHarvest,craftSeed,
 plantSeed,uproot,growPlants,activePlants,plantName,plantSummary,branchSummary,gardenEffects,dominantLaw,
 harvestLine,gardenRecordLine,objectJosa,wayJosa,CENTER,centerStage,centerInfo,activeSlots,bloomedCount,
 playStyleFromRun} from '../src/garden.js';
import {LAWS} from '../src/laws.js';
import {GARDEN_GROWTH_ART,growthArtTile,centerArtTile} from '../src/garden-scene.js';

const memory=()=>{const d=new Map();return {getItem:k=>d.has(k)?d.get(k):null,setItem:(k,v)=>d.set(k,String(v)),d};};

assert.ok(GARDEN_GROWTH_ART.endsWith('.webp'));
assert.deepEqual([growthArtTile(0),growthArtTile(1),growthArtTile(4,'flower'),growthArtTile(4,'tree'),growthArtTile(4,'vine'),growthArtTile(9,'flower'),growthArtTile(9,'tree'),growthArtTile(9,'vine')],[0,1,4,6,8,5,7,9]);
assert.deepEqual([0,1,2,3,4,5].map(centerArtTile),[null,0,2,10,7,11]);

assert.equal(SEED_IDS.length,Object.keys(LAWS).length+2);
for(const id of SEED_IDS){
 const seed=SEEDS[id];assert.ok(seed.name&&seed.hint);
 assert.deepEqual(Object.keys(seed.branchNames).sort(),['flower','tree','vine']);
 assert.ok(id===GUARDIAN||id===FOUNDER?seed.law===null:Object.hasOwn(LAWS,seed.law));
}
assert.equal(stageOf(0),'seed');assert.equal(stageOf(1),'sprout');assert.equal(stageOf(4),'mature');assert.equal(stageOf(9),'bloom');
assert.equal(nextStagePoints(0),1);assert.equal(nextStagePoints(4),5);assert.equal(nextStagePoints(9),0);

assert.equal(playStyleFromRun({kills:90,elapsed:180,dashes:2}),'rush');
assert.equal(playStyleFromRun({kills:20,elapsed:180,dashes:24}),'agile');
assert.equal(playStyleFromRun({kills:20,elapsed:240,dashes:2,damageTaken:30,wardens:3}),'endure');
assert.equal(playStyleFromRun({kills:4,elapsed:40,dashes:1}),'balanced');

{
 assert.equal(dominantLaw({reflect:3,split:5,chain:2}),'split');assert.equal(dominantLaw({}),null);
 const rush=harvestFromRun({levels:{reflect:6},wardens:2,kills:80,elapsed:180,dashes:2});
 assert.deepEqual(rush.seeds,['reflect']);assert.equal(rush.style,'rush');assert.equal(rush.record.style,'rush');
 const agile=harvestFromRun({levels:{chain:4},wardens:1,kills:20,elapsed:150,dashes:20});
 assert.equal(agile.style,'agile');assert.equal(agile.growth,2);
 const boss=harvestFromRun({levels:{frost:4},wardens:5,austins:1,elapsed:300,damageTaken:40});
 assert.deepEqual(boss.seeds,[GUARDIAN,'frost']);assert.equal(boss.style,'endure');
 const lose=harvestFromRun({levels:{chain:2},wardens:0});assert.equal(lose.fragments,1);
 assert.ok(gardenRecordLine(rush.record).includes('맹공의 흔적'));
}

{
 let g=emptyGarden();
 g=addHarvest(g,{seeds:['reflect'],style:'rush',record:{law:'reflect',kills:80,score:1,style:'rush'}});
 g=addHarvest(g,{seeds:['reflect'],style:'agile',record:{law:'reflect',kills:20,score:1,style:'agile'}});
 assert.deepEqual(g.traits.reflect,['rush','agile']);
 let r=plantSeed(g,'reflect',0);assert.ok(r.ok);g=r.garden;
 assert.equal(g.plots[0].style,'rush');assert.equal(g.plots[0].branch,PLAY_STYLES.rush.branch);
 g=plantSeed(g,'reflect',1).garden;assert.equal(g.plots[1].style,'agile');assert.equal(g.plots[1].branch,'vine');
 assert.equal(g.traits.reflect,undefined);assert.equal(g.seeds.reflect,undefined);
 g=growPlants(g,STAGE_POINTS.bloom);assert.equal(stageOf(g.plots[0].growth),'bloom');
 assert.equal(plantName(g.plots[0]),SEEDS.reflect.branchNames.flower);
 assert.ok(plantSummary(g.plots[0]).includes('전투 능력에는 영향을 주지 않는다'));
 assert.equal(activePlants(g,6).length,2);
 g=uproot(g,1).garden;assert.equal(g.plots[1],null);
}

{
 let g=emptyGarden();
 for(let i=0;i<FRAGMENTS_PER_SEED;i++)g=addHarvest(g,{fragments:1,record:{law:'chain',kills:10,score:1,style:'agile'}});
 assert.equal(craftSeed(g,GUARDIAN).ok,false);assert.equal(craftSeed(g,FOUNDER).ok,false);
 g=craftSeed(g,'chain').garden;assert.equal(g.fragments,0);
 g=plantSeed(g,'chain',0).garden;assert.equal(g.plots[0].style,'agile');
}

{
 let g=addHarvest(emptyGarden(),{seeds:['reflect',GUARDIAN],style:'rush'});
 g=plantSeed(g,'reflect',0).garden;g=plantSeed(g,GUARDIAN,1).garden;g=growPlants(g,99);
 const fx=gardenEffects(g);
 assert.deepEqual(fx.lawWeights,{});assert.deepEqual(fx.formGuides,[]);assert.deepEqual(fx.relicLaws,[]);assert.deepEqual(fx.mutationLaws,[]);
 assert.equal(fx.freshBonus,0);assert.equal(fx.guideCount,0);assert.equal(fx.austinEvery,5);assert.equal(fx.actives.length,2);
 assert.equal(activeSlots(g),PLOTS);
}

{
 const old=normalizeGarden({version:2,plots:[{seed:'split',growth:9,branch:'vine',active:true}],seeds:{reflect:1},harvests:5});
 assert.equal(old.plots[0].style,'agile');assert.equal(old.plots[0].active,false);assert.equal(old.version,3);
 const s=memory();assert.ok(writeGarden(s,old));assert.equal(readGarden(s).plots[0].style,'agile');
 s.setItem('seed-garden-v1','{깨진 json');assert.deepEqual(readGarden(s).plots,Array(PLOTS).fill(null));
}

{
 let g=emptyGarden();
 for(let i=0;i<MAX_RECORDS+3;i++)g=addHarvest(g,harvestFromRun({levels:{chain:i+1},wardens:1,kills:i+30,elapsed:120,journey:i+1}));
 assert.equal(g.records.length,MAX_RECORDS);
 assert.equal(centerStage(g)>=1,true);assert.ok(centerInfo(g).name);assert.equal(CENTER.some(x=>'slots' in x),false);
 g=plantSeed(g,'chain',0).garden;g=growPlants(g,STAGE_POINTS.bloom);assert.equal(bloomedCount(g),1);
}

for(const id of SEED_IDS)for(const branch of ['flower','tree','vine'])assert.ok(branchSummary(id,branch,'bloom').includes('전투 능력'));
assert.equal(objectJosa('메아리 씨앗'),'을');assert.deepEqual([wayJosa('반사'),wayJosa('관통')],['로','으로']);
assert.ok(harvestLine({seeds:['reflect'],fragments:0}).includes('메아리 씨앗을 얻었어요'));
assert.ok(harvestLine({seeds:[],fragments:1}).includes('조각 1개'));

console.log('정원: 플레이 흔적 자동 성장·옛 저장 이관·전투 영향 0·저장 통과');
