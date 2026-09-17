import * as THREE from 'three';
import './seed-title.css';
import {AUSTIN_TITLE,AUSTIN_SHOT_SPEED,titleState} from './titles.js';

export {AUSTIN_TITLE};
// Kept for the Austin victory toast; every title's rules live in titles.js.
export const AUSTIN_TITLE_PERK=Object.freeze({shotSpeed:1+AUSTIN_SHOT_SPEED,text:`기본 탄환 속도 +${AUSTIN_SHOT_SPEED*100}%`});

// A screen-space nameplate follows the world position. Korean text stays crisp
// on low-resolution mobile canvases and costs no WebGL texture or draw call.
// It shows the first title held (Austin's before the codex title); austin/discovered feed titles.js.
export function createSeedTitle(player,{austin=false,discovered=0,total=Infinity,badges=[]}={}){
 const root=document.createElement('div');root.className='seed-victory-title';root.hidden=true;document.body.append(root);
 const world=new THREE.Vector3(),lift=new THREE.Vector3(0,1.42,0);
 let current={austin:Boolean(austin),discovered,total,badges:Array.isArray(badges)?[...badges]:[]},state=titleState(current);
 const refresh=()=>{state=titleState(current);if(root.textContent!==(state.shown||''))root.textContent=state.shown||'';};
 refresh();
 return {
  root,
  setUnlocked(value=true){current={...current,austin:Boolean(value)};refresh();},
  isUnlocked(){return current.austin;},
  setDiscovered(count,total=current.total){current={...current,discovered:count,total};refresh();},
  setBadges(badges){current={...current,badges:Array.isArray(badges)?[...badges]:[]};refresh();},
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
