import * as THREE from 'three';
import {learnedLaws} from './journey.js';
const V=THREE.Vector3;
export function createWarden(scene,mats){
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
 const e={g,body,type:'warden',hp:850,maxHp:850,state:'stalk',timer:1.2,pattern:0,dir:new V(0,0,1),learned:[],hit:0,legs:[],tells,nova,attacks:0};
 return e;
}
export function tickWarden(e,dt,time,player,laws,{collide,bolt,hit,burst}){
 e.learned=learnedLaws(e.hp,e.maxHp,laws);e.hit=Math.max(0,e.hit-dt);e.timer-=dt;
 const delta=player.clone().sub(e.g.position).setY(0),distance=delta.length();delta.normalize();
 const type=e.pattern%3, radius=e.learned.includes('chain')?3.4:2.5;
 e.nova.scale.setScalar(radius/2.5);
 e.tells.forEach((t,i)=>t.visible=e.state==='tell'&&i===type);
 e.body.rotation.x=THREE.MathUtils.damp(e.body.rotation.x,e.state==='tell'?-.13:e.state==='commit'?.18:0,12,dt);
 e.body.position.y=e.hit>0?.07:0;
 if(e.state==='stalk'){
  const sign=e.pattern%2?1:-1;
  e.g.position.addScaledVector(delta,dt*(distance>5?1.8:distance<3?-1.4:.1));
  e.g.position.x+=delta.z*dt*1.55*sign;e.g.position.z-=delta.x*dt*1.55*sign;
  e.g.rotation.y=Math.atan2(delta.x,delta.z);
  if(e.timer<=0){e.state='tell';e.timer=type===1?.65:.8;e.dir.copy(delta);}
 }else if(e.state==='tell'){
  e.g.rotation.y=Math.atan2(e.dir.x,e.dir.z);
  if(e.timer<=0){
   e.state='commit';e.timer=type===1?.48:.22;e.attacks++;
   e.tells.forEach(t=>t.visible=false);
   if(type===0){const n=e.learned.includes('split')?7:5;for(let i=0;i<n;i++)bolt(e.g.position,e.dir.clone().applyAxisAngle(new V(0,1,0),(i-(n-1)/2)*.20),e.learned.includes('reflect')?1:0);}
   if(type===2){burst(e.g.position,'amber',28);if(distance<radius)hit(22);}
  }
 }else if(e.state==='commit'){
  if(type===1){const before=e.g.position.clone();e.g.position.addScaledVector(e.dir,dt*8);collide(e.g.position,1);
   const segment=e.g.position.clone().sub(before),length=segment.lengthSq();
   const t=length?THREE.MathUtils.clamp(player.clone().sub(before).dot(segment)/length,0,1):0;
   if(before.addScaledVector(segment,t).distanceTo(player)<1.35)hit(24);
  }
  if(e.timer<=0){e.state='recover';e.timer=.95;}
 }else if(e.timer<=0){e.pattern++;e.state='stalk';e.timer=1.15;}
 collide(e.g.position,1);
}
