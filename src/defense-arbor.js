import {createArborBoss,stepArborBoss,ARBOR_BOSS_LIMITS} from './arbor-boss.js';
import {ARBOR_ROOT_TIMING} from './arbor-journey.js';

// The same warned fan / three roots / open flower clock as Journey, translated
// onto a planted road. Roots bind seeds briefly; an immobile heart is not asked
// to dodge three unavoidable ground strikes. Fan bolts remain interceptable.
const scratch=new WeakMap();
const fieldRoots=new WeakMap();
const ARENA=Object.freeze({halfWidth:12,halfDepth:8});
const toWorld=(x,y)=>({x:(x-50)/5,z:(y-30)/5});
export const DEFENSE_ARBOR_LIMITS=Object.freeze({bolts:ARBOR_BOSS_LIMITS.projectiles,rootBind:1.3,rootRadius:8});
export const defenseArborFieldCue=s=>s?.phase==='wave'&&fieldRoots.get(s)?.wave===s.wave?fieldRoots.get(s).warning:null;
export function tickDefenseArborField(s,info,dt,effect){
 if(s.actCount!==6||info.act!==5||info.final)return;
 let f=fieldRoots.get(s);
 if(!f||f.wave!==s.wave){f={wave:s.wave,next:4,turn:0,warning:null};fieldRoots.set(s,f);}
 if(f.warning){
  f.warning.remaining=Math.max(0,f.warning.remaining-dt);
  if(f.warning.remaining>0)return;
  const cue=f.warning;
  for(const tower of s.towers)if((tower.x-cue.x)**2+(tower.y-cue.y)**2<cue.radius**2)tower.rootBind=Math.max(tower.rootBind||0,.9);
  effect(s,'arbor-root',cue.x,cue.y,'#bedb9c',{radius:cue.radius,life:.5,maxLife:.5});f.warning=null;f.next=s.waveTime+ARBOR_ROOT_TIMING.rest+2;
 }else if(s.waveTime>=f.next&&s.towers.length){
  const tower=s.towers[f.turn++%s.towers.length];
  f.warning={x:tower.x,y:tower.y,radius:5,remaining:ARBOR_ROOT_TIMING.warn};
 }
}
export function tickDefenseArborBoss(s,e,dt,emit,effect){
 if(e.bossId!=='arbor')return false;
 e.arborBoss??=createArborBoss(Math.min(2,Math.floor((s.wave-1)/72)),{encounterVersion:2});
 const b=e.arborBoss;
 b.hp=b.maxHp*Math.max(0,e.hp/e.maxHp);b.position.x=(e.x-50)/5;b.position.z=(e.y-30)/5;
 let c=scratch.get(e);
 if(!c){c={player:toWorld(104,48),arena:ARENA,projectiles:0};scratch.set(e,c);}
 let target=null,nearest=Infinity;
 if(b.pattern===1)for(const tower of s.towers){const distance=(tower.x-e.x)**2+(tower.y-e.y)**2;if(distance<nearest){nearest=distance;target=tower;}}
 c.player.x=((target?.x??104)-50)/5;c.player.z=((target?.y??48)-30)/5;
 c.projectiles=0;for(const q of s.shots)if(q.law==='hostile')c.projectiles++;
 const out=stepArborBoss(b,dt,c);
 e.arborAttackFlash=Math.max(0,(e.arborAttackFlash||0)-dt);
 if(out.bolts.length||out.zones.length)e.arborAttackFlash=.18;
 e.coreOpen=b.coreOpen;e.expansionState=b.phase==='windup'?'tell':b.phase;e.expansionPattern=b.pattern;
 if(out.cue?.kind==='root'){
  const cue=out.cue;e.arborRootCue??={x:0,y:0,radius:8,remaining:0};
  e.arborRootCue.x=cue.position.x*5+50;e.arborRootCue.y=cue.position.z*5+30;e.arborRootCue.radius=cue.radius*5;e.arborRootCue.remaining=cue.remaining;
 }else e.arborRootCue=null;
 for(const q of out.bolts)emit({...q,position:{x:q.position.x+10,z:q.position.z+6},pattern:'arbor-branch-fan',coreStrike:`${e.id}:arbor:${b.cycles}:${b.sequenceIndex}`});
 for(const zone of out.zones){
  const x=zone.position.x*5+50,y=zone.position.z*5+30,r=zone.radius*5;
  for(const tower of s.towers)if((tower.x-x)**2+(tower.y-y)**2<=r*r){tower.rootBind=Math.max(tower.rootBind||0,DEFENSE_ARBOR_LIMITS.rootBind);tower.shotTime=Math.max(tower.shotTime||0,DEFENSE_ARBOR_LIMITS.rootBind);}
  effect(s,'arbor-root',x,y,'#b6d893',{radius:r,life:.55,maxLife:.55});
 }
 return true;
}
