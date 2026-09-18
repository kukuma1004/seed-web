import {LAWS} from './laws.js';
import {FORMS,ALL_FORMS,SOLO_FORMS,AWAKEN_FORMS,TWIN_FORMS,SECOND_FORMS,secondFormOf,soloLevel,soloFormOf} from './forms.js';

// Laws are stacked, never swapped: six slots, and every pick after that deepens a held law.
// Levels have no ceiling; counts that would flood the screen are capped, damage keeps growing.
// 칸이 다 차면 새 법칙이 끊기므로, 노리는 조합을 맞출 여유를 한 칸 더 준다(5 → 6).
export const SLOT_CAP=6;

// Kills needed for the next law choice. The gap widens with every choice so picks stay meaningful.
export function killsForChoice(choicesTaken){return 12+choicesTaken*8;}

export function levelOf(levels,id){return levels.get(id)||0;}
export function totalUpgrades(levels){let n=0;for(const v of levels.values())n+=Math.max(0,v-1);return n;}
export function totalLevel(levels){let n=0;for(const v of levels.values())n+=v;return n;}

// Every upgrade beyond the first level of any law adds 10% to all shot damage.
export function damageScale(levels){return 1+.1*totalUpgrades(levels);}

export function lawStats(levels){
 const lv=id=>levelOf(levels,id);
 return {
  reflectBounces:lv('reflect')?Math.min(8,1+lv('reflect')):0,
  splitCount:lv('split')?Math.min(9,1+2*lv('split')):0,
  chainTargets:lv('chain')?Math.min(6,1+lv('chain')):0,
  pierceHits:lv('pierce')?Math.min(9,1+2*lv('pierce')):1,
  critChance:lv('pierce')?Math.min(.15,.03+.015*(lv('pierce')-1)):0,
  critDamage:1.5,
  burstRadius:lv('burst')?Math.min(3.3,1.2+.3*lv('burst')):0,
  recallReturn:lv('recall')?1+.5*(lv('recall')-1):0,
  gravityRadius:lv('gravity')?Math.min(4.2,1.4+.8*lv('gravity')):0,
  frostTime:lv('frost')?Math.min(3,1+.3*lv('frost')):0,
  frostFactor:lv('frost')?Math.max(.25,.8-.2*lv('frost')):1,
  orbitPetals:lv('orbit')?Math.min(7,2+lv('orbit')):0,
  orbitRadius:lv('orbit')?Math.min(2.9,1.8+.18*lv('orbit')):0,
  orbitDamage:lv('orbit')?14+4*(lv('orbit')-1):0,
  portalDistance:lv('portal')?Math.min(5.4,2.2+.4*lv('portal')):0
 };
}

// Three distinct offers. While a slot is free at least one fresh law is offered; once the
// slots are full only upgrades appear: held laws, or held forms (offered as "form:<id>").
// weights/freshBonus는 정원(garden.js)이 넘기는 값이다. 힘을 더하지 않고 무엇이 더 자주 보일지만 바꾼다.
// 'form:<id>' 제안은 그 진화의 재료 법칙 가중치를 따른다.
function lawOfOffer(id){
 const form=offeredForm(id)||offeredFusion(id);
 if(!form)return id;
 const requires=ALL_FORMS[form]?.requires||[];
 return requires[0]||id;
}
export function offerChoices(levels,{random=Math.random,guide=null,forms=new Map(),weights={},freshBonus=0,fusions=[]}={}){
 const used=slotsUsed(levels,forms),full=used>=SLOT_CAP;
 const fresh=full?[]:Object.keys(LAWS).filter(id=>!levels.has(id));
 const weightOf=id=>Math.max(1,weights?.[lawOfOffer(id)]||1);
 // 가중치가 큰 법칙이 앞쪽에 뽑힐 확률이 높은 섞기(가중치가 모두 1이면 보통 섞기와 같다).
 const shuffle=list=>{
  const pool=[...list],out=[];
  while(pool.length){
   let total=0;for(const id of pool)total+=weightOf(id);
   let pick=random()*total,index=0;
   for(;index<pool.length-1;index++){pick-=weightOf(pool[index]);if(pick<=0)break;}
   out.push(pool.splice(index,1)[0]);
  }
  list.splice(0,list.length,...out);return list;
 };
 const upgrades=shuffle([...levels.keys(),...[...forms.keys()].map(formOffer)]);
 shuffle(fresh);
 let pool;
 // 칸이 차면 강화만 남는다. 합칠 수 있는 진화가 있으면 한 장은 조합 카드로 준다 —
 // 합치면 두 법칙이 한 칸으로 줄어 새 법칙이 다시 나온다(단추 뒤에 숨기지 않는다).
 if(full){
  const ready=shuffle(fusions.filter(id=>canFuse(levels,id)).map(fuseOffer));
  pool=ready.length?[ready[0],...upgrades]:upgrades;
 }
 else{
  // Mostly fresh laws early, mixing in upgrades once the seed has something to deepen.
  const freshCount=Math.min(3,(used===0?3:used<3?2:1)+Math.max(0,Math.floor(freshBonus)));
  pool=[...fresh.slice(0,freshCount),...upgrades,...fresh.slice(freshCount)];
 }
 const offer=[...new Set(pool)].slice(0,3);
 if(guide&&!full&&!levels.has(guide)&&Object.hasOwn(LAWS,guide)&&!offer.includes(guide)){
  if(offer.length===3)offer[2]=guide;else offer.push(guide);
 }
 return offer;
}

