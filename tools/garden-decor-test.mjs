import assert from 'node:assert/strict';
import {DECOR,DECOR_AREAS,DECOR_BY_ID,DECOR_TOTAL_COST,normalizeDecor,decorSpent,decorAreaIndex,decorTasks,decorStars,canDecorate,decorate,decorScene} from '../src/garden-decor.js';
import {normalizeGarden,emptyGarden,readGarden,writeGarden,GARDEN_KEY} from '../src/garden.js';
import {mergeGardenProgress} from '../src/cloud-save.js';

// 기존 18개를 그대로 이어서 네 구역을 더한다. 구역마다 여섯 가지라 기존 화면 진행 표시와도 맞는다.
assert.equal(DECOR_AREAS.length,7);assert.equal(DECOR.length,42);for(const a of DECOR_AREAS)assert.equal(DECOR.filter(d=>d.area===a.id).length,6,a.id);
const legacyIds=['gateBush','gateBush2','gateLanterns','gateFireflies','gateVine','gateVine2','courtLily','courtLily2','courtGear','courtLanterns','courtTrees','courtBuds','treeViolets','treeCrystal','treeCrystal2','treeLanterns','treeFireflies','treePetals'];
assert.deepEqual(DECOR.slice(0,18).map(d=>d.id),legacyIds);
assert.deepEqual(DECOR.slice(0,18).map(d=>d.cost),[1,1,2,2,2,2,2,2,2,3,3,2,2,3,3,2,3,4]);
assert.deepEqual(DECOR_AREAS.slice(0,3).map(a=>[a.id,a.reward]),[['gate',150],['court',250],['tree',400]]);
assert.equal(new Set(DECOR.map(d=>d.id)).size,DECOR.length);assert.equal(new Set(DECOR.map(d=>d.name)).size,DECOR.length);
const beds=[[621/1600,331/900],[1003/1600,325/900],[526/1600,488/900],[1076/1600,486/900],[652/1600,618/900],[952/1600,618/900],[.5,453/900]];
for(const d of DECOR){assert.ok(d.cost>=1&&d.cost<=4,d.id);assert.ok(d.items.length||d.fireflies||d.petals,`${d.id} shows something`);
 for(const it of d.items){assert.ok(it.u>0&&it.u<1&&it.v>0&&it.v<1,d.id);if(it.kind==='plant'||it.kind==='prop')assert.ok(it.tile>=0&&it.tile<12);
  for(const [u,v] of beds)assert.ok(Math.hypot((it.u-u)*16/9,it.v-v)>.07,`${d.id} keeps clear of the beds`);}}
assert.equal(DECOR_TOTAL_COST,decorSpent(DECOR.map(d=>d.id)));
assert.ok(DECOR_TOTAL_COST<=150,'all garden tasks fit the existing fifty-stage three-star budget');

// 앞 구역을 다 꾸며야 다음 구역이 열린다. 별이 모자라면 못 꾸민다. 구역을 다 꾸미면 보상할 구역을 알려 준다.
{let list=[];assert.equal(decorAreaIndex(list),0);assert.deepEqual(decorTasks(list).map(t=>t.area),Array(6).fill('gate'));
 assert.equal(canDecorate(list,'courtLily',99),false,'next area is locked');assert.equal(canDecorate(list,'gateBush',0),false,'needs stars');
 let earned=0,done=null;
 for(const t of decorTasks(list)){earned+=t.cost;const r=decorate(list,t.id,earned);assert.ok(r.ok,t.id);list=r.list;if(r.area)done=r.area;assert.equal(decorStars(earned,list),0);}
 assert.equal(done.id,'gate');assert.equal(done.reward,DECOR_AREAS[0].reward);assert.equal(decorAreaIndex(list),1);
 assert.equal(decorate(list,'gateBush',99).ok,false,'no double buy');
 const all=DECOR.map(d=>d.id);assert.equal(decorAreaIndex(all),-1);assert.deepEqual(decorTasks(all),[]);}
