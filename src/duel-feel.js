// Presentation only: no damage, cooldown, AI, save or random-state mutations.
const STOP_SECONDS=.045,STOP_SCALE=.2,STOP_GAP=.12,LABEL_SECONDS=.55;
const SIGNALS=Object.freeze({
 pierceTip:Object.freeze({label:'창끝 적중',color:'#dbf6b1',priority:0,stop:false}),
 gravityPull:Object.freeze({label:'끌어오기!',color:'#d2a0ff',priority:0,stop:false}),
 heavyHit:Object.freeze({label:'강타!',color:'#ffd36b',priority:1,stop:true}),
 parry:Object.freeze({label:'반격 막기!',color:'#fff1b9',priority:2,stop:true}),
 guardBreak:Object.freeze({label:'막기 파괴!',color:'#ff947c',priority:3,stop:true}),
 link:Object.freeze({label:'연계!',color:'#d7efbc',priority:0,stop:false}),
});

export function createDuelFeel({reducedMotion=false}={}){
 return {reducedMotion:Boolean(reducedMotion),stopLeft:0,cooldown:0,
  label:'',labelLeft:0,labelX:0,labelY:0,labelColor:'',labelPriority:-1};
}

export function resetDuelFeel(feel){
 feel.stopLeft=feel.cooldown=feel.labelLeft=0;
 feel.label='';feel.labelColor='';feel.labelPriority=-1;
}

// Call after the rules step, before clearing its events. Supply coordinates from
// a fresh contact effect, not the attacker's guessed position. Existing engine
// freeze stays authoritative; a label must never add a second stop on top of it.
export function applyDuelFeelEvent(feel,event,x=0,y=0,options){
 const signal=SIGNALS[event];
 if(!signal||options?.contact===false)return false;
 if(feel.labelLeft<=0||signal.priority>feel.labelPriority){
  feel.label=signal.label;feel.labelColor=signal.color;
  feel.labelPriority=signal.priority;feel.labelLeft=LABEL_SECONDS;
  feel.labelX=Number.isFinite(x)?x:0;feel.labelY=Number.isFinite(y)?y:0;
 }
 if(signal.stop&&!feel.reducedMotion&&!(options?.engineFreeze>0)&&feel.cooldown<=0){
  feel.stopLeft=STOP_SECONDS;feel.cooldown=STOP_GAP;
 }
 return true;
}

// Consume real elapsed time, including a frame that crosses the stop boundary.
// Returns gameplay seconds; all label/cooldown decay remains on real time.
export function stepDuelFeel(feel,realDt,options){
 if(options?.reducedMotion!==undefined)feel.reducedMotion=Boolean(options.reducedMotion);
 if(options?.paused){resetDuelFeel(feel);return 0;}
 if(!Number.isFinite(realDt)||realDt<=0)return 0;
 if(feel.reducedMotion)feel.stopLeft=0;
 const stopped=Math.min(realDt,feel.stopLeft);
 feel.stopLeft=Math.max(0,feel.stopLeft-realDt);
 feel.cooldown=Math.max(0,feel.cooldown-realDt);
 feel.labelLeft=Math.max(0,feel.labelLeft-realDt);
 if(feel.labelLeft===0){feel.label='';feel.labelColor='';feel.labelPriority=-1;}
 return realDt-stopped*(1-STOP_SCALE);
}

// One touch owns one control until it ends/cancels. Multiple touches may own
// the same control; ending one guard touch must not release another guard touch.
// UI owns pointer capture and classes, and calls clear on blur/hidden/menu.
export function createDuelPointerHolds(){
 const pointers=new Map();
 return {
  begin(pointerId,action){
   if(!Number.isInteger(pointerId)||pointerId<0||typeof action!=='string'||!action||action.length>32)return false;
   if(pointers.has(pointerId)||pointers.size>=16)return false;
   pointers.set(pointerId,action);return true;
  },
  end(pointerId){
   if(!pointers.has(pointerId))return null;
   const action=pointers.get(pointerId);pointers.delete(pointerId);return action;
  },
  held(action){for(const value of pointers.values())if(value===action)return true;return false;},
  clear(){pointers.clear();},
  get size(){return pointers.size;},
 };
}
