// 정원 장면 · 카드 목록이 아니라 실제로 보이는 정원.
// 게임과 같은 렌더러를 쓰고, 장면만 바꿔 그린다(모드가 정원일 때만).
// 식물은 씨앗 색과 성장 단계, 갈래로 모양이 달라진다. 그림이 준비되면 이 모양만 교체하면 된다.
import * as THREE from 'three';
import {LAWS} from './laws.js';
import {SEEDS,PLOTS,STAGES,stageOf,centerStage,CENTER,plantName,GUARDIAN,bossGardenMilestones} from './garden.js';

const V=THREE.Vector3;
// The painted terrace has two beds in each of three depth rows. These fallback
// world positions match the 16:9 source painting; resize() reprojects the exact
// image anchors so wide phone screens and narrow windows stay aligned too.
export const PLOT_SPOTS=Object.freeze([
 {x:-2.518,z:-6.167},{x:2.898,z:-6.167},
 {x:-2.909,z:-1.811},{x:2.952,z:-1.811},
 {x:-1.327,z:.581},{x:1.345,z:.581}
]);
export const CENTER_SPOT=Object.freeze({x:0,z:-2.6});
// Normalized pixel positions in garden-sanctuary-v1.webp (1600 x 900).
// Plants are rooted at the visual centre of the soil, not at the stone rim.
const PLOT_ANCHORS=Object.freeze([
 {u:621/1600,v:335/900},{u:1006/1600,v:335/900},
 {u:530/1600,v:487/900},{u:1074/1600,v:487/900},
 {u:652/1600,v:618/900},{u:950/1600,v:618/900}
]);
const CENTER_ANCHOR=Object.freeze({u:.5,v:453/900});
export const GARDEN_GROWTH_ART='assets/garden-growth-atlas-v3.webp';
// 4 x 3 atlas cells. Keeping the selection in data makes it easy to test and
// prevents the garden UI from drifting away from the saved growth stage.
export function growthArtTile(growth,branch){
 const stage=stageOf(growth);
 if(stage==='seed')return 0;
 if(stage==='sprout')return 1;
 if(stage==='bloom')return branch==='tree'?7:branch==='vine'?9:5;
 return branch==='tree'?6:branch==='vine'?8:branch==='flower'?4:3;
}
export function centerArtTile(index){return index<=0?null:index===1?0:index===2?2:index===3?10:index===4?7:11;}
export const seedColor=id=>SEEDS[id]?.law?LAWS[SEEDS[id].law].color:0xf2c14e;
let sleepingSeedTexture=null;
function sleepingSeedMap(){
 if(sleepingSeedTexture)return sleepingSeedTexture;
 sleepingSeedTexture=new THREE.TextureLoader().load(import.meta.env.BASE_URL+'assets/seed-body-directions-v6.png');
 sleepingSeedTexture.colorSpace=THREE.SRGBColorSpace;sleepingSeedTexture.repeat.set(.5,.5);sleepingSeedTexture.offset.set(0,.5);
 return sleepingSeedTexture;
}

