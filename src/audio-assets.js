// Small processed excerpts of the existing review soundtrack. Fetch one scene
// after gesture unlock; missing/unavailable files retain procedural music.
export const MUSIC_ASSETS=Object.freeze({
 garden:'garden-loop.mp3',combat:'act1-combat-loop.mp3',boss:'act1-boss-loop.mp3',
 combat2:'act2-stadium-loop.mp3',boss2:'act2-boss-loop.mp3',combat3:'act3-skyway-loop.mp3',boss3:'act3-boss-loop.mp3',
 crosswind:'act4-crosswind-loop.mp3',crosswindBoss:'act4-boss-loop.mp3',
 crystalGorge:'act5-crystal-gorge-loop.mp3',crystalGorgeBoss:'act5-crystal-gardener-loop.mp3'
});

// Locally authored sound design: the renderer is used offline by
// tools/audio-palette-render.mjs, never in the animation loop. One small mono
// atlas replaces layered live oscillators once its first-event load completes.
export const SFX_SAMPLE_RATE=22050;
export const SFX_ATLAS='seed-botanical-palette-v1.wav';
export function effectAtlasLayout(events){
 const cues={};let frame=0;
 for(const [id,spec] of Object.entries(events)){
  const length=Math.ceil((spec.duration+(spec.priority>=3?.12:.065))*SFX_SAMPLE_RATE);
  cues[id]=Object.freeze({offset:frame/SFX_SAMPLE_RATE,duration:length/SFX_SAMPLE_RATE,length});frame+=length+Math.ceil(.025*SFX_SAMPLE_RATE);
 }
 return {cues:Object.freeze(cues),frames:frame};
}
export function renderBotanicalEffect(id,spec){
 const duration=effectAtlasLayout({[id]:spec}).cues[id].duration,out=new Float32Array(Math.ceil(duration*SFX_SAMPLE_RATE));
 const isUltimate=id.startsWith('ultimate')&&id!=='ultimateReady',soft=/^(select|pickup|harvest|repair|evolve|fusion|ultimateReady|bossDefeat)$/.test(id);
 const material=/Gravity|gravity|Blackhole|portal|Portal/.test(id)?'gravity':/Frost|frost|Crystal|reflect|TimeStop/.test(id)?'glass':/chain|Arc|Beam/.test(id)?'electric':/Burst|burst|bossAttack|finale/.test(id)?'burst':id==='build'||id==='bossWarning'?'wood':soft?'bloom':'leaf';
 const partials=material==='glass'?[1,2.71,4.09,5.43]:material==='bloom'?[1,1.5,2,3]:[1,2,3,4];
 let seed=[...id].reduce((s,c)=>((s*31+c.charCodeAt(0))>>>0),7919),low=0,phase=0,peak=0;
 const noise=()=>{seed=(seed*1664525+1013904223)>>>0;return seed/2147483648-1;};
 for(let i=0;i<out.length;i++){
  const t=i/SFX_SAMPLE_RATE,u=t/duration,attack=Math.min(1,t/(soft?.008:.004)),tail=Math.max(0,1-u)**(soft?2.4:1.7);
  const raw=noise();low+=.12*(raw-low);const high=raw-low;
  const sweep=spec.freq*(spec.end/spec.freq)**Math.min(1,t/spec.duration);phase+=2*Math.PI*sweep/SFX_SAMPLE_RATE;
  let value=0;
  if(material==='leaf'){
   const air=Math.sin(Math.PI*Math.min(1,t/spec.duration))**1.3;
   value=.43*low*air+.15*high*Math.exp(-t*45)+.28*Math.sin(phase)*Math.exp(-t*14)+.10*Math.sin(phase*2.02)*Math.exp(-t*25);
   if(id==='shotReturn'||id==='dash')value+=.24*low*Math.sin(Math.PI*u);
   if(id==='split')value+=.2*Math.sin(phase*1.28)*Math.exp(-t*9)*(Math.sin(t*110)>.1?1:.25);
  }else if(material==='glass'){
   for(let p=0;p<partials.length;p++)value+=Math.sin(2*Math.PI*spec.freq*partials[p]*t)*(.40/(p+1))*Math.exp(-t*(5+p*6));
   value+=.15*high*Math.exp(-t*70);
   if(/Frost|frost/.test(id))value+=.28*high*Math.exp(-t*13)*Math.max(0,Math.sin(t*390));
   if(id==='ultimateTimeStop')value*=u<.62?1:Math.max(0,(.8-u)/.18);
  }else if(material==='electric'){
   const crackle=Math.max(.08,Math.sin(t*280)*Math.sin(t*117));
   value=.24*Math.sin(phase)+.11*Math.sin(phase*2.48)+.52*high*crackle*Math.exp(-t*10);
   if(id==='ultimateBeam')value+=.2*Math.sin(phase*1.007)*Math.sin(Math.PI*u);
  }else if(material==='burst'){
   value=.72*low*Math.exp(-t*13)+.12*high*Math.exp(-t*55)+.43*Math.sin(phase*.5)*Math.exp(-t*8);
   if(isUltimate||id==='finale')value+=.30*low*Math.exp(-t*3)*(Math.sin(t*90)>0?1:.3);
  }else if(material==='gravity'){
   value=.46*Math.sin(phase*.5)+.2*Math.sin(phase*1.007)+.13*Math.sin(phase*3.01)+.16*low;
   value*=.65+.35*Math.sin(t*19);
   if(id==='ultimateBlackhole')value+=.32*low*Math.sin(Math.PI*u)**2;
  }else if(material==='wood'){
   for(const delay of id==='build'?[0,.07,.135]:[0,.13])if(t>=delay){const q=t-delay;value+=.37*Math.sin(2*Math.PI*(id==='build'?260:146)*q)*Math.exp(-q*42)+.22*low*Math.exp(-q*65);}
   if(id==='build')value+=.18*Math.sin(2*Math.PI*784*t)*Math.exp(-Math.max(0,t-.15)*13)*Math.min(1,Math.max(0,t-.15)*60);
  }else{
   const melody=spec.notes||[1];for(let p=0;p<melody.length;p++){const delay=p*(id==='bossDefeat'?.09:.033),q=t-delay;if(q<0)continue;const frequency=spec.freq*melody[p];value+=.42/Math.sqrt(melody.length)*(Math.sin(2*Math.PI*frequency*q)+.25*Math.sin(2*Math.PI*frequency*2*q))*Math.exp(-q*(id==='repair'?6:9))*Math.min(1,q*220);}
  }
  if(isUltimate&&material==='leaf')value+=.20*Math.sin(2*Math.PI*spec.freq*.5*t)*Math.sin(Math.PI*u);
  const sample=value*attack*tail;out[i]=sample;peak=Math.max(peak,Math.abs(sample));
 }
 const scale=peak>0?.76/peak:1;for(let i=0;i<out.length;i++)out[i]*=scale;
 // Exact quiet boundaries keep repeated hits and atlas seeks click-free.
 out[0]=0;out[out.length-1]=0;return out;
}

