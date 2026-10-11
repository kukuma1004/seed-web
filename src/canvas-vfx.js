// 2026-09-28 사용자: "수호전에서 타워 공격이 너무 허접해 보이던대? 기존 이미지를 활용해서"
// 본편 3D 전투가 쓰는 흑백 이펙트 소재(vfx-atlas-v1: 16칸)와 탄 빛·꼬리 소재(shot-atlas-v1: 16칸)를
// Canvas2D에서 법칙 색으로 물들여 더하기(lighter)로 그린다. 새 그림은 없다. 좌표·크기는 호출하는 쪽의 단위 그대로.
import {VFX_CELLS} from './vfx.js';
import {SHOT_CELLS} from './shot-auras.js';

const BASE=import.meta.env?.BASE_URL||'/';
const TRAIL_OF={seed:'leafTrail',reflect:'sparkTrail',split:'sparkTrail',chain:'crackleTrail',orbit:'trail',pierce:'trail',burst:'sparkTrail',recall:'trail',gravity:'trail',frost:'mistTrail'};
const TINT_LIMIT=24;

// Compact botanical silhouettes remain readable on light paving. The original
// painted projectile is drawn above these by the mode, and keeps its identity.
// This is presentation only: no hit radius, trajectory or event is changed.
function corePath(p,law){
 switch(law){
  case 'pierce':p.moveTo(.62,0);p.lineTo(-.31,-.16);p.lineTo(-.17,0);p.lineTo(-.31,.16);break;
  case 'reflect':p.moveTo(.48,0);p.lineTo(.03,-.29);p.lineTo(-.4,-.1);p.lineTo(-.29,.24);p.lineTo(.03,.29);break;
  case 'split':p.moveTo(.45,0);p.lineTo(.02,-.14);p.lineTo(-.23,-.38);p.lineTo(-.43,-.28);p.lineTo(-.15,0);p.lineTo(-.43,.28);p.lineTo(-.23,.38);p.lineTo(.02,.14);break;
  case 'chain':p.moveTo(.46,-.2);p.lineTo(.05,-.08);p.lineTo(.18,-.36);p.lineTo(-.43,.22);p.lineTo(-.03,.1);p.lineTo(-.17,.37);break;
  case 'recall':p.moveTo(.42,-.29);p.quadraticCurveTo(-.38,-.48,-.48,0);p.quadraticCurveTo(-.38,.48,.42,.29);p.lineTo(.13,.05);p.quadraticCurveTo(-.15,.13,-.18,0);p.quadraticCurveTo(-.15,-.13,.13,-.05);break;
  case 'burst':p.moveTo(.5,0);p.quadraticCurveTo(.14,-.17,-.05,-.43);p.quadraticCurveTo(-.03,-.19,-.18,-.15);p.quadraticCurveTo(-.39,-.42,-.4,-.07);p.quadraticCurveTo(-.5,.22,-.2,.33);p.quadraticCurveTo(.12,.38,.5,0);break;
  case 'frost':for(let i=0;i<12;i++){const a=i*Math.PI/6,r=i%2?.18:.44;p[i?'lineTo':'moveTo'](Math.cos(a)*r,Math.sin(a)*r);}break;
  case 'orbit':p.moveTo(.45,0);p.ellipse(0,0,.45,.27,0,0,Math.PI*2);p.moveTo(.27,0);p.ellipse(0,0,.27,.13,0,0,Math.PI*2,true);break;
  case 'gravity':p.moveTo(.4,-.07);p.bezierCurveTo(.34,-.45,-.43,-.38,-.43,.07);p.bezierCurveTo(-.4,.48,.27,.44,.34,.11);p.bezierCurveTo(.1,.3,-.16,.17,-.16,-.02);p.bezierCurveTo(-.13,-.17,.19,-.17,.4,-.07);break;
  default:p.moveTo(.45,0);p.quadraticCurveTo(-.05,-.47,-.43,-.12);p.quadraticCurveTo(-.14,.34,.45,0);
 }
 p.closePath();
}

