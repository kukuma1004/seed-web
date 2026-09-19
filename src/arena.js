import * as THREE from 'three';
import {isStarRoom} from './room-rotation.js';
import {isAct2} from './act2.js';
import {ACT3_ARENA,isAct3} from './act3.js';

const RECT=Object.freeze({shape:'rect',halfWidth:10,halfDepth:8});
const CIRCLE=Object.freeze({shape:'circle',radius:7.6});
const EPS=1e-6;

const point=(x,z)=>Object.freeze([x,z]);
const spot=(x,z)=>Object.freeze({x,z});
const polygonArena=(id,points,{start=spot(0,5),exit=Object.freeze({x:0,z:-6.25,radius:1.65}),spawns=[]}={})=>Object.freeze({
  shape:'poly',id,points:Object.freeze(points.map(([x,z])=>point(x,z))),start,exit,spawns:Object.freeze(spawns.map(([x,z])=>spot(x,z)))
});

// Act 2 is a tour through baseball silhouettes. These are real movement boundaries rather
// than decoration, so the narrow plate, rotating ball, glove bays and broad outfield each
// produce a different dodge route. Every outline is deliberately broad enough for the
// four base-slide points and the relay pitch down the centre.
export const HOME_PLATE_ARENA=polygonArena('home-plate',[
  [-7.8,7.3],[7.8,7.3],[7.8,-2.3],[0,-8.1],[-7.8,-2.3]
],{start:spot(0,5.25),spawns:[[-6.8,5.6],[6.8,5.6],[-6.6,-1],[6.6,-1],[-3.7,-4.4],[3.7,-4.4],[0,-6.7]]});
export const DIAMOND_ARENA=polygonArena('diamond',[
  [0,-8.6],[9,0],[0,7.7],[-9,0]
],{start:spot(-1.45,5.45),spawns:[[-6.7,-.1],[6.7,-.1],[-4.1,-4.5],[4.1,-4.5],[-4.1,3.4],[4.1,3.4],[0,-7.2]]});
export const BASEBALL_ARENA=Object.freeze({shape:'circle',id:'baseball',radius:8.2,start:spot(0,5.3),exit:Object.freeze({x:0,z:-6.5,radius:1.65})});
export const GLOVE_ARENA=polygonArena('glove',[
  [-4.8,7.4],[4.8,7.4],[6.15,5],[7.1,2.2],[7.25,-1.1],[6.55,-3.7],[7.05,-6.7],
  [5.15,-7.65],[4.25,-5.05],[3.25,-8.05],[1.35,-8.35],[1,-5.25],[0,-8.65],[-1,-5.25],
  [-2.95,-8.05],[-2.45,-4.95],[-4.2,-7.55],[-6.45,-6.3],[-5.9,-3.65],[-8.45,-3.85],
  [-9,-1.2],[-7.25,1.6],[-6.3,4.8]
],{start:spot(-1.8,5.55),spawns:[[-5.3,4.1],[5.3,4.1],[-7,-1.8],[6,-2.2],[-5.2,-5.5],[5.25,-5.7],[-1.2,-6.8],[2.3,-6.8]]});
export const BALLPARK_ARENA=polygonArena('ballpark',[
  [-4.6,7.35],[4.6,7.35],[6.45,5],[7.9,2.5],[8.9,-.5],[8.55,-3.7],[6.4,-6.65],
  [3.25,-8.15],[0,-8.75],[-3.25,-8.15],[-6.4,-6.65],[-8.55,-3.7],[-8.9,-.5],[-7.9,2.5],[-6.45,5]
],{start:spot(0,5.35),exit:Object.freeze({x:0,z:-6.75,radius:1.75}),spawns:[[-5.3,4.3],[5.3,4.3],[-7.3,0],[7.3,0],[-6.1,-5],[6.1,-5],[-3,-7],[3,-7],[0,-7.6]]});
export const ACT2_ARENAS=Object.freeze([HOME_PLATE_ARENA,DIAMOND_ARENA,BASEBALL_ARENA,GLOVE_ARENA,BALLPARK_ARENA]);

