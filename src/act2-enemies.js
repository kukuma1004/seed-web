import * as THREE from 'three';
const V=THREE.Vector3;

// Act 2 minions (first slice, 2026-09-16). Not recoloured act-1 enemies: each one changes how the fight is read.
//  포수 방패병 catcher · front shield, blocked shots are thrown back; turns slowly, so flanking and bouncing shots answer it.
//  투수 사수 pitcher  · a white line fills in front of it, then one fast straight ball; every third pitch curves.
//  주자 runner        · marks a base on the floor where the seed stands, sprints through it, then rests exposed
//                      (the resting 'recover' state already takes +35% in main.js; exposed adds a little more).
//  타자 batter        · swings at shots coming from the front and sends them back; piercing shots and evolutions get through.
// Art is borrowed from act 1 with a tint until the painted minions arrive (ACT2_ART).
export const ACT2_MINIONS=Object.freeze({
 catcher:Object.freeze({name:'포수 방패병',hp:150,speed:1.15,turn:1.3,keep:3.2,tell:.45,shove:.3,shoveSpeed:5,damage:14,recover:1,returnSpeed:7.5,returnDamage:10,returnEvery:.45}),
 pitcher:Object.freeze({name:'투수 사수',hp:70,near:6,far:8.5,windup:.75,line:9,ballSpeed:13,curveSpeed:10,curve:.9,damage:15,rest:1.3,curveEvery:3}),
 runner:Object.freeze({name:'주자',hp:60,jog:1.2,mark:.9,sprint:11,maxSprint:1.25,damage:18,rest:1.1,exposed:1.15,reach:9}),
 batter:Object.freeze({name:'타자',hp:110,near:3.5,far:5,batRange:1.7,batEvery:1.6,returnSpeed:9,returnDamage:12,tell:.35,swingRange:1.8,damage:18,recover:.8})
});
export const ACT2_MINION_TYPES=Object.freeze(Object.keys(ACT2_MINIONS));
export const isAct2Minion=type=>Object.hasOwn(ACT2_MINIONS,type);
export const ACT2_ART=Object.freeze({
 catcher:Object.freeze({file:'enemy-shield-v4.png',size:2.15,baseline:.06,tint:0xffa38f,ring:0xff6b55}),
 pitcher:Object.freeze({file:'enemy-caster-v4.png',size:2.1,baseline:.04,tint:0xffe08a,ring:0xfff1b8}),
 runner:Object.freeze({file:'enemy-hound-v4.png',size:1.45,baseline:.04,tint:0x8fe3ff,ring:0x7fd8ff}),
 batter:Object.freeze({file:'warden-hunter-v4.png',size:2.5,baseline:.02,tint:0xe7a6ff,ring:0xd78cff})
});

// Shared shapes; main.js adds them to its shared geometry set so releasing a minion never disposes them.
export const ACT2_GEOMETRIES=Object.freeze({
 ring:new THREE.RingGeometry(.78,.86,40).rotateX(-Math.PI/2).translate(0,.14,0),
 line:new THREE.PlaneGeometry(.5,1).rotateX(-Math.PI/2).translate(0,.135,.5),
 base:new THREE.RingGeometry(.38,.62,4).rotateX(-Math.PI/2).translate(0,.135,0),
 arc:new THREE.RingGeometry(.95,1.25,24,1,Math.PI/2-Math.PI/3,Math.PI*2/3).rotateX(-Math.PI/2).translate(0,.145,0)
});
const glow=(color,opacity)=>new THREE.MeshBasicMaterial({color,transparent:true,opacity,depthWrite:false,side:THREE.DoubleSide,forceSinglePass:true,toneMapped:false});
const flat=v=>{v.y=0;return v;};
const facingOf=e=>new V(Math.sin(e.g.rotation.y),0,Math.cos(e.g.rotation.y));
const turnToward=(e,dir,rate,dt)=>{const wanted=Math.atan2(dir.x,dir.z),diff=Math.atan2(Math.sin(wanted-e.g.rotation.y),Math.cos(wanted-e.g.rotation.y));e.g.rotation.y+=THREE.MathUtils.clamp(diff,-rate*dt,rate*dt);};

