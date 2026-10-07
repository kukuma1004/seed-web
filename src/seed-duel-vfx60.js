import {DUEL_BATCH60_KINDS,DUEL_BATCH60_SHOTS} from './seed-duel-batch60.js';
const palette=(kind,owner)=>owner===1?['#4b2636','#ffb397']:/Ice|Cold|Latch|Stitch/.test(kind)?['#152c42','#91dfe9']:['#25243e','#f4d48d'];
const line=(ctx,a,b,width,ink)=>{ctx.lineWidth=width;ctx.strokeStyle=ink;ctx.beginPath();ctx.moveTo(a.x,a.y);ctx.lineTo(b.x,b.y);ctx.stroke();};
export function drawBatch60Projectile(ctx,q){
  if(!DUEL_BATCH60_SHOTS.includes(q.kind))return false;
  const [outer,inner]=palette(q.kind,q.owner),a={x:q.aX,y:q.aY},b={x:q.bX,y:q.bY};
  if(![a.x,a.y,b.x,b.y].every(Number.isFinite))return true;
  ctx.save();ctx.globalAlpha=q.age>(q.kind==='twinIceLatch60'?.48:q.kind==='twinStitchNeedle60'?.5:.45)?.35:1;
  line(ctx,a,b,.13,outer);line(ctx,a,b,.055,inner);
  if(Math.hypot(b.x-a.x,b.y-a.y)<.01){const angle=Math.atan2(q.data?.aim?.y||0,q.data?.aim?.x||1),v={x:Math.cos(angle)*.19,y:Math.sin(angle)*.19};line(ctx,{x:a.x-v.x,y:a.y-v.y},{x:a.x+v.x,y:a.y+v.y},.07,inner);}
  ctx.restore();return true;
}
export function drawBatch60Hazard(ctx,h){
  if(!DUEL_BATCH60_KINDS.includes(h.kind))return false;
  const p=h.data;if(!p)return true;
  const [outer,inner]=palette(h.kind,h.owner);ctx.save();ctx.globalAlpha=h.triggered?.45:.6;
  if(p.start&&p.aim){const at=(u,v)=>({x:p.start.x+p.aim.x*u-p.aim.y*v,y:p.start.y+p.aim.y*u+p.aim.x*v});
    if(/Jaws|Gather/.test(h.kind)){for(const side of [-1,1]){line(ctx,at(1.2,.95*side),at(2.8,.95*side),.055,outer);line(ctx,at(1.2,.95*side),at(2.8,.95*side),.025,inner);}}
    else if(/Latch/.test(h.kind)){line(ctx,at(1.4,0),at(2.8,0),.06,outer);line(ctx,at(1.4,0),at(2.8,0),.025,inner);}
    else if(/Seam/.test(h.kind)){line(ctx,at(1,-.85),at(1,.85),.06,outer);line(ctx,at(1,-.85),at(1,.85),.025,inner);}
    else if(/Stitches/.test(h.kind)){for(const side of [-1,1])line(ctx,at(.55,.65*side),at(.95,.40*side),.045,inner);}
  }
  if(p.stitch&&p.latch){for(const segment of [p.stitch,p.latch])line(ctx,segment[0],segment[1],.04,inner);}
  ctx.restore();return true;
}
