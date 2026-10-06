import assert from 'node:assert/strict';
import {createFreshExpeditionAccount,decodeExpeditionAccount,expeditionAccountParent} from '../src/expedition/account-codec.js';
import {nextExpeditionRuntimeAccount} from '../src/expedition/account-runtime.js';
import {createExpeditionLineageReceipt,replayExpeditionLineageReceipt,verifyExpeditionAccountLineage} from '../src/expedition/account-lineage.js';
import {createExpeditionAccountStore,expeditionAccountStoreKey} from '../src/expedition/account-store.js';
import {expeditionCombatTurn} from '../src/expedition/combat.js';
import {EXPEDITION_RUN_STEPS} from '../src/expedition/world.js';
const copy=x=>structuredClone(x),owner='lineage-audit',base=1700000000000;let serial=0,checks=0;
const id=()=>String(++serial);
const writer=(device='pc',at=base)=>({deviceId:device,leaseId:`lease-${id()}`,issuedAt:at,expiresAt:at+120000});
const check=async(name,fn)=>{await fn();checks++;console.log('PASS '+name);};
const tx=(a,commands,generatedIds=[])=>({version:1,kind:'runtime',receiptId:`write-${a.revision+1}-${id()}`,commands,generatedIds});
const fresh=()=>createFreshExpeditionAccount({owner,now:base+10,writer:writer(),idFactory:id});
async function child(a,commands,generatedIds=[],w=a.writer){const t=tx(a,commands,generatedIds),b=await nextExpeditionRuntimeAccount(a,{owner,transaction:t,now:a.updatedAt+1,writer:w});assert.ok(b.ok,b.reason);const r=await createExpeditionLineageReceipt(a,b.raw,{owner,transaction:t});assert.ok(r.ok,r.reason);return {record:b.record,raw:b.raw,transaction:t,receipt:r.receipt};}
function rig(){
 const history=new Map();let remote=null,etag='"0"',puts=0,pageReads=0,clock=base+10,w=writer(),uid=owner,enabled=true,lock=true,afterPage=null,afterPut=null;
 const port={async verifyLease(scope){return scope.owner===owner&&scope.ticket.leaseId===w.leaseId;},async authorizeFresh(){return remote===null;},async get(){return {raw:remote,etag};},async put(scope){if(scope.ifMatch!==etag)return {status:412};puts++;if(scope.lineage)history.set(scope.lineage.writeId,copy(scope.lineage));remote=scope.raw;etag=`"${puts}"`;if(afterPut)return afterPut(scope);return {status:200};},async getLineage(scope){pageReads++;const receipts=[];let cursor=scope.head;while(receipts.length<scope.limit&&cursor.revision>scope.stopAfterRevision){const r=history.get(cursor.writeId);if(!r)break;receipts.push(copy(r));cursor=r.parent;}if(afterPage)await afterPage(scope,receipts);return {receipts};}};
 function device(){const map=new Map(),key=expeditionAccountStoreKey(owner);let failWrite=false;const storage={getItem:k=>map.get(k)??null,setItem(k,v){if(failWrite)throw Error('quota');map.set(k,v);}};const store=createExpeditionAccountStore({storage,owner,authority:()=>({uid,isAnonymous:false,enabled,writer:w}),localLease:{key,active:()=>lock},port,now:()=>clock,timeout:60000});return {store,map,key,get bytes(){return map.get(key)??null;},set failWrite(v){failWrite=v;}};}
 return {device,port,history,get remote(){return remote;},set remote(v){remote=v;etag='"changed"';},get puts(){return puts;},get pageReads(){return pageReads;},get clock(){return clock;},set clock(v){clock=v;},get writer(){return w;},gain(device){clock+=1000;w=writer(device,clock-10);},set uid(v){uid=v;},set lock(v){lock=v;},set enabled(v){enabled=v;},set afterPage(v){afterPage=v;},set afterPut(v){afterPut=v;}};
}
async function initial(){const e=rig(),pc=e.device();assert.ok((await pc.store.fresh({idFactory:id})).ok);assert.ok((await pc.store.sync()).ok);return {e,pc};}
async function play(e,device,commands,generatedIds=[]){const a=decodeExpeditionAccount(device.store.read().confirmedRaw,{owner}),t=tx(a,commands,generatedIds),b=await nextExpeditionRuntimeAccount(a,{owner,transaction:t,now:++e.clock,writer:e.writer});assert.ok(b.ok,b.reason);assert.ok((await device.store.stage(b.raw,{expectedRaw:JSON.stringify(a),transaction:t})).ok);const synced=await device.store.sync();assert.ok(synced.ok,synced.reason);return b.record;}

