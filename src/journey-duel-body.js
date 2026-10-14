import * as THREE from 'three';
import {JOURNEY_DUEL_ART} from './journey-duel-art.js';
import {applySpriteLighting} from './sprite-lighting.js';

// Presentation only. No Duel controller, statistics, unlock or save imports.
const DISPLAY_SCALE=.6;
const JOURNEY_PHASES=new Set(['playing','cards','forms','evolving','dash-evolution']);
export const JOURNEY_DUEL_BODY_BUDGET=Object.freeze({active:1,pending:1,sheets:2,pendingRequests:1,decodedSheetBytes:12585608,mipmaps:false});
export function journeyDuelIdentity(bodyId){
 const art=Object.hasOwn(JOURNEY_DUEL_ART,bodyId)?JOURNEY_DUEL_ART[bodyId]:null;
 return art?{bodyId,fighterId:art.fighterId,art}:null;
}
export function journeyDuelContext(mode,survival=false,mirror=false,training=false){
 return !survival&&!mirror&&!training&&JOURNEY_PHASES.has(mode);
}
// Exact source crop AND destination anchor, including off-centre native feet.
// Sprite's shader ignores negative scale: mirror only this owned texture's UV.
export function journeyDuelCrop(art,frame=0,flipped=false){
 const pose=art.frames[frame], [x,y,w,h]=pose.src,[sw,sh]=art.dimensions[pose.file];
 const [dx,dy,dw,dh]=pose.dst,anchorX=-dx/dw;
 return {file:pose.file,repeatX:(flipped?-w:w)/sw,repeatY:h/sh,
  offsetX:(flipped?x+w:x)/sw,offsetY:1-(y+h)/sh,
  width:dw*DISPLAY_SCALE,height:dh*DISPLAY_SCALE,
  centerX:flipped?1-anchorX:anchorX,foot:1+dy/dh};
}
const CONTACT_FIRST=new Set(['final-refractlance-reflect','final-gravitymirror-reflect','final-thundermirror-reflect']);
const CONTACT_SECOND=new Set(['final-echolane-reflect','final-echolane-recall']);
export function createJourneyDuelMotion(){
 let identity=null,attack=0,ultimate=0,hurt=0,sequence=0,side=1,confirmed=false;
 const reset=()=>{attack=ultimate=hurt=sequence=0;side=1;confirmed=false;};
 const start=()=>{sequence=sequence%3+1;attack=.22;confirmed=false;return true;};
 return {
  set(id){if(identity!==id){identity=id;reset();}},reset,
  fire(id){return identity&&id===identity&&attack<=0&&ultimate<=0?start():false;},
  hit(id,passive=false){
   if(!identity||id!==identity||ultimate>0)return false;
   if(attack>0){confirmed=true;return false;}
   if(passive!==true)return false; // Remote explosions/field ticks are not new swings.
   // Passive contacts from several victims share one short action, never 3 skips.
   start();confirmed=true;return true;
  },
  basic(){return journeyDuelIdentity(identity)?.art.kind==='base'&&attack<=0?start():false;},
  active(ids){if(identity&&ids.includes(identity)){ultimate=.42;return true;}return false;},
  hurt(){if(identity)hurt=.18;},
  step(dt){if(Number.isFinite(dt)&&dt>0){attack=Math.max(0,attack-dt);ultimate=Math.max(0,ultimate-dt);hurt=Math.max(0,hurt-dt);}},
  pose(){
   if(hurt>0)return 7;if(ultimate>0)return ultimate>.34?4:5;if(attack<=0)return 0;
   const fighter=journeyDuelIdentity(identity)?.fighterId;
   if(fighter==='collapse'||confirmed&&sequence===1&&CONTACT_FIRST.has(fighter))return 5;
   if(confirmed&&sequence===2&&CONTACT_SECOND.has(fighter))return 3;
   return sequence;
  },
  facing(facing,cameraYaw){const lateral=Math.sin(facing-cameraYaw);if(Math.abs(lateral)>.18)side=lateral<0?-1:1;return side<0;},
  attacking(){return attack>0||ultimate>0;},
 };
}

