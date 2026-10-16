// Journey-only gate revision. Legacy entries and the shared Survival/Defense
// course keep their original interpretation until a new circuit is started.
export const EXPANSION_WARDENS_PER_BOSS=5;
export function validExpansionGuardians(route,room,phase){
 if(!route||Object.keys(route).length!==2||route.version!==1||!Number.isInteger(route.cleared))return false;
 return phase==='course'?(route.cleared===room||route.cleared===room+1):room===4&&route.cleared===EXPANSION_WARDENS_PER_BOSS;
}
export function expansionGuardianId(s){return `gate:${s.act}:${s.room}:${s.seed}`;}
export function expansionGuardianNeeded(s){return Boolean(s?.guardians&&s.phase==='course'&&s.guardians.cleared===s.room);}
export function expansionGuardianCourseReady(s){return Boolean(s?.phase==='course'&&(s.siege?s.siege.phase==='clear':s.course.finishAnnounced));}
export function creditExpansionGuardian(s,id){
 if(!expansionGuardianNeeded(s)||!expansionGuardianCourseReady(s)||id!==expansionGuardianId(s))return false;
 s.guardians.cleared++;return true;
}
export function expansionGuardiansAllowAdvance(s){return !s?.guardians||s.phase!=='course'||s.guardians.cleared===s.room+1&&expansionGuardianCourseReady(s);}
export function expansionGuardianProgress(s){return s?.guardians?`${s.guardians.cleared}/5 문지기 격파`:null;}