export function createAct2Minion(scene,type,random=Math.random){
 const spec=ACT2_MINIONS[type],art=ACT2_ART[type];
 const g=new THREE.Group(),body=new THREE.Group();g.add(body);scene.add(g);
 const e={g,body,type,hp:spec.hp,maxHp:spec.hp,state:'stalk',timer:.6+random()*.8,dir:new V(0,0,1),phase:random()*6,hit:0,slow:0,block:0,tint:art.tint,takenScale:1,pitches:0,cooldown:0};
 e.ring=new THREE.Mesh(ACT2_GEOMETRIES.ring,glow(art.ring,.22));g.add(e.ring);
 if(type==='catcher'||type==='batter'){e.arc=new THREE.Mesh(ACT2_GEOMETRIES.arc,glow(type==='catcher'?0xffc2a8:0xf2c2ff,.4));g.add(e.arc);e.arc.visible=type==='catcher';}
 if(type==='pitcher'){e.line=new THREE.Mesh(ACT2_GEOMETRIES.line,glow(0xffffff,.0));e.line.visible=false;g.add(e.line);}
 if(type==='runner'){e.world=new THREE.Group();scene.add(e.world);e.base=new THREE.Mesh(ACT2_GEOMETRIES.base,glow(0xffffff,.55));e.base.rotation.y=Math.PI/4;e.base.visible=false;e.world.add(e.base);e.basePos=new V();}
 return e;
}

// ctx: {player:Vector3, collide(pos,r), hit(amount), bolt(pos,dir,{speed,damage,curve}), blocked(a,b), shots(), batShot(shot,e), canBat(shot), random()}
export function tickAct2Minion(e,dt,time,ctx){
 const spec=ACT2_MINIONS[e.type];
 e.timer-=dt;e.hit=Math.max(0,e.hit-dt);e.block=Math.max(0,e.block-dt);e.cooldown=Math.max(0,e.cooldown-dt);
 const toPlayer=flat(ctx.player.clone().sub(e.g.position)),dist=toPlayer.length();if(dist>1e-6)toPlayer.divideScalar(dist);
 TICKS[e.type](e,spec,dt,time,ctx,toPlayer,dist);
 e.ring.material.opacity=e.state==='tell'||e.state==='windup'||e.state==='mark'?.45+Math.sin(time*20)*.25:.22;
 ctx.collide(e.g.position,e.type==='runner'?.5:.7);
}

function tickCatcher(e,s,dt,time,ctx,toPlayer,dist){
 if(e.state==='stalk'){
  turnToward(e,toPlayer,s.turn,dt);
  const face=facingOf(e);
  if(dist>s.keep+.4)e.g.position.addScaledVector(face,dt*s.speed);else if(dist<s.keep-.8)e.g.position.addScaledVector(face,-dt*s.speed*.6);
  if(e.timer<=0&&dist<2.3){e.state='tell';e.timer=s.tell;e.dir.copy(face);}
 }else if(e.state==='tell'){if(e.timer<=0){e.state='commit';e.timer=s.shove;}}
 else if(e.state==='commit'){e.g.position.addScaledVector(e.dir,dt*s.shoveSpeed);if(!e.struck&&dist<1.1){ctx.hit(s.damage);e.struck=true;}if(e.timer<=0){e.state='recover';e.timer=s.recover;e.struck=false;}}
 else if(e.timer<=0){e.state='stalk';e.timer=.9;}
 e.arc.visible=e.state!=='recover';e.arc.material.opacity=e.state==='tell'?.5+Math.sin(time*30)*.3:e.block>0?1:.4;
}
// A catcher throws back a blocked shot, at most every returnEvery seconds.
export function catcherReturn(e,ctx){
 if(e.type!=='catcher'||e.cooldown>0)return false;
 const s=ACT2_MINIONS.catcher;e.cooldown=s.returnEvery;
 ctx.bolt(e.g.position.clone().addScaledVector(facingOf(e),.9),flat(ctx.player.clone().sub(e.g.position)).normalize(),{speed:s.returnSpeed,damage:s.returnDamage});
 return true;
}