// Five-pointed star garden. One tip points to the top of the screen and holds the exit;
// the seed starts in the open middle, because the bottom of a star is a notch, not floor.
// Tips are dead ends, so the star is kept wide: a fat inner ring (6) and stretched sideways (x1.15), where the screen has room.
// Its floor is larger than the circle room's; nudged toward the camera so the top tip stays on screen.
const STAR_OUTER=9.4,STAR_INNER=6,STAR_CZ=.7,STAR_SX=1.15;
export const STAR_POINTS=Object.freeze(Array.from({length:10},(_,i)=>{
  const radius=i%2?STAR_INNER:STAR_OUTER,a=i*Math.PI/5;
  return Object.freeze([+(STAR_SX*radius*Math.sin(a)).toFixed(4),+(STAR_CZ-radius*Math.cos(a)).toFixed(4)]);
}));
const tipPoint=(k,radius)=>{const a=k*2*Math.PI/5;return Object.freeze({x:+(STAR_SX*radius*Math.sin(a)).toFixed(3),z:+(STAR_CZ-radius*Math.cos(a)).toFixed(3)});};
export const STAR=Object.freeze({
  shape:'poly',id:'star',points:STAR_POINTS,
  start:Object.freeze({x:0,z:3.4}),
  exit:Object.freeze({x:0,z:-6.2,radius:1.65}),
  // Enemies pour out of the tips: deep in each tip first, then nearer the middle.
  spawns:Object.freeze([...[0,1,2,3,4].map(k=>tipPoint(k,7.6)),...[0,1,2,3,4].map(k=>tipPoint(k,6))])
});

// A room's visible rim, movement and projectiles share this definition.
export function arenaFor(stage,cycle=0,region='garden') {
  if(isAct3(region))return ACT3_ARENA;
  if(isAct2(region))return ACT2_ARENAS[Math.max(0,Math.min(ACT2_ARENAS.length-1,stage))];
  if(isStarRoom(stage,cycle))return STAR;
  return stage===2?CIRCLE:RECT;
}

// Polygon helpers. Inward normals are measured once per outline and reused.
const polygonCache=new WeakMap();
function pointInPolygon(x,z,points) {
  let inside=false;
  for(let i=0,j=points.length-1;i<points.length;j=i++) {
    const [xi,zi]=points[i],[xj,zj]=points[j];
    if((zi>z)!==(zj>z)&&x<(xj-xi)*(z-zi)/(zj-zi)+xi)inside=!inside;
  }
  return inside;
}
function polygonEdges(points) {
  let edges=polygonCache.get(points);
  if(edges)return edges;
  edges=points.map((a,i)=>{
    const b=points[(i+1)%points.length],dx=b[0]-a[0],dz=b[1]-a[1],length=Math.hypot(dx,dz);
    let nx=-dz/length,nz=dx/length;
    const mx=(a[0]+b[0])/2,mz=(a[1]+b[1])/2;
    if(!pointInPolygon(mx+nx*1e-3,mz+nz*1e-3,points)){nx=-nx;nz=-nz;}
    return {ax:a[0],az:a[1],bx:b[0],bz:b[1],dx,dz,length,nx,nz};
  });
  polygonCache.set(points,edges);
  return edges;
}
function nearestOnPolygon(x,z,edges) {
  let best=null;
  edges.forEach((e,index)=>{
    const t=Math.max(0,Math.min(1,((x-e.ax)*e.dx+(z-e.az)*e.dz)/(e.length*e.length)));
    const px=e.ax+e.dx*t,pz=e.az+e.dz*t,d=Math.hypot(x-px,z-pz);
    if(!best||d<best.d)best={x:px,z:pz,d,index};
  });
  return best;
}
export function distanceToArenaEdge(pos,arena) {
  if(arena.shape!=='poly')return Infinity;
  return nearestOnPolygon(pos.x,pos.z,polygonEdges(arena.points)).d;
}

export function insideArena(pos,margin=0,arena=RECT) {
  if(arena.shape==='poly') {
    if(!pointInPolygon(pos.x,pos.z,arena.points))return false;
    return margin<=0||nearestOnPolygon(pos.x,pos.z,polygonEdges(arena.points)).d+EPS>=margin;
  }
  if(arena.shape==='circle')return Math.hypot(pos.x,pos.z)<=Math.max(0,arena.radius-margin)+EPS;
  return Math.abs(pos.x)<=Math.max(0,arena.halfWidth-margin)+EPS&&Math.abs(pos.z)<=Math.max(0,arena.halfDepth-margin)+EPS;
}

