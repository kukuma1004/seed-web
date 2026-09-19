import * as THREE from 'three';
import {mergeGeometries} from 'three/addons/utils/BufferGeometryUtils.js';

const V=THREE.Vector3,AXIS_Y=new V(0,1,0);
const tint=(geometry,color)=>{const g=geometry.index?geometry.toNonIndexed():geometry,c=new THREE.Color(color),a=new Float32Array(g.attributes.position.count*3);for(let i=0;i<a.length;i+=3){a[i]=c.r;a[i+1]=c.g;a[i+2]=c.b;}g.setAttribute('color',new THREE.BufferAttribute(a,3));return g;};
const merge=parts=>{const flat=parts.map(g=>g.index?g.toNonIndexed():g),out=mergeGeometries(flat,false);for(const g of new Set([...parts,...flat]))if(g!==out)g.dispose();return out;};
const wing=(x,scale=1,flip=1)=>tint(new THREE.ConeGeometry(.54*scale,1.75*scale,3).rotateZ(flip*Math.PI/2).rotateY(flip*.2).translate(x,.76,0),0x9ae8d0);
const craft=(kind)=>{
 const p=[];
 if(kind==='scout'){p.push(tint(new THREE.IcosahedronGeometry(.46,1).scale(.8,1.1,1.35).translate(0,.75,0),0x31596e),wing(-.9,.8,-1),wing(.9,.8,1),tint(new THREE.ConeGeometry(.2,.9,5).rotateX(Math.PI/2).translate(0,.72,.72),0xf2c56b));}
 else if(kind==='diver'){p.push(tint(new THREE.ConeGeometry(.42,1.8,6).rotateX(-Math.PI/2).translate(0,.72,-.15),0xc95d4b),wing(-.82,.65,-1),wing(.82,.65,1),tint(new THREE.OctahedronGeometry(.25,0).translate(0,.78,.4),0xffe18a));}
 else if(kind==='bomber'){p.push(tint(new THREE.SphereGeometry(.62,8,5).scale(1.2,.75,1.5).translate(0,.76,0),0x5b4778),wing(-1.05,.95,-1),wing(1.05,.95,1),tint(new THREE.CylinderGeometry(.18,.24,.8,6).rotateX(Math.PI/2).translate(-.45,.45,.45),0xf18b62),tint(new THREE.CylinderGeometry(.18,.24,.8,6).rotateX(Math.PI/2).translate(.45,.45,.45),0xf18b62));}
 else if(kind==='carrier'){p.push(tint(new THREE.BoxGeometry(2.6,.5,1.4).translate(0,.65,0),0x314052),tint(new THREE.ConeGeometry(.7,1.8,4).rotateX(-Math.PI/2).translate(0,.72,-.35),0x658b79),tint(new THREE.CylinderGeometry(.22,.3,.8,7).translate(-.72,1.15,0),0xf1c65f),tint(new THREE.CylinderGeometry(.22,.3,.8,7).translate(.72,1.15,0),0xf1c65f));}
 else if(kind==='warden'){p.push(tint(new THREE.IcosahedronGeometry(.86,1).scale(1,1.15,1.35).translate(0,1.05,0),0x263e5c),wing(-1.65,1.55,-1),wing(1.65,1.55,1),tint(new THREE.TorusGeometry(.58,.12,6,18).rotateX(Math.PI/2).translate(0,1.08,.25),0xffd36a),tint(new THREE.ConeGeometry(.34,1.7,6).rotateX(Math.PI/2).translate(0,.92,.95),0xb662d8));}
 else {p.push(
  tint(new THREE.ConeGeometry(1.15,4.35,5).rotateX(-Math.PI/2).scale(1,.62,1).translate(0,.84,-.2),0x29485d),
  tint(new THREE.ConeGeometry(1.12,3.45,4).rotateZ(-Math.PI/2).rotateY(-.22).scale(1,.52,1).translate(-1.72,.76,.15),0x416f77),
  tint(new THREE.ConeGeometry(1.12,3.45,4).rotateZ(Math.PI/2).rotateY(.22).scale(1,.52,1).translate(1.72,.76,.15),0x416f77),
  tint(new THREE.OctahedronGeometry(.78,1).scale(.8,.7,1.35).translate(0,1.12,.28),0x88c7a7),
  tint(new THREE.TorusGeometry(.9,.15,8,24).rotateX(Math.PI/2).translate(0,1.02,.3),0xffd867),
  tint(new THREE.ConeGeometry(.42,1.45,5).rotateX(Math.PI/2).translate(-1.32,.82,1.24),0xd05670),
  tint(new THREE.ConeGeometry(.42,1.45,5).rotateX(Math.PI/2).translate(1.32,.82,1.24),0xd05670),
  tint(new THREE.ConeGeometry(.3,1.2,4).rotateX(-Math.PI/2).translate(0,.88,-2.05),0xe3e991)
 );}
 return merge(p);
};

