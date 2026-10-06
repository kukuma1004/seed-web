import assert from 'node:assert/strict';
import {EXPEDITION_GARDENS,EXPEDITION_ENEMIES,expeditionEncounter,newExpeditionRoute,advanceExpeditionRoute} from '../src/expedition/world.js';
assert.equal(Object.keys(EXPEDITION_GARDENS).length,8);
assert.equal(EXPEDITION_GARDENS.greenhouse,undefined);
assert.deepEqual(Object.values(EXPEDITION_GARDENS).map(g=>g.law).sort(),['pierce','split','recall','frost','orbit','burst','gravity','reflect'].sort());
for(const rank of ['normal','elite','boss'])assert.equal(Object.values(EXPEDITION_ENEMIES).filter(e=>e.rank===rank).length,{normal:32,elite:16,boss:8}[rank]);
for(const id of Object.keys(EXPEDITION_GARDENS))for(const kind of ['normal','elite','boss']){
 const a=expeditionEncounter(id,{kind,difficulty:1}),b=expeditionEncounter(id,{kind,difficulty:5});
 assert(a.length<=5);assert(b[0].maxHp>a[0].maxHp);assert(b[0].power>a[0].power);
 assert(a.every(e=>EXPEDITION_ENEMIES[e.speciesId]));
 if(kind==='boss'){assert(a.some(e=>e.boss));assert(EXPEDITION_ENEMIES[id+'-boss'].tell);}
}
assert.throws(()=>expeditionEncounter('greenhouse'));
assert.throws(()=>expeditionEncounter('fire',{difficulty:NaN}));
assert.throws(()=>newExpeditionRoute({runId:'run-a',gardenId:'blossom',partyIds:Array(8).fill(null)}));
assert.throws(()=>newExpeditionRoute({runId:'run-a',gardenId:'constructor',partyIds:['seed-a',null,null,null,null,null,null,null]}));
const r=newExpeditionRoute({runId:'run-a',gardenId:'blossom',partyIds:['seed-a',null,null,null,null,null,null,null]});
assert(newExpeditionRoute({runId:'r'.repeat(100),gardenId:'meadow',partyIds:['i'.repeat(128),null,null,null,null,null,null,null]}));
assert.throws(()=>newExpeditionRoute({runId:'r'.repeat(101),gardenId:'meadow',partyIds:['i',null,null,null,null,null,null,null]}));
assert.throws(()=>newExpeditionRoute({runId:'r',gardenId:'meadow',partyIds:['i'.repeat(129),null,null,null,null,null,null,null]}));
for(let i=0;i<9;i++)assert(advanceExpeditionRoute(r));assert.equal(advanceExpeditionRoute(r),false);
console.log('PASS 8 final-spec gardens, 32/16/8 candidate enemy profiles, difficulty bounds and finite route. Sprite/unique AI and human campaign QA pending.');
