// Finite swept contact against the arena's actual boundary and round pillars.
// Normals face walkable space; candidate projectiles share no alternate geometry.
export function duelSurfaceHit(a,b,arena,pillars){
 if(![a.x,a.y,b.x,b.y].every(Number.isFinite))return null;
 const dx=b.x-a.x,dy=b.y-a.y,length2=dx*dx+dy*dy;
 if(length2<1e-14)return null;
 let best=null;
 const accept=(t,nx,ny)=>{
  if(t< -1e-8||t>1+1e-8||dx*nx+dy*ny>=-1e-8)return;
  t=Math.max(0,Math.min(1,t));
  if(!best||t<best.t-1e-8)best={x:a.x+dx*t,y:a.y+dy*t,nx,ny,t};
 };
 if(dx<0)accept((arena.minX-a.x)/dx,1,0);
 if(dx>0)accept((arena.maxX-a.x)/dx,-1,0);
 if(dy<0)accept((arena.minY-a.y)/dy,0,1);
 if(dy>0)accept((arena.maxY-a.y)/dy,0,-1);
 for(const p of pillars){
  const x=a.x-p.x,y=a.y-p.y,B=2*(x*dx+y*dy),C=x*x+y*y-p.r*p.r;
  const disc=B*B-4*length2*C;
  if(disc<=1e-12*Math.max(1,B*B,Math.abs(4*length2*C)))continue;
  const t=(-B-Math.sqrt(disc))/(2*length2),px=x+dx*t,py=y+dy*t;
  const length=Math.hypot(px,py)||1;
  accept(t,px/length,py/length);
 }
 return best;
}
