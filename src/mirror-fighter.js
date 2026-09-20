import * as THREE from 'three';
import {createSeedBody} from './seed-body.js';
import {createMotion} from './motion.js';
import {mirrorBuildSnapshot,mirrorPatternPlan} from './mirror-trial.js';

export const MIRROR_ARENA=Object.freeze({
 shape:'circle',id:'mirror-tower',radius:13,
 start:Object.freeze({x:0,z:6.8})
});

const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
const AXIS_Y=new THREE.Vector3(0,1,0);

// The clone is slower than the seed in open space, but it cuts toward the
// player's escape line near the rim. This keeps the large room useful without
// turning the safest strategy into running around the outside forever.
export function mirrorSteering({mirrorX=0,mirrorZ=0,playerX=0,playerZ=0,arenaRadius=MIRROR_ARENA.radius,desiredDistance=[4.8,8],strafe=.52,strafeSign=1}={}){
 const dx=playerX-mirrorX,dz=playerZ-mirrorZ,distance=Math.max(.001,Math.hypot(dx,dz)),nx=dx/distance,nz=dz/distance;
 const [near,far]=desiredDistance,playerRadius=Math.hypot(playerX,playerZ),edge=clamp((playerRadius-arenaRadius*.68)/(arenaRadius*.22),0,1);
 const range=distance>far?1:distance<near?-.72:.08;
 const forward=range+edge*1.18,tangent=strafe*strafeSign*(1-edge*.58);
 let x=nx*forward+nz*tangent,z=nz*forward-nx*tangent,length=Math.hypot(x,z);
 if(length<.001){x=nx;z=nz;length=1;}
 return Object.freeze({x:x/length,z:z/length,distance,edgeCut:edge});
}

export function mirrorVolley(law='pierce',floor=1,shotIndex=0){
 const damageScale=law==='orbit'?.58:law==='split'?.7:1;
 if(law==='orbit')return Array.from({length:Math.min(8,5+Math.floor(floor/5))},(_,i)=>({angle:i*Math.PI*2/Math.min(8,5+Math.floor(floor/5)),damageScale,speedScale:.82}));
 if(law==='split'||law==='chain')return [-.24,0,.24].map(angle=>({angle,damageScale,speedScale:law==='chain'?1.08:.92}));
 if(law==='burst')return [-.12,.12].map(angle=>({angle,damageScale:.82,speedScale:.78}));
 if(law==='reflect')return [{angle:0,damageScale,bounces:2,speedScale:1.04}];
 if(law==='recall')return [{angle:shotIndex%2?-.1:.1,damageScale,recall:true,speedScale:.88}];
 if(law==='frost')return [-.16,.16].map(angle=>({angle,damageScale:.76,frost:true,speedScale:.82}));
 if(law==='gravity')return [{angle:0,damageScale:.9,curve:(shotIndex%2?1:-1)*.2,speedScale:.74}];
 return [{angle:0,damageScale,speedScale:1.08}];
}

function tintMirror(root){
 root.traverse(object=>{
  if(!object.isSprite||!object.material?.color)return;
  object.material.color.multiply(new THREE.Color(0xc8c2ff));
 });
}

export function createMirrorFighter(scene,{floor=1,quality='normal',levels=new Map(),forms=new Map(),dashEvolution=null}={}){
 const snapshot=mirrorBuildSnapshot({levels,forms,dashEvolution}),plan=mirrorPatternPlan(snapshot,{floor,quality});
 const root=createSeedBody(scene,{occlusion:quality!=='low'});root.scale.setScalar(1.34);root.userData.setEvolution?.(forms);tintMirror(root);
 const motion=createMotion(root,root.userData.legs);
 const readyMaterial=new THREE.MeshBasicMaterial({color:0xe7dbff,transparent:true,opacity:.2,depthWrite:false,toneMapped:false});
 const readyRing=new THREE.Mesh(new THREE.TorusGeometry(.53,.035,4,28),readyMaterial);readyRing.rotation.x=Math.PI/2;readyRing.position.y=1.48;readyRing.castShadow=false;root.add(readyRing);
 const hp=Math.round(180*plan.stats.hpScale);
 return {
  g:root,type:'mirrorseed',hp,maxHp:hp,dead:false,hit:0,slow:0,state:'stalk',timer:0,attackCD:1.15,
  broken:0,cracks:0,shotIndex:0,attackIndex:0,strafeSign:1,turnTimer:1.8,dir:new THREE.Vector3(),motion,readyRing,
  floor,plan,moveName:'비친 자동공격 준비',snapshot
 };
}

