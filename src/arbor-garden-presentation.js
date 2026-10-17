import * as THREE from 'three';
import {DECOR_PROP_REGIONS} from './garden-decor-art.js';
import {ARBOR_GARDEN_LAYOUTS,ARBOR_GARDEN_LIMITS} from './arbor-garden-layout.js';

export const ARBOR_GARDEN_ART=Object.freeze({
 terrain:'assets/adventure/garden-terrain-atlas-v2.webp',
 plants:'assets/garden-growth-atlas-v3.webp',props:'assets/garden-decor-props-v1.webp'
});
// Alpha .08 source bounds, measured on the unchanged 1448x1086 growth atlas.
const GROWTH_REGIONS=Object.freeze({
 3:[49/362,44/362,304/362,333/362],4:[38/362,25/362,334/362,1],
 5:[32/362,9/362,348/362,1],6:[36/362,12/362,329/362,1],7:[8/362,11/362,343/362,1]
});
const grassUV=(u,v)=>[.002+u*.496,.502+v*.496];
function grassGeometry(){
 const points=[],uv=[];
 for(let z=-36;z<36;z+=6)for(let x=-36;x<36;x+=6){
  const corners=[[x,0,z],[x,0,z+6],[x+6,0,z+6],[x+6,0,z]],tex=[[0,1],[0,0],[1,0],[1,1]];
  for(const index of [0,1,2,0,2,3]){points.push(...corners[index]);uv.push(...grassUV(...tex[index]));}
 }
 const g=new THREE.BufferGeometry();g.setAttribute('position',new THREE.Float32BufferAttribute(points,3));g.setAttribute('uv',new THREE.Float32BufferAttribute(uv,2));g.computeVertexNormals();g.computeBoundingSphere();return g;
}
function lawnGeometry(){
 const outline=[[-.5,-.08],[-.46,.19],[-.3,.27],[-.19,.45],[.07,.5],[.23,.39],[.45,.3],[.5,.03],[.39,-.24],[.22,-.38],[-.03,-.5],[-.23,-.36],[-.39,-.31]],points=[],uv=[];
 for(let index=0;index<outline.length;index++)for(const p of [[0,0],outline[index],outline[(index+1)%outline.length]]){points.push(p[0],0,p[1]);uv.push(...grassUV(p[0]+.5,p[1]+.5));}
 const g=new THREE.BufferGeometry();g.setAttribute('position',new THREE.Float32BufferAttribute(points,3));g.setAttribute('uv',new THREE.Float32BufferAttribute(uv,2));g.computeVertexNormals();return g;
}
function curbGeometry(){
 const points=[],colors=[],steps=16;
 const triangle=(a,b,c,tint)=>{points.push(...a,...b,...c);for(let i=0;i<3;i++)colors.push(...tint);};
 // Rounded rectangular garden beds replace empty oval hoops. The low rim
 // remains entirely beyond the real arena and shares the same fixed buffer.
 const point=(i,r,y)=>{const a=i*Math.PI*2/steps,c=Math.cos(a),s=Math.sin(a);return[Math.sign(c)*Math.pow(Math.abs(c),.34)*r,y,Math.sign(s)*Math.pow(Math.abs(s),.34)*r];};
 for(let i=0;i<steps;i++){
  const lip=.125+(i%4===0?.008:0),a=point(i,.5,0),b=point(i+1,.5,0),c=point(i,.48,lip),d=point(i+1,.48,lip),e=point(i,.445,lip+.015),f=point(i+1,.445,lip+.015),g=point(i,.445,.025),h=point(i+1,.445,.025);
  const top=i%4===0?[.105,.155,.07]:[.15,.20,.105],side=i<8?[.065,.10,.045]:[.10,.145,.07];
  triangle(a,d,b,side);triangle(a,c,d,side);triangle(c,f,d,top);triangle(c,e,f,top);triangle(e,h,f,[.05,.08,.025]);triangle(e,g,h,[.05,.08,.025]);
 }
 const geometry=new THREE.BufferGeometry();geometry.setAttribute('position',new THREE.Float32BufferAttribute(points,3));geometry.setAttribute('color',new THREE.Float32BufferAttribute(colors,3));geometry.computeVertexNormals();return geometry;
}
function atlasGeometry(capacity){
 // All combat cameras retain the Act1 19/19 angle. These fixed cards have the
 // same plane as the authored actors, with no per-frame billboard recursion.
 const geometry=new THREE.PlaneGeometry(1,1).translate(0,.5,0).rotateX(-Math.PI/4);
 geometry.setAttribute('instanceAtlas',new THREE.InstancedBufferAttribute(new Float32Array(capacity*4),4).setUsage(THREE.StaticDrawUsage));
 return geometry;
}
function atlasShader(material){
 material.onBeforeCompile=shader=>{shader.vertexShader='attribute vec4 instanceAtlas;\n'+shader.vertexShader.replace('#include <uv_vertex>','#include <uv_vertex>\n#ifdef USE_MAP\nvMapUv = instanceAtlas.xy + vMapUv * instanceAtlas.zw;\n#endif');};
 material.customProgramCacheKey=()=> 'arbor-garden-atlas-v1';return material;
}

