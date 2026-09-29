// 정원 테마: 정원 안의 작은 정원 9곳. 온실부터 하나씩 열리고, 구성물은 JP로 사서 마음대로 놓는다.
// 저장은 정원(garden.js)의 themes · bag 칸에 들어가 클라우드로 함께 간다.
import {GARDEN_OBJECT_ART} from './garden-theme-art.js';
import {hasSpotScene,spotsFilled,spotsTotal,normalizeSpots,mergeSpots} from './garden-spots.js';

// 열리는 차례. set: 이 테마 가게가 파는 그림 세트(설렘의 정원은 모든 세트를 판다).
export const GARDEN_THEMES=Object.freeze([
 {id:'greenhouse',name:'온실',en:'GREENHOUSE',line:'조심스레, 따뜻하게. 당신이 지켜 낸 생명들이 쉬는 곳.',quote:'지금도, 잘 자라고 있어요.',tone:'#f3d27a',rate:1},
 {id:'meadow',name:'초원의 정원',en:'MEADOW GARDEN',line:'바람이 지나가는 곳에 새로운 생명이 자란다.',quote:'오늘도, 조금 더 자라요.',tone:'#b9e07a',rate:1.1},
 {id:'blossom',name:'벚꽃의 정원',en:'BLOSSOM GARDEN',line:'피어나는 시작. 모든 이야기는 여기에서.',quote:'작은 씨앗도 언젠가 꽃이 된다.',tone:'#ffb3cf',rate:1.2},
 {id:'autumn',name:'가을의 정원',en:'AUTUMN GARDEN',line:'익어 가는 시간 속에서 새로운 씨앗이 다시 태어난다.',quote:'끝은 언제나 다시 시작이야.',tone:'#ffb35c',rate:1.3},
 {id:'snow',name:'설원의 정원',en:'SNOW GARDEN',line:'멈춘 시간 속에서도 생명은 자란다.',quote:'차가움 속에서도, 푸르게 자라나는 힘.',tone:'#bfe3ff',rate:1.4},
 {id:'moon',name:'달빛의 정원',en:'MOON GARDEN',line:'어둠 속에서 더 빛나는 또 하나의 성장.',quote:'밤은 끝이 아니라, 다른 시작이에요.',tone:'#c7b3ff',rate:1.5},
 {id:'fire',name:'불의 정원',en:'FIRE GARDEN',line:'뜨거운 열정이 또 다른 생명을 만든다.',quote:'타오르는 마음도, 언젠가 꽃이 된다.',tone:'#ff8a5c',rate:1.6},
 {id:'shadow',name:'어둠의 정원',en:'SHADOW GARDEN',line:'잊힌 기억 속에서도 생명은 조용히 자란다.',quote:'보이지 않아도, 분명히 자라고 있어.',tone:'#7fe8d0',rate:1.7},
 {id:'dream',name:'설렘의 정원',en:'DREAM GARDEN',line:'아직 이름 지어지지 않은 가능성들이 모여 있는 곳.',quote:'언젠가, 이 씨앗도 빛날 거예요.',tone:'#ffd6f0',rate:1.5},
]);
export const GARDEN_THEME_IDS=GARDEN_THEMES.map(t=>t.id);
// 앞 테마에 구성물을 이만큼 놓으면 다음 테마가 열린다.
export const THEME_UNLOCK_PLACED=6;
// 한 테마에 놓을 수 있는 최대 개수 · 가방 한 칸 최대.
export const THEME_MAX_ITEMS=40,BAG_MAX=99;
// 종류별 기본값(JP)과 장면에서의 크기(배경 높이 대비). 테마가 뒤로 갈수록 rate만큼 비싸진다.
export const OBJECT_KINDS=Object.freeze({
 T:{label:'큰 나무',price:260,size:.36},t:{label:'나무',price:180,size:.3},s:{label:'작은 나무',price:120,size:.24},
 B:{label:'덤불·화단',price:80,size:.18},f:{label:'꽃',price:40,size:.13},p:{label:'화분',price:60,size:.15},
 d:{label:'소품',price:90,size:.16},S:{label:'구조물',price:320,size:.32},P:{label:'연못',price:220,size:.2},
});
const round10=n=>Math.max(10,Math.round(n/10)*10);
// 모든 구성물: id = '<세트>.<칸>'. 공용 세트(etc)는 어느 테마에서나 판다.
export const GARDEN_OBJECTS=Object.freeze(Object.fromEntries(Object.entries(GARDEN_OBJECT_ART).flatMap(([set,art])=>art.items.map(([name,kind],i)=>{
 const theme=GARDEN_THEMES.find(t=>t.id===set),rate=theme?.rate||1;
 return [`${set}.${i}`,Object.freeze({id:`${set}.${i}`,set,index:i,name,kind,price:round10(OBJECT_KINDS[kind].price*rate),size:OBJECT_KINDS[kind].size})];
}))));
export function themeCatalog(themeId){
 const all=Object.values(GARDEN_OBJECTS);
 if(themeId==='dream')return all.filter(o=>o.set==='etc').concat(all.filter(o=>o.set!=='etc'));
 return all.filter(o=>o.set===themeId).concat(all.filter(o=>o.set==='etc'));
}

