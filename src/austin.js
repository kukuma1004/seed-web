import * as THREE from 'three';
const V=THREE.Vector3,TAU=Math.PI*2;
// 정시파이터 오스틴: the real boss behind every fifth warden. A boxer with an alarm clock for a head who
// never attacks off the beat. His clock ticks in beats; every ten beats is "the hour", and on the hour
// a bell fires two rings of bolts with a single gap pointing at the hour hand. The floor clock always
// shows where the next gap will be, so the fight can be learned rather than guessed.
// 2026-09-15 nerf (students found him too hard): hits about 20% softer, bell gaps wider and no journey speed-up;
// health raised 7800 → 8600 so the fight stays long while each mistake costs less.
export const AUSTIN=Object.freeze({
 name:'정시파이터 오스틴',hp:8600,
 beat:.6,hourBeats:10,hourStep:4,
 overtime:.5,deadline:.2,
 bump:{radius:1.35,damage:11,every:.8},
 jab:{tell:.48,retell:.36,dash:.34,speed:20,contact:24,reach:1.3,shock:1.9,shockDamage:19},
 sweep:{tell:.8,turn:2.7,halfTurn:1.65,length:11,width:.55,damage:22},
 alarm:{countdown:1.5,radius:2.2,damage:21,spread:2.9},
 volley:{tell:.6,retell:.48,spread:.32,speed:9,damage:18,lead:.28},
 transition:.95,
 bell:{warnBeats:3,ringDelay:.3,speed:6,damage:19}
});
export const AUSTIN_ARENA=Object.freeze({shape:'circle',radius:7.6});
// GPT art hook: set to e.g. 'boss-austin-v1.png' (2x2 directional atlas, like warden-*-v4.png) once the art exists.
export const AUSTIN_ART='boss-austin-v1.png';
export const PHASES=Object.freeze({
 normal:{tempo:1,label:'정시 근무',jabs:3,alarms:3,volleys:3,bolts:24,gapHalf:.58,rest:.65,order:['jab','sweep','alarm','volley']},
 overtime:{tempo:.8,label:'야근 모드',jabs:3,alarms:4,volleys:4,bolts:30,gapHalf:.48,rest:.45,order:['volley','alarm','sweep','jab','volley','jab']},
 deadline:{tempo:.7,label:'마감 직전',jabs:4,alarms:5,volleys:5,bolts:36,gapHalf:.48,rest:.3,order:['alarm','volley','jab','sweep','volley','jab']}
});
// Burst damage may reach a phase boundary, but cannot erase an unseen phase.
// A short, visible wind-up clears the old hazards before the faster phase begins.
export function damageAustin(e,amount){
 if(e.state==='phaseShift'||!Number.isFinite(amount)||amount<=0)return 0;
 const floor=e.phase==='normal'?e.maxHp*AUSTIN.overtime:e.phase==='overtime'?e.maxHp*AUSTIN.deadline:0;
 const next=Math.max(floor,e.hp-amount),taken=Math.max(0,e.hp-next);e.hp=next;return taken;
}
export function volleyDirections(dir){return [-2,-1,0,1,2].map(i=>dir.clone().applyAxisAngle(new V(0,1,0),i*AUSTIN.volley.spread));}
export function austinPhase(hp,maxHp){return hp<=maxHp*AUSTIN.deadline?'deadline':hp<=maxHp*AUSTIN.overtime?'overtime':'normal';}
// Hour 0 is twelve o'clock, the top of the screen (-z); hour 3 points right (+x).
export function hourDirection(hour){const a=hour*Math.PI/6;return new V(Math.sin(a),0,-Math.cos(a));}
export function bellDirections(hour,phase='normal',offset=0){
 const {bolts,gapHalf}=PHASES[phase],center=hour*Math.PI/6,out=[];
 for(let i=0;i<bolts;i++){
  const a=center+offset+i*TAU/bolts,diff=Math.atan2(Math.sin(a-center),Math.cos(a-center));
  if(Math.abs(diff)<gapHalf)continue;
  out.push(new V(Math.sin(a),0,-Math.cos(a)));
 }
 return out;
}
export function sweepTime(phase){return phase==='normal'?AUSTIN.sweep.turn:AUSTIN.sweep.halfTurn;}
export function beatsToHour(e){const into=e.beats%AUSTIN.hourBeats;return AUSTIN.hourBeats-into;}

