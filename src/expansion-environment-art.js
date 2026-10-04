import * as THREE from 'three';

// These are finite environment plates, not seamless repeat tiles. The stone
// band in Act 4 is centred over the real +/-7 corridor, with scenery outside it.
export const EXPANSION_ENVIRONMENTS=Object.freeze({
 crosswind:Object.freeze({file:'act4-crosswind-plate',width:180,depth:44,x:70,z:1.76}),
 crystalGorge:Object.freeze({file:'act5-crystal-gorge-plate',width:48,depth:38,x:0,z:0})
});

export function createExpansionEnvironmentArt({loader,baseUrl='',mobile=false}={}){
 const pending=new Map(),textures=new Map();let disposed=false;
 const prefix=baseUrl&&!baseUrl.endsWith('/')?baseUrl+'/':baseUrl;
 function load(act){
  const definition=EXPANSION_ENVIRONMENTS[act]||(act==='cover'?{file:'crystal-cover'}:null);if(!definition||disposed)return Promise.resolve(null);
  if(textures.has(act))return Promise.resolve(textures.get(act));
  if(pending.has(act))return pending.get(act);
  const url=prefix+'assets/expansion/'+definition.file+(mobile&&act!=='cover'?'-mobile':'')+'-v1.webp';
  const job=Promise.resolve().then(()=>loader.loadAsync(url)).then(texture=>{
   if(disposed){texture.dispose();return null;}
   texture.colorSpace=THREE.SRGBColorSpace;texture.wrapS=texture.wrapT=THREE.ClampToEdgeWrapping;
   texture.repeat.set(1,1);texture.offset.set(0,0);texture.minFilter=THREE.LinearMipmapLinearFilter;texture.magFilter=THREE.LinearFilter;
   textures.set(act,texture);return texture;
  }).finally(()=>pending.delete(act));pending.set(act,job);return job;
 }
 return {load,loadCover:()=>load('cover'),dispose(){if(disposed)return;disposed=true;for(const texture of textures.values())texture.dispose();textures.clear();},get loaded(){return textures.size;}};
}
