import {createMusicBank,createEffectBank,effectAtlasLayout} from './audio-assets.js';
// Material SFX are authored offline into one lazy mono atlas. Their original
// oscillator palette and lightweight score remain offline/decode fallbacks.
export const AUDIO_EVENTS=Object.freeze({
 shot:{wave:'triangle',freq:690,end:420,duration:.055,gain:.022,cooldown:.085,priority:0,noise:.12},
 shotCrystal:{wave:'sine',freq:660,end:940,duration:.12,gain:.026,cooldown:.1,priority:0,notes:[1,1.5]},
 shotPetal:{wave:'triangle',freq:480,end:620,duration:.11,gain:.026,cooldown:.1,priority:0,notes:[1,1.18]},
 shotArc:{wave:'square',freq:720,end:360,duration:.105,gain:.021,cooldown:.1,priority:0,notes:[1,1.5]},
 shotOrbit:{wave:'sine',freq:240,end:520,duration:.15,gain:.025,cooldown:.13,priority:0,notes:[1,1.26]},
 shotPierce:{wave:'triangle',freq:930,end:310,duration:.13,gain:.029,cooldown:.11,priority:0},
 shotBurst:{wave:'triangle',freq:410,end:120,duration:.14,gain:.029,cooldown:.13,priority:0,notes:[1,.7],noise:.28},
 shotReturn:{wave:'triangle',freq:390,end:760,duration:.18,gain:.026,cooldown:.13,priority:0,notes:[1,.75]},
 shotGravity:{wave:'sine',freq:118,end:54,duration:.21,gain:.034,cooldown:.15,priority:0,notes:[1,.5]},
 shotFrost:{wave:'sine',freq:790,end:1040,duration:.16,gain:.025,cooldown:.13,priority:0,notes:[1,1.5]},
 shotPortal:{wave:'sine',freq:150,end:690,duration:.23,gain:.032,cooldown:.16,priority:0,notes:[1,.5,2]},
 hit:{wave:'triangle',freq:560,end:190,duration:.055,gain:.029,cooldown:.05,priority:0,noise:.2},
 gravityHit:{wave:'sine',freq:92,end:48,duration:.16,gain:.052,cooldown:.11,priority:1,notes:[1,.5]},
 burstHit:{wave:'triangle',freq:420,end:90,duration:.18,gain:.048,cooldown:.1,priority:1,notes:[1,.67],noise:.42},
 pierceHit:{wave:'triangle',freq:960,end:410,duration:.085,gain:.039,cooldown:.09,priority:1,noise:.18},
 frostHit:{wave:'triangle',freq:1320,end:520,duration:.14,gain:.037,cooldown:.11,priority:1,notes:[1,1.48,2],noise:.3},
 split:{wave:'triangle',freq:520,end:760,duration:.12,gain:.045,cooldown:.12,priority:1,notes:[1,1.28]},
 chain:{wave:'triangle',freq:1080,end:520,duration:.09,gain:.036,cooldown:.09,priority:1,notes:[1,1.5],noise:.28},
 reflect:{wave:'triangle',freq:760,end:1120,duration:.1,gain:.04,cooldown:.09,priority:1,notes:[1,1.33]},
 portal:{wave:'sine',freq:120,end:540,duration:.22,gain:.052,cooldown:.16,priority:1,notes:[1,.5,2]},
 dash:{wave:'triangle',freq:190,end:440,duration:.13,gain:.035,cooldown:.18,priority:1,noise:.18},
 select:{wave:'sine',freq:392,end:587,duration:.13,gain:.045,cooldown:.14,priority:2,notes:[1,1.5]},
 harvest:{wave:'sine',freq:587,end:880,duration:.24,gain:.055,cooldown:.2,priority:2,notes:[1,1.25,1.5]},
 build:{wave:'triangle',freq:196,end:392,duration:.3,gain:.058,cooldown:.25,priority:2,notes:[1,1.5,2],noise:.12},
 repair:{wave:'sine',freq:329,end:659,duration:.34,gain:.052,cooldown:.3,priority:2,notes:[1,1.25,1.5]},
 pickup:{wave:'sine',freq:560,end:920,duration:.18,gain:.055,cooldown:.2,priority:2,notes:[1,1.26,1.6]},
 hurt:{wave:'triangle',freq:330,end:110,duration:.22,gain:.06,cooldown:.3,priority:2,notes:[1,.76],noise:.28},
 evolve:{wave:'sine',freq:330,end:990,duration:.48,gain:.065,cooldown:.45,priority:3,notes:[1,1.25,1.5,2]},
 fusion:{wave:'triangle',freq:220,end:880,duration:.58,gain:.075,cooldown:.5,priority:3,notes:[1,1.5,2]},
 ultimateReady:{wave:'sine',freq:440,end:880,duration:.38,gain:.06,cooldown:1,priority:3,notes:[1,1.5,2]},
 ultimate:{wave:'triangle',freq:190,end:820,duration:.72,gain:.075,cooldown:.6,priority:4,notes:[1,.5,2],noise:.28},
 ultimateBurst:{wave:'triangle',freq:230,end:830,duration:.62,gain:.078,cooldown:.55,priority:4,notes:[.5,1,1.5],noise:.52},
 ultimateRain:{wave:'triangle',freq:880,end:170,duration:.78,gain:.072,cooldown:.55,priority:4,notes:[1,1.19,1.5]},
 ultimateOrbit:{wave:'sine',freq:170,end:690,duration:.86,gain:.08,cooldown:.55,priority:4,notes:[1,1.5,2.02]},
 ultimateBeam:{wave:'triangle',freq:150,end:1180,duration:.74,gain:.078,cooldown:.55,priority:4,notes:[1,2,3],noise:.22},
 ultimateDomain:{wave:'sine',freq:138,end:415,duration:.92,gain:.085,cooldown:.55,priority:4,notes:[1,.667,1.5,2]},
 ultimateBlackhole:{wave:'sine',freq:68,end:32,duration:1.05,gain:.1,cooldown:.55,priority:4,notes:[1,1.414,2]},
 ultimateTimeStop:{wave:'square',freq:960,end:120,duration:.58,gain:.055,cooldown:.55,priority:4,notes:[1,.75,.5]},
 finale:{wave:'triangle',freq:90,end:45,duration:.75,gain:.095,cooldown:.65,priority:4,notes:[1,1.5,.5]},
 bossWarning:{wave:'triangle',freq:196,end:147,duration:.28,gain:.052,cooldown:.42,priority:3,notes:[1,.75],noise:.16},
 bossAttack:{wave:'triangle',freq:390,end:100,duration:.26,gain:.065,cooldown:.22,priority:3,notes:[1,.5],noise:.42},
 bossDefeat:{wave:'triangle',freq:180,end:720,duration:.9,gain:.09,cooldown:1,priority:4,notes:[1,1.25,1.5,2]}
});

