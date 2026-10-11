import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {AUDIO_EVENTS,createGameAudio} from '../src/audio.js';
import {SFX_SAMPLE_RATE,SFX_ATLAS,effectAtlasLayout,createEffectBank,createMusicBank,prepareMusicSeam} from '../src/audio-assets.js';

const bytes=readFileSync(new URL('../public/assets/audio/sfx/'+SFX_ATLAS,import.meta.url)),layout=effectAtlasLayout(AUDIO_EVENTS);
assert.equal(bytes.toString('ascii',0,4),'RIFF');assert.equal(bytes.readUInt16LE(22),1);assert.equal(bytes.readUInt32LE(24),SFX_SAMPLE_RATE);assert.equal(bytes.length,44+layout.frames*2);assert.ok(bytes.length<850000,'one compressed-size-independent PCM bank stays below 850 KB');
const hashes=new Set();for(const [id,cue] of Object.entries(layout.cues)){
 const start=Math.round(cue.offset*SFX_SAMPLE_RATE),clip=bytes.subarray(44+start*2,44+(start+cue.length)*2);let peak=0,power=0;
 for(let i=0;i<clip.length;i+=2){const s=clip.readInt16LE(i)/32768;peak=Math.max(peak,Math.abs(s));power+=s*s;}
 assert.ok(peak<=.761&&peak>.7,`${id} has headroom and a usable transient`);assert.ok(Math.sqrt(power/cue.length)>.025,`${id} isn't a silent metadata stub`);assert.equal(clip.readInt16LE(0),0);assert.equal(clip.readInt16LE(clip.length-2),0);hashes.add(createHash('sha256').update(clip).digest('hex'));
}
assert.equal(hashes.size,Object.keys(AUDIO_EVENTS).length,'all event waveforms differ');
const seamData=new Float32Array(4000);seamData.fill(-.6,2000);seamData.fill(.4,0,2000);const seam={sampleRate:4000,length:4000,duration:1,numberOfChannels:1,getChannelData:()=>seamData};
const loopStart=prepareMusicSeam(seam);assert.equal(loopStart,.04);assert.equal(seamData.at(-1),seamData[Math.round(loopStart*4000)-1],'loop tail matches the sample before its loop point');

const param=()=>({value:0,targets:[],setValueAtTime(value){this.value=value;},linearRampToValueAtTime(value){this.value=value;},exponentialRampToValueAtTime(value){this.value=value;},setTargetAtTime(value){this.value=value;this.targets.push(value);},cancelScheduledValues(){}});
const nodes=[];const node=()=>{const result={gain:param(),frequency:param(),playbackRate:param(),connect(next){return next;},disconnect(){this.disconnected=true;},start(...args){this.started=args;},stop(at){this.stopped=at;}};nodes.push(result);return result;};
let context;
class Context{
 constructor(){context=this;}state='running';currentTime=0;sampleRate=22050;destination=node();
 createGain(){return node();}createOscillator(){return node();}createBufferSource(){return node();}
 async decodeAudioData(){return {duration:layout.frames/SFX_SAMPLE_RATE,length:layout.frames,numberOfChannels:1};}
 async suspend(){this.state='suspended';}async resume(){this.state='running';}
}
const flush=async()=>{for(let i=0;i<12;i++)await Promise.resolve();};
let requests=[];const fetcher=(url,{signal})=>new Promise(resolve=>requests.push({url,signal,resolve:()=>resolve({ok:true,arrayBuffer:async()=>bytes.buffer.slice(bytes.byteOffset,bytes.byteOffset+bytes.byteLength)})}));
let time=0;const audio=createGameAudio({AudioContextCtor:Context,baseUrl:'/seed-web/',fetcher,now:()=>time});
assert.equal(requests.length,0);await audio.unlock();assert.equal(requests.length,1,'unlock fetches music, not the full SFX bank');
assert.equal(audio.play('shot'),true,'first shot keeps a non-blocking offline cue while bank loads');assert.equal(requests.length,2);assert.equal(requests[1].url,'/seed-web/assets/audio/sfx/'+SFX_ATLAS);requests[1].resolve();await flush();assert.equal(audio.state().sfxReady,true);
time=200;const before=nodes.length;assert.equal(audio.play('reflect'),true);assert.equal(nodes.length-before,2,'authored effect uses one source and gain, not multiple live oscillators');assert.equal(audio.state().sfxSources,1);const played=nodes[before];assert.equal(played.started[1],layout.cues.reflect.offset);assert.equal(played.started[2],layout.cues.reflect.duration);
time=400;assert.equal(audio.play('ultimateBlackhole'),true);assert.equal(audio.state().musicDucked,true);time=1700;audio.tick(.01);assert.equal(audio.state().musicDucked,false,'music recovers after the important transient');
for(let i=0;i<40;i++){time+=1000;audio.play(i%2?'bossAttack':'ultimateRain');}
assert.ok(audio.state().sfxSources<=15,'even slow-completion/high-priority voices have a finite mobile cap');
await audio.setPaused(true);assert.equal(audio.state().sfxSources,0);assert.equal(audio.state().voices,0);assert.equal(played.disconnected,true);await audio.setPaused(false);assert.equal(audio.state().sfxSources,0,'resume does not replay interrupted impacts');
time=1900;audio.play('hurt');audio.setMuted(true);assert.equal(audio.state().sfxSources,0);assert.equal(audio.play('hit'),false);audio.dispose();assert.equal(audio.state().sfxBytes,0);

