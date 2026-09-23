import * as THREE from 'three';

// The companion is cosmetic. Boss discoveries are the sole unlock source;
// developer-lab victories do not enter discoveries and therefore unlock nothing.
export const BOSS_PET_KEY='seed-boss-pet-v1';
export const BOSS_PETS=Object.freeze({
 austin:Object.freeze({id:'austin',name:'꼬마 오스틴',boss:'정시파이터 오스틴',file:'boss-pet-austin-v1.png',size:.69}),
 alwaysbeginner:Object.freeze({id:'alwaysbeginner',name:'꼬마 초심',boss:'항상초심',file:'boss-pet-always-beginner-v1.png',size:.72}),
 tempestcarrier:Object.freeze({id:'tempestcarrier',name:'꼬마 요한',boss:'폭풍비행사 요한',file:'boss-pet-johan-v1.png',size:.72})
});

export const unlockedBossPets=profile=>Object.values(BOSS_PETS).filter(pet=>Array.isArray(profile?.bosses)&&profile.bosses.includes(pet.id));
export const normalizeBossPet=value=>({version:1,id:typeof value?.id==='string'&&Object.hasOwn(BOSS_PETS,value.id)?value.id:null,updatedAt:Number.isSafeInteger(value?.updatedAt)&&value.updatedAt>=0?value.updatedAt:0});

export function readBossPet(storage,profile){
 let saved;try{saved=normalizeBossPet(JSON.parse(storage?.getItem(BOSS_PET_KEY)));}catch{saved=normalizeBossPet(null);}
 // A selection from another device never grants a pet without its boss record.
 return {...saved,id:unlockedBossPets(profile).some(pet=>pet.id===saved.id)?saved.id:null};
}

export function writeBossPet(storage,profile,id,updatedAt=Date.now()){
 if(id!==null&&!unlockedBossPets(profile).some(pet=>pet.id===id))return {saved:false,selection:readBossPet(storage,profile)};
 const selection=normalizeBossPet({id,updatedAt});
 try{storage?.setItem(BOSS_PET_KEY,JSON.stringify(selection));return {saved:true,selection};}
 catch{return {saved:false,selection};}
}

// Pure target/step helpers keep pet movement testable without a WebGL context.
export function bossPetTarget(playerX,playerZ,headingX=0,headingZ=1,out={}){
 const length=Math.hypot(headingX,headingZ)||1,hx=headingX/length,hz=headingZ/length;
 out.x=playerX-hx*.82+hz*.42;out.z=playerZ-hz*.82-hx*.42;return out;
}
export function stepBossPet(position,target,dt,out={}){
 const gap=Math.hypot(position.x-target.x,position.z-target.z);
 if(gap>5){out.x=target.x;out.z=target.z;return out;} // Room transition/teleport: no across-screen flight.
 const blend=1-Math.exp(-Math.min(Math.max(dt,0),.05)*8.5);
 out.x=position.x+(target.x-position.x)*blend;out.z=position.z+(target.z-position.z)*blend;return out;
}

// One sprite, one loaded texture and one draw call; no collision, stats or combat hooks.
export function createBossPet(scene,{profile,id=null}={}){
 const sprite=new THREE.Sprite(new THREE.SpriteMaterial({transparent:true,alphaTest:.06,depthWrite:false,toneMapped:false}));
 sprite.name='cosmetic-boss-pet';sprite.center.set(.5,.065);sprite.visible=false;scene.add(sprite);
 const loader=new THREE.TextureLoader();
 let current=null,map=null,first=true,lastX=0,lastZ=0,headingX=0,headingZ=1,clock=0;
 const target={x:0,z:0},next={x:0,z:0};
 const equip=(nextId,nextProfile=profile)=>{
  const next=unlockedBossPets(nextProfile).find(pet=>pet.id===nextId)||null;
  if(current?.id===next?.id)return current?.id||null;
  if(map){map.dispose();map=null;}
  current=next;sprite.visible=Boolean(next);sprite.material.map=null;sprite.material.needsUpdate=true;
  if(!next)return null;
  const base=import.meta.env?.BASE_URL||'/';
  map=loader.load(base+'assets/'+next.file);map.colorSpace=THREE.SRGBColorSpace;
  sprite.material.map=map;sprite.material.needsUpdate=true;
  sprite.scale.set(next.size,next.size,1);first=true;
  return next.id;
 };
 const update=(dt,player,{visible=true}={})=>{
  if(!current||!player)return;
  const dx=player.x-lastX,dz=player.z-lastZ;
  if(!first&&Math.hypot(dx,dz)>.015&&Math.hypot(dx,dz)<5){const length=Math.hypot(dx,dz);headingX=dx/length;headingZ=dz/length;}
  lastX=player.x;lastZ=player.z;
  bossPetTarget(player.x,player.z,headingX,headingZ,target);
  if(first){sprite.position.set(target.x,.12,target.z);first=false;}
  else{stepBossPet(sprite.position,target,dt,next);sprite.position.x=next.x;sprite.position.z=next.z;}
  clock+=Math.min(Math.max(dt,0),.05);
  sprite.position.y=.12+Math.sin(clock*5.4)*.027;
  sprite.visible=Boolean(visible);
 };
 const dispose=()=>{scene.remove(sprite);sprite.material.dispose();map?.dispose();map=null;current=null;};
 equip(id,profile);
 return {sprite,equip,update,dispose,get id(){return current?.id||null;}};
}
