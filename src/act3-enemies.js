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
 tellRing:new THREE.RingGeometry(.78,1,24),tellLine:new THREE.PlaneGeometry(.22,11),bolt:merge([tint(new THREE.OctahedronGeometry(.24,0).scale(.65,.65,1.45),0xd7f7ff),tint(new THREE.ConeGeometry(.12,.65,5).rotateX(-Math.PI/2).translate(0,0,.45),0x66d9ff)]),
 bossBolt:merge([tint(new THREE.OctahedronGeometry(.29,0).scale(.72,.72,1.42),0xff9cf4),tint(new THREE.TorusGeometry(.27,.045,4,12).rotateX(Math.PI/2),0x8deaff)])
});
export const ACT3_MATERIALS=Object.freeze({
 craft:new THREE.MeshStandardMaterial({vertexColors:true,roughness:.46,metalness:.18,emissive:0x132e38,emissiveIntensity:.38}),
 warning:new THREE.MeshBasicMaterial({color:0xffa65c,transparent:true,opacity:.68,depthWrite:false,side:THREE.DoubleSide,toneMapped:false,forceSinglePass:true}),
 bossWarning:new THREE.MeshBasicMaterial({color:0xe175ff,transparent:true,opacity:.72,depthWrite:false,side:THREE.DoubleSide,toneMapped:false,forceSinglePass:true}),
 bolt:new THREE.MeshBasicMaterial({vertexColors:true,toneMapped:false}),bossBolt:new THREE.MeshBasicMaterial({vertexColors:true,toneMapped:false})
});

export const ACT3_MINIONS=Object.freeze({
 'sky-scout':{kind:'scout',hp:54,speed:3.85,damage:11,cooldown:1.05},
 'sky-diver':{kind:'diver',hp:28,speed:5.3,damage:18,cooldown:1.9},
 'sky-bomber':{kind:'bomber',hp:90,speed:2.4,damage:13,cooldown:1.52},
 'sky-carrier':{kind:'carrier',hp:185,speed:1.55,damage:13,cooldown:1.25}
});
export const ACT3_ART=Object.freeze({
 'sky-scout':Object.freeze({file:'enemy-act3-flight-atlas-v2.webp',frame:0,size:1.72,baseline:.08}),
 'sky-diver':Object.freeze({file:'enemy-act3-flight-atlas-v2.webp',frame:1,size:1.46,baseline:.08}),
 'sky-bomber':Object.freeze({file:'enemy-act3-flight-atlas-v2.webp',frame:2,size:2.18,baseline:.08}),
 'sky-carrier':Object.freeze({file:'enemy-act3-flight-atlas-v2.webp',frame:3,size:2.48,baseline:.08}),
 act3warden:Object.freeze({file:'boss-act3-johan-atlas-v2.webp',frame:0,size:3.55,baseline:.08}),
 tempestcarrier:Object.freeze({file:'boss-act3-johan-atlas-v2.webp',frames:Object.freeze([1,2,3]),size:4.35,baseline:.08})
});
export const isAct3Minion=type=>Object.hasOwn(ACT3_MINIONS,type);

function baseActor(scene,type,kind,hp){
 const g=new THREE.Group(),body=new THREE.Group(),fallback=new THREE.Mesh(ACT3_GEOMETRIES[kind],ACT3_MATERIALS.craft);fallback.castShadow=false;fallback.receiveShadow=false;body.add(fallback);g.add(body);
 const tell=new THREE.Mesh(ACT3_GEOMETRIES.tellRing,kind==='warden'||kind==='boss'?ACT3_MATERIALS.bossWarning:ACT3_MATERIALS.warning);tell.rotation.x=-Math.PI/2;tell.position.y=.12;tell.visible=false;g.add(tell);
 const line=new THREE.Mesh(ACT3_GEOMETRIES.tellLine,kind==='warden'||kind==='boss'?ACT3_MATERIALS.bossWarning:ACT3_MATERIALS.warning);line.rotation.x=-Math.PI/2;line.position.set(0,.11,5);line.visible=false;g.add(line);scene.add(g);
 return {g,body,tell,line,type,hp,maxHp:hp,state:'stalk',timer:.7,phase:0,hit:0,dir:new V(0,0,1),before:new V(),target:new V(),moveName:'',hint:'',attacks:0,pattern:0};
}

