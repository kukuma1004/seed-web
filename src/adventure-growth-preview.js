import {LAWS} from './laws.js';
import {DEFENSE_FORMS,defenseFusionOf,getDefenseEvolutionOptions} from './seed-defense-catalog.js';

// Preview the existing recipe rules, without choosing, spending or consuming RNG.
export function adventureGrowthPreview(s,kind,id){
 const t={laws:[...s.laws],lawRanks:{...s.ranks},formId:s.formId};
 if(kind==='law'||kind==='upgrade'){
  if(!Object.hasOwn(LAWS,id))return '';
  if(!t.laws.includes(id))t.laws.push(id);
  t.lawRanks[id]=Math.min(3,(t.lawRanks[id]||0)+1);
  if(t.laws.length===2&&(!t.formId||DEFENSE_FORMS[t.formId]?.kind==='fusion')){
   const next=defenseFusionOf(t.laws);
   if(next!==t.formId)return '바로 융합 · '+DEFENSE_FORMS[next].name;
   t.formId=next;
  }
 }
 const options=getDefenseEvolutionOptions(t);
 if(options.length){const twin=options.find(f=>f.kind==='twin'),next=twin||options[0];return `${next.kind==='twin'?'쌍둥이 각성':next.kind==='final'?'완성 진화':'단독 진화'} 준비 · ${next.name}`;}
 if(kind==='law'&&DEFENSE_FORMS[t.formId]?.kind==='solo')return '단독 진화 유지 · 두 법칙 3단계에서 쌍둥이';
 return '';
}

export function adventureGrowthPath(s){
 const form=DEFENSE_FORMS[s.formId],ranks=s.laws.map(id=>`${LAWS[id].name} ${s.ranks[id]||1}/3`).join(' · ');
 if(!s.laws.length)return '';
 if(form?.kind==='twin'||form?.kind==='final')return `${form.kind==='twin'?'쌍둥이 각성':'완성 진화'} · ${form.name}`;
 const ready=adventureGrowthPreview(s);
 if(ready)return ready;
 return ranks+' · '+(form?.kind==='solo'?(s.laws.length===2?'두 법칙 3단계에서 쌍둥이':'새 법칙을 더해 쌍둥이 준비'):s.laws.length===2?'법칙을 키워 완성 진화 준비':'3단계에서 단독 진화');
}
