import * as THREE from 'three';
import {FX_COLORS,vfxSpriteMaterial} from './vfx.js';
import {themeColor} from './themes.js';

// Higgsfield 탄환 소재(2026-09-22, HIGGSFIELD_RULES.md): 512², 128px 칸 4×4, 검정 바탕 흑백.
// 원본 → tools/vfx-atlas-build.py → public/assets/shot-atlas-v1.webp(23KB). 칸 번호.
export const SHOT_ATLAS_FILE='assets/shot-atlas-v1.webp';
export const SHOT_CELLS=Object.freeze({seed:0,reflect:1,split:2,chain:3,orbit:4,pierce:5,burst:6,recall:7,gravity:8,frost:9,critical:10,trail:11,sparkTrail:12,leafTrail:13,crackleTrail:14,mistTrail:15});
// 법칙마다 어울리는 꼬리. 꼬리 칸은 머리가 칸 위쪽이다.
const TRAIL_OF=Object.freeze({seed:'leafTrail',reflect:'sparkTrail',split:'sparkTrail',chain:'crackleTrail',orbit:'trail',pierce:'trail',burst:'sparkTrail',recall:'trail',gravity:'trail',frost:'mistTrail'});
// 창끝처럼 방향이 있는 무늬는 날아가는 쪽으로 세우고, 나머지는 천천히 돈다.
const ALIGNED=new Set(['pierce']);
const SPIN=Object.freeze({seed:1.6,reflect:1.1,split:.9,chain:2.4,orbit:.7,burst:1.8,recall:3.2,gravity:2.8,frost:.8,critical:2});

// 탄 하나에 소재 판 두 장(빛 무늬 + 꼬리)을 붙인다. 탄 몸체(모양·충돌)는 그대로 두고 뒤에 겹쳐 그리기만 한다.
// 첫 법칙이 빛 무늬를, 두 번째 법칙이 꼬리를 정해서 조합마다 새 그림 없이 섞인다(990 조합 규칙).
export function shotAuraLook(tint='seed',{critical=false,trailLaw=tint,fragment=false,theme='botanical'}={}){
 const law=TRAIL_OF[tint]?tint:'seed',trailKey=fragment||!TRAIL_OF[trailLaw]?law:trailLaw,auraKey=critical?'awaken':law;
 return {theme,aura:critical?SHOT_CELLS.critical:SHOT_CELLS[law],aligned:!critical&&ALIGNED.has(law),spin:SPIN[critical?'critical':law]??1,trail:SHOT_CELLS[TRAIL_OF[trailKey]],
  auraColor:themeColor(theme,auraKey,FX_COLORS[auraKey]??FX_COLORS.seed),trailColor:themeColor(theme,trailKey,FX_COLORS[trailKey]??FX_COLORS.seed)};
}

// 모든 탄의 소재 판을 한 묶음(드로콜 1개)으로 그린다. 재질은 이펙트 소재 판과 같은 셰이더라 새로 컴파일되지 않는다.
export function createShotAuras(scene,{atlas=null,capacity=320,mobile=false}={}){
 const geometry=new THREE.PlaneGeometry(1,1);geometry.name='seed-shot-aura';
 const cells=new THREE.InstancedBufferAttribute(new Float32Array(capacity*2),2);cells.setUsage(THREE.DynamicDrawUsage);geometry.setAttribute('fxSprite',cells);
 const mesh=new THREE.InstancedMesh(geometry,vfxSpriteMaterial(atlas),capacity);mesh.name='seed-shot-auras';
 mesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
 // 색 버퍼를 처음부터 둔다(첫 setColorAt 때 생기면 셰이더 종류가 바뀌어 전투 중에 다시 컴파일된다).
 mesh.instanceColor=new THREE.InstancedBufferAttribute(new Float32Array(capacity*3).fill(1),3);mesh.instanceColor.setUsage(THREE.DynamicDrawUsage);
 mesh.frustumCulled=false;mesh.count=0;mesh.castShadow=false;mesh.receiveShadow=false;scene.add(mesh);
 const dummy=new THREE.Object3D(),view=new THREE.Vector3(),color=new THREE.Color(),bright=mobile?1.25:1;
 function put(i,x,z,sx,sy,cell,angle,hex,glow){
  dummy.position.set(x,.67,z);dummy.scale.set(sx,sy,1);dummy.updateMatrix();mesh.setMatrixAt(i,dummy.matrix);
  cells.setXY(i,cell,angle);color.setHex(hex).multiplyScalar(glow*bright);mesh.setColorAt(i,color);
 }
 // first·second: 지금 고른 첫째·둘째 법칙(첫 법칙 = 탄 색). 매 프레임 호출, 살아 있는 탄만큼만 GPU로 올린다.
 function sync(shots,camera,{theme='botanical',first='seed',second=null}={}){
  let count=0;
  if(atlas){
   camera.updateMatrixWorld();
   for(const p of shots){
    if(p.life<=0||count+2>capacity)continue;
    // 탄마다 한 번만 정한다(매 프레임 새 객체를 만들지 않게). 테마가 바뀌면 다시 정한다.
    const look=p.auraLook?.theme===theme?p.auraLook:(p.auraLook=shotAuraLook(p.tint,{critical:p.critical,trailLaw:second||first,fragment:p.fragment,theme}));
    view.set(p.dir.x,0,p.dir.z).transformDirection(camera.matrixWorldInverse);
    const heading=Math.atan2(-view.x,view.y),k=p.visualScale||1,fade=Math.min(1,p.life/.18,(p.age+.03)/.08),x=p.ob.position.x,z=p.ob.position.z;
    const length=(p.fragment?.62:1)*1.35*Math.min(k,1.4),width=length*.72;
    put(count++,x-p.dir.x*length*.46,z-p.dir.z*length*.46,width,length,look.trail,heading,look.trailColor,1.7*fade);
    const size=(p.critical?.62:.9)*k,pulse=.88+.12*Math.sin(p.age*10);
    put(count++,x,z,size,size,look.aura,look.aligned?heading:p.age*look.spin,look.auraColor,1.3*pulse*fade);
   }
  }
  mesh.count=count;if(!count)return 0;
  mesh.instanceMatrix.clearUpdateRanges();mesh.instanceMatrix.addUpdateRange(0,count*16);mesh.instanceMatrix.needsUpdate=true;
  mesh.instanceColor.clearUpdateRanges();mesh.instanceColor.addUpdateRange(0,count*3);mesh.instanceColor.needsUpdate=true;
  cells.clearUpdateRanges();cells.addUpdateRange(0,count*2);cells.needsUpdate=true;
  return count;
 }
 return {mesh,sync,state:()=>({textured:Boolean(atlas),active:mesh.count,capacity}),dispose(){mesh.removeFromParent();mesh.dispose();geometry.dispose();mesh.material.dispose();}};
}
