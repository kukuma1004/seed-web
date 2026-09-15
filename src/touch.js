// Movement owns its pointer; the separate dodge button never releases that pointer.
// The stick floats: a thumb pressed anywhere in the left movement zone becomes the stick's centre,
// and dragging far past the rim pulls the stick along. Pressing the resting stick itself works as before.
export function createTouchControls(canAct){
  const enabled=matchMedia('(any-pointer: coarse)').matches||navigator.maxTouchPoints>0||(typeof location!=='undefined'&&['localhost','127.0.0.1'].includes(location.hostname)&&new URLSearchParams(location.search).has('touchPreview'));
  document.body.classList.toggle('touch-mode',enabled);
  if(enabled&&!document.__seedTouchGuard){
    document.__seedTouchGuard=true;
    const nativeTarget=target=>Boolean(target?.closest?.('input,textarea,select,[contenteditable="true"],[data-native-touch]'));
    const blockNativeGesture=event=>{if(!nativeTarget(event.target))event.preventDefault();};
    for(const name of ['gesturestart','gesturechange','gestureend','selectstart','contextmenu','dragstart'])document.addEventListener(name,blockNativeGesture,{passive:false});
    document.addEventListener('touchmove',event=>{if(event.touches?.length>1&&!nativeTarget(event.target))event.preventDefault();},{passive:false});
  }
  const panel=document.createElement('div');panel.id='touch-controls';panel.innerHTML=`<div id="move-zone" aria-hidden="true"></div><div id="move-stick" class="stick" role="group" aria-label="이동 조이스틱"><i></i><span>이동</span></div><button id="touch-dash" aria-label="회피">◇<small>회피</small></button>`;
  document.body.append(panel);
  const axes={move:{x:0,y:0},aim:{x:0,y:0}},owners=new Map();let dashUntil=0,center=null;
  const stick=document.querySelector('#move-stick'),knob=document.querySelector('#move-stick i'),zone=document.querySelector('#move-zone');
  const viewport=()=>({w:document.documentElement?.clientWidth||window.innerWidth||Infinity,h:document.documentElement?.clientHeight||window.innerHeight||Infinity});
  const clamp=(v,lo,hi)=>Math.min(Math.max(v,lo),Math.max(lo,hi));
  function float(x,y){stick.style.left=`${x}px`;stick.style.top=`${y}px`;stick.classList.toggle('floating',true);}
  function rest(){stick.style.left='';stick.style.top='';stick.classList.toggle('floating',false);center=null;}
  function clear(){axes.move.x=axes.move.y=0;knob.style.transform='translate(-50%,-50%)';rest();}
  function reset(){for(const [id,{element}] of owners){if(element.hasPointerCapture(id))element.releasePointerCapture(id);}owners.clear();clear();dashUntil=0;}
  function move(e){
    if(owners.get(e.pointerId)?.role!=='move'||!center)return;
    let dx=e.clientX-center.x,dy=e.clientY-center.y;
    const reach=Math.hypot(dx,dy),leash=center.radius*1.7;
    if(center.floating&&reach>leash){
      // Pull the stick after a thumb that has wandered off, so it never needs to be found again.
      const {w,h}=viewport(),pull=1-leash/reach;
      center.x=clamp(center.x+dx*pull,center.half+6,w-center.half-6);center.y=clamp(center.y+dy*pull,center.half+6,h-center.half-6);
      float(center.x,center.y);dx=e.clientX-center.x;dy=e.clientY-center.y;
    }
    let x=dx/center.radius,y=dy/center.radius;
    const magnitude=Math.hypot(x,y);if(magnitude>1){x/=magnitude;y/=magnitude;}
    axes.move.x=magnitude<.14?0:x;axes.move.y=magnitude<.14?0:y;
    knob.style.transform=`translate(calc(-50% + ${x*center.radius}px),calc(-50% + ${y*center.radius}px))`;
  }
  function begin(e,element,floating){
    e.preventDefault();
    if(!canAct()||[...owners.values()].some(o=>o.role==='move'))return;
    const r=stick.getBoundingClientRect(),size=r.width||118,half=size/2;
    if(floating){
      const {w,h}=viewport();
      center={x:clamp(e.clientX,half+6,w-half-6),y:clamp(e.clientY,half+6,h-half-6),radius:size*.35,half,floating:true};
      float(center.x,center.y);
    }else center={x:r.left+r.width/2,y:r.top+r.height/2,radius:size*.35,half,floating:false};
    owners.set(e.pointerId,{role:'move',element});
    element.setPointerCapture(e.pointerId);move(e);
  }
  function end(e){if(owners.get(e.pointerId)?.role==='move'){owners.delete(e.pointerId);clear();}}
  for(const [element,floating] of [[stick,false],[zone,true]]){
    if(!element)continue;
    element.addEventListener('pointerdown',e=>begin(e,element,floating));
    element.addEventListener('pointermove',move);
    for(const name of ['pointerup','pointercancel','lostpointercapture'])element.addEventListener(name,end);
  }
  const dashButton=document.querySelector('#touch-dash'),dashLabel=dashButton.querySelector('small');
  dashButton.addEventListener('pointerdown',e=>{e.preventDefault();if(canAct())dashUntil=performance.now()+220;});
  window.addEventListener('blur',reset);window.addEventListener('resize',reset);
  document.addEventListener('visibilitychange',()=>{if(document.hidden)reset();});
  return {enabled,axes,reset,
    consumeDash(){const active=dashUntil>performance.now();dashUntil=0;return active;},
    update(active,cooldown){
      if(panel.hidden!==!active)panel.hidden=!active;
      if(!active){if(owners.size||dashUntil)reset();return;}
      const label=cooldown>0?`${cooldown.toFixed(1)}초`:'회피',cooling=cooldown>0;
      if(dashButton.__cooling!==cooling){dashButton.classList.toggle('cooling',cooling);dashButton.__cooling=cooling;}
      if(dashLabel.textContent!==label)dashLabel.textContent=label;
    },
    state(){return {enabled,move:{...axes.move},aim:{...axes.aim},pointers:owners.size,floating:Boolean(center?.floating),center:center?{x:center.x,y:center.y}:null};}
  };
}
