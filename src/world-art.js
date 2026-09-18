import * as THREE from 'three';
import {RoundedBoxGeometry} from 'three/addons/geometries/RoundedBoxGeometry.js';
import {mergeGeometries} from 'three/addons/utils/BufferGeometryUtils.js';
import {coverBricks} from './collision.js';

// Visual cover keeps the existing footprint and lowered height. Merge by material
// so carved edges replace the wire boxes without adding a draw call per brick.
export function buildCoverArt(parent,covers,mats){
 const stone=[],caps=[];
 for(const o of covers){
  const h=o.h*.62;
  for(const b of coverBricks({...o,h})){
   const g=new RoundedBoxGeometry(b.w,b.h,b.d,1,.045);
   g.translate(b.x,b.y,b.z);stone.push(g);
  }
  const cap=new RoundedBoxGeometry(o.w+.04,.13,o.d+.04,1,.04);
  cap.translate(o.x,h-.025,o.z);caps.push(cap);
 }
 for(const [parts,material] of [[stone,mats.cover],[caps,mats.armor]]){
  if(!parts.length)continue;
  const geometry=mergeGeometries(parts);parts.forEach(g=>g.dispose());
  const mesh=new THREE.Mesh(geometry,material);mesh.castShadow=mesh.receiveShadow=true;parent.add(mesh);
 }
}

const ATLAS_QUADS={fence:[0,.5,.5,.5],dugout:[.5,.5,.5,.5],crate:[0,0,.5,.5],rail:[.5,0,.5,.5]};
function atlasUV(geometry,id){const uv=geometry.attributes.uv,q=ATLAS_QUADS[id]||ATLAS_QUADS.crate;for(let i=0;i<uv.count;i++)uv.setXY(i,q[0]+uv.getX(i)*q[2],q[1]+uv.getY(i)*q[3]);uv.needsUpdate=true;return geometry;}

// Act 2 uses one atlas and one material for both the crate body and its rail cap,
// so richer cover costs fewer draw calls than the old two-material stone version.
export function buildStadiumCoverArt(parent,covers,material){
 const parts=[];
 for(const o of covers){
  const h=o.h*.62;
  for(const b of coverBricks({...o,h})){const g=atlasUV(new RoundedBoxGeometry(b.w,b.h,b.d,1,.045),'crate');g.translate(b.x,b.y,b.z);parts.push(g);}
  const cap=atlasUV(new RoundedBoxGeometry(o.w+.04,.13,o.d+.04,1,.04),'rail');cap.translate(o.x,h-.025,o.z);parts.push(cap);
 }
 if(!parts.length)return;const geometry=mergeGeometries(parts);parts.forEach(g=>g.dispose());const mesh=new THREE.Mesh(geometry,material);mesh.castShadow=mesh.receiveShadow=true;parent.add(mesh);
}
