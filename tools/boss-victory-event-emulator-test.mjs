import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createMockUserToken} from '@firebase/util';
import {BOSS_EVENT_COUNTERS,bossVictoryCloudKey,bossVictoryCounts} from '../src/boss-victory-events.js';
import {createBossVictoryEventSync,decodeBossVictoryCloud} from '../src/boss-victory-event-sync.js';
assert.equal(process.env.FIREBASE_DATABASE_EMULATOR_HOST,'127.0.0.1:19004');
const project='demo-seed-linked',base='http://127.0.0.1:19004',owner='emulator-owner',epoch='migration-01';
const token=(uid,provider='password')=>createMockUserToken({sub:uid,firebase:{sign_in_provider:provider}},project),auth=token(owner);
async function request(path,{method='GET',value,authentication=auth,admin=false,headers={}}={}){
 const url=new URL(base+'/'+path+'.json');url.searchParams.set('ns',project);if(authentication&&!admin)url.searchParams.set('auth',authentication);
 return fetch(url,{method,headers:{...headers,...(admin?{Authorization:'Bearer owner'}:{}),'Content-Type':'application/json'},...(value===undefined?{}:{body:JSON.stringify(value)})});
}
const allow=async(path,options)=>{const r=await request(path,options);assert(r.ok,`${path}: ${r.status} ${await r.clone().text()}`);return r;};
const deny=async(path,options)=>{const r=await request(path,options);assert.equal(r.status,401,`${path}: ${r.status} ${await r.clone().text()}`);};
const rules=JSON.parse(readFileSync('docs/boss-victory-v2-rules.json','utf8'));
await allow('.settings/rules',{method:'PUT',value:rules,admin:true});
await allow('',{method:'PUT',value:{seedExpansionRelease:{crosswind:false,crystalGorge:false}},admin:true});
const ledgerPath=`seedBossVictories/${owner}`,baseline=Object.fromEntries(Object.values(BOSS_EVENT_COUNTERS).map(k=>[k,8]));
const initial={version:2,ownerUid:owner,epoch,baseline};
const event=(runId,ordinal=1,boss='austin',mode='survival')=>({mode,runId,boss,ordinal});
const eventPath=e=>`${ledgerPath}/events/${bossVictoryCloudKey(e)}`,payload=e=>({epoch,...e});
assert.equal(await (await allow(ledgerPath)).json(),null);
await deny(ledgerPath,{method:'PUT',value:initial});
await deny(eventPath(event('before-baseline')),{method:'PUT',value:payload(event('before-baseline'))});
await allow(ledgerPath,{method:'PUT',value:initial,admin:true});
for(const authentication of [null,token('other'),token(owner,'anonymous')]){
 await deny(ledgerPath,{authentication});await deny(eventPath(event('unauthorized')),{method:'PUT',value:payload(event('unauthorized')),authentication});
}
await deny('seedBossVictories');await deny('');
for(const key of ['version','ownerUid','epoch','baseline'])await deny(`${ledgerPath}/${key}`,{method:'PUT',value:key==='baseline'?{...baseline,austinWins:9}:key==='version'?3:'changed'});
await deny(ledgerPath,{method:'PUT',value:{...initial,events:{[bossVictoryCloudKey(event('root-replace'))]:payload(event('root-replace'))}}});
await deny(ledgerPath,{method:'PATCH',value:{baseline:{...baseline,austinWins:9}}});await deny(ledgerPath,{method:'DELETE'});
const good=event('valid');
for(const bad of [{...payload(good),epoch:'migration-02'},{...payload(good),extra:true},{...payload(good),mode:'duel'},{...payload(good),boss:'unknown'},{...payload(good),runId:'x:y'},{...payload(good),ordinal:0},{...payload(good),ordinal:1.2},{...payload(good),ordinal:1000001}])await deny(eventPath(good),{method:'PUT',value:bad});
await deny(`${ledgerPath}/events/forged-key`,{method:'PUT',value:payload(good)});
await deny(`${ledgerPath}/events/survival:valid:austin:01`,{method:'PUT',value:payload(good)});
const vacant=await allow(eventPath(good),{headers:{'X-Firebase-ETag':'true'}}),etag=vacant.headers.get('ETag');assert(etag);assert.equal(await vacant.json(),null);
await allow(eventPath(good),{method:'PUT',value:payload(good),headers:{'if-match':etag}});
const stale=await request(eventPath(good),{method:'PUT',value:payload(good),headers:{'if-match':etag}});assert.equal(stale.status,412);
await deny(eventPath(good),{method:'PUT',value:payload(good)});await deny(eventPath(good),{method:'PATCH',value:{ordinal:2}});await deny(eventPath(good),{method:'DELETE'});
await deny(`${ledgerPath}/events`,{method:'PUT',value:{}});await deny(`${ledgerPath}/events`,{method:'DELETE'});
for(const boss of ['crosswindKeeper','crystalGardener'])await deny(eventPath(event('closed',1,boss)),{method:'PUT',value:payload(event('closed',1,boss))});
await allow('seedExpansionRelease',{method:'PUT',value:{crosswind:true,crystalGorge:true},admin:true});
for(const boss of Object.keys(BOSS_EVENT_COUNTERS))await allow(eventPath(event('five-act',1,boss,'defense')),{method:'PUT',value:payload(event('five-act',1,boss,'defense'))});
// Test the actual client transport against the compiled rules, not just hand-built requests.
const storage=()=>{const m=new Map();return {get length(){return m.size;},key:i=>[...m.keys()][i]??null,getItem:k=>m.get(k)??null,setItem:(k,v)=>m.set(k,v),removeItem:k=>m.delete(k)};};
const device=()=>createBossVictoryEventSync({storage:storage(),account:{user:()=>({uid:owner,isAnonymous:false}),tokenSession:async()=>({uid:owner,idToken:auth})},ownerUid:owner,epoch,baseline,databaseURL:base,fetchImpl:(url,o)=>{const u=new URL(url);u.searchParams.set('ns',project);return fetch(u,o);}});
const pc=device(),phone=device();pc.queue.enqueue(event('pc'));phone.queue.enqueue(event('phone'));const countsBefore=bossVictoryCounts(decodeBossVictoryCloud(await (await allow(ledgerPath)).json()));
assert((await pc.sync()).ok);assert((await phone.sync()).ok);assert.equal(pc.queue.pending().length,0);assert.equal(phone.queue.pending().length,0);
let counts=bossVictoryCounts(decodeBossVictoryCloud(await (await allow(ledgerPath)).json()));assert.equal(counts.austinWins,countsBefore.austinWins+2);
pc.queue.enqueue(event('copied'));phone.queue.enqueue(event('copied'));const copied=await Promise.all([pc.sync(),phone.sync()]);assert(copied.every(r=>r.ok));counts=bossVictoryCounts(decodeBossVictoryCloud(await (await allow(ledgerPath)).json()));assert.equal(counts.austinWins,countsBefore.austinWins+3);
for(let i=0;i<70;i++)pc.queue.enqueue(event('durable-'+i));while(pc.queue.pending().length)assert((await pc.sync()).ok);
phone.queue.enqueue(event('valid'));assert((await phone.sync()).ok);const readback=await (await allow(ledgerPath)).json();assert.equal(Object.keys(readback.events).length,79);assert.deepEqual(readback.baseline,baseline);
assert.deepEqual(await (await allow('.settings/rules',{admin:true})).json(),rules);
console.log('Real demo RTDB emulator: V2 rules compile; owner-only reads, server-only baseline/epoch, immutable canonical-key events, parent/overwrite/delete/schema/old-epoch denials, five-act gates, actual same-event ETag 412, actual transport PC+phone/copy dedupe and >64 durable events passed. Candidate only: no production rules or player records changed.');
