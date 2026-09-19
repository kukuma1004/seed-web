import * as THREE from 'three';
import {isStarRoom} from './room-rotation.js';
import {LAWS} from './laws.js';
const V=THREE.Vector3;

// A stationary sentinel that fires the seed's own two strongest laws back at it.
// Picking a law therefore also decides what the next turret will do to you.
export const TURRET=Object.freeze({hp:170,tell:.9,recover:.5,cooldown:2.1,boltSpeed:6.2,boltDamage:14,orbitRadius:2.3,orbitDamage:10,strikeRadius:1.15,strikeDamage:16});

// Fixed placements per room, each clear of that room's covers, the player start and the exit.
export const TURRET_LAYOUTS=[
 {base:[],extra:[{x:-8,z:-5}]},
 {base:[{x:-8,z:-5}],extra:[{x:8,z:-5}]},
 {base:[{x:-4.6,z:-4.2}],extra:[{x:4.6,z:-4.2}]},
 {base:[{x:-8,z:-5.5},{x:8,z:-5.5}],extra:[{x:-8.5,z:5.5}]},
 {base:[],extra:[]}
];
// Star garden: one turret in a bottom tip behind the seed; later journeys add one in the other bottom tip.
export const STAR_TURRETS={base:[{x:-5.4,z:6.9}],extra:[{x:5.4,z:6.9}]};
export function turretSpots(stage,cycle=0,region='garden'){if(region==='stadium'||region==='skyway')return [];const layout=isStarRoom(stage,cycle)?STAR_TURRETS:(TURRET_LAYOUTS[stage]||{base:[],extra:[]});return cycle>0?[...layout.base,...layout.extra]:[...layout.base];}

// The two laws with the highest level; ties go to the law taken first.
export function copiedLaws(levels){
 return [...levels.entries()].map(([id,level],order)=>({id,level,order})).sort((a,b)=>b.level-a.level||a.order-b.order).slice(0,2).map(x=>x.id);
}

// Pure description of one volley, so tests can check each law's turret form without a scene.
export function volleySpec(laws){
 const has=id=>laws.includes(id);
 return {
  count:has('split')?3:1,spread:.3,
  bounces:has('reflect')?2:0,pierce:has('pierce'),recall:has('recall'),frost:has('frost'),
  burst:has('burst'),gravity:has('gravity'),strike:has('chain'),orbit:has('orbit')
 };
}

export function createTurret(scene,mats,laws){
 const g=new THREE.Group(),body=new THREE.Group();g.add(body);scene.add(g);
 const add=(geo,mat,x,y,z,parent=body)=>{const o=new THREE.Mesh(geo,mat);o.position.set(x,y,z);o.castShadow=o.receiveShadow=true;parent.add(o);return o;};
 add(new THREE.CylinderGeometry(.62,.8,.5,8),mats.armor,0,.25,0);
 add(new THREE.CylinderGeometry(.34,.5,1.1,6),mats.black,0,1,0);
 const head=new THREE.Group();head.position.y=1.75;body.add(head);
 const colors=(laws.length?laws:['seed']).map(id=>LAWS[id]?.color??0xff6a2b);
 const gemMat=new THREE.MeshStandardMaterial({color:colors[0],emissive:colors[0],emissiveIntensity:2.2,roughness:.25});
 const gemMat2=new THREE.MeshStandardMaterial({color:colors[1]??colors[0],emissive:colors[1]??colors[0],emissiveIntensity:2.2,roughness:.25});
 add(new THREE.OctahedronGeometry(.42),mats.black,0,0,0,head).scale.set(1,1.3,1);
 add(new THREE.OctahedronGeometry(.2),gemMat,-.2,.1,.36,head);
 add(new THREE.OctahedronGeometry(.2),gemMat2,.2,.1,.36,head);
 const barrel=add(new THREE.CylinderGeometry(.09,.13,.8,6),mats.black,0,0,.55,head);barrel.rotation.x=Math.PI/2;
 const tellMat=new THREE.MeshBasicMaterial({color:0xff3b3b,transparent:true,opacity:0,depthWrite:false,side:THREE.DoubleSide,toneMapped:false});
 const aim=new THREE.Mesh(new THREE.PlaneGeometry(.22,9),tellMat);aim.rotation.x=-Math.PI/2;aim.position.set(0,.12,4.5);
 const aimPivot=new THREE.Group();aimPivot.add(aim);g.add(aimPivot);aimPivot.visible=false;
 const strikeMat=new THREE.MeshBasicMaterial({color:0xffe066,transparent:true,opacity:0,depthWrite:false,side:THREE.DoubleSide,toneMapped:false});
 const strike=new THREE.Mesh(new THREE.RingGeometry(TURRET.strikeRadius-.12,TURRET.strikeRadius,40),strikeMat);strike.rotation.x=-Math.PI/2;strike.position.y=.13;g.add(strike);strike.visible=false;
 const orbs=[];
 if(laws.includes('orbit'))for(let i=0;i<3;i++){const o=add(new THREE.IcosahedronGeometry(.26,0),gemMat,0,.8,0,g);o.castShadow=false;orbs.push(o);}
 return {g,body,head,type:'turret',hp:TURRET.hp,maxHp:TURRET.hp,state:'stalk',timer:1.2,laws:[...laws],spec:volleySpec(laws),
  dir:new V(0,0,1),target:new V(),hit:0,phase:0,orbs,orbitAngle:0,orbitCooldown:0,aimPivot,tellMat,strike,strikeMat,volleys:0};
}

