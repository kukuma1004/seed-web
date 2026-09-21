import assert from 'node:assert/strict';
import fs from 'node:fs';
import {FLOOR_ATLAS_FILE,floorSlabVariant,floorSlabUV} from '../src/floor-art.js';

// Higgsfield 1막 바닥(2026-09-22): 판석 4종 2×2 아틀라스, 판석마다 격자 위치로 칸·뒤집기를 고른다.
for(const [dir,limit] of [['assets/',96*1024],['assets/mobile/',48*1024]]){
  const file=new URL(`../public/${dir}${FLOOR_ATLAS_FILE}`,import.meta.url),head=fs.readFileSync(file).subarray(0,12);
  assert.equal(head.toString('ascii',0,4),'RIFF');assert.equal(head.toString('ascii',8,12),'WEBP');
  assert.ok(fs.statSync(file).size<limit,`${dir} floor atlas stays small`);
}
const cells=[0,0,0,0];let flips=0;
for(let x=-10.5;x<11;x+=1.5)for(let z=-8.5;z<9;z+=1.5){
  const v=floorSlabVariant(x,z);assert.deepEqual(v,floorSlabVariant(x,z),'same room, same floor');
  cells[v.cell]++;flips+=v.flipU+v.flipV;
  const lo=[(v.cell%2)*.5,Math.floor(v.cell/2)*.5];
  for(const [u,w] of [[0,0],[1,0],[0,1],[1,1],[.5,.5]]){
    const [a,b]=floorSlabUV(v,u,w);
    assert.ok(a>lo[0]&&a<lo[0]+.5&&b>lo[1]&&b<lo[1]+.5,'a slab never samples a neighbouring cell');
  }
}
assert.ok(cells.every(n=>n>=30),`all four slabs appear across the terrace: ${cells}`);
assert.ok(flips>60,'flips break up repetition');
assert.deepEqual(floorSlabUV({cell:3,flipU:true,flipV:false},0,0,0),[1,.5],'flipping mirrors inside the cell');
console.log('1막 바닥: 판석 4종 고른 분포·같은 방 같은 바닥·칸 밖 샘플 없음·아틀라스 크기 통과');
