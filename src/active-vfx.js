import * as THREE from 'three';
import {ALL_FORMS} from './forms.js';
import {LAWS} from './laws.js';
import {THEMES,normalizeTheme,themeColor} from './themes.js';

// Ultimate stage around the seed. Seven authored glyphs share one atlas;
// halo, beam and motes remain code-driven. Still five draw calls.
export const ULTIMATE_ARCHETYPE_ART='assets/ultimate-archetypes-v1.webp';

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

export function activeColors(forms=[],theme='botanical'){
 const colors=[];
 for(const id of forms)for(const law of ALL_FORMS[id]?.requires||[]){const color=LAWS[law]?.color;if(color!=null&&!colors.includes(color))colors.push(color);}
 const base=colors.length?colors:[0x76ffd0];return base.map((value,index)=>themeColor(theme,`${forms.join('+')}:${index}`,value));
}
const waveDepth=(type,age,rift)=>type==='DOMAIN'?3.15+Math.sin(age*1.8)*.16:type==='ORBIT'?2.55+Math.sin(age*4)*.22:type==='TIME_STOP'?2.8:rift?2.65+Math.sin(age*3)*.18:2.35+Math.sin(age*2.2)*.12;

// Seven ultimate silhouettes, authored once and drawn through the same five
// batches. The values only steer transforms and particle paths: a theme can
// therefore feel like a sellable skin without adding meshes, lights or post
// passes on a low-end phone.
export const ARCHETYPE_VFX=Object.freeze({
 BURST:Object.freeze({glyph:0,floor:2.15,halo:1.45,waveX:2.2,waveZ:2.2,beamX:.78,beamY:.68,motes:'burst'}),
 RAIN:Object.freeze({glyph:1,floor:2.45,halo:1.7,waveX:3.15,waveZ:1.25,beamX:.64,beamY:1.18,motes:'rain'}),
 ORBIT:Object.freeze({glyph:2,floor:2.35,halo:2.25,waveX:3.05,waveZ:3.05,beamX:1.02,beamY:.58,motes:'orbit'}),
 BEAM:Object.freeze({glyph:3,floor:1.65,halo:1.22,waveX:.8,waveZ:3.45,beamX:.46,beamY:1.72,motes:'beam'}),
 DOMAIN:Object.freeze({glyph:4,floor:3.05,halo:2.08,waveX:3.25,waveZ:3.25,beamX:1.2,beamY:.42,motes:'domain'}),
 BLACKHOLE:Object.freeze({glyph:5,floor:1.78,halo:1.22,waveX:1.18,waveZ:1.18,beamX:1.32,beamY:.62,motes:'blackhole'}),
 TIME_STOP:Object.freeze({glyph:6,floor:2.68,halo:2.72,waveX:2.82,waveZ:2.82,beamX:.92,beamY:.5,motes:'clock'})
});

