// Allocation-light procedural combat audio. SEED deliberately starts with a
// tiny Web Audio palette: no downloaded music or 990 per-combination files.
// Cooldowns and a hard voice budget keep dense late-game builds readable.
export const AUDIO_EVENTS=Object.freeze({
 shot:{wave:'triangle',freq:430,end:250,duration:.065,gain:.025,cooldown:.085,priority:0},
 shotCrystal:{wave:'sine',freq:660,end:940,duration:.12,gain:.026,cooldown:.1,priority:0,notes:[1,1.5]},
 shotPetal:{wave:'triangle',freq:480,end:620,duration:.11,gain:.026,cooldown:.1,priority:0,notes:[1,1.18]},
 shotArc:{wave:'square',freq:720,end:360,duration:.105,gain:.021,cooldown:.1,priority:0,notes:[1,1.5]},
 shotOrbit:{wave:'sine',freq:240,end:520,duration:.15,gain:.025,cooldown:.13,priority:0,notes:[1,1.26]},
 shotPierce:{wave:'triangle',freq:930,end:310,duration:.13,gain:.029,cooldown:.11,priority:0},
 shotBurst:{wave:'sawtooth',freq:190,end:74,duration:.17,gain:.032,cooldown:.13,priority:0,notes:[1,.7]},
 shotReturn:{wave:'triangle',freq:390,end:760,duration:.18,gain:.026,cooldown:.13,priority:0,notes:[1,.75]},
 shotGravity:{wave:'sine',freq:118,end:54,duration:.21,gain:.034,cooldown:.15,priority:0,notes:[1,.5]},
 shotFrost:{wave:'sine',freq:790,end:1040,duration:.16,gain:.025,cooldown:.13,priority:0,notes:[1,1.5]},
 shotPortal:{wave:'sine',freq:150,end:690,duration:.23,gain:.032,cooldown:.16,priority:0,notes:[1,.5,2]},
 hit:{wave:'sine',freq:180,end:95,duration:.07,gain:.035,cooldown:.05,priority:0},
 gravityHit:{wave:'sine',freq:92,end:48,duration:.16,gain:.052,cooldown:.11,priority:1,notes:[1,.5]},
 burstHit:{wave:'sawtooth',freq:138,end:58,duration:.14,gain:.058,cooldown:.1,priority:1,notes:[1,.67]},
 pierceHit:{wave:'triangle',freq:720,end:260,duration:.1,gain:.043,cooldown:.09,priority:1},
 frostHit:{wave:'sine',freq:880,end:430,duration:.13,gain:.036,cooldown:.11,priority:1,notes:[1,1.5]},
 split:{wave:'triangle',freq:520,end:760,duration:.12,gain:.045,cooldown:.12,priority:1,notes:[1,1.28]},
 chain:{wave:'square',freq:680,end:330,duration:.11,gain:.032,cooldown:.09,priority:1,notes:[1,1.5]},
 reflect:{wave:'triangle',freq:760,end:1120,duration:.1,gain:.04,cooldown:.09,priority:1,notes:[1,1.33]},
 portal:{wave:'sine',freq:120,end:540,duration:.22,gain:.052,cooldown:.16,priority:1,notes:[1,.5,2]},
 dash:{wave:'sawtooth',freq:240,end:720,duration:.12,gain:.04,cooldown:.18,priority:1},
 pickup:{wave:'sine',freq:560,end:920,duration:.18,gain:.055,cooldown:.2,priority:2,notes:[1,1.26,1.6]},
 hurt:{wave:'sawtooth',freq:130,end:70,duration:.18,gain:.07,cooldown:.3,priority:2,notes:[1,.76]},
 evolve:{wave:'sine',freq:330,end:990,duration:.48,gain:.065,cooldown:.45,priority:3,notes:[1,1.25,1.5,2]},
 fusion:{wave:'triangle',freq:220,end:880,duration:.58,gain:.075,cooldown:.5,priority:3,notes:[1,1.5,2]},
 ultimateReady:{wave:'sine',freq:440,end:880,duration:.38,gain:.06,cooldown:1,priority:3,notes:[1,1.5,2]},
 ultimate:{wave:'sawtooth',freq:95,end:620,duration:.72,gain:.085,cooldown:.6,priority:4,notes:[1,.5,2,3]},
 ultimateBurst:{wave:'sawtooth',freq:82,end:760,duration:.62,gain:.082,cooldown:.55,priority:4,notes:[.5,1,1.5,2]},
 ultimateRain:{wave:'triangle',freq:880,end:170,duration:.78,gain:.072,cooldown:.55,priority:4,notes:[1,1.19,1.5]},
 ultimateOrbit:{wave:'sine',freq:170,end:690,duration:.86,gain:.08,cooldown:.55,priority:4,notes:[1,1.5,2.02]},
 ultimateBeam:{wave:'sawtooth',freq:58,end:1180,duration:.74,gain:.078,cooldown:.55,priority:4,notes:[1,2,3]},
 ultimateDomain:{wave:'sine',freq:138,end:415,duration:.92,gain:.085,cooldown:.55,priority:4,notes:[1,.667,1.5,2]},
 ultimateBlackhole:{wave:'sine',freq:68,end:32,duration:1.05,gain:.1,cooldown:.55,priority:4,notes:[1,1.414,2]},
 ultimateTimeStop:{wave:'square',freq:960,end:120,duration:.58,gain:.055,cooldown:.55,priority:4,notes:[1,.75,.5]},
 finale:{wave:'triangle',freq:90,end:45,duration:.75,gain:.095,cooldown:.65,priority:4,notes:[1,1.5,.5]},
 bossWarning:{wave:'square',freq:280,end:220,duration:.22,gain:.055,cooldown:.42,priority:3,notes:[1,.75]},
 bossAttack:{wave:'sawtooth',freq:145,end:72,duration:.3,gain:.075,cooldown:.22,priority:3,notes:[1,.5]},
 bossDefeat:{wave:'triangle',freq:180,end:720,duration:.9,gain:.09,cooldown:1,priority:4,notes:[1,1.25,1.5,2]}
});

