// 정원 가꾸기 · 씨앗 맞추기에서 모은 별로 정원을 꾸민다(로열 매치의 '성 꾸미기'를 SEED 정원으로).
// 2026-09-28 사용자: "하트를 씨앗으로 하고 성꾸미기 같은건 정원으로 연결해보자"
// - 기존 세 구역 뒤에 물가·쉼터·작업실·축제 길 네 구역을 이어 붙인다. 구역마다 할 일 여섯.
// - 꾸민 것은 정원 저장(garden.decor)에 남아 계정과 함께 옮겨 가고, 3D 정원(garden-scene.js)과 씨앗 맞추기의 정원 화면이 같은 자리에 그린다.
// - 자리(u,v)는 정원 배경 그림(garden-sanctuary-v2, 16:9) 위의 비율 좌표. 화단 여섯·가운데 메달리온은 비워 둔다.
// - 식물 그림은 정원 성장 아틀라스(garden-growth-atlas-v3, 4×3)의 칸을 물들여 쓴다. 등불은 빛, 반딧불이·꽃비는 움직이는 장식.
const plant=(tile,u,v,size,tint=0xffffff)=>Object.freeze({kind:'plant',tile,u,v,size,tint});
const lantern=(u,v,size=1)=>Object.freeze({kind:'lantern',u,v,size});
const prop=(tile,u,v,size=1)=>Object.freeze({kind:'prop',tile,u,v,size,tint:0xffffff});
const task=(id,area,name,cost,items=[],extra={})=>Object.freeze({id,area,name,cost,items:Object.freeze(items),fireflies:0,petals:false,...extra});

export const DECOR_AREAS=Object.freeze([
 Object.freeze({id:'gate',name:'정원 입구',reward:150,line:'정원으로 들어오는 돌계단과 꽃덤불'}),
 Object.freeze({id:'court',name:'가운데 뜰',reward:250,line:'화단 둘레와 메달리온을 밝히는 꽃과 등불'}),
 Object.freeze({id:'tree',name:'고목 계단',reward:400,line:'오래된 나무로 오르는 계단과 수정 나무'}),
 Object.freeze({id:'waterside',name:'수련 물가',reward:450,line:'연못과 나무다리, 새들이 쉬어 가는 작은 샘'}),
 Object.freeze({id:'rest',name:'씨앗 쉼터',reward:500,line:'꽃향기를 맡으며 쉬는 벤치와 잎사귀 지붕'}),
 Object.freeze({id:'workshop',name:'정원사의 작업실',reward:550,line:'온실 화분대에서 키운 꽃을 수레에 싣고 소풍 준비'}),
 Object.freeze({id:'festival',name:'별빛 축제 길',reward:650,line:'바람 종과 씨앗 조각상, 귀여운 버섯 등불'}),
]);
export const DECOR=Object.freeze([
 task('gateBush','gate','입구 꽃덤불',1,[plant(4,.33,.8,1.5,0xffc0d8)]),
 task('gateBush2','gate','맞은편 꽃덤불',1,[plant(4,.67,.8,1.5,0xffc0d8)]),
 task('gateLanterns','gate','돌계단 등불',2,[lantern(.44,.92),lantern(.56,.92)]),
 task('gateFireflies','gate','반딧불이 부르기',2,[],{fireflies:12}),
 task('gateVine','gate','왼쪽 빛덩굴',2,[plant(9,.25,.63,1.7)]),
 task('gateVine2','gate','오른쪽 빛덩굴',2,[plant(9,.75,.63,1.7)]),
 task('courtLily','court','달빛 백합',2,[plant(5,.26,.44,1.6,0xcfe6ff)]),
 task('courtLily2','court','맞은편 달빛 백합',2,[plant(5,.74,.44,1.6,0xcfe6ff)]),
 task('courtGear','court','태엽꽃',2,[plant(10,.5,.76,1.3)]),
 task('courtLanterns','court','메달리온 등불',3,[lantern(.41,.46,.8),lantern(.59,.46,.8),lantern(.43,.59,.8),lantern(.57,.59,.8)]),
 task('courtTrees','court','꽃나무 한 쌍',3,[plant(7,.17,.52,2),plant(7,.83,.52,2)]),
 task('courtBuds','court','꽃봉오리 길',2,[plant(3,.46,.85,1,0xffe2a8),plant(3,.54,.85,1,0xffe2a8)]),
 task('treeViolets','tree','계단 옆 제비꽃',2,[plant(4,.44,.29,1.2,0xd6b8ff),plant(4,.61,.29,1.2,0xd6b8ff)]),
 task('treeCrystal','tree','왼쪽 수정 나무',3,[plant(11,.3,.27,2)]),
 task('treeCrystal2','tree','오른쪽 수정 나무',3,[plant(11,.71,.26,2)]),
 task('treeLanterns','tree','고목 등불',2,[lantern(.47,.22,.7),lantern(.56,.22,.7)]),
 task('treeFireflies','tree','황금 반딧불이',3,[],{fireflies:16}),
 task('treePetals','tree','꽃비 내리는 정원',4,[],{petals:true}),
 task('watersidePond','waterside','수련 연못 만들기',4,[prop(4,.24,.84,1.05)]),
 task('watersideBridge','waterside','물가의 나무다리',3,[prop(5,.24,.71,.75)]),
 task('watersideBirdbath','waterside','새들의 작은 샘',3,[prop(1,.29,.46,.8)]),
 task('watersideReeds','waterside','물가에 갈대 심기',2,[plant(8,.14,.70,.9,0xb6dcb2)]),
 task('watersideLilies','waterside','연못 옆 수련꽃',2,[plant(5,.25,.85,.9,0xffd9e9)]),
 task('watersideFireflies','waterside','물빛 반딧불이',2,[],{fireflies:8}),
 task('restBench','rest','이끼 돌벤치 놓기',3,[prop(0,.77,.46,1)]),
 task('restGazebo','rest','씨앗 쉼터 세우기',4,[prop(6,.74,.32,.85)]),
 task('restArch','rest','잎사귀 아치 세우기',4,[prop(2,.5,.95,1.1)]),
 task('restHangingVine','rest','쉼터의 드리운 덩굴',2,[plant(9,.80,.37,.65,0xbdd7c5)]),
 task('restFragrance','rest','향기 나는 흰 꽃',2,[plant(4,.83,.75,.9,0xfff1d4)]),
 task('restLantern','rest','벤치 옆 독서 등불',2,[lantern(.80,.48,.65)]),
 task('workshopPlanter','workshop','온실 화분대 들이기',3,[prop(7,.25,.60,.85)]),
 task('workshopCart','workshop','꽃 수레 준비하기',4,[prop(10,.75,.70,.9)]),
 task('workshopPicnic','workshop','소풍 바구니 펼치기',3,[prop(11,.70,.84,1.1)]),
 task('workshopNursery','workshop','어린 묘목 기르기',2,[plant(1,.15,.60,.85),plant(3,.21,.59,.7,0xffddb0)]),
 task('workshopClimbers','workshop','작업실의 담쟁이',2,[plant(8,.80,.57,.65,0xb9d8a5)]),
 task('workshopWarmLight','workshop','저녁 작업 등불',2,[lantern(.23,.62,.65)]),
 task('festivalMushroom','festival','버섯 등불 켜기',3,[prop(3,.20,.92,.85)]),
 task('festivalChimes','festival','바람 종 매달기',3,[prop(8,.28,.34,.8)]),
 task('festivalStatue','festival','첫 씨앗의 조각상',4,[prop(9,.72,.95,1)]),
 task('festivalFlowers','festival','축제 꽃다발 심기',2,[plant(4,.27,.90,.65,0xf5ceca),plant(5,.72,.90,.6,0xffdfaf)]),
 task('festivalStarlight','festival','별빛 산책 등불',3,[lantern(.30,.92,.65),lantern(.70,.92,.65)]),
 task('festivalFlowerTrail','festival','돌길에 꽃길 놓기',2,[plant(3,.31,.91,.65,0xffe2a8),plant(3,.69,.91,.65,0xffe2a8)]),
]);
export const DECOR_BY_ID=Object.freeze(Object.fromEntries(DECOR.map(d=>[d.id,d])));
export const DECOR_TOTAL_COST=DECOR.reduce((a,d)=>a+d.cost,0);

