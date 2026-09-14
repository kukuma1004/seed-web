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
