import * as THREE from 'three';
import {seedFrame} from './seed-body.js';
import {applySpriteLighting} from './sprite-lighting.js';

const atlases=new Map();
const reducedAtlases=Object.freeze({
 'enemy-hound-v4.png':'mobile/enemy-hound-v4.webp','enemy-caster-v4.png':'mobile/enemy-caster-v4.webp',
 'enemy-shield-v4.png':'mobile/enemy-shield-v4.webp','enemy-turret-v4.png':'mobile/enemy-turret-v4.webp',
 'warden-memory-v4.png':'mobile/warden-memory-v4.webp','warden-seal-v4.png':'mobile/warden-seal-v4.webp','warden-hunter-v4.png':'mobile/warden-hunter-v4.webp',
 'boss-austin-v1.png':'mobile/boss-austin-v1.webp','enemy-catcher-v1.webp':'mobile/enemy-catcher-v1.webp',
 'enemy-pitcher-v1.webp':'mobile/enemy-pitcher-v1.webp','enemy-runner-v1.webp':'mobile/enemy-runner-v1.webp',
 'enemy-batter-v1.webp':'mobile/enemy-batter-v1.webp','warden-act2-ace-v1.webp':'mobile/warden-act2-ace-v1.webp',
 'warden-act2-diamond-v1.webp':'mobile/warden-act2-diamond-v1.webp','warden-act2-slugger-v1.webp':'mobile/warden-act2-slugger-v1.webp',
 'boss-always-beginner-v1.webp':'mobile/boss-always-beginner-v1.webp',
 'enemy-act3-flight-atlas-v2.webp':'mobile/enemy-act3-flight-atlas-v2.webp','boss-act3-johan-atlas-v2.webp':'mobile/boss-act3-johan-atlas-v2.webp'
});
let reduced=false;
export function configureActorArt({reducedTextures=false}={}){reduced=Boolean(reducedTextures);}
export function actorArtFile(file,{reducedTextures=reduced}={}){return reducedTextures?(reducedAtlases[file]||file):file;}
// The see-through silhouette costs one extra draw per actor. It is drawn only while the quality allows it and something
// may stand between the camera and the actor (occlusionTest, set by the game from the room's cover); 2026-09-15 phone pass.
const silhouettes={enabled:true,test:null};
export function configureOcclusion({enabled=silhouettes.enabled,test=silhouettes.test}={}){silhouettes.enabled=enabled;silhouettes.test=test;}
const frameGeometry=(column,row,columns=2,rows=2)=>{
 const geometry=new THREE.PlaneGeometry(1,1);
 const uv=geometry.getAttribute('uv');
 for(let i=0;i<uv.count;i++)uv.setXY(i,(uv.getX(i)+column)/columns,(uv.getY(i)+row)/rows);
 uv.needsUpdate=true;return geometry;
};

// Directional actors share one GPU texture and four tiny UV-only planes. The
// old Texture.clone path uploaded the same 1254px atlas up to four times.
export const ACTOR_ART_GEOMETRIES=Object.freeze({
 full:frameGeometry(0,0,1,1),
 front:frameGeometry(0,1),
 right:frameGeometry(1,1),
 back:frameGeometry(0,0),
 left:frameGeometry(1,0)
});
const directionGeometries=[ACTOR_ART_GEOMETRIES.front,ACTOR_ART_GEOMETRIES.right,ACTOR_ART_GEOMETRIES.back,ACTOR_ART_GEOMETRIES.left];
const parentWorld=new THREE.Quaternion(),inverseParent=new THREE.Quaternion(),rollQuaternion=new THREE.Quaternion(),cameraUp=new THREE.Vector3(),localOffset=new THREE.Vector3();
const localUp=new THREE.Vector3(0,1,0),localForward=new THREE.Vector3(0,0,1);

export function actorArtRotation(state,time,phase){
 // Austin's phase is a state name, unlike the numeric gait phase of mobs.
 const gaitPhase=Number.isFinite(phase)?phase:0;
 if(state==='stalk')return Math.sin(time*9+gaitPhase)*.025;
 if(state==='commit'||state==='jab')return .13;
 if(state==='slide'||state==='doubleRush'||state==='steal')return .16;
 if(state==='lunge')return .11;
 if(state==='jabTell')return -.08;
 if(state==='volleyTell')return .055;
 if(state==='sweepTell')return -.06;
 return 0;
}

