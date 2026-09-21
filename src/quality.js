// Automatic render quality for slow devices (2026-09-15: a laptop lagged on the desktop settings).
// Level 2 high: full bloom, soft 2048 shadows, lantern lights, pixel ratio up to 1.5 (the old desktop path).
// Level 1 medium: half-resolution bloom, contact shadows, no sun shadow pass, no lantern lights, pixel ratio 1.
// Level 0 low: no bloom, no shadows, no lantern lights, pixel ratio .85.
// Gameplay never changes with quality; only how the frame is drawn.
export const QUALITY_KEY='seed-quality-v1';
export const QUALITY_NAMES=Object.freeze(['낮음','보통','높음']);
// pixelBudget (2026-09-15): a phone held sideways is only about 900x400 CSS pixels, so the floor ratio drew a tiny,
// blurry frame on a sharp screen. Small screens may raise the ratio until the frame reaches the budget; large screens keep the floor.
export const QUALITY_LEVELS=Object.freeze([
 Object.freeze({level:0,pixelRatio:.85,pixelBudget:400000,bloom:'off',shadows:false,shadowSize:1024,lanternLights:false}),
 Object.freeze({level:1,pixelRatio:1,pixelBudget:650000,bloom:'half',shadows:false,shadowSize:1024,lanternLights:false}),
 Object.freeze({level:2,pixelRatio:1.5,pixelBudget:1400000,bloom:'full',shadows:true,shadowSize:2048,lanternLights:true})
]);
export function renderPixelRatio(q,{width=1,height=1,dpr=1}={}){
 const area=Math.max(1,width*height),wanted=Math.max(q.pixelRatio,Math.sqrt(q.pixelBudget/area));
 return Math.round(Math.min(dpr||1,2,wanted)*100)/100;
}
export const clampLevel=v=>Number.isInteger(v)?Math.max(0,Math.min(2,v)):null;

// Start: ?quality=0|1|2 (testing) > what this device settled on last time > phone 1 / computer 2.
export function initialQuality({search='',stored=null,mobile=false}={}){
 const forced=clampLevel(Number(new URLSearchParams(search).get('quality')));
 if(new URLSearchParams(search).has('quality')&&forced!==null)return forced;
 const saved=clampLevel(Number(stored));
 if(stored!==null&&stored!==''&&saved!==null)return saved;
 return mobile?1:2;
}

// 자동 화질 낮춤은 없앴다(2026-09-21 사용자 결정: 느린 기기라도 화질을 스스로 바꾸지 않는다).
// 화질은 기기 기본값(휴대폰 보통·컴퓨터 높음)으로 시작하고, 바꾸는 것은 플레이어가 일시정지 메뉴에서만 한다.
// 예전 자동 낮춤이 저장해 둔 값이 남아 있을 수 있어, 기기 기본보다 낮은 저장값을 한 번만 기본값으로 되돌린다
// (직접 낮춘 경우도 한 번 기본값으로 돌아가며, 다시 고르면 그대로 유지된다).
export const QUALITY_RESET_KEY='seed-quality-auto-reset-v1';
export function resetAutoLowered(storage,{mobile=false}={}){
 try{
  if(!storage||storage.getItem(QUALITY_RESET_KEY))return false;
  storage.setItem(QUALITY_RESET_KEY,'1');
  const raw=storage.getItem(QUALITY_KEY),saved=clampLevel(Number(raw)),base=mobile?1:2;
  if(raw!==null&&raw!==''&&saved!==null&&saved<base){storage.setItem(QUALITY_KEY,String(base));return true;}
 }catch{}
 return false;
}