export function createCanvasVfx({onReady=()=>{}}={}){
 const atlases={},tinted=new Map(),corePaths={};
 if(typeof Path2D==='function')for(const law of Object.keys(TRAIL_OF)){const path=new Path2D();corePath(path,law);corePaths[law]=path;}
 function clearTints(){for(const c of tinted.values())c.width=c.height=0;tinted.clear();}
 for(const [key,file] of [['fx','vfx-atlas-v1.webp'],['shot','shot-atlas-v1.webp']]){const img=new Image();img.onload=()=>{clearTints();onReady();};img.src=BASE+'assets/'+file;atlases[key]=img;}
 const ready=key=>atlases[key]?.complete&&atlases[key].naturalWidth>0;
 // 흑백 소재 × 색 = 물든 소재. 검정 바탕은 더하기에서 사라진다. 색마다 한 번만 만든다.
 function tint(key,color){
  const id=key+color;let c=tinted.get(id);if(c)return c;const img=atlases[key];
  c=document.createElement('canvas');c.width=img.naturalWidth;c.height=img.naturalHeight;const g=c.getContext('2d');
  g.drawImage(img,0,0);g.globalCompositeOperation='multiply';g.fillStyle=color;g.fillRect(0,0,c.width,c.height);
  // 흰 심지를 조금 남겨 빛나 보이게.
  g.globalCompositeOperation='lighter';g.globalAlpha=.08;g.drawImage(img,0,0);
  // Normal law palettes fit in this small cache. A mode-specific or changing
  // colour cannot retain an unbounded number of full atlas canvases.
  if(tinted.size>=TINT_LIMIT){const oldest=tinted.keys().next().value,old=tinted.get(oldest);old.width=old.height=0;tinted.delete(oldest);}
  tinted.set(id,c);return c;
 }
 function cell(ctx,key,index,x,y,size,{rotation=0,color='#ffffff',alpha=1,stretch=1}={}){
  if(!ready(key)||!(size>0)||alpha<=0)return false;const img=tint(key,color),w=img.width/4,h=img.height/4;
  ctx.save();ctx.globalCompositeOperation='lighter';ctx.globalAlpha=Math.min(1,alpha);ctx.translate(x,y);if(rotation)ctx.rotate(rotation);
  ctx.drawImage(img,(index%4)*w,Math.floor(index/4)*h,w,h,-size*stretch/2,-size/2,size*stretch,size);ctx.restore();return true;
 }
 // Area radii remain truthful, but many simultaneous additive impacts must not
 // wash out the path and actors. Keep a small highlight rather than white fog.
 const fx=(ctx,name,x,y,size,o={})=>cell(ctx,'fx',VFX_CELLS[name],x,y,size,{...o,alpha:(o.alpha??1)*.5});
 const shot=(ctx,name,x,y,size,o)=>cell(ctx,'shot',SHOT_CELLS[name],x,y,size,o);
 // 두 점 사이를 번개·빛줄기 칸으로 잇는다(칸은 세로로 그려져 있어 90° 돌린다).
 function beam(ctx,name,x,y,tx,ty,width,o={}){const dx=tx-x,dy=ty-y,len=Math.hypot(dx,dy);if(len<.01)return;const key=Object.hasOwn(VFX_CELLS,name)?'fx':'shot';cell(ctx,key,key==='fx'?VFX_CELLS[name]:SHOT_CELLS[name],(x+tx)/2,(y+ty)/2,len,{...o,rotation:Math.atan2(dy,dx)+Math.PI/2,stretch:width/len});}
 function core(ctx,law,x,y,angle,size,color,alpha=1){
  if(!(size>0)||!Number.isFinite(size)||alpha<=0)return;
  ctx.save();ctx.globalCompositeOperation='source-over';ctx.globalAlpha=Math.min(.94,alpha);ctx.translate(x,y);ctx.rotate(angle);ctx.scale(size,size);ctx.fillStyle=color;ctx.strokeStyle='#18302c';ctx.lineWidth=.075;ctx.lineJoin='round';
  const path=corePaths[law]||corePaths.seed;
  if(path){ctx.fill(path,'evenodd');ctx.stroke(path);}else{ctx.beginPath();corePath(ctx,law);ctx.fill('evenodd');ctx.stroke();}
  ctx.restore();
 }

 // 탄 한 발: 뒤에 꼬리, 가운데 빛 무늬(돈다). 탄 그림(원래 그림)은 호출하는 쪽이 위에 그린다.
 function projectile(ctx,law,x,y,angle,size,color,now=0){
  const key=TRAIL_OF[law]?law:'seed';
  if(!(size>0)||!Number.isFinite(size))return;
  shot(ctx,TRAIL_OF[key],x-Math.cos(angle)*size*.58,y-Math.sin(angle)*size*.58,size*1.25,{rotation:angle+Math.PI/2,color,alpha:.42,stretch:.4});
  shot(ctx,key,x,y,size*1.04,{rotation:key==='pierce'?angle+Math.PI/2:now*.004*(key==='chain'?2.4:1.4),color,alpha:.4});
  core(ctx,key,x,y,angle,size,color);
 }

 // 효과 하나. e: {kind,x,y,tx,ty,radius,law}, t: 0(시작)→1(끝), size: 기본 크기 단위.
 function effect(ctx,e,t,color,unit=1){
  const a=Math.max(0,1-t),grow=.45+t*.75,r=(e.radius||1.3*unit),k=e.kind,x=e.x,y=e.y,tx=e.tx??x,ty=e.ty??y,seed=(e.x*7.13+e.y*3.7)%6.28;
  switch(k){
   case 'chain':case 'line':case 'arc':case 'beam':case 'lance':case 'frostWeb':case 'rewindTrace':
    if(k==='frostWeb'||e.law==='frost'){beam(ctx,'mist',x,y,tx,ty,unit*1.4,{color,alpha:a*.8});fx(ctx,'shard',tx,ty,unit*1.6*grow,{color,alpha:a,rotation:seed});}
    else if(k==='lance'||e.law==='pierce'){beam(ctx,'crackleTrail',x,y,tx,ty,unit*1.1,{color,alpha:a});fx(ctx,'star',tx,ty,unit*1.8,{color,alpha:a});}
    else if(k==='rewindTrace'||e.law==='recall'){beam(ctx,'leafTrail',x,y,tx,ty,unit*.9,{color,alpha:a*.8});fx(ctx,'crescent',tx,ty,unit*1.6,{color,alpha:a,rotation:seed+t*4});}
    else{beam(ctx,'lightning',x,y,tx,ty,unit*1.6,{color,alpha:a});fx(ctx,'orb',tx,ty,unit*1.3,{color,alpha:a*.8});fx(ctx,'star',x,y,unit*1.1,{color,alpha:a*.7});}
    return;
   case 'burst':case 'explosion':case 'flame':
    fx(ctx,'orb',x,y,r*1.7*grow,{color,alpha:a*.5});fx(ctx,'flame',x,y-r*.2,r*1.8*(1-t*.3),{color,alpha:a*.8});fx(ctx,'ring',x,y,r*2.6*grow,{color,alpha:a*.65});fx(ctx,'flecks',x,y,r*2.4*grow,{color,alpha:a*.8,rotation:seed});core(ctx,'burst',x,y,seed,Math.min(r*.8,unit*1.2),color,a);return;
   case 'sunburst':
    fx(ctx,'sigil',x,y,r*2.4,{color,alpha:a*.6,rotation:t*1.5});fx(ctx,'star',x,y,r*2.8*grow,{color,alpha:a});fx(ctx,'ring',x,y,r*3*grow,{color,alpha:a*.7});return;
   case 'well':case 'gravity':case 'gardenVortex':
    shot(ctx,'gravity',x,y,r*2.4,{color,alpha:a*.4,rotation:-t*6-seed});fx(ctx,'mist',x,y,r*2.6,{color,alpha:a*.3});if(k==='gardenVortex')fx(ctx,'petal',x,y,r*1.4*grow,{color,alpha:a,rotation:t*3});return;
   case 'pulse':case 'orbit':
    fx(ctx,'ring',x,y,r*2.2*grow,{color,alpha:a});fx(ctx,'flecks',x,y,r*2*grow,{color,alpha:a*.6,rotation:seed});return;
   case 'split':
    for(let i=0;i<3;i++){const b=seed+i*2.09,d=r*t*1.1;fx(ctx,'petal',x+Math.cos(b)*d,y+Math.sin(b)*d,unit*1.4*(1-t*.4),{color,alpha:a,rotation:b+t*3});}return;
   case 'reflect':case 'mirrorArc':
    fx(ctx,'shard',x,y,unit*1.8*grow,{color,alpha:a,rotation:seed});fx(ctx,'crescent',x,y,r*1.8,{color,alpha:a*.8,rotation:seed+t*2});return;
   case 'portal':
    fx(ctx,'sigil',x,y,r*2,{color,alpha:a,rotation:t*3});fx(ctx,'orb',x,y,r*1.2,{color,alpha:a*.6});return;
   case 'death':
    fx(ctx,'spores',x,y,unit*3*grow,{color,alpha:a});fx(ctx,'leaf',x+Math.cos(seed)*t*unit,y-t*unit*1.2,unit*1.4,{color,alpha:a,rotation:seed+t*4});return;
   case 'core':case 'warning':
    fx(ctx,'shock',x,y,r*2.4*grow,{color,alpha:a});return;
   case 'trail':
    fx(ctx,'trail',x,y,unit*1.4,{color,alpha:a*.6,rotation:seed});return;
   case 'muzzle':
    fx(ctx,'star',x,y,unit*1.3*(1-t*.5),{color,alpha:a});return;
   default:
    // 맞힘: 별빛 한 번 + 부스러기.
    fx(ctx,'star',x,y,unit*1.65*(1-t*.4),{color,alpha:a*.7,rotation:seed});fx(ctx,'flecks',x,y,unit*2*grow,{color,alpha:a*.65,rotation:seed});core(ctx,TRAIL_OF[e.law]?e.law:'seed',x,y,seed,unit*(.85-t*.3),color,a);
  }
 }
 // 오래 남는 장판: 중력 우물·서리 그물.
 function field(ctx,f,alpha,now,color){
  if(f.kind==='web'){fx(ctx,'shard',f.x,f.y,f.radius*1.2,{color,alpha:alpha*.55,rotation:now*.0003});shot(ctx,'frost',f.x,f.y,f.radius*1.9,{color,alpha:alpha*.3,rotation:now*.0004});return;}
  shot(ctx,'gravity',f.x,f.y,f.radius*2.3,{color,alpha:alpha*.33,rotation:-now*.003});fx(ctx,'mist',f.x,f.y,f.radius*2.4,{color,alpha:alpha*.3});
 }
 return {ready:()=>ready('fx')&&ready('shot'),effect,projectile,field,fx,shot,beam};
}
