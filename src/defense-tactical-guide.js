import {defenseTowerStats,defenseUpgradeCost} from './seed-defense-rules.js';

// The circle is target acquisition, not a promise that every authored attack
// hits every point inside it. Clip only the actual route; never alter enemies.
export function defenseRangeSegments(path,x,y,range){
 const segments=[];let length=0;
 if(!Number.isFinite(x)||!Number.isFinite(y)||!Number.isFinite(range)||range<=0)return {segments,length};
 for(let i=1;i<path.length;i++){
  const a=path[i-1],b=path[i],dx=b.x-a.x,dy=b.y-a.y,ax=a.x-x,ay=a.y-y,A=dx*dx+dy*dy;
  if(A===0)continue;
  const B=2*(ax*dx+ay*dy),C=ax*ax+ay*ay-range*range,D=B*B-4*A*C;
  if(D<=0)continue;
  const root=Math.sqrt(D),lo=Math.max(0,(-B-root)/(2*A)),hi=Math.min(1,(-B+root)/(2*A));
  if(hi<=lo)continue;
  segments.push({x1:a.x+lo*dx,y1:a.y+lo*dy,x2:a.x+hi*dx,y2:a.y+hi*dy});length+=(hi-lo)*Math.sqrt(A);
 }
 return {segments,length};
}

export function defenseUpgradePreview(t){
 const current=defenseTowerStats(t),cost=defenseUpgradeCost(t);
 return {current,next:Number.isFinite(cost)?defenseTowerStats({...t,level:t.level+1}):null,cost};
}

export function defenseTacticalVisible(phase,paused,modal,selected,moving){
 return Boolean((phase==='build'||phase==='draft')&&!paused&&!modal&&(selected||moving));
}

// One cached geometry per selection; unchanged preparation frames allocate no
// arrays/stat sheets. Position, form, upgrade, merge and route invalidate it.
export function createDefenseRangeGuide(){
 let cached=null,previous=null,previousPath=null,px,py,level,form,law,tier,merit,stars,reinforce,ranks;
 return (t,path,x=t?.x,y=t?.y)=>{
  if(!t)return null;
  let rankTotal=0;for(const id of t.laws)rankTotal+=t.lawRanks?.[id]||1;
  if(cached&&previous===t&&previousPath===path&&px===x&&py===y&&level===t.level&&form===t.formId&&law===t.laws[0]&&tier===t.tier&&merit===t.merit&&stars===t.stars&&reinforce===t.reinforce&&ranks===rankTotal)return cached;
  previous=t;previousPath=path;px=x;py=y;level=t.level;form=t.formId;law=t.laws[0];tier=t.tier;merit=t.merit;stars=t.stars;reinforce=t.reinforce;ranks=rankTotal;
  const preview=defenseUpgradePreview(t);cached={...preview,x,y,coverage:defenseRangeSegments(path,x,y,preview.current.range)};return cached;
 };
}