function material(color,{rough=.75,emissive=0,intensity=.35,flat=false}={}){
 return new THREE.MeshStandardMaterial({color,roughness:rough,metalness:.04,emissive,emissiveIntensity:intensity,flatShading:flat});
}
// 성장 단계와 갈래로 정해지는 식물 한 그루. 씨앗 색이 잎과 꽃에 들어간다.
export function buildPlant(seedId,growth,branch,artKit=null){
 const group=new THREE.Group(),tint=seedColor(seedId),stage=stageOf(growth);
 if(artKit){
  // 하나의 아틀라스와 지오메트리는 공유하고 재질의 색만 아주 작게 복제한다.
  // 식물 여섯 그루의 드로우콜은 그대로이며, 법칙마다 다른 꽃빛을 읽을 수 있다.
  const tile=growthArtTile(growth,branch),tinted=artKit.material.clone();
  tinted.color.copy(new THREE.Color(tint).lerp(new THREE.Color(0xffffff),stage==='seed'?.7:.5));
  const plane=new THREE.Mesh(artKit.geometries[tile],tinted);
  const size=stage==='seed'?1.12:stage==='sprout'?1.28:branch==='tree'?(stage==='bloom'?2.18:1.82):branch==='vine'?(stage==='bloom'?1.92:1.62):(stage==='bloom'?1.86:1.55);
   // Root-pivoted billboard: the plant stays seated in its painted bed while
   // turning toward the pitched garden camera.
   plane.scale.set(size,size,1);plane.position.y=.025;plane.renderOrder=3;plane.userData.sharedGardenArt=true;plane.userData.gardenTint=true;group.add(plane);
  group.userData={seed:seedId,stage,branch:branch||null,sway:Math.random()*6.28,art:true};
  return group;
 }
 // 잎과 줄기는 초록으로 두고, 씨앗 색은 꽃·열매에만 쓴다(색 덩어리처럼 보이지 않게).
 const accent=new THREE.Color(tint);
 const leafColor=new THREE.Color(tint).lerp(new THREE.Color(0x6fae74),.72);
 const leaf=material(leafColor.getHex(),{rough:.78,flat:true});
 const stemMat=material(new THREE.Color(0x4f7a4a).lerp(leafColor,.3).getHex(),{rough:.8,flat:true});
 const petal=material(accent.getHex(),{rough:.55,emissive:accent.getHex(),intensity:stage==='bloom'?.45:.2,flat:true});
 // 그림이 있는 화단 위에 바로 심는다. 뜨지 않도록 흙만 살짝.
 const mound=new THREE.Mesh(new THREE.SphereGeometry(.34,12,8,0,Math.PI*2,0,Math.PI/2),material(0x3a2e23,{rough:1}));
 mound.scale.set(1,.34,1);mound.receiveShadow=true;group.add(mound);
 const add=(geo,mat,x,y,z)=>{const m=new THREE.Mesh(geo,mat);m.position.set(x,y,z);m.castShadow=true;group.add(m);return m;};
 const leafBlade=(x,y,z,angle,scale=1)=>{
  const l=add(new THREE.SphereGeometry(.15*scale,8,6),leaf,x,y,z);
  l.scale.set(1.35,.32,.8);l.rotation.set(0,Math.atan2(x,z||.001),angle);return l;
 };
 if(stage==='seed'){
  const bead=add(new THREE.IcosahedronGeometry(.16,0),petal,0,.16,0);bead.scale.set(1,1.15,1);
  leafBlade(.1,.24,.02,-.9,.6);
 }else if(stage==='sprout'){
  add(new THREE.CylinderGeometry(.045,.06,.36,6),stemMat,0,.2,0);
  for(const side of [-1,1])leafBlade(side*.14,.34,0,-side*.7,.85);
  const bud=add(new THREE.SphereGeometry(.1,8,6),petal,0,.44,0);bud.scale.y=1.2;
 }else{
  const big=stage==='bloom';
  if(branch==='tree'){
   add(new THREE.CylinderGeometry(.08,.14,big?1.15:.85,7),stemMat,0,big?.6:.45,0);
   const crown=add(new THREE.IcosahedronGeometry(big?.56:.44,0),leaf,0,big?1.3:1,0);crown.scale.set(1.15,.75,1.15);
   const crown2=add(new THREE.IcosahedronGeometry(big?.38:.3,0),leaf,big?.36:.28,big?1.05:.82,.1);crown2.scale.set(1.1,.7,1.1);
   for(let i=0;i<(big?3:2);i++){
    const a=i/(big?3:2)*Math.PI*2;
    add(new THREE.IcosahedronGeometry(big?.1:.08,0),petal,Math.cos(a)*(big?.5:.38),big?1.34:1.02,Math.sin(a)*(big?.5:.38));
   }
  }else if(branch==='vine'){
   add(new THREE.CylinderGeometry(.05,.07,.3,6),stemMat,0,.16,0);
   const arc=add(new THREE.TorusGeometry(big?.52:.4,.045,5,18,Math.PI*1.15),stemMat,0,big?.5:.4,0);
   arc.rotation.set(Math.PI/2.1,0,.35);
   for(let i=0;i<(big?5:3);i++){
    const a=.2+i/(big?5:3)*Math.PI*1.05,r=big?.52:.4;
    leafBlade(Math.cos(a)*r,(big?.5:.4)+Math.sin(a)*r*.6,.05,a-1.2,.8);
    if(i%2===0)add(new THREE.SphereGeometry(big?.08:.065,7,5),petal,Math.cos(a)*r*.9,(big?.42:.34)+Math.sin(a)*r*.5,-.06);
   }
  }else{
   add(new THREE.CylinderGeometry(.05,.07,big?.72:.55,6),stemMat,0,big?.36:.28,0);
   for(const side of [-1,1])leafBlade(side*.17,big?.34:.26,0,-side*.65,1);
   const head=add(new THREE.SphereGeometry(big?.17:.13,10,8),petal,0,big?.8:.6,0);head.scale.set(1,.85,1);
   const petals=big?6:5;
   for(let i=0;i<petals;i++){
    const a=i/petals*Math.PI*2,r=big?.2:.15;
    const p=add(new THREE.SphereGeometry(big?.12:.095,8,6),petal,Math.cos(a)*r,big?.8:.6,Math.sin(a)*r);
    p.scale.set(1.2,.42,.8);p.rotation.set(.2,-a,0);
   }
  }
 }
 group.userData={seed:seedId,stage,branch:branch||null,sway:Math.random()*6.28};
 return group;
}
// 정원 한가운데: 여정을 거듭할수록 드러나는 존재.
export function buildCenter(index,artKit=null){
 const group=new THREE.Group();
 const tile=centerArtTile(index);
 if(artKit&&tile!==null){
  const plane=new THREE.Mesh(artKit.geometries[tile],artKit.material),size=index>=5?3.25:index===4?2.55:index===3?2.05:index===2?1.62:1.18;
   plane.scale.set(size,size,1);plane.position.y=.025;plane.renderOrder=2;plane.userData.sharedGardenArt=true;group.add(plane);group.userData={index,art:true};return group;
 }
 const add=(geo,mat,x,y,z)=>{const m=new THREE.Mesh(geo,mat);m.position.set(x,y,z);group.add(m);return m;};
 // At the start the painted shrine remains empty. A real seed portrait wakes in
 // stages instead of placing a low-poly brown mound over the HD background.
 if(index>=1){
  const sprite=new THREE.Sprite(new THREE.SpriteMaterial({map:sleepingSeedMap(),transparent:true,alphaTest:.05,opacity:.5+Math.min(index,5)*.09,depthWrite:false,toneMapped:false}));
  const size=.72+Math.min(index,5)*.12;sprite.scale.set(size,size,1);sprite.position.set(0,.45+size*.42,0);group.add(sprite);
  const halo=add(new THREE.RingGeometry(.34+index*.08,.38+index*.09,32),new THREE.MeshBasicMaterial({color:index>=4?0xffd979:0xa9dfbd,transparent:true,opacity:.24+index*.045,side:THREE.DoubleSide,depthWrite:false,toneMapped:false}),0,.04,0);
  halo.rotation.x=-Math.PI/2;
  if(index>=3)for(let i=0;i<Math.min(7,index+1);i++){
   const a=i/Math.min(7,index+1)*Math.PI*2;
   add(new THREE.IcosahedronGeometry(.045,0),new THREE.MeshBasicMaterial({color:index>=5?0xffe9a8:0x9fe6c0,toneMapped:false}),Math.cos(a)*(.62+index*.05),.36+Math.sin(i*1.7)*.14,Math.sin(a)*(.62+index*.05));
  }
 }
 group.userData={index};
 return group;
}

