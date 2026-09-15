import * as THREE from 'three';
import {mergeGeometries} from 'three/addons/utils/BufferGeometryUtils.js';

// The act-2 night stadium, drawn over the act-1 garden (2026-09-16 first slice): red clay floor with white chalk lines,
// four light towers, team flags on the far wall and a cooler night light. Everything is a handful of draw calls:
// one floor, one merged tower mesh, one merged lamp mesh and one instanced flag row.
function clayTexture(){
 const size=512,c=document.createElement('canvas');c.width=c.height=size;const x=c.getContext('2d');
 x.fillStyle='#8a3f2a';x.fillRect(0,0,size,size);
 for(let i=0;i<5200;i++){const v=Math.random();x.fillStyle=v<.5?`rgba(60,24,14,${.06+Math.random()*.1})`:`rgba(196,110,72,${.05+Math.random()*.09})`;const r=Math.random()*2.4+.4;x.beginPath();x.arc(Math.random()*size,Math.random()*size,r,0,Math.PI*2);x.fill();}
 const t=new THREE.CanvasTexture(c);t.colorSpace=THREE.SRGBColorSpace;t.wrapS=t.wrapT=THREE.RepeatWrapping;t.repeat.set(4,4);return t;
}
// Chalk lines are geometry, so they stay crisp at any resolution: an infield diamond, the batter's box near the start and foul lines.
function chalkLines(){
 const parts=[],line=(x1,z1,x2,z2,w=.09)=>{const dx=x2-x1,dz=z2-z1,len=Math.hypot(dx,dz);const g=new THREE.PlaneGeometry(w,len).rotateX(-Math.PI/2);g.rotateY(Math.atan2(dx,dz));g.translate((x1+x2)/2,.12,(z1+z2)/2);parts.push(g);};
 const home=[0,4.2],first=[3.6,.6],second=[0,-3],third=[-3.6,.6];
 line(...home,...first);line(...first,...second);line(...second,...third);line(...third,...home);
 line(...home,8.6,-4.2);line(...home,-8.6,-4.2);
 line(-.9,3.5,.9,3.5,.06);line(-.9,4.9,.9,4.9,.06);line(-.9,3.5,-.9,4.9,.06);line(.9,3.5,.9,4.9,.06);
 for(const [x,z] of [first,second,third]){const b=new THREE.PlaneGeometry(.42,.42).rotateX(-Math.PI/2);b.rotateY(Math.PI/4);b.translate(x,.122,z);parts.push(b);}
 return parts;
}
export function createStadium(scene,{lights=[]}={}){
 const group=new THREE.Group();group.name='act2-stadium';group.visible=false;scene.add(group);
 const floorMat=new THREE.MeshStandardMaterial({map:clayTexture(),color:0xffffff,roughness:.95,metalness:0});
 const rectFloor=new THREE.PlaneGeometry(20.2,16.2).rotateX(-Math.PI/2).translate(0,.112,0),circleFloor=new THREE.CircleGeometry(7.7,48).rotateX(-Math.PI/2).translate(0,.112,0); // just above the arena floor (.105)
 const floor=new THREE.Mesh(rectFloor,floorMat);floor.receiveShadow=true;group.add(floor);
 const chalk=new THREE.Mesh(mergeParts(chalkLines()),new THREE.MeshBasicMaterial({color:0xf4efe4,transparent:true,opacity:.82,depthWrite:false,forceSinglePass:true}));group.add(chalk);
 const towers=[],lamps=[];
 for(const [x,z] of [[-12.5,-10],[12.5,-10],[-12.5,9.5],[12.5,9.5]]){
  towers.push(new THREE.CylinderGeometry(.14,.2,9,6).translate(x,4.5,z));
  towers.push(new THREE.BoxGeometry(2.6,.18,.5).translate(x,9.05,z));
  for(let i=-1;i<=1;i++)lamps.push(new THREE.BoxGeometry(.66,.5,.14).translate(x+i*.82,9.45,z+(z<0?.18:-.18)));
 }
 const towerMesh=new THREE.Mesh(mergeParts(towers),new THREE.MeshStandardMaterial({color:0x3b4448,roughness:.6,metalness:.5}));group.add(towerMesh);
 const lampMesh=new THREE.Mesh(mergeParts(lamps),new THREE.MeshBasicMaterial({color:new THREE.Color(0xfff6dc).multiplyScalar(2.4),toneMapped:false}));group.add(lampMesh);
 const flagGeo=new THREE.PlaneGeometry(.9,.55).translate(.45,0,0),flagMat=new THREE.MeshStandardMaterial({color:0xffffff,side:THREE.DoubleSide,roughness:.8});
 const flagXs=[-8,-4.8,-1.6,1.6,4.8,8],flags=new THREE.InstancedMesh(flagGeo,flagMat,flagXs.length),pole=new THREE.Mesh(mergeParts(flagXs.map(x=>new THREE.CylinderGeometry(.03,.03,2.2,5).translate(x,1.1,-8.9))),towerMesh.material);
 flagXs.forEach((x,i)=>flags.setColorAt(i,new THREE.Color(i%2?0xd8a63a:0xc2352b)));flags.instanceColor.needsUpdate=true;group.add(flags,pole);
 const m=new THREE.Matrix4(),q=new THREE.Quaternion(),s=new THREE.Vector3(1,1,1),p=new THREE.Vector3(),yAxis=new THREE.Vector3(0,1,0);
 // Night light: the act-1 values are remembered and restored when the stadium is left.
 const saved=new Map();
 const night={background:new THREE.Color('#0d1a2a'),fog:new THREE.Color('#122236'),fogDensity:.014};
 let active=false;
 return {
  group,
  setActive(on,arena=null){
   if(on&&arena){const circle=arena.shape==='circle';floor.geometry=circle?circleFloor:rectFloor;chalk.scale.setScalar(circle?.78:1);}
   if(on===active)return;active=on;group.visible=on;
   if(on){
    saved.set('background',scene.background?.clone());saved.set('fog',scene.fog?.color.clone());saved.set('density',scene.fog?.density);
    for(const light of lights)saved.set(light,{intensity:light.intensity,color:light.color.clone()});
    if(scene.background)scene.background.copy(night.background);if(scene.fog){scene.fog.color.copy(night.fog);scene.fog.density=night.fogDensity;}
    for(const light of lights){light.intensity*=light.isHemisphereLight?.72:1.08;light.color.lerp(new THREE.Color(0xdfeaff),.45);}
   }else{
    if(scene.background&&saved.get('background'))scene.background.copy(saved.get('background'));
    if(scene.fog&&saved.get('fog')){scene.fog.color.copy(saved.get('fog'));scene.fog.density=saved.get('density');}
    for(const light of lights){const v=saved.get(light);if(v){light.intensity=v.intensity;light.color.copy(v.color);}}
   }
  },
  isActive:()=>active,
  update(time){
   if(!active)return;
   flagXs.forEach((x,i)=>{q.setFromAxisAngle(yAxis,Math.sin(time*2.2+i*.9)*.35-.2);p.set(x,2.05,-8.9);m.compose(p,q,s);flags.setMatrixAt(i,m);});
   flags.instanceMatrix.needsUpdate=true;
  }
 };
}
function mergeParts(parts){
 const flat=parts.map(g=>g.index?g.toNonIndexed():g),merged=mergeGeometries(flat,false);
 for(const g of new Set([...parts,...flat]))g.dispose();
 return merged;
}
