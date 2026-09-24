import * as THREE from 'three';
import {FINAL_BRANCH_PATTERNS} from './final-branch-patterns.js';

const V=THREE.Vector3,Y=new V(0,1,0);
const BOSSES=new Set(['warden','austin','act2warden','alwaysbeginner','act3warden','tempestcarrier','mirrorseed']);
const distance=(a,b)=>Math.hypot(a.x-b.x,a.z-b.z);
const point=(p)=>new V(p.x,0,p.z);

// Lightweight authored layer over a first fusion. No per-projectile mesh or
// material allocation: the parent owns the visible shot, this layer draws its
// distinct path and contact effects through the existing pooled VFX system.
export function createFinalBranchCombat({player,enemies,nearby=null,deal,boundary,reflector,blocked,constrain,fx,sound=()=>{}}){
 let spec=null,clock=0,ready=0,beat=0,lastImpactSound=-Infinity,shots=[],events=[],fields=[],marks=new WeakMap(),level=1,baseDamage=1,passive=false,baseId=null;
 const IMPACT_SOUND={reflect:'reflect',split:'split',chain:'chain',orbit:'hit',pierce:'pierceHit',burst:'burstHit',recall:'hit',gravity:'gravityHit',frost:'frostHit'};
 const nearbyEnemies=(p,r)=>nearby?nearby(p,r,[]):enemies();
 const targets=(p,r)=>nearbyEnemies(p,r+1).filter(e=>!e.dead&&distance(e.g.position,p)<r+(BOSSES.has(e.type)?.45:0));
 const nearest=(p,r=10,skip=null)=>{let best=null,d=r;for(const e of nearbyEnemies(p,r+1)){if(e.dead||(skip instanceof Set?skip.has(e):e===skip))continue;const q=distance(e.g.position,p);if(q<d){d=q;best=e;}}return best;};
 const power=(factor=1)=>Math.max(1,baseDamage*(spec?.power||0)*factor);
 const harm=(e,amount,from,phase='final')=>{
  const landed=deal(e,amount,{kind:baseId,finalLaw:spec.law,indirect:true,phase,direction:point(e.g.position).sub(from).normalize()});
  // One audible contact per short cluster. A dense branch can hit many targets
  // in one frame; spawning a voice for each target would punish mobile CPUs.
  if(landed&&clock-lastImpactSound>=.22){sound(IMPACT_SOUND[spec.law]||'hit');lastImpactSound=clock;}
  return landed;
 };
 const tell=(p,scale=.45)=>{fx.pulse?.(p,spec.law,scale,.22);};
 const flash=(p,scale=.7)=>{fx.burst?.(p,spec.law,Math.min(18,Math.round(7+scale*4)),scale);};
 const blast=(p,r=spec.radius,factor=1,{slow=false,pull=false}={})=>{
  fx.explosion?.(p,spec.law,Math.max(.6,r*.6),r>1.6);tell(p,r*.55);
  for(const e of targets(p,r)){
   if(harm(e,power(factor),p)&&slow&&!BOSSES.has(e.type))e.slow=Math.max(e.slow||0,1.1);
   if(pull&&!BOSSES.has(e.type)&&e.type!=='turret'){
    const v=point(p).sub(e.g.position),d=v.length();if(d>.45){e.g.position.addScaledVector(v.normalize(),Math.min(.7,d-.45));constrain?.(e.g.position,.65);}
   }
  }
 };
 const schedule=(delay,action,pos,extra={})=>{if(events.length<24)events.push({at:clock+delay,action,pos:point(pos),...extra});};
 const makeField=(p,{duration=1.5,radius=spec.radius,interval=.38,slow=false,pull=false,move=null}={})=>{
  if(fields.length>=8)fields.shift();fields.push({pos:point(p),life:duration,tick:0,radius,interval,slow,pull,move});tell(p,radius*.55);
 };
 const shot=(pos,dir,{mode=spec.motion,life=1.5,speed=12,bounces=0,arc=0,returning=false,powerScale=1}={})=>{
  if(shots.length>=20)return;
  shots.push({pos:point(pos),old:point(pos),dir:point(dir).normalize(),start:point(pos),life,speed,mode,bounces,arc,age:0,trailClock:0,returning,powerScale,hitSet:new Set(),waypoints:[]});
 };
 const fan=(pos,dir,count=3,mode='fan')=>{for(let i=0;i<count;i++)shot(pos,point(dir).applyAxisAngle(Y,(i-(count-1)/2)*.28),{mode,life:1.15,speed:12,powerScale:1/count*1.6});};
 const line=(a,b,width=.65,factor=1,slow=false,pull=false)=>{
  fx.lance?.(a,b,spec.law);fx.trail?.(a,b,spec.law,true);
  const dx=b.x-a.x,dz=b.z-a.z,len=dx*dx+dz*dz;
  for(const e of nearbyEnemies(a,13)){
   if(e.dead)continue;const t=len?Math.max(0,Math.min(1,((e.g.position.x-a.x)*dx+(e.g.position.z-a.z)*dz)/len)):0;
   const x=a.x+dx*t-e.g.position.x,z=a.z+dz*t-e.g.position.z;
   if(x*x+z*z>(width+(BOSSES.has(e.type)?.45:0))**2)continue;
   if(harm(e,power(factor),a)&&slow&&!BOSSES.has(e.type))e.slow=Math.max(e.slow||0,1.1);
   if(pull&&!BOSSES.has(e.type)&&e.type!=='turret'){e.g.position.x+=x*.13;e.g.position.z+=z*.13;constrain?.(e.g.position,.65);}
  }
 };
 const relay=(start,{jumps=2,delay=spec.tempo,radius=spec.radius,branch=false}={})=>{
  const seen=new Set([start]);let from=start;
  for(let i=0;i<jumps;i++){
   const next=nearest(from.g.position,Math.max(3.2,radius*2.2),seen);if(!next)break;
   seen.add(next);schedule(delay*(i+1),'relay',next.g.position,{from:point(from.g.position),target:next,terminal:i===jumps-1});
   if(branch&&i===0){const fork=nearest(from.g.position,Math.max(3.2,radius*2.2),seen);if(fork)schedule(delay*1.5,'relay',fork.g.position,{from:point(from.g.position),target:fork,terminal:true});}
   from=next;
  }
 };
 function set(id,damage,nextLevel=1,isPassive=false,nextBaseId=null){
  if(spec?.id===id&&level===Math.max(1,nextLevel)&&baseDamage===Math.max(1,damage||1)&&passive===isPassive&&baseId===nextBaseId)return;
  spec=FINAL_BRANCH_PATTERNS[id]||null;clock=0;ready=0;beat=0;lastImpactSound=-Infinity;shots=[];events=[];fields=[];marks=new WeakMap();
  level=Math.max(1,nextLevel);baseDamage=Math.max(1,damage||1);passive=isPassive;baseId=nextBaseId;
 }
 function onFire(pos,dir,target=null){
  if(!spec||clock<ready||spec.motion==='mark'||spec.motion==='relay'||spec.motion==='satellite')return;
  ready=clock+Math.max(.25,spec.tempo);const p=point(pos),d=point(dir).normalize(),t=target?point(target):p.clone().addScaledVector(d,5);
  switch(spec.motion){
   case 'mortar':{
    const where=spec.variation==='converging'?t.clone().addScaledVector(d,-.7):t;
    tell(where,.8);schedule(spec.tempo,'blast',where,{radius:spec.radius});break;
   }
   case 'sweep':{
    const end=p.clone().addScaledVector(d,9);
    line(p,end,spec.radius*.48,.7,spec.law==='frost',spec.law==='gravity');
    if(spec.variation==='side-pressure')for(const side of [-1,1]){const offset=d.clone().applyAxisAngle(Y,side*Math.PI/2).multiplyScalar(.8);schedule(.16,'blast',end.clone().add(offset),{radius:spec.radius*.85,factor:.55});}
    if(spec.variation==='deep-ice-vein')makeField(p.clone().lerp(end,.52),{duration:1.05,radius:spec.radius*.9,slow:true});
    break;
   }
   case 'fan':{
    const n=spec.variation==='parallel-lances'?3:spec.variation==='needle-scatter'?5:4;
    const origin=spec.variation==='tangent-release'?p.clone().addScaledVector(d.clone().applyAxisAngle(Y,Math.PI/2),1.3):p;
    if(spec.variation==='separate-long-paths')for(let i=0;i<n;i++)shot(origin,d.clone().applyAxisAngle(Y,(i-(n-1)/2)*.28),{mode:spec.variation,life:2.4,speed:11,bounces:3,powerScale:1/n*1.6});
    else fan(origin,d,n,spec.variation);
    fx.split?.(origin,d,n);break;
   }
   case 'return':shot(p,d,{mode:spec.variation,life:2.4,speed:spec.variation==='accelerating-home'?8:11});break;
   case 'ricochet':shot(p,d,{mode:spec.variation,life:2,bounces:spec.variation==='long-angles'?4:3});break;
   case 'spiral':shot(p,d,{mode:spec.variation,life:1.9,arc:spec.variation==='inward-return'?.8:.5});break;
   case 'field':makeField(t,{duration:1.5,radius:spec.radius,slow:spec.law==='frost',pull:spec.law==='gravity',move:spec.variation==='line-corridor'?d:null});break;
  }
 }
 function onHit(e,metadata={}){
  if(!spec||clock<ready)return;
  const p=point(e.g.position);
  switch(spec.motion){
   case 'mark':{
    if((marks.get(e)||0)>clock)return;marks.set(e,clock+Math.max(.6,spec.tempo*1.6));ready=clock+spec.tempo;
    tell(p,spec.radius*.35);
    if(spec.variation==='synchronized'||spec.variation==='synchronized-freeze'){
     for(const other of targets(p,spec.radius*2).slice(0,4)){marks.set(other,clock+spec.tempo);tell(other.g.position,.5);schedule(spec.tempo,'blast',other.g.position,{radius:spec.radius*.7,factor:.55,slow:spec.law==='frost'});}
     if(spec.variation==='synchronized-freeze')for(const other of targets(p,spec.radius*2).slice(0,4))if(!BOSSES.has(other.type))other.slow=Math.max(other.slow||0,1.1);
    }else if(spec.variation==='return-seal')schedule(spec.tempo,'seal',p,{target:e,radius:spec.radius});
    else if(spec.variation==='crystal-reflector')schedule(spec.tempo,'crystal',p,{target:e,radius:spec.radius});
    else if(spec.variation==='freeze-then-crack'){if(!BOSSES.has(e.type))e.slow=Math.max(e.slow||0,1.15);schedule(spec.tempo,'blast',p,{radius:spec.radius,slow:true});}
    else schedule(spec.tempo,'blast',p,{radius:spec.radius,pull:spec.law==='gravity'});
    break;
   }
   case 'relay':{
    ready=clock+Math.max(.24,spec.tempo*2.4);
    relay(e,{jumps:spec.variation==='forked-branches'?3:2,branch:spec.variation==='forked-branches'});
    if(spec.variation==='closed-circuit')schedule(spec.tempo*3,'relay',p,{from:p.clone().add(new V(.6,0,0)),target:e,terminal:true});
    break;
   }
   case 'field':{
    ready=clock+Math.max(.5,spec.tempo*1.6);
    const place=spec.variation==='triangle-center'?p.clone().lerp(player.position,.3):p;
    makeField(place,{duration:spec.variation==='thin-road'?2.5:1.6,radius:spec.radius,slow:spec.law==='frost',pull:spec.law==='gravity'});
    if(spec.variation==='scattered-fields')for(const side of [-1,1])makeField(place.clone().add(new V(side*2,0,.6)),{duration:1.2,radius:spec.radius*.7,pull:true});
    break;
   }
   case 'fan':{
    if(!['late-piercing-fan','distributed-conductors'].includes(spec.variation))return;
    ready=clock+spec.tempo;
    fan(p,point(e.g.position).sub(player.position).normalize(),3,spec.variation);break;
   }
  }
 }
 function onOpening(pos,dir){
  if(!spec)return;
  const p=point(pos),d=point(dir).normalize();
  // Every completed branch has a signature opening in its own motion family.
  sound(IMPACT_SOUND[spec.law]||'hit');lastImpactSound=clock;
  fx.pulse?.(p,spec.law,Math.min(4,spec.radius+1),.45);
  if(spec.motion==='satellite'){for(let i=0;i<4;i++){const a=i*Math.PI/2;const at=p.clone().add(new V(Math.cos(a)*spec.radius,0,Math.sin(a)*spec.radius));schedule(i*.11,'blast',at,{radius:spec.radius*.7,factor:.6,slow:spec.law==='frost',pull:spec.law==='gravity'});}return;}
  if(spec.motion==='relay'){for(const e of targets(p,9).slice(0,spec.id.startsWith('final-frostnet')?5:3))relay(e,{jumps:2,delay:.12,branch:spec.variation==='forked-branches'});return;}
  if(spec.motion==='field'){for(const a of spec.id==='final-gravitymirror-gravity'?[-.45,.45]:[-.55,0,.55])makeField(p.clone().addScaledVector(d.clone().applyAxisAngle(Y,a),3),{duration:1.8,radius:spec.radius,slow:spec.law==='frost',pull:spec.law==='gravity'});return;}
  if(spec.motion==='mark'){for(const e of targets(p,9).slice(0,spec.id==='final-frostnet-frost'?6:4))schedule(.3,'blast',e.g.position,{radius:spec.radius,factor:spec.id==='final-frostnet-frost'?1.1:.8,slow:spec.law==='frost',pull:spec.law==='gravity'});return;}
  for(const a of spec.id==='final-gravitymirror-reflect'?[-.35,.35]:[-.48,0,.48]){ready=0;onFire(p,d.clone().applyAxisAngle(Y,a),p.clone().addScaledVector(d.clone().applyAxisAngle(Y,a),5));}
 }
 function update(dt){
  if(!spec||!(dt>0))return;clock+=dt;
  if(spec.motion==='satellite'||passive&&['mortar','field'].includes(spec.motion)){
   beat-=dt;if(beat<=0){beat=Math.max(.34,spec.tempo);const seed=point(player.position),e=nearest(seed,8);if(e){
    if(spec.motion==='satellite'){
     const step=Math.floor(clock/beat),direction=spec.variation==='fold-reverse'?(step%4<2?1:-1):spec.variation==='counter-rings'?-1:1;
     const a=clock*1.8*direction+step*Math.PI*.7;
     const r=spec.variation==='breathing-ring'?spec.radius*(.7+.3*Math.sin(clock*3)):spec.radius;
     const at=seed.add(new V(Math.cos(a)*r,0,Math.sin(a)*r));blast(at,Math.min(1.1,spec.radius*.55),.6,{slow:spec.law==='frost',pull:spec.law==='gravity'});
     if(spec.variation==='long-sweep')line(at,point(e.g.position),.42,.24);
     if(spec.variation==='rotating-relay'){fx.arc?.(at,e.g.position);harm(e,power(.2),at);}
     if(spec.variation==='binary-alternate'){const opposite=point(player.position).add(new V(-Math.cos(a)*r,0,-Math.sin(a)*r));tell(opposite,.28);}
     if(spec.variation==='open-band'&&!BOSSES.has(e.type))e.slow=Math.max(e.slow||0,.35);
    }else onFire(seed,point(e.g.position).sub(seed),e.g.position);
   }}
  }
  for(let i=events.length-1;i>=0;i--){const ev=events[i];if(ev.at>clock)continue;events.splice(i,1);
   if(ev.action==='relay'&&ev.target&&!ev.target.dead){fx.arc?.(ev.from,ev.target.g.position);harm(ev.target,power(ev.terminal?1.15:.85),ev.from);if(spec.variation==='walking-well')makeField(ev.target.g.position,{duration:.55,radius:spec.radius,pull:true});if(spec.variation==='terminal-crystal'&&ev.terminal)blast(ev.target.g.position,spec.radius*.85,.5,{slow:true});}
   else if(ev.action==='seal'&&ev.target&&!ev.target.dead){blast(ev.target.g.position,ev.radius,1,{slow:true});}
   else if(ev.action==='crystal'&&ev.target&&!ev.target.dead){tell(ev.target.g.position,ev.radius);blast(ev.target.g.position,ev.radius,.7,{slow:true});}
   else if(ev.action==='blast')blast(ev.pos,ev.radius??spec.radius,ev.factor??1,{slow:ev.slow,pull:ev.pull});
  }
  for(let i=fields.length-1;i>=0;i--){const f=fields[i];f.life-=dt;f.tick-=dt;if(f.move)f.pos.addScaledVector(f.move,dt*.85);
   if(f.tick<=0){f.tick=f.interval;blast(f.pos,f.radius,.36,{slow:f.slow,pull:f.pull});}
   if(f.life<=0)fields.splice(i,1);
  }
  for(let i=shots.length-1;i>=0;i--){const s=shots[i];s.life-=dt;s.age+=dt;const old=s.old.copy(s.pos);
   if(s.mode==='inward-return'||s.mode==='direct-home'||s.mode==='reverse-waypoints'||s.mode==='straight-two-pass'||s.mode==='separate-home-routes'||s.mode==='merge-on-return'||s.mode==='stepping-stones'||s.mode==='trailing-rime'||s.mode==='return-seal'||s.mode==='home-finish'||s.mode==='two-beats'||s.mode==='accelerating-home'){
    if(!s.returning&&s.age>.55){s.returning=true;s.hitSet.clear();if(s.mode==='two-beats')blast(s.pos,spec.radius,.6);}
    if(s.returning){const home=point(player.position);s.dir.copy(home).sub(s.pos).normalize();if(s.mode==='accelerating-home')s.speed=Math.min(19,s.speed+dt*9);if(distance(s.pos,home)<.6){if(s.mode==='home-finish'||s.mode==='merge-on-return')blast(home,spec.radius,1.25);s.life=0;}}
   }
   if(s.mode==='drilling-head'||s.mode==='converging-shards')s.dir.applyAxisAngle(Y,Math.sin(s.age*9)*s.arc*dt);
   if(s.mode==='inward-return'&&s.returning)s.dir.applyAxisAngle(Y,s.arc*dt*3);
   s.pos.addScaledVector(s.dir,dt*s.speed);
   const reflected=reflector?.(old,s.pos,s.dir)||boundary?.(old,s.pos,s.dir);
   const cover=!reflected&&blocked?.(old,s.pos);
   if(cover)s.dir.negate();
   const wall=reflected||cover;
   if(wall){if(s.bounces>0){s.bounces--;s.pos.copy(old);fx.reflect?.(s.pos,s.dir);if(s.mode==='each-bounce'||s.mode==='gravity-footprints'||s.mode==='frost-stamps')blast(s.pos,spec.radius*.65,.5,{slow:spec.law==='frost',pull:spec.law==='gravity'});}else{s.life=0;if(s.mode==='finish')blast(old,spec.radius,1.2);}}
   s.trailClock-=dt;
   if(s.trailClock<=0){
    if(s.mode==='post-bounce-lance'){
     const tail=s.pos.clone().addScaledVector(s.dir,-.85);
     fx.lance?.(tail,s.pos,'spearring',wall);
    }else fx.trail?.(old,s.pos,spec.law,s.returning||s.bounces>0);
    s.trailClock=s.mode==='post-bounce-lance'?.12:.08;
   }
   for(const e of nearbyEnemies(s.pos,1.8))if(!e.dead&&!s.hitSet.has(e)&&distance(s.pos,e.g.position)<(BOSSES.has(e.type)?1.1:.65)){
    s.hitSet.add(e);harm(e,power(s.powerScale),old);
    if(s.mode==='bounce-relay')relay(e,{jumps:1,delay:.12});
    if(s.mode==='two-beats'&&s.returning)blast(e.g.position,spec.radius*.8,.6);
    if(s.mode==='trailing-rime'&&!BOSSES.has(e.type))e.slow=Math.max(e.slow||0,1.1);
    if(['long-angles','post-bounce-lance','parallel-lances','straight-two-pass'].includes(s.mode))continue;
    if(s.mode==='separate-long-paths'&&s.bounces>0)continue;
    s.life=0;break;
   }
   if(s.life<=0){if(s.mode==='finish')blast(s.pos,spec.radius,1.1);shots.splice(i,1);}
  }
 }
 return {set,onFire,onHit,onOpening,update,clear:()=>set(null,1),state:()=>({id:spec?.id||null,shots:shots.length,events:events.length,fields:fields.length})};
}
