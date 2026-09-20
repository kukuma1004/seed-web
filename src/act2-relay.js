import * as THREE from 'three';
import {mergeGeometries} from 'three/addons/utils/BufferGeometryUtils.js';
import {RELAY_LAYOUT} from './stadium.js';

// 2막 둘째·넷째 방 한가운데에서 공을 주고받던 투구 기계와 포수 글러브.
// 예전에는 부술 수 없는 배경이라 공을 피하기만 해야 했다. 이제 둘 다 부술 수 있는 적이고,
// 한쪽만 부숴도 캐치볼이 멈춘다. 부순 쪽마다 절반의 확률로 작은 물약이 나온다.
export const RELAY=Object.freeze({
 // 가만히 서 있으니 맞히기는 쉽다. 대신 어떤 졸개보다 단단해서 부술지 말지를 고르게 된다.
 machine:Object.freeze({type:'relaymachine',name:'투구 기계',hp:200,shadow:.8}),
 mitt:Object.freeze({type:'relaymitt',name:'포수 글러브',hp:160,shadow:.58}),
 period:2.7,charge:.68,flight:.57,damage:16,ballRadius:.72,potionChance:.5,
 stages:Object.freeze([1,3])
});
export const RELAY_TYPES=Object.freeze([RELAY.machine.type,RELAY.mitt.type]);
export const isRelayPart=type=>RELAY_TYPES.includes(type);
export const relayName=type=>type===RELAY.mitt.type?RELAY.mitt.name:RELAY.machine.name;
// 캐치볼은 결승전이 아닌 둘째·넷째 방에만 놓인다.
export const relayRoom=(stage,bossRoom=false)=>!bossRoom&&RELAY.stages.includes(stage);
// 부술 때마다 반반. 두 대를 다 부수면 평균 한 병이 남는다.
export const relayPotionDrop=(random=Math.random)=>(Number(random())||0)<RELAY.potionChance;

// 공이 지금 어디쯤인지. 날아가는 중이면 t는 0~1, 아니면 null이다.
export function relayThrow(clock=0){
 const pass=Math.max(0,Math.floor(clock/RELAY.period)),phase=clock-pass*RELAY.period;
 const flying=phase>=RELAY.charge&&phase<RELAY.charge+RELAY.flight;
 return {pass,phase,reverse:pass%2===1,t:flying?Math.min(1,(phase-RELAY.charge)/RELAY.flight):null};
}
// 공의 z좌표. 짝수 번째는 마운드에서 홈으로, 홀수 번째는 반대로 간다.
export function relayBallZ(t,reverse=false){
 const from=reverse?RELAY_LAYOUT.catcher.z:RELAY_LAYOUT.pitcher.z,to=reverse?RELAY_LAYOUT.pitcher.z:RELAY_LAYOUT.catcher.z;
 return from+(to-from)*Math.max(0,Math.min(1,t));
}

const merge=parts=>{const flat=parts.map(g=>g.index?g.toNonIndexed():g),out=mergeGeometries(flat,false);for(const g of new Set([...parts,...flat]))g.dispose();return out;};
function tint(geometry,color){
 const g=geometry.index?geometry.toNonIndexed():geometry,c=new THREE.Color(color),values=new Float32Array(g.getAttribute('position').count*3);
 for(let i=0;i<values.length;i+=3){values[i]=c.r;values[i+1]=c.g;values[i+2]=c.b;}
 g.setAttribute('color',new THREE.BufferAttribute(values,3));return g;
}
function part(g,spec,position){
 return {g,type:spec.type,name:spec.name,hp:spec.hp,maxHp:spec.hp,dead:false,hit:0,slow:0,block:0,takenScale:1,state:'stalk',flash:[],...position};
}

