// Update the local rules candidate only. This command never authenticates or
// posts Firebase rules; deployment has its own verification and release step.
import assert from 'node:assert/strict';
import {readFileSync,writeFileSync} from 'node:fs';
import {DUEL_STORY_STAGE_COUNT} from '../src/seed-duel-story-progress.js';
import {DUEL_RANK_LIMITS} from '../src/duel-ranking-limits.js';
const path=new URL('../docs/firebase-rules-with-seed.json',import.meta.url);
const rules=JSON.parse(readFileSync(path,'utf8')),candidate=structuredClone(rules);
const duel=candidate.rules.seedModeRanking.duel.$uid;
duel.storyStage['.validate']=`newData.isNumber() && newData.val() >= 0 && newData.val() <= ${DUEL_STORY_STAGE_COUNT} && newData.val() % 1 == 0`;
duel.score['.validate']=`newData.isNumber() && newData.val() >= 1 && newData.val() <= ${DUEL_RANK_LIMITS.score} && newData.val() % 1 == 0`;
for(const field of ['character','opponent'])duel[field]['.validate']=`newData.isString() && newData.val().length <= ${DUEL_RANK_LIMITS.character}`;
const stage=candidate.rules.seedUsers.$uid.duelStory.cleared.$stage;
const pattern=`^s(${Array.from({length:DUEL_STORY_STAGE_COUNT},(_,i)=>i+1).join('|')})$`;
stage['.validate']=stage['.validate'].replace(/\$stage\.matches\(\/.*?\/\)/,`$stage.matches(/${pattern}/)`);
const expected=new RegExp(pattern);
for(let n=1;n<=DUEL_STORY_STAGE_COUNT;n++)assert(expected.test('s'+n));
for(const invalid of ['s0','s01','s-1','s'+(DUEL_STORY_STAGE_COUNT+1),'s12evil'])assert(!expected.test(invalid));
if(process.argv.includes('--write'))writeFileSync(path,JSON.stringify(candidate,null,2)+'\n');
else assert.deepEqual(rules,candidate,'duel ranking and account backup rule caps need a local update: node tools/duel-ranking-rules.mjs --write');
console.log(`Local duel rules: stage${DUEL_STORY_STAGE_COUNT}, derived score${DUEL_RANK_LIMITS.score}, character${DUEL_RANK_LIMITS.character}. No server publish.`);
