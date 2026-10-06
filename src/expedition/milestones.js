import {getExpeditionSpecies} from './species.js';

// ZIP specifies Lv3 job passive and Lv7 skill strengthening, but no numbers.
// These are bounded Expedition tuning values, not changes to the action modes.
// The dominant law gives each individual ONE passive, including evolved forms.
const passive=(name,description,operation)=>Object.freeze({name,description,operation:Object.freeze(operation)});
export const EXPEDITION_JOB_PASSIVES=Object.freeze({
 burst:passive('남은 불씨','기본공격으로 실피해를 주면 살아 있는 표적 주변에 다음 라운드 불씨를 남깁니다.',{type:'return',target:'adjacent',ratio:.2,rounds:1,when:'hit',maxTargets:3}),
 pierce:passive('두 번째 잎맥','기본공격으로 실피해를 주고 표적이 살아 있으면 같은 열에 약한 관통을 한 번 더 보냅니다.',{type:'damage',target:'column',ratio:.2,when:'hit',maxTargets:2}),
 split:passive('곁가지','기본공격으로 실피해를 주면 살아 있는 표적과 가까운 적 하나에 작은 파편을 나눕니다.',{type:'split',target:'adjacent',ratio:.2,when:'hit',maxTargets:2}),
 gravity:passive('무게의 균열','기본공격으로 실피해를 준 살아 있는 표적에 취약을 하나 남깁니다.',{type:'vulnerable',target:'single',amount:1,when:'hit'}),
 chain:passive('전류의 자취','기본공격으로 실피해를 준 살아 있는 표적에 다음 타격용 전도 표식을 하나 남깁니다.',{type:'conductive',target:'single',amount:1,when:'hit'}),
 frost:passive('찬 발자국','기본공격으로 실피해를 준 살아 있는 표적에 냉기를 하나 쌓습니다.',{type:'chill',target:'single',stacks:1,when:'hit'}),
 orbit:passive('잎의 호위','기본공격으로 실피해를 주면 자신에게 POWER의 25%만큼 보호를 쌓습니다.',{type:'protection',target:'self',ratio:.25,when:'hit'}),
 reflect:passive('거울 잔상','방어 중 공격을 받았거나 기본공격이 상대 방어에 막히면, POWER의 30% 반격을 한 번 준비합니다.',{type:'counter',target:'self',ratio:.3,charges:1,when:'guarded'}),
 recall:passive('돌아오는 잎','기본공격으로 실피해를 준 살아 있는 표적에 다음 라운드 약한 귀환 공격을 남깁니다.',{type:'return',target:'single',ratio:.25,rounds:1,when:'hit'})
});
export function expeditionJobPassive(speciesId){const s=getExpeditionSpecies(speciesId);return s&&s.kind!=='twin'?EXPEDITION_JOB_PASSIVES[s.dominantLaw]||null:null;}
const cloneActions=actions=>Object.fromEntries(Object.entries(actions).map(([kind,ops])=>[kind,ops.map(o=>({...o}))]));
export function applyExpeditionMilestonesToActions(speciesId,actions,level){
 const s=getExpeditionSpecies(speciesId),result=cloneActions(actions);
 if(!s||s.kind==='twin'||!Number.isInteger(level)||level<1||level>10)return result;
 const p=expeditionJobPassive(speciesId);
 if(level>=3&&p&&result.attack){if(result.attack.length>=8)throw Error('Expedition passive operation budget');result.attack.push({...p.operation});}
 if(level>=7)for(const kind of ['skill1','skill2'])if(result[kind])result[kind]=result[kind].map(o=>{
  // Strengthen the existing skill without new targets, recursive splits,
  // timings, charge counts, gauges or free additional actions.
  const next={...o};
  if(['damage','split','return','protection','counter'].includes(o.type)&&o.ratio>0)next.ratio=Math.min(3,Math.round((o.ratio+.15)*100)/100);
  if(['chill','conductive','vulnerable'].includes(o.type)){const amount=Math.min(3,(o.amount??o.stacks??1)+1);if(Object.hasOwn(o,'stacks'))next.stacks=amount;else next.amount=amount;}
  return next;
 });
 return result;
}
export function expeditionMilestoneActionHint(battle,unit,kind){
 if(!unit||unit.side!=='ally'||!(battle?.version>=3))return '';
 const species=getExpeditionSpecies(unit.speciesId),actual=unit.actions?.[kind];
 if(!species||species.kind==='twin'||!Array.isArray(actual))return '';
 if(kind==='attack'&&unit.level>=3){
  const p=expeditionJobPassive(unit.speciesId),op=actual[species.actionPattern.attack.length];
  return p&&op&&op.type===p.operation.type&&op.target===p.operation.target&&op.when===p.operation.when
   &&(p.operation.ratio===undefined||op.ratio>=p.operation.ratio)
   &&(op.amount??op.stacks??1)>=(p.operation.amount??p.operation.stacks??1)?p.name:'';
 }
 if(!['skill1','skill2'].includes(kind)||unit.level<7)return '';
 const original=species.actionPattern[kind],grown=applyExpeditionMilestonesToActions(species.id,species.actionPattern,unit.level)[kind];
 return grown.some((op,i)=>{
  const before=original[i],saved=actual[i];if(!saved||saved.type!==op.type||saved.target!==op.target)return false;
  return op.ratio>before.ratio&&saved.ratio>=op.ratio
   ||(op.amount??op.stacks??1)>(before.amount??before.stacks??1)&&(saved.amount??saved.stacks??1)>=(op.amount??op.stacks??1);
 })?'Lv.7 강화':'';
}
export function expeditionMilestoneHomeHint(instance){
 const p=expeditionJobPassive(instance?.speciesId);if(!p)return '';
 return `${instance.level>=3?p.name+' 해금':'Lv.3 '+p.name} · ${instance.level>=7?'기술 강화 해금':'Lv.7 기술 강화'}`;
}
