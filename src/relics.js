import {LAWS} from './laws.js';
import {ALL_FORMS} from './forms.js';
// Run-only relics. Stored relics never grant effects; the equipped slot is separate.
export const RELICS=Object.freeze({
 mirror:{name:'거울 조각',law:'reflect',desc:'반사 +1 · 튕긴 씨앗탄은 다음 한 명에게 피해 +25% · 반사 진화 피해 +12%'},
 crystal:{name:'분열 결정',law:'split',desc:'파편 +1 · 파편 일부가 뒤로 흩어져 후방을 지킴 · 분열 진화 피해 +12%'},
 coil:{name:'전도 코일',law:'chain',desc:'연쇄 대상 +1 · 마지막 전이가 첫 적에게 18% 되돌아옴 · 연쇄 진화 피해 +12%'},
 core:{name:'중력 핵',law:'gravity',desc:'중력 반경 +0.6 · 우물에 끌린 일반 적을 0.8초 둔화 · 중력 진화 피해 +12%'},
 echo:{name:'잔향 시계',law:null,desc:'오버드라이브 마무리 위력이 20% 줄지만 0.45초 뒤 35% 잔향이 다시 터짐'},
 stride:{name:'질주 인장',law:null,desc:'회피 직후 첫 씨앗탄이 피해 +80%와 관통 +1 · 다음 회피까지 재발동 안 함'}
});
export const RELIC_STORAGE=3;
export const WARDEN_RELIC_DROP_CHANCE=.01;
export const wardenRelicDrop=(random=Math.random)=>random()<WARDEN_RELIC_DROP_CHANCE;
// Replaces part of the forward split fan; it never creates extra projectiles.
export function relicSplitAngle(id,count,index,spread){
 if(id!=='crystal'||count<3)return count===1?0:-spread+2*spread*index/(count-1);
 const front=count-Math.max(1,Math.floor(count/3));
 if(index<front)return front===1?0:-spread+2*spread*index/(front-1);
 const rear=count-front,k=index-front;
 return Math.PI+(rear===1?0:-spread+2*spread*k/(rear-1));
}
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
// preferLaws는 정원의 덩굴 갈래가 넘기는 법칙 목록이다. 그 법칙의 유물이 앞쪽에 오게 한다.
export function relicOffers(r,random=Math.random,preferLaws=[]){
 const pool=Object.keys(RELICS).filter(id=>!ownedRelics(r).includes(id));
 for(let i=pool.length-1;i>0;i--){const j=Math.floor(random()*(i+1));[pool[i],pool[j]]=[pool[j],pool[i]];}
 const wanted=new Set(Array.isArray(preferLaws)?preferLaws:[]);
 if(wanted.size)pool.sort((a,b)=>Number(wanted.has(RELICS[b].law))-Number(wanted.has(RELICS[a].law)));
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
 if(r?.equipped==='core'&&out.gravityRadius)out.frostFactor=Math.min(.8,out.frostFactor||1);
 return out;
}
const shown=v=>Number.isInteger(v)?String(v):v.toFixed(1);
// 받침이 있으면 '이', 없으면 '가' (반사가 · 분열이 · 연쇄가 · 중력이)
const subject=word=>{const c=word.charCodeAt(word.length-1)-0xac00;return word+(c>=0&&c<11172&&c%28?'이':'가');};
// What one relic changes for this exact build, using the same numbers the game uses.
// state: active (it does something now) · missing (no matching law or form)
export function relicEffect(id,base,heldForms=[]){
 if(id==='echo')return {state:'active',lines:['오버드라이브 마무리 80% + 0.45초 뒤 35% 잔향'],note:''};
 if(id==='stride')return {state:'active',lines:['회피 직후 첫 씨앗탄 피해 +80% · 관통 +1'],note:''};
 const s=RELIC_STAT[id],law=RELICS[id]?.law;
 if(!s)return {state:'missing',lines:[],note:''};
 const lines=[],now=base?.[s.key]||0;let grows=false;
 if(now>0){
  const next=raised(now,s);grows=true;
  lines.push(`${s.label} ${shown(now)}${s.unit} → ${shown(next)}${s.unit}${next>s.cap+1e-9?' · 최대치 초과':''}`);
  if(id==='mirror')lines.push('튕긴 씨앗탄의 다음 타격 +25%');
  if(id==='crystal')lines.push('파편 일부가 뒤쪽으로 퍼짐');
  if(id==='coil')lines.push('마지막 연쇄가 첫 적에게 18% 되돌아옴');
  if(id==='core')lines.push('끌려온 일반 적 0.8초 둔화');
 }
 const forms=[...heldForms].map(f=>Array.isArray(f)?f[0]:f).filter(f=>ALL_FORMS[f]?.requires.includes(law));
 for(const f of forms)lines.push(`${ALL_FORMS[f].name} 피해 +12%`);
 const state=grows||forms.length?'active':'missing';
 return {state,lines,note:state==='missing'?`${LAWS[law].name} 법칙을 얻거나 ${subject(LAWS[law].name)} 재료인 진화를 만들면 효과가 나요`:''};
}
export function relicFormScale(r,ingredients){return ingredients.includes(RELICS[r.equipped]?.law)?1.12:1;}