export function tickTurret(e,dt,player,{fire,hurt,strikeFx}){
 e.timer-=dt;e.hit=Math.max(0,e.hit-dt);e.orbitCooldown=Math.max(0,e.orbitCooldown-dt);
 const toPlayer=player.clone().sub(e.g.position).setY(0),distance=toPlayer.length();toPlayer.normalize();
 if(e.state!=='commit')e.head.rotation.y=THREE.MathUtils.damp(e.head.rotation.y,Math.atan2(toPlayer.x,toPlayer.z),8,dt);
 if(e.orbs.length){
  e.orbitAngle+=dt*2.2;
  e.orbs.forEach((o,i)=>{const a=e.orbitAngle+i*Math.PI*2/3;o.position.set(Math.cos(a)*TURRET.orbitRadius,.8,Math.sin(a)*TURRET.orbitRadius);
   if(e.orbitCooldown<=0&&Math.hypot(e.g.position.x+o.position.x-player.x,e.g.position.z+o.position.z-player.z)<.7&&hurt(TURRET.orbitDamage)!==false)e.orbitCooldown=.8;});
 }
 if(e.state==='stalk'){
  if(e.timer<=0&&distance<16){e.state='tell';e.timer=TURRET.tell;e.dir.copy(toPlayer);e.target.copy(player).setY(0);}
 }else if(e.state==='tell'){
  const load=1-e.timer/TURRET.tell;
  e.aimPivot.visible=true;e.aimPivot.rotation.y=Math.atan2(e.dir.x,e.dir.z);e.tellMat.opacity=.15+.45*load;
  if(e.spec.strike){e.strike.visible=true;e.strike.position.set(e.target.x-e.g.position.x,.13,e.target.z-e.g.position.z);e.strikeMat.opacity=.3+.6*Math.abs(Math.sin(load*Math.PI*5));e.strike.scale.setScalar(1.6-.6*load);}
  if(e.timer<=0){
   e.state='commit';e.timer=.2;e.aimPivot.visible=false;e.strike.visible=false;e.volleys++;
   const s=e.spec,origin=e.g.position.clone().setY(0);
   for(let i=0;i<s.count;i++){const angle=(i-(s.count-1)/2)*s.spread;fire(origin,e.dir.clone().applyAxisAngle(new V(0,1,0),angle),s);}
   if(s.strike){strikeFx(e.target);if(Math.hypot(player.x-e.target.x,player.z-e.target.z)<TURRET.strikeRadius)hurt(TURRET.strikeDamage);}
  }
 }else if(e.state==='commit'){if(e.timer<=0){e.state='recover';e.timer=TURRET.recover;}}
 else if(e.timer<=0){e.state='stalk';e.timer=TURRET.cooldown;}
}
