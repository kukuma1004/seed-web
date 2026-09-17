export const CROWD_TOTALS=[14,20,26,30,0];
export const CROWD_CAP=14;
// Later journeys feel busier without raising the number drawn at once. This keeps
// low-end phones inside the same actor budget while the room lasts a little longer
// and replacements enter sooner.
export function crowdTotal(stage,cycle=0){
 const base=CROWD_TOTALS[stage]??0,c=Math.max(0,Math.floor(Number(cycle)||0));
 return base?base+Math.min(12,Math.floor(c/3)*2):0;
}
export function crowdInterval(cycle=0){return Math.max(.68,.85-Math.max(0,Number(cycle)||0)*.01);}
export function safeSpawn(player,covers,index){
 const points=[[-8,-6],[8,-6],[-8,6],[8,6],[0,-7],[-9,0],[9,0],[-5,-6],[5,-6]];
 for(let i=0;i<points.length;i++){
  const [x,z]=points[(index+i)%points.length];
  if(Math.hypot(x-player.x,z-player.z)>4&&!covers.some(o=>Math.abs(x-o.x)<o.w/2+.7&&Math.abs(z-o.z)<o.d/2+.7))return {x,z};
 }
 return null;
}
