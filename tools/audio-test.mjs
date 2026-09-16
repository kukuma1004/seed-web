import assert from 'node:assert/strict';
import {AUDIO_EVENTS,createAudioLimiter,createGameAudio} from '../src/audio.js';

for(const id of ['shot','hit','split','chain','reflect','portal','evolve','fusion','ultimateReady','ultimate','finale','bossWarning','bossAttack','bossDefeat']){
 const e=AUDIO_EVENTS[id];assert.ok(e,`${id} exists`);assert.ok(e.duration>0&&e.gain>0&&e.cooldown>=0);assert.ok(e.priority>=0);
}
let time=0;const limit=createAudioLimiter({maxVoices:2,now:()=>time});
const a=limit.begin('shot');assert.ok(a);assert.equal(limit.begin('shot'),null,'same noisy event is throttled');
const b=limit.begin('hit');assert.ok(b);assert.equal(limit.begin('split'),null,'ordinary cues respect the hard voice budget');
const important=limit.begin('ultimate');assert.ok(important,'important cue may reserve a small emergency voice');
limit.end(a);limit.end(b);limit.end(important);time+=1000;assert.ok(limit.begin('shot'));

// Unsupported browsers degrade silently; gameplay never waits for audio.
const silent=createGameAudio({AudioContextCtor:null,now:()=>time});
assert.equal(await silent.unlock(),false);assert.equal(silent.play('ultimate'),false);assert.equal(silent.state().supported,false);
console.log('Audio: event matrix, cooldowns, bounded voices, priority reserve and silent fallback passed.');
