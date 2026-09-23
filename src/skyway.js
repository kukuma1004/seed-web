import * as THREE from 'three';

const FAR_RAIN=18,NEAR_RAIN=12,ROUTE_ASPECT=768/1365;
export function createSkyway(scene,{lights=[],hide=[],mobile=false}={}){
 const group=new THREE.Group();group.name='act3-skyway';group.visible=false;scene.add(group);
 // The art already contains perspective. Face it toward the camera, behind all
 // combat, rather than projecting the painted cliffs onto a horizontal floor.
 const floorMat=new THREE.MeshBasicMaterial({color:0xcbd4dc,toneMapped:false,fog:false,depthWrite:false});
 const edgeMat=new THREE.MeshBasicMaterial({color:0xbce9ee,transparent:true,opacity:.25,depthWrite:false,toneMapped:false,fog:false});
 const cloudMat=new THREE.MeshBasicMaterial({color:0xe4faff,transparent:true,opacity:.42,depthWrite:false,toneMapped:false,fog:false});
 const darkMat=new THREE.MeshBasicMaterial({color:0x172b3d});
 const panelGeo=new THREE.PlaneGeometry(1,1),sea=new THREE.Mesh(panelGeo,floorMat);sea.renderOrder=-10;sea.frustumCulled=false;group.add(sea);
 const edgeGeo=new THREE.PlaneGeometry(.016,.86);
 const farCount=mobile?12:FAR_RAIN,nearCount=mobile?8:NEAR_RAIN;
 const edges=new THREE.InstancedMesh(edgeGeo,edgeMat,farCount),clouds=new THREE.InstancedMesh(edgeGeo,cloudMat,nearCount);group.add(edges,clouds);
 edges.frustumCulled=clouds.frustumCulled=false;edges.instanceMatrix.setUsage(THREE.DynamicDrawUsage);clouds.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
 const rain=Array.from({length:farCount+nearCount},(_,i)=>({x:-22+(i*7.13)%44,z:-22+(i*9.47)%44,s:.5+(i%5)*.17}));
 const m=new THREE.Matrix4(),p=new THREE.Vector3(),q=new THREE.Quaternion().setFromEuler(new THREE.Euler(-Math.PI/2,0,-.16)),s=new THREE.Vector3(),saved=new Map(),hidden=new Map();let active=false,distance=0,speed=6.8,map=null;
 const background=new THREE.Color('#142c38'),fog=new THREE.Color('#193a50');
 // Blend only the overlap at the route's ends. This keeps continuous forward
 // travel without a hard image seam, a mirrored island, or a second full layer.
 floorMat.onBeforeCompile=shader=>{
  shader.fragmentShader=shader.fragmentShader.replace('#include <map_fragment>',`
   #ifdef USE_MAP
    vec2 routeUv=vMapUv;
    float routeY=mod(routeUv.y,.92);
    vec4 routeColor=texture2D(map,vec2(routeUv.x,routeY+.08));
    if(routeY>.84){
     vec4 nextColor=texture2D(map,vec2(routeUv.x,routeY-.84));
     routeColor=mix(routeColor,nextColor,smoothstep(.84,.92,routeY));
    }
    float luminance=dot(routeColor.rgb,vec3(.2126,.7152,.0722));
    routeColor.rgb=mix(vec3(luminance),routeColor.rgb,.82);
    diffuseColor*=routeColor;
   #endif
  `);
 };
 floorMat.customProgramCacheKey=()=> 'act3-route-continuous-v2';
 sea.onBeforeRender=(_renderer,_scene,camera)=>{
  const depth=48,height=2*depth*Math.tan(THREE.MathUtils.degToRad(camera.fov*.5))/camera.zoom,width=height*camera.aspect;
  sea.position.set(0,0,-depth).applyQuaternion(camera.quaternion).add(camera.position);
  sea.quaternion.copy(camera.quaternion);sea.scale.set(width*1.015,height*1.015,1);sea.updateMatrixWorld();
  if(map){
   // Cover both orientations without stretching the painting or repeating its
   // entire height on tall screens. Center the crop on the open flight lane.
   const viewAspect=width/height,repeatX=Math.min(1,viewAspect/ROUTE_ASPECT),repeatY=Math.min(1,ROUTE_ASPECT/viewAspect);
   map.repeat.set(repeatX,repeatY);map.offset.set((1-repeatX)*.5,(distance*.0045)%.92);map.updateMatrix();
  }
 };
 function loadArt(){
  if(map||typeof document==='undefined')return;
  map=new THREE.TextureLoader().load(`${import.meta.env.BASE_URL}assets/${mobile?'mobile/':''}act3-storm-route-v1.webp`);
  map.colorSpace=THREE.SRGBColorSpace;map.wrapS=THREE.ClampToEdgeWrapping;map.wrapT=THREE.ClampToEdgeWrapping;map.anisotropy=1;
  floorMat.map=map;floorMat.needsUpdate=true;
 }
 function updateInstances(){
  for(let i=0;i<rain.length;i++){const f=rain[i],near=i>=farCount;p.set(f.x,near?.3:-.7,f.z);s.set(near?1.1:.7,f.s*(near?1.55:1),1);m.compose(p,q,s);(near?clouds:edges).setMatrixAt(near?i-farCount:i,m);}
  edges.instanceMatrix.needsUpdate=clouds.instanceMatrix.needsUpdate=true;
 }
 updateInstances();
 return {
  group,coverMaterial:edgeMat,boundaryMaterials:{dark:floorMat,armor:edgeMat,stone:edgeMat},materials:[floorMat,edgeMat,cloudMat,darkMat],geometries:[panelGeo,edgeGeo],
  setActive(on){
   if(on===active)return;active=on;group.visible=on;
   if(on){loadArt();saved.set('background',scene.background?.clone());saved.set('fog',scene.fog?.color.clone());saved.set('density',scene.fog?.density);for(const light of lights)saved.set(light,{intensity:light.intensity,color:light.color.clone()});if(scene.background)scene.background.copy(background);if(scene.fog){scene.fog.color.copy(fog);scene.fog.density=.018;}for(const light of lights){light.intensity*=light.isHemisphereLight?.8:1.14;light.color.lerp(new THREE.Color(0xb8ddff),.5);}for(const object of hide){hidden.set(object,object.visible);object.visible=false;}}
   else {if(scene.background&&saved.get('background'))scene.background.copy(saved.get('background'));if(scene.fog&&saved.get('fog')){scene.fog.color.copy(saved.get('fog'));scene.fog.density=saved.get('density');}for(const light of lights){const v=saved.get(light);if(v){light.intensity=v.intensity;light.color.copy(v.color);}}for(const object of hide)if(hidden.has(object))object.visible=hidden.get(object);hidden.clear();}
  },
  tick(dt,running=true){if(!active||!running)return;const travel=dt*speed;distance+=travel;for(let i=0;i<rain.length;i++){const f=rain[i];f.z=((f.z+22+travel*(i<farCount?1.05:1.8))%44+44)%44-22;}updateInstances();},
  setSpeed(value){speed=Math.max(0,Math.min(9,Number(value)||0));},
  state:()=>({active,distance:+distance.toFixed(1),speed,drawCalls:3,instances:rain.length,openEnds:true,parallaxLayers:3})
 };
}
