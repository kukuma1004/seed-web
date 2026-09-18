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

// Watches frame times while the game is being played and steps quality down when frames stay slow.
// It never steps back up by itself, so the picture does not flicker between levels.
// Average FPS alone hid short freezes: a few 80-250 ms frames were diluted by the
// next smooth frames, while frames over 250 ms were ignored entirely. Count jank
// inside the same window and cap only true tab/app suspensions.
export const GOVERNOR=Object.freeze({windowSeconds:2,slowFrameMs:20,verySlowFrameMs:40,jankFrameMs:28,severeFrameMs:80,jankRatio:.12,severeFrames:3,settleSeconds:3,ignoreFrameMs:1000,slowWindowsToDrop:2});
export function createQualityGovernor(level,{onChange=()=>{}}={}){
 const state={level,total:0,frames:0,jank:0,severe:0,settle:GOVERNOR.settleSeconds,slowWindows:0,drops:0,lastAverage:0,lastJankRatio:0};
 function sample(frameMs,active=true){
  if(!active||!(frameMs>0)||frameMs>GOVERNOR.ignoreFrameMs)return state.level;
  const seconds=frameMs/1000;
  // Right after a start or a change, shaders compile and textures upload: do not judge those frames.
  if(state.settle>0){state.settle-=seconds;return state.level;}
  state.total+=frameMs;state.frames++;if(frameMs>=GOVERNOR.jankFrameMs)state.jank++;if(frameMs>=GOVERNOR.severeFrameMs)state.severe++;
  if(state.total<GOVERNOR.windowSeconds*1000)return state.level;
  const average=state.total/state.frames,jankRatio=state.jank/state.frames,severe=state.severe;
  state.lastAverage=average;state.lastJankRatio=jankRatio;state.total=0;state.frames=0;state.jank=0;state.severe=0;
  const visiblyJanky=jankRatio>=GOVERNOR.jankRatio||severe>=GOVERNOR.severeFrames;
  state.slowWindows=average>GOVERNOR.slowFrameMs||visiblyJanky?state.slowWindows+1:0;
  if((state.slowWindows>=GOVERNOR.slowWindowsToDrop||severe>=GOVERNOR.severeFrames)&&state.level>0){
   state.level=average>GOVERNOR.verySlowFrameMs?0:state.level-1;state.drops++;state.slowWindows=0;state.settle=GOVERNOR.settleSeconds;onChange(state.level,average);
  }
  return state.level;
 }
 return {sample,state:()=>({...state})};
}
