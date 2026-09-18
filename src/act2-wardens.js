import * as THREE from 'three';

const V=THREE.Vector3,TAU=Math.PI*2;

export const ACT2_WARDENS=Object.freeze({
 ace:Object.freeze({name:'직구의 문지기',hp:1650,color:0xffd16a}),
 diamond:Object.freeze({name:'다이아몬드의 문지기',hp:1750,color:0x70d6ff}),
 slugger:Object.freeze({name:'강타의 문지기',hp:1850,color:0xff6b5f})
});
export const ACT2_WARDEN_ART=Object.freeze({
 ace:Object.freeze({file:'warden-act2-ace-v1.webp',size:4.05,baseline:.015}),
 diamond:Object.freeze({file:'warden-act2-diamond-v1.webp',size:3.75,baseline:.015}),
 slugger:Object.freeze({file:'warden-act2-slugger-v1.webp',size:4.25,baseline:.015})
});

// The first three journeys teach one rule. Journeys four and five combine two,
// but the second guardian only enters after the first reaches 60% health.
export function act2WardenEncounter(cycle=0){
 const c=Math.max(0,Math.floor(Number(cycle)||0));
 if(c===0)return Object.freeze({primary:'ace',support:null,trigger:0,hpScale:1});
 if(c===1)return Object.freeze({primary:'diamond',support:null,trigger:0,hpScale:1});
 if(c===2)return Object.freeze({primary:'slugger',support:null,trigger:0,hpScale:1});
 return c%2?Object.freeze({primary:'ace',support:'diamond',trigger:.6,hpScale:.8}):Object.freeze({primary:'diamond',support:'slugger',trigger:.6,hpScale:.8});
}

const basic=(color,opacity=.5)=>new THREE.MeshBasicMaterial({color,transparent:true,opacity,depthWrite:false,side:THREE.DoubleSide,toneMapped:false,forceSinglePass:true});
const standard=(color,emissive=0x000000)=>new THREE.MeshStandardMaterial({color,emissive,emissiveIntensity:.55,roughness:.52,metalness:.12});
const flat=v=>{v.y=0;return v;};
const face=(e,d)=>{if(d.lengthSq()>1e-8)e.g.rotation.y=Math.atan2(d.x,d.z);};
const add=(parent,geometry,material,x=0,y=0,z=0)=>{const m=new THREE.Mesh(geometry,material);m.position.set(x,y,z);m.castShadow=m.receiveShadow=true;parent.add(m);return m;};

