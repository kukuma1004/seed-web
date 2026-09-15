import * as THREE from 'three';
const V=THREE.Vector3;
export function blocksShield(e,incoming){
 if((e.type!=='shield'&&e.type!=='catcher')||e.state==='recover')return false; // act-2 catchers block from the front too
 return incoming.x*Math.sin(e.g.rotation.y)+incoming.z*Math.cos(e.g.rotation.y)<-.5;
}
export function createShield(scene){
 const g=new THREE.Group(),body=new THREE.Group();g.add(body);scene.add(g);
 const mat=new THREE.MeshBasicMaterial({color:0x71d6ff,transparent:true,opacity:.55,side:THREE.DoubleSide,forceSinglePass:true,depthWrite:false});
 const arc=new THREE.Mesh(new THREE.RingGeometry(.78,.87,32,1,-Math.PI/3,Math.PI*2/3),mat);
 arc.rotation.x=-Math.PI/2;arc.rotation.z=-Math.PI/2;arc.position.y=.1;g.add(arc);
 return {g,body,type:'shield',hp:115,maxHp:115,state:'stalk',timer:1,dir:new V(0,0,1),phase:0,hit:0,block:0,arc};
}
export function tickShield(e,dt,player,{collide,hit}){
 e.timer-=dt;e.hit=Math.max(0,e.hit-dt);e.block=Math.max(0,e.block-dt);
 const d=player.clone().sub(e.g.position).setY(0),distance=d.length();d.normalize();
 if(e.state==='stalk'){
  const wanted=Math.atan2(d.x,d.z),diff=Math.atan2(Math.sin(wanted-e.g.rotation.y),Math.cos(wanted-e.g.rotation.y));
  e.g.rotation.y+=THREE.MathUtils.clamp(diff,-dt*1.6,dt*1.6);
  if(distance>1.5)e.g.position.addScaledVector(new V(Math.sin(e.g.rotation.y),0,Math.cos(e.g.rotation.y)),dt*1.45);
  if(e.timer<=0&&distance<2.8){e.state='tell';e.timer=.5;e.dir.set(Math.sin(e.g.rotation.y),0,Math.cos(e.g.rotation.y));}
 }else if(e.state==='tell'&&e.timer<=0){e.state='commit';e.timer=.35;}
 else if(e.state==='commit'){
  e.g.position.addScaledVector(e.dir,dt*5.3);if(distance<1.1)hit(17);
  if(e.timer<=0){e.state='recover';e.timer=1.1;}
 }else if(e.state==='recover'&&e.timer<=0){e.state='stalk';e.timer=.8;}
 e.arc.visible=e.state!=='recover';e.arc.material.opacity=e.state==='tell'?.45+Math.sin(e.timer*30)*.25:e.block>0?1:.42;
 collide(e.g.position,.75);
}