export function chooseLaw(levels,id,forms=new Map()){
 const form=offeredForm(id);
 if(form){if(!forms.has(form))return false;forms.set(form,forms.get(form)+1);return true;}
 if(!Object.hasOwn(LAWS,id))return false;
 if(levels.has(id)){levels.set(id,levels.get(id)+1);return true;}
 if(slotsUsed(levels,forms)>=SLOT_CAP)return false;
 levels.set(id,1);return true;
}

// Saves before levels existed stored a mutated list: a mutated law was level two.
export function levelsFromSave(save){
 const levels=new Map();
 for(const id of save?.rules||[]){
  const stored=save?.levels?.[id];
  levels.set(id,Number.isInteger(stored)&&stored>=1?stored:(save?.mutated||[]).includes(id)?2:1);
 }
 return levels;
}
export function levelsToSave(levels){return Object.fromEntries(levels);}

// What the next level of a law changes, in the numbers the player can see.
export function upgradeLine(levels,id){
 const now=lawStats(levels),next=lawStats(new Map([...levels,[id,levelOf(levels,id)+1]]));
 const pair=(label,key,unit='',digits=0)=>now[key]===next[key]?`${label} 최대치`:`${label} ${now[key].toFixed(digits)} → ${next[key].toFixed(digits)}${unit}`;
 switch(id){
  case 'reflect':return pair('튕김','reflectBounces','회');
  case 'split':return pair('파편','splitCount','개');
  case 'chain':return pair('연쇄','chainTargets','명');
  case 'orbit':return `${pair('꽃잎','orbitPetals','개')} · 피해 ${now.orbitDamage} → ${next.orbitDamage}`;
  case 'pierce':return `${pair('관통','pierceHits','명')} · 치명타 ${Math.round(now.critChance*1000)/10}% → ${Math.round(next.critChance*1000)/10}%`;
  case 'burst':return pair('폭발 반경','burstRadius','',1);
  case 'recall':return `귀환 피해 ×${now.recallReturn.toFixed(1)} → ×${next.recallReturn.toFixed(1)}`;
  case 'gravity':return pair('흡인 반경','gravityRadius','',1);
  case 'frost':return `둔화 ${Math.round((1-now.frostFactor)*100)}% → ${Math.round((1-next.frostFactor)*100)}% · ${now.frostTime.toFixed(1)} → ${next.frostTime.toFixed(1)}초`;
  case 'portal':return pair('도약 거리','portalDistance','',1);
  default:return '강화';
 }
}