export function createAct2Warden(scene,variant='ace'){
 const config=ACT2_WARDENS[variant]||ACT2_WARDENS.ace,id=ACT2_WARDENS[variant]?variant:'ace';
 const g=new THREE.Group(),body=new THREE.Group(),world=new THREE.Group();g.add(body);scene.add(g,world);
 const red=standard(0x8f2530,0x351018),gold=standard(0xd9a842,0x4d2a07),ivory=standard(0xf2ead1),dark=standard(0x27323d,0x101820),accent=standard(config.color,config.color);
 add(body,new THREE.CylinderGeometry(.72,.95,1.55,8),red,0,1.05,0);
 add(body,new THREE.IcosahedronGeometry(.55,1),ivory,0,2.15,0);
 add(body,new THREE.CylinderGeometry(.66,.66,.22,12),dark,0,2.48,0);
 const brim=add(body,new THREE.BoxGeometry(1.05,.08,.42),dark,0,2.43,.28);brim.rotation.x=-.08;
 for(const x of [-.78,.78])add(body,new THREE.DodecahedronGeometry(.35),gold,x,1.55,0);
 add(body,new THREE.OctahedronGeometry(.22),accent,0,1.35,.78);
 if(id==='ace'){
  add(body,new THREE.IcosahedronGeometry(.23,1),ivory,.9,1.05,.5);
  const arm=add(body,new THREE.CylinderGeometry(.14,.2,1.25,7),red,.72,1.35,.28);arm.rotation.z=-.72;
 }else if(id==='diamond'){
  for(const x of [-.48,.48]){const cleat=add(body,new THREE.ConeGeometry(.18,.55,5),accent,x,.35,.1);cleat.rotation.x=Math.PI/2;}
  for(const side of [-1,1]){const wing=add(body,new THREE.OctahedronGeometry(.34),accent,side*.92,1.2,0);wing.scale.set(1.5,.7,.8);}
 }else{
  const bat=add(body,new THREE.CylinderGeometry(.11,.18,2.4,8),gold,.82,1.45,.15);bat.rotation.z=-.82;bat.rotation.x=.18;
  add(body,new THREE.TorusGeometry(.62,.11,6,24,Math.PI),accent,0,2.18,.08).rotation.z=Math.PI;
 }
 const ring=add(g,new THREE.RingGeometry(.95,1.06,40),basic(config.color,.28),0,.13,0);ring.rotation.x=-Math.PI/2;
 const lane=add(g,new THREE.PlaneGeometry(.72,9.5),basic(0xffefbd,.18),0,.14,4.8);lane.rotation.x=-Math.PI/2;lane.visible=false;
 const arc=add(g,new THREE.RingGeometry(1.2,3.1,40,1,-Math.PI*.42,Math.PI*.84),basic(0xff786c,.22),0,.145,0);arc.rotation.x=-Math.PI/2;arc.visible=false;
 const bases=[];for(const [x,z] of [[4.7,0],[0,-4.7],[-4.7,0]]){const b=add(world,new THREE.RingGeometry(.42,.68,4),basic(0x8fe6ff,.38),x,.14,z);b.rotation.x=-Math.PI/2;b.rotation.z=Math.PI/4;b.visible=false;bases.push(b);}
 return {g,body,world,type:'act2warden',variant:id,config,hp:config.hp,maxHp:config.hp,state:'stalk',timer:.75,dir:new V(0,0,1),hit:0,slow:0,block:0,takenScale:1,ring,lane,arc,bases,baseIndex:0,moveName:'',hint:'',support:false};
}

export function act2WardenHint(e){return e.hint||({ace:'흰 투구선이 차오르면 옆으로 비키세요',diamond:'빛나는 베이스의 순서를 보고 길에서 벗어나세요',slugger:'붉은 부채꼴 뒤쪽으로 돌아가세요'}[e.variant]);}

// ctx: player, collide, hit, bolt(pos,dir,spec), burst, sound
export function tickAct2Warden(e,dt,time,ctx){
 const to=flat(ctx.player.clone().sub(e.g.position)),distance=to.length();if(distance>1e-6)to.divideScalar(distance);
 e.timer-=dt;e.hit=Math.max(0,e.hit-dt);e.ring.material.opacity=.2+(e.state==='tell'?.22+.18*Math.abs(Math.sin(time*18)):0);
 if(e.variant==='ace')tickAce(e,dt,ctx,to,distance);
 else if(e.variant==='diamond')tickDiamond(e,dt,ctx,to,distance);
 else tickSlugger(e,dt,ctx,to,distance);
 ctx.collide(e.g.position,1);e.body.position.y=e.state==='stalk'?Math.abs(Math.sin(time*7))*0.06:0;
}

function tickAce(e,dt,ctx,to,distance){
 if(e.state==='stalk'){
  face(e,to);const side=Math.sin(e.hp*.01)>0?1:-1;e.g.position.addScaledVector(to,dt*(distance>6?2.2:distance<4?-1.7:0));e.g.position.x+=to.z*dt*1.5*side;e.g.position.z-=to.x*dt*1.5*side;
  if(e.timer<=0){e.state='tell';e.timer=.68;e.dir.copy(to);e.moveName='초구 강속구';e.hint='흰 선이 가득 차기 전에 옆으로';e.lane.visible=true;ctx.sound?.('bossWarning');}
 }else if(e.state==='tell'){
  face(e,e.dir);e.lane.material.opacity=.14+.5*(1-Math.max(0,e.timer)/.68);
  if(e.timer<=0){ctx.bolt(e.g.position,e.dir,{speed:15,damage:19,boss:true});ctx.bolt(e.g.position,e.dir.clone().applyAxisAngle(new V(0,1,0),-.18),{speed:11.5,damage:14,curve:.38,boss:true});ctx.bolt(e.g.position,e.dir.clone().applyAxisAngle(new V(0,1,0),.18),{speed:11.5,damage:14,curve:-.38,boss:true});ctx.burst?.(e.g.position,'amber',18);ctx.sound?.('bossAttack');e.lane.visible=false;e.state='recover';e.timer=.82;}
 }else if(e.timer<=0){e.state='stalk';e.timer=.62;e.moveName='';e.hint='';}
}