const clamp=(v,a,b,d)=>{const n=Number(v);return Number.isFinite(n)?Math.max(a,Math.min(b,n)):d;};
const r3=n=>Math.round(n*1000)/1000;
function placed(item){
 if(!item||typeof item!=='object'||!Object.hasOwn(GARDEN_OBJECTS,item.k))return null;
 return {k:item.k,u:r3(clamp(item.u,0,1,.5)),v:r3(clamp(item.v,0,1,.7)),s:r3(clamp(item.s,.6,1.6,1)),f:item.f?1:0};
}
export function emptyThemes(){return Object.fromEntries(GARDEN_THEME_IDS.map(id=>[id,[]]));}
export function normalizeThemes(value){
 const out=emptyThemes();if(!value||typeof value!=='object')return out;
 for(const id of GARDEN_THEME_IDS)if(Array.isArray(value[id]))out[id]=value[id].map(placed).filter(Boolean).slice(0,THEME_MAX_ITEMS);
 return out;
}
export function normalizeBag(value){
 const out={};if(!value||typeof value!=='object')return out;
 for(const [k,n] of Object.entries(value))if(Object.hasOwn(GARDEN_OBJECTS,k)&&Number.isInteger(n)&&n>0)out[k]=Math.min(BAG_MAX,n);
 return out;
}
export const themeItemCount=(garden,id)=>(garden?.themes?.[id]||[]).length;
// 열림 진행: 자리 꾸미기 정원(v2)은 채운 자리 / 전체 자리, 예전 정원은 놓은 구성물 / THEME_UNLOCK_PLACED.
export const themeProgress=(garden,id)=>hasSpotScene(id)?{have:spotsFilled(garden,id),need:spotsTotal(id),spots:true}:{have:themeItemCount(garden,id),need:THEME_UNLOCK_PLACED,spots:false};
export function ownedCount(garden){
 let n=Object.values(garden?.bag||{}).reduce((a,b)=>a+b,0);
 for(const id of GARDEN_THEME_IDS)n+=themeItemCount(garden,id);
 return n;
}
// 온실은 처음부터, 그다음은 앞 테마에 THEME_UNLOCK_PLACED개 이상 놓으면 열린다. 한 번 열린 테마는 앞 것을 치워도 닫히지 않는다(opened에 남긴다).
export function themeUnlocked(garden,id){
 const i=GARDEN_THEME_IDS.indexOf(id);if(i<0)return false;if(i===0)return true;
 if((garden?.themesOpened||[]).includes(id))return true;
 const prev=themeProgress(garden,GARDEN_THEME_IDS[i-1]);
 return prev.have>=prev.need&&themeUnlocked(garden,GARDEN_THEME_IDS[i-1]);
}
export function themeLockInfo(garden,id){
 const i=GARDEN_THEME_IDS.indexOf(id);if(themeUnlocked(garden,id))return {locked:false};
 const prev=GARDEN_THEMES[i-1];
 const pr=themeProgress(garden,prev.id);
 return {locked:true,prev:prev.id,prevName:prev.name,need:pr.need,have:pr.have,spots:pr.spots,prevOpen:themeUnlocked(garden,prev.id)};
}
// 조건을 채운 테마를 opened에 기록한다(앞 테마에서 물건을 치워도 계속 열린 채로).
export function recordOpenedThemes(garden){
 const opened=new Set(garden.themesOpened||[]),fresh=[];
 for(const id of GARDEN_THEME_IDS.slice(1))if(!opened.has(id)&&themeUnlocked(garden,id)){opened.add(id);fresh.push(id);}
 return {garden:{...garden,themesOpened:GARDEN_THEME_IDS.filter(id=>opened.has(id))},fresh};
}
export function normalizeOpened(value){return Array.isArray(value)?GARDEN_THEME_IDS.slice(1).filter(id=>value.includes(id)):[];}

