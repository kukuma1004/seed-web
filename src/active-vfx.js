import * as THREE from 'three';
import {ALL_FORMS} from './forms.js';
import {LAWS} from './laws.js';

// Ultimate stage around the seed. A hand-painted botanical sigil replaces the
// generic floor disc; halo, beam and motes remain code-driven. Still five draw
// calls, no dynamic lights, and Node tests use the procedural fallback texture.

// A tiny grayscale gradient texture. Additive blending turns black into "no light", so the
// gradient doubles as transparency without alpha sorting.
function gradientTexture(size,value){
 const data=new Uint8Array(size*size*4);
 for(let y=0;y<size;y++)for(let x=0;x<size;x++){
  const v=Math.max(0,Math.min(1,value((x+.5)/size,(y+.5)/size))),o=(y*size+x)*4,c=Math.round(v*255);
  data[o]=data[o+1]=data[o+2]=c;data[o+3]=255;
 }
 const texture=new THREE.DataTexture(data,size,size,THREE.RGBAFormat);
 texture.magFilter=texture.minFilter=THREE.LinearFilter;texture.needsUpdate=true;return texture;
}
// Floor glow: bright core fading smoothly to nothing at the rim.
export const glowFalloff=(u,v)=>{const d=Math.hypot(u-.5,v-.5)*2;return Math.pow(Math.max(0,1-d),2.2);};
// Halo: a thin bright band near the rim (for a RingGeometry mapped radially), broken into soft dashes.
export const haloBand=(u,v)=>{const band=Math.exp(-Math.pow((v-.5)/.22,2));const dash=.55+.45*Math.cos(u*Math.PI*2*9);return band*dash;};
// Beam: strongest at the bottom, gone at the top; soft at the seams of the cylinder.
export const beamFalloff=(u,v)=>Math.pow(1-v,1.6)*(.35+.65*Math.sin(Math.PI*u));

export function activeColors(forms=[]){
 const colors=[];
 for(const id of forms)for(const law of ALL_FORMS[id]?.requires||[]){const color=LAWS[law]?.color;if(color!=null&&!colors.includes(color))colors.push(color);}
 return colors.length?colors:[0x76ffd0];
}

