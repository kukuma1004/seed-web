import assert from 'node:assert/strict';
import {AUDIO_EVENTS,MUSIC_SCENES,createAudioLimiter,createGameAudio,musicSceneFor,ultimateAudioEvent} from '../src/audio.js';

for(const id of ['shot','hit','gravityHit','burstHit','pierceHit','frostHit','split','chain','reflect','portal','evolve','fusion','ultimateReady','ultimate','finale','bossWarning','bossAttack','bossDefeat']){
 const e=AUDIO_EVENTS[id];assert.ok(e,`${id} exists`);assert.ok(e.duration>0&&e.gain>0&&e.cooldown>=0);assert.ok(e.priority>=0);
}
for(const id of ['shotCrystal','shotPetal','shotArc','shotOrbit','shotPierce','shotBurst','shotReturn','shotGravity','shotFrost','shotPortal'])assert.ok(AUDIO_EVENTS[id]?.duration>=.1,`${id} keeps an audible flight sweep`);
const ultimateEvents=['BURST','RAIN','ORBIT','BEAM','DOMAIN','BLACKHOLE','TIME_STOP'].map(ultimateAudioEvent);
assert.equal(new Set(ultimateEvents).size,7,'all seven ultimate skeletons need a distinct sound identity');
for(const id of ultimateEvents)assert.ok(AUDIO_EVENTS[id]?.priority===4,id);
let time=0;const limit=createAudioLimiter({maxVoices:2,now:()=>time});
const a=limit.begin('shot');assert.ok(a);assert.equal(limit.begin('shot'),null,'same noisy event is throttled');
const b=limit.begin('hit');assert.ok(b);assert.equal(limit.begin('split'),null,'ordinary cues respect the hard voice budget');
const important=limit.begin('ultimate');assert.ok(important,'important cue may reserve a small emergency voice');
limit.end(a);limit.end(b);limit.end(important);time+=1000;assert.ok(limit.begin('shot'));
assert.equal(limit.begin('shotCrystal'),null,'different projectile skins share one shot density limit');

// Unsupported browsers degrade silently; gameplay never waits for audio.
const silent=createGameAudio({AudioContextCtor:null,now:()=>time});
assert.equal(await silent.unlock(),false);assert.equal(silent.play('ultimate'),false);assert.equal(silent.state().supported,false);
for(const id of ['garden','combat','combat2','combat3','boss','boss2','boss3']){const music=MUSIC_SCENES[id];assert.ok(music.root>0&&music.gain>0&&music.step>0);assert.equal(music.melody.length,16);assert.equal(music.chords.length,4);assert.ok(music.chords.every(chord=>chord.length===2));}
assert.equal(musicSceneFor('stadium'),'combat2');assert.equal(musicSceneFor('skyway',{boss:true}),'boss3');
assert.equal(silent.setScene('boss'),'boss');assert.equal(silent.state().musicScene,'boss');silent.tick(10);
assert.equal(silent.setScene('없는 장면'),'garden','unknown music scene falls back safely');
// Exercise the Web Audio graph as well as the data table: the old score could
// pass metadata checks while never scheduling a playable note after unlock.
const param=()=>({value:0,setValueAtTime(){},linearRampToValueAtTime(){},exponentialRampToValueAtTime(){},setTargetAtTime(){}});
let musicOscillators=0;
const node=()=>({gain:param(),frequency:param(),threshold:param(),knee:param(),ratio:param(),attack:param(),release:param(),connect(next){return next;},disconnect(){},start(){},stop(){this.onended?.();}});
class FakeAudioContext{
 state='running';currentTime=0;sampleRate=44100;destination=node();
 createGain(){return node();}createOscillator(){musicOscillators++;return node();}createDynamicsCompressor(){return node();}
 async resume(){this.state='running';}async suspend(){this.state='suspended';}
}
const live=createGameAudio({AudioContextCtor:FakeAudioContext,now:()=>time});
assert.equal(await live.unlock(),true);live.setScene('combat3');
for(let i=0;i<18;i++)live.tick(.1);
assert.ok(musicOscillators>=5,'third act schedules a real melody and rhythmic bass');
assert.equal(live.play('ultimateBurst'),true);assert.equal(live.state().voices,0,'finished sounds release their limiter slots');
await live.setPaused(true);assert.equal(live.play('shot'),false,'pause stops effects');
await live.setPaused(false);assert.equal(live.state().musicScene,'combat3');
console.log('Audio: event matrix, cooldowns, bounded voices, procedural scene music and silent fallback passed.');