const ULTIMATE_AUDIO=Object.freeze({BURST:'ultimateBurst',RAIN:'ultimateRain',ORBIT:'ultimateOrbit',BEAM:'ultimateBeam',DOMAIN:'ultimateDomain',BLACKHOLE:'ultimateBlackhole',TIME_STOP:'ultimateTimeStop'});
const ULTIMATE_ACCENTS=Object.freeze({ultimate:1.5,ultimateBurst:2,ultimateRain:1.5,ultimateOrbit:1.26,ultimateBeam:2.5,ultimateDomain:1.33,ultimateBlackhole:.75,ultimateTimeStop:2});
export const ultimateAudioEvent=archetype=>ULTIMATE_AUDIO[archetype]||'ultimate';

// Sixteen eighth-note phrases. One short voice per note replaces the old
// always-on drone; different acts keep their own rhythm without audio files.
const score=(root,bpm,chords,melody,{gain=.27,pulse=[0,4,8,12],hat=[]}={})=>Object.freeze({
 root,bpm,step:30/bpm,gain,chords:Object.freeze(chords),melody:Object.freeze(melody),pulse:Object.freeze(pulse),hat:Object.freeze(hat)
});
export const MUSIC_SCENES=Object.freeze({
 garden:score(146.83,84,[[0,7],[2,9],[-3,4],[0,7]],[12,null,14,null,16,null,14,null,12,null,9,null,7,null,9,null],{gain:.22,pulse:[0,8]}),
 combat:score(110,118,[[0,7],[-2,5],[-5,2],[-2,5]],[12,null,15,12,null,10,12,null,17,null,15,12,null,10,7,null],{hat:[2,6,10,14]}),
 combat2:score(123.47,132,[[0,7],[5,12],[-2,5],[3,10]],[12,null,14,16,null,19,16,null,14,null,12,9,null,12,14,null],{gain:.26,hat:[2,6,10,14]}),
 combat3:score(130.81,148,[[0,7],[-3,4],[-5,2],[-2,5]],[19,16,14,null,19,21,19,null,16,14,12,14,16,null,12,null],{gain:.27,hat:[1,3,5,7,9,11,13,15]}),
 boss:score(82.41,132,[[0,6],[-2,5],[-4,3],[-1,6]],[12,null,13,null,18,13,null,11,12,null,16,13,null,11,8,null],{gain:.28,hat:[2,6,10,14]}),
 boss2:score(98,146,[[0,7],[3,10],[-2,5],[-5,2]],[12,null,16,19,16,null,14,null,12,14,16,null,19,16,14,null],{gain:.28,hat:[2,6,10,14]}),
 boss3:score(110,158,[[0,6],[-3,4],[-5,2],[-2,5]],[19,18,15,null,19,22,18,null,15,13,12,15,18,null,12,null],{gain:.3,hat:[1,3,5,7,9,11,13,15]}),
 crosswind:score(130.81,132,[[0,7],[5,12],[-2,5],[0,7]],[12,null,16,19,null,16,14,null,12,null,14,16,19,null,14,null],{gain:.24,hat:[2,6,10,14]}),
 crosswindBoss:score(98,144,[[0,7],[-2,5],[3,10],[-5,2]],[12,null,19,16,null,14,12,null,16,19,14,null,12,14,16,null],{gain:.27,hat:[2,6,10,14]}),
 crystalGorge:score(146.83,112,[[0,7],[-3,4],[5,12],[0,7]],[12,null,14,16,null,14,12,null,19,null,16,14,12,null,7,null],{gain:.24,pulse:[0,4,8,12]}),
 crystalGorgeBoss:score(82.41,136,[[0,7],[-2,5],[-5,2],[-3,4]],[12,15,null,19,15,null,12,null,17,15,12,null,10,12,15,null],{gain:.28,hat:[2,6,10,14]})
});

