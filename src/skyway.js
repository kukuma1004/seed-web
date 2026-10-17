import * as THREE from 'three';

const FAR_RAIN=18,NEAR_RAIN=12,ROUTE_ASPECT=16/9,COVER_OVERSCAN=1.025;
export function createSkyway(scene,{lights=[],hide=[],mobile=false}={}){
 const group=new THREE.Group();group.name='act3-skyway';group.visible=false;scene.add(group);
 // Perspective belongs to the painting. A camera-facing cover stays behind
 // combat, preserves its source aspect and never repeats or flips the gardens.
 const floorMat=new THREE.MeshBasicMaterial({color:0xffffff,toneMapped:false,fog:false,depthWrite:false});
 // Grade the existing sample before Three's output conversion. The central
 // combat lane compresses cloud contrast and chroma into a quiet storm-blue
 // midground; the peripheral garden painting keeps its original detail/value.
 // This is part of the opaque background draw, not a veil over combat actors.
 floorMat.onBeforeCompile=shader=>{
  shader.vertexShader='varying vec2 vSkywayFrameUv;\n'+shader.vertexShader.replace('#include <begin_vertex>','#include <begin_vertex>\n vSkywayFrameUv=uv;');
  shader.fragmentShader='varying vec2 vSkywayFrameUv;\n'+shader.fragmentShader.replace('#include <map_fragment>',`#include <map_fragment>
   float skywayRadius=length((vSkywayFrameUv-vec2(.5,.49))*vec2(1.36,1.0));
   float skywayQuiet=(1.0-smoothstep(.18,.66,skywayRadius))*${mobile?'.92':'.86'};
   float skywayLuma=dot(diffuseColor.rgb,vec3(.2126,.7152,.0722));
   vec3 skywayQuietColor=mix(vec3(skywayLuma),diffuseColor.rgb,.48);
   skywayQuietColor=mix(vec3(.015,.027,.045),skywayQuietColor,.42);
   diffuseColor.rgb=mix(diffuseColor.rgb,skywayQuietColor,skywayQuiet);`);
 };
 floorMat.customProgramCacheKey=()=>mobile?'skyway-painted-hierarchy-mobile-v1':'skyway-painted-hierarchy-v1';
 const edgeMat=new THREE.MeshBasicMaterial({color:0xbce9ee,transparent:true,opacity:.14,depthWrite:false,toneMapped:false,fog:false});
 const cloudMat=new THREE.MeshBasicMaterial({color:0xe4faff,transparent:true,opacity:.22,depthWrite:false,toneMapped:false,fog:false});
 // Keep a sense of travel in the margins without decorative rain crossing
 // the seed/threat focal area at full contrast. Both batches share a program;
 // no texture, uniform clock, new draw, or per-frame material update is needed.
 for(const material of[edgeMat,cloudMat]){
  material.onBeforeCompile=shader=>{
   shader.vertexShader='varying float vSkywayRainSide;\n'+shader.vertexShader.replace('#include <project_vertex>','#include <project_vertex>\n vSkywayRainSide=gl_Position.x/gl_Position.w;');
   shader.fragmentShader='varying float vSkywayRainSide;\n'+shader.fragmentShader.replace('#include <opaque_fragment>','diffuseColor.a*=mix(.2,1.0,smoothstep(.26,.74,abs(vSkywayRainSide)));\n #include <opaque_fragment>');
  };
  material.customProgramCacheKey=()=> 'skyway-rain-margins-v1';
 }
 const darkMat=new THREE.MeshBasicMaterial({color:0x172b3d});
 const panelGeo=new THREE.PlaneGeometry(1,1),sea=new THREE.Mesh(panelGeo,floorMat);sea.name='skyway-painted-route';sea.renderOrder=-10;sea.frustumCulled=false;group.add(sea);
 const edgeGeo=new THREE.PlaneGeometry(.016,.86);
 const farCount=mobile?12:FAR_RAIN,nearCount=mobile?8:NEAR_RAIN;
 const edges=new THREE.InstancedMesh(edgeGeo,edgeMat,farCount),clouds=new THREE.InstancedMesh(edgeGeo,cloudMat,nearCount);edges.name='skyway-far-rain';clouds.name='skyway-near-rain';group.add(edges,clouds);
 edges.frustumCulled=clouds.frustumCulled=false;edges.instanceMatrix.setUsage(THREE.DynamicDrawUsage);clouds.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
 const rain=Array.from({length:farCount+nearCount},(_,i)=>({x:-22+(i*7.13)%44,z:-22+(i*9.47)%44,s:.5+(i%5)*.17}));
 const m=new THREE.Matrix4(),p=new THREE.Vector3(),q=new THREE.Quaternion().setFromEuler(new THREE.Euler(-Math.PI/2,0,-.16)),s=new THREE.Vector3(),savedLights=new Map(),hidden=new Map();
 let active=false,disposed=false,distance=0,speed=6.8,map=null,rainClock=0,savedBackground=null,savedFog=null,savedBackgroundColor=null,savedFogColor=null,savedDensity=0;
 const background=new THREE.Color('#142c38'),fog=new THREE.Color('#193a50'),lightTint=new THREE.Color(0xb8ddff);
 sea.onBeforeRender=(_renderer,_scene,camera)=>{
  if(disposed||!active)return;
  const depth=48,height=2*depth*Math.tan(THREE.MathUtils.degToRad(camera.fov*.5))/camera.zoom,width=height*camera.aspect;
  sea.position.set(0,0,-depth).applyQuaternion(camera.quaternion).add(camera.position);
  sea.quaternion.copy(camera.quaternion);sea.scale.set(width*1.015,height*1.015,1);sea.updateMatrixWorld();
  if(map){
   const source=map.image,sourceAspect=source?.width>0&&source?.height>0?source.width/source.height:ROUTE_ASPECT;
   const viewAspect=width/height,repeatX=Math.min(1,viewAspect/sourceAspect)/COVER_OVERSCAN,repeatY=Math.min(1,sourceAspect/viewAspect)/COVER_OVERSCAN;
   // A small bounded drift leaves the complete central lane quiet. The fixed
   // rain batches supply continuous forward motion without a seam shader or a
   // second full-screen sample. Both UV axes stay inside the one source image.
   const drift=.5+Math.sin(distance*.009)*.34;
   map.repeat.set(repeatX,repeatY);map.offset.set((1-repeatX)*.5,(1-repeatY)*drift);map.updateMatrix();
  }
 };
 function loadArt(){
  if(map||disposed||typeof document==='undefined')return;
  map=new THREE.TextureLoader().load(`${import.meta.env.BASE_URL}assets/${mobile?'mobile/':''}act3-storm-route-v2.webp`);
  map.colorSpace=THREE.SRGBColorSpace;map.wrapS=map.wrapT=THREE.ClampToEdgeWrapping;map.anisotropy=1;
  floorMat.map=map;floorMat.needsUpdate=true;
 }
 function updateInstances(){
  for(let i=0;i<rain.length;i++){const f=rain[i],near=i>=farCount;p.set(f.x,near?.3:-.7,f.z);s.set(near?1.1:.7,f.s*(near?1.55:1),1);m.compose(p,q,s);(near?clouds:edges).setMatrixAt(near?i-farCount:i,m);}
  edges.instanceMatrix.needsUpdate=clouds.instanceMatrix.needsUpdate=true;
 }
 function setActive(on){
  on=Boolean(on);if(disposed||on===active)return;active=on;group.visible=on;
  if(on){
   loadArt();savedBackground=scene.background;savedFog=scene.fog;savedBackgroundColor=scene.background?.isColor?scene.background.clone():null;savedFogColor=scene.fog?.color.clone();savedDensity=scene.fog?.density;
   // Preserve the original references as well as their values: other modes
   // may use a texture background or replace their fog while this view is off.
   if(scene.background?.isColor)scene.background.copy(background);else scene.background=background;
   if(scene.fog){scene.fog.color.copy(fog);scene.fog.density=.018;}
   for(const light of lights){savedLights.set(light,{intensity:light.intensity,color:light.color.clone()});light.intensity*=light.isHemisphereLight?.8:1.14;light.color.lerp(lightTint,.5);}
   for(const object of hide){hidden.set(object,object.visible);object.visible=false;}
  }else{
   scene.background=savedBackground;if(savedBackgroundColor)savedBackground.copy(savedBackgroundColor);
   scene.fog=savedFog;if(savedFogColor){savedFog.color.copy(savedFogColor);savedFog.density=savedDensity;}
   for(const[light,value]of savedLights){light.intensity=value.intensity;light.color.copy(value.color);}
   for(const[object,visible]of hidden)object.visible=visible;
   savedLights.clear();hidden.clear();savedBackground=savedFog=savedBackgroundColor=savedFogColor=null;
  }
 }
 updateInstances();
 return {
  group,coverMaterial:edgeMat,boundaryMaterials:{dark:floorMat,armor:edgeMat,stone:edgeMat},materials:[floorMat,edgeMat,cloudMat,darkMat],geometries:[panelGeo,edgeGeo],setActive,
  tick(dt,running=true,reducedMotion=false){
   if(disposed||!active)return;
   edges.visible=clouds.visible=!reducedMotion;
   if(!running||reducedMotion)return;const safe=Math.min(.1,Math.max(0,Number.isFinite(dt)?dt:0)),travel=safe*speed*(mobile?.72:1);if(travel===0)return;
   distance+=travel;for(let i=0;i<rain.length;i++){const f=rain[i];f.z=((f.z+22+travel*(i<farCount?1.05:1.8))%44+44)%44-22;}
   rainClock+=safe;if(!mobile||rainClock>=1/30){rainClock%=1/30;updateInstances();}
  },
  setSpeed(value){speed=Math.max(0,Math.min(9,Number(value)||0));},
  state:()=>({active,distance:+distance.toFixed(1),speed,drawCalls:3,instances:rain.length,openEnds:true,parallaxLayers:3,sourceAspect:map?.image?.width>0&&map?.image?.height>0?map.image.width/map.image.height:ROUTE_ASPECT,mobileMotion:mobile?.72:1,quietCombatCenter:true,backgroundSamples:1,rainInMargins:true,disposed}),
  dispose(){if(disposed)return;setActive(false);disposed=true;group.removeFromParent();map?.dispose();for(const material of[floorMat,edgeMat,cloudMat,darkMat])material.dispose();panelGeo.dispose();edgeGeo.dispose();}
 };
}