function basic(color,opacity){return new THREE.MeshBasicMaterial({color,transparent:true,opacity,depthWrite:false,side:THREE.DoubleSide,toneMapped:false});}
function groundPlane(width,length,mat){const m=new THREE.Mesh(new THREE.PlaneGeometry(width,length),mat);m.rotation.x=-Math.PI/2;m.position.set(0,.17,length/2);return m;}

export function createAustin(scene){
 const std=(color,emissive=0,ei=0)=>new THREE.MeshStandardMaterial({color,roughness:.55,metalness:.08,emissive,emissiveIntensity:ei});
 const suit=std(0x2d3f6b,0x101c38,.6),glove=std(0xd8342c,0x5c0c08,.55),gold=std(0xf2c14e,0x6b4a08,.7),face=std(0xfff6e0,0x3a3320,.4),ink=std(0x1b1b22);
 const g=new THREE.Group(),body=new THREE.Group();g.add(body);scene.add(g);body.scale.setScalar(1.2);
 const add=(geo,mat,x,y,z,parent=body)=>{const o=new THREE.Mesh(geo,mat);o.position.set(x,y,z);parent.add(o);return o;};
 for(const s of [-1,1]){add(new THREE.CylinderGeometry(.2,.24,.9,8),suit,s*.32,.45,0);add(new THREE.BoxGeometry(.36,.18,.52),ink,s*.32,.09,.08);}
 // Only the big silhouette casts a shadow; the dial details and tells stay out of the shadow pass.
 add(new THREE.CylinderGeometry(.62,.5,1.25,10),suit,0,1.45,0).castShadow=true;
 const belt=add(new THREE.TorusGeometry(.56,.09,6,24),gold,0,.98,0);belt.rotation.x=Math.PI/2;
 const buckle=add(new THREE.CylinderGeometry(.22,.22,.12,14),gold,0,.98,.56);buckle.rotation.x=Math.PI/2;
 // The alarm clock head: dial, hands that follow his beat, twin bells.
 const head=new THREE.Group();head.position.set(0,2.62,0);body.add(head);
 const rim=add(new THREE.CylinderGeometry(.74,.74,.32,32),gold,0,0,0,head);rim.rotation.x=Math.PI/2;rim.castShadow=true;
 const dial=add(new THREE.CylinderGeometry(.63,.63,.34,32),face,0,0,.01,head);dial.rotation.x=Math.PI/2;
 for(let i=0;i<12;i++){const a=i*Math.PI/6,t=add(new THREE.BoxGeometry(.05,i%3?.1:.2,.02),ink,Math.sin(a)*.5,Math.cos(a)*.5,.19,head);t.rotation.z=-a;}
 const hourHand=new THREE.Group(),minuteHand=new THREE.Group();hourHand.position.z=.2;minuteHand.position.z=.21;head.add(hourHand,minuteHand);
 add(new THREE.BoxGeometry(.08,.3,.02),ink,0,.15,0,hourHand);add(new THREE.BoxGeometry(.05,.48,.02),glove,0,.24,0,minuteHand);
 for(const s of [-1,1]){const bell=add(new THREE.SphereGeometry(.25,12,8,0,TAU,0,Math.PI/2),gold,s*.46,.6,0,head);bell.rotation.z=-s*.5;}
 add(new THREE.CylinderGeometry(.04,.04,.36,6),ink,0,.8,0,head);
 const gloves=[];
 for(const s of [-1,1]){const arm=add(new THREE.CylinderGeometry(.16,.2,.8,8),suit,s*.78,1.65,.15);arm.rotation.x=-.9;arm.rotation.z=s*.25;const gl=add(new THREE.SphereGeometry(.34,14,10),glove,s*.62,1.75,.72);gl.scale.set(1,.9,1.15);gl.castShadow=true;gloves.push(gl);}
 // Tells live in a child group that cancels the boss's own turn, so they are laid out in world directions.
 const fx=new THREE.Group();g.add(fx);
 const lane=new THREE.Group(),laneMat=basic(0xff5b32,.42);lane.add(groundPlane(1.6,7,laneMat));
 const laneRails=[];for(const x of [-.78,.78]){const mat=basic(0xffd07a,.9),rail=groundPlane(.07,7,mat);rail.position.x=x;lane.add(rail);laneRails.push(mat);}lane.visible=false;fx.add(lane);
 const fan=new THREE.Group();fx.add(fan);fan.visible=false;
 const fanMats=[];for(const i of [-2,-1,0,1,2]){const ray=new THREE.Group(),mat=basic(i===0?0xffffba:0xffbd65,i===0?.7:.5);ray.rotation.y=i*AUSTIN.volley.spread;ray.add(groundPlane(i===0?.24:.18,11,mat));fan.add(ray);fanMats.push(mat);}
 const beamMats=[basic(0xff3355,.34),basic(0xff3355,.34)];
 const beams=beamMats.map(mat=>{const b=new THREE.Group();b.add(groundPlane(AUSTIN.sweep.width,AUSTIN.sweep.length,mat));b.visible=false;fx.add(b);return b;});
 const wedgeMat=basic(0xffe38a,.4);
 const wedge=new THREE.Group();const wedgeMesh=new THREE.Mesh(new THREE.CircleGeometry(6.5,20,Math.PI/2-.5,1),wedgeMat);wedgeMesh.rotation.x=-Math.PI/2;wedgeMesh.position.y=.16;wedge.add(wedgeMesh);wedge.visible=false;fx.add(wedge);
 const tellRingMat=basic(0xffa64d,.75),tellRing=new THREE.Mesh(new THREE.RingGeometry(.92,1.12,40),tellRingMat);tellRing.rotation.x=-Math.PI/2;tellRing.position.y=.22;tellRing.visible=false;fx.add(tellRing);
 const world=new THREE.Group();scene.add(world);
 return {g,body,world,type:'austin',hp:AUSTIN.hp,maxHp:AUSTIN.hp,state:'stalk',timer:.9,pattern:0,phase:'normal',
  previousPlayer:null,velocity:new V(),volleys:0,phasePending:null,queuedSweep:false,bellAge:999,
  clock:0,beats:0,hour:0,ringHour:0,pendingRing:0,bellWarn:false,bells:0,
  dir:new V(0,0,1),dashes:0,jabHit:false,bumpCD:0,beamAngle:0,beamSign:1,alarms:[],hit:0,slow:0,
  parts:{head,hourHand,minuteHand,gloves,fx,lane,laneMat,laneRails,fan,fanMats,beams,beamMats,wedge,wedgeMesh,wedgeMat,tellRing,tellRingMat}};
}

