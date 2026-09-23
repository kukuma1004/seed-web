import * as THREE from 'three';
import {mergeGeometries} from 'three/addons/utils/BufferGeometryUtils.js';

// Authored botanical silhouettes, baked into one colored geometry per weapon.
// Decorative parts never add meshes, lights, textures, or collision surfaces.
const C={ivory:0xf5edcf,jade:0x49bd99,deep:0x14665c,gold:0xd3a657,ice:0xb4e4e5,blue:0x498fa6,violet:0x8f81b7};

function paint(geometry,color){
 const g=geometry.index?geometry.toNonIndexed():geometry;
 if(g!==geometry)geometry.dispose();
 g.deleteAttribute('uv');g.computeVertexNormals();g.computeBoundingBox();
 const p=g.getAttribute('position'),n=g.getAttribute('normal'),base=new THREE.Color(color),out=[];
 const height=g.boundingBox.max.y-g.boundingBox.min.y||1,width=g.boundingBox.max.x-g.boundingBox.min.x||1;
 for(let i=0;i<p.count;i++){
  // Baked key light, edge glint and a faint centre vein make the low-poly
  // facets readable without another material, texture or per-shot light.
  const vertical=(p.getY(i)-g.boundingBox.min.y)/height;
  const edge=Math.min(1,Math.abs(p.getX(i))/(width*.5));
  const facing=Math.max(0,n.getZ(i));
  const vein=Math.max(0,1-Math.abs(p.getX(i))/(width*.13));
  const shade=.72+.17*vertical+.09*facing+.08*edge+.07*vein;
  const c=base.clone().multiplyScalar(shade);out.push(c.r,c.g,c.b);
 }
 g.setAttribute('color',new THREE.Float32BufferAttribute(out,3));return g;
}
function join(name,parts){
 const g=mergeGeometries(parts,false);for(const part of parts)part.dispose();
 g.name=`seed-form-${name}`;g.computeBoundingSphere();return g;
}

// A tapered, asymmetric leaf with a raised central vein and closed back.
// Its irregular outline remains visible at a small gameplay scale.
function leaf(length,width,bend=.12,depth=.065,steps=7){
 const points=[],indices=[];
 for(let side=0;side<2;side++)for(let i=0;i<=steps;i++){
  const t=i/steps,w=Math.pow(Math.sin(Math.PI*t),.78)*width*.5;
  const x=Math.sin(Math.PI*t)*bend,y=(t-.5)*length;
  points.push(x-w,y,0,x,y,(side?-1:1)*depth*Math.sin(Math.PI*t),x+w,y,0);
 }
 const half=(steps+1)*3;
 for(let side=0;side<2;side++)for(let i=0;i<steps;i++)for(let strip=0;strip<2;strip++){
  const a=side*half+i*3+strip,b=a+1,c=a+3,d=c+1;
  if(side)indices.push(a,c,b,b,c,d);else indices.push(a,b,c,b,d,c);
 }
 const g=new THREE.BufferGeometry();g.setAttribute('position',new THREE.Float32BufferAttribute(points,3));g.setIndex(indices);return g;
}
function petal(length,width,{edge=C.ivory,inner=C.jade,bend=.08,depth=.065}={}){
 const shell=paint(leaf(length,width,bend,depth),edge);
 const inlay=paint(leaf(length*.79,width*.6,bend*.85,depth*.64),inner).translate(0,length*.015,depth*.49);
 return join('inlaid-petal',[shell,inlay]);
}
function seedBody(radius,length,color){return paint(new THREE.SphereGeometry(radius,8,6).scale(.85,length/(radius*2),.85),color);}
function bud(name,radius,height,petals,color){
 const parts=[seedBody(radius*.64,height*.77,C.ivory)];
 for(let i=0;i<petals;i++){
  const p=petal(height,radius*1.1,{edge:C.ivory,inner:color,bend:.035,depth:.05});
  p.rotateX(.3).translate(0,-height*.045,radius*.56).rotateY(i*Math.PI*2/petals);parts.push(p);
 }
 parts.push(paint(leaf(height*.42,radius*.48,.02,.035),C.gold).translate(0,height*.43,0));
 return join(name,parts);
}
function crescent(scale=1,curveSegments=7){
 const s=new THREE.Shape();
 s.moveTo(-.47,-.28);s.bezierCurveTo(-.05,-.19,.33,-.07,.41,.52);
 s.bezierCurveTo(.7,.11,.47,-.38,.12,-.47);
 s.bezierCurveTo(-.16,-.53,-.32,-.4,-.47,-.28);
 const g=new THREE.ExtrudeGeometry(s,{depth:.065,bevelEnabled:true,bevelThickness:.014,bevelSize:.015,bevelSegments:1,steps:1,curveSegments});
 return g.translate(0,0,-.0325).scale(scale,scale,scale);
}

