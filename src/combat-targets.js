// Keep the nearest few enemies without sorting a whole survival crowd per hit.
// Each combat channel owns a picker, so its reusable result is not shared with
// another kind of attack. Equal distances retain the original enemy order.
export function createNearestTargetPicker({requireHp=true}={}){
 const targets=[],distances=[];
 return (enemies,source,radius,count)=>{
  targets.length=0;distances.length=0;
  const limit=Math.min(enemies.length,Math.max(0,Math.trunc(count)||0));
  if(!limit||!(radius>0))return targets;
  const origin=source.g.position,radiusSq=radius*radius;
  for(let index=0;index<enemies.length;index++){
   const enemy=enemies[index];
   if(enemy===source||(requireHp?!(enemy.hp>0):enemy.dead))continue;
   const p=enemy.g.position,dx=p.x-origin.x,dy=p.y-origin.y,dz=p.z-origin.z;
   const distance=dx*dx+dy*dy+dz*dz;
   if(!(distance<radiusSq))continue;
   const size=targets.length;
   if(size===limit&&distance>=distances[size-1])continue;
   let insertion=Math.min(size,limit-1);
   while(insertion>0&&distances[insertion-1]>distance){
    targets[insertion]=targets[insertion-1];distances[insertion]=distances[insertion-1];insertion--;
   }
   targets[insertion]=enemy;distances[insertion]=distance;
  }
  return targets;
 };
}
