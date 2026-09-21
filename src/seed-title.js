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
export function createSeedTitle(player,{austin=false,austinClear=false,alwaysBeginner=false,alwaysClear=false,discovered=0,total=Infinity,badges=[],equipped=''}={}){
 const root=document.createElement('div');root.className='seed-victory-title';root.hidden=true;document.body.append(root);
 const world=new THREE.Vector3(),lift=new THREE.Vector3(0,1.42,0);
 let current={austin:Boolean(austin),austinClear:Boolean(austinClear),alwaysBeginner:Boolean(alwaysBeginner),alwaysClear:Boolean(alwaysClear),discovered,total,badges:Array.isArray(badges)?[...badges]:[],equipped},state=titleState(current);
 const refresh=()=>{state=titleState(current);if(root.textContent!==(state.shown||''))root.textContent=state.shown||'';};
 refresh();
 return {
  root,
  setUnlocked(value=true){current={...current,austin:Boolean(value)};refresh();},
  isUnlocked(){return current.austin;},
  setAustinClearUnlocked(value=true){current={...current,austinClear:Boolean(value)};refresh();},
  isAustinClearUnlocked(){return current.austinClear;},
  setAlwaysClearUnlocked(value=true){current={...current,alwaysClear:Boolean(value)};refresh();},
  isAlwaysClearUnlocked(){return current.alwaysClear;},
  setAlwaysBeginnerUnlocked(value=true){current={...current,alwaysBeginner:Boolean(value)};refresh();},
  isAlwaysBeginnerUnlocked(){return current.alwaysBeginner;},
  setDiscovered(count,total=current.total){current={...current,discovered:count,total};refresh();},
  setBadges(badges){current={...current,badges:Array.isArray(badges)?[...badges]:[]};refresh();},
  setEquipped(equipped){current={...current,equipped:typeof equipped==='string'?equipped:''};refresh();},
  state(){return state;},
  update(camera,rect,show=true){
   if(!state.shown||!show){root.hidden=true;return;}
   world.copy(player.position).add(lift).project(camera);
   const visible=world.z>-1&&world.z<1&&world.x>-1.15&&world.x<1.15&&world.y>-1.15&&world.y<1.15;
   root.hidden=!visible;if(!visible)return;
   root.style.left=`${rect.left+(world.x+1)*rect.width/2}px`;root.style.top=`${rect.top+(1-world.y)*rect.height/2}px`;
  },
  dispose(){root.remove();}
 };
}
