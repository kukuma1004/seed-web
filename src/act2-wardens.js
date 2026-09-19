import * as THREE from 'three';

const V=THREE.Vector3,AXIS_Y=new V(0,1,0);

export const ACT2_WARDENS=Object.freeze({
 ace:Object.freeze({name:'직구의 문지기',hp:1750,color:0xffd16a}),
 diamond:Object.freeze({name:'다이아몬드의 문지기',hp:1900,color:0x70d6ff}),
 slugger:Object.freeze({name:'강타의 문지기',hp:2000,color:0xff6b5f})
});
export const ACT2_WARDEN_ART=Object.freeze({
 ace:Object.freeze({file:'warden-act2-ace-v1.webp',size:4.05,baseline:.015}),
 diamond:Object.freeze({file:'warden-act2-diamond-v1.webp',size:3.75,baseline:.015}),
 slugger:Object.freeze({file:'warden-act2-slugger-v1.webp',size:4.25,baseline:.015})
});

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
const showOnlyBase=(e,index)=>e.bases.forEach((base,i)=>base.visible=i===index);
const chargeHit=(e,ctx,before,radius,damage)=>{
 const segment=e.segment.copy(e.g.position).sub(before),length=segment.lengthSq();
 const t=length?THREE.MathUtils.clamp(e.probe.copy(ctx.player).sub(before).dot(segment)/length,0,1):0;
 if(!e.chargeHit&&e.probe.copy(before).addScaledVector(segment,t).distanceTo(ctx.player)<radius){e.chargeHit=true;ctx.hit(damage);}
};

export function createAct2Warden(scene,variant='ace'){
 const config=ACT2_WARDENS[variant]||ACT2_WARDENS.ace,id=ACT2_WARDENS[variant]?variant:'ace';
 const g=new THREE.Group(),body=new THREE.Group(),world=new THREE.Group();g.add(body);scene.add(g,world);
 const red=standard(0x8f2530,0x351018),gold=standard(0xd9a842,0x4d2a07),ivory=standard(0xf2ead1),dark=standard(0x27323d,0x101820),accent=standard(config.color,config.color);
 add(body,new THREE.CylinderGeometry(.72,.95,1.55,8),red,0,1.05,0);add(body,new THREE.IcosahedronGeometry(.55,1),ivory,0,2.15,0);add(body,new THREE.CylinderGeometry(.66,.66,.22,12),dark,0,2.48,0);
 const brim=add(body,new THREE.BoxGeometry(1.05,.08,.42),dark,0,2.43,.28);brim.rotation.x=-.08;
 for(const x of [-.78,.78])add(body,new THREE.DodecahedronGeometry(.35),gold,x,1.55,0);add(body,new THREE.OctahedronGeometry(.22),accent,0,1.35,.78);
 if(id==='ace'){add(body,new THREE.IcosahedronGeometry(.23,1),ivory,.9,1.05,.5);const arm=add(body,new THREE.CylinderGeometry(.14,.2,1.25,7),red,.72,1.35,.28);arm.rotation.z=-.72;}
 else if(id==='diamond'){for(const x of [-.48,.48]){const cleat=add(body,new THREE.ConeGeometry(.18,.55,5),accent,x,.35,.1);cleat.rotation.x=Math.PI/2;}for(const side of [-1,1]){const wing=add(body,new THREE.OctahedronGeometry(.34),accent,side*.92,1.2,0);wing.scale.set(1.5,.7,.8);}}
 else{const bat=add(body,new THREE.CylinderGeometry(.11,.18,2.4,8),gold,.82,1.45,.15);bat.rotation.z=-.82;bat.rotation.x=.18;add(body,new THREE.TorusGeometry(.62,.11,6,24,Math.PI),accent,0,2.18,.08).rotation.z=Math.PI;}
 const ring=add(g,new THREE.RingGeometry(.95,1.06,40),basic(config.color,.28),0,.13,0);ring.rotation.x=-Math.PI/2;
 // Short departure cues replace full-room safe-zone answers.
 const lane=add(g,new THREE.PlaneGeometry(.68,2.8),basic(0xffefbd,.22),0,.14,1.55);lane.rotation.x=-Math.PI/2;lane.visible=false;
 const arc=add(g,new THREE.RingGeometry(1.05,2.1,28,1,-Math.PI*.34,Math.PI*.68),basic(0xff786c,.24),0,.145,0);arc.rotation.x=-Math.PI/2;arc.visible=false;
 const bases=[];for(const [x,z] of [[4.7,0],[0,-4.7],[-4.7,0]]){const b=add(world,new THREE.RingGeometry(.42,.68,4),basic(0x8fe6ff,.4),x,.14,z);b.rotation.x=-Math.PI/2;b.rotation.z=Math.PI/4;b.visible=false;bases.push(b);}
 return {g,body,world,type:'act2warden',variant:id,config,hp:config.hp,maxHp:config.hp,state:'stalk',timer:.55,dir:new V(0,0,1),to:new V(),targetDelta:new V(),before:new V(),segment:new V(),probe:new V(),hit:0,slow:0,block:0,takenScale:1,ring,lane,arc,bases,baseIndex:0,routeDir:1,attacks:0,chargeHit:false,moveName:'',hint:'',support:false};
}

