// Baked directional shade over the existing painted surface, not a light or
// another overlay draw. Raw geometry UVs keep it independent of tile repeats.
export function journeySurfaceLight(material,{corridor=false,strength=1,courtPosition=false,conservatory=false}={}){
 const amount={value:strength};
 material.onBeforeCompile=shader=>{
  shader.uniforms.journeySurfaceStrength=amount;
  shader.vertexShader='varying vec2 vJourneySurface;\n'+shader.vertexShader.replace('#include <begin_vertex>',`#include <begin_vertex>\n vJourneySurface=${courtPosition?'position.xz/72.0+.5':'uv'};`);
  shader.fragmentShader='varying vec2 vJourneySurface;\nuniform float journeySurfaceStrength;\n'+shader.fragmentShader.replace('#include <map_fragment>',`#include <map_fragment>
   vec2 gardenP=vJourneySurface*2.0-1.0;
   float gardenEdge=${corridor?'smoothstep(.48,1.0,abs(gardenP.y))':'smoothstep(.40,1.1,length(gardenP*vec2(.88,1.0)))'};
   float gardenDay=1.0-smoothstep(.12,1.35,length(gardenP-vec2(-.38,.32)));
   ${courtPosition?'float stoneLuma=dot(diffuseColor.rgb,vec3(.2126,.7152,.0722)); diffuseColor.rgb=mix(diffuseColor.rgb,vec3(stoneLuma)*vec3(.91,1.0,1.03),.38);':''}
   ${conservatory?'float stoneLuma=dot(diffuseColor.rgb,vec3(.2126,.7152,.0722)); diffuseColor.rgb=mix(diffuseColor.rgb,vec3(stoneLuma)*vec3(.96,1.0,1.02),.22*journeySurfaceStrength);':''}
   vec3 gardenShade=mix(vec3(1.0),vec3(.60,.72,.77),gardenEdge*${corridor?'.52':'.58'});
   gardenShade+=vec3(${corridor?'.12,.078,.025':'.095,.081,.045'})*gardenDay;
   diffuseColor.rgb*=mix(vec3(1.0),gardenShade,journeySurfaceStrength);`);
 };
 material.customProgramCacheKey=()=>`journey-surface-v2-${corridor}-${courtPosition}-${conservatory}`;
 return {setStrength:value=>{amount.value=value;}};
}
