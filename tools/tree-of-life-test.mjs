// 생명의 나무 v2 규칙: 씨앗 등급·보상·조각·심기·물 주기·세계수·옮기기·합치기.
import assert from 'node:assert/strict';
import {TREE_SEEDS,TREE_SEED_IDS,TREE_PLOTS,emptyTree,normalizeTree,rollTreeReward,craftTreeSeed,plantTreeSeed,clearTreePlot,waterTree,plotStage,migrateTree,mergeTree} from '../src/tree-of-life.js';
const by=r=>TREE_SEED_IDS.filter(id=>TREE_SEEDS[id].rarity===r);
assert.equal(by('common').length,9);assert.ok(by('rare').length>=10);assert.deepEqual(by('legend').sort(),['alwaysbeginner','clocktower','founder','tempestcarrier','worldtree']);
const lo=()=>0,hi=()=>.99;
// 1막 보스 첫 격파는 보장(가장 키운 법칙), 두 번째부터는 25%.
let t=emptyTree();let r=rollTreeReward(t,{type:'boss',boss:'austin',act:1,law:'frost'},hi);t=r.tree;assert.deepEqual(t.bag,{frost:1});
r=rollTreeReward(t,{type:'boss',boss:'austin',act:1,law:'chain'},hi);assert.deepEqual(r.notes,[],'no drop when unlucky');
r=rollTreeReward(t,{type:'boss',boss:'austin',act:1,law:'frost'},lo);t=r.tree;assert.equal(t.shards.common,1,'duplicate becomes a shard');
// 전설: 노히트 또는 10번 격파. 겹치면 아무것도 없다.
r=rollTreeReward(t,{type:'boss',boss:'austin',act:1,noHit:true,law:'frost'},hi);t=r.tree;assert.equal(t.bag.clocktower,1);
assert.equal(rollTreeReward(t,{type:'boss',boss:'austin',act:1,wins:12,law:'frost'},hi).tree.bag.clocktower,1);
// 희귀: 2·3막 최종 보스 8%, 퍼즐 50단계 첫 ★★★, 수호전 30물결.
assert.ok(rollTreeReward(emptyTree(),{type:'boss',boss:'tempestcarrier',act:3,final:true,law:'orbit'},lo).notes.some(n=>n.rarity==='rare'));
assert.ok(rollTreeReward(emptyTree(),{type:'puzzle',stage:50,stars:3,firstThree:true},lo).notes.some(n=>n.rarity==='rare'));
assert.equal(rollTreeReward(emptyTree(),{type:'puzzle',stage:50,stars:2,firstThree:true},lo).notes.length,0);
assert.ok(rollTreeReward(emptyTree(),{type:'puzzle',stage:30,stars:3,firstThree:true},lo).notes.some(n=>n.rarity==='common'));
let d=rollTreeReward(emptyTree(),{type:'defense',wave:30},lo);assert.ok(d.notes.length);assert.equal(rollTreeReward(d.tree,{type:'defense',wave:35},lo).notes.length,0,'once per 10 waves');
// 조각으로 만들기.
t.shards.common=5;let c=craftTreeSeed(t,'chain');assert.ok(c.ok);assert.equal(c.tree.shards.common,0);assert.equal(craftTreeSeed(c.tree,'chain').reason,'shards');assert.equal(craftTreeSeed(c.tree,'clocktower').ok,false);t=c.tree;
// 심기: 가운데(0)는 전설만, 나머지는 전설 아님.
assert.equal(plantTreeSeed(t,'frost',0).reason,'legend-only');assert.equal(plantTreeSeed(t,'clocktower',3).reason,'center-only');
t=plantTreeSeed(t,'frost',1).tree;t=plantTreeSeed(t,'clocktower',0).tree;assert.equal(t.bag.frost,undefined);assert.equal(plantTreeSeed(t,'chain',1).reason,'plot');
// 물 주기: 흔함 9번에 개화, 전설은 2.5배.
for(let i=0;i<9;i++)t=waterTree(t,1).tree;assert.equal(plotStage(t.plots[1]),'bloom');assert.equal(plotStage(t.plots[0]),'sprout','legend needs 2.5x');assert.ok(t.bloomed.includes('frost'));
// 전설 셋이 모두 피면 세계수 한 번.
let w=normalizeTree({plots:[{seed:'clocktower',water:30},null,null,null,null,null,null],bloomed:['alwaysbeginner','tempestcarrier']});w=waterTree(w,1);assert.ok(w.notes.some(n=>n.seed==='worldtree'));assert.equal(w.tree.bag.worldtree,1);assert.equal(waterTree(w.tree,1).tree.bag.worldtree,1);
// 비우기·옮기기·합치기·저장 정리.
assert.equal(clearTreePlot(t,1).tree.plots[1],null);
assert.equal(migrateTree(emptyTree(),{plots:[{seed:'founder'}]}).bag.founder,1);assert.equal(migrateTree(migrateTree(emptyTree(),{plots:[{seed:'founder'}]}),{plots:[{seed:'founder'}]}).bag.founder,1);
assert.deepEqual(migrateTree(emptyTree(),{plots:[{seed:'frost'}]}).bag,{},'old seeds are not carried over');
const m=mergeTree({plots:[{seed:'frost',water:3}],bag:{chain:1},shards:{common:2}},{plots:[{seed:'orbit',water:5}],bag:{chain:2},bloomed:['orbit']});
assert.equal(m.plots[0].seed,'orbit');assert.equal(m.bag.chain,2);assert.equal(m.shards.common,2);assert.deepEqual(m.bloomed,['orbit']);
assert.deepEqual(normalizeTree({plots:[{seed:'nope'}],bag:{nope:3,frost:1.5},once:{'bad key!':true}}),emptyTree());
assert.equal(TREE_PLOTS,7);
console.log('tree of life ok');
