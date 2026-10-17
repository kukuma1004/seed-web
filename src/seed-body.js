import * as THREE from 'three';
import {rankedEvolutions} from './evolution-rank.js';
import {ALL_FORMS,baseFormOf,TWIN_FORMS} from './forms.js';
import {LAWS} from './laws.js';
import {applySpriteLighting} from './sprite-lighting.js';
import {THEMES,normalizeTheme} from './themes.js';
import {seedVisualEnabled,createSeedShotPresentation,createSeedHurtPresentation} from './seed-visual-language.js';
import {createJourneyDuelBody} from './journey-duel-body.js';

// Artwork only: keep movement, collision and evolution reach unchanged.
export const SEED_BODY_ART='cute/seed-body-v1.webp';
export const SEED_SOLO_BODY_ART='cute/seed-solo-v1.webp';
export const SEED_FUSION_BODY_ART='cute/seed-fusion-v1.webp';
export const SEED_AWAKEN_BODY_ART='cute/seed-awaken-v1.webp';
export const THEME_CREST_ART='theme-crests-v1.webp';
export const BODY_SIZE=1.18;
export const EVOLUTION_SIZE=1.22;
export const SOLO_BODY_TILES=Object.freeze({mirrormaze:0,fullbloom:1,thunderweb:2,starring:3,glassspear:4,flarebloom:5,rewind:6,blackhole:7,winterbreath:8});
export const FUSION_BODY_TILES=Object.freeze({collapse:0,frostguard:1,returnblade:2,prism:3,thunderlance:4,frostbloom:5,stormcrown:6,tidepull:7,seedstorm:8,mirrorguard:9});
export const AWAKEN_BODY_TILES=Object.freeze({bigcrunch:0,frostarmada:1,thousandblades:2,infiniteprism:3,skyspear:4,icegarden:5,tempestcrown:6,maelstrom:7,bloomtempest:8,mirrorhall:9});
const ALL_BODY_TILES=Object.freeze({...FUSION_BODY_TILES,...SOLO_BODY_TILES,...AWAKEN_BODY_TILES});
const EVOLUTION_COLORS=Object.freeze({collapse:0xa861ff,frostguard:0x81eaff,returnblade:0x8eff9d,prism:0xffd77e,thunderlance:0xffd35d,frostbloom:0x77dfff,stormcrown:0xffd15d,tidepull:0x55d9ec,seedstorm:0xff8552,mirrorguard:0xffe2a1,mirrormaze:0xc7eaff,fullbloom:0xa5ee65,thunderweb:0xffd05d,starring:0xffe18a,glassspear:0x74ddff,flarebloom:0xff694f,rewind:0xc375ff,blackhole:0x8d54ff,winterbreath:0x9fe9ff});
const evolutionColor=id=>{
 if(EVOLUTION_COLORS[id])return EVOLUTION_COLORS[id];
 const laws=ALL_FORMS[id]?.requires||[],color=new THREE.Color(0x000000);
 if(!laws.length)return 0xffffff;
 for(const law of laws)color.add(new THREE.Color(LAWS[law]?.color||0xffffff));
 return color.multiplyScalar(1/laws.length).getHex();
};

// Fusion awakenings use dedicated bodies. A twin contributes both solo bodies,
// so the dominant half becomes the body and the other still colours its aura.
const bodyForms=forms=>{const out=new Map();for(const [id,level] of forms instanceof Map?forms:Object.entries(forms||{})){
 const artIds=TWIN_FORMS[id]?[...TWIN_FORMS[id].parts]:[Object.hasOwn(AWAKEN_BODY_TILES,id)?id:baseFormOf(id)];
 for(const artId of artIds)out.set(artId,Math.max(out.get(artId)||0,level));
 }return out;};
export const rankedEvolutionForms=(forms,limit=2)=>rankedEvolutions(bodyForms(forms),ALL_BODY_TILES,limit).map(entry=>entry.id);
export const dominantSoloForm=forms=>rankedEvolutions(forms,SOLO_BODY_TILES,1)[0]?.id||null;
// Rank the actual build first, including forms with no dedicated body tile.
// A lower supported fusion must never impersonate a stronger unsupported one.
export function dominantJourneyBodyForm(forms,levels){
 const id=rankedEvolutions(forms,ALL_FORMS,1)[0]?.id;
 // Keep the original owner, including twins/completions. Unsupported legacy
 // second fusions keep their existing fallback, never a weaker fighter.
 return id||rankedEvolutions(levels,LAWS,1)[0]?.id||null;
}