let finishDecode;const deferred=new Context();deferred.decodeAudioData=()=>new Promise(resolve=>finishDecode=()=>resolve({duration:layout.frames/SFX_SAMPLE_RATE,length:layout.frames,numberOfChannels:1}));
const bank=createEffectBank({ctx:deferred,bus:node(),cues:layout.cues,fetcher:async()=>({ok:true,arrayBuffer:async()=>new ArrayBuffer(8)})});bank.warm();await flush();bank.reset();finishDecode();await flush();assert.equal(bank.state().sfxReady,false,'late decode cannot revive a reset bank');
const bad=createEffectBank({ctx:new Context(),bus:node(),cues:layout.cues,fetcher:async()=>({ok:false,status:404})});bad.warm();await flush();assert.match(bad.state().sfxError,/404/);assert.equal(bad.play('hit'),false,'missing atlas leaves gameplay fallback available');
const musicContext=new Context(),music=createMusicBank({ctx:musicContext,bus:node(),fetcher:async()=>({ok:true,arrayBuffer:async()=>new ArrayBuffer(8)})});music.update('garden',true);await flush();musicContext.currentTime=3.25;music.update('garden',false);assert.equal(music.state().musicPosition,3.25);musicContext.currentTime=20;music.update('garden',true);assert.equal(music.state().musicPosition,3.25,'resume preserves the musical playhead instead of repeating its first bar');music.reset();assert.equal(music.state().musicPosition,0);
const wrappedContext=new Context();wrappedContext.decodeAudioData=async()=>({duration:2,length:8000,sampleRate:4000,numberOfChannels:1,getChannelData:()=>new Float32Array(8000)});const wrapped=createMusicBank({ctx:wrappedContext,bus:node(),fetcher:async()=>({ok:true,arrayBuffer:async()=>new ArrayBuffer(8)})});wrapped.update('garden',true);await flush();wrappedContext.currentTime=6.25;wrapped.update('garden',false);assert.ok(Math.abs(wrapped.state().musicPosition-.37)<1e-9,'after two seam-aware wraps playhead uses the 1.96s loop, not 2s buffer length');wrappedContext.currentTime=20;wrapped.update('garden',true);assert.ok(Math.abs(wrapped.state().musicPosition-.37)<1e-9);wrappedContext.currentTime=24.3;assert.ok(Math.abs(wrapped.state().musicPosition-.75)<1e-9,'resumed nonzero offset stays exact across further wraps');wrapped.reset();
console.log(`Botanical audio: ${hashes.size} real PCM cues/${bytes.length} bytes; click-free boundaries, one source per effect, lazy load, cancel/decode, pause/mute and music ducking passed.`);
