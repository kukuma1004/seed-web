// Keep an in-progress legacy route pinned. Promotion is a fresh-run choice,
// never a conversion of inspection bytes or an existing combat timeline.
export const CRYSTAL_DEFENSE_OBJECTIVE='crystal-defense-v1';
export const EXPANSION_OBJECTIVES=Object.freeze({
 [CRYSTAL_DEFENSE_OBJECTIVE]:Object.freeze({version:1,released:true})
});
export function expansionObjectiveReleased(act,objective,objectives=EXPANSION_OBJECTIVES){
 return act==='crystalGorge'&&objective===CRYSTAL_DEFENSE_OBJECTIVE&&objectives?.[objective]?.version===1&&objectives[objective].released===true;
}
export function freshExpansionObjective(act,objectives=EXPANSION_OBJECTIVES){
 return expansionObjectiveReleased(act,CRYSTAL_DEFENSE_OBJECTIVE,objectives)?CRYSTAL_DEFENSE_OBJECTIVE:null;
}
export function pinnedExpansionObjective(journey){
 return journey?.objective===CRYSTAL_DEFENSE_OBJECTIVE?CRYSTAL_DEFENSE_OBJECTIVE:null;
}
