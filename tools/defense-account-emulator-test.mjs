import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createMockUserToken} from '@firebase/util';
import {createDefense,checkpointDefense} from '../src/seed-defense-rules.js';
import {decodeDefenseAccountCloud} from '../src/defense-account-sync.js';
assert.equal(process.env.FIREBASE_DATABASE_EMULATOR_HOST,'127.0.0.1:19004');
const project='demo-seed-linked',base='http://127.0.0.1:19004',owner='emulator-owner';
const token=(uid,provider='password')=>createMockUserToken({sub:uid,firebase:{sign_in_provider:provider}},project),auth=token(owner);
async function request(path,{method='GET',value,authentication=auth,admin=false,headers={}}={}){
 const url=new URL(base+'/'+path+'.json');url.searchParams.set('ns',project);if(authentication&&!admin)url.searchParams.set('auth',authentication);
 return fetch(url,{method,headers:{...headers,...(admin?{Authorization:'Bearer owner'}:{}),'Content-Type':'application/json'},...(value===undefined?{}:{body:JSON.stringify(value)})});
}
const allow=async(path,options)=>{const r=await request(path,options);assert(r.ok,`${path}: ${r.status} ${await r.clone().text()}`);return r;};
const deny=async(path,options)=>{const r=await request(path,options);assert.equal(r.status,401,`${path} rejected: ${r.status}`);};
const rules=JSON.parse(readFileSync(process.argv[2]||'artifacts/firebase-defense-account.rules.json','utf8'));
await allow('.settings/rules',{method:'PUT',value:rules,admin:true});
await allow('',{method:'PUT',value:{seedExpansionRelease:{crosswind:false,crystalGorge:false}},admin:true});
const record=circuit=>{const s=createDefense(7,{actCount:circuit}),r={version:1,ownerUid:owner,circuit,id:s.runId,revision:1,writeId:'emulator-write',ended:false,checkpoint:checkpointDefense(s)};return {version:1,ownerUid:owner,circuit,revision:1,checkpoint:JSON.stringify(r)};};
await deny(`seedDefenseSaves/${owner}/5`,{method:'PUT',value:record(5)});
for(const circuit of [3,5]){
 if(circuit===5)await allow('seedExpansionRelease',{method:'PUT',value:{crosswind:true,crystalGorge:true},admin:true});
 const path=`seedDefenseSaves/${owner}/${circuit}`,value=record(circuit);
 for(const authentication of [null,token('other'),token(owner,'anonymous')]){await deny(path,{authentication});await deny(path,{method:'PUT',value,authentication});}
 for(const bad of [{...value,ownerUid:'other'},{...value,circuit:2},{...value,extra:true},{...value,version:2},{...value,revision:2},{...value,checkpoint:'x'.repeat(100001)}])await deny(path,{method:'PUT',value:bad});
 await allow(path,{method:'PUT',value});const current=await allow(path,{headers:{'X-Firebase-ETag':'true'}}),etag=current.headers.get('ETag');assert(etag);
 assert.equal(decodeDefenseAccountCloud(await current.json(),owner,circuit).record.checkpoint.currency,JSON.parse(value.checkpoint).checkpoint.currency);
 await deny(path,{method:'PUT',value});await deny(path,{method:'DELETE'});
 await allow(path,{method:'PUT',value:{...value,revision:2},headers:{'if-match':etag}});
 const stale=await request(path,{method:'PUT',value:{...value,revision:3},headers:{'if-match':etag}});assert.equal(stale.status,412);
 const ended={...JSON.parse(value.checkpoint),ended:true,checkpoint:null,revision:2,writeId:'terminal'};
 await allow(path,{method:'PUT',value:{...value,revision:3,checkpoint:JSON.stringify(ended)}});
}
await deny(`seedDefenseSaves/${owner}/4`,{method:'PUT',value:record(3)});
await deny(`seedDefenseSaves/${owner}`);await deny('seedDefenseSaves');
await allow('seedExpansionRelease',{method:'PUT',value:{crosswind:false,crystalGorge:false},admin:true});await deny(`seedDefenseSaves/${owner}/5`);
const reread=await allow('.settings/rules',{admin:true});assert.deepEqual(await reread.json(),rules);
console.log('Real demo RTDB emulator: TD rules compile; authenticated owner-only 3/5 paths, anonymous/other/parent denials, closed five-act gates, strict fields/size, revision/delete restrictions, terminal records and actual stale ETag 412 passed. No production player data written.');