export function createEffectBank({ctx,bus,cues,baseUrl='./',fetcher=globalThis.fetch}={}){
 let buffer=null,loading=null,controller=null,error=null,epoch=0;const sources=new Set();
 function reset(){epoch++;controller?.abort();controller=null;loading=null;buffer=null;error=null;for(const item of [...sources]){try{item.source.stop();}catch{}finish(item);}}
 function finish(item){if(!sources.delete(item))return;item.source.onended=null;item.source.disconnect();item.gain.disconnect();item.ended?.();}
 function warm(){
  if(buffer||loading||error||!fetcher||!ctx.decodeAudioData||!ctx.createBufferSource)return;
  const ticket=epoch;controller=new AbortController();const prefix=baseUrl.endsWith('/')?baseUrl:baseUrl+'/';
  loading=(async()=>{try{const response=await fetcher(prefix+'assets/audio/sfx/'+SFX_ATLAS,{signal:controller.signal});if(!response.ok)throw new Error('SFX HTTP '+response.status);const bytes=await response.arrayBuffer();if(ticket!==epoch)return;const decoded=await ctx.decodeAudioData(bytes);if(ticket!==epoch)return;const expected=Math.max(...Object.values(cues).map(c=>c.offset+c.duration));if(decoded.duration+.015<expected)throw new Error('SFX atlas is truncated');buffer=decoded;error=null;}catch(cause){if(ticket===epoch&&cause?.name!=='AbortError')error=String(cause?.message||cause);}finally{if(ticket===epoch){loading=null;controller=null;}}})();
 }
 function play(id,{at=ctx.currentTime,volume=1,pitch=1,onended}={}){
  if(!buffer||!cues[id]||ctx.state!=='running')return false;
  const cue=cues[id],source=ctx.createBufferSource(),gain=ctx.createGain(),item={source,gain,ended:onended};source.buffer=buffer;source.playbackRate.value=pitch;gain.gain.value=volume;source.connect(gain).connect(bus);sources.add(item);source.onended=()=>finish(item);
  try{source.start(at,cue.offset,cue.duration);source.stop(at+cue.duration/pitch+.01);return true;}catch{finish(item);return false;}
 }
 return {warm,play,reset,stop(){for(const item of [...sources]){try{item.source.stop();}catch{}finish(item);}},state:()=>({sfxReady:Boolean(buffer),sfxLoading:Boolean(loading),sfxError:error,sfxSources:sources.size,sfxBytes:buffer?buffer.length*buffer.numberOfChannels*4:0})};
}

