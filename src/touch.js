// Movement owns its pointer; the separate dodge button never releases that pointer.
export function createTouchControls(canAct){
  const enabled=matchMedia('(any-pointer: coarse)').matches||navigator.maxTouchPoints>0||(typeof location!=='undefined'&&['localhost','127.0.0.1'].includes(location.hostname)&&new URLSearchParams(location.search).has('touchPreview'));
  document.body.classList.toggle('touch-mode',enabled);
  const panel=document.createElement('div');panel.id='touch-controls';panel.innerHTML=`<div id="move-stick" class="stick" role="group" aria-label="이동 조이스틱"><i></i><span>이동</span></div><button id="touch-dash" aria-label="회피">◇<small>회피</small></button>`;
  document.body.append(panel);
  const axes={move:{x:0,y:0},aim:{x:0,y:0}},owners=new Map();let dashUntil=0;
  function clear(role){axes[role].x=axes[role].y=0;document.querySelector(`#${role}-stick i`).style.transform='translate(-50%,-50%)';}
  function reset(){for(const [id,{element}] of owners){if(element.hasPointerCapture(id))element.releasePointerCapture(id);}owners.clear();clear('move');dashUntil=0;}
  for(const role of ['move']){
    const element=document.querySelector(`#${role}-stick`);
    function move(e){
      if(owners.get(e.pointerId)?.role!==role)return;
      const r=element.getBoundingClientRect(),radius=r.width*.35;
      let x=(e.clientX-r.left-r.width/2)/radius,y=(e.clientY-r.top-r.height/2)/radius;
      const magnitude=Math.hypot(x,y);if(magnitude>1){x/=magnitude;y/=magnitude;}
      axes[role].x=magnitude<.14?0:x;axes[role].y=magnitude<.14?0:y;
      element.querySelector('i').style.transform=`translate(calc(-50% + ${x*radius}px),calc(-50% + ${y*radius}px))`;
    }
    element.addEventListener('pointerdown',e=>{e.preventDefault();if(!canAct()||[...owners.values()].some(o=>o.role===role))return;owners.set(e.pointerId,{role,element});element.setPointerCapture(e.pointerId);move(e);});
    element.addEventListener('pointermove',move);
    for(const name of ['pointerup','pointercancel','lostpointercapture'])element.addEventListener(name,e=>{if(owners.get(e.pointerId)?.role===role){owners.delete(e.pointerId);clear(role);}});
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
    state(){return {enabled,move:{...axes.move},aim:{...axes.aim},pointers:owners.size};}
  };
}