function aimAhead(e,player){return player.clone().addScaledVector(e.velocity,AUSTIN.volley.lead).sub(e.g.position).setY(0).normalize();}
function clearAlarms(e){for(const a of e.alarms){a.group.removeFromParent();a.group.traverse(o=>{o.geometry?.dispose();o.material?.dispose();});}e.alarms.length=0;}

function ring(e,hour,offset,bolt,burst){
 for(const dir of bellDirections(hour,e.phase,offset))bolt(e.g.position,dir,{speed:AUSTIN.bell.speed,damage:AUSTIN.bell.damage});
 burst(e.g.position,'amber',26);e.bells++;
}
function beamHits(origin,angle,player){
 const dx=player.x-origin.x,dz=player.z-origin.z,sx=Math.sin(angle),sz=Math.cos(angle);
 const along=dx*sx+dz*sz,across=Math.abs(dx*sz-dz*sx);
 return along>0&&along<AUSTIN.sweep.length&&across<AUSTIN.sweep.width/2+.35;
}
function startPattern(e,delta,hooks){
 const P=PHASES[e.phase],beatLen=AUSTIN.beat*P.tempo;
 const sweepFits=(beatsToHour(e)*beatLen-e.clock)>=AUSTIN.sweep.tell*P.tempo+sweepTime(e.phase)+.2;
 let kind=e.queuedSweep&&sweepFits&&e.bellAge>=1.35?'sweep':P.order[e.pattern%P.order.length];e.pattern++;
 // A sweep never overlaps the bell: if the hour comes too soon, throw punches instead.
 if(kind==='sweep'&&!sweepFits){e.queuedSweep=true;kind='jab';}
 if(kind==='sweep')e.queuedSweep=false;
 e.kind=kind;
 hooks.sound?.('bossWarning');
 if(kind==='jab'){e.state='jabTell';e.timer=AUSTIN.jab.tell*P.tempo;e.dashes=0;e.dir.copy(delta);}
 else if(kind==='sweep'){e.state='sweepTell';e.timer=AUSTIN.sweep.tell*P.tempo;e.beamAngle=Math.atan2(delta.x,delta.z);e.beamSign=-e.beamSign;}
 else if(kind==='volley'){e.state='volleyTell';e.timer=Math.max(.42,AUSTIN.volley.tell*P.tempo);e.volleys=0;e.dir.copy(aimAhead(e,hooks.player));}
 else{
  e.state='recover';e.timer=.4;
  const count=P.alarms,base=hooks.player.clone().setY(0),spin=e.pattern*.9;
  for(let i=0;i<count;i++){
   const pos=i===0?base.clone():base.clone().add(new V(Math.cos(spin+i*TAU/(count-1)),0,Math.sin(spin+i*TAU/(count-1))).multiplyScalar(AUSTIN.alarm.spread));
   hooks.collide(pos,.5);
   const group=new THREE.Group();group.position.copy(pos);e.world.add(group);
   const edge=new THREE.Mesh(new THREE.RingGeometry(AUSTIN.alarm.radius-.15,AUSTIN.alarm.radius,40),basic(0xff5a4a,.9));edge.rotation.x=-Math.PI/2;edge.position.y=.15;group.add(edge);
   const fill=new THREE.Mesh(new THREE.CircleGeometry(AUSTIN.alarm.radius,32),basic(0xff5a4a,.14));fill.rotation.x=-Math.PI/2;fill.position.y=.14;group.add(fill);
   const clock=new THREE.Mesh(new THREE.CylinderGeometry(.28,.28,.16,16),new THREE.MeshStandardMaterial({color:0xf2c14e,emissive:0x7a3a08,emissiveIntensity:.8}));clock.position.y=.4;clock.rotation.x=Math.PI/2;group.add(clock);
   const time=Math.max(1.05,AUSTIN.alarm.countdown*P.tempo)+i*.16;
   e.alarms.push({pos,group,fill,clock,time,max:time});
  }
 }
}

