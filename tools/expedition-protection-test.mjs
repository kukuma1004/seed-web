import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createExpeditionCombat as create,performExpeditionCombatAction as act,expeditionCombatTurn as turn,checkpointExpeditionCombat as checkpoint,restoreExpeditionCombat as restore,EXPEDITION_COMBAT_VERSION} from '../src/expedition/combat.js';
import {auditExpeditionRuntimeTransaction,nextExpeditionRuntimeAccount,EXPEDITION_RUNTIME_TRANSACTION_VERSION} from '../src/expedition/account-runtime.js';
import {decodeExpeditionAccount} from '../src/expedition/account-codec.js';
import {createExpeditionSessionStore} from '../src/expedition/session.js';
import {createExpeditionController} from '../src/expedition/controller.js';
import {createExpeditionAccountStore,expeditionAccountStoreKey} from '../src/expedition/account-store.js';
import {createExpeditionLineageReceipt,replayExpeditionLineageReceipt} from '../src/expedition/account-lineage.js';
import {expeditionUnitFeedback,expeditionProtectionStatus,expeditionProtectionActionHint} from '../src/expedition/battle-presentation.js';
const frozen=JSON.parse(readFileSync(new URL('./fixtures/expedition-protection-v1.json',import.meta.url),'utf8'));
const clone=v=>structuredClone(v),unit=(id,slot,extra={})=>({id,speciesId:'test',slot,hp:190,maxHp:190,power:100,defense:0,speed:10,level:8,...extra});
let seq=0,checks=0,accepted=0;
const perform=(s,kind,extra={})=>{const result=act(s,{id:'ward-check-'+(++seq),unitId:turn(s).id,kind,...extra});assert(result.ok,JSON.stringify(result));accepted++;assert.deepEqual(restore(checkpoint(s)),s);return result;};
const battle=(a={},e={},extra={})=>create({allies:[unit('a',0,{speed:30,...a})],enemies:[unit('e',0,{...e})],...extra});
async function check(label,fn){await fn();checks++;console.log('PASS '+label);}
await check('Frozen V1 snapshots and accepted receipts survive byte-for-byte, including over-HP protection',()=>{
 assert.equal(EXPEDITION_COMBAT_VERSION,2);assert.equal(EXPEDITION_RUNTIME_TRANSACTION_VERSION,3);
 for(const c of frozen.cases){const state=restore(c.before);assert.deepEqual(state,c.before);assert.deepEqual(act(state,c.command),c.result,c.name);assert.deepEqual(checkpoint(state),c.after,c.name);const raw=JSON.stringify(state);assert.equal(act(state,c.command).reason,'replay');assert.equal(JSON.stringify(state),raw);accepted++;}
 const c=frozen.cases[0];assert.equal(c.after.units[0].status.protection,100000);assert.equal(c.result.events.find(e=>e.type==='protection').amount,100);
 const legacy=clone(c.before);delete legacy.resonances;assert.deepEqual(restore(legacy).resonances,[]);
});
await check('Frozen runtimeV1/V2 battle creation and lineage audits remain exact; version substitution fails',async()=>{
 for(const f of frozen.accounts){const result=await nextExpeditionRuntimeAccount(f.previous,{owner:frozen.owner,transaction:f.transaction,writer:frozen.writer,now:f.now});assert(result.ok,result.reason);assert.equal(result.raw,f.raw);assert.deepEqual(result.events,f.events);assert.equal(result.record.state.battle.version,1);assert((await auditExpeditionRuntimeTransaction(f.previous,f.raw,{owner:frozen.owner,transaction:f.transaction})).ok);assert.equal((await auditExpeditionRuntimeTransaction(f.previous,f.raw,{owner:frozen.owner,transaction:{...f.transaction,version:3}})).ok,false);}
});
await check('New V2 grants only applied protection and stops at the recipient HP cap',()=>{
 const s=battle({status:{protection:150},actions:{skill1:[{type:'protection',target:'self',ratio:1}]}});
 const out=perform(s,'skill1');assert.equal(s.units[0].status.protection,190);assert.equal(out.events.find(e=>e.type==='protection').amount,40);assert.equal(s.units[0].hp,190);assert.equal(expeditionProtectionStatus(s,s.units[0]),'보호 190 / 190');assert.equal(expeditionProtectionActionHint(s,s.units[0],'skill1'),'보호는 대상 최대 HP까지');assert.equal(expeditionProtectionActionHint(s,s.units[0],'attack'),'');
 perform(s,'guard');const full=perform(s,'skill1');assert.equal(full.events.find(e=>e.type==='protection').amount,0);assert.equal(s.units[0].status.protection,190);
 assert.deepEqual(expeditionUnitFeedback(s.units[0],s.units,full.events).labels,['보호 유지']);
 while(s.phase==='fight'){const u=turn(s);perform(s,u.side==='ally'?'skill1':'guard');}
 assert.equal(s.phase,'limit');assert.equal(s.units[0].status.protection,190);assert.equal(s.units[0].hp,190,'cap never damages or expires HP');
});
await check('Protection cap follows each recipient on both sides, with compound operations and resonance',()=>{
 const ops=[{type:'protection',target:'all',ratio:3},{type:'protection',target:'all',ratio:3},{type:'protection',target:'self',ratio:3}];
 const s=create({allies:[unit('a',0,{speed:30,actions:{skill1:ops}})],enemies:[unit('e',0,{maxHp:80,hp:80,speed:20,actions:{skill1:ops}}),unit('f',1,{maxHp:125,hp:125,speed:5})]});
 const first=perform(s,'skill1');assert.deepEqual(first.events.filter(e=>e.type==='protection').map(e=>e.amount),[80,125,0,0,190]);assert.deepEqual(s.units.map(u=>u.status.protection),[190,80,125]);
 const second=perform(s,'skill1');assert(second.events.filter(e=>e.type==='protection').every(e=>e.amount===0));assert.deepEqual(s.units.map(u=>u.status.protection),[190,80,125]);
 const r=create({allies:[unit('a',0,{speed:30}),unit('b',1,{maxHp:80,hp:80,speed:20})],enemies:[unit('e',0,{speed:5})],resonances:[{id:'ward-pair',speciesId:'twin-test',memberIds:['a','b'],actions:[{type:'protection',target:'self',ratio:3},{type:'protection',target:'ally',ratio:3},{type:'protection',target:'ally',ratio:3}]}]});
 const receipt=perform(r,'resonance',{resonanceId:'ward-pair',targetId:'b'});assert.deepEqual(receipt.events.filter(e=>e.type==='protection').map(e=>e.amount),[190,80,0]);assert.equal(r.resonances[0].used,true);
});
await check('Absorbed damage triggers existing counters; protected conditions and delayed returns retain their rules',()=>{
 const s=battle({power:30,status:{protection:40},actions:{skill1:[{type:'counter',target:'self',ratio:1},{type:'return',target:'single',ratio:1,rounds:1}]}},{power:20,maxHp:300,hp:300});
 perform(s,'skill1',{targetId:'e'});const damage=perform(s,'attack',{targetId:'a'});assert(damage.events.some(e=>e.type==='damage'&&e.targetId==='a'&&e.amount===0&&e.absorbed===20));assert(damage.events.some(e=>e.type==='damage'&&e.kind==='counter'&&e.amount===30));assert(damage.events.some(e=>e.type==='damage'&&e.kind==='skill1'&&e.amount===30));assert.equal(s.units[0].hp,190);assert.equal(s.units[0].status.protection,20);assert.equal(s.units[1].hp,240);assert.equal(s.pending.length,0);
 const p=battle({status:{protection:1},power:20,actions:{skill1:[{type:'damage',target:'single',ratio:1,when:'protected'}]}});perform(p,'skill1',{targetId:'e'});assert.equal(p.units[1].hp,170);
 const no=battle({power:20,actions:{skill1:[{type:'damage',target:'single',ratio:1,when:'protected'}]}});perform(no,'skill1',{targetId:'e'});assert.equal(no.units[1].hp,190);
});
await check('Boss lethal warning still evaluates damage after capped protection and does not skip its warning',()=>{
 const s=battle({hp:10,status:{protection:40},speed:5},{power:100,speed:30,boss:true});
 const warning=perform(s,'attack',{targetId:'a'});assert(warning.events.some(e=>e.type==='bossWarning'&&e.damage===60));assert.equal(s.units[0].hp,10);assert.equal(s.units[0].status.protection,40);
 perform(s,'guard');const hit=perform(s,'attack',{targetId:'a'});assert(hit.events.some(e=>e.type==='damage'&&e.absorbed===40&&e.amount===10));assert.equal(s.phase,'defeat');assert.equal(s.deaths[0].unitId,'a');
});
await check('V2 unknown version/fields/over-cap snapshots fail closed without altering source; V1 over-cap remains loadable',()=>{
 const s=battle(),before=JSON.stringify(s);
 for(const alter of [v=>v.version=3,v=>v.future=true,v=>v.units[0].status.protection=191,v=>v.units[0].status.expiresRound=2]){const bad=clone(s);alter(bad);const raw=JSON.stringify(bad);assert.throws(()=>restore(bad));assert.equal(JSON.stringify(bad),raw);assert.equal(act(bad,{id:'bad',unitId:'a',kind:'guard'}).reason,'invalid-state');assert.equal(JSON.stringify(bad),raw);}
 assert.equal(JSON.stringify(s),before);assert.throws(()=>battle({status:{protection:191}}));assert.throws(()=>battle({}, {},{version:3}));
 assert.equal(battle({status:{protection:99999}},{},{version:1}).units[0].status.protection,99999);
});
await check('RuntimeV3 resumes a V1 battle unchanged, while a new battle starts V2 and both codec/session checkpoints restore',async()=>{
 const f=frozen.accounts[1],old=f.record,actor=turn(old.state.battle),target=old.state.battle.units.find(u=>u.side==='enemy'&&!u.dead&&u.slot<5),command=actor.side==='enemy'?{type:'enemy'}:{type:'action',kind:'attack',targetId:target.id};
 const tx={version:3,kind:'runtime',receiptId:`write-${old.revision+1}-resume`,commands:[command],generatedIds:[]};
 const resumed=await nextExpeditionRuntimeAccount(old,{owner:frozen.owner,transaction:tx,writer:frozen.writer,now:f.now+1});assert(resumed.ok,resumed.reason);assert.equal(resumed.record.state.battle.version,1);
 const oldTx=await nextExpeditionRuntimeAccount(old,{owner:frozen.owner,transaction:{...tx,version:2},writer:frozen.writer,now:f.now+1});assert(oldTx.ok);assert.equal(resumed.raw,oldTx.raw,'immutable battle version, not current transaction version, selects action rules');
 const latest=await nextExpeditionRuntimeAccount(f.previous,{owner:frozen.owner,transaction:{...f.transaction,version:3},writer:frozen.writer,now:f.now});assert(latest.ok);assert.equal(latest.record.state.battle.version,2);assert(decodeExpeditionAccount(latest.raw,{owner:frozen.owner}));assert((await auditExpeditionRuntimeTransaction(f.previous,latest.raw,{owner:frozen.owner,transaction:{...f.transaction,version:3}})).ok);
 const memory=new Map(),storage={getItem:k=>memory.get(k)??null,setItem:(k,v)=>memory.set(k,v)};
 const reviewOwner='protection-review',controller=createExpeditionController({storage,owner:reviewOwner,idFactory:()=>String(++seq)});
 assert(controller.dispatch({type:'depart',gardenId:'meadow',difficulty:1}).ok);
 for(let n=0;n<2;n++){for(let i=0;i<35;i++)assert(controller.dispatch({type:'move',dx:1,dt:.1}).ok);assert(controller.dispatch({type:'interact'}).ok);}
 const reviewBattle=controller.state().battle;assert.equal(reviewBattle.version,2);controller.close();
 const store=createExpeditionSessionStore({storage,owner:reviewOwner,currentOwner:()=>reviewOwner,channel:'review'}),loaded=store.load();assert(loaded.ok,loaded.reason);assert.deepEqual(loaded.session.battle,reviewBattle,'review and account channels remain independent');
});
await check('Pending tx1/tx2/tx3 survive expired writer recovery without re-versioning and publish once',async()=>{
 for(const version of [1,2,3]){
  const f=frozen.accounts[0],transaction={...f.transaction,version},candidate=await nextExpeditionRuntimeAccount(f.previous,{owner:frozen.owner,transaction,writer:frozen.writer,now:f.now});assert(candidate.ok);
  let remote=JSON.stringify(f.previous),etag='"0"',writes=0,clock=f.now,writer=frozen.writer;const history=new Map(),memory=new Map(),key=expeditionAccountStoreKey(frozen.owner),storage={getItem:k=>memory.get(k)??null,setItem:(k,v)=>memory.set(k,v)};
  const port={authorizeFresh:async()=>false,verifyLease:async()=>true,get:async()=>({raw:remote,etag}),put:async scope=>{assert.equal(scope.ifMatch,etag);writes++;remote=scope.raw;etag='"'+writes+'"';assert(scope.lineage);history.set(scope.lineage.writeId,clone(scope.lineage));return {status:200};},getLineage:async scope=>{const receipts=[];let head=scope.head;while(head.revision>scope.stopAfterRevision&&receipts.length<scope.limit){const r=history.get(head.writeId);if(!r)break;receipts.push(clone(r));head=r.parent;}return {receipts};}};
  const store=createExpeditionAccountStore({storage,owner:frozen.owner,authority:()=>({uid:frozen.owner,isAnonymous:false,enabled:true,writer}),localLease:{key,active:()=>true},now:()=>clock,port});
  assert((await store.sync({allowPull:true})).ok);assert((await store.stage(candidate.raw,{expectedRaw:JSON.stringify(f.previous),transaction})).ok);
  clock=frozen.writer.expiresAt+10;writer={deviceId:'phone',leaseId:'renewed-'+version,issuedAt:clock,expiresAt:clock+120000};
  const recovered=await store.sync({recoverPending:true});assert(recovered.ok,recovered.reason);assert.equal(writes,1);assert.deepEqual(decodeExpeditionAccount(recovered.raw,{owner:frozen.owner}).state,candidate.record.state);assert.equal(store.read().pending.transaction.version,version);
  const replay=await replayExpeditionLineageReceipt(f.previous,[...history.values()][0],{owner:frozen.owner});assert(replay.ok,replay.reason);assert.equal(replay.raw,recovered.raw);
  assert((await store.sync()).ok);assert.equal(writes,1,'ACK/retry never grants a second action or second write');
 }
});
await check('Clean old device adopts exact tx2→tx3 descendant, with backup; altered V2 identity is rejected',async()=>{
 const f=frozen.accounts[0],owner=frozen.owner,previous=f.previous,tx2={version:2,kind:'runtime',receiptId:`write-${previous.revision+1}-mixed`,commands:[{type:'checkpoint'}],generatedIds:[]};
 const middle=await nextExpeditionRuntimeAccount(previous,{owner,transaction:tx2,writer:frozen.writer,now:f.now});assert(middle.ok);
 const tx3={...f.transaction,version:3,receiptId:`write-${middle.record.revision+1}-modern`},latest=await nextExpeditionRuntimeAccount(middle.record,{owner,transaction:tx3,writer:frozen.writer,now:f.now+1});assert(latest.ok);assert.equal(latest.record.state.battle.version,2);
 const receipts=[];for(const [a,b,t] of [[previous,middle,tx2],[middle.record,latest,tx3]]){const r=await createExpeditionLineageReceipt(a,b.raw,{owner,transaction:t});assert(r.ok);receipts.push(r.receipt);}
 let remote=JSON.stringify(previous),etag='"old"';const memory=new Map(),key=expeditionAccountStoreKey(owner),storage={getItem:k=>memory.get(k)??null,setItem:(k,v)=>memory.set(k,v)},store=createExpeditionAccountStore({storage,owner,authority:()=>({uid:owner,isAnonymous:false,enabled:true,writer:frozen.writer}),localLease:{key,active:()=>true},now:()=>f.now+2,port:{authorizeFresh:async()=>false,put:async()=>{throw Error('read-only pull must not write');},verifyLease:async()=>true,get:async()=>({raw:remote,etag}),getLineage:async()=>({receipts:[...receipts].reverse()})}});
 assert((await store.sync({allowPull:true})).ok);remote=latest.raw;etag='"new"';assert((await store.sync({allowPull:true})).ok);assert.equal(store.read().confirmedRaw,latest.raw);assert.equal(store.read().backupRaw,JSON.stringify(previous));
 const altered=clone(latest.record);altered.state.battle.version=1;assert.equal((await auditExpeditionRuntimeTransaction(middle.record,altered,{owner,transaction:tx3})).ok,false);
});
console.log(`Expedition versioned protection: ${checks} groups PASS / ${accepted} accepted P2 commands. Historical fixtures immutable; local synthetic evidence, not human/device/cloud acceptance.`);