await check('Compact command receipts reproduce personal names exactly without a roster snapshot',async()=>{
 const a=fresh(),b=await child(a,[{type:'rename',instanceId:a.state.roster.party[0],name:'새봄'}]),replay=await replayExpeditionLineageReceipt(a,b.receipt,{owner});assert.ok(replay.ok,replay.reason);assert.deepEqual(replay.record,b.record);assert.equal(Object.hasOwn(b.receipt,'state'),false);
 assert.ok(JSON.stringify(b.receipt).length<JSON.stringify(b.record).length/3);
 let called=0;const bad=copy(b.receipt);Object.defineProperty(bad,'transaction',{get(){called++;return b.receipt.transaction;},enumerable:true});assert.equal((await replayExpeditionLineageReceipt(a,bad,{owner})).ok,false);assert.equal(called,0);
 for(const mutate of [r=>r.transaction.commands[0].name='덮기',r=>r.checkpointHash='f'.repeat(64),r=>r.parent.writeId='borrowed',r=>r.ownerUid='other',r=>r.writer.expiresAt=r.updatedAt,r=>r.extra=1]){const bad=copy(b.receipt);mutate(bad);assert.equal((await replayExpeditionLineageReceipt(a,bad,{owner})).ok,false);}
});

let routeFixture;
await check('PC→phone→PC exact descendant: actual whole route/death/return/name/XP survives multi-page replay',async()=>{
 const {e,pc}=await initial();const namedId=decodeExpeditionAccount(e.remote,{owner}).state.roster.party[0];let current=await play(e,pc,[{type:'rename',instanceId:namedId,name:'새봄'}]);const old=e.remote;
 e.gain('phone');const phone=e.device();assert.ok((await phone.store.sync({allowPull:true})).ok);
 current=await play(e,phone,[{type:'depart',gardenId:'meadow',difficulty:1}],[id()]);let loops=0,actions=0;
 while(current.state.screen==='explore'||current.state.screen==='battle'){
  assert(++loops<300);
  if(current.state.screen==='battle'){
   const actor=expeditionCombatTurn(current.state.battle),target=current.state.battle.units.filter(u=>u.side==='enemy'&&!u.dead&&u.slot<5).sort((a,b)=>a.slot-b.slot)[0];
   const kind=actor.actions.skill1.some(op=>['damage','split','return'].includes(op.type))?'skill1':'attack';
   current=await play(e,phone,[actor.side==='enemy'?{type:'enemy'}:{type:'action',kind,targetId:target.id}]);actions++;
  }else{
   current=await play(e,phone,Array.from({length:70},()=>({type:'move',dx:1,dt:.05})));
   const step=EXPEDITION_RUN_STEPS[current.state.route.step];
   current=await play(e,phone,[step==='choice'?{type:'choice',lawId:'pierce',mode:'rescue'}:step==='rest'?{type:'rest'}:step==='return_or_boss'?{type:'boss'}:{type:'interact'}],step==='return'?[id()]:[]);
  }
 }
 assert.equal(current.state.lastResult.kind,'return');assert.equal(current.state.meta.returnCount,1);assert.equal(current.state.meta.bossWins,1);assert.ok(Object.keys(current.state.roster.tombstones).length>0);
 current=await play(e,phone,[{type:'home'}]);const newRaw=e.remote,putCount=e.puts;
 e.gain('pc');const result=await pc.store.sync({allowPull:true});assert.ok(result.ok,result.reason);assert.equal(result.raw,newRaw);assert.equal(e.puts,putCount,'read-only handoff never writes gameplay');assert.ok(e.pageReads>4,'whole course is paginated');
 const d=pc.store.read();assert.equal(d.dirty,false);assert.equal(d.pending,null,'old ACK is not converted into a new dirty fork');assert.equal(d.backupRaw,old);assert.equal(d.confirmedRaw,newRaw);const adoptedRoster=decodeExpeditionAccount(d.confirmedRaw,{owner}).state.roster;assert.equal(adoptedRoster.instances[namedId].nickname,'새봄','personal names follow the individual, not a changing party slot');
 const receiptBytes=[...e.history.values()].reduce((n,r)=>n+JSON.stringify(r).length,0);console.log(`COURSE ${actions} real battle actions / ${e.history.size} compact receipts / ${receiptBytes} bytes; local mock ports only`);
 routeFixture={e,old,newRaw,putCount,current,receiptBytes};
});

