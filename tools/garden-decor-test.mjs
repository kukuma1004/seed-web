import assert from 'node:assert/strict';
import {DECOR,DECOR_AREAS,DECOR_BY_ID,DECOR_TOTAL_COST,normalizeDecor,decorSpent,decorAreaIndex,decorTasks,decorStars,canDecorate,decorate,decorScene} from '../src/garden-decor.js';
import {normalizeGarden,emptyGarden,readGarden,writeGarden,GARDEN_KEY} from '../src/garden.js';
import {mergeGardenProgress} from '../src/cloud-save.js';

// 목록: 구역 셋 × 여섯, 이름이 겹치지 않고, 모든 자리가 그림 안(0~1)에 있으며 화단·가운데 메달리온을 덮지 않는다.
assert.equal(DECOR_AREAS.length,3);for(const a of DECOR_AREAS)assert.equal(DECOR.filter(d=>d.area===a.id).length,6,a.id);
assert.equal(new Set(DECOR.map(d=>d.id)).size,DECOR.length);assert.equal(new Set(DECOR.map(d=>d.name)).size,DECOR.length);
const beds=[[621/1600,331/900],[1003/1600,325/900],[526/1600,488/900],[1076/1600,486/900],[652/1600,618/900],[952/1600,618/900],[.5,453/900]];
for(const d of DECOR){assert.ok(d.cost>=1&&d.cost<=4,d.id);assert.ok(d.items.length||d.fireflies||d.petals,`${d.id} shows something`);
 for(const it of d.items){assert.ok(it.u>0&&it.u<1&&it.v>0&&it.v<1,d.id);if(it.kind==='plant')assert.ok(it.tile>=0&&it.tile<12);
  for(const [u,v] of beds)assert.ok(Math.hypot((it.u-u)*16/9,it.v-v)>.07,`${d.id} keeps clear of the beds`);}}
assert.equal(DECOR_TOTAL_COST,decorSpent(DECOR.map(d=>d.id)));

// 앞 구역을 다 꾸며야 다음 구역이 열린다. 별이 모자라면 못 꾸민다. 구역을 다 꾸미면 보상할 구역을 알려 준다.
{let list=[];assert.equal(decorAreaIndex(list),0);assert.deepEqual(decorTasks(list).map(t=>t.area),Array(6).fill('gate'));
 assert.equal(canDecorate(list,'courtLily',99),false,'next area is locked');assert.equal(canDecorate(list,'gateBush',0),false,'needs stars');
 let earned=0,done=null;
 for(const t of decorTasks(list)){earned+=t.cost;const r=decorate(list,t.id,earned);assert.ok(r.ok,t.id);list=r.list;if(r.area)done=r.area;assert.equal(decorStars(earned,list),0);}
 assert.equal(done.id,'gate');assert.equal(done.reward,DECOR_AREAS[0].reward);assert.equal(decorAreaIndex(list),1);
 assert.equal(decorate(list,'gateBush',99).ok,false,'no double buy');
 const all=DECOR.map(d=>d.id);assert.equal(decorAreaIndex(all),-1);assert.deepEqual(decorTasks(all),[]);}
// 저장 값 정리와 그리기 목록.
{assert.deepEqual(normalizeDecor(['gateBush','nope','gateBush',3,'treePetals']),['gateBush','treePetals']);assert.deepEqual(normalizeDecor('x'),[]);
 const sc=decorScene(['gateBush','gateFireflies','treeFireflies','treePetals','courtLanterns']);assert.equal(sc.fireflies,28);assert.equal(sc.petals,true);assert.equal(sc.items.filter(i=>i.kind==='lantern').length,4);}

// 정원 저장: 꾸민 것과 모은 별이 남고, 두 기기를 합치면 꾸민 것은 합쳐지고 별은 큰 쪽.
{assert.deepEqual(emptyGarden().decor,[]);assert.equal(emptyGarden().puzzleStars,0);
 const g=normalizeGarden({decor:['gateBush','bad'],puzzleStars:12});assert.deepEqual(g.decor,['gateBush']);assert.equal(g.puzzleStars,12);
 assert.equal(normalizeGarden({puzzleStars:-4}).puzzleStars,0);
 const mem=new Map(),st={getItem:k=>mem.get(k)??null,setItem:(k,v)=>mem.set(k,v)};assert.ok(writeGarden(st,g));assert.deepEqual(readGarden(st).decor,['gateBush']);assert.ok(mem.has(GARDEN_KEY));
 const merged=mergeGardenProgress({decor:['gateBush','gateBush2'],puzzleStars:5},{decor:['gateBush','gateLanterns'],puzzleStars:9},{prefer:'remote'});
 assert.deepEqual([...merged.decor].sort(),['gateBush','gateBush2','gateLanterns']);assert.equal(merged.puzzleStars,9);}
console.log('garden decor ok');