const ULTIMATE_AUDIO=Object.freeze({BURST:'ultimateBurst',RAIN:'ultimateRain',ORBIT:'ultimateOrbit',BEAM:'ultimateBeam',DOMAIN:'ultimateDomain',BLACKHOLE:'ultimateBlackhole',TIME_STOP:'ultimateTimeStop'});
export const ultimateAudioEvent=archetype=>ULTIMATE_AUDIO[archetype]||'ultimate';

// A tiny procedural score: two sustained voices and one occasional bell. It
// adds no download, decode, or extra texture memory and changes harmony between
// the garden, ordinary combat and Austin. The sound toggle controls it together
// with effects.
export const MUSIC_SCENES=Object.freeze({
 garden:Object.freeze({root:146.83,ratios:[1,1.5],chords:Object.freeze([[1,1.5],[1.122,1.682],[.89,1.335],[1,1.498]]),bell:[2,2.5,3,2.245],gain:.042,step:3.6}),
 combat:Object.freeze({root:110,ratios:[1,1.498],chords:Object.freeze([[1,1.498],[1.059,1.587],[.89,1.335],[.944,1.414]]),bell:[2,2.245,3,2.67],gain:.036,step:2.8}),
 boss:Object.freeze({root:82.41,ratios:[1,1.414],chords:Object.freeze([[1,1.414],[1.059,1.498],[.944,1.335],[.89,1.26]]),bell:[2,2.378,2.828,1.782],gain:.046,step:2.15})
});

export function createAudioLimiter({maxVoices=12,now=()=>performance.now()}={}){
 const last=new Map(),live=new Set();let next=1;
 function begin(id,spec=AUDIO_EVENTS[id]){
  if(!spec)return null;
  const time=now(),previous=last.get(id)??-Infinity;
  if(time-previous<(spec.cooldown||0)*1000)return null;
  // Important cues may briefly exceed the ordinary budget, but even an
  // ultimate cannot create an unbounded number of oscillators.
  const ceiling=maxVoices+(spec.priority>=3?3:0);
  if(live.size>=ceiling)return null;
  const token=next++;live.add(token);last.set(id,time);return token;
 }
 return {begin,end:token=>live.delete(token),reset(){last.clear();live.clear();},state:()=>({voices:live.size,maxVoices,last:Object.fromEntries(last)})};
}

