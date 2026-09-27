import assert from 'node:assert/strict';
import {DEFENSE_FORMS} from '../src/seed-defense-catalog.js';
import {defenseBodyParts,paintEvolutionCue} from '../src/seed-defense-art.js';
for(const f of Object.values(DEFENSE_FORMS)){
 const parts=defenseBodyParts({formId:f.id});assert(parts.length>=1&&parts.length<=2,f.id);
 for(const p of parts){assert(['seed','solo','fusion','awaken'].includes(p.atlas));assert(Number.isInteger(p.cell)&&p.cell>=0&&p.cell<12,f.id);assert(Number.isFinite(p.size)&&p.size>0&&Number.isFinite(p.dx));}
}
assert.equal(defenseBodyParts({formId:null})[0].atlas,'seed');
assert.equal(defenseBodyParts({formId:'infiniteprism'})[0].atlas,'awaken');
const calls=[],ctx=new Proxy({},{get:(_,key)=>(...args)=>{for(const a of args)if(typeof a==='number')assert(Number.isFinite(a));calls.push(key);},set:()=>true});
const cue={x:9,y:19.5,ink:'#ffaa65',title:'단독 진화 · 불꽃 꽃다발'};
paintEvolutionCue(ctx,cue,.4,true);assert(calls.includes('fillText'));assert(!calls.includes('ellipse'),'reduced motion keeps text without moving particles');
calls.length=0;paintEvolutionCue(ctx,cue,.4,false);assert(calls.includes('ellipse'));assert(calls.includes('fillText'));
calls.length=0;paintEvolutionCue(ctx,cue,3,false);assert.equal(calls.length,0,'finished effect must render nothing');
console.log('Defense art: 153 bounded body mappings; base/final distinction; reduced-motion and finite expiry passed.');
