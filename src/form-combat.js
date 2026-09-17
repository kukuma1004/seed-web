import * as THREE from 'three';
import {ALL_FORMS,GENERATED_FORMS,SECOND_FORMS,AWAKEN,AWAKEN_FORMS,TWIN_FORMS,awakenOpeningEvery,awakenSurgeOpening,formStats} from './forms.js';
import {createFormVisuals} from './form-visuals.js';

// Ordinary prism is allowed to grow as it finds walls. Infinite Prism already
// adds another generation, a larger shard pool and a permanent damage boost,
// so its child shards conserve the parent's damage instead of multiplying it
// by 1.4 on every split (two children at 70% each).
export const PRISM_CHILD_FALLOFF=Object.freeze({base:.7,infinite:.5});
import {normalizeTheme,themeColor} from './themes.js';
const V=THREE.Vector3;
const Y=new V(0,1,0);

// Level-one tuning, kept as a named export for tests and tooling.
export const FORM_COMBAT=Object.freeze(Object.fromEntries(Object.keys(ALL_FORMS).map(id=>[id,Object.freeze(formStats(id,1))])));
export const ORBIT_VISUALS=Object.freeze({
 frostguard:Object.freeze({geometry:'satellite',material:'ice',motion:'snowflake'}),
 stormcrown:Object.freeze({geometry:'orb',material:'storm',motion:'crown'}),
 mirrorguard:Object.freeze({geometry:'mirror',material:'mirror',motion:'shield-wall'}),
 starring:Object.freeze({geometry:'starPetal',material:'star',motion:'breathing-star'})
});

// Orbit paths are intentionally different silhouettes. They are also pure so
// gameplay collision and the visual pose always use the same position.
export function orbitPose(id,index,count,angle,time,S){
 const a=angle+index*Math.PI*2/Math.max(1,count),wave=Math.sin(time*4+index*Math.PI*2/Math.max(1,count));
 if(id==='frostguard'){
  const radius=S.radius*(index%2?.9:1.08);
  return {x:Math.cos(a)*radius,y:.66+wave*.1,z:Math.sin(a)*radius,pitch:-1.02,yaw:Math.PI/2-a,roll:(index%2?-1:1)*(.3+wave*.06),scale:[1.1,1.48,1.1]};
 }
 if(id==='stormcrown'){
  return {x:Math.cos(a)*S.radius*1.08,y:1.35+wave*.2,z:Math.sin(a)*S.radius*.72,pitch:wave*.12,yaw:-a+time*.8,roll:.18*wave,scale:[2.05,2.05,2.05]};
 }
 if(id==='mirrorguard'){
  const square=t=>Math.sign(t)*Math.pow(Math.abs(t),.68);
  return {x:square(Math.cos(a))*S.radius,y:.76+wave*.045,z:square(Math.sin(a))*S.radius,pitch:-.38,yaw:Math.PI/2-a,roll:wave*.06,scale:[1.32,1.32,1.32]};
 }
 const radius=S.inner+(S.outer-S.inner)*(.5-.5*Math.cos(time*Math.PI*2/S.period));
 return {x:Math.cos(a)*radius,y:.64+(index%2?.13:0)+wave*.055,z:Math.sin(a)*radius,pitch:-1.02,yaw:-a-time*.9,roll:wave*.12,scale:[1.55,1.55,1.55]};
}

export function segmentDistance(a,b,p){const d=b.clone().sub(a).setY(0),length=d.lengthSq();const t=length?THREE.MathUtils.clamp(p.clone().sub(a).setY(0).dot(d)/length,0,1):0;return a.clone().addScaledVector(d,t).setY(0).distanceTo(p.clone().setY(0));}
const flat=(a,b)=>Math.hypot(a.x-b.x,a.z-b.z);
const bossReach=(e,normal,boss)=>e.type==='warden'||e.type==='austin'?boss:normal;
const immovable=e=>e.type==='warden'||e.type==='austin'||e.type==='turret';

