// Assisted aim only: continuous point-projectile sight through the existing
// region geometry. This does not alter shot stepping, collisions, or melee.
// Ground is the union used by adventureWalkable(state,x,y,-.8): node disks
// and round path capsules enlarged by .8. Obstacles retain their exact radius.
// A capsule's intersection with a segment is one interval (it is convex).
// Union coverage is exact apart from ordinary floating-point rounding; there
// is no sampling stride that could miss a thin obstacle or a short ground gap.
// Reused synchronous scratch avoids per-target arrays/objects. Canonical gardens
// need 21–23 intervals; growth only allocates when a larger region first appears.
let starts=new Float64Array(32),ends=new Float64Array(32);
let low=0,high=0;

function circleInterval(x,y,dx,dy,length2,cx,cy,r){
 const t=((cx-x)*dx+(cy-y)*dy)/length2;
 const px=x+dx*t-cx,py=y+dy*t-cy,remaining=r*r-px*px-py*py;
 if(remaining<0)return false;
 const span=Math.sqrt(remaining/length2);
 low=Math.max(0,t-span);high=Math.min(1,t+span);
 return low<=high;
}

function clipLinear(value,delta,min,max){
 if(delta===0)return value>=min&&value<=max;
 let a=(min-value)/delta,b=(max-value)/delta;
 if(a>b){const swap=a;a=b;b=swap;}
 low=Math.max(low,a);high=Math.min(high,b);
 return low<=high;
}

function capsuleInterval(x,y,dx,dy,length2,path,r){
 const qx=path.bx-path.ax,qy=path.by-path.ay,qlen2=qx*qx+qy*qy;
 if(qlen2===0)return circleInterval(x,y,dx,dy,length2,path.ax,path.ay,r);
 let first=Infinity,last=-Infinity;
 if(circleInterval(x,y,dx,dy,length2,path.ax,path.ay,r)){first=low;last=high;}
 if(circleInterval(x,y,dx,dy,length2,path.bx,path.by,r)){first=Math.min(first,low);last=Math.max(last,high);}
 low=0;high=1;
 const ox=x-path.ax,oy=y-path.ay,crossLimit=r*Math.sqrt(qlen2);
 if(clipLinear(ox*qx+oy*qy,dx*qx+dy*qy,0,qlen2)&&
    clipLinear(ox*qy-oy*qx,dx*qy-dy*qx,-crossLimit,crossLimit)){
  first=Math.min(first,low);last=Math.max(last,high);
 }
 low=first;high=last;
 return low<=high;
}

function insertInterval(count){
 // Sort as we append; bounded tiny canonical geometry avoids an allocation or
 // a comparator callback. At most O((nodes+paths)^2) numeric comparisons.
 const a=low,b=high;let index=count;
 while(index>0&&starts[index-1]>a){starts[index]=starts[index-1];ends[index]=ends[index-1];index--;}
 starts[index]=a;ends[index]=b;
}

export function adventureProjectileSight(region,x0,y0,x1,y1){
 if(!region)return true;
 if(!Number.isFinite(x0)||!Number.isFinite(y0)||!Number.isFinite(x1)||!Number.isFinite(y1))return false;
 const dx=x1-x0,dy=y1-y0,length2=dx*dx+dy*dy;
 for(const obstacle of region.obstacles||[]){
  const t=length2?Math.max(0,Math.min(1,((obstacle.x-x0)*dx+(obstacle.y-y0)*dy)/length2)):0;
  const ox=x0+dx*t-obstacle.x,oy=y0+dy*t-obstacle.y;
  // Strict inequality matches insideObstacle: grazing the surface is allowed.
  if(ox*ox+oy*oy<obstacle.r*obstacle.r)return false;
 }
 const nodes=region.nodes||[],paths=region.paths||[],radius=(region.pathWidth??1.9)+.8;
 if(length2===0){
  for(const node of nodes)if(Math.hypot(x0-node.x,y0-node.y)<=node.r+.8)return true;
  for(const path of paths){const qx=path.bx-path.ax,qy=path.by-path.ay,q2=qx*qx+qy*qy;
   const t=q2?Math.max(0,Math.min(1,((x0-path.ax)*qx+(y0-path.ay)*qy)/q2)):0;
   if(Math.hypot(x0-path.ax-qx*t,y0-path.ay-qy*t)<=radius)return true;
  }
  return false;
 }
 const required=nodes.length+paths.length;
 if(required>starts.length){const capacity=Math.max(required,starts.length*2);starts=new Float64Array(capacity);ends=new Float64Array(capacity);}
 let count=0;
 for(const node of nodes)if(circleInterval(x0,y0,dx,dy,length2,node.x,node.y,node.r+.8))insertInterval(count++);
 for(const path of paths)if(capsuleInterval(x0,y0,dx,dy,length2,path,radius))insertInterval(count++);
 let covered=0;
 for(let index=0;index<count;index++){
  if(starts[index]>covered)return false;
  covered=Math.max(covered,ends[index]);
  if(covered>=1)return true;
 }
 return false;
}