// ---------------- fusion ----------------
// A form is fused from two held laws: both leave their slots and the form takes one.
// Fusing a pair again into a form already held feeds it instead of making a second copy.
const FORM_PREFIX='form:';
export const formOffer=id=>FORM_PREFIX+id;
// 'fuse:<id>'는 가진 법칙 둘을 합치자는 제안이다('form:<id>' 는 이미 가진 진화의 강화).
const FUSE_PREFIX='fuse:';
export const fuseOffer=id=>FUSE_PREFIX+id;
export const offeredFusion=choice=>typeof choice==='string'&&choice.startsWith(FUSE_PREFIX)&&Object.hasOwn(ALL_FORMS,choice.slice(FUSE_PREFIX.length))?choice.slice(FUSE_PREFIX.length):null;
export const offeredForm=choice=>typeof choice==='string'&&choice.startsWith(FORM_PREFIX)&&Object.hasOwn(ALL_FORMS,choice.slice(FORM_PREFIX.length))?choice.slice(FORM_PREFIX.length):null;
export function slotsUsed(levels,forms=new Map()){return levels.size+forms.size;}
export function fusionLevel(levels,id){if(!Object.hasOwn(FORMS,id))return 0;const [a,b]=FORMS[id].requires.map(law=>levels.get(law)||0);return a&&b?a+b-1:0;}
export function canFuse(levels,id){return Object.hasOwn(FORMS,id)&&fusionLevel(levels,id)>0;}
export function fuse(levels,forms,id){
 if(!canFuse(levels,id))return false;
 const gained=fusionLevel(levels,id);
 for(const law of FORMS[id].requires)levels.delete(law);
 forms.set(id,(forms.get(id)||0)+gained);
 return true;
}
// Two different first fusions can be folded into one second fusion. Only the
// held pair is scanned (at most six slots); the 990-entry catalogue is never
// walked in the combat loop or reward render path.
export function secondFusionOptions(forms=new Map()){
 const first=[...forms.keys()].filter(id=>Object.hasOwn(FORMS,id)),out=[];
 for(let a=0;a<first.length;a++)for(let b=a+1;b<first.length;b++){
  const id=secondFormOf(first[a],first[b]);if(id)out.push({id,from:[first[a],first[b]]});
 }
 return out;
}
export function secondFusionLevel(forms,option){
 const parts=option?.from?.map(id=>forms.get(id)||0)||[];if(parts.length!==2||parts.some(v=>v<1))return 0;
 return Math.max(...parts)+Math.ceil(Math.min(...parts)/3);
}
export function fuseSecond(forms,option){
 if(!option||!Object.hasOwn(SECOND_FORMS,option.id))return false;
 const valid=secondFusionOptions(forms).some(o=>o.id===option.id&&o.from.every(id=>option.from.includes(id)));
 if(!valid)return false;
 const gained=secondFusionLevel(forms,option);for(const id of option.from)forms.delete(id);
 forms.set(option.id,(forms.get(option.id)||0)+gained);return true;
}
// Every law the seed carries, including those living inside its forms, at the strongest level seen.
export function effectiveLevels(levels,forms=new Map()){
 const merged=new Map(levels);
 for(const [id,level] of forms)for(const law of ALL_FORMS[id]?.requires||[])merged.set(law,Math.max(merged.get(law)||0,level));
 return merged;
}
// Solo evolution: a law at SOLO_LEVEL or higher leaves its slot and becomes its own evolution in that slot.
export function canEvolveSolo(levels,id){return Object.hasOwn(SOLO_FORMS,id)&&soloLevel(levels,id)>0;}
export function evolveSolo(levels,forms,id){
 if(!canEvolveSolo(levels,id))return false;
 const gained=soloLevel(levels,id);
 levels.delete(SOLO_FORMS[id].requires[0]);
 forms.set(id,(forms.get(id)||0)+gained);
 return true;
}
export function buildLevel(levels,forms=new Map()){let n=totalLevel(levels);for(const v of forms.values())n+=v;return n;}

// ---------------- awakening ----------------
// Two held evolutions of the same fusion family awaken into one slot: the fusion with the solo evolution of one of its laws,
// or both solo evolutions of its laws. With the awakened evolution already held, one more of those parts feeds it instead.
// Level: the stronger part plus a third of the weaker (rounded up), so both investments count. Feeding adds a third.
export function awakenOptions(forms=new Map()){
 const out=[];
 for(const a of Object.values(AWAKEN_FORMS)){
  const solos=FORMS[a.base].requires.map(soloFormOf),parts=[a.base,...solos].filter(id=>forms.has(id));
  if(forms.has(a.id)){for(const id of parts)out.push({id:a.id,from:[id]});continue;}
  if(forms.has(a.base))for(const solo of solos)if(forms.has(solo))out.push({id:a.id,from:[a.base,solo]});
  if(solos.every(solo=>forms.has(solo)))out.push({id:a.id,from:solos});
 }
 // Twins: two solo evolutions with no fusion recipe between their laws.
 for(const t of Object.values(TWIN_FORMS)){
  const parts=t.parts.filter(id=>forms.has(id));
  if(forms.has(t.id)){for(const id of parts)out.push({id:t.id,from:[id]});continue;}
  if(parts.length===2)out.push({id:t.id,from:[...t.parts]});
 }
 return out;
}
export function awakenLevel(forms,option){
 const parts=option.from.map(id=>forms.get(id)||0);
 if(forms.has(option.id))return forms.get(option.id)+Math.ceil(parts[0]/3);
 return Math.max(...parts)+Math.ceil(Math.min(...parts)/3);
}
const sameOption=(a,b)=>a.id===b.id&&a.from.length===b.from.length&&a.from.every(id=>b.from.includes(id));
export function awaken(forms,option){
 if(!option||!awakenOptions(forms).some(o=>sameOption(o,option)))return false;
 const level=awakenLevel(forms,option);
 for(const id of option.from)forms.delete(id);
 forms.set(option.id,level);
 return true;
}
