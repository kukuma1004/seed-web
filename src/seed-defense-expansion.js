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
// The canonical walls belong to the save/combat state. Reuse only the scaled
// view passed to the boss rules; refresh every field before each simulation step.
// Weak keys let a finished run release its scratch data without an extra hook.
const bossScratch=new WeakMap();
const coreStrikes=new WeakMap();
// Mobile action salvos offer a player space to dodge their separate bullets.
// A stationary heart has no such movement: one committed volley is one strike,
// while every projectile remains a real interceptable shot. These receipts are
// wave-local because preparation checkpoints never serialize an active battle.
export function acceptDefenseCoreStrike(s,q){
 if(!q.coreStrike)return true;
 let receipt=coreStrikes.get(s);
 if(!receipt||receipt.wave!==s.wave){receipt={wave:s.wave,seen:new Set()};coreStrikes.set(s,receipt);}
 if(receipt.seen.has(q.coreStrike))return false;
 receipt.seen.add(q.coreStrike);return true;
}
function bossContext(s,e,walls){
 let c=bossScratch.get(s);
 if(!c){c={position:{x:0,z:0},player:{x:104/5,z:48/5},walls:[],activeProjectiles:0,hpRatio:1};bossScratch.set(s,c);}
 c.position.x=e.x/5;c.position.z=e.y/5;c.hpRatio=e.hp/e.maxHp;
 c.walls.length=walls.length;
 for(let i=0;i<walls.length;i++){
  const w=walls[i],p=c.walls[i]??={};p.id=w.id;p.x=w.x/5;p.z=w.z/5;p.w=w.w/5;p.d=w.d/5;p.hp=w.hp;p.maxHp=w.maxHp;p.broken=w.broken;
 }
 c.activeProjectiles=0;for(const q of s.shots)if(q.law==='hostile')c.activeProjectiles++;
 return c;
}
export function tickDefenseExpansionBoss(s,e,dt,emit,{travelScale=1}={}){
 if(e.bossId!=='crosswindKeeper'&&e.bossId!=='crystalGardener')return false;
 e.expansionBoss??=createExpansionBoss(e.bossId,{seed:s.rng});
 const walls=s.crystalWalls||[],out=stepExpansionBoss(e.expansionBoss,dt,bossContext(s,e,walls));
 e.coreOpen=out.coreOpen;
 e.expansionState=out.state;e.expansionPattern=out.pattern;
 // Regrowth never appears under a planted seed; the path is already separate.
 applyCrystalTerrainActions(walls,out.terrain.filter(a=>{const w=walls.find(w=>w.id===a.id);return w&&!s.towers.some(t=>Math.hypot(t.x-w.x,t.y-w.z)<4);}));
 for(const q of out.bolts){
  const strike={...q,coreStrike:`${e.id}:${e.bossId}:${e.expansionBoss.sequence}`};
  if(q.pattern==='rear-salvo'){
   // In an action arena these escorts appear behind the moving player. The
   // defense target is the stationary heart: spawning relative to that target
   // would teleport six shots past the whole planted road (even off the map).
   // Keep escorts beside the boss instead, with a committed aim at the heart.
   // Their unchanged speed/lifetime gives the road's towers time to intercept.
   const sign=q.position.z>=e.expansionBoss.target.z?1:-1;
   const origin={x:Math.max(0,Math.min(100,e.x))/5,z:Math.max(1,Math.min(59,e.y+sign*6))/5};
   const dx=e.expansionBoss.target.x-origin.x,dz=e.expansionBoss.target.z-origin.z,length=Math.hypot(dx,dz)||1;
   emit({...strike,position:origin,dir:{x:dx/length,z:dz/length}});
  }else emit(strike);
 }
 // Movement is translated along the existing road, preserving lane collision.
 if(e.bossId==='crosswindKeeper'&&out.move.x)e.progress+=Math.abs(out.move.x)*5*travelScale;
 return true;
}
export const defenseBossCheckpoint=e=>e?.expansionBoss?checkpointExpansionBoss(e.expansionBoss):null;
export const restoreDefenseBoss=(saved,id)=>restoreExpansionBoss(saved,id);
