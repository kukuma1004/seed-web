import {EXPANSION_ACTS,expansionCircuitReleased} from './act-expansion.js';
import {validRun} from './online-ranking.js';
import {cleanName} from './score.js';

export const expansionRankView=act=>act==='crosswind'?'crosswind':act==='crystalGorge'?'crystal':null;
// Finish screens capture one immutable result before a retry can change the
// live combat globals. Inspection and unfinished checkpoint writes never rank.
export function expansionJourneyResult({act,owner,currentOwner,inspection=false,practice=false,ended=false,done=false,name,score,cycle,stage,kills,time,build=null,acts=EXPANSION_ACTS}={}){
 if(!expansionCircuitReleased(acts)||!owner||owner==='guest'||owner!==currentOwner||inspection||practice||!ended||!expansionRankView(act))return null;
 const value={uid:owner,name:cleanName(name),score:Math.floor(score),cycle,stage,kills,time:Math.floor(time),act:acts[act].number,done:done===true,at:0,build};
 return validRun(value,{acts})?Object.freeze(value):null;
}