export const ACT3_GEOMETRIES=Object.freeze({
 scout:craft('scout'),diver:craft('diver'),bomber:craft('bomber'),carrier:craft('carrier'),warden:craft('warden'),boss:craft('boss'),
 tellRing:new THREE.RingGeometry(.78,1,24),tellLine:new THREE.PlaneGeometry(.22,11),bolt:merge([tint(new THREE.OctahedronGeometry(.24,0).scale(.65,.65,1.45),0xd7f7ff),tint(new THREE.ConeGeometry(.12,.65,5).rotateX(-Math.PI/2).translate(0,0,.45),0x66d9ff)])
});
export const ACT3_MATERIALS=Object.freeze({
 craft:new THREE.MeshStandardMaterial({vertexColors:true,roughness:.46,metalness:.18,emissive:0x132e38,emissiveIntensity:.38}),
 warning:new THREE.MeshBasicMaterial({color:0xffa65c,transparent:true,opacity:.68,depthWrite:false,side:THREE.DoubleSide,toneMapped:false,forceSinglePass:true}),
 bossWarning:new THREE.MeshBasicMaterial({color:0xe175ff,transparent:true,opacity:.72,depthWrite:false,side:THREE.DoubleSide,toneMapped:false,forceSinglePass:true}),
 bolt:new THREE.MeshBasicMaterial({vertexColors:true,toneMapped:false})
});

const CONFIG=Object.freeze({
 'sky-scout':{kind:'scout',hp:48,speed:3.7,damage:12,cooldown:1.35},
 'sky-diver':{kind:'diver',hp:62,speed:4.1,damage:20,cooldown:1.55},
 'sky-bomber':{kind:'bomber',hp:84,speed:2.35,damage:14,cooldown:1.8},
 'sky-carrier':{kind:'carrier',hp:170,speed:1.4,damage:15,cooldown:1.55}
});
export const isAct3Minion=type=>Object.hasOwn(CONFIG,type);

function baseActor(scene,type,kind,hp){
 const g=new THREE.Group(),body=new THREE.Mesh(ACT3_GEOMETRIES[kind],ACT3_MATERIALS.craft);body.castShadow=false;body.receiveShadow=false;g.add(body);
 const tell=new THREE.Mesh(ACT3_GEOMETRIES.tellRing,kind==='warden'||kind==='boss'?ACT3_MATERIALS.bossWarning:ACT3_MATERIALS.warning);tell.rotation.x=-Math.PI/2;tell.position.y=.12;tell.visible=false;g.add(tell);
 const line=new THREE.Mesh(ACT3_GEOMETRIES.tellLine,kind==='warden'||kind==='boss'?ACT3_MATERIALS.bossWarning:ACT3_MATERIALS.warning);line.rotation.x=-Math.PI/2;line.position.set(0,.11,5);line.visible=false;g.add(line);scene.add(g);
 return {g,body,tell,line,type,hp,maxHp:hp,state:'stalk',timer:.7,phase:0,hit:0,dir:new V(0,0,1),before:new V(),target:new V(),moveName:'',hint:'',attacks:0,pattern:0};
}

