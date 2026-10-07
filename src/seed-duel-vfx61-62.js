import {DUEL_BATCH61_KINDS,DUEL_BATCH61_SHOTS} from './seed-duel-batch61.js';
import {DUEL_BATCH62_KINDS,DUEL_BATCH62_SHOTS} from './seed-duel-batch62.js';
const kinds=new Set([...DUEL_BATCH61_KINDS,...DUEL_BATCH62_KINDS]),shots=new Set([...DUEL_BATCH61_SHOTS,...DUEL_BATCH62_SHOTS]);
const paint=q=>q.owner===1?['#4b2636','#ffb397']:/sun|meteor/i.test(q.kind)?['#422b20','#ffd898']:/tide/i.test(q.kind)?['#19343e','#a1ebe2']:['#23323f','#edf2b5'];
function line(ctx,a,b,width,ink){ctx.beginPath();ctx.moveTo(a.x,a.y);ctx.lineTo(b.x,b.y);ctx.lineWidth=width;ctx.strokeStyle=ink;ctx.stroke();}
function circle(ctx,p,r,ink){ctx.beginPath();ctx.arc(p.x,p.y,r,0,Math.PI*2);ctx.strokeStyle=ink;ctx.stroke();}
export function drawTwinPointProjectile(ctx,q){
 if(!shots.has(q.kind))return false;
 if(!Number.isFinite(q.x)||!Number.isFinite(q.y))return true;
 const [edge,ink]=paint(q),to=q.path?.[q.node]||q.path?.at(-2)||{x:q.x+(q.dx||1),y:q.y+(q.dy||0)},dx=to.x-q.x,dy=to.y-q.y,length=Math.hypot(dx,dy)||1,v={x:dx/length,y:dy/length},side={x:-v.y,y:v.x};
 ctx.save();ctx.globalAlpha=q.stage==='parked'?.45:1;
 if(/Star|Bead/.test(q.kind)){
  ctx.beginPath();ctx.moveTo(q.x,q.y-.20);ctx.lineTo(q.x+.14,q.y);ctx.lineTo(q.x,q.y+.20);ctx.lineTo(q.x-.14,q.y);ctx.closePath();ctx.fillStyle=edge;ctx.fill();ctx.lineWidth=.04;ctx.strokeStyle=ink;ctx.stroke();
 }else if(/Coal/.test(q.kind)){ctx.lineWidth=.05;circle(ctx,q,.15,edge);ctx.lineWidth=.035;circle(ctx,q,.10,ink);}
 else{
  const a={x:q.x-v.x*.22,y:q.y-v.y*.22},b={x:q.x+v.x*.14,y:q.y+v.y*.14};
  line(ctx,a,b,.105,edge);line(ctx,a,b,.04,ink);
  if(/Leaf|Cut|Fold/.test(q.kind)){line(ctx,{x:q.x-side.x*.11,y:q.y-side.y*.11},b,.035,ink);line(ctx,{x:q.x+side.x*.11,y:q.y+side.y*.11},b,.035,ink);}
 }
 ctx.restore();return true;
}
export function drawTwinPointHazard(ctx,h){
 if(!kinds.has(h.kind))return false;
 if(![h.x,h.y,h.r].every(Number.isFinite))return true;
 const [edge,ink]=paint(h);ctx.save();ctx.globalAlpha=h.triggered?.55:.75;
 ctx.lineWidth=.065;circle(ctx,h,Math.max(.12,h.r),edge);ctx.lineWidth=.025;circle(ctx,h,Math.max(.12,h.r),ink);
 if(!h.triggered&&h.arm>0){const r=Math.max(.12,h.r);line(ctx,{x:h.x-r,y:h.y},{x:h.x+r,y:h.y},.02,ink);}
 ctx.restore();return true;
}