// 장치 한 벌을 만든다. 기계가 공을 이끌고, 글러브는 받는 쪽이다.
export function createRelayRig(scene){
 const dark=new THREE.MeshStandardMaterial({color:0x1c2838,roughness:.55,metalness:.5});
 const red=new THREE.MeshStandardMaterial({color:0x9f2831,emissive:0x220608,roughness:.62,metalness:.18});
 const gold=new THREE.MeshStandardMaterial({color:0xd6a945,emissive:0x5a2d06,emissiveIntensity:.55,roughness:.45,metalness:.22});

 const machineGroup=new THREE.Group();machineGroup.name='act2-relay-machine';machineGroup.position.set(RELAY_LAYOUT.pitcher.x,0,RELAY_LAYOUT.pitcher.z);scene.add(machineGroup);
 const machineBody=new THREE.Group();machineGroup.add(machineBody);
 const shell=new THREE.Mesh(merge([new THREE.CylinderGeometry(.62,.82,1.05,8).translate(0,.58,0),new THREE.CylinderGeometry(.42,.42,.36,12).rotateZ(Math.PI/2).translate(0,1.25,0),new THREE.ConeGeometry(.24,.95,8).rotateX(Math.PI/2).translate(0,1.25,.55)]),red);
 shell.castShadow=shell.receiveShadow=true;machineBody.add(shell);
 const wheel=new THREE.Mesh(new THREE.TorusGeometry(.5,.1,6,18),gold);wheel.position.y=1.25;wheel.rotation.y=Math.PI/2;machineBody.add(wheel);

 const mittGroup=new THREE.Group();mittGroup.name='act2-relay-mitt';mittGroup.position.set(RELAY_LAYOUT.catcher.x,0,RELAY_LAYOUT.catcher.z);scene.add(mittGroup);
 const mittBody=new THREE.Group();mittGroup.add(mittBody);
 const palm=new THREE.Mesh(new THREE.SphereGeometry(.6,9,6),gold);palm.scale.set(1.25,1,.35);palm.position.y=.9;palm.castShadow=true;mittBody.add(palm);
 const stand=new THREE.Mesh(new THREE.CylinderGeometry(.12,.22,1.3,7),dark);stand.position.y=.35;stand.castShadow=true;mittBody.add(stand);

 // 선과 공은 방 좌표 그대로 움직이므로 기계와 따로 둔다(기계가 몸을 흔들어도 궤도가 흔들리지 않는다).
 const world=new THREE.Group();world.name='act2-relay-ball';scene.add(world);
 const length=RELAY_LAYOUT.catcher.z-RELAY_LAYOUT.pitcher.z;
 const lineMat=new THREE.MeshBasicMaterial({color:0xfff4c7,transparent:true,opacity:.18,depthWrite:false,toneMapped:false,side:THREE.DoubleSide,forceSinglePass:true});
 const line=new THREE.Mesh(new THREE.PlaneGeometry(.34,length).rotateX(-Math.PI/2),lineMat);
 line.position.set(0,.16,(RELAY_LAYOUT.pitcher.z+RELAY_LAYOUT.catcher.z)/2);line.visible=false;world.add(line);
 const ball=new THREE.Mesh(merge([tint(new THREE.IcosahedronGeometry(.27,1),0xfff2d5),tint(new THREE.TorusGeometry(.275,.019,3,14,Math.PI*1.55).rotateX(Math.PI/2).rotateY(.62),0xc53b37),tint(new THREE.TorusGeometry(.275,.019,3,14,Math.PI*1.55).rotateX(Math.PI/2).rotateY(-.62).rotateZ(Math.PI),0xc53b37)]),new THREE.MeshBasicMaterial({vertexColors:true,toneMapped:false}));
 ball.position.set(RELAY_LAYOUT.pitcher.x,.82,RELAY_LAYOUT.pitcher.z);ball.visible=false;world.add(ball);

 const rig={clock:0,live:true,line,ball,hitPass:-1,warnPass:-1,caught:0};
 const machine=part(machineGroup,RELAY.machine,{body:machineBody,world,rig,lead:true,wheel});
 const mitt=part(mittGroup,RELAY.mitt,{body:mittBody,rig,lead:false});
 machine.flash=[red];mitt.flash=[gold];
 rig.parts=[machine,mitt];
 return {machine,mitt,rig};
}

// 한쪽이 부서지면 캐치볼은 끝난다.
export function stopRelay(e){
 const rig=e?.rig;if(!rig||!rig.live)return false;
 rig.live=false;rig.ball.visible=false;rig.line.visible=false;return true;
}

// ctx: {player:Vector3, hit(amount)->bool, sound(id)}
export function tickRelayRig(e,dt,time,ctx){
 e.hit=Math.max(0,(e.hit||0)-dt);
 for(const material of e.flash)material.emissiveIntensity=e.hit>0?2.4:e.type===RELAY.mitt.type?.55:.25;
 const rig=e.rig;
 if(!e.lead){e.body.rotation.y=Math.sin(time*2.1)*.06;e.body.scale.setScalar(rig.caught>0?1.12:1);if(rig.caught>0)rig.caught=Math.max(0,rig.caught-dt);return;}
 e.body.rotation.y=Math.sin(time*1.8)*.08;e.wheel.rotation.z=time*3;
 if(!rig.live){rig.ball.visible=false;rig.line.visible=false;return;}
 rig.clock+=dt;
 const throwState=relayThrow(rig.clock);
 rig.line.visible=throwState.phase<RELAY.charge+RELAY.flight;
 rig.line.material.opacity=throwState.phase<RELAY.charge?.12+.5*(throwState.phase/RELAY.charge):.22;
 rig.ball.visible=throwState.t!==null;
 if(throwState.phase<.08&&rig.warnPass!==throwState.pass){rig.warnPass=throwState.pass;ctx.sound?.('bossWarning');}
 if(throwState.t===null)return;
 rig.ball.position.set(0,.82,relayBallZ(throwState.t,throwState.reverse));
 rig.ball.rotation.x+=dt*12;rig.ball.rotation.z+=dt*8;
 if(throwState.t>=1)rig.caught=.18;
 if(rig.hitPass===throwState.pass)return;
 if(Math.hypot(ctx.player.x-rig.ball.position.x,ctx.player.z-rig.ball.position.z)<RELAY.ballRadius){
  rig.hitPass=throwState.pass;if(ctx.hit?.(RELAY.damage))ctx.sound?.('bossAttack');
 }
}