function staleDevice(e,old){const d=e.device();d.map.set(d.key,JSON.stringify({kind:'seed-expedition-account-store',version:1,ownerUid:owner,confirmedRaw:old,etag:'"old"',pending:{raw:old,transaction:null},backupRaw:null}));return d;}
await check('Missing/changed receipts, fabricated forks and rewind never replace or merge local history',async()=>{
 const {e,old,newRaw}=routeFixture;
 const receipt=[...e.history.values()].find(r=>r.revision===20),original=copy(receipt);
 for(const mutate of [()=>e.history.delete(receipt.writeId),()=>e.history.set(receipt.writeId,{...original,checkpointHash:'0'.repeat(64)})]){mutate();const d=staleDevice(e,old),bytes=d.bytes;assert.equal((await d.store.sync({allowPull:true})).ok,false);assert.equal(d.bytes,bytes);e.history.set(receipt.writeId,copy(original));}
 const d=staleDevice(e,newRaw),bytes=d.bytes;e.remote=old;assert.equal((await d.store.sync({allowPull:true})).ok,false);assert.equal(d.bytes,bytes);e.remote=newRaw;
 const a=decodeExpeditionAccount(old,{owner}),fork=await child(a,[{type:'rename',instanceId:a.state.roster.party[0],name:'별도 갈래'}],[],a.writer);e.history.set(fork.receipt.writeId,fork.receipt);e.remote=fork.raw;const d2=staleDevice(e,newRaw),b2=d2.bytes;assert.equal((await d2.store.sync({allowPull:true})).ok,false);assert.equal(d2.bytes,b2);e.remote=newRaw;
});

await check('Dirty local action cannot be silently discarded for a phone descendant',async()=>{
 const {e,old}=routeFixture,d=staleDevice(e,old),a=decodeExpeditionAccount(old,{owner});const t=tx(a,[{type:'rename',instanceId:a.state.roster.party[0],name:'아직 안 올린 이름'}]);const b=await nextExpeditionRuntimeAccount(a,{owner,transaction:t,now:e.clock,writer:e.writer});assert.ok(b.ok);assert.ok((await d.store.stage(b.raw,{expectedRaw:old,transaction:t})).ok);const bytes=d.bytes,reads=e.pageReads;assert.equal((await d.store.sync({allowPull:true})).reason,'conflict');assert.equal(d.bytes,bytes);assert.equal(e.pageReads,reads);
});

await check('UID/lease/gate/storage and concurrent head are rechecked across history fetch and replay',async()=>{
 const {e,old,newRaw}=routeFixture;
 for(const [hook,restore] of [[()=>{e.uid='other';},()=>{e.uid=owner;}],[()=>{e.lock=false;},()=>{e.lock=true;}],[()=>{e.enabled=false;},()=>{e.enabled=true;}],[()=>{e.remote=old;},()=>{e.remote=newRaw;}]]){
  const d=staleDevice(e,old),bytes=d.bytes;e.afterPage=()=>{e.afterPage=null;hook();};assert.equal((await d.store.sync({allowPull:true})).ok,false);assert.equal(d.bytes,bytes);e.afterPage=null;restore();
 }
 const d=staleDevice(e,old),bytes=d.bytes;d.failWrite=true;assert.equal((await d.store.sync({allowPull:true})).reason,'storage');assert.equal(d.bytes,bytes);
});

await check('Published head alone is not ACK; receipt readback and lost-response recovery are required',async()=>{
 const {e,pc}=await initial(),a=decodeExpeditionAccount(e.remote,{owner}),t=tx(a,[{type:'rename',instanceId:a.state.roster.party[0],name:'잎새'}]),b=await nextExpeditionRuntimeAccount(a,{owner,transaction:t,now:++e.clock,writer:e.writer});assert.ok(b.ok);assert.ok((await pc.store.stage(b.raw,{expectedRaw:e.remote,transaction:t})).ok);
 e.afterPut=scope=>{e.history.delete(scope.lineage.writeId);return {status:200};};assert.equal((await pc.store.sync()).ok,false);assert.equal(pc.store.read().dirty,true);const writes=e.puts;
 assert.equal((await pc.store.sync()).ok,false,'matching remote without its immutable receipt is still unacknowledged');assert.equal(e.puts,writes);
 const receipt=await createExpeditionLineageReceipt(a,b.raw,{owner,transaction:t});assert.ok(receipt.ok);e.history.set(receipt.receipt.writeId,receipt.receipt);e.afterPut=null;assert.ok((await pc.store.sync()).ok);assert.equal(e.puts,writes,'lost response never duplicates a PUT');assert.equal(pc.store.read().dirty,false);assert.equal(pc.store.read().pending.raw,b.raw);
});

await check('Accessor/sparse/overlong history pages never execute and cannot claim lineage',async()=>{
 const {old,newRaw}=routeFixture;let called=0;const page={};Object.defineProperty(page,'receipts',{enumerable:true,get(){called++;return [];}});
 for(const bad of [page,{receipts:Array(1)},{receipts:[]},{receipts:[],extra:true}])assert.equal((await verifyExpeditionAccountLineage(old,newRaw,{owner,readPage:async()=>bad})).ok,false);
 assert.equal(called,0);
});
console.log(`Account lineage: ${checks} groups PASS. Real shared combat rules; synthetic accounts and authenticated-port mocks. No live Firebase/device/anti-cheat/deployment claim.`);
