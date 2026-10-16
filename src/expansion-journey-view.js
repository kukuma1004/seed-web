import * as THREE from 'three';
import {EXPANSION_ENVIRONMENTS} from './expansion-environment-art.js';
// Finite baked scenery and pooled warnings/cover. Environment art never moves
// actors or supplies collision; course walls remain the canonical game state.
export function createExpansionJourneyView(scene,groundTexture,crystalTexture=null){
 const root=new THREE.Group();root.name='expansion-journey';root.visible=false;scene.add(root);
 const plates=new Map();let course='crosswind',garden=false,terrainOnly=false,disposed=false,coverAtlas=false,laneBound=null,siegePhase=null,crosswindFloorTexture=null,crosswindFloorSource=null,crosswindPanoramaTexture=null,crosswindPanoramaSource=null,reflectorsActive=false;
 const plateGeometry=new THREE.PlaneGeometry(1,1),plateMaterial=new THREE.MeshBasicMaterial({toneMapped:false});
 // Outer rows mirror only the painting's garden margins. The central unit
 // rectangle keeps its exact road UVs; a wider camera cannot expose sky bars.
 const crosswindPlateGeometry=new THREE.BufferGeometry();
 crosswindPlateGeometry.setAttribute('position',new THREE.Float32BufferAttribute([-.5,1.5,0,.5,1.5,0,-.5,.5,0,.5,.5,0,-.5,-.5,0,.5,-.5,0,-.5,-1.5,0,.5,-1.5,0],3));
 crosswindPlateGeometry.setAttribute('uv',new THREE.Float32BufferAttribute([0,.75,1,.75,0,1,1,1,0,0,1,0,0,.28,1,.28],2));crosswindPlateGeometry.setIndex([0,2,1,1,2,3,2,4,3,3,4,5,4,6,5,5,6,7]);
 const plate=new THREE.Mesh(plateGeometry,plateMaterial);plate.name='expansion-environment-plate';plate.rotation.x=-Math.PI/2;plate.position.y=.02;plate.visible=false;root.add(plate);
 const floorGeometry=new THREE.PlaneGeometry(8,4).rotateX(-Math.PI/2);
 // The shared room texture repeats at .34. Compensate through this geometry's
 // UVs instead of mutating the texture used by every existing game mode.
 const floorUvs=floorGeometry.getAttribute('uv');for(let i=0;i<floorUvs.count;i++)floorUvs.setXY(i,floorUvs.getX(i)*4,floorUvs.getY(i)*2);
 const floorMaterial=new THREE.MeshStandardMaterial({map:groundTexture,color:0x87a88e,roughness:1});
 const floor=new THREE.InstancedMesh(floorGeometry,floorMaterial,84),m=new THREE.Matrix4();root.add(floor);
 // Borrow the image but own the sampling state. One repeated, world-sized
 // fossil-leaf tile replaces the enlarged illustration without touching shared art.
 const roadGeometry=new THREE.PlaneGeometry(EXPANSION_ENVIRONMENTS.crosswind.width,15).rotateX(-Math.PI/2),roadMaterial=new THREE.MeshBasicMaterial({toneMapped:false,color:0xffffff});
 const road=new THREE.Mesh(roadGeometry,roadMaterial);road.name='crosswind-painted-corridor-floor';road.position.set(EXPANSION_ENVIRONMENTS.crosswind.x,.037,0);road.visible=false;root.add(road);
 // These low stone lips sit beyond the real movement limit. Bevels, inset
 // copper seams and little ivy leaves give the corridor a visible scale;
 // they are scenery only and never pretend to be extra projectile walls.
 const curbShape=new THREE.Shape();curbShape.moveTo(-2.45,-.14);curbShape.lineTo(-2.29,-.27);curbShape.lineTo(2.27,-.27);curbShape.lineTo(2.45,-.12);curbShape.lineTo(2.45,.14);curbShape.lineTo(2.29,.27);curbShape.lineTo(-2.27,.27);curbShape.lineTo(-2.45,.12);curbShape.closePath();
 const curbGeometry=new THREE.ExtrudeGeometry(curbShape,{depth:.18,steps:1,bevelEnabled:true,bevelThickness:.045,bevelSize:.04,bevelSegments:1}).rotateX(-Math.PI/2);
 // Baked top/side values keep shallow stone readable without another light,
 // texture or draw. Long touching pieces read as a low garden wall.
 const curbPositions=curbGeometry.getAttribute('position'),curbColors=new Float32Array(curbPositions.count*3),stoneColor=new THREE.Color();
 for(let i=0;i<curbPositions.count;i++){stoneColor.setHex(curbPositions.getY(i)>.17?0xa3987f:curbPositions.getY(i)>.02?0x827965:0x5f5b4e);curbColors[i*3]=stoneColor.r;curbColors[i*3+1]=stoneColor.g;curbColors[i*3+2]=stoneColor.b;}
 curbGeometry.setAttribute('color',new THREE.BufferAttribute(curbColors,3));
 const curbMaterial=new THREE.MeshStandardMaterial({color:0xffffff,vertexColors:true,roughness:1});
 const curbs=new THREE.InstancedMesh(curbGeometry,curbMaterial,72);curbs.name='crosswind-beveled-boundary';root.add(curbs);
 const seamGeometry=new THREE.PlaneGeometry(4.28,.034).rotateX(-Math.PI/2),seamMaterial=new THREE.MeshBasicMaterial({color:0xc1ad83,toneMapped:false});
 const seams=new THREE.InstancedMesh(seamGeometry,seamMaterial,72);seams.name='crosswind-inset-copper-seams';root.add(seams);
 const leafShape=new THREE.Shape();leafShape.moveTo(0,-.42);leafShape.quadraticCurveTo(.26,-.16,.15,.15);leafShape.quadraticCurveTo(.09,.36,0,.43);leafShape.quadraticCurveTo(-.28,.05,0,-.42);
 const ivyGeometry=new THREE.ShapeGeometry(leafShape,5).rotateX(-Math.PI/2),ivyMaterial=new THREE.MeshBasicMaterial({color:0x63715a,toneMapped:false});
 const ivy=new THREE.InstancedMesh(ivyGeometry,ivyMaterial,108);ivy.name='crosswind-boundary-ivy';root.add(ivy);
 const borderPose=new THREE.Object3D();
 function syncBoundary(){
  let leaves=0;const edge=(laneBound===null?7:laneBound)+.31;
  for(let i=0;i<72;i++){
   const side=i%2?1:-1,x=Math.floor(i/2)*5-18,z=side*edge;
   m.makeTranslation(x,.032,z);curbs.setMatrixAt(i,m);
   m.makeTranslation(x,.262,z);seams.setMatrixAt(i,m);
   // Stable authored placement at section entry; no random or frame work.
   if(i%4!==0)for(let j=0;j<2;j++){
    borderPose.position.set(x+(j?1.95:-1.9),.274,z+side*(j?.17:-.16));borderPose.rotation.set(0,side*(.4+j*.55+i*.07),0);borderPose.scale.set(j?.52:.7,1,j?.52:.7);borderPose.updateMatrix();ivy.setMatrixAt(leaves++,borderPose.matrix);
   }
  }
  ivy.count=leaves;for(const batch of [curbs,seams,ivy]){batch.instanceMatrix.needsUpdate=true;batch.computeBoundingSphere();}
 }
 const reflectorGeometry=new THREE.PlaneGeometry(1,1).rotateX(-Math.PI/2),reflectorMaterial=new THREE.MeshBasicMaterial({color:0xc3d8c3,depthWrite:false,toneMapped:false});
 const reflectorMarks=new THREE.InstancedMesh(reflectorGeometry,reflectorMaterial,16);reflectorMarks.name='crosswind-reflector-contact-marks';reflectorMarks.count=0;reflectorMarks.visible=false;root.add(reflectorMarks);
 function syncReflectors(panels=[]){
  let count=0;if(course==='crosswind')for(const p of panels.slice(0,4)){
   // Trace the actual bounce footprint; wider decorative fields would make
   // players expect collisions where the projectile slab cannot reflect.
   for(const side of [-1,1]){m.makeScale(.07,1,p.d);m.setPosition(p.x+side*(p.w/2-.035),.065,p.z);reflectorMarks.setMatrixAt(count++,m);m.makeScale(p.w,1,.05);m.setPosition(p.x,.065,p.z+side*(p.d/2-.025));reflectorMarks.setMatrixAt(count++,m);}
  }
  reflectorMarks.count=count;reflectorMarks.instanceMatrix.needsUpdate=true;reflectorMarks.computeBoundingSphere();reflectorMarks.visible=reflectorsActive&&count>0&&!terrainOnly;
 }
 function setCrosswindFloorTexture(texture){
  if(disposed||texture===crosswindFloorSource)return;crosswindFloorSource=texture||null;crosswindFloorTexture?.dispose();crosswindFloorTexture=texture?texture.clone():null;
  if(crosswindFloorTexture){crosswindFloorTexture.wrapS=crosswindFloorTexture.wrapT=THREE.RepeatWrapping;crosswindFloorTexture.repeat.set(EXPANSION_ENVIRONMENTS.crosswind.width/6,(laneBound===null?14:laneBound*2)/6);crosswindFloorTexture.offset.set(0,0);crosswindFloorTexture.needsUpdate=true;}
  roadMaterial.map=crosswindFloorTexture;roadMaterial.needsUpdate=true;syncFloor();
 }
 const laneGeometry=new THREE.PlaneGeometry(.16,1.1).rotateX(-Math.PI/2),laneMaterial=new THREE.MeshBasicMaterial({color:0xd7e8a5,transparent:true,opacity:.32,depthWrite:false});
 const lanes=new THREE.InstancedMesh(laneGeometry,laneMaterial,40);for(let i=0;i<40;i++){m.makeTranslation(i*3, .025,i%2?6.3:-6.3);lanes.setMatrixAt(i,m);}lanes.instanceMatrix.needsUpdate=true;root.add(lanes);
 // Crop the square cutout so its visible width matches the collision footprint.
 const crystalGeometry=new THREE.PlaneGeometry(1.4,2.1),uv=crystalGeometry.getAttribute('uv');for(let i=0;i<uv.count;i++)uv.setXY(i,.26+uv.getX(i)*.48,.04+uv.getY(i)*.92);
 const crystalMaterial=new THREE.MeshBasicMaterial({map:crystalTexture,color:0xffffff,transparent:true,alphaTest:.08,depthWrite:false,toneMapped:false,side:THREE.DoubleSide,forceSinglePass:true});
 const crystals=new THREE.InstancedMesh(crystalGeometry,crystalMaterial,20);crystals.count=0;crystals.frustumCulled=false;root.add(crystals);
 crystals.name='expansion-crystal-intact';
 const coverStages=[crystals];
 for(const name of ['damaged','broken']){const batch=new THREE.InstancedMesh(crystalGeometry.clone(),crystalMaterial,20);batch.name='expansion-crystal-'+name;batch.count=0;batch.frustumCulled=false;root.add(batch);coverStages.push(batch);}
 const shadowGeometry=new THREE.CircleGeometry(.65,12).rotateX(-Math.PI/2),shadowMaterial=new THREE.MeshBasicMaterial({color:0x142c38,transparent:true,opacity:.35,depthWrite:false});
 const shadows=new THREE.InstancedMesh(shadowGeometry,shadowMaterial,20);shadows.count=0;shadows.frustumCulled=false;root.add(shadows);
 const crystalPose=new THREE.Object3D(),color=new THREE.Color();
 const coverCounts=[0,0,0];
 function setCoverTexture(texture){
  if(disposed||!texture||crystalMaterial.map===texture&&coverAtlas)return;
  crystalMaterial.map=texture;crystalMaterial.needsUpdate=true;
  for(let frame=0;frame<3;frame++){
   const geometry=coverStages[frame].geometry,uv=geometry.getAttribute('uv');
   // Keep the three sheets' identical .88 contact anchor. Damage changes the
   // silhouette only; broken residue never becomes a new physical obstacle.
   if(!coverAtlas)geometry.translate(0,(.88-.5)*2.1,0);
   for(let i=0;i<uv.count;i++)uv.setXY(i,(frame+(i%2))/3,i<2?1:0);uv.needsUpdate=true;
  }
  coverAtlas=true;
 }
 function syncFloor(){
  plateMaterial.map=course==='crosswind'?crosswindPanoramaTexture:(garden?plates.get('crystalGarden')||plates.get(course):plates.get(course))||null;plateMaterial.needsUpdate=true;
  plate.visible=!terrainOnly&&Boolean(plateMaterial.map);
  // One painting owns ground, wall contact and diagonal palm shadows. A
  // repeated floor would erase that depth; retain it only as a load fallback.
  road.visible=!terrainOnly&&!plate.visible&&course==='crosswind'&&Boolean(crosswindFloorTexture);
  floor.visible=!terrainOnly&&!road.visible&&!plate.visible;
  reflectorMarks.visible=!terrainOnly&&course==='crosswind'&&reflectorsActive&&reflectorMarks.count>0;
  lanes.visible=!terrainOnly&&course==='crosswind'&&(!plate.visible||laneBound!==null);
  // The new painted stone wall aligns with the real lane. Keep the low-cost
  // geometry only as an asset-load fallback instead of drawing bars over it.
  for(const batch of [curbs,seams,ivy])batch.visible=!terrainOnly&&course==='crosswind'&&!plate.visible;
  for(let i=0;i<undertowBatches.length;i++)undertowBatches[i].visible=!terrainOnly&&course==='crosswind'&&undertowBatches[i].count>0&&(i<2||!undertowMaterials[0].map);
 }
 function setPlate(act,texture){
  if(disposed)return;plates.set(act,texture);
  if(act==='crosswind'&&texture!==crosswindPanoramaSource){
   crosswindPanoramaSource=texture||null;crosswindPanoramaTexture?.dispose();crosswindPanoramaTexture=texture?texture.clone():null;
   if(crosswindPanoramaTexture){
    // Mirrored edge joins repeat the illustration without hard seams. Each
    // painted tree now keeps the source aspect instead of stretching across
    // the entire 180-unit course. The borrowed cache texture stays untouched.
    const image=texture.image,aspect=image?.width&&image?.height?image.width/image.height:16/9;
    crosswindPanoramaTexture.wrapS=THREE.MirroredRepeatWrapping;crosswindPanoramaTexture.wrapT=THREE.ClampToEdgeWrapping;
    crosswindPanoramaTexture.repeat.set(EXPANSION_ENVIRONMENTS.crosswind.width/(EXPANSION_ENVIRONMENTS.crosswind.depth*aspect),1);crosswindPanoramaTexture.offset.set(0,0);crosswindPanoramaTexture.needsUpdate=true;
   }
  }
  if(course===act||garden&&act==='crystalGarden')syncFloor();
 }
 function setCourse(act,{halfDepth=null,plateBounds=null,crystalGarden=false}={}){
  course=act;garden=act==='crystalGorge'&&crystalGarden;siegePhase=null;plateMaterial.color.setHex(0xffffff);plate.geometry=act==='crosswind'?crosswindPlateGeometry:plateGeometry;
  reflectorMarks.count=0;reflectorMarks.visible=false;
  syncUndertow(null);
  laneBound=Number.isFinite(halfDepth)&&halfDepth>0?halfDepth:null;
  if(act==='crosswind'){
   // The painted road ends at the real wall, before its outside stone lip.
   // Tile scale stays six world units for both modern and legacy corridors.
   const depth=laneBound===null?14:laneBound*2;road.scale.z=depth/15;
   if(crosswindFloorTexture)crosswindFloorTexture.repeat.set(EXPANSION_ENVIRONMENTS.crosswind.width/6,depth/6);
  }
  const canyon=act==='crystalGorge';floor.count=canyon?12:84;lanes.visible=!canyon;floorMaterial.color.setHex(canyon?0x7e9aab:0x87a88e);
  // Preserve the painting's road/wall composition at the canonical bounds.
  // Mirror horizontally at source aspect, including legacy/boss lane widths.
  const environment=EXPANSION_ENVIRONMENTS[act]||EXPANSION_ENVIRONMENTS.crosswind;
  const compact=plateBounds&&Number.isFinite(plateBounds.width)&&Number.isFinite(plateBounds.depth)&&plateBounds.width>0&&plateBounds.depth>0;
  plate.scale.set(compact?plateBounds.width:environment.width,compact?plateBounds.depth:environment.depth,1);plate.position.set(environment.x,.02,environment.z);if(act==='crosswind'&&!compact){const laneScale=(laneBound??7)/5.4;plate.scale.y*=laneScale;plate.position.z*=laneScale;}
  if(act==='crosswind'&&crosswindPanoramaTexture){const image=crosswindPanoramaSource.image,aspect=image?.width&&image?.height?image.width/image.height:16/9;crosswindPanoramaTexture.repeat.x=plate.scale.x/(plate.scale.y*aspect);}
  for(let i=0;i<floor.count;i++){m.makeTranslation(canyon?(Math.floor(i/4)-1)*8:Math.floor(i/4)*8-16,.035,(i%4)*4-6);floor.setMatrixAt(i,m);}floor.instanceMatrix.needsUpdate=true;floor.computeBoundingSphere();
  for(let i=0;i<40;i++){m.makeTranslation(i*3,.045,(i%2?1:-1)*(laneBound===null?6.3:laneBound-.15));lanes.setMatrixAt(i,m);}lanes.instanceMatrix.needsUpdate=true;lanes.computeBoundingSphere();
  syncBoundary();
  if(!canyon){for(const batch of coverStages)batch.count=0;shadows.count=0;}
  syncFloor();
 }
 function syncCrystals(walls,camera){
  coverCounts.fill(0);let count=0;for(const w of walls){if(w.broken&&!coverAtlas||count>=20)continue;
   const frame=coverAtlas?(w.broken?2:w.hp/w.maxHp<.5?1:0):0,batch=coverStages[frame],index=coverCounts[frame]++;
   crystalPose.position.set(w.x,coverAtlas?0.025:1.02,w.z);crystalPose.quaternion.copy(camera.quaternion);crystalPose.scale.set(w.w/1.2,1,w.d/1.2);crystalPose.updateMatrix();batch.setMatrixAt(index,crystalPose.matrix);
   color.setHex(!coverAtlas&&w.hp/w.maxHp<.4?0xffdea0:0xffffff);batch.setColorAt(index,color);
   m.makeScale(w.w/1.2,1,w.d/1.2);m.setPosition(w.x,.035,w.z);shadows.setMatrixAt(count,m);count++;
  }
  for(let i=0;i<3;i++){const batch=coverStages[i];batch.count=coverCounts[i];batch.instanceMatrix.needsUpdate=true;if(batch.instanceColor)batch.instanceColor.needsUpdate=true;}shadows.count=count;shadows.instanceMatrix.needsUpdate=true;
 }
 const lineGeometry=new THREE.PlaneGeometry(1,1),lineMaterial=new THREE.MeshBasicMaterial({color:0xff9351,transparent:true,opacity:.38,depthWrite:false,toneMapped:false,side:THREE.DoubleSide});
 const siegeWarningGeometry=new THREE.RingGeometry(.72,.85,24),siegeEntryMaterial=new THREE.MeshBasicMaterial({color:0xc7e9ef,transparent:true,opacity:.45,depthWrite:false,toneMapped:false,side:THREE.DoubleSide});
 const tells=Array.from({length:28},()=>{const o=new THREE.Mesh(lineGeometry,lineMaterial);o.visible=false;root.add(o);return o;});let tellCount=0;
 function tell(t){if(tellCount>=tells.length)return;const o=tells[tellCount++],p=t.position,round=t.kind==='siege-strike'||(siegePhase||course==='crosswind')&&t.kind==='entry';o.geometry=round?siegeWarningGeometry:lineGeometry;o.material=round&&t.kind==='entry'?siegeEntryMaterial:lineMaterial;o.visible=true;o.position.set(p.x,.05,p.z);const d=t.dir||t.direction,length=t.length||6;
  if(d){o.scale.set(t.width||.16,length,1);o.rotation.set(-Math.PI/2,0,Math.atan2(d.x,d.z));o.position.x+=d.x*length/2;o.position.z+=d.z*length/2;}
  else{o.rotation.set(-Math.PI/2,0,0);o.scale.set(round?1:1.3,round?1:1.3,1);}
 }
 // Two finite sand depressions: shared geometry/materials, no particles or
 // per-frame objects. All three batches are hidden outside Journey Act4.
 function sandBowlGeometry(){
  const positions=[],colors=[],indices=[],sand=new THREE.Color(),radii=[0,.23,.55,.83,1],heights=[.001,.004,.013,.043,.018],tones=[0x574d40,0x716049,0x9f8963,0xc3ad83,0xcabb98],segments=48;
  for(let ring=0;ring<radii.length;ring++)for(let i=0;i<=segments;i++){const a=i/segments*Math.PI*2;positions.push(Math.cos(a)*radii[ring],heights[ring],Math.sin(a)*radii[ring]);sand.setHex(tones[ring]);colors.push(sand.r,sand.g,sand.b);}
  for(let ring=0;ring<radii.length-1;ring++)for(let i=0;i<segments;i++){const a=ring*(segments+1)+i,b=a+segments+1;indices.push(a,b,a+1,a+1,b,b+1);}
  const g=new THREE.BufferGeometry(),uv=[];for(let i=0;i<positions.length;i+=3)uv.push((positions[i]+1)/2,(positions[i+2]+1)/2);g.setAttribute('uv',new THREE.Float32BufferAttribute(uv,2));g.setAttribute('gardenSandFrame',new THREE.InstancedBufferAttribute(new Float32Array(2),1));g.setAttribute('position',new THREE.Float32BufferAttribute(positions,3));g.setAttribute('color',new THREE.Float32BufferAttribute(colors,3));g.setIndex(indices);g.computeVertexNormals();return g;
 }
 function sandLeafGeometry(){
  // Three inward, tapering leaf veins replace the contracting magic circle.
  const positions=[],indices=[],steps=12;
  for(let arm=0;arm<3;arm++){
   const start=positions.length/3;
   for(let i=0;i<=steps;i++){const t=i/steps,r=.23+.55*t,a=arm*Math.PI*2/3+t*.95,width=.004+Math.sin(t*Math.PI)*.033;for(const side of [-1,1])positions.push(Math.cos(a)*r+Math.cos(a+Math.PI/2)*width*side,.05,Math.sin(a)*r+Math.sin(a+Math.PI/2)*width*side);}
   for(let i=0;i<steps;i++){const a=start+i*2;indices.push(a,a+2,a+1,a+1,a+2,a+3);}
  }
  const g=new THREE.BufferGeometry();g.setAttribute('position',new THREE.Float32BufferAttribute(positions,3));g.setIndex(indices);g.computeVertexNormals();return g;
 }
 function sandContourGeometry(){
  // Eight short warm arcs mark the exact pull radius, never a safe/pickup ring.
  const g=new THREE.RingGeometry(.975,1,64).rotateX(-Math.PI/2),index=g.getIndex(),segments=[];
  for(let i=0;i<64;i++)if(i%8<4)for(let j=0;j<6;j++)segments.push(index.getX(i*6+j));g.setIndex(segments);return g;
 }
 const undertowGeometry=[sandBowlGeometry(),sandContourGeometry(),sandLeafGeometry()];
 const undertowMaterials=[new THREE.MeshBasicMaterial({color:0xffffff,vertexColors:true,transparent:true,opacity:.68,depthWrite:false,toneMapped:false,side:THREE.DoubleSide,forceSinglePass:true}),...[[0xffffff,.8],[0xe2cb94,.68]].map(([tint,opacity])=>new THREE.MeshBasicMaterial({color:tint,transparent:true,opacity,depthWrite:false,toneMapped:false,side:THREE.DoubleSide,forceSinglePass:true}))];
 const sandFrames=undertowGeometry[0].getAttribute('gardenSandFrame');
 undertowMaterials[0].onBeforeCompile=shader=>{shader.vertexShader=shader.vertexShader.replace('#include <common>','#include <common>\nattribute float gardenSandFrame;').replace('#include <uv_vertex>','#include <uv_vertex>\n#ifdef USE_MAP\nvMapUv.x=(vMapUv.x+gardenSandFrame)*.5;\n#endif');};
 undertowMaterials[0].customProgramCacheKey=()=> 'crosswind-sand-atlas-v1';
 function setCrosswindSandTexture(texture){if(disposed||!texture||undertowMaterials[0].map===texture)return;const material=undertowMaterials[0];material.map=texture;material.vertexColors=false;material.opacity=1;material.alphaTest=.04;material.needsUpdate=true;syncFloor();}
 const undertowBatches=undertowGeometry.map((g,i)=>{const mesh=new THREE.InstancedMesh(g,undertowMaterials[i],2);mesh.name='crosswind-undertow-'+i;mesh.count=0;mesh.visible=false;mesh.frustumCulled=false;root.add(mesh);return mesh;});
 const undertowEmpty=[],undertowCache=Array.from({length:3},()=>new Float64Array(12).fill(NaN)),undertowMatrixDirty=new Uint8Array(3),undertowColorDirty=new Uint8Array(3);
 function syncUndertow(fields){
  let count=0,sandChanged=false;const painted=Boolean(undertowMaterials[0].map);undertowMatrixDirty.fill(0);undertowColorDirty.fill(0);
  for(const f of fields||undertowEmpty){if(count>=2||f.phase==='off')continue;const frame=f.phase==='warning'?0:1;if(sandFrames.array[count]!==frame){sandFrames.array[count]=frame;sandChanged=true;}
   for(let i=0;i<3;i++){
    if(i===2&&painted)continue;
    const mesh=undertowBatches[i],cached=undertowCache[i],offset=count*6,radius=f.radius*(i===2?.82+.18*(1-f.progress):1),turn=i===2?f.progress*.55:0;
    const tint=i===1?(frame?0xe9a765:0xffd198):f.phase==='warning'?(i===0?0xf2dfbc:0xfff0cd):(i===0?0xd0bfa5:0xd7b77c),strength=i===1?(frame?.45+.55*Math.sin(f.progress*Math.PI):.55+.45*f.progress):1;
    if(cached[offset]!==f.x||cached[offset+1]!==f.z||cached[offset+2]!==radius||cached[offset+3]!==turn){
     borderPose.position.set(f.x,.048+i*.002,f.z);borderPose.rotation.set(0,turn,0);borderPose.scale.set(radius,1,radius);borderPose.updateMatrix();mesh.setMatrixAt(count,borderPose.matrix);undertowMatrixDirty[i]=1;
     cached[offset]=f.x;cached[offset+1]=f.z;cached[offset+2]=radius;cached[offset+3]=turn;
    }
    if(cached[offset+4]!==tint||cached[offset+5]!==strength){color.setHex(tint).multiplyScalar(strength);mesh.setColorAt(count,color);undertowColorDirty[i]=1;cached[offset+4]=tint;cached[offset+5]=strength;}
   }count++;
  }
  if(sandChanged)sandFrames.needsUpdate=true;for(let i=0;i<3;i++){const mesh=undertowBatches[i];mesh.count=i===2&&painted?0:count;mesh.visible=course==='crosswind'&&!terrainOnly&&mesh.count>0;if(undertowMatrixDirty[i])mesh.instanceMatrix.needsUpdate=true;if(undertowColorDirty[i])mesh.instanceColor.needsUpdate=true;}
 }
 setCourse(course);
 return {root,hasPlate:act=>Boolean(plates.get(act)),setCrosswindSandTexture,syncUndertow,setSiegePhase:phase=>{siegePhase=phase;plateMaterial.color.setHex(phase==='defense'||phase==='boss'?0xd3dde6:0xfff6e8);},setPlate,setCrosswindFloorTexture,syncReflectors,setReflectorsActive:v=>{reflectorsActive=Boolean(v);reflectorMarks.visible=reflectorsActive&&course==='crosswind'&&!terrainOnly&&reflectorMarks.count>0;},setCoverTexture,setActive:v=>{root.visible=v;},setTerrainOnly:v=>{terrainOnly=Boolean(v);syncFloor();},setCourse,syncCrystals,beginFrame:()=>{tellCount=0;for(const o of tells)o.visible=false;},tell,
  dispose:()=>{if(disposed)return;disposed=true;root.removeFromParent();plates.clear();for(const mesh of undertowBatches)mesh.dispose();for(const g of undertowGeometry)g.dispose();for(const mat of undertowMaterials)mat.dispose();crosswindFloorTexture?.dispose();crosswindPanoramaTexture?.dispose();for(const o of [floor,lanes,curbs,seams,ivy,reflectorMarks,...coverStages,shadows])o.dispose();for(const o of new Set([plateGeometry,crosswindPlateGeometry,plateMaterial,floorGeometry,roadGeometry,roadMaterial,curbGeometry,curbMaterial,seamGeometry,seamMaterial,ivyGeometry,ivyMaterial,reflectorGeometry,reflectorMaterial,laneGeometry,lineGeometry,siegeWarningGeometry,siegeEntryMaterial,...coverStages.map(o=>o.geometry),shadowGeometry,floorMaterial,laneMaterial,lineMaterial,crystalMaterial,shadowMaterial]))o.dispose();}};
}
