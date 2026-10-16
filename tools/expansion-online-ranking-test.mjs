import assert from 'node:assert/strict';
import {closedExpansionActs,openExpansionActs} from './expansion-gate-fixtures.mjs';
import fs from 'node:fs';
import {EXPANSION_ACTS} from '../src/act-expansion.js';
import {EXPANSION_CIRCUIT_KILLS,CROSSWIND_CIRCUIT_KILLS} from '../src/act-expansion-runtime.js';
import {ACT,SEASON,PENDING_KEY,RUNS_PATH,BUILDS_PATH,JOURNEY_EXPANSION_KILL_BUDGET,runAct,validRun,bestPerPlayer,createOnlineRanking} from '../src/online-ranking.js';
import {buildRecord,bossText} from '../src/ranking-build.js';
const acts=openExpansionActs;
const entry={uid:'u',name:'씨앗',score:25440,cycle:2,stage:4,kills:372,time:680,act:4,done:true,at:SEASON.start+1};
assert.equal(ACT.CROSSWIND_KEEPER,4);assert.equal(ACT.CRYSTAL_GARDENER,5);assert.equal(runAct(entry),4);assert.equal(runAct({...entry,act:5}),5);
for(const act of [4,5]){
 const e={...entry,act};assert(!validRun(e,{acts:closedExpansionActs}));assert(validRun(e,{acts}));
 assert(!validRun(e,{acts:{...acts,crystalGorge:{released:false}}}));
 for(const edit of [{cycle:3},{cycle:1},{stage:3},{score:1},{score:1e9},{time:1},{kills:1e7},{act:6}])assert(!validRun({...e,...edit},{acts}),JSON.stringify(edit));
 assert.match(bossText(buildRecord({austins:3}),act),act===4?/횡풍의 수호자 3회/:/수정의 정원사 3회/);
}
const board={a:entry,b:{...entry,act:5,score:25460},c:{...entry,uid:'v',score:25441}};
assert.deepEqual(bestPerPlayer(board,20,SEASON,4,{acts}).map(e=>e.id),['c','a']);assert.equal(bestPerPlayer(board,20,SEASON,4,{acts:closedExpansionActs}).length,0);

// Execute the actual candidate rule expressions with snapshot stubs. This is
// contract validation, not an emulator or a published Firebase authorization.
const rules=JSON.parse(fs.readFileSync('docs/firebase-rules-with-seed.json','utf8')).rules.seedRanking.season12.runs.$runId;
function snap(value){return {val:()=>value,child:key=>snap(value?.[key]),hasChildren:keys=>keys.every(k=>value?.[k]!==undefined),isNumber:()=>typeof value==='number'};}
function allowed(e,released){const root=snap({seedExpansionRelease:released?{crosswind:true,crystalGorge:true}:{crosswind:true,crystalGorge:false}});return Function('newData','root',`return (${rules['.validate']});`)(snap(e),root)&&Function('newData','root',`return (${rules.act['.validate']});`)(snap(e.act),root);}
assert.equal(CROSSWIND_CIRCUIT_KILLS,220,'shared Survival/Defense packet budget is unchanged');assert.equal(EXPANSION_CIRCUIT_KILLS,166,'shared Survival/Defense packet budget is unchanged');
assert.deepEqual(JOURNEY_EXPANSION_KILL_BUDGET,{4:225,5:171});
const newMaximums=[];
for(const act of [4,5]){
 const e={...entry,act};assert(allowed(e,true));assert(!allowed(e,false));
 for(let cycle=0;cycle<3;cycle++){
  const kills=JOURNEY_EXPANSION_KILL_BUDGET[act]*(cycle+1),max={...e,cycle,kills,score:kills*25+6000*(cycle+1),done:cycle===2};newMaximums.push(max);
  assert(validRun(max,{acts})&&allowed(max,true),`act ${act} lap ${cycle+1} includes five real Journey guardian kills`);
  assert(!validRun({...max,kills:max.kills+1},{acts})&&!allowed({...max,kills:max.kills+1},true),'one beyond each physical budget is rejected on both sides');
  const legacyKills=(act===4?CROSSWIND_CIRCUIT_KILLS:EXPANSION_CIRCUIT_KILLS)*(cycle+1),legacy={...max,kills:legacyKills};assert(validRun(legacy,{acts})&&allowed(legacy,true),'earlier guardian-free legitimate records remain readable');
 }
 for(const edit of [{cycle:3},{done:true,stage:2},{score:1e9},{time:1},{kills:372.5}])assert(!allowed({...e,...edit},true));
}
const old={...entry,act:1,score:5000,kills:30,time:700,cycle:4,stage:4,done:false};assert(allowed(old,false));assert(validRun(old));

const rows=new Map(),storage={getItem:k=>rows.get(k)??null,setItem:(k,v)=>rows.set(k,v)};let serial=0,reads=0;const sent={},builds={};
const response=b=>({ok:true,json:async()=>structuredClone(b)});
const fetchImpl=async(url,o={})=>{
 const u=new URL(url),path=u.pathname.slice(1,-5);
 if(o.method==='POST'){assert.equal(path,RUNS_PATH);const body=JSON.parse(o.body);assert([1,4,5].includes(body.act));assert.equal(body.uid,'u');sent['rank'+ ++serial]={...body,at:SEASON.start+1};return response({name:'rank'+serial});}
 if(o.method==='PUT'){assert(path.startsWith(BUILDS_PATH+'/'));builds[path.split('/').at(-1)]=JSON.parse(o.body);return response(null);}
 reads++;return response(path===BUILDS_PATH?builds:sent);
};
const authProvider=async()=>({uid:'u',idToken:'mock',account:true});
const rank=createOnlineRanking({storage,fetchImpl,authProvider,acts});
for(const act of [4,5]){const r=await rank.submit({...entry,act,build:buildRecord({forms:new Map([['rewind',5]]),austins:3})});assert.equal(r.rank,1);assert.equal(r.board[0].act,act);assert.match(r.board[0].build.forms,/rewind:5/);}
assert.equal(serial,2);assert(reads>0);
for(const maximum of newMaximums){await rank.submit(maximum);assert(Object.values(sent).some(value=>value.act===maximum.act&&value.kills===maximum.kills&&value.cycle===maximum.cycle&&value.done===maximum.done),'actual REST client submits each new Journey maximum');}
assert.equal(serial,8);
const closed=createOnlineRanking({storage,fetchImpl,authProvider,acts:closedExpansionActs});await assert.rejects(closed.submit(entry),/invalid-run/);assert.equal(serial,8,'closed release fixture sends nothing');
storage.setItem(PENDING_KEY,JSON.stringify([entry]));assert.equal(await closed.flush(),0);assert.equal(JSON.parse(storage.getItem(PENDING_KEY))[0].act,4,'release rollback preserves queued expansion result');
storage.setItem(PENDING_KEY,JSON.stringify([entry,old]));assert.equal(await closed.flush(),1);assert.equal(JSON.parse(storage.getItem(PENDING_KEY))[0].act,4,'deferred expansion result does not block existing three-act upload');
console.log('Expansion ranking: same season/act filtering/build identity, closed promotion gate, bounded scores/time/three-lap end, candidate-rule contract, actual REST client mock submits and rollback pending preservation passed. No server publish or UI exposure.');