export function createAct3Minion(scene,type,random=Math.random){
 const c=ACT3_MINIONS[type];if(!c)throw new Error(`Unknown act-3 minion ${type}`);const e=baseActor(scene,type,c.kind,c.hp);e.config=c;e.phase=random()*Math.PI*2;e.lane=random()<.5?-1:1;return e;
}
export function createAct3Warden(scene){const e=baseActor(scene,'act3warden','warden',1850);e.config={name:'편대 문지기'};e.timer=.9;return e;}
export const TEMPEST_CARRIER=Object.freeze({name:'폭풍비행사 요한',type:'tempestcarrier',hp:16800,damage:Object.freeze({burst:.05,perSecond:.026})});
export function createTempestCarrier(scene){const e=baseActor(scene,TEMPEST_CARRIER.type,'boss',TEMPEST_CARRIER.hp);e.config=TEMPEST_CARRIER;e.timer=.9;e.phaseIndex=0;e.lastPhase=0;e.damageAllowance=e.maxHp*TEMPEST_CARRIER.damage.burst;e.volleyLeft=0;e.volleyTimer=0;e.volleyStep=0;e.turnSign=1;return e;}
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
   if(e.timer<=0){e.state='tell';e.timer=.34;e.dir.copy(to);ctx.sound?.('bossWarning');}
  }else if(e.state==='tell'){
   e.tell.visible=true;e.tell.scale.setScalar(1+(.34-e.timer)*.8);face(e,e.dir);
   if(e.timer<=0){for(let i=-2;i<=2;i++)shot(ctx,e,e.dir.clone().applyAxisAngle(AXIS_Y,i*.19),{speed:6.5+Math.abs(i)*.35});e.state='stalk';e.timer=e.config.cooldown;ctx.sound?.('bossAttack');}
  }
 }else if(e.type==='sky-diver'){
  if(e.state==='stalk'){e.g.position.x+=Math.sin(time*1.4+e.phase)*dt*1.05;e.g.position.addScaledVector(to,dt*(distance>7?2.2:distance<4?-1.2:0));face(e,to);if(e.timer<=0){e.state='tell';e.timer=.28;e.dir.copy(to);ctx.sound?.('bossWarning');}}
  else if(e.state==='tell'){e.line.visible=true;e.line.rotation.y=Math.atan2(e.dir.x,e.dir.z);face(e,e.dir);if(e.timer<=0){e.state='commit';e.timer=.46;e.chargeHit=false;}}
  else if(e.state==='commit'){face(e,e.dir);e.g.position.addScaledVector(e.dir,dt*15.5);if(!e.chargeHit&&e.g.position.distanceTo(ctx.player)<.85){e.chargeHit=true;ctx.hit(e.config.damage);}if(e.timer<=0){e.state='recover';e.timer=.5;}}
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

const BOSS_MOVES=Object.freeze([
 Object.freeze({name:'편대 포문',hint:'조준선이 겹치기 전에 조금씩 옆으로 흘러 연속 부채꼴을 빼세요'}),
 Object.freeze({name:'태풍 나선',hint:'바깥으로 달아나지 말고 회전하는 탄의 꼬리를 따라 한 바퀴 도세요'}),
 Object.freeze({name:'크루이프 턴',hint:'첫 움직임은 속임수입니다 · 반전한 기체의 반대쪽으로 교차탄을 가르세요'}),
 Object.freeze({name:'낙뢰 장벽',hint:'매번 이동하는 빈 줄을 찾아 벽 하나마다 한 칸씩 옮기세요'}),
 Object.freeze({name:'폭풍핵 전개',hint:'큰 원을 그리지 말고 번갈아 벌어지는 두 고리 사이를 짧게 움직이세요'})
]);
const bossShot=(ctx,e,dir,spec={},offsetX=0)=>{
 const origin=e.g.position.clone();origin.x+=offsetX;
 ctx.bolt(origin,dir,{speed:spec.speed||8.4,damage:spec.damage||15,boss:true,curve:spec.curve||0,life:spec.life||5,scale:spec.scale||1});
};
function startBossBarrage(e,phase){
 e.state='barrage';e.volleyStep=0;e.volleyTimer=0;
 if(e.pattern===0)e.volleyLeft=6+phase*2;
 else if(e.pattern===1)e.volleyLeft=12+phase*3;
 else if(e.pattern===2){e.volleyLeft=10+phase*2;e.turnSign=e.g.position.x>0?-1:1;}
 else if(e.pattern===3)e.volleyLeft=5+phase;
 else e.volleyLeft=4;
}
function tickBossBarrage(e,phase,dt,ctx){
 e.volleyTimer-=dt;
 if(e.pattern===2){
  const halfway=(10+phase*2)/2,sign=e.volleyLeft>halfway?e.turnSign:-e.turnSign;
  e.g.position.x=THREE.MathUtils.clamp(e.g.position.x+sign*dt*(6.4+phase*.8),-6.3,6.3);
 }
 if(e.volleyTimer>0)return false;
 const aimed=e.target.copy(ctx.player).sub(e.g.position).setY(0);if(aimed.lengthSq()>.001)aimed.normalize();else aimed.set(0,0,1);
 if(e.pattern===0){
  for(let i=-2;i<=2;i++)bossShot(ctx,e,aimed.clone().applyAxisAngle(AXIS_Y,i*.12),{speed:8.1+(e.volleyStep%2)*1.15,damage:15+phase*2,scale:1.05},i*.28);
  e.volleyTimer=.2-phase*.015;
 }else if(e.pattern===1){
  const spin=e.volleyStep*.34*(e.turnSign||1);
  for(let i=0;i<3;i++){const a=spin+i*Math.PI*2/3;bossShot(ctx,e,new V(Math.sin(a),0,Math.cos(a)),{speed:6.9+(i%2)*1.2,damage:14+phase*2,curve:(i%2?-.09:.09),scale:1.08});}
  e.volleyTimer=.14;
 }else if(e.pattern===2){
  const cross=(e.volleyStep%2?1:-1)*.26;
  for(const a of [-cross,0,cross])bossShot(ctx,e,aimed.clone().applyAxisAngle(AXIS_Y,a),{speed:9.6+phase*.45,damage:16+phase*2,curve:-Math.sign(a||e.turnSign)*.06,scale:1.12},a*2);
  e.volleyTimer=.16;
 }else if(e.pattern===3){
  const gap=(e.volleyStep*2+phase)%7;
  for(let lane=0;lane<7;lane++)if(lane!==gap){const x=-6.6+lane*2.2,dir=new V((ctx.player.x-x)*.035,0,1).normalize();bossShot(ctx,e,dir,{speed:8.2+phase*.5,damage:17+phase*2,scale:1.08},x-e.g.position.x);}
  e.volleyTimer=.32;
 }else{
  const count=16,offset=(e.volleyStep%2?Math.PI/count:0)+e.volleyStep*.08;
  for(let i=0;i<count;i++){const a=offset+i*Math.PI*2/count;bossShot(ctx,e,new V(Math.sin(a),0,Math.cos(a)),{speed:7.25+(e.volleyStep%2)*1.05,damage:16+phase*2,curve:(e.volleyStep%2?-.07:.07),scale:1.12});}
  e.volleyTimer=.38;
 }
 e.volleyStep++;e.volleyLeft--;ctx.sound?.('bossAttack');
 return e.volleyLeft<=0;
}

export function tickTempestCarrier(e,dt,time,ctx){
 e.before.copy(e.g.position);e.timer-=dt;e.damageAllowance=Math.min(e.maxHp*TEMPEST_CARRIER.damage.burst,e.damageAllowance+e.maxHp*TEMPEST_CARRIER.damage.perSecond*dt);const ratio=e.hp/e.maxHp,to=e.target.copy(ctx.player).sub(e.g.position).setY(0);if(to.lengthSq()>.001)to.normalize();e.tell.visible=e.line.visible=false;
 const phase=ratio>.66?0:ratio>.33?1:2;e.phaseIndex=phase;
 if(phase>e.lastPhase){e.lastPhase=phase;e.state='recover';e.timer=.72;e.moveName='폭풍핵 변환';e.hint='장갑이 열리며 호위 편대가 진입합니다';ctx.summon?.(phase===1?['sky-scout','sky-scout']:['sky-bomber','sky-scout']);ctx.sound?.('bossWarning');}
 if(e.state!=='barrage'||e.pattern!==2)e.g.position.x=THREE.MathUtils.damp(e.g.position.x,Math.sin(time*(.62+phase*.1))*Math.min(5.7,3.4+phase),4.2,dt);
 e.g.position.z=THREE.MathUtils.damp(e.g.position.z,-1.8,5,dt);face(e,to);
 if(e.state==='stalk'&&e.timer<=0){
  const available=phase===0?3:phase===1?4:5;e.pattern=e.attacks++%available;if(e.pattern===1)e.turnSign=e.attacks%2?1:-1;
  const move=BOSS_MOVES[e.pattern];e.state='tell';e.timer=[.46,.38,.34,.42,.5][e.pattern]/(1+phase*.06);e.dir.copy(to);e.moveName=move.name;e.hint=move.hint;ctx.sound?.('bossWarning');
 }else if(e.state==='tell'){
  e.tell.visible=true;e.tell.scale.setScalar((e.pattern===4?2.1:1.45)+Math.sin(time*16)*.13);
  if(e.pattern===2){e.line.visible=true;e.line.rotation.y=Math.atan2(e.dir.x,e.dir.z);}
  if(e.timer<=0)startBossBarrage(e,phase);
 }else if(e.state==='barrage'){
  if(tickBossBarrage(e,phase,dt,ctx)){e.state='recover';e.timer=.58-phase*.04;}
 }else if(e.state==='recover'&&e.timer<=0){e.state='stalk';e.timer=.34-phase*.035;e.moveName='';e.hint='';}
 ctx.collide(e.g.position,1.35);finishMotion(e,dt,time);
}

export const act3BossHint=e=>e?.hint||'기체의 날개와 발사구 섬광으로 다음 공격을 읽으세요';
export const act3BossPatternName=e=>e?.moveName||'편대 재정렬';
