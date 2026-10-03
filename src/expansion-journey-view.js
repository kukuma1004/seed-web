import * as THREE from 'three';
// Temporary course kit for the developer slice. Existing flight art is reused;
// final Act4/5 scenery and boss art are still a separate visual milestone.
export function createExpansionJourneyView(scene,groundTexture,crystalTexture=null){
 const root=new THREE.Group();root.name='expansion-journey';root.visible=false;scene.add(root);
 const floorGeometry=new THREE.PlaneGeometry(8,4).rotateX(-Math.PI/2);
 const floorMaterial=new THREE.MeshStandardMaterial({map:groundTexture,color:0x87a88e,roughness:1});
 const floor=new THREE.InstancedMesh(floorGeometry,floorMaterial,80),m=new THREE.Matrix4();
 for(let x=0;x<20;x++)for(let z=0;z<4;z++){m.makeTranslation(x*8-8,.015,z*4-6);floor.setMatrixAt(x*4+z,m);}floor.instanceMatrix.needsUpdate=true;root.add(floor);
 const laneGeometry=new THREE.PlaneGeometry(.16,1.1).rotateX(-Math.PI/2),laneMaterial=new THREE.MeshBasicMaterial({color:0xd7e8a5,transparent:true,opacity:.32,depthWrite:false});
 const lanes=new THREE.InstancedMesh(laneGeometry,laneMaterial,40);for(let i=0;i<40;i++){m.makeTranslation(i*3, .025,i%2?6.3:-6.3);lanes.setMatrixAt(i,m);}lanes.instanceMatrix.needsUpdate=true;root.add(lanes);
 // Crop the square cutout so its visible width matches the collision footprint.
 const crystalGeometry=new THREE.PlaneGeometry(1.4,2.1),uv=crystalGeometry.getAttribute('uv');for(let i=0;i<uv.count;i++)uv.setXY(i,.26+uv.getX(i)*.48,.04+uv.getY(i)*.92);
 const crystalMaterial=new THREE.MeshBasicMaterial({map:crystalTexture,color:0xffffff,transparent:true,alphaTest:.08,depthWrite:false,toneMapped:false,side:THREE.DoubleSide,forceSinglePass:true});
 const crystals=new THREE.InstancedMesh(crystalGeometry,crystalMaterial,20);crystals.count=0;crystals.frustumCulled=false;root.add(crystals);
 const shadowGeometry=new THREE.CircleGeometry(.65,12).rotateX(-Math.PI/2),shadowMaterial=new THREE.MeshBasicMaterial({color:0x142c38,transparent:true,opacity:.35,depthWrite:false});
 const shadows=new THREE.InstancedMesh(shadowGeometry,shadowMaterial,20);shadows.count=0;shadows.frustumCulled=false;root.add(shadows);
 const crystalPose=new THREE.Object3D(),color=new THREE.Color();
 function setCourse(act){
  const canyon=act==='crystalGorge';floor.count=canyon?12:80;lanes.visible=!canyon;floorMaterial.color.setHex(canyon?0x7e9aab:0x87a88e);
  for(let i=0;i<floor.count;i++){m.makeTranslation(canyon?(Math.floor(i/4)-1)*8:Math.floor(i/4)*8-8,.015,(i%4)*4-6);floor.setMatrixAt(i,m);}floor.instanceMatrix.needsUpdate=true;floor.computeBoundingSphere();
  if(!canyon)crystals.count=shadows.count=0;
 }
 function syncCrystals(walls,camera){
  let count=0;for(const w of walls){if(w.broken||count>=20)continue;
   crystalPose.position.set(w.x,1.02,w.z);crystalPose.quaternion.copy(camera.quaternion);crystalPose.scale.set(w.w/1.2,1,w.d/1.2);crystalPose.updateMatrix();crystals.setMatrixAt(count,crystalPose.matrix);
   color.setHex(w.hp/w.maxHp<.4?0xffdea0:0xffffff);crystals.setColorAt(count,color);
   m.makeScale(w.w/1.2,1,w.d/1.2);m.setPosition(w.x,.035,w.z);shadows.setMatrixAt(count,m);count++;
  }
  crystals.count=shadows.count=count;crystals.instanceMatrix.needsUpdate=shadows.instanceMatrix.needsUpdate=true;if(crystals.instanceColor)crystals.instanceColor.needsUpdate=true;
 }
 const lineGeometry=new THREE.PlaneGeometry(1,1),lineMaterial=new THREE.MeshBasicMaterial({color:0xffc36e,transparent:true,opacity:.7,depthWrite:false,toneMapped:false,side:THREE.DoubleSide});
 const tells=Array.from({length:28},()=>{const o=new THREE.Mesh(lineGeometry,lineMaterial);o.visible=false;root.add(o);return o;});let tellCount=0;
 function tell(t){if(tellCount>=tells.length)return;const o=tells[tellCount++],p=t.position;o.visible=true;o.position.set(p.x,.05,p.z);const d=t.dir||t.direction,length=t.length||6;
  if(d){o.scale.set(t.width||.16,length,1);o.rotation.set(-Math.PI/2,0,Math.atan2(d.x,d.z));o.position.x+=d.x*length/2;o.position.z+=d.z*length/2;}
  else{o.rotation.set(-Math.PI/2,0,0);o.scale.set(1.3,1.3,1);}
 }
 return {root,setActive:v=>{root.visible=v;},setCourse,syncCrystals,beginFrame:()=>{tellCount=0;for(const o of tells)o.visible=false;},tell,
  dispose:()=>{root.removeFromParent();for(const o of [floor,lanes,crystals,shadows])o.dispose();for(const o of [floorGeometry,laneGeometry,lineGeometry,crystalGeometry,shadowGeometry,floorMaterial,laneMaterial,lineMaterial,crystalMaterial,shadowMaterial])o.dispose();}};
}
