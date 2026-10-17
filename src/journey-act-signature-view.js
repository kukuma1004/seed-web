import * as THREE from 'three';
import {JOURNEY_SIGNATURE_RULES as R,journeySignatureHint} from './journey-act-signatures.js';
import {ACT3_ARENA} from './act3.js';
// Two bounded image-effect banks share one atlas. Geometry stays allocated;
// phase uniforms select artwork without spawning particles or changing damage.
function stormGeometry(){return new THREE.PlaneGeometry(1,1).rotateX(.42);}
const BASE_URL=import.meta.env?.BASE_URL||'./';
export function createJourneySignatureView(scene,{loader=null}={}){
 const root=new THREE.Group();root.name='journey-act-signature';root.visible=false;scene.add(root);
 const geo=new THREE.PlaneGeometry(1,1),windGeo=stormGeometry(),lightningGeo=stormGeometry(),danger=new THREE.MeshBasicMaterial({color:0xe8c191,transparent:true,opacity:.3,depthWrite:false,toneMapped:false,side:THREE.DoubleSide,forceSinglePass:true}),safe=new THREE.MeshBasicMaterial({color:0xb7ecd1,transparent:true,opacity:.6,depthWrite:false,toneMapped:false});
 const stormUniforms={frame:{value:0},lane:{value:0},gap:{value:R.stormHalfGap},bounds:{value:new THREE.Vector2(ACT3_ARENA.halfWidth,ACT3_ARENA.halfDepth)}};
 let stormTexture=null,stormReady=false,stormStarted=false;
 danger.onBeforeCompile=shader=>{
  shader.uniforms.stormFrame=stormUniforms.frame;shader.uniforms.stormLane=stormUniforms.lane;shader.uniforms.stormGap=stormUniforms.gap;shader.uniforms.stormBounds=stormUniforms.bounds;
  shader.vertexShader='varying vec2 vStormWorld;\nvarying float vStormVariant;\n'+shader.vertexShader.replace('#include <project_vertex>','#include <project_vertex>\n vStormWorld=(modelMatrix * instanceMatrix * vec4(position,1.0)).xz;\n vStormVariant=mod(floor(abs(instanceMatrix[3].x)*.7+abs(instanceMatrix[3].y)*.31),2.0);');
  shader.fragmentShader='uniform float stormFrame; uniform float stormLane; uniform float stormGap; uniform vec2 stormBounds; varying vec2 vStormWorld; varying float vStormVariant;\n'+shader.fragmentShader.replace('#include <map_fragment>',`#ifdef USE_MAP
   float artFrame=stormFrame<.5?0.0:1.0+mod(stormFrame-1.0+vStormVariant,2.0);
   vec2 frameCell=vec2(mod(artFrame,2.0),1.0-floor(artFrame/2.0));
   vec2 stormUv=vec2(mix(vMapUv.x,1.0-vMapUv.x,vStormVariant),vMapUv.y);
   vec4 sampledDiffuseColor=texture2D(map,(frameCell+clamp(stormUv,vec2(.006),vec2(.994)))*.5);
   diffuseColor*=sampledDiffuseColor;
   #endif
   diffuseColor.a*=smoothstep(stormGap,stormGap+.32,abs(vStormWorld.x-stormLane))*step(abs(vStormWorld.x),stormBounds.x)*step(abs(vStormWorld.y),stormBounds.y);`);
 };
 danger.customProgramCacheKey=()=> 'journey-storm-atlas-v2';
 function loadStorm(low){
  if(disposed||stormStarted||!loader&&(typeof document==='undefined'||typeof document.createElementNS!=='function'))return;
  stormStarted=true;
  const setup=t=>{t.colorSpace=THREE.SRGBColorSpace;t.generateMipmaps=false;t.minFilter=THREE.LinearFilter;t.magFilter=THREE.LinearFilter;};
  try{
   const texture=(loader||new THREE.TextureLoader()).load(`${BASE_URL}assets/${low?'mobile':'vfx'}/journey-storm-atlas-v1.webp`,t=>{
    if(disposed){if(t!==stormTexture)t.dispose();return;}
    setup(t);stormTexture=t;danger.map=t;danger.needsUpdate=true;stormReady=true;
   },undefined,()=>{stormReady=false;danger.map=null;danger.needsUpdate=true;});
   stormTexture=texture;setup(texture);
  }catch{stormReady=false;}
 }

 const plane=(mat)=>{const m=new THREE.Mesh(geo,mat);m.rotation.x=-Math.PI/2;m.position.y=.09;m.frustumCulled=false;root.add(m);return m;};
 const bank=()=>{const m=new THREE.InstancedMesh(windGeo,danger,24);m.rotation.x=-Math.PI/2;m.frustumCulled=false;m.instanceMatrix.setUsage(THREE.DynamicDrawUsage);m.count=0;root.add(m);return m;};
 const left=bank(),right=bank(),edgeA=plane(safe),edgeB=plane(safe);left.name='journey-storm-left-bank';right.name='journey-storm-right-bank';
 const ringGeo=new THREE.RingGeometry(R.rallyRadius-.07,R.rallyRadius,40),ring=new THREE.Mesh(ringGeo,safe);ring.rotation.x=-Math.PI/2;ring.position.y=.1;root.add(ring);
 const hud=document.createElement('div');hud.id='journey-signature';hud.setAttribute('role','status');hud.hidden=true;document.body.append(hud);let text='',disposed=false,lastFrame=-1,lastLane=NaN,lastPhase='',lastReduced=false,lastLow=false;
 const pose=new THREE.Matrix4();
 function updateBank(mesh,min,max,frame,active,low){
  // Broad interlocking storm fronts, rather than a grid of identical icons.
  // The fragment clip remains authoritative at both the gap and map ends.
  const width=max-min,cols=Math.min(2,Math.max(1,Math.ceil(width/15))),rows=2,depth=ACT3_ARENA.halfDepth*2,dz=depth/rows,dx=width/cols;
  mesh.geometry=active?lightningGeo:windGeo;let count=0;
  for(let row=0;row<rows;row++)for(let col=0;col<cols;col++){
   const drift=Math.sin(frame*.013+row*1.7+col*.9)*.035,stagger=cols>1?(row%2?.12:-.12):0;
   pose.makeScale(dx*(row%2?1.18:1.08),dz*1.22,1);pose.setPosition(min+dx*(col+.5+stagger+drift),ACT3_ARENA.halfDepth-dz*(row+.5)+(col%2?.13:-.13)*dz,.11);mesh.setMatrixAt(count++,pose);
  }
  mesh.count=count;mesh.instanceMatrix.needsUpdate=true;
 }
 function update(s,player,{siege=null,visible=false,hideHint=false,reducedMotion=false,lowQuality=false}={}){
  if(disposed)return;root.visible=visible&&!!s&&(s.act!=='crystalGorge'||!!siege);const hintHidden=!root.visible||hideHint||s?.act==='crystalGorge'&&siege?.phase==='prep';if(hud.hidden!==hintHidden)hud.hidden=hintHidden;left.visible=right.visible=edgeA.visible=edgeB.visible=ring.visible=false;if(!root.visible)return;safe.opacity=.6;safe.color.setHex(0xb7ecd1);edgeA.rotation.z=edgeB.rotation.z=0;
  const steer=player?.x<s.lane-R.stormHalfGap?'오른쪽 밝은 틈으로 →':player?.x>s.lane+R.stormHalfGap?'← 왼쪽 밝은 틈으로':'밝은 항로 안에서 피하고 쏘세요';
  const hint=s.act==='skyway'?(s.phase==='warning'?'폭풍 접근 · 물결을 피해서 '+steer:s.phase==='storm'?'번개 폭풍은 지속 피해 · '+steer:s.time<R.stormDelay?'폭풍은 구역 공격 · 물결이 보이면 밝은 틈으로 이동하세요':'폭풍이 잠잠해졌어요 · 적의 주황 탄을 피하세요'):journeySignatureHint(s,siege);if(hint!==text){hud.textContent=hint;text=hint;}
  if(s.act==='skyway'&&s.phase!=='quiet'){
   const low=s.lane-R.stormHalfGap,high=s.lane+R.stormHalfGap;
   const warning=s.phase==='warning',progress=warning?(reducedMotion?1:THREE.MathUtils.clamp(((s.time-R.stormDelay)%R.stormPeriod)/R.stormWarning,0,1)):1;
   loadStorm(lowQuality);stormUniforms.lane.value=s.lane;stormUniforms.frame.value=warning?0:reducedMotion?1:1+(Math.floor(s.time*3)%2);
   left.visible=right.visible=stormReady;edgeA.visible=edgeB.visible=true;danger.color.setHex(0xffffff);danger.opacity=warning?.18+progress*.30:.52;
   safe.color.setHex(warning?0xeec99a:0xb7ecd1);safe.opacity=warning?.35+progress*.35:.72;
   const frame=reducedMotion?0:Math.floor((Number.isFinite(s.time)?s.time:0)*30);
   if(frame!==lastFrame||s.lane!==lastLane||s.phase!==lastPhase||reducedMotion!==lastReduced||lowQuality!==lastLow){updateBank(left,-ACT3_ARENA.halfWidth,low,frame,!warning,lowQuality);updateBank(right,high,ACT3_ARENA.halfWidth,frame,!warning,lowQuality);lastFrame=frame;lastLane=s.lane;lastPhase=s.phase;lastReduced=reducedMotion;lastLow=lowQuality;}
   edgeA.position.set(low,.11,0);edgeB.position.set(high,.11,0);edgeA.scale.set(warning?.08+progress*.05:.14,ACT3_ARENA.halfDepth*2,1);edgeB.scale.copy(edgeA.scale);
  }else if(s.act==='crosswind'&&s.tailwind>0){
   edgeA.visible=edgeB.visible=true;edgeA.position.set(player.x+1.5,.12,player.z-.22);edgeB.position.set(player.x+1.5,.12,player.z+.22);edgeA.scale.set(.13,.75,1);edgeB.scale.copy(edgeA.scale);edgeA.rotation.z=-Math.PI*3/4;edgeB.rotation.z=-Math.PI/4;
  }else if(s.act==='crystalGorge'&&(s.rallyPad||s.repairAway&&s.repairPad)){
   const away=Boolean(s.repairAway&&!s.rallyPad&&s.repairGrace>0),p=siege?.pads.find(p=>p.id===(s.rallyPad||s.repairPad));if(p&&p.kind&&p.hp>0&&(!away||siege.resources>=1)){
   // A dodge briefly preserves earned repair progress, never the support
   // radius/bonus. The dim bar is paused work, not healing outside the ring.
   ring.visible=!away;ring.position.set(p.x,.11,p.z);safe.opacity=away?.25:s.repairPad?.8:.6;
   if(s.repairPad===p.id){const progress=THREE.MathUtils.clamp(s.repairCharge/R.repairTime,0,1),width=1.1*progress;edgeA.visible=true;edgeA.position.set(p.x,.12,p.z+1.1);edgeA.scale.set(1.1,.025,1);edgeB.visible=progress>0;edgeB.position.set(p.x-.55+width/2,.125,p.z+1.1);edgeB.scale.set(width,.1,1);}
  }}
 }
 return {update,state:()=>({storm:root.visible&&left.visible&&right.visible,phase:root.visible?(left.visible?lastPhase:'quiet'):'inactive',instances:root.visible&&left.visible?left.count+right.count:0,capacity:48,drawCalls:root.visible?root.children.filter(o=>o.visible).length:0,geometries:4,materials:2,textures:stormTexture?1:0,artReady:stormReady}),hide(){root.visible=false;if(!hud.hidden)hud.hidden=true;},dispose(){if(disposed)return;disposed=true;root.removeFromParent();left.dispose();right.dispose();geo.dispose();windGeo.dispose();lightningGeo.dispose();ringGeo.dispose();danger.dispose();safe.dispose();stormTexture?.dispose();hud.remove();}};
}