// The atlas is painted from front, right, back, left; direction is camera-relative.
export function seedFrame(facing,cameraYaw){
 const angle=Math.atan2(Math.sin(facing-cameraYaw),Math.cos(facing-cameraYaw));
 if(Math.abs(angle)<=Math.PI/4)return 0;
 if(Math.abs(angle)>=Math.PI*3/4)return 2;
 return angle>0?1:3;
}
const FRAME_ANGLES=Object.freeze([0,Math.PI/2,Math.PI,-Math.PI/2]);
export function stableSeedFrame(facing,cameraYaw,current=0,margin=.13){
 const angle=Math.atan2(Math.sin(facing-cameraYaw),Math.cos(facing-cameraYaw));
 const centre=FRAME_ANGLES[current]??0;
 const fromCurrent=Math.abs(Math.atan2(Math.sin(angle-centre),Math.cos(angle-centre)));
 return fromCurrent<=Math.PI/4+margin?current:seedFrame(facing,cameraYaw);
}
// Production cells share a centred silhouette and feet at y=240 of 256.
// No per-direction legacy offsets: turning must never make the feet hop.

export function createSeedBody(scene,{occlusion=true,criticalOcclusion=false}={}){
 // One player silhouette remains readable even on the lowest quality tier.
 occlusion=Boolean(criticalOcclusion||occlusion);
 const visualReview=seedVisualEnabled(typeof location==='undefined'?null:location);
 const shotPresentation=createSeedShotPresentation({enabled:visualReview,reducedMotion:typeof matchMedia==='function'&&matchMedia('(prefers-reduced-motion: reduce)').matches});
 const hurtPresentation=createSeedHurtPresentation({enabled:visualReview,reducedMotion:typeof matchMedia==='function'&&matchMedia('(prefers-reduced-motion: reduce)').matches});
 const root=new THREE.Group();scene.add(root);
 const loader=new THREE.TextureLoader();
 const texture=loader.load(import.meta.env.BASE_URL+'assets/'+SEED_BODY_ART);
 texture.colorSpace=THREE.SRGBColorSpace;texture.repeat.set(.5,.5);texture.offset.set(0,.5);
 const material=applySpriteLighting(new THREE.SpriteMaterial({map:texture,transparent:true,alphaTest:.08,depthWrite:true,toneMapped:false}),{shadow:.8,highlight:1.07,rim:0xa1ffe0,rimStrength:.075,atlasGrid:[2,2]});
 const sprite=new THREE.Sprite(material);sprite.center.set(.5,.0625);sprite.scale.set(BODY_SIZE,BODY_SIZE,1);root.add(sprite);
 // One atlas-backed crest sits behind the body. It gives each cosmetic theme a
 // readable silhouette without changing collision or adding parts per law.
 const themeMaterial=new THREE.SpriteMaterial({map:null,transparent:true,opacity:.62,depthWrite:false,toneMapped:false});
 const themeCrest=new THREE.Sprite(themeMaterial);themeCrest.center.set(.5,.43);themeCrest.scale.set(1.62,1.62,1);themeCrest.renderOrder=-1;themeCrest.visible=false;root.add(themeCrest);
 let themeTexture=null,themeLoading=false,themeId='botanical';
 const applyThemeCrest=()=>{
  if(!themeTexture)return;
  const tile=THEMES[themeId].crest;themeTexture.offset.set(tile*.25,0);themeMaterial.map=themeTexture;themeMaterial.needsUpdate=true;themeCrest.visible=true;
 };
 const ensureThemeCrest=()=>{if(themeTexture||themeLoading)return;themeLoading=true;themeTexture=loader.load(import.meta.env.BASE_URL+'assets/'+THEME_CREST_ART,applyThemeCrest);themeTexture.colorSpace=THREE.SRGBColorSpace;themeTexture.repeat.set(.25,1);themeTexture.minFilter=themeTexture.magFilter=THREE.LinearFilter;};
 // A faint copy draws through walls so the seed is never lost behind cover.
 const ghostMaterial=new THREE.SpriteMaterial({map:texture,alphaTest:.08,transparent:true,opacity:criticalOcclusion?.76:.38,depthTest:true,depthFunc:THREE.GreaterDepth,depthWrite:false,toneMapped:false,color:0x9ff5d2});
 const ghost=new THREE.Sprite(ghostMaterial);ghost.center.set(.5,.0625);ghost.scale.set(BODY_SIZE,BODY_SIZE,1);ghost.renderOrder=2;root.add(ghost);

 let applyEvolution=()=>{};
 const sources={
  fusion:{file:SEED_FUSION_BODY_ART,tiles:FUSION_BODY_TILES,ready:false,loading:false,texture:null},
  solo:{file:SEED_SOLO_BODY_ART,tiles:SOLO_BODY_TILES,ready:false,loading:false,texture:null},
  awaken:{file:SEED_AWAKEN_BODY_ART,tiles:AWAKEN_BODY_TILES,ready:false,loading:false,texture:null}
 };
 const evolutionMaterial=applySpriteLighting(new THREE.SpriteMaterial({map:null,transparent:true,alphaTest:.08,depthWrite:true,toneMapped:false}),{shadow:.76,highlight:1.1,rim:0xffe8ae,rimStrength:.085,atlasGrid:[4,3]});
 const evolutionSprite=new THREE.Sprite(evolutionMaterial);evolutionSprite.center.set(.5,.0625);evolutionSprite.scale.set(EVOLUTION_SIZE,EVOLUTION_SIZE,1);evolutionSprite.visible=false;root.add(evolutionSprite);
 const evolutionGhostMaterial=new THREE.SpriteMaterial({map:null,alphaTest:.08,transparent:true,opacity:criticalOcclusion?.76:.34,depthTest:true,depthFunc:THREE.GreaterDepth,depthWrite:false,toneMapped:false,color:0xcfffe9});
 const evolutionGhost=new THREE.Sprite(evolutionGhostMaterial);evolutionGhost.center.set(.5,.0625);evolutionGhost.scale.copy(evolutionSprite.scale);evolutionGhost.renderOrder=2;evolutionGhost.visible=false;root.add(evolutionGhost);
 const secondaryMaterial=new THREE.MeshBasicMaterial({color:0xffffff,transparent:true,opacity:.68,depthWrite:false,toneMapped:false,side:THREE.DoubleSide,forceSinglePass:true});
 const secondaryAura=new THREE.Mesh(new THREE.TorusGeometry(.48,.025,5,36),secondaryMaterial);secondaryAura.rotation.x=Math.PI/2;secondaryAura.position.y=.12;secondaryAura.visible=false;root.add(secondaryAura);

 let currentEvolution=null,secondaryEvolution=null;
 const journeyBody=createJourneyDuelBody(root,{occlusionOpacity:criticalOcclusion?.76:.34,baseURL:import.meta.env.BASE_URL,loader,onChange:()=>applyEvolution(),reducedMotion:typeof matchMedia==='function'&&matchMedia('(prefers-reduced-motion: reduce)').matches});
 journeyBody.setOcclusion(occlusion);
 const sourceFor=id=>Object.values(sources).find(source=>Object.hasOwn(source.tiles,id));
 const ensureSource=source=>{
  if(!source||source.loading||source.ready)return;
  source.loading=true;
  source.texture=loader.load(import.meta.env.BASE_URL+'assets/'+source.file,()=>{source.ready=true;applyEvolution();});
  source.texture.colorSpace=THREE.SRGBColorSpace;source.texture.repeat.set(.25,1/3);
 };
 applyEvolution=()=>{
  const source=sourceFor(currentEvolution),duel=journeyBody.ready(),active=Boolean(source?.ready)&&!duel;
  if(active){const tile=source.tiles[currentEvolution];source.texture.offset.set((tile%4)/4,1-(Math.floor(tile/4)+1)/3);evolutionMaterial.map=evolutionGhostMaterial.map=source.texture;evolutionMaterial.needsUpdate=evolutionGhostMaterial.needsUpdate=true;}
  sprite.visible=!active&&!duel;ghost.visible=!active&&!duel&&occlusion;evolutionSprite.visible=active;evolutionGhost.visible=active&&occlusion;
  secondaryAura.visible=Boolean(secondaryEvolution);if(secondaryEvolution)secondaryMaterial.color.setHex(evolutionColor(secondaryEvolution));
 };
 // Preserve the visual rig interface used by evolution and combat.
 root.userData={legs:[],heart:new THREE.Object3D(),halo:new THREE.Object3D(),artFrame:0,evolutionArt:null,secondaryEvolutionArt:null,theme:themeId,themeCrest:0};
 root.userData.pulseShot=(strength=1)=>{shotPresentation.pulse(strength);journeyBody.basic();};root.userData.pulseHurt=amount=>{hurtPresentation.pulse(amount);journeyBody.hurt();};root.userData.stepShot=dt=>{shotPresentation.step(dt);hurtPresentation.step(dt);journeyBody.step(dt);};root.userData.resetShot=()=>{shotPresentation.reset();hurtPresentation.reset();journeyBody.reset();};
 root.userData.titleSprites=[sprite,evolutionSprite,themeCrest,...journeyBody.titleSprites];
 root.userData.setJourneyBuild=(forms,levels)=>journeyBody.select(dominantJourneyBodyForm(forms,levels));
 root.userData.setJourneyActive=journeyBody.setEnabled;root.userData.pulseJourneyForm=journeyBody.fire;root.userData.pulseJourneyHit=(owner,part)=>journeyBody.hit(owner,Boolean(ALL_FORMS[part]?.passive));root.userData.pulseJourneyActive=journeyBody.active;root.userData.journeyIdentityState=journeyBody.state;root.userData.disposeJourneyIdentity=journeyBody.dispose;
 root.userData.setTheme=id=>{themeId=normalizeTheme(id);root.userData.theme=themeId;root.userData.themeCrest=THEMES[themeId].crest;ensureThemeCrest();applyThemeCrest();return themeId;};
 root.userData.setEvolution=(forms,levels)=>{
  [currentEvolution=null,secondaryEvolution=null]=rankedEvolutionForms(forms,2);
  // Catalogue fusions deliberately share lightweight combat geometry instead
  // of loading 35 more body textures. A rotating two-law aura still makes the
  // evolution visible immediately in play.
  if(!currentEvolution)secondaryEvolution=rankedEvolutions(forms,ALL_FORMS,1)[0]?.id||null;
  root.userData.evolutionArt=currentEvolution;root.userData.secondaryEvolutionArt=secondaryEvolution;journeyBody.select(dominantJourneyBodyForm(forms,levels));ensureSource(sourceFor(currentEvolution));applyEvolution();return currentEvolution;
 };
 root.userData.setQuality=level=>{occlusion=Boolean(criticalOcclusion||level>0);journeyBody.setOcclusion(occlusion);applyEvolution();};
 root.userData.updateEvolutionArt=(time,overdrive=false)=>{
  if(!secondaryAura.visible)return;const pulse=1+Math.sin(time*4)*.055+(overdrive?.12:0);secondaryAura.scale.setScalar(pulse);secondaryAura.rotation.z=time*(overdrive?2.2:.8);secondaryMaterial.opacity=overdrive?.92:.68;
 };
 let facing=0,displayFrame=0;
 root.userData.updateArt=(camera,dx=0,dz=0)=>{
  if(Math.hypot(dx,dz)>.001)facing=Math.atan2(dx,dz);
  const cameraYaw=Math.atan2(camera.position.x-root.position.x,camera.position.z-root.position.z);
  const frame=displayFrame=stableSeedFrame(facing,cameraYaw,displayFrame);
  texture.offset.set((frame%2)*.5,frame<2?.5:0);root.userData.artFrame=frame;
  const {phase=0,pace=0}=root.userData.motion||{},step=Math.sin(phase)*pace;
  const crestPulse=1+Math.sin(phase*.55)*.025+pace*.018;themeCrest.scale.setScalar(1.62*crestPulse);themeMaterial.opacity=.54+pace*.12;
  const kick=shotPresentation.value(),contact=hurtPresentation.value();
  material.color.setRGB(1,1-contact*.16,1-contact*.28);evolutionMaterial.color.copy(material.color);
  material.rotation=evolutionMaterial.rotation=Math.sin(phase)*pace*.032+(kick*.055+contact*.045)*(frame===3?-1:1);
  const bob=Math.max(0,step)*.01;
  sprite.position.set(0,bob,0);sprite.scale.set(BODY_SIZE*(1+step*.018+kick*.035+contact*.04),BODY_SIZE*(1-step*.011-kick*.02-contact*.025),1);ghost.position.copy(sprite.position);ghost.scale.copy(sprite.scale);ghostMaterial.rotation=material.rotation;
  evolutionSprite.position.set(0,bob,0);evolutionSprite.scale.set(EVOLUTION_SIZE*(1+step*.018+kick*.035+contact*.04),EVOLUTION_SIZE*(1-step*.011-kick*.02-contact*.025),1);evolutionGhost.position.copy(evolutionSprite.position);evolutionGhost.scale.copy(evolutionSprite.scale);evolutionGhostMaterial.rotation=evolutionMaterial.rotation;
  journeyBody.update(cameraYaw,journeyBody.attacking()?root.rotation.y:facing,root.userData.motion,contact);
 };
 return root;
}
