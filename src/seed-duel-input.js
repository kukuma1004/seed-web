// One input path shared by PC chords, simultaneous touches and the small + hints.
// No DOM dependency: cancellations and held guard are deterministic to inspect.
export const DUEL_INPUT_KEYS=Object.freeze({KeyJ:'attack',KeyK:'block',Space:'dodge',KeyO:'ult',KeyL:'heavy',KeyU:'skill1'});
export function createDuelChordInput({now=()=>performance.now(),blockHeld=()=>false,aim=()=>null,chordMs=70}={}){
 let pend=null,suppressBlock=false,pressedAim=null;const pressed=new Set();
 const direction=()=>{const d=aim();return Number.isFinite(d?.x)&&Number.isFinite(d?.y)&&Math.hypot(d.x,d.y)>.1?{x:d.x,y:d.y}:null;};
 const queue=(a,d)=>{pressed.add(a);pressedAim=a==='dodge'?null:d;};
 // Keep an aimed attack's direction even if the key/stick is released before
 // the paced frame. Basic dodge retains its existing live-movement/backstep
 // rule; this never holds movement or future aim.
 const fire=(a,fallback=null)=>{const d=direction()||fallback;if(['heavy','skill1','skill2'].includes(a)){pend=null;if(a==='heavy'||a==='skill2')suppressBlock=true;}queue(a,d);};
 function press(a){const t=now(),recent=pend&&t-pend.t<=chordMs;
  if(a==='block'){
   if(recent&&pend.a==='attack'){fire('heavy',pend.aim);return;}
   if(recent&&pend.a==='dodge'){fire('skill2',pend.aim);return;}
   if(pend){if(pend.a!=='block')queue(pend.a,pend.aim);pend=null;}pend={a,t,aim:direction()};return;
  }
  if(a==='attack'){
   if(blockHeld()){fire('heavy',recent?pend.aim:null);return;}
   if(recent&&pend.a==='dodge'){fire('skill1',pend.aim);return;}
  }
  if(a==='dodge'){
   if(blockHeld()){fire('skill2',recent?pend.aim:null);return;}
   if(recent&&pend.a==='attack'){fire('skill1',pend.aim);return;}
  }
  if(a==='attack'||a==='dodge'){if(pend&&pend.a!=='block')queue(pend.a,pend.aim);pend={a,t,aim:direction()};return;}
  fire(a);
 }
 function read(){
  if(pend&&now()-pend.t>chordMs){if(pend.a!=='block')queue(pend.a,pend.aim);pend=null;}
  if(!blockHeld())suppressBlock=false;
  const input={block:blockHeld()&&!suppressBlock&&pend?.a!=='block'};
  for(const a of pressed)input[a]=true;if(pressed.size&&pressedAim){input.aimX=pressedAim.x;input.aimY=pressedAim.y;}pressed.clear();pressedAim=null;return input;
 }
 function clear(){pend=null;suppressBlock=false;pressed.clear();pressedAim=null;}
 // OS cancellation is different from a valid short tap. Discard that control's
 // pending tap/chord, while leaving a different finger's held guard intact.
 function cancel(action){
  if(pend?.a===action)pend=null;
  const affected={attack:['attack','heavy','skill1'],dodge:['dodge','skill1','skill2'],block:['heavy','skill2'],skill1:['skill1','skill2']}[action]||[action];
  for(const a of affected)pressed.delete(a);
  if(!pressed.size)pressedAim=null;
 }
 return Object.freeze({press,fire,read,clear,cancel});
}
