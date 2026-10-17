import * as THREE from 'three';

// One reusable warned footprint and three short fan rays. No particles, extra
// lights, timers or combat decisions: the original Arbor engine owns the cue.
export function createSurvivalArborCue(scene){
 const root=new THREE.Group();root.name='survival-arbor-warning';root.visible=false;scene.add(root);
 const material=new THREE.MeshBasicMaterial({color:0xffcf79,transparent:true,opacity:.78,depthWrite:false,toneMapped:false,side:THREE.DoubleSide});
 const ringGeometry=new THREE.RingGeometry(.87,1,40),rayGeometry=new THREE.PlaneGeometry(.09,1);
 const ring=new THREE.Mesh(ringGeometry,material);ring.rotation.x=-Math.PI/2;root.add(ring);
 const rays=Array.from({length:3},()=>{const ray=new THREE.Mesh(rayGeometry,material);ray.rotation.x=-Math.PI/2;root.add(ray);return ray;});
 function hide(){root.visible=false;}
 function update(cue){
  root.visible=Boolean(cue&&cue.kind!=='core-open');if(!root.visible)return;
  ring.visible=cue.kind==='root';root.position.set(cue.position.x,.065,cue.position.z);
  const radius=Math.max(.5,cue.radius||1.5);ring.scale.setScalar(radius);
  for(let i=0;i<rays.length;i++){
   const ray=rays[i];ray.visible=cue.kind==='fan';if(!ray.visible)continue;
   const angle=Math.atan2(cue.direction.x,cue.direction.z)+(i-1)*.4,length=6;
   ray.rotation.set(-Math.PI/2,0,-angle);ray.scale.set(1,length,1);ray.position.set(Math.sin(angle)*length/2,.005,Math.cos(angle)*length/2);
  }
 }
 return {update,hide,dispose(){root.removeFromParent();material.dispose();ringGeometry.dispose();rayGeometry.dispose();},diagnostics:()=>({draws:root.visible?ring.visible?1:3:0,geometries:2,materials:1,textures:0,lights:0,raf:0})};
}
