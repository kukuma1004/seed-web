import * as THREE from 'three';
import {seedFrame} from './seed-body.js';
const atlases=new Map();
function frames(file,directional){
 if(atlases.has(file))return atlases.get(file);
 const maps=[];
 const base=new THREE.TextureLoader().load(import.meta.env.BASE_URL+'assets/'+file,()=>maps.forEach(m=>m.needsUpdate=true));
 base.colorSpace=THREE.SRGBColorSpace;
 for(let i=0;i<(directional?4:1);i++){
  const map=base.clone();map.colorSpace=THREE.SRGBColorSpace;
  if(directional){map.repeat.set(.5,.5);map.offset.set((i%2)*.5,i<2?.5:0);}
  maps.push(map);
 }
 atlases.set(file,maps);return maps;
}
export function attachActorArt(e,camera,release,{file,size,directional=false,order=[0,1,2,3],baseline=.04}){
 const body=e.body||e.motion?.body||e.g;
 for(const child of [...body.children])release(child);
 const maps=frames(file,directional),mat=new THREE.SpriteMaterial({map:maps[0],alphaTest:.08,transparent:true,depthWrite:true,toneMapped:false});
 const sprite=new THREE.Sprite(mat);sprite.center.set(.5,baseline);sprite.scale.set(size,size,1);body.add(sprite);
 const ghostMat=new THREE.SpriteMaterial({map:maps[0],transparent:true,opacity:.34,depthTest:false,depthWrite:false,toneMapped:false,color:0xff7a5c});
 const ghost=new THREE.Sprite(ghostMat);ghost.center.set(.5,baseline);ghost.scale.set(size,size,1);ghost.renderOrder=-1;body.add(ghost);
 e.updateArt=(time)=>{
  const yaw=Math.atan2(camera.position.x-e.g.position.x,camera.position.z-e.g.position.z);
  const frame=seedFrame(e.g.rotation.y,yaw);mat.map=maps[directional?order[frame]:0];ghostMat.map=mat.map;
  mat.rotation=(e.state==='stalk'?Math.sin(time*9+(e.phase||0))*.025:e.state==='commit'?.08:0);
  mat.color.setHex(e.block>0?0xb5efff:e.hit>0?0xffd1aa:(e.tint??0xffffff));ghostMat.rotation=mat.rotation;
 };
 return sprite;
}
