import assert from 'node:assert/strict';
import {journeyRoomLayout,journeyLayoutBlocksPoint,JOURNEY_ROOM_LAYOUT_LIMITS as CAPS} from '../src/journey-room-layouts.js';
import {ACT3_ARENA,SKYWAY_ROOMS,act3ReinforcementSpawn} from '../src/act3.js';
import {createCrystalSiege} from '../src/crystal-siege-rules.js';

// Geometry checks use actual cover footprints and actor radii, independently
// of renderer style. They do not claim browser, touch or normal-account play.
const rectDistance=(p,c)=>Math.hypot(Math.max(0,Math.abs(p.x-c.x)-c.w/2),Math.max(0,Math.abs(p.z-c.z)-c.d/2));
const free=(layout,p,r)=>!layout.cover.some(c=>rectDistance(p,c)<r-1e-8);
const inPolygon=(p,points)=>{let inside=false;for(let i=0,j=points.length-1;i<points.length;j=i++){const[a,b]=points[i],[c,d]=points[j];if((b>p.z)!==(d>p.z)&&p.x<(c-a)*(p.z-b)/(d-b)+a)inside=!inside;}return inside;};
const siegePolygon=Array.from({length:12},(_,i)=>[Math.cos(i*Math.PI/6)*13,Math.sin(i*Math.PI/6)*11]);
const siegeInside=(p,r)=>{if(!inPolygon(p,siegePolygon))return false;for(let i=0;i<12;i++){const a=siegePolygon[i],b=siegePolygon[(i+1)%12],dx=b[0]-a[0],dz=b[1]-a[1],t=Math.max(0,Math.min(1,((p.x-a[0])*dx+(p.z-a[1])*dz)/(dx*dx+dz*dz)));if(Math.hypot(p.x-a[0]-t*dx,p.z-a[1]-t*dz)<r-1e-8)return false;}return true;};
function grid(layout,radius){
 const wind=layout.act==='crosswind',siege=layout.act==='crystalGorge',length=layout.courseLength;
 const minX=wind?-3:-15,maxX=wind?length+3:15,minZ=-13,maxZ=13,step=.5,nx=Math.round((maxX-minX)/step)+1,nz=Math.round((maxZ-minZ)/step)+1;
 const usable=new Uint8Array(nx*nz),visited=new Uint8Array(nx*nz),queue=[];
 const inside=p=>siege?siegeInside(p,radius):wind?p.x>=minX+radius&&p.x<=maxX-radius&&Math.abs(p.z)<=9-radius:Math.abs(p.x)<=15-radius&&Math.abs(p.z)<=13-radius;
 let count=0;for(let iz=0;iz<nz;iz++)for(let ix=0;ix<nx;ix++){const p={x:minX+ix*step,z:minZ+iz*step},id=iz*nx+ix;if(inside(p)&&free(layout,p,radius)){usable[id]=1;count++;if(!queue.length)queue.push(id);}}
 assert(count>0);visited[queue[0]]=1;for(let q=0;q<queue.length;q++){const id=queue[q],x=id%nx,z=Math.floor(id/nx);for(const [dx,dz]of [[1,0],[-1,0],[0,1],[0,-1]]){const sx=x+dx,sz=z+dz,next=sz*nx+sx;if(sx<0||sx>=nx||sz<0||sz>=nz||!usable[next]||visited[next])continue;visited[next]=1;queue.push(next);}}
 assert.equal(queue.length,count,`${layout.act} room ${layout.room}, round ${layout.round}, actor ${radius}: no isolated floor pocket`);
 return count;
}
let cells=0,layouts=0,protectedChecks=0,ingressRays=0;
const references=new Set();
for(const act of [3,4,5])for(let room=0;room<5;room++)for(let round=0;round<5;round++){
 const layout=journeyRoomLayout(act,room,round);assert.equal(layout,journeyRoomLayout(layout.act,room,round));assert(Object.isFrozen(layout)&&Object.isFrozen(layout.cover)&&Object.isFrozen(layout.decor));
 references.add(layout);assert(layout.cover.length<=CAPS.cover&&layout.decor.length<=CAPS.decor);assert(layout.cover.length+layout.decor.length<=16,'whole-room prop cap');
 assert(layout.cover.every(c=>Object.isFrozen(c)&&c.solid===true&&[c.x,c.z,c.w,c.d,c.h].every(Number.isFinite)&&c.h<=1.05&&c.w>0&&c.d>0));
 assert(layout.decor.every(d=>Object.isFrozen(d)&&d.solid===false));
 for(let i=0;i<layout.cover.length;i++)for(let j=i+1;j<layout.cover.length;j++){const a=layout.cover[i],b=layout.cover[j],gap=Math.hypot(Math.max(0,Math.abs(a.x-b.x)-(a.w+b.w)/2),Math.max(0,Math.abs(a.z-b.z)-(a.d+b.d)/2));assert(gap>=2,'neighbouring solid props preserve at least a two-unit passage');}
 for(const radius of [.4,.65])cells+=grid(layout,radius);
 if(act===3){
  const protectedPoints=[ACT3_ARENA.start,ACT3_ARENA.exit,...ACT3_ARENA.spawns,...SKYWAY_ROOMS.flatMap(r=>r.enemies.map(([,x,z])=>({x,z}))),...Array.from({length:14},(_,i)=>act3ReinforcementSpawn(i))];
  for(const p of protectedPoints){assert(free(layout,p,.75),`${layout.name}: authored spawn/start/exit remains clear at ${p.x},${p.z}`);protectedChecks++;}
  for(let z=-11.5;z<=11.5;z+=.5)assert(free(layout,{x:0,z},1),'two-unit central passage');
 }
 if(act===4){
  assert.equal(layout.courseLength,[48,56,60,64,44][room]);
  for(let x=0;x<=layout.courseLength;x+=.5){assert(free(layout,{x,z:0},1),'whole-course centre passage at least two units');for(const z of [-8.1,8.1])assert(free(layout,{x,z},.65),'outer dodge lane remains open');}
  for(const p of [{x:0,z:0},{x:layout.courseLength,z:0}]){assert(free(layout,p,1.5),'entry and exit remain open');protectedChecks++;}
 }
 if(act===5){
  const s=createCrystalSiege(room,17),protectedPoints=[s.core,...s.nodes,...s.pads,{x:0,z:5},{x:-3,z:4},{x:-4,z:0},{x:0,z:-5.4},{x:0,z:-7}];
  for(const p of protectedPoints){assert(free(layout,p,1.75),`${layout.name}: existing harvest/build/core/start/exit interaction remains clear`);protectedChecks++;}
  // Sample every lane used by the actual finite packet engine, not only
  // eight convenient centre rays. Straight approaches need no new AI.
  for(let lane=-5.7;lane<=5.7;lane+=.3)for(const entry of [{x:-7.3,z:lane},{x:7.3,z:lane},{x:lane,z:-6.3},{x:lane,z:6.3}])for(let n=0;n<=24;n++){assert(free(layout,{x:entry.x*(1-n/24),z:entry.z*(1-n/24)},.65),'no free indestructible cover may seal the heart');ingressRays++;}
  for(const c of layout.cover)for(const dx of [-c.w/2,c.w/2])for(const dz of [-c.d/2,c.d/2])assert(siegeInside({x:c.x+dx,z:c.z+dz},0),'cover sits on the actual stone courtyard');
 }
 layouts++;
}
for(const act of [3,4,5]){const names=new Set(),positions=new Set();for(let room=0;room<5;room++){const l=journeyRoomLayout(act,room);names.add(l.name);positions.add(JSON.stringify(l.cover.map(c=>[c.x,c.z,c.w,c.d])));}assert.equal(names.size,5);assert.equal(positions.size,5,'different rooms must change real cover, not only colours');}
for(let gate=0;gate<5;gate++){const l=journeyRoomLayout('crosswind',4,gate,{gateRoom:true});assert.equal(l.courseLength,28);references.add(l);}
assert.equal(references.size,CAPS.cache);
for(let i=0;i<10000;i++)assert(references.has(journeyRoomLayout(3+i%3,i,i*7)),'bounded immutable cache');
for(const unknown of ['garden',6,'toString','__proto__',null])assert.equal(journeyRoomLayout(unknown),null);assert.equal(journeyRoomLayout(3,NaN,Infinity),journeyRoomLayout(3,0,0));
const example=journeyRoomLayout(3);assert(journeyLayoutBlocksPoint(example,example.cover[0].x,example.cover[0].z,.65));assert(!journeyLayoutBlocksPoint(example,0,5.5,.65));assert(!journeyLayoutBlocksPoint(null,0,0));
assert.throws(()=>{example.cover[0].x=999;},TypeError);
console.log(JSON.stringify({test:'Journey 3/4/5 static room layouts',layouts,cells,protectedChecks,ingressRays,coverCap:CAPS.cover,decorCap:CAPS.decor,cache:references.size,claim:'pure geometry only; native host/browser integration verified separately'}));
