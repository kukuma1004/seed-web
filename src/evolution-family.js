import {rankedEvolutions} from './evolution-rank.js';

// Orbit evolutions all occupy the same physical ring around the seed. Keeping one
// core active preserves their identity and prevents three independent auto-attacks
// and projectile shields from multiplying each other.
export const ORBIT_FORMS=Object.freeze(['frostguard','stormcrown','mirrorguard','starring']);
const ORBIT_SET=new Set(ORBIT_FORMS);

export const evolutionFamily=id=>ORBIT_SET.has(id)?'orbit':id;
export const isOrbitEvolution=id=>ORBIT_SET.has(id);

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