export function createActiveVFX(scene,{mobile=false}={}){
 const group=new THREE.Group();group.name='active-vfx';group.visible=false;scene.add(group);
 const textures=[];
 const additive=(map=null)=>{const material=new THREE.MeshBasicMaterial({color:0xffffff,map,transparent:true,opacity:0,depthWrite:false,blending:THREE.AdditiveBlending,toneMapped:false,side:THREE.DoubleSide,forceSinglePass:true});return material;};
 const glowTex=gradientTexture(64,glowFalloff),haloTex=gradientTexture(64,haloBand),beamTex=gradientTexture(32,beamFalloff);
 const sigilTex=typeof document==='undefined'?glowTex:new THREE.TextureLoader().load(import.meta.env.BASE_URL+'assets/ultimate-seed-sigil-v1.webp');
 if(sigilTex!==glowTex){sigilTex.colorSpace=THREE.SRGBColorSpace;sigilTex.minFilter=sigilTex.magFilter=THREE.LinearFilter;}
 textures.push(glowTex,haloTex,beamTex,...(sigilTex===glowTex?[]:[sigilTex]));

 const floor=new THREE.Mesh(new THREE.PlaneGeometry(2,2).rotateX(-Math.PI/2),additive(sigilTex));floor.position.y=.11;floor.name='active-botanical-sigil';group.add(floor);
 // RingGeometry UVs are planar; remap them to (angle, radius) so the band texture wraps around.
 const haloGeo=new THREE.RingGeometry(.86,1.14,96,1);
 {const pos=haloGeo.attributes.position,uv=haloGeo.attributes.uv;for(let i=0;i<pos.count;i++){const x=pos.getX(i),y=pos.getY(i);uv.setXY(i,(Math.atan2(y,x)/(Math.PI*2)+1)%1,(Math.hypot(x,y)-.86)/.28);}haloGeo.rotateX(-Math.PI/2);}
 const halo=new THREE.Mesh(haloGeo,additive(haloTex));halo.position.y=.14;halo.name='active-halo';group.add(halo);
 // A second, wider halo only shows during the finale shockwave (and faintly during overdrive).
 const wave=new THREE.Mesh(haloGeo,additive(haloTex));wave.position.y=.13;wave.name='active-wave';group.add(wave);
 const beam=new THREE.Mesh(new THREE.CylinderGeometry(.34,.62,4.6,24,1,true).translate(0,2.3,0),additive(beamTex));beam.name='active-beam';group.add(beam);

 const moteGeo=new THREE.OctahedronGeometry(.09,0);moteGeo.scale(.55,1.9,.55);
 const moteMat=additive();moteMat.vertexColors=false;
 const moteCount=mobile?10:16,motes=new THREE.InstancedMesh(moteGeo,moteMat,moteCount);motes.instanceMatrix.setUsage(THREE.DynamicDrawUsage);motes.frustumCulled=false;motes.name='active-motes';group.add(motes);
 const dummy=new THREE.Object3D(),color=new THREE.Color();
 let effect=null,serial=0;
 const tint=(material,hex,strength)=>{material.color.setHex(hex).multiplyScalar(strength);};

 function begin(mode,plan,pos,time){
  serial++;effect={mode,state:plan.state,forms:[...plan.forms],time,total:time,age:0,colors:activeColors(plan.forms),serial};
  group.position.set(pos.x,0,pos.z);group.visible=true;return effect;
 }
 const start=(plan,pos)=>begin('running',plan,pos,plan.seconds);
 const finish=(plan,pos)=>begin('finale',plan,pos,.9);

 function update(dt,pos){
  if(!effect){group.visible=false;return;}
  effect.age+=dt;effect.time-=dt;group.position.set(pos.x,0,pos.z);
  const running=effect.mode==='running',over=effect.state==='OVERDRIVE';
  const intro=Math.min(1,effect.age/.3),life=Math.max(0,effect.time/effect.total);
  // Running: a quick swell, a gentle breathing hold, and a soft fade over the last half second.
  const tail=running?Math.min(1,effect.time/.5):1;
  const breathe=1+Math.sin(effect.age*5.5)*.08;
  const primary=effect.colors[0],secondary=effect.colors[1]??primary;
  const k=over?1:.78;

  if(running){
   floor.material.opacity=1;tint(floor.material,primary,.38*k*intro*tail*breathe);floor.scale.setScalar((over?2.5:2.1)*(.6+.4*intro));floor.rotation.y=-effect.age*.32;
   halo.material.opacity=1;tint(halo.material,primary,1.6*k*intro*tail);halo.scale.setScalar((over?1.75:1.5)*(.7+.3*intro)*breathe);halo.rotation.y=effect.age*1.4;
   wave.material.opacity=over?1:0;tint(wave.material,secondary,.7*intro*tail);wave.scale.setScalar(2.35+Math.sin(effect.age*2.2)*.12);wave.rotation.y=-effect.age*.9;
   beam.material.opacity=1;tint(beam.material,over?secondary:primary,(over?.9:.7)*intro*tail);beam.scale.set(breathe,.55+.45*intro,breathe);
  }else{
   const out=1-life,fade=Math.sin(Math.PI*Math.min(1,life*1.15));
   floor.material.opacity=1;tint(floor.material,primary,.58*fade);floor.scale.setScalar(2.5+3.5*out);floor.rotation.y-=dt*1.4;
   halo.material.opacity=1;tint(halo.material,primary,2*fade);halo.scale.setScalar(1.8+4.8*out);halo.rotation.y+=dt*3;
   wave.material.opacity=1;tint(wave.material,secondary,1.4*fade);wave.scale.setScalar(1.4+7*out*out);
   beam.material.opacity=1;tint(beam.material,secondary,1.3*fade);beam.scale.set(1+1.2*out,1-.6*out,1+1.2*out);
  }

  // Motes: running, they spiral up and inward into the seed and respawn at the bottom;
  // in the finale they scatter outward and fade.
  motes.count=moteCount;
  for(let i=0;i<moteCount;i++){
   const phase=i/moteCount;
   let x,y,z,scale,bright;
   if(running){
    const cycle=(effect.age*(over?.9:.7)+phase)%1,a=phase*Math.PI*2+effect.age*(over?2.6:2)+cycle*2.4,r=(over?2.1:1.7)*(1-cycle*.75);
    x=Math.cos(a)*r;z=Math.sin(a)*r;y=.2+cycle*2.3;scale=(.7+.6*Math.sin(Math.PI*cycle))*intro;bright=Math.sin(Math.PI*cycle)*tail;
   }else{
    const out=1-life,a=phase*Math.PI*2,r=1+6*out;
    x=Math.cos(a)*r;z=Math.sin(a)*r;y=.6+2*out-2.4*out*out;scale=1.2*(1-out*.5);bright=life;
   }
   dummy.position.set(x,Math.max(.1,y),z);dummy.rotation.set(0,-phase*Math.PI*2,0);dummy.scale.setScalar(Math.max(.01,scale));dummy.updateMatrix();
   motes.setMatrixAt(i,dummy.matrix);color.setHex(effect.colors[i%effect.colors.length]??primary).multiplyScalar(2.4*Math.max(0,bright));motes.setColorAt(i,color);
  }
  motes.instanceMatrix.needsUpdate=true;if(motes.instanceColor)motes.instanceColor.needsUpdate=true;moteMat.opacity=1;
  if(effect.time<=0){effect=null;clear();}
 }
 function clear(){effect=null;group.visible=false;for(const ob of [floor,halo,wave,beam])ob.material.opacity=0;motes.count=0;}
 function state(){return {visible:group.visible,mode:effect?.mode||null,state:effect?.state||null,forms:effect?.forms||[],time:effect?.time||0,drawCalls:group.children.length,instances:group.visible?motes.count:0,serial};}
 function dispose(){group.removeFromParent();const geos=new Set([floor.geometry,haloGeo,beam.geometry,moteGeo]);for(const g of geos)g.dispose();for(const ob of [floor,halo,wave,beam,motes])ob.material.dispose();for(const t of textures)t.dispose();}
 return {start,finish,update,clear,state,dispose};
}
