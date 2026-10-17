import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {installInspectionFilm} from '../src/inspection-film.js';
import {createGameAudio} from '../src/audio.js';

let checks=0;
const test=async(name,run)=>{await run();checks++;console.log('PASS '+name);};
class Events{
 listeners=new Map();
 addEventListener(name,fn){if(!this.listeners.has(name))this.listeners.set(name,new Set());this.listeners.get(name).add(fn);}
 removeEventListener(name,fn){this.listeners.get(name)?.delete(fn);}
 emit(name){for(const fn of [...this.listeners.get(name)||[]])fn({type:name});}
 count(){return [...this.listeners.values()].reduce((n,set)=>n+set.size,0);}
}
class Element extends Events{
 constructor(tag){super();this.tagName=tag.toUpperCase();this.children=[];this.style={};this.dataset={};this.attrs={};this.hidden=false;this.disabled=false;}
 append(...children){for(const child of children){child.parent=this;this.children.push(child);}}
 setAttribute(key,value){this.attrs[key]=value;}
 removeAttribute(key){delete this.attrs[key];if(key==='href')delete this.href;}
 remove(){if(this.parent)this.parent.children=this.parent.children.filter(child=>child!==this);this.parent=null;}
}
class Clock{
 time=0;next=1;timers=new Map();
 setTimeout=(fn,ms)=>{const id=this.next++;this.timers.set(id,{fn,at:this.time+ms});return id;};
 clearTimeout=id=>this.timers.delete(id);
 advance(ms){const end=this.time+ms;for(let count=0;count<1000;count++){
  const due=[...this.timers].filter(([,timer])=>timer.at<=end).sort((a,b)=>a[1].at-b[1].at||a[0]-b[0])[0];
  if(!due){this.time=end;return;}this.time=due[1].at;this.timers.delete(due[0]);due[1].fn();
 }throw new Error('timer loop');}
}
const track=kind=>({kind,readyState:'live',stops:0,stop(){this.stops++;this.readyState='ended';}});
class Stream{
 constructor(tracks=[]){this.tracks=tracks;}
 getTracks(){return this.tracks;}
 getVideoTracks(){return this.tracks.filter(item=>item.kind==='video');}
 getAudioTracks(){return this.tracks.filter(item=>item.kind==='audio');}
}
function fixture(options={}){
 const clock=new Clock(),document=new Events(),window=new Events(),recorders=[],sources=[],taps=[],urls=new Map(),revoked=[];
 document.body=new Element('body');document.hidden=false;document.creates=0;
 document.createElement=tag=>{document.creates++;return new Element(tag);};
 document.getElementById=id=>{const visit=element=>element.id===id?element:element.children.map(visit).find(Boolean);return visit(document.body)||null;};
 window.location={protocol:'http:',hostname:'127.0.0.1',search:'?inspect=1&filmCapture=1',...options.location};
 window.setTimeout=clock.setTimeout;window.clearTimeout=clock.clearTimeout;window.Blob=Blob;window.MediaStream=Stream;
 window.URL={createObjectURL(blob){const url='blob:film-'+(urls.size+revoked.length+1);urls.set(url,blob);return url;},revokeObjectURL(url){revoked.push(url);urls.delete(url);}};
 class Recorder{
  static isTypeSupported=mime=>options.supported?options.supported.includes(mime):mime.includes('vp8');
  constructor(stream,settings){if(options.ctorFailure)throw new Error('constructor failed');this.stream=stream;this.settings=settings;this.mimeType=settings.mimeType;this.state='inactive';this.stops=0;recorders.push(this);}
  start(slice){if(options.startFailure)throw new Error('start failed');this.slice=slice;this.state='recording';}
  stop(){this.stops++;if(options.stopFailure)throw new Error('stop failed');this.state='inactive';if(options.neverStop)return;clock.setTimeout(()=>{if(!options.empty)this.ondataavailable?.({data:new Blob(['actual canvas bytes'],{type:this.mimeType})});this.onstop?.();},options.stopDelay||0);}
 }
 window.MediaRecorder=Recorder;
 const canvas={captures:[],captureStream(fps){this.captures.push(fps);if(options.captureFailure)throw new Error('tainted canvas');const source=new Stream(options.noVideo?[]:[track('video')]);sources.push(source);return source;}};
 const audio={calls:0,captureOutput(){this.calls++;if(options.audioFailure)throw new Error('no audio');if(options.silent)return null;const tap={stream:new Stream([track('audio')]),stops:0,stop(){if(this.stops)return;this.stops++;for(const item of this.stream.getTracks())item.stop();}};taps.push(tap);return tap;}};
 const dispose=()=>installInspectionFilm({canvas,audio,document,window});
 return {options,clock,document,window,canvas,audio,recorders,sources,taps,urls,revoked,install:dispose,node:id=>document.getElementById(id),click(){this.node('film-record').emit('click');},state(){return this.node('film-status').dataset.state;}};
}
const stopped=f=>{for(const stream of [...f.sources,...f.taps.map(t=>t.stream)])for(const item of stream.getTracks())assert.equal(item.readyState,'ended');for(const tap of f.taps)assert.equal(tap.stops,1);};