export function createFormVisuals(){
 const mat=(emissive,roughness=.49,metalness=.1,intensity=.08)=>new THREE.MeshStandardMaterial({color:0xffffff,vertexColors:true,emissive,emissiveIntensity:intensity,roughness,metalness,side:THREE.DoubleSide});
 const mats={ice:mat(0x6aaab9,.42,.08,.3),core:mat(0x645187),blade:mat(0x398c73),prism:mat(0x52999c,.32,.22),bloom:mat(0x74b8c1),storm:mat(0xc4a250,.4,.12,.3),star:mat(0xd8a62f,.3,.16,.48),tide:mat(0x71628e),seed:mat(0x73a47a),mirror:mat(0x6babad,.29,.38,.22),lens:mat(0x7253a7,.24,.3,.42),gene:mat(0x8172c8,.3,.2,.38)};
 const geos={};
 geos.collapse=bud('thorn-pod',.3,.65,4,C.violet);
 geos.blade=join('returning-leaf',[
  paint(crescent(),C.ivory),
  paint(crescent(.8),C.jade).translate(.025,-.03,.06),
  paint(leaf(.53,.07,.15,.02),C.gold).rotateZ(-.68).translate(.18,-.07,.1)
 ]);
 geos.satellite=join('frost-snowflake-spear',[
  petal(.72,.36,{edge:C.blue,inner:C.ice,bend:.025,depth:.11}),
  paint(leaf(.35,.16,0,.045,5),C.violet).rotateZ(Math.PI/2).translate(-.12,.02,.035),
  paint(leaf(.35,.16,0,.045,5),C.violet).rotateZ(-Math.PI/2).translate(.12,.02,.035),
  paint(new THREE.OctahedronGeometry(.105,0),C.ice).translate(0,-.25,.07)
 ]);
 geos.shard=join('gilded-prism',[
  paint(leaf(.65,.3,0,.10,4),C.gold),
  paint(leaf(.54,.23,0,.105,4),C.ivory).translate(0,0,.025),
  paint(leaf(.39,.12,0,.07,4),C.jade).translate(0,0,.085)
 ]);
 geos.bloom=bud('closed-frost-blossom',.32,.62,5,C.ice);
 const crown=[seedBody(.17,.43,C.jade),paint(new THREE.TorusGeometry(.2,.035,5,10),C.gold).rotateX(Math.PI/2)];
 for(let i=0;i<5;i++)crown.push(paint(leaf(.37,.12,.035,.035,5),i%2?C.ivory:C.gold).translate(0,.17,0).rotateZ(i*Math.PI*2/5));
 geos.orb=join('storm-corolla',crown);
 const swirl=[];
 for(let i=0;i<3;i++)swirl.push(paint(crescent(.67),i===0?C.ivory:i===1?C.jade:C.violet).rotateZ(i*Math.PI*2/3));
 geos.vortex=join('tidal-leaf-whorl',swirl);
 geos.tide=join('returning-tidal-comet',[
  paint(crescent(1.02),C.blue).rotateZ(-.12).translate(.2,0,0),
  paint(crescent(.78),C.ice).rotateZ(Math.PI+.16).translate(-.28,0,.055),
  paint(leaf(.82,.18,.18,.055,7),C.jade).rotateZ(-Math.PI/2).translate(-.52,0,.08),
  paint(leaf(.58,.12,.14,.04,6),C.ivory).rotateZ(-Math.PI/2).translate(-.82,.22,.1)
 ]);
 geos.seed=join('winged-seed',[
  seedBody(.105,.23,C.ivory),
  paint(leaf(.33,.13,.06,.025,5),C.jade).rotateZ(-.65).translate(.07,.095,0),
  paint(new THREE.ConeGeometry(.035,.25,4),C.gold).rotateZ(.78).translate(-.09,-.09,.025),
  paint(new THREE.OctahedronGeometry(.045,0),C.ice).translate(.015,.14,.055)
 ]);
 geos.mirror=join('leaf-mirror',[
  paint(leaf(.8,.57,0,.085,5),C.gold),
  paint(leaf(.69,.46,0,.075,5),C.ivory).translate(0,0,.045),
  paint(leaf(.55,.3,0,.065,5),C.blue).translate(0,0,.085),
  paint(leaf(.43,.065,0,.015,5),C.ice).rotateZ(-.26).translate(-.055,0,.14)
 ]);
 geos.mirrorBolt=petal(.42,.22,{edge:C.ivory,inner:C.jade,bend:.02,depth:.065});
 geos.mirrorBolt.name='seed-form-mirror-splinter';
 geos.lens=join('gravity-mirror-lens',[
  paint(new THREE.TorusGeometry(.27,.055,6,14),C.gold).rotateX(Math.PI/2),
  paint(new THREE.OctahedronGeometry(.2,0).scale(.72,1.25,.72),C.violet),
  paint(leaf(.46,.17,.05,.04,5),C.ice).rotateZ(Math.PI/2).translate(.25,0,.04),
  paint(leaf(.46,.17,.05,.04,5),C.jade).rotateZ(-Math.PI/2).translate(-.25,0,.04)
 ]);
 geos.frostMirror=join('frost-mirror-shard',[
  paint(new THREE.OctahedronGeometry(.24,0).scale(.62,1.32,.62),C.ice),
  paint(new THREE.TorusGeometry(.25,.035,5,12),C.blue).rotateX(Math.PI/2),
  paint(leaf(.4,.12,.02,.035,5),C.ivory).rotateZ(Math.PI/2).translate(.23,0,.035),
  paint(leaf(.4,.12,.02,.035,5),C.ivory).rotateZ(-Math.PI/2).translate(-.23,0,.035)
 ]);
 geos.lightningPetal=join('lightning-petal-bud',[
  seedBody(.12,.26,C.gold),
  paint(leaf(.45,.15,.05,.04,5),C.ivory).rotateZ(.72).translate(.11,.12,.02),
  paint(leaf(.45,.15,.05,.04,5),C.blue).rotateZ(-.72).translate(-.11,.12,.055),
  paint(new THREE.ConeGeometry(.065,.32,4),C.gold).rotateX(Math.PI/2).translate(0,0,-.21)
 ]);
 geos.returnFlare=join('returning-flare-core',[
  paint(crescent(.82),C.gold).rotateZ(-.18),
  paint(new THREE.DodecahedronGeometry(.16,0),C.ivory).translate(.13,0,.065),
  paint(leaf(.5,.12,.08,.035,6),C.jade).rotateZ(-Math.PI/2).translate(-.36,0,.06)
 ]);
 geos.cometBud=join('charged-comet-corolla',[
  seedBody(.13,.3,C.gold),
  paint(new THREE.TorusGeometry(.2,.04,5,12),C.jade).rotateX(Math.PI/2),
  paint(leaf(.48,.15,.1,.04,6),C.ivory).rotateZ(-Math.PI/2).translate(-.3,0,.05),
  paint(new THREE.ConeGeometry(.055,.38,4),C.blue).rotateZ(Math.PI/2).translate(.29,.09,.035),
  paint(new THREE.ConeGeometry(.045,.3,4),C.violet).rotateZ(Math.PI/2).translate(.25,-.1,.025),
  paint(new THREE.OctahedronGeometry(.075,0),C.ice).translate(0,0,.13)
 ]);
 geos.returnPetal=join('returning-split-petal',[
  paint(crescent(.7),C.ivory).rotateZ(-.2),
  paint(leaf(.48,.16,.1,.04,6),C.jade).rotateZ(-Math.PI/2).translate(-.25,0,.055),
  paint(new THREE.OctahedronGeometry(.09,0),C.gold).translate(.13,0,.07),
  paint(new THREE.ConeGeometry(.045,.32,4),C.blue).rotateZ(Math.PI/2).translate(.29,.09,.03),
  paint(new THREE.ConeGeometry(.04,.28,4),C.violet).rotateZ(Math.PI/2).translate(.25,-.1,.02)
 ]);
 geos.gravityStake=join('gravity-implosion-stake',[
  paint(new THREE.ConeGeometry(.13,.82,5),C.ivory).rotateX(Math.PI/2),
  paint(new THREE.OctahedronGeometry(.17,0).scale(.7,.7,1.35),C.violet).translate(0,0,-.28),
  paint(new THREE.TorusGeometry(.21,.035,5,12),C.gold).rotateX(Math.PI/2).translate(0,0,-.08),
  paint(new THREE.ConeGeometry(.05,.34,4),C.jade).rotateZ(.7).translate(.13,0,-.22),
  paint(new THREE.ConeGeometry(.05,.34,4),C.jade).rotateZ(-.7).translate(-.13,0,-.22),
  paint(new THREE.OctahedronGeometry(.06,0),C.ice).translate(0,0,.39)
 ]);
 geos.gene=join('paired-law-gene',[paint(new THREE.OctahedronGeometry(.19,0).scale(.72,.72,1.45),C.violet),paint(new THREE.TorusGeometry(.22,.035,5,12),C.gold).rotateX(Math.PI/2),paint(leaf(.38,.13,.05,.03,5),C.ivory).rotateZ(-.72).translate(.08,.12,.03)]);
 const star=[paint(new THREE.OctahedronGeometry(.145,0),C.gold)];
 for(let i=0;i<4;i++)star.push(petal(.5,.25,{edge:C.ivory,inner:i%2?C.gold:C.jade,bend:.025,depth:.075}).translate(0,.2,0).rotateZ(i*Math.PI/2));
 geos.starPetal=join('four-point-star-bloom',star);
 // 1묶음. 고드름 창은 끝이 갈라진 결정 한 자루, 후광 꽃잎은 바깥으로 흩뿌려지는 한 장이다.
 geos.icicle=join('frost-splitting-icicle',[
  paint(new THREE.ConeGeometry(.12,.86,5),C.ice).rotateX(Math.PI/2).translate(0,0,.08),
  paint(new THREE.ConeGeometry(.055,.4,4),C.ivory).rotateX(Math.PI/2).rotateY(.34).translate(.09,0,.44),
  paint(new THREE.ConeGeometry(.055,.4,4),C.ivory).rotateX(Math.PI/2).rotateY(-.34).translate(-.09,0,.44),
  paint(new THREE.TorusGeometry(.19,.032,5,12),C.blue).rotateX(Math.PI/2).translate(0,0,-.2),
  paint(leaf(.3,.11,.04,.03,5),C.jade).rotateX(Math.PI/2).rotateZ(.9).translate(.1,0,-.3)
 ]);
 geos.haloPetal=join('halo-bloom-petal',[
  petal(.52,.27,{edge:C.ivory,inner:C.gold,bend:.05,depth:.07}),
  paint(leaf(.25,.07,.02,.018,5),C.jade).translate(0,.055,.06),
  paint(new THREE.OctahedronGeometry(.085,0),C.gold).translate(0,-.2,0)
 ]);
 // 2묶음. 각각 한 메시와 기존 재질을 사용하며 카드의 주 실루엣만 남긴다.
 geos.sunMirror=join('sun-mirror-core',[
  paint(new THREE.TorusGeometry(.28,.039,4,12),C.gold),
  paint(new THREE.CylinderGeometry(.195,.195,.052,12,1),C.ivory).rotateX(Math.PI/2),
  paint(new THREE.OctahedronGeometry(.145,0),C.gold).translate(0,0,.055),
  paint(leaf(.24,.08,.01,.025,4),C.jade).rotateZ(Math.PI/2).translate(-.27,0,.04),
  paint(leaf(.24,.08,.01,.025,4),C.jade).rotateZ(-Math.PI/2).translate(.27,0,.04)
 ]);
 geos.showerPetal=join('piercing-shower-petal',[
  petal(.49,.24,{edge:C.ivory,inner:C.gold,bend:.08,depth:.075}),
  paint(leaf(.26,.09,.04,.022,5),C.blue).rotateZ(.18).translate(-.07,-.17,.045),
  paint(new THREE.OctahedronGeometry(.055,0),C.ice).translate(0,.21,.04)
 ]);
 geos.ebbBlade=join('ebbing-wave-blade',[
  paint(crescent(.82,4),C.blue).rotateZ(-.2),
  paint(leaf(.54,.14,.14,.045,4),C.ice).rotateZ(-.78).translate(-.08,.025,.065),
  paint(new THREE.OctahedronGeometry(.13,0).scale(.8,1.2,.7),C.gold).translate(-.18,-.22,.1),
  paint(leaf(.31,.08,.06,.02,4),C.ivory).rotateZ(-1).translate(.19,.16,.1)
 ]);
 geos.pullSeed=join('gravity-split-pull-seed',[
  paint(new THREE.IcosahedronGeometry(.19,0).scale(.82,1.25,.82),C.violet),
  paint(new THREE.TorusGeometry(.22,.032,4,10),C.gold).rotateX(Math.PI/2),
  paint(leaf(.28,.11,.04,.03,4),C.ivory).rotateZ(.6).translate(.13,-.16,.025),
  paint(leaf(.28,.11,.04,.03,4),C.ivory).rotateZ(-.6).translate(-.13,-.16,.025),
  paint(new THREE.ConeGeometry(.042,.3,4),C.jade).rotateZ(Math.PI).translate(0,-.29,.01)
 ]);
 // 3묶음: 여섯 공격은 빌려 쓰던 잎·소용돌이 대신 한 메시짜리 고유 실루엣을 쓴다.
 geos.spearRing=join('spear-ring-needle',[
  paint(new THREE.ConeGeometry(.075,.78,4),C.ivory).rotateX(Math.PI/2).translate(0,0,.15),
  paint(new THREE.ConeGeometry(.11,.3,4),C.gold).rotateX(-Math.PI/2).translate(0,0,-.31),
  paint(leaf(.39,.105,.015,.024,4),C.jade).rotateZ(-.6).translate(-.11,0,-.13),
  paint(leaf(.39,.105,-.015,.024,4),C.jade).rotateZ(.6).translate(.11,0,-.13)
 ]);
 geos.accretionDisk=join('accretion-disk',[
  paint(new THREE.TorusGeometry(.31,.058,4,14),C.violet).rotateX(Math.PI/2),
  paint(new THREE.TorusGeometry(.2,.026,3,12),C.gold).rotateX(Math.PI/2).translate(0,.025,0),
  paint(new THREE.OctahedronGeometry(.14,0).scale(1,.55,1),C.deep),
  paint(new THREE.OctahedronGeometry(.055,0),C.ice).translate(.28,.055,.09)
 ]);
 geos.rimeback=join('returning-rime-leaf',[
  paint(crescent(.82,4),C.blue).rotateZ(-.12),
  paint(leaf(.53,.19,.1,.055,5),C.ice).rotateZ(-.75).translate(-.16,.035,.065),
  paint(leaf(.31,.065,.025,.026,4),C.ivory).rotateZ(-.65).translate(-.09,.05,.11),
  paint(new THREE.OctahedronGeometry(.085,0),C.jade).translate(.16,-.21,.07)
 ]);
 geos.coldwell=join('cold-well-core',[
  paint(new THREE.TorusGeometry(.28,.053,4,12),C.blue).rotateX(Math.PI/2),
  paint(new THREE.TorusGeometry(.17,.03,3,10),C.ivory).rotateX(Math.PI/2).translate(0,.03,0),
  paint(new THREE.OctahedronGeometry(.13,0).scale(.8,1.6,.8),C.ice),
  paint(new THREE.OctahedronGeometry(.065,0),C.violet).translate(.28,.06,0)
 ]);
 geos.rimeBud=join('rime-petal-bud',[
  paint(new THREE.OctahedronGeometry(.16,0).scale(.9,1.25,.9),C.blue),
  ...Array.from({length:4},(_,i)=>paint(leaf(.4,.16,.035,.04,4),i%2?C.ivory:C.ice).translate(0,.14,.09).rotateZ(i*Math.PI/2)),
  paint(new THREE.OctahedronGeometry(.06,0),C.gold).translate(0,0,.11)
 ]);
 geos.rimeShard=join('rime-petal-shard',[
  paint(leaf(.52,.25,.045,.065,5),C.ice),
  paint(leaf(.37,.11,.02,.035,4),C.ivory).translate(0,.015,.07),
  paint(new THREE.ConeGeometry(.04,.22,4),C.blue).rotateZ(Math.PI).translate(0,-.28,0)
 ]);
 geos.echoOrb=join('echo-lane-orb',[
  paint(new THREE.OctahedronGeometry(.19,0),C.violet),
  paint(new THREE.TorusGeometry(.28,.032,4,12),C.ice),
  paint(new THREE.TorusGeometry(.36,.018,3,12),C.gold).rotateY(.35),
  paint(new THREE.OctahedronGeometry(.065,0),C.ivory).translate(0,0,.19)
 ]);
 return {mats,geos};
}