export function musicSceneFor(region,{boss=false,mirror=false}={}){
 if(mirror)return 'boss';
 if(region==='crosswind')return boss?'crosswindBoss':'crosswind';
 if(region==='crystalGorge')return boss?'crystalGorgeBoss':'crystalGorge';
 if(region==='skyway')return boss?'boss3':'combat3';
 if(region==='stadium')return boss?'boss2':'combat2';
 return boss?'boss':'combat';
}

export function createAudioLimiter({maxVoices=12,now=()=>performance.now()}={}){
 const last=new Map(),families=new Map(),live=new Set();let next=1;
 function begin(id,spec=AUDIO_EVENTS[id]){
  if(!spec)return null;
  const time=now(),previous=last.get(id)??-Infinity;
  if(time-previous<(spec.cooldown||0)*1000)return null;
  const family=id.startsWith('shot')?'shot':/^(hit|.*Hit|split|chain|reflect|portal)$/.test(id)?'impact':null;
  if(family&&time-(families.get(family)??-Infinity)<(family==='shot'?55:42))return null;
  // Important cues may briefly exceed the ordinary budget, but even an
  // ultimate cannot create an unbounded number of oscillators.
  const ceiling=maxVoices+(spec.priority>=3?3:0);
  if(live.size>=ceiling)return null;
  const token=next++;live.add(token);last.set(id,time);if(family)families.set(family,time);return token;
 }
 return {begin,end:token=>live.delete(token),reset(){last.clear();families.clear();live.clear();},state:()=>({voices:live.size,maxVoices,last:Object.fromEntries(last)})};
}

