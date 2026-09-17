import assert from 'node:assert/strict';
import {SEEDS,SEED_IDS,GUARDIAN,PLOTS,ACTIVE_SLOTS,FRAGMENTS_PER_SEED,MAX_RECORDS,STAGE_POINTS,
 stageOf,nextStagePoints,emptyGarden,normalizeGarden,readGarden,writeGarden,
 harvestFromRun,addHarvest,craftSeed,plantSeed,uproot,chooseBranch,setActive,growPlants,
 activePlants,plantName,plantSummary,branchSummary,gardenEffects,dominantLaw,harvestLine,gardenRecordLine,objectJosa,wayJosa,
 CENTER,MAX_ACTIVE_SLOTS,centerStage,centerInfo,activeSlots,bloomedCount} from '../src/garden.js';
import {LAWS} from '../src/laws.js';
import {GARDEN_GROWTH_ART,growthArtTile,centerArtTile} from '../src/garden-scene.js';

assert.ok(GARDEN_GROWTH_ART.endsWith('.webp'));
assert.deepEqual([
 growthArtTile(0),growthArtTile(1),growthArtTile(4),growthArtTile(4,'flower'),growthArtTile(4,'tree'),growthArtTile(4,'vine'),
 growthArtTile(9,'flower'),growthArtTile(9,'tree'),growthArtTile(9,'vine')
],[0,1,3,4,6,8,5,7,9]);
assert.deepEqual([0,1,2,3,4,5].map(centerArtTile),[null,0,2,10,7,11]);

const memory=()=>{const d=new Map();return {getItem:k=>d.has(k)?d.get(k):null,setItem:(k,v)=>d.set(k,String(v)),d};};
const grow=(g,n)=>growPlants(g,n);

// 씨앗 목록: 법칙 아홉 + 시계탑, 모두 이름과 세 갈래를 갖는다.
assert.equal(SEED_IDS.length,Object.keys(LAWS).length+1);
for(const id of SEED_IDS){
 const s=SEEDS[id];
 assert.ok(s.name&&s.hint,`${id} 이름/설명`);
 assert.deepEqual(Object.keys(s.branchNames).sort(),['flower','tree','vine']);
 for(const b of ['flower','tree','vine'])assert.ok(s.branchNames[b].length>=2,`${id}/${b} 갈래 이름`);
 assert.ok(id===GUARDIAN?s.law===null:Object.hasOwn(LAWS,s.law));
}

// 성장 단계는 성장점으로만 결정된다.
assert.equal(stageOf(0),'seed');assert.equal(stageOf(1),'sprout');assert.equal(stageOf(3),'sprout');
assert.equal(stageOf(4),'mature');assert.equal(stageOf(9),'bloom');assert.equal(stageOf(50),'bloom');
assert.equal(nextStagePoints(0),1);assert.equal(nextStagePoints(4),STAGE_POINTS.bloom-4);assert.equal(nextStagePoints(9),0);

// 여정 결과 → 수확: 가장 깊게 키운 법칙, 문지기를 넘어야 완성 씨앗, 오스틴은 시계탑 씨앗.
{
 assert.equal(dominantLaw({reflect:3,split:5,chain:2}),'split');
 assert.equal(dominantLaw({}),null);
 const win=harvestFromRun({levels:{reflect:6,chain:3},wardens:2,austins:0});
 assert.deepEqual(win.seeds,['reflect']);assert.equal(win.fragments,0);assert.equal(win.growth,3);
 const lose=harvestFromRun({levels:{chain:2},wardens:0,austins:0});
 assert.deepEqual(lose.seeds,[]);assert.equal(lose.fragments,1,'실패해도 조각은 남는다');assert.equal(lose.growth,1);
 const boss=harvestFromRun({levels:{frost:4},wardens:5,austins:1});
 assert.deepEqual(boss.seeds,[GUARDIAN,'frost']);assert.equal(boss.growth,1+5+2);
 assert.deepEqual(harvestFromRun({levels:{},wardens:3}).seeds,[],'법칙이 없으면 씨앗도 없다');
 const recorded=harvestFromRun({levels:{gravity:8},forms:{collapse:6,thunderlance:9},wardens:5,austins:1,score:12345,kills:321,journey:6});
 assert.equal(recorded.record.law,'gravity');assert.ok(recorded.record.forms.some(f=>f.id==='thunderlance'));assert.equal(recorded.record.rare,false);
 assert.ok(!gardenRecordLine(recorded.record).includes('희귀 재융합'),'재융합을 숨긴 동안에는 희귀 표시가 없다');
}

