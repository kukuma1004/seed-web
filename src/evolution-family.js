import {rankedEvolutions} from './evolution-rank.js';
import {baseFormOf} from './forms.js';

// Orbit evolutions all occupy the same physical ring around the seed. Keeping one
// core active preserves their identity and prevents three independent auto-attacks
// and projectile shields from multiplying each other.
// 1·2묶음의 꽃잎 후광·밀물 고리도 씨앗을 도는 고리라 같은 규칙을 따른다(2026-09-21).
export const ORBIT_FORMS=Object.freeze(['frostguard','stormcrown','mirrorguard','starring','halobloom','ebbring']);
const ORBIT_SET=new Set(ORBIT_FORMS);

// An awakened evolution belongs to its fusion's family (and the orbit family when that fusion orbits).
export const evolutionFamily=id=>ORBIT_SET.has(baseFormOf(id))?'orbit':baseFormOf(id);
export const isOrbitEvolution=id=>ORBIT_SET.has(baseFormOf(id));

export function activeCombatEvolutions(forms,known){
 const ranked=rankedEvolutions(forms,known);
 const chosenOrbit=ranked.find(entry=>isOrbitEvolution(entry.id))?.id;
 return ranked.filter(entry=>!isOrbitEvolution(entry.id)||entry.id===chosenOrbit);
}

export function activeUltimateEvolutions(forms,known,limit=2){
 const picked=[],families=new Set();
 for(const entry of rankedEvolutions(forms,known)){
  const family=evolutionFamily(entry.id);
  if(families.has(family))continue;
  families.add(family);picked.push(entry);
  if(picked.length>=limit)break;
 }
 return picked;
}

export function orbitCore(forms,known){return activeCombatEvolutions(forms,known).find(entry=>isOrbitEvolution(entry.id))?.id||null;}

export function canAcquireEvolution(forms,id,known){const core=orbitCore(forms,known);return !isOrbitEvolution(id)||!core||id===core;}