// hooks: player (Vector3), collide(pos,r), bolt(pos,dir,{speed,damage}), hit(amount)->bool, burst(pos,color,n), pulse(pos,color,r,life)
export function tickAustin(e,dt,hooks){
 const {player,collide=()=>{},bolt=()=>{},hit=()=>false,burst=()=>{},pulse=()=>{},clearBolts=()=>{},sound=()=>{}}=hooks;
 if(e.previousPlayer)e.velocity.copy(player).sub(e.previousPlayer).setY(0).divideScalar(Math.max(dt,.001)).clampLength(0,7);
 else e.previousPlayer=new V();
 e.previousPlayer.copy(player);
 const next=austinPhase(e.hp,e.maxHp);
 if(next!==e.phase&&e.state!=='phaseShift'){
  e.state='phaseShift';e.phasePending=next;e.timer=AUSTIN.transition;e.pendingRing=0;e.bellWarn=false;
  clearAlarms(e);clearBolts();pulse(e.g.position,'amber',3,.9);
 }
 if(e.state==='phaseShift'){
  e.timer-=dt;e.tint=Math.floor(e.timer*12)%2?0xffc46b:0xffffff;
  if(e.timer<=0){e.phase=e.phasePending;e.phasePending=null;e.state='stalk';e.timer=.25;e.pattern=0;e.clock=0;e.beats=0;e.bellAge=999;e.queuedSweep=false;e.tint=0xffffff;}
  poseAustin(e);return;
 }
 const P=PHASES[e.phase],beatLen=AUSTIN.beat*P.tempo;
 e.hit=Math.max(0,e.hit-dt);e.bumpCD=Math.max(0,e.bumpCD-dt);
 const delta=player.clone().sub(e.g.position).setY(0),distance=delta.length();if(distance>1e-6)delta.divideScalar(distance);
 // The clock never stops, whatever he is doing.
 e.clock+=dt;e.bellAge+=dt;
 while(e.clock>=beatLen){
  e.clock-=beatLen;e.beats++;
  const into=e.beats%AUSTIN.hourBeats;
  if(into===AUSTIN.hourBeats-AUSTIN.bell.warnBeats){e.bellWarn=true;sound('bossWarning');}
  if(into===0){e.bellAge=0;e.ringHour=e.hour;ring(e,e.ringHour,0,bolt,burst);sound('bossAttack');e.pendingRing=AUSTIN.bell.ringDelay;e.bellWarn=false;e.hour=(e.hour+AUSTIN.hourStep)%12;}
 }
 if(e.pendingRing>0){e.pendingRing-=dt;if(e.pendingRing<=0)ring(e,e.ringHour,Math.PI/P.bolts,bolt,burst);}
 for(let i=e.alarms.length-1;i>=0;i--){
  const a=e.alarms[i];a.time-=dt;const k=1-a.time/a.max;
  a.fill.material.opacity=.14+.42*k;a.group.scale.setScalar(1+.035*Math.sin(k*Math.PI*10));a.clock.position.y=.4+Math.abs(Math.sin(a.time*(10+20*k)))*.18;
  if(a.time<=0){
   pulse(a.pos,'burst',AUSTIN.alarm.radius,.4);burst(a.pos,'amber',22);sound('bossAttack');
   if(Math.hypot(player.x-a.pos.x,player.z-a.pos.z)<AUSTIN.alarm.radius)hit(AUSTIN.alarm.damage);
   a.group.removeFromParent();a.group.traverse(o=>{o.geometry?.dispose();o.material?.dispose();});e.alarms.splice(i,1);
  }
 }
 const face=d=>{e.g.rotation.y=Math.atan2(d.x,d.z);};
 if(e.state==='stalk'){
  const want=distance>5.5?1:distance<3.2?-1:0,side=e.pattern%2?1:-1;
  e.g.position.addScaledVector(delta,dt*3.4*want);
  e.g.position.x+=delta.z*dt*2.3*side;e.g.position.z-=delta.x*dt*2.3*side;
  face(delta);e.timer-=dt;
  if(e.timer<=0)startPattern(e,delta,{player,collide,sound});
 }else if(e.state==='jabTell'){
  face(e.dir);e.timer-=dt;
  if(e.timer<=0){e.state='jab';e.timer=AUSTIN.jab.dash;e.jabHit=false;}
 }else if(e.state==='jab'){
  const before=e.g.position.clone();e.g.position.addScaledVector(e.dir,dt*AUSTIN.jab.speed);collide(e.g.position,1);
  const seg=e.g.position.clone().sub(before),len=seg.lengthSq();
  const t=len?THREE.MathUtils.clamp(player.clone().sub(before).dot(seg)/len,0,1):0;
  if(!e.jabHit&&before.addScaledVector(seg,t).distanceTo(player)<AUSTIN.jab.reach&&hit(AUSTIN.jab.contact))e.jabHit=true;
  e.timer-=dt;
  if(e.timer<=0){
   pulse(e.g.position,'amber',AUSTIN.jab.shock,.3);burst(e.g.position,'amber',16);
   if(!e.jabHit&&Math.hypot(player.x-e.g.position.x,player.z-e.g.position.z)<AUSTIN.jab.shock)hit(AUSTIN.jab.shockDamage);
   e.dashes++;
   if(e.dashes<P.jabs){e.state='jabTell';e.timer=Math.max(.3,AUSTIN.jab.retell*P.tempo);e.dir.copy(aimAhead(e,player));}
   else{e.state='recover';e.timer=.8*P.rest;}
  }
 }else if(e.state==='volleyTell'){
  face(e.dir);e.timer-=dt;
  if(e.timer<=0){
   for(const d of volleyDirections(e.dir))bolt(e.g.position,d,{speed:AUSTIN.volley.speed,damage:AUSTIN.volley.damage});
   burst(e.g.position,'amber',12);e.volleys++;
   if(e.volleys<P.volleys){e.timer=Math.max(.42,AUSTIN.volley.retell*P.tempo);e.dir.copy(aimAhead(e,player));}
   else{e.state='recover';e.timer=.6*P.rest;}
  }
 }else if(e.state==='sweepTell'){
  e.timer-=dt;
  if(e.timer<=0){e.state='sweep';e.timer=sweepTime(e.phase);}
 }else if(e.state==='sweep'){
  // One hand turns a full circle; in overtime two opposite hands cover the circle in half a turn.
  const twin=e.phase!=='normal';e.beamAngle+=(twin?Math.PI:TAU)/sweepTime(e.phase)*dt*e.beamSign;
  if(beamHits(e.g.position,e.beamAngle,player)||(twin&&beamHits(e.g.position,e.beamAngle+Math.PI,player)))hit(AUSTIN.sweep.damage);
  e.timer-=dt;face(new V(Math.sin(e.beamAngle),0,Math.cos(e.beamAngle)));
  if(e.timer<=0){e.state='recover';e.timer=.7*P.rest;}
 }else{
  e.timer-=dt;
  if(e.timer<=0){e.state='stalk';e.timer=(.65+(e.pattern%3)*.15)*P.rest;}
 }
 if(e.state==='stalk'&&distance<AUSTIN.bump.radius&&e.bumpCD<=0&&hit(AUSTIN.bump.damage))e.bumpCD=AUSTIN.bump.every;
 collide(e.g.position,1);
 poseAustin(e);
}