const fail=(garden,reason)=>({ok:false,reason,garden});
const withThemes=(garden,id,items)=>({...garden,themes:{...garden.themes,[id]:items}});
// 사서 바로 놓는다. 값은 호출하는 쪽이 JP 지갑에서 먼저 뺀다(spend가 false면 실패).
export function buyObject(garden,themeId,key,{u=.5,v=.72,spend}={}){
 const obj=GARDEN_OBJECTS[key];
 if(!obj)return fail(garden,'object');
 if(!themeUnlocked(garden,themeId))return fail(garden,'locked');
 if(!themeCatalog(themeId).some(o=>o.id===key))return fail(garden,'catalog');
 const items=garden.themes?.[themeId]||[];if(items.length>=THEME_MAX_ITEMS)return fail(garden,'full');
 if(typeof spend==='function'&&!spend(obj.price))return fail(garden,'coins');
 const item=placed({k:key,u,v});
 return {ok:true,price:obj.price,index:items.length,...recordOpenedThemes(withThemes(garden,themeId,[...items,item]))};
}
export function placeFromBag(garden,themeId,key,{u=.5,v=.72}={}){
 const bag=garden.bag||{};if(!bag[key])return fail(garden,'bag');
 if(!themeUnlocked(garden,themeId))return fail(garden,'locked');
 const items=garden.themes?.[themeId]||[];if(items.length>=THEME_MAX_ITEMS)return fail(garden,'full');
 const nextBag={...bag,[key]:bag[key]-1};if(!nextBag[key])delete nextBag[key];
 return {ok:true,index:items.length,...recordOpenedThemes({...withThemes(garden,themeId,[...items,placed({k:key,u,v})]),bag:nextBag})};
}
export function moveObject(garden,themeId,index,change){
 const items=garden.themes?.[themeId]||[],cur=items[index];if(!cur)return fail(garden,'index');
 const next=placed({...cur,...change});
 return {ok:true,garden:withThemes(garden,themeId,items.map((it,i)=>i===index?next:it))};
}
// 치우기: 가방으로 돌아간다(돈은 돌려주지 않지만 다른 테마에 다시 놓을 수 있다).
export function storeObject(garden,themeId,index){
 const items=garden.themes?.[themeId]||[],cur=items[index];if(!cur)return fail(garden,'index');
 const bag={...(garden.bag||{})};bag[cur.k]=Math.min(BAG_MAX,(bag[cur.k]||0)+1);
 return {ok:true,key:cur.k,garden:{...withThemes(garden,themeId,items.filter((_,i)=>i!==index)),bag}};
}
// 맨 앞으로(같은 깊이일 때 위에 그려지게 목록 끝으로 옮긴다).
export function bringToFront(garden,themeId,index){
 const items=garden.themes?.[themeId]||[],cur=items[index];if(!cur)return fail(garden,'index');
 return {ok:true,index:items.length-1,garden:withThemes(garden,themeId,[...items.filter((_,i)=>i!==index),cur])};
}
// 그리는 차례: 뒤(위쪽 v 작은 것)부터, 같으면 목록 순서.
export function themeDrawOrder(items){return items.map((it,i)=>({...it,i})).sort((a,b)=>a.v-b.v||a.i-b.i);}
// 두 기기 합치기: 구성물을 더 많이 가진 쪽 배치를 따르고, 열린 테마는 합친다.
export function mergeThemeProgress(local,remote,prefer='remote'){
 const a={themes:normalizeThemes(local?.themes),bag:normalizeBag(local?.bag)},b={themes:normalizeThemes(remote?.themes),bag:normalizeBag(remote?.bag)};
 const na=ownedCount(a),nb=ownedCount(b),pick=na===nb?(prefer==='local'?a:b):na>nb?a:b;
 return {themes:pick.themes,bag:pick.bag,themesOpened:normalizeOpened([...(local?.themesOpened||[]),...(remote?.themesOpened||[])]),spots:mergeSpots(local?.spots,remote?.spots,prefer),spotsRefunded:[...new Set([...(local?.spotsRefunded||[]),...(remote?.spotsRefunded||[])])].filter(hasSpotScene)};
}