// 조각 세 개로 원하는 씨앗을 만든다. 시계탑 씨앗은 못 만든다.
{
 let g=emptyGarden();
 for(let i=0;i<FRAGMENTS_PER_SEED;i++)g=addHarvest(g,{fragments:1});
 assert.equal(g.fragments,FRAGMENTS_PER_SEED);assert.equal(g.harvests,FRAGMENTS_PER_SEED);
 assert.equal(craftSeed(g,GUARDIAN).ok,false);
 const made=craftSeed(g,'chain');assert.ok(made.ok);assert.equal(made.garden.seeds.chain,1);assert.equal(made.garden.fragments,0);
 assert.equal(craftSeed(made.garden,'chain').ok,false,'조각이 모자라면 못 만든다');
}

// 최근 던전 빌드는 정원에 작은 흔적으로 남고, 저장 크기를 위해 12개까지만 보관한다.
{
 let g=emptyGarden();
 for(let i=0;i<MAX_RECORDS+5;i++)g=addHarvest(g,harvestFromRun({levels:{chain:i+1},forms:{thunderlance:i+1},wardens:1,score:i*100,kills:i,journey:i+1}));
 assert.equal(g.records.length,MAX_RECORDS);assert.equal(g.records[0].journey,MAX_RECORDS+5);assert.equal(g.records.at(-1).journey,6);
 const back=normalizeGarden({...g,records:[{law:'nope',forms:[{id:'bad',level:2}]},...g.records]});
 assert.equal(back.records.length,MAX_RECORDS);assert.ok(back.records.every(r=>r.law==='chain'&&r.forms[0].id==='thunderlance'));
}

// 심기 → 자라기 → 갈래 고르기 → 활성 슬롯
{
 let g=addHarvest(emptyGarden(),{seeds:['reflect','split','chain','frost']});
 assert.equal(plantSeed(g,'reflect',PLOTS).ok,false,'없는 칸');
 let r=plantSeed(g,'reflect',0);assert.ok(r.ok);g=r.garden;
 assert.equal(g.seeds.reflect,undefined,'심으면 보관함에서 빠진다');
 assert.equal(plantSeed(g,'split',0).ok,false,'이미 찬 칸');
 assert.equal(chooseBranch(g,0,'flower').ok,false,'덜 자랐으면 갈래를 못 고른다');
 assert.equal(setActive(g,0,true).ok,false,'덜 자란 식물은 활성이 안 된다');
 g=grow(g,STAGE_POINTS.mature);
 assert.equal(stageOf(g.plots[0].growth),'mature');
 assert.equal(chooseBranch(g,0,'nope').ok,false);
 g=chooseBranch(g,0,'flower').garden;
 assert.equal(chooseBranch(g,0,'tree').ok,false,'갈래는 한 번만');
 assert.equal(plantName(g.plots[0]),SEEDS.reflect.branchNames.flower);
 g=setActive(g,0,true).garden;
 assert.equal(activePlants(g).length,1);
 // 활성 슬롯은 세 칸까지
 for(const [i,id] of [[1,'split'],[2,'chain'],[3,'frost']]){
  g=plantSeed(g,id,i).garden;g=grow(g,STAGE_POINTS.mature);g=chooseBranch(g,i,'flower').garden;
 }
 for(const i of [1,2])g=setActive(g,i,true).garden;
 assert.equal(activePlants(g).length,ACTIVE_SLOTS);
 assert.equal(setActive(g,3,true).ok,false,'슬롯이 가득 차면 더 못 켠다');
 g=setActive(g,0,false).garden;g=setActive(g,3,true).garden;
 assert.equal(activePlants(g).map(p=>p.index).join(','),'1,2,3');
 // 뽑으면 칸이 비고 씨앗은 돌아오지 않는다
 const before=g.plots[3].seed;
 g=uproot(g,3).garden;
 assert.equal(g.plots[3],null);assert.equal(g.seeds[before],undefined);
 assert.equal(uproot(g,3).ok,false);
}