export function act2WardenHint(e){return e.hint||({ace:'투구 동작과 공의 출발을 읽으세요',diamond:'한 번에 하나씩 켜지는 베이스를 읽으세요',slugger:'방망이의 방향을 보고 끝까지 움직이세요'}[e.variant]);}

export function tickAct2Warden(e,dt,time,ctx){
 const to=flat(e.to.copy(ctx.player).sub(e.g.position)),distance=to.length();if(distance>1e-6)to.divideScalar(distance);
 e.timer-=dt;e.hit=Math.max(0,e.hit-dt);e.ring.material.opacity=.2+(e.state==='tell'?.22+.18*Math.abs(Math.sin(time*18)):0);
 if(e.variant==='ace')tickAce(e,dt,ctx,to,distance);else if(e.variant==='diamond')tickDiamond(e,dt,ctx,to,distance);else tickSlugger(e,dt,ctx,to,distance);
 ctx.collide(e.g.position,1);
 const charging=e.state==='commit'||e.state==='slide'||e.state==='lunge';
 e.body.rotation.x=THREE.MathUtils.damp(e.body.rotation.x,charging?.22:0,13,dt);e.body.rotation.z=THREE.MathUtils.damp(e.body.rotation.z,charging?(e.routeDir||1)*.1:0,13,dt);
 e.body.scale.y=THREE.MathUtils.damp(e.body.scale.y,e.state==='slide'?.78:1,15,dt);e.body.scale.x=THREE.MathUtils.damp(e.body.scale.x,e.state==='slide'?1.13:1,15,dt);e.body.position.y=e.state==='stalk'?Math.abs(Math.sin(time*9))*.075:0;
}

function tickAce(e,dt,ctx,to,distance){
 if(e.state==='stalk'){
  face(e,to);const side=e.attacks%2?1:-1;e.g.position.addScaledVector(to,dt*(distance>6?3.1:distance<3.8?-2.35:0));e.g.position.x+=to.z*dt*2.6*side;e.g.position.z-=to.x*dt*2.6*side;
  if(e.timer<=0){e.state='tell';e.timer=.44;e.dir.copy(to);e.attacks++;e.moveName='강속구 교차투구';e.hint='투구 팔이 멈춘 순간부터 계속 움직이세요';e.lane.visible=true;ctx.sound?.('bossWarning');}
 }else if(e.state==='tell'){
  face(e,e.dir);e.lane.material.opacity=.16+.48*(1-Math.max(0,e.timer)/.44);
  if(e.timer<=0){ctx.bolt(e.g.position,e.dir,{speed:18.5,damage:21,boss:true});for(const angle of [-.22,.22])ctx.bolt(e.g.position,e.dir.clone().applyAxisAngle(AXIS_Y,angle),{speed:15.3,damage:16,curve:-Math.sign(angle)*.52,boss:true});for(const angle of [-.39,.39])ctx.bolt(e.g.position,e.dir.clone().applyAxisAngle(AXIS_Y,angle),{speed:13.8,damage:15,curve:Math.sign(angle)*.34,boss:true});ctx.burst?.(e.g.position,'amber',20);ctx.sound?.('bossAttack');e.lane.visible=false;e.state='recover';e.timer=.5;}
 }else if(e.timer<=0){e.state='stalk';e.timer=.42;e.moveName='';e.hint='';}
}