await test('public, missing flag and non-loopback installations have zero DOM/media/audio side effects',()=>{
 for(const location of [
  {hostname:'kukuma1004.github.io'}, {hostname:'127.0.0.1.evil.test'}, {hostname:'192.168.0.1'},
  {hostname:'localhost.evil.test'}, {protocol:'file:'}, {search:'?filmCapture=1'}, {search:'?inspect=1'},
  {search:'?inspect=0&filmCapture=1'}, {search:'?inspect=1&filmCapture=0'}, {search:'?inspect&filmCapture'},
  {search:'?inspect=1&filmCapture=1&inspect=0'}
 ]){
  const f=fixture({location});f.install()();assert.equal(f.document.creates,0);assert.equal(f.audio.calls,0);assert.equal(f.canvas.captures.length,0);assert.equal(f.recorders.length,0);assert.equal(f.document.count()+f.window.count(),0);
 }
 const poison=new Proxy({},{get(){throw new Error('public media/DOM probe');}});
 assert.doesNotThrow(()=>installInspectionFilm({document:poison,canvas:poison,audio:poison,window:{location:{protocol:'https:',hostname:'example.com',search:'?inspect=1&filmCapture=1'}}})());
});
await test('loopback UI is native, idle and duplicate installation does not take ownership',()=>{
 for(const hostname of ['localhost','127.0.0.1','::1','[::1]']){
  const f=fixture({location:{hostname}}),dispose=f.install();assert.equal(f.node('film-record').tagName,'BUTTON');assert.equal(f.node('film-record').textContent,'12초 플레이 녹화');assert.equal(f.node('film-download').download,'seed-gameplay-actual.webm');assert.equal(f.state(),'idle');assert.equal(f.audio.calls,0);assert.equal(f.canvas.captures.length,0);const duplicate=f.install();duplicate();assert(f.node('film-capture'));dispose();assert.equal(f.node('film-capture'),null);
 }
});
await test('unsupported video APIs and MIME do not allocate a stream or audio tap',()=>{
 for(const kind of ['recorder','capture','mime']){const f=fixture();if(kind==='recorder')f.window.MediaRecorder=null;if(kind==='capture')f.canvas.captureStream=null;if(kind==='mime')f.options.supported=['video/mp4'];const dispose=f.install();f.click();assert.equal(f.state(),'unsupported');assert.equal(f.canvas.captures.length,0);assert.equal(f.audio.calls,0);dispose();}
});
await test('actual canvas30fps and existing game audio combine with VP8 fallback and 12-second limit',async()=>{
 const f=fixture(),dispose=f.install();f.click();assert.deepEqual(f.canvas.captures,[30]);assert.equal(f.recorders[0].settings.mimeType,'video/webm;codecs=vp8,opus');assert.equal(f.recorders[0].slice,500);assert.deepEqual(f.recorders[0].stream.getTracks(),[...f.sources[0].getVideoTracks(),...f.taps[0].stream.getAudioTracks()]);assert.equal(f.state(),'recording');assert.equal(f.node('film-record').disabled,true);
 f.click();assert.equal(f.recorders.length,1);f.clock.advance(11999);assert.equal(f.state(),'recording');f.clock.advance(1);assert.equal(f.state(),'ready');assert.equal(f.recorders[0].stops,1);assert.equal(f.clock.timers.size,0);stopped(f);assert.equal(f.node('film-download').hidden,false);assert.match(await f.urls.get(f.node('film-download').href).text(),/actual canvas bytes/);dispose();assert.equal(f.urls.size,0);
});
await test('VP9 is preferred and generic WebM remains the final supported fallback',()=>{
 for(const mime of ['video/webm;codecs=vp9,opus','video/webm']){const f=fixture({supported:[mime]}),dispose=f.install();f.click();assert.equal(f.recorders[0].mimeType,mime);dispose();stopped(f);}
});
await test('locked/unsupported audio, failed tap and missing audio-combine API record with explicit silent notice',()=>{
 for(const mode of ['silent','audioFailure','combine']){const f=fixture({[mode]:true});if(mode==='combine')f.window.MediaStream=null;const dispose=f.install();f.click();assert.equal(f.state(),'recording');assert.match(f.node('film-status').textContent,/오디오 없이/);assert.equal(f.recorders[0].stream.getAudioTracks().length,0);f.clock.advance(12000);assert.equal(f.state(),'ready');assert.match(f.node('film-status').textContent,/오디오 없이/);stopped(f);dispose();}
});
await test('hiding the page stops immediately, finalizes once and permits another recording',()=>{
 const f=fixture(),dispose=f.install();f.click();f.clock.advance(1000);f.document.hidden=true;f.document.emit('visibilitychange');stopped(f);assert.equal(f.state(),'stopping');f.document.emit('visibilitychange');assert.equal(f.recorders[0].stops,1);f.clock.advance(0);assert.equal(f.state(),'ready');f.click();assert.equal(f.recorders.length,1,'hidden page cannot start');f.document.hidden=false;f.click();assert.equal(f.recorders.length,2);assert.equal(f.revoked.length,1);dispose();stopped(f);
});
await test('pagehide stops recording and repeated pagehide cannot double-stop or leak timers',()=>{
 const f=fixture(),dispose=f.install();f.click();f.window.emit('pagehide');f.window.emit('pagehide');assert.equal(f.recorders[0].stops,1);stopped(f);f.clock.advance(0);assert.equal(f.state(),'ready');assert.equal(f.clock.timers.size,0);dispose();
});
await test('re-recording revokes its former download while keeping only the current URL',()=>{
 const f=fixture(),dispose=f.install();f.click();f.clock.advance(12000);const first=f.node('film-download').href;f.click();assert.deepEqual(f.revoked,[first]);assert.equal(f.node('film-download').hidden,true);f.clock.advance(12000);assert.equal(f.urls.size,1);assert.notEqual(f.node('film-download').href,first);dispose();assert.equal(f.urls.size,0);assert.equal(f.revoked.length,2);stopped(f);
});
await test('dispose during capture cancels owned timers/listeners/tracks/tap and ignores queued events',()=>{
 const f=fixture(),dispose=f.install();f.click();const recorder=f.recorders[0],data=recorder.ondataavailable,stop=recorder.onstop;dispose();dispose();assert.equal(f.node('film-capture'),null);assert.equal(f.document.count()+f.window.count(),0);stopped(f);data({data:new Blob(['late'])});stop();f.clock.advance(20000);assert.equal(f.urls.size,0);assert.equal(f.clock.timers.size,0);
});
await test('dispose during delayed stopping cancels settlement and suppresses late completion',()=>{
 const f=fixture({stopDelay:800}),dispose=f.install();f.click();f.window.emit('pagehide');const late=f.recorders[0].onstop;dispose();f.clock.advance(20000);late();assert.equal(f.urls.size,0);assert.equal(f.clock.timers.size,0);stopped(f);
});
await test('canvas capture failure is recoverable and never asks audio to unlock',()=>{
 const f=fixture({captureFailure:true}),dispose=f.install();f.click();assert.equal(f.state(),'error');assert.equal(f.audio.calls,0);f.options.captureFailure=false;f.click();assert.equal(f.state(),'recording');dispose();stopped(f);
});
await test('missing video track fails without creating audio or recorder',()=>{
 const f=fixture({noVideo:true}),dispose=f.install();f.click();assert.equal(f.state(),'error');assert.equal(f.audio.calls,0);assert.equal(f.recorders.length,0);dispose();
});
await test('recorder construction/start failures release both streams and allow retry',()=>{
 for(const kind of ['ctorFailure','startFailure']){const f=fixture({[kind]:true}),dispose=f.install();f.click();assert.equal(f.state(),'error');assert.equal(f.clock.timers.size,0);stopped(f);f.options[kind]=false;f.click();assert.equal(f.state(),'recording');dispose();stopped(f);}
});
await test('recorder stop failure reports failure and releases all owned resources',()=>{
 const f=fixture({stopFailure:true}),dispose=f.install();f.click();f.clock.advance(12000);assert.equal(f.state(),'error');assert.equal(f.clock.timers.size,0);assert.equal(f.urls.size,0);stopped(f);dispose();
});
await test('missing final stop event times out safely; a stale completion cannot finish a later take',()=>{
 const f=fixture({neverStop:true}),dispose=f.install();f.click();const first=f.recorders[0],late=first.onstop;f.clock.advance(12000);assert.equal(f.state(),'stopping');stopped(f);f.clock.advance(2000);assert.equal(f.state(),'error');assert.equal(f.clock.timers.size,0);f.options.neverStop=false;f.click();late();assert.equal(f.state(),'recording');f.clock.advance(12000);assert.equal(f.state(),'ready');dispose();stopped(f);
});
await test('recorder error or empty final data never publishes a damaged download',()=>{
 for(const mode of ['error','empty']){const f=fixture({empty:mode==='empty'}),dispose=f.install();f.click();if(mode==='error'){f.recorders[0].onerror();f.clock.advance(0);}else f.clock.advance(12000);assert.equal(f.state(),'error');assert.equal(f.urls.size,0);assert.equal(f.node('film-download').hidden,true);assert.equal(f.clock.timers.size,0);stopped(f);dispose();}
});
await test('capture gate is rechecked on the actual button action',()=>{
 const f=fixture(),dispose=f.install();f.window.location.hostname='example.com';f.click();assert.equal(f.state(),'error');assert.equal(f.canvas.captures.length,0);assert.equal(f.audio.calls,0);dispose();
});
await test('recorder module does not drive input, create a game loop, or upload footage',()=>{
 const source=readFileSync(new URL('../src/inspection-film.js',import.meta.url),'utf8');assert.doesNotMatch(source,/requestAnimationFrame|dispatchEvent|KeyboardEvent|PointerEvent|\bfetch\s*\(|XMLHttpRequest|\.play\s*\(|\.unlock\s*\(/);
});

function audioFixture({destinationFailure=false,unsupported=false}={}){
 const contexts=[];
 const param=()=>({value:0,setValueAtTime(){},linearRampToValueAtTime(){},exponentialRampToValueAtTime(){},setTargetAtTime(){},cancelScheduledValues(){}});
 const node=()=>({gain:param(),frequency:param(),threshold:param(),knee:param(),ratio:param(),attack:param(),release:param(),connections:new Set(),disconnects:[],connect(next){this.connections.add(next);return next;},disconnect(next){this.disconnects.push(next);if(next)this.connections.delete(next);else this.connections.clear();},start(){},stop(){this.onended?.();}});
 class Context{
  constructor(){contexts.push(this);this.state='running';this.currentTime=0;this.sampleRate=44100;this.destination=node();this.gains=[];this.taps=[];this.resumes=0;this.closes=0;if(unsupported)this.createMediaStreamDestination=null;}
  createGain(){const gain=node();this.gains.push(gain);return gain;}
  createDynamicsCompressor(){return node();}
  createOscillator(){return node();}
  createMediaStreamDestination(){if(destinationFailure)throw new Error('unsupported');const output=node();output.stream=new Stream([track('audio')]);this.taps.push(output);return output;}
  async resume(){this.resumes++;this.state='running';}
  async suspend(){this.state='suspended';}
  close(){this.closes++;this.state='closed';}
 }
 const audio=createGameAudio({AudioContextCtor:Context,fetcher:async()=>({ok:false,status:503}),now:()=>0});
 return {audio,contexts};
}
await test('real audio captureOutput never creates a context or unlocks audio by itself',()=>{
 const f=audioFixture();assert.equal(f.audio.captureOutput(),null);assert.equal(f.contexts.length,0);f.audio.setMuted(true);assert.equal(f.audio.captureOutput(),null);assert.equal(f.contexts.length,0);f.audio.dispose();
});
await test('real audio tap preserves the original speaker graph and disconnects only its own destination',async()=>{
 const f=audioFixture();await f.audio.unlock();const ctx=f.contexts[0],master=ctx.gains[0],original=[...master.connections];const tap=f.audio.captureOutput();assert(tap);assert.equal(f.contexts.length,1);assert.equal(ctx.resumes,0);assert.equal(master.connections.size,original.length+1);for(const output of original)assert(master.connections.has(output));tap.stop();tap.stop();assert.deepEqual([...master.connections],original);assert.deepEqual(master.disconnects,[ctx.taps[0]]);assert.equal(tap.stream.getAudioTracks()[0].stops,1);f.audio.dispose();
});
await test('real audio mute is preserved on existing capture and prevents new taps',async()=>{
 const f=audioFixture();await f.audio.unlock();const tap=f.audio.captureOutput(),ctx=f.contexts[0];f.audio.setMuted(true);assert.equal(ctx.gains[0].gain.value,0);assert.equal(f.audio.captureOutput(),null);assert.equal(ctx.taps.length,1);f.audio.setMuted(false);assert.equal(ctx.gains[0].gain.value,.72);tap.stop();f.audio.dispose();
});
await test('paused, hidden or suspended real audio contexts cannot be awakened by recording',async()=>{
 const f=audioFixture();await f.audio.unlock();const ctx=f.contexts[0];await f.audio.setPaused(true);assert.equal(f.audio.captureOutput(),null);assert.equal(ctx.state,'suspended');await f.audio.setPaused(false);ctx.state='suspended';assert.equal(f.audio.captureOutput(),null);ctx.state='running';globalThis.document={hidden:true};try{assert.equal(f.audio.captureOutput(),null);}finally{delete globalThis.document;}assert.equal(ctx.taps.length,0);f.audio.dispose();
});
await test('unsupported/throwing real audio output degrades to null without changing speakers',async()=>{
 for(const options of [{unsupported:true},{destinationFailure:true}]){const f=audioFixture(options);await f.audio.unlock();const ctx=f.contexts[0],before=[...ctx.gains[0].connections];assert.equal(f.audio.captureOutput(),null);assert.deepEqual([...ctx.gains[0].connections],before);f.audio.dispose();}
});
await test('real audio dispose releases every live tap and cannot capture a closed context',async()=>{
 const f=audioFixture();await f.audio.unlock();const one=f.audio.captureOutput(),two=f.audio.captureOutput(),ctx=f.contexts[0];one.stop();f.audio.dispose();assert.equal(two.stream.getAudioTracks()[0].readyState,'ended');assert.equal(one.stream.getAudioTracks()[0].stops,1);assert.equal(two.stream.getAudioTracks()[0].stops,1);assert.equal(f.audio.captureOutput(),null);assert.equal(ctx.closes,1);
});
console.log(`Inspection film: ${checks} checks passed. Fake recorder/clock/streams and actual audio graph contracts; no native browser recording or encoded WebM claim.`);