// 저장 값 정리: 아는 것만, 한 번씩, 얻은 순서 그대로.
export function normalizeDecor(list){return Array.isArray(list)?[...new Set(list.filter(id=>typeof id==='string'&&DECOR_BY_ID[id]))]:[];}
export const decorSpent=list=>normalizeDecor(list).reduce((a,id)=>a+DECOR_BY_ID[id].cost,0);
const areaDone=(list,area)=>DECOR.filter(d=>d.area===area).every(d=>list.includes(d.id));
// 지금 꾸미는 구역(앞 구역을 다 꾸며야 다음이 열린다). 다 꾸몄으면 -1.
export function decorAreaIndex(list){const l=normalizeDecor(list);return DECOR_AREAS.findIndex(a=>!areaDone(l,a.id));}
export function decorTasks(list){const l=normalizeDecor(list),i=decorAreaIndex(l);if(i<0)return [];return DECOR.filter(d=>d.area===DECOR_AREAS[i].id).map(d=>({...d,done:l.includes(d.id)}));}
// 별 지갑: 모은 별 - 꾸미는 데 쓴 별.
export const decorStars=(earned,list)=>Math.max(0,Math.floor(earned||0)-decorSpent(list));
export function canDecorate(list,id,earned){const l=normalizeDecor(list),d=DECOR_BY_ID[id];return !!d&&!l.includes(id)&&decorTasks(l).some(t=>t.id===id)&&decorStars(earned,l)>=d.cost;}
// 꾸미기. 구역을 다 꾸미면 area(보상 받을 구역)를 돌려준다.
export function decorate(list,id,earned){
 const l=normalizeDecor(list);if(!canDecorate(l,id,earned))return {ok:false,list:l,area:null};
 const next=[...l,id],area=DECOR_BY_ID[id].area,finished=areaDone(next,area)?DECOR_AREAS.find(a=>a.id===area):null;
 return {ok:true,list:next,area:finished};
}
// 그리기용: 꾸민 것의 식물·등불 목록과 반딧불이 수, 꽃비.
export function decorScene(list,positions={}){
 const l=normalizeDecor(list),items=[];let fireflies=0,petals=false;
 for(const id of l){const d=DECOR_BY_ID[id];for(const item of d.items){const p=item.kind==='prop'?positions[id]:null;items.push({...item,...(p&&Number.isFinite(p.u)&&Number.isFinite(p.v)?{u:p.u,v:p.v}:null),id});}fireflies+=d.fireflies;petals||=d.petals;}
 return {items,fireflies:Math.min(36,fireflies),petals,count:l.length};
}
