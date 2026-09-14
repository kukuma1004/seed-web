import * as THREE from 'three';

// Artwork only: keep movement, collision and evolution reach unchanged.
export const SEED_BODY_ART='seed-body-directions-v5.png';
export const SEED_SOLO_BODY_ART='seed-solo-bodies-v1.png';
export const BODY_SIZE=1.18;
export const EVOLUTION_SIZE=1.22;
export const SOLO_BODY_TILES=Object.freeze({mirrormaze:0,fullbloom:1,thunderweb:2,starring:3,glassspear:4,flarebloom:5,rewind:6,blackhole:7,winterbreath:8});

export function dominantSoloForm(forms){
 const entries=forms instanceof Map?[...forms]:Object.entries(forms||{});
 return entries.filter(([id])=>Object.hasOwn(SOLO_BODY_TILES,id)).sort((a,b)=>Number(b[1])-Number(a[1])||SOLO_BODY_TILES[a[0]]-SOLO_BODY_TILES[b[0]])[0]?.[0]||null;
}

// The atlas is painted from front, right, back, left; direction is camera-relative.
export function seedFrame(facing,cameraYaw){
 const angle=Math.atan2(Math.sin(facing-cameraYaw),Math.cos(facing-cameraYaw));
 if(Math.abs(angle)<=Math.PI/4)return 0;
 if(Math.abs(angle)>=Math.PI*3/4)return 2;
 return angle>0?1:3;
}
export function createSeedBody(scene){
 const root=new THREE.Group();scene.add(root);
 const texture=new THREE.TextureLoader().load(import.meta.env.BASE_URL+'assets/'+SEED_BODY_ART);
 texture.colorSpace=THREE.SRGBColorSpace;texture.repeat.set(.5,.5);texture.offset.set(0,.5);
 const material=new THREE.SpriteMaterial({map:texture,transparent:true,alphaTest:.08,depthWrite:true,toneMapped:false});
 const sprite=new THREE.Sprite(material);sprite.center.set(.5,.055);sprite.scale.set(BODY_SIZE,BODY_SIZE,1);root.add(sprite);
 // A faint copy draws through walls so the seed is never lost behind cover.
 const ghostMaterial=new THREE.SpriteMaterial({map:texture,alphaTest:.08,transparent:true,opacity:.38,depthTest:true,depthFunc:THREE.GreaterDepth,depthWrite:false,toneMapped:false,color:0x9ff5d2});
 const ghost=new THREE.Sprite(ghostMaterial);ghost.center.set(.5,.055);ghost.scale.set(BODY_SIZE,BODY_SIZE,1);ghost.renderOrder=2;root.add(ghost);
 let evolvedReady=false,currentEvolution=null,applyEvolution=()=>{};
 const evolutionTexture=new THREE.TextureLoader().load(import.meta.env.BASE_URL+'assets/'+SEED_SOLO_BODY_ART,()=>{evolvedReady=true;applyEvolution();});
 evolutionTexture.colorSpace=THREE.SRGBColorSpace;evolutionTexture.repeat.set(.25,1/3);
 const evolutionMaterial=new THREE.SpriteMaterial({map:evolutionTexture,transparent:true,alphaTest:.08,depthWrite:true,toneMapped:false});
 const evolutionSprite=new THREE.Sprite(evolutionMaterial);evolutionSprite.center.set(.5,.055);evolutionSprite.scale.set(EVOLUTION_SIZE,EVOLUTION_SIZE,1);evolutionSprite.visible=false;root.add(evolutionSprite);
 const evolutionGhostMaterial=new THREE.SpriteMaterial({map:evolutionTexture,alphaTest:.08,transparent:true,opacity:.34,depthTest:true,depthFunc:THREE.GreaterDepth,depthWrite:false,toneMapped:false,color:0xcfffe9});
 const evolutionGhost=new THREE.Sprite(evolutionGhostMaterial);evolutionGhost.center.set(.5,.055);evolutionGhost.scale.copy(evolutionSprite.scale);evolutionGhost.renderOrder=2;evolutionGhost.visible=false;root.add(evolutionGhost);
 applyEvolution=()=>{
  const active=currentEvolution&&evolvedReady;
  if(currentEvolution){const tile=SOLO_BODY_TILES[currentEvolution];evolutionTexture.offset.set((tile%4)/4,1-(Math.floor(tile/4)+1)/3);}
  sprite.visible=ghost.visible=!active;evolutionSprite.visible=evolutionGhost.visible=Boolean(active);
 };
 // Preserve the visual rig interface used by evolution and combat.
 root.userData={legs:[],heart:new THREE.Object3D(),halo:new THREE.Object3D(),artFrame:0,evolutionArt:null};
 root.userData.setEvolution=forms=>{currentEvolution=dominantSoloForm(forms);root.userData.evolutionArt=currentEvolution;applyEvolution();return currentEvolution;};
 let facing=0;
 root.userData.updateArt=(camera,dx=0,dz=0)=>{
  if(Math.hypot(dx,dz)>.001)facing=Math.atan2(dx,dz);
  const frame=seedFrame(facing,Math.atan2(camera.position.x-root.position.x,camera.position.z-root.position.z));
  texture.offset.set((frame%2)*.5,frame<2?.5:0);root.userData.artFrame=frame;
  const {phase=0,pace=0}=root.userData.motion||{};
  const step=Math.sin(phase*2)*pace;
  material.rotation=evolutionMaterial.rotation=Math.sin(phase)*pace*.055;
  sprite.position.y=Math.max(0,step)*.018;
  sprite.scale.set(BODY_SIZE*(1+step*.03),BODY_SIZE*(1-step*.018),1);ghost.position.y=sprite.position.y;ghost.scale.copy(sprite.scale);ghostMaterial.rotation=material.rotation;
  evolutionSprite.position.y=sprite.position.y;evolutionSprite.scale.set(EVOLUTION_SIZE*(1+step*.03),EVOLUTION_SIZE*(1-step*.018),1);evolutionGhost.position.y=sprite.position.y;evolutionGhost.scale.copy(evolutionSprite.scale);evolutionGhostMaterial.rotation=evolutionMaterial.rotation;
 };
 return root;
}
