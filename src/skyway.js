import * as THREE from 'three';

const PANEL_COUNT=14,CLOUD_COUNT=18;
export function createSkyway(scene,{lights=[],hide=[],mobile=false}={}){
 const group=new THREE.Group();group.name='act3-skyway';group.visible=false;scene.add(group);
 const floorMat=new THREE.MeshStandardMaterial({color:0x24455c,roughness:.74,metalness:.16});
 const edgeMat=new THREE.MeshStandardMaterial({color:0x87b7b2,emissive:0x183c45,emissiveIntensity:.8,roughness:.5,metalness:.2});
 const cloudMat=new THREE.MeshBasicMaterial({color:0xd6eef0,transparent:true,opacity:.115,depthWrite:false,toneMapped:false});
 const darkMat=new THREE.MeshStandardMaterial({color:0x172b3d,roughness:.86,metalness:.08});
 const panelGeo=new THREE.BoxGeometry(15.8,.12,1.35),panels=new THREE.InstancedMesh(panelGeo,floorMat,PANEL_COUNT);panels.receiveShadow=false;group.add(panels);
 const edgeGeo=new THREE.BoxGeometry(.2,.18,1.35),edges=new THREE.InstancedMesh(edgeGeo,edgeMat,PANEL_COUNT*2);group.add(edges);
 const cloudGeo=new THREE.IcosahedronGeometry(1,1),clouds=new THREE.InstancedMesh(cloudGeo,cloudMat,CLOUD_COUNT);clouds.frustumCulled=false;group.add(clouds);
 const horizon=new THREE.Mesh(new THREE.PlaneGeometry(80,45),new THREE.MeshBasicMaterial({color:0x13283c,side:THREE.DoubleSide}));horizon.rotation.x=-Math.PI/2;horizon.position.set(0,-1.5,-19);group.add(horizon);
 const railParts=[];for(const x of [-9.35,9.35])railParts.push(new THREE.BoxGeometry(.28,.6,19).translate(x,.18,0));const railGeo=railParts[0];railGeo.translate(0,0,0);const left=new THREE.Mesh(railGeo,darkMat),right=new THREE.Mesh(railParts[1],darkMat);group.add(left,right);
 const panelZ=new Float32Array(PANEL_COUNT),cloudData=[];for(let i=0;i<PANEL_COUNT;i++){panelZ[i]=-8.5+i*1.38;panels.setColorAt(i,new THREE.Color(i%2?0x2b5068:0x22445d));}panels.instanceColor.needsUpdate=true;for(let i=0;i<CLOUD_COUNT;i++)cloudData.push({x:((i*7)%21)-10,z:-12+(i*5.3)%25,y:-.1+(i%3)*.12,s:.42+(i%5)*.16});
 const m=new THREE.Matrix4(),p=new THREE.Vector3(),q=new THREE.Quaternion(),s=new THREE.Vector3(),saved=new Map(),hidden=new Map();let active=false,distance=0,speed=5.4;
 const background=new THREE.Color('#10283e'),fog=new THREE.Color('#193a50');
 function updateInstances(){
  for(let i=0;i<PANEL_COUNT;i++){p.set(0,-.03,panelZ[i]);s.set(1,1,1);m.compose(p,q,s);panels.setMatrixAt(i,m);for(const side of [-1,1]){p.set(side*8.05,.06,panelZ[i]);m.compose(p,q,s);edges.setMatrixAt(i*2+(side>0?1:0),m);}}
  for(let i=0;i<CLOUD_COUNT;i++){const c=cloudData[i];p.set(c.x,c.y,c.z);s.set(c.s*1.55,c.s*.18,c.s*.66);m.compose(p,q,s);clouds.setMatrixAt(i,m);}panels.instanceMatrix.needsUpdate=edges.instanceMatrix.needsUpdate=clouds.instanceMatrix.needsUpdate=true;
 }
 updateInstances();
 return {
  group,coverMaterial:edgeMat,boundaryMaterials:{dark:floorMat,armor:edgeMat,stone:edgeMat},materials:[floorMat,edgeMat,cloudMat,darkMat],geometries:[panelGeo,edgeGeo,cloudGeo],
  setActive(on){
   if(on===active)return;active=on;group.visible=on;
   if(on){saved.set('background',scene.background?.clone());saved.set('fog',scene.fog?.color.clone());saved.set('density',scene.fog?.density);for(const light of lights)saved.set(light,{intensity:light.intensity,color:light.color.clone()});if(scene.background)scene.background.copy(background);if(scene.fog){scene.fog.color.copy(fog);scene.fog.density=.018;}for(const light of lights){light.intensity*=light.isHemisphereLight?.8:1.14;light.color.lerp(new THREE.Color(0xb8ddff),.5);}for(const object of hide){hidden.set(object,object.visible);object.visible=false;}}
   else {if(scene.background&&saved.get('background'))scene.background.copy(saved.get('background'));if(scene.fog&&saved.get('fog')){scene.fog.color.copy(saved.get('fog'));scene.fog.density=saved.get('density');}for(const light of lights){const v=saved.get(light);if(v){light.intensity=v.intensity;light.color.copy(v.color);}}for(const object of hide)if(hidden.has(object))object.visible=hidden.get(object);hidden.clear();}
  },
  tick(dt,running=true){if(!active||!running)return;const travel=dt*speed;distance+=travel;for(let i=0;i<PANEL_COUNT;i++){panelZ[i]+=travel;if(panelZ[i]>9.1)panelZ[i]-=PANEL_COUNT*1.38;}for(const c of cloudData){c.z+=travel*(.7+c.s*.14);if(c.z>11){c.z-=27;c.x=((Math.floor(distance*3)+c.x*7)%18)-9;}}updateInstances();},
  setSpeed(value){speed=Math.max(0,Math.min(9,Number(value)||0));},
  state:()=>({active,distance:+distance.toFixed(1),speed,drawCalls:3,instances:PANEL_COUNT*3+CLOUD_COUNT})
 };
}
