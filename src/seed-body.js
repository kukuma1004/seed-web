import * as THREE from 'three';

// Artwork only: keep movement, collision and evolution reach unchanged.
const BODY_SIZE=1.26;

// The atlas is painted from front, right, back, left; direction is camera-relative.
export function seedFrame(facing,cameraYaw){
 const angle=Math.atan2(Math.sin(facing-cameraYaw),Math.cos(facing-cameraYaw));
 if(Math.abs(angle)<=Math.PI/4)return 0;
 if(Math.abs(angle)>=Math.PI*3/4)return 2;
 return angle>0?1:3;
}
export function createSeedBody(scene){
 const root=new THREE.Group();scene.add(root);
 const texture=new THREE.TextureLoader().load(import.meta.env.BASE_URL+'assets/seed-body-directions-v4.png');
 texture.colorSpace=THREE.SRGBColorSpace;texture.repeat.set(.5,.5);texture.offset.set(0,.5);
 const material=new THREE.SpriteMaterial({map:texture,transparent:true,alphaTest:.08,depthWrite:true,toneMapped:false});
 const sprite=new THREE.Sprite(material);sprite.center.set(.5,.055);sprite.scale.set(BODY_SIZE,BODY_SIZE,1);root.add(sprite);
 // A faint copy draws through walls so the seed is never lost behind cover.
 const ghostMaterial=new THREE.SpriteMaterial({map:texture,alphaTest:.08,transparent:true,opacity:.38,depthTest:true,depthFunc:THREE.GreaterDepth,depthWrite:false,toneMapped:false,color:0x9ff5d2});
 const ghost=new THREE.Sprite(ghostMaterial);ghost.center.set(.5,.055);ghost.scale.set(BODY_SIZE,BODY_SIZE,1);ghost.renderOrder=2;root.add(ghost);
 // Preserve the visual rig interface used by evolution and combat.
 root.userData={legs:[],heart:new THREE.Object3D(),halo:new THREE.Object3D(),artFrame:0};
 let facing=0;
 root.userData.updateArt=(camera,dx=0,dz=0)=>{
  if(Math.hypot(dx,dz)>.001)facing=Math.atan2(dx,dz);
  const frame=seedFrame(facing,Math.atan2(camera.position.x-root.position.x,camera.position.z-root.position.z));
  texture.offset.set((frame%2)*.5,frame<2?.5:0);root.userData.artFrame=frame;
  const {phase=0,pace=0}=root.userData.motion||{};
  material.rotation=Math.sin(phase)*pace*.045;
  sprite.scale.set(BODY_SIZE*(1+Math.sin(phase*2)*pace*.025),BODY_SIZE,1);ghost.scale.copy(sprite.scale);ghostMaterial.rotation=material.rotation;
 };
 return root;
}
