import assert from 'node:assert/strict';
import {createGameAudio} from '../src/audio.js';

const flush=async()=>{for(let i=0;i<12;i++)await Promise.resolve();};
const parameter=()=>({value:0,setValueAtTime(){},linearRampToValueAtTime(){},exponentialRampToValueAtTime(){},setTargetAtTime(){},cancelScheduledValues(){}});
const node=()=>({gain:parameter(),frequency:parameter(),connect(next){return next;},disconnect(){},start(){},stop(){this.onended?.();}});
let current;
class Context{
 constructor(){current=this;this.state='suspended';this.currentTime=0;this.destination=node();this.resumeCalls=0;this.suspendCalls=0;this.oscillators=0;}
 createGain(){return node();}
 createOscillator(){this.oscillators++;return node();}
 async resume(){this.resumeCalls++;this.state='running';}
 async suspend(){this.suspendCalls++;this.state='suspended';}
 async close(){this.state='closed';}
}

const muted=createGameAudio({AudioContextCtor:Context,fetcher:null});
await muted.unlock();const mutedContext=current;
muted.setMuted(true);await flush();
assert.equal(mutedContext.state,'suspended','mute must stop the silent audio processing context, not only set gain to zero');
const initialResumes=mutedContext.resumeCalls;
for(let i=0;i<100;i++){await muted.unlock();muted.tick(.1);}
assert.equal(mutedContext.resumeCalls,initialResumes,'muted menu taps cannot wake the audio processor');
assert.equal(mutedContext.oscillators,0,'muted ticks never schedule synthesis');
muted.setMuted(false);await flush();
assert.equal(mutedContext.state,'running','unmute restores an already user-unlocked context');
assert.equal(muted.state().musicScene,'garden');
muted.dispose();await flush();
assert.equal(await muted.unlock(),false,'a disposed graph cannot be unlocked again');

const initiallyMuted=createGameAudio({AudioContextCtor:Context,fetcher:null});
initiallyMuted.setMuted(true);
assert.equal(initiallyMuted.state().contextState,'uninitialized');
assert.equal(await initiallyMuted.unlock(),false);
initiallyMuted.setMuted(false);await flush();
assert.equal(initiallyMuted.state().contextState,'running','first unmute gesture also unlocks a game initially loaded with sound off');
initiallyMuted.dispose();

let pendingResume=[];
class SlowResumeContext extends Context{
 resume(){this.resumeCalls++;return new Promise(resolve=>pendingResume.push(()=>{this.state='running';resolve();}));}
}
const rapid=createGameAudio({AudioContextCtor:SlowResumeContext,fetcher:null});
const requests=Array.from({length:40},()=>rapid.unlock());const rapidContext=current;
assert.equal(rapidContext.resumeCalls,1,'rapid gestures share one in-flight context resume');
pendingResume.shift()();assert.ok((await Promise.all(requests)).every(Boolean));
assert.equal(rapid.state().musicSources,0);
rapid.dispose();

const ordered=createGameAudio({AudioContextCtor:Context,fetcher:null});
await ordered.unlock();const orderedContext=current;let finishSuspend;
orderedContext.suspend=function(){this.suspendCalls++;return new Promise(resolve=>finishSuspend=()=>{this.state='suspended';resolve();});};
const pause=ordered.setPaused(true),resume=ordered.setPaused(false);
assert.equal(orderedContext.resumeCalls,1,'foreground wake waits for the pending background suspend');
finishSuspend();await Promise.all([pause,resume]);
assert.equal(orderedContext.state,'running','a late suspend must not leave an unpaused game silent');
assert.equal(orderedContext.resumeCalls,2);
ordered.dispose();

pendingResume=[];
const removed=createGameAudio({AudioContextCtor:SlowResumeContext,fetcher:null});
const waking=removed.unlock(),removedContext=current;
removed.dispose();pendingResume.shift()();
assert.equal(await waking,false,'late resume completion cannot resurrect a disposed graph');
assert.equal(removed.state().unlocked,false);
assert.equal(removed.state().musicSources,0);
assert.notEqual(removedContext.state,'running');
console.log('Audio lifecycle: mute processor sleep, 100 silent ticks, 40-gesture resume dedupe, ordered pause/resume and dispose race passed.');
