// 정원 장면 · 카드 목록이 아니라 실제로 보이는 정원.
// 게임과 같은 렌더러를 쓰고, 장면만 바꿔 그린다(모드가 정원일 때만).
// 식물은 씨앗 색과 성장 단계, 갈래로 모양이 달라진다. 그림이 준비되면 이 모양만 교체하면 된다.
import * as THREE from 'three';
import {LAWS} from './laws.js';
import {SEEDS,PLOTS,STAGES,stageOf,centerStage,CENTER,plantName,GUARDIAN} from './garden.js';

const V=THREE.Vector3;
// The painted terrace has two beds in each of three depth rows. Keeping the
// interaction spots on the same perspective makes planting feel part of the art.
export const PLOT_SPOTS=Object.freeze([
 {x:-2,z:-5},{x:2,z:-5},
 {x:-2.45,z:-2.2},{x:2.45,z:-2.2},
 {x:-1.45,z:.7},{x:1.45,z:.7}
]);
export const CENTER_SPOT=Object.freeze({x:0,z:-2.6});
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
export function buildPlant(seedId,growth,branch){
 const group=new THREE.Group(),tint=seedColor(seedId),stage=stageOf(growth);
 const soil=material(0x3b2f24,{rough:1});
 const pot=new THREE.Mesh(new THREE.CylinderGeometry(.46,.36,.44,12),material(0x8a5a42,{rough:.85}));
 pot.position.y=.22;pot.castShadow=pot.receiveShadow=true;group.add(pot);
 const dirt=new THREE.Mesh(new THREE.CylinderGeometry(.4,.4,.06,12),soil);dirt.position.y=.45;group.add(dirt);
 const leaf=material(tint,{rough:.6,emissive:tint,intensity:stage==='bloom'?.5:.18});
 const stemMat=material(0x4f7a4a,{rough:.7});
 const add=(geo,mat,x,y,z)=>{const m=new THREE.Mesh(geo,mat);m.position.set(x,y,z);m.castShadow=true;group.add(m);return m;};
 if(stage==='seed'){
  const bead=add(new THREE.IcosahedronGeometry(.17,0),leaf,0,.57,0);bead.scale.set(1,.85,1);
 }else if(stage==='sprout'){
  add(new THREE.CylinderGeometry(.05,.07,.42,6),stemMat,0,.68,0);
  for(const side of [-1,1]){const l=add(new THREE.SphereGeometry(.17,8,6),leaf,side*.16,.86,0);l.scale.set(1,.45,.7);l.rotation.z=-side*.5;}
 }else{
  const big=stage==='bloom';
  if(branch==='tree'){
   add(new THREE.CylinderGeometry(.1,.17,big?1.5:1.05,7),stemMat,0,big?1.2:.98,0);
   const crown=add(new THREE.IcosahedronGeometry(big?.72:.55,0),leaf,0,big?2.05:1.6,0);crown.scale.y=.8;
   if(big){const side=add(new THREE.IcosahedronGeometry(.42,0),leaf,.5,1.75,.1);side.scale.y=.75;}
  }else if(branch==='vine'){
   add(new THREE.CylinderGeometry(.06,.09,.5,6),stemMat,0,.72,0);
   const arc=add(new THREE.TorusGeometry(big?.62:.46,.05,5,16,Math.PI*1.2),stemMat,0,big?1.25:1.02,0);
   arc.rotation.set(Math.PI/2.4,0,.4);
   for(let i=0;i<(big?5:3);i++){
    const a=i/(big?5:3)*Math.PI*1.1;
    const l=add(new THREE.SphereGeometry(.14,7,5),leaf,Math.cos(a)*(big?.62:.46),(big?1.25:1.02)+Math.sin(a)*.28,.08);
    l.scale.set(1,.4,.65);l.rotation.z=a;
   }
  }else{ // 꽃
   add(new THREE.CylinderGeometry(.06,.09,big?.95:.7,6),stemMat,0,big?.95:.8,0);
   for(const side of [-1,1]){const l=add(new THREE.SphereGeometry(.16,8,6),leaf,side*.2,.78,0);l.scale.set(1,.42,.7);l.rotation.z=-side*.6;}
   const head=add(new THREE.SphereGeometry(big?.3:.22,10,8),leaf,0,big?1.5:1.18,0);head.scale.y=.8;
   const petals=big?7:5;
   for(let i=0;i<petals;i++){
    const a=i/petals*Math.PI*2;
    const p=add(new THREE.ConeGeometry(big?.15:.11,big?.42:.3,5),leaf,Math.cos(a)*(big?.34:.25),big?1.5:1.18,Math.sin(a)*(big?.34:.25));
    p.rotation.set(Math.PI/2.1,0,-a);
   }
  }
 }
 group.userData={seed:seedId,stage,branch:branch||null,sway:Math.random()*6.28};
 return group;
}
// 정원 한가운데: 여정을 거듭할수록 드러나는 존재.
export function buildCenter(index){
 const group=new THREE.Group();
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
 let viewAspect=16/9;
 const fitBackdrop=texture=>{
  if(!texture?.image)return;
  const imageAspect=texture.image.width/texture.image.height;
  texture.repeat.set(1,1);texture.offset.set(0,0);
  if(viewAspect<imageAspect){texture.repeat.x=viewAspect/imageAspect;texture.offset.x=(1-texture.repeat.x)/2;}
  else{texture.repeat.y=imageAspect/viewAspect;texture.offset.y=(1-texture.repeat.y)/2;}
  texture.needsUpdate=true;
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
 // The painted beds already show every empty slot. The raycast meshes stay
 // present for tapping, but draw nothing until one slot is actually selected.
 const markerMat=new THREE.MeshBasicMaterial({color:0xffd77a,transparent:true,opacity:0,side:THREE.DoubleSide,depthWrite:false,toneMapped:false});
 const markers=PLOT_SPOTS.map(spot=>{
  const m=new THREE.Mesh(new THREE.RingGeometry(.49,.535,40),markerMat.clone());
  m.rotation.x=-Math.PI/2;m.position.set(spot.x,.03,spot.z);scene.add(m);return m;
 });
 const picks=[],raycaster=new THREE.Raycaster(),pointer=new THREE.Vector2();
 let plants=[],center=null,selected=-1,time=0;

 function clearGroup(group){
  for(const child of [...group.children]){
   group.remove(child);
   child.traverse(o=>{if(o.isMesh||o.isSprite){o.geometry?.dispose();if(Array.isArray(o.material))o.material.forEach(m=>m.dispose());else o.material?.dispose();}});
  }
 }
 // 정원 상태가 바뀌면 식물을 다시 세운다(자주 일어나지 않는다).
 function setGarden(garden,{austinDefeated=false}={}){
  clearGroup(plantGroup);clearGroup(centerGroup);plants=[];picks.length=0;
  garden.plots.forEach((plant,index)=>{
   const spot=PLOT_SPOTS[index];if(!spot)return;
   markers[index].visible=!plant;
   if(!plant)return;
   const group=buildPlant(plant.seed,plant.growth,plant.branch);
   group.position.set(spot.x,0,spot.z);
   group.userData.plot=index;
   plantGroup.add(group);plants.push(group);
   group.traverse(o=>{if(o.isMesh){o.userData.plot=index;picks.push(o);}});
  });
  center=buildCenter(centerStage(garden,{austinDefeated}));
  center.position.set(CENTER_SPOT.x,0,CENTER_SPOT.z);
  center.traverse(o=>{if(o.isMesh)o.userData.center=true;});
  centerGroup.add(center);
  center.traverse(o=>{if(o.isMesh)picks.push(o);});
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
   group.rotation.z=sway;group.rotation.x=sway*.4;
  }
  if(center)center.rotation.y=Math.sin(time*.18)*.06;
  flies.forEach((f,i)=>{
   f.a+=dt*f.speed;
   const y=f.y+Math.sin(time*1.2+f.phase)*.35;
   matrix.makeTranslation(Math.cos(f.a)*f.r,y,Math.sin(f.a)*f.r+.4);
   fireflies.setMatrixAt(i,matrix);
  });
  fireflies.instanceMatrix.needsUpdate=true;
  fireflyMat.opacity=.55+Math.sin(time*2.2)*.25;
 }
 function resize(width,height){camera.aspect=width/Math.max(1,height);viewAspect=camera.aspect;camera.updateProjectionMatrix();fitBackdrop(backdrop);}
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
