import * as THREE from 'three';
import {LAWS} from './laws.js';
import {mergeGeometries} from 'three/addons/utils/BufferGeometryUtils.js';
import {THEMES,normalizeTheme,themeColor} from './themes.js';

export const FX_COLORS={...Object.fromEntries(Object.entries(LAWS).map(([id,v])=>[id,v.color])),seed:0x76ffd0,jade:0x76ffd0,reflect:0x73dfff,split:0xff947b,chain:0xffdc73,amber:0xffaa52,awaken:0xffd36a};

// The flat shock crown that spread across the floor was removed (2026-09-15): it covered the arena,
// read as a flat colored sunburst and cost a batch. Hits and blasts now use sparks, streaks and flames only.
// The geometry stays exported for older tools.
export function shockCrownGeometry(segments=14){
 const positions=[];
 for(let i=0;i<segments;i++){
  const center=i*Math.PI*2/segments,a0=center-Math.PI*.62/segments,a1=center+Math.PI*.62/segments;
  const inner=.48,outer=i%2?1:.86,mid=outer*1.13;
  const point=(angle,radius)=>[Math.cos(angle)*radius,.015,Math.sin(angle)*radius];
  const i0=point(a0,inner),i1=point(a1,inner),o0=point(a0,outer),o1=point(a1,outer),om=point(center,mid);
  positions.push(...i0,...o0,...om,...i0,...om,...i1,...i1,...om,...o1);
 }
 const geometry=new THREE.BufferGeometry();geometry.setAttribute('position',new THREE.Float32BufferAttribute(positions,3));geometry.computeVertexNormals();geometry.name='seed-vfx-broken-shock-crown';return geometry;
}

export function streakGeometry(){
 const geometry=new THREE.OctahedronGeometry(1,0).scale(.72,.5,.72);geometry.name='seed-vfx-tapered-streak';return geometry;
}

