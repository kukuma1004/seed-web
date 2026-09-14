import * as THREE from 'three';
import {learnedLaws} from './journey.js';
const V=THREE.Vector3;
// Three kinds of warden. Each variant changes its attack rotation, not just its health.
// memory learns the seed's laws; seal locks the dodge inside a ring; hunter charges twice in a row.
export const WARDEN_VARIANTS=Object.freeze({
 memory:{name:'기억의 문지기',patterns:[0,1,2],stalk:1,tell:1,chargeSpeed:10.5,tint:0xffffff},
 seal:{name:'봉인의 문지기',patterns:[0,3,2],stalk:1,tell:1,chargeSpeed:10.5,tint:0xc9a8ff},
 hunter:{name:'추격의 문지기',patterns:[1,0,1],stalk:1.3,tell:.72,chargeSpeed:13,tint:0xff9c8a}
});
// Bolts in a fan are spread wide enough to leave lanes a seed fits through, and the salvos only
// shift slightly, so reading the gap and stepping into it is the answer rather than luck.
export const FAN_SPACING=.32,FAN_SHIFT=.06;
export const SEAL=Object.freeze({radius:2.6,tell:1.05,lock:3.5,damage:12});
export function wardenVariantFor(cycle){return ['memory','seal','hunter'][((cycle%3)+3)%3];}
export function createWarden(scene,mats,variant='memory'){
 const shell=new THREE.MeshStandardMaterial({color:0x8b9f94,roughness:.65,emissive:0x23413e,emissiveIntensity:.65});
 const armor=new THREE.MeshStandardMaterial({color:0xd6cdb0,roughness:.55,emissive:0x29362a,emissiveIntensity:.5});
 const dark=new THREE.MeshStandardMaterial({color:0x39574e,roughness:.65,emissive:0x183a31,emissiveIntensity:.5});
 const g=new THREE.Group(),body=new THREE.Group();g.add(body);scene.add(g);
 const add=(geo,mat,x,y,z,parent=body)=>{const o=new THREE.Mesh(geo,mat);o.position.set(x,y,z);o.castShadow=o.receiveShadow=true;parent.add(o);return o;};
 add(new THREE.CylinderGeometry(.65,.95,1.9,7),shell,0,1.05,0);
 add(new THREE.IcosahedronGeometry(.48,1),dark,0,2.3,0);
 for(const x of [-.17,.17])add(new THREE.IcosahedronGeometry(.065,0),mats.amber,x,2.35,.43);
 add(new THREE.OctahedronGeometry(.32),mats.amber,0,1.45,.78);
 for(const side of [-1,1]){
  add(new THREE.DodecahedronGeometry(.58),armor,side*.92,1.9,0);
  const arm=add(new THREE.CylinderGeometry(.25,.38,1.55,6),shell,side*1.1,1.1,.1);arm.rotation.z=side*.18;
  add(new THREE.DodecahedronGeometry(.37),dark,side*.45,.27,.15);
  for(let i=0;i<3;i++){const horn=add(new THREE.ConeGeometry(.15,.85+i*.15,5),armor,side*(.25+i*.22),2.85-i*.1,0);horn.rotation.z=-side*(.2+i*.2);}
 }
 const seal=add(new THREE.TorusGeometry(.85,.045,5,40),mats.amber,0,2,.15);seal.rotation.x=.2;
 const mat=new THREE.MeshBasicMaterial({color:0xff9a50,transparent:true,opacity:.4,depthWrite:false,side:THREE.DoubleSide});
 const tells=[new THREE.Group(),new THREE.Group(),new THREE.Group()];tells.forEach(t=>{g.add(t);t.visible=false;});
 for(let i=-3;i<=3;i++){const ray=add(new THREE.PlaneGeometry(.11,7),mat,Math.sin(i*.20)*3.5,.11,Math.cos(i*.20)*3.5,tells[0]);ray.rotation.x=Math.PI/2;ray.rotation.z=-i*.20;}
 const lane=add(new THREE.PlaneGeometry(1.7,6.5),mat,0,.11,3.25,tells[1]);lane.rotation.x=Math.PI/2;
 const nova=add(new THREE.RingGeometry(2.3,2.5,64),mat,0,.11,0,tells[2]);nova.rotation.x=Math.PI/2;
 // The seal ring is placed on the ground where the seed stood when the tell began.
 const sealMat=new THREE.MeshBasicMaterial({color:0xb27dff,transparent:true,opacity:.5,depthWrite:false,side:THREE.DoubleSide,toneMapped:false});
 const sealTell=new THREE.Group();g.add(sealTell);sealTell.visible=false;tells.push(sealTell);
 const sealRing=new THREE.Mesh(new THREE.RingGeometry(SEAL.radius-.16,SEAL.radius,64),sealMat);sealRing.rotation.x=-Math.PI/2;sealRing.position.y=.12;sealTell.add(sealRing);
 const sealFill=new THREE.Mesh(new THREE.CircleGeometry(SEAL.radius,48),sealMat);sealFill.rotation.x=-Math.PI/2;sealFill.position.y=.11;sealTell.add(sealFill);
 const config=WARDEN_VARIANTS[variant]||WARDEN_VARIANTS.memory;
 const e={g,body,type:'warden',variant:WARDEN_VARIANTS[variant]?variant:'memory',config,hp:1150,maxHp:1150,state:'stalk',timer:1.2,pattern:0,dir:new V(0,0,1),target:new V(),learned:[],hit:0,legs:[],tells,nova,sealTell,sealFill,attacks:0,chained:0};
 return e;
}
export function tickWarden(e,dt,time,player,laws,{collide,bolt,hit,burst,seal=()=>{}}){
 const config=e.config||WARDEN_VARIANTS.memory;
 e.learned=learnedLaws(e.hp,e.maxHp,laws);e.hit=Math.max(0,e.hit-dt);e.timer-=dt;
 const delta=player.clone().sub(e.g.position).setY(0),distance=delta.length();delta.normalize();
 const type=config.patterns[e.pattern%config.patterns.length], radius=e.learned.some(id=>['chain','gravity','burst'].includes(id))?3.4:2.5;
 e.nova.scale.setScalar(radius/2.5);
 e.tells.forEach((t,i)=>t.visible=e.state==='tell'&&i===type);
 e.body.rotation.x=THREE.MathUtils.damp(e.body.rotation.x,e.state==='tell'?-.13:e.state==='commit'?.18:0,12,dt);
 e.body.position.y=e.hit>0?.07:0;
 if(e.state==='stalk'){
  const sign=e.pattern%2?1:-1;
  e.g.position.addScaledVector(delta,dt*config.stalk*(distance>5?2.9:distance<3?-2.2:.35));
  e.g.position.x+=delta.z*dt*2.25*sign*config.stalk;e.g.position.z-=delta.x*dt*2.25*sign*config.stalk;
  e.g.rotation.y=Math.atan2(delta.x,delta.z);
  if(e.timer<=0){e.state='tell';e.timer=(type===3?SEAL.tell:type===1?.44:type===0?.55:.6)*config.tell;e.dir.copy(delta);e.target.copy(player).setY(0);}
 }else if(e.state==='tell'){
  e.g.rotation.y=Math.atan2(e.dir.x,e.dir.z);
  if(type===3){
   // Undo the warden's own turn so the ring stays on the ground where it was cast.
   const local=e.target.clone().sub(e.g.position).setY(0).applyAxisAngle(new V(0,1,0),-e.g.rotation.y);
   e.sealTell.position.set(local.x,0,local.z);e.sealFill.material.opacity=.18+.35*Math.abs(Math.sin(e.timer*18));
  }
  if(e.timer<=0){
   e.state='commit';e.timer=type===1?.42:type===0?.48:.2;e.salvos=1;e.attacks++;
   e.tells.forEach(t=>t.visible=false);
   if(type===0){const n=e.learned.includes('split')?7:5;for(let i=0;i<n;i++)bolt(e.g.position,e.dir.clone().applyAxisAngle(new V(0,1,0),(i-(n-1)/2)*FAN_SPACING),e.learned.includes('reflect')?1:0,e.learned);if(e.learned.includes('orbit'))for(let i=0;i<6;i++)bolt(e.g.position,new V(Math.cos(i*Math.PI/3),0,Math.sin(i*Math.PI/3)),0,e.learned);}
   if(type===2){burst(e.g.position,'amber',28);if(distance<radius)hit(e.learned.includes('burst')?28:22);}
   if(type===3){e.timer=.25;seal(e.target.clone(),SEAL.radius);}
  }
 }else if(e.state==='commit'){
  if(type===0&&e.salvos<3&&e.timer<=.48-e.salvos*.16){
   const n=e.learned.includes('split')?7:5;
   for(let i=0;i<n;i++)bolt(e.g.position,e.dir.clone().applyAxisAngle(new V(0,1,0),(i-(n-1)/2)*FAN_SPACING+(e.salvos%2?FAN_SHIFT:-FAN_SHIFT)),e.learned.includes('reflect')?1:0,e.learned);
   e.salvos++;
  }
  if(type===1){const before=e.g.position.clone();e.g.position.addScaledVector(e.dir,dt*config.chargeSpeed);collide(e.g.position,1);
   const segment=e.g.position.clone().sub(before),length=segment.lengthSq();
   const t=length?THREE.MathUtils.clamp(player.clone().sub(before).dot(segment)/length,0,1):0;
   if(before.addScaledVector(segment,t).distanceTo(player)<1.35)hit(24);
  }
  if(e.timer<=0){
   // The hunter turns and charges again straight away, once.
   if(type===1&&e.variant==='hunter'&&e.chained<1){e.chained++;e.state='tell';e.timer=.3;e.dir.copy(delta);}
   else{e.chained=0;e.state='recover';e.timer=.6;}
  }
 }else if(e.timer<=0){e.pattern++;e.state='stalk';e.timer=.65;}
 collide(e.g.position,1);
}
