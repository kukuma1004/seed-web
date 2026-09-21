import * as THREE from 'three';

const V=THREE.Vector3,TAU=Math.PI*2,AXIS_Y=new V(0,1,0);
const FULL_COUNT_OFFSETS=Object.freeze([-.16,0,.16]),FULL_COUNT_SPEEDS=Object.freeze([21.5,25,23]);
export const ALWAYS_BEGINNER=Object.freeze({name:'항상초심',hp:13800,damage:Object.freeze({burst:.07,perSecond:.033}),contact:18});
export const ALWAYS_BEGINNER_ART=Object.freeze({file:'boss-always-beginner-v1.webp',size:4.85,baseline:.015});
// tempo·boltSpeed(2026-09-22 사용자: "항상초심이 너무 어렵다, 속도를 조금 늦추자"): 몸동작·예고·질주 시계 전체를 12%,
// 던지는 공의 속도를 10% 늦춘다. 받는 피해 허용량(damageAllowance)은 원래 시간으로 차서 싸움 길이는 늘지 않는다.
export const ALWAYS_TUNING=Object.freeze({spiralVolleys:16,spiralInterval:.085,spiralBolts:32,fastballSpeed:22.5,slideSpeed:24,tempo:.88,boltSpeed:.9});
export const ALWAYS_PHASES=Object.freeze({
 rookie:Object.freeze({label:'초심',tempo:.86,patterns:Object.freeze(['fastball','steal','curve','slide'])}),
 rally:Object.freeze({label:'집중',tempo:.68,patterns:Object.freeze(['fastball','doubleplay','wildpitch','homerun','spiral','curve','slide'])}),
 finish:Object.freeze({label:'끝내기',tempo:.52,patterns:Object.freeze(['fullcount','spiral','wildpitch','doubleplay','homerun','slide','curve'])})
});
const basic=(color,opacity=.5)=>new THREE.MeshBasicMaterial({color,transparent:true,opacity,depthWrite:false,side:THREE.DoubleSide,toneMapped:false,forceSinglePass:true});
const standard=(color,emissive=0)=>new THREE.MeshStandardMaterial({color,emissive,emissiveIntensity:.65,roughness:.5,metalness:.1});
const add=(parent,geometry,material,x=0,y=0,z=0)=>{const m=new THREE.Mesh(geometry,material);m.position.set(x,y,z);m.castShadow=m.receiveShadow=true;parent.add(m);return m;};
const flat=v=>{v.y=0;return v;};
const phaseFor=(hp,max)=>hp/max>.66?'rookie':hp/max>.33?'rally':'finish';
const face=(e,d)=>{if(d.lengthSq()>1e-8)e.g.rotation.y=Math.atan2(d.x,d.z);};

