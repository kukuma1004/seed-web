import * as THREE from 'three';

const BASE=import.meta.env?.BASE_URL||'./';
// Measured cells of the generated source. The wide planter deliberately uses
// a wider cell than the upright pillar; no stretched square props.
const REGIONS=[[.006,.008,.588,.444],[.625,.004,.978,.466],[.012,.449,.508,.992],[.510,.493,.991,.994]];
const CAPACITY=96;
export function createJourneyWorldKit(parent,{lowQuality=false,loader=null,base=BASE}={}){
 const root=new THREE.Group();root.name='journey-authored-world-kit';root.visible=false;parent.add(root);
 const geometry=new THREE.PlaneGeometry(1,1).translate(0,.5,0).rotateX(-Math.PI/4);
 geometry.setAttribute('kitRegion',new THREE.InstancedBufferAttribute(new Float32Array(CAPACITY*4),4));
 const material=new THREE.MeshBasicMaterial({transparent:true,alphaTest:.1,depthWrite:false,toneMapped:false,side:THREE.DoubleSide,forceSinglePass:true});
 material.onBeforeCompile=shader=>{
  shader.vertexShader='attribute vec4 kitRegion;\n'+shader.vertexShader.replace('#include <uv_vertex>','#include <uv_vertex>\n#ifdef USE_MAP\n vMapUv=kitRegion.xy+vMapUv*kitRegion.zw;\n#endif');
 };
 material.customProgramCacheKey=()=> 'journey-world-kit-v1';
 const mesh=new THREE.InstancedMesh(geometry,material,CAPACITY);mesh.name='journey-flower-masonry-and-landmarks';mesh.count=0;mesh.instanceMatrix.setUsage(THREE.StaticDrawUsage);root.add(mesh);
 const pose=new THREE.Object3D(),tint=new THREE.Color();let texture=null,started=false,ready=false,active=false,disposed=false,layoutKey='',writes=0,positionScaleX=1,positionScaleZ=1;
 const refresh=()=>{root.visible=!disposed&&active&&ready&&mesh.count>0;};
 function load(){
  if(started||disposed||!loader&&(typeof document==='undefined'||typeof document.createElementNS!=='function'))return;
  started=true;
  const setup=t=>{t.colorSpace=THREE.SRGBColorSpace;t.generateMipmaps=false;t.minFilter=THREE.LinearFilter;t.magFilter=THREE.LinearFilter;};
  try{texture=(loader||new THREE.TextureLoader()).load(base+'assets/journey/journey-world-kit-v1'+(lowQuality?'-mobile':'')+'.webp',t=>{
   if(disposed){if(t!==texture)t.dispose();return;}texture=t;setup(t);material.map=t;material.needsUpdate=true;ready=true;refresh();
  },undefined,()=>{ready=false;refresh();});if(texture)setup(texture);}catch{ready=false;}
 }
 function add(tile,x,z,width,height,y=.06,color=0xffffff,flip=false){
  if(mesh.count>=CAPACITY)return;
  const index=mesh.count++,[x0,y0,x1,y1]=REGIONS[tile];
  pose.position.set(x*positionScaleX,y,z*positionScaleZ);pose.rotation.set(0,0,0);pose.scale.set(width,height,height);pose.updateMatrix();mesh.setMatrixAt(index,pose.matrix);
  tint.setHex(color);mesh.setColorAt(index,tint);
  geometry.getAttribute('kitRegion').setXYZW(index,flip?x1:x0,1-y1,(x1-x0)*(flip?-1:1),y1-y0);writes++;
 }
 function setLayout(layout,{x=0,z=0,sector=0,positionScaleX:scaleX=1,positionScaleZ:scaleZ=1}={}){
  if(disposed)return;const act=layout?.act||'arbor',key=layout?`${act}:${layout.room}:${layout.round}:${x}:${z}:${layout.courseLength??''}`:`arbor:${sector}:${scaleX}:${scaleZ}`;
  if(key===layoutKey)return;layoutKey=key;positionScaleX=Number.isFinite(scaleX)&&scaleX>0?scaleX:1;positionScaleZ=Number.isFinite(scaleZ)&&scaleZ>0?scaleZ:1;mesh.count=0;
  if(layout&&!['skyway','crosswind','crystalGorge'].includes(act)){refresh();return;}
  if(act==='skyway'){
   // Islands remain outside the exact route. Their bottom-hung rock is below
   // the flight plane, so the nearby silhouette never covers an active seed.
   for(const [px,pz,w,h]of [[-18,-10,6,7],[18,-7,6.5,7.5],[-19,6,7,8],[19,11,6,7],[-9,-17,4.2,5],[8,-18,5,6]])add(2,px,pz,w,h,-2.3,0xe2ecf0,px>0);
  }else if(act==='crosswind'){
   const length=layout.courseLength||60,step=lowQuality?10:7.5;
   for(let along=-5;along<length+6;along+=step)for(const side of [-1,1]){
    add(0,x+along,z+(side<0?-10.4:11.6),5.5,3.1,.06,side<0?0xfff4d4:0xd3ddc9,side>0);
    if(Math.round((along+5)/step)%2===0)add(1,x+along+3.1,z+(side<0?-11.0:12.0),1.7,3.4,.06,0xfff1ce);
   }
  }else if(act==='crystalGorge'){
   for(const side of [-1,1]){
    for(const px of [-10,-3.5,3.5,10])add(0,px,side<0?-12.6:14.7,5.0,2.8,.06,side<0?0xf3e8dc:0xd4e0ed,px>0);
    for(const pz of [-7,0,7])add(0,side*16.2,pz,5.0,2.8,.06,0xdde7df,side>0);
    for(const pz of [-9,8])add(1,side*15.2,pz,1.65,3.5,.06,0xffeed0);
   }
  }else{
   for(const side of [-1,1]){
    for(const px of [-10,-3.5,3.5,10])add(0,px,side<0?-13.6:15.0,5.7,3.25,.06,side<0?0xfff2d1:0xd3dfbe,px>0);
    for(const pz of [-8,-1,6])add(0,side*17.2,pz,5.6,3.3,.06,0xdfebcf,side>0);
    for(const pz of [-10,8])add(1,side*16.1,pz,1.8,3.6,.06,0xffe9ba);
   }
   add(3,-10,-14.7,6.8,7,.06,0xe6eed2);add(3,11,-15.5,6.8,7,.06,0xf6ecd0,true);
  }
  // Dress actual cover, never unrelated passable floor. Shallow flowers are
  // shorter than a player and retain the physical stone footprint beneath.
  for(const c of (Array.isArray(layout?.cover)?layout.cover:[]).slice(0,6)){
   if(!c||![c.x,c.z,c.w,c.d].every(Number.isFinite)||c.w<=0||c.d<=0)continue;
   if(act==='skyway')add(0,x+c.x,z+c.z+.12,Math.min(c.w*.96,2.9),Math.min(.95,c.w*.47),.30,0xd8e5d1,c.x>0);
   else add(0,x+c.x,z+c.z+.12,Math.min(c.w*.98,3.2),Math.min(1.05,c.w*.47),.28,0xfff3d9,c.x>0);
  }
  mesh.instanceMatrix.needsUpdate=true;if(mesh.instanceColor)mesh.instanceColor.needsUpdate=true;geometry.getAttribute('kitRegion').needsUpdate=true;mesh.computeBoundingSphere();refresh();
 }
 function setActive(value){active=!!value;if(active)load();refresh();}
 function dispose(){if(disposed)return;disposed=true;root.removeFromParent();mesh.dispose();geometry.dispose();material.dispose();texture?.dispose();}
 return {setLayout,setActive,dispose,diagnostics:()=>({active:root.visible,ready,instances:mesh.count,capacity:CAPACITY,drawCalls:root.visible?1:0,geometries:1,materials:1,textures:texture?1:0,triangles:mesh.count*2,matrixWrites:writes,lights:0,raf:0,collisionOwned:false})};
}
