import assert from 'node:assert/strict';
import {DECOR_PROP_ART,DECOR_PROP_COLUMNS,DECOR_PROP_ROWS,DECOR_PROP_CELLS,DECOR_PROPS,DECOR_PROP_BY_ID} from '../src/garden-decor-art.js';
import {DECOR} from '../src/garden-decor.js';

assert.equal(DECOR_PROP_ART,'assets/garden-decor-props-v1.webp');
assert.equal(DECOR_PROP_COLUMNS,4);assert.equal(DECOR_PROP_ROWS,3);assert.equal(DECOR_PROP_CELLS,12);
assert.equal(DECOR_PROPS.length,12);assert.equal(new Set(DECOR_PROPS.map(p=>p.id)).size,12);
assert.deepEqual(DECOR_PROPS.map(p=>p.tile),Array.from({length:12},(_,i)=>i));
for(const p of DECOR_PROPS){assert.equal(DECOR_PROP_BY_ID[p.id],p);assert.ok(p.name&&p.footprint[0]>0&&p.footprint[1]>0);assert.ok(Object.isFrozen(p.footprint));}
const props=DECOR.flatMap(d=>d.items.filter(i=>i.kind==='prop').map(i=>({...i,task:d.id})));
assert.equal(props.length,12);assert.equal(new Set(props.map(p=>p.tile)).size,12,'each of the twelve distinct prop pictures has a garden task');
const beds=[[621/1600,331/900],[1003/1600,325/900],[526/1600,488/900],[1076/1600,486/900],[652/1600,618/900],[952/1600,618/900],[.5,453/900]];
for(const item of props){const [width,height]=DECOR_PROPS[item.tile].footprint,w=width*item.size,h=height*item.size;
 assert.equal(item.tint,0xffffff,'prop pictures retain their authored palette');
 assert.ok(item.u-w/2>.1&&item.u+w/2<.9&&item.v-h>.04&&item.v<.99,`${item.task} stays inside the painted garden crop`);
 for(const [u,v] of beds){const dx=Math.max(Math.abs(item.u-u)-w/2,0),dy=Math.max(item.v-h-v,v-item.v,0);
  assert.ok(Math.hypot(dx*16/9,dy)>.055,`${item.task} footprint leaves interactive bed clear`);}
}
console.log('garden decor art metadata and twelve bed-safe props ok');
