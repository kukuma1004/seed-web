import * as THREE from 'three';

const RECT=Object.freeze({shape:'rect',halfWidth:10,halfDepth:8});
const CIRCLE=Object.freeze({shape:'circle',radius:7.6});
const EPS=1e-6;

// A room's visible rim, movement and projectiles share this definition.
export function arenaFor(stage,cycle=0,region='garden') {
  return stage===2?CIRCLE:RECT;
}

export function insideArena(pos,margin=0,arena=RECT) {
  if(arena.shape==='circle')return Math.hypot(pos.x,pos.z)<=Math.max(0,arena.radius-margin)+EPS;
  return Math.abs(pos.x)<=Math.max(0,arena.halfWidth-margin)+EPS&&Math.abs(pos.z)<=Math.max(0,arena.halfDepth-margin)+EPS;
}

export function constrainToArena(pos,radius=0,arena=RECT) {
  if(arena.shape==='circle') {
    const limit=Math.max(0,arena.radius-radius),distance=Math.hypot(pos.x,pos.z);
    if(distance>limit&&distance>0){pos.x*=limit/distance;pos.z*=limit/distance;}
  } else {
    const x=Math.max(0,arena.halfWidth-radius),z=Math.max(0,arena.halfDepth-radius);
    pos.x=Math.max(-x,Math.min(x,pos.x));pos.z=Math.max(-z,Math.min(z,pos.z));
  }
  return pos;
}

// Swept edge collision. Preserve the untravelled part of a reflected shot,
// rather than flipping at its already-overshot endpoint on the round wall.
// Only x/z are changed; callers retain projectile height and speed.
export function reflectArenaBoundary(previous,next,dir,arena=RECT) {
  if(insideArena(next,0,arena))return false;
  const start={x:previous.x,z:previous.z};
  constrainToArena(start,EPS,arena);
  let dx=next.x-start.x,dz=next.z-start.z,hit=false;
  for(let bounce=0;bounce<8;bounce++) {
    const target={x:start.x+dx,z:start.z+dz};
    if(insideArena(target,0,arena)){next.x=target.x;next.z=target.z;return hit;}
    let t=1,nx=0,nz=0,corner=false;
    if(arena.shape==='circle') {
      const a=dx*dx+dz*dz,b=2*(start.x*dx+start.z*dz),c=start.x*start.x+start.z*start.z-arena.radius*arena.radius;
      if(a<EPS*EPS)break;
      t=Math.max(0,Math.min(1,(-b+Math.sqrt(Math.max(0,b*b-4*a*c)))/(2*a)));
      nx=(start.x+dx*t)/arena.radius;nz=(start.z+dz*t)/arena.radius;
    } else {
      const tx=Math.abs(dx)>EPS?((dx>0?arena.halfWidth:-arena.halfWidth)-start.x)/dx:Infinity;
      const tz=Math.abs(dz)>EPS?((dz>0?arena.halfDepth:-arena.halfDepth)-start.z)/dz:Infinity;
      t=Math.max(0,Math.min(1,tx,tz));corner=Math.abs(tx-tz)<EPS;
      if(tx<=tz)nx=Math.sign(dx);else nz=Math.sign(dz);
    }
    const x=start.x+dx*t,z=start.z+dz*t,left=1-t;
    if(corner){dx=-dx*left;dz=-dz*left;dir.x*=-1;dir.z*=-1;}
    else {
      const travelDot=dx*nx+dz*nz,directionDot=dir.x*nx+dir.z*nz;
      dx=(dx-2*travelDot*nx)*left;dz=(dz-2*travelDot*nz)*left;
      dir.x-=2*directionDot*nx;dir.z-=2*directionDot*nz;
    }
    start.x=x;start.z=z;constrainToArena(start,EPS,arena);hit=true;
  }
  // Defensive bound for exceptional very long segments; normal frame steps
  // need one iteration, and a fast corner shot can need two.
  next.x=start.x+dx;next.z=start.z+dz;constrainToArena(next,EPS,arena);
  return hit;
}

export function safeArenaSpawn(player,covers,index,arena=RECT) {
  const points=arena.shape==='circle'
    ?Array.from({length:16},(_,i)=>{const a=i*Math.PI/8;return [Math.sin(a)*(arena.radius-.85),Math.cos(a)*(arena.radius-.85)];})
    :[[-8,-6],[8,-6],[-8,6],[8,6],[0,-7],[-9,0],[9,0],[-5,-6],[5,-6]];
  const offset=((index%points.length)+points.length)%points.length;
  for(let i=0;i<points.length;i++) {
    const [x,z]=points[(offset+i)%points.length];
    if(insideArena({x,z},.7,arena)&&Math.hypot(x-player.x,z-player.z)>4&&
      !covers.some(o=>Math.abs(x-o.x)<o.w/2+.7&&Math.abs(z-o.z)<o.d/2+.7))return {x,z};
  }
  return null;
}

// Four draw calls, shared materials and no added textures. The inside edge of
// every raised wedge is the exact playable radius; square courtyard stays outside.
export function buildArenaBoundary(group,arena,materials) {
  if(arena.shape!=='circle')return;
  const radius=arena.radius;
  const floor=new THREE.Mesh(new THREE.CircleGeometry(radius,96),materials.dark);
  floor.rotation.x=-Math.PI/2;floor.position.y=.105;floor.receiveShadow=true;group.add(floor);
  const band=new THREE.Mesh(new THREE.RingGeometry(radius-.19,radius,96),materials.armor);
  band.rotation.x=-Math.PI/2;band.position.y=.12;band.receiveShadow=true;group.add(band);
  const wedges=[];
  for(let i=0;i<48;i++) {
    const a=i*Math.PI/24+.004,b=(i+1)*Math.PI/24-.004,s=new THREE.Shape();
    s.moveTo(Math.cos(a)*radius,Math.sin(a)*radius);
    s.lineTo(Math.cos(a)*(radius+.55),Math.sin(a)*(radius+.55));
    s.absarc(0,0,radius+.55,a,b,false);
    s.lineTo(Math.cos(b)*radius,Math.sin(b)*radius);
    s.absarc(0,0,radius,b,a,true);s.closePath();wedges.push(s);
  }
  const rim=new THREE.Mesh(new THREE.ExtrudeGeometry(wedges,{depth:.46,bevelEnabled:false,curveSegments:3,steps:1}),materials.stone);
  rim.rotation.x=-Math.PI/2;rim.position.y=.12;rim.castShadow=rim.receiveShadow=true;group.add(rim);
  const marks=new THREE.InstancedMesh(new THREE.BoxGeometry(.055,.015,.6),materials.armor,12),matrix=new THREE.Matrix4();
  for(let i=0;i<12;i++) {
    const a=i*Math.PI/6;matrix.makeRotationY(a);matrix.setPosition(Math.sin(a)*(radius-.7),.125,Math.cos(a)*(radius-.7));marks.setMatrixAt(i,matrix);
  }
  marks.receiveShadow=true;group.add(marks);
}
