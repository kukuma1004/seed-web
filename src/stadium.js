import * as THREE from 'three';
import {mergeGeometries} from 'three/addons/utils/BufferGeometryUtils.js';

export const STADIUM_CLAY_ART='assets/stadium-clay-hd-v1.webp';
export const STADIUM_TRIM_ART='assets/stadium-trim-atlas-v1.webp';
export const STADIUM_BASES=Object.freeze([
 Object.freeze({x:0,z:4.2,next:1}),Object.freeze({x:3.6,z:.6,next:2}),
 Object.freeze({x:0,z:-3,next:3}),Object.freeze({x:-3.6,z:.6,next:0})
]);
export const BASE_SLIDE=Object.freeze({radius:.82,speed:11.2,duration:.46,cooldown:.82});
// Only rooms that visibly paint all four bases may start the assisted slide.
// Keeping this as room data prevents invisible trigger zones in the baseball
// and glove silhouettes while preserving the inexpensive coordinate check.
export const BASE_SLIDE_ARENAS=Object.freeze(['diamond','ballpark']);
// Home plate is at +Z (the near side of the camera). The mound sits about 47.5% of the
// home-to-second distance from home, and the catcher waits just behind the plate.
export const RELAY_LAYOUT=Object.freeze({
 pitcher:Object.freeze({x:0,z:.78}),home:Object.freeze({x:0,z:4.2}),catcher:Object.freeze({x:0,z:5.08})
});
export function stadiumBaseAt(position,radius=BASE_SLIDE.radius){
 return STADIUM_BASES.findIndex(base=>Math.hypot(position.x-base.x,position.z-base.z)<=radius);
}
export function baseSlideFor(position,cooldown=0,enabled=true,blockedIndex=-1){
 if(!enabled||cooldown>0)return null;
 const index=stadiumBaseAt(position);
 // Landing on a base must not launch the next leg automatically. The player
 // has to step off the plate and deliberately enter it again.
 if(index<0||index===blockedIndex)return null;
 const from=STADIUM_BASES[index],to=STADIUM_BASES[from.next],length=Math.hypot(to.x-position.x,to.z-position.z)||1;
 return {index,targetX:to.x,targetZ:to.z,dx:(to.x-position.x)/length,dz:(to.z-position.z)/length,speed:BASE_SLIDE.speed,duration:length/BASE_SLIDE.speed,cooldown:BASE_SLIDE.cooldown};
}

