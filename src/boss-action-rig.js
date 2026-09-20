import * as THREE from 'three';
import {actorArtFile} from './actor-art.js';

const textures=new Map();
const clamp=THREE.MathUtils.clamp;
const smooth=t=>t*t*(3-2*t);

function texture(file){
 const selected=actorArtFile(file);if(textures.has(selected))return textures.get(selected);
 const map=new THREE.TextureLoader().load(import.meta.env.BASE_URL+'assets/'+selected);
 map.colorSpace=THREE.SRGBColorSpace;textures.set(selected,map);return map;
}
function actionSprite(parent,file,{x=0,y=0,z=0,width=1,height=1,pivot=[.5,.5],opacity=1}={}){
 const material=new THREE.SpriteMaterial({map:texture(file),transparent:true,alphaTest:.035,opacity,depthTest:false,depthWrite:false,toneMapped:false});
 const sprite=new THREE.Sprite(material);sprite.position.set(x,y,z);sprite.scale.set(width,height,1);sprite.center.set(pivot[0],pivot[1]);sprite.renderOrder=7;sprite.visible=false;parent.add(sprite);return sprite;
}
function show(sprite,{x,y,z,width,height,rotation=0,opacity=1}){
 sprite.visible=true;sprite.position.set(x,y,z);sprite.scale.set(width,height,1);sprite.material.rotation=rotation;sprite.material.opacity=opacity;
}
function hide(...sprites){for(const sprite of sprites)sprite.visible=false;}

export function austinActionPose(e){
 const tell=e.state==='jabTell',jab=e.state==='jab';
 if(!tell&&!jab)return {visible:false,afterimage:false};
 const side=e.dashes%2===0?1:-1;
 if(tell){
  const duration=e.dashes?Math.max(.3,.36):.48,p=smooth(clamp(1-e.timer/duration,0,1));
  return {visible:p>.22,afterimage:false,side,x:side*(.92+.1*p),y:2.88+.08*p,z:.22-.2*p,width:.98,height:.8,rotation:side*(-.1-.22*p),opacity:.82};
 }
 const p=clamp(1-e.timer/.34,0,1),reach=smooth(clamp(p/.38,0,1))*(1-.25*smooth(clamp((p-.8)/.2,0,1)));
 return {visible:true,afterimage:p>.08,side,x:side*(.86-.12*reach),y:2.88-.36*reach,z:.36+1.58*reach,width:1.02+.26*reach,height:.84+.2*reach,rotation:side*(.1-.44*reach),opacity:1,reach};
}

function attachAustin(e){
 const glove=actionSprite(e.g,'boss-austin-punch-v1.webp',{width:1.02,height:.84});
 const echo=actionSprite(e.g,'boss-austin-punch-v1.webp',{width:.94,height:.78,opacity:.2});
 e.updateActionArt=()=>{
  const pose=austinActionPose(e);e.actionArtState=pose;
  if(!pose.visible){hide(glove,echo);return;}
  show(glove,pose);
  if(pose.afterimage)show(echo,{...pose,x:pose.x+pose.side*.16,z:pose.z-.5,width:pose.width*.92,height:pose.height*.92,opacity:.18});else echo.visible=false;
 };
 return {glove,echo};
}

const pitchStates=new Set(['pitchTell','wildTell','doubleTell','countTell','count']);
const phaseTempo=phase=>phase==='finish'?.52:phase==='rally'?.68:.86;
export function alwaysActionPose(e,fx={swing:0,pitch:0}){
 if(e.state==='swingTell'||fx.swing>0){
  const release=fx.swing>0,p=release?1-clamp(fx.swing/.18,0,1):smooth(clamp(1-e.timer/(.58*phaseTempo(e.phase)),0,1));
  return {kind:'swing',bat:true,batEcho:release&&p>.12,x:.67,y:2.02,z:.28,width:1.12,height:3.12,rotation:release?-.45-2.05*smooth(p):.2+.72*p,opacity:1};
 }
 if(pitchStates.has(e.state)||fx.pitch>0){
  const release=fx.pitch>0,p=release?1-clamp(fx.pitch/.16,0,1):smooth(clamp(1-e.timer/(.55*phaseTempo(e.phase)),0,1));
  return {kind:'pitch',ball:true,x:release?.56:.62-.18*p,y:release?2.78-1.5*smooth(p):2.7+.48*Math.sin(p*Math.PI),z:release?.35+2.45*smooth(p):.24-.2*p,width:release?.48-.14*p:.46,height:release?.46-.14*p:.44,rotation:p*4.8,opacity:release?1-p*.76:1};
 }
 return {kind:'idle'};
}

