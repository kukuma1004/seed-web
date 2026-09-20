import assert from 'node:assert/strict';
import {SEEDS,SEED_IDS,GUARDIAN,FOUNDER,PLOTS,FRAGMENTS_PER_SEED,MAX_RECORDS,STAGE_POINTS,PLAY_STYLES,
 stageOf,nextStagePoints,emptyGarden,normalizeGarden,readGarden,writeGarden,harvestFromRun,addHarvest,craftSeed,
 uproot,growPlants,activePlants,plantName,plantSummary,branchSummary,gardenEffects,dominantLaw,autoPlantSeeds,
 harvestLine,gardenRecordLine,objectJosa,wayJosa,CENTER,centerStage,centerInfo,activeSlots,bloomedCount,
 playStyleFromRun,grantBossMastery,grantAustinMastery,gardenMastery,masteryLine,MASTERY_STAT_CAP,GARDEN_TRAINING_VISIBLE,
 bossGardenMilestones,BOSS_BLOOM_EVERY,BOSS_FRUIT_EVERY} from '../src/garden.js';
import {LAWS} from '../src/laws.js';
import {GARDEN_GROWTH_ART,growthArtTile,centerArtTile} from '../src/garden-scene.js';

const memory=()=>{const d=new Map();return {getItem:k=>d.has(k)?d.get(k):null,setItem:(k,v)=>d.set(k,String(v)),d};};

assert.equal(GARDEN_TRAINING_VISIBLE,false,'정원 훈련장은 재검토 전까지 메뉴에서 숨긴다');
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
 const act2Boss=harvestFromRun({levels:{orbit:4},wardens:5,austins:1,bossId:'alwaysbeginner'});
 assert.deepEqual(act2Boss.seeds,['orbit']);assert.equal(act2Boss.record.boss,'alwaysbeginner');assert.ok(gardenRecordLine(act2Boss.record).includes('항상초심 격파'));
 const act3Boss=harvestFromRun({levels:{chain:4},wardens:5,austins:1,bossId:'tempestcarrier'});
 assert.deepEqual(act3Boss.seeds,['chain']);assert.ok(gardenRecordLine(act3Boss.record).includes('요한 격파'));
 const lose=harvestFromRun({levels:{chain:2},wardens:0});assert.equal(lose.fragments,1);
 assert.ok(gardenRecordLine(rush.record).includes('맹공의 흔적'));
}

{
 let g=emptyGarden();
 g=addHarvest(g,{seeds:['reflect'],style:'rush',record:{law:'reflect',kills:80,score:1,style:'rush'}});
 g=addHarvest(g,{seeds:['reflect'],style:'agile',record:{law:'reflect',kills:20,score:1,style:'agile'}});
 assert.equal(g.plots[0].style,'rush');assert.equal(g.plots[0].branch,PLAY_STYLES.rush.branch);
 assert.equal(g.plots[1].style,'agile');assert.equal(g.plots[1].branch,'vine');
 assert.equal(g.traits.reflect,undefined);assert.equal(g.seeds.reflect,undefined);
 g=growPlants(g,STAGE_POINTS.bloom);assert.equal(stageOf(g.plots[0].growth),'bloom');
 assert.equal(plantName(g.plots[0]),SEEDS.reflect.branchNames.flower);
 assert.ok(plantSummary(g.plots[0]).includes('식물 자체는 전투 능력에 영향을 주지 않는다'));
 assert.equal(activePlants(g,6).length,2);
 g=uproot(g,1).garden;assert.equal(g.plots[1],null);
}

{
 let g=emptyGarden();
 for(let i=0;i<FRAGMENTS_PER_SEED;i++)g=addHarvest(g,{fragments:1,record:{law:'chain',kills:10,score:1,style:'agile'}});
 assert.equal(craftSeed(g,GUARDIAN).ok,false);assert.equal(craftSeed(g,FOUNDER).ok,false);
 assert.equal(g.fragments,0);assert.equal(g.plots[0].seed,'chain');assert.equal(g.plots[0].style,'agile');
}

{
 let g=addHarvest(emptyGarden(),{seeds:['reflect',GUARDIAN],style:'rush'});
 g=growPlants(g,99);
 const fx=gardenEffects(g);
 assert.deepEqual(fx.lawWeights,{});assert.deepEqual(fx.formGuides,[]);assert.deepEqual(fx.relicLaws,[]);assert.deepEqual(fx.mutationLaws,[]);
 assert.equal(fx.freshBonus,0);assert.equal(fx.guideCount,0);assert.equal(fx.austinEvery,5);assert.equal(fx.actives.length,2);
 assert.equal(activeSlots(g),PLOTS);
}