export function actorFrameGeometry(frame=0){return directionGeometries[((frame%4)+4)%4];}

function atlas(file){
 const selected=actorArtFile(file);
 if(atlases.has(selected))return atlases.get(selected);
 const texture=new THREE.TextureLoader().load(import.meta.env.BASE_URL+'assets/'+selected);
 texture.colorSpace=THREE.SRGBColorSpace;
 atlases.set(selected,texture);return texture;
}

function billboard(mesh,camera,size,baseline){
 mesh.userData.roll=0;
 mesh.onBeforeRender=()=>{
  mesh.parent.getWorldQuaternion(parentWorld);inverseParent.copy(parentWorld).invert();
  mesh.quaternion.copy(inverseParent).multiply(camera.quaternion);
  rollQuaternion.setFromAxisAngle(localForward,mesh.userData.roll||0);mesh.quaternion.multiply(rollQuaternion);
  cameraUp.copy(localUp).applyQuaternion(camera.quaternion).applyQuaternion(inverseParent);
  localOffset.copy(cameraUp).multiplyScalar((.5-baseline)*size);mesh.position.copy(localOffset);
 };
}

export function attachActorArt(e,camera,release,{file,size,directional=false,order=[0,1,2,3],atlasFrame=null,topDownFacing=false,baseline=.04,preserveBody=false,occlusion=true,lighting=true}){
 const body=e.body||e.motion?.body||e.g;
 // Turret head/orbit materials remain live gameplay references until death.
 for(const child of [...body.children])if(preserveBody)child.visible=false;else release(child);
 const texture=atlas(file),firstFrame=typeof atlasFrame==='function'?atlasFrame(e):atlasFrame,geometry=Number.isFinite(firstFrame)?actorFrameGeometry(firstFrame):directional?actorFrameGeometry(0):ACTOR_ART_GEOMETRIES.full;
 const baseMaterial=new THREE.MeshBasicMaterial({map:texture,alphaTest:.08,transparent:true,depthWrite:true,toneMapped:false,side:THREE.DoubleSide,forceSinglePass:true});
 const mat=lighting?applySpriteLighting(baseMaterial,{shadow:.74,highlight:1.07,rim:0xffb474,rimStrength:.065}):baseMaterial;
 const sprite=new THREE.Mesh(geometry,mat);sprite.scale.set(size,size,1);billboard(sprite,camera,size,baseline);body.add(sprite);
 const ghostMat=new THREE.MeshBasicMaterial({map:texture,alphaTest:.08,transparent:true,opacity:.26,depthTest:true,depthFunc:THREE.GreaterDepth,depthWrite:false,toneMapped:false,color:0xffad7a,side:THREE.DoubleSide,forceSinglePass:true});
 const ghost=new THREE.Mesh(geometry,ghostMat);ghost.name='quality-occlusion-ghost';ghost.visible=occlusion;ghost.scale.set(size,size,1);ghost.renderOrder=2;billboard(ghost,camera,size,baseline);body.add(ghost);
 e.updateArt=(time)=>{
 const yaw=Math.atan2(camera.position.x-e.g.position.x,camera.position.z-e.g.position.z);
  const frame=seedFrame(e.g.rotation.y,yaw),fixedFrame=typeof atlasFrame==='function'?atlasFrame(e):atlasFrame,nextGeometry=Number.isFinite(fixedFrame)?actorFrameGeometry(fixedFrame):directional?actorFrameGeometry(order[frame]):ACTOR_ART_GEOMETRIES.full;
  sprite.geometry=ghost.geometry=nextGeometry;
  const impact=THREE.MathUtils.clamp((e.hit||0)/.14,0,1),reaction=(e.impactSide||1)*impact*.105;
  const facingRoll=topDownFacing?Math.atan2(Math.sin(e.g.rotation.y-yaw+Math.PI),Math.cos(e.g.rotation.y-yaw+Math.PI)):0;
  sprite.userData.roll=ghost.userData.roll=facingRoll+actorArtRotation(e.state,time,e.phase)+reaction;
  sprite.scale.set(size*(1+impact*.045),size*(1-impact*.035),1);ghost.scale.copy(sprite.scale);
  mat.color.setHex(e.block>0?0xb5efff:e.hit>0?0xffd1aa:(e.tint??0xffffff));
  ghost.visible=occlusion&&silhouettes.enabled&&(!silhouettes.test||silhouettes.test(e.g.position));
 };
 return sprite;
}
