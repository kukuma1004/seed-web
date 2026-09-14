import * as THREE from 'three';

export const SPRITE_LIGHTING_VERSION='painted-dome-v1';

// Give painted billboards a stable top-left key light and a cool edge light.
// It keeps the one-quad sprite path while adding shape cues that survive at mobile size.
export function applySpriteLighting(material,{shadow=.78,highlight=1.08,rim=0x8fffd4,rimStrength=.08}={}){
 const color=new THREE.Color(rim);
 const key=[shadow,highlight,rimStrength,color.r,color.g,color.b].map(n=>Number(n).toFixed(4)).join(':');
 material.userData.spriteLighting={version:SPRITE_LIGHTING_VERSION,shadow,highlight,rim,rimStrength};
 material.onBeforeCompile=shader=>{
  shader.fragmentShader=shader.fragmentShader.replace('#include <map_fragment>',`#include <map_fragment>
#ifdef USE_MAP
 vec2 seedLightP=(vMapUv-vec2(.5))*2.;
 float seedLightDome=sqrt(max(.08,1.-min(1.,dot(seedLightP,seedLightP))*.72));
 vec3 seedLightN=normalize(vec3(-seedLightP.x*.55,seedLightP.y*.38,seedLightDome));
 float seedLightKey=clamp(dot(seedLightN,normalize(vec3(.45,.75,1.))) * .5 + .5,0.,1.);
 diffuseColor.rgb*=mix(${Number(shadow).toFixed(4)},${Number(highlight).toFixed(4)},seedLightKey);
 float seedLightRim=pow(clamp(1.-seedLightDome,0.,1.),2.);
 diffuseColor.rgb+=seedLightRim*vec3(${color.r.toFixed(4)},${color.g.toFixed(4)},${color.b.toFixed(4)})*${Number(rimStrength).toFixed(4)};
#endif`);
 };
 material.customProgramCacheKey=()=>`${SPRITE_LIGHTING_VERSION}:${key}`;
 material.needsUpdate=true;
 return material;
}
