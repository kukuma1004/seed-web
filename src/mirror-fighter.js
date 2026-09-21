import * as THREE from 'three';
import {createSeedBody} from './seed-body.js';
import {createMotion} from './motion.js';
import {mirrorBuildSnapshot,mirrorPatternPlan} from './mirror-trial.js';

export const MIRROR_ARENA=Object.freeze({
 shape:'circle',id:'mirror-tower',radius:13,
 start:Object.freeze({x:0,z:6.8})
});

// These panes only affect projectiles. The seed and its reflection can walk
// through them, so a reflect build gets useful angles without shrinking the
// open dodge space that defines the tower.
export const MIRROR_PANELS=Object.freeze([
 Object.freeze({x:-5.4,z:0,w:.18,d:3.4}),Object.freeze({x:5.4,z:0,w:.18,d:3.4}),
 Object.freeze({x:0,z:-5.4,w:3.4,d:.18}),Object.freeze({x:0,z:5.4,w:3.4,d:.18})
]);

const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
const AXIS_Y=new THREE.Vector3(0,1,0);

function segmentPanelHit(previous,next,panel,padding){
 const dx=next.x-previous.x,dz=next.z-previous.z,minX=panel.x-panel.w/2-padding,maxX=panel.x+panel.w/2+padding,minZ=panel.z-panel.d/2-padding,maxZ=panel.z+panel.d/2+padding;
 let enter=0,leave=1,nx=0,nz=0;
 for(const axis of ['x','z']){
  const start=axis==='x'?previous.x:previous.z,delta=axis==='x'?dx:dz,min=axis==='x'?minX:minZ,max=axis==='x'?maxX:maxZ;
  if(Math.abs(delta)<1e-8){if(start<min||start>max)return null;continue;}
  let a=(min-start)/delta,b=(max-start)/delta,normal=delta>0?-1:1;if(a>b){const hold=a;a=b;b=hold;normal*=-1;}
  if(a>enter){enter=a;nx=axis==='x'?normal:0;nz=axis==='z'?normal:0;}
  leave=Math.min(leave,b);if(enter>leave)return null;
 }
 return enter>1e-5&&enter<=1?{t:enter,nx,nz}:null;
}

export function reflectMirrorPanels(previous,next,dir,panels=MIRROR_PANELS,padding=.08){
 let best=null;
 for(const panel of panels){const hit=segmentPanelHit(previous,next,panel,padding);if(hit&&(!best||hit.t<best.t))best=hit;}
 if(!best)return false;
 const dx=next.x-previous.x,dz=next.z-previous.z,hitX=previous.x+dx*best.t,hitZ=previous.z+dz*best.t,left=1-best.t;
 const travelDot=dx*best.nx+dz*best.nz,directionDot=dir.x*best.nx+dir.z*best.nz;
 next.x=hitX+(dx-2*travelDot*best.nx)*left+best.nx*.001;next.z=hitZ+(dz-2*travelDot*best.nz)*left+best.nz*.001;
 dir.x-=2*directionDot*best.nx;dir.z-=2*directionDot*best.nz;
 return true;
}

export function createMirrorPanels(scene){
 const geometry=new THREE.OctahedronGeometry(.26,0),material=new THREE.MeshBasicMaterial({color:0xd3ccff,transparent:true,opacity:.64,depthWrite:false,toneMapped:false,blending:THREE.AdditiveBlending}),shardsPerPanel=7;
 const mesh=new THREE.InstancedMesh(geometry,material,MIRROR_PANELS.length*shardsPerPanel),matrix=new THREE.Matrix4(),quaternion=new THREE.Quaternion(),scale=new THREE.Vector3(),position=new THREE.Vector3();mesh.name='mirror-projectile-panels';mesh.castShadow=false;mesh.receiveShadow=false;
 let index=0;
 for(const panel of MIRROR_PANELS){
  const alongX=panel.w>panel.d,long=alongX?panel.w:panel.d;quaternion.setFromAxisAngle(AXIS_Y,alongX?0:Math.PI/2);
  for(let i=0;i<shardsPerPanel;i++){
   const t=i/(shardsPerPanel-1)-.5,center=1-Math.abs(t)*.35;position.set(panel.x+(alongX?t*long:0),.7+(i%2)*.08,panel.z+(alongX?0:t*long));scale.set(.38*center,.88*center,.25);matrix.compose(position,quaternion,scale);mesh.setMatrixAt(index++,matrix);
  }
 }
 mesh.instanceMatrix.needsUpdate=true;mesh.visible=false;scene.add(mesh);
 return Object.freeze({mesh,geometries:Object.freeze([geometry]),materials:Object.freeze([material]),setActive(active){mesh.visible=Boolean(active);}});
}

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

