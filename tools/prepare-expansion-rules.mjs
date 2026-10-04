import assert from 'node:assert/strict';
import {readFileSync,writeFileSync} from 'node:fs';
import {createHash} from 'node:crypto';

// Start with a fresh admin export. Never replace unrelated live school, account
// or independently staged duel rules with an older repository copy.
const [backup,output]=process.argv.slice(2);assert(backup&&output,'Usage: node tools/prepare-expansion-rules.mjs live-export.json output.json');assert.notEqual(backup,output);
const live=JSON.parse(readFileSync(backup,'utf8').replace(/^\uFEFF/,'')),candidate=JSON.parse(readFileSync(new URL('../docs/firebase-rules-with-seed.json',import.meta.url),'utf8'));
assert(live.rules&&candidate.rules);assert.equal(live.rules['.read'],false);assert.equal(live.rules['.write'],false);
const merged=structuredClone(live);
const paths=[
 ['seedRanking','season12','runs','$runId','.validate'],
 ['seedRanking','season12','runs','$runId','act','.validate'],
 ['seedWebTelemetry','v1','days','$day','sessions','$platform','$uid','$eventId','act','.validate'],
 ['seedDefenseRanking','v2','$uid','towers','.validate']
];
for(const path of paths){let target=merged.rules,source=candidate.rules;for(const key of path.slice(0,-1)){assert(target[key]&&source[key],`Missing live/candidate ${path.join('/')}`);target=target[key];source=source[key];}const key=path.at(-1);assert.equal(typeof target[key],'string');assert.equal(typeof source[key],'string');target[key]=source[key];}
for(const key of ['seedExpansionRelease','seedExpansionSaves']){assert(candidate.rules[key]);merged.rules[key]=structuredClone(candidate.rules[key]);}
// Prove the complete export changes only this explicit allowlist.
const restore=structuredClone(merged);
for(const path of paths){let target=restore.rules,source=live.rules;for(const key of path.slice(0,-1)){target=target[key];source=source[key];}target[path.at(-1)]=source[path.at(-1)];}
for(const key of ['seedExpansionRelease','seedExpansionSaves']){if(Object.hasOwn(live.rules,key))restore.rules[key]=live.rules[key];else delete restore.rules[key];}
assert.deepEqual(restore,live);
writeFileSync(output,JSON.stringify(merged,null,2)+'\n');
console.log(JSON.stringify({changes:[...paths.map(p=>p.join('/')),'seedExpansionRelease','seedExpansionSaves'],liveSha256:createHash('sha256').update(JSON.stringify(live)).digest('hex'),unrelatedRulesPreserved:true,releaseFlagsWritten:false}));