function attachAlways(e){
 const bat=actionSprite(e.g,'boss-always-bat-v1.webp',{width:1.12,height:3.12,pivot:[.52,.08]});
 const batEcho=actionSprite(e.g,'boss-always-bat-v1.webp',{width:1.12,height:3.12,pivot:[.52,.08],opacity:.18});
 const ball=actionSprite(e.g,'boss-always-ball-v1.webp',{width:.46,height:.44});
 let lastState=e.state,lastVolley=e.volley||0,lastTime=0,swing=0,pitch=0;
 e.updateActionArt=time=>{
  const dt=lastTime?Math.min(.05,Math.max(0,time-lastTime)):0;lastTime=time;
  if(lastState==='swingTell'&&e.state!=='swingTell')swing=.18;
  if((lastState==='pitchTell'||lastState==='wildTell'||lastState==='doubleTell')&&e.state!==lastState)pitch=.16;
  if(e.state==='count'&&(e.volley||0)!==lastVolley)pitch=.16;
  swing=Math.max(0,swing-dt);pitch=Math.max(0,pitch-dt);
  const pose=alwaysActionPose(e,{swing,pitch});e.actionArtState=pose;
  hide(bat,batEcho,ball);
  if(pose.bat){show(bat,pose);if(pose.batEcho)show(batEcho,{...pose,rotation:pose.rotation+.34,opacity:.17});}
  if(pose.ball)show(ball,pose);
  lastState=e.state;lastVolley=e.volley||0;
 };
 return {bat,batEcho,ball};
}

export function johanActionPose(e,time=0){
 const phaseChange=e.moveName==='폭풍핵 변환';
 if(phaseChange)return {kind:'phase',phase:true,core:true,phaseScale:3.9,coreScale:2.15,rotation:time*1.8,opacity:.92};
 if(e.state!=='tell'&&e.state!=='barrage')return {kind:'idle'};
 const live=e.state==='barrage',pulse=1+Math.sin(time*(live?24:15))*(live?.08:.04),step=e.volleyStep||0;
 if(e.pattern===0)return {kind:'cannons',cannons:true,width:4.25*pulse,height:3.15*pulse,z:.12+(live?.3:0),opacity:live?1:.76,recoil:live&&(step%2===1)};
 if(e.pattern===1)return {kind:'spiral',core:true,coreScale:(live?2.35:2.05)*pulse,rotation:time*(live?2.8:1.35)*(e.turnSign||1),opacity:live?1:.78};
 if(e.pattern===2)return {kind:'turn',thrusters:true,width:3.45*pulse,height:4.4*pulse,z:-.18,rotation:(e.turnSign||1)*-.08,opacity:live?1:.72};
 if(e.pattern===3)return {kind:'wall',phase:true,phaseScale:(live?3.35:2.8)*pulse,rotation:(step%2?1:-1)*.08,opacity:live?.9:.67};
 return {kind:'core',core:true,phase:true,coreScale:2.55*pulse,phaseScale:3.75*pulse,rotation:time*(live?3.2:1.5),opacity:live?1:.82};
}

function attachJohan(e){
 const cannons=actionSprite(e.g,'boss-johan-cannons-v1.webp',{width:4.25,height:3.15});
 const core=actionSprite(e.g,'boss-johan-core-v1.webp',{width:2.25,height:2.25});
 const thrusters=actionSprite(e.g,'boss-johan-thrusters-v1.webp',{width:3.45,height:4.4});
 const phase=actionSprite(e.g,'boss-johan-phase-v1.webp',{width:3.35,height:3.35});
 e.updateActionArt=time=>{
  const pose=johanActionPose(e,time);e.actionArtState=pose;hide(cannons,core,thrusters,phase);
  if(pose.cannons)show(cannons,{x:0,y:2.18,z:pose.z,width:pose.width*(pose.recoil?.94:1),height:pose.height*(pose.recoil?.94:1),rotation:0,opacity:pose.opacity});
  if(pose.core)show(core,{x:0,y:2.2,z:.44,width:pose.coreScale,height:pose.coreScale,rotation:pose.rotation,opacity:pose.opacity});
  if(pose.thrusters)show(thrusters,{x:0,y:1.38,z:pose.z,width:pose.width,height:pose.height,rotation:pose.rotation,opacity:pose.opacity});
  if(pose.phase)show(phase,{x:0,y:2.18,z:.62,width:pose.phaseScale,height:pose.phaseScale,rotation:-pose.rotation*.55,opacity:pose.opacity*.78});
 };
 return {cannons,core,thrusters,phase};
}

export function attachBossActionRig(e){
 if(e.type==='austin')return attachAustin(e);
 if(e.type==='alwaysbeginner')return attachAlways(e);
 if(e.type==='tempestcarrier')return attachJohan(e);
 return null;
}
