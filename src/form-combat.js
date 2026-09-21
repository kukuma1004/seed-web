import * as THREE from 'three';
import {ALL_FORMS,GENERATED_FORMS,SECOND_FORMS,AWAKEN,AWAKEN_FORMS,TWIN_FORMS,awakenOpeningEvery,awakenSurgeOpening,formStats} from './forms.js';
import {createFormVisuals} from './form-visuals.js';
import {buildComboProjectileGeometry,projectileAudioEvent} from './combo-projectile.js';

// Ordinary prism is allowed to grow as it finds walls. Infinite Prism already
// adds another generation, a larger shard pool and a permanent damage boost,
// so its child shards conserve the parent's damage instead of multiplying it
// by 1.4 on every split (two children at 70% each).
export const PRISM_CHILD_FALLOFF=Object.freeze({base:.7,infinite:.5});
import {THEMES,normalizeTheme,themeColor} from './themes.js';
const V=THREE.Vector3;
const Y=new V(0,1,0);

// Level-one tuning, kept as a named export for tests and tooling.
export const FORM_COMBAT=Object.freeze(Object.fromEntries(Object.keys(ALL_FORMS).map(id=>[id,Object.freeze(formStats(id,1))])));
export const ORBIT_VISUALS=Object.freeze({
 frostguard:Object.freeze({geometry:'satellite',material:'ice',motion:'snowflake'}),
 stormcrown:Object.freeze({geometry:'orb',material:'storm',motion:'crown'}),
 mirrorguard:Object.freeze({geometry:'mirror',material:'mirror',motion:'shield-wall'}),
 starring:Object.freeze({geometry:'starPetal',material:'star',motion:'breathing-star'}),
 comethalo:Object.freeze({geometry:'cometBud',material:'storm',motion:'charged-comet'}),
 halobloom:Object.freeze({geometry:'haloPetal',material:'seed',motion:'counting-halo'}),
 ebbring:Object.freeze({geometry:'blade',material:'tide',motion:'ebbing-ring'}),
 spearring:Object.freeze({geometry:'gravityStake',material:'blade',motion:'launching-spears'}),
 accretiondisk:Object.freeze({geometry:'vortex',material:'core',motion:'feeding-disk'})
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
 if(id==='spearring'){
  // 창끝이 바깥을 향한 채 돈다.
  return {x:Math.cos(a)*S.radius,y:.8+wave*.06,z:Math.sin(a)*S.radius,pitch:0,yaw:Math.PI/2-a,roll:0,scale:[1.1,1.1,1.1]};
 }
 if(id==='accretiondisk'){
  // 납작한 원반처럼 기울어 돌고, 부스러기가 찰수록 조금씩 커진다.
  const fill=1+.25*Math.min(1,S.fill||0);
  return {x:Math.cos(a)*S.radius*1.1,y:.45+.18*Math.sin(a*2+time),z:Math.sin(a)*S.radius*.8,pitch:-Math.PI/2,yaw:time*2+index,roll:.35,scale:[fill,fill,fill]};
 }
 if(id==='ebbring'){
  // 고리 중심은 씨앗이 아니라 뒤따라오는 닻이다(updateOrbit가 더한다). 멈추면 작게 오므라든다.
  const radius=(S.calm?S.calmRadius:S.radius)*(1+.05*Math.sin(time*3+index));
  return {x:Math.cos(a)*radius,y:.55+wave*.05,z:Math.sin(a)*radius,pitch:-Math.PI/2,yaw:-a+Math.PI/2,roll:0,scale:[.9,.9,.9]};
 }
 if(id==='halobloom'){
  // 벤 횟수가 찰수록 고리가 조금씩 조여들어 만개가 가까운 것이 눈에 보인다.
  const tighten=1-.1*Math.min(1,S.charge||0);
  return {x:Math.cos(a)*S.radius*tighten,y:.6+(index%2?.16:0)+wave*.07,z:Math.sin(a)*S.radius*tighten,pitch:-1.02,yaw:Math.PI/2-a,roll:wave*.2,scale:[1.28,1.28,1.28]};
 }
 if(id==='comethalo'){
  const chase=.82+.18*Math.sin(time*2.7+index*1.7);
  return {x:Math.cos(a)*S.radius*1.18*chase,y:.88+(index%2)*.22+wave*.12,z:Math.sin(a)*S.radius*.62,pitch:-.72,yaw:-a-time*1.4,roll:.25*wave,scale:[1.35,1.35,1.35]};
 }
 const radius=S.inner+(S.outer-S.inner)*(.5-.5*Math.cos(time*Math.PI*2/S.period));
 return {x:Math.cos(a)*radius,y:.64+(index%2?.13:0)+wave*.055,z:Math.sin(a)*radius,pitch:-1.02,yaw:-a-time*.9,roll:wave*.12,scale:[1.55,1.55,1.55]};
}

// Hot collision path for generated projectiles. The old Vector3 expression
// allocated four temporary objects for every projectile/enemy pair, producing
// frequent mobile garbage-collection pauses once split forms filled the room.
export function segmentDistance(a,b,p){const dx=b.x-a.x,dz=b.z-a.z,length=dx*dx+dz*dz,t=length?THREE.MathUtils.clamp(((p.x-a.x)*dx+(p.z-a.z)*dz)/length,0,1):0,ox=a.x+dx*t-p.x,oz=a.z+dz*t-p.z;return Math.hypot(ox,oz);}
const flat=(a,b)=>Math.hypot(a.x-b.x,a.z-b.z);
const bossReach=(e,normal,boss)=>['warden','austin','act2warden','alwaysbeginner'].includes(e.type)?boss:normal;
const immovable=e=>['warden','austin','act2warden','alwaysbeginner','turret'].includes(e.type);

// One selected weapon owns its shape and cadence. Laws add bounded support on hit.
// Options: player, enemies(), nearby(pos,r,out), hit(e,damage,meta), blocked(a,b), boundary(a,b,dir), constrain(pos,r), vfx, sound(id), enemyShots().
export function createFormCombat(scene,{player,enemies,nearby=null,hit,blocked,reflector=()=>false,boundary,constrain,vfx,sound=()=>{},enemyShots=()=>[],theme='botanical'}){
 const fx=Object.fromEntries(['muzzle','pulse','burst','flame','explosion','trail','arc','reflect','split','portal'].map(name=>[name,(...args)=>vfx?.[name]?.(...args)]));
 const group=new THREE.Group();scene.add(group);
 const {mats,geos}=createFormVisuals();
 const awakenedMats=new Map();
 const originalMats=new Map(Object.entries(mats).map(([name,material])=>[name,{material,color:material.color?.clone(),emissive:material.emissive?.clone()}]));
 let themeId=normalizeTheme(theme);
 const orbit=new THREE.Group();group.add(orbit);orbit.visible=false;
 // active is the attack being fought with (a fusion id for an awakened evolution); statId is the evolution held.
 let twin=false,ownerId=null,active=null,statId=null,level=1,S=formStats(null),angle=0,pulseTimer=0,hits=0,surgeTime=0,breathe=0,awakenTimer=0,secondHits=0,secondPhase=0,markClock=0,secondMarks=new WeakMap();
 let bolts=[],wells=[],shatters=[],embers=[],storms=[],stakes=[],cooldowns=new Map(),comboGeo=null,movementCharge=0,cometCursor=0;
 // 1묶음 상태: 고드름 창이 스스로 남긴 서리 표식 · 얼어붙은 그물이 남긴 선 · 되감는 번개가 기억한 길 · 꽃잎 후광이 센 벤 횟수.
 let iceMarks=new WeakMap(),frostLines=[],rewindMemories=[],haloCuts=0,haloRegrow=0;
 // 2묶음 상태: 밀물 고리의 닻 · 끌림 꽃밭들.
 const ebbAnchor=new V();let ebbReady=false,gardens=[];
 // 3묶음 상태: 창날 고리의 빠진 창·발사 시계 · 강착 원반 부스러기 · 서리 되감기 표식 · 차가운 소용돌이 · 서리꽃 겹침.
 let spearGone=[],spearClock=0,debris=0,rimeMarks=new WeakMap(),coldWells=[],petalStacks=new WeakMap();
 const nearbyList=[],previousPosition=new V(),lastPlayerPosition=new V();const near=(pos,radius)=>nearby?nearby(pos,radius,nearbyList):enemies();
 const refresh=()=>{S=active?formStats(statId,level,{surge:surgeTime>0,twin}):formStats(null);};
 const awakened=()=>Boolean(active&&(AWAKEN_FORMS[statId]||twin));
 const sourceForm=()=>AWAKEN_FORMS[statId]||TWIN_FORMS[ownerId]||SECOND_FORMS[active]||GENERATED_FORMS[active]||ALL_FORMS[active]||(active==='riftseed'?{id:'riftseed',requires:['portal']}:{id:active||'seed',requires:S.laws||[]});

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
 function applyProjectileScale(ob,x=ob.userData.visualScale?.[0]??1,y=ob.userData.visualScale?.[1]??x,z=ob.userData.visualScale?.[2]??x){
  ob.userData.visualScale=[x,y,z];const scale=THEMES[themeId].projectileScale;ob.scale.set(x*scale[0],y*scale[1],z*scale[2]);return ob;
 }
 function setTheme(id){themeId=normalizeTheme(id);applyTheme();for(const b of bolts)if(b.ob)applyProjectileScale(b.ob);rebuildOrbit();return themeId;}

 function combatMaterial(mat){
  if(!awakened())return mat;
  if(!awakenedMats.has(mat)){const gold=mat.clone();if(gold.emissive){gold.emissive.setHex(0xffb84f);gold.emissiveIntensity=Math.max(.38,gold.emissiveIntensity||0);}gold.roughness=Math.max(.18,(gold.roughness??.5)*.72);awakenedMats.set(mat,gold);}
  return awakenedMats.get(mat);
 }
 function spawnMesh(geo,mat,pos,y=.7){const ob=new THREE.Mesh(geo,combatMaterial(mat));ob.position.set(pos.x,y,pos.z);ob.userData.awakened=awakened();applyProjectileScale(ob);group.add(ob);return ob;}
 function remove(b){b.ob?.removeFromParent();}
 function rebuildOrbit(){
  for(const child of [...orbit.children])child.removeFromParent();
  const count=active==='frostguard'?S.satellites:active==='stormcrown'?S.orbs:active==='mirrorguard'?S.mirrors:active==='starring'?S.petals:active==='comethalo'?S.comets:active==='halobloom'?S.petals:active==='ebbring'?S.blades:active==='spearring'?S.spears:active==='accretiondisk'?S.vortices:0;
  const style=ORBIT_VISUALS[active];
  if(!style){orbit.visible=false;return;}
  for(let i=0;i<count;i++)orbit.add(new THREE.Mesh(geos[style.geometry],combatMaterial(mats[style.material])));
  orbit.visible=count>0;
 }
 function clear(){for(const b of bolts)remove(b);for(const stake of stakes)remove(stake);bolts=[];wells=[];shatters=[];embers=[];storms=[];stakes=[];cooldowns.clear();comboGeo?.dispose();comboGeo=null;hits=0;secondHits=0;secondPhase=0;markClock=0;secondMarks=new WeakMap();iceMarks=new WeakMap();frostLines=[];rewindMemories=[];haloCuts=0;haloRegrow=0;ebbReady=false;gardens=[];spearGone=[];spearClock=0;debris=0;rimeMarks=new WeakMap();coldWells=[];petalStacks=new WeakMap();active=null;statId=null;ownerId=null;twin=false;awakenTimer=0;level=1;surgeTime=0;breathe=0;movementCharge=0;cometCursor=0;lastPlayerPosition.copy(player.position);S=formStats(null);angle=0;pulseTimer=0;rebuildOrbit();}
 // opts.twin: this combat is one attack of a twin awakening (TWIN.damage, self-repeating opening move starting after opts.openingDelay).
 function set(id,nextLevel=1,opts={}){
  // Given a twin's own id, one combat fights with the twin's first attack (the game runs one combat per attack).
  if(TWIN_FORMS[id])return set(TWIN_FORMS[id].parts[0],nextLevel,{...opts,twin:true});
  const L=Math.max(1,Math.floor(nextLevel||1));
  const kind=AWAKEN_FORMS[id]?.base||id;
  const asTwin=Boolean(opts.twin);
  if(statId!==id||twin!==asTwin){clear();active=kind;statId=id;ownerId=opts.twinId||id;twin=asTwin;lastPlayerPosition.copy(player.position);if(kind==='frostguard')pulseTimer=formStats(id,L).novaEvery;if(AWAKEN_FORMS[id]||twin)awakenTimer=opts.openingDelay??(id==='bigcrunch'?4:2);S.damage=0;}
  if(level!==L||S.damage===0){level=L;refresh();}
  if((GENERATED_FORMS[active]||SECOND_FORMS[active]||active==='riftseed')&&!comboGeo)comboGeo=buildComboProjectileGeometry(sourceForm());
  rebuildOrbit();
 }
 function support(e,damage,metadata){if(e.dead)return false;if(hit(e,damage,{...metadata,evolution:ownerId||statId,awakened:awakened()})===false)return false;hits++;return true;}
 const count=kind=>bolts.filter(b=>b.kind===kind).length;
 const nearestEnemy=(from,range,skip=new Set(),clearLine=false)=>{let best=null,bestDistance=range;for(const e of enemies()){if(e.dead||skip.has(e))continue;const d=flat(e.g.position,from);if(d<bestDistance&&(!clearLine||!blocked(from.clone().setY(0),e.g.position.clone().setY(0)))){best=e;bestDistance=d;}}return best;};

 // force: an active's opening move may go past the usual on-screen caps (still bounded by its own loop).
 function fire(pos,dir,target=null,force=false){
  if(!active||sourceForm().passive)return Infinity;
  const aim=dir.clone().setY(0).normalize();
  const full=(kind,cap)=>!force&&count(kind)>=cap;
  if(GENERATED_FORMS[active]||SECOND_FORMS[active]||active==='riftseed'){
   if(full('gene',S.bolts))return S.interval;
   const second=SECOND_FORMS[active],secondRole=second?.family==='convergence'?(secondPhase++%2?'consume':'mark'):null;
   const source=sourceForm();
   const laws=[...(secondRole==='consume'?S.followUpLaws:S.primaryLaws||S.laws||source.requires)],ob=spawnMesh(comboGeo||geos.gene,mats.gene,pos);ob.rotation.x=-Math.PI/2;ob.rotation.y=Math.atan2(aim.x,aim.z);
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
   case 'icicle':{icicleLance(pos,aim);return S.interval;}
   case 'frostnet':{frostNet(pos);return S.interval;}
   case 'rewindbolt':{rewindNet(pos);return S.interval;}
   case 'refractlance':{refractLance(pos,aim);return S.interval;}
   case 'thundermirror':{thunderMirror(pos);return S.interval;}
   case 'pierceshower':{pierceShower(pos,aim);return S.interval;}
   case 'rimeback':{
    if(full('rimeback',S.bolts))return S.interval;
    const ob=spawnMesh(geos.blade,mats.ice,pos);ob.rotation.x=-Math.PI/2;applyProjectileScale(ob,.9,.9,.9);
    bolts.push({kind:'rimeback',ob,dir:aim.clone(),age:0,returning:false,hitSet:new Set(),life:4});
    fx.muzzle(pos,aim,'frost');return S.interval;
   }
   case 'coldwell':{
    if(full('coldwell',2))return S.interval;
    const to=target?new V(target.x,0,target.z):pos.clone().addScaledVector(aim,5),offset=to.clone().sub(pos).setY(0);if(offset.length()>S.range)offset.setLength(S.range);
    bolts.push({kind:'coldwell',ob:spawnMesh(geos.vortex,mats.ice,pos),from:pos.clone().setY(0),to:pos.clone().setY(0).add(offset),t:0,life:4});
    fx.muzzle(pos,aim,'frost');return S.interval;
   }
   case 'rimepetal':{
    if(full('rimepetal',S.bolts))return S.interval;
    const ob=spawnMesh(geos.bloom,mats.ice,pos);ob.rotation.x=-Math.PI/2;
    bolts.push({kind:'rimepetal',ob,dir:aim,life:S.life});fx.muzzle(pos,aim,'frost');return S.interval;
   }
   case 'echolane':{
    if(full('echolane',S.bolts))return S.interval;
    const ob=spawnMesh(geos.frostMirror,mats.mirror,pos);ob.rotation.x=-Math.PI/2;
    bolts.push({kind:'echolane',ob,dir:aim.clone(),out:aim.clone(),toSeed:false,pass:0,passed:new Set(),life:S.life});
    fx.muzzle(pos,aim,'reflect');return S.interval;
   }
   case 'sunmirror':{
    if(full('sunmirror',S.bolts))return S.interval;
    const ob=spawnMesh(geos.lens,mats.star,pos);ob.rotation.x=-Math.PI/2;
    bolts.push({kind:'sunmirror',ob,dir:aim,life:S.life,charge:force?4:0});
    fx.muzzle(pos,aim,'burst');return S.interval;
   }
   case 'pullgarden':{
    if(full('pullgarden',2))return S.interval;
    const to=target?new V(target.x,0,target.z):pos.clone().addScaledVector(aim,5),offset=to.clone().sub(pos).setY(0);if(offset.length()>S.range)offset.setLength(S.range);
    bolts.push({kind:'pullgarden',ob:spawnMesh(geos.bloom,mats.core,pos),from:pos.clone().setY(0),to:pos.clone().setY(0).add(offset),t:0,life:4});
    fx.muzzle(pos,aim,'gravity');return S.interval;
   }
   case 'frostbloom':{
    if(full('frostbloom',S.bombs))return S.interval;
    const to=target?new V(target.x,0,target.z):pos.clone().addScaledVector(aim,6);
    const offset=to.clone().sub(pos).setY(0);if(offset.length()>S.range)offset.setLength(S.range);
    bolts.push({kind:'frostbloom',ob:spawnMesh(geos.bloom,mats.bloom,pos),from:pos.clone().setY(0),to:pos.clone().setY(0).add(offset),t:0,life:5});
    fx.muzzle(pos,aim,'frost');return S.interval;
   }
   case 'tidepull':{
    if(full('tidepull',S.vortices))return S.interval;
    const ob=spawnMesh(geos.tide,mats.tide,pos);ob.rotation.x=-Math.PI/2;applyProjectileScale(ob,1.25,.82,1);
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
    const ob=spawnMesh(geos.blade,mats.blade,pos);applyProjectileScale(ob,.72,.72,.72);ob.rotation.x=-Math.PI/2;
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
    case 'gravitymirror':{
     if(full('gravitymirror',S.bolts))return S.interval;
     const ob=spawnMesh(geos.lens,mats.lens,pos);ob.rotation.x=-Math.PI/2;applyProjectileScale(ob,1.08,1.08,1.08);
     bolts.push({kind:'gravitymirror',ob,dir:aim,life:S.life,bounces:0,passed:new Set()});
     fx.muzzle(pos,aim,'gravity');return S.interval;
    }
    case 'chainburst':{chainBurst(pos);return S.interval;}
    case 'stormanchor':{stormAnchor(pos);return S.interval;}
    case 'blastlance':{blastLance(pos,aim);return S.interval;}
    case 'gravitystake':{gravityStakeAttack(pos,aim);return S.interval;}
    case 'frostkaleidoscope':{
     if(full('frostkaleidoscope',S.bolts))return S.interval;
     const ob=spawnMesh(geos.frostMirror,mats.ice,pos);ob.rotation.x=-Math.PI/2;
     bolts.push({kind:'frostkaleidoscope',ob,dir:aim,life:S.life,bounces:force?S.shatterBounces:0,passed:new Set()});
     fx.muzzle(pos,aim,'frost');return S.interval;
    }
    case 'lightningpetal':{
     if(full('lightningpetal',S.bolts))return S.interval;
     const ob=spawnMesh(geos.lightningPetal,mats.storm,pos);ob.rotation.x=-Math.PI/2;
     bolts.push({kind:'lightningpetal',ob,dir:aim,life:S.life});fx.muzzle(pos,aim,'chain');return S.interval;
    }
    case 'returnflare':{
     if(full('returnflare',S.bolts))return S.interval;
     const to=target?new V(target.x,0,target.z):pos.clone().addScaledVector(aim,S.range),offset=to.clone().sub(pos).setY(0);
     if(offset.length()>S.range)offset.setLength(S.range);
     const ob=spawnMesh(geos.returnFlare,mats.storm,pos);ob.rotation.x=-Math.PI/2;
     bolts.push({kind:'returnflare',ob,dir:aim.clone(),to:pos.clone().setY(0).add(offset),age:0,returning:false,returnHits:new Set(),life:S.life});
     fx.muzzle(pos,aim,'burst');return S.interval;
    }
    case 'returningpetals':{
     if(full('returningpetals',S.bolts))return S.interval;
     const to=target?new V(target.x,0,target.z):pos.clone().addScaledVector(aim,S.range),offset=to.clone().sub(pos).setY(0);
     if(offset.length()>S.range)offset.setLength(S.range);
     const ob=spawnMesh(geos.returnPetal,mats.blade,pos);ob.rotation.x=-Math.PI/2;applyProjectileScale(ob,1.05,1.05,1.05);
     bolts.push({kind:'returningpetals',ob,dir:aim.clone(),to:pos.clone().setY(0).add(offset),age:0,life:S.life});
     fx.muzzle(pos,aim,'split');return S.interval;
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


 // Pierce + frost: the lance freezes what it hits and shatters what IT froze.
 // The mark belongs to this weapon, so another frost source cannot buy the shatter.
 function icicleLance(pos,dir){
  const start=pos.clone().setY(0),end=start.clone();
  for(let travelled=0;travelled<S.length;travelled+=.4){
   const next=end.clone().addScaledVector(dir,.4),probe=dir.clone();
   if(blocked(end,next)||boundary(end.clone(),next,probe))break;
   end.copy(next);
  }
  const line=enemies().filter(e=>!e.dead&&segmentDistance(start,end,e.g.position)<bossReach(e,.72,1.2))
   .sort((a,b)=>a.g.position.clone().sub(start).dot(dir)-b.g.position.clone().sub(start).dot(dir));
  let struck=0;
  for(const e of line){
   if(struck>=S.pierce)break;
   const marked=(iceMarks.get(e)||0)>markClock;
   if(!support(e,S.damage,{kind:'icicle',direction:dir.clone()})){end.copy(e.g.position).setY(0);break;}
   struck++;
   // 창끝에 처음 닿은 적만 얼고, 그 적만 깨진다. 뒤의 적은 꿰뚫리기만 한다.
   if(struck>1)continue;
   if(!marked){iceMarks.set(e,markClock+S.mark);e.slow=Math.max(e.slow||0,S.slow);fx.pulse(e.g.position,'frost',.55,.22);continue;}
   iceMarks.delete(e);
   fx.explosion(e.g.position,'frost',S.shatterRadius,true);sound('frostHit');
   support(e,S.shatter,{kind:'icicle',indirect:true,phase:'shatter',direction:dir.clone()});
   for(const other of near(e.g.position,S.shatterRadius+.7))if(other!==e&&!other.dead&&flat(other.g.position,e.g.position)<S.shatterRadius+bossReach(other,0,.4))
    support(other,S.shatter*S.shatterShare,{kind:'icicle',indirect:true,phase:'shatter',direction:other.g.position.clone().sub(e.g.position).setY(0).normalize()});
  }
  for(let d=0;d<flat(start,end);d+=1.5)fx.trail(start.clone().addScaledVector(dir,d).setY(.7),start.clone().addScaledVector(dir,Math.min(flat(start,end),d+1.5)).setY(.7),'frost',false);
  fx.pulse(end,'frost',.5,.2);
 }

 // Orbit + split: the ring counts its cuts, then throws every petal outward at once.
 function bloomBurst(pos){
  haloCuts=0;haloRegrow=S.regrow;orbit.visible=false;
  fx.split(pos,new V(0,0,1),Math.min(5,S.petals));sound('split');
  for(let i=0;i<S.petals;i++){
   const dir=new V(Math.cos(i*Math.PI*2/S.petals),0,Math.sin(i*Math.PI*2/S.petals));
   const ob=spawnMesh(geos.haloPetal,mats.seed,pos);ob.rotation.x=-Math.PI/2;ob.rotation.y=Math.atan2(dir.x,dir.z);
   bolts.push({kind:'halobloom',ob,dir,life:S.range/S.speed,gen:0,passed:new Set()});
  }
 }

 // Chain + frost: three or more links leave a frost line along the route.
 // Guardians and bosses take the line's damage but never its hold.
 function frostNet(pos,first=null){
  let from=first||nearestEnemy(pos,S.reach,new Set(),true);if(!from)return;
  const touched=new Set([from]),route=[from.g.position.clone().setY(0)];let damage=S.damage;
  fx.arc(pos.clone().setY(.9),from.g.position);
  support(from,damage,{kind:'frostnet',indirect:true,direction:from.g.position.clone().sub(pos).setY(0).normalize()});
  for(let j=0;j<S.jumps;j++){
   const next=nearestEnemy(from.g.position,S.range,touched,true);if(!next)break;
   touched.add(next);damage*=S.decay;fx.arc(from.g.position,next.g.position);
   support(next,damage,{kind:'frostnet',indirect:true,direction:next.g.position.clone().sub(from.g.position).setY(0).normalize()});
   route.push(next.g.position.clone().setY(0));from=next;
  }
  if(route.length<S.minLinks)return;
  for(let i=1;i<route.length;i++)frostLines.push({a:route[i-1],b:route[i],life:S.webLife,tick:0});
 }
 function updateFrostLines(dt){
  for(const line of frostLines){
   line.life-=dt;line.tick-=dt;
   if(line.life<=0||line.tick>0)continue;
   line.tick=S.webTick||.5;
   fx.trail(line.a.clone().setY(.22),line.b.clone().setY(.22),'frost',true);
   for(const e of enemies()){
    if(e.dead||segmentDistance(line.a,line.b,e.g.position)>=bossReach(e,.72,1.2))continue;
    support(e,S.webDamage,{kind:'frostnet',indirect:true,phase:'line',direction:e.g.position.clone().sub(line.a).setY(0).normalize()});
    if(!immovable(e))e.slow=Math.max(e.slow||0,S.webSlow);
   }
  }
  frostLines=frostLines.filter(line=>line.life>0);
 }

 // Chain + recall: the route is remembered, and moving far enough plays it back.
 function rewindNet(pos,first=null,instant=false){
  let from=first||nearestEnemy(pos,S.reach,new Set(),true);if(!from)return;
  const touched=new Set([from]),route=[pos.clone().setY(.9),from.g.position.clone().setY(0)];let damage=S.damage;
  fx.arc(route[0],from.g.position);
  support(from,damage,{kind:'rewindbolt',indirect:true,direction:from.g.position.clone().sub(pos).setY(0).normalize()});
  for(let j=0;j<S.jumps;j++){
   const next=nearestEnemy(from.g.position,S.range,touched,true);if(!next)break;
   touched.add(next);damage*=S.decay;fx.arc(from.g.position,next.g.position);
   support(next,damage,{kind:'rewindbolt',indirect:true,direction:next.g.position.clone().sub(from.g.position).setY(0).normalize()});
   route.push(next.g.position.clone().setY(0));from=next;
  }
  // One enemy leaves no road worth rewinding.
  if(route.length<3)return;
  const memory={route,life:S.forget,moved:0};
  if(instant){replayRoute(memory);return;}
  rewindMemories.push(memory);
  while(rewindMemories.length>S.trails)rewindMemories.shift();
 }
 function replayRoute(memory){
  for(let i=1;i<memory.route.length;i++)fx.arc(memory.route[i-1],memory.route[i]);
  sound('chainHit');
  for(const e of enemies()){
   if(e.dead)continue;
   for(let i=1;i<memory.route.length;i++){
    if(segmentDistance(memory.route[i-1],memory.route[i],e.g.position)>=bossReach(e,.75,1.2))continue;
    support(e,S.damage*S.rewindScale,{kind:'rewindbolt',indirect:true,phase:'rewind',direction:e.g.position.clone().sub(memory.route[i-1]).setY(0).normalize()});
    break;
   }
  }
 }
 function updateRewind(dt){
  const moved=flat(player.position,lastPlayerPosition);lastPlayerPosition.copy(player.position);
  const replayed=[];
  for(const memory of rewindMemories){
   memory.life-=dt;memory.moved+=moved;
   if(memory.moved>=S.rewindDistance)replayed.push(memory);
  }
  for(const memory of replayed)replayRoute(memory);
  rewindMemories=rewindMemories.filter(memory=>memory.life>0&&memory.moved<S.rewindDistance);
 }

 // How far a lance can run from here before a wall stops it.
 function lanceReach(from,heading,limit){
  const end=from.clone();
  for(let travelled=0;travelled<limit;travelled+=.4){
   const next=end.clone().addScaledVector(heading,.4),probe=heading.clone();
   if(blocked(end,next)||boundary(end.clone(),next,probe))break;
   end.copy(next);
  }
  return end;
 }
 // Pierce + reflect: the wall is a hinge, and the lance turns to run ALONG it.
 // That is the whole condition: enemies pressed against a wall get swept, enemies
 // out in the open only meet the first straight leg.
 function refractLance(pos,dir){
  let start=pos.clone().setY(0),heading=dir.clone().setY(0).normalize(),budget=S.pierce,folds=0;
  for(let leg=0;leg<=S.folds;leg++){
   const end=start.clone();let hinge=null;
   for(let travelled=0;travelled<S.length;travelled+=.4){
    const next=end.clone().addScaledVector(heading,.4),probe=heading.clone();
    if(blocked(end,next)||boundary(end.clone(),next,probe)){
     // 벽을 만나면 벽이 뻗은 쪽으로 꺾인다. 더 멀리 나가는 쪽을 고른다.
     const left=heading.clone().applyAxisAngle(Y,Math.PI/2),right=heading.clone().applyAxisAngle(Y,-Math.PI/2);
     hinge=flat(end,lanceReach(end,left,S.length))>=flat(end,lanceReach(end,right,S.length))?left:right;
     break;
    }
    end.copy(next);
   }
   const line=enemies().filter(e=>!e.dead&&segmentDistance(start,end,e.g.position)<bossReach(e,.72,1.2))
    .sort((a,b)=>a.g.position.clone().sub(start).dot(heading)-b.g.position.clone().sub(start).dot(heading));
   for(const e of line){
    if(budget<=0)break;
    if(!support(e,S.damage*(1+S.foldGain*folds),{kind:'refractlance',direction:heading.clone()})){budget=0;break;}
    budget--;
   }
   for(let d=0;d<flat(start,end);d+=1.5)fx.trail(start.clone().addScaledVector(heading,d).setY(.7),start.clone().addScaledVector(heading,Math.min(flat(start,end),d+1.5)).setY(.7),'pierce',folds>0);
   if(!hinge||budget<=0||leg>=S.folds){fx.pulse(end,'pierce',.5,.2);break;}
   fx.reflect(end,hinge);sound('reflect');
   folds++;start=end.clone();heading=hinge;
  }
 }


 // Reflect + chain: the bolt bounces between two enemies like a mirror.
 // With only one target the wall answers once instead.
 function thunderMirror(pos,first=null){
  const a=first||nearestEnemy(pos,S.reach,new Set(),true);if(!a)return;
  const b=nearestEnemy(a.g.position,S.range,new Set([a]),true);
  fx.arc(pos.clone().setY(.9),a.g.position);
  let damage=S.damage;support(a,damage,{kind:'thundermirror',indirect:true,direction:a.g.position.clone().sub(pos).setY(0).normalize()});
  if(!b){fx.pulse(a.g.position,'reflect',.6,.2);support(a,S.damage*S.soloEcho,{kind:'thundermirror',indirect:true,phase:'wall',direction:a.g.position.clone().sub(pos).setY(0).normalize()});return;}
  let from=a,to=b;
  for(let i=0;i<S.echoes;i++){
   if(to.dead||from.dead)break;
   damage*=S.decay;fx.arc(from.g.position,to.g.position);
   support(to,damage,{kind:'thundermirror',indirect:true,phase:'echo',direction:to.g.position.clone().sub(from.g.position).setY(0).normalize()});
   [from,to]=[to,from];
  }
  sound('chainHit');
 }

 // Pierce + split: every enemy the lance passes throws two petals sideways.
 function pierceShower(pos,dir){
  const start=pos.clone().setY(0),end=start.clone();
  for(let travelled=0;travelled<S.length;travelled+=.4){
   const next=end.clone().addScaledVector(dir,.4),probe=dir.clone();
   if(blocked(end,next)||boundary(end.clone(),next,probe))break;
   end.copy(next);
  }
  const line=enemies().filter(e=>!e.dead&&segmentDistance(start,end,e.g.position)<bossReach(e,.72,1.2))
   .sort((a,b)=>a.g.position.clone().sub(start).dot(dir)-b.g.position.clone().sub(start).dot(dir));
  let struck=0;
  for(const e of line){
   if(struck>=S.pierce)break;
   if(!support(e,S.damage,{kind:'pierceshower',direction:dir.clone()})){end.copy(e.g.position).setY(0);break;}
   struck++;
   for(let k=0;k<S.spread;k++){
    if(count('showerpetal')>=30)break;
    const side=(k%2?-1:1)*(1.05+.25*Math.floor(k/2));
    const ob=spawnMesh(geos.seed,mats.seed,e.g.position);ob.rotation.x=-Math.PI/2;
    bolts.push({kind:'showerpetal',ob,dir:dir.clone().applyAxisAngle(Y,side),life:S.petalLife,passed:new Set([e])});
   }
  }
  for(let d=0;d<flat(start,end);d+=1.5)fx.trail(start.clone().addScaledVector(dir,d).setY(.7),start.clone().addScaledVector(dir,Math.min(flat(start,end),d+1.5)).setY(.7),'pierce',false);
  if(struck)fx.split(end,dir,Math.min(5,struck));
 }

 // Gravity + split: little pull gardens. Two enemies in one garden make it bloom.
 function plantGardens(center,count){
  for(let i=0;i<count;i++){
   const a=i*Math.PI*2/count+.4,spot=center.clone().add(new V(Math.cos(a),0,Math.sin(a)).multiplyScalar(count>1?1.35:0));
   constrain(spot,.3);
   gardens.push({pos:spot,life:S.life,tick:0});fx.pulse(spot,'gravity',S.fieldRadius,.35);
  }
  while(gardens.length>12)gardens.shift();
 }
 function updateGardens(dt){
  for(const g of gardens){
   g.life-=dt;g.tick-=dt;if(g.life<=0)continue;
   const inside=near(g.pos,S.fieldRadius+.8).filter(e=>!e.dead&&flat(e.g.position,g.pos)<S.fieldRadius+bossReach(e,0,.4));
   for(const e of inside){
    if(immovable(e))continue;
    const pull=g.pos.clone().sub(e.g.position).setY(0),d=pull.length();
    if(d>.25){e.g.position.addScaledVector(pull.normalize(),Math.min(d-.25,S.pull*dt));constrain(e.g.position,.65);}
   }
   if(g.tick<=0){
    g.tick=S.tickEvery;fx.flame(g.pos,'gravity',6,S.fieldRadius*.3);
    for(const e of inside)support(e,S.damage,{kind:'pullgarden',indirect:true,phase:'tick',direction:e.g.position.clone().sub(g.pos).setY(0).normalize()});
   }
   if(inside.length>=S.bloomAt){
    g.life=0;fx.explosion(g.pos,'split',S.bloomRadius,true);sound('burstHit');
    for(const e of near(g.pos,S.bloomRadius+.8))if(!e.dead&&flat(e.g.position,g.pos)<S.bloomRadius+bossReach(e,0,.5))
     support(e,S.bloom,{kind:'pullgarden',indirect:true,phase:'bloom',direction:e.g.position.clone().sub(g.pos).setY(0).normalize()});
   }
  }
  gardens=gardens.filter(g=>g.life>0);
 }


 // Orbit + pierce: one spear leaves the ring as a lance, then grows back.
 function spearLaunch(target){
  const dir=target.g.position.clone().sub(player.position).setY(0).normalize();
  const start=player.position.clone().setY(0),end=start.clone();
  for(let travelled=0;travelled<S.length;travelled+=.4){
   const next=end.clone().addScaledVector(dir,.4),probe=dir.clone();
   if(blocked(end,next)||boundary(end.clone(),next,probe))break;
   end.copy(next);
  }
  const line=enemies().filter(e=>!e.dead&&segmentDistance(start,end,e.g.position)<bossReach(e,.72,1.2))
   .sort((a,b)=>a.g.position.clone().sub(start).dot(dir)-b.g.position.clone().sub(start).dot(dir));
  let struck=0;
  for(const e of line){if(struck>=S.pierce)break;if(!support(e,S.lance,{kind:'spearring',direction:dir.clone()})){end.copy(e.g.position).setY(0);break;}struck++;}
  for(let d=0;d<flat(start,end);d+=1.5)fx.trail(start.clone().addScaledVector(dir,d).setY(.8),start.clone().addScaledVector(dir,Math.min(flat(start,end),d+1.5)).setY(.8),'pierce',false);
  fx.pulse(end,'pierce',.5,.2);sound('reflect');
 }
 // Orbit + gravity: the disk throws its debris at the nearest enemies.
 function ventDebris(){
  const n=debris;debris=0;S.fill=0;fx.pulse(player.position,'gravity',S.radius+.6,.35);sound('gravityHit');
  const targets=near(player.position,10).filter(e=>!e.dead).sort((a,b)=>flat(a.g.position,player.position)-flat(b.g.position,player.position));
  for(let i=0;i<n;i++){
   if(count('debris')>=24)break;
   const t=targets[i%Math.max(1,targets.length)];
   const dir=t?t.g.position.clone().sub(player.position).setY(0).normalize():new V(Math.cos(i*2.4),0,Math.sin(i*2.4));
   const ob=spawnMesh(geos.shard,mats.core,player.position);applyProjectileScale(ob,.7,.7,.7);
   bolts.push({kind:'debris',ob,dir,life:S.debrisLife});
  }
 }
 // Frost + gravity: a cold well pulls, freezes whoever it held long enough, then shatters by that count.
 function updateColdWells(dt){
  for(const w of coldWells){
   w.hold-=dt;w.tick-=dt;
   const inside=near(w.pos,S.radius+.8).filter(e=>!e.dead&&flat(e.g.position,w.pos)<S.radius+bossReach(e,0,.4));
   for(const e of inside){
    if(!immovable(e)){
     const pull=w.pos.clone().sub(e.g.position).setY(0),d=pull.length();
     if(d>.35){e.g.position.addScaledVector(pull.normalize(),Math.min(d-.35,S.pull*dt));constrain(e.g.position,.65);}
     const held=(w.held.get(e)||0)+dt;w.held.set(e,held);
     if(held>=S.freezeAfter&&!w.frozen.has(e)){w.frozen.add(e);fx.pulse(e.g.position,'frost',.6,.3);}
    }
    e.slow=Math.max(e.slow||0,w.frozen.has(e)?S.slow*1.5:S.slow*.5);
   }
   if(w.tick<=0){w.tick=S.tickEvery;fx.flame(w.pos,'frost',8,S.radius*.3);for(const e of inside)support(e,S.damage,{kind:'coldwell',indirect:true,phase:'tick',direction:e.g.position.clone().sub(w.pos).setY(0).normalize()});}
   if(w.hold<=0){
    const frozen=[...w.frozen].filter(e=>!e.dead).length,blast=S.shatter*(1+S.frozenGain*frozen);
    fx.explosion(w.pos,'frost',S.radius,frozen>=2);sound('frostHit');
    for(const e of near(w.pos,S.radius+.8))if(!e.dead&&flat(e.g.position,w.pos)<S.radius+bossReach(e,0,.5))support(e,blast*(w.frozen.has(e)?1.4:1),{kind:'coldwell',indirect:true,phase:'shatter',direction:e.g.position.clone().sub(w.pos).setY(0).normalize()});
   }
  }
  coldWells=coldWells.filter(w=>w.hold>0);
 }
 // Frost + split: the bud breaks into frost petals; three petals on one enemy bloom into frost.
 function rimeBloom(first,dir){
  support(first,S.damage,{kind:'rimepetal',direction:dir.clone()});first.slow=Math.max(first.slow||0,S.slow);
  fx.split(first.g.position,dir,Math.min(5,S.petals));
  for(let i=0;i<S.petals;i++){
   if(count('rimeshard')>=36)break;
   const a=(i-(S.petals-1)/2)*(Math.PI*1.2/Math.max(1,S.petals-1));
   const ob=spawnMesh(geos.starPetal,mats.ice,first.g.position);ob.rotation.x=-Math.PI/2;applyProjectileScale(ob,.6,.6,.6);
   bolts.push({kind:'rimeshard',ob,dir:dir.clone().applyAxisAngle(Y,a),life:S.petalLife,passed:new Set([first])});
  }
 }
 function frostStack(e,dir){
  const now=markClock,list=(petalStacks.get(e)||[]).filter(t=>now-t<1.5);list.push(now);petalStacks.set(e,list);
  if(list.length<S.bloomStacks)return;
  petalStacks.delete(e);fx.explosion(e.g.position,'frost',.9,true);sound('frostHit');
  support(e,S.bloomDamage,{kind:'rimepetal',indirect:true,phase:'bloom',direction:dir.clone()});
  if(!immovable(e))e.slow=Math.max(e.slow||0,S.slow*2);
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
 // Reflect + gravity: the wall is part of the weapon. Every rebound tugs
 // ordinary enemies toward the lens; the last one compresses into a blast.
 function gravityPulse(pos){
  fx.pulse(pos,'gravity',S.pullRadius,.32);sound('gravityHit');
  for(const e of near(pos,S.pullRadius)){
   if(e.dead||immovable(e))continue;
   const pull=pos.clone().sub(e.g.position).setY(0),distance=pull.length();
   if(distance>.08){e.g.position.addScaledVector(pull.normalize(),Math.min(distance,Math.max(.25,S.pull*.12)));constrain(e.g.position,.65);}
  }
 }
 function gravityDetonate(pos,multiplier=1){
  fx.explosion(pos,'gravity',S.blastRadius,true);sound('burstHit');
  for(const e of near(pos,S.blastRadius+.8))if(!e.dead&&flat(e.g.position,pos)<S.blastRadius+bossReach(e,0,.55))support(e,S.blast*multiplier,{kind:'gravitymirror',indirect:true,direction:e.g.position.clone().sub(pos).setY(0).normalize()});
 }
 // Chain + burst: unlike ordinary chain support, the route is deliberate and
 // only the final node explodes. Spacing therefore changes the best target.
 function chainBurst(pos,first=null){
  let target=first||nearestEnemy(pos,S.reach,new Set(),true);if(!target)return;
  const touched=new Set();let from={g:{position:pos}},damage=S.damage,last=null;
  for(let jump=0;target&&jump<=S.jumps;jump++){
   touched.add(target);fx.arc(from.g.position,target.g.position);support(target,damage,{kind:'chainburst',indirect:true,direction:target.g.position.clone().sub(from.g.position).setY(0).normalize()});
   last=target;from=target;damage*=S.decay;target=nearestEnemy(from.g.position,S.range,touched,true);
  }
  if(!last)return;fx.explosion(last.g.position,'burst',S.finishRadius,true);sound('burstHit');
  for(const e of near(last.g.position,S.finishRadius+.8))if(!e.dead&&flat(e.g.position,last.g.position)<S.finishRadius+bossReach(e,0,.5))support(e,S.finish,{kind:'chainburst',indirect:true,direction:e.g.position.clone().sub(last.g.position).setY(0).normalize()});
 }
 // Chain + gravity: the chain must earn its anchor by linking at least three
 // living enemies. The delayed center gives the player time to aim a second
 // attack into the gathered pack without adding an unbounded physics field.
 function stormAnchor(pos,first=null,force=false){
  let target=first||nearestEnemy(pos,S.reach,new Set(),true);if(!target)return;
  const touched=new Set();let from={g:{position:pos}},damage=S.damage;
  for(let jump=0;target&&jump<=S.jumps;jump++){
   touched.add(target);fx.arc(from.g.position,target.g.position);support(target,damage,{kind:'stormanchor',phase:'chain',indirect:true,direction:target.g.position.clone().sub(from.g.position).setY(0).normalize()});
   from=target;damage*=S.decay;target=nearestEnemy(from.g.position,S.range,touched,true);
  }
  if(touched.size<S.minLinks&&!force)return;
  const center=new V();for(const e of touched)center.add(e.g.position);center.multiplyScalar(1/touched.size).setY(0);
  for(const e of near(center,S.finishRadius+1)){
   if(e.dead||immovable(e))continue;
   const pull=center.clone().sub(e.g.position).setY(0),distance=pull.length();
   if(distance>.08){e.g.position.addScaledVector(pull.normalize(),Math.min(distance,S.pull));constrain(e.g.position,.65);}
  }
  if(storms.length>=6)storms.shift();storms.push({pos:center,delay:.34,damage:S.finish,radius:S.finishRadius});
  fx.pulse(center,'gravity',S.finishRadius,.34);sound('gravityHit');
 }
 // Pierce + burst: every body crossed adds charge to the endpoint explosion.
 // It is hitscan and allocation bounded, so the spectacle does not add a new
 // late-game projectile swarm.
 function blastLance(pos,dir){
  const start=pos.clone().setY(0),end=start.clone();
  for(let travelled=0;travelled<S.length;travelled+=.4){const next=end.clone().addScaledVector(dir,.4),probe=dir.clone();if(blocked(end,next)||boundary(end.clone(),next,probe))break;end.copy(next);}
  const line=enemies().filter(e=>!e.dead&&segmentDistance(start,end,e.g.position)<bossReach(e,.72,1.2)).sort((a,b)=>a.g.position.clone().sub(start).dot(dir)-b.g.position.clone().sub(start).dot(dir));
  let struck=0;for(const e of line){if(struck>=S.pierce)break;if(!support(e,S.damage*(1+S.ramp*struck),{kind:'blastlance',direction:dir.clone()})){end.copy(e.g.position).setY(0);break;}struck++;}
  for(let d=0;d<flat(start,end);d+=1.25)fx.trail(start.clone().addScaledVector(dir,d).setY(.7),start.clone().addScaledVector(dir,Math.min(flat(start,end),d+1.25)).setY(.7),d%2.5<1.25?'pierce':'burst',false);
  const radius=Math.min(S.blastRadius+.9,S.blastRadius+struck*.12),power=S.blast*(1+Math.min(1,struck*.12));fx.explosion(end,'burst',radius,true);sound('burstHit');
  for(const e of near(end,radius+.8))if(!e.dead&&flat(e.g.position,end)<radius+bossReach(e,0,.55))support(e,power,{kind:'blastlance',indirect:true,direction:e.g.position.clone().sub(end).setY(0).normalize()});
 }
 // Pierce + gravity: a narrow shot only earns its heavy implosion when the
 // struck target is alone. Crowds split the field and leave only the modest
 // line damage, making this a deliberate guardian/boss finisher.
 function gravityStakeAttack(pos,dir,{force=false}={}){
  const start=pos.clone().setY(0),end=start.clone();
  for(let travelled=0;travelled<S.length;travelled+=.4){const next=end.clone().addScaledVector(dir,.4),probe=dir.clone();if(blocked(end,next)||boundary(end.clone(),next,probe))break;end.copy(next);}
  const line=enemies().filter(e=>!e.dead&&segmentDistance(start,end,e.g.position)<bossReach(e,.52,1.05)).sort((a,b)=>a.g.position.clone().sub(start).dot(dir)-b.g.position.clone().sub(start).dot(dir));
  const struck=[];for(const e of line){if(struck.length>=S.pierce)break;if(!support(e,S.damage,{kind:'gravitystake',phase:'line',direction:dir.clone()})){end.copy(e.g.position).setY(0);break;}struck.push(e);}
  for(let d=0;d<flat(start,end);d+=1.5)fx.trail(start.clone().addScaledVector(dir,d).setY(.7),start.clone().addScaledVector(dir,Math.min(flat(start,end),d+1.5)).setY(.7),'gravity',false);
  const target=force?struck[0]:struck.length===1?struck[0]:null,isolated=target&&!enemies().some(e=>e!==target&&!e.dead&&flat(e.g.position,target.g.position)<S.isolation);
  if(!target||(!isolated&&!force)||target.dead){fx.pulse(end,'pierce',.45,.18);return;}
  const count=Math.min(S.implosions,S.stakes-stakes.length);
  for(let i=0;i<count;i++){
   const ob=spawnMesh(geos.gravityStake,mats.lens,target.g.position,1.05);ob.rotation.y=i*Math.PI*.5;applyProjectileScale(ob,.92,.92,.92);
   stakes.push({target,ob,delay:S.delay+i*.16,damage:S.implosion,last:target.g.position.clone().setY(0)});
  }
  fx.pulse(target.g.position,'gravity',.9,.3);sound('gravityHit');
 }
 // Split + chain: the first impact opens several petals. Each petal claims a
 // different nearby enemy, then sends one short arc onward. Sparse fights
 // deliberately waste most of the weapon's budget.
 function lightningBloom(first,direction){
  if(!support(first,S.damage,{kind:'lightningpetal',direction:direction.clone()}))return;
  const touched=new Set([first]),petals=enemies().filter(e=>!e.dead&&!touched.has(e)&&flat(e.g.position,first.g.position)<S.range&&!blocked(first.g.position.clone().setY(0),e.g.position.clone().setY(0))).sort((a,b)=>flat(a.g.position,first.g.position)-flat(b.g.position,first.g.position)).slice(0,S.petals);
  fx.split(first.g.position,direction,Math.min(5,S.petals));sound('split');
  for(const petal of petals){
   touched.add(petal);fx.trail(first.g.position.clone().setY(.7),petal.g.position.clone().setY(.7),'split',true);fx.arc(first.g.position,petal.g.position);
   support(petal,S.petalDamage,{kind:'lightningpetal',indirect:true,direction:petal.g.position.clone().sub(first.g.position).setY(0).normalize()});
   const next=nearestEnemy(petal.g.position,S.chainRange,touched,true);if(!next)continue;
   touched.add(next);fx.arc(petal.g.position,next.g.position);support(next,S.chainDamage,{kind:'lightningpetal',indirect:true,direction:next.g.position.clone().sub(petal.g.position).setY(0).normalize()});
  }
 }
 function returnFlareBurst(pos,damage,radius,phase){
  fx.explosion(pos,'burst',radius,true);fx.pulse(pos,phase==='home'?'recall':'burst',radius,.32);sound('burstHit');
  for(const e of near(pos,radius+.8))if(!e.dead&&flat(e.g.position,pos)<radius+bossReach(e,0,.5))support(e,damage,{kind:'returnflare',phase,indirect:true,direction:e.g.position.clone().sub(pos).setY(0).normalize()});
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
  if(active==='halobloom'){
   // 만개한 뒤 고리가 다시 자라는 동안에도 시계는 돈다.
   S.charge=Math.min(1,haloCuts/Math.max(1,S.bloomAt));
   if(haloRegrow>0){haloRegrow-=dt;if(haloRegrow<=0){orbit.visible=orbit.children.length>0;fx.pulse(player.position,'split',S.radius,.3);}}
  }
  if(!orbit.visible)return;
  const spin=active==='frostguard'?3.4:active==='stormcrown'?2.4:active==='starring'?2.2:active==='comethalo'?3.1:2.8;
  if(active==='comethalo'){
   const moved=flat(player.position,lastPlayerPosition);lastPlayerPosition.copy(player.position);
   movementCharge=THREE.MathUtils.clamp(movementCharge+moved*S.chargeGain-dt*S.chargeDecay,0,1);
  }
  breathe+=dt;
  angle+=dt*spin;
  // 밀물 고리: 닻이 씨앗을 천천히 뒤따른다. 가까이 붙으면(멈춤) 고리가 오므라들고 약해진다.
  let center=player.position;
  if(active==='ebbring'){
   if(!ebbReady){ebbAnchor.copy(player.position).setY(0);ebbReady=true;}
   const gap=player.position.clone().sub(ebbAnchor).setY(0),d=gap.length();
   if(d>1e-4)ebbAnchor.addScaledVector(gap.normalize(),Math.min(d,S.ebb*dt));
   S.calm=flat(ebbAnchor,player.position)<S.stretch;center=ebbAnchor;
  }
  orbit.children.forEach((ob,i)=>{
   const pose=orbitPose(active,i,orbit.children.length,angle,breathe,S);
   ob.position.set(center.x+pose.x,pose.y,center.z+pose.z);
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
   }else if(active==='spearring'){
    ob.visible=!(spearGone[i]>0);
    if(ob.visible)for(const e of enemies())if(!e.dead&&!cooldowns.has(e)&&flat(ob.position,e.g.position)<bossReach(e,.8,1.3)){
     cooldowns.set(e,S.cooldown);support(e,S.damage,{kind:'spearring',indirect:true,direction:e.g.position.clone().sub(player.position).setY(0).normalize()});
    }
   }else if(active==='accretiondisk'){
    // 적 탄(문지기·보스 탄 제외)을 끌어와 부스러기로 삼는다.
    for(const q of enemyShots())if(q.life>0&&!q.boss&&flat(q.ob.position,ob.position)<S.catchRadius&&debris<S.capacity){q.life=0;q.struck=true;debris++;fx.burst(q.ob.position,'gravity',6);}
    for(const e of enemies())if(!e.dead&&!cooldowns.has(e)&&flat(ob.position,e.g.position)<bossReach(e,.85,1.35)){
     cooldowns.set(e,S.cooldown);
     if(support(e,S.damage,{kind:'accretiondisk',indirect:true,direction:e.g.position.clone().sub(player.position).setY(0).normalize()})&&debris<S.capacity)debris++;
     if(!immovable(e)&&!e.dead){const pull=ob.position.clone().sub(e.g.position).setY(0);if(pull.length()>.3){e.g.position.addScaledVector(pull.normalize(),S.pull*.2);constrain(e.g.position,.65);}}
    }
   }else if(active==='ebbring'){
    for(const e of enemies())if(!e.dead&&!cooldowns.has(e)&&flat(ob.position,e.g.position)<bossReach(e,.8,1.3)){
     cooldowns.set(e,S.cooldown);
     support(e,S.damage*(S.calm?S.calmScale:1),{kind:'ebbring',indirect:true,direction:e.g.position.clone().sub(center).setY(0).normalize()});fx.pulse(e.g.position,'recall',.4,.18);
    }
   }else if(active==='halobloom'){
    for(const e of enemies())if(!e.dead&&!cooldowns.has(e)&&flat(ob.position,e.g.position)<bossReach(e,.8,1.3)){
     cooldowns.set(e,S.cooldown);
     if(support(e,S.damage,{kind:'halobloom',indirect:true,direction:e.g.position.clone().sub(player.position).setY(0).normalize()})){haloCuts++;fx.pulse(e.g.position,'split',.42,.18);}
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
  if(active==='halobloom'&&haloRegrow<=0&&haloCuts>=S.bloomAt)bloomBurst(player.position);
  if(active==='spearring'){
   for(let i=0;i<spearGone.length;i++)if(spearGone[i]>0)spearGone[i]-=dt;
   spearClock-=dt;
   if(spearClock<=0){
    const target=nearestEnemy(player.position,S.length,new Set(),true);
    const slot=orbit.children.findIndex((ob,i)=>!(spearGone[i]>0));
    if(target&&slot>=0){spearGone[slot]=S.regrow;spearLaunch(target);spearClock=S.launchEvery;}else spearClock=.2;
   }
  }
  if(active==='accretiondisk'){S.fill=debris/Math.max(1,S.capacity);if(debris>=S.capacity)ventDebris();}
  if(active==='comethalo'){
   pulseTimer-=dt;if(pulseTimer>0||movementCharge<S.chargeCost)return;pulseTimer=S.pulse;
   let launched=0;const ordered=Array.from({length:orbit.children.length},(_,i)=>orbit.children[(cometCursor+i)%orbit.children.length]);
   for(const ob of ordered){
    if(launched>=2)break;
    const target=nearestEnemy(ob.position,S.range,new Set(),true);if(!target||count('comethalo')>=S.bolts)continue;
    const dir=target.g.position.clone().sub(ob.position).setY(0).normalize(),shot=spawnMesh(geos.cometBud,mats.storm,ob.position);shot.rotation.x=-Math.PI/2;applyProjectileScale(shot,.86,.86,.86);
    bolts.push({kind:'comethalo',ob:shot,dir,life:S.life,damage:S.damage,blast:S.blast,blastRadius:S.blastRadius,speed:S.speed});launched++;
   }
   if(launched){cometCursor=(cometCursor+launched)%orbit.children.length;movementCharge=Math.max(0,movementCharge-S.chargeCost*launched);fx.pulse(player.position,'orbit',1.5,.2);}
   return;
  }
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
  if(frostLines.length)updateFrostLines(dt);
  if(gardens.length)updateGardens(dt);
  if(coldWells.length)updateColdWells(dt);
  if(active==='rewindbolt'&&rewindMemories.length)updateRewind(dt);
  for(const b of bolts){
   b.life-=dt;
   if(b.life<=0)continue;
   const previous=previousPosition.copy(b.ob.position);
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
    const probe=b.dir.clone(),panel=b.laws.includes('reflect')&&reflector(beforeMove,b.ob.position,probe),wall=panel||boundary(beforeMove,b.ob.position,probe),cover=!wall&&blocked(beforeMove,b.ob.position);
    if(wall)b.dir.copy(probe);
    if(cover){b.ob.position.copy(beforeMove);b.dir.negate();}
    if(wall||cover){if(b.bounces>0&&!b.returning){b.bounces--;b.passed.clear();fx.reflect(b.ob.position,b.dir);sound('reflect');}else if(b.laws.includes('recall')&&!b.returning){b.returning=true;b.passed.clear();}else b.life=0;}
    if(b.life<=0)continue;
    const direction=b.dir.clone(),targets=near(b.ob.position,1.8).filter(e=>!e.dead&&!b.passed.has(e)&&segmentDistance(beforeMove,b.ob.position,e.g.position)<bossReach(e,.68,1.15));
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
     if(!b.fragment&&b.split>0){fx.split(e.g.position,direction,Math.min(5,b.split));sound('split');for(let i=0;i<b.split&&count('gene')<36;i++){const d=direction.clone().applyAxisAngle(Y,(i-(b.split-1)/2)*.34),ob=spawnMesh(comboGeo||geos.gene,mats.gene,e.g.position);applyProjectileScale(ob,.65,.65,.65);bolts.push({kind:'gene',form:b.form,laws:b.laws.filter(id=>id!=='split'),secondRole:null,ob,dir:d,age:0,life:.55,passed:new Set([e]),bounces:0,pierce:1,split:0,portalDistance:0,portaled:true,returning:false,fragment:true});}}
     b.pierce--;if(b.pierce<=0){b.life=0;break;}
    }
    fx.trail(previous,b.ob.position,b.laws.includes('portal')?'portal':b.laws[0],b.fragment);continue;
   }
   if(b.kind==='comethalo'){
    b.ob.position.addScaledVector(b.dir,dt*b.speed);b.ob.rotation.y+=dt*12;b.ob.rotation.z+=dt*7;
    if(boundary(previous,b.ob.position,b.dir)||blocked(previous,b.ob.position)){b.life=0;continue;}
    const target=near(b.ob.position,1.8).find(e=>!e.dead&&segmentDistance(previous,b.ob.position,e.g.position)<bossReach(e,.68,1.16));
    if(target){
     const point=target.g.position.clone().setY(0);support(target,b.damage,{kind:'comethalo',phase:'comet',direction:b.dir.clone()});
     fx.explosion(point,'burst',b.blastRadius,true);sound('burstHit');
     for(const e of near(point,b.blastRadius+.8))if(!e.dead&&flat(e.g.position,point)<b.blastRadius+bossReach(e,0,.5))support(e,b.blast,{kind:'comethalo',phase:'corolla',indirect:true,direction:e.g.position.clone().sub(point).setY(0).normalize()});
     b.life=0;
    }
    fx.trail(previous,b.ob.position,'burst',false);continue;
   }
   if(b.kind==='returningpetals'){
    b.age+=dt;b.ob.position.addScaledVector(b.dir,dt*S.speed);b.ob.rotation.y+=dt*9;b.ob.rotation.z+=dt*5;
    const hitWall=boundary(previous,b.ob.position,b.dir)||blocked(previous,b.ob.position),arrived=flat(b.ob.position,b.to)<.4||b.age>=S.range/S.speed;
    if(hitWall)b.ob.position.copy(previous);
    if(hitWall||arrived){
     const origin=b.ob.position.clone(),claimed=new Set();fx.explosion(origin,'split',1.05,true);fx.split(origin,b.dir,Math.min(5,S.petals));sound('split');
     for(const e of near(origin,1.35))if(!e.dead&&flat(e.g.position,origin)<1.05+bossReach(e,0,.45))support(e,S.damage,{kind:'returningpetals',phase:'bloom',indirect:true,direction:e.g.position.clone().sub(origin).setY(0).normalize()});
     for(let i=0;i<S.petals&&count('returningpetal')<30;i++){
      const lane=S.petals===1?0:(i-(S.petals-1)/2)/(S.petals-1),toward=player.position.clone().sub(origin).setY(0).normalize().applyAxisAngle(Y,lane*.82),ob=spawnMesh(geos.returnPetal,mats.blade,origin);ob.rotation.x=-Math.PI/2;applyProjectileScale(ob,.7,.7,.7);
      bolts.push({kind:'returningpetal',ob,dir:toward,lane,claimed,passed:new Set(),hits:0,life:Math.min(2.3,S.life)});
     }
     b.life=0;continue;
    }
    fx.trail(previous,b.ob.position,'split',false);continue;
   }
   if(b.kind==='returningpetal'){
    const toSeed=player.position.clone().sub(b.ob.position).setY(0),distance=toSeed.length();if(distance<.55){b.life=0;continue;}
    const desired=toSeed.normalize(),side=new V(-desired.z,0,desired.x).multiplyScalar(b.lane*Math.min(1,distance/4));desired.add(side).normalize();
    b.dir.lerp(desired,Math.min(1,dt*S.steer)).normalize();b.ob.position.addScaledVector(b.dir,dt*S.speed*1.08);b.ob.rotation.y+=dt*12;b.ob.rotation.z+=dt*7;
    if(boundary(previous,b.ob.position,b.dir)||blocked(previous,b.ob.position)){b.life=0;continue;}
    const targets=near(b.ob.position,1.8).filter(e=>!e.dead&&!b.passed.has(e)&&(!b.claimed.has(e)||immovable(e))&&segmentDistance(previous,b.ob.position,e.g.position)<bossReach(e,.62,1.12));
    for(const e of targets){if(b.hits>=S.hitsPerLeg)break;b.passed.add(e);if(!immovable(e))b.claimed.add(e);b.hits++;if(!support(e,S.petalDamage,{kind:'returningpetals',phase:'return',indirect:true,direction:b.dir.clone()})){b.life=0;break;}}
    fx.trail(previous,b.ob.position,'recall',true);continue;
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
      const targets=near(b.ob.position,1.8).filter(e=>!e.dead&&!b.hitSet.has(e)&&segmentDistance(previous,b.ob.position,e.g.position)<bossReach(e,.72,1.25));
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
    if(b.kind==='frostkaleidoscope'){
     b.ob.position.addScaledVector(b.dir,dt*S.speed);b.ob.rotation.y+=dt*11;b.ob.rotation.z-=dt*4;
     const wall=reflector(previous,b.ob.position,b.dir)||boundary(previous,b.ob.position,b.dir),cover=!wall&&blocked(previous,b.ob.position);
     if(cover){b.ob.position.copy(previous);b.dir.negate();}
     if(wall||cover){if(b.bounces>=S.bounces){b.life=0;continue;}b.bounces++;b.passed.clear();fx.reflect(b.ob.position,b.dir);fx.pulse(b.ob.position,'frost',.45+.08*b.bounces,.18);sound('reflect');}
     const direction=b.dir.clone(),e=near(b.ob.position,1.8).find(x=>!x.dead&&!b.passed.has(x)&&segmentDistance(previous,b.ob.position,x.g.position)<bossReach(x,.68,1.15));
     if(e){
      b.passed.add(e);const charged=b.bounces>=S.shatterBounces,landed=support(e,S.damage*(1+S.gain*b.bounces),{kind:'frostkaleidoscope',direction});
      if(!landed){b.life=0;continue;}e.slow=Math.max(e.slow||0,S.slow);
      if(charged){fx.explosion(e.g.position,'frost',1.25,true);sound('frostHit');support(e,S.shatter*(1+.12*(b.bounces-S.shatterBounces)),{kind:'frostkaleidoscope',indirect:true,phase:'shatter',direction});for(const other of near(e.g.position,1.7))if(other!==e&&!other.dead&&flat(other.g.position,e.g.position)<1.35+bossReach(other,0,.35)){support(other,S.shatter*.35,{kind:'frostkaleidoscope',indirect:true,phase:'shatter',direction:other.g.position.clone().sub(e.g.position).setY(0).normalize()});other.slow=Math.max(other.slow||0,S.slow*.7);}b.life=0;}
     }
     fx.trail(previous,b.ob.position,'frost',b.bounces>0);continue;
    }
    if(b.kind==='gravitymirror'){
     b.ob.position.addScaledVector(b.dir,dt*S.speed);b.ob.rotation.y+=dt*9;b.ob.rotation.z+=dt*5;
     const wall=reflector(previous,b.ob.position,b.dir)||boundary(previous,b.ob.position,b.dir),cover=!wall&&blocked(previous,b.ob.position);
     if(cover){b.ob.position.copy(previous);b.dir.negate();}
     if(wall||cover){gravityPulse(b.ob.position);b.passed.clear();if(++b.bounces>=S.bounces){gravityDetonate(b.ob.position);b.life=0;continue;}fx.reflect(b.ob.position,b.dir);sound('reflect');}
     const direction=b.dir.clone(),e=near(b.ob.position,1.8).find(x=>!x.dead&&!b.passed.has(x)&&segmentDistance(previous,b.ob.position,x.g.position)<bossReach(x,.68,1.15));
     if(e){b.passed.add(e);if(!support(e,S.damage,{kind:'gravitymirror',direction}))b.life=0;}
     fx.trail(previous,b.ob.position,'gravity',b.bounces>0);continue;
    }
    if(b.kind==='prism'){
     b.ob.position.addScaledVector(b.dir,dt*S.speed);b.ob.rotation.y+=dt*12;
     const wall=reflector(previous,b.ob.position,b.dir)||boundary(previous,b.ob.position,b.dir);
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
    const e=near(b.ob.position,1.8).find(x=>!x.dead&&!b.passed.has(x)&&segmentDistance(previous,b.ob.position,x.g.position)<bossReach(x,.7,1.2));
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
   fx.trail(previous,b.ob.position,'frost',false);
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
     const wall=reflector(previous,b.ob.position,b.dir)||boundary(previous,b.ob.position,b.dir);
    const cover=!wall&&blocked(previous,b.ob.position);
    if(cover){b.ob.position.copy(previous);b.dir.negate();}
    if(wall||cover){
     if(b.bounces>=S.bounces){b.life=0;continue;}
     b.bounces++;b.speed=Math.min(24,b.speed*1.08);b.passed.clear();fx.reflect(b.ob.position,b.dir);
    }
    const e=near(b.ob.position,1.8).find(x=>!x.dead&&!b.passed.has(x)&&segmentDistance(previous,b.ob.position,x.g.position)<bossReach(x,.7,1.2));
    if(e){b.passed.add(e);if(!support(e,S.damage*(1+S.gain*b.bounces),{kind:'mirrormaze',direction:b.dir.clone()}))b.life=0;}
    fx.trail(previous,b.ob.position,'reflect',b.bounces>0);
    continue;
   }
   if(b.kind==='fullbloom'||b.kind==='petal'){
    const petalKind=b.kind==='petal';
    b.ob.position.addScaledVector(b.dir,dt*(petalKind?10:S.speed));b.ob.rotation.y+=dt*8;
    if(boundary(previous,b.ob.position,b.dir.clone())||blocked(previous,b.ob.position)){b.life=0;continue;}
    const e=near(b.ob.position,1.8).find(x=>!x.dead&&x!==b.skip&&segmentDistance(previous,b.ob.position,x.g.position)<bossReach(x,.62,1.15));
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
   if(b.kind==='rimeback'){
    b.age+=dt;
    if(!b.returning&&b.age>S.outTime){b.returning=true;b.hitSet.clear();fx.pulse(b.ob.position,'frost',.4,.2);}
    if(b.returning){b.dir.copy(player.position).sub(b.ob.position).setY(0).normalize();if(flat(b.ob.position,player.position)<.5){b.life=0;continue;}}
    const direction=b.dir.clone();b.ob.position.addScaledVector(b.dir,dt*(b.returning?S.returnSpeed:S.speed));b.ob.rotation.y+=dt*10;
    if(boundary(previous,b.ob.position,b.dir.clone())||blocked(previous,b.ob.position)){b.ob.position.copy(previous);if(!b.returning){b.returning=true;b.hitSet.clear();}}
    for(const e of near(b.ob.position,1.8)){
     if(e.dead||b.hitSet.has(e)||segmentDistance(previous,b.ob.position,e.g.position)>=bossReach(e,.7,1.2))continue;
     b.hitSet.add(e);
     const marked=(rimeMarks.get(e)||0)>markClock;
     if(!support(e,S.damage,{kind:'rimeback',direction}))continue;
     if(!b.returning){rimeMarks.set(e,markClock+S.mark);e.slow=Math.max(e.slow||0,S.slow);continue;}
     // 돌아오는 길에 자기가 얼린 적을 만나면 깨뜨린다.
     if(marked){rimeMarks.delete(e);fx.explosion(e.g.position,'frost',S.shatterRadius,true);sound('frostHit');
      for(const o of near(e.g.position,S.shatterRadius+.8))if(!o.dead&&flat(o.g.position,e.g.position)<S.shatterRadius+bossReach(o,0,.4))support(o,o===e?S.shatter:S.shatter*.3,{kind:'rimeback',indirect:true,phase:'shatter',direction:o.g.position.clone().sub(e.g.position).setY(0).normalize()});}
    }
    fx.trail(previous,b.ob.position,'frost',b.returning);continue;
   }
   if(b.kind==='coldwell'){
    b.t+=dt;const k=Math.min(1,b.t/S.flight);
    b.ob.position.lerpVectors(b.from,b.to,k).setY(.7+Math.sin(Math.PI*k)*2);b.ob.rotation.y+=dt*6;
    fx.trail(previous,b.ob.position,'frost',false);
    if(k<1)continue;
    b.life=0;coldWells.push({pos:b.to.clone(),hold:S.hold,tick:0,held:new Map(),frozen:new Set()});while(coldWells.length>S.wells+1)coldWells.shift();
    fx.pulse(b.to,'frost',S.radius,.5);continue;
   }
   if(b.kind==='rimepetal'){
    b.ob.position.addScaledVector(b.dir,dt*S.speed);b.ob.rotation.y+=dt*8;
    if(boundary(previous,b.ob.position,b.dir.clone())||blocked(previous,b.ob.position)){b.life=0;continue;}
    const e=near(b.ob.position,1.8).find(x=>!x.dead&&segmentDistance(previous,b.ob.position,x.g.position)<bossReach(x,.66,1.16));
    if(e){b.life=0;rimeBloom(e,b.dir);}
    fx.trail(previous,b.ob.position,'frost',false);continue;
   }
   if(b.kind==='rimeshard'){
    b.ob.position.addScaledVector(b.dir,dt*S.speed*.9);b.ob.rotation.y+=dt*9;
    const e=near(b.ob.position,1.4).find(x=>!x.dead&&!b.passed.has(x)&&segmentDistance(previous,b.ob.position,x.g.position)<bossReach(x,.62,1.1));
    if(e){b.passed.add(e);if(support(e,S.petalDamage,{kind:'rimepetal',phase:'petal',direction:b.dir.clone()})){e.slow=Math.max(e.slow||0,S.slow);frostStack(e,b.dir);}b.life=0;}
    fx.trail(previous,b.ob.position,'frost',true);continue;
   }
   if(b.kind==='echolane'){
    // 벽에 닿으면 씨앗에게로, 씨앗을 스치면 다시 벽으로. 오갈 때마다 세진다.
    if(b.toSeed){b.dir.copy(player.position).sub(b.ob.position).setY(0).normalize();if(flat(b.ob.position,player.position)<.7){if(b.pass>=S.passes){b.life=0;continue;}b.toSeed=false;b.pass++;b.passed.clear();b.dir.copy(b.out);fx.reflect(b.ob.position,b.dir);}}
    b.ob.position.addScaledVector(b.dir,dt*S.speed);b.ob.rotation.y+=dt*12;
    const wall=!b.toSeed&&(boundary(previous,b.ob.position,b.dir.clone())||blocked(previous,b.ob.position));
    if(wall){b.ob.position.copy(previous);if(b.pass>=S.passes){b.life=0;continue;}b.toSeed=true;b.pass++;b.passed.clear();fx.reflect(b.ob.position,b.dir);sound('reflect');}
    const e=near(b.ob.position,1.8).find(x=>!x.dead&&!b.passed.has(x)&&segmentDistance(previous,b.ob.position,x.g.position)<bossReach(x,.68,1.15));
    if(e){b.passed.add(e);if(!support(e,S.damage*(1+S.gain*b.pass),{kind:'echolane',direction:b.dir.clone()}))b.life=0;}
    fx.trail(previous,b.ob.position,'reflect',b.pass>0);continue;
   }
   if(b.kind==='debris'){
    b.ob.position.addScaledVector(b.dir,dt*S.debrisSpeed);b.ob.rotation.y+=dt*12;
    const e=near(b.ob.position,1.4).find(x=>!x.dead&&segmentDistance(previous,b.ob.position,x.g.position)<bossReach(x,.62,1.1));
    if(e){support(e,S.debrisDamage,{kind:'accretiondisk',phase:'debris',direction:b.dir.clone()});b.life=0;}
    fx.trail(previous,b.ob.position,'gravity',true);continue;
   }
   if(b.kind==='sunmirror'){
    b.ob.position.addScaledVector(b.dir,dt*S.speed);b.ob.rotation.z+=dt*(3+b.charge);
    applyProjectileScale(b.ob,1+.09*b.charge,1+.09*b.charge,1+.09*b.charge);
    // 부딪히는 적 탄(문지기·보스 탄 제외)을 빨아들여 빛을 모은다.
    if(b.charge<S.maxCharge)for(const q of enemyShots()){
     if(!(q.life>0)||q.boss||flat(q.ob.position,b.ob.position)>=S.absorb)continue;
     q.life=0;q.struck=true;b.charge++;fx.burst(q.ob.position,'burst',6);if(b.charge>=S.maxCharge)break;
    }
    const wall=boundary(previous,b.ob.position,b.dir.clone())||blocked(previous,b.ob.position);
    const e=near(b.ob.position,1.6).find(x=>!x.dead&&segmentDistance(previous,b.ob.position,x.g.position)<bossReach(x,.7,1.2));
    if(e)support(e,S.damage,{kind:'sunmirror',direction:b.dir.clone()});
    if(e||wall||b.life<=dt){
     b.life=0;const radius=S.radius+S.chargeRadius*b.charge,blast=S.blast*(1+S.chargeGain*b.charge),at=b.ob.position.clone().setY(0);
     fx.explosion(at,'burst',radius,b.charge>=3);sound('burstHit');
     for(const o of near(at,radius+.8))if(!o.dead&&flat(o.g.position,at)<radius+bossReach(o,0,.5))support(o,blast,{kind:'sunmirror',indirect:true,phase:'blast',direction:o.g.position.clone().sub(at).setY(0).normalize()});
     continue;
    }
    fx.trail(previous,b.ob.position,'burst',b.charge>0);continue;
   }
   if(b.kind==='showerpetal'){
    b.ob.position.addScaledVector(b.dir,dt*S.petalSpeed);b.ob.rotation.y+=dt*9;
    const e=near(b.ob.position,1.4).find(x=>!x.dead&&!b.passed.has(x)&&segmentDistance(previous,b.ob.position,x.g.position)<bossReach(x,.62,1.1));
    if(e){b.passed.add(e);support(e,S.petalDamage,{kind:'pierceshower',phase:'petal',direction:b.dir.clone()});b.life=0;}
    fx.trail(previous,b.ob.position,'split',true);continue;
   }
   if(b.kind==='pullgarden'){
    b.t+=dt;const k=Math.min(1,b.t/S.flight);
    b.ob.position.lerpVectors(b.from,b.to,k).setY(.7+Math.sin(Math.PI*k)*1.8);b.ob.rotation.y+=dt*6;
    fx.trail(previous,b.ob.position,'gravity',false);
    if(k<1)continue;
    b.life=0;fx.split(b.to,new V(0,0,1),Math.min(5,S.fields));plantGardens(b.to,S.fields);continue;
   }
   if(b.kind==='halobloom'){
    b.ob.position.addScaledVector(b.dir,dt*S.speed);b.ob.rotation.y+=dt*10;
    const direction=b.dir.clone();
    const e=near(b.ob.position,1.6).find(x=>!x.dead&&!b.passed.has(x)&&segmentDistance(previous,b.ob.position,x.g.position)<bossReach(x,.68,1.15));
    if(e){
     b.passed.add(e);
     const landed=support(e,b.gen?S.splitDamage:S.petalDamage,{kind:'halobloom',direction});
     b.life=0;
     // 첫 장만 한 번 갈라진다. 갈라진 꽃잎은 더 갈라지지 않는다.
     if(landed&&b.gen===0)for(const turn of [-.5,.5]){
      if(count('halobloom')>=40)break;
      const ob=spawnMesh(geos.haloPetal,mats.seed,b.ob.position);ob.rotation.x=-Math.PI/2;
      bolts.push({kind:'halobloom',ob,dir:b.dir.clone().applyAxisAngle(Y,turn),life:.5,gen:1,passed:new Set()});
     }
    }
    fx.trail(previous,b.ob.position,'split',b.gen>0);continue;
   }
   if(b.kind==='lightningpetal'){
    b.ob.position.addScaledVector(b.dir,dt*S.speed);b.ob.rotation.y+=dt*10;b.ob.rotation.z+=dt*5;
    if(boundary(previous,b.ob.position,b.dir.clone())||blocked(previous,b.ob.position)){b.life=0;continue;}
    const e=near(b.ob.position,1.8).find(x=>!x.dead&&segmentDistance(previous,b.ob.position,x.g.position)<bossReach(x,.66,1.16));
    if(e){b.life=0;lightningBloom(e,b.dir);}
    fx.trail(previous,b.ob.position,'chain',false);continue;
   }
   if(b.kind==='flarebloom'){
   b.t+=dt;const k=Math.min(1,b.t/S.flight);
   b.ob.position.lerpVectors(b.from,b.to,k).setY(.7+Math.sin(Math.PI*k)*2.4);b.ob.rotation.y+=dt*6;
   fx.trail(previous,b.ob.position,'burst',false);
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
    const targets=near(b.ob.position,1.8).filter(e=>!e.dead&&!b.hitSet.has(e)&&segmentDistance(previous,b.ob.position,e.g.position)<bossReach(e,.7,1.2));
    targets.sort((x,y)=>x.g.position.clone().sub(previous).dot(direction)-y.g.position.clone().sub(previous).dot(direction));
    for(const e of targets){
     if(b.hitSet.size>=S.hitsPerLeg)break;
     b.hitSet.add(e);
     if(!support(e,S.damage,{kind:'rewind',direction:direction.clone()})){b.returning=true;break;}
    }
    fx.trail(previous,b.ob.position,'recall',true);
    continue;
   }
   if(b.kind==='returnflare'){
    b.age+=dt;b.ob.rotation.y+=dt*8;b.ob.rotation.z+=dt*7;
    if(b.returning){
     b.dir.copy(player.position).sub(b.ob.position).setY(0).normalize();
     if(flat(b.ob.position,player.position)<.62){returnFlareBurst(b.ob.position,S.homeDamage,S.homeRadius,'home');b.life=0;continue;}
     b.ob.position.addScaledVector(b.dir,dt*S.speed);
     const direction=b.dir.clone(),targets=near(b.ob.position,1.8).filter(e=>!e.dead&&!b.returnHits.has(e)&&segmentDistance(previous,b.ob.position,e.g.position)<bossReach(e,.68,1.15));
     targets.sort((a,b)=>a.g.position.clone().sub(previous).dot(direction)-b.g.position.clone().sub(previous).dot(direction));
     for(const e of targets){b.returnHits.add(e);if(!support(e,S.returnDamage,{kind:'returnflare',phase:'return',direction:direction.clone()})){b.life=0;break;}}
     fx.trail(previous,b.ob.position,'recall',true);continue;
    }
    b.ob.position.addScaledVector(b.dir,dt*S.speed);
    const hitWall=boundary(previous,b.ob.position,b.dir.clone())||blocked(previous,b.ob.position),arrived=flat(b.ob.position,b.to)<.4||b.age>=S.range/S.speed;
    if(hitWall)b.ob.position.copy(previous);
    if(hitWall||arrived){returnFlareBurst(b.ob.position,S.damage,S.radius,'outbound');b.returning=true;b.returnHits.clear();fx.pulse(b.ob.position,'recall',.6,.22);}
    fx.trail(previous,b.ob.position,'burst',false);continue;
   }
   if(b.kind==='blackhole'){
    if(b.t<.5){b.t+=dt;const k=Math.min(1,b.t/.5);b.ob.position.lerpVectors(b.from,b.to,k).setY(.6);if(k<1)continue;fx.pulse(b.to,'gravity',S.radius,.5);}
    b.hold-=dt;b.ob.rotation.z+=dt*10;{const scale=.85+.25*Math.sin(b.hold*12);applyProjectileScale(b.ob,scale,scale,scale);}
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
    const e=near(b.ob.position,1.8).find(x=>!x.dead&&segmentDistance(previous,b.ob.position,x.g.position)<bossReach(x,seed?.6:.7,1.2));
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
  for(let i=stakes.length-1;i>=0;i--){
   const stake=stakes[i];stake.delay-=dt;if(!stake.target.dead){stake.last.copy(stake.target.g.position).setY(0);stake.ob.position.set(stake.last.x,1.05,stake.last.z);}stake.ob.rotation.z+=dt*9;
   const squeeze=.72+.28*Math.max(0,stake.delay/S.delay);applyProjectileScale(stake.ob,squeeze,squeeze,1.15);
   if(stake.delay>0)continue;
   fx.explosion(stake.last,'gravity',.9,true);fx.pulse(stake.last,'pierce',.7,.24);sound('gravityHit');
   if(!stake.target.dead)support(stake.target,stake.damage,{kind:'gravitystake',phase:'implosion',indirect:true,direction:stake.target.g.position.clone().sub(player.position).setY(0).normalize()});
   remove(stake);stakes.splice(i,1);
  }
  for(let i=storms.length-1;i>=0;i--){
   const storm=storms[i];storm.delay-=dt;if(storm.delay>0)continue;
   fx.explosion(storm.pos,'gravity',storm.radius,true);fx.pulse(storm.pos,'chain',storm.radius,.35);sound('burstHit');
   for(const e of near(storm.pos,storm.radius+.8))if(!e.dead&&flat(e.g.position,storm.pos)<storm.radius+bossReach(e,0,.5))support(e,storm.damage,{kind:'stormanchor',phase:'anchor',indirect:true,direction:e.g.position.clone().sub(storm.pos).setY(0).normalize()});
   storms.splice(i,1);
  }
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
  const OPENING_FX={collapse:'gravity',frostguard:'frost',returnblade:'recall',prism:'reflect',thunderlance:'chain',frostbloom:'frost',stormcrown:'chain',tidepull:'gravity',seedstorm:'split',mirrorguard:'reflect',gravitymirror:'gravity',chainburst:'burst',blastlance:'burst',frostkaleidoscope:'frost',lightningpetal:'chain',returnflare:'recall',comethalo:'orbit',stormanchor:'gravity',returningpetals:'recall',gravitystake:'gravity',icicle:'frost',halobloom:'split',frostnet:'frost',rewindbolt:'recall',refractlance:'pierce',thundermirror:'chain',sunmirror:'burst',pierceshower:'split',ebbring:'recall',pullgarden:'gravity',spearring:'pierce',accretiondisk:'gravity',rimeback:'frost',coldwell:'frost',rimepetal:'frost',echolane:'reflect',mirrormaze:'reflect',fullbloom:'split',thunderweb:'chain',starring:'orbit',glassspear:'pierce',flarebloom:'burst',rewind:'recall',blackhole:'gravity',winterbreath:'frost'};
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
    case 'gravitymirror':{
     // The ordinary shot needs a wall to earn its finish. Its signature instead
     // unfolds the kaleidoscope at once, so it still feels decisive in an open
     // arena without creating an unbounded projectile swarm.
     const spokes=around(6);for(const d of spokes)fire(pos,d,null,true);
     gravityDetonate(pos,2.7);for(const d of spokes){const focus=pos.clone().addScaledVector(d,3.1);gravityPulse(focus);gravityDetonate(focus,2.7);}
     break;
    }
    case 'chainburst':for(const e of nearest(4,S.reach))chainBurst(pos,e);break;
    case 'blastlance':for(const a of [-.52,-.26,0,.26,.52])blastLance(pos,dir.clone().applyAxisAngle(Y,a));break;
    case 'frostkaleidoscope':for(const d of around(8))fire(pos,d,null,true);break;
    case 'lightningpetal':for(const d of around(8))fire(pos,d,null,true);break;
    case 'returnflare':for(const d of around(4))fire(pos,d,pos.clone().addScaledVector(d,Math.min(7,S.range)),true);break;
    case 'comethalo':{
     movementCharge=1;
     for(const d of around(8)){
      const ob=spawnMesh(geos.cometBud,mats.storm,pos);ob.rotation.x=-Math.PI/2;applyProjectileScale(ob,.9,.9,.9);
      bolts.push({kind:'comethalo',ob,dir:d,life:S.life,damage:S.damage,blast:S.blast,blastRadius:S.blastRadius,speed:S.speed});
     }
     break;
    }
    case 'stormanchor':for(const e of nearest(4,S.reach))stormAnchor(pos,e,true);break;
    case 'returningpetals':for(const d of around(4))fire(pos,d,pos.clone().addScaledVector(d,Math.min(7,S.range)),true);break;
    case 'gravitystake':{
     const target=nearest(1,S.length)[0];if(target)gravityStakeAttack(pos,target.g.position.clone().sub(pos).setY(0).normalize(),{force:true});break;
    }
   case 'mirrormaze':for(const d of around(8))fire(pos,d,null,true);break;
   case 'fullbloom':for(const d of around(4))fire(pos,d,null,true);break;
   case 'glassspear':for(const d of around(6))fire(pos,d,null,true);break;
   case 'rewind':for(const d of around(4))fire(pos,d,null,true);break;
   case 'thunderweb':for(const e of nearest(3,S.reach))web(pos,e);break;
   case 'icicle':{const line=nearest(3,S.length);if(!line.length)icicleLance(pos,dir);for(const e of line)icicleLance(pos,e.g.position.clone().sub(pos).setY(0).normalize());break;}
   case 'frostnet':for(const e of nearest(3,S.reach))frostNet(pos,e);break;
   case 'rewindbolt':for(const e of nearest(2,S.reach))rewindNet(pos,e,true);break;
   case 'refractlance':for(const a of [-.5,-.25,0,.25,.5])refractLance(pos,dir.clone().applyAxisAngle(Y,a));break;
   case 'halobloom':{haloCuts=S.bloomAt;haloRegrow=0;bloomBurst(pos);break;}
   case 'thundermirror':for(const e of nearest(2,S.reach))thunderMirror(pos,e);break;
   case 'sunmirror':for(const d of around(6))fire(pos,d,null,true);break;
   case 'pierceshower':for(const a of [-.3,0,.3])pierceShower(pos,dir.clone().applyAxisAngle(Y,a));break;
   case 'ebbring':{
    // 밀려났던 고리가 한 번에 씨앗에게 몰려들며 둘레를 크게 벤다.
    ebbAnchor.copy(pos).setY(0);fx.pulse(pos,'recall',S.radius+1.2,.45);
    for(const e of enemies())if(!e.dead&&flat(e.g.position,pos)<S.radius+1.2+bossReach(e,.3,.8))support(e,S.damage*5,{kind:'ebbring',indirect:true,phase:'surge',direction:e.g.position.clone().sub(pos).setY(0).normalize()});
    break;
   }
   case 'spearring':{for(const e of nearest(3,S.length))spearLaunch(e);spearClock=S.launchEvery;break;}
   case 'accretiondisk':{debris=Math.max(debris,S.capacity*3);ventDebris();break;}
   case 'rimeback':for(const d of around(6))fire(pos,d,null,true);break;
   case 'coldwell':{const spots=nearest(2,S.range);if(!spots.length)spots.push({g:{position:pos.clone().addScaledVector(dir,3)}});for(const e of spots)coldWells.push({pos:e.g.position.clone().setY(0),hold:S.hold,tick:0,held:new Map(),frozen:new Set()});break;}
   case 'rimepetal':for(const e of nearest(2,10))rimeBloom(e,e.g.position.clone().sub(pos).setY(0).normalize());break;
   case 'echolane':for(const d of around(4))fire(pos,d,null,true);break;
   case 'pullgarden':{const spots=nearest(4,S.range);if(!spots.length)plantGardens(pos.clone().addScaledVector(dir,3).setY(0),S.fields);for(const e of spots)plantGardens(e.g.position.clone().setY(0),1);break;}
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
 return {set,setTheme,fire,update,clear,surge,calm,audioEvent:()=>projectileAudioEvent(sourceForm()),
  state:()=>({active,evolution:ownerId||statId,theme:themeId,twin,awakened:awakened(),awakenIn:awakened()?Math.max(0,awakenTimer):null,level,bolts:bolts.length,wells:wells.length,shatters:shatters.length,embers:embers.length,storms:storms.length,stakes:stakes.length,frostLines:frostLines.length,rewinds:rewindMemories.length,gardens:gardens.length,coldWells:coldWells.length,debris,spearsGone:spearGone.filter(t=>t>0).length,ebbCalm:active==='ebbring'?Boolean(S.calm):null,haloCuts,haloRegrow:Math.max(0,haloRegrow),charge:movementCharge,orbit:orbit.visible?orbit.children.length:0,hits,secondHits,secondPhase,surge:Math.max(0,surgeTime)}),
  dispose(){clear();for(const g of Object.values(geos))g.dispose();for(const m of new Set([...Object.values(mats),...awakenedMats.values()]))m.dispose();group.removeFromParent();}};
}
