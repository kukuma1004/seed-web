import * as THREE from 'three';

// Visual-only rig: collisions, aiming and ground telegraphs stay on the root.
export function createMotion(root, legs=[], arms=[]){
  const body=new THREE.Group();
  for(const child of [...root.children])body.add(child);
  root.add(body);
  let phase=0,pace=0;
  const settle=(current,target,dt)=>THREE.MathUtils.lerp(current,target,1-Math.exp(-18*dt));
  return {
    body,
    reset(){phase=0;pace=0;body.position.set(0,0,0);body.rotation.set(0,0,0);body.scale.set(1,1,1);for(const limb of [...legs,...arms])limb.rotation.set(0,0,0);},
    update(dt,dx,dz,{type='seed',state='stalk',timer=0,dashing=false,hit=0}={}){
      const distance=Math.hypot(dx,dz),speed=distance/Math.max(dt,.001);
      phase+=distance*(type==='hound'?7:9);
      pace=settle(pace,Math.min(1,speed/(type==='seed'?4.5:1.2)),dt);
      const yaw=root.rotation.y;
      const forward=(Math.sin(yaw)*dx+Math.cos(yaw)*dz)/Math.max(distance,.001);
      const side=(Math.cos(yaw)*dx-Math.sin(yaw)*dz)/Math.max(distance,.001);
      const tell=state==='tell',commit=state==='commit',recover=state==='recover';
      const load=tell?THREE.MathUtils.clamp(1-timer/(type==='hound'?.7:.85),0,1):0;
      let pitch=forward*pace*(dashing?.32:.10),roll=-side*pace*(dashing?.32:.12),height=0;
      if(type==='hound'){
        pitch=tell?-.20*load:commit?.16:recover?-.08:forward*pace*.045;
        height=tell?-.17*load:commit?.07*Math.abs(Math.sin(phase)):recover?-.06:0;
      }else if(type==='caster'){
        pitch=tell?-.12*load:commit?.22:recover?.09:pitch;
      }
      body.rotation.x=settle(body.rotation.x,pitch-hit*.7,dt);
      body.rotation.z=settle(body.rotation.z,roll,dt);
      body.position.y=settle(body.position.y,height+Math.abs(Math.sin(phase))*.025*pace,dt);
      body.scale.y=settle(body.scale.y,dashing?.84:tell&&type==='hound'?1-load*.12:1,dt);
      legs.forEach((leg,i)=>{
        // Hound's diagonal pairs alternate; bipeds use left/right steps.
        const offset=type==='hound'?[0,Math.PI,Math.PI,0][i]:i*Math.PI;
        const step=Math.sin(phase+offset)*pace*(dashing?.18:type==='hound'?.48:.55);
        leg.rotation.x=settle(leg.rotation.x,tell?-load*.22:recover?0:step*(type==='hound'?1:forward),dt);
        leg.rotation.z=settle(leg.rotation.z,type==='hound'?0:-step*side*.65,dt);
      });
      arms.forEach((arm,i)=>{
        const raise=tell?-1.35*load:commit?-1.5:recover?-.2:Math.sin(phase+i*Math.PI)*pace*.15;
        arm.rotation.x=settle(arm.rotation.x,raise,dt);
      });
      root.userData.motion={phase,pace,pitch:body.rotation.x,roll:body.rotation.z,arm:arms[0]?.rotation.x??0};
    }
  };
}
