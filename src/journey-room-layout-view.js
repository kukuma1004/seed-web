import * as THREE from 'three';
import {JOURNEY_ROOM_LAYOUT_LIMITS} from './journey-room-layouts.js';

const COVER_CAP=JOURNEY_ROOM_LAYOUT_LIMITS.cover,DECOR_CAP=JOURNEY_ROOM_LAYOUT_LIMITS.decor;
const finite=(n,fallback=0)=>Number.isFinite(n)?n:fallback;
const bounded=(n,min,max)=>Math.max(min,Math.min(max,n));
function geometry(triangles){
 const positions=[],colors=[];
 for(const [points,color]of triangles)for(const p of points){positions.push(...p);colors.push(...color);}
 const g=new THREE.BufferGeometry();g.setAttribute('position',new THREE.Float32BufferAttribute(positions,3));g.setAttribute('color',new THREE.Float32BufferAttribute(colors,3));g.computeVertexNormals();g.computeBoundingBox();return g;
}
function stoneGeometry(){
 const rim=[[-.42,-.5],[.42,-.5],[.5,-.42],[.5,.42],[.42,.5],[-.42,.5],[-.5,.42],[-.5,-.42]],out=[];
 const ring=(p,y,inset=1)=>[p[0]*inset,y,p[1]*inset];
 for(let i=0;i<rim.length;i++){
  // Vertex colours are linear. Keep the body dark enough for mossy stone;
  // .6-.8 here becomes pale plastic after the sRGB output transform.
  const a=rim[i],b=rim[(i+1)%rim.length],shade=i<3?.145:i<5?.072:.105,side=[shade*.9,shade,shade*.84];
  out.push([[ring(a,0),ring(b,.78),ring(b,0)],side],[[ring(a,0),ring(a,.78),ring(b,.78)],side]);
  const bevel=i<3?[.3,.32,.235]:i<5?[.145,.18,.115]:[.235,.27,.18];out.push([[ring(a,.78),ring(b,1,.91),ring(b,.78)],bevel],[[ring(a,.78),ring(a,1,.91),ring(b,1,.91)],bevel]);
  const cap=i%3===0?[.245,.27,.19]:i%3===1?[.185,.215,.15]:[.215,.245,.175];
  out.push([[[0,1,0],ring(b,1,.91),ring(a,1,.91)],cap]);
 }
 // Fixed branch cracks and a few chipped moss pockets share the stone batch.
 // These face triangles stay inside the existing .91 inset and add no draw.
 for(const path of [[[-.38,-.14],[-.16,-.075],[-.035,-.19],[.21,-.15]],[[.08,.39],[.13,.18],[.015,.07]],[[-.035,-.19],[-.055,-.36]]]){
  for(let i=1;i<path.length;i++){
   const [ax,az]=path[i-1],[bx,bz]=path[i],dx=bx-ax,dz=bz-az,length=Math.hypot(dx,dz),wx=-dz/length*.011,wz=dx/length*.011;
   out.push([[[ax-wx,1.006,az-wz],[bx+wx,1.006,bz+wz],[bx-wx,1.006,bz-wz]],[.045,.065,.035]],[[[ax-wx,1.006,az-wz],[ax+wx,1.006,az+wz],[bx+wx,1.006,bz+wz]],[.045,.065,.035]]);
  }
 }
 for(const [points,tint]of [
  [[[-.39,1.008,.18],[-.25,1.008,.31],[-.36,1.008,.39]],[.105,.19,.055]],
  [[[.3,1.008,-.38],[.4,1.008,-.24],[.23,1.008,-.29]],[.14,.225,.075]],
  [[[-.4,1.008,-.27],[-.29,1.008,-.37],[-.19,1.008,-.31]],[.17,.235,.11]],
 ])out.push([points,tint]);
 return geometry(out);
}
function leafGeometry(){
 const out=[];
 for(const [x,z,a,s]of [[-.18,.12,-.7,.65],[.09,.05,.25,.85],[.21,-.13,1.3,.54]]){
  const dx=Math.sin(a)*s*.43,dz=Math.cos(a)*s*.43,wx=Math.cos(a)*s*.14,wz=-Math.sin(a)*s*.14;
  const base=[x-dx*.5,0,z-dz*.5],tip=[x+dx,.035,z+dz],middle=[x+dx*.25,.11,z+dz*.25];
  out.push([[base,[x+wx,.025,z+wz],middle],[.255,.4,.12]],[[[x+wx,.025,z+wz],tip,middle],[.39,.53,.185]],[[base,middle,[x-wx,.025,z-wz]],[.15,.285,.075]],[[[x-wx,.025,z-wz],middle,tip],[.315,.455,.15]]);
 }
 return geometry(out);
}
function mossGeometry(){
 const out=[],n=12;for(let i=0;i<n;i++){const a=i*Math.PI*2/n,b=(i+1)*Math.PI*2/n,ra=i%3===0?.46:.5,rb=(i+1)%3===0?.46:.5;out.push([[[0,0,0],[Math.cos(b)*rb,0,Math.sin(b)*rb],[Math.cos(a)*ra,0,Math.sin(a)*ra]],[.7,.82,.57]]);}return geometry(out);
}
function flatLeavesGeometry(source){
 const g=source.clone(),positions=g.getAttribute('position');for(let i=0;i<positions.count;i++)positions.setY(i,0);positions.needsUpdate=true;g.computeBoundingBox();return g;
}