function diamondTarget(e){return e.bases[e.baseIndex].position;}
function nextDiamondLeg(e,ctx){
 e.baseIndex+=e.routeDir;
 if(e.baseIndex>=0&&e.baseIndex<e.bases.length){showOnlyBase(e,e.baseIndex);e.chargeHit=false;return;}
 e.bases.forEach(base=>base.visible=false);e.state='slideTell';e.timer=.3;e.moveName='헤드퍼스트 슬라이딩';e.hint='마지막 베이스 뒤 몸이 낮아지면 방향을 바꾸세요';e.dir.copy(flat(e.targetDelta.copy(ctx.player).sub(e.g.position)).normalize());
}
function tickDiamond(e,dt,ctx,to,distance){
 if(e.state==='stalk'){
  face(e,to);const side=e.attacks%2?1:-1;e.g.position.addScaledVector(to,dt*(distance>5.4?3.25:distance<3.1?-2.4:0));e.g.position.x+=to.z*dt*1.8*side;e.g.position.z-=to.x*dt*1.8*side;
  if(e.timer<=0){e.state='tell';e.timer=.48;e.moveName='역주 베이스 강탈';e.hint='첫 베이스 하나만 보고 다음 방향을 판단하세요';e.routeDir=e.attacks++%2?1:-1;e.baseIndex=e.routeDir>0?0:e.bases.length-1;showOnlyBase(e,e.baseIndex);ctx.sound?.('bossWarning');}
 }else if(e.state==='tell'){
  const base=e.bases[e.baseIndex];base.rotation.z+=dt*4;base.material.opacity=.28+.42*Math.abs(Math.sin(e.timer*15));face(e,flat(e.targetDelta.copy(base.position).sub(e.g.position)));if(e.timer<=0){e.state='commit';e.timer=2.15;e.chargeHit=false;}
 }else if(e.state==='commit'){
  const target=diamondTarget(e),before=e.before.copy(e.g.position);e.dir.copy(flat(e.targetDelta.copy(target).sub(e.g.position)).normalize());face(e,e.dir);e.g.position.addScaledVector(e.dir,dt*(14.5+Math.abs(e.baseIndex-1)*1.2));chargeHit(e,ctx,before,1.08,23);
  if(Math.hypot(e.g.position.x-target.x,e.g.position.z-target.z)<.62){ctx.burst?.(target,'chain',12);nextDiamondLeg(e,ctx);}else if(e.timer<=0){e.bases.forEach(base=>base.visible=false);e.state='slideTell';e.timer=.25;e.dir.copy(to);}
 }else if(e.state==='slideTell'){face(e,e.dir);if(e.timer<=0){e.state='slide';e.timer=.62;e.chargeHit=false;ctx.burst?.(e.g.position,'chain',14);ctx.sound?.('bossAttack');}}
 else if(e.state==='slide'){const before=e.before.copy(e.g.position);face(e,e.dir);e.g.position.addScaledVector(e.dir,dt*18.5);chargeHit(e,ctx,before,1.18,29);if(e.timer<=0){e.state='recover';e.timer=.62;}}
 else if(e.timer<=0){e.state='stalk';e.timer=.42;e.moveName='';e.hint='';}
}

function tickSlugger(e,dt,ctx,to,distance){
 if(e.state==='stalk'){
  face(e,to);const side=e.attacks%2?1:-1;e.g.position.addScaledVector(to,dt*(distance>5?2.9:distance<2.8?-2.1:0));e.g.position.x+=to.z*dt*1.7*side;e.g.position.z-=to.x*dt*1.7*side;
  if(e.timer<=0){e.state='tell';e.timer=.5;e.dir.copy(to);e.attacks++;e.moveName='밀어붙이는 결승타';e.hint='짧은 타격 신호 뒤 전진까지 이어집니다';e.arc.visible=true;ctx.sound?.('bossWarning');}
 }else if(e.state==='tell'){
  face(e,e.dir);e.arc.material.opacity=.2+.46*(1-Math.max(0,e.timer)/.5);if(e.timer<=0){e.state='lunge';e.timer=.25;e.chargeHit=false;e.arc.visible=false;}
 }else if(e.state==='lunge'){
  const before=e.before.copy(e.g.position);face(e,e.dir);e.g.position.addScaledVector(e.dir,dt*11.5);chargeHit(e,ctx,before,1.22,27);
  if(e.timer<=0){if(distance<3.25&&to.dot(e.dir)>-.05)ctx.hit(28);for(let i=-4;i<=4;i++)ctx.bolt(e.g.position,e.dir.clone().applyAxisAngle(AXIS_Y,i*.185),{speed:12.5+Math.abs(i)*.38,damage:17,boss:true});for(const angle of [-.62,.62])ctx.bolt(e.g.position,e.dir.clone().applyAxisAngle(AXIS_Y,angle),{speed:11.7,damage:15,curve:-Math.sign(angle)*.42,boss:true});ctx.burst?.(e.g.position,'burst',28);ctx.sound?.('bossAttack');e.state='recover';e.timer=.54;}
 }else if(e.timer<=0){e.state='stalk';e.timer=.45;e.moveName='';e.hint='';}
}
