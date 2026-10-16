// Journey Act5 keeps dodge-and-shoot at its centre. A finite adapter adds
// single, committed shots to the existing heart-directed night actors; the
// shared Survival/Defense siege AI and all checkpoint data stay unchanged.
export const JOURNEY_SIEGE_SKIRMISH=Object.freeze({warning:.85,aimPeriod:1.35,firstAim:1.1,shotGap:.9,recovery:.22,minRange:3.4,maxRange:7.2,speed:5,range:7.4,muzzleOffset:1.05,maxOriginDrift:.2,maxTells:2,projectileCap:48});
const point=p=>Number.isFinite(p?.x)&&Number.isFinite(p?.z);
function slot(){
 const origin={x:0,z:0},aim={x:1,z:0};
 return {actor:null,phase:'idle',timer:0,origin,aim,tell:{kind:'shot',position:origin,direction:aim,length:JOURNEY_SIEGE_SKIRMISH.range,width:.18,remaining:0},bolt:{position:origin,dir:aim,spec:{speed:JOURNEY_SIEGE_SKIRMISH.speed,life:(JOURNEY_SIEGE_SKIRMISH.range-JOURNEY_SIEGE_SKIRMISH.muzzleOffset)/JOURNEY_SIEGE_SKIRMISH.speed,damage:7,boss:false,committedLane:true}}};
}
export function createJourneySiegeSkirmish(){return {siege:null,room:-1,clock:0,nextAim:JOURNEY_SIEGE_SKIRMISH.firstAim,lastShot:-Infinity,cursor:0,slots:Array.from({length:JOURNEY_SIEGE_SKIRMISH.maxTells},slot),out:{tells:[],bolts:[],started:false}};}
function clear(s){for(const q of s.slots){q.actor=null;q.phase='idle';q.timer=0;}}
const living=e=>e?.expansionActor===true&&!e.expansionBoss&&!e.siegeGuard&&!e.dead&&e.hp>0&&!(e.frostLock>0)&&point(e.g?.position)&&e.expansionThreat?.hp>0;
export function journeySiegeSkirmishAim(s,actor){if(s&&living(actor))for(const q of s.slots)if(q.actor===actor&&q.phase!=='idle')return q.aim;return null;}
export const journeySiegeSkirmishHolds=(s,actor)=>!!journeySiegeSkirmishAim(s,actor);
export function stepJourneySiegeSkirmish(s,dt,{journey,actors=[],player,projectiles=0,enabled=true,canAim=null}={}){
 const o=s.out;o.tells.length=o.bolts.length=0;o.started=false;
 const siege=journey?.siege;
 if(!enabled||journey?.act!=='crystalGorge'||journey.phase!=='course'||siege?.phase!=='defense'||!(siege.core?.hp>0)||!point(player)){
  clear(s);s.siege=null;s.clock=0;s.nextAim=JOURNEY_SIEGE_SKIRMISH.firstAim;s.lastShot=-Infinity;return o;
 }
 if(s.siege!==siege||s.room!==siege.room){clear(s);s.siege=siege;s.room=siege.room;s.clock=0;s.cursor=0;s.nextAim=JOURNEY_SIEGE_SKIRMISH.firstAim;s.lastShot=-Infinity;}
 const d=Number.isFinite(dt)?Math.max(0,Math.min(.1,dt)):0;if(!d)return o;s.clock+=d;
 for(const q of s.slots){
  if(!q.actor)continue;
  // Knockback/gravity may move an actor after its warning. Interrupt that
  // attack rather than fire from an empty origin or silently move the line.
  if(!living(q.actor)||!actors.includes(q.actor)||Math.hypot(q.actor.g.position.x-q.origin.x,q.actor.g.position.z-q.origin.z)>JOURNEY_SIEGE_SKIRMISH.maxOriginDrift){q.actor=null;q.phase='idle';continue;}
  q.timer=Math.max(0,q.timer-d);
  if(q.phase==='aim'){
   q.tell.remaining=q.timer;o.tells.push(q.tell);
   if(q.timer>1e-8)continue;
   // Saturation cancels this warned attack; never queue a surprise catch-up.
   if(projectiles+o.bolts.length<JOURNEY_SIEGE_SKIRMISH.projectileCap&&s.clock-s.lastShot+1e-8>=JOURNEY_SIEGE_SKIRMISH.shotGap){o.bolts.push(q.bolt);s.lastShot=s.clock;}
   q.phase='recover';q.timer=JOURNEY_SIEGE_SKIRMISH.recovery;
  }else if(q.timer<=0){q.actor=null;q.phase='idle';}
 }
 if(s.clock+1e-8<s.nextAim)return o;
 s.nextAim=s.clock+JOURNEY_SIEGE_SKIRMISH.aimPeriod;
 if(projectiles>=JOURNEY_SIEGE_SKIRMISH.projectileCap)return o;
 let free=null;for(const q of s.slots)if(q.actor===null){free=q;break;}if(!free)return o;
 for(let i=0;i<actors.length;i++){
  const index=(s.cursor+i)%actors.length,e=actors[index];if(!living(e)||e.expansionThreat.phase!=='approach'||journeySiegeSkirmishHolds(s,e))continue;
  const p=e.g.position,dx=player.x-p.x,dz=player.z-p.z,range=Math.hypot(dx,dz);
  // Stay inside the fitted heart arena, away from point-blank and edge shots.
  if(range<JOURNEY_SIEGE_SKIRMISH.minRange||range>JOURNEY_SIEGE_SKIRMISH.maxRange||Math.abs(p.x)>7||Math.abs(p.z)>6||canAim&&!canAim(e,player))continue;
  free.actor=e;free.phase='aim';free.timer=JOURNEY_SIEGE_SKIRMISH.warning;free.origin.x=p.x;free.origin.z=p.z;free.aim.x=dx/range;free.aim.z=dz/range;
  free.bolt.spec.damage=Math.max(7,Math.min(11,Number(e.expansionThreat.damage)||7));free.tell.remaining=free.timer;o.tells.push(free.tell);o.started=true;s.cursor=index+1;break;
 }
 return o;
}
