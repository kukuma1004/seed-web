import assert from 'node:assert/strict';
import {statSync} from 'node:fs';
import {MUSIC_ASSETS,createMusicBank} from '../src/audio-assets.js';
import {AUDIO_EVENTS,createGameAudio,musicSceneFor} from '../src/audio.js';

const parameter=()=>({value:0,setValueAtTime(){},linearRampToValueAtTime(){},setTargetAtTime(){},cancelScheduledValues(){}});
const node=()=>({gain:parameter(),frequency:parameter(),connect(next){return next;},disconnect(){},start(){this.started=true;},stop(){this.onended?.();}});
const buffers=()=>({duration:30.8,length:985600,numberOfChannels:1});
class Context{
 state='running';currentTime=0;destination=node();sampleRate=32000;
 createGain(){return node();}createOscillator(){return node();}createBufferSource(){return node();}
 async decodeAudioData(){return buffers();}async resume(){this.state='running';}async suspend(){this.state='suspended';}
}
const flush=async()=>{for(let i=0;i<8;i++)await Promise.resolve();};
let requests=[];
const fetcher=(url,{signal})=>new Promise(resolve=>requests.push({url,signal,resolve:()=>resolve({ok:true,arrayBuffer:async()=>new ArrayBuffer(8)})}));
const audio=createGameAudio({AudioContextCtor:Context,baseUrl:'/seed-web/',fetcher});
audio.setScene('crosswind');assert.equal(requests.length,0,'no downloads before user gesture');
await audio.unlock();assert.equal(requests.length,1);assert.equal(requests[0].url,'/seed-web/assets/audio/music/act4-crosswind-loop.mp3');
audio.setScene('crystalGorge');assert.equal(requests[0].signal.aborted,true,'superseded scene aborts network');
requests[0].resolve();await flush();assert.equal(audio.state().loadedMusic,null,'late old response is ignored');
requests[1].resolve();await flush();assert.equal(audio.state().loadedMusic,'crystalGorge');assert.equal(audio.state().musicSources,1);
await audio.setPaused(true);assert.equal(audio.state().musicSources,0);assert.equal(audio.state().paused,true);
await audio.setPaused(false);assert.equal(audio.state().loadedMusic,'crystalGorge');assert.equal(requests.length,2,'resume uses cached buffer');
audio.setScene('boss');const late=requests.at(-1);audio.setMuted(true);late.resolve();await flush();
assert.equal(audio.state().musicSources,0,'late decode cannot undo mute');assert.equal(audio.state().muted,true);
audio.setMuted(false);requests.at(-1).resolve();await flush();assert.equal(audio.state().loadedMusic,'boss');
for(const scene of ['garden','combat','combat2','combat3','crosswindBoss','crystalGorgeBoss']){
 audio.setScene(scene);requests.at(-1).resolve();await flush();assert.equal(audio.state().loadedMusic,scene);assert.ok(audio.state().musicBuffers<=2);assert.ok(audio.state().musicSources<=2);
}
audio.reset();assert.equal(audio.state().musicSources,0);assert.equal(audio.state().musicBuffers,0);
const listeners=new Map(),page={hidden:false,addEventListener(type,callback){listeners.set(type,callback);},removeEventListener(type){listeners.delete(type);}};
globalThis.document=page;audio.installUnlock(page);audio.installUnlock(page);assert.equal(listeners.size,3,'repeated installation does not duplicate listeners');
audio.setScene('garden');requests.at(-1).resolve();await flush();assert.equal(audio.state().musicSources,1);
page.hidden=true;listeners.get('visibilitychange')();await flush();assert.equal(audio.state().musicSources,0,'background removes authored loops');assert.equal(audio.play('select'),false);
page.hidden=false;listeners.get('visibilitychange')();await flush();assert.equal(audio.state().musicSources,1,'foreground resumes exactly one cached loop');
await audio.setPaused(true);listeners.get('visibilitychange')();await flush();assert.equal(audio.state().musicSources,0,'visibility cannot undo explicit gameplay pause');
audio.dispose();assert.equal(listeners.size,0);assert.equal(audio.state().musicBuffers,0);delete globalThis.document;

const failing=createMusicBank({ctx:new Context(),bus:node(),fetcher:async()=>({ok:false,status:404})});
failing.update('combat',true);await flush();assert.match(failing.state().musicError,/404/);assert.equal(failing.playing(),false,'failed music retains synth fallback');
const brokenTransition=createMusicBank({ctx:new Context(),bus:node(),fetcher:async url=>url.includes('garden-loop')?{ok:true,arrayBuffer:async()=>new ArrayBuffer(8)}:{ok:false,status:503}});
brokenTransition.update('garden',true);await flush();assert.equal(brokenTransition.state().loadedMusic,'garden');
brokenTransition.update('boss',true);await flush();assert.match(brokenTransition.state().musicError,/503/);assert.equal(brokenTransition.playing(),false,'failed scene transition releases the old loop so current-scene procedural music can play');
const slowContext=new Context();let finishDecode;
slowContext.decodeAudioData=()=>new Promise(resolve=>finishDecode=()=>resolve(buffers()));
const slow=createMusicBank({ctx:slowContext,bus:node(),fetcher:async()=>({ok:true,arrayBuffer:async()=>new ArrayBuffer(8)})});
slow.update('garden',true);await flush();slow.update('garden',false);finishDecode();await flush();assert.equal(slow.state().musicSources,0);assert.equal(slow.state().musicBuffers,0,'late decode discarded after suspension');
let total=0;for(const path of Object.values(MUSIC_ASSETS)){const size=statSync(new URL('../public/assets/audio/music/'+path,import.meta.url)).size;assert.ok(size>10000&&size<400000,path);total+=size;}assert.ok(total<4200000,'soundtrack stays below 4.2 MB');
for(const id of ['select','harvest','build','repair'])assert.ok(AUDIO_EVENTS[id]?.cooldown>=.1);
assert.equal(musicSceneFor('crosswind'),'crosswind');assert.equal(musicSceneFor('crystalGorge',{boss:true}),'crystalGorgeBoss');
console.log(`Audio bank: 11 tracks/${total} bytes, lazy gesture load, abort/stale decode, pause/mute/resume, two-buffer cap and reset passed.`);
