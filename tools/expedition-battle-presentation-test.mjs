import assert from 'node:assert/strict';
import {expeditionFormationSpot,expeditionActionPresentation,expeditionUnitFeedback} from '../src/expedition/battle-presentation.js';
import {EXPEDITION_SPECIES} from '../src/expedition/species.js';
for(const side of ['ally','enemy']){
 const front=expeditionFormationSpot(side,0),back=expeditionFormationSpot(side,2);
 assert.ok(side==='ally'?front.x>back.x:front.x<back.x,'front must face the opponent, never top/bottom');
 for(let slot=0;slot<5;slot++)assert.equal(expeditionFormationSpot(side,slot).front,slot<2);
}
assert.equal(expeditionFormationSpot('ally',5),null);
assert.equal(expeditionFormationSpot('unknown',0),null);
for(const species of Object.values(EXPEDITION_SPECIES))for(const kind of ['attack','skill1','skill2','awaken','guard','switch']){
 const ui=expeditionActionPresentation(species.id,kind);assert.ok(ui.title&&ui.hint);assert.match(ui.color,/^#[0-9a-f]{6}$/);
}
const units=[{id:'a',speciesId:'split',side:'ally'},{id:'b',speciesId:'dream-normal-0',side:'enemy'}];
const events=[{type:'action',unitId:'a',kind:'skill1',seq:1},{type:'damage',unitId:'a',targetId:'b',amount:16,absorbed:0,seq:2}];
const raw=JSON.stringify({units,events});
assert.equal(expeditionUnitFeedback(units[0],units,events).pose,4);
const hit=expeditionUnitFeedback(units[1],units,events);assert.equal(hit.law,'split');assert.deepEqual(hit.labels,['−16']);assert.equal(hit.hit,true);
assert.equal(expeditionUnitFeedback(units[1],units,[]).hit,false,'no damage event means no invented impact');
assert.equal(expeditionUnitFeedback(units[0],units,[]).pose,0,'completed presentation returns to idle');
assert.deepEqual(expeditionUnitFeedback(units[1],units,[{type:'damage',unitId:'a',targetId:'b',amount:0,absorbed:20}]).labels,['막음']);
assert.equal(expeditionUnitFeedback({...units[0],guarding:true},units,[]).pose,6);
assert.equal(expeditionUnitFeedback({...units[1],dead:true},units,[]).pose,7);
assert.equal(JSON.stringify({units,events}),raw,'presentation must not mutate combat state');
const many=Array.from({length:100},(_,seq)=>({type:'damage',targetId:'b',unitId:'a',amount:1,seq}));
assert.equal(expeditionUnitFeedback(units[1],units,many).labels.length,3,'bounded feedback, no infinite DOM numbers');
console.log('PASS facing 5-slot formations, 162 canonical ability summaries, finite actual-event-only presentation, no combat mutation.');
