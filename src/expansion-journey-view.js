import * as THREE from 'three';
import {EXPANSION_ENVIRONMENTS} from './expansion-environment-art.js';
// Finite baked scenery and pooled warnings/cover. Environment art never moves
// actors or supplies collision; course walls remain the canonical game state.
export function createExpansionJourneyView(scene,groundTexture,crystalTexture=null){
 const root=new THREE.Group();root.name='expansion-journey';root.visible=false;scene.add(root);
 const plates=new Map();let course='crosswind',terrainOnly=false,disposed=false,coverAtlas=false,laneBound=null,siegePhase=null,crosswindFloorTexture=null,crosswindFloorSource=null,crosswindPanoramaTexture=null,crosswindPanoramaSource=null,reflectorsActive=false;
 const plateGeometry=new THREE.PlaneGeometry(1,1),plateMaterial=new THREE.MeshBasicMaterial({toneMapped:false});
 const plate=new THREE.Mesh(plateGeometry,plateMaterial);plate.name='expansion-environment-plate';plate.rotation.x=-Math.PI/2;plate.position.y=.02;plate.visible=false;root.add(plate);
 const floorGeometry=new THREE.PlaneGeometry(8,4).rotateX(-Math.PI/2);
 // The shared room texture repeats at .34. Compensate through this geometry's
 // UVs instead of mutating the texture used by every existing game mode.
 const floorUvs=floorGeometry.getAttribute('uv');for(let i=0;i<floorUvs.count;i++)floorUvs.setXY(i,floorUvs.getX(i)*4,floorUvs.getY(i)*2);
 const floorMaterial=new THREE.MeshStandardMaterial({map:groundTexture,color:0x87a88e,roughness:1});
 const floor=new THREE.InstancedMesh(floorGeometry,floorMaterial,84),m=new THREE.Matrix4();root.add(floor);
 // Borrow the image but own the sampling state. One repeated, world-sized
 // fossil-leaf tile replaces the enlarged illustration without touching shared art.
 const roadGeometry=new THREE.PlaneGeometry(EXPANSION_ENVIRONMENTS.crosswind.width,15).rotateX(-Math.PI/2),roadMaterial=new THREE.MeshBasicMaterial({toneMapped:false,color:0xc1bdae});
 const road=new THREE.Mesh(roadGeometry,roadMaterial);road.name='crosswind-painted-corridor-floor';road.position.set(EXPANSION_ENVIRONMENTS.crosswind.x,.037,0);road.visible=false;root.add(road);
 // These low stone lips sit beyond the real movement limit. Bevels, inset
 // copper seams and little ivy leaves give the corridor a visible scale;
 // they are scenery only and never pretend to be extra projectile walls.
 const curbShape=new THREE.Shape();curbShape.moveTo(-2.3,-.14);curbShape.lineTo(-2.13,-.27);curbShape.lineTo(2.13,-.27);curbShape.lineTo(2.3,-.14);curbShape.lineTo(2.3,.14);curbShape.lineTo(2.13,.27);curbShape.lineTo(-2.13,.27);curbShape.lineTo(-2.3,.14);curbShape.closePath();
 const curbGeometry=new THREE.ExtrudeGeometry(curbShape,{depth:.18,steps:1,bevelEnabled:true,bevelThickness:.045,bevelSize:.04,bevelSegments:1}).rotateX(-Math.PI/2);
 const curbMaterial=new THREE.MeshStandardMaterial({color:0x718e7d,roughness:1});
 const curbs=new THREE.InstancedMesh(curbGeometry,curbMaterial,72);curbs.name='crosswind-beveled-boundary';root.add(curbs);
 const seamGeometry=new THREE.PlaneGeometry(3.9,.055).rotateX(-Math.PI/2),seamMaterial=new THREE.MeshBasicMaterial({color:0x9e9a67,toneMapped:false});
 const seams=new THREE.InstancedMesh(seamGeometry,seamMaterial,72);seams.name='crosswind-inset-copper-seams';root.add(seams);
 const leafShape=new THREE.Shape();leafShape.moveTo(0,-.42);leafShape.quadraticCurveTo(.26,-.16,.15,.15);leafShape.quadraticCurveTo(.09,.36,0,.43);leafShape.quadraticCurveTo(-.28,.05,0,-.42);
 const ivyGeometry=new THREE.ShapeGeometry(leafShape,5).rotateX(-Math.PI/2),ivyMaterial=new THREE.MeshBasicMaterial({color:0x59795e,toneMapped:false});
 const ivy=new THREE.InstancedMesh(ivyGeometry,ivyMaterial,108);ivy.name='crosswind-boundary-ivy';root.add(ivy);
 const borderPose=new THREE.Object3D();
 function syncBoundary(){
  let leaves=0;const edge=(laneBound===null?7:laneBound)+.26;
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
 const reflectorGeometry=new THREE.PlaneGeometry(1,1).rotateX(-Math.PI/2),reflectorMaterial=new THREE.MeshBasicMaterial({color:0xffdf97,depthWrite:false,toneMapped:false});
 const reflectorMarks=new THREE.InstancedMesh(reflectorGeometry,reflectorMaterial,16);reflectorMarks.name='crosswind-reflector-contact-marks';reflectorMarks.count=0;reflectorMarks.visible=false;root.add(reflectorMarks);
 function syncReflectors(panels=[]){
  let count=0;if(course==='crosswind')for(const p of panels.slice(0,4)){
   // Trace the actual bounce footprint; wider decorative fields would make
   // players expect collisions where the projectile slab cannot reflect.
   for(const side of [-1,1]){m.makeScale(.085,1,p.d+.2);m.setPosition(p.x+side*(p.w/2+.085),.065,p.z);reflectorMarks.setMatrixAt(count++,m);m.makeScale(p.w+.25,1,.085);m.setPosition(p.x,.065,p.z+side*(p.d/2+.085));reflectorMarks.setMatrixAt(count++,m);}
  }
  reflectorMarks.count=count;reflectorMarks.instanceMatrix.needsUpdate=true;reflectorMarks.computeBoundingSphere();reflectorMarks.visible=reflectorsActive&&count>0&&!terrainOnly;
 }
 function setCrosswindFloorTexture(texture){
  if(disposed||texture===crosswindFloorSource)return;crosswindFloorSource=texture||null;crosswindFloorTexture?.dispose();crosswindFloorTexture=texture?texture.clone():null;
  if(crosswindFloorTexture){crosswindFloorTexture.wrapS=crosswindFloorTexture.wrapT=THREE.RepeatWrapping;crosswindFloorTexture.repeat.set(EXPANSION_ENVIRONMENTS.crosswind.width/8,15/8);crosswindFloorTexture.offset.set(0,0);crosswindFloorTexture.needsUpdate=true;}
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
  plateMaterial.map=course==='crosswind'?crosswindPanoramaTexture:plates.get(course)||null;plateMaterial.needsUpdate=true;
  plate.visible=!terrainOnly&&Boolean(plateMaterial.map);
  // The panorama spans the whole journey. Its painted paving cannot supply
  // local floor detail at that scale: keep world-sized stones on the corridor.
  road.visible=!terrainOnly&&course==='crosswind'&&Boolean(crosswindFloorTexture);
  floor.visible=!terrainOnly&&!road.visible&&(course==='crosswind'||!plate.visible);
  reflectorMarks.visible=!terrainOnly&&course==='crosswind'&&reflectorsActive&&reflectorMarks.count>0;
  lanes.visible=!terrainOnly&&course==='crosswind'&&(!plate.visible||laneBound!==null);
  for(const batch of [curbs,seams,ivy])batch.visible=!terrainOnly&&course==='crosswind';
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
  if(course===act)syncFloor();
 }
 function setCourse(act,{halfDepth=null,plateBounds=null}={}){
  course=act;siegePhase=null;plateMaterial.color.setHex(0xffffff);
  reflectorMarks.count=0;reflectorMarks.visible=false;
  syncUndertow(null);
  laneBound=Number.isFinite(halfDepth)&&halfDepth>0?halfDepth:null;
  const canyon=act==='crystalGorge';floor.count=canyon?12:84;lanes.visible=!canyon;floorMaterial.color.setHex(canyon?0x7e9aab:0x87a88e);
  // Preserve the plate's vertical composition; only horizontal sampling is
  // mirrored at the source aspect. The independent tiled road defines local
  // paving scale, and boundary trim follows the canonical movement limit.
  const environment=EXPANSION_ENVIRONMENTS[act]||EXPANSION_ENVIRONMENTS.crosswind;
  const compact=plateBounds&&Number.isFinite(plateBounds.width)&&Number.isFinite(plateBounds.depth)&&plateBounds.width>0&&plateBounds.depth>0;
  plate.scale.set(compact?plateBounds.width:environment.width,compact?plateBounds.depth:environment.depth,1);plate.position.set(environment.x,.02,environment.z);
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
 function tell(t){if(tellCount>=tells.length)return;const o=tells[tellCount++],p=t.position,round=t.kind==='siege-strike'||siegePhase&&t.kind==='entry';o.geometry=round?siegeWarningGeometry:lineGeometry;o.material=round&&t.kind==='entry'?siegeEntryMaterial:lineMaterial;o.visible=true;o.position.set(p.x,.05,p.z);const d=t.dir||t.direction,length=t.length||6;
  if(d){o.scale.set(t.width||.16,length,1);o.rotation.set(-Math.PI/2,0,Math.atan2(d.x,d.z));o.position.x+=d.x*length/2;o.position.z+=d.z*length/2;}
  else{o.rotation.set(-Math.PI/2,0,0);o.scale.set(round?1:1.3,round?1:1.3,1);}
 }
 // Two finite sand depressions: shared geometry/materials, no particles or
 // per-frame objects. All three batches are hidden outside Journey Act4.
 const undertowGeometry=[new THREE.CircleGeometry(1,32).rotateX(-Math.PI/2),new THREE.RingGeometry(.94,1,48).rotateX(-Math.PI/2),new THREE.RingGeometry(.35,.4,32).rotateX(-Math.PI/2)];
 const undertowMaterials=[.12,.7,.55].map(opacity=>new THREE.MeshBasicMaterial({color:0xe4be73,transparent:true,opacity,depthWrite:false,toneMapped:false,side:THREE.DoubleSide}));
 const undertowBatches=undertowGeometry.map((g,i)=>{const mesh=new THREE.InstancedMesh(g,undertowMaterials[i],2);mesh.name='crosswind-undertow-'+i;mesh.count=0;mesh.visible=false;mesh.frustumCulled=false;root.add(mesh);return mesh;});
 const undertowEmpty=[];
 function syncUndertow(fields){
  let count=0;for(const f of fields||undertowEmpty){if(count>=2||f.phase==='off')continue;
   color.setHex(f.phase==='warning'?0xffdc93:0xbe8d49);
   for(let i=0;i<3;i++){const mesh=undertowBatches[i],radius=f.radius*(i===2?.4+.6*(1-f.progress):1);m.makeScale(radius,1,radius);m.setPosition(f.x,.056+i*.002,f.z);mesh.setMatrixAt(count,m);mesh.setColorAt(count,color);}count++;
  }
  for(const mesh of undertowBatches){mesh.count=count;mesh.visible=course==='crosswind'&&!terrainOnly&&count>0;if(count){mesh.instanceMatrix.needsUpdate=true;mesh.instanceColor.needsUpdate=true;}}
 }
 setCourse(course);
 return {root,syncUndertow,setSiegePhase:phase=>{siegePhase=phase;plateMaterial.color.setHex(phase==='defense'||phase==='boss'?0xc3c6e4:0xeee6e0);},setPlate,setCrosswindFloorTexture,syncReflectors,setReflectorsActive:v=>{reflectorsActive=Boolean(v);reflectorMarks.visible=reflectorsActive&&course==='crosswind'&&!terrainOnly&&reflectorMarks.count>0;},setCoverTexture,setActive:v=>{root.visible=v;},setTerrainOnly:v=>{terrainOnly=Boolean(v);syncFloor();},setCourse,syncCrystals,beginFrame:()=>{tellCount=0;for(const o of tells)o.visible=false;},tell,
  dispose:()=>{if(disposed)return;disposed=true;root.removeFromParent();plates.clear();for(const mesh of undertowBatches)mesh.dispose();for(const g of undertowGeometry)g.dispose();for(const mat of undertowMaterials)mat.dispose();crosswindFloorTexture?.dispose();crosswindPanoramaTexture?.dispose();for(const o of [floor,lanes,curbs,seams,ivy,reflectorMarks,...coverStages,shadows])o.dispose();for(const o of new Set([plateGeometry,plateMaterial,floorGeometry,roadGeometry,roadMaterial,curbGeometry,curbMaterial,seamGeometry,seamMaterial,ivyGeometry,ivyMaterial,reflectorGeometry,reflectorMaterial,laneGeometry,lineGeometry,siegeWarningGeometry,siegeEntryMaterial,...coverStages.map(o=>o.geometry),shadowGeometry,floorMaterial,laneMaterial,lineMaterial,crystalMaterial,shadowMaterial]))o.dispose();}};
}