export function createAct3Minion(scene,type,random=Math.random){
 const c=CONFIG[type];if(!c)throw new Error(`Unknown act-3 minion ${type}`);const e=baseActor(scene,type,c.kind,c.hp);e.config=c;e.phase=random()*Math.PI*2;e.lane=random()<.5?-1:1;return e;
}
export function createAct3Warden(scene){const e=baseActor(scene,'act3warden','warden',1850);e.config={name:'편대 문지기'};e.timer=.9;return e;}
export const TEMPEST_CARRIER=Object.freeze({name:'뇌운모함',type:'tempestcarrier',hp:13200,damage:Object.freeze({burst:.06,perSecond:.028})});
export function createTempestCarrier(scene){const e=baseActor(scene,TEMPEST_CARRIER.type,'boss',TEMPEST_CARRIER.hp);e.config=TEMPEST_CARRIER;e.timer=1.1;e.phaseIndex=0;e.damageAllowance=e.maxHp*TEMPEST_CARRIER.damage.burst;return e;}
export function damageTempestCarrier(e,amount){const cap=e.maxHp*TEMPEST_CARRIER.damage.burst,allowed=Math.max(0,Math.min(Number(amount)||0,e.damageAllowance,cap));e.damageAllowance-=allowed;e.hp-=allowed;return allowed;}

const face=(e,d)=>{if(d.lengthSq()>.001)e.g.rotation.y=Math.atan2(d.x,d.z);};
const finishMotion=(e,dt,time)=>{const dx=e.g.position.x-e.before.x,dz=e.g.position.z-e.before.z;e.body.rotation.z=THREE.MathUtils.damp(e.body.rotation.z,-dx*1.7,7,dt);e.body.rotation.x=THREE.MathUtils.damp(e.body.rotation.x,dz*.34,7,dt);e.body.position.y=Math.sin(time*5+e.phase)*.07;e.hit=Math.max(0,e.hit-dt);};
const shot=(ctx,e,dir,spec={})=>ctx.bolt(e.g.position,dir,{speed:spec.speed||8.4,damage:spec.damage||e.config?.damage||14,boss:Boolean(spec.boss),curve:spec.curve||0,life:spec.life||4.5});

