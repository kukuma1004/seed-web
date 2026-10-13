import assert from 'node:assert/strict';
import {GARDEN_CHALLENGE_RECORD_KEY,readGardenChallengeRecords,recordGardenChallenge} from '../src/garden-challenge-records.js';
const values=new Map([['seed-profile','untouched']]),writes=[];
const storage={getItem:k=>values.get(k)??null,setItem:(k,v)=>{writes.push(k);values.set(k,v);}};
assert.equal(readGardenChallengeRecords(storage).ok,true);
for(let i=0;i<19;i++)assert.equal(recordGardenChallenge({difficulty:i%2?'expert':'normal',phase:i%3?'won':'lost',score:i*17,kills:i,seconds:132+i,build:['관통 Lv.2','폭발 Lv.1'],fusion:'빛나는 가시',reason:''},storage,1000+i).ok,true);
const result=readGardenChallengeRecords(storage);assert.equal(result.records.normal.plays,10);assert.equal(result.records.expert.plays,9);assert.equal(result.records.recent.length,12);assert.equal(result.records.recent[0].at,1018);assert.equal(result.records.expert.bestScore,289);assert.equal(values.get('seed-profile'),'untouched');assert(writes.every(k=>k===GARDEN_CHALLENGE_RECORD_KEY));
const count=writes.length;
for(const bad of [{difficulty:'nightmare'},{phase:'playing'},{score:-1},{seconds:Infinity},{seconds:300},{build:['x'.repeat(81)]}])assert.equal(recordGardenChallenge({difficulty:'normal',phase:'won',score:4,kills:1,seconds:150,build:[],...bad},storage).ok,false);
assert.equal(writes.length,count);
assert.equal(readGardenChallengeRecords({getItem(){throw new Error('blocked');}}).ok,false);
assert.equal(recordGardenChallenge({difficulty:'normal',phase:'lost',score:1,kills:1,seconds:20,build:[]},{getItem:()=>null,setItem(){throw new Error('quota');}}).ok,false);
for(const corrupt of ['not json',JSON.stringify({version:2}),JSON.stringify({...result.records,recent:[{...result.records.recent[0],build:[{}]}]}),JSON.stringify({...result.records,normal:{plays:2,wins:3,bestScore:4,bestSeconds:null}})]){values.set(GARDEN_CHALLENGE_RECORD_KEY,corrupt);assert.equal(readGardenChallengeRecords(storage).ok,false);assert.equal(recordGardenChallenge({difficulty:'normal',phase:'won',score:1,kills:1,seconds:150,build:[]},storage).ok,false);assert.equal(values.get(GARDEN_CHALLENGE_RECORD_KEY),corrupt);}
console.log('Garden Challenge records PASS: bounded 12, separate difficulty, strict schema, one isolated key, corruption and storage failure preserved.');
