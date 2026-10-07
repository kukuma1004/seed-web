import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {expeditionSpriteSequence,expeditionFeedbackDelay,EXPEDITION_FEEDBACK_MS} from '../src/expedition/sprite-motion.js';
import {expeditionAllyArt} from '../src/expedition/art.js';
import {EXPEDITION_SPECIES} from '../src/expedition/species.js';

const a={id:'a',speciesId:'pierce',side:'ally',hp:40},b={id:'b',speciesId:'meadow-normal-0',side:'enemy',hp:40},units=[a,b];
const action=kind=>[{type:'action',unitId:'a',kind,seq:2}];
const before=JSON.stringify(units);
for(const kind of ['attack','skill1','skill2','resonance','awaken']){
 const sequence=expeditionSpriteSequence(a,units,action(kind));
 assert.equal(sequence.animate,true);assert.equal(sequence.preparation.pose,4);assert.equal(sequence.rest.pose,0);
 assert.ok(sequence.impact.pose!==sequence.preparation.pose,'windup must transition to an actual strike, not remain the charge picture');
 assert.equal(sequence.duration,720);assert.ok(Object.isFrozen(sequence));
}
const recoil=expeditionSpriteSequence(a,units,[...action('attack'),{type:'damage',unitId:'b',targetId:'a',amount:10,absorbed:0}]);
assert.equal(recoil.preparation.pose,7);assert.equal(recoil.impact.pose,7,'being hit overrides own swing');assert.equal(recoil.rest.pose,0);
const guarded={...a,guarding:true};
assert.equal(expeditionSpriteSequence(guarded,[guarded,b],[]).rest.pose,6);
assert.equal(expeditionSpriteSequence(guarded,[guarded,b],action('guard')).impact.pose,6);
const guardedHit=expeditionSpriteSequence(guarded,[guarded,b],[{type:'damage',targetId:'a',unitId:'b',amount:0,absorbed:15}]);
assert.equal(guardedHit.rest.pose,6,'blocked hit recovers to guard');
const dead={...a,dead:true,hp:0};
const final=expeditionSpriteSequence(dead,[dead,b],action('attack'));assert.equal(final.animate,false);assert.equal(final.rest.pose,7,'permanent death must not animate a recovery');
for(const events of [[],[{type:'damage',unitId:'a',targetId:'b',amount:0,absorbed:0}],action('switch')])assert.equal(expeditionSpriteSequence(a,units,events).animate,false,'no invented attack for idle, missed damage or switch');
assert.equal(expeditionSpriteSequence(null,units,[]),null);assert.equal(expeditionSpriteSequence(a,null,[]),null);
assert.equal(JSON.stringify(units),before,'presentation leaves combat HP/slots/state unchanged');
for(const elapsed of [0,1,173,446,540,719,720,721,9000])assert.equal(expeditionFeedbackDelay(100,100+elapsed),elapsed?-Math.min(elapsed,720):0,'rerender resumes the original beat instead of replaying the attack');
assert.equal(expeditionFeedbackDelay(100,99),0);assert.equal(expeditionFeedbackDelay(NaN,100),0);
let connected=0;
for(const id of Object.keys(EXPEDITION_SPECIES))if(expeditionAllyArt(id).path){connected++;const u={...a,speciesId:id};for(const kind of ['attack','skill1','awaken','guard']){const s=expeditionSpriteSequence(u,[u,b],action(kind));for(const phase of ['preparation','impact','rest'])assert.ok(s[phase].pose>=0&&s[phase].pose<8);}}
assert.equal(connected,67,'only existing audited sheets, not imaginary 162 completed motion sets');
const css=readFileSync(new URL('../src/expedition/view.css',import.meta.url),'utf8');
assert.match(css,/exv-sprite-beat \.72s steps\(1,end\)/,'sprite cells switch discretely, never interpolate across neighbouring poses');
assert.match(css,/62%,100%\{background-position:var\(--pose-rest-x\)/);
assert.match(css,/prefers-reduced-motion:reduce.*exv-pose-sequence/s);
for(const selector of ['.exv-unit.shielding .exv-unit-art::before{','.exv-impact{','.exv-float{'])assert.ok(css.lastIndexOf('animation-delay:var(--feedback-delay,0ms)')>css.indexOf(selector),'elapsed delay must survive later animation shorthand: '+selector);
assert.equal(EXPEDITION_FEEDBACK_MS,720);
console.log('PASS finite preparation→strike→rest for 67 existing sheets; hit/death/guard priority, rerender elapsed delay, reduced motion and no combat mutation.');
