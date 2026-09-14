import * as THREE from 'three';

// Spike plates cycle idle -> warning -> active. They hurt enemies as well as the seed,
// so luring a crowd over a plate is a real tactic, and the warning glow is always shown first.
export const TRAP_TIMING=Object.freeze({idle:2.4,warn:.85,active:.45});
export const TRAP_SIZE=1.5;
export const TRAP_DAMAGE=Object.freeze({player:14,enemy:40});

const CYCLE=TRAP_TIMING.idle+TRAP_TIMING.warn+TRAP_TIMING.active;
export function trapPhase(clock){
 const t=((clock%CYCLE)+CYCLE)%CYCLE;
 if(t<TRAP_TIMING.idle)return {phase:'idle',progress:t/TRAP_TIMING.idle};
 if(t<TRAP_TIMING.idle+TRAP_TIMING.warn)return {phase:'warn',progress:(t-TRAP_TIMING.idle)/TRAP_TIMING.warn};
 return {phase:'active',progress:(t-TRAP_TIMING.idle-TRAP_TIMING.warn)/TRAP_TIMING.active};
}
export function insideTrap(trap,pos,radius=0){return Math.abs(pos.x-trap.x)<TRAP_SIZE/2+radius&&Math.abs(pos.z-trap.z)<TRAP_SIZE/2+radius;}

// Plate spots per room, clear of that room's covers, the player start and the exit.
export const TRAP_LAYOUTS=[
 [],
 [{x:0,z:1.2},{x:-6.5,z:2.5},{x:6.5,z:-2.5}],
 [{x:0,z:0},{x:-5.2,z:0},{x:5.2,z:0}],
 [{x:-2.6,z:2.4},{x:2.6,z:2.4},{x:-7.6,z:-2.4},{x:7.6,z:-2.4}],
 [{x:-3.2,z:3.4},{x:3.2,z:3.4},{x:0,z:0.6}]
];

// Plates are offset in time so a room never flashes all at once.
export function trapsFor(stage,cycle=0){
 const base=TRAP_LAYOUTS[stage]||[];
 const list=base.map((p,i)=>({...p,offset:i*1.1,hitPlayer:false,hitEnemies:new Set()}));
 return cycle>0?list.map(t=>({...t,offset:t.offset*.7})):list;
}

export function tickTrap(trap,clock,{player,enemies,hurtPlayer,hurtEnemy}){
 const {phase}=trapPhase(clock+trap.offset);
 if(phase!=='active'){trap.hitPlayer=false;trap.hitEnemies.clear();return phase;}
 if(!trap.hitPlayer&&insideTrap(trap,player,.25)){trap.hitPlayer=hurtPlayer(TRAP_DAMAGE.player)!==false;}
 for(const e of enemies){
  if(e.dead||trap.hitEnemies.has(e)||e.type==='warden'||e.type==='turret')continue;
  if(insideTrap(trap,e.g.position,.3)){trap.hitEnemies.add(e);hurtEnemy(e,TRAP_DAMAGE.enemy);}
 }
 return phase;
}

export function createTrapVisual(parent,trap,mats){
 const g=new THREE.Group();g.position.set(trap.x,0,trap.z);parent.add(g);
 const plate=new THREE.Mesh(new THREE.BoxGeometry(TRAP_SIZE,.08,TRAP_SIZE),mats.dark);plate.position.y=.1;plate.receiveShadow=true;g.add(plate);
 const glowMat=new THREE.MeshBasicMaterial({color:0xff6a2b,transparent:true,opacity:0,depthWrite:false,toneMapped:false});
 const glow=new THREE.Mesh(new THREE.PlaneGeometry(TRAP_SIZE*.92,TRAP_SIZE*.92),glowMat);glow.rotation.x=-Math.PI/2;glow.position.y=.15;g.add(glow);
 const edgeMat=new THREE.MeshBasicMaterial({color:0xffb070,transparent:true,opacity:.45,depthWrite:false,toneMapped:false});
 const edge=new THREE.Mesh(new THREE.RingGeometry(TRAP_SIZE*.62,TRAP_SIZE*.7,4,1),edgeMat);edge.rotation.set(-Math.PI/2,0,Math.PI/4);edge.position.y=.16;g.add(edge);
 const spikes=new THREE.InstancedMesh(new THREE.ConeGeometry(.09,.55,5),mats.armor,9),m=new THREE.Matrix4();
 for(let i=0;i<9;i++){m.makeTranslation(((i%3)-1)*.45,.27,(Math.floor(i/3)-1)*.45);spikes.setMatrixAt(i,m);}
 spikes.position.y=-.5;spikes.castShadow=true;g.add(spikes);
 return {group:g,update(phase,progress){
  glowMat.opacity=phase==='warn'?.25+.45*Math.abs(Math.sin(progress*Math.PI*4)):phase==='active'?.7:0;
  edgeMat.opacity=phase==='idle'?.3:.9;
  spikes.position.y=phase==='active'?Math.min(0,-.5+progress*6):-.5;
 }};
}
