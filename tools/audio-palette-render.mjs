import {writeFileSync,mkdirSync} from 'node:fs';
import {AUDIO_EVENTS} from '../src/audio.js';
import {SFX_SAMPLE_RATE,SFX_ATLAS,effectAtlasLayout,renderBotanicalEffect} from '../src/audio-assets.js';

// Deterministic, locally authored layered material sounds. No external service,
// recording, paid generation, or third-party licensing is involved.
const layout=effectAtlasLayout(AUDIO_EVENTS),wav=Buffer.alloc(44+layout.frames*2),measurements={};
wav.write('RIFF',0);wav.writeUInt32LE(wav.length-8,4);wav.write('WAVEfmt ',8);wav.writeUInt32LE(16,16);wav.writeUInt16LE(1,20);wav.writeUInt16LE(1,22);wav.writeUInt32LE(SFX_SAMPLE_RATE,24);wav.writeUInt32LE(SFX_SAMPLE_RATE*2,28);wav.writeUInt16LE(2,32);wav.writeUInt16LE(16,34);wav.write('data',36);wav.writeUInt32LE(layout.frames*2,40);
for(const [id,spec] of Object.entries(AUDIO_EVENTS)){
 const pcm=renderBotanicalEffect(id,spec),cue=layout.cues[id],start=Math.round(cue.offset*SFX_SAMPLE_RATE);let power=0,peak=0;
 for(let i=0;i<pcm.length;i++){wav.writeInt16LE(Math.round(Math.max(-1,Math.min(1,pcm[i]))*32767),44+(start+i)*2);power+=pcm[i]*pcm[i];peak=Math.max(peak,Math.abs(pcm[i]));}
 measurements[id]={...cue,rms:Number(Math.sqrt(power/pcm.length).toFixed(5)),peak:Number(peak.toFixed(5))};
}
const target=new URL('../public/assets/audio/sfx/',import.meta.url);mkdirSync(target,{recursive:true});writeFileSync(new URL(SFX_ATLAS,target),wav);
writeFileSync(new URL('seed-botanical-palette-v1.json',target),JSON.stringify({version:1,provenance:'Locally authored deterministic material synthesis, not provider-generated audio',generator:'tools/audio-palette-render.mjs',channels:1,sampleRate:SFX_SAMPLE_RATE,format:'16-bit PCM WAV',bytes:wav.length,seconds:layout.frames/SFX_SAMPLE_RATE,cues:measurements},null,2)+'\n');
console.log(`Authored ${Object.keys(AUDIO_EVENTS).length} cues, ${(wav.length/1024).toFixed(1)} KiB mono atlas.`);