export function constrainToArena(pos,radius=0,arena=RECT) {
  if(arena.shape==='poly') {
    // Push out of the nearest wall a few times. In a sharp tip or beside an inward corner one push can
    // land too close to the neighbouring wall; repeating settles on the free point between them.
    const edges=polygonEdges(arena.points);
    for(let step=0;step<10;step++) {
      const inside=pointInPolygon(pos.x,pos.z,arena.points),near=nearestOnPolygon(pos.x,pos.z,edges);
      if(inside&&near.d+EPS>=radius)break;
      const edge=edges[near.index];
      let ux=edge.nx,uz=edge.nz;
      if(inside&&near.d>1e-9){ux=(pos.x-near.x)/near.d;uz=(pos.z-near.z)/near.d;}
      const push=Math.max(radius,EPS*10);
      pos.x=near.x+ux*push;pos.z=near.z+uz*push;
    }
    return pos;
  }
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
function reflectPolygon(previous,next,dir,arena) {
  const edges=polygonEdges(arena.points),start={x:previous.x,z:previous.z};
  if(!pointInPolygon(start.x,start.z,arena.points))constrainToArena(start,EPS*10,arena);
  let dx=next.x-start.x,dz=next.z-start.z,hit=false;
  // A bent wall can be crossed and re-entered inside one step, so every edge is tested, not just the end point.
  for(let bounce=0;bounce<8;bounce++) {
    let best=null;
    for(const e of edges) {
      if(dx*e.nx+dz*e.nz>=0)continue;
      const den=dx*e.dz-dz*e.dx;
      if(Math.abs(den)<1e-12)continue;
      const t=((e.ax-start.x)*e.dz-(e.az-start.z)*e.dx)/den,u=((e.ax-start.x)*dz-(e.az-start.z)*dx)/den;
      if(t>1e-9&&t<=1&&u>=-1e-9&&u<=1+1e-9&&(!best||t<best.t))best={t,e};
    }
    if(!best){
      next.x=start.x+dx;next.z=start.z+dz;
      if(pointInPolygon(next.x,next.z,arena.points))return hit;
      // Exactly grazing a sharp corner can slip past both edge tests by rounding: pull it back and bounce it.
      const near=nearestOnPolygon(next.x,next.z,edges),edge=edges[near.index],dot=dir.x*edge.nx+dir.z*edge.nz;
      if(dot<0){dir.x-=2*dot*edge.nx;dir.z-=2*dot*edge.nz;}
      constrainToArena(next,EPS*10,arena);return true;
    }
    const {t,e}=best,x=start.x+dx*t,z=start.z+dz*t,left=1-t;
    const travelDot=dx*e.nx+dz*e.nz,directionDot=dir.x*e.nx+dir.z*e.nz;
    dx=(dx-2*travelDot*e.nx)*left;dz=(dz-2*travelDot*e.nz)*left;
    if(directionDot<0){dir.x-=2*directionDot*e.nx;dir.z-=2*directionDot*e.nz;}
    start.x=x+e.nx*EPS*20;start.z=z+e.nz*EPS*20;hit=true;
  }
  next.x=start.x+dx;next.z=start.z+dz;constrainToArena(next,EPS*10,arena);
  return hit;
}

export function reflectArenaBoundary(previous,next,dir,arena=RECT) {
  if(arena.shape==='poly')return reflectPolygon(previous,next,dir,arena);
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
  const points=arena.shape==='poly'?arena.spawns.map(p=>[p.x,p.z]):arena.shape==='circle'
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
const STADIUM_ATLAS={fence:[0,.5,.5,.5],rail:[.5,0,.5,.5]};
function stadiumUV(geometry,id){const uv=geometry.attributes.uv,q=STADIUM_ATLAS[id];if(!uv||!q)return geometry;for(let i=0;i<uv.count;i++)uv.setXY(i,q[0]+uv.getX(i)*q[2],q[1]+uv.getY(i)*q[3]);uv.needsUpdate=true;return geometry;}
export function buildArenaBoundary(group,arena,materials,stadium=false) {
  if(arena.shape==='poly'){buildPolygonBoundary(group,arena,materials,stadium);return;}
  if(arena.shape!=='circle')return;
  const radius=arena.radius;
  const floor=new THREE.Mesh(new THREE.CircleGeometry(radius,96),materials.dark);
  floor.rotation.x=-Math.PI/2;floor.position.y=.105;floor.receiveShadow=true;group.add(floor);
  const band=new THREE.Mesh(stadiumUV(new THREE.RingGeometry(radius-.19,radius,96),stadium?'rail':null),materials.armor);
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
  const rim=new THREE.Mesh(stadiumUV(new THREE.ExtrudeGeometry(wedges,{depth:.46,bevelEnabled:false,curveSegments:3,steps:1}),stadium?'fence':null),materials.stone);
  rim.rotation.x=-Math.PI/2;rim.position.y=.12;rim.castShadow=rim.receiveShadow=true;group.add(rim);
  const marks=new THREE.InstancedMesh(stadiumUV(new THREE.BoxGeometry(.055,.015,.6),stadium?'rail':null),materials.armor,12),matrix=new THREE.Matrix4();
  for(let i=0;i<12;i++) {
    const a=i*Math.PI/6;matrix.makeRotationY(a);matrix.setPosition(Math.sin(a)*(radius-.7),.125,Math.cos(a)*(radius-.7));marks.setMatrixAt(i,matrix);
  }
  marks.receiveShadow=true;group.add(marks);
}

// Drawn entirely in code, four draw calls like the round room: dark floor in the star's outline,
// a thin brass inlay just inside the wall, a raised stone wall outside it, and a stud on every corner.
// The inside face of the wall is exactly the playable edge.
function buildPolygonBoundary(group,arena,materials,stadium=false) {
  const points=arena.points,edges=polygonEdges(points),v=(x,z)=>new THREE.Vector2(x,-z);
  const outline=new THREE.Shape(points.map(([x,z])=>v(x,z)));
  const floor=new THREE.Mesh(new THREE.ShapeGeometry(outline),materials.dark);
  floor.rotation.x=-Math.PI/2;floor.position.y=.105;floor.receiveShadow=true;group.add(floor);
  const quads=(depth,inward)=>edges.map(e=>{const k=inward?1:-1,ox=e.nx*depth*k,oz=e.nz*depth*k;
    return new THREE.Shape([v(e.ax,e.az),v(e.bx,e.bz),v(e.bx+ox,e.bz+oz),v(e.ax+ox,e.az+oz)]);});
  const band=new THREE.Mesh(stadiumUV(new THREE.ShapeGeometry(quads(.19,true)),stadium?'rail':null),materials.armor);
  band.rotation.x=-Math.PI/2;band.position.y=.12;band.receiveShadow=true;group.add(band);
  // Outward wall pieces leave a wedge gap at every outward corner; a triangle fills it.
  const wall=quads(.55,false);
  edges.forEach((e,i)=>{const prev=edges[(i+edges.length-1)%edges.length],turn=prev.dx*e.dz-prev.dz*e.dx,convex=(prev.nx*e.dx+prev.nz*e.dz)<0;
    if(convex&&Math.abs(turn)>1e-9)wall.push(new THREE.Shape([v(e.ax,e.az),v(e.ax-prev.nx*.55,e.az-prev.nz*.55),v(e.ax-e.nx*.55,e.az-e.nz*.55)]));});
  const rim=new THREE.Mesh(stadiumUV(new THREE.ExtrudeGeometry(wall,{depth:.46,bevelEnabled:false,curveSegments:1,steps:1}),stadium?'fence':null),materials.stone);
  rim.rotation.x=-Math.PI/2;rim.position.y=.12;rim.castShadow=rim.receiveShadow=true;group.add(rim);
  const studs=new THREE.InstancedMesh(stadiumUV(new THREE.CylinderGeometry(.13,.16,.08,10),stadium?'rail':null),materials.armor,points.length),matrix=new THREE.Matrix4();
  edges.forEach((e,i)=>{const prev=edges[(i+edges.length-1)%edges.length],nx=e.nx+prev.nx,nz=e.nz+prev.nz,length=Math.hypot(nx,nz)||1;
    matrix.makeTranslation(e.ax+nx/length*.32,.15,e.az+nz/length*.32);studs.setMatrixAt(i,matrix);});
  studs.receiveShadow=true;group.add(studs);
}