export function tickMirrorFighter(enemy,dt,time,{player,camera,constrain,fire,hit}={}){
 const previousX=enemy.g.position.x,previousZ=enemy.g.position.z;
 enemy.hit=Math.max(0,(enemy.hit||0)-dt);enemy.turnTimer-=dt;
 if(enemy.turnTimer<=0){enemy.turnTimer=1.7+(enemy.floor%3)*.28;enemy.strafeSign*=-1;}
 const movement=enemy.plan.tower.movement;
 const steering=mirrorSteering({mirrorX:enemy.g.position.x,mirrorZ:enemy.g.position.z,playerX:player.x,playerZ:player.z,arenaRadius:enemy.plan.tower.arena.radius,desiredDistance:movement.desiredDistance,strafe:movement.strafe,strafeSign:enemy.strafeSign});
 enemy.dir.set(player.x-enemy.g.position.x,0,player.z-enemy.g.position.z).normalize();
 enemy.g.rotation.y=Math.atan2(enemy.dir.x,enemy.dir.z);

 if(enemy.broken>0){
  enemy.broken=Math.max(0,enemy.broken-dt);enemy.state='broken';enemy.moveName='거울 깨짐 · 지금 공격하세요';
  enemy.readyRing.material.color.setHex(0xffd471);enemy.readyRing.material.opacity=.72;enemy.readyRing.scale.setScalar(1.08+Math.sin(time*11)*.08);
 }else{
  if(enemy.state==='broken'){enemy.state='stalk';enemy.attackCD=.62;}
  const speed=3.35*enemy.plan.stats.moveSpeedScale+(enemy.floor-1)*.025;
  enemy.g.position.x+=steering.x*speed*dt;enemy.g.position.z+=steering.z*speed*dt;constrain(enemy.g.position);
  enemy.attackCD-=dt;
  const progress=clamp(1-enemy.attackCD/.9,0,1);enemy.readyRing.material.color.setHex(0xe7dbff);enemy.readyRing.material.opacity=.16+progress*.62;enemy.readyRing.scale.setScalar(.84+progress*.2);
  if(enemy.state==='stalk'&&enemy.attackCD<=0){enemy.state='tell';enemy.timer=.3;enemy.moveName='비친 자동공격 · 회피로 스쳐 균열';}
  else if(enemy.state==='tell'){
   enemy.timer-=dt;enemy.readyRing.material.opacity=.58+Math.sin(time*24)*.3;
   if(enemy.timer<=0){
    const attack=enemy.plan.attacks[enemy.attackIndex++%enemy.plan.attacks.length],volley=mirrorVolley(attack.law,enemy.floor,enemy.shotIndex++);
    for(const spec of volley){const direction=enemy.dir.clone().applyAxisAngle(AXIS_Y,spec.angle||0);fire(enemy.g.position,direction,{...spec,damageScale:(spec.damageScale||1)*enemy.plan.stats.hitDamageMaxHp,law:attack.law});}
    enemy.state='recover';enemy.timer=.26;enemy.attackCD=.9/enemy.plan.stats.attackSpeedScale;enemy.moveName=attack.name;
   }
  }else if(enemy.state==='recover'){enemy.timer-=dt;if(enemy.timer<=0)enemy.state='stalk';}
  if(steering.distance<.72&&enemy.state!=='tell'&&hit)hit(Math.max(5,Math.round(enemy.plan.stats.hitDamageMaxHp*70)));
 }
 enemy.motion.update(dt,enemy.g.position.x-previousX,enemy.g.position.z-previousZ,{type:'seed',state:enemy.state,timer:enemy.timer,hit:enemy.hit});
 enemy.g.userData.updateArt?.(camera,enemy.g.position.x-previousX,enemy.g.position.z-previousZ);
 enemy.g.userData.updateEvolutionArt?.(time,enemy.broken>0);
}
