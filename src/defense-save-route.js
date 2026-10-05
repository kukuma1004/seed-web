import {EXPANSION_ACTS,expansionCircuitReleased} from './act-expansion.js';
import {restoreDefense,migrateDefenseToFiveActs} from './seed-defense-rules.js';

const legacy=owner=>'seed-defense-preparation-v1:'+encodeURIComponent(owner);
const publicFive=owner=>'seed-defense-public-five-preparation-v1:'+encodeURIComponent(owner);
// The older five-act key contains developer experiments. Never reinterpret
// those bytes as a normal account preparation after the release flags change.
export function defensePreparationKey(owner,actCount,{acts=EXPANSION_ACTS}={}){
 return actCount===5?(expansionCircuitReleased(acts)?publicFive(owner):'seed-defense-expansion-preparation-v1:'+encodeURIComponent(owner)):legacy(owner);
}
export function readDefensePreparation(storage,key,{owner,actCount=3}={}){
 try{
  const raw=storage.getItem(key);
  if(raw!==null){const saved=restoreDefense(raw);return saved&&!saved.objective&&(saved.actCount??3)===actCount?saved:null;}
  if(actCount!==5||key!==publicFive(owner))return null;
  const old=restoreDefense(storage.getItem(legacy(owner)));
  // Routing conversion is performed on a copy. The old preparation stays at
  // its original key until the first real five-act preparation is accepted.
  return old&&(old.actCount??3)===3?migrateDefenseToFiveActs(old):null;
 }catch{return null;}
}
export function canWriteDefensePreparation(storage,key,{actCount=3}={}){
 try{const raw=storage.getItem(key);if(raw===null)return true;const old=restoreDefense(raw);return Boolean(old&&!old.objective&&(old.actCount??3)===actCount);}catch{return false;}
}
