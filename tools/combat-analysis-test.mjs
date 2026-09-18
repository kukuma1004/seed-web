import assert from 'node:assert/strict';
import {createCombatAnalysis,recordPersonalBests,combatGrade} from '../src/combat-analysis.js';
import {normalizeDiscoveries} from '../src/discoveries.js';

const analysis=createCombatAnalysis();analysis.begin(10,{stage:2});
analysis.damage('collapse',100,10.2);analysis.damage('collapse',50,11.2);analysis.damage('seed',30,11.6);analysis.utility('freeze',2);analysis.kill();
const report=analysis.finish(12);
assert.equal(Math.round(report.dps),90);assert.equal(report.kills,1);assert.equal(report.utility.freeze,2);
assert.equal(report.sources[0].id,'collapse');assert.equal(report.sources[0].peak,100);
const profile=recordPersonalBests({version:1,forms:['collapse'],bosses:[],records:{}},report,123);
assert.equal(profile.records.collapse.dps,75);assert.equal(profile.records.collapse.peak,100);
const normalized=normalizeDiscoveries(profile);assert.equal(normalized.records.collapse.dps,75);
assert.equal(combatGrade(600),'A');
console.log('combat analysis tests passed');
