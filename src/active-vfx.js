import * as THREE from 'three';
import {ALL_FORMS} from './forms.js';
import {LAWS} from './laws.js';

// A bounded five-draw-call stage around the seed. Broken petal wheels carry the
// silhouette; the floor wash stays faint so the effect does not read as circles.
function petalWheel(count,inner=.72,outer=1,width=.16){
 const positions=[],indices=[];
 for(let i=0;i<count;i++){
  const a=i*Math.PI*2/count,c=Math.cos(a),s=Math.sin(a),tx=-s,tz=c,mid=(inner+outer)*.5,base=positions.length/3;
  positions.push(c*inner,0,s*inner,c*mid+tx*width,0,s*mid+tz*width,c*outer,0,s*outer,c*mid-tx*width,0,s*mid-tz*width);
  indices.push(base,base+1,base+3,base+1,base+2,base+3);
 }
 const geo=new THREE.BufferGeometry();geo.setAttribute('position',new THREE.Float32BufferAttribute(positions,3));geo.setIndex(indices);geo.computeVertexNormals();return geo;
}
export function activeColors(forms=[]){
 const colors=[];
 for(const id of forms)for(const law of ALL_FORMS[id]?.requires||[]){const color=LAWS[law]?.color;if(color!=null&&!colors.includes(color))colors.push(color);}
 return colors.length?colors:[0x76ffd0];
}
export function createActiveVFX(scene,{mobile=false}={}){
 const group=new THREE.Group();group.name='active-vfx';group.visible=false;scene.add(group);
 const additive=(color=0xffffff)=>new THREE.MeshBasicMaterial({color,transparent:true,opacity:0,depthWrite:false,blending:THREE.AdditiveBlending,toneMapped:false,side:THREE.DoubleSide});
 const floor=new THREE.Mesh(new THREE.CircleGeometry(1,32).rotateX(-Math.PI/2),additive());floor.position.y=.105;group.add(floor);
 const ringA=new THREE.Mesh(petalWheel(8,.62,1,.16),additive());ringA.position.y=.13;group.add(ringA);
 const ringB=new THREE.Mesh(petalWheel(13,.76,1,.09),additive());ringB.position.y=.15;group.add(ringB);
 const column=new THREE.Mesh(new THREE.ConeGeometry(.72,5.5,7,1,true),additive());column.position.y=2.85;group.add(column);
 const shardGeo=new THREE.OctahedronGeometry(.18,0);shardGeo.scale(.5,2.1,1);
 const shardMat=additive();shardMat.vertexColors=true;
 const shardCount=mobile?10:16,shards=new THREE.InstancedMesh(shardGeo,shardMat,shardCount);shards.instanceMatrix.setUsage(THREE.DynamicDrawUsage);shards.frustumCulled=false;group.add(shards);
 const dummy=new THREE.Object3D(),color=new THREE.Color();
 let effect=null,serial=0;
 const paint=(material,hex,opacity)=>{material.color.setHex(hex).multiplyScalar(2.2);material.opacity=opacity;};
 function start(plan,pos){
  serial++;effect={mode:'running',state:plan.state,forms:[...plan.forms],time:plan.seconds,total:plan.seconds,age:0,colors:activeColors(plan.forms),serial};
  group.position.set(pos.x,0,pos.z);group.visible=true;return effect;
 }
 function finish(plan,pos){
  serial++;effect={mode:'finale',state:plan.state,forms:[...plan.forms],time:.9,total:.9,age:0,colors:activeColors(plan.forms),serial};
  group.position.set(pos.x,0,pos.z);group.visible=true;return effect;
 }
 function update(dt,pos){
  if(!effect){group.visible=false;return;}
  effect.age+=dt;effect.time-=dt;group.position.set(pos.x,0,pos.z);
  const running=effect.mode==='running',over=effect.state==='OVERDRIVE',intro=Math.min(1,effect.age/.34),life=Math.max(0,effect.time/effect.total);
  const power=running?(over?.8:.62)+Math.sin(effect.age*8)*.08:Math.sin(Math.PI*life);
  const primary=effect.colors[0],secondary=effect.colors[1]??(over?0xff8fd8:primary);
  paint(floor.material,primary,(running?.055:.12)*power);floor.scale.setScalar((running?1.75:1.3+3.2*(1-life))*intro);
  paint(ringA.material,primary,(running?.78:1)*power);paint(ringB.material,secondary,(running?.58:.9)*power);
  const base=running?(1.55+.18*Math.sin(effect.age*5)):(1.3+4.2*(1-life));
  ringA.scale.setScalar(base*intro);ringB.scale.setScalar((base+(over?.48:.28))*intro);ringA.rotation.y=effect.age*1.8;ringB.rotation.y=-effect.age*2.4;
  paint(column.material,over?secondary:primary,(running?.18:.55)*power);column.scale.set(running?1+.12*Math.sin(effect.age*6):1+1.4*(1-life),running?.7+intro*.3:1+.8*(1-life),running?1+.12*Math.sin(effect.age*6):1+1.4*(1-life));
  shards.count=shardCount;
  for(let i=0;i<shardCount;i++){
   const a=effect.age*(over?3.8:2.7)+i*Math.PI*2/shardCount,r=running?(over?2.25:1.85)+Math.sin(effect.age*4+i)*.18:1.4+4.6*(1-life);
   dummy.position.set(Math.cos(a)*r,.45+(i%3)*.28+Math.sin(effect.age*6+i)*.18,Math.sin(a)*r);
   dummy.rotation.set(0,-a,effect.age*4+i);dummy.scale.setScalar((running?.75:1.25)*intro*Math.max(.15,power));dummy.updateMatrix();
   shards.setMatrixAt(i,dummy.matrix);color.setHex(effect.colors[i%effect.colors.length]??primary).multiplyScalar(2.5);shards.setColorAt(i,color);
  }
  shards.instanceMatrix.needsUpdate=true;if(shards.instanceColor)shards.instanceColor.needsUpdate=true;shardMat.opacity=Math.min(1,power);
  if(effect.time<=0){effect=null;group.visible=false;}
 }
 function clear(){effect=null;group.visible=false;floor.material.opacity=ringA.material.opacity=ringB.material.opacity=column.material.opacity=0;shards.count=0;}
 function state(){return {visible:group.visible,mode:effect?.mode||null,state:effect?.state||null,forms:effect?.forms||[],time:effect?.time||0,drawCalls:5,instances:group.visible?shards.count:0,serial};}
 function dispose(){group.removeFromParent();for(const ob of [floor,ringA,ringB,column,shards]){ob.geometry.dispose();ob.material.dispose();}}
 return {start,finish,update,clear,state,dispose};
}