// 이미 원래 정원을 완성한 계정은 지출·보상 변경 없이 물가가 열린다.
{const restored=normalizeDecor([...legacyIds,'gateBush','unknown']);assert.deepEqual(restored,legacyIds);
 assert.equal(decorSpent(restored),41);assert.equal(decorAreaIndex(restored),3);assert.equal(decorTasks(restored)[0].id,'watersidePond');
 assert.equal(decorate(restored,'treePetals',150).area,null,'a completed legacy area cannot pay twice');
 assert.equal(canDecorate(restored,'restBench',150),false,'new areas still unlock in order');
 assert.equal(canDecorate(restored,'watersidePond',decorSpent(restored)+3),false,'new props use the same earned-star wallet');
 assert.equal(canDecorate(restored,'watersidePond',decorSpent(restored)+4),true);}
// 모든 구역을 순서대로 사면 지갑은 실제 비용만큼 줄고, 각 보상은 마지막 할 일에서 한 번만 나온다.
{let list=[];const rewards=[];
 for(const a of DECOR_AREAS){for(const t of decorTasks(list)){
  const before=decorStars(150,list),r=decorate(list,t.id,150);assert.equal(r.ok,true);assert.equal(decorStars(150,r.list),before-t.cost);
  if(r.area)rewards.push([r.area.id,r.area.reward]);assert.equal(decorate(r.list,t.id,150).area,null);list=r.list;
 }assert.equal(rewards.at(-1)[0],a.id);}
 assert.deepEqual(rewards,DECOR_AREAS.map(a=>[a.id,a.reward]));assert.equal(list.length,42);}
// 저장 값 정리와 그리기 목록.
{assert.deepEqual(normalizeDecor(['gateBush','nope','gateBush',3,'treePetals']),['gateBush','treePetals']);assert.deepEqual(normalizeDecor('x'),[]);
 const sc=decorScene(['gateBush','gateFireflies','treeFireflies','treePetals','courtLanterns']);assert.equal(sc.fireflies,28);assert.equal(sc.petals,true);assert.equal(sc.items.filter(i=>i.kind==='lantern').length,4);}
{const sc=decorScene(DECOR.map(d=>d.id));assert.equal(sc.fireflies,36);assert.equal(sc.petals,true);
 assert.equal(sc.items.filter(i=>i.kind==='prop').length,12);assert.equal(sc.count,42);
 const duplicate=decorScene([...DECOR.map(d=>d.id),...DECOR.map(d=>d.id)]);assert.deepEqual(duplicate,sc,'duplicate cloud entries never duplicate art or ambience');
 sc.items[0].u=0;assert.notEqual(decorScene(DECOR.map(d=>d.id)).items[0].u,0,'scene output cannot mutate saved catalog anchors');}

// 정원 저장: 꾸민 것과 모은 별이 남고, 두 기기를 합치면 꾸민 것은 합쳐지고 별은 큰 쪽.
{assert.deepEqual(emptyGarden().decor,[]);assert.equal(emptyGarden().puzzleStars,0);
 const g=normalizeGarden({decor:['gateBush','bad'],puzzleStars:12});assert.deepEqual(g.decor,['gateBush']);assert.equal(g.puzzleStars,12);
 assert.equal(normalizeGarden({puzzleStars:-4}).puzzleStars,0);
 const mem=new Map(),st={getItem:k=>mem.get(k)??null,setItem:(k,v)=>mem.set(k,v)};assert.ok(writeGarden(st,g));assert.deepEqual(readGarden(st).decor,['gateBush']);assert.ok(mem.has(GARDEN_KEY));
 const merged=mergeGardenProgress({decor:['gateBush','gateBush2'],puzzleStars:5},{decor:['gateBush','gateLanterns'],puzzleStars:9},{prefer:'remote'});
 assert.deepEqual([...merged.decor].sort(),['gateBush','gateBush2','gateLanterns']);assert.equal(merged.puzzleStars,9);}
{const local={decor:[...legacyIds,'watersidePond'],puzzleStars:49},remote={decor:[...legacyIds,'watersideBirdbath'],puzzleStars:52};
 for(const prefer of ['local','remote']){const merged=mergeGardenProgress(local,remote,{prefer});assert.equal(merged.puzzleStars,52);
 assert.ok(merged.decor.includes('watersidePond')&&merged.decor.includes('watersideBirdbath'));
 const memory=new Map(),store={getItem:k=>memory.get(k)??null,setItem:(k,v)=>memory.set(k,v)};assert.ok(writeGarden(store,merged));
 const restored=readGarden(store);assert.deepEqual(restored.decor,merged.decor);assert.equal(restored.puzzleStars,52);assert.equal(decorAreaIndex(restored.decor),3);}}
console.log('garden decor ok');
