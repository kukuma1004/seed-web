import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createMockUserToken} from '@firebase/util';
import {expeditionAccountRuleNodes,appendExpeditionAccountRules} from './expedition-account-rules.mjs';
import {createExpeditionAccountTransport,encodeExpeditionCloudHead,encodeExpeditionCloudReceipt,decodeExpeditionCloudReceipt,expeditionWireKey} from '../src/expedition/account-transport.js';
import {createExpeditionAccountStore,expeditionAccountStoreKey,EXPEDITION_ACCOUNT_NAMESPACE} from '../src/expedition/account-store.js';
import {decodeExpeditionAccount,createFreshExpeditionAccount} from '../src/expedition/account-codec.js';
import {nextExpeditionRuntimeAccount} from '../src/expedition/account-runtime.js';
import {createExpeditionLineageReceipt} from '../src/expedition/account-lineage.js';
import {createExpeditionAccountController} from '../src/expedition/account-controller.js';
import {expeditionCombatTurn} from '../src/expedition/combat.js';
import {EXPEDITION_RUN_STEPS} from '../src/expedition/world.js';
import {EXPEDITION_ACCOUNT_RELEASE_POLICY} from '../src/expedition/account-release.js';
assert.equal(process.env.FIREBASE_DATABASE_EMULATOR_HOST,'127.0.0.1:19006','Local demo only');
const base='http://127.0.0.1:19006',project='demo-seed-expedition',owner='expedition-emulator-owner';
const token=(uid=owner,provider='password')=>createMockUserToken({sub:uid,firebase:{sign_in_provider:provider}},project);
let serial=0,checks=0;const id=()=>`emulator-${++serial}`;
async function request(path,{method='GET',body,uid=owner,provider='password',admin=false,headers={}}={}){
 const url=new URL(`${base}/${path}.json`);url.searchParams.set('ns',project);if(!admin)url.searchParams.set('auth',token(uid,provider));
 return fetch(url,{method,headers:{...headers,...(admin?{Authorization:'Bearer owner'}:{}),'Content-Type':'application/json'},...(body===undefined?{}:{body:JSON.stringify(body)})});
}
async function allow(path,options){const r=await request(path,options);assert.ok(r.ok,`${options?.method||'GET'} ${path} ${r.status}: ${await r.clone().text()}`);return r;}
async function deny(path,options){const r=await request(path,options);assert.ok(r.status===401||r.status===403,`${options?.method||'GET'} ${path}: expected denial, got ${r.status}: ${await r.clone().text()}`);return r;}
async function check(name,run){await run();checks++;console.log('PASS '+name);}
const rules=JSON.parse(readFileSync(process.argv[2]||'artifacts/firebase-expedition-account.rules.json','utf8'));
const baseline=process.argv[3]?JSON.parse(readFileSync(process.argv[3],'utf8')):null;
assert.deepEqual(rules,baseline?appendExpeditionAccountRules(baseline):{rules:{'.read':false,'.write':false,...expeditionAccountRuleNodes()}});
assert.equal(rules.rules['.read'],false);assert.equal(rules.rules['.write'],false);
await allow('.settings/rules',{method:'PUT',body:rules,admin:true});await allow(EXPEDITION_ACCOUNT_NAMESPACE,{method:'PUT',body:null,admin:true});
const prefix=`${EXPEDITION_ACCOUNT_NAMESPACE}/${owner}`,headPath=`${prefix}/head`,leasePath=`${prefix}/lease`;
function device(deviceId,{ownerUid=owner,records=new Map(),...options}={}){
 let held=true;const storage=records,localLease={key:expeditionAccountStoreKey(ownerUid),active:()=>held,async release(){held=false;}};
 const account={user:()=>({uid:ownerUid,isAnonymous:false}),tokenSession:async()=>({uid:ownerUid,idToken:token(ownerUid)})};
 const transport=createExpeditionAccountTransport({account,owner:ownerUid,deviceId,localLease,databaseURL:`${base}/?ns=${project}`,enabled:()=>true,allowEmulator:true,idFactory:id,...options});
 const store=createExpeditionAccountStore({storage:{getItem:k=>storage.get(k)??null,setItem:(k,v)=>storage.set(k,v)},owner:ownerUid,localLease,authority:transport.authority,port:transport.port,timeout:60000});
 return {transport,store,storage,localLease};
}
const pc=device('pc'),phone=device('phone');
async function step(d,commands){const a=decodeExpeditionAccount(d.store.read().confirmedRaw,{owner}),transaction={version:1,kind:'runtime',receiptId:`write-${a.revision+1}-${id()}`,commands,generatedIds:[]};const next=await nextExpeditionRuntimeAccount(a,{owner,writer:d.transport.writer(),now:Date.now(),transaction});assert.ok(next.ok,next.reason);assert.ok((await d.store.stage(next.raw,{expectedRaw:JSON.stringify(a),transaction})).ok);const result=await d.store.sync();assert.ok(result.ok,result.reason);return {previous:a,next,transaction};}
await check('New namespace is narrow, release gate owner/anonymous protection enforced by real rules',async()=>{
 const prior={rules:{closedBossV2:{'.read':false,'.write':false},seedSurvivalSaves:{value:'existing'}}},merged=appendExpeditionAccountRules(prior);assert.deepEqual(merged.rules.closedBossV2,prior.rules.closedBossV2);assert.deepEqual(merged.rules.seedSurvivalSaves,prior.rules.seedSurvivalSaves);assert.throws(()=>appendExpeditionAccountRules(merged));
 await allow('seedExpeditionRelease/accountV1',{method:'PUT',body:false,admin:true});assert.equal((await pc.transport.acquire()).reason,'permission');
 await deny('seedExpeditionRelease/accountV1',{method:'PUT',body:EXPEDITION_ACCOUNT_RELEASE_POLICY});
 for(const policy of [true,{...EXPEDITION_ACCOUNT_RELEASE_POLICY,runtimeVersion:2},{...EXPEDITION_ACCOUNT_RELEASE_POLICY,combatVersion:EXPEDITION_ACCOUNT_RELEASE_POLICY.combatVersion+1},{...EXPEDITION_ACCOUNT_RELEASE_POLICY,enabled:false}]){await allow('seedExpeditionRelease/accountV1',{method:'PUT',body:policy,admin:true});assert.equal((await pc.transport.acquire()).reason,'permission');}
 await allow('seedExpeditionRelease/accountV1',{method:'PUT',body:EXPEDITION_ACCOUNT_RELEASE_POLICY,admin:true});
 await deny(leasePath,{uid:'foreign'});await deny(leasePath,{provider:'anonymous'});
});
await check('Actual REST conditional lease/fresh/name/empty party slot preserves nullable data in JSON payload',async()=>{
 const lease=await pc.transport.acquire();assert.ok(lease.ok,lease.reason);assert.equal((await phone.transport.acquire()).reason,'busy');
 assert.ok((await pc.store.fresh({idFactory:id})).ok);const fresh=await pc.store.sync();assert.ok(fresh.ok,fresh.reason);
 const named=decodeExpeditionAccount(fresh.raw,{owner}).state.roster.party[0];await step(pc,[{type:'rename',instanceId:named,name:'새봄'}]);
 const a=decodeExpeditionAccount(pc.store.read().confirmedRaw,{owner}),slots=[...a.state.roster.party];slots[2]=null;const {next}=await step(pc,[{type:'party',ids:slots}]);
 assert.equal(next.record.state.roster.party[2],null);const cloud=await (await allow(headPath)).json();assert.equal(cloud.checkpoint,next.raw);
 const path=`${prefix}/receipts/${expeditionWireKey(next.record.campaignId)}/${expeditionWireKey(next.record.writeId)}`,receipt=decodeExpeditionCloudReceipt(await (await allow(path)).json(),{owner});assert.equal(receipt.transaction.commands[0].ids[2],null);
});
await check('Server immutable receipt/no deletion/no reset/wrong parent prevent replacing active lineage',async()=>{
 const raw=pc.store.read().confirmedRaw,a=decodeExpeditionAccount(raw,{owner}),head=await (await allow(headPath)).json();
 const receiptPath=`${prefix}/receipts/${head.campaignKey}/${head.writeKey}`,receipt=await (await allow(receiptPath)).json();
 await deny(receiptPath,{method:'PUT',body:receipt});await deny(receiptPath,{method:'DELETE'});await deny(headPath,{method:'DELETE'});await deny(leasePath,{method:'DELETE'});await deny(prefix,{method:'PUT',body:{}});
 await deny(headPath,{method:'PUT',body:{...head,extra:true}});await deny(headPath,{method:'PUT',body:await encodeExpeditionCloudHead(JSON.stringify(createFreshExpeditionAccount({owner,writer:pc.transport.writer(),now:Date.now(),idFactory:id})),{owner})});
 const tx={version:1,kind:'runtime',receiptId:`write-${a.revision+1}-${id()}`,commands:[{type:'rename',instanceId:a.state.roster.party[0],name:'변조'}],generatedIds:[]},b=await nextExpeditionRuntimeAccount(a,{owner,writer:pc.transport.writer(),now:Date.now(),transaction:tx});assert.ok(b.ok);
 const r=await createExpeditionLineageReceipt(a,b.raw,{owner,transaction:tx}),wire=encodeExpeditionCloudReceipt(r.receipt,{owner});wire.parent.checkpointHash='0'.repeat(64);
 await deny(`${prefix}/receipts/${wire.campaignKey}/${wire.writeKey}`,{method:'PUT',body:wire});await deny(headPath,{method:'PUT',body:await encodeExpeditionCloudHead(b.raw,{owner})});assert.equal((await (await allow(headPath)).json()).checkpoint,raw);
 await deny(headPath,{uid:'foreign'});await deny(receiptPath,{provider:'anonymous'});
});
await check('Real emulator PC→phone→PC checks descendant replay and stale writer fence',async()=>{
 const old=pc.store.read().confirmedRaw,oldWriter=pc.transport.writer();assert.ok((await pc.transport.release()).ok);assert.ok((await phone.transport.acquire()).ok);const pulled=await phone.store.sync({allowPull:true});assert.ok(pulled.ok,pulled.reason);assert.equal(pulled.raw,old);
 const a=decodeExpeditionAccount(old,{owner});await step(phone,[{type:'rename',instanceId:a.state.roster.party[0],name:'기기 넘나드는 새봄'}]);const newer=phone.store.read().confirmedRaw;
 const tx={version:1,kind:'runtime',receiptId:`write-${a.revision+1}-${id()}`,commands:[{type:'rename',instanceId:a.state.roster.party[0],name:'낡은 PC'}],generatedIds:[]},b=await nextExpeditionRuntimeAccount(a,{owner,writer:oldWriter,now:Date.now(),transaction:tx});assert.ok(b.ok);
 const r=await createExpeditionLineageReceipt(a,b.raw,{owner,transaction:tx}),wire=encodeExpeditionCloudReceipt(r.receipt,{owner});await deny(`${prefix}/receipts/${wire.campaignKey}/${wire.writeKey}`,{method:'PUT',body:wire});
 assert.ok((await phone.transport.release()).ok);assert.ok((await pc.transport.acquire()).ok);const adopted=await pc.store.sync({allowPull:true});assert.ok(adopted.ok,adopted.reason);assert.equal(adopted.raw,newer);assert.equal(pc.store.read().pending,null);assert.equal(pc.store.read().backupRaw,old);
});
await check('Real expiry recovers an unsent exact command through immutable new receipt and archived original',async()=>{
 assert.ok((await pc.transport.release()).ok);const short=device('short-expiry',{leaseMs:2000});assert.ok((await short.transport.acquire()).ok);assert.ok((await short.store.sync({allowPull:true})).ok);
 const a=decodeExpeditionAccount(short.store.read().confirmedRaw,{owner}),transaction={version:1,kind:'runtime',receiptId:`write-${a.revision+1}-${id()}`,commands:[{type:'rename',instanceId:a.state.roster.party[0],name:'만료 뒤 복구'}],generatedIds:[]};
 const next=await nextExpeditionRuntimeAccount(a,{owner,writer:short.transport.writer(),now:Date.now(),transaction});assert.ok(next.ok);assert.ok((await short.store.stage(next.raw,{expectedRaw:JSON.stringify(a),transaction})).ok);
 const original=short.storage.get(expeditionAccountStoreKey(owner));await new Promise(resolve=>setTimeout(resolve,2100));assert.ok((await short.transport.acquire()).ok);
 const result=await short.store.sync({recoverPending:true});assert.ok(result.ok,result.reason);const saved=decodeExpeditionAccount(result.raw,{owner});assert.deepEqual(saved.state,next.record.state);assert.notEqual(saved.writeId,next.record.writeId);
 assert.ok([...short.storage].some(([key,value])=>key.includes(':recovery:')&&value===original));assert.equal((await (await allow(headPath)).json()).checkpoint,result.raw);
 assert.ok((await short.transport.release()).ok);assert.ok((await pc.transport.acquire()).ok);assert.ok((await pc.store.sync({allowPull:true})).ok);
});
await check('Actual accepted head with lost response remains readable after writer expiry without duplicate mutation',async()=>{
 assert.ok((await pc.transport.release()).ok);let lose=false;
 const short=device('short-lost',{leaseMs:2000,fetchImpl:async(url,options)=>{const response=await fetch(url,options);if(lose&&options.method==='PUT'&&new URL(url).pathname.endsWith('/head.json')&&response.ok){lose=false;throw Error('lost head response');}return response;}});
 assert.ok((await short.transport.acquire()).ok);assert.ok((await short.store.sync({allowPull:true})).ok);const a=decodeExpeditionAccount(short.store.read().confirmedRaw,{owner}),transaction={version:1,kind:'runtime',receiptId:`write-${a.revision+1}-${id()}`,commands:[{type:'rename',instanceId:a.state.roster.party[0],name:'확인된 기억'}],generatedIds:[]};
 const next=await nextExpeditionRuntimeAccount(a,{owner,writer:short.transport.writer(),now:Date.now(),transaction});assert.ok(next.ok);assert.ok((await short.store.stage(next.raw,{expectedRaw:JSON.stringify(a),transaction})).ok);lose=true;assert.equal((await short.store.sync()).ok,false);
 assert.equal((await (await allow(headPath)).json()).checkpoint,next.raw);await new Promise(resolve=>setTimeout(resolve,2100));assert.ok((await short.transport.acquire()).ok);
 const result=await short.store.sync({recoverPending:true});assert.ok(result.ok,result.reason);assert.equal(result.raw,next.raw);assert.equal(decodeExpeditionAccount(result.raw,{owner}).revision,a.revision+1);
 assert.ok((await short.transport.release()).ok);assert.ok((await pc.transport.acquire()).ok);assert.ok((await pc.store.sync({allowPull:true})).ok);
});
await check('Actual gameplay controller keeps delayed movement smooth and closes exact checkpoint through merged server rules',async()=>{
 assert.ok((await pc.transport.release()).ok);let hold=false,once=true,entered,release;const reached=new Promise(r=>entered=r),wait=new Promise(r=>release=r);
 const d=device('smooth-controller',{fetchImpl:async(url,options)=>{if(hold&&once&&options.method==='PUT'&&new URL(url).pathname.endsWith('/head.json')){once=false;entered();await wait;}return fetch(url,options);}});
 const c=await createExpeditionAccountController({owner,currentOwner:()=>owner,store:d.store,transport:d.transport,localLease:d.localLease,idFactory:id});assert.equal(c.state().saveState,'saved');assert.ok((await c.dispatch({type:'depart',gardenId:'fire',difficulty:1})).ok);hold=true;
 for(let n=0;n<31;n++)assert.ok((await c.dispatch({type:'move',dx:1,dt:.005})).ok);const flight=c.dispatch({type:'move',dx:1,dt:.005});await reached;
 assert(c.canMoveWhileSaving());for(let n=0;n<20;n++)assert.ok((await c.dispatch({type:'move',dx:1,dt:.005})).ok);const final=c.state().route.position;assert(Math.abs(final-52*.02)<1e-9);
 assert.equal((await c.dispatch({type:'interact'})).ok,false);release();assert.ok((await flight).ok);assert.equal(c.state().route.position,final);
 assert.ok((await c.close()).ok);const raw=(await (await allow(headPath)).json()).checkpoint;assert.equal(decodeExpeditionAccount(raw,{owner}).state.route.position,final);
 assert.ok((await pc.transport.acquire()).ok);assert.ok((await pc.store.sync({allowPull:true})).ok);assert.equal(pc.store.read().confirmedRaw,raw);
 await step(pc,[{type:'return'}]);await step(pc,[{type:'home'}]);
});
await check('Fresh account crosses PC→phone→PC during combat, defeats meadow boss and commits return exactly once through real rules',async()=>{
 const uid='expedition-course-emulator-owner',pcDevice=device('course-pc',{ownerUid:uid});
 const open=d=>createExpeditionAccountController({owner:uid,currentOwner:()=>uid,store:d.store,transport:d.transport,localLease:d.localLease,idFactory:id});
 let c=await open(pcDevice),commands=0,battleTurns=0,handoffs=0;
 const send=async intent=>{const r=await c.dispatch(intent);assert.ok(r.ok,r.reason);commands++;};
 assert.equal(c.state().saveState,'saved');assert.equal(Object.keys(c.state().roster.instances).length,9);
 const firstSeed=c.state().roster.party[0],campaign=decodeExpeditionAccount(pcDevice.store.read().confirmedRaw,{owner:uid}).campaignId;
 await send({type:'rename',instanceId:firstSeed,name:'기기 너머 새봄'});await send({type:'depart',gardenId:'meadow',difficulty:1});
 let transferred=false;
 for(let guard=0;guard<700&&c.state().screen!=='result';guard++){
  const s=c.state();
  if(s.screen==='battle'){
   if(!transferred){
    const snapshot=structuredClone(s),closed=await c.close();assert.deepEqual({ok:closed.ok,saved:closed.saved,handoff:closed.handoff},{ok:true,saved:true,handoff:true});
    const phoneDevice=device('course-phone',{ownerUid:uid});c=await open(phoneDevice);handoffs++;assert.deepEqual(c.state().battle,snapshot.battle);assert.deepEqual(c.state().roster,snapshot.roster);assert.deepEqual(c.state().route,snapshot.route);transferred=true;
   }
   const live=c.state(),actor=expeditionCombatTurn(live.battle),target=live.battle.units.filter(u=>u.side==='enemy'&&!u.dead&&u.slot<5).sort((a,b)=>a.slot-b.slot)[0];
   assert(actor);await send(actor.side==='enemy'?{type:'enemy'}:{type:'action',kind:actor.actions.skill1.some(op=>['damage','split','return'].includes(op.type))?'skill1':'attack',targetId:target.id});battleTurns++;
  }else{
   assert.equal(s.screen,'explore');assert.equal(s.route.position,0,'Current account event flow has no simulated walking');
   const stepName=EXPEDITION_RUN_STEPS[c.state().route.step];await send(stepName==='choice'?{type:'choice',lawId:'pierce'}:stepName==='rest'?{type:'rest'}:stepName==='return_or_boss'?{type:'boss'}:{type:'interact'});
  }
 }
 const returned=structuredClone(c.state());assert.equal(returned.screen,'result');assert.equal(returned.lastResult.kind,'return');assert.equal(returned.lastResult.boss,true);assert.equal(returned.meta.returnCount,1);assert.equal(returned.meta.bossWins,1);assert.deepEqual(returned.meta.relics,['meadow']);assert.equal(returned.meta.restoration.meadow,1);
 for(const [deadId,tombstone] of Object.entries(returned.roster.tombstones)){assert.equal(returned.roster.instances[deadId].status,'dead');assert(tombstone);assert(!returned.roster.party.includes(deadId));}
 assert.ok((await c.close()).ok);const pcAgain=device('course-pc',{ownerUid:uid,records:pcDevice.storage});c=await open(pcAgain);handoffs++;
 assert.equal(decodeExpeditionAccount(pcAgain.store.read().confirmedRaw,{owner:uid}).campaignId,campaign);assert.deepEqual(c.state().roster,returned.roster);assert.deepEqual(c.state().lastResult,returned.lastResult);assert.deepEqual(c.state().meta,returned.meta);
 assert.equal(c.state().roster.instances[firstSeed].nickname,'기기 너머 새봄');assert.equal((await c.dispatch({type:'return'})).ok,false);assert.deepEqual(c.state().meta,returned.meta,'repeat return cannot duplicate XP/relic/core/reward');
 await send({type:'home'});assert.equal(c.state().screen,'home');assert.equal(c.state().route,null);assert.ok((await c.close()).ok);
 console.log(JSON.stringify({course:'actual demo rules/controller; synthetic Auth/three logical clients; no physical-device claim',commands,battleTurns,handoffs,returned:returned.lastResult,permanentDeaths:Object.keys(returned.roster.tombstones).length}));
});
await check('Lease TTL/future clock/active takeover denied; ETag 412 is an actual server response',async()=>{
 const l=await (await allow(leasePath, {headers:{'X-Firebase-ETag':'true'}})).json();
 for(const change of [w=>w.expiresAt=w.issuedAt+120001,w=>{w.issuedAt=Date.now()+20000;w.expiresAt=w.issuedAt+90000;},w=>w.leaseId='takeover']){const bad=structuredClone(l);change(bad.writer);await deny(leasePath,{method:'PUT',body:bad});}
 const seen=await allow(headPath,{headers:{'X-Firebase-ETag':'true'}}),etag=seen.headers.get('ETag'),before=await seen.json(),a=decodeExpeditionAccount(pc.store.read().confirmedRaw,{owner});await step(pc,[{type:'rename',instanceId:a.state.roster.party[0],name:'마지막 새봄'}]);
 const stale=await request(headPath,{method:'PUT',body:before,headers:{'if-match':etag}});assert.equal(stale.status,412);
 await allow('seedExpeditionRelease/accountV1',{method:'PUT',body:false,admin:true});assert.equal((await pc.store.sync()).reason,'permission');
});
await check('Policy upgrade blocks reads and stale writes without changing head, receipts or finite lease',async()=>{
 const original=await (await allow(prefix,{admin:true})).json();
 for(const policy of [true,{...EXPEDITION_ACCOUNT_RELEASE_POLICY,runtimeVersion:EXPEDITION_ACCOUNT_RELEASE_POLICY.runtimeVersion+1},{...EXPEDITION_ACCOUNT_RELEASE_POLICY,combatVersion:EXPEDITION_ACCOUNT_RELEASE_POLICY.combatVersion+1},{...EXPEDITION_ACCOUNT_RELEASE_POLICY,enabled:false}]){
  await allow('seedExpeditionRelease/accountV1',{method:'PUT',body:policy,admin:true});
  await deny(headPath);await deny(leasePath);await deny(headPath,{method:'PUT',body:original.head});
  await deny(leasePath,{method:'PUT',body:original.lease});
  assert.deepEqual(await (await allow(prefix,{admin:true})).json(),original);
 }
 await allow('seedExpeditionRelease/accountV1',{method:'PUT',body:EXPEDITION_ACCOUNT_RELEASE_POLICY,admin:true});
 assert.deepEqual(await (await allow(headPath)).json(),original.head);
 await allow('seedExpeditionRelease/accountV1',{method:'PUT',body:false,admin:true});
});
assert.deepEqual(await (await allow('.settings/rules',{admin:true})).json(),rules);
console.log(`Actual demo Firebase emulator: ${checks} groups PASS with real REST/ETag/rules; synthetic Auth tokens, local-memory locks/stores. No production publish, real Google account, PC/phone physical QA, server combat authority or deployment claim.`);
