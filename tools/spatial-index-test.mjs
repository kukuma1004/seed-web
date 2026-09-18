import assert from 'node:assert/strict';
import {createSpatialIndex} from '../src/spatial-index.js';

const at=(x,z,id)=>({id,g:{position:{x,z}}}),items=[at(-3,-3,'a'),at(.2,.1,'b'),at(1.8,.2,'c'),at(7,7,'d')];
const index=createSpatialIndex(2.5),out=[];index.rebuild(items);
assert.deepEqual(index.queryInto({x:0,z:0},1,out).map(x=>x.id),['b']);
assert.deepEqual(index.queryInto({x:1,z:0},2,out).map(x=>x.id),['b','c']);
assert.equal(index.state().items,4);assert.ok(index.state().cells>=3);
items[3].g.position={x:.4,z:.3};index.rebuild(items);
assert.deepEqual(index.queryInto({x:0,z:0},1,out).map(x=>x.id),['b','d']);
index.clear();assert.equal(index.state().items,0);
console.log('Spatial index: nearby combat queries, stable enemy order, rebuild and clear passed.');