// At most two decoded mono tracks and two sources during a short transition.
// Old fetch/decode completions cannot restart a muted, paused or newer scene.
export function createMusicBank({ctx,bus,baseUrl='./',fetcher=globalThis.fetch}={}){
 const buffers=new Map(),positions=new Map();let scene=null,enabled=false,epoch=0,controller=null,loading=null,active=null,fading=null,error=null;
 function disposeNode(item){
  if(!item)return;item.source.onended=null;
  try{item.source.stop();}catch{}try{item.source.disconnect();item.gain.disconnect();}catch{}
 }
 function cancel(){epoch++;controller?.abort();controller=null;loading=null;}
 function trim(keep){for(const key of buffers.keys())if(key!==keep){buffers.delete(key);positions.delete(key);}}
 function position(item){if(!item)return 0;const elapsed=item.offset+Math.max(0,ctx.currentTime-item.startedAt);return elapsed<item.duration?elapsed:item.loopStart+(elapsed-item.duration)%(item.duration-item.loopStart);}
 function remember(item){if(item)positions.set(item.id,position(item));}
 function stop(){remember(active);disposeNode(active);disposeNode(fading);active=null;fading=null;}
 function start(id,buffer){
  if(!enabled||scene!==id||ctx.state!=='running')return;
  disposeNode(fading);fading=null;
  const source=ctx.createBufferSource(),gain=ctx.createGain(),at=ctx.currentTime;
  source.buffer=buffer;source.loop=true;source.loopStart=buffer.seedLoopStart||0;source.loopEnd=buffer.duration;
  gain.gain.setValueAtTime(.0001,at);gain.gain.linearRampToValueAtTime(.65,at+.24);
  source.connect(gain).connect(bus);
  if(active){
   remember(active);
   fading=active;active=null;const retiring=fading;
   const current=retiring.gain.gain.value||.65;retiring.gain.gain.cancelScheduledValues?.(at);retiring.gain.gain.setValueAtTime(current,at);retiring.gain.gain.linearRampToValueAtTime(.0001,at+.24);
   retiring.source.onended=()=>{retiring.source.disconnect();retiring.gain.disconnect();if(fading===retiring)fading=null;};
   try{retiring.source.stop(at+.25);}catch{disposeNode(retiring);fading=null;}
  }
  const offset=positions.get(id)||0;active={id,source,gain,offset,startedAt:at,duration:buffer.duration,loopStart:source.loopStart};source.start(at,offset);
 }
 async function load(id){
  if(!fetcher||!ctx.decodeAudioData||!ctx.createBufferSource||!MUSIC_ASSETS[id])return;
  const ticket=epoch;controller=new AbortController();const signal=controller.signal;loading=id;error=null;
  // Remove inactive cached buffers before decoding another long track.
  disposeNode(fading);fading=null;trim(active?.id);
  try{
   const prefix=baseUrl.endsWith('/')?baseUrl:baseUrl+'/';
   const response=await fetcher(prefix+'assets/audio/music/'+MUSIC_ASSETS[id],{signal});
   if(!response.ok)throw new Error('Music HTTP '+response.status);
   const data=await response.arrayBuffer();if(ticket!==epoch||!enabled)return;
   const buffer=await ctx.decodeAudioData(data);if(ticket!==epoch||!enabled||scene!==id)return;
   prepareMusicSeam(buffer);
   buffers.set(id,buffer);while(buffers.size>2)buffers.delete(buffers.keys().next().value);
   loading=null;controller=null;start(id,buffer);
  }catch(cause){if(ticket===epoch){loading=null;controller=null;error=cause?.name==='AbortError'?null:String(cause?.message||cause);if(error)stop();}}
 }
 function update(id,on){
  const next=Boolean(on),changed=id!==scene;
  if(!changed&&next===enabled&&(active?.id===id||loading===id||error))return;
  if(changed||next!==enabled)cancel();scene=id;enabled=next;
  if(!enabled){stop();return;}
  if(active?.id===id||loading===id)return;
  const buffer=buffers.get(id);if(buffer)start(id,buffer);else void load(id);
 }
 return {update,playing:()=>Boolean(active),reset(){cancel();stop();buffers.clear();positions.clear();enabled=false;scene=null;error=null;},state:()=>({loadedMusic:active?.id||null,loadingMusic:loading,musicError:error,musicPosition:active?position(active):positions.get(scene)||0,musicBuffers:buffers.size,musicSources:Number(Boolean(active))+Number(Boolean(fading)),musicBytes:[...buffers.values()].reduce((sum,b)=>sum+b.length*b.numberOfChannels*4,0)})};
}

// Review tracks are excerpts, not newly composed seamless scores. Join only
// their short waveform boundary; don't pretend to reconstruct musical bars.
export function prepareMusicSeam(buffer){
 if(!buffer?.getChannelData||buffer.duration<1)return 0;
 const frames=Math.min(Math.round(buffer.sampleRate*.04),Math.floor(buffer.length/8));
 for(let channel=0;channel<buffer.numberOfChannels;channel++){
  const data=buffer.getChannelData(channel);
  for(let i=0;i<frames;i++){const mix=(i+1)/frames,index=data.length-frames+i;data[index]=data[index]*(1-mix)+data[i]*mix;}
 }
 // End of the splice equals the sample immediately before this loop point.
 buffer.seedLoopStart=frames/buffer.sampleRate;return buffer.seedLoopStart;
}
