import * as THREE from 'three';
import {LAWS} from './laws.js';
import {mergeGeometries} from 'three/addons/utils/BufferGeometryUtils.js';

export const FX_COLORS={...Object.fromEntries(Object.entries(LAWS).map(([id,v])=>[id,v.color])),seed:0x76ffd0,jade:0x76ffd0,reflect:0x73dfff,split:0xff947b,chain:0xffdc73,amber:0xffaa52};

// Fixed GPU batches: effects cannot add lights, shadows or an unbounded mesh per spark.
export function createVFX(scene,{mobile=false,random=Math.random}={}){
  const group=new THREE.Group();group.name='seed-vfx';scene.add(group);
  const dummy=new THREE.Object3D(),color=new THREE.Color(),up=new THREE.Vector3(0,1,0);
  const counters={burst:0,flame:0,explosion:0,impact:0,reflect:0,split:0,chain:0,dash:0,evolution:0,trail:0};
  function batch(geometry,capacity){
    const material=new THREE.MeshBasicMaterial({transparent:true,opacity:.8,depthWrite:false,blending:THREE.AdditiveBlending,toneMapped:false,side:THREE.DoubleSide});
    const mesh=new THREE.InstancedMesh(geometry,material,capacity);mesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
    mesh.frustumCulled=false;mesh.count=0;group.add(mesh);
    return {mesh,capacity,cursor:0,slots:Array.from({length:capacity},()=>({life:0,pos:new THREE.Vector3(),vel:new THREE.Vector3(),scale:new THREE.Vector3(),rotation:new THREE.Quaternion()}))};
  }
  const sparks=batch(new THREE.OctahedronGeometry(1,0),mobile?240:480);
  const rings=batch(new THREE.RingGeometry(.92,1,48).rotateX(-Math.PI/2),mobile?18:32);
  const beams=batch(new THREE.BoxGeometry(1,1,1),mobile?120:240);
  // One tapered batch gives explosions a rising flame crown without creating a
  // mesh or a light for every lick of fire.
  const flames=batch(new THREE.ConeGeometry(1,2,5).translate(0,1,0),mobile?96:180);
  const ghostParts=[];
  const part=(geo,x,y,z)=>{geo.translate(x,y,z);ghostParts.push(geo);};
  part(new THREE.IcosahedronGeometry(.43,1).scale(1,1.2,.75),0,.65,0);
  part(new THREE.IcosahedronGeometry(.23,1),0,1.18,0);
  for(const side of [-1,1]){
    part(new THREE.CapsuleGeometry(.11,.4,2,5),side*.47,.5,.05);
    part(new THREE.CapsuleGeometry(.12,.25,2,5),side*.24,.2,.08);
    part(new THREE.OctahedronGeometry(.25).scale(.6,1.3,.8),side*.38,.8,0);
  }
  for(let i=-1;i<=1;i++)part(new THREE.ConeGeometry(.11,.5,5),i*.15,1.48,0);
  const unindexed=ghostParts.map(g=>g.index?g.toNonIndexed():g.clone());
  const ghosts=batch(mergeGeometries(unindexed),mobile?4:8);
  for(const geo of [...ghostParts,...unindexed])geo.dispose();
  const batches=[sparks,rings,beams,flames,ghosts];
  function emit(pool,pos,tint,life,sx,sy=sx,sz=sx,{velocity,rotation,grow=0,delay=0,gravity=0}={}){
    const p=pool.slots[pool.cursor++%pool.capacity];p.pos.copy(pos);p.vel.copy(velocity||up).multiplyScalar(velocity?1:0);
    p.rotation.copy(rotation||new THREE.Quaternion());p.scale.set(sx,sy,sz);p.life=life;p.max=life;p.tint=FX_COLORS[tint]??tint??FX_COLORS.seed;
    p.grow=grow;p.delay=delay;p.gravity=gravity;
    return p;
  }
  function pulse(pos,id,radius=1,life=.35,delay=0){
    emit(rings,new THREE.Vector3(pos.x,.14,pos.z),id,life,radius,1,radius,{grow:1.5,delay});
  }
  function segment(a,b,id,width=.055,life=.16,delay=0){
    const delta=b.clone().sub(a),length=delta.length();if(length<.001)return;
    emit(beams,a.clone().add(b).multiplyScalar(.5),id,life,width,length,width,{rotation:new THREE.Quaternion().setFromUnitVectors(up,delta.normalize()),delay});
  }
  function flame(pos,id='burst',n=10,spread=1,delay=0){
    counters.flame++;
    const count=Math.ceil(n*(mobile?.62:1));
    for(let i=0;i<count;i++){
      const a=random()*Math.PI*2,r=random()*.55*spread,size=.045+random()*.055;
      emit(flames,new THREE.Vector3(pos.x+Math.cos(a)*r,pos.y+.08,pos.z+Math.sin(a)*r),id,.28+random()*.34,size,size*(2.5+random()*2),size,{velocity:new THREE.Vector3(Math.cos(a)*.18,.45+random()*1.25,Math.sin(a)*.18),rotation:new THREE.Quaternion().setFromAxisAngle(up,a),delay});
    }
  }
  function burst(pos,id='seed',n=12,spread=1,delay=0){
    counters.burst++;
    for(let i=0;i<Math.ceil(n*(mobile?.65:1));i++){
      const a=random()*Math.PI*2,speed=(1+random()*3)*spread;
      const size=.04+random()*.06;
      emit(sparks,new THREE.Vector3(pos.x,pos.y+.6,pos.z),id,.25+random()*.3,size,size*2.5,size,{velocity:new THREE.Vector3(Math.cos(a)*speed,.5+random()*2,Math.sin(a)*speed),gravity:3,delay});
    }
    if(id==='burst')flame(pos,id,Math.max(5,Math.ceil(n*.55)),spread,delay);
  }
  function explosion(pos,id='burst',radius=1,big=false){
    counters.explosion++;
    // A compact shock ring keeps impact timing readable; flames and embers carry
    // the actual radius so the blast does not become a flat colored disc.
    pulse(pos,id,radius*.46,.34);pulse(pos,'amber',radius*.27,.24,.035);
    burst(pos,id,big?34:18,Math.max(.8,radius*.55));
    flame(pos,id,big?18:10,Math.max(.8,radius*.48),.03);
  }
  function impact(pos,id='seed',big=false){
    counters.impact++;burst(pos,id,big?30:9,big?1.4:1);
    pulse(pos,id,big?.8:.22,big?.52:.22);
    const a=new THREE.Vector3(pos.x-.3,pos.y+.7,pos.z),b=new THREE.Vector3(pos.x+.3,pos.y+.7,pos.z);
    segment(a,b,id,.08,.12);
  }
  function muzzle(pos,dir,id='seed'){
    const a=new THREE.Vector3(pos.x,.7,pos.z),b=a.clone().addScaledVector(dir,.65);
    segment(a,b,id,.09,.1);burst(pos,id,3,.4);
  }
  function trail(from,to,id='seed',fragment=false){
    counters.trail++;segment(from,to,id,fragment?.025:.055,fragment?.12:.22);
  }
  function reflect(pos,dir){
    counters.reflect++;pulse(pos,'reflect',.42,.3);burst(pos,'reflect',12);
    const center=new THREE.Vector3(pos.x,.7,pos.z),side=new THREE.Vector3(dir.z,0,-dir.x);
    for(const sign of [-1,1])segment(center.clone().addScaledVector(side,sign*.7),center.clone().addScaledVector(dir,.5),'reflect',.08,.25);
  }
  function split(pos,dir,count=3){
    counters.split++;pulse(pos,'split',.5,.32);
    for(let i=0;i<count;i++){
      const d=dir.clone().applyAxisAngle(up,(i/(count-1)-.5)*1.6);
      const start=new THREE.Vector3(pos.x,.7,pos.z);
      segment(start,start.clone().addScaledVector(d,1.2),'split',.07,.26);
    }
    burst(pos,'split',16,.8);
  }
  function arc(a,b){
    counters.chain++;
    const start=new THREE.Vector3(a.x,.85,a.z),end=new THREE.Vector3(b.x,.85,b.z),side=end.clone().sub(start).cross(up).normalize();
    let previous=start;
    for(let i=1;i<=7;i++){
      const next=start.clone().lerp(end,i/7);
      if(i<7)next.addScaledVector(side,(i%2?1:-1)*(.13+random()*.18));
      segment(previous,next,'chain',.075,.2);previous=next;
    }
    pulse(b,'chain',.28,.25);burst(b,'chain',6,.6);
  }
  function dash(pos,angle){
    counters.dash++;
    emit(ghosts,pos,'seed',.32,1.35,1.35,1.35,{rotation:new THREE.Quaternion().setFromAxisAngle(up,angle)});
  }
  function evolution(pos,id){
    counters.evolution++;pulse(pos,id,.7,.8);pulse(pos,id,1.1,.6,.55);
    burst(pos,id,32,.7,.55);
    for(let i=0;i<10;i++){
      const angle=i*Math.PI/5,r=.6+random()*.55;
      const a=new THREE.Vector3(pos.x+Math.cos(angle)*r,.15,pos.z+Math.sin(angle)*r);
      segment(a,a.clone().add(new THREE.Vector3(0,1.5+random(),0)),id,.035,.6,.35+i*.035);
    }
  }
  function update(dt){
    for(const pool of batches){
      let count=0;
      for(const p of pool.slots){
        if(p.life<=0)continue;
        if(p.delay>0){p.delay-=dt;continue;}
        p.life-=dt;if(p.life<=0)continue;
        p.vel.y-=p.gravity*dt;p.pos.addScaledVector(p.vel,dt);
        const t=p.life/p.max,scale=pool===rings?1+(1-t)*p.grow:pool===ghosts?1:pool===flames?.35+.9*Math.sin(Math.PI*(1-t)):.4+.6*t;
        dummy.position.copy(p.pos);dummy.quaternion.copy(p.rotation);dummy.scale.copy(p.scale).multiplyScalar(scale);dummy.updateMatrix();
        pool.mesh.setMatrixAt(count,dummy.matrix);color.setHex(p.tint).multiplyScalar(t*(pool===ghosts?.5:2.4));pool.mesh.setColorAt(count,color);count++;
      }
      pool.mesh.count=count;pool.mesh.instanceMatrix.needsUpdate=true;if(pool.mesh.instanceColor)pool.mesh.instanceColor.needsUpdate=true;
    }
  }
  function clear(){for(const pool of batches){for(const p of pool.slots)p.life=0;pool.mesh.count=0;}}
  return {pulse,burst,flame,explosion,impact,muzzle,trail,reflect,split,arc,dash,evolution,update,clear,
    state:()=>({active:batches.reduce((s,p)=>s+p.mesh.count,0),capacity:batches.reduce((s,p)=>s+p.capacity,0),batches:5,events:{...counters}}),
    dispose(){group.removeFromParent();for(const {mesh} of batches){mesh.dispose();mesh.geometry.dispose();mesh.material.dispose();}}
  };
}
