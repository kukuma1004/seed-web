// One input path shared by PC chords, simultaneous touches and the small + hints.
// No DOM dependency: cancellations and held guard are deterministic to inspect.
export const DUEL_INPUT_KEYS=Object.freeze({KeyJ:'attack',KeyK:'block',Space:'dodge',KeyO:'ult',KeyL:'heavy',KeyU:'skill1'});
export function createDuelChordInput({now=()=>performance.now(),blockHeld=()=>false,chordMs=70}={}){
 let pend=null,suppressBlock=false;const pressed=new Set();
 const fire=a=>{if(['heavy','skill1','skill2'].includes(a)){pend=null;if(a==='heavy'||a==='skill2')suppressBlock=true;}pressed.add(a);};
 function press(a){const t=now(),recent=pend&&t-pend.t<=chordMs;
  if(a==='block'){
   if(recent&&pend.a==='attack'){fire('heavy');return;}
   if(recent&&pend.a==='dodge'){fire('skill2');return;}
   if(pend){if(pend.a!=='block')pressed.add(pend.a);pend=null;}pend={a,t};return;
  }
  if(a==='attack'){
   if(blockHeld()){fire('heavy');return;}
   if(recent&&pend.a==='dodge'){fire('skill1');return;}
  }
  if(a==='dodge'){
   if(blockHeld()){fire('skill2');return;}
   if(recent&&pend.a==='attack'){fire('skill1');return;}
  }
  if(a==='attack'||a==='dodge'){if(pend&&pend.a!=='block')pressed.add(pend.a);pend={a,t};return;}
  fire(a);
 }
 function read(){
  if(pend&&now()-pend.t>chordMs){if(pend.a!=='block')pressed.add(pend.a);pend=null;}
  if(!blockHeld())suppressBlock=false;
  const input={block:blockHeld()&&!suppressBlock&&pend?.a!=='block'};
  for(const a of pressed)input[a]=true;pressed.clear();return input;
 }
 function clear(){pend=null;suppressBlock=false;pressed.clear();}
 return Object.freeze({press,fire,read,clear});
}
