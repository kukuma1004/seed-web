// 정원 가꾸기 · 씨앗 맞추기에서 모은 별로 정원을 꾸민다(로열 매치의 '성 꾸미기'를 SEED 정원으로).
// 2026-09-28 사용자: "하트를 씨앗으로 하고 성꾸미기 같은건 정원으로 연결해보자"
// - 구역 셋(정원 입구 → 가운데 뜰 → 고목 계단), 구역마다 할 일 여섯. 한 구역을 다 꾸미면 햇살 보상과 함께 다음 구역이 열린다.
// - 꾸민 것은 정원 저장(garden.decor)에 남아 계정과 함께 옮겨 가고, 3D 정원(garden-scene.js)과 씨앗 맞추기의 정원 화면이 같은 자리에 그린다.
// - 자리(u,v)는 정원 배경 그림(garden-sanctuary-v2, 16:9) 위의 비율 좌표. 화단 여섯·가운데 메달리온은 비워 둔다.
// - 식물 그림은 정원 성장 아틀라스(garden-growth-atlas-v3, 4×3)의 칸을 물들여 쓴다. 등불은 빛, 반딧불이·꽃비는 움직이는 장식.
const plant=(tile,u,v,size,tint=0xffffff)=>Object.freeze({kind:'plant',tile,u,v,size,tint});
const lantern=(u,v,size=1)=>Object.freeze({kind:'lantern',u,v,size});
const task=(id,area,name,cost,items=[],extra={})=>Object.freeze({id,area,name,cost,items:Object.freeze(items),fireflies:0,petals:false,...extra});

export const DECOR_AREAS=Object.freeze([
 Object.freeze({id:'gate',name:'정원 입구',reward:150,line:'정원으로 들어오는 돌계단과 꽃덤불'}),
 Object.freeze({id:'court',name:'가운데 뜰',reward:250,line:'화단 둘레와 메달리온을 밝히는 꽃과 등불'}),
 Object.freeze({id:'tree',name:'고목 계단',reward:400,line:'오래된 나무로 오르는 계단과 수정 나무'}),
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
export function decorScene(list){
 const l=normalizeDecor(list),items=[];let fireflies=0,petals=false;
 for(const id of l){const d=DECOR_BY_ID[id];for(const item of d.items)items.push({...item,id});fireflies+=d.fireflies;petals||=d.petals;}
 return {items,fireflies,petals,count:l.length};
}
