// Translate a real mode's retained boss receipt into the existing Arbor journal.
// The old five-boss/epoch ledgers are intentionally not expanded or migrated.
export function circuitArborGrant(mode,runId,ordinal,proof,events){
 if(!['survival','defense'].includes(mode)||typeof runId!=='string'||!/^[A-Za-z0-9_-]{1,68}$/.test(runId)||!Number.isSafeInteger(ordinal)||ordinal<1||ordinal>1000000||!proof||!Array.isArray(events)||!events.some(e=>e.boss==='arbor'&&e.ordinal===ordinal))return null;
 if(proof.lab||proof.benchmark||proof.siegeReview||proof.inspectionPreview||proof.practice)return null;
 if(mode==='survival'){
  if(proof.circuit!=='arbor-six-v1'||!(proof.actCount===6&&proof.arborBossWins>=ordinal||proof.version===3&&proof.ended===true))return null;
 }else if(proof.actCount!==6||proof.runId!==runId||proof.version!==8||!(proof.bossWins?.arbor>=ordinal))return null;
 // Keep the journal's one..three ordinal schema and never collide with Journey
 // or the other mode. Subsequent real three-boss loops get their own run group.
 return {id:`${mode}-${runId}-a${Math.floor((ordinal-1)/3)}`,ordinal:(ordinal-1)%3+1};
}
