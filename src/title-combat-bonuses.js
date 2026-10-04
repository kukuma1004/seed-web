import {titleState} from './titles.js';
import {DISCOVERY_FORMS} from './forms.js';
import {lawStats} from './progression.js';

const held=new WeakMap();
const heroHp=new WeakMap();
export const NEUTRAL_TITLE_COMBAT=Object.freeze({power:1,cadence:1,move:1,critical:0,maxHpBonus:0,clearStatBonus:0});
export const TITLE_CRIT_DAMAGE=lawStats(new Map()).critDamage;
const titleFlags=Object.freeze({austin:'austin',austinclear:'austinClear',austinveteran:'austinVeteran',alwaysbeginner:'alwaysBeginner',alwaysclear:'alwaysClear',alwaysveteran:'alwaysVeteran',tempestcarrier:'johan',johanclear:'johanClear',johanveteran:'johanVeteran',crosswindKeeper:'crosswind',crosswindclear:'crosswindClear',crosswindveteran:'crosswindVeteran',crystalGardener:'crystal',crystalclear:'crystalClear',crystalveteran:'crystalVeteran'});
// Recompute perks from actually held title IDs, not arbitrary scalar fields or
// codex/garden rates. This adapter only supplies the shared title contract.
export function effectiveTitleCombatBonuses(info){
 if(!Array.isArray(info?.titles))return NEUTRAL_TITLE_COMBAT;
 const flags={};for(const title of info.titles){const key=titleFlags[title?.id];if(key)flags[key]=true;}
 const s=titleState(flags),clear=s.clearStatBonus;
 return Object.freeze({power:1+s.powerBonus+clear,cadence:1+s.cooldownBonus+clear,move:1+s.moveSpeedBonus+clear,critical:Math.min(.25,s.criticalBonus+clear),maxHpBonus:s.maxHpBonus,clearStatBonus:clear});
}
export function createTitleCombatBinding({owner='',currentOwner=()=>'',practice=false,titleStats=()=>null}={}){
 let previous=null,cached=NEUTRAL_TITLE_COMBAT;
 const get=()=>{
  try{
   if(!owner||owner==='guest'||currentOwner()!==owner||(typeof practice==='function'?practice():practice)!==false)return NEUTRAL_TITLE_COMBAT;
   const info=titleStats();if(info!==previous){previous=info;cached=effectiveTitleCombatBonuses(info);}return cached;
  }catch{return NEUTRAL_TITLE_COMBAT;}
 };
 return {get,attach(state){if(state&&typeof state==='object')held.set(state,get);return state;}};
}
export const titleCombatBonuses=state=>held.get(state)?.()||NEUTRAL_TITLE_COMBAT;
export function titleFormCriticalEligible(formId,meta={}){
 return Boolean(DISCOVERY_FORMS[meta.kind||formId]?.requires?.includes('pierce')||meta.comboLaws?.includes('pierce'));
}
export function titleCriticalMultiplier(state,eligible,random){
 if(!eligible)return 1;const chance=titleCombatBonuses(state).critical;
 return chance>0&&typeof random==='function'&&random()<chance?TITLE_CRIT_DAMAGE:1;
}
// The adventure hero keeps its growth max HP separate from derived account HP.
// Fresh runs may fill their starting bonus; restore/refresh never heals.
export function refreshAdventureTitleHp(state,{fresh=false}={}){
 const p=state?.player;if(!p)return;
 const old=heroHp.get(state),base=p.maxHp-(old?.applied||0),bonus=titleCombatBonuses(state),added=100*bonus.clearStatBonus+bonus.maxHpBonus;
 if(old?.applied===added&&old.restoreHealth===undefined)return;
 const max=base+added,health=old?.restoreHealth??p.hp;
 p.maxHp=max;p.hp=fresh&&!old&&health===base?max:Math.min(max,health);
 heroHp.set(state,{applied:added});
}
export function checkpointAdventureTitleHp(state){
 refreshAdventureTitleHp(state);const p=state.player,added=heroHp.get(state)?.applied||0,base=p.maxHp-added;
 return {maxHp:base,hp:p.hp*base/p.maxHp,...(added?{titleHp:{version:1,bonus:added,health:p.hp}}:{})};
}
export function validAdventureTitleHp(marker,maxHp,hp){
 if(marker===undefined)return true;
 return marker?.version===1&&Object.keys(marker).every(k=>['version','bonus','health'].includes(k))&&Number.isFinite(marker.bonus)&&marker.bonus>0&&marker.bonus<=25&&Number.isFinite(marker.health)&&marker.health>0&&marker.health<=maxHp+marker.bonus&&Math.abs(hp-marker.health*maxHp/(maxHp+marker.bonus))<1e-7;
}
export function restoreAdventureTitleHp(state,marker){
 if(marker)heroHp.set(state,{applied:0,restoreHealth:marker.health});
}
