import * as THREE from 'three';

// Two open wreath arcs and one six-leaf batch. No texture, lights, postprocess,
// RAF or per-frame geometry/material creation. Base transfers reuse these same
// three meshes as a destination ring + six grounded leaf arrows.
export function createJourneyPresentationView(scene,{document:doc=globalThis.document}={}){
 const root=new THREE.Group();root.name='journey-celebration';root.visible=false;scene.add(root);
 const ringGeo=new THREE.RingGeometry(.88,.94,32,1,.16,Math.PI-.32);
 const ringMat=new THREE.MeshBasicMaterial({color:0xc7efd2,transparent:true,opacity:0,depthWrite:false,toneMapped:false,side:THREE.DoubleSide,forceSinglePass:true});
 const arcs=[new THREE.Mesh(ringGeo,ringMat),new THREE.Mesh(ringGeo,ringMat)];
 for(let i=0;i<2;i++){arcs[i].rotation.x=-Math.PI/2;arcs[i].rotation.z=i*Math.PI;arcs[i].position.y=.09;root.add(arcs[i]);}
 const leafGeo=new THREE.BufferGeometry();
 leafGeo.setAttribute('position',new THREE.Float32BufferAttribute([0,0,0,.14,.12,0,.19,.34,0,0,.64,0,-.19,.34,0,-.14,.12,0,0,.29,.035],3));
 leafGeo.setAttribute('color',new THREE.Float32BufferAttribute([.55,.72,.6,.78,.91,.74,1,1,.87,.96,1,.91,.62,.81,.67,.5,.7,.57,.93,1,.84],3));
 leafGeo.setIndex([6,0,1,6,1,2,6,2,3,6,3,4,6,4,5,6,5,0]);
 const leafMat=new THREE.MeshBasicMaterial({vertexColors:true,color:0xc7efd2,transparent:true,opacity:0,depthWrite:false,toneMapped:false,side:THREE.DoubleSide,forceSinglePass:true});
 const leaves=new THREE.InstancedMesh(leafGeo,leafMat,6);leaves.frustumCulled=false;root.add(leaves);
 const pose=new THREE.Object3D();let disposed=false,serial=-1,hudClock=0,opacity=-1,bannerShown=false;
 const banner=doc.createElement('aside');banner.id='journey-cue';banner.hidden=true;banner.setAttribute('role','status');banner.setAttribute('aria-live','polite');banner.setAttribute('aria-atomic','true');
 const kicker=doc.createElement('small'),title=doc.createElement('strong'),detail=doc.createElement('span');banner.append(kicker,title,detail);doc.body.append(banner);
 function hide(){root.visible=false;if(bannerShown){banner.hidden=true;bannerShown=false;}}
 function update(s,player,visible,reduced=false,low=false,dt=0){
  if(disposed)return;if(!visible||!s.active&&!s.travel?.active){hide();return;}
  if(serial!==s.serial){serial=s.serial;banner.dataset.kind=s.kind;kicker.textContent=s.kicker;title.textContent=s.title;detail.textContent=s.detail;hudClock=.05;opacity=-1;
   // The legacy fusion toast repeats this same name across the play field.
   // Remove only that exact duplicate; never hide a later danger message.
   const toast=doc.getElementById?.('toast');if(s.kind==='growth'&&toast?.textContent.startsWith(s.title+' Lv.'))toast.textContent='';
   if(s.kind==='night'&&toast?.textContent==='습격 시작 · 정원의 심장을 지키세요')toast.textContent='';
   if(s.kind==='tailwind'&&toast?.textContent==='전진하면 다음 편대가 옵니다 · 앞 편대를 끊으면 순풍 · 빛나는 모래원은 옆으로 피하세요 · 반사판을 활용하세요')toast.textContent='';
  }
  const fade=Math.min(1,s.age/.12,(s.duration-s.age)/.28),showBanner=s.active&&s.kind!=='law';
  if(bannerShown!==showBanner){bannerShown=showBanner;banner.hidden=!showBanner;}
  // Event-driven text, with at most 20Hz opacity changes while a cue is alive.
  hudClock+=Math.min(.1,Math.max(0,dt));if(hudClock>=.05){hudClock=0;const alpha=Math.round(Math.max(0,fade)*100)/100;if(alpha!==opacity){opacity=alpha;banner.style.opacity=String(alpha);}}
  const world=s.active&&(s.kind==='law'||s.kind==='growth'||s.kind==='defeat'||s.kind==='repair'),travel=s.travel;root.visible=world||Boolean(travel?.active);if(!root.visible)return;
  if(!world){
   const flight=travel.stage==='flight',progress=travel.age/travel.duration,alpha=flight?1:Math.max(0,1-progress);
   root.position.set(0,0,0);root.rotation.y=0;root.scale.setScalar(1);ringMat.color.setHex(0xe9dfa4);leafMat.color.setHex(0xd3ebba);
   ringMat.opacity=alpha*.62;leafMat.opacity=alpha*.68;
   const radius=flight?.63:reduced?.7:.63+progress*.32;
   for(const arc of arcs){arc.position.set(travel.targetX,.145,travel.targetZ);arc.scale.setScalar(radius);}
   // The destination remains on low quality; the optional six arrows add one
   // instanced draw, no new resources. Reduced motion keeps the route static.
   leaves.visible=flight&&!low;
   if(leaves.visible){
    const dx=travel.targetX-travel.x,dz=travel.targetZ-travel.z,heading=Math.atan2(-dx,-dz);
    for(let i=0;i<6;i++){const t=(i+.6)/6.7;pose.position.set(travel.x+dx*t,.15,travel.z+dz*t);pose.rotation.set(-Math.PI/2,0,heading);pose.scale.setScalar(reduced?.56:.5+.1*Math.sin(travel.age*13-i*.7));pose.updateMatrix();leaves.setMatrixAt(i,pose.matrix);}
    leaves.instanceMatrix.needsUpdate=true;
   }
   return;
  }
  ringMat.color.setHex(s.color);leafMat.color.setHex(s.color);for(const arc of arcs){arc.position.set(0,.09,0);arc.scale.setScalar(1);}
  const grow=s.kind==='law'||s.kind==='growth',age=s.age,progress=age/s.duration;
  root.position.set(grow?player.x:s.x,0,grow?player.z:s.z);root.rotation.y=reduced?0:age*.65;
  const scale=reduced?1:1+Math.sin(Math.PI*progress)*.32;root.scale.setScalar(scale);ringMat.opacity=Math.max(0,fade)*.48;
  leaves.visible=!low;leafMat.opacity=Math.max(0,fade)*.72;
  if(!low){for(let i=0;i<6;i++){const a=i*Math.PI/3,r=.72+(reduced?0:progress*.3);pose.position.set(Math.cos(a)*r,.12+(reduced?0:Math.sin(Math.PI*progress)*.46),Math.sin(a)*r);pose.rotation.set(reduced?-.18:-.18-progress*.4,-a+Math.PI/2,0);pose.scale.setScalar(.6);pose.updateMatrix();leaves.setMatrixAt(i,pose.matrix);}leaves.instanceMatrix.needsUpdate=true;}
 }
 function decorateClear(panel){const heading=panel?.querySelector('h2');heading?.classList.add('journey-clear-heading');panel?.querySelector('.final-score')?.classList.add('journey-clear-score');}
 return {update,hide,decorateClear,
  metrics:()=>({meshes:3,geometries:2,materials:2,leaves:6,textures:0,lights:0,raf:0,bannerNodes:4,disposed}),
  dispose(){if(disposed)return;disposed=true;hide();root.removeFromParent();leaves.dispose();ringGeo.dispose();leafGeo.dispose();ringMat.dispose();leafMat.dispose();banner.remove();}
 };
}