export function tickAct3Minion(e,dt,time,ctx){
 e.before.copy(e.g.position);e.timer-=dt;const to=e.target.copy(ctx.player).sub(e.g.position).setY(0),distance=to.length();if(distance>.001)to.normalize();e.tell.visible=e.line.visible=false;
 if(e.type==='sky-scout'){
  e.g.position.x+=Math.sin(time*2.2+e.phase)*dt*1.5;e.g.position.addScaledVector(to,dt*(distance>6?e.config.speed:distance<3?-1.8:.25));face(e,to);
  if(e.timer<=0){e.timer=e.config.cooldown;e.attacks++;shot(ctx,e,to,{speed:9.4});if(e.attacks%3===0)for(const a of [-.22,.22])shot(ctx,e,to.clone().applyAxisAngle(AXIS_Y,a),{speed:8.7});ctx.sound?.('bossAttack');}
 }else if(e.type==='sky-bomber'){
  if(e.state==='stalk'){
   e.g.position.x+=Math.sin(time*.9+e.phase)*dt*1.2;e.g.position.addScaledVector(to,dt*(distance>7?e.config.speed:distance<5?-1.1:0));face(e,to);
   if(e.timer<=0){e.state='tell';e.timer=.42;e.dir.copy(to);ctx.sound?.('bossWarning');}
  }else if(e.state==='tell'){
   e.tell.visible=true;e.tell.scale.setScalar(1+(.42-e.timer)*.8);face(e,e.dir);
   if(e.timer<=0){for(let i=-2;i<=2;i++)shot(ctx,e,e.dir.clone().applyAxisAngle(AXIS_Y,i*.19),{speed:6.5+Math.abs(i)*.35});e.state='stalk';e.timer=e.config.cooldown;ctx.sound?.('bossAttack');}
  }
 }else if(e.type==='sky-diver'){
  if(e.state==='stalk'){e.g.position.x+=Math.sin(time*1.4+e.phase)*dt*1.05;e.g.position.addScaledVector(to,dt*(distance>7?2.2:distance<4?-1.2:0));face(e,to);if(e.timer<=0){e.state='tell';e.timer=.38;e.dir.copy(to);ctx.sound?.('bossWarning');}}
  else if(e.state==='tell'){e.line.visible=true;e.line.rotation.y=Math.atan2(e.dir.x,e.dir.z);face(e,e.dir);if(e.timer<=0){e.state='commit';e.timer=.54;e.chargeHit=false;}}
  else if(e.state==='commit'){face(e,e.dir);e.g.position.addScaledVector(e.dir,dt*13.8);if(!e.chargeHit&&e.g.position.distanceTo(ctx.player)<.85){e.chargeHit=true;ctx.hit(e.config.damage);}if(e.timer<=0){e.state='recover';e.timer=.55;}}
  else if(e.timer<=0){e.state='stalk';e.timer=e.config.cooldown;}
 }else{
  e.g.position.x+=Math.sin(time*.72+e.phase)*dt*.65;e.g.position.addScaledVector(to,dt*(distance>8?1.1:distance<6?-.75:0));face(e,to);
  if(e.timer<=0){e.timer=e.config.cooldown;e.attacks++;for(let i=-3;i<=3;i++)shot(ctx,e,to.clone().applyAxisAngle(AXIS_Y,i*.15),{speed:7.2+((i+3)%2)*1.3});ctx.sound?.('bossAttack');}
 }
 ctx.collide(e.g.position,.52);finishMotion(e,dt,time);
}

export function tickAct3Warden(e,dt,time,ctx){
 e.before.copy(e.g.position);e.timer-=dt;const to=e.target.copy(ctx.player).sub(e.g.position).setY(0),distance=to.length();if(distance>.001)to.normalize();e.tell.visible=e.line.visible=false;
 if(e.state==='stalk'){
  e.g.position.x+=Math.sin(time*.9)*dt*2.2;e.g.position.addScaledVector(to,dt*(distance>6.5?2.15:distance<4.2?-1.5:0));face(e,to);
  if(e.timer<=0){e.pattern=e.attacks++%3;e.state='tell';e.timer=e.pattern===1?.34:.52;e.dir.copy(to);e.moveName=['교차 편대','낙하 관통','회전 뇌광'][e.pattern];e.hint=['빠른 탄과 느린 탄의 틈을 두 번 나누어 지나세요','날개가 접히면 옆으로 크게 벗어나세요','한 방향으로 돌며 나선의 뒤를 따라가세요'][e.pattern];ctx.sound?.('bossWarning');}
 }else if(e.state==='tell'){
  face(e,e.dir);if(e.pattern===1){e.line.visible=true;e.line.rotation.y=Math.atan2(e.dir.x,e.dir.z);}else{e.tell.visible=true;e.tell.scale.setScalar(1.15+Math.sin(time*15)*.12);}
  if(e.timer<=0){if(e.pattern===1){e.state='charge';e.timer=.58;e.chargeHit=false;}else{const count=e.pattern===2?16:9;for(let i=0;i<count;i++){const a=e.pattern===2?i*Math.PI*2/count:(i-(count-1)/2)*.15;shot(ctx,e,(e.pattern===2?new V(Math.sin(a),0,Math.cos(a)):e.dir.clone().applyAxisAngle(AXIS_Y,a)),{speed:e.pattern===2?6.8+(i%2)*1.8:8.6+Math.abs(i-(count-1)/2)*.22,damage:16,boss:true});}e.state='recover';e.timer=.68;ctx.sound?.('bossAttack');}}
 }else if(e.state==='charge'){
  face(e,e.dir);e.g.position.addScaledVector(e.dir,dt*16.2);if(!e.chargeHit&&e.g.position.distanceTo(ctx.player)<1.05){e.chargeHit=true;ctx.hit(28);}if(e.timer<=0){e.state='recover';e.timer=.62;}
 }else if(e.timer<=0){e.state='stalk';e.timer=.5;e.moveName='';e.hint='';}
 ctx.collide(e.g.position,.78);finishMotion(e,dt,time);
}

