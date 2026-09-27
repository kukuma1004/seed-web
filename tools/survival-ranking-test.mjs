import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createSurvivalRanking,validSurvivalRank,survivalPlaces} from '../src/survival-ranking.js';
const entry=(uid='a',score=100)=>({uid,name:'씨앗',score,kills:100,bosses:0,time:60,laws:'split:2',forms:'prism:1'});
assert(validSurvivalRank(entry()));
for(const bad of [{score:3001},{time:0},{bosses:1,time:179},{forms:'x'.repeat(121)},{kills:1.5}])assert(!validSurvivalRank({...entry(),...bad}));
assert.deepEqual(survivalPlaces([entry('a',100),entry('b',100),entry('c',90)]).map(e=>e.rank),[1,1,3]);
let uid='a',offline=false,remote={},rev=0,puts=0,race=null;
const m=new Map(),storage={getItem:k=>m.get(k)||null,setItem:(k,v)=>m.set(k,v),removeItem:k=>m.delete(k)};
const reply=(body,status=200,etag=String(rev))=>({ok:status===200,status,json:async()=>structuredClone(body),headers:{get:()=>etag}});
const fetchImpl=async(url,options)=>{
 assert(url.includes('/seedSurvivalRanking/v1'));assert(!url.includes('/seedRanking/'));
 if(offline)throw Error('offline');
 const path=new URL(url).pathname,id=path.split('/').at(-1).replace('.json','');
 if(options.method==='PUT'){
  if(race){const cb=race;race=null;cb();}
  if(options.headers['if-match']!==String(rev))return reply(null,412);
  const e=JSON.parse(options.body);assert.equal(e.uid,uid);remote[id]=e;rev++;puts++;return reply(e);
 }
 if(id==='v1')return reply(remote);
 return reply(remote[id]||null);
};
const ranking=createSurvivalRanking({storage,authProvider:async()=>({uid,idToken:'test'}),fetchImpl});
await ranking.submit(entry());assert.equal(remote.a.score,100);
await ranking.submit(entry());assert.equal(puts,1,'duplicate submission is idempotent');
await ranking.submit(entry('a',50));assert.equal(remote.a.score,100,'never lower a best');
race=()=>{remote.a=entry('a',500);rev++;};await ranking.submit(entry('a',300));assert.equal(remote.a.score,500,'another device wins safely');
offline=true;await assert.rejects(ranking.submit(entry('a',600)));assert.equal(m.size,1);
uid='b';offline=false;await ranking.flush();assert.equal(remote.b,undefined,'pending A cannot be submitted as B');
uid='a';await ranking.flush();assert.equal(remote.a.score,600);assert.equal(m.size,0);
await assert.rejects(ranking.submit(entry('b',700)),/account-changed/);assert.equal(remote.b,undefined);
uid='b';await ranking.flush();assert.equal(remote.b.score,700);
let board=await ranking.board();assert.equal(board.top[0].uid,'b');assert.equal(board.mine.rank,1);
uid='a';board=await ranking.board();assert.equal(board.mine.rank,2);
remote={};for(let i=0;i<1000;i++)remote['u'+i]=entry('u'+i,900);remote.a=entry('a',100);
board=await ranking.board();assert.equal(board.top.length,10);assert.equal(board.mine.rank,0,'truncated board must not invent an exact own rank');
// Invalid records do not enter the public board.
remote={bad:{...entry('bad'),score:1e9},a:entry()};board=await ranking.board();assert.equal(board.top.length,1);
const main=readFileSync(new URL('../src/main.js',import.meta.url),'utf8');
const journeys=main.slice(main.indexOf('function showJourneys()'),main.indexOf('// Every visible ranking line'));
assert(!journeys.includes('nameFieldHtml'));assert(!journeys.includes('bindNameField'));
assert(main.includes('survivalSaveToken?.owner!==account.user()?.uid'));
assert(main.includes('isTestRun:Boolean(session.lab||session.benchmark||developerRun)'));
assert(main.includes('survival-result-ranking'));assert(main.includes('hall-survival-ranking'));
const rules=JSON.parse(readFileSync(new URL('../docs/firebase-rules-with-seed.json',import.meta.url),'utf8')).rules.seedSurvivalRanking.v1;
assert.deepEqual(rules['.indexOn'],['score']);assert(rules.$uid['.write'].includes('auth.uid == $uid'));assert.equal(rules.$uid.$other['.validate'],false);
console.log('Survival ranking: identity, offline retry, ETag race, ties, bounds, dedicated rules and menu routing passed');

assert(validSurvivalRank({...entry(),bosses:3,time:540}));
assert(!validSurvivalRank({...entry(),bosses:3,time:539}));
assert(validSurvivalRank({...entry(),bosses:3,time:810}),'old records remain valid');
assert(rules.$uid['.validate'].includes("newData.child('bosses').val() * 180"));
