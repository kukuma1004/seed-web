import assert from 'node:assert/strict';
import {readFileSync,writeFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {EXPANSION_CIRCUIT_KILLS} from '../src/act-expansion-runtime.js';

// Fresh full admin export only. Preserve every permission and unrelated rule;
// this changes the existing act4/5 physical kill budget, never player data.
const [beforePath,outputPath]=process.argv.slice(2);
assert(beforePath&&outputPath&&beforePath!==outputPath);
const before=JSON.parse(readFileSync(beforePath,'utf8').replace(/^\uFEFF/,'')),after=structuredClone(before);
const rule=after.rules?.seedRanking?.season12?.runs?.$runId;
assert(rule&&typeof rule['.validate']==='string');
const old="(newData.child('cycle').val() + 1) * 128";
assert.equal(rule['.validate'].split(old).length,2,'exact legacy ceiling must appear once');
assert(rule['.validate'].includes("newData.child('act').val() == 4 || newData.child('act').val() == 5"));
const value=rule['.validate'];
rule['.validate']=value.replace(old,`(newData.child('cycle').val() + 1) * ${EXPANSION_CIRCUIT_KILLS}`);
const restored=structuredClone(after);restored.rules.seedRanking.season12.runs.$runId['.validate']=value;
assert.deepEqual(restored,before,'all permissions and other validation remain byte-semantically identical');
writeFileSync(outputPath,JSON.stringify(after,null,2)+'\n');
console.log(JSON.stringify({path:'seedRanking/season12/runs/$runId/.validate',old:128,next:EXPANSION_CIRCUIT_KILLS,beforeSha256:createHash('sha256').update(JSON.stringify(before)).digest('hex'),unrelatedRulesPreserved:true,playerDataWritten:false}));
