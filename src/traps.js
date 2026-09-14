import * as THREE from 'three';
import {mergeGeometries} from 'three/addons/utils/BufferGeometryUtils.js';

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
 g.name='carved-spike-mechanism';
 // The stone footprint is the same square as the hitbox. Chamfers and inlay
 // give it a readable surface instead of a detached luminous outline.
 const stoneMat=new THREE.MeshStandardMaterial({color:0x41463e,map:mats.dark?.map||null,roughness:.86,metalness:.08});
 const copperMat=new THREE.MeshStandardMaterial({color:0xa77d48,roughness:.43,metalness:.66,emissive:0xb45d18,emissiveIntensity:0});
 const slotMat=new THREE.MeshStandardMaterial({color:0x161e1c,roughness:.92});
 const steelMat=new THREE.MeshStandardMaterial({color:0xc1bba4,roughness:.4,metalness:.58,flatShading:true});
 const edge=TRAP_SIZE/2-.016,cut=.12,outline=new THREE.Shape();
 outline.moveTo(-edge+cut,-edge);outline.lineTo(edge-cut,-edge);outline.lineTo(edge,-edge+cut);outline.lineTo(edge,edge-cut);
 outline.lineTo(edge-cut,edge);outline.lineTo(-edge+cut,edge);outline.lineTo(-edge,edge-cut);outline.lineTo(-edge,-edge+cut);outline.closePath();
 const plate=new THREE.Mesh(new THREE.ExtrudeGeometry(outline,{depth:.12,steps:1,bevelEnabled:true,bevelSegments:1,bevelSize:.016,bevelThickness:.016,curveSegments:1}),stoneMat);
 plate.name='chamfered-stone-plate';plate.rotation.x=-Math.PI/2;plate.position.y=.05;plate.receiveShadow=true;g.add(plate);
 const metal=[],slots=[];
 const addBox=(parts,x,y,z,w,h,d)=>parts.push(new THREE.BoxGeometry(w,h,d).translate(x,y,z));
 const flat=(geo,x,y,z)=>geo.rotateX(-Math.PI/2).translate(x,y,z);
 for(let i=0;i<9;i++){
  const x=((i%3)-1)*.45,z=(Math.floor(i/3)-1)*.45;
  slots.push(flat(new THREE.CircleGeometry(.128,8),x,.19,z));
  metal.push(flat(new THREE.RingGeometry(.117,.158,8),x,.197,z));
  // Narrow mechanical channels join the collars without filling the floor.
  if(i%3<2)addBox(metal,x+.225,.193,z,.14,.013,.022);
  if(i<6)addBox(metal,x,.193,z+.225,.022,.013,.14);
 }
 for(const x of [-1,1])for(const z of [-1,1]){
  addBox(metal,x*.62,.193,z*.52,.055,.022,.23);
  addBox(metal,x*.52,.193,z*.62,.23,.022,.055);
  metal.push(new THREE.CylinderGeometry(.037,.037,.028,6).translate(x*.61,.211,z*.61));
 }
 // Recessed seams and offset chips are baked into one dark material batch.
 for(const side of [-1,1]){
  addBox(slots,side*.29,.189,side*.65,.22,.008,.024);
  addBox(slots,side*.66,.189,-side*.25,.022,.008,.18);
 }
 const merged=(parts,material,name)=>{const geo=mergeGeometries(parts.map(p=>p.index?p.toNonIndexed():p),false);const ob=new THREE.Mesh(geo,material);ob.name=name;ob.receiveShadow=true;g.add(ob);for(const p of parts)p.dispose();return ob;};
 merged(slots,slotMat,'recessed-sockets-and-carving');
 merged(metal,copperMat,'copper-socket-collars');
 // A bent pentagonal fang has a broad base, a shoulder and an offset tip.
 // Flat triangle normals catch the sun without additional lights or textures.
 const vertices=[],rings=[{y:0,r:.085,x:0,z:0},{y:.28,r:.068,x:.022,z:0}];
 const point=(ring,i)=>{const a=i*Math.PI*2/5;return [ring.x+Math.cos(a)*ring.r,ring.y,ring.z+Math.sin(a)*ring.r];};
 for(let i=0;i<5;i++){
  const a=point(rings[0],i),b=point(rings[0],i+1),c=point(rings[1],i),d=point(rings[1],i+1);
  vertices.push(...a,...c,...b,...b,...c,...d,...c,...[.075,.5,.018],...d);
 }
 const fang=new THREE.BufferGeometry();fang.setAttribute('position',new THREE.Float32BufferAttribute(vertices,3));fang.computeVertexNormals();
 const spikes=new THREE.InstancedMesh(fang,steelMat,9),m=new THREE.Matrix4();spikes.name='rising-metal-thorns';
 for(let i=0;i<9;i++){m.makeRotationY(i*2.399);m.setPosition(((i%3)-1)*.45,.11,(Math.floor(i/3)-1)*.45);spikes.setMatrixAt(i,m);}
 spikes.position.y=-.5;spikes.castShadow=true;g.add(spikes);
 const glowMat=new THREE.MeshBasicMaterial({color:0xd88631,transparent:true,opacity:0,depthWrite:false,toneMapped:false});
 const glow=new THREE.Mesh(new THREE.PlaneGeometry(TRAP_SIZE*.96,TRAP_SIZE*.96),glowMat);glow.name='amber-pressure-warning';glow.rotation.x=-Math.PI/2;glow.position.y=.22;g.add(glow);
 return {group:g,update(phase,progress){
  const pulse=Math.abs(Math.sin(progress*Math.PI*4));
  glowMat.opacity=phase==='warn'?.16+.22*pulse:phase==='active'?.3:0;
  copperMat.emissiveIntensity=phase==='warn'?.18+.55*pulse:phase==='active'?.55:0;
  spikes.position.y=phase==='active'?Math.min(0,-.5+progress*6):-.5;
 }};
}
