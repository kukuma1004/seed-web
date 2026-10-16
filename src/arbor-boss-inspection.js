import {createArborJourney,stepArborJourney,creditArborKill,advanceArborJourney} from './arbor-journey.js';
// Explicit local review only. Simulated receipts reach the genuine boss
// engine; they are never natural victories or normal-account records.
export function createArborBossInspection(){
 const state=createArborJourney();
 for(let frame=0;frame<10000;frame++){
  if(state.phase==='boss')return state;
  if(state.phase==='cleared'){advanceArborJourney(state);continue;}
  const out=stepArborJourney(state,.1,{player:{x:0,z:5},alive:0});
  for(const actor of [...out.spawns])creditArborKill(state,actor.id,actor.role);
 }
 throw Error('Inspection route did not reach Arbo');
}
