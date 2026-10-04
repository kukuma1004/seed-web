import {createExpansionJourney,advanceExpansionJourney} from './expansion-journey.js';
import {createDefense,plantDefense,upgradeDefense,startDefenseWave,stepDefense,defenseWaveInfo,defensePoint} from './seed-defense-rules.js';

// Scripted local scenarios only. They do not prove a completed campaign and
// never accept account progress or write storage, rewards or leaderboard data.
export function createJourneyBossInspection(act){
 const state=createExpansionJourney(act,4,413);
 advanceExpansionJourney(state);state.inspectionPreview=true;
 return state;
}
export function createDefenseBossInspection(act,{enabled=false}={}){
 if(!enabled||!['crosswind','crystalGorge'].includes(act))return null;
 const state=createDefense(413,{actCount:5});state.currency=2000;
 // Authored placement and upgrade rules still supply each tower and its law.
 for(let pad=0;pad<4;pad++){
  if(!plantDefense(state,pad))continue;
  const tower=state.towers.at(-1);
  while(tower.level<5&&upgradeDefense(state,tower.id)){}
 }
 state.wave=act==='crosswind'?47:59;
 if(!startDefenseWave(state))return null;
 const info=defenseWaveInfo(state.wave,state);
 // Skip the preliminary population explicitly, then use the actual boss
 // spawn/terrain/pattern code. No preliminary kills or rewards are invented.
 state.spawned=info.count-1;state.spawnTimer=0;
 stepDefense(state,.001);
 for(const enemy of state.enemies){enemy.progress=28;Object.assign(enemy,defensePoint(enemy.progress,state));}
 state.inspectionPreview=true;
 return state;
}
