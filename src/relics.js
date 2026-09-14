import {LAWS} from './laws.js';
import {FORMS} from './forms.js';
// Run-only relics. Stored relics never grant effects; the equipped slot is separate.
export const RELICS=Object.freeze({
 mirror:{name:'거울 조각',law:'reflect',desc:'반사탄 튕김 +1 · 법칙 최대치(8회)를 넘어섭니다 · 반사 재료 진화 피해 +12%'},
 crystal:{name:'분열 결정',law:'split',desc:'분열탄 파편 +1 · 법칙 최대치(9개)를 넘어섭니다 · 분열 재료 진화 피해 +12%'},
 coil:{name:'전도 코일',law:'chain',desc:'연쇄 대상 +1 · 법칙 최대치(6명)를 넘어섭니다 · 연쇄 재료 진화 피해 +12%'},
 core:{name:'중력 핵',law:'gravity',desc:'중력장 반경 +0.6 · 법칙 최대치(4.2)를 넘어섭니다 · 중력 재료 진화 피해 +12%'}
});
export const RELIC_STORAGE=3;
export const emptyRelics=()=>({equipped:null,stored:[]});
export function validRelics(r){
 if(r===undefined)return true;
 if(!r||typeof r!=='object'||Array.isArray(r)||!Array.isArray(r.stored)||r.stored.length>RELIC_STORAGE)return false;
 if(r.equipped!==null&&!Object.hasOwn(RELICS,r.equipped))return false;
 const ids=[...(r.equipped?[r.equipped]:[]),...r.stored];
 return ids.every(id=>typeof id==='string'&&Object.hasOwn(RELICS,id))&&new Set(ids).size===ids.length;
}
export const normalizeRelics=r=>r&&validRelics(r)?{equipped:r.equipped,stored:[...r.stored]}:emptyRelics();
export function ownedRelics(r){return [...(r.equipped?[r.equipped]:[]),...r.stored];}
export function relicOffers(r,random=Math.random){
 const pool=Object.keys(RELICS).filter(id=>!ownedRelics(r).includes(id));
 for(let i=pool.length-1;i>0;i--){const j=Math.floor(random()*(i+1));[pool[i],pool[j]]=[pool[j],pool[i]];}
 return pool.slice(0,3);
}
export function keepRelic(r,id,destination='equip',replace=null){
 if(!Object.hasOwn(RELICS,id)||ownedRelics(r).includes(id))return false;
 if(destination==='equip'){
  if(r.equipped){if(r.stored.length<RELIC_STORAGE)r.stored.push(r.equipped);else if(replace!==r.equipped)return false;}
  r.equipped=id;return true;
 }
 if(destination!=='store')return false;
 if(r.stored.length<RELIC_STORAGE){r.stored.push(id);return true;}
 const at=r.stored.indexOf(replace);if(at<0)return false;r.stored[at]=id;return true;
}
export function equipRelic(r,id){
 const at=r.stored.indexOf(id);if(at<0)return false;
 if(r.equipped)[r.equipped,r.stored[at]]=[r.stored[at],r.equipped];
 else{r.equipped=id;r.stored.splice(at,1);}return true;
}
// The law's own cap lives in lawStats. A relic adds on top of it, so an equipped relic can pass the cap:
// that is what makes it a relic. Only one relic is equipped, so the overflow is always a single step.
const RELIC_STAT=Object.freeze({
 mirror:{key:'reflectBounces',label:'반사 튕김',step:1,cap:8,unit:'회'},
 crystal:{key:'splitCount',label:'분열 파편',step:1,cap:9,unit:'개'},
 coil:{key:'chainTargets',label:'연쇄 대상',step:1,cap:6,unit:'명'},
 core:{key:'gravityRadius',label:'중력장 반경',step:.6,cap:4.2,unit:''}
});
const raised=(value,s)=>value+s.step;
export function relicLawStats(stats,r){
 const out={...stats},s=RELIC_STAT[r?.equipped];
 if(s&&out[s.key])out[s.key]=raised(out[s.key],s);
 return out;
}
const shown=v=>Number.isInteger(v)?String(v):v.toFixed(1);
// 받침이 있으면 '이', 없으면 '가' (반사가 · 분열이 · 연쇄가 · 중력이)
const subject=word=>{const c=word.charCodeAt(word.length-1)-0xac00;return word+(c>=0&&c<11172&&c%28?'이':'가');};
// What one relic changes for this exact build, using the same numbers the game uses.
// state: active (it does something now) · missing (no matching law or form)
export function relicEffect(id,base,heldForms=[]){
 const s=RELIC_STAT[id],law=RELICS[id]?.law;
 if(!s)return {state:'missing',lines:[],note:''};
 const lines=[],now=base?.[s.key]||0;let grows=false;
 if(now>0){
  const next=raised(now,s);grows=true;
  lines.push(`${s.label} ${shown(now)}${s.unit} → ${shown(next)}${s.unit}${next>s.cap+1e-9?' · 최대치 초과':''}`);
 }
 const forms=[...heldForms].map(f=>Array.isArray(f)?f[0]:f).filter(f=>FORMS[f]?.requires.includes(law));
 for(const f of forms)lines.push(`${FORMS[f].name} 피해 +12%`);
 const state=grows||forms.length?'active':'missing';
 return {state,lines,note:state==='missing'?`${LAWS[law].name} 법칙을 얻거나 ${subject(LAWS[law].name)} 재료인 진화를 만들면 효과가 나요`:''};
}
export function relicFormScale(r,ingredients){return ingredients.includes(RELICS[r.equipped]?.law)?1.12:1;}
