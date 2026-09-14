import * as THREE from 'three';
import {FORMS,formStats} from './forms.js';
const V=THREE.Vector3;
const Y=new V(0,1,0);

// Level-one tuning, kept as a named export for tests and tooling.
export const FORM_COMBAT=Object.freeze(Object.fromEntries(Object.keys(FORMS).map(id=>[id,Object.freeze(formStats(id,1))])));

export function segmentDistance(a,b,p){const d=b.clone().sub(a).setY(0),length=d.lengthSq();const t=length?THREE.MathUtils.clamp(p.clone().sub(a).setY(0).dot(d)/length,0,1):0;return a.clone().addScaledVector(d,t).setY(0).distanceTo(p.clone().setY(0));}
const flat=(a,b)=>Math.hypot(a.x-b.x,a.z-b.z);
const bossReach=(e,normal,boss)=>e.type==='warden'?boss:normal;
const immovable=e=>e.type==='warden'||e.type==='turret';

// One selected weapon owns its shape and cadence. Laws add bounded support on hit.
// Options: player, enemies(), hit(e,damage,meta), blocked(a,b), boundary(a,b,dir), constrain(pos,r), vfx, enemyShots().
export function createFormCombat(scene,{player,enemies,hit,blocked,boundary,constrain,vfx,enemyShots=()=>[]}){
 const fx=Object.fromEntries(['muzzle','pulse','burst','trail','arc','reflect','split'].map(name=>[name,(...args)=>vfx?.[name]?.(...args)]));
 const group=new THREE.Group();scene.add(group);
 const material=(color,emissive,intensity,extra={})=>new THREE.MeshStandardMaterial({color,emissive,emissiveIntensity:intensity,roughness:.3,...extra});
 const mats={
  ice:material(0xbbeeff,0x6fbdde,.4),core:material(0xd799ec,0xa04fd2,.8),blade:material(0xb5f2d4,0x58bb97,.5,{metalness:.25,side:THREE.DoubleSide}),
  prism:material(0xc8f4ff,0x73dfff,1.1,{metalness:.2}),bloom:material(0xd9fbff,0x9af0ff,1),storm:material(0xfff1b0,0xffdc73,1.6),
  tide:material(0x8f6cc0,0xda9aff,.9),seed:material(0xffc9a0,0xff947b,1),mirror:material(0xe8fbff,0x73dfff,.8,{metalness:.6,side:THREE.DoubleSide})
 };
 const geos={
  collapse:new THREE.IcosahedronGeometry(.28,1),blade:new THREE.TorusGeometry(.46,.085,5,18,Math.PI*1.55),satellite:new THREE.OctahedronGeometry(.24),
  shard:new THREE.OctahedronGeometry(.2),bloom:new THREE.DodecahedronGeometry(.3),orb:new THREE.IcosahedronGeometry(.2,0),
  vortex:new THREE.TorusGeometry(.42,.09,6,20),seed:new THREE.SphereGeometry(.11,6,4),mirror:new THREE.PlaneGeometry(.55,.75),mirrorBolt:new THREE.OctahedronGeometry(.16)
 };
 const orbit=new THREE.Group();group.add(orbit);orbit.visible=false;
 let active=null,level=1,S=formStats(null),angle=0,pulseTimer=0,hits=0;
 let bolts=[],wells=[],shatters=[],cooldowns=new Map();

 function spawnMesh(geo,mat,pos,y=.7){const ob=new THREE.Mesh(geo,mat);ob.position.set(pos.x,y,pos.z);group.add(ob);return ob;}
 function remove(b){b.ob?.removeFromParent();}
 function rebuildOrbit(){
  for(const child of [...orbit.children])child.removeFromParent();
  const count=active==='frostguard'?S.satellites:active==='stormcrown'?S.orbs:active==='mirrorguard'?S.mirrors:0;
  const geo=active==='frostguard'?geos.satellite:active==='stormcrown'?geos.orb:geos.mirror;
  const mat=active==='frostguard'?mats.ice:active==='stormcrown'?mats.storm:mats.mirror;
  for(let i=0;i<count;i++){const ob=new THREE.Mesh(geo,mat);if(active==='frostguard')ob.scale.set(.55,1.7,1);orbit.add(ob);}
  orbit.visible=count>0;
 }
 function clear(){for(const b of bolts)remove(b);bolts=[];wells=[];shatters=[];cooldowns.clear();hits=0;active=null;level=1;S=formStats(null);angle=0;pulseTimer=0;rebuildOrbit();}
 function set(id,nextLevel=1){
  const L=Math.max(1,Math.floor(nextLevel||1));
  if(active!==id){clear();active=id;if(id==='frostguard')pulseTimer=formStats(id,L).novaEvery;}
  if(level!==L||S.damage===0){level=L;S=id?formStats(id,L):formStats(null);}
  rebuildOrbit();
 }
 function support(e,damage,metadata){if(e.dead)return false;if(hit(e,damage,metadata)===false)return false;hits++;return true;}
 const count=kind=>bolts.filter(b=>b.kind===kind).length;
 const nearestEnemy=(from,range,skip=new Set(),clearLine=false)=>{let best=null,bestDistance=range;for(const e of enemies()){if(e.dead||skip.has(e))continue;const d=flat(e.g.position,from);if(d<bestDistance&&(!clearLine||!blocked(from.clone().setY(0),e.g.position.clone().setY(0)))){best=e;bestDistance=d;}}return best;};

 function fire(pos,dir,target=null){
  if(!active||FORMS[active].passive)return Infinity;
  const aim=dir.clone().setY(0).normalize();
  switch(active){
   case 'collapse':{
    if(count('collapse')>=S.bolts)return S.interval;
    bolts.push({kind:'collapse',ob:spawnMesh(geos.collapse,mats.core,pos),dir:aim,age:0,life:3});
    fx.muzzle(pos,aim,'gravity');return S.interval;
   }
   case 'returnblade':{
    if(count('returnblade')>=S.bolts)return S.interval;
    const ob=spawnMesh(geos.blade,mats.blade,pos);ob.rotation.x=-Math.PI/2;
    bolts.push({kind:'returnblade',ob,dir:aim,age:0,returning:false,hitSet:new Set(),life:3});
    fx.muzzle(pos,aim,'recall');return S.interval;
   }
   case 'prism':{
    if(count('prism')>=S.shards)return S.interval;
    bolts.push({kind:'prism',ob:spawnMesh(geos.shard,mats.prism,pos),dir:aim,gen:0,life:2.2,passed:new Set()});
    fx.muzzle(pos,aim,'reflect');return S.interval;
   }
   case 'thunderlance':{lance(pos,aim);return S.interval;}
   case 'frostbloom':{
    if(count('frostbloom')>=S.bombs)return S.interval;
    const to=target?new V(target.x,0,target.z):pos.clone().addScaledVector(aim,6);
    const offset=to.clone().sub(pos).setY(0);if(offset.length()>S.range)offset.setLength(S.range);
    bolts.push({kind:'frostbloom',ob:spawnMesh(geos.bloom,mats.bloom,pos),from:pos.clone().setY(0),to:pos.clone().setY(0).add(offset),t:0,life:5});
    fx.muzzle(pos,aim,'frost');return S.interval;
   }
   case 'tidepull':{
    if(count('tidepull')>=S.vortices)return S.interval;
    const ob=spawnMesh(geos.vortex,mats.tide,pos);ob.rotation.x=-Math.PI/2;
    bolts.push({kind:'tidepull',ob,dir:aim,age:0,returning:false,tick:0,life:4});
    fx.muzzle(pos,aim,'gravity');return S.interval;
   }
   case 'seedstorm':{
    for(let i=0;i<S.seeds&&count('seedstorm')<40;i++){
     const spread=S.seeds===1?0:-S.spread+2*S.spread*i/(S.seeds-1);
     bolts.push({kind:'seedstorm',ob:spawnMesh(geos.seed,mats.seed,pos),dir:aim.clone().applyAxisAngle(Y,spread),life:S.life});
    }
    fx.split(pos,aim,Math.min(5,S.seeds));return S.interval;
   }
  }
  return Infinity;
 }

 // Hitscan: a straight bolt that stops at cover or the room edge, pierces a line, then jumps.
 function lance(pos,dir){
  const start=pos.clone().setY(0),end=start.clone();
  for(let travelled=0;travelled<S.length;travelled+=.4){
   const next=end.clone().addScaledVector(dir,.4),probe=dir.clone();
   if(blocked(end,next)||boundary(end.clone(),next,probe))break;
   end.copy(next);
  }
  const line=enemies().filter(e=>!e.dead&&segmentDistance(start,end,e.g.position)<bossReach(e,.75,1.2))
   .sort((a,b)=>a.g.position.clone().sub(start).dot(dir)-b.g.position.clone().sub(start).dot(dir));
  const struck=[];
  for(const e of line){
   if(struck.length>=S.pierce)break;
   if(!support(e,S.damage,{kind:'thunderlance',direction:dir.clone()})){end.copy(e.g.position).setY(0);break;}
   struck.push(e);
  }
  for(let d=0;d<flat(start,end);d+=1.4)fx.trail(start.clone().addScaledVector(dir,d).setY(.7),start.clone().addScaledVector(dir,Math.min(flat(start,end),d+1.4)).setY(.7),'chain',false);
  fx.pulse(end,'chain',.6,.2);
  for(let i=1;i<struck.length;i++)fx.arc(struck[i-1].g.position,struck[i].g.position);
  const touched=new Set(struck);let from=struck.at(-1);
  for(let j=0;from&&j<S.jumps;j++){
   // Lightning does not jump through walls either.
   const next=nearestEnemy(from.g.position,3.2,touched,true);if(!next)break;
   touched.add(next);fx.arc(from.g.position,next.g.position);
   support(next,S.jumpDamage,{kind:'thunderlance',indirect:true,direction:next.g.position.clone().sub(from.g.position).setY(0).normalize()});
   from=next;
  }
 }

 function plant(pos){if(wells.length>=S.wells)wells.shift();wells.push({pos:pos.clone(),life:.8,pulse:0});fx.pulse(pos,'gravity',S.radius,.8);}

 function updateOrbit(dt){
  if(!orbit.visible)return;
  const spin=active==='frostguard'?3.4:active==='stormcrown'?2.4:2.8;
  const radius=S.radius;
  angle+=dt*spin;
  orbit.children.forEach((ob,i)=>{
   const a=angle+i*Math.PI*2/orbit.children.length;
   ob.position.set(player.position.x+Math.cos(a)*radius,active==='stormcrown'?1.4:.72,player.position.z+Math.sin(a)*radius);
   ob.rotation.y=a;if(active==='frostguard')ob.rotation.z=a*.4;
   if(active==='frostguard'){
    // Satellites shatter any enemy shot they pass through, the warden's included.
    for(const q of enemyShots())if(q.life>0&&flat(q.ob.position,ob.position)<.6){q.life=0;q.struck=true;fx.burst(q.ob.position,'frost',8);}
    for(const e of enemies())if(!e.dead&&!cooldowns.has(e)&&flat(ob.position,e.g.position)<bossReach(e,.85,1.35)){
     cooldowns.set(e,S.cooldown);const direction=e.g.position.clone().sub(player.position).setY(0).normalize();
     if(support(e,S.damage,{kind:'frostguard',direction})){
      e.slow=Math.max(e.slow||0,S.slow);
      if(!immovable(e)&&!e.dead){e.g.position.addScaledVector(direction,.45);constrain(e.g.position,.65);}
      fx.pulse(e.g.position,'frost',.5,.25);
     }
    }
   }else if(active==='mirrorguard'){
    for(const q of enemyShots()){
     if(!(q.life>0)||flat(q.ob.position,ob.position)>=.65)continue;
     q.life=0;q.struck=true;
     const aimAt=nearestEnemy(ob.position,14);
     const dir=aimAt?aimAt.g.position.clone().sub(ob.position).setY(0).normalize():ob.position.clone().sub(player.position).setY(0).normalize();
     if(count('mirrorguard')<20)bolts.push({kind:'mirrorguard',ob:spawnMesh(geos.mirrorBolt,mats.mirror,ob.position),dir,life:1.6,damage:S.damage*(q.boss?1.5:1)});
     fx.reflect(ob.position,dir);
    }
    for(const e of enemies())if(!e.dead&&!cooldowns.has(e)&&flat(ob.position,e.g.position)<bossReach(e,.8,1.3)){
     cooldowns.set(e,.5);support(e,S.ram,{kind:'mirrorguard',indirect:true,direction:e.g.position.clone().sub(player.position).setY(0).normalize()});
    }
   }
  });
  if(active==='frostguard'){
   // A cold nova every few seconds gives the satellites real area damage.
   pulseTimer-=dt;if(pulseTimer>0)return;pulseTimer=S.novaEvery;
   fx.pulse(player.position,'frost',S.novaRadius,.45);fx.burst(player.position,'frost',26,1.6);
   for(const e of enemies())if(!e.dead&&flat(e.g.position,player.position)<S.novaRadius){
    if(support(e,S.nova,{kind:'frostguard',indirect:true,direction:e.g.position.clone().sub(player.position).setY(0).normalize()}))e.slow=Math.max(e.slow||0,2.5);
   }
   return;
  }
  if(active==='stormcrown'){
   pulseTimer-=dt;if(pulseTimer>0)return;pulseTimer=S.pulse;
   const zapped=new Set();
   for(const ob of orbit.children){
    let target=null,best=S.range;
    for(const e of enemies()){if(e.dead||zapped.has(e))continue;const d=flat(e.g.position,ob.position);if(d<best&&!blocked(ob.position.clone().setY(0),e.g.position.clone().setY(0))){target=e;best=d;}}
    if(!target)continue;
    zapped.add(target);fx.arc(ob.position,target.g.position);
    const direction=target.g.position.clone().sub(player.position).setY(0).normalize();
    if(support(target,S.damage,{kind:'stormcrown',indirect:true,direction})){
     const next=nearestEnemy(target.g.position,2.5,zapped,true);
     if(next){zapped.add(next);fx.arc(target.g.position,next.g.position);support(next,S.damage*.5,{kind:'stormcrown',indirect:true,direction});}
    }
   }
  }
 }

 function update(dt){
  for(const [e,t] of cooldowns){if(e.dead||t<=dt)cooldowns.delete(e);else cooldowns.set(e,t-dt);}
  updateOrbit(dt);
  for(const b of bolts){
   b.life-=dt;
   if(b.life<=0)continue;
   const previous=b.ob.position.clone();
   if(b.kind==='collapse'||b.kind==='returnblade'){
    b.age+=dt;
    if(b.kind==='returnblade'&&b.age>.65&&!b.returning){b.returning=true;b.hitSet.clear();fx.pulse(b.ob.position,'recall',.4,.2);}
    if(b.returning){b.dir.copy(player.position).sub(b.ob.position).setY(0).normalize();if(flat(b.ob.position,player.position)<.5)b.life=0;}
    if(b.life<=0)continue;
    const direction=b.dir.clone().setY(0).normalize();
    b.ob.position.addScaledVector(b.dir,dt*(b.kind==='collapse'?7.2:b.returning?12:10));b.ob.rotation.y+=dt*9;
    const wall=boundary(previous,b.ob.position,b.dir)||blocked(previous,b.ob.position);
    if(b.kind==='collapse'){
     const contact=enemies().some(e=>!e.dead&&segmentDistance(previous,b.ob.position,e.g.position)<bossReach(e,.7,1.1));
     if(wall||contact||b.age>=.65){if(wall)b.ob.position.copy(previous);plant(b.ob.position);b.life=0;}
    }else{
     if(wall){b.ob.position.copy(previous);if(!b.returning){b.returning=true;b.hitSet.clear();}else b.life=0;}
     // Resolve in travel order so an intercepting shield cannot be processed
     // after an enemy behind it merely because of spawn-array order.
     if(b.life>0){
      const targets=enemies().filter(e=>!e.dead&&!b.hitSet.has(e)&&segmentDistance(previous,b.ob.position,e.g.position)<bossReach(e,.72,1.25));
      targets.sort((x,y)=>x.g.position.clone().sub(previous).dot(direction)-y.g.position.clone().sub(previous).dot(direction));
      for(const e of targets){
       if(e.dead)continue;
       if(b.hitSet.size>=S.hitsPerLeg)break;
       b.hitSet.add(e);
       if(!support(e,S.damage,{kind:'returnblade',direction:direction.clone()})){b.life=0;break;}
      }
     }
    }
    fx.trail(previous,b.ob.position,b.kind==='collapse'?'gravity':'recall',false);
    continue;
   }
   if(b.kind==='prism'){
    b.ob.position.addScaledVector(b.dir,dt*S.speed);b.ob.rotation.y+=dt*12;
    const wall=boundary(previous,b.ob.position,b.dir);
    const cover=!wall&&blocked(previous,b.ob.position);
    if(cover){b.ob.position.copy(previous);b.dir.negate();}
    if(wall||cover){
     fx.reflect(b.ob.position,b.dir);
     if(b.gen<S.generations){
      b.life=0;
      for(const turn of [-.45,.45])if(count('prism')<S.shards)bolts.push({kind:'prism',ob:spawnMesh(geos.shard,mats.prism,b.ob.position),dir:b.dir.clone().applyAxisAngle(Y,turn),gen:b.gen+1,life:1.6,passed:new Set()});
      continue;
     }
     b.life=0;continue;
    }
    const direction=b.dir.clone();
    const e=enemies().find(x=>!x.dead&&!b.passed.has(x)&&segmentDistance(previous,b.ob.position,x.g.position)<bossReach(x,.7,1.2));
    if(e){
     const landed=support(e,S.damage*Math.pow(.7,b.gen),{kind:'prism',direction});
     // The first shard passes through one enemy so it can still reach a wall and multiply.
     if(landed&&b.gen===0&&b.passed.size===0)b.passed.add(e);else b.life=0;
    }
    fx.trail(previous,b.ob.position,'reflect',b.gen>0);
    continue;
   }
   if(b.kind==='frostbloom'){
    b.t+=dt;const k=Math.min(1,b.t/S.flight);
    b.ob.position.lerpVectors(b.from,b.to,k).setY(.7+Math.sin(Math.PI*k)*2.2);b.ob.rotation.y+=dt*6;
    if(k<1)continue;
    b.life=0;fx.pulse(b.to,'frost',S.radius,.5);fx.burst(b.to,'frost',24,1.4);
    const chilled=new Set();
    for(const e of enemies())if(!e.dead&&flat(e.g.position,b.to)<S.radius){
     if(support(e,S.damage,{kind:'frostbloom',indirect:true,direction:e.g.position.clone().sub(b.to).setY(0).normalize()})){e.slow=Math.max(e.slow||0,2.2);chilled.add(e);}
    }
    if(shatters.length>=4)shatters.shift();
    shatters.push({pos:b.to.clone(),delay:S.delay,targets:chilled});
    continue;
   }
   if(b.kind==='tidepull'){
    b.age+=dt;
    if(b.age>.7&&!b.returning)b.returning=true;
    if(b.returning){
     b.dir.copy(player.position).sub(b.ob.position).setY(0).normalize();
     if(flat(b.ob.position,player.position)<.8){
      b.life=0;fx.pulse(b.ob.position,'gravity',S.radius,.4);fx.burst(b.ob.position,'burst',28,1.6);
      for(const e of enemies())if(!e.dead&&flat(e.g.position,b.ob.position)<S.radius)support(e,S.damage,{kind:'tidepull',indirect:true,direction:e.g.position.clone().sub(b.ob.position).setY(0).normalize()});
      continue;
     }
    }
    b.ob.position.addScaledVector(b.dir,dt*(b.returning?7:9));b.ob.rotation.z+=dt*8;
    if(boundary(previous,b.ob.position,b.dir)||blocked(previous,b.ob.position)){b.ob.position.copy(previous);b.returning=true;}
    for(const e of enemies()){
     if(e.dead||immovable(e))continue;
     const pull=b.ob.position.clone().sub(e.g.position).setY(0),d=pull.length();
     if(d<S.radius&&d>.05){e.g.position.addScaledVector(pull.normalize(),Math.min(d,dt*6));constrain(e.g.position,.65);}
    }
    b.tick-=dt;
    if(b.tick<=0){
     b.tick=.25;fx.pulse(b.ob.position,'gravity',S.radius*.6,.2);
     for(const e of enemies())if(!e.dead&&flat(e.g.position,b.ob.position)<S.radius)support(e,S.tick,{kind:'tidepull',indirect:true,direction:b.dir.clone()});
    }
    continue;
   }
   if(b.kind==='seedstorm'||b.kind==='mirrorguard'){
    const seed=b.kind==='seedstorm';
    b.ob.position.addScaledVector(b.dir,dt*(seed?13:14));
    if(boundary(previous,b.ob.position,b.dir.clone())||blocked(previous,b.ob.position)){b.life=0;continue;}
    const e=enemies().find(x=>!x.dead&&segmentDistance(previous,b.ob.position,x.g.position)<bossReach(x,seed?.6:.7,1.2));
    if(e){
     b.life=0;
     if(support(e,seed?S.damage:b.damage,{kind:b.kind,direction:b.dir.clone()})&&seed){
      fx.pulse(e.g.position,'burst',.5,.2);
      for(const other of enemies())if(other!==e&&!other.dead&&flat(other.g.position,e.g.position)<1.1)support(other,S.pop,{kind:'seedstorm',indirect:true,direction:b.dir.clone()});
     }
    }
    fx.trail(previous,b.ob.position,seed?'split':'reflect',seed);
   }
  }
  for(let i=bolts.length-1;i>=0;i--)if(bolts[i].life<=0){remove(bolts[i]);bolts.splice(i,1);}
  for(let i=shatters.length-1;i>=0;i--){
   const s=shatters[i];s.delay-=dt;if(s.delay>0)continue;
   fx.burst(s.pos,'frost',30,1.8);
   for(const e of s.targets)if(!e.dead&&flat(e.g.position,s.pos)<S.radius+.5)support(e,S.shatter,{kind:'frostbloom',indirect:true,direction:e.g.position.clone().sub(s.pos).setY(0).normalize()});
   shatters.splice(i,1);
  }
  for(let i=wells.length-1;i>=0;i--){const w=wells[i];w.life-=dt;w.pulse-=dt;
   if(w.pulse<=0){fx.pulse(w.pos,'gravity',Math.max(.3,w.life*3),.2);w.pulse=.16;}
   for(const e of enemies())if(!e.dead&&!immovable(e)){const d=w.pos.clone().sub(e.g.position).setY(0);if(d.length()<S.radius){e.g.position.addScaledVector(d,dt*2);constrain(e.g.position,.65);}}
   if(w.life<=0){fx.burst(w.pos,'burst',32,1.8);fx.pulse(w.pos,'burst',S.radius,.4);for(const e of enemies())if(!e.dead&&flat(e.g.position,w.pos)<S.radius)support(e,S.damage,{kind:'collapse',direction:e.g.position.clone().sub(w.pos).setY(0).normalize()});wells.splice(i,1);}
  }
 }

 return {set,fire,update,clear,
  state:()=>({active,level,bolts:bolts.length,wells:wells.length,shatters:shatters.length,orbit:orbit.visible?orbit.children.length:0,hits}),
  dispose(){clear();for(const g of Object.values(geos))g.dispose();for(const m of Object.values(mats))m.dispose();group.removeFromParent();}};
}
