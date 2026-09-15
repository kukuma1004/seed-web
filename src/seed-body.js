import * as THREE from 'three';
import {rankedEvolutions} from './evolution-rank.js';
import {applySpriteLighting} from './sprite-lighting.js';

// Artwork only: keep movement, collision and evolution reach unchanged.
export const SEED_BODY_ART='seed-body-directions-v6.png';
export const SEED_SOLO_BODY_ART='seed-solo-bodies-v2.png';
export const SEED_FUSION_BODY_ART='seed-fusion-bodies-v1.png';
export const BODY_SIZE=1.18;
export const EVOLUTION_SIZE=1.22;
export const SOLO_BODY_TILES=Object.freeze({mirrormaze:0,fullbloom:1,thunderweb:2,starring:3,glassspear:4,flarebloom:5,rewind:6,blackhole:7,winterbreath:8});
export const FUSION_BODY_TILES=Object.freeze({collapse:0,frostguard:1,returnblade:2,prism:3,thunderlance:4,frostbloom:5,stormcrown:6,tidepull:7,seedstorm:8,mirrorguard:9});
const ALL_BODY_TILES=Object.freeze({...FUSION_BODY_TILES,...SOLO_BODY_TILES});
const EVOLUTION_COLORS=Object.freeze({collapse:0xa861ff,frostguard:0x81eaff,returnblade:0x8eff9d,prism:0xffd77e,thunderlance:0xffd35d,frostbloom:0x77dfff,stormcrown:0xffd15d,tidepull:0x55d9ec,seedstorm:0xff8552,mirrorguard:0xffe2a1,mirrormaze:0xc7eaff,fullbloom:0xa5ee65,thunderweb:0xffd05d,starring:0xffe18a,glassspear:0x74ddff,flarebloom:0xff694f,rewind:0xc375ff,blackhole:0x8d54ff,winterbreath:0x9fe9ff});

export const rankedEvolutionForms=(forms,limit=2)=>rankedEvolutions(forms,ALL_BODY_TILES,limit).map(entry=>entry.id);
export const dominantSoloForm=forms=>rankedEvolutions(forms,SOLO_BODY_TILES,1)[0]?.id||null;

// The atlas is painted from front, right, back, left; direction is camera-relative.
export function seedFrame(facing,cameraYaw){
 const angle=Math.atan2(Math.sin(facing-cameraYaw),Math.cos(facing-cameraYaw));
 if(Math.abs(angle)<=Math.PI/4)return 0;
 if(Math.abs(angle)>=Math.PI*3/4)return 2;
 return angle>0?1:3;
}