function tickPitcher(e,s,dt,time,ctx,toPlayer,dist){
 if(e.state==='stalk'){
  turnToward(e,toPlayer,4,dt);
  if(dist<s.near)e.g.position.addScaledVector(toPlayer,-dt*1.1);else if(dist>s.far)e.g.position.addScaledVector(toPlayer,dt*1);
  const side=e.phase<3?1:-1;e.g.position.x+=toPlayer.z*dt*.5*side;e.g.position.z-=toPlayer.x*dt*.5*side;
  if(e.timer<=0&&!ctx.blocked(e.g.position,ctx.player)){e.state='windup';e.timer=s.windup;e.dir.copy(toPlayer);e.g.rotation.y=Math.atan2(toPlayer.x,toPlayer.z);}
  e.line.visible=false;
 }else if(e.state==='windup'){
  const progress=1-Math.max(0,e.timer)/s.windup;
  e.line.visible=true;e.line.scale.set(1,1,s.line*Math.min(1,.25+progress));e.line.material.opacity=.12+.5*progress;
  if(e.timer<=0){
   e.pitches++;const curve=e.pitches%s.curveEvery===0;
   ctx.bolt(e.g.position.clone().addScaledVector(e.dir,.8),e.dir.clone(),curve?{speed:s.curveSpeed,damage:s.damage,curve:(ctx.random()<.5?-1:1)*s.curve}:{speed:s.ballSpeed,damage:s.damage});
   e.state='recover';e.timer=.5;e.line.visible=false;
  }
 }else if(e.timer<=0){e.state='stalk';e.timer=s.rest+ctx.random()*.6;}
}

function tickRunner(e,s,dt,time,ctx,toPlayer,dist){
 if(e.state==='stalk'){
  e.takenScale=1;turnToward(e,toPlayer,5,dt);e.g.position.addScaledVector(toPlayer,dt*s.jog);
  if(e.timer<=0&&dist<s.reach){e.state='mark';e.timer=s.mark;e.basePos.copy(ctx.player).setY(0);e.base.position.copy(e.basePos);e.base.visible=true;}
 }else if(e.state==='mark'){
  turnToward(e,flat(e.basePos.clone().sub(e.g.position)),6,dt);e.base.rotation.y=Math.PI/4+time*3;
  if(e.timer<=0){e.state='commit';e.timer=s.maxSprint;e.dir.copy(flat(e.basePos.clone().sub(e.g.position))).normalize();e.g.rotation.y=Math.atan2(e.dir.x,e.dir.z);e.struck=false;}
 }else if(e.state==='commit'){
  e.g.position.addScaledVector(e.dir,dt*s.sprint);
  if(!e.struck&&dist<.85){ctx.hit(s.damage);e.struck=true;}
  const past=flat(e.basePos.clone().sub(e.g.position)).dot(e.dir)<-.6;
  if(past||e.timer<=0){e.state='recover';e.timer=s.rest;e.takenScale=s.exposed;e.base.visible=false;}
 }else if(e.timer<=0){e.state='stalk';e.timer=.8+ctx.random()*.6;e.takenScale=1;}
}

function tickBatter(e,s,dt,time,ctx,toPlayer,dist){
 const face=facingOf(e);
 if(e.state==='stalk'){
  turnToward(e,toPlayer,3,dt);
  if(dist<s.near)e.g.position.addScaledVector(toPlayer,-dt*.9);else if(dist>s.far)e.g.position.addScaledVector(toPlayer,dt*1.2);
  if(e.timer<=0&&dist<1.6){e.state='tell';e.timer=s.tell;}
 }else if(e.state==='tell'){if(e.timer<=0){if(dist<s.swingRange&&toPlayer.dot(face)>.35)ctx.hit(s.damage);e.state='recover';e.timer=s.recover;e.arc.visible=true;e.arc.material.opacity=.9;}}
 else if(e.timer<=0){e.state='stalk';e.timer=.7;}
 // Batting: one shot per swing, only from the front, never a piercing one.
 if(e.cooldown<=0&&e.state!=='recover'){
  for(const shot of ctx.shots()){
   if(!(shot.life>0)||ctx.canBat?.(shot)===false)continue;
   const to=flat(shot.ob.position.clone().sub(e.g.position)),d=to.length();
   if(d>s.batRange||d<1e-6||to.divideScalar(d).dot(face)<.2)continue;
   ctx.batShot(shot,e);ctx.bolt(shot.ob.position.clone(),flat(ctx.player.clone().sub(shot.ob.position)).normalize(),{speed:s.returnSpeed,damage:s.returnDamage});
   e.cooldown=s.batEvery;e.arc.visible=true;e.arc.material.opacity=1;e.swingFlash=.2;break;
  }
 }
 if(e.swingFlash>0){e.swingFlash-=dt;if(e.swingFlash<=0&&e.state!=='recover')e.arc.visible=false;}
 else if(e.state==='stalk')e.arc.visible=false;
}
const TICKS=Object.freeze({catcher:tickCatcher,pitcher:tickPitcher,runner:tickRunner,batter:tickBatter});
