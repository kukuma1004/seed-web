import {LAWS} from './laws.js';

// Laws are stacked, never swapped: five slots, and every pick after that deepens a held law.
// Levels have no ceiling; counts that would flood the screen are capped, damage keeps growing.
export const SLOT_CAP=5;

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
  burstRadius:lv('burst')?Math.min(3.3,1.2+.3*lv('burst')):0,
  recallReturn:lv('recall')?1+.5*(lv('recall')-1):0,
  gravityRadius:lv('gravity')?Math.min(4.2,1.4+.8*lv('gravity')):0,
  frostTime:lv('frost')?Math.min(3,1+.3*lv('frost')):0,
  frostFactor:lv('frost')?Math.max(.25,.8-.2*lv('frost')):1,
  orbitPetals:lv('orbit')?Math.min(7,2+lv('orbit')):0,
  orbitRadius:lv('orbit')?Math.min(2.9,1.8+.18*lv('orbit')):0,
  orbitDamage:lv('orbit')?14+4*(lv('orbit')-1):0
 };
}

// Three distinct laws. While slots remain at least one new law is offered; once full, only upgrades.
export function offerChoices(levels,{random=Math.random,guide=null}={}){
 const held=[...levels.keys()],full=held.length>=SLOT_CAP;
 const fresh=full?[]:Object.keys(LAWS).filter(id=>!levels.has(id));
 const shuffle=list=>{for(let i=list.length-1;i>0;i--){const j=Math.floor(random()*(i+1));[list[i],list[j]]=[list[j],list[i]];}return list;};
 shuffle(fresh);shuffle(held);
 let pool;
 if(full)pool=held;
 else{
  // Mostly fresh laws early, mixing in upgrades once the seed has something to deepen.
  const freshCount=held.length===0?3:held.length<3?2:1;
  pool=[...fresh.slice(0,freshCount),...held,...fresh.slice(freshCount)];
 }
 const offer=[...new Set(pool)].slice(0,3);
 if(guide&&!full&&!levels.has(guide)&&Object.hasOwn(LAWS,guide)&&!offer.includes(guide)){
  if(offer.length===3)offer[2]=guide;else offer.push(guide);
 }
 return offer;
}

export function chooseLaw(levels,id){
 if(!Object.hasOwn(LAWS,id))return false;
 if(levels.has(id)){levels.set(id,levels.get(id)+1);return true;}
 if(levels.size>=SLOT_CAP)return false;
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
  case 'pierce':return pair('관통','pierceHits','명');
  case 'burst':return pair('폭발 반경','burstRadius','',1);
  case 'recall':return `귀환 피해 ×${now.recallReturn.toFixed(1)} → ×${next.recallReturn.toFixed(1)}`;
  case 'gravity':return pair('흡인 반경','gravityRadius','',1);
  case 'frost':return `둔화 ${Math.round((1-now.frostFactor)*100)}% → ${Math.round((1-next.frostFactor)*100)}% · ${now.frostTime.toFixed(1)} → ${next.frostTime.toFixed(1)}초`;
  default:return '강화';
 }
}
