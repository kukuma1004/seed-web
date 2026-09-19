import * as THREE from 'three';

const PANEL_COUNT=16,CLOUD_COUNT=22,FLOW_COUNT=24;
export function createSkyway(scene,{lights=[],hide=[],mobile=false}={}){
 const group=new THREE.Group();group.name='act3-skyway';group.visible=false;scene.add(group);
 const floorMat=new THREE.MeshStandardMaterial({color:0x24455c,roughness:.82,metalness:.08});
 const edgeMat=new THREE.MeshBasicMaterial({color:0x9fe8e8,transparent:true,opacity:.48,depthWrite:false,toneMapped:false});
 const cloudMat=new THREE.MeshBasicMaterial({color:0xd6eef0,transparent:true,opacity:.14,depthWrite:false,toneMapped:false});
 const darkMat=new THREE.MeshStandardMaterial({color:0x172b3d,roughness:.9,metalness:.04});
 // The surface continues beyond both sides of the camera. It reads as land/cloud
 // far below the seed, not as a bridge with walls.
 const panelGeo=new THREE.BoxGeometry(34,.035,1.38),panels=new THREE.InstancedMesh(panelGeo,floorMat,PANEL_COUNT);panels.receiveShadow=false;group.add(panels);
 // Short moving currents replace continuous rails. Different scroll speeds give
 // a cheap parallax cue without textures, particles, or dynamic lights.
 const edgeGeo=new THREE.BoxGeometry(.055,.018,.72),edges=new THREE.InstancedMesh(edgeGeo,edgeMat,FLOW_COUNT);group.add(edges);
 const cloudGeo=new THREE.IcosahedronGeometry(1,1),clouds=new THREE.InstancedMesh(cloudGeo,cloudMat,CLOUD_COUNT);clouds.frustumCulled=false;group.add(clouds);
 const horizon=new THREE.Mesh(new THREE.PlaneGeometry(80,48),new THREE.MeshBasicMaterial({color:0x13283c,side:THREE.DoubleSide}));horizon.rotation.x=-Math.PI/2;horizon.position.set(0,-1.5,-19);group.add(horizon);
 const panelZ=new Float32Array(PANEL_COUNT),flowData=[],cloudData=[];
 for(let i=0;i<PANEL_COUNT;i++){panelZ[i]=-10.4+i*1.38;panels.setColorAt(i,new THREE.Color(i%5===0?0x315a6b:i%2?0x284d62:0x23475b));}
 panels.instanceColor.needsUpdate=true;
 for(let i=0;i<FLOW_COUNT;i++)flowData.push({x:-14+(i*5.7)%28,z:-12+(i*3.1)%25,s:.65+(i%4)*.2});
 for(let i=0;i<CLOUD_COUNT;i++)cloudData.push({x:((i*7)%31)-15,z:-14+(i*5.3)%29,y:-.16+(i%3)*.09,s:.5+(i%5)*.18});
 const m=new THREE.Matrix4(),p=new THREE.Vector3(),q=new THREE.Quaternion(),s=new THREE.Vector3(),saved=new Map(),hidden=new Map();let active=false,distance=0,speed=5.4;
 const background=new THREE.Color('#10283e'),fog=new THREE.Color('#193a50');
 function updateInstances(){
  for(let i=0;i<PANEL_COUNT;i++){p.set(0,-.055,panelZ[i]);s.set(1,1,1);m.compose(p,q,s);panels.setMatrixAt(i,m);}
  for(let i=0;i<FLOW_COUNT;i++){const f=flowData[i];p.set(f.x,.005,f.z);s.set(1,1,f.s);m.compose(p,q,s);edges.setMatrixAt(i,m);}
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
  tick(dt,running=true){if(!active||!running)return;const travel=dt*speed;distance+=travel;for(let i=0;i<PANEL_COUNT;i++){panelZ[i]+=travel;if(panelZ[i]>11)panelZ[i]-=PANEL_COUNT*1.38;}for(const f of flowData){f.z+=travel*(1.18+f.s*.18);if(f.z>11){f.z-=27;f.x=-14+Math.abs((Math.floor(distance*2)+f.x*5)%28);}}for(const c of cloudData){c.z+=travel*(.54+c.s*.11);if(c.z>12){c.z-=31;c.x=-15+Math.abs((Math.floor(distance)+c.x*7)%30);}}updateInstances();},
  setSpeed(value){speed=Math.max(0,Math.min(9,Number(value)||0));},
  state:()=>({active,distance:+distance.toFixed(1),speed,drawCalls:3,instances:PANEL_COUNT+FLOW_COUNT+CLOUD_COUNT,openEnds:true,parallaxLayers:3})
 };
}
