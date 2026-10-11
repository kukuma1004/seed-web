// Small processed excerpts of the existing review soundtrack. Fetch one scene
// after gesture unlock; missing/unavailable files retain procedural music.
export const MUSIC_ASSETS=Object.freeze({
 garden:'garden-loop.mp3',combat:'act1-combat-loop.mp3',boss:'act1-boss-loop.mp3',
 combat2:'act2-stadium-loop.mp3',boss2:'act2-boss-loop.mp3',combat3:'act3-skyway-loop.mp3',boss3:'act3-boss-loop.mp3',
 crosswind:'act4-crosswind-loop.mp3',crosswindBoss:'act4-boss-loop.mp3',
 crystalGorge:'act5-crystal-gorge-loop.mp3',crystalGorgeBoss:'act5-crystal-gardener-loop.mp3'
});

// At most two decoded mono tracks and two sources during a short transition.
// Old fetch/decode completions cannot restart a muted, paused or newer scene.
export function createMusicBank({ctx,bus,baseUrl='./',fetcher=globalThis.fetch}={}){
 const buffers=new Map();let scene=null,enabled=false,epoch=0,controller=null,loading=null,active=null,fading=null,error=null;
 function disposeNode(item){
  if(!item)return;item.source.onended=null;
  try{item.source.stop();}catch{}try{item.source.disconnect();item.gain.disconnect();}catch{}
 }
 function cancel(){epoch++;controller?.abort();controller=null;loading=null;}
 function trim(keep){for(const key of buffers.keys())if(key!==keep)buffers.delete(key);}
 function stop(){disposeNode(active);disposeNode(fading);active=null;fading=null;}
 function start(id,buffer){
  if(!enabled||scene!==id||ctx.state!=='running')return;
  disposeNode(fading);fading=null;
  const source=ctx.createBufferSource(),gain=ctx.createGain(),at=ctx.currentTime;
  source.buffer=buffer;source.loop=true;source.loopStart=0;source.loopEnd=buffer.duration;
  gain.gain.setValueAtTime(.0001,at);gain.gain.linearRampToValueAtTime(.65,at+.24);
  source.connect(gain).connect(bus);
  if(active){
   fading=active;active=null;const retiring=fading;
   retiring.gain.gain.cancelScheduledValues?.(at);retiring.gain.gain.setValueAtTime(.65,at);retiring.gain.gain.linearRampToValueAtTime(.0001,at+.24);
   retiring.source.onended=()=>{retiring.source.disconnect();retiring.gain.disconnect();if(fading===retiring)fading=null;};
   try{retiring.source.stop(at+.25);}catch{disposeNode(retiring);fading=null;}
  }
  active={id,source,gain};source.start(at);
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
 return {update,playing:()=>Boolean(active),reset(){cancel();stop();buffers.clear();enabled=false;scene=null;error=null;},state:()=>({loadedMusic:active?.id||null,loadingMusic:loading,musicError:error,musicBuffers:buffers.size,musicSources:Number(Boolean(active))+Number(Boolean(fading)),musicBytes:[...buffers.values()].reduce((sum,b)=>sum+b.length*b.numberOfChannels*4,0)})};
}
