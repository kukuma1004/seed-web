import * as THREE from 'three';
import {getAdventureGuardian} from './adventure-duel-guardians.js';
import {applySpriteLighting} from './sprite-lighting.js';

// Reuse audited art, never the Duel roster, stats, unlocks or combat controller.
// Selection is supplied by seed-body's existing complete dominant-body ranking.
const BODIES=Object.freeze({collapse:'austin',bigcrunch:'austin',frostbloom:'alwaysbeginner',icegarden:'alwaysbeginner',stormcrown:'tempestcarrier',tempestcrown:'tempestcarrier'});
const PPU=512/2.2;
const JOURNEY_PHASES=new Set(['playing','cards','forms','evolving','dash-evolution']);
export const JOURNEY_DUEL_BODY_BUDGET=Object.freeze({active:1,pending:1,decodedSheetBytes:2048*1024*4,mipmaps:false});
export function journeyDuelIdentity(bodyId){
 const guardian=Object.hasOwn(BODIES,bodyId)?getAdventureGuardian(BODIES[bodyId]):null;
 return guardian?{bodyId,fighterId:guardian.fighterId,art:guardian}:null;
}
export function journeyDuelContext(mode,survival=false,mirror=false,training=false){
 return !survival&&!mirror&&!training&&JOURNEY_PHASES.has(mode);
}
// The eight poses are actions facing screen-right, not four walking directions.
// Sprite's shader ignores negative scale: flip an exclusively owned texture UV.
export function journeyDuelCrop(art,frame=0,flipped=false){
 const pose=art.frames[frame], [x,y,w,h]=pose.src;
 return {repeatX:(flipped?-w:w)/art.width,repeatY:h/art.height,
  offsetX:(flipped?x+w:x)/art.width,offsetY:1-(y+h)/art.height,
  width:w/PPU,height:h/PPU,foot:(h-pose.foot[1])/h};
}
export function createJourneyDuelMotion(){
 let identity=null,attack=0,ultimate=0,hurt=0,sequence=0,side=1;
 const reset=()=>{attack=ultimate=hurt=sequence=0;side=1;};
 return {
  set(id){if(identity!==id){identity=id;reset();}},reset,
  fire(id){if(id!==identity)return false;sequence=sequence%3+1;attack=.22;return true;},
  hit(id){if(identity!=='stormcrown'||id!==identity||attack>0)return false;sequence=3;attack=.18;return true;},
  active(ids){if(identity&&ids.some(id=>journeyDuelIdentity(id)?.fighterId===identity)){ultimate=.42;return true;}return false;},
  hurt(){if(identity)hurt=.18;},
  step(dt){if(Number.isFinite(dt)&&dt>0){attack=Math.max(0,attack-dt);ultimate=Math.max(0,ultimate-dt);hurt=Math.max(0,hurt-dt);}},
  pose(){return hurt>0?7:ultimate>0?(ultimate>.34?4:5):attack>0?(identity==='collapse'?5:sequence):0;},
  facing(facing,cameraYaw){const lateral=Math.sin(facing-cameraYaw);if(Math.abs(lateral)>.18)side=lateral<0?-1:1;return side<0;},
  attacking(){return attack>0||ultimate>0;},
 };
}

