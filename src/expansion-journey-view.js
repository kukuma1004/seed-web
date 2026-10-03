import * as THREE from 'three';
// Temporary course kit for the developer slice. Existing flight art is reused;
// final Act4/5 scenery and boss art are still a separate visual milestone.
export function createExpansionJourneyView(scene,groundTexture){
 const root=new THREE.Group();root.name='expansion-journey';root.visible=false;scene.add(root);
 const floorGeometry=new THREE.PlaneGeometry(8,4).rotateX(-Math.PI/2);
 const floorMaterial=new THREE.MeshStandardMaterial({map:groundTexture,color:0x87a88e,roughness:1});
 const floor=new THREE.InstancedMesh(floorGeometry,floorMaterial,80),m=new THREE.Matrix4();
 for(let x=0;x<20;x++)for(let z=0;z<4;z++){m.makeTranslation(x*8-8,.015,z*4-6);floor.setMatrixAt(x*4+z,m);}floor.instanceMatrix.needsUpdate=true;root.add(floor);
 const laneGeometry=new THREE.PlaneGeometry(.16,1.1).rotateX(-Math.PI/2),laneMaterial=new THREE.MeshBasicMaterial({color:0xd7e8a5,transparent:true,opacity:.32,depthWrite:false});
 const lanes=new THREE.InstancedMesh(laneGeometry,laneMaterial,40);for(let i=0;i<40;i++){m.makeTranslation(i*3, .025,i%2?6.3:-6.3);lanes.setMatrixAt(i,m);}lanes.instanceMatrix.needsUpdate=true;root.add(lanes);
 const lineGeometry=new THREE.PlaneGeometry(1,1),lineMaterial=new THREE.MeshBasicMaterial({color:0xffc36e,transparent:true,opacity:.7,depthWrite:false,toneMapped:false,side:THREE.DoubleSide});
 const tells=Array.from({length:28},()=>{const o=new THREE.Mesh(lineGeometry,lineMaterial);o.visible=false;root.add(o);return o;});let tellCount=0;
 function tell(t){if(tellCount>=tells.length)return;const o=tells[tellCount++],p=t.position;o.visible=true;o.position.set(p.x,.05,p.z);const d=t.dir||t.direction,length=t.length||6;
  if(d){o.scale.set(t.width||.16,length,1);o.rotation.set(-Math.PI/2,0,Math.atan2(d.x,d.z));o.position.x+=d.x*length/2;o.position.z+=d.z*length/2;}
  else{o.rotation.set(-Math.PI/2,0,0);o.scale.set(1.3,1.3,1);}
 }
 return {root,setActive:v=>{root.visible=v;},beginFrame:()=>{tellCount=0;for(const o of tells)o.visible=false;},tell,
  dispose:()=>{root.removeFromParent();floor.dispose();lanes.dispose();for(const o of [floorGeometry,laneGeometry,lineGeometry,floorMaterial,laneMaterial,lineMaterial])o.dispose();}};
}