export function createSeedBody(scene){
 const root=new THREE.Group();scene.add(root);
 const loader=new THREE.TextureLoader();
 const texture=loader.load(import.meta.env.BASE_URL+'assets/'+SEED_BODY_ART);
 texture.colorSpace=THREE.SRGBColorSpace;texture.repeat.set(.5,.5);texture.offset.set(0,.5);
 const material=applySpriteLighting(new THREE.SpriteMaterial({map:texture,transparent:true,alphaTest:.08,depthWrite:true,toneMapped:false}),{shadow:.8,highlight:1.07,rim:0xa1ffe0,rimStrength:.075});
 const sprite=new THREE.Sprite(material);sprite.center.set(.5,.055);sprite.scale.set(BODY_SIZE,BODY_SIZE,1);root.add(sprite);
 // A faint copy draws through walls so the seed is never lost behind cover.
 const ghostMaterial=new THREE.SpriteMaterial({map:texture,alphaTest:.08,transparent:true,opacity:.38,depthTest:true,depthFunc:THREE.GreaterDepth,depthWrite:false,toneMapped:false,color:0x9ff5d2});
 const ghost=new THREE.Sprite(ghostMaterial);ghost.center.set(.5,.055);ghost.scale.set(BODY_SIZE,BODY_SIZE,1);ghost.renderOrder=2;root.add(ghost);

 let applyEvolution=()=>{};
 const sources={
  fusion:{file:SEED_FUSION_BODY_ART,tiles:FUSION_BODY_TILES,ready:false,loading:false,texture:null},
  solo:{file:SEED_SOLO_BODY_ART,tiles:SOLO_BODY_TILES,ready:false,loading:false,texture:null}
 };
 const evolutionMaterial=applySpriteLighting(new THREE.SpriteMaterial({map:null,transparent:true,alphaTest:.08,depthWrite:true,toneMapped:false}),{shadow:.76,highlight:1.1,rim:0xffe8ae,rimStrength:.085});
 const evolutionSprite=new THREE.Sprite(evolutionMaterial);evolutionSprite.center.set(.5,.055);evolutionSprite.scale.set(EVOLUTION_SIZE,EVOLUTION_SIZE,1);evolutionSprite.visible=false;root.add(evolutionSprite);
 const evolutionGhostMaterial=new THREE.SpriteMaterial({map:null,alphaTest:.08,transparent:true,opacity:.34,depthTest:true,depthFunc:THREE.GreaterDepth,depthWrite:false,toneMapped:false,color:0xcfffe9});
 const evolutionGhost=new THREE.Sprite(evolutionGhostMaterial);evolutionGhost.center.set(.5,.055);evolutionGhost.scale.copy(evolutionSprite.scale);evolutionGhost.renderOrder=2;evolutionGhost.visible=false;root.add(evolutionGhost);
 const secondaryMaterial=new THREE.MeshBasicMaterial({color:0xffffff,transparent:true,opacity:.68,depthWrite:false,toneMapped:false,side:THREE.DoubleSide});
 const secondaryAura=new THREE.Mesh(new THREE.TorusGeometry(.48,.025,5,36),secondaryMaterial);secondaryAura.rotation.x=Math.PI/2;secondaryAura.position.y=.12;secondaryAura.visible=false;root.add(secondaryAura);

 let currentEvolution=null,secondaryEvolution=null;
 const sourceFor=id=>Object.values(sources).find(source=>Object.hasOwn(source.tiles,id));
 const ensureSource=source=>{
  if(!source||source.loading||source.ready)return;
  source.loading=true;
  source.texture=loader.load(import.meta.env.BASE_URL+'assets/'+source.file,()=>{source.ready=true;applyEvolution();});
  source.texture.colorSpace=THREE.SRGBColorSpace;source.texture.repeat.set(.25,1/3);
 };
 applyEvolution=()=>{
  const source=sourceFor(currentEvolution),active=Boolean(source?.ready);
  if(active){const tile=source.tiles[currentEvolution];source.texture.offset.set((tile%4)/4,1-(Math.floor(tile/4)+1)/3);evolutionMaterial.map=evolutionGhostMaterial.map=source.texture;evolutionMaterial.needsUpdate=evolutionGhostMaterial.needsUpdate=true;}
  sprite.visible=ghost.visible=!active;evolutionSprite.visible=evolutionGhost.visible=active;
  secondaryAura.visible=Boolean(secondaryEvolution);if(secondaryEvolution)secondaryMaterial.color.setHex(EVOLUTION_COLORS[secondaryEvolution]||0xffffff);
 };
 // Preserve the visual rig interface used by evolution and combat.
 root.userData={legs:[],heart:new THREE.Object3D(),halo:new THREE.Object3D(),artFrame:0,evolutionArt:null,secondaryEvolutionArt:null};
 root.userData.setEvolution=forms=>{
  [currentEvolution=null,secondaryEvolution=null]=rankedEvolutionForms(forms,2);
  root.userData.evolutionArt=currentEvolution;root.userData.secondaryEvolutionArt=secondaryEvolution;ensureSource(sourceFor(currentEvolution));applyEvolution();return currentEvolution;
 };
 root.userData.updateEvolutionArt=(time,overdrive=false)=>{
  if(!secondaryAura.visible)return;const pulse=1+Math.sin(time*4)*.055+(overdrive?.12:0);secondaryAura.scale.setScalar(pulse);secondaryAura.rotation.z=time*(overdrive?2.2:.8);secondaryMaterial.opacity=overdrive?.92:.68;
 };
 let facing=0;
 root.userData.updateArt=(camera,dx=0,dz=0)=>{
  if(Math.hypot(dx,dz)>.001)facing=Math.atan2(dx,dz);
  const frame=seedFrame(facing,Math.atan2(camera.position.x-root.position.x,camera.position.z-root.position.z));
  texture.offset.set((frame%2)*.5,frame<2?.5:0);root.userData.artFrame=frame;
  const {phase=0,pace=0}=root.userData.motion||{},step=Math.sin(phase*2)*pace;
  material.rotation=evolutionMaterial.rotation=Math.sin(phase)*pace*.055;
  sprite.position.y=Math.max(0,step)*.018;sprite.scale.set(BODY_SIZE*(1+step*.03),BODY_SIZE*(1-step*.018),1);ghost.position.y=sprite.position.y;ghost.scale.copy(sprite.scale);ghostMaterial.rotation=material.rotation;
  evolutionSprite.position.y=sprite.position.y;evolutionSprite.scale.set(EVOLUTION_SIZE*(1+step*.03),EVOLUTION_SIZE*(1-step*.018),1);evolutionGhost.position.y=sprite.position.y;evolutionGhost.scale.copy(evolutionSprite.scale);evolutionGhostMaterial.rotation=evolutionMaterial.rotation;
 };
 return root;
}