function poseAustin(e){
 const {hourHand,minuteHand,gloves,fx,lane,laneMat,laneRails,fan,fanMats,beams,beamMats,wedge,wedgeMat,tellRing,tellRingMat}=e.parts,P=PHASES[e.phase];
 const beatLen=AUSTIN.beat*P.tempo;
 minuteHand.rotation.z=-((e.beats%AUSTIN.hourBeats)+e.clock/beatLen)/AUSTIN.hourBeats*TAU;
 hourHand.rotation.z=-e.hour*Math.PI/6;
 fx.rotation.y=-e.g.rotation.y;
 lane.visible=e.state==='jabTell';lane.rotation.y=Math.atan2(e.dir.x,e.dir.z);
 fan.visible=e.state==='volleyTell';fan.rotation.y=Math.atan2(e.dir.x,e.dir.z);
 const pulse=.5+.5*Math.abs(Math.sin((e.clock+e.timer)*14));laneMat.opacity=.4+.22*pulse;for(const m of laneRails)m.opacity=.7+.3*pulse;for(const m of fanMats)m.opacity=.4+.35*pulse;
 const sweeping=e.state==='sweepTell'||e.state==='sweep';
 beams[0].visible=sweeping;beams[0].rotation.y=e.beamAngle;
 beams[1].visible=sweeping&&e.phase!=='normal';beams[1].rotation.y=e.beamAngle+Math.PI;
 for(const m of beamMats)m.opacity=e.state==='sweep'?1:.34+.22*pulse;
 const telling=e.state==='jabTell'||e.state==='volleyTell'||e.state==='sweepTell';tellRing.visible=telling;if(telling){tellRing.scale.setScalar(.8+.42*pulse);tellRingMat.color.setHex(e.state==='sweepTell'?0xff3355:e.state==='volleyTell'?0xffcf68:0xff6a3d);tellRingMat.opacity=.55+.35*pulse;}
 const ringing=e.pendingRing>0;
 wedge.visible=e.bellWarn||ringing;
 if(wedge.visible){const hour=ringing?e.ringHour:e.hour,gap=P.gapHalf;wedge.rotation.y=-hour*Math.PI/6;
  if(e.parts.wedgeGap!==gap){e.parts.wedgeMesh.geometry.dispose();e.parts.wedgeMesh.geometry=new THREE.CircleGeometry(6.5,20,Math.PI/2-gap,gap*2);e.parts.wedgeGap=gap;}
  wedgeMat.opacity=.4+.28*Math.abs(Math.sin(e.clock*9));}
 const punching=e.state==='jab'?1:e.state==='jabTell'?-.35:0;
 gloves.forEach((gl,i)=>{gl.position.z=.72+punching*(i===e.dashes%2?.55:.1);});
 e.body.position.y=e.state==='stalk'?Math.abs(Math.sin(e.beats*Math.PI/2+e.clock/beatLen*Math.PI/2))*.12:0;
 e.body.rotation.x=e.state==='jabTell'?-.16:e.state==='jab'?.24:e.state==='sweepTell'?-.08:0;
 const phasePulse=e.state==='phaseShift'?1+.06*Math.sin(e.timer*24):1,sx=e.state==='jabTell'?1.3:e.state==='jab'?1.12:1.2,sy=e.state==='jabTell'?1.08:e.state==='jab'?1.32:1.2;e.body.scale.set(sx*phasePulse,sy*phasePulse,1.2);
}

