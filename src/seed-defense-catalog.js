// The TD book is a projection of the actual SEED book, never a second recipe registry.
import {DISCOVERY_FORMS,FORMS,SOLO_FORMS,TWIN_FORMS,formStats} from './forms.js';
import {LAWS} from './laws.js';

const metadata=f=>Object.freeze({...f,laws:f.requires,kind:f.twin?'twin':f.awakened?'final':f.solo?'solo':'fusion'});
export const DEFENSE_FORMS=Object.freeze(Object.fromEntries(Object.values(DISCOVERY_FORMS).map(f=>[f.id,metadata(f)])));
export const DEFENSE_CATALOG=Object.freeze({
 ...Object.fromEntries(Object.entries(LAWS).map(([id,f])=>[id,Object.freeze({...f,id,kind:'base',laws:Object.freeze([id]),requires:Object.freeze([id])})])),
 ...DEFENSE_FORMS,
});
export const FUSIONS=Object.freeze(Object.fromEntries(Object.keys(FORMS).map(id=>[id,DEFENSE_FORMS[id]])));
export const DEFENSE_CATALOG_COUNTS=Object.freeze({base:9,solo:9,fusion:36,final:72,twin:36,total:162});
export const defenseFusionOf=laws=>Object.values(FUSIONS).find(f=>f.laws.length===laws.length&&f.laws.every(l=>laws.includes(l)))?.id||null;
export const defenseFormKind=id=>DEFENSE_FORMS[id]?.kind||null;
export const defenseRank=(t,id)=>t.lawRanks?.[id]||(t.laws.includes(id)?1:0);
export const defenseRankTotal=t=>t.laws.reduce((n,id)=>n+defenseRank(t,id),0)+(t.reinforce||0);
// 계급장 방식(2026-09-28): 계급마다 크게 세진다(2계급 = 씨앗 3개, 3계급 = 9개, 4계급 = 27개 몫).
// 진급 점수 하나마다 +20%, 별(★) 하나마다 +30%(순환이 올라가도 계속 키울 수 있게).
const TIER_POWER={1:1,2:2.2,3:4.2,4:7.5};
const tierOf=t=>t.tier||(!t.formId?1:{solo:2,fusion:2,final:3,twin:4}[DEFENSE_FORMS[t.formId]?.kind]||1);
export const defenseDamageMultiplier=t=>.55*TIER_POWER[tierOf(t)]*(1+.2*(t.merit||0))*(1+.3*(t.stars||0));

// A chosen solo retains its own attack after a second law is added. That path can
// become a twin; an uncommitted two-law seed instead keeps its automatic fusion.
export function getDefenseEvolutionOptions(t){
 if(!t||['final','twin'].includes(defenseFormKind(t.formId)))return [];
 const options=[],kind=defenseFormKind(t.formId);
 if(t.laws.length===1&&defenseRank(t,t.laws[0])>=3&&!t.formId){
  const solo=Object.values(SOLO_FORMS).find(f=>f.requires[0]===t.laws[0]);if(solo)options.push(DEFENSE_FORMS[solo.id]);
 }
 if(t.laws.length===2){
  if(kind==='fusion')for(const f of Object.values(DEFENSE_FORMS))if(f.kind==='final'&&f.base===t.formId){const ingredient=SOLO_FORMS[f.addedSolo]?.requires[0];if(ingredient&&defenseRank(t,ingredient)>=3)options.push(f);}
  if(t.laws.every(id=>defenseRank(t,id)>=3)){const twin=Object.values(TWIN_FORMS).find(f=>f.requires.every(id=>t.laws.includes(id)));if(twin)options.push(DEFENSE_FORMS[twin.id]);}
 }
 return options;
}

// The original stat sheet remains available to the shared combat adapter.
// World conversion is UI/targeting only; authored attack geometry stays in its engine.
export function defenseFormStats(t){
 const raw=formStats(t.formId,t.level),f=DEFENSE_FORMS[t.formId],multiplier=defenseDamageMultiplier(t);
 const rangeOf=(sheet,passive)=>passive
  ?Math.max(5,Math.min(65,Math.max(sheet.outer||0,sheet.radius||0,sheet.range||0)*5||15))
  :Math.min(65,(sheet.length||sheet.reach||sheet.range||6)*5);
 const range=raw.parts?Math.max(...raw.parts.map(id=>rangeOf(formStats(id,t.level),DEFENSE_FORMS[id].passive))):rangeOf(raw,f.passive);
 return {...raw,id:t.formId,damage:raw.damage*multiplier,range,formLevel:t.level,damageMultiplier:multiplier,raw};
}

export function validDefenseForm(t){
 const f=DEFENSE_FORMS[t.formId];
 if(!t.formId)return t.laws.length<2;
 if(!f||f.requires.some(id=>!t.laws.includes(id)))return false;
 if(f.kind==='solo')return defenseRank(t,f.requires[0])>=3;
 if(f.kind==='fusion')return defenseFusionOf(t.laws)===f.id;
 if(f.kind==='twin')return t.laws.length===2&&f.requires.every(id=>defenseRank(t,id)>=3);
 const ingredient=SOLO_FORMS[f.addedSolo]?.requires[0];return t.laws.length===2&&defenseFusionOf(t.laws)===f.base&&!!ingredient&&defenseRank(t,ingredient)>=3;
}
