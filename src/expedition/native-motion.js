import {DUEL_NATIVE_MOTION,nativeActionFrame} from '../duel-native-motion.js';
import {getExpeditionSpecies} from './species.js';
import {expeditionUnitFeedback} from './battle-presentation.js';

// Reuse the final merged native registry, including mixed-size files and
// measured sole pivots. No source image is cut, recoloured or regenerated.
// A twin's art is a codex illustration; combat still uses its two living
// parent instances and the existing paid resonance action.
export function expeditionNativeMotion(speciesId){
 const species=getExpeditionSpecies(speciesId);
 if(!species)return null;
 const id=species.kind==='twin'?`twin-${species.id}`:species.id;
 const motion=DUEL_NATIVE_MOTION[id];
 return motion&&motion.runtimeSafe!==false&&motion.frames.length===8?{id,motion}:null;
}

// The unit artwork square represents three world units, with one common
// ground plane. Each frame's authored pixels-per-unit supplies its size;
// changing the pose never resizes the character to fill a guessed grid cell.
export function expeditionNativeFrame(speciesId,pose){
 const entry=expeditionNativeMotion(speciesId);
 if(!entry||!Number.isInteger(pose)||pose<0||pose>7)return null;
 const m=entry.motion,[file,x,y,w,h,ax,ay,ppu=m.pixelsPerUnit]=m.frames[pose];
 const [sw,sh]=m.dimensions?.[file]||[m.width,m.height];
 if(!(ppu>0&&w>0&&h>0&&x>=0&&y>=0&&x+w<=sw&&y+h<=sh))return null;
 const k=100/(3*ppu);
 return Object.freeze({pose,path:m.files[file],source:Object.freeze([x,y,w,h]),
  sheet:Object.freeze([sw,sh]),width:w*k,height:h*k,left:50-ax*k,top:88-ay*k,
  backgroundWidth:100*sw/w,backgroundHeight:100*sh/h,
  backgroundX:sw===w?0:100*x/(sw-w),backgroundY:sh===h?0:100*y/(sh-h),
  pixelsPerUnit:ppu,anchor:Object.freeze([ax,ay]),ready:false});
}

export function expeditionNativeSequence(unit,units,events,sequence){
 if(!sequence||!expeditionNativeMotion(unit?.speciesId))return null;
 const fx=expeditionUnitFeedback(unit,units,events),entry=expeditionNativeMotion(unit.speciesId);
 const ops=unit.actions?.[fx.action]||getExpeditionSpecies(unit.speciesId)?.actionPattern?.[fx.action]||[];
 const defensive=ops.length>0&&ops.every(op=>['protection','counter'].includes(op.type));
 const phases=Object.fromEntries(['preparation','impact','rest'].map(phase=>{
  let pose=sequence[phase].pose;
  if(phase==='impact'&&!fx.hit&&defensive)pose=6;
  if(phase==='impact'&&fx.action==='attack'&&!fx.hit&&pose>=1&&pose<=3)
   pose=nativeActionFrame({char:entry.id,state:'attack',step:pose-1,hitDone:true},pose);
  return [phase,expeditionNativeFrame(unit.speciesId,pose)];
 }));
 return Object.values(phases).every(Boolean)?Object.freeze({animate:sequence.animate,duration:sequence.duration,...phases}):null;
}

export function expeditionNativeSpriteMarkup(speciesId,sequence,assetUrl,delay=0){
 if(!sequence?.rest)return '';
 const phases=sequence.animate?['preparation','impact','rest']:['rest'];
 const frames=phases.map(phase=>{
  const f=sequence[phase],url=assetUrl(f.path);
  return `<i data-native-phase="${phase}" data-native-pose="${f.pose}" style="width:${f.width}%;height:${f.height}%;left:${f.left}%;top:${f.top}%;background-image:url('${url}');background-size:${f.backgroundWidth}% ${f.backgroundHeight}%;background-position:${f.backgroundX}% ${f.backgroundY}%"></i>`;
 }).join('');
 return `<span class="exv-native-motion${sequence.animate?' exv-native-sequence':''}" data-native-species="${speciesId}" style="--feedback-delay:${Number.isFinite(delay)?delay:0}ms" aria-hidden="true">${frames}</span>`;
}
