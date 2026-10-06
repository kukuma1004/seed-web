import assert from 'node:assert/strict';
import {createFreshExpeditionAccount,decodeExpeditionAccount,expeditionAccountParent} from '../src/expedition/account-codec.js';
import {EXPEDITION_RUNTIME_TRANSACTION_VERSION,projectExpeditionRuntimeTransaction,auditExpeditionRuntimeTransaction,nextExpeditionRuntimeAccount} from '../src/expedition/account-runtime.js';
import {createExpeditionController} from '../src/expedition/controller.js';
import {createExpeditionAccountStore,expeditionAccountStoreKey} from '../src/expedition/account-store.js';
import {EXPEDITION_GARDENS,EXPEDITION_RUN_STEPS} from '../src/expedition/world.js';
import {expeditionCombatTurn} from '../src/expedition/combat.js';
const copy=x=>structuredClone(x),owner='runtime-audit',base=1700000000000;
const writer={deviceId:'pc',leaseId:'runtime-finite',issuedAt:base,expiresAt:base+120000};let serial=0,checks=0,actions=0,deaths=0,steps=0;
const identity=()=>String(++serial);
const fresh=()=>createFreshExpeditionAccount({owner,now:base+1,writer,idFactory:identity});
function tx(a,commands,generatedIds=[]){return {version:EXPEDITION_RUNTIME_TRANSACTION_VERSION,kind:'runtime',receiptId:`write-${a.revision+1}-${identity()}`,commands,generatedIds};}
async function next(a,t){const r=await nextExpeditionRuntimeAccount(a,{owner,transaction:t,now:base+10+(++steps),writer});assert.ok(r.ok,r.reason);return r;}
async function check(label,fn){await fn();checks++;console.log('PASS '+label);}
function memory(){const map=new Map();return {getItem:k=>map.get(k)??null,setItem:(k,v)=>map.set(k,v)};}
const walk=()=>Array.from({length:70},()=>({type:'move',dx:1,dt:.05}));
const selectedCore=s=>{const {screen,roster,route,battle,meta,lastResult}=s,r=copy(roster);delete r.channel;return {screen,roster:r,route,battle,meta,lastResult};};
await check('Fresh account checkpoint records only actual prologue; no review promotion or arbitrary history',async()=>{
 const a=fresh(),t=tx(a,[{type:'checkpoint'}]),b=await next(a,t);assert.equal(b.record.state.screen,'home');assert.equal(b.record.state.roster.story.length,1);assert.equal(b.record.state.meta.returnCount,0);assert.equal(b.record.state.roster.channel,'account');
 const bad=copy(b.record);bad.state.roster.story.push('unearned-ending');assert.equal((await auditExpeditionRuntimeTransaction(a,bad,{owner,transaction:t})).ok,false);
 const review=copy(a);review.channel='review';review.state.roster.channel='review';assert.equal(projectExpeditionRuntimeTransaction(review,{owner,transaction:t}).ok,false);
});
await check('Strict commands/generated IDs/one paid action; accessors, sparse arrays and extra fields never execute',async()=>{
 const a=fresh(),raw=JSON.stringify(a),good=tx(a,[{type:'checkpoint'}]);
 for(const bad of [{...good,commands:[{type:'checkpoint',reward:1}]},{...good,commands:[{type:'enemy'},{type:'enemy'}]},{...good,commands:[{type:'pause',paused:false}]},{...good,commands:[{type:'move',dx:1,dt:.2}]},{...good,generatedIds:['unused']},{...good,commands:Array(1)}])assert.equal(projectExpeditionRuntimeTransaction(a,{owner,transaction:bad}).ok,false);
 let invoked=0;const accessor={...good};Object.defineProperty(accessor,'commands',{enumerable:true,get(){invoked++;return good.commands;}});assert.equal(projectExpeditionRuntimeTransaction(a,{owner,transaction:accessor}).ok,false);assert.equal(invoked,0);assert.equal(JSON.stringify(a),raw);
});
await check('Exact runtime parent/write receipt/result reject XP, cores, death edits, borrowed identities and replay',async()=>{
 const a=fresh(),t=tx(a,[{type:'depart',gardenId:'meadow',difficulty:1}],['depart-a']),b=await next(a,t);assert.equal(b.record.state.screen,'explore');assert.deepEqual(b.record.parent,await expeditionAccountParent(a,{owner}));
 for(const alter of [s=>s.state.meta.cores.chain++,s=>s.state.roster.instances[s.state.roster.party[0]].xp=1,s=>s.parent.checkpointHash='f'.repeat(64),s=>s.writeId=`write-${s.revision}-other`]){const bad=copy(b.record);alter(bad);assert.equal((await auditExpeditionRuntimeTransaction(a,bad,{owner,transaction:t})).ok,false);}
 assert.equal(projectExpeditionRuntimeTransaction(b.record,{owner,transaction:t}).ok,false);
 assert.equal(projectExpeditionRuntimeTransaction(a,{owner,transaction:tx(a,[{type:'depart',gardenId:'meadow',difficulty:1}],[])}).ok,false);
});
await check('Eight actual fresh routes equal the review controller: encounters, death, XP, camp, finds, bosses, return and restoration',async()=>{
 for(const gardenId of Object.keys(EXPEDITION_GARDENS)){
  const a=fresh(),seedSuffixes=Object.keys(a.state.roster.instances).map(id=>id.slice(5));let queue=[...seedSuffixes];
  const reference=createExpeditionController({storage:memory(),owner,idFactory:()=>{assert(queue.length,'declared identity');return queue.shift();}});
  let account=(await next(a,tx(a,[{type:'checkpoint'}]))).record;
  assert.deepEqual(selectedCore(account.state),selectedCore(reference.state()));
  async function apply(commands){
   const command=commands[0],ids=command.type==='depart'||(['return','skipBoss','interact'].includes(command.type)&&account.state.route?.pendingFinds.some(f=>f.kind==='rescue')&&(command.type!=='interact'||EXPEDITION_RUN_STEPS[account.state.route.step]==='return'))?[identity()]:[];
   const t=tx(account,commands,ids),before=JSON.stringify(account);queue=[...ids];
   const b=await next(account,t);assert.equal(JSON.stringify(account),before,'projection is pure');
   for(const c of commands){const r=reference.dispatch(c);assert(r.ok,r.reason);}assert.equal(queue.length,0);
   deaths+=b.events.filter(e=>e.type==='permadeath').length;assert.deepEqual(selectedCore(b.record.state),selectedCore(reference.state()));
   assert(decodeExpeditionAccount(b.raw,{owner}));account=b.record;
  }
  await apply([{type:'depart',gardenId,difficulty:1}]);
  for(let n=0;n<600&&account.state.screen!=='result';n++){
   const s=account.state;
   if(s.screen==='battle'){
    const actor=expeditionCombatTurn(s.battle),target=s.battle.units.find(u=>u.side==='enemy'&&!u.dead&&u.slot<5);
    const kind=actor.actions.skill1.some(o=>['damage','split','return'].includes(o.type))?'skill1':'attack';
    await apply([actor.side==='enemy'?{type:'enemy'}:{type:'action',kind,targetId:target.id}]);actions++;
   }else{
    await apply(walk());const step=EXPEDITION_RUN_STEPS[account.state.route.step];
    await apply([step==='choice'?{type:'choice',lawId:'orbit',mode:gardenId==='meadow'?'rescue':'egg'}:step==='rest'?{type:'rest'}:step==='return_or_boss'?{type:'boss'}:{type:'interact'}]);
   }
  }
  assert.equal(account.state.screen,'result');assert.equal(account.state.lastResult.kind,'return');assert.equal(account.state.meta.returnCount,1);assert.equal(account.state.meta.bossWins,1);assert.equal(account.state.meta.restoration[gardenId],1);
  assert(account.state.meta.growthCharges>0);assert.equal(account.state.route.pendingLoot.length,0);assert.equal(account.state.route.pendingFinds.length,0);
  assert.equal(projectExpeditionRuntimeTransaction(account,{owner,transaction:tx(account,[{type:'return'}])}).ok,false,'return is settled once');
  await apply([{type:'home'}]);assert.equal(account.state.route,null);reference.close();
  console.log(`COURSE ${gardenId} accepted ${account.revision} checkpoints; ${Object.keys(account.state.roster.tombstones).length} permanent deaths`);
 }
});
await check('Real shared battle steps can stage/CAS/readback; lost response retains receipt and never performs a second write',async()=>{
 const storage=memory(),key=expeditionAccountStoreKey(owner);let remote=null,etag='"0"',puts=0,clock=base+1,lose=false;
 const store=createExpeditionAccountStore({storage,owner,authority:()=>({uid:owner,isAnonymous:false,enabled:true,writer}),localLease:{key,active:()=>true},now:()=>clock,port:{verifyLease:async()=>true,authorizeFresh:async()=>true,get:async()=>({raw:remote,etag}),put:async({raw,ifMatch})=>{assert.equal(ifMatch,etag);remote=raw;etag=`"${++puts}"`;if(lose){lose=false;throw Error('lost response');}return {status:200};}}});
 assert((await store.fresh({idFactory:identity})).ok);assert((await store.sync()).ok);
 async function stage(commands,generatedIds=[]){const prior=remote,a=decodeExpeditionAccount(prior,{owner}),t=tx(a,commands,generatedIds);clock++;const b=await nextExpeditionRuntimeAccount(a,{owner,transaction:t,now:clock,writer});assert(b.ok,b.reason);assert((await store.stage(b.record,{expectedRaw:prior,transaction:t})).ok);return b.raw;}
 await stage([{type:'depart',gardenId:'meadow',difficulty:1}],['actual-route']);assert((await store.sync()).ok);
 await stage(walk());assert((await store.sync()).ok);await stage([{type:'interact'}]);assert((await store.sync()).ok);
 await stage(walk());assert((await store.sync()).ok);await stage([{type:'interact'}]);assert((await store.sync()).ok);
 const s=decodeExpeditionAccount(remote,{owner}).state,actor=expeditionCombatTurn(s.battle),target=s.battle.units.find(u=>u.side==='enemy'&&!u.dead&&u.slot<5);
 const expected=await stage([actor.side==='enemy'?{type:'enemy'}:{type:'action',kind:'attack',targetId:target.id}]);lose=true;assert.equal((await store.sync()).ok,false);assert.equal(store.read().dirty,true);
 const count=puts;assert((await store.sync()).ok);assert.equal(puts,count);assert.equal(remote,expected);assert.equal(store.read().dirty,false);assert.equal(store.read().pending.raw,expected);
});
console.log(`Account runtime: ${checks} groups PASS, eight routes / ${actions} actual battle actions / ${deaths} deaths; Node synthetic accounts and mock lease/ETag only. No live/server/device or release claim.`);