function tickDiamond(e,dt,ctx,to,distance){
 if(e.state==='stalk'){
  face(e,to);e.g.position.addScaledVector(to,dt*(distance>5.2?2.4:distance<3.4?-1.8:0));
  if(e.timer<=0){e.state='tell';e.timer=.82;e.moveName='베이스 강탈';e.hint='빛나는 베이스를 잇는 길에서 벗어나세요';e.baseIndex=0;e.bases.forEach(b=>b.visible=true);ctx.sound?.('bossWarning');}
 }else if(e.state==='tell'){
  e.bases.forEach((b,i)=>{b.rotation.z+=dt*(2+i*.3);b.material.opacity=.25+.35*Math.abs(Math.sin(e.timer*12-i));});
  if(e.timer<=0){e.state='commit';e.timer=2.4;e.baseIndex=0;e.dir.copy(flat(e.bases[0].position.clone().sub(e.g.position)).normalize());}
 }else if(e.state==='commit'){
  const before=e.g.position.clone(),target=e.bases[e.baseIndex].position;e.dir.copy(flat(target.clone().sub(e.g.position)).normalize());face(e,e.dir);e.g.position.addScaledVector(e.dir,dt*12);const seg=e.g.position.clone().sub(before),len=seg.lengthSq(),t=len?THREE.MathUtils.clamp(ctx.player.clone().sub(before).dot(seg)/len,0,1):0;if(before.addScaledVector(seg,t).distanceTo(ctx.player)<1.05)ctx.hit(21);
  if(Math.hypot(e.g.position.x-target.x,e.g.position.z-target.z)<.6){ctx.burst?.(target,'chain',12);e.baseIndex++;if(e.baseIndex>=e.bases.length){e.bases.forEach(b=>b.visible=false);e.state='recover';e.timer=1;}}
  if(e.timer<=0){e.bases.forEach(b=>b.visible=false);e.state='recover';e.timer=1;}
 }else if(e.timer<=0){e.state='stalk';e.timer=.65;e.moveName='';e.hint='';}
}

function tickSlugger(e,dt,ctx,to,distance){
 if(e.state==='stalk'){
  face(e,to);e.g.position.addScaledVector(to,dt*(distance>4.8?2:distance<3.1?-1.5:0));
  if(e.timer<=0){e.state='tell';e.timer=.72;e.dir.copy(to);e.moveName='결승타';e.hint='붉은 부채꼴 뒤로 돌아가세요';e.arc.visible=true;ctx.sound?.('bossWarning');}
 }else if(e.state==='tell'){
  face(e,e.dir);e.arc.material.opacity=.18+.5*(1-Math.max(0,e.timer)/.72);
  if(e.timer<=0){if(distance<3.15&&to.dot(e.dir)>.05)ctx.hit(25);for(let i=-3;i<=3;i++)ctx.bolt(e.g.position,e.dir.clone().applyAxisAngle(new V(0,1,0),i*.22),{speed:9.5+Math.abs(i)*.35,damage:16,boss:true});ctx.burst?.(e.g.position,'burst',26);ctx.sound?.('bossAttack');e.arc.visible=false;e.state='recover';e.timer=.9;}
 }else if(e.timer<=0){e.state='stalk';e.timer=.7;e.moveName='';e.hint='';}
}
