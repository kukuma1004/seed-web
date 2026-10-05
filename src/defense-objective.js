import {CRYSTAL_DEFENSE_OBJECTIVE,EXPANSION_OBJECTIVES,expansionObjectiveReleased} from './expansion-objective.js';
export {CRYSTAL_DEFENSE_OBJECTIVE,EXPANSION_OBJECTIVES};
export const defenseObjective=s=>s?.objective??null;
export const defenseObjectiveEligible=(s,{owner,currentOwner=owner,practice=false,objectives=EXPANSION_OBJECTIVES}={})=>!defenseObjective(s)||owner&&owner!=='guest'&&owner===currentOwner&&practice===false&&s.actCount===5&&expansionObjectiveReleased('crystalGorge',s.objective,objectives);
export function defenseObjectiveScope(s){if(!(s?.siegeReview||s?.objective===CRYSTAL_DEFENSE_OBJECTIVE)||s.actCount!==5||s.phase!=='build'||!Number.isInteger(s.wave))return null;const next=s.wave+1;if(Math.floor((next-1)/12)%5!==4)return null;return{lap:Math.floor((next-1)/60),group:Math.floor(((next-1)%12)/3)};}
export function defenseObjectiveGather(s){const scope=defenseObjectiveScope(s);if(!scope)return null;let g=s.objectiveGather;if(!g||g.lap!==scope.lap||g.group!==scope.group)s.objectiveGather=g={...scope,mask:0};return g;}
export function validDefenseObjectiveGather(g,s){const scope=defenseObjectiveScope(s);if(!scope)return g===null;return Boolean(g&&Object.keys(g).length===3&&g.lap===scope.lap&&g.group===scope.group&&Number.isInteger(g.mask)&&g.mask>=0&&g.mask<=63);}
