import assert from 'node:assert/strict';
import {createDefense,DEFENSE,DEFENSE_STARTER_LAWS,defenseStarterLaws,plantDefense,removeDefense,checkpointDefense,restoreDefense,startDefenseWave} from '../src/seed-defense-rules.js';
for(const law of DEFENSE_STARTER_LAWS){
 const s=createDefense(73),random=createDefense(73);
 assert.deepEqual(defenseStarterLaws(s),DEFENSE_STARTER_LAWS);
 assert.equal(plantDefense(s,-1,law),false);assert.equal(s.currency,90);assert.equal(s.rng,random.rng);
 assert.equal(plantDefense(s,0,law),true);assert.equal(s.currency,90-DEFENSE.plantCost);
 assert.deepEqual(s.towers[0].laws,[law]);assert.equal(s.towers[0].line,law);
 plantDefense(random,0);assert.equal(s.rng,random.rng,'choice consumes the original random roll');
 const held=JSON.stringify(s);assert.equal(plantDefense(s,1,law),false);assert.equal(JSON.stringify(s),held);
 assert.equal(plantDefense(s,1),true);assert.equal(plantDefense(random,1),true);
 assert.equal(s.towers[1].line,random.towers[1].line,'later seeds retain original RNG stream');
 const restored=restoreDefense(checkpointDefense(s));assert.ok(restored);assert.equal(restored.towers[0].line,law);assert.deepEqual(defenseStarterLaws(restored),[]);
 removeDefense(restored,restored.towers[1].id);removeDefense(restored,restored.towers[0].id);
 assert.deepEqual(defenseStarterLaws(restored),[],'selling cannot restore first choice');
 assert.equal(plantDefense(restored,0,law),false);
}
const fresh=createDefense(91);assert.deepEqual(defenseStarterLaws(restoreDefense(checkpointDefense(fresh))),DEFENSE_STARTER_LAWS);
const before=JSON.stringify(fresh);assert.equal(plantDefense(fresh,0,'portal'),false);assert.equal(JSON.stringify(fresh),before);
fresh.currency=29;assert.deepEqual(defenseStarterLaws(fresh),[]);assert.equal(plantDefense(fresh,0,'frost'),false);
const wave=createDefense(7);plantDefense(wave,0);startDefenseWave(wave);assert.deepEqual(defenseStarterLaws(wave),[]);
console.log('PASS first-law payment, seeded random parity, save/restore, invalid inputs and repeat-choice protection');