// One selected weapon owns its shape and cadence. Laws add bounded support on hit.
// Options: player, enemies(), hit(e,damage,meta), blocked(a,b), boundary(a,b,dir), constrain(pos,r), vfx, sound(id), enemyShots().
export function createFormCombat(scene,{player,enemies,hit,blocked,boundary,constrain,vfx,sound=()=>{},enemyShots=()=>[],theme='botanical'}){
 const fx=Object.fromEntries(['muzzle','pulse','burst','flame','explosion','trail','arc','reflect','split','portal'].map(name=>[name,(...args)=>vfx?.[name]?.(...args)]));
 const group=new THREE.Group();scene.add(group);
 const {mats,geos}=createFormVisuals();
 const awakenedMats=new Map();
 const originalMats=new Map(Object.entries(mats).map(([name,material])=>[name,{material,color:material.color?.clone(),emissive:material.emissive?.clone()}]));
 let themeId=normalizeTheme(theme);
 const orbit=new THREE.Group();group.add(orbit);orbit.visible=false;
 // active is the attack being fought with (a fusion id for an awakened evolution); statId is the evolution held.
 let twin=false,ownerId=null,active=null,statId=null,level=1,S=formStats(null),angle=0,pulseTimer=0,hits=0,surgeTime=0,breathe=0,awakenTimer=0,secondHits=0,secondPhase=0,markClock=0,secondMarks=new WeakMap();
 let bolts=[],wells=[],shatters=[],embers=[],cooldowns=new Map();
 const refresh=()=>{S=active?formStats(statId,level,{surge:surgeTime>0,twin}):formStats(null);};
 const awakened=()=>Boolean(active&&(AWAKEN_FORMS[statId]||twin));

 function applyTheme(){
  for(const [name,base] of originalMats){
   const {material,color,emissive}=base;if(color)material.color.copy(color);if(emissive)material.emissive.copy(emissive);
   if(themeId!=='botanical'){
    if(color)material.color.setHex(themeColor(themeId,`form:${name}:core`,color.getHex()));
    if(emissive)material.emissive.setHex(themeColor(themeId,`form:${name}:glow`,emissive.getHex()));
   }
   const gold=awakenedMats.get(material);if(gold){if(gold.color&&material.color)gold.color.copy(material.color);if(gold.emissive)gold.emissive.setHex(themeId==='botanical'?0xffb84f:themeColor(themeId,`form:${name}:awaken`,0xffb84f));}
  }
 }
 function setTheme(id){themeId=normalizeTheme(id);applyTheme();rebuildOrbit();return themeId;}

 function combatMaterial(mat){
  if(!awakened())return mat;
  if(!awakenedMats.has(mat)){const gold=mat.clone();if(gold.emissive){gold.emissive.setHex(0xffb84f);gold.emissiveIntensity=Math.max(.38,gold.emissiveIntensity||0);}gold.roughness=Math.max(.18,(gold.roughness??.5)*.72);awakenedMats.set(mat,gold);}
  return awakenedMats.get(mat);
 }
 function spawnMesh(geo,mat,pos,y=.7){const ob=new THREE.Mesh(geo,combatMaterial(mat));ob.position.set(pos.x,y,pos.z);ob.userData.awakened=awakened();group.add(ob);return ob;}
 function remove(b){b.ob?.removeFromParent();}
 function rebuildOrbit(){
  for(const child of [...orbit.children])child.removeFromParent();
  const count=active==='frostguard'?S.satellites:active==='stormcrown'?S.orbs:active==='mirrorguard'?S.mirrors:active==='starring'?S.petals:0;
  const style=ORBIT_VISUALS[active];
  if(!style){orbit.visible=false;return;}
  for(let i=0;i<count;i++)orbit.add(new THREE.Mesh(geos[style.geometry],combatMaterial(mats[style.material])));
  orbit.visible=count>0;
 }
 function clear(){for(const b of bolts)remove(b);bolts=[];wells=[];shatters=[];embers=[];cooldowns.clear();hits=0;secondHits=0;secondPhase=0;markClock=0;secondMarks=new WeakMap();active=null;statId=null;ownerId=null;twin=false;awakenTimer=0;level=1;surgeTime=0;breathe=0;S=formStats(null);angle=0;pulseTimer=0;rebuildOrbit();}
 // opts.twin: this combat is one attack of a twin awakening (TWIN.damage, self-repeating opening move starting after opts.openingDelay).
 function set(id,nextLevel=1,opts={}){
  // Given a twin's own id, one combat fights with the twin's first attack (the game runs one combat per attack).
  if(TWIN_FORMS[id])return set(TWIN_FORMS[id].parts[0],nextLevel,{...opts,twin:true});
  const L=Math.max(1,Math.floor(nextLevel||1));
  const kind=AWAKEN_FORMS[id]?.base||id;
  const asTwin=Boolean(opts.twin);
  if(statId!==id||twin!==asTwin){clear();active=kind;statId=id;ownerId=opts.twinId||id;twin=asTwin;if(kind==='frostguard')pulseTimer=formStats(id,L).novaEvery;if(AWAKEN_FORMS[id]||twin)awakenTimer=opts.openingDelay??(id==='bigcrunch'?4:2);S.damage=0;}
  if(level!==L||S.damage===0){level=L;refresh();}
  rebuildOrbit();
 }
 function support(e,damage,metadata){if(e.dead)return false;if(hit(e,damage,{...metadata,evolution:ownerId||statId,awakened:awakened()})===false)return false;hits++;return true;}
 const count=kind=>bolts.filter(b=>b.kind===kind).length;
 const nearestEnemy=(from,range,skip=new Set(),clearLine=false)=>{let best=null,bestDistance=range;for(const e of enemies()){if(e.dead||skip.has(e))continue;const d=flat(e.g.position,from);if(d<bestDistance&&(!clearLine||!blocked(from.clone().setY(0),e.g.position.clone().setY(0)))){best=e;bestDistance=d;}}return best;};

 // force: an active's opening move may go past the usual on-screen caps (still bounded by its own loop).
 function fire(pos,dir,target=null,force=false){
  if(!active||ALL_FORMS[active].passive)return Infinity;
  const aim=dir.clone().setY(0).normalize();
  const full=(kind,cap)=>!force&&count(kind)>=cap;
  if(GENERATED_FORMS[active]||SECOND_FORMS[active]||active==='riftseed'){
   if(full('gene',S.bolts))return S.interval;
   const second=SECOND_FORMS[active],secondRole=second?.family==='convergence'?(secondPhase++%2?'consume':'mark'):null;
   const laws=[...(secondRole==='consume'?S.followUpLaws:S.primaryLaws||S.laws||ALL_FORMS[active].requires)],ob=spawnMesh(geos.gene,mats.gene,pos);ob.rotation.x=-Math.PI/2;ob.rotation.y=Math.atan2(aim.x,aim.z);
   if(themeId==='void')ob.scale.set(.82,1.22,.82);else if(themeId==='cyber')ob.scale.set(.7,.7,1.45);else if(themeId==='celestial')ob.scale.set(1.2,.8,1.2);
   // A second fusion alternates two inherited law packets, so its projectile
   // traits follow the packet being fired. Existing gene attacks keep their
   // authored stat sheet (notably riftseed's two-target pierce).
   const bounces=second?(laws.includes('reflect')?Math.max(2,S.bounces||0):0):(S.bounces||0);
   const pierce=second?(laws.includes('pierce')?Math.max(2,S.pierce||1):1):(S.pierce||1);
   const split=second?(laws.includes('split')?Math.max(2,S.split||0):0):(S.split||0);
   const portalDistance=second?(laws.includes('portal')?Math.max(3.2,S.portalDistance||0):0):(S.portalDistance||0);
   bolts.push({kind:'gene',form:active,laws,secondRole,ob,dir:aim,age:0,life:S.life,passed:new Set(),bounces,pierce,split,portalDistance,portaled:false,returning:false,fragment:false});
   fx.muzzle(pos,aim,laws[0]||'portal');return S.interval;
  }
  switch(active){
   case 'collapse':{
    if(full('collapse',S.bolts))return S.interval;
    bolts.push({kind:'collapse',ob:spawnMesh(geos.collapse,mats.core,pos),dir:aim,age:0,life:3});
    fx.muzzle(pos,aim,'gravity');return S.interval;
   }
   case 'returnblade':{
    if(full('returnblade',S.bolts))return S.interval;
    const ob=spawnMesh(geos.blade,mats.blade,pos);ob.rotation.x=-Math.PI/2;
    bolts.push({kind:'returnblade',ob,dir:aim,age:0,returning:false,hitSet:new Set(),life:3});
    fx.muzzle(pos,aim,'recall');return S.interval;
   }
   case 'prism':{
    if(full('prism',S.shards))return S.interval;
    bolts.push({kind:'prism',ob:spawnMesh(geos.shard,mats.prism,pos),dir:aim,gen:0,life:2.2,passed:new Set()});
    fx.muzzle(pos,aim,'reflect');return S.interval;
   }
   case 'thunderlance':{lance(pos,aim);return S.interval;}
   case 'frostbloom':{
    if(full('frostbloom',S.bombs))return S.interval;
    const to=target?new V(target.x,0,target.z):pos.clone().addScaledVector(aim,6);
    const offset=to.clone().sub(pos).setY(0);if(offset.length()>S.range)offset.setLength(S.range);
    bolts.push({kind:'frostbloom',ob:spawnMesh(geos.bloom,mats.bloom,pos),from:pos.clone().setY(0),to:pos.clone().setY(0).add(offset),t:0,life:5});
    fx.muzzle(pos,aim,'frost');return S.interval;
   }
   case 'tidepull':{
    if(full('tidepull',S.vortices))return S.interval;
    const ob=spawnMesh(geos.tide,mats.tide,pos);ob.rotation.x=-Math.PI/2;ob.scale.set(1.25,.82,1);
    bolts.push({kind:'tidepull',ob,dir:aim,age:0,returning:false,anchored:false,hold:S.hold,tick:0,returnHits:new Set(),life:4});
    fx.muzzle(pos,aim,'gravity');return S.interval;
   }
   case 'mirrormaze':{
    if(full('mirrormaze',S.bolts))return S.interval;
    bolts.push({kind:'mirrormaze',ob:spawnMesh(geos.shard,mats.mirror,pos),dir:aim,bounces:0,speed:S.speed,life:3.2,passed:new Set()});
    fx.muzzle(pos,aim,'reflect');return S.interval;
   }
   case 'fullbloom':{
    if(full('fullbloom',S.bolts))return S.interval;
    bolts.push({kind:'fullbloom',ob:spawnMesh(geos.bloom,mats.seed,pos),dir:aim,gen:0,life:1.4});
    fx.muzzle(pos,aim,'split');return S.interval;
   }
   case 'thunderweb':{web(pos);return S.interval;}
   case 'glassspear':{spear(pos,aim);return S.interval;}
   case 'flarebloom':{
    if(full('flarebloom',S.bombs))return S.interval;
    const to=target?new V(target.x,0,target.z):pos.clone().addScaledVector(aim,6);
    const offset=to.clone().sub(pos).setY(0);if(offset.length()>S.range)offset.setLength(S.range);
    bolts.push({kind:'flarebloom',ob:spawnMesh(geos.bloom,mats.storm,pos),from:pos.clone().setY(0),to:pos.clone().setY(0).add(offset),t:0,life:5});
    fx.muzzle(pos,aim,'burst');return S.interval;
   }
   case 'rewind':{
    if(full('rewind',S.leaves))return S.interval;
    const ob=spawnMesh(geos.blade,mats.blade,pos);ob.scale.setScalar(.72);ob.rotation.x=-Math.PI/2;
    bolts.push({kind:'rewind',ob,dir:aim.clone(),out:aim.clone(),age:0,returning:false,trips:S.trips,hitSet:new Set(),life:8});
    fx.muzzle(pos,aim,'recall');return S.interval;
   }
   case 'blackhole':{
    if(full('blackhole',S.holes))return S.interval;
    const to=target?new V(target.x,0,target.z):pos.clone().addScaledVector(aim,5);
    const offset=to.clone().sub(pos).setY(0);if(offset.length()>S.range)offset.setLength(S.range);
    const ob=spawnMesh(geos.vortex,mats.core,pos);ob.rotation.x=-Math.PI/2;
    bolts.push({kind:'blackhole',ob,from:pos.clone().setY(0),to:pos.clone().setY(0).add(offset),t:0,hold:S.hold,tick:0,life:S.hold+2});
    fx.muzzle(pos,aim,'gravity');return S.interval;
   }
   case 'winterbreath':{breath(pos,aim,S.cone);return S.interval;}
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

 // Chain lightning that starts at the nearest visible enemy and hops, weaker with every hop.
 function web(pos,first=null){
  let from=first||nearestEnemy(pos,S.reach,new Set(),true);if(!from)return;
  const touched=new Set([from]);let damage=S.damage;
  fx.arc(pos.clone().setY(.9),from.g.position);
  support(from,damage,{kind:'thunderweb',indirect:true,direction:from.g.position.clone().sub(pos).setY(0).normalize()});
  for(let j=0;j<S.jumps;j++){
   const next=nearestEnemy(from.g.position,S.range,touched,true);if(!next)break;
   touched.add(next);damage*=S.decay;fx.arc(from.g.position,next.g.position);
   support(next,damage,{kind:'thunderweb',indirect:true,direction:next.g.position.clone().sub(from.g.position).setY(0).normalize()});
   from=next;
  }
 }
 // A long hitscan needle: every enemy it passes makes the next one hurt more.
 function spear(pos,dir){
  const start=pos.clone().setY(0),end=start.clone();
  for(let travelled=0;travelled<S.length;travelled+=.4){
   const next=end.clone().addScaledVector(dir,.4),probe=dir.clone();
   if(blocked(end,next)||boundary(end.clone(),next,probe))break;
   end.copy(next);
  }
  const line=enemies().filter(e=>!e.dead&&segmentDistance(start,end,e.g.position)<bossReach(e,.7,1.2))
   .sort((a,b)=>a.g.position.clone().sub(start).dot(dir)-b.g.position.clone().sub(start).dot(dir));
  let struck=0;
  for(const e of line){
   if(struck>=S.pierce)break;
   if(!support(e,S.damage*(1+S.ramp*struck),{kind:'glassspear',direction:dir.clone()})){end.copy(e.g.position).setY(0);break;}
   struck++;
  }
  for(let d=0;d<flat(start,end);d+=1.6)fx.trail(start.clone().addScaledVector(dir,d).setY(.7),start.clone().addScaledVector(dir,Math.min(flat(start,end),d+1.6)).setY(.7),'pierce',false);
  fx.pulse(end,'pierce',.5,.2);
 }
 // Frost in a cone in front of the seed (cone = half angle; PI is all around). Slowed enemies take more.
 function breath(pos,dir,cone){
  const origin=pos.clone().setY(0),spread=Math.min(cone,Math.PI);
  for(let i=0;i<7;i++){const d=dir.clone().applyAxisAngle(Y,(i/6-.5)*2*spread);fx.trail(origin.clone().setY(.6),origin.clone().addScaledVector(d,S.range*.85).setY(.6),'frost',true);}
  fx.burst(origin.clone().addScaledVector(dir,1.1),'frost',12,1.1);
  for(const e of enemies()){
   if(e.dead)continue;
   const off=e.g.position.clone().sub(origin).setY(0),d=off.length();
   if(d>S.range+bossReach(e,0,.6))continue;
   if(d>.05&&Math.acos(THREE.MathUtils.clamp(off.clone().normalize().dot(dir),-1,1))>spread)continue;
   if(blocked(origin,e.g.position.clone().setY(0)))continue;
   const frozen=(e.slow||0)>0;
   if(support(e,S.damage*(frozen?S.frozenBonus:1),{kind:'winterbreath',indirect:true,direction:d>.05?off.normalize():dir.clone()}))e.slow=Math.max(e.slow||0,S.slow);
  }
 }

 function plant(pos){if(wells.length>=S.wells)wells.shift();wells.push({pos:pos.clone(),life:.8,pulse:0});fx.flame(pos,'gravity',18,S.radius*.42);fx.burst(pos,'gravity',24,S.radius*.34);}

 function updateOrbit(dt){
  if(!orbit.visible)return;
  const spin=active==='frostguard'?3.4:active==='stormcrown'?2.4:active==='starring'?2.2:2.8;
  breathe+=dt;
  angle+=dt*spin;
  orbit.children.forEach((ob,i)=>{
   const pose=orbitPose(active,i,orbit.children.length,angle,breathe,S);
   ob.position.set(player.position.x+pose.x,pose.y,player.position.z+pose.z);
   ob.rotation.set(pose.pitch,pose.yaw,pose.roll);ob.scale.set(...pose.scale);
   if(active==='frostguard'){
    // Satellites shatter ordinary enemy shots; the warden's shots pass through every orbit.
    for(const q of enemyShots())if(q.life>0&&!q.boss&&flat(q.ob.position,ob.position)<.6){q.life=0;q.struck=true;fx.burst(q.ob.position,'frost',8);}
    for(const e of enemies())if(!e.dead&&!cooldowns.has(e)&&flat(ob.position,e.g.position)<bossReach(e,.85,1.35)){
     cooldowns.set(e,S.cooldown);const direction=e.g.position.clone().sub(player.position).setY(0).normalize();
     if(support(e,S.damage,{kind:'frostguard',direction})){
      e.slow=Math.max(e.slow||0,S.slow);
      if(!immovable(e)&&!e.dead){e.g.position.addScaledVector(direction,.45);constrain(e.g.position,.65);}
      fx.pulse(e.g.position,'frost',.5,.25);
     }
    }
   }else if(active==='starring'){
    for(const q of enemyShots())if(q.life>0&&!q.boss&&flat(q.ob.position,ob.position)<.6){q.life=0;q.struck=true;fx.burst(q.ob.position,'orbit',8);}
    for(const e of enemies())if(!e.dead&&!cooldowns.has(e)&&flat(ob.position,e.g.position)<bossReach(e,.8,1.3)){
     cooldowns.set(e,S.cooldown);support(e,S.damage,{kind:'starring',indirect:true,direction:e.g.position.clone().sub(player.position).setY(0).normalize()});fx.pulse(e.g.position,'orbit',.45,.2);
    }
   }else if(active==='mirrorguard'){
    for(const q of enemyShots()){
     if(!(q.life>0)||q.boss||flat(q.ob.position,ob.position)>=.65)continue;
     q.life=0;q.struck=true;
     const aimAt=nearestEnemy(ob.position,14);
     const dir=aimAt?aimAt.g.position.clone().sub(ob.position).setY(0).normalize():ob.position.clone().sub(player.position).setY(0).normalize();
     if(count('mirrorguard')<20)bolts.push({kind:'mirrorguard',ob:spawnMesh(geos.mirrorBolt,mats.mirror,ob.position),dir,life:1.6,damage:S.damage});
     fx.reflect(ob.position,dir);
    }
    for(const e of enemies())if(!e.dead&&!cooldowns.has(e)&&flat(ob.position,e.g.position)<bossReach(e,.8,1.3)){
     cooldowns.set(e,.5);support(e,S.ram,{kind:'mirrorguard',indirect:true,direction:e.g.position.clone().sub(player.position).setY(0).normalize()});
    }
   }
  });
  if(active==='mirrorguard'&&S.surge){
   // Mirror fortress: while the active runs, every mirror also throws a splinter at the nearest enemy twice a second.
   pulseTimer-=dt;if(pulseTimer>0)return;pulseTimer=.8;
   for(const ob of orbit.children){
    const aimAt=nearestEnemy(ob.position,12,new Set(),true);if(!aimAt||count('mirrorguard')>=30)continue;
    const dir=aimAt.g.position.clone().sub(ob.position).setY(0).normalize();
    bolts.push({kind:'mirrorguard',ob:spawnMesh(geos.mirrorBolt,mats.mirror,ob.position),dir,life:1.6,damage:S.damage});fx.reflect(ob.position,dir);
   }
   return;
  }
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
  markClock+=dt;
  if(surgeTime>0){surgeTime-=dt;if(surgeTime<=0)calm();}
  if(awakened())awakenOpening(dt);
  for(const [e,t] of cooldowns){if(e.dead||t<=dt)cooldowns.delete(e);else cooldowns.set(e,t-dt);}
  updateOrbit(dt);
  for(const b of bolts){
   b.life-=dt;
   if(b.life<=0)continue;
   const previous=b.ob.position.clone();
   if(b.kind==='gene'){
    b.age+=dt;
    if(!b.returning&&b.laws.includes('recall')&&b.age>.72){b.returning=true;b.passed.clear();fx.pulse(b.ob.position,'recall',.45,.2);}
    if(b.returning){b.dir.copy(player.position).sub(b.ob.position).setY(0).normalize();if(flat(b.ob.position,player.position)<.55){b.life=0;continue;}}
    // A portal only opens where the whole straight segment is free. It cannot
    // skip arena walls or cover, which keeps the hop readable and fair.
    if(!b.portaled&&!b.returning&&b.laws.includes('portal')&&b.age>.16){
     const entry=b.ob.position.clone(),exit=entry.clone();let travelled=0;
     while(travelled+0.4<=b.portalDistance){const next=exit.clone().addScaledVector(b.dir,.4),probe=b.dir.clone();if(blocked(exit,next)||boundary(exit.clone(),next,probe))break;exit.copy(next);travelled+=.4;}
     if(travelled>=.8){b.ob.position.copy(exit);fx.portal(entry,exit);sound('portal');b.portaled=true;b.age+=.05;}
     else b.portaled=true;
    }
    const beforeMove=b.ob.position.clone();b.ob.position.addScaledVector(b.dir,dt*S.speed);b.ob.rotation.y+=dt*11;
    const probe=b.dir.clone(),wall=boundary(beforeMove,b.ob.position,probe),cover=!wall&&blocked(beforeMove,b.ob.position);
    if(wall)b.dir.copy(probe);
    if(cover){b.ob.position.copy(beforeMove);b.dir.negate();}
    if(wall||cover){if(b.bounces>0&&!b.returning){b.bounces--;b.passed.clear();fx.reflect(b.ob.position,b.dir);sound('reflect');}else if(b.laws.includes('recall')&&!b.returning){b.returning=true;b.passed.clear();}else b.life=0;}
    if(b.life<=0)continue;
    const direction=b.dir.clone(),targets=enemies().filter(e=>!e.dead&&!b.passed.has(e)&&segmentDistance(beforeMove,b.ob.position,e.g.position)<bossReach(e,.68,1.15));
    targets.sort((x,y)=>x.g.position.clone().sub(beforeMove).dot(direction)-y.g.position.clone().sub(beforeMove).dot(direction));
    for(const e of targets){
     b.passed.add(e);
     const landed=support(e,S.damage*(b.fragment?.48:1),{kind:b.form,direction:direction.clone(),comboLaws:b.laws,generated:true,indirect:b.fragment});
     if(!landed){b.life=0;break;}
     const second=SECOND_FORMS[b.form];
     if(second&&!b.fragment){
      if(second.family==='resonance'&&++secondHits%3===0){const resonant=(Math.floor(secondHits/3)%2?S.primaryLaws:S.followUpLaws)||b.laws;fx.pulse(e.g.position,second.sharedLaw||'awaken',1.15,.28);fx.burst(e.g.position,second.sharedLaw||'awaken',12,.75);sound(second.sharedLaw==='portal'?'portal':'fusion');support(e,S.damage*S.followUpScale,{kind:b.form,direction:direction.clone(),comboLaws:resonant,generated:true,indirect:true,resonance:true});}
      else if(second.family==='convergence'&&b.secondRole==='mark'){secondMarks.set(e,markClock+S.markWindow);fx.pulse(e.g.position,b.laws[0],.62,.24);}
      else if(second.family==='convergence'&&b.secondRole==='consume'){const expires=secondMarks.get(e)||0;if(expires>=markClock){secondMarks.delete(e);fx.explosion(e.g.position,S.followUpLaws.includes('burst')?'burst':S.followUpLaws[0],1.05);sound(S.followUpLaws.includes('portal')?'portal':'fusion');support(e,S.damage*S.followUpScale,{kind:b.form,direction:direction.clone(),comboLaws:S.followUpLaws,generated:true,indirect:true,convergence:true});}}
     }
     if(!b.fragment&&b.split>0){fx.split(e.g.position,direction,Math.min(5,b.split));sound('split');for(let i=0;i<b.split&&count('gene')<36;i++){const d=direction.clone().applyAxisAngle(Y,(i-(b.split-1)/2)*.34),ob=spawnMesh(geos.gene,mats.gene,e.g.position);ob.scale.setScalar(.65);bolts.push({kind:'gene',form:b.form,laws:b.laws.filter(id=>id!=='split'),secondRole:null,ob,dir:d,age:0,life:.55,passed:new Set([e]),bounces:0,pierce:1,split:0,portalDistance:0,portaled:true,returning:false,fragment:true});}}
     b.pierce--;if(b.pierce<=0){b.life=0;break;}
    }
    fx.trail(previous,b.ob.position,b.laws.includes('portal')?'portal':b.laws[0],b.fragment);continue;
   }
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
     const falloff=statId==='infiniteprism'?PRISM_CHILD_FALLOFF.infinite:PRISM_CHILD_FALLOFF.base;
     const landed=support(e,S.damage*Math.pow(falloff,b.gen),{kind:'prism',direction});
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
    if(b.age>.7&&!b.anchored){
     b.anchored=true;b.hold=S.hold;b.dir.set(0,0,0);
     fx.flame(b.ob.position,'gravity',15,S.radius*.38);fx.burst(b.ob.position,'gravity',24,1.35);
     for(const e of enemies())if(!e.dead&&flat(e.g.position,b.ob.position)<S.radius){support(e,S.damage,{kind:'tidepull',phase:'turn',indirect:true,direction:e.g.position.clone().sub(b.ob.position).setY(0).normalize()});e.slow=Math.max(e.slow||0,S.slow);}
    }
    if(b.anchored&&!b.returning){b.hold-=dt;if(b.hold<=0){b.returning=true;fx.pulse(b.ob.position,'recall',S.radius*.75,.28);}}
    if(b.returning){
     b.dir.copy(player.position).sub(b.ob.position).setY(0).normalize();
     if(flat(b.ob.position,player.position)<.8){
      b.life=0;fx.pulse(b.ob.position,'gravity',S.safeRadius,.32);fx.burst(b.ob.position,'gravity',14,1);
      continue;
     }
    }
    if(!b.anchored||b.returning)b.ob.position.addScaledVector(b.dir,dt*(b.returning?8:9));b.ob.rotation.z+=dt*(b.anchored&&!b.returning?13:8);
    if(!b.anchored||b.returning)fx.trail(previous,b.ob.position,b.returning?'recall':'gravity',false);
    if(!b.anchored&&(boundary(previous,b.ob.position,b.dir)||blocked(previous,b.ob.position))){b.ob.position.copy(previous);b.age=.71;}
    for(const e of enemies()){
     if(e.dead)continue;
     if(b.returning&&!b.returnHits.has(e)&&flat(e.g.position,b.ob.position)<S.radius){b.returnHits.add(e);support(e,S.returnDamage,{kind:'tidepull',phase:'return',indirect:true,direction:b.dir.clone()});}
     if(immovable(e))continue;
     const pull=b.ob.position.clone().sub(e.g.position).setY(0),d=pull.length();
     if(d<S.radius&&d>.05){
      const next=e.g.position.clone().addScaledVector(pull.normalize(),Math.min(d,dt*S.pull));
      const fromSeed=next.clone().sub(player.position).setY(0),seedDistance=fromSeed.length();
      if(seedDistance<S.safeRadius)next.copy(player.position).addScaledVector(fromSeed.lengthSq()?fromSeed.normalize():b.ob.position.clone().sub(player.position).setY(0).normalize(),S.safeRadius);
      e.g.position.copy(next);constrain(e.g.position,.65);e.slow=Math.max(e.slow||0,S.slow);
     }
    }
    b.tick-=dt;
    if(b.tick<=0){
     b.tick=.25;fx.pulse(b.ob.position,'gravity',S.radius*.6,.2);
     for(const e of enemies())if(!e.dead&&flat(e.g.position,b.ob.position)<S.radius){support(e,S.tick,{kind:'tidepull',phase:b.returning?'return-current':'outbound-current',indirect:true,direction:b.dir.clone()});e.slow=Math.max(e.slow||0,S.slow);}
    }
    continue;
   }
   if(b.kind==='mirrormaze'){
    b.ob.position.addScaledVector(b.dir,dt*b.speed);b.ob.rotation.y+=dt*10;
    const wall=boundary(previous,b.ob.position,b.dir);
    const cover=!wall&&blocked(previous,b.ob.position);
    if(cover){b.ob.position.copy(previous);b.dir.negate();}
    if(wall||cover){
     if(b.bounces>=S.bounces){b.life=0;continue;}
     b.bounces++;b.speed=Math.min(24,b.speed*1.08);b.passed.clear();fx.reflect(b.ob.position,b.dir);
    }
    const e=enemies().find(x=>!x.dead&&!b.passed.has(x)&&segmentDistance(previous,b.ob.position,x.g.position)<bossReach(x,.7,1.2));
    if(e){b.passed.add(e);if(!support(e,S.damage*(1+S.gain*b.bounces),{kind:'mirrormaze',direction:b.dir.clone()}))b.life=0;}
    fx.trail(previous,b.ob.position,'reflect',b.bounces>0);
    continue;
   }
   if(b.kind==='fullbloom'||b.kind==='petal'){
    const petalKind=b.kind==='petal';
    b.ob.position.addScaledVector(b.dir,dt*(petalKind?10:S.speed));b.ob.rotation.y+=dt*8;
    if(boundary(previous,b.ob.position,b.dir.clone())||blocked(previous,b.ob.position)){b.life=0;continue;}
    const e=enemies().find(x=>!x.dead&&x!==b.skip&&segmentDistance(previous,b.ob.position,x.g.position)<bossReach(x,.62,1.15));
    if(e){
     b.life=0;
     const landed=support(e,petalKind?S.petalDamage:S.damage,{kind:'fullbloom',indirect:petalKind,direction:b.dir.clone()});
     // The flower opens into a ring of petals; each petal opens once more into three smaller ones.
     if(landed&&b.gen<2){
      const n=b.gen===0?S.petals:3;fx.split(e.g.position,b.dir,Math.min(5,n));
      for(let i=0;i<n&&count('petal')<48;i++){
       const d=b.gen===0?b.dir.clone().applyAxisAngle(Y,i*Math.PI*2/n):b.dir.clone().applyAxisAngle(Y,(i-1)*.6);
       bolts.push({kind:'petal',ob:spawnMesh(geos.mirrorBolt,mats.seed,e.g.position),dir:d,gen:b.gen+1,skip:e,life:b.gen===0?.45:.3});
      }
     }
    }
    fx.trail(previous,b.ob.position,'split',petalKind);
    continue;
   }
   if(b.kind==='flarebloom'){
    b.t+=dt;const k=Math.min(1,b.t/S.flight);
    b.ob.position.lerpVectors(b.from,b.to,k).setY(.7+Math.sin(Math.PI*k)*2.4);b.ob.rotation.y+=dt*6;
    if(k<1)continue;
    b.life=0;fx.explosion(b.to,'burst',S.radius,true);
    for(const e of enemies())if(!e.dead&&flat(e.g.position,b.to)<S.radius+bossReach(e,0,.5))support(e,S.damage,{kind:'flarebloom',indirect:true,direction:e.g.position.clone().sub(b.to).setY(0).normalize()});
    // Embers land around the blast one after another, on a fixed spiral so replays are identical.
    for(let i=0;i<S.embers&&embers.length<24;i++){
     const a=i*2.39996+b.to.x,r=S.radius*(.55+.35*((i%3)/2));
     embers.push({pos:new V(b.to.x+Math.cos(a)*r,0,b.to.z+Math.sin(a)*r),delay:.22+i*.12});
    }
    continue;
   }
   if(b.kind==='rewind'){
    b.age+=dt;
    if(!b.returning&&b.age>.5){b.returning=true;b.hitSet.clear();}
    if(b.returning){
     b.dir.copy(player.position).sub(b.ob.position).setY(0).normalize();
     if(flat(b.ob.position,player.position)<.55){
      b.trips--;
      if(b.trips<=0){b.life=0;continue;}
      b.returning=false;b.age=0;b.hitSet.clear();b.dir.copy(b.out);fx.pulse(player.position,'recall',.5,.2);
     }
    }
    b.ob.position.addScaledVector(b.dir,dt*(b.returning?12:10));b.ob.rotation.z+=dt*10;
    // Going out it stops at walls; coming back it flies over them so it always finds the seed.
    if(!b.returning&&(boundary(previous,b.ob.position,b.dir.clone())||blocked(previous,b.ob.position))){b.ob.position.copy(previous);b.returning=true;b.hitSet.clear();}
    const direction=b.dir.clone();
    const targets=enemies().filter(e=>!e.dead&&!b.hitSet.has(e)&&segmentDistance(previous,b.ob.position,e.g.position)<bossReach(e,.7,1.2));
    targets.sort((x,y)=>x.g.position.clone().sub(previous).dot(direction)-y.g.position.clone().sub(previous).dot(direction));
    for(const e of targets){
     if(b.hitSet.size>=S.hitsPerLeg)break;
     b.hitSet.add(e);
     if(!support(e,S.damage,{kind:'rewind',direction:direction.clone()})){b.returning=true;break;}
    }
    fx.trail(previous,b.ob.position,'recall',true);
    continue;
   }
   if(b.kind==='blackhole'){
    if(b.t<.5){b.t+=dt;const k=Math.min(1,b.t/.5);b.ob.position.lerpVectors(b.from,b.to,k).setY(.6);if(k<1)continue;fx.pulse(b.to,'gravity',S.radius,.5);}
    b.hold-=dt;b.ob.rotation.z+=dt*10;b.ob.scale.setScalar(.85+.25*Math.sin(b.hold*12));
    for(const e of enemies()){
     if(e.dead||immovable(e))continue;
     const pull=b.to.clone().sub(e.g.position).setY(0),d=pull.length();
     if(d<S.radius&&d>.35){e.g.position.addScaledVector(pull.normalize(),Math.min(d-.35,dt*S.pull));constrain(e.g.position,.65);}
    }
    b.tick-=dt;
    if(b.tick<=0){
     b.tick=.25;fx.pulse(b.to,'gravity',S.radius*.5,.2);
     for(const e of enemies())if(!e.dead&&flat(e.g.position,b.to)<S.radius)support(e,S.damage,{kind:'blackhole',indirect:true,direction:b.to.clone().sub(e.g.position).setY(0).normalize()});
    }
    if(b.hold<=0){
     b.life=0;fx.burst(b.to,'gravity',24,1.4);
     for(const e of enemies())if(!e.dead&&flat(e.g.position,b.to)<S.radius*.6)support(e,S.damage*3,{kind:'blackhole',indirect:true,direction:e.g.position.clone().sub(b.to).setY(0).normalize()});
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
  for(let i=embers.length-1;i>=0;i--){
   const m=embers[i];m.delay-=dt;if(m.delay>0)continue;
   fx.pulse(m.pos,'burst',S.emberRadius||1,.25);fx.burst(m.pos,'burst',10,1);
   for(const e of enemies())if(!e.dead&&flat(e.g.position,m.pos)<(S.emberRadius||1)+bossReach(e,0,.5))support(e,S.emberDamage||0,{kind:'flarebloom',indirect:true,direction:e.g.position.clone().sub(m.pos).setY(0).normalize()});
   embers.splice(i,1);
  }
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

 // ---------------- active (signature / overdrive) ----------------
 // surge(seconds): the opening move happens now, then the boosted stat sheet lasts `seconds`.
 // Damage from the surge still goes through hit(); the caller decides whether it may charge anything.
 const OPENING_FX={collapse:'gravity',frostguard:'frost',returnblade:'recall',prism:'reflect',thunderlance:'chain',frostbloom:'frost',stormcrown:'chain',tidepull:'gravity',seedstorm:'split',mirrorguard:'reflect',mirrormaze:'reflect',fullbloom:'split',thunderweb:'chain',starring:'orbit',glassspear:'pierce',flarebloom:'burst',rewind:'recall',blackhole:'gravity',winterbreath:'frost'};
 function surge(seconds,{aim=null}={}){
  if(!active||!(seconds>0))return false;
  surgeTime=Math.max(surgeTime,seconds);refresh();rebuildOrbit();
  if(awakened())awakenTimer=awakenSurgeOpening(statId,twin);
  opening(aim);
  return true;
 }
 // Awakened: the opening move returns on its own every AWAKEN.openingEvery seconds (every surgeOpeningEvery during the ultimate),
 // aimed at the nearest enemy, and waits while nothing is in reach so it is not spent on an empty room.
 function awakenOpening(dt){
  awakenTimer-=dt;if(awakenTimer>0)return;
  const target=nearestEnemy(player.position,AWAKEN.openingRange);
  if(!target){awakenTimer=0;return;}
  awakenTimer=surgeTime>0?awakenSurgeOpening(statId,twin):awakenOpeningEvery(statId,twin);
  opening(target.g.position.clone().sub(player.position).setY(0));
 }
 function calm(){if(surgeTime<=0)return;surgeTime=0;refresh();rebuildOrbit();}
 function opening(aim){
  const pos=player.position.clone().setY(0);
  const dir=aim&&aim.lengthSq()>1e-6?aim.clone().setY(0).normalize():new V(0,0,-1);
  const around=n=>Array.from({length:n},(_,i)=>dir.clone().applyAxisAngle(Y,i*Math.PI*2/n));
  const nearest=(n,range=10)=>enemies().filter(e=>!e.dead&&flat(e.g.position,pos)<range).sort((a,b)=>flat(a.g.position,pos)-flat(b.g.position,pos)).slice(0,n);
  if(awakened()){fx.pulse(pos,'awaken',3.2,.55);fx.burst(pos,'awaken',36,2.2);}
  fx.pulse(pos,OPENING_FX[active]||'seed',2.4,.5);fx.burst(pos,OPENING_FX[active]||'seed',30,1.8);
  if(GENERATED_FORMS[active]||SECOND_FORMS[active]||active==='riftseed'){
   // Keep the visual burst large while capping damaging projectiles. Generated
   // openings would otherwise outscale their low-cadence normal attack.
   const shots=active==='riftseed'?4:2;
   if(SECOND_FORMS[active]?.family==='convergence'){fire(pos,dir,null,true);fire(pos,dir.clone().applyAxisAngle(Y,.08),null,true);}else for(const d of around(shots))fire(pos,d,null,true);
   if((S.laws||[]).includes('portal'))for(const d of around(4)){const exit=pos.clone().addScaledVector(d,Math.min(4,S.portalDistance));fx.portal(pos,exit);}
   return;
  }
  switch(active){
   case 'collapse':{const spots=nearest(statId==='bigcrunch'?2:3);if(!spots.length)plant(pos.clone().addScaledVector(dir,3));for(const e of spots)plant(e.g.position.clone().setY(0));break;}
   case 'frostguard':{
    const radius=S.novaRadius+2;fx.pulse(pos,'frost',radius,.6);
    for(const e of enemies())if(!e.dead&&flat(e.g.position,pos)<radius){if(support(e,S.nova*2,{kind:'frostguard',indirect:true,direction:e.g.position.clone().sub(pos).setY(0).normalize()}))e.slow=Math.max(e.slow||0,4);}
    pulseTimer=S.novaEvery;break;
   }
   case 'returnblade':for(const d of around(8))fire(pos,d,null,true);break;
   case 'prism':for(const d of around(12))fire(pos,d,null,true);break;
   case 'thunderlance':for(const a of [-.6,-.3,0,.3,.6])lance(pos,dir.clone().applyAxisAngle(Y,a));break;
   case 'frostbloom':for(const e of nearest(6))fire(pos,dir,e.g.position,true);break;
   case 'flarebloom':for(const e of nearest(4))fire(pos,dir,e.g.position,true);break;
   case 'stormcrown':{
    const range=S.range+2;
    for(const e of nearest(8,range)){fx.arc(pos.clone().setY(2.2),e.g.position);support(e,S.damage,{kind:'stormcrown',indirect:true,direction:e.g.position.clone().sub(pos).setY(0).normalize()});}
    pulseTimer=0;break;
   }
   case 'tidepull':for(const d of around(4))fire(pos,d,null,true);break;
   case 'seedstorm':{
    for(const d of around(16))if(count('seedstorm')<60)bolts.push({kind:'seedstorm',ob:spawnMesh(geos.seed,mats.seed,pos),dir:d,life:S.life*1.4});
    fx.split(pos,dir,5);break;
   }
   case 'mirrorguard':{
    let turned=0;
    for(const q of enemyShots()){
     if(!(q.life>0)||q.boss||turned>=30)continue;
     q.life=0;q.struck=true;turned++;
     const aimAt=nearestEnemy(q.ob.position,14);
     const d=aimAt?aimAt.g.position.clone().sub(q.ob.position).setY(0).normalize():q.ob.position.clone().sub(player.position).setY(0).normalize();
     bolts.push({kind:'mirrorguard',ob:spawnMesh(geos.mirrorBolt,mats.mirror,q.ob.position),dir:d,life:1.6,damage:S.damage*1.5});
     fx.reflect(q.ob.position,d);
    }
    break;
   }
   case 'mirrormaze':for(const d of around(8))fire(pos,d,null,true);break;
   case 'fullbloom':for(const d of around(4))fire(pos,d,null,true);break;
   case 'glassspear':for(const d of around(6))fire(pos,d,null,true);break;
   case 'rewind':for(const d of around(4))fire(pos,d,null,true);break;
   case 'thunderweb':for(const e of nearest(3,S.reach))web(pos,e);break;
   case 'blackhole':for(const a of [-.9,0,.9])fire(pos,dir.clone().applyAxisAngle(Y,a),pos.clone().addScaledVector(dir.clone().applyAxisAngle(Y,a),3.2),true);break;
   case 'winterbreath':breath(pos,dir,Math.PI);break;
   case 'starring':{
    breathe=S.period/2;
    for(const q of enemyShots())if(q.life>0&&!q.boss&&flat(q.ob.position,pos)<S.outer+.4){q.life=0;q.struck=true;}
    for(const e of enemies())if(!e.dead&&flat(e.g.position,pos)<S.outer+bossReach(e,.4,.9))support(e,S.damage*6,{kind:'starring',indirect:true,direction:e.g.position.clone().sub(pos).setY(0).normalize()});
    break;
   }
  }
 }

 applyTheme();
 return {set,setTheme,fire,update,clear,surge,calm,
  state:()=>({active,evolution:ownerId||statId,theme:themeId,twin,awakened:awakened(),awakenIn:awakened()?Math.max(0,awakenTimer):null,level,bolts:bolts.length,wells:wells.length,shatters:shatters.length,embers:embers.length,orbit:orbit.visible?orbit.children.length:0,hits,secondHits,secondPhase,surge:Math.max(0,surgeTime)}),
  dispose(){clear();for(const g of Object.values(geos))g.dispose();for(const m of new Set([...Object.values(mats),...awakenedMats.values()]))m.dispose();group.removeFromParent();}};
}
