// 테마 정원 v2 — 자리 꾸미기(2026-09-29, 기획 GARDEN_V2_PLAN.md).
// 사용자: "구성품을 사서 넣으면 이질감이 들고 예쁘지 않다", "온실만의 문제가 아니다".
// 정원마다 빈 장면 한 장 + 정해진 자리. 자리마다 스타일 A·B·C 중 하나를 햇살로 사서 채우고, 산 스타일은 언제든 다시 끼운다.
// 물건 그림은 GPT가 같은 빈 장면에 그려 넣은 그림에서 차이로 잘라 낸 조각이라(tools/garden_spot_part.py) 시점·빛·그림자가 배경과 맞는다.
// 이 파일은 그림 좌표와 규칙만 가진다(화면은 garden-hub-view.js). garden-themes.js가 여기서 열림 조건을 읽는다.

// 정원마다 자리 표는 src/garden-spots/<정원>.js (tools/garden_spot_build.py 가 만든다).
// box: 조각이 놓이는 자리(장면 픽셀, 조각 그림 크기와 같은 비율) · at: 자리 표시(＋)를 띄우는 곳. 새 정원을 만들면 아래에 한 줄 추가.
import greenhouse from './garden-spots/greenhouse.js';
import meadow from './garden-spots/meadow.js';
import blossom from './garden-spots/blossom.js';
import autumn from './garden-spots/autumn.js';
import snow from './garden-spots/snow.js';
import moon from './garden-spots/moon.js';
import fire from './garden-spots/fire.js';
import shadow from './garden-spots/shadow.js';
import dream from './garden-spots/dream.js';
export const SPOT_SCENES=Object.freeze({greenhouse,meadow,blossom,autumn,snow,moon,fire,shadow,dream});
export const SPOT_STYLE_IDS=Object.freeze(['A','B','C']);
// 값(JP): 소박한 A → 풍성한 B → 화려한 C. 테마 rate를 곱한다(화면이 넘긴다).
// 2026-09-29 사용자: "정원 물품도 조금 더 비싸게" → 60·90·120 에서 올림.
export const SPOT_PRICES=Object.freeze({A:150,B:250,C:400});
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
