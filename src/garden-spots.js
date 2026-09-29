// 테마 정원 v2 — 자리 꾸미기(2026-09-29, 기획 GARDEN_V2_PLAN.md).
// 사용자: "구성품을 사서 넣으면 이질감이 들고 예쁘지 않다", "온실만의 문제가 아니다".
// 정원마다 빈 장면 한 장 + 정해진 자리. 자리마다 스타일 A·B·C 중 하나를 햇살로 사서 채우고, 산 스타일은 언제든 다시 끼운다.
// 물건 그림은 GPT가 같은 빈 장면에 그려 넣은 그림에서 차이로 잘라 낸 조각이라(tools/garden_spot_part.py) 시점·빛·그림자가 배경과 맞는다.
// 이 파일은 그림 좌표와 규칙만 가진다(화면은 garden-hub-view.js). garden-themes.js가 여기서 열림 조건을 읽는다.

// box: 조각이 놓이는 자리(장면 픽셀, 조각 PNG의 크기와 같다) · at: 자리 표시(＋)를 띄우는 곳.
export const SPOT_SCENES=Object.freeze({
 greenhouse:Object.freeze({size:Object.freeze([1536,1024]),spots:Object.freeze([
  Object.freeze({id:'1',name:'왼쪽 화단',box:[120,300,625,620],at:[372,470],styles:Object.freeze({A:'허브 텃밭',B:'토마토·딸기 텃밭',C:'튤립·장미 꽃밭'})}),
  Object.freeze({id:'2',name:'오른쪽 화단',box:[1030,200,1470,760],at:[1250,600],styles:Object.freeze({A:'초록 풀숲',B:'레몬나무',C:'수국 덤불'})}),
  Object.freeze({id:'3',name:'가운데 뜰',box:[560,300,990,700],at:[773,585],styles:Object.freeze({A:'나무 작업대',B:'돌 분수',C:'유리 정자'})}),
  Object.freeze({id:'4',name:'왼쪽 선반',box:[270,190,570,410],at:[420,300],styles:Object.freeze({A:'다육 화분',B:'모종과 씨앗 병',C:'난초와 약초 병'})}),
  Object.freeze({id:'5',name:'오른쪽 선반',box:[1067,200,1493,493],at:[1290,380],styles:Object.freeze({A:'늘어진 덩굴',B:'과일 바구니',C:'꽃 화분'})}),
  Object.freeze({id:'6',name:'천장 고리',box:[380,0,1220,300],at:[800,120],styles:Object.freeze({A:'고사리 바구니',B:'꽃바구니',C:'유리 등불'})}),
 ])}),
});
export const SPOT_STYLE_IDS=Object.freeze(['A','B','C']);
// 값(JP): 소박한 A → 풍성한 B → 화려한 C. 테마 rate를 곱한다(화면이 넘긴다).
export const SPOT_PRICES=Object.freeze({A:60,B:90,C:120});
export const spotScene=id=>SPOT_SCENES[id]||null;
export const hasSpotScene=id=>Object.hasOwn(SPOT_SCENES,id);
export const spotPrice=(style,rate=1)=>Math.max(10,Math.round(SPOT_PRICES[style]*rate/10)*10);
export const spotArt=(theme,spot,style)=>`assets/garden/v2/${theme}/${spot}${style}.webp`;
export const spotBase=theme=>`assets/garden/v2/${theme}/base.webp`;

// 저장: spots[테마][자리] = {on:'A'|null, own:['A',...]}.
export function normalizeSpots(value){
 const out={};if(!value||typeof value!=='object')return out;
 for(const [theme,scene] of Object.entries(SPOT_SCENES)){
  const v=value[theme];if(!v||typeof v!=='object')continue;const t={};
  for(const spot of scene.spots){
   const e=v[spot.id];if(!e||typeof e!=='object')continue;
   const own=SPOT_STYLE_IDS.filter(id=>Array.isArray(e.own)&&e.own.includes(id));
   const on=own.includes(e.on)?e.on:null;
   if(own.length)t[spot.id]={on,own};
  }
  if(Object.keys(t).length)out[theme]=t;
 }
 return out;
}
export const spotEntry=(garden,theme,spot)=>garden?.spots?.[theme]?.[spot]||{on:null,own:[]};
export function spotsFilled(garden,theme){const scene=SPOT_SCENES[theme];if(!scene)return 0;return scene.spots.filter(s=>spotEntry(garden,theme,s.id).on).length;}
export const spotsTotal=theme=>SPOT_SCENES[theme]?.spots.length||0;

const put=(garden,theme,spot,entry)=>({...garden,spots:{...(garden.spots||{}),[theme]:{...(garden.spots?.[theme]||{}),[spot]:entry}}});
// 스타일 고르기: 산 적 있으면 무료로 바꿔 끼우고, 처음이면 spend(값)가 true일 때만 산다.
export function chooseSpotStyle(garden,theme,spot,style,{rate=1,spend}={}){
 const scene=SPOT_SCENES[theme],def=scene?.spots.find(s=>s.id===spot);
 if(!def||!SPOT_STYLE_IDS.includes(style))return {ok:false,reason:'spot',garden};
 const cur=spotEntry(garden,theme,spot);
 if(cur.own.includes(style))return {ok:true,paid:0,garden:put(garden,theme,spot,{on:style,own:[...cur.own]})};
 const price=spotPrice(style,rate);
 if(typeof spend==='function'&&!spend(price))return {ok:false,reason:'coins',price,garden};
 return {ok:true,paid:price,garden:put(garden,theme,spot,{on:style,own:SPOT_STYLE_IDS.filter(id=>cur.own.includes(id)||id===style)})};
}
// 비우기(산 스타일은 그대로 남는다).
export function clearSpot(garden,theme,spot){const cur=spotEntry(garden,theme,spot);if(!cur.on)return {ok:false,garden};return {ok:true,garden:put(garden,theme,spot,{on:null,own:[...cur.own]})};}
// 두 기기 합치기: 산 스타일은 합치고, 끼운 것은 prefer 쪽(없으면 다른 쪽).
export function mergeSpots(local,remote,prefer='remote'){
 const a=normalizeSpots(local),b=normalizeSpots(remote),[win,other]=prefer==='local'?[a,b]:[b,a],out={};
 for(const [theme,scene] of Object.entries(SPOT_SCENES))for(const s of scene.spots){
  const x=win[theme]?.[s.id],y=other[theme]?.[s.id];if(!x&&!y)continue;
  const own=SPOT_STYLE_IDS.filter(id=>x?.own.includes(id)||y?.own.includes(id));
  (out[theme]??={})[s.id]={on:x?.on||y?.on||null,own};
 }
 return out;
}
