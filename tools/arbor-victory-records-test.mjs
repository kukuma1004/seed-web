import assert from 'node:assert/strict';
import {createArborJourney,stepArborJourney,creditArborKill,advanceArborJourney} from '../src/arbor-journey.js';
import {createArborVictoryRecords,arborVictoryKey,validArborVictory,validArborVictoryRunId,decodeArborVictories} from '../src/arbor-victory-records.js';

const clone=v=>structuredClone(v),tests=[];
const test=(name,body)=>tests.push({name,body});
const memory=()=>{const data=new Map();return {data,onGet:null,onSet:null,getItem(k){this.onGet?.(k);return data.get(k)??null;},setItem(k,v){this.onSet?.(k,v);data.set(k,v);}};};
function transport(){
 const t={remote:{},etags:{},gets:0,puts:[],mode:'ok',getHook:null,putHook:null,omitEtag:false};
 t.fetch=async(url,options)=>{
  const match=url.match(/^https:\/\/example.invalid\/seedArborVictories\/a(?:\/([A-Za-z0-9_-]+))?\.json\?auth=token$/);assert(match,url);assert.equal(options.cache,'no-store');const id=match[1];
  if(t.mode==='offline')throw Error('offline');if(t.mode==='permission')return {ok:false,status:403};
  if(options.method==='PUT'){
   assert(id);const next=JSON.parse(options.body);t.puts.push(clone(next));if(t.putHook){const hook=t.putHook;t.putHook=null;await hook(next);}
   if(options.headers['if-match']!==String(t.etags[id]||0))return {ok:false,status:412};
   assert.equal(next.ordinal,(t.remote[id]?.ordinal||0)+1);assert.equal(next.cleared,next.ordinal===3);t.remote[id]=next;t.etags[id]=(t.etags[id]||0)+1;
   if(t.mode==='lose-response'){t.mode='ok';throw Error('response lost');}return {ok:true,status:200};
  }
  t.gets++;assert.equal(options.headers['X-Firebase-ETag'],'true');const value=clone(id?t.remote[id]||null:Object.keys(t.remote).length?t.remote:null),etag=String(id?t.etags[id]||0:0);
  if(t.getHook){const hook=t.getHook;t.getHook=null;await hook();}return {ok:true,status:200,json:async()=>value,headers:{get:key=>key==='ETag'&&!t.omitEtag?etag:null}};
 };
 return t;
}
function device(t,{storage=memory()}={}){
 const user={uid:'a',isAnonymous:false},facts={released:true,inspection:false,practice:false,developerRun:false,normalRunId:'public-run'};
 const account={user:()=>user,tokenSession:async()=>({uid:user.uid,idToken:'token'})};
 const api=createArborVictoryRecords({storage,account,databaseURL:'https://example.invalid',context:()=>facts,fetchImpl:t.fetch,now:()=>100});
 return {api,user,facts,storage,account};
}

