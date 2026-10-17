// Journey-only gate revision. Legacy entries and the shared Survival/Defense
// course keep their original interpretation until a new circuit is started.
export const EXPANSION_WARDENS_PER_BOSS=5;
export const expansionRoomCircuit=s=>s?.guardians?.version===2;
export const expansionGateIndex=s=>expansionRoomCircuit(s)?s.guardians.cleared-(s.guardians.gateCleared?1:0):s?.room??0;
export function validExpansionGuardians(route,room,phase,act=null){
 if(route?.version===2){
  if(Object.keys(route).length!==4||!Number.isInteger(route.cleared)||route.cleared<0||route.cleared>5||typeof route.gateCleared!=='boolean'||!Array.isArray(route.receipts)||route.receipts.length!==route.cleared)return false;
  for(let i=0;i<route.receipts.length;i++){const match=typeof route.receipts[i]==='string'&&/^gate:(crosswind|crystalGorge):([0-4]):4:([1-9][0-9]{0,9})$/.exec(route.receipts[i]);if(!match||Number(match[2])!==i||Number(match[3])>4294967295||act!==null&&match[1]!==act)return false;}
  if(phase!=='course')return room===4&&route.cleared===5&&route.gateCleared;
  return route.gateCleared?room===4&&route.cleared>=1:route.cleared<5;
 }
 if(!route||Object.keys(route).length!==2||route.version!==1||!Number.isInteger(route.cleared))return false;
 return phase==='course'?(route.cleared===room||route.cleared===room+1):room===4&&route.cleared===EXPANSION_WARDENS_PER_BOSS;
}
export function expansionGuardianId(s){return expansionRoomCircuit(s)?`gate:${s.act}:${expansionGateIndex(s)}:${s.room}:${s.seed}`:`gate:${s.act}:${s.room}:${s.seed}`;}
export function expansionGuardianNeeded(s){return Boolean(s?.guardians&&s.phase==='course'&&(expansionRoomCircuit(s)?s.room===4&&!s.guardians.gateCleared:s.guardians.cleared===s.room));}
export function expansionGuardianCourseReady(s){return Boolean(s?.phase==='course'&&(expansionRoomCircuit(s)&&s.room===4||(s.siege?s.siege.phase==='clear':s.course.finishAnnounced)));}
export function creditExpansionGuardian(s,id){
 if(!expansionGuardianNeeded(s)||!expansionGuardianCourseReady(s)||id!==expansionGuardianId(s))return false;
 s.guardians.cleared++;if(expansionRoomCircuit(s)){s.guardians.receipts.push(id);s.guardians.gateCleared=true;if(s.siege?.journeyCircuit)s.siege.journeyCircuit.wardenCleared=true;}return true;
}
export function expansionGuardiansAllowAdvance(s){
 if(expansionRoomCircuit(s))return s.phase!=='course'||(s.room===4?s.guardians.gateCleared:expansionGuardianCourseReady(s));
 return !s?.guardians||s.phase!=='course'||s.guardians.cleared===s.room+1&&expansionGuardianCourseReady(s);
}
export function expansionGuardianProgress(s){return s?.guardians?`${s.guardians.cleared}/5 문지기 격파`:null;}
