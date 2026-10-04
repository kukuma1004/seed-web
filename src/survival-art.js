import * as THREE from 'three';
import {SURVIVAL_BASES} from './survival-rules.js';

const KINDS=['swarm','runner','brute'];
const FILES=['enemy-hound-v4.webp','enemy-runner-v1.webp','enemy-shield-v4.webp'];
const ACT_FILES=[FILES,['enemy-pitcher-v1.webp','enemy-runner-v1.webp','enemy-catcher-v1.webp'],['enemy-act3-flight-atlas-v2.webp','enemy-act3-flight-atlas-v2.webp','enemy-act3-flight-atlas-v2.webp']];
const SIZES=[.78,.86,1.28];
const QUIET_SIZES=[1.02,1.00,1.38];
const CUTE_FOLDER='cute/';
const DEFEAT_LIMIT=24,FLECK_LIMIT=96;
const SPEEDS=[10,15,6];
const FRAME_CELLS=[[0,1],[1,1],[0,0],[1,0]];
const GARDEN_SURFACE='survival-garden-paving-v1.webp';

// This entire renderer is visual only. The garden's landmarks sit beyond the
// playable rectangle; neither floor variation nor decorations create obstacles.
export function createSurvivalArt(scene,camera,{baseUrl='',mobile=false,capacity=120,groundTexture=null,arena={halfWidth:24,halfDepth:20}}={}){
 const limit=Math.max(1,Math.floor(Number(capacity)||120));
 const halfWidth=Math.max(2,Number(arena.halfWidth)||24),halfDepth=Math.max(2,Number(arena.halfDepth)||20);
 const root=new THREE.Group();root.name='survival-garden-art';root.visible=false;scene.add(root);
 const geometries=new Set(),materials=new Set(),textures=new Set(),loader=new THREE.TextureLoader();
 const prefix=baseUrl&&!baseUrl.endsWith('/')?baseUrl+'/':baseUrl;
 let act=0,readability=true,quietMap=null,gardenMap=null;const textureCache=new Map();
 let disposed=false,rendered=0,overflow=0,lastTime=0,defeatCursor=0;
 const defeats=Array.from({length:DEFEAT_LIMIT},()=>({active:false}));
 const geometry=g=>{geometries.add(g);return g;};
 const material=m=>{materials.add(m);return m;};
 function texture(file,folder='mobile/'){
  const key=folder+file;if(textureCache.has(key))return textureCache.get(key);
  const t=loader.load(prefix+'assets/'+key);t.colorSpace=THREE.SRGBColorSpace;t.minFilter=THREE.LinearMipmapLinearFilter;t.magFilter=THREE.LinearFilter;
  textures.add(t);textureCache.set(key,t);return t;
 }
 function mesh(g,m,name){const result=new THREE.Mesh(geometry(g),material(m));result.name=name;root.add(result);return result;}
 function batch(g,m,count,name){
  const result=new THREE.InstancedMesh(g,m,count);result.name=name;result.frustumCulled=false;result.count=0;result.instanceMatrix.setUsage(THREE.DynamicDrawUsage);root.add(result);return result;
 }
 const matrix=new THREE.Matrix4(),position=new THREE.Vector3(),scale=new THREE.Vector3(),up=new THREE.Vector3();
 const quaternion=new THREE.Quaternion(),roll=new THREE.Quaternion(),axis=new THREE.Vector3(0,0,1),color=new THREE.Color();
 const flatQuaternion=new THREE.Quaternion().setFromEuler(new THREE.Euler(-Math.PI/2,0,0));

 const earth=mesh(new THREE.PlaneGeometry(halfWidth*2+24,halfDepth*2+24),new THREE.MeshBasicMaterial({color:0x172d25,toneMapped:false}),'survival-garden-earth');
 earth.rotation.x=-Math.PI/2;earth.position.y=-.08;
 // One baked painterly surface: cracks, moss, flowers and shallow lighting are
 // part of the same draw. Mobile reads a 768px derivative, never the source art.
 // The supplied journey texture is untouched; this map belongs to this mode.
 const paintedGarden=quietMap=texture('quiet-stone-v1.webp',CUTE_FOLDER);
 paintedGarden.wrapS=paintedGarden.wrapT=THREE.MirroredRepeatWrapping;
 const shadedStone=new THREE.Color(.76,.83,.84),sunlitStone=new THREE.Color(1,.97,.82);
 const vertices=[],uvs=[],colors=[],indices=[];
 const nx=Math.ceil(halfWidth*2/1.85),nz=Math.ceil(halfDepth*2/1.85),dx=halfWidth*2/nx,dz=halfDepth*2/nz;
 for(let x=0;x<nx;x++)for(let z=0;z<nz;z++){
  const x0=-halfWidth+x*dx,z0=-halfDepth+z*dz,start=vertices.length/3;
  vertices.push(x0,0,z0+dz,x0+dx,0,z0+dz,x0,0,z0,x0+dx,0,z0);
  for(const [u,v] of [[0,0],[1,0],[0,1],[1,1]]){
   const wx=x0+u*dx,wz=z0+(1-v)*dz,path=Math.min(Math.abs(wx-Math.sin(wz*.15)*3),Math.abs(wz-Math.sin(wx*.13)*4));
   // Large stone shapes leave visual space between the small combat actors.
   // Broad baked illumination replaces an evenly bright carpet. Calculate at
   // the vertex (not the tile centre) so neighbouring quads have no seams.
   const edge=Math.max(Math.abs(wx/halfWidth),Math.abs(wz/halfDepth));
   const pathBlend=Math.max(0,1-path/3.5);
   const sun=Math.exp(-((wx+5)*(wx+5)/110+(wz+4)*(wz+4)/180));
   // Wide canopy shadows interrupt the repeating garden without covering
   // enemies with an overlay. Baked once into the existing vertex colors;
   // both edges of every floor quad sample the same world-space value.
   const canopy=Math.max(0,Math.sin(wx*.29+wz*.19+.8))*Math.max(0,Math.sin(wz*.37-wx*.11));
   const shade=(.78+.13*sun+.025*Math.sin(wx*.23+wz*.17)-canopy*.11*(1-sun*.55))*(1-edge*.12);
   color.copy(shadedStone).lerp(sunlitStone,pathBlend*.24+sun*.28).multiplyScalar(shade);
   uvs.push(wx/18,wz/18);colors.push(color.r,color.g,color.b);
  }
  indices.push(start,start+1,start+2,start+2,start+1,start+3);
 }
 const floorGeometry=new THREE.BufferGeometry();floorGeometry.setAttribute('position',new THREE.Float32BufferAttribute(vertices,3));floorGeometry.setAttribute('uv',new THREE.Float32BufferAttribute(uvs,2));floorGeometry.setAttribute('color',new THREE.Float32BufferAttribute(colors,3));floorGeometry.setIndex(indices);floorGeometry.computeBoundingSphere();
 const floor=mesh(floorGeometry,new THREE.MeshBasicMaterial({map:paintedGarden,vertexColors:true,toneMapped:false}),'survival-garden-floor');

 // Irregular soft moss islands break the tile grid; alpha fades into the stone.
 const mossVertices=[],mossColors=[],mossIndices=[];
 for(let i=0;i<56;i++){
  const x=Math.sin(i*17.31)*(halfWidth-1.8),z=Math.sin(i*9.73+1)*(halfDepth-1.8);
  if(Math.min(Math.abs(x-Math.sin(z*.15)*3),Math.abs(z-Math.sin(x*.13)*4))<2.8)continue;
  const base=mossVertices.length/3;const c=new THREE.Color(i%3===0?0x354b31:0x243d2c);
  mossVertices.push(x,.012,z);mossColors.push(c.r,c.g,c.b,.50);
  for(let j=0;j<=16;j++){
   const a=j/16*Math.PI*2,r=(.9+(i%4)*.3)*(1+.2*Math.sin(a*3+i));
   mossVertices.push(x+Math.cos(a)*r,.012,z+Math.sin(a)*r*.68);mossColors.push(c.r,c.g,c.b,0);
   if(j>0)mossIndices.push(base,base+j+1,base+j);
  }
 }
 const mossGeometry=new THREE.BufferGeometry();mossGeometry.setAttribute('position',new THREE.Float32BufferAttribute(mossVertices,3));mossGeometry.setAttribute('color',new THREE.Float32BufferAttribute(mossColors,4));mossGeometry.setIndex(mossIndices);mossGeometry.computeBoundingSphere();
 const moss=mesh(mossGeometry,new THREE.MeshBasicMaterial({vertexColors:true,transparent:true,depthWrite:false,toneMapped:false}),'survival-garden-moss');
 moss.visible=false;
 // Low, worn edging makes the movement limit legible without enclosing the
 // camera in high walls. All masonry and foliage are outside that limit.
 const stoneGeometry=geometry(new THREE.BoxGeometry(1,1,1)),stoneMaterial=material(new THREE.MeshBasicMaterial({color:0x687b62,toneMapped:false}));
 const edgeCount=2*(Math.ceil(halfWidth*2/2)+Math.ceil(halfDepth*2/2));
 const edging=batch(stoneGeometry,stoneMaterial,edgeCount,'survival-garden-boundary');
 function place(target,x,y,z,sx,sy,sz,yaw=0){position.set(x,y,z);quaternion.setFromAxisAngle(THREE.Object3D.DEFAULT_UP,yaw);scale.set(sx,sy,sz);matrix.compose(position,quaternion,scale);target.setMatrixAt(target.count++,matrix);}
 const horizontal=Math.ceil(halfWidth*2/2),vertical=Math.ceil(halfDepth*2/2);
 for(let i=0;i<horizontal;i++)for(const side of [-1,1])place(edging,-halfWidth+(i+.5)*halfWidth*2/horizontal,.025,side*(halfDepth+.19),halfWidth*2/horizontal-.07,.12,.34);
 for(let i=0;i<vertical;i++)for(const side of [-1,1])place(edging,side*(halfWidth+.19),.025,-halfDepth+(i+.5)*halfDepth*2/vertical,.34,.12,halfDepth*2/vertical-.07);
 edging.instanceMatrix.needsUpdate=true;
 const leavesGeometry=geometry(new THREE.IcosahedronGeometry(1,1)),leavesMaterial=material(new THREE.MeshBasicMaterial({color:0x354d36,toneMapped:false}));
 const rockGeometry=geometry(new THREE.DodecahedronGeometry(1,0)),rockMaterial=material(new THREE.MeshBasicMaterial({color:0x566758,toneMapped:false}));
 const leaves=batch(leavesGeometry,leavesMaterial,36,'survival-garden-outer-flora'),rocks=batch(rockGeometry,rockMaterial,18,'survival-garden-ruins');
 // Six fixed landmark clusters keep navigation readable across the wide arena.
 const landmarks=[[-halfWidth-1.7,-halfDepth*.7],[halfWidth+1.7,-halfDepth*.55],[-halfWidth*.55,-halfDepth-1.8],[halfWidth*.55,-halfDepth-1.8],[-halfWidth*.62,halfDepth+1.8],[halfWidth*.58,halfDepth+1.8]];
 for(let i=0;i<landmarks.length;i++){
  const [x,z]=landmarks[i];
  for(let j=0;j<6;j++){
   const angle=j*2.399+i,spread=.5+(j%3)*.43;
   place(leaves,x+Math.cos(angle)*spread,.12+(j%2)*.07,z+Math.sin(angle)*spread,.65+(j%3)*.16,.22+(j%2)*.14,.6+(j%3)*.2,angle);
   color.setHex(j%3===0?0x526a42:j%3===1?0x334d39:0x405a43);leaves.setColorAt(leaves.count-1,color);
  }
  for(let j=0;j<3;j++)place(rocks,x+(j-1)*.6,.12+j*.055,z+.15*j,.45+.14*j,.22+.09*j,.42,(i+j)*.73);
 }
 leaves.instanceMatrix.needsUpdate=true;leaves.instanceColor.needsUpdate=true;rocks.instanceMatrix.needsUpdate=true;

 // Flat botanical detail follows the quiet strips between the worn paths.
 // All leaves share one six-triangle silhouette and one static draw, no texture.
 const leafShape=new THREE.Shape();leafShape.moveTo(0,-.5);leafShape.quadraticCurveTo(-.36,-.12,-.12,.23);leafShape.lineTo(0,.5);leafShape.quadraticCurveTo(.40,.02,0,-.5);
 const petalGeometry=geometry(new THREE.ShapeGeometry(leafShape,3));
 const undergrowth=batch(petalGeometry,material(new THREE.MeshBasicMaterial({vertexColors:false,color:0xffffff,side:THREE.DoubleSide,toneMapped:false})),720,'survival-garden-groundcover');
 for(let i=0;i<90;i++){
  const x=Math.sin(i*17.31)* (halfWidth-1),z=Math.sin(i*9.73+1)*(halfDepth-1);
  const path=Math.min(Math.abs(x-Math.sin(z*.15)*3),Math.abs(z-Math.sin(x*.13)*4));
  if(path<2.6)continue;
  for(let j=0;j<8;j++){
   const angle=i*.7+j*2.399,r=.12+(j%4)*.14;
   position.set(x+Math.cos(angle)*r,.018+(j%3)*.005,z+Math.sin(angle)*r);
   roll.setFromAxisAngle(axis,angle);quaternion.copy(flatQuaternion).multiply(roll);
   const length=.26+(j%3)*.13;scale.set(length*.6,length,1);matrix.compose(position,quaternion,scale);undergrowth.setMatrixAt(undergrowth.count,matrix);
   color.setHex(j===0?0xb4b292:j%3===0?0x5a7454:0x3b5a48);undergrowth.setColorAt(undergrowth.count++,color);
  }
 }
 undergrowth.instanceMatrix.needsUpdate=true;
 if(undergrowth.instanceColor)undergrowth.instanceColor.needsUpdate=true;
 // Baked foliage is clearer and costs no alpha overdraw in the playable area.
 undergrowth.visible=false;
 // Sparse resting seed petals: a quiet golden navigation landmark, no light.
 const flecks=batch(petalGeometry,material(new THREE.MeshBasicMaterial({color:0xffffff,side:THREE.DoubleSide,toneMapped:false})),FLECK_LIMIT,'survival-defeat-petals');
 flecks.setColorAt(0,color.setHex(0xffffff));flecks.instanceColor.setUsage(THREE.DynamicDrawUsage);
 const originalUV=new Float32Array(floorGeometry.attributes.uv.array),originalColors=new Float32Array(floorGeometry.attributes.color.array);
 const frames=FRAME_CELLS.map(([column,row])=>{
  const g=geometry(new THREE.PlaneGeometry(1,1)),uv=g.attributes.uv,pad=.003;
  for(let i=0;i<uv.count;i++)uv.setXY(i,column*.5+pad+uv.getX(i)*(.5-pad*2),row*.5+pad+uv.getY(i)*(.5-pad*2));
  return g;
 });
 const bodies=[];
 for(let kind=0;kind<KINDS.length;kind++){
  const m=material(new THREE.MeshBasicMaterial({map:texture(FILES[kind],CUTE_FOLDER),alphaTest:.09,depthWrite:true,toneMapped:false}));
  for(let direction=0;direction<4;direction++){
   // Every direction can hold the entire wave. Allocation is fixed at startup,
   // while a global limit prevents the rendered population exceeding capacity.
   const b=batch(frames[direction],m,limit+DEFEAT_LIMIT,'survival-'+KINDS[kind]+'-'+direction);
   b.setColorAt(0,color.setHex(0xffffff));b.instanceColor.setUsage(THREE.DynamicDrawUsage);bodies.push(b);
  }
 }
 const shadowGeometry=geometry(new THREE.CircleGeometry(1,12)),shadowMaterial=material(new THREE.MeshBasicMaterial({color:0x071510,opacity:.24,transparent:true,depthWrite:false,toneMapped:false}));
 const shadows=batch(shadowGeometry,shadowMaterial,limit,'survival-enemy-contact-shadows');shadows.renderOrder=-1;
 function clear(){for(const b of bodies)b.count=0;shadows.count=0;rendered=0;overflow=0;}
 // Baseball markings and triggers share their coordinates. Two extra draws only.
 const linePoints=[];
 for(const base of SURVIVAL_BASES){
  const next=SURVIVAL_BASES[base.next],dx=next.x-base.x,dz=next.z-base.z,len=Math.hypot(dx,dz),mx=(base.x+next.x)/2,mz=(base.z+next.z)/2;
  linePoints.push(new THREE.Vector3(base.x,.027,base.z),new THREE.Vector3(next.x,.027,next.z));
  for(const side of [-1,1])linePoints.push(new THREE.Vector3(mx-dx/len*.7+dz/len*side*.4,.03,mz-dz/len*.7-dx/len*side*.4),new THREE.Vector3(mx,.03,mz));
 }
 const diamondGeometry=geometry(new THREE.BufferGeometry().setFromPoints(linePoints));
 const diamond=new THREE.LineSegments(diamondGeometry,material(new THREE.LineBasicMaterial({color:0xe3d5a5,transparent:true,opacity:.7,toneMapped:false})));root.add(diamond);diamond.visible=false;
 const bases=batch(geometry(new THREE.PlaneGeometry(1.3,1.3)),material(new THREE.MeshBasicMaterial({color:0xdfd8bc,toneMapped:false})),4,'survival-stadium-bases');
 for(const {x,z} of SURVIVAL_BASES){position.set(x,.029,z);roll.setFromAxisAngle(axis,Math.PI/4);quaternion.copy(flatQuaternion).multiply(roll);matrix.compose(position,quaternion,new THREE.Vector3(1,1,1));bases.setMatrixAt(bases.count++,matrix);}bases.instanceMatrix.needsUpdate=true;bases.visible=false;
 // Both styles share the existing 2x2 role atlases, four frame geometries,
 // three materials and twelve instance buffers. Act 3 keeps its fixed role
 // cells and flight rotation; changing style never changes enemy behaviour.
 function applyActorArt(){
  for(let k=0;k<3;k++)for(let direction=0;direction<4;direction++){
   const b=bodies[k*4+direction];
   b.material.map=texture(ACT_FILES[act===3?2:act===4?0:act][k],readability?CUTE_FOLDER:'mobile/');b.material.needsUpdate=true;
   b.geometry=act===2||act===3?frames[k===2?2:k]:frames[direction];
  }
 }
 // Retune the existing floor buffers only when the comparison changes. Smaller
 // slabs give the cute actors a readable scale; restrained lifted shadows retain
 // the garden palette without competing with ivory faces and warm enemy bodies.
 function applyGardenFloor(){
  if(act!==0)return;
  const uv=floorGeometry.attributes.uv,c=floorGeometry.attributes.color;
  uv.array.set(originalUV);c.array.set(originalColors);
  if(readability){
   for(let i=0;i<uv.count;i++){
    uv.setXY(i,originalUV[i*2]*1.45,originalUV[i*2+1]*1.45);
    c.setXYZ(i,Math.min(1,originalColors[i*3]*1.20),Math.min(1,originalColors[i*3+1]*1.18),Math.min(1,originalColors[i*3+2]*1.14));
   }
  }
  uv.needsUpdate=true;c.needsUpdate=true;
  if(!readability&&!gardenMap){gardenMap=texture(GARDEN_SURFACE,mobile?'mobile/':'');gardenMap.wrapS=gardenMap.wrapT=THREE.RepeatWrapping;}
  floor.material.map=readability?quietMap:gardenMap;floor.material.needsUpdate=true;
 }
 function setReadability(enabled){
  if(disposed)return;
  const next=Boolean(enabled);if(next===readability)return;readability=next;
  applyGardenFloor();
  applyActorArt();
 }
 function setAct(value=0){
  if(disposed)return;const next=Math.max(0,Math.min(4,Math.floor(Number(value)||0)));
  if(next===act)return;act=next;clear();for(const d of defeats)d.active=false;flecks.count=0;
  const uv=floorGeometry.attributes.uv,c=floorGeometry.attributes.color,pos=floorGeometry.attributes.position;
  if(act===0){applyGardenFloor();}
  else if(act===1){
   floor.material.map=texture('stadium-clay-hd-v1.webp','');floor.material.map.wrapS=floor.material.map.wrapT=THREE.MirroredRepeatWrapping;floor.material.map.repeat.set(4,4);
   for(let i=0;i<uv.count;i++){uv.setXY(i,(pos.getX(i)+halfWidth)/(2*halfWidth),(pos.getZ(i)+halfDepth)/(2*halfDepth));c.setXYZ(i,.5,.55,.46);}
  }else if(act===4){
   floor.material.map=quietMap;uv.array.set(originalUV);c.array.set(originalColors);
   for(let i=0;i<c.count;i++)c.setXYZ(i,originalColors[i*3]*.8,originalColors[i*3+1]*.88,originalColors[i*3+2]*1.05);
  }else{
   floor.material.map=texture('act3-storm-route-v1.webp');
   for(let i=0;i<uv.count;i++){uv.setXY(i,(pos.getX(i)+halfWidth)/(2*halfWidth),1-(pos.getZ(i)+halfDepth)/(2*halfDepth));c.setXYZ(i,.48,.54,.59);}
  }
  uv.needsUpdate=true;c.needsUpdate=true;floor.material.needsUpdate=true;
  earth.material.color.setHex(act===2||act===3?0x0b1d2b:act===1?0x20271d:0x172d25);
  leaves.visible=act===0;moss.visible=false;undergrowth.visible=false;
  rocks.visible=act!==2&&act!==3;edging.visible=act!==2&&act!==3;diamond.visible=bases.visible=act===1;
  applyActorArt();
 }
 function update(enemies=[],time=0){
  if(disposed||!root.visible)return 0;
  clear();lastTime=time;up.set(0,1,0).applyQuaternion(camera.quaternion);
  for(let i=0;i<enemies.length;i++){
   const e=enemies[i],kind=KINDS.indexOf(e.survivalKind);
   if(kind<0||e.dead||!e.g||e.g.visible===false)continue;
   if(rendered>=limit){overflow++;continue;}
   const p=e.g.position,yaw=Math.atan2(camera.position.x-p.x,camera.position.z-p.z),facing=e.g.rotation.y-yaw;
   const angle=Math.atan2(Math.sin(facing),Math.cos(facing));
   const direction=Math.abs(angle)<=Math.PI/4?0:Math.abs(angle)>=Math.PI*3/4?2:angle>0?1:3,b=bodies[kind*4+direction];
   const phase=Number.isFinite(e.phase)?e.phase:0,gait=e.frostLock>0?0:Math.sin(time*SPEEDS[kind]+phase),size=(readability?QUIET_SIZES:SIZES)[kind];
   const impact=Math.min(1,Math.max(0,(e.hit||0)/.14)),bob=Math.abs(gait)*(kind===2?.018:.035);
   // Camera-up translation anchors the actual feet at the ground, matching the
   // existing actor billboards even when the camera follows across the arena.
   position.copy(p).addScaledVector(up,size*(readability&&act!==2?.4375:.46));position.y+=.035+bob;
   roll.setFromAxisAngle(axis,act===2?-e.g.rotation.y:gait*(kind===2?.018:.04));quaternion.copy(camera.quaternion).multiply(roll);
   scale.set(size*(e.rushState==='brace'?1.12:1+impact*.06),size*(e.rushState==='brace'?.78:e.rushState==='rush'?1.1:1-impact*.04),1);matrix.compose(position,quaternion,scale);b.setMatrixAt(b.count,matrix);
   color.setHex(impact>0?0xffe2bd:e.frostLock>0?0x87dcf3:e.slow>0?0xb0dce2:e.rushState==='brace'?0xffb66b:0xffffff);b.setColorAt(b.count++,color);
   const radius=Number.isFinite(e.radius)?e.radius:kind===2?.55:kind===1?.36:.3;
   position.set(p.x,.025,p.z);scale.set(radius*1.15,radius*.72,1);matrix.compose(position,flatQuaternion,scale);shadows.setMatrixAt(shadows.count++,matrix);rendered++;
  }
  flecks.count=0;
  for(const d of defeats){
   if(!d.active)continue;const age=time-d.time;
   if(age>=.42||age<0){d.active=false;continue;}
   const t=age/.42,size=(readability?QUIET_SIZES:SIZES)[d.kind],fade=1-t;
   // Brief, directional collapse uses the existing directional atlas batches.
   if(t<.6){
    const b=bodies[d.kind*4+d.direction];
    position.set(d.x+d.dx*age*1.5,0,d.z+d.dz*age*1.5).addScaledVector(up,size*.32*fade);
    roll.setFromAxisAngle(axis,d.spin*t*1.5);quaternion.copy(camera.quaternion).multiply(roll);scale.set(size*(1-t),size*(1-t)*.75,1);
    matrix.compose(position,quaternion,scale);b.setMatrixAt(b.count,matrix);color.setHex(0xc8b78a).multiplyScalar(.7+fade*.3);b.setColorAt(b.count++,color);
   }
   for(let j=0;j<4&&flecks.count<FLECK_LIMIT;j++){
    const angle=d.spin+j*2.399,spread=age*(1.4+j*.28);
    position.set(d.x+d.dx*age+Math.cos(angle)*spread,.16+Math.sin(t*Math.PI)*(.3+j*.06),d.z+d.dz*age+Math.sin(angle)*spread);
    roll.setFromAxisAngle(axis,angle+t*5);quaternion.copy(camera.quaternion).multiply(roll);scale.set(.09*fade,.22*fade,1);matrix.compose(position,quaternion,scale);flecks.setMatrixAt(flecks.count,matrix);
    color.setHex(j===0?0xffe5a0:j===1?0xbede9b:0xc69259).multiplyScalar(.65+fade*.35);flecks.setColorAt(flecks.count++,color);
   }
  }
  if(flecks.count){flecks.instanceMatrix.needsUpdate=true;flecks.instanceColor.needsUpdate=true;}
  for(const b of bodies)if(b.count){b.instanceMatrix.needsUpdate=true;b.instanceColor.needsUpdate=true;}
  if(shadows.count)shadows.instanceMatrix.needsUpdate=true;
  return rendered;
 }
 function defeat(e,source){
  if(disposed||!root.visible||!e?.g)return;
  const kind=KINDS.indexOf(e.survivalKind);if(kind<0)return;
  const d=defeats[defeatCursor++%DEFEAT_LIMIT],p=e.g.position;
  const dx=p.x-(source?.x??p.x),dz=p.z-(source?.z??p.z),length=Math.hypot(dx,dz)||1;
  const yaw=Math.atan2(camera.position.x-p.x,camera.position.z-p.z),facing=e.g.rotation.y-yaw,angle=Math.atan2(Math.sin(facing),Math.cos(facing));
  d.active=true;d.time=lastTime;d.x=p.x;d.z=p.z;d.kind=kind;d.dx=dx/length;d.dz=dz/length;d.spin=Math.sin(e.phase||0)>0?1:-1;
  d.direction=Math.abs(angle)<=Math.PI/4?0:Math.abs(angle)>=Math.PI*3/4?2:angle>0?1:3;
 }
 function setActive(active){if(disposed)return;root.visible=Boolean(active);if(!root.visible){clear();flecks.count=0;for(const d of defeats)d.active=false;}}
 function state(){return {readability:readability?'quiet':'classic',act,active:root.visible&&!disposed,capacity:limit,rendered,overflow,bodyBatches:bodies.filter(b=>b.count>0).length,maxBodyBatches:12,shadowBatches:shadows.count?1:0,environmentDrawCalls:act===0?5:act===1?6:2,defeatPetals:flecks.count,maxDefeatPetals:FLECK_LIMIT,defeatPool:DEFEAT_LIMIT,textureCount:textures.size,sharedGround:false,groundArt:act===1?'stadium-clay-hd-v1.webp':act===2?'act3-storm-route-v1.webp':readability?'quiet-stone-v1.webp':GARDEN_SURFACE,groundTextureSize:readability&&act===0?768:mobile?768:1024,actorTextureSize:512,actorArt:ACT_FILES[act],actorFolder:readability?CUTE_FOLDER:'mobile/',mobile:Boolean(mobile),arena:{halfWidth,halfDepth},decorativeObstacles:0,disposed};}
 function dispose(){if(disposed)return;setActive(false);disposed=true;root.removeFromParent();for(const b of bodies)b.dispose();for(const b of [edging,leaves,rocks,shadows,undergrowth,flecks,bases])b.dispose();for(const g of geometries)g.dispose();for(const m of materials)m.dispose();for(const t of textures)t.dispose();root.clear();}
 applyGardenFloor();
 return {setReadability,setAct,setActive,update,defeat,state,dispose};
}