// 2026-09-21 사용자 요청: 한 발씩 나가 감질났다 → 씨앗과 분신 모두 한 번에 7발 부채꼴(공전은 둘레 7~8발).
// 맞으면 잠깐 무적이라 분신 부채꼴은 씨앗에게 한 번만 들어가고, 씨앗 부채꼴도 분신에게 한 발만 들어간다(서로 공평).
export const MIRROR_FAN=Object.freeze([-.36,-.24,-.12,0,.12,.24,.36]);
// 원형 경기장(반지름 13)은 일반 방보다 넓어, 거울의 탑에서만 카메라가 씨앗을 더 따라가고 조금 멀리 본다.
export const MIRROR_VIEW=Object.freeze({followX:.62,followZ:.78,zoom:.9});
export function mirrorVolley(law='pierce',floor=1,shotIndex=0){
 const damageScale=law==='orbit'?.58:law==='split'?.7:1;
 const fan=extra=>MIRROR_FAN.map(angle=>({angle,...extra}));
 if(law==='orbit'){const n=Math.min(8,Math.max(7,5+Math.floor(floor/5)));return Array.from({length:n},(_,i)=>({angle:i*Math.PI*2/n,damageScale,speedScale:.95}));}
 if(law==='split'||law==='chain')return fan({damageScale,speedScale:law==='chain'?1.1:.98});
 if(law==='burst')return fan({damageScale:.82,speedScale:.86,burst:true});
 if(law==='reflect')return fan({damageScale,bounces:2,speedScale:1.08});
 if(law==='recall')return fan({damageScale,recall:true,speedScale:.96});
 if(law==='frost')return fan({damageScale:.76,frost:true,speedScale:.9});
 if(law==='gravity')return fan({damageScale:.9,curve:(shotIndex%2?1:-1)*.2,speedScale:.84,gravity:true});
 return fan({damageScale,speedScale:1.12});
}

export const MIRROR_PROJECTILE_BASE_SPEED=10.2;
export function mirrorProjectileSpeed(floor=1,speedScale=1){
 const climb=Math.min(1.18,1+Math.max(0,Math.floor(Number(floor)||1)-1)*.018);
 return MIRROR_PROJECTILE_BASE_SPEED*climb*Math.max(.5,Number(speedScale)||1);
}

export function mirrorAttackSequence(plan,attackIndex=0){
 const attacks=plan?.attacks||[];if(!attacks.length)return [];
 // Only two families begin on one beat, but upper floors may append a third,
 // softer follow-up. This raises decision pressure without raising the live
 // projectile budget or creating an unreadable simultaneous wall.
 const count=Math.min(Math.max(1,plan.chainLength||plan.concurrentAttackFamilies||1),attacks.length),out=[];
 for(let i=0;i<count;i++)out.push(Object.freeze({attack:attacks[(attackIndex+i)%attacks.length],delay:i*.3,damageScale:i===0?1:i===1?.62:.46}));
 return Object.freeze(out);
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
  g:root,type:'mirrorseed',hp,maxHp:hp,dead:false,hit:0,slow:0,state:'stalk',timer:0,attackCD:.68,
  broken:0,cracks:0,shotIndex:0,attackIndex:0,strafeSign:1,turnTimer:1.05,dir:new THREE.Vector3(),faceDir:new THREE.Vector3(),feintDir:new THREE.Vector3(),dashDir:new THREE.Vector3(),dashTime:0,queuedAttacks:[],motion,readyRing,
  floor,plan,moveName:'비친 자동공격 준비',snapshot
 };
}

function fireAttack(enemy,entry,fire){
 const volley=mirrorVolley(entry.attack.law,enemy.floor,enemy.shotIndex++);
 for(const spec of volley){const direction=enemy.dir.clone().applyAxisAngle(AXIS_Y,spec.angle||0);fire(enemy.g.position,direction,{...spec,damageScale:(spec.damageScale||1)*entry.damageScale*enemy.plan.stats.hitDamageMaxHp,law:entry.attack.law});}
}