// The act-2 night stadium, drawn over the act-1 garden: a single 512 px hand-painted clay tile
// replaces thousands of startup canvas dots. Every room shares this 49 KB texture and changes
// only its UV angle/tint, preserving one floor draw call and one GPU texture on low-end phones.
function clayTexture(mobile=false){
 const t=new THREE.TextureLoader().load(import.meta.env.BASE_URL+STADIUM_CLAY_ART);
 t.colorSpace=THREE.SRGBColorSpace;t.wrapS=t.wrapT=THREE.MirroredRepeatWrapping;t.center.set(.5,.5);t.repeat.set(2.35,2.35);t.anisotropy=mobile?2:6;return t;
}
function trimTexture(mobile=false){const t=new THREE.TextureLoader().load(import.meta.env.BASE_URL+STADIUM_TRIM_ART);t.colorSpace=THREE.SRGBColorSpace;t.anisotropy=mobile?2:6;return t;}
const ATLAS_QUADS={fence:[0,.5,.5,.5],dugout:[.5,.5,.5,.5],crate:[0,0,.5,.5],rail:[.5,0,.5,.5]};
function atlasUV(geometry,id){const uv=geometry.attributes.uv,q=ATLAS_QUADS[id];for(let i=0;i<uv.count;i++)uv.setXY(i,q[0]+uv.getX(i)*q[2],q[1]+uv.getY(i)*q[3]);uv.needsUpdate=true;return geometry;}
// One merged chalk mesh changes with the room. It makes every silhouette readable without
// adding textures or draw calls: plate lanes, an infield diamond, ball seams, glove webbing
// and the outfield arcs of the final ballpark.
const floorGeometryCache=new Map(),markingGeometryCache=new Map();
const FIELD_SURFACES=Object.freeze({
 'home-plate':Object.freeze({color:0xffd8c8,repeat:2.25,rotation:.05,offset:[.08,.04]}),
 diamond:Object.freeze({color:0xf8d0bd,repeat:2.45,rotation:-.1,offset:[.31,.17]}),
 baseball:Object.freeze({color:0xebc5b8,repeat:2.15,rotation:.38,offset:[.12,.36]}),
 glove:Object.freeze({color:0xf4c7ad,repeat:2.5,rotation:-.3,offset:[.42,.09]}),
 ballpark:Object.freeze({color:0xf0bca5,repeat:2.7,rotation:.14,offset:[.26,.28]})
});
function arenaKey(arena){return arena?.id||arena?.shape||'rect';}
export function baseSlidesEnabled(arena){return BASE_SLIDE_ARENAS.includes(arenaKey(arena));}
function stadiumFloorGeometry(arena){
 const key=arenaKey(arena);if(floorGeometryCache.has(key))return floorGeometryCache.get(key);
 let geometry;
 if(arena?.shape==='circle')geometry=new THREE.CircleGeometry(arena.radius+.1,64);
 else if(arena?.shape==='poly')geometry=new THREE.ShapeGeometry(new THREE.Shape(arena.points.map(([x,z])=>new THREE.Vector2(x,-z))));
 else geometry=new THREE.PlaneGeometry(20.2,16.2);
 geometry.rotateX(-Math.PI/2);geometry.translate(0,.112,0);floorGeometryCache.set(key,geometry);return geometry;
}
function stadiumMarkings(arena){
 const key=arenaKey(arena);if(markingGeometryCache.has(key))return markingGeometryCache.get(key);
 const parts=[];
 const line=(x1,z1,x2,z2,w=.09)=>{const dx=x2-x1,dz=z2-z1,len=Math.hypot(dx,dz);if(len<.001)return;const g=new THREE.PlaneGeometry(w,len).rotateX(-Math.PI/2);g.rotateY(Math.atan2(dx,dz));g.translate((x1+x2)/2,.12,(z1+z2)/2);parts.push(g);};
 const path=(points,w=.09)=>{for(let i=1;i<points.length;i++)line(...points[i-1],...points[i],w);};
 const arc=(cx,cz,rx,rz,a0,a1,steps=18,w=.08)=>{const points=[];for(let i=0;i<=steps;i++){const a=a0+(a1-a0)*i/steps;points.push([cx+Math.sin(a)*rx,cz-Math.cos(a)*rz]);}path(points,w);};
 const baseDiamond=()=>{const home=[0,4.2],first=[3.6,.6],second=[0,-3],third=[-3.6,.6];path([home,first,second,third,home]);for(const [x,z] of [home,first,second,third]){const b=new THREE.PlaneGeometry(.42,.42).rotateX(-Math.PI/2);b.rotateY(Math.PI/4);b.translate(x,.122,z);parts.push(b);}};
 const batterBox=()=>{path([[-.9,3.5],[.9,3.5],[.9,4.9],[-.9,4.9],[-.9,3.5]],.06);};
 if(key==='home-plate'){
  batterBox();path([[-5.9,5.85],[0,-6.6],[5.9,5.85]],.1);path([[-4.35,1],[0,-5.1],[4.35,1]],.06);
 }else if(key==='diamond'){
  baseDiamond();batterBox();line(0,4.2,7.5,-2.9);line(0,4.2,-7.5,-2.9);
 }else if(key==='baseball'){
  for(const side of [-1,1]){const seam=[];for(let i=0;i<=18;i++){const z=-6.7+i*13.4/18,x=side*(2.75-.036*z*z);seam.push([x,z]);}path(seam,.115);for(let i=2;i<17;i+=2){const [x,z]=seam[i],tilt=side*(i<9?1:-1);line(x-.32,z-.16*tilt,x+.32,z+.16*tilt,.055);}}
  arc(0,0,7.45,7.45,-Math.PI,Math.PI,42,.055);
 }else if(key==='glove'){
  arc(0,.5,4.65,3.8,-1.35,1.35,24,.11);arc(0,-.15,2.7,2.15,-1.45,1.45,18,.065);
  for(const [x,z] of [[-4.9,-6],[-2.2,-6.65],[.1,-7],[2.8,-6.55],[5.25,-5.8]])path([[0,-1.25],[x,z]],.075);
  path([[-3.15,-1.85],[-1.6,-3.15],[0,-1.85],[1.6,-3.15],[3.15,-1.85]],.07);
 }else if(key==='ballpark'){
  baseDiamond();batterBox();line(0,4.2,8,-2.8,.105);line(0,4.2,-8,-2.8,.105);
  arc(0,4.2,5.5,5.5,-1.02,1.02,20,.075);arc(0,4.2,8.5,8.5,-1.02,1.02,28,.12);
 }else baseDiamond();
 const geometry=mergeParts(parts);markingGeometryCache.set(key,geometry);return geometry;
}
export function createStadium(scene,{lights=[],hide=[],mobile=false}={}){
 const group=new THREE.Group();group.name='act2-stadium';group.visible=false;scene.add(group);
 const floorMat=new THREE.MeshStandardMaterial({map:clayTexture(mobile),color:0xffffff,roughness:.9,metalness:0});
 const trimMat=new THREE.MeshStandardMaterial({map:trimTexture(mobile),color:0xffffff,roughness:.72,metalness:.12});
 const track=new THREE.Mesh(new THREE.PlaneGeometry(23.2,19.2).rotateX(-Math.PI/2),new THREE.MeshStandardMaterial({color:0x172537,roughness:.92,metalness:.04}));track.position.y=.107;track.receiveShadow=true;group.add(track);
 const floor=new THREE.Mesh(stadiumFloorGeometry(null),floorMat);floor.receiveShadow=true;group.add(floor);
 const chalk=new THREE.Mesh(stadiumMarkings(null),new THREE.MeshBasicMaterial({color:0xf4efe4,transparent:true,opacity:.82,depthWrite:false,forceSinglePass:true}));group.add(chalk);
 const towers=[],lamps=[];
 for(const [x,z] of [[-12.5,-10],[12.5,-10],[-12.5,9.5],[12.5,9.5]]){
  towers.push(new THREE.CylinderGeometry(.14,.2,9,6).translate(x,4.5,z));
  towers.push(new THREE.BoxGeometry(2.6,.18,.5).translate(x,9.05,z));
  for(let i=-1;i<=1;i++)lamps.push(new THREE.BoxGeometry(.66,.5,.14).translate(x+i*.82,9.45,z+(z<0?.18:-.18)));
 }
 const towerMesh=new THREE.Mesh(mergeParts(towers),new THREE.MeshStandardMaterial({color:0x3b4448,roughness:.6,metalness:.5}));group.add(towerMesh);
 const lampMesh=new THREE.Mesh(mergeParts(lamps),new THREE.MeshBasicMaterial({color:new THREE.Color(0xfff6dc).multiplyScalar(2.4),toneMapped:false}));group.add(lampMesh);
 // A merged low stand and fence hide the old garden rim while staying cheap on low-end phones.
 const stadiumShell=[];
 for(const x of [-9,-6,-3,0,3,6,9])for(let row=0;row<3;row++)stadiumShell.push(atlasUV(new THREE.BoxGeometry(2.65,.38,1.05),'dugout').translate(x,.38+row*.42,-9.45-row*.42));
 for(const x of [-10.65,10.65])for(const z of [-6,-2,2,6])stadiumShell.push(atlasUV(new THREE.BoxGeometry(.22,1.35,3.75),'fence').translate(x,.7,z));
 stadiumShell.push(atlasUV(new THREE.BoxGeometry(21.6,.16,.18),'rail').translate(0,1.35,-8.85));
 const shell=new THREE.Mesh(mergeParts(stadiumShell),trimMat);shell.castShadow=shell.receiveShadow=true;group.add(shell);
 const flagGeo=new THREE.PlaneGeometry(.9,.55).translate(.45,0,0),flagMat=new THREE.MeshStandardMaterial({color:0xffffff,side:THREE.DoubleSide,roughness:.8});
 const flagXs=[-8,-4.8,-1.6,1.6,4.8,8],flags=new THREE.InstancedMesh(flagGeo,flagMat,flagXs.length),pole=new THREE.Mesh(mergeParts(flagXs.map(x=>new THREE.CylinderGeometry(.03,.03,2.2,5).translate(x,1.1,-8.9))),towerMesh.material);
 flagXs.forEach((x,i)=>flags.setColorAt(i,new THREE.Color(i%2?0xd8a63a:0xc2352b)));flags.instanceColor.needsUpdate=true;group.add(flags,pole);
 const m=new THREE.Matrix4(),q=new THREE.Quaternion(),s=new THREE.Vector3(1,1,1),p=new THREE.Vector3(),yAxis=new THREE.Vector3(0,1,0);
 // Bases are painted into the merged chalk geometry above. The old translucent
 // four-sided rings looked like folded glass and cost two extra draw calls.
 // Night light: the act-1 values are remembered and restored when the stadium is left.
 const saved=new Map(),hidden=new Map();
 const night={background:new THREE.Color('#0d1a2a'),fog:new THREE.Color('#122236'),fogDensity:.014};
 let active=false,baseEnabled=false;
 return {
  group,coverMaterial:trimMat,boundaryMaterials:{dark:track.material,armor:trimMat,stone:trimMat},
  setActive(on,arena=null){
   if(on&&arena){
    floor.geometry=stadiumFloorGeometry(arena);chalk.geometry=stadiumMarkings(arena);chalk.scale.setScalar(1);
    const surface=FIELD_SURFACES[arenaKey(arena)]||{color:0xffffff,repeat:2.35,rotation:0,offset:[0,0]};
    floorMat.color.setHex(surface.color);floorMat.map.repeat.setScalar(surface.repeat);floorMat.map.rotation=surface.rotation;floorMat.map.offset.set(...surface.offset);
   }
   baseEnabled=Boolean(on&&baseSlidesEnabled(arena));
   if(on===active)return;active=on;group.visible=on;
   if(on){
    saved.set('background',scene.background?.clone());saved.set('fog',scene.fog?.color.clone());saved.set('density',scene.fog?.density);
    for(const light of lights)saved.set(light,{intensity:light.intensity,color:light.color.clone()});
    if(scene.background)scene.background.copy(night.background);if(scene.fog){scene.fog.color.copy(night.fog);scene.fog.density=night.fogDensity;}
    for(const light of lights){light.intensity*=light.isHemisphereLight?.72:1.08;light.color.lerp(new THREE.Color(0xdfeaff),.45);}
    for(const object of hide){hidden.set(object,object.visible);object.visible=false;}
   }else{
    if(scene.background&&saved.get('background'))scene.background.copy(saved.get('background'));
    if(scene.fog&&saved.get('fog')){scene.fog.color.copy(saved.get('fog'));scene.fog.density=saved.get('density');}
    for(const light of lights){const v=saved.get(light);if(v){light.intensity=v.intensity;light.color.copy(v.color);}}
    for(const object of hide)if(hidden.has(object))object.visible=hidden.get(object);hidden.clear();
   }
  },
  isActive:()=>active,
  baseAt:position=>stadiumBaseAt(position),
  tryBaseSlide(position,cooldown=0,blockedIndex=-1){return baseSlideFor(position,cooldown,active&&baseEnabled,blockedIndex);},
  update(time){
   if(!active)return;
   flagXs.forEach((x,i)=>{q.setFromAxisAngle(yAxis,Math.sin(time*2.2+i*.9)*.35-.2);p.set(x,2.05,-8.9);m.compose(p,q,s);flags.setMatrixAt(i,m);});
   flags.instanceMatrix.needsUpdate=true;
  },
  state:()=>({active,baseEnabled})
 };
}
function mergeParts(parts){
 const flat=parts.map(g=>g.index?g.toNonIndexed():g),merged=mergeGeometries(flat,false);
 for(const g of new Set([...parts,...flat]))g.dispose();
 return merged;
}