export function createAlwaysBeginner(scene){
 const g=new THREE.Group(),body=new THREE.Group(),world=new THREE.Group();g.add(body);scene.add(g,world);
 const red=standard(0xa11f2b,0x3e0810),gold=standard(0xe2b44c,0x5b3108),ivory=standard(0xf5e7c8),dark=standard(0x202834,0x0b1118),stripe=standard(0x17191d,0x060708);
 add(body,new THREE.CylinderGeometry(.82,1.08,1.75,9),red,0,1.2,0);add(body,new THREE.IcosahedronGeometry(.68,2),ivory,0,2.55,0);add(body,new THREE.ConeGeometry(.2,.5,5),gold,0,2.43,.68).rotation.x=Math.PI/2;
 for(const x of [-.28,.28])add(body,new THREE.IcosahedronGeometry(.075,0),dark,x,2.68,.56);for(const x of [-.46,0,.46]){const s=add(body,new THREE.BoxGeometry(.11,.6,.08),stripe,x,2.62,.58);s.rotation.z=x*.4;}
 add(body,new THREE.CylinderGeometry(.78,.78,.24,12),dark,0,3.03,0);const brim=add(body,new THREE.BoxGeometry(1.3,.1,.5),dark,0,2.96,.34);brim.rotation.x=-.08;
 for(const side of [-1,1]){add(body,new THREE.DodecahedronGeometry(.43),gold,side*.98,1.7,0);const paw=add(body,new THREE.IcosahedronGeometry(.34,1),ivory,side*.98,.95,.28);paw.scale.set(1,.8,1.25);}
 const bat=add(body,new THREE.CylinderGeometry(.13,.22,2.9,10),gold,1.08,1.78,.12);bat.rotation.z=-.78;bat.rotation.x=.14;const crest=add(body,new THREE.TorusGeometry(.68,.08,6,28),gold,0,1.7,.72);crest.rotation.x=.15;
 const ring=add(g,new THREE.RingGeometry(1.25,1.4,56),basic(0xffc35a,.35),0,.13,0);ring.rotation.x=-Math.PI/2;
 // Only the release direction is shown. Long safe-lane and full attack-area answers are gone.
 const lane=add(g,new THREE.PlaneGeometry(.78,3.1),basic(0xfff0b0,.22),0,.145,1.7);lane.rotation.x=-Math.PI/2;lane.visible=false;
 const arc=add(g,new THREE.RingGeometry(1.2,2.35,32,1,-Math.PI*.34,Math.PI*.68),basic(0xff5260,.23),0,.15,0);arc.rotation.x=-Math.PI/2;arc.visible=false;
 const mark=add(world,new THREE.RingGeometry(.56,.82,4),basic(0x83e7ff,.42),0,.15,0);mark.rotation.x=-Math.PI/2;mark.rotation.z=Math.PI/4;mark.visible=false;
 return {g,body,world,type:'alwaysbeginner',config:ALWAYS_BEGINNER,hp:ALWAYS_BEGINNER.hp,maxHp:ALWAYS_BEGINNER.hp,state:'stalk',timer:.55,phase:'rookie',pattern:0,volley:0,dir:new V(0,0,1),shotDir:new V(),target:new V(),to:new V(),before:new V(),segment:new V(),probe:new V(),targetDelta:new V(),moveName:'',hint:'',hit:0,slow:0,takenScale:1,ring,lane,arc,mark,damageAllowance:ALWAYS_BEGINNER.hp*ALWAYS_BEGINNER.damage.burst,bumpCD:0,summoned:new Set(),chargeHit:false,slideLeg:0,spiralShots:0,spiralClock:0,spiralAngle:0,spiralTurn:1};
}

export function damageAlwaysBeginner(e,amount){
 if(e.state==='phaseShift')return 0;
 const allowed=Math.max(0,Math.min(Number(amount)||0,e.damageAllowance,e.maxHp*ALWAYS_BEGINNER.damage.burst));e.damageAllowance-=allowed;e.hp-=allowed;return allowed;
}

export function alwaysBeginnerHint(e){return e.hint||`${ALWAYS_PHASES[e.phase].label} · 바닥 정답 대신 몸동작과 탄환을 읽으세요`;}
export function alwaysBeginnerPatternName(e){return e.moveName||'다음 타석 준비';}

function beginPattern(e,ctx,to){
 const P=ALWAYS_PHASES[e.phase],kind=P.patterns[e.pattern++%P.patterns.length];e.kind=kind;e.dir.copy(to);e.moveName={fastball:'초구 강속구',curve:'휘어지는 변화구',steal:'베이스 질주',slide:'헤드퍼스트 슬라이딩',homerun:'끝내기 홈런',spiral:'회전 응원 파도',wildpitch:'반전 폭투',doubleplay:'더블 플레이',fullcount:'풀카운트 연속투구'}[kind];ctx.sound?.('bossWarning');
 if(kind==='fastball'||kind==='curve'){e.state='pitchTell';e.timer=(kind==='fastball'?.45:.53)*P.tempo;e.hint=kind==='fastball'?'투구 팔이 멈추면 즉시 움직이세요':'첫 공의 회전 방향을 끝까지 보세요';e.lane.visible=true;}
 else if(kind==='steal'){e.state='stealTell';e.timer=.52*P.tempo;e.target.copy(ctx.player).setY(0);e.mark.position.copy(e.target);e.mark.visible=true;e.hint='발을 들면 현재 자리를 벗어나세요';}
 else if(kind==='slide'){e.state='slideTell';e.timer=.42*P.tempo;e.target.copy(ctx.player).setY(0);e.mark.position.copy(e.target);e.mark.visible=true;e.slideLeg=0;e.hint='몸을 낮춘 뒤 두 번 방향을 꺾습니다';}
 else if(kind==='homerun'){e.state='swingTell';e.timer=.58*P.tempo;e.hint='방망이를 든 쪽과 전진을 함께 보세요';e.arc.visible=true;}
 else if(kind==='doubleplay'){e.state='doubleTell';e.timer=.58*P.tempo;e.target.copy(ctx.player).setY(0);e.mark.position.copy(e.target);e.mark.visible=e.lane.visible=true;e.hint='투구 뒤 곧바로 몸통박치기가 이어집니다';}
 else if(kind==='fullcount'){e.state='countTell';e.timer=.6*P.tempo;e.volley=0;e.lane.visible=true;e.hint='속도가 다른 세 공을 한 번에 피하지 마세요';}
 else if(kind==='wildpitch'){e.state='wildTell';e.timer=.42*P.tempo;e.hint='처음 반대로 빠진 공이 크게 돌아옵니다';}
 else{e.state='spiralTell';e.timer=.48*P.tempo;e.hint='회전 방향과 함께 보스를 한 바퀴 도세요';}
}

