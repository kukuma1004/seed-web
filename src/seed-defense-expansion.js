import {createExpansionCrystalWalls,sweepCrystalTerrain,createExpansionBoss,stepExpansionBoss,checkpointExpansionBoss,restoreExpansionBoss,applyCrystalTerrainActions} from './act-expansion-runtime.js';

export const DEFENSE_CROSSWIND_PATH=Object.freeze([{x:-4,y:12},{x:104,y:12},{x:104,y:48}].map(Object.freeze));
export function createDefenseCrystalWalls(room=0,saved,towers=[]){
 const walls=createExpansionCrystalWalls(room),byId=new Map((saved||[]).map(w=>[w.id,w]));
 // Thin cover stands BETWEEN permanent flowerbeds. Actors use the clear road;
 // roots/fields can attack cover, but cover is never an enemy or kill reward.
 for(let i=0;i<walls.length;i++){
  const p=Math.floor(i/2);walls[i].x=p<6?10+p*16:18+(p-6)*80;walls[i].z=p<6?(i%2?39:21):(i%2?34:26);
  walls[i].w=walls[i].d=3.8;const old=byId.get(walls[i].id);
  if(old&&Number.isFinite(old.hp))walls[i].hp=Math.max(0,Math.min(walls[i].maxHp,old.hp));
  if(towers.some(t=>Math.abs(t.x-walls[i].x)<3&&Math.abs(t.y-walls[i].z)<3))walls[i].hp=0;
  walls[i].broken=walls[i].hp===0;walls[i].y=walls[i].z;walls[i].terrain=true;walls[i].progress=-1;
 }
 return walls;
}
export function defenseTraceTerrain(state,from,to,options){return sweepCrystalTerrain(state.crystalWalls||[],from,to,options);}
export function prepareDefenseTerrain(s,info){
 if(s.actCount!==5)return;
 if(info.act!==4){s.crystalWalls=[];s.crystalRoom=-1;return;}
 const room=Math.min(4,Math.floor((info.localWave-1)/3));
 if(s.crystalRoom!==room||s.crystalLap!==info.lap){s.crystalRoom=room;s.crystalLap=info.lap;s.crystalWalls=createDefenseCrystalWalls(room,null,s.towers);}
}
export function tickDefenseExpansionBoss(s,e,dt,emit){
 if(e.bossId!=='crosswindKeeper'&&e.bossId!=='crystalGardener')return false;
 e.expansionBoss??=createExpansionBoss(e.bossId,{seed:s.rng});
 const walls=s.crystalWalls||[],out=stepExpansionBoss(e.expansionBoss,dt,{position:{x:e.x/5,z:e.y/5},player:{x:104/5,z:48/5},
  walls:walls.map(w=>({...w,x:w.x/5,z:w.z/5,w:w.w/5,d:w.d/5})),activeProjectiles:s.shots.filter(q=>q.law==='hostile').length,hpRatio:e.hp/e.maxHp});
 e.coreOpen=out.coreOpen;
 e.expansionState=out.state;e.expansionPattern=out.pattern;
 // Regrowth never appears under a planted seed; the path is already separate.
 applyCrystalTerrainActions(walls,out.terrain.filter(a=>{const w=walls.find(w=>w.id===a.id);return w&&!s.towers.some(t=>Math.hypot(t.x-w.x,t.y-w.z)<4);}));
 for(const q of out.bolts)emit(q);
 // Movement is translated along the existing road, preserving lane collision.
 if(e.bossId==='crosswindKeeper'&&out.move.x)e.progress+=Math.abs(out.move.x)*5;
 return true;
}
export const defenseBossCheckpoint=e=>e?.expansionBoss?checkpointExpansionBoss(e.expansionBoss):null;
export const restoreDefenseBoss=(saved,id)=>restoreExpansionBoss(saved,id);
