import * as THREE from 'three';
import {LAWS} from './laws.js';
import {mergeGeometries} from 'three/addons/utils/BufferGeometryUtils.js';
import {THEMES,normalizeTheme,themeColor} from './themes.js';
import {MIRROR_SHOT_COLOR} from './projectile-sprites.js';

export const FX_COLORS={...Object.fromEntries(Object.entries(LAWS).map(([id,v])=>[id,v.color])),seed:0x76ffd0,jade:0x76ffd0,reflect:0x73dfff,split:0xff947b,chain:0xffdc73,amber:0xffaa52,awaken:0xffd36a,mirrorHostile:MIRROR_SHOT_COLOR};

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

// Higgsfield 이펙트 아틀라스(2026-09-21 첫 시험, HIGGSFIELD_RULES.md): 512², 128px 칸 4×4, 검정 바탕 흑백 소재.
// 흑백이라 법칙 색은 지금처럼 인스턴스 색으로 입힌다. 원본 → tools/vfx-atlas-build.py → public/assets/vfx-atlas-v1.webp(18KB).
export const VFX_ATLAS_FILE='assets/vfx-atlas-v1.webp';
export const VFX_CELLS=Object.freeze({orb:0,star:1,flecks:2,ring:3,flame:4,trail:5,comet:6,crescent:7,leaf:8,petal:9,shard:10,lightning:11,mist:12,spores:13,shock:14,sigil:15});

// 불꽃 조각·불꽃 혀를 소재 그림을 입힌 판으로 그린다. 판은 늘 카메라를 보고, 인스턴스마다 칸(fxSprite.x)과 화면 회전(fxSprite.y)을 고른다.
// 묶음 수(드로콜)는 그대로이고 셰이더만 한 종류 바뀐다(판 시작 전 미리 준비됨).
export function vfxSpriteMaterial(atlas){
 const material=new THREE.MeshBasicMaterial({map:atlas,transparent:true,opacity:.8,depthWrite:false,blending:THREE.AdditiveBlending,toneMapped:false,side:THREE.DoubleSide,forceSinglePass:true});
 material.onBeforeCompile=shader=>{
  shader.vertexShader=shader.vertexShader
   .replace('#include <common>','#include <common>\nattribute vec2 fxSprite;')
   .replace('#include <uv_vertex>','#include <uv_vertex>\nvMapUv=(uv+vec2(mod(fxSprite.x,4.),3.-floor(fxSprite.x/4.)))*.25;')
   .replace('#include <project_vertex>',['vec4 mvPosition=modelViewMatrix*instanceMatrix*vec4(0.,0.,0.,1.);',
    'vec2 fxP=vec2(transformed.x*length(instanceMatrix[0].xyz),transformed.y*length(instanceMatrix[1].xyz));',
    'float fxC=cos(fxSprite.y),fxS=sin(fxSprite.y);mvPosition.xy+=vec2(fxP.x*fxC-fxP.y*fxS,fxP.x*fxS+fxP.y*fxC);',
    'gl_Position=projectionMatrix*mvPosition;'].join('\n'));
 };
 material.customProgramCacheKey=()=>'seed-vfx-sprite-v1';
 return material;
}

export function streakGeometry(){
 const geometry=new THREE.OctahedronGeometry(1,0).scale(.72,.5,.72);geometry.name='seed-vfx-tapered-streak';return geometry;
}

