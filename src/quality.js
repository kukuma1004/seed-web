// Automatic render quality for slow devices (2026-09-15: a laptop lagged on the desktop settings).
// Level 2 high: full bloom, soft 2048 shadows, lantern lights, pixel ratio up to 1.5 (the old desktop path).
// Level 1 medium: half-resolution bloom, 1024 shadows, no lantern lights, pixel ratio 1 (the old phone path).
// Level 0 low: no bloom, no shadows, no lantern lights, pixel ratio .85.
// Gameplay never changes with quality; only how the frame is drawn.
export const QUALITY_KEY='seed-quality-v1';
export const QUALITY_NAMES=Object.freeze(['낮음','보통','높음']);
// pixelBudget (2026-09-15): a phone held sideways is only about 900x400 CSS pixels, so the floor ratio drew a tiny,
// blurry frame on a sharp screen. Small screens may raise the ratio until the frame reaches the budget; large screens keep the floor.
export const QUALITY_LEVELS=Object.freeze([
 Object.freeze({level:0,pixelRatio:.85,pixelBudget:400000,bloom:'off',shadows:false,shadowSize:1024,lanternLights:false}),
 Object.freeze({level:1,pixelRatio:1,pixelBudget:700000,bloom:'half',shadows:true,shadowSize:1024,lanternLights:false}),
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

// Watches frame times while the game is being played and steps quality down when frames stay slow.
// It never steps back up by itself, so the picture does not flicker between levels.
// slowFrameMs 20 = below about 50 fps on average; verySlowFrameMs 40 = below 25 fps, which skips straight to low.
export const GOVERNOR=Object.freeze({windowSeconds:2.5,slowFrameMs:20,verySlowFrameMs:40,settleSeconds:4,ignoreFrameMs:250,slowWindowsToDrop:2});
export function createQualityGovernor(level,{onChange=()=>{}}={}){
 const state={level,total:0,frames:0,settle:GOVERNOR.settleSeconds,slowWindows:0,drops:0};
 function sample(frameMs,active=true){
  if(!active||!(frameMs>0)||frameMs>GOVERNOR.ignoreFrameMs)return state.level;
  const seconds=frameMs/1000;
  // Right after a start or a change, shaders compile and textures upload: do not judge those frames.
  if(state.settle>0){state.settle-=seconds;return state.level;}
  state.total+=frameMs;state.frames++;
  if(state.total<GOVERNOR.windowSeconds*1000)return state.level;
  const average=state.total/state.frames;state.total=0;state.frames=0;
  state.slowWindows=average>GOVERNOR.slowFrameMs?state.slowWindows+1:0;
  if(state.slowWindows>=GOVERNOR.slowWindowsToDrop&&state.level>0){
   state.level=average>GOVERNOR.verySlowFrameMs?0:state.level-1;state.drops++;state.slowWindows=0;state.settle=GOVERNOR.settleSeconds;onChange(state.level,average);
  }
  return state.level;
 }
 return {sample,state:()=>({...state})};
}
