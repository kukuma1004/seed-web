// Baked directional shade over the existing painted surface, not a light or
// another overlay draw. Raw geometry UVs keep it independent of tile repeats.
export function journeySurfaceLight(material,{corridor=false,strength=1,courtPosition=false,conservatory=false}={}){
 const amount={value:strength};
 material.onBeforeCompile=shader=>{
  shader.uniforms.journeySurfaceStrength=amount;
  shader.vertexShader='varying vec2 vJourneySurface;\nvarying vec2 vJourneyStoneWorld;\n'+shader.vertexShader.replace('#include <begin_vertex>',`#include <begin_vertex>\n vJourneySurface=${courtPosition?'position.xz/72.0+.5':'uv'};\n vJourneyStoneWorld=(modelMatrix*vec4(position,1.0)).xz;`);
  shader.fragmentShader='varying vec2 vJourneySurface;\nvarying vec2 vJourneyStoneWorld;\nuniform float journeySurfaceStrength;\n'+shader.fragmentShader.replace('#include <map_fragment>',`#include <map_fragment>
   vec2 gardenP=vJourneySurface*2.0-1.0;
   float gardenEdge=${corridor?'smoothstep(.48,1.0,abs(gardenP.y))':'smoothstep(.40,1.1,length(gardenP*vec2(.88,1.0)))'};
   float gardenDay=1.0-smoothstep(.12,1.35,length(gardenP-vec2(-.38,.32)));
   ${courtPosition?'float stoneLuma=dot(diffuseColor.rgb,vec3(.2126,.7152,.0722)); diffuseColor.rgb=mix(diffuseColor.rgb,vec3(stoneLuma)*vec3(.91,1.0,1.03),.38);':''}
   ${conservatory?'float stoneLuma=dot(diffuseColor.rgb,vec3(.2126,.7152,.0722)); diffuseColor.rgb=mix(diffuseColor.rgb,vec3(stoneLuma)*vec3(.96,1.0,1.02),.22*journeySurfaceStrength);':''}
   vec3 gardenShade=mix(vec3(1.0),vec3(.60,.72,.77),gardenEdge*${corridor?'.52':'.58'});
   gardenShade+=vec3(${corridor?'.12,.078,.025':'.095,.081,.045'})*gardenDay;
   // Broad projected canopy forms are lighting, not another repeated floor.
   // Six bounded ellipses share the existing surface draw and map sample.
   vec2 lightP=vJourneyStoneWorld;
   ${corridor?'lightP.x=mod(lightP.x+7.0,14.0)-7.0;':''}
   float canopy=0.0;
   canopy=max(canopy,1.0-smoothstep(.65,1.15,length((lightP-vec2(-6.0,-4.0))*vec2(.28,.54))));
   canopy=max(canopy,1.0-smoothstep(.60,1.10,length((lightP-vec2(-3.8,-6.3))*vec2(.54,.32))));
   canopy=max(canopy,1.0-smoothstep(.62,1.10,length((lightP-vec2(4.8,5.2))*vec2(.37,.60))));
   canopy=max(canopy,1.0-smoothstep(.55,1.08,length((lightP-vec2(7.2,2.7))*vec2(.55,.32))));
   canopy=max(canopy,1.0-smoothstep(.65,1.12,length((lightP-vec2(-1.0,7.8))*vec2(.45,.62))));
   canopy=max(canopy,1.0-smoothstep(.63,1.10,length((lightP-vec2(3.0,-8.5))*vec2(.60,.35))));
   float sunRibbon=1.0-smoothstep(1.6,5.3,abs(lightP.x*.64+lightP.y*.77-1.4));
   vec3 directional=mix(vec3(1.10,1.075,.98),vec3(.56,.68,.70),canopy*.72);
   directional+=vec3(.18,.12,.035)*sunRibbon*(1.0-canopy*.6);
   diffuseColor.rgb*=mix(vec3(1.0),gardenShade*directional,journeySurfaceStrength);`);
 };
 material.customProgramCacheKey=()=>`journey-surface-v3-${corridor}-${courtPosition}-${conservatory}`;
 return {setStrength:value=>{amount.value=value;}};
}
