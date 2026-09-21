import * as THREE from 'three';

// v2 (2026-09-21): 같은 계산을 재질마다 다른 숫자로 셰이더에 박아 넣던 것을 유니폼으로 옮겼다.
// 예전에는 명암·테두리 빛 값이 다른 적 그림마다 셰이더를 따로 컴파일해서, 새 적이 처음 나올 때마다 화면이 멈칫했다.
// 이제 모든 그림이 셰이더 하나를 함께 쓰고, 값은 예전과 같은 소수 넷째 자리까지 그대로라 화면은 똑같다.
export const SPRITE_LIGHTING_VERSION='painted-dome-v2';

const fixed=n=>Number(Number(n).toFixed(4));
// Give painted billboards a stable top-left key light and a cool edge light.
// It keeps the one-quad sprite path while adding shape cues that survive at mobile size.
export function applySpriteLighting(material,{shadow=.78,highlight=1.08,rim=0x8fffd4,rimStrength=.08}={}){
 const color=new THREE.Color(rim);
 const values={shadow:fixed(shadow),highlight:fixed(highlight),rim:new THREE.Vector3(fixed(color.r),fixed(color.g),fixed(color.b)),strength:fixed(rimStrength)};
 material.userData.spriteLighting={version:SPRITE_LIGHTING_VERSION,shadow,highlight,rim,rimStrength};
 material.onBeforeCompile=shader=>{
  shader.uniforms=shader.uniforms||{};
  shader.uniforms.seedLightShadow={value:values.shadow};
  shader.uniforms.seedLightHighlight={value:values.highlight};
  shader.uniforms.seedLightRimColor={value:values.rim};
  shader.uniforms.seedLightRimStrength={value:values.strength};
  const declare='uniform float seedLightShadow;\nuniform float seedLightHighlight;\nuniform vec3 seedLightRimColor;\nuniform float seedLightRimStrength;\n';
  shader.fragmentShader=shader.fragmentShader.includes('#include <common>')?shader.fragmentShader.replace('#include <common>',`#include <common>\n${declare}`):declare+shader.fragmentShader;
  shader.fragmentShader=shader.fragmentShader.replace('#include <map_fragment>',`#include <map_fragment>
#ifdef USE_MAP
 vec2 seedLightP=(vMapUv-vec2(.5))*2.;
 float seedLightDome=sqrt(max(.08,1.-min(1.,dot(seedLightP,seedLightP))*.72));
 vec3 seedLightN=normalize(vec3(-seedLightP.x*.55,seedLightP.y*.38,seedLightDome));
 float seedLightKey=clamp(dot(seedLightN,normalize(vec3(.45,.75,1.))) * .5 + .5,0.,1.);
 diffuseColor.rgb*=mix(seedLightShadow,seedLightHighlight,seedLightKey);
 float seedLightRim=pow(clamp(1.-seedLightDome,0.,1.),2.);
 diffuseColor.rgb+=seedLightRim*seedLightRimColor*seedLightRimStrength;
#endif`);
 };
 // 값이 셰이더 밖(유니폼)에 있으니 모든 그림이 같은 키를 쓴다.
 material.customProgramCacheKey=()=>SPRITE_LIGHTING_VERSION;
 material.needsUpdate=true;
 return material;
}
