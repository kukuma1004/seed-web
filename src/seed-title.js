import * as THREE from 'three';
import './seed-title.css';
import {AUSTIN_TITLE,AUSTIN_MOVE_SPEED,ALWAYS_BEGINNER_TITLE,ALWAYS_BEGINNER_MAX_HP,titleState} from './titles.js';

export {AUSTIN_TITLE,ALWAYS_BEGINNER_TITLE};
// Kept for the Austin victory toast; every title's rules live in titles.js.
export const AUSTIN_TITLE_PERK=Object.freeze({moveSpeed:1+AUSTIN_MOVE_SPEED,text:`이동 속도 +${AUSTIN_MOVE_SPEED*100}%`});
export const ALWAYS_BEGINNER_TITLE_PERK=Object.freeze({maxHp:ALWAYS_BEGINNER_MAX_HP,text:`최대 생명력 +${ALWAYS_BEGINNER_MAX_HP}`});

// A screen-space nameplate follows the world position. Korean text stays crisp
// on low-resolution mobile canvases and costs no WebGL texture or draw call.
// It shows the first title held (Austin's before the codex title); austin/discovered feed titles.js.
export function createSeedTitle(player,{austin=false,austinClear=false,austinVeteran=false,alwaysBeginner=false,alwaysClear=false,alwaysVeteran=false,johan=false,johanClear=false,johanVeteran=false,crosswind=false,crosswindClear=false,crosswindVeteran=false,crystal=false,crystalClear=false,crystalVeteran=false,arbor=false,arborClear=false,arborVeteran=false,discovered=0,total=Infinity,badges=[],equipped=''}={}){
 const root=document.createElement('div');root.className='seed-victory-title';root.hidden=true;document.body.append(root);
 const world=new THREE.Vector3(),corner=new THREE.Vector3(),fallbackUp=new THREE.Vector3();
 // Sprite vertices face the camera, so a fixed vertical world offset is not
 // their visible top. Cache the existing bodies once, then project their real
 // pivot/scale/roll without DOM measurements or per-frame scene traversal.
 const cachedSprites=[];player.traverse?.(o=>{if(o.isSprite&&o.material?.depthFunc!==THREE.GreaterDepth)cachedSprites.push(o);});
 let disposed=false,lastX=NaN,lastY=NaN,lastMaxWidth=0,textUnits=0;
 let current={austin:Boolean(austin),austinClear:Boolean(austinClear),austinVeteran:Boolean(austinVeteran),alwaysBeginner:Boolean(alwaysBeginner),alwaysClear:Boolean(alwaysClear),alwaysVeteran:Boolean(alwaysVeteran),johan:Boolean(johan),johanClear:Boolean(johanClear),johanVeteran:Boolean(johanVeteran),crosswind:Boolean(crosswind),crosswindClear:Boolean(crosswindClear),crosswindVeteran:Boolean(crosswindVeteran),crystal:Boolean(crystal),crystalClear:Boolean(crystalClear),crystalVeteran:Boolean(crystalVeteran),arbor:Boolean(arbor),arborClear:Boolean(arborClear),arborVeteran:Boolean(arborVeteran),discovered,total,badges:Array.isArray(badges)?[...badges]:[],equipped},state=titleState(current);
 const refresh=()=>{state=titleState(current);const text=state.shown||'';if(root.textContent!==text){root.textContent=text;textUnits=text.length;}};
 const showRoot=show=>{if(root.hidden===show)root.hidden=!show;};
 refresh();
 return {
  root,
  setUnlocked(value=true){current={...current,austin:Boolean(value)};refresh();},
  isUnlocked(){return current.austin;},
  setAustinClearUnlocked(value=true){current={...current,austinClear:Boolean(value)};refresh();},
  isAustinClearUnlocked(){return current.austinClear;},
  setAustinVeteranUnlocked(value=true){current={...current,austinVeteran:Boolean(value)};refresh();},
  isAustinVeteranUnlocked(){return current.austinVeteran;},
  setAlwaysClearUnlocked(value=true){current={...current,alwaysClear:Boolean(value)};refresh();},
  isAlwaysClearUnlocked(){return current.alwaysClear;},
  setAlwaysBeginnerUnlocked(value=true){current={...current,alwaysBeginner:Boolean(value)};refresh();},
  isAlwaysBeginnerUnlocked(){return current.alwaysBeginner;},
  setAlwaysVeteranUnlocked(value=true){current={...current,alwaysVeteran:Boolean(value)};refresh();},
  isAlwaysVeteranUnlocked(){return current.alwaysVeteran;},
  setJohanUnlocked(value=true){current={...current,johan:Boolean(value)};refresh();},
  isJohanUnlocked(){return current.johan;},
  setJohanClearUnlocked(value=true){current={...current,johanClear:Boolean(value)};refresh();},
  isJohanClearUnlocked(){return current.johanClear;},
  setJohanVeteranUnlocked(value=true){current={...current,johanVeteran:Boolean(value)};refresh();},
  isJohanVeteranUnlocked(){return current.johanVeteran;},
  setCrosswindUnlocked(value=true){current={...current,crosswind:Boolean(value)};refresh();},
  isCrosswindUnlocked(){return current.crosswind;},
  setCrosswindClearUnlocked(value=true){current={...current,crosswindClear:Boolean(value)};refresh();},
  isCrosswindClearUnlocked(){return current.crosswindClear;},
  setCrosswindVeteranUnlocked(value=true){current={...current,crosswindVeteran:Boolean(value)};refresh();},
  isCrosswindVeteranUnlocked(){return current.crosswindVeteran;},
  setCrystalUnlocked(value=true){current={...current,crystal:Boolean(value)};refresh();},
  isCrystalUnlocked(){return current.crystal;},
  setCrystalClearUnlocked(value=true){current={...current,crystalClear:Boolean(value)};refresh();},
  isCrystalClearUnlocked(){return current.crystalClear;},
  setCrystalVeteranUnlocked(value=true){current={...current,crystalVeteran:Boolean(value)};refresh();},
  isCrystalVeteranUnlocked(){return current.crystalVeteran;},
  setArborUnlocked(value=true){current={...current,arbor:Boolean(value)};refresh();},
  setArborClearUnlocked(value=true){current={...current,arborClear:Boolean(value)};refresh();},
  setArborVeteranUnlocked(value=true){current={...current,arborVeteran:Boolean(value)};refresh();},
  setDiscovered(count,total=current.total){current={...current,discovered:count,total};refresh();},
  setBadges(badges){current={...current,badges:Array.isArray(badges)?[...badges]:[]};refresh();},
  setEquipped(equipped){current={...current,equipped:typeof equipped==='string'?equipped:''};refresh();},
  state(){return state;},
  update(camera,rect,show=true){
   if(disposed)return;
   if(!state.shown||!show||player.visible===false||!camera||!rect||!Number.isFinite(rect.left)||!Number.isFinite(rect.top)||!Number.isFinite(rect.width)||!Number.isFinite(rect.height)||rect.width<=0||rect.height<=0){showRoot(false);return;}
   player.updateWorldMatrix?.(true,false);world.setFromMatrixPosition(player.matrixWorld).project(camera);
   if(world.z<=-1||world.z>=1||world.x<-1.2||world.x>1.2||world.y<-1.2||world.y>1.2){showRoot(false);return;}
   const anchorX=rect.left+(world.x+1)*rect.width*.5;
   let top=-Infinity,minX=Infinity,maxX=-Infinity;
   const sprites=Array.isArray(player.userData?.titleSprites)?player.userData.titleSprites:cachedSprites;
   for(let i=0;i<sprites.length;i++){
    const sprite=sprites[i];if(!sprite?.isSprite||sprite.visible===false||sprite.material?.visible===false||sprite.material?.opacity===0||sprite.material?.depthFunc===THREE.GreaterDepth)continue;
    let ancestor=sprite.parent,visible=true;while(ancestor){if(ancestor.visible===false){visible=false;break;}ancestor=ancestor.parent;}if(!visible)continue;
    sprite.updateWorldMatrix(true,false);
    const matrix=sprite.matrixWorld.elements,width=Math.hypot(matrix[0],matrix[1],matrix[2]),height=Math.hypot(matrix[4],matrix[5],matrix[6]);
    world.setFromMatrixPosition(sprite.matrixWorld).applyMatrix4(camera.matrixWorldInverse);if(world.z>=0&&camera.isPerspectiveCamera)continue;
    const size=sprite.material?.sizeAttenuation===false&&camera.isPerspectiveCamera?-world.z:1,angle=sprite.material?.rotation||0,c=Math.cos(angle),s=Math.sin(angle);
    for(let j=0;j<4;j++){
     const x=((j&1)-sprite.center.x)*width*size,y=((j>>1)-sprite.center.y)*height*size;
     corner.set(world.x+x*c-y*s,world.y+x*s+y*c,world.z).applyMatrix4(camera.projectionMatrix);
     if(corner.z>-1&&corner.z<1){top=Math.max(top,corner.y);minX=Math.min(minX,corner.x);maxX=Math.max(maxX,corner.x);}
    }
   }
   if(top===-Infinity){
    if(sprites.length){showRoot(false);return;}
    // Legacy/test rigs without sprite metadata keep a conservative billboard
    // top. Its screen-up direction and parent scale still follow the camera.
    world.setFromMatrixPosition(player.matrixWorld);const m=player.matrixWorld.elements;
    fallbackUp.set(0,1.65*Math.hypot(m[4],m[5],m[6]),0).applyQuaternion(camera.quaternion);world.add(fallbackUp).project(camera);top=world.y;minX=maxX=world.x;
   }
   if(maxX<-1||minX>1||top<-1){showRoot(false);return;}
   const gap=8,labelHeight=22,inset=8,maxWidth=Math.max(0,Math.min(220,rect.width-inset*2)),estimatedWidth=Math.min(maxWidth,Math.ceil(textUnits*11*1.08+textUnits*.88+22));
   const y=Math.round((rect.top+(1-top)*rect.height*.5-gap)*2)*.5;
   // At the top boundary hide the cosmetic title instead of clamping it down
   // onto the seed or the incoming attacks. Gameplay HUD keeps priority.
   if(maxWidth<30||y-labelHeight<rect.top+inset){showRoot(false);return;}
   const x=Math.round(Math.max(rect.left+inset+estimatedWidth*.5,Math.min(rect.left+rect.width-inset-estimatedWidth*.5,anchorX))*2)*.5;
   if(maxWidth!==lastMaxWidth){root.style.maxWidth=`${maxWidth}px`;lastMaxWidth=maxWidth;}
   if(x!==lastX||y!==lastY){root.style.transform=`translate3d(${x}px,${y}px,0) translate(-50%,-100%)`;lastX=x;lastY=y;}
   showRoot(true);
  },
  dispose(){if(disposed)return;disposed=true;root.hidden=true;root.remove();}
 };
}