// 효과: 힘이 아니라 무엇이 나타나는지를 바꾼다. 개화하면 더 세진다.
{
 let g=addHarvest(emptyGarden(),{seeds:['reflect','chain',GUARDIAN]});
 g=plantSeed(g,'reflect',0).garden;g=plantSeed(g,'chain',1).garden;g=plantSeed(g,GUARDIAN,2).garden;
 g=grow(g,STAGE_POINTS.mature);
 g=chooseBranch(g,0,'flower').garden;g=chooseBranch(g,1,'tree').garden;g=chooseBranch(g,2,'vine').garden;
 for(const i of [0,1,2])g=setActive(g,i,true).garden;
 const e=gardenEffects(g);
 assert.ok(e.lawWeights.reflect>1,'꽃은 그 법칙을 자주 보이게 한다');
 assert.deepEqual(e.formGuides,['chain'],'나무는 조합 목표를 알려 준다');
 assert.equal(e.austinEvery,5,'자란 초침덩굴은 아직 그대로');
 assert.equal(e.actives.length,3);
 assert.ok(e.actives.every(a=>a.summary.length>5));
 const bloomed=gardenEffects(grow(g,STAGE_POINTS.bloom));
 assert.ok(bloomed.lawWeights.reflect>e.lawWeights.reflect,'개화하면 더 강해진다');
 assert.equal(bloomed.austinEvery,4,'개화한 초침덩굴은 오스틴을 더 빨리 부른다');
 // 덩굴(유물)과 시계탑 꽃/나무
 let h=addHarvest(emptyGarden(),{seeds:['frost',GUARDIAN,GUARDIAN]});
 h=plantSeed(h,'frost',0).garden;h=plantSeed(h,GUARDIAN,1).garden;h=plantSeed(h,GUARDIAN,2).garden;
 h=grow(h,STAGE_POINTS.bloom);
 h=chooseBranch(h,0,'vine').garden;h=chooseBranch(h,1,'flower').garden;h=chooseBranch(h,2,'tree').garden;
 for(const i of [0,1,2])h=setActive(h,i,true).garden;
 const f=gardenEffects(h);
 assert.deepEqual(f.relicLaws,['frost']);assert.equal(f.freshBonus,2);assert.equal(f.guideCount,2);
 assert.equal(gardenEffects(emptyGarden()).actives.length,0);
}

// 저장: 이상한 값은 걸러내고, 활성 칸 수를 넘겨 저장해도 규칙대로 줄어든다.
{
 const s=memory();
 let g=addHarvest(emptyGarden(),{seeds:['reflect']});
 g=plantSeed(g,'reflect',0).garden;g=grow(g,STAGE_POINTS.bloom);g=chooseBranch(g,0,'flower').garden;g=setActive(g,0,true).garden;
 assert.ok(writeGarden(s,g));
 const back=readGarden(s);
 assert.equal(back.plots[0].seed,'reflect');assert.equal(back.plots[0].active,true);
 s.setItem('seed-garden-v1','{깨진 json');
 assert.deepEqual(readGarden(s).plots,Array(PLOTS).fill(null));
 const dirty=normalizeGarden({plots:[{seed:'없는씨앗',growth:5,active:true},{seed:'chain',growth:-3,branch:'flower',active:true},
  {seed:'split',growth:99,branch:'tree',active:true},{seed:'frost',growth:99,branch:'vine',active:true},{seed:'orbit',growth:99,branch:'vine',active:true}],
  seeds:{reflect:2,없는거:5,chain:0},fragments:-2,harvests:'x'});
 assert.equal(dirty.plots[0],null,'모르는 씨앗은 버린다');
 assert.equal(dirty.plots[1].active,false,'덜 자란 식물은 활성이 꺼진다');
 assert.equal(activePlants(dirty).length,ACTIVE_SLOTS,'활성은 세 칸까지만 남는다');
 assert.deepEqual(dirty.seeds,{reflect:2});assert.equal(dirty.fragments,0);assert.equal(dirty.harvests,0);
 const broken={getItem(){throw new Error('막힘');},setItem(){throw new Error('막힘');}};
 assert.deepEqual(readGarden(broken).plots,Array(PLOTS).fill(null));
 assert.equal(writeGarden(broken,emptyGarden()),false);
 assert.deepEqual(readGarden(null).plots,Array(PLOTS).fill(null));
}

