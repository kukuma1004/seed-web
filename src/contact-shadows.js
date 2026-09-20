import * as THREE from 'three';

export const CONTACT_SHADOW_CAPACITY=192;
const RADII=Object.freeze({player:.46,swarm:.3,hound:.52,caster:.56,shield:.72,turret:.68,relaymachine:.8,relaymitt:.58,warden:1.18,act2warden:1.12,act3warden:1.26,austin:1.35,alwaysbeginner:1.42,tempestcarrier:1.75,catcher:.72,pitcher:.56,runner:.45,batter:.7,'sky-scout':.46,'sky-diver':.48,'sky-bomber':.62,'sky-carrier':.9});
export const contactShadowRadius=type=>RADII[type]||.5;

export function createContactShadows(scene,capacity=CONTACT_SHADOW_CAPACITY){
 const geometry=new THREE.CircleGeometry(1,20);
 const material=new THREE.MeshBasicMaterial({color:0x071713,transparent:true,opacity:.23,depthWrite:false,toneMapped:false,polygonOffset:true,polygonOffsetFactor:-1,polygonOffsetUnits:-1});
 const mesh=new THREE.InstancedMesh(geometry,material,capacity);mesh.name='actor-contact-shadows';mesh.frustumCulled=false;mesh.renderOrder=-1;mesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);scene.add(mesh);
 const matrix=new THREE.Matrix4(),position=new THREE.Vector3(),scale=new THREE.Vector3(),quaternion=new THREE.Quaternion().setFromEuler(new THREE.Euler(-Math.PI/2,0,0));
 const add=(actor,type)=>{
  const group=actor?.g||actor;if(!group||group.visible===false||mesh.count>=capacity)return;
  const radius=contactShadowRadius(type||actor?.type);position.set(group.position.x,.125,group.position.z);scale.set(radius,radius*.56,1);matrix.compose(position,quaternion,scale);mesh.setMatrixAt(mesh.count++,matrix);
 };
 function update(player,enemies=[],fallen=[]){
  mesh.count=0;add(player,'player');for(const enemy of enemies)if(!enemy.dead)add(enemy);for(const entry of fallen)add(entry.e);mesh.instanceMatrix.needsUpdate=true;return mesh.count;
 }
 function dispose(){mesh.removeFromParent();geometry.dispose();material.dispose();}
 return {mesh,update,dispose,capacity,drawCalls:1};
}
