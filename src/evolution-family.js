import {rankedEvolutions} from './evolution-rank.js';
import {baseFormOf} from './forms.js';

// 씨앗을 도는 고리(공전 계열) 진화.
// 2026-09-29 사용자: "하나 조합하면 다른 고리는 조합이 안 되고, 상위 조합표는 있는데 못 만드는 건 이상하다.
// 막아야 하는 건 탄 막기 중복이었다." → 고리 진화는 몇 개든 얻고 모두 공격하지만, 일반 적 탄을 막는 일(방패)은
// 가장 강한 고리 하나(공전 코어)만 한다. 나머지 고리는 겹쳐 보이지 않게 바깥쪽으로 한 칸씩 넓게 돈다.
// 1·2묶음의 꽃잎 후광·밀물 고리도 씨앗을 도는 고리라 같은 규칙을 따른다(2026-09-21).
export const ORBIT_FORMS=Object.freeze(['frostguard','stormcrown','mirrorguard','starring','halobloom','ebbring','spearring','accretiondisk']);
const ORBIT_SET=new Set(ORBIT_FORMS);

// An awakened evolution belongs to its fusion's family (and the orbit family when that fusion orbits).
export const evolutionFamily=id=>ORBIT_SET.has(baseFormOf(id))?'orbit':baseFormOf(id);
export const isOrbitEvolution=id=>ORBIT_SET.has(baseFormOf(id));

export function activeCombatEvolutions(forms,known){return rankedEvolutions(forms,known);}

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

export function canAcquireEvolution(){return true;}
// 방패(탄 막기)를 맡는 고리와, 나머지 고리가 도는 바깥 칸(1 = 코어 자리, 1.32 · 1.64 …).
export function orbitShieldRole(forms,known,id){
 if(!isOrbitEvolution(id))return {shield:true,ringScale:1};
 const rings=activeCombatEvolutions(forms,known).filter(entry=>isOrbitEvolution(entry.id)).map(entry=>entry.id),k=Math.max(0,rings.indexOf(id));
 return {shield:k===0,ringScale:1+.32*k};
}