// 정원 한가운데: 여정을 다녀오고 꽃이 피면 조금씩 드러나고, 거대한 나무가 되면 칸이 하나 는다.
{
 let g=emptyGarden();
 assert.equal(centerStage(g),0);assert.equal(centerInfo(g).name,'???');assert.ok(centerInfo(g).hint.includes('여정'));
 assert.equal(activeSlots(g),ACTIVE_SLOTS);
 g={...g,harvests:3};assert.equal(centerInfo(g).name,'잠든 씨앗');
 g={...g,harvests:8};assert.equal(centerInfo(g).name,'뻗은 뿌리');
 // 개화한 식물이 있어야 다음 단계로 간다
 g=addHarvest({...g,harvests:14},{seeds:['reflect','split','chain']});
 g=plantSeed(g,'reflect',0).garden;
 assert.equal(centerInfo(g).name,'뻗은 뿌리','수확만으로는 고목이 되지 않는다');
 g=growPlants(g,STAGE_POINTS.bloom);
 assert.equal(bloomedCount(g),1);assert.equal(centerInfo(g).name,'고목');
 g=plantSeed({...g,harvests:20},'split',1).garden;g=growPlants(g,STAGE_POINTS.bloom);
 assert.equal(centerInfo(g).name,'거대한 나무');
 assert.equal(activeSlots(g),ACTIVE_SLOTS+1,'거대한 나무가 칸을 하나 늘린다');
 // 마지막 단계는 오스틴을 이겨야 한다
 g=plantSeed({...g,harvests:28},'chain',2).garden;g=growPlants(g,STAGE_POINTS.bloom);
 assert.equal(centerInfo(g).name,'거대한 나무');
 assert.equal(centerInfo(g,{austinDefeated:true}).name,'깨어난 나무');
 assert.equal(centerInfo(g,{austinDefeated:true}).hint,'정원이 끝까지 깨어났다');
 assert.ok(activeSlots(g,{austinDefeated:true})<=MAX_ACTIVE_SLOTS,'칸은 최대치를 넘지 않는다');
 // 늘어난 칸만큼만 데려갈 수 있다
 let h=addHarvest(emptyGarden(),{seeds:['reflect','split','chain','frost']});
 for(const [i,id] of [[0,'reflect'],[1,'split'],[2,'chain'],[3,'frost']]){h=plantSeed(h,id,i).garden;}
 h=growPlants(h,STAGE_POINTS.mature);
 for(const i of [0,1,2,3])h=chooseBranch(h,i,'flower').garden;
 for(const i of [0,1,2])h=setActive(h,i,true,3).garden;
 assert.equal(setActive(h,3,true,3).ok,false,'세 칸일 때는 네 번째를 못 켠다');
 h=setActive(h,3,true,4).garden;
 assert.equal(activePlants(h,4).length,4,'네 칸이면 네 번째도 켤 수 있다');
 assert.equal(gardenEffects(h,3).actives.length,3,'효과는 정해진 칸 수만 쓴다');
 assert.equal(CENTER.length,6);
 for(const step of CENTER)assert.ok(step.name&&step.line.length>8&&step.glyph,'중앙 단계 문구');
}

// 화면에 쓰는 문구가 비어 있지 않다.
for(const id of SEED_IDS)for(const b of ['flower','tree','vine'])for(const stage of ['mature','bloom'])
 assert.ok(branchSummary(id,b,stage).length>5,`${id}/${b}/${stage} 설명`);
assert.equal(branchSummary('reflect','nope'),'');
assert.ok(plantSummary({seed:'reflect',growth:0}).includes('다음 단계까지'));
assert.ok(plantSummary({seed:'reflect',growth:4}).includes('갈래'));