// Fixed GPU batches (four): effects cannot add lights, shadows or an unbounded mesh per spark.
export function createVFX(scene,{mobile=false,random=Math.random,theme='botanical',quality=2,atlas=null}={}){
  const group=new THREE.Group();group.name='seed-vfx';scene.add(group);
  const dummy=new THREE.Object3D(),color=new THREE.Color(),up=new THREE.Vector3(0,1,0),identity=new THREE.Quaternion();
  const segDelta=new THREE.Vector3(),segMid=new THREE.Vector3(),segRotation=new THREE.Quaternion(),viewSegment=new THREE.Vector3(),spriteTurn=new THREE.Quaternion(),screenForward=new THREE.Vector3(0,0,1);
  const emitPos=new THREE.Vector3(),emitVelocity=new THREE.Vector3(),emitRotation=new THREE.Quaternion();
  const workA=new THREE.Vector3(),workB=new THREE.Vector3(),workC=new THREE.Vector3(),workD=new THREE.Vector3(),workE=new THREE.Vector3();
  const counters={pulse:0,burst:0,flame:0,explosion:0,impact:0,reflect:0,split:0,chain:0,portal:0,dash:0,evolution:0,trail:0,lance:0,frostWeb:0,rewindTrace:0,mirrorArc:0,gardenVortex:0,sunburst:0,bossPitch:0,bossRush:0,bossSwing:0,bossWave:0,bossPhase:0};let themeId=normalizeTheme(theme),qualityLevel=Math.max(0,Math.min(2,quality|0)),viewCamera=null;
  const density=()=>[.42,.68,1][qualityLevel]*(mobile?.68:1);
  function batch(geometry,capacity,sprite=null){
    const material=sprite?vfxSpriteMaterial(atlas):new THREE.MeshBasicMaterial({transparent:true,opacity:.8,depthWrite:false,blending:THREE.AdditiveBlending,toneMapped:false,side:THREE.DoubleSide,forceSinglePass:true});
    if(sprite){geometry.name='seed-vfx-sprite';const cells=new THREE.InstancedBufferAttribute(new Float32Array(capacity*2),2);cells.setUsage(THREE.DynamicDrawUsage);geometry.setAttribute('fxSprite',cells);}
    const mesh=new THREE.InstancedMesh(geometry,material,capacity);mesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
    // 색 버퍼를 처음부터 둔다. 첫 setColorAt 때 생기면 셰이더 종류가 바뀌어 전투 중에 다시 컴파일된다.
    mesh.instanceColor=new THREE.InstancedBufferAttribute(new Float32Array(capacity*3).fill(1),3);mesh.instanceColor.setUsage(THREE.DynamicDrawUsage);
    mesh.frustumCulled=false;mesh.count=0;group.add(mesh);
    return {mesh,capacity,sprite,cursor:0,slots:Array.from({length:capacity},()=>({life:0,pos:new THREE.Vector3(),vel:new THREE.Vector3(),scale:new THREE.Vector3(),rotation:new THREE.Quaternion(),twinkle:0}))};
  }
  // 아틀라스가 있으면 불꽃 조각·불꽃 혀는 소재 판으로 그린다. 판 크기 배율은 예전 팔면체·원뿔이 보이던 크기에 맞춘 값이다
  // (소재 그림은 칸의 가운데 60~75%만 차지하고 가장자리가 부드럽게 사라진다). 불꽃 판은 아래 끝이 발생 위치다.
  // glow: 부드러운 테두리만큼 줄어든 반짝임을 채우는 밝기 배율. 조각 가운데가 하얗게 넘치도록 불꽃 조각은 크게 올렸다
  // (2026-09-21 사용자: "반짝임이 줄어서 아쉽다"). 휴대폰은 화면이 작고 기본 화질의 번짐이 약해 1.35배 더 밝힌다.
  const sparks=atlas?batch(new THREE.PlaneGeometry(1,1),mobile?240:480,{x:4.2,y:2.1,glow:1.9}):batch(new THREE.OctahedronGeometry(1,0),mobile?240:480);
  const beams=atlas?batch(new THREE.PlaneGeometry(1,1),mobile?120:240,{x:1.75,y:1,glow:1.45}):batch(streakGeometry(),mobile?120:240);
  // One tapered batch gives explosions a rising flame crown without creating a
  // mesh or a light for every lick of fire.
  const flames=atlas?batch(new THREE.PlaneGeometry(1,1).translate(0,.5,0),mobile?96:180,{x:5,y:2.7,glow:1.15}):batch(new THREE.ConeGeometry(1,2,5).translate(0,1,0),mobile?96:180);
  const chance=(a,b,rate)=>random()<rate?a:b;
  // 법칙마다 불꽃 조각 소재를 섞는다(색은 그대로 법칙 색). 작은 조각은 별빛이 가장 또렷하게 반짝여서 별빛을 바탕으로 두고,
  // 법칙 모양(얼음 조각·번개·꽃잎·홀씨·잎)은 섞어 넣는 정도로만 쓴다. 둥근 빛은 뭉개져 보여 불씨에만 쓴다.
  function sparkCell(id){
    if(id==='frost')return chance(VFX_CELLS.shard,VFX_CELLS.star,.35);
    if(id==='chain')return chance(VFX_CELLS.lightning,VFX_CELLS.star,.3);
    if(id==='split')return chance(VFX_CELLS.petal,VFX_CELLS.star,.4);
    if(id==='gravity')return chance(VFX_CELLS.spores,VFX_CELLS.star,.4);
    if(id==='burst'||id==='amber')return chance(VFX_CELLS.orb,VFX_CELLS.star,.4);
    return chance(VFX_CELLS.leaf,VFX_CELLS.star,.25);
  }
  function fallbackGhostGeometry(){
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
    const geometry=mergeGeometries(unindexed);
    for(const part of [...ghostParts,...unindexed])part.dispose();
    return geometry;
  }
  const ghosts=atlas?batch(new THREE.PlaneGeometry(1,1),mobile?4:8,{x:1.65,y:1.65,glow:.8}):batch(fallbackGhostGeometry(),mobile?4:8);
  const batches=[sparks,beams,flames,ghosts];
  function emit(pool,pos,tint,life,sx,sy=sx,sz=sx,{velocity,rotation,grow=0,delay=0,gravity=0,cell=0,angle=0}={}){
    const p=pool.slots[pool.cursor++%pool.capacity];p.pos.copy(pos);p.vel.copy(velocity||up).multiplyScalar(velocity?1:0);
    p.rotation.copy(rotation||identity);p.scale.set(sx,sy,sz);p.life=life;p.max=life;p.tint=tint==='mirrorHostile'?MIRROR_SHOT_COLOR:themeColor(themeId,tint,FX_COLORS[tint]??tint??FX_COLORS.seed);
    p.grow=grow;p.delay=delay;p.gravity=gravity;p.twinkle=random()*Math.PI*2;p.cell=cell;p.angle=angle;
    return p;
  }
  // Kept as a no-op so every caller (forms, bosses, items) stays valid without drawing a floor ring.
  function pulse(){counters.pulse++;}
  function segment(a,b,id,width=.055,life=.16,delay=0){
    const theme=THEMES[themeId];width*=theme.trailWidth;life*=theme.trailLife;
    segDelta.copy(b).sub(a);const length=segDelta.length();if(length<.001)return;
    segMid.copy(a).add(b).multiplyScalar(.5);segDelta.multiplyScalar(1/length);
    if(beams.sprite&&viewCamera){
      viewSegment.copy(segDelta).transformDirection(viewCamera.matrixWorldInverse);
      const angle=Math.atan2(-viewSegment.x,viewSegment.y);
      segRotation.copy(viewCamera.quaternion).multiply(spriteTurn.setFromAxisAngle(screenForward,angle));
    }else segRotation.setFromUnitVectors(up,segDelta);
    emit(beams,segMid,id,life,width,length,width,{rotation:segRotation,delay,cell:id==='chain'?VFX_CELLS.lightning:VFX_CELLS.trail});
  }
  function flame(pos,id='burst',n=10,spread=1,delay=0){
    counters.flame++;
    const count=Math.max(qualityLevel===0?2:3,Math.ceil(n*density()*THEMES[themeId].flame));
    for(let i=0;i<count;i++){
      const a=random()*Math.PI*2,r=random()*.55*spread,size=.045+random()*.055;
      emitPos.set(pos.x+Math.cos(a)*r,pos.y+.08,pos.z+Math.sin(a)*r);emitVelocity.set(Math.cos(a)*.18,.45+random()*1.25,Math.sin(a)*.18);emitRotation.setFromAxisAngle(up,a);
      emit(flames,emitPos,id,.28+random()*.34,size,size*(2.5+random()*2),size,{velocity:emitVelocity,rotation:emitRotation,delay,cell:VFX_CELLS.flame,angle:flames.sprite?(random()-.5)*.35:0});
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
      const flat=theme.motion==='axis',cell=sparks.sprite?sparkCell(id):0;emit(sparks,emitPos,id,.25+random()*.3,size*(flat?1.7:1),size*(flat?.75:2.5),size,{velocity:emitVelocity,gravity:theme.motion==='spiral'?1.4:theme.motion==='inward'?.8:3,delay,cell,angle:sparks.sprite?random()*Math.PI*2:0});
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
    counters.trail++;if(qualityLevel===0&&fragment)return;
    const theme=THEMES[themeId],width=fragment?.025:.055,life=fragment?.12:.22;
    if(qualityLevel===0){segment(from,to,id,width,life);return;}
    if(theme.trailMode==='dash'){
      workA.copy(from).lerp(to,.43);workB.copy(from).lerp(to,.62);segment(from,workA,id,width,life);segment(workB,to,id,width*.82,life*.86);return;
    }
    if(theme.trailMode==='ribbon'){
      workA.copy(to).sub(from);const length=Math.hypot(workA.x,workA.z)||1,ox=-workA.z/length*.045,oz=workA.x/length*.045;
      workB.set(from.x+ox,from.y,from.z+oz);workC.set(to.x+ox,to.y,to.z+oz);segment(workB,workC,id,width*.72,life);
      workB.set(from.x-ox,from.y,from.z-oz);workC.set(to.x-ox,to.y,to.z-oz);segment(workB,workC,id,width*.72,life);return;
    }
    segment(from,to,id,width,life);
    if(theme.trailMode==='leaf'&&!fragment){
      workA.copy(from).lerp(to,.55);workC.copy(to).sub(from);workB.set(workA.x-workC.z*.18,workA.y+.04,workA.z+workC.x*.18);segment(workA,workB,'amber',width*.65,life*.7);
    }else if(theme.trailMode==='comet'&&!fragment){emitPos.copy(from).lerp(to,.52);emitVelocity.set(0,.28,0);emit(sparks,emitPos,'awaken',life*.9,width*1.15,width*2.1,width,{velocity:emitVelocity,cell:VFX_CELLS.star});}
  }
  // The first curated batch contains three hitscan attacks. Give those attacks
  // authored silhouettes in the existing beam pool rather than inventing a
  // projectile that would disagree with their collision timing.
  function lance(from,to,kind='icicle',folded=false){
    counters.lance++;
    const dx=to.x-from.x,dz=to.z-from.z,length=Math.hypot(dx,dz);
    if(length<.05)return;
    const sideX=-dz/length,sideZ=dx/length,ice=kind==='icicle',accent=ice?'frost':kind==='shower'?'split':'reflect';
    workA.set(from.x,.79,from.z);workB.set(to.x,.79,to.z);
    segment(workA,workB,accent,folded?.13:.11,.19);
    workC.copy(workA).lerp(workB,ice?.38:.5);
    segment(workA,workC,'amber',.046,.17);
    if(qualityLevel===0)return;
    // Two teeth at the tip read as split ice or a refracted prism at gameplay scale.
    for(const sign of [-1,1]){
      workD.copy(workA).lerp(workB,.77).add(workE.set(sideX*sign*(ice?.16:.2),0,sideZ*sign*(ice?.16:.2)));
      segment(workD,workB,accent,.047,.19);
    }
  }
  function frostWeb(from,to){
    counters.frostWeb++;
    const dx=to.x-from.x,dz=to.z-from.z,length=Math.hypot(dx,dz);
    if(length<.05)return;
    const ox=-dz/length*.09,oz=dx/length*.09;
    workA.set(from.x,.25,from.z);workB.set(to.x,.25,to.z);
    segment(workA,workB,'frost',.032,.62);
    if(qualityLevel===0)return;
    workC.set(from.x+ox,.25,from.z+oz);workD.set(to.x-ox,.25,to.z-oz);
    segment(workC,workD,'frost',.022,.58);
    workC.copy(workA).lerp(workB,.47).add(workE.set(ox,0,oz));
    workD.copy(workA).lerp(workB,.57).sub(workE);
    segment(workC,workD,'chain',.022,.48);
  }
  function rewindTrace(from,to,replay=false,delay=0){
    counters.rewindTrace++;
    const dx=to.x-from.x,dz=to.z-from.z,length=Math.hypot(dx,dz);
    if(length<.05)return;
    const ox=-dz/length*.11,oz=dx/length*.11;
    workA.set(from.x,.88,from.z);workB.set(to.x,.88,to.z);
    segment(workA,workB,replay?'amber':'recall',replay?.062:.034,replay?.3:.22,delay);
    if(qualityLevel===0)return;
    workC.set(from.x+ox,.88,from.z+oz);workD.set(to.x+ox,.88,to.z+oz);
    segment(workC,workD,replay?'chain':'amber',.028,replay?.27:.2,delay+.025);
  }
  function mirrorArc(from,to,echo=0){
    counters.mirrorArc++;
    const dx=to.x-from.x,dz=to.z-from.z,length=Math.hypot(dx,dz);
    if(length<.05)return;
    const delay=Math.min(6,echo)*.045,ox=-dz/length*.17,oz=dx/length*.17;
    workA.set(from.x,.91,from.z);workB.set(to.x,.91,to.z);
    workC.copy(workA).lerp(workB,.5).add(workE.set(ox,0,oz));
    segment(workA,workC,'chain',.074,.22,delay);
    segment(workC,workB,'reflect',.074,.22,delay);
    if(qualityLevel===0)return;
    workD.copy(workA).lerp(workB,.5).sub(workE.multiplyScalar(1.45));
    segment(workC,workD,'amber',.035,.2,delay+.015);
  }
  function gardenVortex(pos,radius=1.5){
    counters.gardenVortex++;
    const count=qualityLevel===0?3:5;
    for(let i=0;i<count;i++){
      const a=i*Math.PI*2/count,r=radius*.44;
      workA.set(pos.x+Math.cos(a)*r,.18,pos.z+Math.sin(a)*r);
      workB.set(pos.x+Math.cos(a+.65)*r*1.35,.18,pos.z+Math.sin(a+.65)*r*1.35);
      segment(workA,workB,i%2?'gravity':'split',.034,.62);
    }
  }
  function sunburst(pos,radius=1){
    counters.sunburst++;
    const count=qualityLevel===0?6:10;
    for(let i=0;i<count;i++){
      const a=i*Math.PI*2/count,inner=radius*.23,outer=radius*(i%2?.75:1);
      workA.set(pos.x+Math.cos(a)*inner,.66,pos.z+Math.sin(a)*inner);
      workB.set(pos.x+Math.cos(a)*outer,.66,pos.z+Math.sin(a)*outer);
      segment(workA,workB,i%2?'amber':'burst',.056,.22,i%3*.018);
    }
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
    emitRotation.setFromAxisAngle(up,angle);emit(ghosts,pos,'seed',.32,1.35,1.35,1.35,{rotation:emitRotation,cell:VFX_CELLS.leaf});
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
  // Always Beginner's attacks use different silhouettes while staying inside
  // the same four fixed GPU batches. No lights or per-attack meshes are added.
  function bossPitch(pos,dir,curve=0){
    counters.bossPitch++;
    const dx=dir.x,dz=dir.z,length=Math.hypot(dx,dz)||1,nx=dx/length,nz=dz/length,sideX=nz,sideZ=-nx;
    let px=pos.x+nx*.45,pz=pos.z+nz*.45;
    const steps=curve?6:4,tint=curve?'reflect':'amber';
    for(let i=1;i<=steps;i++){
      const t=i/steps,bend=curve*Math.sin(t*Math.PI)*1.15;
      const x=pos.x+nx*(.45+t*2.6)+sideX*bend,z=pos.z+nz*(.45+t*2.6)+sideZ*bend;
      workA.set(px,.78,pz);workB.set(x,.78,z);segment(workA,workB,tint,curve?.065:.09,curve?.3:.22,(i-1)*.018);px=x;pz=z;
    }
    for(const along of [.92,1.42]){
      const x=pos.x+nx*along,z=pos.z+nz*along;
      workA.set(x-sideX*.18,.8,z-sideZ*.18);workB.set(x+sideX*.18,.8,z+sideZ*.18);segment(workA,workB,'burst',.045,.18);
    }
    burst(pos,tint,curve?9:12,.65);
  }
  function bossRush(from,to){
    counters.bossRush++;
    const dx=to.x-from.x,dz=to.z-from.z,length=Math.hypot(dx,dz)||1,nx=dx/length,nz=dz/length,sideX=nz,sideZ=-nx;
    const count=qualityLevel===0?2:3;
    for(let lane=0;lane<count;lane++){
      const offset=(lane-(count-1)/2)*.22;
      workA.set(from.x+sideX*offset,.3,from.z+sideZ*offset);workB.set(to.x+sideX*offset,.3,to.z+sideZ*offset);segment(workA,workB,lane===1?'amber':'reflect',.055,.3,lane*.025);
    }
    dash(from,Math.atan2(nx,nz));burst(to,'reflect',14,.8,.08);
  }
  function bossSwing(pos,dir){
    counters.bossSwing++;
    const base=Math.atan2(dir.z,dir.x),radius=2.15,steps=qualityLevel===0?5:8;
    let angle=base-1.05;
    workA.set(pos.x+Math.cos(angle)*.55,.88,pos.z+Math.sin(angle)*.55);
    for(let i=1;i<=steps;i++){
      angle=base-1.05+i*2.1/steps;const r=.55+(radius-.55)*i/steps;
      workB.set(pos.x+Math.cos(angle)*r,.88,pos.z+Math.sin(angle)*r);segment(workA,workB,i>steps*.66?'burst':'amber',.09+i*.009,.24,i*.012);workA.copy(workB);
    }
    const contactX=pos.x+dir.x*.82,contactZ=pos.z+dir.z*.82;
    for(let i=0;i<4;i++){
      const a=i*Math.PI/4,ax=Math.cos(a)*.38,az=Math.sin(a)*.38;
      workA.set(contactX-ax,.95,contactZ-az);workB.set(contactX+ax,.95,contactZ+az);segment(workA,workB,'awaken',.055,.16);
    }
    flame(pos,'burst',12,1.05,.02);burst(pos,'amber',18,1.1);
  }
  function bossWave(pos,gapAngle=0){
    counters.bossWave++;
    const spokes=qualityLevel===0?12:18;
    for(let i=0;i<spokes;i++){
      const a=i*Math.PI*2/spokes,diff=Math.atan2(Math.sin(a-gapAngle),Math.cos(a-gapAngle));if(Math.abs(diff)<.42)continue;
      const delay=(i%3)*.035;
      workA.set(pos.x+Math.cos(a)*.65,.48,pos.z+Math.sin(a)*.65);workB.set(pos.x+Math.cos(a)*2.45,.48,pos.z+Math.sin(a)*2.45);segment(workA,workB,i%2?'amber':'reflect',.065,.3,delay);
    }
    burst(pos,'amber',20,1.15);flame(pos,'amber',8,.75,.04);
  }
  function bossPhase(pos,phase='rally'){
    counters.bossPhase++;
    const finish=phase==='finish',rays=qualityLevel===0?6:finish?12:9,tint=finish?'burst':'amber';
    for(let i=0;i<rays;i++){
      const a=i*Math.PI*2/rays,r=.55+(i%2)*.28;
      workA.set(pos.x+Math.cos(a)*r,.16,pos.z+Math.sin(a)*r);workB.set(pos.x+Math.cos(a)*r*(finish?1.45:1.2),1.75+(i%3)*.35,pos.z+Math.sin(a)*r*(finish?1.45:1.2));segment(workA,workB,i%3===0?'awaken':tint,.065,finish?.7:.55,i*.025);
    }
    burst(pos,tint,finish?38:28,finish?1.8:1.35);flame(pos,tint,finish?22:14,finish?1.55:1.1,.06);
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
        dummy.position.copy(p.pos);dummy.quaternion.copy(p.rotation);dummy.scale.copy(p.scale).multiplyScalar(scale);
        if(pool.sprite){dummy.scale.x*=pool.sprite.x;dummy.scale.y*=pool.sprite.y;pool.mesh.geometry.attributes.fxSprite.setXY(count,p.cell,p.angle);}
        dummy.updateMatrix();pool.mesh.setMatrixAt(count,dummy.matrix);color.setHex(p.tint).multiplyScalar(t*(pool===ghosts?.5:2.4)*(pool.sprite?pool.sprite.glow*(mobile?1.35:1):1));pool.mesh.setColorAt(count,color);count++;
      }
      // 살아 있는 조각만큼만 GPU로 올린다(예전에는 빈 칸까지 매 프레임 전체 버퍼를 올렸다). 하나도 없으면 그리지도 올리지도 않는다.
      pool.mesh.count=count;if(!count)continue;
      const matrix=pool.mesh.instanceMatrix,colors=pool.mesh.instanceColor;
      matrix.clearUpdateRanges();matrix.addUpdateRange(0,count*16);matrix.needsUpdate=true;
      if(colors){colors.clearUpdateRanges();colors.addUpdateRange(0,count*3);colors.needsUpdate=true;}
      if(pool.sprite){const cells=pool.mesh.geometry.attributes.fxSprite;cells.clearUpdateRanges();cells.addUpdateRange(0,count*2);cells.needsUpdate=true;}
    }
  }
  function clear(){for(const pool of batches){for(const p of pool.slots)p.life=0;pool.mesh.count=0;}}
  return {pulse,burst,flame,explosion,impact,muzzle,trail,lance,frostWeb,rewindTrace,mirrorArc,gardenVortex,sunburst,reflect,split,arc,portal,dash,evolution,bossPitch,bossRush,bossSwing,bossWave,bossPhase,update,clear,setCamera:camera=>{viewCamera=camera;},setTheme:id=>{themeId=normalizeTheme(id);return themeId;},setQuality:level=>qualityLevel=Math.max(0,Math.min(2,level|0)),
    state:()=>({theme:themeId,quality:qualityLevel,textured:Boolean(atlas),spriteBeams:Boolean(beams.sprite),spriteDash:Boolean(ghosts.sprite),active:batches.reduce((s,p)=>s+p.mesh.count,0),capacity:batches.reduce((s,p)=>s+p.capacity,0),batches:batches.length,events:{...counters}}),
    dispose(){group.removeFromParent();for(const {mesh} of batches){mesh.dispose();mesh.geometry.dispose();mesh.material.dispose();}}
  };
}
