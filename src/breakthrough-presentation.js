import {createDuelFeel,applyDuelFeelEvent,stepDuelFeel,resetDuelFeel} from './duel-feel.js';

// Orthographic 2.5D presentation. Combat coordinates and hitboxes stay unchanged.
export const BREAKTHROUGH_CAMERA=Object.freeze({depth:.68,span:22,verticalSpan:18,hero:3.55,soldier:1.65,captain:3.05,commander:4.5,echoes:12});
export function createBreakthroughPresentation(reducedMotion=false){
 return {camera:{x:0,y:0,scale:1,ox:0,oy:0,depth:BREAKTHROUGH_CAMERA.depth,ready:false},
  feel:createDuelFeel({reducedMotion}),kick:0,clock:0,
  slots:Array.from({length:96},()=>({id:0,alive:false})),
  echoes:Array.from({length:BREAKTHROUGH_CAMERA.echoes},()=>({life:0}))};
}
export function resetBreakthroughPresentation(view,run){
 resetDuelFeel(view.feel);view.kick=view.clock=0;view.camera.ready=false;
 for(let i=0;i<view.slots.length;i++){view.slots[i].id=run?.units[i]?.id||0;view.slots[i].alive=Boolean(run?.units[i]?.active);}
 for(const e of view.echoes)e.life=0;
}
export function advanceBreakthroughPresentation(view,dt){
 const seconds=Number.isFinite(dt)?Math.max(0,Math.min(.1,dt)):0;
 view.clock+=seconds;view.kick=Math.max(0,view.kick-seconds*18);
 for(const e of view.echoes)e.life=Math.max(0,e.life-seconds);
 return stepDuelFeel(view.feel,seconds);
}
export function observeBreakthroughContacts(view,run,previousHits){
 let impact=0;
 // Only confirmed third-hit/skill impacts get a brief stop; empty swings do not.
 if(run.comboHits>previousHits){
  const heavy=run.player.step===2||run.player.motion>0||run.effects.some(f=>f.life>f.max-.06&&['burst','lance'].includes(f.kind));
  impact=heavy?2:1;if(heavy){applyDuelFeelEvent(view.feel,'heavyHit',run.player.x,run.player.y,{contact:true});if(!view.feel.reducedMotion)view.kick=Math.max(view.kick,2.2);}
 }
 for(let i=0;i<run.units.length;i++){
  const u=run.units[i],old=view.slots[i];
  if(old.alive&&old.id===u.id&&!u.active&&u.hp===0){
   const e=view.echoes.find(q=>q.life===0);
   if(e)Object.assign(e,{life:.22,x:u.x,y:u.y,id:u.boss?'frost':u.leader?'burst':'soldier',size:u.boss?BREAKTHROUGH_CAMERA.commander:u.leader?BREAKTHROUGH_CAMERA.captain:BREAKTHROUGH_CAMERA.soldier,face:u.fx,dx:u.x-run.player.x,dy:u.y-run.player.y});
  }
  old.id=u.id;old.alive=u.active;
 }
 return impact;
}
export function frameBreakthroughCamera(view,width,height,player,dt=0){
 const c=view.camera,blend=c.ready&&dt>0?1-Math.exp(-dt/.045):1;
 c.x+=(player.x-c.x)*blend;c.y+=(player.y-c.y)*blend;c.ready=true;
 c.scale=Math.max(width/BREAKTHROUGH_CAMERA.span,height/(BREAKTHROUGH_CAMERA.verticalSpan*c.depth));
 const kick=view.feel.reducedMotion?0:view.kick;
 c.ox=width*.5-c.x*c.scale+Math.sin(view.clock*113)*kick;
 c.oy=height*.66-c.y*c.scale*c.depth+Math.cos(view.clock*97)*kick*.6;
 return c;
}
export function projectBreakthroughPoint(c,x,y){return {x:c.ox+x*c.scale,y:c.oy+y*c.scale*c.depth};}