{
 const old=normalizeGarden({version:2,plots:[{seed:'split',growth:9,branch:'vine',active:true}],seeds:{reflect:1},harvests:5});
 assert.equal(old.plots[0].style,'agile');assert.equal(old.plots[0].active,false);assert.equal(old.version,6);
 const s=memory();assert.ok(writeGarden(s,old));assert.equal(readGarden(s).plots[0].style,'agile');
 assert.equal(readGarden(s).plots[1].seed,'reflect','옛 씨앗 상자의 씨앗도 빈 화단에 자동으로 심는다');
 s.setItem('seed-garden-v1','{깨진 json');assert.deepEqual(readGarden(s).plots,Array(PLOTS).fill(null));
}

{
 let g=emptyGarden();
 for(let i=0;i<MAX_RECORDS+3;i++)g=addHarvest(g,harvestFromRun({levels:{chain:i+1},wardens:1,kills:i+30,elapsed:120,journey:i+1}));
 assert.equal(g.records.length,MAX_RECORDS);
 assert.equal(centerStage(g)>=1,true);assert.ok(centerInfo(g).name);assert.equal(CENTER.some(x=>'slots' in x),false);
 g=growPlants(g,STAGE_POINTS.bloom);assert.ok(bloomedCount(g)>=1);
}

{
 const full=normalizeGarden({plots:[
  {seed:FOUNDER,growth:9,style:'balanced'},{seed:'reflect',growth:9,style:'rush'},
  {seed:'split',growth:2,style:'agile'},{seed:'chain',growth:4,style:'endure'},
  {seed:'orbit',growth:9,style:'rush'},{seed:'frost',growth:9,style:'endure'}
 ],seeds:{gravity:1},traits:{gravity:['agile']}});
 const planted=autoPlantSeeds(full);assert.equal(planted.plots[0].seed,FOUNDER,'창립 기념 식물은 자동 교체하지 않는다');
 assert.equal(planted.plots[2].seed,'gravity','새 흔적은 가장 덜 자란 일반 식물을 바꾼다');assert.deepEqual(planted.seeds,{});
}

for(const id of SEED_IDS)for(const branch of ['flower','tree','vine'])assert.ok(branchSummary(id,branch,'bloom').includes('전투 능력'));
assert.equal(objectJosa('메아리 씨앗'),'을');assert.deepEqual([wayJosa('반사'),wayJosa('관통')],['로','으로']);
assert.ok(harvestLine({seeds:['reflect'],fragments:0}).includes('정원에 자동으로 심었어요'));
assert.ok(harvestLine({seeds:[],fragments:1}).includes('조각 1개'));

// 모든 막 보스가 공통으로 쓰는 성장점은 매번 정확히 0.1%다. 능력별 5%만
// 제한하고, 예전의 전체 10% 합산 제한은 두지 않는다.
{
 let g=emptyGarden();const first=grantBossMastery(g,()=>0);g=first.garden;
 assert.equal(first.id,'power');assert.equal(gardenMastery(g).power,1.001);assert.ok(masteryLine(first).includes('+0.1%'));
 assert.equal(grantAustinMastery,grantBossMastery,'옛 오스틴 호출 이름은 같은 공통 보상을 가리킨다');
 for(let i=1;i<MASTERY_STAT_CAP;i++)g=grantAustinMastery(g,()=>0).garden;
 assert.equal(g.mastery.power,MASTERY_STAT_CAP);
 // 가득 찬 공격력은 후보에서 빠지고 다음 능력으로 넘어간다.
 g=grantAustinMastery(g,()=>0).garden;assert.equal(g.mastery.move,1);
 for(let i=0;i<300;i++)g=grantAustinMastery(g,()=>0).garden;
 const capped=gardenMastery(g);assert.equal(capped.total,MASTERY_STAT_CAP*5);
 for(const points of Object.values(capped.points))assert.equal(points,MASTERY_STAT_CAP);
 assert.equal(grantAustinMastery(g,()=>0).granted,false);
 assert.equal(bossGardenMilestones(g).next,0);
}

// 저장을 늘리지 않는 보스 기념 식물: 5회마다 꽃, 네 번째 기념은 열매다.
{
 let g=emptyGarden();
 for(let i=0;i<BOSS_BLOOM_EVERY-1;i++)g=grantBossMastery(g,()=>i/10).garden;
 assert.deepEqual(bossGardenMilestones(g),{defeats:4,earned:0,flowers:0,fruits:0,next:1});
 const flower=grantBossMastery(g,()=>.4);g=flower.garden;
 assert.equal(flower.milestone.type,'flower');assert.ok(masteryLine(flower).includes('기억꽃'));
 for(let i=5;i<BOSS_BLOOM_EVERY*BOSS_FRUIT_EVERY-1;i++)g=grantBossMastery(g,()=>i/100).garden;
 const fruit=grantBossMastery(g,()=>.9);g=fruit.garden;
 assert.equal(fruit.milestone.type,'fruit');assert.ok(masteryLine(fruit).includes('황금 열매'));
 assert.deepEqual(bossGardenMilestones(g),{defeats:20,earned:4,flowers:3,fruits:1,next:5});
}

console.log('정원: 자동 심기·전 막 보스 0.1% 성장·옛 저장 이관·저장 통과');
