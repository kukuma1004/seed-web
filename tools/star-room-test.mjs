import assert from 'node:assert/strict';
import * as THREE from 'three';
import {STAR_STAGES,starStage,isStarRoom} from '../src/room-rotation.js';
import {arenaFor,insideArena,constrainToArena,reflectArenaBoundary,safeArenaSpawn,buildArenaBoundary,distanceToArenaEdge} from '../src/arena.js';
import {ROOMS,STAR_ROOM,roomFor,canUseExit} from '../src/journey.js';
import {trapsFor,STAR_TRAPS,insideTrap,TRAP_SIZE} from '../src/traps.js';
import {turretSpots,STAR_TURRETS} from '../src/turret.js';
import {segmentHitsCover} from '../src/collision.js';

// Rotation: journey 1 has the star in room 2, journey 2 in room 3, then it alternates. Rooms 1, 4 (elite warden) and 5 are never replaced.
assert.deepEqual([...STAR_STAGES],[1,2]);
for(let cycle=0;cycle<8;cycle++){
 const stars=ROOMS.map((_,stage)=>isStarRoom(stage,cycle));
 assert.equal(stars.filter(Boolean).length,1,`one star per journey ${cycle}`);
 assert.equal(starStage(cycle),cycle%2?2:1);
 for(const stage of ROOMS.keys()){
  const star=isStarRoom(stage,cycle);
  assert.equal(arenaFor(stage,cycle).id==='star',star);
  assert.equal(roomFor(stage,cycle),star?STAR_ROOM:ROOMS[stage]);
 }
}
for(const stage of [0,3,4])for(let cycle=0;cycle<4;cycle++)assert.equal(isStarRoom(stage,cycle),false);

const star=arenaFor(1,0),{start,exit}=star;
assert.equal(star.shape,'poly');assert.equal(star.points.length,10);
// Roomier than the circle room (radius 7.2): shoelace area of the star polygon.
{let area=0;star.points.forEach(([x,z],i)=>{const [x2,z2]=star.points[(i+1)%10];area+=x*z2-x2*z;});assert.ok(Math.abs(area)/2>Math.PI*7.2*7.2*1.15,`star area ${Math.abs(area)/2}`);}

// Placement: start, exit, first enemies, elite, cover, traps and turrets all fit inside the star with room to move.
assert.ok(insideArena(start,1,star)&&insideArena(exit,1,star));
assert.ok(Math.hypot(start.x-exit.x,start.z-exit.z)>7,'the exit is across the room');
const covers=STAR_ROOM.covers;
for(const c of covers)assert.ok(distanceToArenaEdge(c,star)>Math.hypot(c.w,c.d)/2+.8,'cover leaves a lane to the wall');
for(const [type,x,z] of [...STAR_ROOM.enemies,['shield',STAR_ROOM.shield.x,STAR_ROOM.shield.z],['start',start.x,start.z],['exit',exit.x,exit.z]]){
 assert.ok(insideArena({x,z},.7,star),`${type} inside the star`);
 assert.equal(segmentHitsCover({x,z},{x,z},covers,type==='elite'?1:.65),false,`${type} clear of cover`);
}
assert.ok(Math.hypot(STAR_ROOM.shield.x-start.x,STAR_ROOM.shield.z-start.z)>3,'shield stands ahead of the seed');
for(const [type,x,z] of STAR_ROOM.enemies)assert.ok(Math.hypot(x-start.x,z-start.z)>5,`${type} does not start on the seed`);
assert.equal(trapsFor(1,0).length,STAR_TRAPS.length);assert.equal(trapsFor(2,1).length,STAR_TRAPS.length);
for(const trap of STAR_TRAPS){
 assert.ok(insideArena(trap,TRAP_SIZE/2+.2,star));
 assert.equal(segmentHitsCover(trap,trap,covers,TRAP_SIZE/2),false);
 assert.equal(insideTrap(trap,start,.6),false);assert.equal(insideTrap(trap,exit,exit.radius),false);
}
assert.equal(turretSpots(1,0).length,STAR_TURRETS.base.length);assert.equal(turretSpots(2,1).length,STAR_TURRETS.base.length+STAR_TURRETS.extra.length);
for(const spot of [...STAR_TURRETS.base,...STAR_TURRETS.extra]){
 assert.ok(insideArena(spot,.8,star));assert.equal(segmentHitsCover(spot,spot,covers,.8),false);
 assert.ok(Math.hypot(spot.x-start.x,spot.z-start.z)>4.5);assert.ok(Math.hypot(spot.x-exit.x,spot.z-exit.z)>exit.radius+.8);
 for(const [,x,z] of STAR_ROOM.enemies)assert.ok(Math.hypot(spot.x-x,spot.z-z)>1.5,'turret does not stand on a starting enemy');
}