// Fixed GPU batches (four): effects cannot add lights, shadows or an unbounded mesh per spark.
export function createVFX(scene,{mobile=false,random=Math.random,theme='botanical',quality=2}={}){
  const group=new THREE.Group();group.name='seed-vfx';scene.add(group);
  const dummy=new THREE.Object3D(),color=new THREE.Color(),up=new THREE.Vector3(0,1,0),identity=new THREE.Quaternion();
  const segDelta=new THREE.Vector3(),segMid=new THREE.Vector3(),segRotation=new THREE.Quaternion();
  const emitPos=new THREE.Vector3(),emitVelocity=new THREE.Vector3(),emitRotation=new THREE.Quaternion();
  const workA=new THREE.Vector3(),workB=new THREE.Vector3(),workC=new THREE.Vector3(),workD=new THREE.Vector3(),workE=new THREE.Vector3();
  const counters={pulse:0,burst:0,flame:0,explosion:0,impact:0,reflect:0,split:0,chain:0,portal:0,dash:0,evolution:0,trail:0};let themeId=normalizeTheme(theme),qualityLevel=Math.max(0,Math.min(2,quality|0));
  const density=()=>[.42,.68,1][qualityLevel]*(mobile?.68:1);
  function batch(geometry,capacity){
    const material=new THREE.MeshBasicMaterial({transparent:true,opacity:.8,depthWrite:false,blending:THREE.AdditiveBlending,toneMapped:false,side:THREE.DoubleSide,forceSinglePass:true});
    const mesh=new THREE.InstancedMesh(geometry,material,capacity);mesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
    mesh.frustumCulled=false;mesh.count=0;group.add(mesh);
    return {mesh,capacity,cursor:0,slots:Array.from({length:capacity},()=>({life:0,pos:new THREE.Vector3(),vel:new THREE.Vector3(),scale:new THREE.Vector3(),rotation:new THREE.Quaternion(),twinkle:0}))};
  }
  const sparks=batch(new THREE.OctahedronGeometry(1,0),mobile?240:480);
  const beams=batch(streakGeometry(),mobile?120:240);
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
  const batches=[sparks,beams,flames,ghosts];
  function emit(pool,pos,tint,life,sx,sy=sx,sz=sx,{velocity,rotation,grow=0,delay=0,gravity=0}={}){
    const p=pool.slots[pool.cursor++%pool.capacity];p.pos.copy(pos);p.vel.copy(velocity||up).multiplyScalar(velocity?1:0);
    p.rotation.copy(rotation||identity);p.scale.set(sx,sy,sz);p.life=life;p.max=life;p.tint=themeColor(themeId,tint,FX_COLORS[tint]??tint??FX_COLORS.seed);
    p.grow=grow;p.delay=delay;p.gravity=gravity;p.twinkle=random()*Math.PI*2;
    return p;
  }
  // Kept as a no-op so every caller (forms, bosses, items) stays valid without drawing a floor ring.
  function pulse(){counters.pulse++;}
  function segment(a,b,id,width=.055,life=.16,delay=0){
    const theme=THEMES[themeId];width*=theme.trailWidth;life*=theme.trailLife;
    segDelta.copy(b).sub(a);const length=segDelta.length();if(length<.001)return;
    segMid.copy(a).add(b).multiplyScalar(.5);segRotation.setFromUnitVectors(up,segDelta.multiplyScalar(1/length));
    emit(beams,segMid,id,life,width,length,width,{rotation:segRotation,delay});
  }
  function flame(pos,id='burst',n=10,spread=1,delay=0){
    counters.flame++;
    const count=Math.max(qualityLevel===0?2:3,Math.ceil(n*density()*THEMES[themeId].flame));
    for(let i=0;i<count;i++){
      const a=random()*Math.PI*2,r=random()*.55*spread,size=.045+random()*.055;
      emitPos.set(pos.x+Math.cos(a)*r,pos.y+.08,pos.z+Math.sin(a)*r);emitVelocity.set(Math.cos(a)*.18,.45+random()*1.25,Math.sin(a)*.18);emitRotation.setFromAxisAngle(up,a);
      emit(flames,emitPos,id,.28+random()*.34,size,size*(2.5+random()*2),size,{velocity:emitVelocity,rotation:emitRotation,delay});
    }
  }
  function burst(pos,id='seed',n=12,spread=1,delay=0){
    counters.burst++;const theme=THEMES[themeId];
    for(let i=0,count=Math.max(qualityLevel===0?2:3,Math.ceil(n*density()));i<count;i++){
      const a=random()*Math.PI*2,speed=(1+random()*3)*spread;
      const size=.04+random()*.06;
      if(theme.motion==='inward'){
        const r=.7+random()*1.35*spread;emitPos.set(pos.x+Math.cos(a)*r,pos.y+.35+random()*.55,pos.z+Math.sin(a)*r);emitVelocity.set(-Math.cos(a)*speed*.65,.15+random()*.9,-Math.sin(a)*speed*.65);
      }else if(theme.motion==='axis'){
        const axis=Math.round(a/(Math.PI/2))*Math.PI/2;emitPos.set(pos.x,pos.y+.6,pos.z);emitVelocity.set(Math.cos(axis)*speed,.25+random()*1.35,Math.sin(axis)*speed);
      }else if(theme.motion==='spiral'){
        const r=random()*.45*spread;emitPos.set(pos.x+Math.cos(a)*r,pos.y+.35,pos.z+Math.sin(a)*r);emitVelocity.set(Math.cos(a+Math.PI/2)*speed*.72,.75+random()*1.8,Math.sin(a+Math.PI/2)*speed*.72);
      }else{emitPos.set(pos.x,pos.y+.6,pos.z);emitVelocity.set(Math.cos(a)*speed,.5+random()*2,Math.sin(a)*speed);}
      const flat=theme.motion==='axis';emit(sparks,emitPos,id,.25+random()*.3,size*(flat?1.7:1),size*(flat?.75:2.5),size,{velocity:emitVelocity,gravity:theme.motion==='spiral'?1.4:theme.motion==='inward'?.8:3,delay});
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
    workA.set(pos.x-.3,pos.y+.7,pos.z);workB.set(pos.x+.3,pos.y+.7,pos.z);segment(workA,workB,id,.08,.12);
  }
  function muzzle(pos,dir,id='seed'){
    workA.set(pos.x,.7,pos.z);workB.copy(workA).addScaledVector(dir,.65);segment(workA,workB,id,.09,.1);burst(pos,id,3,.4);
  }
  function trail(from,to,id='seed',fragment=false){
    counters.trail++;if(qualityLevel===0&&fragment)return;segment(from,to,id,fragment?.025:.055,fragment?.12:.22);
  }
  function reflect(pos,dir){
    counters.reflect++;pulse(pos,'reflect',.42,.3);burst(pos,'reflect',12);
    workA.set(pos.x,.7,pos.z);workB.set(dir.z,0,-dir.x);
    for(const sign of [-1,1]){workC.copy(workA).addScaledVector(workB,sign*.7);workD.copy(workA).addScaledVector(dir,.5);segment(workC,workD,'reflect',.08,.25);}
  }
  function split(pos,dir,count=3){
    counters.split++;pulse(pos,'split',.5,.32);
    for(let i=0;i<count;i++){
      workA.copy(dir).applyAxisAngle(up,(i/(count-1)-.5)*1.6);workB.set(pos.x,.7,pos.z);workC.copy(workB).addScaledVector(workA,1.2);
      segment(workB,workC,'split',.07,.26);
    }
    burst(pos,'split',16,.8);
  }
  function arc(a,b){
    counters.chain++;
    workA.set(a.x,.85,a.z);workB.set(b.x,.85,b.z);workC.copy(workB).sub(workA).cross(up).normalize();workD.copy(workA);
    for(let i=1;i<=7;i++){
      workE.copy(workA).lerp(workB,i/7);
      if(i<7)workE.addScaledVector(workC,(i%2?1:-1)*(.13+random()*.18));
      segment(workD,workE,'chain',.075,.2);workD.copy(workE);
    }
    pulse(b,'chain',.28,.25);burst(b,'chain',6,.6);
  }
  // Two compact gates and a connecting streak, drawn through the existing
  // spark/beam batches. A portal therefore adds no draw call on low-end phones.
  function portal(a,b){
    counters.portal++;
    const from=workA.set(a.x,.72,a.z),to=workB.set(b.x,.72,b.z);
    segment(from,to,'portal',.09,.2);
    const sides=THEMES[themeId].portalSides;
    for(const p of [a,b]){
      burst(p,'portal',8,.55);
      for(let i=0;i<sides;i++){
        const angle=i*Math.PI*2/sides;
        workC.set(p.x+Math.cos(angle)*.38,.72,p.z+Math.sin(angle)*.38);
        workD.set(p.x+Math.cos(angle+Math.PI*2/sides*.82)*.38,.72,p.z+Math.sin(angle+Math.PI*2/sides*.82)*.38);
        segment(workC,workD,'portal',.055,.24);
      }
    }
  }
  function dash(pos,angle){
    counters.dash++;
    emitRotation.setFromAxisAngle(up,angle);emit(ghosts,pos,'seed',.32,1.35,1.35,1.35,{rotation:emitRotation});
  }
  function evolution(pos,id){
    counters.evolution++;pulse(pos,id,.7,.8);pulse(pos,id,1.1,.6,.55);
    burst(pos,id,32,.7,.55);
    for(let i=0;i<10;i++){
      const angle=i*Math.PI/5,r=.6+random()*.55;
      workA.set(pos.x+Math.cos(angle)*r,.15,pos.z+Math.sin(angle)*r);workB.copy(workA);workB.y+=1.5+random();
      segment(workA,workB,id,.035,.6,.35+i*.035);
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
        const t=p.life/p.max,theme=THEMES[themeId],base=pool===ghosts?1:pool===flames?.35+.9*Math.sin(Math.PI*(1-t)):.4+.6*t;
        const scale=pool===sparks?base*theme.sparkScale*(1-theme.twinkle+theme.twinkle*Math.abs(Math.sin((1-t)*Math.PI*6+p.twinkle))):base;
        dummy.position.copy(p.pos);dummy.quaternion.copy(p.rotation);dummy.scale.copy(p.scale).multiplyScalar(scale);dummy.updateMatrix();
        pool.mesh.setMatrixAt(count,dummy.matrix);color.setHex(p.tint).multiplyScalar(t*(pool===ghosts?.5:2.4));pool.mesh.setColorAt(count,color);count++;
      }
      pool.mesh.count=count;pool.mesh.instanceMatrix.needsUpdate=true;if(pool.mesh.instanceColor)pool.mesh.instanceColor.needsUpdate=true;
    }
  }
  function clear(){for(const pool of batches){for(const p of pool.slots)p.life=0;pool.mesh.count=0;}}
  return {pulse,burst,flame,explosion,impact,muzzle,trail,reflect,split,arc,portal,dash,evolution,update,clear,setTheme:id=>{themeId=normalizeTheme(id);return themeId;},setQuality:level=>qualityLevel=Math.max(0,Math.min(2,level|0)),
    state:()=>({theme:themeId,quality:qualityLevel,active:batches.reduce((s,p)=>s+p.mesh.count,0),capacity:batches.reduce((s,p)=>s+p.capacity,0),batches:batches.length,events:{...counters}}),
    dispose(){group.removeFromParent();for(const {mesh} of batches){mesh.dispose();mesh.geometry.dispose();mesh.material.dispose();}}
  };
}
