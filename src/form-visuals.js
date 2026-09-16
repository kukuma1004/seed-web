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
 const height=g.boundingBox.max.y-g.boundingBox.min.y||1;
 for(let i=0;i<p.count;i++){
  const shade=.79+.14*(p.getY(i)-g.boundingBox.min.y)/height+.07*Math.max(0,n.getZ(i));
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
function crescent(scale=1){
 const s=new THREE.Shape();
 s.moveTo(-.47,-.28);s.bezierCurveTo(-.05,-.19,.33,-.07,.41,.52);
 s.bezierCurveTo(.7,.11,.47,-.38,.12,-.47);
 s.bezierCurveTo(-.16,-.53,-.32,-.4,-.47,-.28);
 const g=new THREE.ExtrudeGeometry(s,{depth:.065,bevelEnabled:true,bevelThickness:.014,bevelSize:.015,bevelSegments:1,steps:1,curveSegments:7});
 return g.translate(0,0,-.0325).scale(scale,scale,scale);
}

export function createFormVisuals(){
 const mat=(emissive,roughness=.49,metalness=.1,intensity=.08)=>new THREE.MeshStandardMaterial({color:0xffffff,vertexColors:true,emissive,emissiveIntensity:intensity,roughness,metalness,side:THREE.DoubleSide});
 const mats={ice:mat(0x6aaab9,.42,.08,.3),core:mat(0x645187),blade:mat(0x398c73),prism:mat(0x52999c,.32,.22),bloom:mat(0x74b8c1),storm:mat(0xc4a250,.4,.12,.3),star:mat(0xd8a62f,.3,.16,.48),tide:mat(0x71628e),seed:mat(0x73a47a),mirror:mat(0x6babad,.29,.38,.22),gene:mat(0x8172c8,.3,.2,.38)};
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
  paint(leaf(.33,.13,.06,.025,5),C.jade).rotateZ(-.65).translate(.07,.095,0)
 ]);
 geos.mirror=join('leaf-mirror',[
  paint(leaf(.8,.57,0,.085,5),C.gold),
  paint(leaf(.69,.46,0,.075,5),C.ivory).translate(0,0,.045),
  paint(leaf(.55,.3,0,.065,5),C.blue).translate(0,0,.085),
  paint(leaf(.43,.065,0,.015,5),C.ice).rotateZ(-.26).translate(-.055,0,.14)
 ]);
 geos.mirrorBolt=petal(.42,.22,{edge:C.ivory,inner:C.jade,bend:.02,depth:.065});
 geos.mirrorBolt.name='seed-form-mirror-splinter';
 geos.gene=join('paired-law-gene',[paint(new THREE.OctahedronGeometry(.19,0).scale(.72,.72,1.45),C.violet),paint(new THREE.TorusGeometry(.22,.035,5,12),C.gold).rotateX(Math.PI/2),paint(leaf(.38,.13,.05,.03,5),C.ivory).rotateZ(-.72).translate(.08,.12,.03)]);
 const star=[paint(new THREE.OctahedronGeometry(.145,0),C.gold)];
 for(let i=0;i<4;i++)star.push(petal(.5,.25,{edge:C.ivory,inner:i%2?C.gold:C.jade,bend:.025,depth:.075}).translate(0,.2,0).rotateZ(i*Math.PI/2));
 geos.starPetal=join('four-point-star-bloom',star);
 return {mats,geos};
}