// 여정 끝 한 줄: 받침에 맞는 조사를 쓴다.
assert.equal(objectJosa('메아리 씨앗'),'을');
assert.deepEqual([wayJosa('반사'),wayJosa('분열'),wayJosa('연쇄'),wayJosa('관통')],['로','로','로','으로']);
assert.ok(branchSummary('split','tree').startsWith('분열로 만드는'));assert.equal(objectJosa('번개꽃'),'을');assert.equal(objectJosa('나무'),'를');
assert.ok(harvestLine({seeds:['reflect'],fragments:0}).includes('메아리 씨앗을 얻었어요'));
assert.ok(harvestLine({seeds:[GUARDIAN,'split'],fragments:0}).includes('시계탑 씨앗 · 쌍생 씨앗을 얻었어요'));
assert.ok(harvestLine({seeds:[],fragments:1}).includes('조각 1개'));
assert.ok(harvestLine({seeds:[],fragments:0}).includes('남지 않았어요'));
assert.equal(harvestLine(null),'');

// 정원 효과가 실제 선택지와 유물에 반영된다.
{
 const {offerChoices}=await import('../src/progression.js');
 const {relicOffers,emptyRelics}=await import('../src/relics.js');
 let g=addHarvest(emptyGarden(),{seeds:['chain']});
 g=plantSeed(g,'chain',0).garden;g=growPlants(g,STAGE_POINTS.bloom);g=chooseBranch(g,0,'flower').garden;g=setActive(g,0,true).garden;
 const weights=gardenEffects(g).lawWeights;
 let withGarden=0,without=0;
 for(let i=0;i<400;i++){
  const seed=(i*2654435761)%4294967296;let x=seed;
  const random=()=>{x=(x*1103515245+12345)%2147483648;return x/2147483648;};
  if(offerChoices(new Map(),{random,weights}).includes('chain'))withGarden++;
  let y=seed;const plain=()=>{y=(y*1103515245+12345)%2147483648;return y/2147483648;};
  if(offerChoices(new Map(),{random:plain}).includes('chain'))without++;
 }
 assert.ok(withGarden>without,`번개꽃이 연쇄를 더 자주 보이게 한다 (${withGarden} > ${without})`);
 assert.ok(without>0&&withGarden<400,'가중치가 있어도 다른 법칙이 사라지지는 않는다');
 // 덩굴은 그 법칙의 유물을 앞에 놓는다.
 let v=addHarvest(emptyGarden(),{seeds:['gravity']});
 v=plantSeed(v,'gravity',0).garden;v=growPlants(v,STAGE_POINTS.mature);v=chooseBranch(v,0,'vine').garden;v=setActive(v,0,true).garden;
 const laws=gardenEffects(v).relicLaws;
 let first=0;
 for(let i=0;i<50;i++){let x=i*7919;const random=()=>{x=(x*1103515245+12345)%2147483648;return x/2147483648;};
  if(relicOffers(emptyRelics(),random,laws)[0]==='core')first++;}
 assert.equal(first,50,'중력 유물이 항상 먼저 보인다');
 // 새 법칙 보너스: 시계탑 꽃이 있으면 이미 법칙을 가진 뒤에도 새 법칙이 더 보인다.
 let c=addHarvest(emptyGarden(),{seeds:[GUARDIAN]});
 c=plantSeed(c,GUARDIAN,0).garden;c=growPlants(c,STAGE_POINTS.bloom);c=chooseBranch(c,0,'flower').garden;c=setActive(c,0,true).garden;
 const fx=gardenEffects(c);
 const held=new Map([['reflect',2],['split',2],['chain',2]]);
 const fresh=offerChoices(held,{random:()=>.5,freshBonus:fx.freshBonus}).filter(id=>!held.has(id)&&!String(id).startsWith('form:'));
 const plainFresh=offerChoices(held,{random:()=>.5}).filter(id=>!held.has(id)&&!String(id).startsWith('form:'));
 assert.ok(fresh.length>plainFresh.length,'태엽꽃은 새 법칙을 더 보여 준다');
}

console.log('정원: 씨앗 수확·조각·심기·성장·갈래·활성 슬롯·효과·저장 정리·선택지 반영 통과');
