import * as THREE from 'three';

// One authored atlas, six functional silhouettes. UV samplers share its Source;
// they never mutate the loader's image or the older canvas-mode facility atlas.
export const CRYSTAL_GARDEN_ART='assets/expansion/crystal-conservatory-props-v1.webp';
export const CRYSTAL_GARDEN_MOBILE_ART='assets/expansion/crystal-conservatory-props-mobile-v1.webp';
export const CRYSTAL_TURRET_ART='assets/expansion/crystal-turret-growth-v1.webp';
export const CRYSTAL_TURRET_MOBILE_ART='assets/expansion/crystal-turret-growth-mobile-v1.webp';
export const CRYSTAL_GARDEN_FRAMES=Object.freeze({crystal:0,heart:1,turret:2,snare:3,wall:4,plinth:5});
export function crystalGardenTexture(atlas,kind){
 const index=CRYSTAL_GARDEN_FRAMES[kind];if(index===undefined)throw Error('Unknown conservatory prop '+kind);
 const texture=atlas.clone();texture.repeat.set(1/3,1/2);texture.offset.set((index%3)/3,index<3?1/2:0);texture.needsUpdate=true;return texture;
}
export function crystalGardenArtStyle(kind){
 const index=CRYSTAL_GARDEN_FRAMES[kind];if(index===undefined)throw Error('Unknown conservatory prop '+kind);
 return {backgroundSize:'300% 200%',backgroundPosition:`${index%3*50}% ${index<3?0:100}%`};
}
export function crystalTurretTexture(atlas,level){
 if(!Number.isInteger(level)||level<2||level>5)throw Error('Unknown turret growth '+level);
 const index=level-2,texture=atlas.clone();texture.repeat.set(.5,.5);texture.offset.set((index%2)*.5,index<2?.5:0);texture.needsUpdate=true;return texture;
}
export function crystalGardenFloorContactTexture(){
 const pixels=new Uint8Array(64*64*4);
 for(let y=0;y<64;y++)for(let x=0;x<64;x++){
  const i=(y*64+x)*4,d=Math.min(1,Math.hypot(x-31.5,y-31.5)/31.5);
  pixels[i]=8;pixels[i+1]=24;pixels[i+2]=22;pixels[i+3]=Math.round(160*(1-d)*(1-d));
 }
 const texture=new THREE.DataTexture(pixels,64,64);texture.colorSpace=THREE.SRGBColorSpace;texture.minFilter=texture.magFilter=THREE.LinearFilter;texture.needsUpdate=true;return texture;
}