export function tickTempestCarrier(e,dt,time,ctx){
 e.before.copy(e.g.position);e.timer-=dt;e.damageAllowance=Math.min(e.maxHp*TEMPEST_CARRIER.damage.burst,e.damageAllowance+e.maxHp*TEMPEST_CARRIER.damage.perSecond*dt);const ratio=e.hp/e.maxHp,to=e.target.copy(ctx.player).sub(e.g.position).setY(0);if(to.lengthSq()>.001)to.normalize();e.tell.visible=e.line.visible=false;
 const phase=ratio>.66?0:ratio>.33?1:2;e.phaseIndex=phase;
 if(e.state!=='charge')e.g.position.x=Math.sin(time*(.55+phase*.12))*Math.min(5.6,2.8+phase*1.2);face(e,to);
 if(e.state==='stalk'&&e.timer<=0){e.pattern=e.attacks++%3;e.state='tell';e.timer=[.6,.46,.52][e.pattern]/(1+phase*.08);e.dir.copy(to);e.moveName=['번개 격자','폭풍 나선','모함 강하'][e.pattern];e.hint=['서로 다른 속도의 세로 탄 사이에서 한 줄씩 옮기세요','바깥으로 도망가지 말고 나선의 뒤를 따라 도세요','중앙 섬광 뒤 좌우 어느 쪽으로든 크게 빠지세요'][e.pattern];ctx.sound?.('bossWarning');}
 else if(e.state==='tell'){
  if(e.pattern===2){e.line.visible=true;e.line.rotation.y=Math.atan2(e.dir.x,e.dir.z);}else{e.tell.visible=true;e.tell.scale.setScalar(1.6+Math.sin(time*14)*.16);}
  if(e.timer<=0){
   if(e.pattern===0){for(let lane=-4;lane<=4;lane++)for(let row=0;row<2+phase;row++){const d=new V(Math.sin(lane*.16),0,Math.cos(lane*.16));shot(ctx,e,d,{speed:6.6+row*2.2,damage:15+phase*2,boss:true});}}
   else if(e.pattern===1){const count=20+phase*4,offset=e.attacks*.31;for(let i=0;i<count;i++){const a=offset+i*Math.PI*2/count;shot(ctx,e,new V(Math.sin(a),0,Math.cos(a)),{speed:6.4+(i%3)*1.15,damage:14+phase*2,boss:true,curve:(i%2?1:-1)*.12});}}
   else {e.state='charge';e.timer=.7;e.chargeHit=false;ctx.sound?.('bossAttack');finishMotion(e,dt,time);return;}
   e.state='recover';e.timer=.7-phase*.06;ctx.sound?.('bossAttack');
  }
 }else if(e.state==='charge'){e.g.position.addScaledVector(e.dir,dt*(15+phase));if(!e.chargeHit&&e.g.position.distanceTo(ctx.player)<1.55){e.chargeHit=true;ctx.hit(32+phase*3);}if(e.timer<=0){e.g.position.set(0,0,2.8);e.state='recover';e.timer=.72;}}
 else if(e.state==='recover'&&e.timer<=0){e.state='stalk';e.timer=.42-phase*.04;e.moveName='';e.hint='';}
 ctx.collide(e.g.position,1.35);finishMotion(e,dt,time);
}

export const act3BossHint=e=>e?.hint||'기체의 날개와 발사구 섬광으로 다음 공격을 읽으세요';
export const act3BossPatternName=e=>e?.moveName||'편대 재정렬';
