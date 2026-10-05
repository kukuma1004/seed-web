import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createMockUserToken} from '@firebase/util';
import {EXPANSION_ACTS} from '../src/act-expansion.js';
import {EXPANSION_CIRCUIT_KILLS} from '../src/act-expansion-runtime.js';
import {createExpansionJourney} from '../src/expansion-journey.js';
import {createExpansionAccountEntry} from '../src/expansion-account-save.js';
import {decodeExpansionAccountCloud} from '../src/expansion-account-sync.js';

// Only the local demo emulator may run this test. It must never contact a live
// Firebase database, use a real account token or write a player's saved data.
assert.equal(process.env.FIREBASE_DATABASE_EMULATOR_HOST,'127.0.0.1:19004');
const project='demo-seed-linked',base='http://127.0.0.1:19004',owner='emulator-owner';
const token=uid=>createMockUserToken({sub:uid,firebase:{sign_in_provider:'password'}},project);
const authenticated=token(owner),other=token('emulator-other'),anonymous=createMockUserToken({sub:owner,firebase:{sign_in_provider:'anonymous'}},project);
async function request(path,{method='GET',value,auth=authenticated,admin=false,headers={}}={}){
 const url=new URL(`${base}/${path}.json`);url.searchParams.set('ns',project);if(auth&&!admin)url.searchParams.set('auth',auth);
 return fetch(url,{method,headers:{...headers,...(admin?{Authorization:'Bearer owner'}:{}),'Content-Type':'application/json'},...(value===undefined?{}:{body:JSON.stringify(value)})});
}
async function allow(path,o){const r=await request(path,o);assert(r.ok,`${o?.method||'GET'} ${path}: ${r.status} ${await r.clone().text()}`);return r;}
async function deny(path,o){const r=await request(path,o);assert.equal(r.status,401,`${o?.method||'GET'} ${path} must be denied, got ${r.status}`);}
const rules=JSON.parse(readFileSync(process.argv[2]||'artifacts/firebase-linked-release.rules.json','utf8'));
await allow('.settings/rules',{method:'PUT',value:rules,admin:true});
await allow('',{method:'PUT',value:{seedExpansionRelease:{crosswind:false,crystalGorge:false}},admin:true});
const acts=Object.fromEntries(Object.entries(EXPANSION_ACTS).map(([id,x])=>[id,{...x,released:true}]));
const run={version:1,cycle:0,region:'garden',stage:0,mode:'entry',hp:100,kills:3,elapsed:15,rules:[],mutated:[],forms:{returnblade:5},inventory:{potion:3,tonic:2,wind:1,shell:1,sprout:1},score:300,choicesTaken:2,choiceKills:3};
const saved=act=>{const record=createExpansionAccountEntry(createExpansionJourney(act,0,413),run,[0,0,5],{owner,currentOwner:owner,acts,id:'emulator-'+act});assert(record);record.entry.revision=1;record.entry.savedAt=Date.now();return {version:1,ownerUid:owner,act,revision:1,checkpoint:JSON.stringify(record)};};
const rank=act=>({uid:owner,name:'씨앗',score:25440,cycle:2,stage:4,kills:372,time:680,act,done:true,at:Date.now()-1000});
const telemetry=act=>({startedAt:Date.now()-1000,activeSeconds:40,act,outcome:'active'});
const tpath=(act,platform='web')=>`seedWebTelemetry/v1/days/20261004/sessions/${platform}/${owner}/event000${act}`;
await deny('seedExpansionRelease',{method:'PATCH',value:{crosswind:true}});
for(const [act,n] of [['crosswind',4],['crystalGorge',5]]){
 const path=`seedExpansionSaves/${owner}/${act}`,value=saved(act);
 await deny(path,{method:'PUT',value});await deny(`seedRanking/season12/runs/closed${n}`,{method:'PUT',value:rank(n)});await deny(tpath(n),{method:'PUT',value:telemetry(n)});
}
await allow('seedExpansionRelease',{method:'PUT',value:{crosswind:true,crystalGorge:true},admin:true});
for(const [act,n] of [['crosswind',4],['crystalGorge',5]]){
 const path=`seedExpansionSaves/${owner}/${act}`,value=saved(act);
 for(const auth of [null,anonymous,other])await deny(path,{method:'PUT',value,auth});
 for(const bad of [{...value,ownerUid:'emulator-other'},{...value,act:'future'},{...value,extra:true},{...value,revision:2},{...value,checkpoint:'x'.repeat(100001)}])await deny(path,{method:'PUT',value:bad});
 await allow(path,{method:'PUT',value});
 const current=await allow(path,{headers:{'X-Firebase-ETag':'true'}}),etag=current.headers.get('etag');assert(etag);
 const fetched=await current.json();assert.equal(decodeExpansionAccountCloud(fetched,{owner,act}).record.entry.run.inventory.potion,3);
 for(const auth of [null,anonymous,other])await deny(path,{auth});
 await deny(path,{method:'PUT',value});await deny(path,{method:'DELETE'});
 await allow(path,{method:'PUT',value:{...value,revision:2},headers:{'If-Match':etag}});
 const stale=await request(path,{method:'PUT',value:{...value,revision:3},headers:{'If-Match':etag}});assert.equal(stale.status,412,'actual emulator ETag rejects a stale device');
 await allow(`seedRanking/season12/runs/accepted${n}`,{method:'PUT',value:rank(n)});
 const maximum={...rank(n),kills:EXPANSION_CIRCUIT_KILLS*3};await allow(`seedRanking/season12/runs/freshMax${n}`,{method:'PUT',value:maximum});await deny(`seedRanking/season12/runs/overFreshMax${n}`,{method:'PUT',value:{...maximum,kills:maximum.kills+1}});
 for(const edit of [{cycle:3},{score:1e9},{kills:372.5},{stage:3},{time:1}])await deny(`seedRanking/season12/runs/bad${n}`,{method:'PUT',value:{...rank(n),...edit}});
 for(const auth of [null,anonymous,other])await deny(`seedRanking/season12/runs/wrong${n}`,{method:'PUT',value:rank(n),auth});
 for(const platform of ['web','android'])await allow(tpath(n,platform),{method:'PUT',value:telemetry(n)});
}
const old={...rank(1),score:5000,kills:30,time:700,cycle:4,done:false};await allow('seedRanking/season12/runs/legacy',{method:'PUT',value:old});
await allow(`seedDefenseRanking/v2/${owner}`,{method:'PUT',value:{uid:owner,name:'씨앗',score:4800010,cleared:48,hp:0,kills:10,time:80,towers:'ice-new:5,returnblade:3'}});
await deny('seedDefenseRanking/v2/emulator-other',{method:'PUT',value:{uid:owner,name:'씨앗',score:4800010,cleared:48,hp:0,kills:10,time:80,towers:'ice-new:5'}});
await deny(`seedExpansionSaves/${owner}/unknown`,{method:'PUT',value:saved('crosswind')});
await allow('seedExpansionRelease',{method:'PUT',value:{crosswind:false,crystalGorge:false},admin:true});
await deny(`seedExpansionSaves/${owner}/crosswind`);await deny(`seedExpansionSaves/${owner}/crosswind`,{method:'PUT',value:{...saved('crosswind'),revision:3}});
console.log('Real local RTDB emulator: rules compile, closed/open gates, UID/anonymous isolation, checkpoint limits, revision/delete restrictions, actual ETag 412, old/new rankings and web/Android telemetry passed. No production data was written.');
