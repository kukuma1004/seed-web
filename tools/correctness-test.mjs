import assert from 'node:assert/strict';
import * as THREE from 'three';
import {coverBricks,segmentHitsCover} from '../src/collision.js';
import {disposeObject} from '../src/resources.js';
const covers=[{x:-3,z:1,w:2,h:1.7,d:1.2},{x:5.8,z:4,w:2.4,h:1.45,d:.9}];
assert.equal(segmentHitsCover({x:-3,z:-2},{x:-3,z:3},covers,.13),true,'A bolt crossing cover must stop');
assert.equal(segmentHitsCover({x:0,z:-2},{x:0,z:3},covers,.13),false,'Open firing lanes must stay open');
assert.equal(segmentHitsCover({x:-4.12,z:0},{x:-4.12,z:2},covers,.13),true,'Bolt radius must graze the edge');
assert.equal(segmentHitsCover({x:-4.2,z:0},{x:-4.2,z:2},covers,.13),false,'A near miss must pass');
assert.equal(segmentHitsCover({x:-3,z:1},{x:-3,z:1},covers),true,'Spawning inside cover is blocked');
for(const o of covers) {
  const bricks=coverBricks(o),near=Math.min(...bricks.map(b=>b.x-b.w/2)),far=Math.max(...bricks.map(b=>b.x+b.w/2));
  assert.ok(Math.abs(near-(o.x-o.w/2))<.02&&Math.abs(far-(o.x+o.w/2))<.02,'Visible stones must meet collider bounds');
  assert.ok(bricks.every(b=>b.z===o.z&&b.d===o.d),'Visible wall depth and centre must match collision');
}
const scene=new THREE.Scene(),group=new THREE.Group(),shared=new THREE.MeshBasicMaterial(),local=new THREE.LineBasicMaterial();
const geometry=new THREE.BoxGeometry();let geoDisposals=0,localDisposals=0,sharedDisposals=0;
geometry.addEventListener('dispose',()=>geoDisposals++);local.addEventListener('dispose',()=>localDisposals++);shared.addEventListener('dispose',()=>sharedDisposals++);
group.add(new THREE.Mesh(geometry,shared),new THREE.Line(geometry,local));scene.add(group);
disposeObject(group,new Set([shared]));
assert.equal(group.parent,null);assert.equal(geoDisposals,1);assert.equal(localDisposals,1);assert.equal(sharedDisposals,0);
console.log('Cover blocking, visual bounds, and shared-safe transient disposal passed.');
