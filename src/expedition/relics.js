import {getExpeditionSpecies} from './species.js';

// Expedition-only tuning candidates. The ZIP names relics as a core reward,
// but supplies no effects/numbers. Ownership stays in the existing eight
// garden IDs; no action-game relics, HP grants or permanent-death rules change.
export const EXPEDITION_RELICS=Object.freeze(Object.fromEntries([
 ['meadow','pierce','길을 잇는 잎맥','열을 관통하는 피해 계수 +0.1','column'],
 ['blossom','split','갈라진 꽃씨','분열 피해 계수 +0.1','split'],
 ['autumn','recall','되돌아오는 단풍','귀환 피해 계수 +0.1','return'],
 ['snow','frost','서리의 결','냉기 뒤에 이어지는 피해·냉각 대상 추가 피해 계수 +0.1','cold'],
 ['moon','orbit','달빛 이슬','보호막 계수 +0.1','protection'],
 ['fire','burst','불씨의 심장','인접·전체 대상 폭발 피해 계수 +0.1','splash'],
 ['shadow','gravity','무게 없는 돌','취약 기술의 표식 +1 · 최대 3','vulnerable'],
 ['dream','reflect','꿈을 비추는 조각','반격 피해 계수 +0.1','counter'],
].map(([gardenId,law,name,description,effect])=>[gardenId,Object.freeze({gardenId,law,name,description,effect})])));

export function expeditionRelicsForSpecies(speciesId,owned=[]){
 const species=getExpeditionSpecies(speciesId);
 if(!species||!Array.isArray(owned))return [];
 const ids=new Set(owned);
 return Object.values(EXPEDITION_RELICS).filter(r=>ids.has(r.gardenId)&&species.laws.includes(r.law));
}

export function applyExpeditionRelicsToActions(speciesId,actions,owned=[]){
 const effects=new Set(expeditionRelicsForSpecies(speciesId,owned).map(r=>r.effect));
 return Object.fromEntries(Object.entries(actions).map(([kind,operations])=>{
  let coldBefore=false;
  return [kind,operations.map(operation=>{
   const o={...operation},damage=['damage','split','return'].includes(o.type);
   const boosted=effects.has('column')&&o.type==='damage'&&o.target==='column'
    ||effects.has('split')&&o.type==='split'
    ||effects.has('return')&&o.type==='return'
    ||effects.has('cold')&&damage&&(coldBefore||o.when==='chilled')
    ||effects.has('protection')&&o.type==='protection'
    ||effects.has('splash')&&damage&&['adjacent','all'].includes(o.target)
    ||effects.has('counter')&&o.type==='counter';
   // At most ONE increment per operation, even for a matching fusion/twin.
   // Keep targets, timing, conditions, gauges and operation budgets intact.
   if(boosted&&o.ratio>0)o.ratio=Math.min(3,Math.round((o.ratio+.1)*100)/100);
   if(effects.has('vulnerable')&&o.type==='vulnerable')o.amount=Math.min(3,(o.amount??o.stacks??1)+1);
   if(o.type==='chill')coldBefore=true;
   return o;
  })];
 }));
}

// Read-only presentation: old checkpoint actions keep their original values.
// Do not label them enhanced merely because the current collection owns relics.
export function expeditionAppliedRelics(unit,owned=[]){
 const base=getExpeditionSpecies(unit?.speciesId)?.actionPattern;
 if(!base||!unit.actions)return [];
 return expeditionRelicsForSpecies(unit.speciesId,owned).filter(relic=>{
  const boosted=applyExpeditionRelicsToActions(unit.speciesId,base,[relic.gardenId]);
  return Object.entries(boosted).some(([kind,ops])=>ops.some((op,index)=>{
   const original=base[kind][index],actual=unit.actions[kind]?.[index];
   return actual&&(op.ratio>original.ratio&&actual.ratio>=op.ratio
    ||(op.amount??op.stacks??1)>(original.amount??original.stacks??1)&&actual.amount>=(op.amount??op.stacks??1));
  }));
 });
}
