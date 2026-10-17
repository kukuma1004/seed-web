import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createMockUserToken} from '@firebase/util';
assert.equal(process.env.FIREBASE_DATABASE_EMULATOR_HOST,'127.0.0.1:19004');
const project='demo-seed-linked',owner='arbor-emulator-owner',base='http://127.0.0.1:19004';
const token=(uid=owner,provider='password')=>createMockUserToken({sub:uid,firebase:{sign_in_provider:provider}},project);
async function request(path,{method='GET',value,auth=token(),admin=false,headers={}}={}){
 const u=new URL(`${base}/${path}.json`);u.searchParams.set('ns',project);if(auth&&!admin)u.searchParams.set('auth',auth);
 return fetch(u,{method,headers:{'Content-Type':'application/json',...headers,...(admin?{Authorization:'Bearer owner'}:{})},...(value===undefined?{}:{body:JSON.stringify(value)})});
}
let count=0;
async function allow(path,o){const r=await request(path,o);assert(r.ok,`${path}: ${r.status} ${await r.clone().text()}`);count++;return r;}
async function deny(path,o){const r=await request(path,o);assert.equal(r.status,401,`${path} must deny: ${await r.text()}`);count++;}
const rules=JSON.parse(readFileSync(process.argv[2],'utf8'));
await allow('.settings/rules',{method:'PUT',value:rules,admin:true});
await allow('',{method:'PUT',value:{},admin:true});
const savePath=`seedArborSaves/${owner}`,save={version:1,ownerUid:owner,revision:1,checkpoint:'{"client":"strict codec verified separately"}'};
for(const auth of [null,token('other'),token(owner,'anonymous')]){await deny(savePath,{auth});await deny(savePath,{method:'PUT',value:save,auth});}
for(const bad of [{...save,revision:2},{...save,ownerUid:'other'},{...save,extra:true},{...save,checkpoint:'x'.repeat(100001)}])await deny(savePath,{method:'PUT',value:bad});
await allow(savePath,{method:'PUT',value:save});
await deny(savePath,{method:'PUT',value:save});await deny(savePath,{method:'DELETE'});
const get=await allow(savePath,{headers:{'X-Firebase-ETag':'true'}}),etag=get.headers.get('etag');assert(etag);
await allow(savePath,{method:'PUT',value:{...save,revision:2},headers:{'if-match':etag}});
assert.equal((await request(savePath,{method:'PUT',value:{...save,revision:3},headers:{'if-match':etag}})).status,412);
const winPath=`seedArborVictories/${owner}/normal-run`,win={uid:owner,runId:'normal-run',ordinal:1,cleared:false,at:Date.now()};
for(const auth of [null,token('other'),token(owner,'anonymous')])await deny(winPath,{method:'PUT',value:win,auth});
for(const bad of [{...win,ordinal:2},{...win,cleared:true},{...win,extra:true},{...win,uid:'other'}])await deny(winPath,{method:'PUT',value:bad});
await allow(winPath,{method:'PUT',value:win});await allow(winPath,{method:'PUT',value:win});
await deny(winPath,{method:'PUT',value:{...win,ordinal:3,cleared:true}});
await allow(winPath,{method:'PUT',value:{...win,ordinal:2}});await deny(winPath,{method:'PUT',value:win});
await allow(winPath,{method:'PUT',value:{...win,ordinal:3,cleared:true}});
await deny(winPath,{method:'DELETE'});await deny(winPath,{method:'PUT',value:{...win,ordinal:3,cleared:true,at:1}});
await deny(`seedArborVictories/${owner}`,{auth:token('other')});await deny(`seedArborVictories/${owner}/constructor`,{method:'PUT',value:{...win,runId:'constructor'}});
let id=0;const rank=cycle=>({uid:owner,name:'씨앗',act:6,cycle,stage:4,kills:[86,182,288][cycle],score:[13000,27000,39750][cycle],time:300*(cycle+1),at:Date.now()-100,done:cycle===2});
const writeRank=(value,auth=token())=>({method:'PUT',value,auth});
for(let cycle=0;cycle<3;cycle++){
 await allow(`seedRanking/season12/runs/arbor-${++id}`,writeRank(rank(cycle)));
 await deny(`seedRanking/season12/runs/arbor-${++id}`,writeRank({...rank(cycle),kills:rank(cycle).kills+1}));
 await deny(`seedRanking/season12/runs/arbor-${++id}`,writeRank({...rank(cycle),cycle:cycle+.5}));
 if(cycle<2)await deny(`seedRanking/season12/runs/arbor-${++id}`,writeRank({...rank(cycle),done:true}));
}
for(const auth of [null,token(owner,'anonymous')])await deny(`seedRanking/season12/runs/arbor-${++id}`,writeRank(rank(2),auth));
await deny(`seedRanking/season12/runs/arbor-${++id}`,writeRank({...rank(2),cycle:3}));
// Act 6 cannot fall through the ordinary, wider legacy-cycle branch.
await deny(`seedRanking/season12/runs/arbor-${++id}`,writeRank({...rank(2),kills:289}));
await deny(`seedRanking/season12/runs/expansion-closed`,writeRank({...rank(0),act:4}));
await allow(`seedRanking/season12/runs/ordinary-old`,writeRank({...rank(0),act:1,kills:10,score:500,cycle:0,done:false}));
console.log(`Arbor RTDB emulator: ${count} auth/schema/sequencing/deletion/ETag/ranking checks PASS. Demo namespace only; no player data or production account writes.`);
