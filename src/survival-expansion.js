import {survivalAct,survivalActTime,survivalActCount} from './survival-rules.js';
import {createExpansionCrystalWalls,sweepCrystalTerrain,createExpansionBoss,stepExpansionBoss,checkpointExpansionBoss,restoreExpansionBoss,applyCrystalTerrainActions} from './act-expansion-runtime.js';

// Opt-in runtime for the existing survival host. Ordinary crowds remain melee;
// only the two true bosses use the shared expansion patterns. Camera scrolling
// is presentation only: neither existing bullets nor actors are translated.
export function survivalExpansionWalls(session,saved){
 if(survivalActCount(session)!==5||session.act!==4)return [];
 const walls=createExpansionCrystalWalls(Math.min(4,session.lap||0));
 // Spread cover around the arena, keeping a generous central escape crossing.
 for(let i=0;i<walls.length;i++){
  const pair=Math.floor(i/2);walls[i].x=(i%2?1:-1)*(5+Math.floor(pair/4)*5);walls[i].z=-12+(pair%4)*8;
 }
 if(saved){const byId=new Map(saved.map(w=>[w.id,w]));for(const w of walls){const old=byId.get(w.id);if(old&&Number.isFinite(old.hp)){w.hp=Math.max(0,Math.min(w.maxHp,old.hp));w.broken=w.hp===0;}}}
 return walls;
}
export function createSurvivalExpansion(session,saved=null){
 const definition=survivalAct(session);if(!definition.expansion)return null;
 const terrain=survivalExpansionWalls(session,saved?.walls),boss=saved?.boss?restoreExpansionBoss(saved.boss,definition.type):createExpansionBoss(definition.type,{seed:session.rngState});
 return {act:session.act,terrain,boss,coreOpen:false,
  trace(from,to,options){return sweepCrystalTerrain(terrain,from,to,options);},
  stepBoss(dt,{position,player,activeProjectiles=0,hpRatio=1,enemies=[],facilities=[]}={}){
   const out=stepExpansionBoss(boss,dt,{position,player,activeProjectiles,hpRatio,walls:terrain});
   // Shared regrowth respects the player AND the crowd, not just the boss.
   const actions=out.terrain.filter(a=>{const w=terrain.find(w=>w.id===a.id);return w&&(!player||Math.hypot(player.x-w.x,player.z-w.z)>=2.5)&&!enemies.some(e=>Math.hypot((e.x??e.g?.position?.x)-w.x,(e.z??e.g?.position?.z)-w.z)<2)&&!facilities.some(p=>p.kind&&p.hp>0&&Math.abs(p.x-w.x)<w.w/2+.75&&Math.abs(p.z-w.z)<w.d/2+.75);});
   applyCrystalTerrainActions(terrain,actions);this.coreOpen=out.coreOpen;return out;
  },
  camera(player){return definition.expansion==='crosswind'?{x:player.x+3,z:player.z,scroll:survivalActTime(session)*1.8}:{x:player.x,z:player.z,scroll:0};},
  checkpoint(){return {act:session.act,walls:terrain.map(w=>({id:w.id,hp:w.hp})),boss:checkpointExpansionBoss(boss)};}
 };
}

// Preserve lap, current act, RNG, held attacks, potions, pending choices and all
// actor fields. Old three-act clears stay historical, never credited as five.
export function migrateSurvivalToFiveActs(snapshot){
 if(!snapshot?.session||snapshot.ended)return null;
 const next=structuredClone(snapshot),s=next.session;if(survivalActCount(s)===5)return next;
 s.actCount=5;s.legacyCompletedLaps=s.completedLaps||0;s.legacyFastestLap=s.fastestLap||0;
 s.completedLaps=0;s.fastestLap=0;
 s.crosswindBossWins=0;s.crystalBossWins=0;
 next.expansion=null;return next;
}
