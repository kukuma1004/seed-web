import * as THREE from 'three';
import {mergeGeometries} from 'three/addons/utils/BufferGeometryUtils.js';

const alongZ=geometry=>geometry.rotateX(Math.PI/2);
const merge=(name,parts)=>{
 const geometries=parts.map((g,partIndex)=>{
  const geometry=g.index?g.toNonIndexed():g;if(geometry!==g)g.dispose();
  const position=geometry.getAttribute('position'),colors=new Float32Array(position.count*3);
  const base=[.7,1.15,.9,1.35][partIndex%4];
  for(let i=0;i<position.count;i++){
   const tip=Math.max(0,Math.min(1,(position.getZ(i)+.4)/.8)),brightness=base*(.78+tip*.34);
   colors[i*3]=brightness;colors[i*3+1]=brightness*(.94+tip*.06);colors[i*3+2]=brightness*(.82+tip*.18);
  }
  geometry.setAttribute('color',new THREE.BufferAttribute(colors,3));return geometry;
 });
 const out=mergeGeometries(geometries,false);out.name=`seed-shot-${name}`;out.computeVertexNormals();out.computeBoundingSphere();
 for(const g of geometries)g.dispose();return out;
};
const cone=(radius,length,sides=5)=>alongZ(new THREE.ConeGeometry(radius,length,sides,1,false));
const crystal=(x=.12,y=.12,z=.3)=>new THREE.OctahedronGeometry(1,0).scale(x,y,z);
const fin=(angle,length=.34,width=.09)=>cone(width,length,4).rotateZ(angle).translate(Math.sin(angle)*.07,Math.cos(angle)*.07,-.12);

// Each projectile is still one mesh and one draw call. The extra detail lives in
// a merged low-poly silhouette instead of adding child meshes or dynamic lights.
export function createProjectileGeometries(){
 const geos={
  seed:merge('seed',[crystal(.11,.1,.27),fin(.8,.25,.065),fin(-.8,.25,.065)]),
  split:merge('split',[crystal(.12,.12,.22),fin(0,.32,.075),fin(Math.PI*.66,.32,.075),fin(-Math.PI*.66,.32,.075)]),
  pierce:merge('pierce',[cone(.105,.62,5).translate(0,0,.12),crystal(.08,.08,.16).translate(0,0,-.22)]),
  burst:merge('burst',[cone(.15,.48,6).translate(0,0,.08),fin(.9,.3,.09),fin(-.9,.3,.09),crystal(.07,.07,.18).translate(0,0,-.22)]),
  recall:merge('recall',[cone(.075,.5,4).translate(.08,0,.06),cone(.075,.5,4).rotateZ(Math.PI).translate(-.08,0,.06),crystal(.08,.06,.16)]),
  gravity:merge('gravity',[crystal(.15,.15,.24),new THREE.TorusGeometry(.21,.025,4,12).rotateX(Math.PI/2)]),
  frost:merge('frost',[crystal(.12,.1,.34),cone(.06,.25,4).rotateZ(Math.PI/2).translate(.12,0,-.08),cone(.06,.25,4).rotateZ(-Math.PI/2).translate(-.12,0,-.08)]),
  chain:merge('chain',[cone(.08,.28,4).rotateZ(.45).translate(-.07,0,.14),cone(.08,.28,4).rotateZ(-.45).translate(.07,0,-.08),cone(.07,.25,4).rotateZ(.45).translate(-.06,0,-.28)]),
  reflect:merge('reflect',[crystal(.15,.07,.3),fin(Math.PI/2,.25,.065),fin(-Math.PI/2,.25,.065)]),
  orbit:merge('orbit',[new THREE.TorusGeometry(.16,.035,4,12).rotateX(Math.PI/2),crystal(.07,.07,.23)]),
  portal:merge('portal',[new THREE.TorusGeometry(.18,.035,5,12).rotateX(Math.PI/2),cone(.075,.42,5),cone(.055,.28,4).rotateZ(Math.PI).translate(0,0,-.2)])
 };
 return Object.freeze(geos);
}

export function projectileGeometry(geometries,id){return geometries[id]||geometries.seed;}