export function createJourneyDuelBody(root,{baseURL,onChange=()=>{},loader=new THREE.TextureLoader(),reducedMotion=false}={}){
 const motion=createJourneyDuelMotion();
 const cropUV=new THREE.Vector4(0,0,1,1);
 const material=applySpriteLighting(new THREE.SpriteMaterial({map:null,transparent:true,alphaTest:.08,depthWrite:true,toneMapped:false}),{cropUV});
 const ghostMaterial=new THREE.SpriteMaterial({map:null,alphaTest:.08,transparent:true,opacity:.34,depthTest:true,depthFunc:THREE.GreaterDepth,depthWrite:false,toneMapped:false,color:0xcfffe9});
 const sprite=new THREE.Sprite(material),ghost=new THREE.Sprite(ghostMaterial);ghost.renderOrder=2;
 sprite.name='journey-duel-body';ghost.name='journey-duel-body-occlusion';root.add(sprite,ghost);sprite.visible=ghost.visible=false;
 let selected=null,enabled=false,active=null,pending=null,disposed=false,occlusion=true,frame=-1,flipped=null;
 const failed=new Set(),released=new WeakSet();
 const release=textures=>{for(const texture of textures)if(texture&&!released.has(texture)){released.add(texture);texture.dispose();}};
 function applyCrop(next,flip){
  const crop=journeyDuelCrop(active.identity.art,next,flip),texture=active.textures[crop.file];
  texture.repeat.set(crop.repeatX,crop.repeatY);texture.offset.set(crop.offsetX,crop.offsetY);
  cropUV.set(crop.offsetX,crop.offsetY,crop.repeatX,crop.repeatY);
  if(material.map!==texture){material.map=ghostMaterial.map=texture;material.needsUpdate=ghostMaterial.needsUpdate=true;}
  sprite.center.set(crop.centerX,crop.foot);ghost.center.copy(sprite.center);frame=next;flipped=flip;
  return crop;
 }
 function releaseActive(){if(active){material.map=ghostMaterial.map=null;release(active.textures);active=null;}sprite.visible=ghost.visible=false;frame=-1;flipped=null;}
 function reconcile(){
  const desired=enabled&&!disposed?selected:null;
  if(active&&active.identity.bodyId!==desired?.bodyId)releaseActive();
  motion.set(desired?.bodyId||null);
  if(!desired||active||pending||failed.has(desired.bodyId)){onChange();return;}
  const job=pending={identity:desired,textures:[]};
  function loadSheet(index){
   const texture=loader.load(baseURL+'assets/'+job.identity.art.files[index],loaded=>{
    if(disposed||!enabled||selected?.bodyId!==job.identity.bodyId){
     release(job.textures);release([loaded]);if(pending===job)pending=null;reconcile();return;
    }
    if(index+1<job.identity.art.files.length){loadSheet(index+1);return;}
    if(pending===job)pending=null;
    active={identity:selected,textures:job.textures};
    // Complete both sheets before hiding fallback. Evolution can freeze updates.
    const crop=applyCrop(0,false);sprite.scale.set(crop.width,crop.height,1);ghost.scale.copy(sprite.scale);
    sprite.position.y=ghost.position.y=0;material.rotation=ghostMaterial.rotation=0;material.color.setRGB(1,1,1);
    sprite.visible=true;ghost.visible=occlusion;onChange();
   },undefined,()=>{
    release(job.textures);if(pending===job)pending=null;failed.add(job.identity.bodyId);reconcile();
   });
   texture.colorSpace=THREE.SRGBColorSpace;texture.minFilter=texture.magFilter=THREE.LinearFilter;texture.generateMipmaps=false;
   job.textures[index]=texture;
  }
  loadSheet(0);onChange();
 }
 return {
  select(bodyId){if(selected?.bodyId===bodyId)return;selected=journeyDuelIdentity(bodyId);reconcile();},
  setEnabled(value){value=Boolean(value);if(enabled!==value){enabled=value;reconcile();}},
  ready(){return Boolean(enabled&&active&&!disposed);},
  setOcclusion(value){occlusion=Boolean(value);ghost.visible=sprite.visible&&occlusion;},
  fire:motion.fire,hit:motion.hit,basic:motion.basic,active:motion.active,hurt:motion.hurt,step:motion.step,reset:motion.reset,
  update(cameraYaw,facing,{phase=0,pace=0}={},contact=0){
   if(!enabled||!active||disposed)return;
   const next=motion.pose(),flip=motion.facing(facing,cameraYaw),art=active.identity.art;
   if(frame!==next||flipped!==flip)applyCrop(next,flip);
   const [,,w,h]=art.frames[next].dst;
   // Existing movement rig owns collision. Only the two artwork sprites deform.
   const step=Math.sin(phase)*pace*(reducedMotion?.3:1),bob=Math.max(0,step)*.01;
   sprite.position.y=ghost.position.y=bob;
   sprite.scale.set(w*DISPLAY_SCALE*(1+step*.018+contact*.025),h*DISPLAY_SCALE*(1-step*.011-contact*.02),1);ghost.scale.copy(sprite.scale);
   material.rotation=ghostMaterial.rotation=step*.022;
   material.color.setRGB(1,1-contact*.16,1-contact*.28);sprite.visible=true;ghost.visible=occlusion;
  },
  attacking:motion.attacking,
  state(){return {enabled,selected:selected?.fighterId||null,bodyId:selected?.bodyId||null,ready:Boolean(active),pending:pending?.identity.bodyId||null,frame,flipped,activeTextures:active?.textures.length||0,pendingTextures:pending?.textures.length||0};},
  dispose(){disposed=true;enabled=false;selected=null;releaseActive();if(pending)release(pending.textures);motion.set(null);sprite.removeFromParent();ghost.removeFromParent();material.dispose();ghostMaterial.dispose();onChange();},
 };
}