export function createGameAudio({AudioContextCtor=globalThis.AudioContext||globalThis.webkitAudioContext,now=()=>performance.now()}={}){
 const limiter=createAudioLimiter({maxVoices:12,now});let ctx=null,master=null,musicBus=null,muted=false,paused=false,unlocked=false,musicScene='garden',musicClock=0,musicStep=0,musicVoices=[];
 function ensure(){
  if(ctx||!AudioContextCtor)return Boolean(ctx);
  try{ctx=new AudioContextCtor();master=ctx.createGain();master.gain.value=.78;master.connect(ctx.destination);musicBus=ctx.createGain();musicBus.gain.value=.0001;musicBus.connect(master);return true;}catch{return false;}
 }
 function tuneMusic(){
  if(!ctx||!musicVoices.length)return;const scene=MUSIC_SCENES[musicScene],at=ctx.currentTime;
  const chord=scene.chords?.[musicStep%scene.chords.length]||scene.ratios;
  musicVoices.forEach((voice,index)=>voice.osc.frequency.setTargetAtTime(scene.root*chord[index],at,.8));
  musicBus.gain.setTargetAtTime((paused||muted)?0.0001:scene.gain,at,.7);
 }
 function startMusic(){
  if(!ctx||!unlocked||musicVoices.length)return;
  const scene=MUSIC_SCENES[musicScene];
  scene.ratios.forEach((ratio,index)=>{const osc=ctx.createOscillator(),gain=ctx.createGain();osc.type=index?'triangle':'sine';osc.frequency.value=scene.root*ratio;gain.gain.value=index?.15:.22;osc.connect(gain).connect(musicBus);osc.start();musicVoices.push({osc,gain});});
  tuneMusic();
 }
 async function unlock(){
  if(!ensure())return false;
  try{if(ctx.state!=='running')await ctx.resume();unlocked=ctx.state==='running';if(unlocked)startMusic();return unlocked;}catch{return false;}
 }
 function play(id,{intensity=1,pitch=1}={}){
  const spec=AUDIO_EVENTS[id];if(!spec||muted||paused||!unlocked||!ctx||ctx.state!=='running')return false;
  const token=limiter.begin(id,spec);if(token===null)return false;
  const ratios=spec.notes||[1],start=ctx.currentTime,volume=Math.max(.1,Math.min(1.4,intensity))*spec.gain/Math.sqrt(ratios.length);let left=ratios.length;
  try{
   ratios.forEach((ratio,index)=>{
    const delay=index*(spec.priority>=3?.045:.018),duration=spec.duration*(1-index*.035),at=start+delay;
    const oscillator=ctx.createOscillator(),gain=ctx.createGain();oscillator.type=spec.wave;
    oscillator.frequency.setValueAtTime(Math.max(30,spec.freq*ratio*pitch),at);
    oscillator.frequency.exponentialRampToValueAtTime(Math.max(30,spec.end*ratio*pitch),at+duration);
    gain.gain.setValueAtTime(.0001,at);gain.gain.exponentialRampToValueAtTime(Math.max(.0002,volume),at+.008);
    gain.gain.exponentialRampToValueAtTime(.0001,at+duration);
    oscillator.connect(gain).connect(master);oscillator.onended=()=>{oscillator.disconnect();gain.disconnect();if(--left===0)limiter.end(token);};
    oscillator.start(at);oscillator.stop(at+duration+.015);
   });
  }catch{limiter.end(token);return false;}
  return true;
 }
 function installUnlock(target=document){
  const wake=()=>{unlock();};target.addEventListener('pointerdown',wake,{capture:true,passive:true});target.addEventListener('keydown',wake,{capture:true,passive:true});return wake;
 }
 function setScene(id){musicScene=Object.hasOwn(MUSIC_SCENES,id)?id:'garden';musicClock=0;musicStep=0;tuneMusic();return musicScene;}
 function tick(dt){
  if(!unlocked||paused||muted||!ctx||ctx.state!=='running')return;
  const scene=MUSIC_SCENES[musicScene];musicClock+=Math.max(0,Math.min(.1,dt));if(musicClock<scene.step)return;musicClock-=scene.step;
  const ratio=scene.bell[musicStep%scene.bell.length],at=ctx.currentTime,osc=ctx.createOscillator(),gain=ctx.createGain();musicStep++;tuneMusic();osc.type='sine';osc.frequency.setValueAtTime(scene.root*ratio,at);osc.frequency.exponentialRampToValueAtTime(scene.root*ratio*.997,at+.7);gain.gain.setValueAtTime(.0001,at);gain.gain.exponentialRampToValueAtTime(.12,at+.012);gain.gain.exponentialRampToValueAtTime(.0001,at+.78);osc.connect(gain).connect(musicBus);osc.start(at);osc.stop(at+.82);
 }
 async function setPaused(value){paused=Boolean(value);if(!ctx)return;if(paused){try{await ctx.suspend();}catch{}}else await unlock();tuneMusic();}
 return {unlock,play,installUnlock,setPaused,setScene,tick,setMuted(value){muted=Boolean(value);if(master)master.gain.value=muted?0:.78;tuneMusic();},reset(){limiter.reset();musicClock=0;},state:()=>({supported:Boolean(AudioContextCtor),unlocked,muted,paused,musicScene,musicVoices:musicVoices.length,...limiter.state()})};
}
