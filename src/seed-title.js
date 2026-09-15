import * as THREE from 'three';
import './seed-title.css';

export const AUSTIN_TITLE='정시를 깨운 자';

// A screen-space nameplate follows the world position. Korean text stays crisp
// on low-resolution mobile canvases and costs no WebGL texture or draw call.
export function createSeedTitle(player,unlocked=false){
 const root=document.createElement('div');root.className='seed-victory-title';root.textContent=AUSTIN_TITLE;root.hidden=true;document.body.append(root);
 const world=new THREE.Vector3(),lift=new THREE.Vector3(0,1.42,0);let enabled=Boolean(unlocked);
 return {
  root,
  setUnlocked(value=true){enabled=Boolean(value);},
  isUnlocked(){return enabled;},
  update(camera,rect,show=true){
   if(!enabled||!show){root.hidden=true;return;}
   world.copy(player.position).add(lift).project(camera);
   const visible=world.z>-1&&world.z<1&&world.x>-1.15&&world.x<1.15&&world.y>-1.15&&world.y<1.15;
   root.hidden=!visible;if(!visible)return;
   root.style.left=`${rect.left+(world.x+1)*rect.width/2}px`;root.style.top=`${rect.top+(1-world.y)*rect.height/2}px`;
  },
  dispose(){root.remove();}
 };
}
