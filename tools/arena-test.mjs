import assert from 'node:assert/strict';
import * as THREE from 'three';
import {arenaFor,insideArena,constrainToArena,reflectArenaBoundary,safeArenaSpawn,buildArenaBoundary} from '../src/arena.js';

const circle=arenaFor(2),rect=arenaFor(0),near=(a,b)=>assert.ok(Math.abs(a-b)<1e-4,`${a} ≈ ${b}`);
assert.equal(circle.shape,'circle');
// Journey 13 (cycle 12) puts the star in room 2; the other square rooms stay square.
for(const stage of [0,3,4])assert.equal(arenaFor(stage,12,'ruins').shape,'rect');
assert.equal(arenaFor(1,12,'ruins').id,'star');assert.equal(arenaFor(2,0).shape,'circle');assert.equal(arenaFor(2,13).id,'star');
for(let i=0;i<360;i++) {
  const a=i*Math.PI/180,n={x:Math.cos(a),z:Math.sin(a)},p={x:n.x*20,y:2,z:n.z*20};
  constrainToArena(p,.4,circle);near(Math.hypot(p.x,p.z),7.2);assert.equal(p.y,2);assert.ok(insideArena(p,.4,circle));
  // Repeated outward/tangential movement slides on the rim and never exits it.
  p.x+=-n.z*.1+n.x*.05;p.z+=n.x*.1+n.z*.05;constrainToArena(p,.4,circle);assert.ok(insideArena(p,.4,circle));
  const previous={x:n.x*7,z:n.z*7},next={x:n.x*8.2,y:3,z:n.z*8.2},dir={...n};
  assert.equal(reflectArenaBoundary(previous,next,dir,circle),true);near(dir.x,-n.x);near(dir.z,-n.z);near(Math.hypot(next.x,next.z),7);assert.equal(next.y,3);
  const spawn=safeArenaSpawn(p,[],i,circle);assert.ok(spawn&&insideArena(spawn,.7,circle));assert.ok(Math.hypot(spawn.x-p.x,spawn.z-p.z)>4);
}
// Oblique ray reflects in the surface normal and retains direction magnitude.
const oblique={x:8,z:4},direction={x:1,z:0};
assert.equal(reflectArenaBoundary({x:5,z:4},oblique,direction,circle),true);
assert.ok(insideArena(oblique,0,circle));near(Math.hypot(direction.x,direction.z),1);assert.ok(direction.z<0);
const quiet={x:1,z:1},quietDir={x:1,z:0};assert.equal(reflectArenaBoundary({x:0,z:0},quiet,quietDir,circle),false);assert.deepEqual(quietDir,{x:1,z:0});
const corner={x:11,z:9},cornerDir={x:1,z:1};assert.equal(reflectArenaBoundary({x:9,z:7},corner,cornerDir,rect),true);near(corner.x,9);near(corner.z,7);assert.deepEqual(cornerDir,{x:-1,z:-1});
const edge={x:10.4,z:2},edgeDir={x:1,z:0};reflectArenaBoundary({x:9.8,z:2},edge,edgeDir,rect);near(edge.x,9.6);near(edge.z,2);assert.equal(edgeDir.x,-1);
const limited={x:14,z:-12};constrainToArena(limited,.4,rect);assert.deepEqual(limited,{x:9.6,z:-7.6});
const covers=[{x:-3.1,z:-2,w:1.3,d:1.3},{x:3.1,z:-2,w:1.3,d:1.3},{x:-3.1,z:2,w:1.3,d:1.3},{x:3.1,z:2,w:1.3,d:1.3}];
for(const arena of [circle,rect])for(let i=0;i<64;i++) {
  const spawn=safeArenaSpawn({x:0,z:6},covers,i,arena);assert.ok(spawn&&insideArena(spawn,.7,arena));
  assert.ok(!covers.some(c=>Math.abs(spawn.x-c.x)<c.w/2+.7&&Math.abs(spawn.z-c.z)<c.d/2+.7));
}
assert.equal(safeArenaSpawn({x:0,z:0},[{x:0,z:0,w:100,d:100}],0,circle),null);
// GPU work remains bounded; no WebGL context needed to validate geometry.
const group=new THREE.Group(),mats={stone:new THREE.MeshBasicMaterial(),dark:new THREE.MeshBasicMaterial(),armor:new THREE.MeshBasicMaterial()};
buildArenaBoundary(group,circle,mats);assert.equal(group.children.length,4);assert.equal(group.children.at(-1).count,12);
const rim=group.children[2],positions=rim.geometry.attributes.position;
let minimumRadius=Infinity;for(let i=0;i<positions.count;i++)minimumRadius=Math.min(minimumRadius,Math.hypot(positions.getX(i),positions.getY(i)));
near(minimumRadius,circle.radius);
const square=new THREE.Group();buildArenaBoundary(square,rect,mats);assert.equal(square.children.length,0);
console.log('Arena: circular movement/sliding, swept ricochets, safe spawns, unchanged rectangle and four-draw-call rim passed.');
