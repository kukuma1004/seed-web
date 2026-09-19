import * as THREE from 'three';

const V=THREE.Vector3,TAU=Math.PI*2;
const FULL_COUNT_OFFSETS=Object.freeze([-.16,0,.16]),FULL_COUNT_SPEEDS=Object.freeze([18,22,20]);
export const ALWAYS_BEGINNER=Object.freeze({name:'항상초심',hp:13800,damage:Object.freeze({burst:.07,perSecond:.033}),contact:16});
export const ALWAYS_BEGINNER_ART=Object.freeze({file:'boss-always-beginner-v1.webp',size:4.85,baseline:.015});
export const ALWAYS_PHASES=Object.freeze({
 rookie:Object.freeze({label:'초심',tempo:.9,patterns:Object.freeze(['fastball','steal','curve'])}),
 rally:Object.freeze({label:'집중',tempo:.72,patterns:Object.freeze(['fastball','doubleplay','homerun','curve','steal','rally'])}),
 finish:Object.freeze({label:'끝내기',tempo:.56,patterns:Object.freeze(['fullcount','homerun','doubleplay','rally','steal','curve'])})
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
 add(body,new THREE.CylinderGeometry(.82,1.08,1.75,9),red,0,1.2,0);
 add(body,new THREE.IcosahedronGeometry(.68,2),ivory,0,2.55,0);
 add(body,new THREE.ConeGeometry(.2,.5,5),gold,0,2.43,.68).rotation.x=Math.PI/2;
 for(const x of [-.28,.28])add(body,new THREE.IcosahedronGeometry(.075,0),dark,x,2.68,.56);
 for(const x of [-.46,0,.46]){const s=add(body,new THREE.BoxGeometry(.11,.6,.08),stripe,x,2.62,.58);s.rotation.z=x*.4;}
 add(body,new THREE.CylinderGeometry(.78,.78,.24,12),dark,0,3.03,0);
 const brim=add(body,new THREE.BoxGeometry(1.3,.1,.5),dark,0,2.96,.34);brim.rotation.x=-.08;
 for(const side of [-1,1]){add(body,new THREE.DodecahedronGeometry(.43),gold,side*.98,1.7,0);const paw=add(body,new THREE.IcosahedronGeometry(.34,1),ivory,side*.98,.95,.28);paw.scale.set(1,.8,1.25);}
 const bat=add(body,new THREE.CylinderGeometry(.13,.22,2.9,10),gold,1.08,1.78,.12);bat.rotation.z=-.78;bat.rotation.x=.14;
 const crest=add(body,new THREE.TorusGeometry(.68,.08,6,28),gold,0,1.7,.72);crest.rotation.x=.15;
 const ring=add(g,new THREE.RingGeometry(1.25,1.4,56),basic(0xffc35a,.35),0,.13,0);ring.rotation.x=-Math.PI/2;
 const lane=add(g,new THREE.PlaneGeometry(.82,11),basic(0xfff0b0,.18),0,.145,5.5);lane.rotation.x=-Math.PI/2;lane.visible=false;
 const arc=add(g,new THREE.RingGeometry(1.3,4.2,56,1,-Math.PI*.45,Math.PI*.9),basic(0xff5260,.2),0,.15,0);arc.rotation.x=-Math.PI/2;arc.visible=false;
 const mark=add(world,new THREE.RingGeometry(.62,.92,4),basic(0x83e7ff,.45),0,.15,0);mark.rotation.x=-Math.PI/2;mark.rotation.z=Math.PI/4;mark.visible=false;
 return {g,body,world,type:'alwaysbeginner',config:ALWAYS_BEGINNER,hp:ALWAYS_BEGINNER.hp,maxHp:ALWAYS_BEGINNER.hp,state:'stalk',timer:.7,phase:'rookie',pattern:0,volley:0,dir:new V(0,0,1),target:new V(),to:new V(),before:new V(),segment:new V(),probe:new V(),targetDelta:new V(),moveName:'',hint:'',hit:0,slow:0,takenScale:1,ring,lane,arc,mark,damageAllowance:ALWAYS_BEGINNER.hp*ALWAYS_BEGINNER.damage.burst,bumpCD:0,summoned:new Set()};
}

export function damageAlwaysBeginner(e,amount){
 if(e.state==='phaseShift')return 0;
 const allowed=Math.max(0,Math.min(Number(amount)||0,e.damageAllowance,e.maxHp*ALWAYS_BEGINNER.damage.burst));
 e.damageAllowance-=allowed;e.hp-=allowed;return allowed;
}

export function alwaysBeginnerHint(e){return e.hint||`${ALWAYS_PHASES[e.phase].label} · 공격 이름과 바닥 표시를 보고 피하세요`;}
export function alwaysBeginnerPatternName(e){return e.moveName||'다음 타석 준비';}

function beginPattern(e,ctx,to){
 const P=ALWAYS_PHASES[e.phase],kind=P.patterns[e.pattern++%P.patterns.length];e.kind=kind;e.dir.copy(to);e.moveName={fastball:'초구 강속구',curve:'휘어지는 변화구',steal:'베이스 질주',homerun:'끝내기 홈런',rally:'응원 파도',doubleplay:'더블 플레이',fullcount:'풀카운트 연속투구'}[kind];ctx.sound?.('bossWarning');
 if(kind==='fastball'||kind==='curve'){e.state='pitchTell';e.timer=(kind==='fastball'?.56:.66)*P.tempo;e.hint=kind==='fastball'?'흰 선에서 옆으로':'공이 휘어질 방향까지 보고 한 박자 늦게';e.lane.visible=true;}
 else if(kind==='steal'){e.state='stealTell';e.timer=.66*P.tempo;e.target.copy(ctx.player).setY(0);e.mark.position.copy(e.target);e.mark.visible=true;e.hint='빛나는 베이스에서 떨어지세요';}
 else if(kind==='homerun'){e.state='swingTell';e.timer=.74*P.tempo;e.hint='붉은 부채꼴 뒤로 돌아가세요';e.arc.visible=true;}
 else if(kind==='doubleplay'){e.state='doubleTell';e.timer=.76*P.tempo;e.target.copy(ctx.player).setY(0);e.mark.position.copy(e.target);e.mark.visible=e.lane.visible=true;e.hint='흰 투구선을 벗어난 뒤 빛나는 베이스 질주도 피하세요';}
 else if(kind==='fullcount'){e.state='countTell';e.timer=.78*P.tempo;e.volley=0;e.lane.visible=true;e.hint='흰 선을 벗어나고 뒤따르는 세 공까지 계속 움직이세요';}
 else{e.state='rallyTell';e.timer=.64*P.tempo;e.hint='응원탄 사이의 넓은 틈을 찾으세요';}
}

// hooks: player, collide, hit, bolt, burst, pulse, sound, clearBolts, summon and pooled boss VFX
export function tickAlwaysBeginner(e,dt,hooks){
 const {player,collide=()=>{},hit=()=>false,bolt=()=>{},burst=()=>{},pulse=()=>{},sound=()=>{},clearBolts=()=>{},summon=()=>{},bossPitch=()=>{},bossRush=()=>{},bossSwing=()=>{},bossWave=()=>{},bossPhase=()=>{}}=hooks;
 e.hit=Math.max(0,e.hit-dt);e.bumpCD=Math.max(0,e.bumpCD-dt);e.damageAllowance=Math.min(e.maxHp*ALWAYS_BEGINNER.damage.burst,e.damageAllowance+e.maxHp*ALWAYS_BEGINNER.damage.perSecond*dt);
 const next=phaseFor(e.hp,e.maxHp);if(next!==e.phase&&e.state!=='phaseShift'){e.state='phaseShift';e.phasePending=next;e.timer=1.05;e.lane.visible=e.arc.visible=e.mark.visible=false;clearBolts();bossPhase(e.g.position,next);sound('bossWarning');}
 if(e.state==='phaseShift'){
  e.timer-=dt;const snap=1+.07*Math.sin(e.timer*22),finish=e.phasePending==='finish';e.body.scale.set(snap*(finish?1.045:1),snap*(finish?1.085:1.025),snap);e.ring.material.color.setHex(finish?0xff4050:0xffc35a);e.ring.scale.setScalar(1.05+(1-e.timer)*.16);
  if(e.timer<=0){e.phase=e.phasePending;e.phasePending=null;e.state='stalk';e.timer=.3;e.pattern=0;e.body.scale.setScalar(1);e.ring.scale.setScalar(e.phase==='finish'?1.18:e.phase==='rally'?1.09:1);if(!e.summoned.has(e.phase)){e.summoned.add(e.phase);summon(e.phase==='rally'?['runner','pitcher']:['catcher','batter','pitcher']);}}
  return;
 }
 if(!e.summoned.has('rookie')){e.summoned.add('rookie');summon(['pitcher']);}
 const P=ALWAYS_PHASES[e.phase],to=flat(e.to.copy(player).sub(e.g.position)),distance=to.length();if(distance>1e-6)to.divideScalar(distance);e.timer-=dt;
 e.ring.material.opacity=.26+.14*Math.abs(Math.sin(e.pattern+e.timer*8));
 if(e.state==='stalk'){
  const side=e.pattern%2?1:-1;e.g.position.addScaledVector(to,dt*(distance>5.2?4.1:distance<3.3?-3:0));e.g.position.x+=to.z*dt*3.1*side;e.g.position.z-=to.x*dt*3.1*side;face(e,to);
  if(e.timer<=0)beginPattern(e,{player,sound},to);
 }else if(e.state==='pitchTell'){
  face(e,e.dir);e.lane.material.opacity=.14+.55*Math.abs(Math.sin(e.timer*12));
  if(e.timer<=0){
   if(e.kind==='fastball'){bolt(e.g.position,e.dir,{speed:19.5,damage:24,boss:true});for(const a of [-.13,.13])bolt(e.g.position,e.dir.clone().applyAxisAngle(new V(0,1,0),a),{speed:15.5,damage:18,boss:true});}
   else for(let i=-3;i<=3;i++)bolt(e.g.position,e.dir.clone().applyAxisAngle(new V(0,1,0),i*.145),{speed:14.4-Math.abs(i)*.35,damage:19,curve:(i%2?-.66:.66)*(i<0?-1:1),boss:true});
    bossPitch(e.g.position,e.dir,e.kind==='curve'?(e.pattern%2?-.95:.95):0);sound('bossAttack');e.lane.visible=false;e.state='recover';e.timer=.52*P.tempo;
  }
 }else if(e.state==='stealTell'){
  e.mark.rotation.z+=dt*5;e.mark.material.opacity=.3+.45*Math.abs(Math.sin(e.timer*18));face(e,flat(e.targetDelta.copy(e.target).sub(e.g.position)));
  if(e.timer<=0){e.dir.copy(flat(e.targetDelta.copy(e.target).sub(e.g.position)).normalize());bossRush(e.g.position,e.target);e.state='steal';e.timer=.9;}
 }else if(e.state==='steal'){
  const before=e.before.copy(e.g.position);e.g.position.addScaledVector(e.dir,dt*18);const seg=e.segment.copy(e.g.position).sub(before),len=seg.lengthSq(),t=len?THREE.MathUtils.clamp(e.probe.copy(player).sub(before).dot(seg)/len,0,1):0;if(e.probe.copy(before).addScaledVector(seg,t).distanceTo(player)<1.2)hit(29);if(e.timer<=0||flat(e.targetDelta.copy(e.target).sub(e.g.position)).dot(e.dir)<-.8){pulse(e.target,'chain',1.3,.35);e.mark.visible=false;e.state='recover';e.timer=.5*P.tempo;}
 }else if(e.state==='swingTell'){
  face(e,e.dir);e.arc.material.opacity=.18+.55*Math.abs(Math.sin(e.timer*14));
  if(e.timer<=0){if(distance<4.2&&to.dot(e.dir)>-.05)hit(34);for(let i=-5;i<=5;i++)bolt(e.g.position,e.dir.clone().applyAxisAngle(new V(0,1,0),i*.17),{speed:12+Math.abs(i)*.3,damage:19,boss:true});bossSwing(e.g.position,e.dir);sound('bossAttack');e.arc.visible=false;e.state='recover';e.timer=.52*P.tempo;}
 }else if(e.state==='rallyTell'){
  if(e.timer<=0){const gap=Math.atan2(to.z,to.x);for(let i=0;i<22;i++){const a=i*TAU/22;if(Math.abs(Math.atan2(Math.sin(a-gap),Math.cos(a-gap)))<.3)continue;bolt(e.g.position,new V(Math.cos(a),0,Math.sin(a)),{speed:10.8,damage:18,boss:true});}bossWave(e.g.position,gap);sound('bossAttack');e.state='recover';e.timer=.52*P.tempo;}
 }else if(e.state==='doubleTell'){
  face(e,e.dir);e.lane.material.opacity=.14+.55*Math.abs(Math.sin(e.timer*14));e.mark.rotation.z+=dt*5;e.mark.material.opacity=.3+.45*Math.abs(Math.sin(e.timer*18));
  if(e.timer<=0){bolt(e.g.position,e.dir,{speed:20.5,damage:24,boss:true});for(const a of [-.14,.14])bolt(e.g.position,e.dir.clone().applyAxisAngle(new V(0,1,0),a),{speed:16,damage:18,boss:true});bossPitch(e.g.position,e.dir,0);sound('bossAttack');e.lane.visible=false;e.dir.copy(flat(e.targetDelta.copy(e.target).sub(e.g.position)).normalize());bossRush(e.g.position,e.target);e.state='doubleRush';e.timer=.92;}
 }else if(e.state==='doubleRush'){
  const before=e.before.copy(e.g.position);e.g.position.addScaledVector(e.dir,dt*18.5);const seg=e.segment.copy(e.g.position).sub(before),len=seg.lengthSq(),t=len?THREE.MathUtils.clamp(e.probe.copy(player).sub(before).dot(seg)/len,0,1):0;if(e.probe.copy(before).addScaledVector(seg,t).distanceTo(player)<1.2)hit(30);if(e.timer<=0||flat(e.targetDelta.copy(e.target).sub(e.g.position)).dot(e.dir)<-.8){pulse(e.target,'chain',1.45,.38);e.mark.visible=false;e.state='recover';e.timer=.4*P.tempo;}
 }else if(e.state==='countTell'){
  face(e,e.dir);e.lane.material.opacity=.14+.58*Math.abs(Math.sin(e.timer*16));if(e.timer<=0){e.state='count';e.timer=0;e.volley=0;}
 }else if(e.state==='count'){
  if(e.timer<=0&&e.volley<3){const a=FULL_COUNT_OFFSETS[e.volley];bolt(e.g.position,e.dir.clone().applyAxisAngle(new V(0,1,0),a),{speed:FULL_COUNT_SPEEDS[e.volley],damage:23,boss:true});bossPitch(e.g.position,e.dir,a*4);sound('bossAttack');e.volley++;e.timer=.19;}
  if(e.timer<=0&&e.volley>=3){e.lane.visible=false;e.state='recover';e.timer=.38*P.tempo;}
 }else if(e.timer<=0){e.state='stalk';e.timer=(.4+(e.pattern%3)*.075)*P.tempo;e.moveName='';e.hint='';}
 if(e.state==='stalk'&&distance<1.55&&e.bumpCD<=0&&hit(ALWAYS_BEGINNER.contact))e.bumpCD=.8;
 collide(e.g.position,1.15);e.body.rotation.x=THREE.MathUtils.damp(e.body.rotation.x,e.state==='swingTell'?-.15:(e.state==='steal'||e.state==='doubleRush')?.2:0,10,dt);e.body.rotation.z=THREE.MathUtils.damp(e.body.rotation.z,(e.state==='pitchTell'||e.state==='countTell')?(e.kind==='curve'?.07:-.055):(e.state==='steal'||e.state==='doubleRush')?.1:0,12,dt);e.body.position.y=e.state==='stalk'?Math.abs(Math.sin(e.timer*8))*.08:0;
}
