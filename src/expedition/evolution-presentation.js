import {EXPEDITION_SPECIES,getExpeditionSpecies} from './species.js';
import {LAWS} from '../laws.js';

// Read-only HOME presentation. The controller remains the authoritative gate;
// historical account transaction validation and saved battle actions stay intact.
export function expeditionEvolutionOptions(instance,meta={}) {
 const from=getExpeditionSpecies(instance?.speciesId);
 if(!from||instance.status!=='alive'||instance.hp<=0||instance.level<5)return [];
 return Object.values(EXPEDITION_SPECIES).filter(to=>to.parents?.includes(from.id)&&
  ((from.kind==='base'&&['solo','fusion'].includes(to.kind))||
   (from.kind==='fusion'&&to.kind==='final'&&instance.level>=8))).map(to=>{
  const law=to.kind==='solo'?from.laws[0]:to.kind==='fusion'?to.laws.find(l=>l!==from.laws[0]):to.dominantLaw;
  const cost=to.kind==='final'?2:1,available=meta.cores?.[law]??0;
  const lawName=LAWS[law]?.name||law,requirements=[`${lawName} 법칙핵 ${available}/${cost}`],missing=[];
  if(available<cost)missing.push(`${lawName} 법칙핵 부족`);
  if(to.kind==='final'){
   const material=(meta.awakenMaterials??0)>0,risk=meta.highRisk?.includes(`${instance.instanceId}:${law}`)===true;
   requirements.push(`각성 재료 ${material?'보유':'없음'}`,`이 씨앗의 ${lawName} 고위험 조건 ${risk?'달성':'미달성'}`);
   if(!material)missing.push('각성 재료 필요');if(!risk)missing.push('이 씨앗의 고위험 조건 필요');
  }
  return {species:to,law,cost,ready:missing.length===0,requirements:requirements.join(' · '),reason:missing.join(' · ')};
 });
}
