// World-space Canvas strokes only; visuals never write to combat objects.
import {DUEL_BATCH59_KINDS,DUEL_BATCH59_SHOTS} from './seed-duel-batch59.js';
const finitePoint=p=>p&&Number.isFinite(p.x)&&Number.isFinite(p.y);
const endpoint=h=>({x:h.endX,y:h.endY});
const live=(h,field)=>!h.cancelled&&Number.isFinite(h[field])&&h[field]>0;
function colors(owner){return owner===0?['#223f48','#bcdedc','#fff4c7']:['#603039','#ffab93','#ffe8d1'];}
function stroke(ctx,owner){const [edge,ink,core]=colors(owner);ctx.strokeStyle=edge;ctx.lineWidth=.075;ctx.stroke();ctx.strokeStyle=ink;ctx.lineWidth=.045;ctx.stroke();ctx.strokeStyle=core;ctx.lineWidth=.025;ctx.stroke();}
function dot(ctx,x,y,r=.12){ctx.moveTo(x+r,y);ctx.arc(x,y,r,0,Math.PI*2);}
function segment(ctx,a,b){ctx.moveTo(a.x,a.y);ctx.lineTo(b.x,b.y);}
function recorded(p){const path=p?.path;return Array.isArray(path)&&path.length>=2&&path.length<=42&&path.every(finitePoint)?path:null;}
function trace(ctx,path,last=path.length-1){ctx.moveTo(path[0].x,path[0].y);for(let i=1;i<=last;i++)ctx.lineTo(path[i].x,path[i].y);}
function facing(q){const path=recorded(q.data);let from,to;
 if(path&&(q.stage==='back'||q.stage==='path')){const n=q.node;if(Number.isInteger(n)&&n>=0&&n<path.length){from=q;to=path[n];}}
 else if(path&&q.stage==='pause'){from=path[path.length-2];to=path[path.length-1];}
 else if(finitePoint(q.data?.start)){from=q.data.start;to=q;}
 if(from&&to&&Math.hypot(to.x-from.x,to.y-from.y)>1e-9)return Math.atan2(to.y-from.y,to.x-from.x);
 return Number.isFinite(q.angle)?q.angle:Number.isFinite(q.dx)&&Number.isFinite(q.dy)?Math.atan2(q.dy,q.dx):0;
}
function leaf(ctx,q){const a=facing(q),ux=Math.cos(a),uy=Math.sin(a),px=-uy,py=ux;ctx.moveTo(q.x+ux*.23,q.y+uy*.23);ctx.lineTo(q.x+px*.11,q.y+py*.11);ctx.lineTo(q.x-ux*.19,q.y-uy*.19);ctx.lineTo(q.x-px*.11,q.y-py*.11);ctx.closePath();segment(ctx,{x:q.x-ux*.15,y:q.y-uy*.15},{x:q.x+ux*.19,y:q.y+uy*.19});}
export function drawBatch59Hazard(ctx,h){
 if(!DUEL_BATCH59_KINDS.includes(h?.kind))return false;
 if(!finitePoint(h)||!live(h,'t'))return true;
 ctx.save();try{ctx.lineCap='round';ctx.lineJoin='round';ctx.globalAlpha=h.triggered?.55:.85;ctx.setLineDash(h.arm>0?[.09,.13]:[]);ctx.beginPath();
  if(h.kind==='twinCalyx59'){
   // The authoritative three physical tips, not a radius/ring area or invented endpoints.
   const points=h.data?.points;if(Array.isArray(points)&&points.length===3)for(const q of points)if(finitePoint(q)&&live(q,'life')){const a=Number.isFinite(q.angle)?q.angle:0,ux=Math.cos(a),uy=Math.sin(a);ctx.moveTo(q.x-ux*.14+uy*.09,q.y-uy*.14-ux*.09);ctx.lineTo(q.x,q.y);ctx.lineTo(q.x-ux*.14-uy*.09,q.y-uy*.14+ux*.09);}
  }else if(h.kind==='twinCalyxTell59'){
   const e=endpoint(h);if(finitePoint(e)&&Number.isFinite(h.dx)&&Number.isFinite(h.dy)){const a=Math.atan2(h.dy,h.dx)+Math.PI/3;for(let i=0;i<3;i++)dot(ctx,e.x+Math.cos(a+i*Math.PI*2/3)*.3,e.y+Math.sin(a+i*Math.PI*2/3)*.3,.09);}
  }else if(h.kind==='twinCrossbarTell59'){
   const e=endpoint(h);if(finitePoint(e)&&Number.isFinite(h.dx)&&Number.isFinite(h.dy)){dot(ctx,e.x+h.dy*.65,e.y-h.dx*.65,.07);dot(ctx,e.x-h.dy*.65,e.y+h.dx*.65,.07);}
  }else if(h.kind==='twinRecordTell59'){
   // No curved route exists before recording; mark only the actual fixed launch.
   dot(ctx,h.x,h.y,.12);if(Number.isFinite(h.dx)&&Number.isFinite(h.dy))segment(ctx,h,{x:h.x+h.dx*.32,y:h.y+h.dy*.32});
  }else if(h.kind==='twinReturnTell59'){
   const path=recorded(h.data);if(path)trace(ctx,path);dot(ctx,h.x,h.y,.1);
  }else if(h.kind==='twinIgnitionTell59'){
   // Tiny fixed contact tell; children supply their wall-clipped twig endpoints later.
   for(let i=0;i<3;i++){const a=i*Math.PI*2/3;segment(ctx,{x:h.x+Math.cos(a)*.09,y:h.y+Math.sin(a)*.09},{x:h.x+Math.cos(a)*.2,y:h.y+Math.sin(a)*.2});}
  }else if(h.kind==='twinIgnitionDot59'){
   if(Number.isFinite(h.r)&&h.r>0&&h.r<=.45)dot(ctx,h.x,h.y,h.r);dot(ctx,h.x,h.y,.05);
  }else if(h.kind==='twinConductorTell59'||h.kind==='twinTwig59'||h.kind==='twinJump59'){
   const e=endpoint(h);if(finitePoint(e))segment(ctx,h,e);
   if(h.kind==='twinConductorTell59'&&finitePoint(e))dot(ctx,e.x,e.y,.08);
  }
  stroke(ctx,h.owner);return true;
 }finally{ctx.restore();}
}
export function drawBatch59Projectile(ctx,q){
 if(!DUEL_BATCH59_SHOTS.includes(q?.kind))return false;
 if(!finitePoint(q)||!live(q,'life'))return true;
 ctx.save();try{ctx.lineCap='round';ctx.lineJoin='round';ctx.globalAlpha=q.stage==='dwell'?.45:.95;ctx.setLineDash([]);
  const path=recorded(q.data);
  if(q.kind==='twinRecordedLeaf59'&&path&&(q.stage==='pause'||q.stage==='back')){ctx.globalAlpha=.35;ctx.setLineDash([.07,.12]);ctx.beginPath();trace(ctx,path,q.stage==='back'?Math.max(0,Math.min(path.length-1,q.node+1)):path.length-1);stroke(ctx,q.owner);ctx.setLineDash([]);ctx.globalAlpha=.95;}
  ctx.beginPath();
  if(q.kind==='twinRecordedLeaf59'){
   leaf(ctx,q);if(q.stage==='pause'){const a=facing(q),px=-Math.sin(a),py=Math.cos(a);segment(ctx,{x:q.x+px*.18,y:q.y+py*.18},{x:q.x+px*.27,y:q.y+py*.27});segment(ctx,{x:q.x-px*.18,y:q.y-py*.18},{x:q.x-px*.27,y:q.y-py*.27});}
  }else if(q.kind==='twinConductor59'){
   const a=facing(q),ux=Math.cos(a),uy=Math.sin(a);segment(ctx,{x:q.x-ux*.25,y:q.y-uy*.25},q);dot(ctx,q.x,q.y,q.stage==='stopped'?.09:.065);
  }else if(q.kind==='twinCrossbarPoint59'){
   // Only this one moving contact: never draw its entire transverse sweep as a shield.
   dot(ctx,q.x,q.y,.095);
  }else if(q.kind==='twinCalyxTip59'){dot(ctx,q.x,q.y,.08);
  }else if(q.kind==='twinReturnConduct59'){
   dot(ctx,q.x,q.y,.07);if(path&&Number.isInteger(q.node)&&q.node>0&&q.node<path.length)segment(ctx,path[q.node-1],q);
  }
  stroke(ctx,q.owner);return true;
 }finally{ctx.restore();}
}