export function createGameAudio({AudioContextCtor=globalThis.AudioContext||globalThis.webkitAudioContext,now=()=>performance.now(),baseUrl='./',fetcher=globalThis.fetch}={}){
 const limiter=createAudioLimiter({maxVoices:12,now}),unlockTargets=new Map(),fallbackNodes=new Set();let ctx=null,master=null,sfxBus=null,musicBus=null,musicBank=null,effectBank=null,noiseBuffer=null,muted=false,paused=false,unlocked=false,musicScene='garden',musicClock=0,musicStep=0,duckUntil=0,variation=0,musicIntensity=1;
 const musicGain=()=>MUSIC_SCENES[musicScene].gain*musicIntensity*(duckUntil?.56:1);
 function applyMusicGain(fade){if(musicBus&&ctx)musicBus.gain.setTargetAtTime(musicGain(),ctx.currentTime,fade);}
 // Gain only: no source, decode, fetch, timer or autoplay side effect.
 function setMusicIntensity(value){if(!Number.isFinite(value))return musicIntensity;const next=Math.max(.25,Math.min(1,value));if(next!==musicIntensity){musicIntensity=next;applyMusicGain(.18);}return musicIntensity;}
 function ensure(){
  if(ctx||!AudioContextCtor)return Boolean(ctx);
  try{
   ctx=new AudioContextCtor();master=ctx.createGain();master.gain.value=.72;
   if(ctx.createDynamicsCompressor){const compressor=ctx.createDynamicsCompressor();compressor.threshold.value=-18;compressor.knee.value=12;compressor.ratio.value=3;compressor.attack.value=.004;compressor.release.value=.16;master.connect(compressor).connect(ctx.destination);}else master.connect(ctx.destination);
   sfxBus=ctx.createGain();sfxBus.gain.value=.9;sfxBus.connect(master);
   musicBus=ctx.createGain();musicBus.gain.value=musicGain();musicBus.connect(master);
   musicBank=createMusicBank({ctx,bus:musicBus,baseUrl,fetcher});
   effectBank=createEffectBank({ctx,bus:sfxBus,cues:effectAtlasLayout(AUDIO_EVENTS).cues,baseUrl,fetcher});
   if(ctx.createBuffer){noiseBuffer=ctx.createBuffer(1,Math.ceil((ctx.sampleRate||44100)*.35),ctx.sampleRate||44100);const data=noiseBuffer.getChannelData(0);let seed=7819;for(let i=0;i<data.length;i++){seed=(seed*1664525+1013904223)>>>0;data[i]=(seed/2147483648-1);}}
   return true;
  }catch{return false;}
 }
 function noise(at,duration,volume,bus=sfxBus){
  if(!noiseBuffer||!ctx.createBufferSource||!ctx.createBiquadFilter)return;
  const source=ctx.createBufferSource(),filter=ctx.createBiquadFilter(),gain=ctx.createGain(),item={oscillator:source,gain,filter};fallbackNodes.add(item);source.buffer=noiseBuffer;filter.type='highpass';filter.frequency.value=2200;gain.gain.setValueAtTime(.0001,at);gain.gain.linearRampToValueAtTime(volume,at+.003);gain.gain.exponentialRampToValueAtTime(.0001,at+duration);source.connect(filter).connect(gain).connect(bus);source.onended=()=>{fallbackNodes.delete(item);source.disconnect();filter.disconnect();gain.disconnect();};source.start(at);source.stop(at+duration+.005);
 }
 function note(freq,at,duration,volume,wave='sine',bus=musicBus){
  const osc=ctx.createOscillator(),gain=ctx.createGain(),item={oscillator:osc,gain};fallbackNodes.add(item);osc.type=wave;osc.frequency.setValueAtTime(Math.max(32,freq),at);gain.gain.setValueAtTime(.0001,at);gain.gain.exponentialRampToValueAtTime(Math.max(.0002,volume),at+.006);gain.gain.exponentialRampToValueAtTime(.0001,at+duration);osc.connect(gain).connect(bus);osc.onended=()=>{fallbackNodes.delete(item);osc.disconnect();gain.disconnect();};osc.start(at);osc.stop(at+duration+.01);
 }
 function musicBeat(){
  const scene=MUSIC_SCENES[musicScene],step=musicStep++%16,chord=scene.chords[Math.floor(step/4)],at=ctx.currentTime;
  const pitch=semitones=>scene.root*2**(semitones/12);
  if(step%4===0){note(pitch(chord[0]-12),at,scene.step*2.7,.12,'sine');note(pitch(chord[1]),at,scene.step*3.6,.07,'triangle');}
  if(scene.pulse.includes(step))note(pitch(chord[0]-12),at,scene.step*.65,.055,'triangle');
  const melody=scene.melody[step];if(melody!==null)note(pitch(chord[0]+melody),at,scene.step*.88,.085,step%4===0?'sine':'triangle');
  if(scene.hat.includes(step))noise(at,.026,.045,musicBus);
 }
 async function unlock(){
  if(paused||globalThis.document?.hidden)return false;
  if(!ensure())return false;
  try{if(ctx.state!=='running')await ctx.resume();if(paused||globalThis.document?.hidden){await ctx.suspend();return false;}unlocked=ctx.state==='running';musicBank?.update(musicScene,unlocked&&!muted);return unlocked;}catch{return false;}
 }
 function play(id,{intensity=1,pitch=1}={}){
  const spec=AUDIO_EVENTS[id];if(!spec||muted||paused||globalThis.document?.hidden||!unlocked||!ctx||ctx.state!=='running')return false;
  const token=limiter.begin(id,spec);if(token===null)return false;
  const start=ctx.currentTime,level=Math.max(.1,Math.min(1.4,intensity))*spec.gain;
  if(spec.priority>=3){duckUntil=Math.max(duckUntil,now()+Math.min(1000,spec.duration*1000+120));musicBus.gain.cancelScheduledValues?.(start);applyMusicGain(.022);}
  const variedPitch=Math.max(.5,Math.min(2,pitch))*(spec.priority<=1?1+([-1,0,1,0][variation++%4])*.018:1);
  effectBank?.warm();
  if(effectBank?.play(id,{at:start,volume:level*1.9,pitch:variedPitch,onended:()=>limiter.end(token)}))return true;
  const ratios=spec.notes||[1],volume=level/Math.sqrt(ratios.length);let left=ratios.length;
  try{
   ratios.forEach((ratio,index)=>{
    const delay=index*(spec.priority>=3?.045:.018),duration=spec.duration*(1-index*.035),at=start+delay;
    const oscillator=ctx.createOscillator(),gain=ctx.createGain();oscillator.type=spec.wave;
    oscillator.frequency.setValueAtTime(Math.max(30,spec.freq*ratio*pitch),at);
    oscillator.frequency.exponentialRampToValueAtTime(Math.max(30,spec.end*ratio*pitch),at+duration);
    gain.gain.setValueAtTime(.0001,at);gain.gain.exponentialRampToValueAtTime(Math.max(.0002,volume),at+.008);
    gain.gain.exponentialRampToValueAtTime(.0001,at+duration);
    const item={oscillator,gain};fallbackNodes.add(item);oscillator.connect(gain).connect(sfxBus);oscillator.onended=()=>{fallbackNodes.delete(item);oscillator.disconnect();gain.disconnect();if(--left===0)limiter.end(token);};
    oscillator.start(at);oscillator.stop(at+duration+.015);
   });
   if(spec.noise)noise(start,Math.min(.14,spec.duration*.48),volume*spec.noise);
   if(Object.hasOwn(ULTIMATE_ACCENTS,id))note(Math.max(80,spec.end*ULTIMATE_ACCENTS[id]),start+spec.duration*.62,.16,volume*.36,'sine',sfxBus);
  }catch{limiter.end(token);return false;}
  return true;
 }
 function stopEffects(){effectBank?.stop();for(const {oscillator,gain,filter} of fallbackNodes){oscillator.onended=null;try{oscillator.stop();}catch{}oscillator.disconnect();gain.disconnect();filter?.disconnect();}fallbackNodes.clear();limiter.reset();duckUntil=0;applyMusicGain(.06);}
 function installUnlock(target=document){
  if(unlockTargets.has(target))return unlockTargets.get(target).wake;
  const wake=()=>{void unlock();};
  const visibility=()=>{if(target.hidden){stopEffects();musicBank?.update(musicScene,false);if(ctx)void ctx.suspend().catch(()=>{});}else if(unlocked&&!paused)void unlock();};
  target.addEventListener('pointerdown',wake,{capture:true,passive:true});target.addEventListener('keydown',wake,{capture:true,passive:true});target.addEventListener('visibilitychange',visibility);unlockTargets.set(target,{wake,visibility});return wake;
 }
 function setScene(id){const next=Object.hasOwn(MUSIC_SCENES,id)?id:'garden',changed=next!==musicScene,soft=musicIntensity!==1;musicIntensity=1;if(changed){musicScene=next;musicClock=0;musicStep=0;}if(changed||soft)applyMusicGain(.16);musicBank?.update(musicScene,unlocked&&!paused&&!muted&&!globalThis.document?.hidden);return musicScene;}
 function tick(dt){
  if(duckUntil&&now()>=duckUntil){duckUntil=0;applyMusicGain(.18);}
  if(!unlocked||paused||muted||globalThis.document?.hidden||!ctx||ctx.state!=='running'||musicBank?.playing())return;
  const scene=MUSIC_SCENES[musicScene];musicClock+=Math.max(0,Math.min(.1,dt));if(musicClock<scene.step)return;musicClock-=scene.step;musicBeat();
 }
 async function setPaused(value){paused=Boolean(value);if(!ctx)return;if(paused){stopEffects();musicBank?.update(musicScene,false);try{await ctx.suspend();}catch{}}else await unlock();}
 return {unlock,play,installUnlock,setPaused,setScene,setMusicIntensity,tick,setMuted(value){muted=Boolean(value);if(muted)stopEffects();if(master)master.gain.value=muted?0:.72;musicBank?.update(musicScene,unlocked&&!muted&&!paused&&!globalThis.document?.hidden);},reset(){stopEffects();setMusicIntensity(1);musicClock=0;musicBank?.reset();effectBank?.reset();},dispose(){stopEffects();musicBank?.reset();effectBank?.reset();for(const [target,{wake,visibility}] of unlockTargets){target.removeEventListener('pointerdown',wake,true);target.removeEventListener('keydown',wake,true);target.removeEventListener('visibilitychange',visibility);}unlockTargets.clear();limiter.reset();void ctx?.close?.();unlocked=false;},state:()=>({supported:Boolean(AudioContextCtor),contextState:ctx?.state||'uninitialized',unlocked,muted,paused,musicScene,musicStep,musicIntensity,musicDucked:Boolean(duckUntil),...(effectBank?.state()||{sfxReady:false,sfxLoading:false,sfxError:null,sfxSources:0,sfxBytes:0}),...(musicBank?.state()||{loadedMusic:null,loadingMusic:null,musicError:null,musicBuffers:0,musicSources:0,musicBytes:0}),...limiter.state()})};
}
