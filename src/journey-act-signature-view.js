import * as THREE from 'three';
import {JOURNEY_SIGNATURE_RULES as R,journeySignatureHint} from './journey-act-signatures.js';
// Two bounded storm plates, three slim markers, one status node. No lights,
// textures, RAF, particles, or per-frame geometry/material construction.
export function createJourneySignatureView(scene){
 const root=new THREE.Group();root.name='journey-act-signature';root.visible=false;scene.add(root);
 const geo=new THREE.PlaneGeometry(1,1),danger=new THREE.MeshBasicMaterial({color:0xe9905b,transparent:true,opacity:.12,depthWrite:false,toneMapped:false}),safe=new THREE.MeshBasicMaterial({color:0xb7ecd1,transparent:true,opacity:.6,depthWrite:false,toneMapped:false});
 const plane=(mat)=>{const m=new THREE.Mesh(geo,mat);m.rotation.x=-Math.PI/2;m.position.y=.09;m.frustumCulled=false;root.add(m);return m;};
 const left=plane(danger),right=plane(danger),edgeA=plane(safe),edgeB=plane(safe);
 const ringGeo=new THREE.RingGeometry(R.rallyRadius-.07,R.rallyRadius,40),ring=new THREE.Mesh(ringGeo,safe);ring.rotation.x=-Math.PI/2;ring.position.y=.1;root.add(ring);
 const hud=document.createElement('div');hud.id='journey-signature';hud.setAttribute('role','status');hud.hidden=true;document.body.append(hud);let text='',disposed=false;
 function update(s,player,{siege=null,visible=false,hideHint=false,reducedMotion=false}={}){
  if(disposed)return;root.visible=visible&&!!s&&(s.act!=='crystalGorge'||!!siege);hud.hidden=!root.visible||hideHint||s?.act==='crystalGorge'&&siege?.phase==='prep';left.visible=right.visible=edgeA.visible=edgeB.visible=ring.visible=false;if(!root.visible)return;safe.opacity=.6;safe.color.setHex(0xb7ecd1);
  const hint=journeySignatureHint(s,siege);if(hint!==text){hud.textContent=hint;text=hint;}
  if(s.act==='skyway'&&s.phase!=='quiet'){
   const low=s.lane-R.stormHalfGap,high=s.lane+R.stormHalfGap;
   const warning=s.phase==='warning',progress=warning?(reducedMotion?1:THREE.MathUtils.clamp(((s.time-R.stormDelay)%R.stormPeriod)/R.stormWarning,0,1)):1;
   left.visible=right.visible=edgeA.visible=edgeB.visible=true;danger.opacity=warning?.025+progress*.065:.16;
   safe.color.setHex(warning?0xeec99a:0xb7ecd1);safe.opacity=warning?.35+progress*.35:.72;
   left.position.set((-9.3+low)/2,.09,-.4);left.scale.set(low+9.3,16,1);
   right.position.set((high+9.3)/2,.09,-.4);right.scale.set(9.3-high,16,1);
   edgeA.position.set(low,.11,-.4);edgeB.position.set(high,.11,-.4);edgeA.scale.set(warning?.08+progress*.05:.14,16,1);edgeB.scale.copy(edgeA.scale);
  }else if(s.act==='crosswind'&&s.tailwind>0){
   edgeA.visible=edgeB.visible=true;edgeA.position.set(player.x+1.3,.12,player.z);edgeB.position.set(player.x+2,.12,player.z);edgeA.scale.set(.16,1,1);edgeB.scale.set(.16,1,1);
  }else if(s.act==='crystalGorge'&&s.rallyPad){const p=siege?.pads.find(p=>p.id===s.rallyPad);if(p){ring.visible=true;ring.position.set(p.x,.11,p.z);safe.opacity=s.repairPad?.8:.6;}}
 }
 return {update,hide(){root.visible=false;hud.hidden=true;},dispose(){if(disposed)return;disposed=true;root.removeFromParent();geo.dispose();ringGeo.dispose();danger.dispose();safe.dispose();hud.remove();}};
}
