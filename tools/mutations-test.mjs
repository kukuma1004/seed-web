import assert from 'node:assert/strict';
import {MUTATIONS,MUTATION_IDS,MUTATION_LAWS,KINDS,RUNE,TUNE,MAX_SHOTS,
 mutationChoice,parseMutationChoice,mutationOf,hasMutation,mutationOffersFor,
 eligibleMutationLaws,withMutationOffer,applyMutation,validMutations,mutationsToSave,mutationsFromSave,
 mutationLabel,reflectBounceSpeed,chainRange,chainFalloff,fragmentSpeedScale,fragmentExtraLife} from '../src/mutations.js';
import {LAWS} from '../src/laws.js';
import {emptyGarden,addHarvest,growPlants,chooseBranch,setActive,gardenEffects,STAGE_POINTS} from '../src/garden.js';

// 변이는 세 법칙 × 세 갈래, 아홉 개. 모두 이름과 설명이 있다.
assert.equal(MUTATION_IDS.length,MUTATION_LAWS.length*KINDS.length);
for(const id of MUTATION_IDS){
 const m=MUTATIONS[id];
 assert.ok(Object.hasOwn(LAWS,m.law)&&KINDS.includes(m.kind));
 assert.ok(m.name.length>=3&&m.desc.length>=8&&m.badge&&m.lawName&&m.kindName,`${id} 문구`);
}
assert.deepEqual(mutationOffersFor('reflect').map(m=>m.kind),KINDS);

// 선택지 아이디 주고받기
assert.equal(parseMutationChoice(mutationChoice('reflect:rune')).id,'reflect:rune');
assert.equal(parseMutationChoice('reflect'),null);assert.equal(parseMutationChoice('mut:없음'),null);assert.equal(parseMutationChoice(null),null);

// 붙이기: 법칙 하나에 변이 하나
{
 const m=new Map();
 assert.ok(applyMutation(m,'split:burst'));
 assert.equal(mutationOf(m,'split').name,'분열 폭발');
 assert.equal(applyMutation(m,'split:speed'),false,'한 법칙에 두 변이는 안 된다');
 assert.equal(applyMutation(m,'없는:변이'),false);
 assert.ok(hasMutation(m,'split','burst')&&!hasMutation(m,'split','speed'));
 assert.equal(mutationLabel(m,'split').includes('분열 폭발'),true);
 assert.equal(mutationLabel(m,'chain'),'');
}

// 열리는 조건: 정원에서 그 법칙의 꽃이 자라 있어야 하고, 법칙도 어느 정도 키워야 한다.
{
 const levels=new Map([['reflect',3],['split',1],['chain',4]]);
 assert.deepEqual(eligibleMutationLaws({levels,mutations:new Map(),gardenLaws:[]}),[],'정원이 없으면 변이도 없다');
 assert.deepEqual(eligibleMutationLaws({levels,mutations:new Map(),gardenLaws:['reflect','split','chain']}),['reflect','chain'],'덜 키운 법칙은 빠진다');
 const held=new Map([['reflect','rune']]);
 assert.deepEqual(eligibleMutationLaws({levels,mutations:held,gardenLaws:['reflect','chain']}),['chain'],'이미 변이가 있으면 다시 안 나온다');
 assert.deepEqual(eligibleMutationLaws({levels:{reflect:9},mutations:{},gardenLaws:['reflect','gravity']}),['reflect'],'변이가 없는 법칙은 애초에 대상이 아니다');
}

// 선택지 한 장이 변이로 바뀐다. 조건이 안 되면 그대로.
{
 const base=['gravity','frost','form:prism'];
 const levels=new Map([['reflect',2]]);
 const plain=withMutationOffer(base,{levels,mutations:new Map(),gardenLaws:[]});
 assert.deepEqual(plain,base);
 const offered=withMutationOffer(base,{levels,mutations:new Map(),gardenLaws:['reflect'],random:()=>0});
 assert.equal(offered.length,3);
 assert.equal(offered[0],'gravity');assert.equal(offered[1],'frost');
 assert.equal(parseMutationChoice(offered[2]).law,'reflect','마지막 자리에 변이가 들어간다');
 const short=withMutationOffer(['gravity'],{levels,mutations:new Map(),gardenLaws:['reflect'],random:()=>0});
 assert.equal(short.length,2,'선택지가 적으면 덧붙인다');
 const kinds=new Set();
 for(let i=0;i<30;i++){const r=(i%3)/3+.01;kinds.add(parseMutationChoice(withMutationOffer(base,{levels,mutations:new Map(),gardenLaws:['reflect'],random:()=>r})[2]).kind);}
 assert.equal(kinds.size,3,'세 갈래가 모두 나올 수 있다');
}

// 저장: 알 수 없는 값은 버린다.
{
 const m=new Map([['reflect','burst'],['chain','rune']]);
 assert.deepEqual(mutationsToSave(m),{reflect:'burst',chain:'rune'});
 assert.ok(validMutations({reflect:'burst'})&&validMutations(undefined)&&validMutations({}));
 assert.ok(!validMutations({reflect:'없음'})&&!validMutations({gravity:'burst'})&&!validMutations([])&&!validMutations('x'));
 const back=mutationsFromSave({reflect:'burst',chain:'rune'});
 assert.equal(mutationOf(back,'reflect').kind,'burst');
 assert.equal(mutationsFromSave({reflect:'없음'}).size,0);
 assert.equal(mutationsFromSave(null).size,0);
}

// 전투 수치: 변이가 없으면 원래 값 그대로, 있으면 정해진 만큼만 바뀐다.
{
 const none=new Map();
 assert.equal(reflectBounceSpeed(none,3),1);assert.equal(chainRange(none),4);assert.equal(chainFalloff(none),.5);
 assert.equal(fragmentSpeedScale(none),1);assert.equal(fragmentExtraLife(none),0);
 const fast=new Map([['reflect','speed'],['chain','speed'],['split','speed']]);
 assert.ok(reflectBounceSpeed(fast,1)>1&&reflectBounceSpeed(fast,99)===TUNE.reflectSpeed.cap,'속도는 상한이 있다');
 assert.equal(chainRange(fast),TUNE.chainSpeed.range);assert.ok(chainFalloff(fast)>.5);
 assert.equal(fragmentSpeedScale(fast),TUNE.splitSpeed.scale);assert.ok(fragmentExtraLife(fast)>0);
 assert.ok(RUNE.max<=8&&RUNE.life<=4&&MAX_SHOTS<=200,'화면에 남는 물건 수를 묶어 둔다');
}

// 정원은 이제 플레이 기록 전용이다. 어떤 식물을 길러도 변이를 열지 않는다.
{
 let g=addHarvest(emptyGarden(),{seeds:['reflect','chain']});
 g=growPlants(g,STAGE_POINTS.mature);
 const fx=gardenEffects(g);
 assert.deepEqual(fx.mutationLaws,[],'정원은 변이를 열지 않는다');
 const levels=new Map([['reflect',2],['chain',5]]);
 assert.deepEqual(eligibleMutationLaws({levels,mutations:new Map(),gardenLaws:fx.mutationLaws}),[]);
}

console.log('변이: 아홉 종·조건·선택지 한 장·저장·전투 수치·정원 분리 통과');
