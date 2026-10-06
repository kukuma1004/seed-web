import assert from 'node:assert/strict';
import {AUDIO_EVENTS} from '../src/audio.js';
import {LAW_DNA} from '../src/expedition/species.js';
import {expeditionAudioEvent,expeditionIntentAudio} from '../src/expedition/audio.js';

const sounds=new Set();
for(const speciesId of Object.keys(LAW_DNA)){
 const units=[{id:'actor',side:'ally',speciesId}];
 for(const kind of ['attack','skill1','skill2']){
  const event=expeditionAudioEvent({type:'action',unitId:'actor',kind},units);
  assert.ok(AUDIO_EVENTS[event]);sounds.add(event);
 }
 assert.equal(expeditionAudioEvent({type:'action',unitId:'actor',kind:'guard'},units),null);
 assert.equal(expeditionAudioEvent({type:'action',unitId:'actor',kind:'switch'},units),null);
 assert.equal(expeditionAudioEvent({type:'action',unitId:'actor',kind:'resonance'},units),null);
 assert.equal(expeditionAudioEvent({type:'action',unitId:'actor',kind:'awaken'},units),'ultimate');
 assert.ok(AUDIO_EVENTS[expeditionAudioEvent({type:'damage',unitId:'actor'},units)]);
}
assert.equal(sounds.size,9,'each existing law uses its own shared attack sound');
for(const type of ['guard','switch','resonance','permadeath','enemyDeath','bossWarning','victory','defeat','protection','chill','chain','returnWarning'])assert.ok(AUDIO_EVENTS[expeditionAudioEvent({type})]);
assert.equal(expeditionAudioEvent({type:'roundStart'}),null,'idle round advancement is not an item pickup');
assert.equal(expeditionAudioEvent({type:'returnCancelled'}),null,'cancelled attack makes no shot sound');
assert.equal(expeditionAudioEvent({type:'action',unitId:'boss',kind:'attack'},[{id:'boss',side:'enemy',boss:true}]),'bossAttack');
for(const type of ['hatch','resow','grow','evolve','twin'])assert.ok(AUDIO_EVENTS[expeditionIntentAudio({type})]);
assert.equal(expeditionIntentAudio({type:'move'}),null);
console.log('expedition audio PASS: 9 law cues, guard/switch/resonance, boss, bounded shared palette, no idle sound');