export function createGardenScene(){
 const scene=new THREE.Scene();
 scene.background=new THREE.Color('#0d2429');
 const plotSpots=PLOT_SPOTS.map(spot=>({...spot})),centerSpot={...CENTER_SPOT};
 let viewAspect=16/9;
 let syncAnchors=()=>{};
 const fitBackdrop=texture=>{
  if(!texture?.image)return;
  const imageAspect=texture.image.width/texture.image.height;
  texture.repeat.set(1,1);texture.offset.set(0,0);
  if(viewAspect<imageAspect){texture.repeat.x=viewAspect/imageAspect;texture.offset.x=(1-texture.repeat.x)/2;}
  else{texture.repeat.y=imageAspect/viewAspect;texture.offset.y=(1-texture.repeat.y)/2;}
  texture.needsUpdate=true;
  syncAnchors();
 };
 const backdrop=new THREE.TextureLoader().load(import.meta.env.BASE_URL+'assets/garden-sanctuary-v1.webp',texture=>{
  texture.colorSpace=THREE.SRGBColorSpace;
  texture.minFilter=THREE.LinearFilter;
  texture.magFilter=THREE.LinearFilter;
  fitBackdrop(texture);
  scene.background=texture;
 });
 backdrop.colorSpace=THREE.SRGBColorSpace;
 const camera=new THREE.PerspectiveCamera(42,1,.1,120);
 camera.position.set(0,6.2,9.2);camera.lookAt(0,1.5,.2);
 const growthTexture=new THREE.TextureLoader().load(import.meta.env.BASE_URL+GARDEN_GROWTH_ART);
 growthTexture.colorSpace=THREE.SRGBColorSpace;growthTexture.minFilter=THREE.LinearMipmapLinearFilter;growthTexture.magFilter=THREE.LinearFilter;
 const growthMaterial=new THREE.MeshBasicMaterial({map:growthTexture,transparent:true,alphaTest:.025,depthWrite:false,toneMapped:false,side:THREE.DoubleSide});
 const growthGeometries=Array.from({length:12},(_,tile)=>{
   const geometry=new THREE.PlaneGeometry(1,1);geometry.translate(0,.5,0);
   const uv=geometry.attributes.uv,col=tile%4,row=Math.floor(tile/4);
  for(let i=0;i<uv.count;i++)uv.setXY(i,col/4+uv.getX(i)/4,(2-row)/3+uv.getY(i)/3);
  uv.needsUpdate=true;return geometry;
 });
 const artKit={material:growthMaterial,geometries:growthGeometries};
 scene.add(new THREE.HemisphereLight(0xcde4de,0x243832,1.32));
 const moon=new THREE.DirectionalLight(0xffe9c4,1.35);moon.position.set(-6,11,7);scene.add(moon);
 const warm=new THREE.PointLight(0xffc98a,12,12,2);warm.position.set(0,3.4,-3.4);scene.add(warm);

 // The painted sanctuary carries the environment detail. Only interactive plants,
 // selection rings and a few fireflies remain as geometry, which removes hundreds
 // of tiny triangles and keeps the title screen light on older phones.
 const matrix=new THREE.Matrix4();
 const fireflyGeo=new THREE.SphereGeometry(.05,6,4),fireflyMat=new THREE.MeshBasicMaterial({color:0xffe9a8,transparent:true,opacity:.8,toneMapped:false});
 const fireflies=new THREE.InstancedMesh(fireflyGeo,fireflyMat,10);
 const flies=Array.from({length:10},()=>({a:Math.random()*6.28,r:1.6+Math.random()*4.2,y:.7+Math.random()*2,speed:.1+Math.random()*.2,phase:Math.random()*6.28}));
 scene.add(fireflies);

 const plantGroup=new THREE.Group(),centerGroup=new THREE.Group();scene.add(plantGroup,centerGroup);
 // 찐보스 5회마다 생기는 기념 식물. 능력별 5%까지 얻는 최대 50개를
 // 꽃/열매 두 인스턴스 묶음으로 그려 드로우콜은 그대로 유지한다.
 const blossomShape=new THREE.Shape();
 for(let i=0;i<12;i++){const a=i/12*Math.PI*2,r=i%2===0?.15:.07,x=Math.cos(a)*r,y=Math.sin(a)*r;i?blossomShape.lineTo(x,y):blossomShape.moveTo(x,y);}blossomShape.closePath();
 const blossomGeo=new THREE.ShapeGeometry(blossomShape),blossomMat=new THREE.MeshBasicMaterial({color:0xffdc79,transparent:true,opacity:.92,side:THREE.DoubleSide,depthWrite:false,toneMapped:false});
 const fruitGeo=new THREE.IcosahedronGeometry(.14,1),fruitMat=new THREE.MeshStandardMaterial({color:0xffc857,emissive:0xffa21a,emissiveIntensity:.6,roughness:.38,metalness:.08});
 const bossBlossoms=new THREE.InstancedMesh(blossomGeo,blossomMat,50),bossFruits=new THREE.InstancedMesh(fruitGeo,fruitMat,13);
 bossBlossoms.count=0;bossFruits.count=0;bossBlossoms.renderOrder=4;bossFruits.renderOrder=4;scene.add(bossBlossoms,bossFruits);
 // The painted beds already show every empty slot. The raycast meshes stay
 // present for tapping, but draw nothing until one slot is actually selected.
 const markerMat=new THREE.MeshBasicMaterial({color:0xffd77a,transparent:true,opacity:0,side:THREE.DoubleSide,depthWrite:false,toneMapped:false});
 const markers=plotSpots.map(spot=>{
  const m=new THREE.Mesh(new THREE.RingGeometry(.49,.535,40),markerMat.clone());
  m.rotation.x=-Math.PI/2;m.position.set(spot.x,.03,spot.z);scene.add(m);return m;
 });
 // The centre artwork is a large transparent billboard. Raycasting that whole
 // rectangle steals taps from the nearby beds, so its hit area is a small disc
 // on the actual centre medallion instead.
 const centerPick=new THREE.Mesh(new THREE.CircleGeometry(1.05,32),markerMat.clone());
 centerPick.rotation.x=-Math.PI/2;centerPick.position.set(centerSpot.x,.035,centerSpot.z);centerPick.userData.center=true;scene.add(centerPick);
 // 정원에서 움직이지 않는 표시는 행렬 계산을 잠가 둔다.
 for(const fixed of [...markers,centerPick])if(fixed){fixed.updateMatrix();fixed.matrixAutoUpdate=false;}
 const picks=[],raycaster=new THREE.Raycaster(),pointer=new THREE.Vector2();
 let plants=[],center=null,selected=-1,time=0,milestoneCount=0;
 const anchorRay=new THREE.Raycaster(),anchorNdc=new THREE.Vector2(),groundPlane=new THREE.Plane(new V(0,1,0),0),anchorPoint=new V();
 const anchorWorld=(anchor,target)=>{
  // The background uses a centred cover crop. Undo that crop first, then cast
  // the painted pixel onto the same ground plane used by the garden objects.
  const u=(anchor.u-backdrop.offset.x)/Math.max(.0001,backdrop.repeat.x);
  const v=(anchor.v-backdrop.offset.y)/Math.max(.0001,backdrop.repeat.y);
  anchorNdc.set(u*2-1,1-v*2);anchorRay.setFromCamera(anchorNdc,camera);
  if(anchorRay.ray.intersectPlane(groundPlane,anchorPoint))target.set(anchorPoint.x,0,anchorPoint.z);
 };
 const milestoneMatrix=new THREE.Matrix4(),milestonePosition=new THREE.Vector3(),milestoneScale=new THREE.Vector3(),milestoneRotation=new THREE.Quaternion();
 function syncMilestones(){
  let flower=0,fruit=0;
  for(let i=0;i<milestoneCount;i++){
   const spot=plotSpots[i%plotSpots.length],layer=Math.floor(i/plotSpots.length),a=(i%plotSpots.length)*2.31+layer*.83;
   const radius=.34+layer*.11,isFruit=(i+1)%4===0;
   milestonePosition.set(spot.x+Math.cos(a)*radius,isFruit?.22:.32,spot.z+Math.sin(a)*radius*.72);
   if(isFruit){
    milestoneRotation.setFromAxisAngle(new V(0,1,0),a);milestoneScale.setScalar(1+layer*.04);
    milestoneMatrix.compose(milestonePosition,milestoneRotation,milestoneScale);bossFruits.setMatrixAt(fruit++,milestoneMatrix);
   }else{
    milestoneRotation.copy(camera.quaternion);milestoneScale.setScalar(1+layer*.035);
    milestoneMatrix.compose(milestonePosition,milestoneRotation,milestoneScale);bossBlossoms.setMatrixAt(flower++,milestoneMatrix);
   }
  }
  bossBlossoms.count=flower;bossFruits.count=fruit;bossBlossoms.instanceMatrix.needsUpdate=true;bossFruits.instanceMatrix.needsUpdate=true;
 }
 syncAnchors=()=>{
  PLOT_ANCHORS.forEach((anchor,index)=>{
   const spot=plotSpots[index];anchorWorld(anchor,anchorPoint);spot.x=anchorPoint.x;spot.z=anchorPoint.z;
   const marker=markers[index];if(marker){marker.position.set(spot.x,.03,spot.z);marker.updateMatrix();}
  });
  anchorWorld(CENTER_ANCHOR,anchorPoint);centerSpot.x=anchorPoint.x;centerSpot.z=anchorPoint.z;
  centerPick.position.set(centerSpot.x,.035,centerSpot.z);centerPick.updateMatrix();
  for(const plant of plants){const spot=plotSpots[plant.userData.plot];if(spot)plant.position.set(spot.x,0,spot.z);}
  if(center)center.position.set(centerSpot.x,0,centerSpot.z);
  syncMilestones();
 };

 function clearGroup(group){
  for(const child of [...group.children]){
   group.remove(child);
   child.traverse(o=>{if(!(o.isMesh||o.isSprite))return;if(!o.userData.sharedGardenArt)o.geometry?.dispose();if(o.userData.gardenTint||!o.userData.sharedGardenArt){if(Array.isArray(o.material))o.material.forEach(m=>m.dispose());else o.material?.dispose();}});
  }
 }
 // 정원 상태가 바뀌면 식물을 다시 세운다(자주 일어나지 않는다).
 function setGarden(garden,{austinDefeated=false}={}){
  clearGroup(plantGroup);clearGroup(centerGroup);plants=[];picks.length=0;
  garden.plots.forEach((plant,index)=>{
   const spot=plotSpots[index];if(!spot)return;
   markers[index].visible=!plant;
   if(!plant)return;
   const group=buildPlant(plant.seed,plant.growth,plant.branch,artKit);
   group.position.set(spot.x,0,spot.z);
   group.userData.plot=index;
   plantGroup.add(group);plants.push(group);
   group.traverse(o=>{if(o.isMesh){o.userData.plot=index;picks.push(o);}});
  });
  center=buildCenter(centerStage(garden,{austinDefeated}),artKit);
  center.position.set(centerSpot.x,0,centerSpot.z);
  centerGroup.add(center);
  milestoneCount=bossGardenMilestones(garden).earned;syncMilestones();
  picks.push(centerPick);
  select(selected);
 }
 function select(index){
  selected=Number.isInteger(index)?index:-1;
  for(const group of plants){
   const on=group.userData.plot===selected;
   group.scale.setScalar(on?1.08:1);
  }
  markers.forEach((m,i)=>{const on=i===selected;m.material.opacity=on?.62:0;});
 }
 function update(dt){
  time+=dt;
  for(const group of plants){
   const sway=Math.sin(time*1.4+group.userData.sway)*.035;
   if(group.userData.art){const art=group.children[0];art.quaternion.copy(camera.quaternion);art.rotateZ(sway);}
   else{group.rotation.z=sway;group.rotation.x=sway*.4;}
  }
  if(center?.userData.art)center.children[0]?.quaternion.copy(camera.quaternion);
  else if(center)center.rotation.y=Math.sin(time*.18)*.06;
  flies.forEach((f,i)=>{
   f.a+=dt*f.speed;
   const y=f.y+Math.sin(time*1.2+f.phase)*.35;
   matrix.makeTranslation(Math.cos(f.a)*f.r,y,Math.sin(f.a)*f.r+.4);
   fireflies.setMatrixAt(i,matrix);
  });
  fireflies.instanceMatrix.needsUpdate=true;
  fireflyMat.opacity=.55+Math.sin(time*2.2)*.25;
  blossomMat.opacity=.82+Math.sin(time*1.7)*.1;
  fruitMat.emissiveIntensity=.48+Math.sin(time*1.35)*.12;
 }
 function resize(width,height){camera.aspect=width/Math.max(1,height);viewAspect=camera.aspect;camera.updateProjectionMatrix();fitBackdrop(backdrop);syncAnchors();}
 // 화면 좌표(0~1)로 무엇을 눌렀는지 알려 준다.
 function pick(nx,ny){
  pointer.set(nx*2-1,-(ny*2-1));
  raycaster.setFromCamera(pointer,camera);
  const hits=raycaster.intersectObjects([...picks,...markers.filter(m=>m.visible)],false);
  for(const hit of hits){
   if(hit.object.userData.center)return {kind:'center'};
   const plot=hit.object.userData.plot;
   if(Number.isInteger(plot))return {kind:'plot',index:plot};
   const marker=markers.indexOf(hit.object);
   if(marker>=0)return {kind:'empty',index:marker};
  }
  return null;
 }
 return {scene,camera,setGarden,select,update,resize,pick,plantCount:()=>plants.length};
}
