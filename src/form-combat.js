import * as THREE from 'three';
const V=THREE.Vector3;
export const FORM_COMBAT={collapse:{interval:1.05,damage:86,radius:3.1},frostguard:{interval:Infinity,damage:24,radius:2.5},returnblade:{interval:.9,damage:34,radius:.65}};
export function segmentDistance(a,b,p){const d=b.clone().sub(a).setY(0),length=d.lengthSq();const t=length?THREE.MathUtils.clamp(p.clone().sub(a).setY(0).dot(d)/length,0,1):0;return a.clone().addScaledVector(d,t).setY(0).distanceTo(p.clone().setY(0));}
// One selected weapon owns its shape and cadence. Laws add bounded support on hit.
export function createFormCombat(scene,{player,enemies,hit,blocked,boundary,constrain,vfx}){
 const group=new THREE.Group();scene.add(group);
 const iceMat=new THREE.MeshStandardMaterial({color:0xbbeeff,emissive:0x6fbdde,emissiveIntensity:.4,roughness:.28});
 const coreMat=new THREE.MeshStandardMaterial({color:0xd799ec,emissive:0xa04fd2,emissiveIntensity:.8,roughness:.36});
 const bladeMat=new THREE.MeshStandardMaterial({color:0xb5f2d4,emissive:0x58bb97,emissiveIntensity:.5,roughness:.3,metalness:.25,side:THREE.DoubleSide});
 const orbit=new THREE.Group();group.add(orbit);orbit.visible=false;
 for(let i=0;i<3;i++){const ob=new THREE.Mesh(new THREE.OctahedronGeometry(.24),iceMat);ob.scale.set(.55,1.7,1);orbit.add(ob);}
 let active=null,angle=0,bolts=[],wells=[],cooldowns=new Map(),hits=0;
 function remove(ob){ob.removeFromParent();ob.geometry.dispose();}
 function clear(){for(const b of bolts)remove(b.ob);bolts=[];wells=[];cooldowns.clear();hits=0;active=null;angle=0;orbit.visible=false;}
 function set(id){if(active!==id){clear();active=id;}orbit.visible=id==='frostguard';}
 function support(e,damage,metadata){if(e.dead)return false;if(hit(e,damage,metadata)===false)return false;hits++;return true;}
 function fire(pos,dir){
  if(!active||active==='frostguard')return Infinity;
  if(bolts.length>=5)return FORM_COMBAT[active].interval;
  const blade=active==='returnblade';
  const geo=blade?new THREE.TorusGeometry(.46,.085,5,18,Math.PI*1.55):new THREE.IcosahedronGeometry(.28,1);
  const ob=new THREE.Mesh(geo,blade?bladeMat:coreMat);ob.position.copy(pos);ob.position.y=.7;group.add(ob);if(blade)ob.rotation.x=-Math.PI/2;
  bolts.push({ob,dir:dir.clone(),age:0,returning:false,hitSet:new Set(),life:3,kind:active});
  vfx.muzzle(pos,dir,blade?'recall':'gravity');return FORM_COMBAT[active].interval;
 }
 function plant(pos){if(wells.length>=3)wells.shift();wells.push({pos:pos.clone(),life:.8,pulse:0});vfx.pulse(pos,'gravity',3.1,.8);}
 function update(dt){
  for(const [e,t] of cooldowns){if(e.dead||t<=dt)cooldowns.delete(e);else cooldowns.set(e,t-dt);}
  if(active==='frostguard'){
   angle+=dt*3.4;orbit.visible=true;
   orbit.children.forEach((ob,i)=>{const a=angle+i*Math.PI*2/3;ob.position.set(player.position.x+Math.cos(a)*2.5,.72,player.position.z+Math.sin(a)*2.5);ob.rotation.y=a;ob.rotation.z=a*.4;
    for(const e of enemies())if(!e.dead&&!cooldowns.has(e)&&Math.hypot(ob.position.x-e.g.position.x,ob.position.z-e.g.position.z)<(e.type==='warden'?1.35:.85)){
     cooldowns.set(e,.6);const direction=e.g.position.clone().sub(player.position).setY(0).normalize();
     if(support(e,24,{kind:'frostguard',direction})){
      e.slow=Math.max(e.slow||0,1.5);
      if(e.type!=='warden'&&!e.dead){e.g.position.addScaledVector(direction,.45);constrain(e.g.position,.65);}
      vfx.pulse(e.g.position,'frost',.5,.25);
     }
    }
   });
  }
  for(const b of bolts){
   b.age+=dt;b.life-=dt;const previous=b.ob.position.clone();
   if(b.kind==='returnblade'&&b.age>.65&&!b.returning){b.returning=true;b.hitSet.clear();vfx.pulse(b.ob.position,'recall',.4,.2);}
   if(b.returning){b.dir.copy(player.position).sub(b.ob.position).setY(0).normalize();if(Math.hypot(b.ob.position.x-player.position.x,b.ob.position.z-player.position.z)<.5)b.life=0;}
   if(b.life<=0)continue;
   const direction=b.dir.clone().setY(0).normalize();
   b.ob.position.addScaledVector(b.dir,dt*(b.kind==='collapse'?7.2:b.returning?12:10));b.ob.rotation.y+=dt*9;
   const wall=boundary(previous,b.ob.position,b.dir)||blocked(previous,b.ob.position);
   if(b.kind==='collapse'){
    const contact=enemies().some(e=>!e.dead&&segmentDistance(previous,b.ob.position,e.g.position)<(e.type==='warden'?1.1:.7));
    if(wall||contact||b.age>=.65){if(wall)b.ob.position.copy(previous);plant(b.ob.position);b.life=0;}
   }else{
    if(wall){b.ob.position.copy(previous);if(!b.returning){b.returning=true;b.hitSet.clear();}else b.life=0;}
    // Resolve in travel order so an intercepting shield cannot be processed
    // after an enemy behind it merely because of spawn-array order.
    if(b.life>0){
     const targets=enemies().filter(e=>!e.dead&&!b.hitSet.has(e)&&segmentDistance(previous,b.ob.position,e.g.position)<(e.type==='warden'?1.25:.72));
     targets.sort((a,b)=>a.g.position.clone().sub(previous).dot(direction)-b.g.position.clone().sub(previous).dot(direction));
     for(const e of targets){
      if(e.dead)continue;
      if(b.hitSet.size>=5)break;
      b.hitSet.add(e);
      if(!support(e,34,{kind:'returnblade',direction:direction.clone()})){b.life=0;break;}
     }
    }
   }
   vfx.trail(previous,b.ob.position,b.kind==='collapse'?'gravity':'recall',false);
  }
  for(let i=bolts.length-1;i>=0;i--)if(bolts[i].life<=0){remove(bolts[i].ob);bolts.splice(i,1);}
  for(let i=wells.length-1;i>=0;i--){const w=wells[i];w.life-=dt;w.pulse-=dt;
   if(w.pulse<=0){vfx.pulse(w.pos,'gravity',Math.max(.3,w.life*3),.2);w.pulse=.16;}
   for(const e of enemies())if(!e.dead&&e.type!=='warden'){const d=w.pos.clone().sub(e.g.position).setY(0);if(d.length()<3.1){e.g.position.addScaledVector(d,dt*2);constrain(e.g.position,.65);}}
   if(w.life<=0){vfx.burst(w.pos,'burst',32,1.8);vfx.pulse(w.pos,'burst',3.1,.4);for(const e of enemies())if(!e.dead&&Math.hypot(e.g.position.x-w.pos.x,e.g.position.z-w.pos.z)<3.1)support(e,86,{kind:'collapse',direction:e.g.position.clone().sub(w.pos).setY(0).normalize()});wells.splice(i,1);}
  }
 }
 return {set,fire,update,clear,state:()=>({active,bolts:bolts.length,wells:wells.length,hits}),dispose(){clear();orbit.children.forEach(o=>o.geometry.dispose());iceMat.dispose();coreMat.dispose();bladeMat.dispose();group.removeFromParent();}};
}
