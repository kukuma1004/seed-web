// Pointer-driven combat buttons must fire on pointerdown, not on the synthetic click
// some mobile browsers omit while another finger owns the movement stick. The click
// fallback keeps mouse and keyboard activation accessible and is deduplicated.
export function bindPointerAction(root,{selector=null,onPress,now=()=>performance.now()}={}){
  const pointers=new Map();let lastPointerAt=-Infinity;
  const targetOf=event=>{
    const target=selector?event.target?.closest?.(selector):root;
    if(!target||(selector&&root.contains&&!root.contains(target)))return null;
    return target;
  };
  const finish=event=>{
    const target=pointers.get(event.pointerId);if(!target)return;
    pointers.delete(event.pointerId);
    try{if(target.hasPointerCapture?.(event.pointerId))target.releasePointerCapture(event.pointerId);}catch{}
  };
  const reset=()=>{for(const [id,target] of pointers)try{if(target.hasPointerCapture?.(id))target.releasePointerCapture(id);}catch{}pointers.clear();};
  root.addEventListener('pointerdown',event=>{
    if(event.pointerType==='mouse'&&event.button!==undefined&&event.button!==0)return;
    const target=targetOf(event);if(!target||pointers.has(event.pointerId))return;
    event.preventDefault();pointers.set(event.pointerId,target);lastPointerAt=now();
    try{target.setPointerCapture?.(event.pointerId);}catch{}
    if(onPress?.(target,event)===false)finish(event);
  });
  root.addEventListener('click',event=>{
    const target=targetOf(event);if(!target)return;
    // detail=0 is keyboard activation and must never be swallowed.
    if(event.detail!==0&&now()-lastPointerAt<800){event.preventDefault();return;}
    onPress?.(target,event);
  });
  for(const name of ['pointerup','pointercancel','lostpointercapture'])root.addEventListener(name,finish);
  globalThis.window?.addEventListener?.('pointerup',finish);
  globalThis.window?.addEventListener?.('pointercancel',finish);
  globalThis.window?.addEventListener?.('blur',reset);
  return {reset,state:()=>({pointers:pointers.size})};
}

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
  const panel=document.createElement('div');panel.id='touch-controls';panel.innerHTML=`<div id="move-zone" aria-hidden="true"></div><div id="move-stick" class="stick" role="group" aria-label="이동 조이스틱"><i></i><span>이동</span></div><button id="touch-dash" aria-label="회피">◇<span class="dash-charges" aria-hidden="true"><i></i><i></i></span><small>회피</small></button>`;
  document.body.append(panel);
  const axes={move:{x:0,y:0},aim:{x:0,y:0}},owners=new Map();let dashUntil=0,center=null;
  const stick=document.querySelector('#move-stick'),knob=document.querySelector('#move-stick i'),zone=document.querySelector('#move-zone');
  const viewport=()=>({w:document.documentElement?.clientWidth||window.innerWidth||Infinity,h:document.documentElement?.clientHeight||window.innerHeight||Infinity});
  const clamp=(v,lo,hi)=>Math.min(Math.max(v,lo),Math.max(lo,hi));
  function float(x,y){stick.style.left=`${x}px`;stick.style.top=`${y}px`;stick.classList.toggle('floating',true);}
  function rest(){stick.style.left='';stick.style.top='';stick.classList.toggle('floating',false);center=null;}
  function clear(){axes.move.x=axes.move.y=0;knob.style.transform='translate(-50%,-50%)';rest();}
  function resetMovement(){for(const [id,{element}] of owners){if(element.hasPointerCapture(id))element.releasePointerCapture(id);}owners.clear();clear();dashUntil=0;}
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
    // Speed curve (2026-09-15: half a push only gave half speed, which felt sluggish on a small phone stick).
    // Past the dead zone the seed starts at 35% speed and reaches full speed at 60% of the stick radius.
    const push=Math.min(1,magnitude),speed=push<.14?0:Math.min(1,.35+.65*(push-.14)/(.6-.14)),scale=push>0?speed/push:0;
    axes.move.x=x*scale;axes.move.y=y*scale;
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
  const dashButton=document.querySelector('#touch-dash'),dashLabel=dashButton.querySelector('small'),dashCharges=dashButton.querySelector('.dash-charges');
  const dashPress=bindPointerAction(dashButton,{onPress:()=>{if(!canAct())return false;dashUntil=performance.now()+220;return true;}});
  window.addEventListener('blur',resetMovement);window.addEventListener('resize',resetMovement);
  document.addEventListener('visibilitychange',()=>{if(document.hidden)resetMovement();});
  return {enabled,axes,reset(){dashPress.reset();resetMovement();},
    consumeDash(){const active=dashUntil>performance.now();dashUntil=0;return active;},
    update(active,cooldown,dash={charges:cooldown>0?0:1,maxCharges:1,recharge:cooldown},context={}){
      if(panel.hidden!==!active)panel.hidden=!active;
      if(!active){if(owners.size||dashUntil)resetMovement();return;}
      const exiting=Boolean(context.exit),label=exiting?'이동':dash.maxCharges>1?`회피 ${dash.charges}/${dash.maxCharges}`:cooldown>0?`${cooldown.toFixed(1)}초`:'회피',cooling=!exiting&&!dash.charges;
      if(dashButton.__cooling!==cooling){dashButton.classList.toggle('cooling',cooling);dashButton.__cooling=cooling;}
      const chargeKey=`${dash.charges}/${dash.maxCharges}`;
      if(dashButton.__charges!==chargeKey){dashButton.classList.toggle('double',dash.maxCharges>1);dashButton.classList.toggle('recharging',dash.charges<dash.maxCharges);if(dashCharges)for(const [i,pip] of [...dashCharges.children].entries())pip.classList.toggle('ready',i<dash.charges);dashButton.__charges=chargeKey;}
      if(dashLabel.textContent!==label)dashLabel.textContent=label;
      const aria=exiting?'다음 방으로 이동':`회피${dash.maxCharges>1?` · ${dash.charges}/${dash.maxCharges} 충전`:cooldown>0?` · ${cooldown.toFixed(1)}초 뒤 준비`:' · 준비'}`;
      if(dashButton.__aria!==aria){dashButton.setAttribute?.('aria-label',aria);dashButton.__aria=aria;}
    },
    state(){return {enabled,move:{...axes.move},aim:{...axes.aim},pointers:owners.size+dashPress.state().pointers,floating:Boolean(center?.floating),center:center?{x:center.x,y:center.y}:null};}
  };
}