export function tickMirrorFighter(enemy,dt,time,{player,camera,constrain,fire,hit}={}){
 const previousX=enemy.g.position.x,previousZ=enemy.g.position.z;
 enemy.hit=Math.max(0,(enemy.hit||0)-dt);enemy.turnTimer-=dt;
 if(enemy.turnTimer<=0){enemy.turnTimer=.92+(enemy.floor%3)*.16;enemy.strafeSign*=-1;}
 const movement=enemy.plan.tower.movement;
 const steering=mirrorSteering({mirrorX:enemy.g.position.x,mirrorZ:enemy.g.position.z,playerX:player.x,playerZ:player.z,arenaRadius:enemy.plan.tower.arena.radius,desiredDistance:movement.desiredDistance,strafe:movement.strafe,strafeSign:enemy.strafeSign});
 enemy.dir.set(player.x-enemy.g.position.x,0,player.z-enemy.g.position.z).normalize();
 enemy.faceDir.copy(enemy.state==='tell'&&movement.feint&&enemy.timer>.12?enemy.feintDir:enemy.dir);enemy.g.rotation.y=Math.atan2(enemy.faceDir.x,enemy.faceDir.z);

 if(enemy.broken>0){
  enemy.broken=Math.max(0,enemy.broken-dt);enemy.state='broken';enemy.moveName='거울 깨짐 · 지금 공격하세요';
  enemy.readyRing.material.color.setHex(0xffd471);enemy.readyRing.material.opacity=.72;enemy.readyRing.scale.setScalar(1.08+Math.sin(time*11)*.08);
 }else{
  if(enemy.state==='broken'){enemy.state='stalk';enemy.attackCD=.62;}
  const speed=4.05*enemy.plan.stats.moveSpeedScale+(enemy.floor-1)*.03;
  if(enemy.dashTime>0){enemy.dashTime=Math.max(0,enemy.dashTime-dt);enemy.g.position.addScaledVector(enemy.dashDir,speed*2.9*dt);}else{enemy.g.position.x+=steering.x*speed*dt;enemy.g.position.z+=steering.z*speed*dt;}constrain(enemy.g.position);
  enemy.attackCD-=dt;
  const progress=clamp(1-enemy.attackCD/.9,0,1);enemy.readyRing.material.color.setHex(0xe7dbff);enemy.readyRing.material.opacity=.16+progress*.62;enemy.readyRing.scale.setScalar(.84+progress*.2);
  if(enemy.state==='stalk'&&enemy.attackCD<=0){enemy.queuedAttacks=mirrorAttackSequence(enemy.plan,enemy.attackIndex).map(entry=>({...entry}));enemy.attackIndex+=enemy.queuedAttacks.length;const first=enemy.queuedAttacks[0]?.attack;enemy.state='tell';enemy.timer=clamp((first?.tell||.5)*.64,.24,.42);enemy.feintDir.copy(enemy.dir).applyAxisAngle(AXIS_Y,(enemy.shotIndex%2?1:-1)*.42);enemy.moveName=movement.feint?'거울 속임수 · 마지막 순간 방향 전환':'비친 자동공격 · 회피로 스쳐 균열';}
  else if(enemy.state==='tell'){
   enemy.timer-=dt;enemy.readyRing.material.opacity=.58+Math.sin(time*24)*.3;
   if(enemy.timer<=0){
    const first=enemy.queuedAttacks.shift();if(first)fireAttack(enemy,first,fire);
    if(movement.dash){enemy.dashTime=.16;enemy.dashDir.set(enemy.dir.z*enemy.strafeSign,0,-enemy.dir.x*enemy.strafeSign).addScaledVector(enemy.dir,-.18).normalize();}
    enemy.state='recover';enemy.timer=enemy.queuedAttacks.length?.4:.2;enemy.attackCD=.78/enemy.plan.stats.attackSpeedScale;enemy.moveName=enemy.queuedAttacks.length?`${first.attack.name} → 연계 준비`:first?.attack.name||'비친 자동공격';
   }
  }else if(enemy.state==='recover'){
   enemy.timer-=dt;
   for(const entry of enemy.queuedAttacks)entry.delay-=dt;
   while(enemy.queuedAttacks.length&&enemy.queuedAttacks[0].delay<=0){const entry=enemy.queuedAttacks.shift();fireAttack(enemy,entry,fire);enemy.moveName=`연계 · ${entry.attack.name}`;}
   if(enemy.timer<=0&&enemy.queuedAttacks.length===0)enemy.state='stalk';
  }
  if(steering.distance<.72&&enemy.state!=='tell'&&hit)hit(Math.max(5,Math.round(enemy.plan.stats.hitDamageMaxHp*70)));
 }
 enemy.motion.update(dt,enemy.g.position.x-previousX,enemy.g.position.z-previousZ,{type:'seed',state:enemy.state,timer:enemy.timer,hit:enemy.hit});
 enemy.g.userData.updateArt?.(camera,enemy.g.position.x-previousX,enemy.g.position.z-previousZ);
 enemy.g.userData.updateEvolutionArt?.(time,enemy.broken>0);
}