export function austinHint(e){
 if(e.state==='phaseShift')return `${PHASES[e.phasePending].label} 돌입 · 시계 재정비 중 · 잠시 피해를 막습니다`;
 if(e.bellWarn||e.pendingRing>0)return '정시 종 · 금빛 틈으로 들어가세요';
 if(e.state==='volleyTell')return '분침 난사 · 이동 방향을 읽습니다 · 꺾어서 피하세요';
 if(e.state==='sweepTell'||e.state==='sweep')return (e.phase==='normal'?'초침이 한 바퀴 돕니다':'두 시계침이 반 바퀴 돕니다')+' · 회피로 넘으세요';
 if(e.state==='jabTell'||e.state==='jab')return `${PHASES[e.phase].jabs}연속 스트레이트 · 옆으로 꺾으세요`;
 if(e.alarms.length)return '알람 시계 · 붉은 원 밖으로';
 return `${PHASES[e.phase].label} · 다음 정시까지 ${beatsToHour(e)}박`;
}

// The arena floor is his clock face. Its hand points at the gap of the next bell.
export function createClockFloor(parent){
 const group=new THREE.Group();parent.add(group);
 const mat=basic(0xf2d58a,.35),strong=basic(0xffe3a0,.6);
 const rim=new THREE.Mesh(new THREE.RingGeometry(6.9,7.1,96),mat);rim.rotation.x=-Math.PI/2;rim.position.y=.13;group.add(rim);
 for(let i=0;i<12;i++){
  const a=i*Math.PI/6,long=i%3===0;
  const mark=new THREE.Mesh(new THREE.PlaneGeometry(long?.22:.12,long?1.1:.6),long?strong:mat);
  mark.rotation.x=-Math.PI/2;mark.rotation.z=-a;mark.position.set(Math.sin(a)*(long?6.2:6.45),.135,-Math.cos(a)*(long?6.2:6.45));group.add(mark);
 }
 const hand=new THREE.Group();group.add(hand);
 const blade=new THREE.Mesh(new THREE.PlaneGeometry(.35,4.8),strong);blade.rotation.x=-Math.PI/2;blade.position.set(0,.14,-2.4);hand.add(blade);
 const tip=new THREE.Mesh(new THREE.CircleGeometry(.45,3),strong);tip.rotation.x=-Math.PI/2;tip.rotation.z=Math.PI/2;tip.position.set(0,.145,-4.9);hand.add(tip);
 return {group,hand,point(hour){hand.rotation.y=-hour*Math.PI/6;}};
}
