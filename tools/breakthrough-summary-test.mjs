import assert from 'node:assert/strict';
import {createBreakthrough,chooseBreakthrough} from '../src/seed-breakthrough-rules.js';
import {breakthroughRunSummary} from '../src/breakthrough-run-summary.js';
for(const id of ['pierce','burst','frost']){
 const s=createBreakthrough(id,73),before=JSON.stringify(s),r=breakthroughRunSummary(s);
 assert.notEqual(r.next,id);assert.deepEqual(r.growth,[]);assert.equal(r.camps,0);
 assert.equal(JSON.stringify(s),before,'summary cannot mutate save or combat');
 s.phase='choice';s.choiceCamp=0;s.offers=[{id:'earned',name:'획득 선택',description:'얻은 효과',changes:{damage:1.22}}];
 assert.ok(chooseBreakthrough(s,'earned'));s.phase='lost';s.camps[0].captured=true;
 assert.deepEqual(breakthroughRunSummary(s).growth,[{name:'획득 선택',description:'얻은 효과'}]);
 s.time=240;assert.match(breakthroughRunSummary(s).note,/시간/);
 s.phase='won';s.camps[1].captured=true;assert.match(breakthroughRunSummary(s).note,/마지막 장수/);
}
assert.equal(breakthroughRunSummary(null),null);
console.log('PASS earned build summary, next pilot, failure guidance and immutable result');