// The exit is the star room's own gate: standing on it works there, standing on the square rooms' gate does not.
assert.equal(canUseExit({open:true,mode:'playing',paused:false,x:exit.x,z:exit.z,exit}),true);
assert.equal(canUseExit({open:true,mode:'playing',paused:false,x:0,z:-8.2,exit}),false);
assert.equal(canUseExit({open:true,mode:'playing',paused:false,x:0,z:-6.6}),true,'square rooms keep the old gate');

// Walking: a straight line from the start reaches the exit without leaving the star or crossing cover.
for(let t=0;t<=1;t+=.02){const p={x:start.x+(exit.x-start.x)*t,z:start.z+(exit.z-start.z)*t};assert.ok(insideArena(p,.6,star));}
assert.equal(segmentHitsCover(start,exit,covers,.6),false);

// Pushing: any point, however far out, is pulled back inside with the seed's margin.
let seed=11;const rand=()=>(seed=(seed*1664525+1013904223)>>>0)/4294967296;
for(let i=0;i<4000;i++){const p={x:(rand()-.5)*30,y:1,z:(rand()-.5)*30};constrainToArena(p,.45,star);assert.ok(insideArena(p,.44,star),JSON.stringify(p));assert.equal(p.y,1);}

// Ricochets: bolts bounced around the star for a long time never escape and keep their speed.
let escapes=0,skew=0;
for(let b=0;b<240;b++){
 const a=rand()*Math.PI*2,pos={x:(rand()-.5)*2,z:(rand()-.5)*2},dir={x:Math.cos(a),z:Math.sin(a)};
 for(let step=0;step<800;step++){
  const prev={...pos};pos.x+=dir.x*.37;pos.z+=dir.z*.37;
  reflectArenaBoundary(prev,pos,dir,star);
  if(!insideArena(pos,-1e-3,star))escapes++;
  if(Math.abs(Math.hypot(dir.x,dir.z)-1)>1e-6)skew++;
 }
}
assert.equal(escapes,0,'no bolt leaves the star');assert.equal(skew,0,'bounces keep direction length');
const straight={x:0,z:0},straightDir={x:1,z:0};assert.equal(reflectArenaBoundary({x:-.3,z:0},straight,straightDir,star),false);

// Enemies pour out of the tips, away from the seed, never inside cover.
for(let i=0;i<40;i++){
 const p=safeArenaSpawn(start,covers,i,star);assert.ok(p&&insideArena(p,.7,star));
 assert.ok(Math.hypot(p.x-start.x,p.z-start.z)>4);assert.ok(!covers.some(c=>Math.abs(p.x-c.x)<c.w/2+.7&&Math.abs(p.z-c.z)<c.d/2+.7));
}

// Drawn in code with four draw calls, no image files: floor, inner band, walls and corner studs.
const group=new THREE.Group(),mats={stone:new THREE.MeshBasicMaterial(),dark:new THREE.MeshBasicMaterial(),armor:new THREE.MeshBasicMaterial()};
buildArenaBoundary(group,star,mats);assert.equal(group.children.length,4);assert.equal(group.children.at(-1).count,star.points.length);
for(const child of group.children){const pos=child.geometry.attributes.position;for(let i=0;i<pos.count;i++)assert.ok(Number.isFinite(pos.getX(i))&&Number.isFinite(pos.getY(i))&&Number.isFinite(pos.getZ(i)));}
console.log('Star room: journey rotation, placements inside the star, own exit, walkable route, pull-back, ricochet stress, tip spawns and code-drawn boundary passed.');