// Six fixed instanced batches. Scenery has no clock, animation callback,
// texture, light or hidden collider; the host owns the identical cover list.
export function createJourneyRoomLayoutView(scene,{lowQuality=false}={}){
 const root=new THREE.Group();root.name='journey-room-layout';root.visible=false;scene.add(root);
 const stone=stoneGeometry(),leaves=leafGeometry(),moss=mossGeometry(),flatLeaves=flatLeavesGeometry(leaves),ring=new THREE.RingGeometry(.34,.5,12).rotateX(-Math.PI/2);
 const stoneMaterial=new THREE.MeshBasicMaterial({vertexColors:true,toneMapped:false}),leafMaterial=new THREE.MeshBasicMaterial({vertexColors:true,toneMapped:false,side:THREE.DoubleSide}),mossMaterial=new THREE.MeshBasicMaterial({vertexColors:true,color:0x344b2d,transparent:true,opacity:.3,depthWrite:false,toneMapped:false}),ringMaterial=new THREE.MeshBasicMaterial({color:0xa4ad86,toneMapped:false,depthWrite:false});
 const makeBatch=(name,g,material,cap)=>{const b=new THREE.InstancedMesh(g,material,cap);b.name=name;b.count=0;b.visible=false;b.castShadow=false;b.receiveShadow=false;b.instanceMatrix.setUsage(THREE.StaticDrawUsage);root.add(b);return b;};
 const batches={stone:makeBatch('journey-low-stone',stone,stoneMaterial,COVER_CAP),foliage:makeBatch('journey-cover-leaves',leaves,leafMaterial,COVER_CAP*2),contact:makeBatch('journey-cover-moss',moss,mossMaterial,COVER_CAP),botanical:makeBatch('journey-ground-botanical',flatLeaves,leafMaterial,DECOR_CAP),ring:makeBatch('journey-ground-stone-rings',ring,ringMaterial,DECOR_CAP),tiles:makeBatch('journey-ground-stepping-stones',stone,stoneMaterial,DECOR_CAP*3)};
 const ownedGeometries=new Set([stone,leaves,moss,flatLeaves,ring]),ownedMaterials=new Set([stoneMaterial,leafMaterial,mossMaterial,ringMaterial]),pose=new THREE.Object3D(),color=new THREE.Color();
 let disposed=false,active=true,current=null,coverCount=0,decorCount=0,updates=0,offsetX=0,offsetZ=0;
 function add(batch,x,y,z,sx,sy,sz,tint,angle=0){
  if(batch.count>=batch.instanceMatrix.count)return;
  pose.position.set(x,y,z);pose.scale.set(sx,sy,sz);pose.rotation.set(0,angle,0);pose.updateMatrix();batch.setMatrixAt(batch.count,pose.matrix);color.setHex(tint);batch.setColorAt(batch.count,color);batch.count++;
 }
 function finish(){
  for(const b of Object.values(batches)){b.visible=b.count>0;b.instanceMatrix.needsUpdate=true;if(b.instanceColor)b.instanceColor.needsUpdate=true;b.computeBoundingSphere();}
  root.visible=active&&Boolean(current)&&coverCount+decorCount>0;
 }
 function setLayout(layout,{x=0,z=0}={}){
  if(disposed)return false;
  for(const b of Object.values(batches))b.count=0;
  current=layout&&Array.isArray(layout.cover)&&Array.isArray(layout.decor)?layout:null;coverCount=decorCount=0;offsetX=finite(x);offsetZ=finite(z);updates++;
  if(current){
   for(const c of current.cover.slice(0,COVER_CAP)){
    if(!c||![c.x,c.z,c.w,c.d].every(Number.isFinite)||c.w<=0||c.d<=0)continue;
    const px=c.x+offsetX,pz=c.z+offsetZ,w=bounded(c.w,.1,8),d=bounded(c.d,.1,8),h=bounded(finite(c.h,.85)*.55,.35,.58),tint=c.kind==='planter'?0xc3c8a1:c.kind==='post'?0xd1d3b8:0xc0c7b1;
    add(batches.contact,px,.018,pz,w*1.08,1,d*1.08,0x6b8050);
    add(batches.stone,px,.035,pz,w,h,d,tint);
    const clusters=lowQuality?1:2;for(let k=0;k<clusters;k++){const side=k===0?-1:1;add(batches.foliage,px+side*w*.15,.035+h,pz+side*d*.13,w*.45,.8,d*.45,c.kind==='planter'?0xc5d7a1:0x9daf83,k*.8);}
    coverCount++;
   }
   for(const d of current.decor.slice(0,Math.min(DECOR_CAP,16-coverCount))){
    if(!d||![d.x,d.z].every(Number.isFinite))continue;
    const px=d.x+offsetX,pz=d.z+offsetZ,w=bounded(finite(d.w,1.3),.1,5),depth=bounded(finite(d.d,1.3),.1,5);
    if(d.kind==='stone-ring')add(batches.ring,px,.023,pz,w,1,depth,0xbfc4a6);
    else if(d.kind==='tile-band')for(let k=0;k<3;k++)add(batches.tiles,px+(k-1)*w*.3,.018,pz+(k%2?.035:-.035),w*.24,.035,depth*.8,0xc5c9b0,(k-1)*.07);
    else add(batches.botanical,px,.026,pz,w,1,depth,d.kind==='flower-bed'?0xd2d6a7:d.kind==='leaf-trace'?0x9ba976:0x889f72,d.kind==='leaf-trace'?.55:-.25);
    decorCount++;
   }
  }
  finish();return Boolean(current);
 }
 function setActive(value){if(disposed)return;active=Boolean(value);root.visible=active&&Boolean(current)&&coverCount+decorCount>0;}
 function hide(){setActive(false);}
 function diagnostics(){let instances=0,triangles=0,drawCalls=0;for(const b of Object.values(batches)){instances+=b.count;triangles+=b.count*(b.geometry.index?b.geometry.index.count:b.geometry.attributes.position.count)/3;if(root.visible&&b.visible&&b.count)drawCalls++;}return{disposed,active:root.visible,name:current?.name||null,coverCount,decorCount,drawCalls,instances,triangles,geometries:disposed?0:ownedGeometries.size,materials:disposed?0:ownedMaterials.size,textures:0,lights:0,updates,offset:{x:offsetX,z:offsetZ}};}
 function dispose(){if(disposed)return;disposed=true;root.removeFromParent();root.visible=false;for(const b of Object.values(batches)){b.count=0;b.dispose();}for(const g of ownedGeometries)g.dispose();for(const material of ownedMaterials)material.dispose();current=null;coverCount=decorCount=0;}
 return{setLayout,setActive,hide,dispose,diagnostics};
}