export function createActiveVFX(scene,{mobile=false,theme='botanical'}={}){
 const group=new THREE.Group();group.name='active-vfx';group.visible=false;scene.add(group);
 const textures=[];
 const additive=(map=null)=>{const material=new THREE.MeshBasicMaterial({color:0xffffff,map,transparent:true,opacity:0,depthWrite:false,blending:THREE.AdditiveBlending,toneMapped:false,side:THREE.DoubleSide,forceSinglePass:true});return material;};
 const glowTex=gradientTexture(64,glowFalloff),haloTex=gradientTexture(64,haloBand),beamTex=gradientTexture(32,beamFalloff);
 const sigilTex=typeof document==='undefined'?glowTex:new THREE.TextureLoader().load(import.meta.env.BASE_URL+ULTIMATE_ARCHETYPE_ART);
 if(sigilTex!==glowTex){sigilTex.colorSpace=THREE.SRGBColorSpace;sigilTex.minFilter=sigilTex.magFilter=THREE.LinearFilter;sigilTex.repeat.set(.25,.5);}
 textures.push(glowTex,haloTex,beamTex,...(sigilTex===glowTex?[]:[sigilTex]));

 const floor=new THREE.Mesh(new THREE.PlaneGeometry(2,2).rotateX(-Math.PI/2),additive(sigilTex));floor.position.y=.11;floor.name='active-archetype-sigil';group.add(floor);
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
 let effect=null,serial=0,themeId=normalizeTheme(theme);
 const tint=(material,hex,strength)=>{material.color.setHex(hex).multiplyScalar(strength);};

 function begin(mode,plan,pos,time){
  serial++;effect={mode,state:plan.state,forms:[...plan.forms],tags:[...(plan.tags||[])],archetype:plan.archetype||'BURST',theme:themeId,time,total:time,age:0,colors:activeColors(plan.forms,themeId),serial};
  if(sigilTex!==glowTex){const glyph=(ARCHETYPE_VFX[effect.archetype]||ARCHETYPE_VFX.BURST).glyph;sigilTex.offset.set((glyph%4)*.25,glyph<4?.5:0);}
  group.position.set(pos.x,0,pos.z);group.visible=true;return effect;
 }
 const start=(plan,pos)=>begin('running',plan,pos,plan.seconds);
 const finish=(plan,pos)=>begin('finale',plan,pos,.9);

 function update(dt,pos){
  if(!effect){group.visible=false;return;}
  effect.age+=dt;effect.time-=dt;group.position.set(pos.x,0,pos.z);
  const running=effect.mode==='running',over=effect.state==='OVERDRIVE',type=effect.archetype,theme=THEMES[effect.theme];
  const rift=effect.tags.includes('RIFT');
  const intro=Math.min(1,effect.age/.3),life=Math.max(0,effect.time/effect.total);
  // Running: a quick swell, a gentle breathing hold, and a soft fade over the last half second.
  const tail=running?Math.min(1,effect.time/.5):1;
  const breathe=1+Math.sin(effect.age*5.5)*.08;
  const primary=effect.colors[0],secondary=effect.colors[1]??primary;
  const k=over?1:.78,profile=ARCHETYPE_VFX[type]||ARCHETYPE_VFX.BURST,progress=1-life;
  const beat=Math.pow(Math.max(0,Math.sin(effect.age*(type==='TIME_STOP'?Math.PI*2:Math.PI*1.45))),8);

  if(running){
   const floorScale=profile.floor*(over?1.08:1)*(type==='BLACKHOLE'?1-.16*progress:type==='DOMAIN'?1+.04*Math.sin(effect.age*1.7):1);
   floor.material.opacity=1;tint(floor.material,primary,.38*k*intro*tail*breathe);floor.scale.setScalar(floorScale*(.6+.4*intro));floor.rotation.y=-effect.age*(theme.motion==='axis'?1.5:type==='TIME_STOP'?.06:rift?.68:type==='BLACKHOLE'?1.25:.32);
   const haloBase=profile.halo*(1+(type==='BURST'||type==='BLACKHOLE'?beat*.1:0));
   halo.material.opacity=1;tint(halo.material,primary,1.6*k*intro*tail);halo.scale.setScalar(haloBase*(.7+.3*intro)*(type==='TIME_STOP'?1+beat*.045:breathe));halo.rotation.y=effect.age*(type==='TIME_STOP'?.12:type==='ORBIT'?2.8:1.4);
   wave.material.opacity=over||rift||['RAIN','ORBIT','DOMAIN','BLACKHOLE','TIME_STOP'].includes(type)?1:0;tint(wave.material,secondary,(rift?.95:.7)*intro*tail);
   const wavePulse=type==='BLACKHOLE'?.9+.12*Math.cos(effect.age*4):type==='TIME_STOP'?1+beat*.06:1+.035*Math.sin(effect.age*3);
   wave.scale.set((rift&&type!=='DOMAIN'?1.35:profile.waveX)*wavePulse,1,(rift&&type!=='DOMAIN'?waveDepth(type,effect.age,true):profile.waveZ)*wavePulse);wave.rotation.y=-effect.age*(type==='TIME_STOP'?.08:rift?2.1:type==='ORBIT'?2.6:.9);
   const beamWide=profile.beamX*(type==='BLACKHOLE'?1+.12*Math.sin(effect.age*4):1),beamTall=profile.beamY*(.72+.28*intro)*(type==='BEAM'?1+beat*.16:1);
   beam.material.opacity=1;tint(beam.material,over?secondary:primary,(over?.9:.7)*intro*tail);beam.scale.set(beamWide,beamTall,beamWide);
  }else{
   const out=1-life,fade=Math.sin(Math.PI*Math.min(1,life*1.15));
   const snap=type==='TIME_STOP'?Math.floor(out*8)/8:out,collapse=type==='BLACKHOLE'?Math.max(.18,1-snap*1.35):1;
   floor.material.opacity=1;tint(floor.material,primary,.58*fade);floor.scale.setScalar(profile.floor*(1+1.65*snap)*collapse);floor.rotation.y-=dt*(type==='TIME_STOP'?.15:1.4);
   halo.material.opacity=1;tint(halo.material,primary,2*fade);halo.scale.setScalar(profile.halo*(1+2.5*snap)*collapse);halo.rotation.y+=dt*(type==='ORBIT'?5:3);
   wave.material.opacity=1;tint(wave.material,secondary,1.4*fade);wave.scale.set(profile.waveX*(1+2.25*snap)*collapse,1,profile.waveZ*(1+2.25*snap)*collapse);
   beam.material.opacity=1;tint(beam.material,secondary,1.3*fade);beam.scale.set(profile.beamX*(1+.9*snap),Math.max(.16,profile.beamY*(1-.58*snap)),profile.beamX*(1+.9*snap));
  }

  // Motes: running, they spiral up and inward into the seed and respawn at the bottom;
  // in the finale they scatter outward and fade.
  motes.count=moteCount;
  for(let i=0;i<moteCount;i++){
   const phase=i/moteCount;
   let x,y,z,scale,bright;
   if(running){
    const speed=over?.95:.72,cycle=(effect.age*speed+phase)%1,themeSpin=theme.motion==='spiral'?1.35:theme.motion==='axis'?.35:theme.motion==='inward'?-1:1;
    let a=phase*Math.PI*2+effect.age*themeSpin,r=1;
    if(profile.motes==='rain'){
     a=phase*Math.PI*2+(theme.motion==='axis'?Math.floor(effect.age*4)*Math.PI/2:effect.age*.22);r=.55+(i%4)*.48;x=Math.cos(a)*r;z=Math.sin(a)*r;y=.35+(1-cycle)*3.35;scale=.55+cycle*.75;bright=Math.sin(Math.PI*cycle)*tail;
    }else if(profile.motes==='beam'){
     a=phase*Math.PI*2+effect.age*(theme.motion==='axis'?.8:3.4);r=.38+.12*Math.sin(effect.age*5+i);x=Math.cos(a)*r;z=Math.sin(a)*r;y=.2+cycle*3.85;scale=.55+.5*Math.sin(Math.PI*cycle);bright=Math.sin(Math.PI*cycle)*tail;
    }else if(profile.motes==='orbit'){
     const outer=i%2===0;r=outer?2.2:1.45;a=phase*Math.PI*2+effect.age*(outer?2.4:-3.1);x=Math.cos(a)*r;z=Math.sin(a)*r;y=.42+(outer?.22:.76)+Math.sin(a*2)*.12;scale=.62+(outer?.25:.5);bright=(.7+.3*Math.sin(effect.age*6+i))*tail;
    }else if(profile.motes==='domain'){
     a=phase*Math.PI*2+(theme.motion==='axis'?0:effect.age*.18);r=2.45+.22*Math.sin(effect.age*2+i);x=Math.cos(a)*r;z=Math.sin(a)*r;y=.18+.72*Math.pow(Math.max(0,Math.sin(effect.age*2.4+phase*Math.PI*2)),2);scale=.58+.46*beat;bright=(.56+.44*beat)*tail;
    }else if(profile.motes==='blackhole'){
     a=phase*Math.PI*2+effect.age*(theme.motion==='inward'?-4.2:4.2)+cycle*3.2;r=.2+2.65*(1-cycle);x=Math.cos(a)*r;z=Math.sin(a)*r;y=.22+(1-cycle)*1.4;scale=.42+.9*(1-cycle);bright=Math.sin(Math.PI*cycle)*tail;
    }else if(profile.motes==='clock'){
     const tick=Math.floor(effect.age*8)/8;a=phase*Math.PI*2+tick*.16;r=1.75+(i%3)*.32;x=Math.cos(a)*r;z=Math.sin(a)*r;y=.26+(i%4)*.24;scale=.48+(i%3)*.18+beat*.36;bright=(.55+.45*beat)*tail;
    }else{
     a=phase*Math.PI*2+effect.age*(over?2.4:1.8)+cycle*(theme.motion==='spiral'?4.2:1.8);r=(over?2.15:1.75)*(.28+.72*cycle);x=Math.cos(a)*r;z=Math.sin(a)*r;y=.2+cycle*2.45;scale=.55+.8*Math.sin(Math.PI*cycle);bright=Math.sin(Math.PI*cycle)*tail;
    }
    scale*=intro;
   }else{
    const out=1-life,a=phase*Math.PI*2+(type==='ORBIT'?effect.age*3:0),r=(type==='BLACKHOLE'?2.4*(1-out)+.15:1+6*out);
    x=Math.cos(a)*r;z=Math.sin(a)*r;y=.6+(type==='RAIN'?(i%4)*.5:2*out-2.4*out*out);scale=1.2*(1-out*.5);bright=life;
   }
   dummy.position.set(x,Math.max(.1,y),z);dummy.rotation.set(0,-phase*Math.PI*2,0);dummy.scale.setScalar(Math.max(.01,scale));dummy.updateMatrix();
   motes.setMatrixAt(i,dummy.matrix);color.setHex(effect.colors[i%effect.colors.length]??primary).multiplyScalar(2.4*Math.max(0,bright));motes.setColorAt(i,color);
  }
  motes.instanceMatrix.needsUpdate=true;if(motes.instanceColor)motes.instanceColor.needsUpdate=true;moteMat.opacity=1;
  if(effect.time<=0){effect=null;clear();}
 }
 function clear(){effect=null;group.visible=false;for(const ob of [floor,halo,wave,beam])ob.material.opacity=0;motes.count=0;}
 function setTheme(id){themeId=normalizeTheme(id);if(effect){effect.theme=themeId;effect.colors=activeColors(effect.forms,themeId);}return themeId;}
 function state(){return {visible:group.visible,mode:effect?.mode||null,state:effect?.state||null,forms:effect?.forms||[],archetype:effect?.archetype||null,theme:effect?.theme||themeId,time:effect?.time||0,drawCalls:group.children.length,instances:group.visible?motes.count:0,serial};}
 function dispose(){group.removeFromParent();const geos=new Set([floor.geometry,haloGeo,beam.geometry,moteGeo]);for(const g of geos)g.dispose();for(const ob of [floor,halo,wave,beam,motes])ob.material.dispose();for(const t of textures)t.dispose();}
 return {start,finish,update,clear,setTheme,state,dispose};
}