function chargeStep(e,dt,player,hit,speed,damage,radius=1.22){
 const before=e.before.copy(e.g.position);e.g.position.addScaledVector(e.dir,dt*speed);const segment=e.segment.copy(e.g.position).sub(before),length=segment.lengthSq();
 const t=length?THREE.MathUtils.clamp(e.probe.copy(player).sub(before).dot(segment)/length,0,1):0;if(!e.chargeHit&&e.probe.copy(before).addScaledVector(segment,t).distanceTo(player)<radius){e.chargeHit=true;hit(damage);}
}
function passedTarget(e){return flat(e.targetDelta.copy(e.target).sub(e.g.position)).dot(e.dir)<-.8;}

// hooks: player, collide, hit, bolt, burst, pulse, sound, clearBolts, summon and pooled boss VFX
export function tickAlwaysBeginner(e,dt,hooks){
 const {player,collide=()=>{},hit=()=>false,bolt:rawBolt=()=>{},burst=()=>{},pulse=()=>{},sound=()=>{},clearBolts=()=>{},summon=()=>{},bossPitch=()=>{},bossRush=()=>{},bossSwing=()=>{},bossWave=()=>{},bossPhase=()=>{}}=hooks;
 e.hit=Math.max(0,e.hit-dt);e.bumpCD=Math.max(0,e.bumpCD-dt);e.damageAllowance=Math.min(e.maxHp*ALWAYS_BEGINNER.damage.burst,e.damageAllowance+e.maxHp*ALWAYS_BEGINNER.damage.perSecond*dt);
 dt*=ALWAYS_TUNING.tempo;const bolt=(pos,dir,options={})=>rawBolt(pos,dir,{...options,speed:(options.speed||0)*ALWAYS_TUNING.boltSpeed});
 const next=phaseFor(e.hp,e.maxHp);if(next!==e.phase&&e.state!=='phaseShift'){e.state='phaseShift';e.phasePending=next;e.timer=1.05;e.lane.visible=e.arc.visible=e.mark.visible=false;clearBolts();bossPhase(e.g.position,next);sound('bossWarning');}
 if(e.state==='phaseShift'){
  e.timer-=dt;const snap=1+.07*Math.sin(e.timer*22),finish=e.phasePending==='finish';e.body.scale.set(snap*(finish?1.045:1),snap*(finish?1.085:1.025),snap);e.ring.material.color.setHex(finish?0xff4050:0xffc35a);e.ring.scale.setScalar(1.05+(1-e.timer)*.16);
  if(e.timer<=0){e.phase=e.phasePending;e.phasePending=null;e.state='stalk';e.timer=.26;e.pattern=0;e.body.scale.setScalar(1);e.ring.scale.setScalar(e.phase==='finish'?1.18:e.phase==='rally'?1.09:1);if(!e.summoned.has(e.phase)){e.summoned.add(e.phase);summon(e.phase==='rally'?['runner','pitcher']:['catcher','batter','pitcher']);}}
  return;
 }
 if(!e.summoned.has('rookie')){e.summoned.add('rookie');summon(['pitcher']);}
 const P=ALWAYS_PHASES[e.phase],to=flat(e.to.copy(player).sub(e.g.position)),distance=to.length();if(distance>1e-6)to.divideScalar(distance);e.timer-=dt;e.ring.material.opacity=.26+.14*Math.abs(Math.sin(e.pattern+e.timer*8));
 if(e.state==='stalk'){
  const side=e.pattern%2?1:-1;e.g.position.addScaledVector(to,dt*(distance>5.2?4.8:distance<3.2?-3.5:0));e.g.position.x+=to.z*dt*3.9*side;e.g.position.z-=to.x*dt*3.9*side;face(e,to);if(e.timer<=0)beginPattern(e,{player,sound},to);
 }else if(e.state==='pitchTell'){
  face(e,e.dir);e.lane.material.opacity=.16+.5*Math.abs(Math.sin(e.timer*15));
  if(e.timer<=0){if(e.kind==='fastball'){bolt(e.g.position,e.dir,{speed:ALWAYS_TUNING.fastballSpeed,damage:25,boss:true});for(const angle of [-.13,.13])bolt(e.g.position,e.dir.clone().applyAxisAngle(AXIS_Y,angle),{speed:18.5,damage:19,boss:true});}else for(let i=-3;i<=3;i++)bolt(e.g.position,e.dir.clone().applyAxisAngle(AXIS_Y,i*.145),{speed:16.8-Math.abs(i)*.3,damage:20,curve:(i%2?-.76:.76)*(i<0?-1:1),boss:true});bossPitch(e.g.position,e.dir,e.kind==='curve'?(e.pattern%2?-1.05:1.05):0);sound('bossAttack');e.lane.visible=false;e.state='recover';e.timer=.4*P.tempo;}
 }else if(e.state==='wildTell'){
  face(e,e.dir);e.body.rotation.z=THREE.MathUtils.damp(e.body.rotation.z,(e.pattern%2?1:-1)*.13,15,dt);
  if(e.timer<=0){const turn=e.pattern%2?1:-1;bolt(e.g.position,e.dir.clone().multiplyScalar(-1),{speed:21.5,damage:23,curve:turn*.38,bounces:1,life:6,boss:true});bolt(e.g.position,e.dir.clone().applyAxisAngle(AXIS_Y,turn*.24),{speed:18,damage:19,curve:-turn*.72,boss:true});bossPitch(e.g.position,e.dir,turn*1.45);sound('bossAttack');e.state='recover';e.timer=.44*P.tempo;}
 }else if(e.state==='stealTell'){
  e.mark.rotation.z+=dt*5;e.mark.material.opacity=.3+.4*Math.abs(Math.sin(e.timer*18));face(e,flat(e.targetDelta.copy(e.target).sub(e.g.position)));if(e.timer<=0){e.dir.copy(flat(e.targetDelta.copy(e.target).sub(e.g.position)).normalize());e.chargeHit=false;bossRush(e.g.position,e.target);e.state='steal';e.timer=.74;}
 }else if(e.state==='steal'){
  chargeStep(e,dt,player,hit,20.5,30);if(e.timer<=0||passedTarget(e)){pulse(e.target,'chain',1.3,.35);e.mark.visible=false;e.state='recover';e.timer=.38*P.tempo;}
 }else if(e.state==='slideTell'){
  e.mark.rotation.z+=dt*7;e.mark.material.opacity=.28+.44*Math.abs(Math.sin(e.timer*22));face(e,flat(e.targetDelta.copy(e.target).sub(e.g.position)));
  if(e.timer<=0){e.dir.copy(flat(e.targetDelta.copy(e.target).sub(e.g.position)).normalize());e.chargeHit=false;bossRush(e.g.position,e.target);e.state='slide';e.timer=.55;}
 }else if(e.state==='slide'){
  chargeStep(e,dt,player,hit,ALWAYS_TUNING.slideSpeed,32,1.27);
  if(e.timer<=0||passedTarget(e)){if(e.slideLeg===0){e.slideLeg=1;e.target.copy(player).setY(0);e.dir.copy(flat(e.targetDelta.copy(e.target).sub(e.g.position)).normalize());e.chargeHit=false;e.timer=.48;bossRush(e.g.position,e.target);}else{pulse(e.g.position,'chain',1.5,.32);e.mark.visible=false;e.state='recover';e.timer=.42*P.tempo;}}
 }else if(e.state==='swingTell'){
  face(e,e.dir);e.arc.material.opacity=.2+.5*Math.abs(Math.sin(e.timer*16));
  if(e.timer<=0){e.g.position.addScaledVector(e.dir,.75);if(distance<4.35&&to.dot(e.dir)>-.05)hit(35);for(let i=-5;i<=5;i++)bolt(e.g.position,e.dir.clone().applyAxisAngle(AXIS_Y,i*.17),{speed:14.2+Math.abs(i)*.34,damage:20,boss:true});bossSwing(e.g.position,e.dir);sound('bossAttack');e.arc.visible=false;e.state='recover';e.timer=.4*P.tempo;}
 }else if(e.state==='spiralTell'){
  face(e,to);if(e.timer<=0){e.state='spiral';e.timer=1.48;e.spiralShots=0;e.spiralClock=0;e.spiralAngle=Math.atan2(to.z,to.x);e.spiralTurn=e.pattern%2?1:-1;bossWave(e.g.position,e.spiralAngle);sound('bossAttack');}
 }else if(e.state==='spiral'){
  e.spiralClock-=dt;
  while(e.spiralClock<=0&&e.spiralShots<ALWAYS_TUNING.spiralVolleys){const angle=e.spiralAngle+e.spiralTurn*e.spiralShots*(TAU/ALWAYS_TUNING.spiralVolleys);for(const [offset,speed] of [[0,12.8],[Math.PI+.28*e.spiralTurn,11.8]]){e.shotDir.set(Math.cos(angle+offset),0,Math.sin(angle+offset));bolt(e.g.position,e.shotDir,{speed,damage:17,boss:true});}e.spiralShots++;e.spiralClock+=ALWAYS_TUNING.spiralInterval;}
  if(e.timer<=0&&e.spiralShots>=ALWAYS_TUNING.spiralVolleys){e.state='recover';e.timer=.42*P.tempo;}
 }else if(e.state==='doubleTell'){
  face(e,e.dir);e.lane.material.opacity=.16+.5*Math.abs(Math.sin(e.timer*16));e.mark.rotation.z+=dt*5;e.mark.material.opacity=.3+.4*Math.abs(Math.sin(e.timer*18));
  if(e.timer<=0){bolt(e.g.position,e.dir,{speed:23,damage:25,boss:true});for(const angle of [-.14,.14])bolt(e.g.position,e.dir.clone().applyAxisAngle(AXIS_Y,angle),{speed:18.5,damage:19,boss:true});bossPitch(e.g.position,e.dir,0);sound('bossAttack');e.lane.visible=false;e.dir.copy(flat(e.targetDelta.copy(e.target).sub(e.g.position)).normalize());e.chargeHit=false;bossRush(e.g.position,e.target);e.state='doubleRush';e.timer=.78;}
 }else if(e.state==='doubleRush'){
  chargeStep(e,dt,player,hit,21.5,32);if(e.timer<=0||passedTarget(e)){pulse(e.target,'chain',1.45,.38);e.mark.visible=false;e.state='recover';e.timer=.34*P.tempo;}
 }else if(e.state==='countTell'){
  face(e,e.dir);e.lane.material.opacity=.16+.52*Math.abs(Math.sin(e.timer*18));if(e.timer<=0){e.state='count';e.timer=0;e.volley=0;}
 }else if(e.state==='count'){
  if(e.timer<=0&&e.volley<3){const angle=FULL_COUNT_OFFSETS[e.volley];bolt(e.g.position,e.dir.clone().applyAxisAngle(AXIS_Y,angle),{speed:FULL_COUNT_SPEEDS[e.volley],damage:24,boss:true});bossPitch(e.g.position,e.dir,angle*4);sound('bossAttack');e.volley++;e.timer=.16;}
  if(e.timer<=0&&e.volley>=3){e.lane.visible=false;e.state='recover';e.timer=.3*P.tempo;}
 }else if(e.timer<=0){e.state='stalk';e.timer=(.34+(e.pattern%3)*.06)*P.tempo;e.moveName='';e.hint='';}
 if(e.state==='stalk'&&distance<1.55&&e.bumpCD<=0&&hit(ALWAYS_BEGINNER.contact))e.bumpCD=.8;
 collide(e.g.position,1.15);
 const sliding=e.state==='steal'||e.state==='slide'||e.state==='doubleRush';e.body.rotation.x=THREE.MathUtils.damp(e.body.rotation.x,e.state==='swingTell'?-.15:sliding?.24:0,12,dt);e.body.rotation.z=THREE.MathUtils.damp(e.body.rotation.z,(e.state==='pitchTell'||e.state==='countTell')?(e.kind==='curve'?.08:-.06):sliding?.12:0,14,dt);e.body.scale.y=THREE.MathUtils.damp(e.body.scale.y,sliding?.78:1,16,dt);e.body.scale.x=THREE.MathUtils.damp(e.body.scale.x,sliding?1.14:1,16,dt);e.body.position.y=e.state==='stalk'?Math.abs(Math.sin(e.timer*9))*.08:0;
}