export function createJourneyDuelBody(root,{baseURL,onChange=()=>{},loader=new THREE.TextureLoader(),reducedMotion=false}={}){
 const motion=createJourneyDuelMotion();
 const material=applySpriteLighting(new THREE.SpriteMaterial({map:null,transparent:true,alphaTest:.08,depthWrite:true,toneMapped:false}),{atlasGrid:[4,2]});
 const ghostMaterial=new THREE.SpriteMaterial({map:null,alphaTest:.08,transparent:true,opacity:.34,depthTest:true,depthFunc:THREE.GreaterDepth,depthWrite:false,toneMapped:false,color:0xcfffe9});
 const sprite=new THREE.Sprite(material),ghost=new THREE.Sprite(ghostMaterial);ghost.renderOrder=2;
 sprite.name='journey-duel-body';ghost.name='journey-duel-body-occlusion';root.add(sprite,ghost);sprite.visible=ghost.visible=false;
 let selected=null,enabled=false,active=null,pending=null,disposed=false,occlusion=true,frame=-1,flipped=null;
 const failed=new Set();
 function applyCrop(next,flip){
  const crop=journeyDuelCrop(active.identity.art,next,flip),texture=active.texture;
  texture.repeat.set(crop.repeatX,crop.repeatY);texture.offset.set(crop.offsetX,crop.offsetY);
  sprite.center.set(.5,crop.foot);ghost.center.copy(sprite.center);frame=next;flipped=flip;
  return crop;
 }
 function releaseActive(){if(active){material.map=ghostMaterial.map=null;active.texture.dispose();active=null;}sprite.visible=ghost.visible=false;frame=-1;flipped=null;}
 function reconcile(){
  const desired=enabled&&!disposed?selected:null;
  if(active&&active.identity.fighterId!==desired?.fighterId)releaseActive();
  motion.set(desired?.fighterId||null);
  if(!desired||active||pending||failed.has(desired.fighterId)){onChange();return;}
  const job=pending={identity:desired,texture:null};
  job.texture=loader.load(baseURL+'assets/'+desired.art.files[0],texture=>{
   if(pending===job)pending=null;
   if(disposed||!enabled||selected?.fighterId!==job.identity.fighterId){texture.dispose();reconcile();return;}
   active={identity:selected,texture};material.map=ghostMaterial.map=texture;material.needsUpdate=ghostMaterial.needsUpdate=true;
   // Evolution freezes gameplay before updateArt; establish a drawable crop
   // before hiding the fallback, even if loading completes during that freeze.
   const crop=applyCrop(0,false);sprite.scale.set(crop.width,crop.height,1);ghost.scale.copy(sprite.scale);
   sprite.position.y=ghost.position.y=0;material.rotation=ghostMaterial.rotation=0;material.color.setRGB(1,1,1);
   sprite.visible=true;ghost.visible=occlusion;onChange();
  },undefined,()=>{
   job.texture?.dispose();if(pending===job)pending=null;failed.add(job.identity.fighterId);reconcile();
  });
  job.texture.colorSpace=THREE.SRGBColorSpace;job.texture.minFilter=job.texture.magFilter=THREE.LinearFilter;job.texture.generateMipmaps=false;
  onChange();
 }
 return {
  select(bodyId){selected=journeyDuelIdentity(bodyId);reconcile();},
  setEnabled(value){value=Boolean(value);if(enabled!==value){enabled=value;reconcile();}},
  ready(){return Boolean(enabled&&active&&!disposed);},
  setOcclusion(value){occlusion=Boolean(value);ghost.visible=sprite.visible&&occlusion;},
  fire(id){return motion.fire(id);},hit(id){return motion.hit(id);},active(ids){return motion.active(ids);},hurt:motion.hurt,step:motion.step,reset:motion.reset,
  update(cameraYaw,facing,{phase=0,pace=0}={},contact=0){
   if(!enabled||!active||disposed)return;
   const next=motion.pose(),flip=motion.facing(facing,cameraYaw);
   const art=active.identity.art,pose=art.frames[next],w=pose.src[2],h=pose.src[3];
   if(frame!==next||flipped!==flip){
    applyCrop(next,flip);
   }
   // Movement comes from the existing player rig. Never rotate/scale its root.
   const step=Math.sin(phase)*pace*(reducedMotion?.3:1),bob=Math.max(0,step)*.01;
   sprite.position.y=ghost.position.y=bob;
   sprite.scale.set(w/PPU*(1+step*.018+contact*.025),h/PPU*(1-step*.011-contact*.02),1);ghost.scale.copy(sprite.scale);
   material.rotation=ghostMaterial.rotation=step*.022;
   material.color.setRGB(1,1-contact*.16,1-contact*.28);sprite.visible=true;ghost.visible=occlusion;
  },
  attacking:motion.attacking,
  state(){return {enabled,selected:selected?.fighterId||null,bodyId:selected?.bodyId||null,ready:Boolean(active),pending:pending?.identity.fighterId||null,frame,flipped,activeTextures:active?1:0,pendingTextures:pending?1:0};},
  dispose(){disposed=true;enabled=false;selected=null;releaseActive();motion.set(null);sprite.removeFromParent();ghost.removeFromParent();material.dispose();ghostMaterial.dispose();onChange();},
 };
}