// The owning Act6 view supplies its resource registry and one loader. The five
// batches never create lights, clocks, input, collision or another frame loop.
export function createArborGardenPresentation(parent,{loadAsset,bind,ownGeometry,ownMaterial,lowQuality=false}){
 const root=new THREE.Group();root.name='arbor-authored-garden';parent.add(root);
 const records={terrain:loadAsset(ARBOR_GARDEN_ART.terrain),plants:loadAsset(ARBOR_GARDEN_ART.plants),props:loadAsset(ARBOR_GARDEN_ART.props)};
 for(const record of Object.values(records))if(record.texture){record.texture.generateMipmaps=false;record.texture.minFilter=THREE.LinearFilter;record.texture.magFilter=THREE.LinearFilter;}
 const groundMaterial=bind(ownMaterial(new THREE.MeshBasicMaterial({color:0xaebba2,transparent:true,depthWrite:false,toneMapped:false})),records.terrain);
 // Only the passable lawn instances feather into the paving. The surround
 // keeps full alpha, and the unchanged atlas remains the source of detail.
 groundMaterial.onBeforeCompile=shader=>{
  shader.vertexShader='varying vec2 vArborLawn;\nvarying float vArborLawnMask;\n'+shader.vertexShader.replace('#include <begin_vertex>','#include <begin_vertex>\n vArborLawn=position.xz;\n#ifdef USE_INSTANCING\n vArborLawnMask=1.0;\n#else\n vArborLawnMask=0.0;\n#endif');
  shader.fragmentShader='varying vec2 vArborLawn;\nvarying float vArborLawnMask;\n'+shader.fragmentShader.replace('#include <map_fragment>',`#include <map_fragment>
   float lawnEdge=1.0-smoothstep(.31,.49,length(vArborLawn));
   diffuseColor.a*=mix(1.0,lawnEdge*.88,vArborLawnMask);
   float grassLuma=dot(diffuseColor.rgb,vec3(.2126,.7152,.0722));
   diffuseColor.rgb=mix(vec3(grassLuma),diffuseColor.rgb,.82);`);
 };
 groundMaterial.customProgramCacheKey=()=> 'arbor-soft-lawn-v1';
 const plantMaterial=bind(ownMaterial(atlasShader(new THREE.MeshBasicMaterial({color:0xe6ead8,transparent:true,alphaTest:.08,depthWrite:false,toneMapped:false,side:THREE.DoubleSide,forceSinglePass:true}))),records.plants);
 const propMaterial=bind(ownMaterial(atlasShader(new THREE.MeshBasicMaterial({color:0xe5e5d2,transparent:true,alphaTest:.08,depthWrite:false,toneMapped:false,side:THREE.DoubleSide,forceSinglePass:true}))),records.props);
 const curbMaterial=ownMaterial(new THREE.MeshBasicMaterial({vertexColors:true,toneMapped:false}));
 const ground=new THREE.Mesh(ownGeometry(grassGeometry()),groundMaterial);ground.name='arbor-garden-surround';ground.position.y=.039;
 // Both materials are transparent and do not write depth. The surround's
 // slightly raised object origin otherwise sorts AFTER the instanced trees
 // (whose origin stays at zero), painting grass over every outside crown.
 // Paint this base first; retain ordinary depth tests against the court.
 ground.renderOrder=-1;root.add(ground);
 const batch=(name,g,material,capacity)=>{const mesh=new THREE.InstancedMesh(ownGeometry(g),material,capacity);mesh.name=name;mesh.instanceMatrix.setUsage(THREE.StaticDrawUsage);mesh.count=0;mesh.visible=false;root.add(mesh);return mesh;};
 const lawns=batch('arbor-passable-lawn-islands',lawnGeometry(),groundMaterial,ARBOR_GARDEN_LIMITS.lawnPatches);
 const plants=batch('arbor-garden-flowers-and-trees',atlasGeometry(ARBOR_GARDEN_LIMITS.plants),plantMaterial,ARBOR_GARDEN_LIMITS.plants);
 const props=batch('arbor-garden-landmarks',atlasGeometry(ARBOR_GARDEN_LIMITS.props),propMaterial,ARBOR_GARDEN_LIMITS.props);
 const curbs=batch('arbor-outside-flowerbed-masonry',curbGeometry(),curbMaterial,ARBOR_GARDEN_LIMITS.beds);
 const pose=new THREE.Object3D(),color=new THREE.Color(),batches=[lawns,plants,props,curbs];
 let disposed=false,active=false,sector=-1,layoutWrites=0,matrixWrites=0,visibilityKey=-1,visibilityWrites=0;
 const add=(mesh,x,y,z,sx,sy,sz,angle=0,tint=0xffffff)=>{
  if(mesh.count>=mesh.instanceMatrix.count)throw new Error('arbor garden capacity');
  pose.position.set(x,y,z);pose.scale.set(sx,sy,sz);pose.rotation.set(0,angle,0);pose.updateMatrix();mesh.setMatrixAt(mesh.count,pose.matrix);color.setHex(tint);mesh.setColorAt(mesh.count,color);mesh.count++;matrixWrites++;
 };
 const art=(mesh,item,regions)=>{
  const [x0,y0,x1,y1]=regions[item.tile],height=item.height,width=height*(x1-x0)/(y1-y0),index=mesh.count;
  // Rotation is baked into the unit card, so Y and Z must receive the SAME
  // height scale. Scaling only Y turns short flowers into dark thin pillars.
  add(mesh,item.x,.045,item.z,width,height,height);
  mesh.geometry.getAttribute('instanceAtlas').setXYZW(index,(item.tile%4+x0)/4,1-(Math.floor(item.tile/4)+y1)/3,(x1-x0)/4,(y1-y0)/3);
 };
 function refresh(){
  if(disposed)return;
  const key=active&&sector>=0?4+Number(records.plants.ready)+Number(records.props.ready)*2:0;if(key===visibilityKey)return;visibilityKey=key;visibilityWrites++;
  root.visible=active&&sector>=0;ground.visible=true;lawns.visible=lawns.count>0;curbs.visible=curbs.count>0;plants.visible=records.plants.ready&&plants.count>0;props.visible=records.props.ready&&props.count>0;
 }
 function setSector(value){
  if(disposed)return false;const next=Math.max(0,Math.min(4,Number.isFinite(value)?value|0:0));if(next===sector){refresh();return false;}
  sector=next;layoutWrites++;for(const mesh of batches)mesh.count=0;
  const layout=ARBOR_GARDEN_LAYOUTS[sector];
  for(const p of layout.patches){
   const vertical=p.d>p.w,long=vertical?p.d:p.w,minor=vertical?p.w:p.d,count=Math.max(2,Math.min(4,Math.ceil(long/4)));
   for(let i=0;i<count;i++){
    const along=(i/(count-1)-.5)*long*.67,across=(i%2?.12:-.12)*minor,length=Math.min(4.15,long/count*1.12),width=Math.min(3.7,minor*.71);
    add(lawns,p.x+(vertical?across:along),.048,p.z+(vertical?along:across),vertical?width:length,1,vertical?length:width,p.angle+(i%2?.19:-.16));
   }
  }
  for(const bed of layout.beds){
   add(curbs,bed.x,.046,bed.z,bed.w,1,bed.d,bed.angle);
   // Five coherent flowers form each planted bed. Phones retain its three
   // main blooms, not a random sparse scatter over the playable floor.
   const offsets=lowQuality?[-.32,0,.32]:[-.34,-.17,0,.17,.34],vertical=bed.d>bed.w;
   for(let i=0;i<offsets.length;i++){
    const offset=offsets[i],height=(i%2?.82:1.06)+(sector===2?.06:0),tile=i%3===1?3:layout.flowerTile===3?4:layout.flowerTile;
    art(plants,{tile,x:bed.x+(vertical?(i%2?.13:-.13):offset*bed.w),z:bed.z+(vertical?offset*bed.d:(i%2?.12:-.12)),height},GROWTH_REGIONS);
   }
  }
  // An inside lawn is ordinary passable ground, with only knee-low flowers.
  // Coherent pairs on each lawn's inner edge supply near-field scale without
  // implying a solid planter or covering the approaching enemy silhouettes.
  for(const lawn of layout.patches){
   const count=lowQuality?1:2;
   for(let i=0;i<count;i++)art(plants,{tile:i?3:4,x:lawn.x+(lawn.x<0?.16:-.16)*lawn.w,z:lawn.z+(i?.22:-.22)*lawn.d,height:.52},GROWTH_REGIONS);
  }
  for(const tree of layout.trees)art(plants,tree,GROWTH_REGIONS);
  for(const landmark of layout.props)art(props,landmark,DECOR_PROP_REGIONS);
  for(const mesh of batches){mesh.instanceMatrix.needsUpdate=true;if(mesh.instanceColor)mesh.instanceColor.needsUpdate=true;const atlas=mesh.geometry.getAttribute('instanceAtlas');if(atlas)atlas.needsUpdate=true;mesh.computeBoundingSphere();}
  refresh();return true;
 }
 const setActive=value=>{if(disposed)return;active=Boolean(value);refresh();};
 function dispose(){if(disposed)return;disposed=true;active=false;root.visible=false;root.removeFromParent();for(const mesh of batches)mesh.dispose();}
 const diagnostics=()=>({disposed,active:root.visible,sector,name:ARBOR_GARDEN_LAYOUTS[sector]?.name||null,layoutWrites,matrixWrites,visibilityWrites,plants:plants.count,props:props.count,beds:curbs.count,passablePatches:lawns.count,grassTiles:144,drawCalls:5,geometries:5,materials:4,textures:3,lights:0,raf:0,collisionOwned:false});
 return {setSector,setActive,refresh,dispose,diagnostics};
}
