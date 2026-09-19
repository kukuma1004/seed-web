import assert from 'node:assert/strict';
import {LAWS,HIDDEN_LAWS} from '../src/laws.js';
import {ACT3_GRAMMAR} from '../src/act3.js';
import {
 BASELINE_GRAMMAR,BATTLEFIELD_GRAMMARS,BATTLEFIELD_PROTOTYPES,BATTLEFIELD_LAW_IDS,
 BATTLEFIELD_INTERACTIONS,battlefieldGrammar,battlefieldInteraction
} from '../src/battlefield-grammar.js';

const ids=BATTLEFIELD_GRAMMARS.map(entry=>entry.id);
assert.deepEqual(ids,'ABCDEFGHIJKL'.split(''),'the official library is exactly A-L');
assert.equal(new Set(ids).size,12,'battlefield codes are unique');
assert.equal(BASELINE_GRAMMAR.id,'BASE');
assert.deepEqual(BATTLEFIELD_PROTOTYPES,['BASE','A','B','F','E'],'the first comparison suite stays fixed');
assert.equal(ACT3_GRAMMAR,'A','the existing storm route is grammar A');
assert.equal(battlefieldGrammar('A').state,'playable');
assert.equal(battlefieldGrammar('BASE').state,'playable');
assert.equal(battlefieldGrammar('Z'),null);

assert.deepEqual(Object.keys(LAWS),BATTLEFIELD_LAW_IDS.filter(id=>id!=='portal'),'all live laws have a battlefield column');
assert.deepEqual(HIDDEN_LAWS,['portal'],'portal stays research-only');

const validModes=new Set(['route','coverage','relay','defend','focus','reshape','control','bypass']);
for(const entry of BATTLEFIELD_GRAMMARS){
 assert.ok(entry.question.endsWith('?'),`${entry.id} asks a player-facing question`);
 assert.ok(entry.featuredLaws.length>=3,`${entry.id} has showcase laws without requiring one`);
 assert.ok(entry.performance.maxEnemies<=20,`${entry.id} enemy budget stays bounded`);
 assert.ok(entry.performance.maxHostileProjectiles<=92,`${entry.id} projectile budget stays bounded`);
 assert.ok(entry.performance.maxInteractiveProps<=24,`${entry.id} prop budget stays bounded`);
 assert.equal(entry.performance.dynamicLights,0,`${entry.id} does not add per-entity lights`);
 assert.equal(entry.performance.pooledSignals,true);
 assert.equal(entry.performance.sharedGeometry,true);
 const row=BATTLEFIELD_INTERACTIONS[entry.id];
 assert.deepEqual(Object.keys(row),BATTLEFIELD_LAW_IDS,`${entry.id} covers every live and research law`);
 const modes=new Set();const lines=new Set();
 for(const lawId of BATTLEFIELD_LAW_IDS){
  const interaction=battlefieldInteraction(entry.id,lawId);
  assert.ok(validModes.has(interaction.mode),`${entry.id}/${lawId} uses an authored interaction mode`);
  assert.ok(interaction.line.length>=24,`${entry.id}/${lawId} explains visible play`);
  assert.ok(!/필수|사용 불가|무효/.test(interaction.line),`${entry.id}/${lawId} is not a required or blocked answer`);
  modes.add(interaction.mode);lines.add(interaction.line);
 }
 assert.ok(modes.size>=5,`${entry.id} supports several ways to solve its problem`);
 assert.equal(lines.size,BATTLEFIELD_LAW_IDS.length,`${entry.id} does not repeat placeholder interactions`);
}

for(const lawId of BATTLEFIELD_LAW_IDS){
 const lines=new Set(ids.map(id=>battlefieldInteraction(id,lawId).line));
 assert.equal(lines.size,12,`${lawId} receives a distinct visible use in every battlefield`);
}

assert.equal(Object.keys(BATTLEFIELD_INTERACTIONS).length,12);
assert.equal(ids.reduce((sum,id)=>sum+Object.keys(BATTLEFIELD_INTERACTIONS[id]).length,0),120,'the matrix has 12 x 10 authored cells');
console.log('Battlefield grammar: A-L registry, five prototypes, 120 law interactions and low-end budgets passed.');