test('actual model boss receipts alone queue ordinals 1→2→3; repeated callbacks are idempotent',()=>{
 const t=transport(),d=device(t),world=createArborJourney();let guardians=0,bosses=0;
 for(let i=0;i<25000&&world.phase!=='complete';i++){
  stepArborJourney(world,.1,{player:{x:0,z:5},alive:world.pending.length});
  for(const actor of [...world.pending]){assert(creditArborKill(world,actor.id,actor.role));if(actor.role==='warden')guardians++;if(actor.role==='boss'){bosses++;assert(d.api.record({runId:'public-run',ordinal:world.bossWins}));assert(d.api.record({runId:'public-run',ordinal:world.bossWins}));}}
  if(world.phase==='cleared')assert(advanceArborJourney(world));
 }
 assert.equal(guardians,15);assert.equal(bosses,3);assert.deepEqual(d.api.read(),{wins:3,clears:1,pending:1});assert.equal(t.puts.length,0);
});
test('inspection/practice/anonymous/guest/closed gate/wrong normal marker never create receipts',async()=>{
 for(const flag of ['inspection','practice','developerRun','anonymous','released','normalRunId','guest']){
  const t=transport(),d=device(t);if(flag==='anonymous')d.user.isAnonymous=true;else if(flag==='guest')d.user.uid='guest';else d.facts[flag]=flag==='released'?false:flag==='normalRunId'?'other':true;
  assert.equal(d.api.record({runId:'public-run',ordinal:1}),false,flag);assert.equal(d.storage.getItem(arborVictoryKey('a')),null);if(flag!=='normalRunId'){assert.equal((await d.api.sync()).kind,'ineligible');assert.equal(t.gets,0);}
 }
});
test('run IDs, sequence gaps and nonintegral/future fields fail strict validation',()=>{
 const t=transport(),d=device(t);assert.equal(d.api.record({runId:'public-run',ordinal:2}),false);assert.equal(d.api.record({runId:'public-run',ordinal:1,at:0}),false);
 for(const id of ['__proto__','constructor','x'.repeat(97),'bad/key','bad.key','bad#key',''])assert.equal(validArborVictoryRunId(id),false,id);
 const good={uid:'a',runId:'public-run',ordinal:1,cleared:false,at:100};assert(validArborVictory(good,'a'));
 for(const mutate of [x=>x.uid='b',x=>x.ordinal=4,x=>x.ordinal=1.5,x=>x.cleared=true,x=>x.at=NaN,x=>x.extra=true]){const bad=clone(good);mutate(bad);assert.equal(validArborVictory(bad,'a'),false);}
 assert.throws(()=>decodeArborVictories({'wrong-key':good},'a'));assert.throws(()=>decodeArborVictories({future:{version:99}},'a'));
});
test('offline ordinal3 queue survives reload and drains as three ETag CAS writes',async()=>{
 const t=transport(),d=device(t);for(const ordinal of [1,2,3])assert(d.api.record({runId:'public-run',ordinal}));t.mode='offline';assert.equal((await d.api.sync()).kind,'offline');assert.equal(t.puts.length,0);
 const phone=device(t,{storage:d.storage});assert.deepEqual(phone.api.read(),{wins:3,clears:1,pending:1});t.mode='ok';assert.equal((await phone.api.sync()).kind,'synced');assert.deepEqual(t.puts.map(v=>v.ordinal),[1,2,3]);assert.deepEqual(phone.api.read(),{wins:3,clears:1,pending:0});
});
test('lost response after accepted write is acknowledged on GET without replaying the ordinal',async()=>{
 const t=transport(),d=device(t);for(const ordinal of [1,2,3])assert(d.api.record({runId:'public-run',ordinal}));t.mode='lose-response';assert.equal((await d.api.sync()).kind,'offline');assert.equal(t.remote['public-run'].ordinal,1);assert.equal(d.api.read().pending,1);
 assert.equal((await d.api.sync()).kind,'synced');assert.deepEqual(t.puts.map(v=>v.ordinal),[1,2,3]);assert.deepEqual(d.api.read(),{wins:3,clears:1,pending:0});
});
test('same run on two devices counts once; pulled account records recompute all wins and clears',async()=>{
 const t=transport(),pc=device(t),phone=device(t);assert(pc.api.record({runId:'public-run',ordinal:1}));assert(phone.api.record({runId:'public-run',ordinal:1}));await pc.api.sync();assert.equal((await phone.api.sync()).kind,'synced');assert.equal(t.puts.length,1);assert.equal(phone.api.read().wins,1);
 pc.facts.normalRunId='second-run';for(const ordinal of [1,2,3])assert(pc.api.record({runId:'second-run',ordinal}));await pc.api.sync();assert.equal((await phone.api.sync()).kind,'synced');assert.deepEqual(phone.api.read(),{wins:4,clears:1,pending:0});
});
test('server ordinal2 is a useful account cache; new actual third receipt only uploads ordinal3',async()=>{
 const t=transport();t.remote['public-run']={uid:'a',runId:'public-run',ordinal:2,cleared:false,at:200};t.etags['public-run']=2;const d=device(t);assert.equal((await d.api.sync()).kind,'synced');assert.deepEqual(d.api.read(),{wins:2,clears:0,pending:0});
 assert(d.api.record({runId:'public-run',ordinal:3,at:100}));assert.equal((await d.api.sync()).kind,'synced');assert.deepEqual(t.puts.map(v=>v.ordinal),[3]);assert.equal(t.remote['public-run'].at,200);assert.equal(d.api.read().clears,1);
});
test('CAS 412 surfaces conflict and a fresh sync acknowledges a competing valid receipt',async()=>{
 const t=transport(),d=device(t);assert(d.api.record({runId:'public-run',ordinal:1}));t.putHook=next=>{t.remote[next.runId]=clone(next);t.etags[next.runId]=1;};assert.equal((await d.api.sync()).kind,'conflict');assert.equal(d.api.read().pending,1);assert.equal(t.puts.length,1);
 assert.equal((await d.api.sync()).kind,'synced');assert.equal(d.api.read().pending,0);assert.equal(t.puts.length,1);
});
test('a new local death during PUT stays queued and is drained without counting the prior boss twice',async()=>{
 const t=transport(),d=device(t);assert(d.api.record({runId:'public-run',ordinal:1}));t.putHook=()=>assert(d.api.record({runId:'public-run',ordinal:2,at:101}));assert.equal((await d.api.sync()).kind,'synced');assert.deepEqual(t.puts.map(v=>v.ordinal),[1,2]);assert.deepEqual(d.api.read(),{wins:2,clears:0,pending:0});
});
test('unknown local and remote bytes, missing ETag, permission and server rollback preserve the queue/cache',async()=>{
 const t=transport(),d=device(t);assert(d.api.record({runId:'public-run',ordinal:1}));t.omitEtag=true;assert.equal((await d.api.sync()).kind,'offline');assert.equal(t.puts.length,0);t.omitEtag=false;
 t.mode='permission';assert.equal((await d.api.sync()).kind,'permission');assert.equal(d.api.read().pending,1);t.mode='ok';t.remote.future={version:99,important:'preserve'};assert.equal((await d.api.sync()).kind,'invalid');assert.equal(t.puts.length,0);assert.equal(t.remote.future.important,'preserve');delete t.remote.future;
 await d.api.sync();const before=d.storage.getItem(arborVictoryKey('a'));t.remote={};assert.equal((await d.api.sync()).kind,'conflict');assert.equal(d.storage.getItem(arborVictoryKey('a')),before);
 const f=device(transport());const future='{"version":99,"important":"preserve"}';f.storage.setItem(arborVictoryKey('a'),future);assert.equal(f.api.record({runId:'public-run',ordinal:1}),false);assert.equal((await f.api.sync()).kind,'invalid');assert.equal(f.storage.getItem(arborVictoryKey('a')),future);
});
test('account/gate/token changes across I/O stop local acknowledgment and never write another UID',async()=>{
 for(const type of ['owner','inspection','token']){
  const t=transport(),d=device(t);assert(d.api.record({runId:'public-run',ordinal:1}));const before=d.storage.getItem(arborVictoryKey('a'));
  if(type==='token')d.account.tokenSession=async()=>({uid:'b',idToken:'token'});else t.getHook=()=>{if(type==='owner')d.user.uid='b';else d.facts.inspection=true;};
  assert.equal((await d.api.sync()).kind,type==='inspection'?'ineligible':'account');assert.equal(t.puts.length,0);assert.equal(d.storage.getItem(arborVictoryKey('a')),before);assert.equal(d.storage.getItem(arborVictoryKey('b')),null);
 }
});
test('storage refusal after server acceptance retains durable pending and retries idempotently',async()=>{
 const t=transport(),d=device(t);assert(d.api.record({runId:'public-run',ordinal:1}));t.putHook=()=>{d.storage.onSet=()=>{throw Error('disk full');};};assert.equal((await d.api.sync()).kind,'storage');assert.equal(t.remote['public-run'].ordinal,1);assert.equal(d.api.read().pending,1);
 d.storage.onSet=null;assert.equal((await d.api.sync()).kind,'synced');assert.equal(t.puts.length,1);assert.deepEqual(d.api.read(),{wins:1,clears:0,pending:0});
});

for(const {name,body} of tests){await body();console.log('PASS '+name);}console.log(`Arbor victory records: ${tests.length} checks passed (actual model ledger + mock transport; no real account writes).`);
