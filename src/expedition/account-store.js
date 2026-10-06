import {createFreshExpeditionAccount,decodeExpeditionAccount,encodeExpeditionAccount,validateExpeditionAccountTransition,EXPEDITION_ACCOUNT_MAX_LEASE_MS} from './account-codec.js';
import {auditExpeditionHomeTransaction} from './account-economy.js';
import {auditExpeditionRuntimeTransaction} from './account-runtime.js';
import {createExpeditionLineageReceipt,verifyExpeditionAccountLineage} from './account-lineage.js';
import {setParty} from './roster.js';
import {createExpeditionMovementJournal} from './account-movement-journal.js';

// Exact account store; deployment and normal-mode entry remain separate gates.
// A caller must hold a real owner-scoped local lock; server verifyLease and
// authorizeFresh are mandatory integration ports, never emulated here.
export const EXPEDITION_ACCOUNT_NAMESPACE='seedExpeditionAccountV1';
export const expeditionAccountStoreKey=owner=>`seed-expedition-account-v1:${encodeURIComponent(owner)}`;
export const expeditionAccountRecoveryKey=(owner,writeId)=>`${expeditionAccountStoreKey(owner)}:recovery:${encodeURIComponent(writeId)}`;
const clone=v=>JSON.parse(JSON.stringify(v));
const plain=v=>v&&typeof v==='object'&&!Array.isArray(v)&&Object.getPrototypeOf(v)===Object.prototype;
const keys=(v,names)=>plain(v)&&Object.keys(v).length===names.length&&names.every(k=>Object.hasOwn(v,k));
function canonical(v){return Array.isArray(v)?v.map(canonical):plain(v)?Object.fromEntries(Object.keys(v).sort().map(k=>[k,canonical(v[k])])):v;}
const same=(a,b)=>JSON.stringify(canonical(a))===JSON.stringify(canonical(b));
const empty=owner=>({kind:'seed-expedition-account-store',version:1,ownerUid:owner,confirmedRaw:null,etag:null,pending:null,backupRaw:null});
const token=v=>typeof v==='string'&&/^[A-Za-z0-9_.:-]{1,128}$/.test(v)&&!['__proto__','constructor','prototype'].includes(v);
const ownerOK=v=>token(v)&&v!=='guest';
const tag=v=>typeof v==='string'&&v.length>0&&v.length<=512&&!/[\u0000-\u001f]/.test(v);
const pendingKeys=['raw','transaction'];
function document(raw,owner){
 if(raw===null)return empty(owner);
 try{
  const d=JSON.parse(raw);if(JSON.stringify(d)!==raw||!keys(d,['kind','version','ownerUid','confirmedRaw','etag','pending','backupRaw'])||d.kind!=='seed-expedition-account-store'||d.version!==1||d.ownerUid!==owner)return null;
  if(!(d.confirmedRaw===null?d.etag===null:tag(d.etag)&&decodeExpeditionAccount(d.confirmedRaw,{owner})))return null;
  if(d.backupRaw!==null&&!decodeExpeditionAccount(d.backupRaw,{owner}))return null;
  if(d.pending!==null&&(!keys(d.pending,pendingKeys)||typeof d.pending.raw!=='string'||!decodeExpeditionAccount(d.pending.raw,{owner})||!(d.pending.transaction===null||plain(d.pending.transaction))))return null;
  if(d.pending===null&&d.confirmedRaw===null&&d.backupRaw!==null)return null;
  return d;
 }catch{return null;}
}
async function permitted(previous,candidate,owner,transaction){
 if(transaction!==null&&transaction!==undefined){const kind=Object.getOwnPropertyDescriptor(transaction,'kind');return kind&&Object.hasOwn(kind,'value')&&kind.value==='runtime'?auditExpeditionRuntimeTransaction(previous,candidate,{owner,transaction}):auditExpeditionHomeTransaction(previous,candidate,{owner,transaction});}
 const result=await validateExpeditionAccountTransition(previous,candidate,{owner});if(!result.ok)return result;
 const a=decodeExpeditionAccount(previous,{owner}),b=result.record;
 // A structural-history codec is not a battle/reward/story ledger. The only
 // additionally licensed mutation is the actual P1 setParty operation at HOME.
 if(a.state.screen!=='home'||b.state.screen!=='home'||a.state.route!==null||a.state.battle!==null)return {ok:false,reason:'ledger required'};
 if(same(a.state,b.state))return result;
 const s=clone(a.state);if(!setParty(s.roster,b.state.roster.party)||!same(s,b.state))return {ok:false,reason:'ledger required'};
 return result;
}
export function createExpeditionAccountStore({storage,owner,authority,localLease,port,now=Date.now,timeout=10000,idFactory=()=>globalThis.crypto.randomUUID()}={}){
 if(!ownerOK(owner)||!storage||typeof authority!=='function'||!port||typeof port.get!=='function'||typeof port.put!=='function'||typeof port.verifyLease!=='function'||typeof port.authorizeFresh!=='function'||!Number.isFinite(timeout)||timeout<=0||timeout>60000)throw TypeError('Explicit account/lease/fresh ports required');
 const key=expeditionAccountStoreKey(owner);let flight=null;
 function guard(ticket){
  const f=authority(),t=now(),w=f?.writer;
  if(f?.uid!==owner||f.isAnonymous!==false)throw Error('account');if(f.enabled!==true)throw Error('ineligible');
  if(localLease?.key!==key||localLease.active()!==true)throw Error('lease');
  if(!keys(w,['deviceId','leaseId','issuedAt','expiresAt'])||!token(w.deviceId)||!token(w.leaseId)||!Number.isSafeInteger(t)||t<=0||!Number.isSafeInteger(w.issuedAt)||w.issuedAt<=0||!Number.isSafeInteger(w.expiresAt)||w.issuedAt>t||w.expiresAt<=t||w.expiresAt-w.issuedAt>EXPEDITION_ACCOUNT_MAX_LEASE_MS||ticket&&!same(w,ticket))throw Error('lease');
  return clone(w);
 }
 const stored=()=>{try{return storage.getItem(key);}catch{throw Error('storage');}};
 const write=raw=>{try{storage.setItem(key,raw);}catch{throw Error('storage');}};
 function load(){const raw=stored(),value=document(raw,owner);if(!value)throw Error('invalid');return {raw,value};}
 function persist(before,next,ticket){
  guard(ticket);if(stored()!==before)throw Error('conflict');
  const raw=JSON.stringify(next);write(raw);if(stored()!==raw)throw Error('storage');guard(ticket);return next;
 }
 function requestScope(signal){const ticket=guard();return {ticket,signal,owner,namespace:EXPEDITION_ACCOUNT_NAMESPACE};}
 async function verified(scope){if(scope.signal?.aborted)throw Error('offline');guard(scope.ticket);if(await port.verifyLease({...scope,writer:clone(scope.ticket)})!==true)throw Error('lease');if(scope.signal?.aborted)throw Error('offline');guard(scope.ticket);}
 async function freshPermission(scope,raw){await verified(scope);if(await port.authorizeFresh({...scope,raw})!==true)throw Error('fresh denied');if(scope.signal?.aborted)throw Error('offline');guard(scope.ticket);}
 const error=e=>({ok:false,reason:['account','ineligible','lease','invalid','conflict','storage','permission','fresh denied','ledger required'].includes(e?.message)?e.message:'offline'});
 function read(){try{guard();const {value}=load();guard();return {ok:true,...clone(value),dirty:Boolean(value.pending&&value.pending.raw!==value.confirmedRaw),proof:'local-structural-only'};}catch(e){return error(e);}}
 async function bounded(fn){const c=new AbortController();let timer;try{return await Promise.race([fn(c.signal),new Promise((_,reject)=>{timer=setTimeout(()=>{c.abort();reject(Error('offline'));},timeout);})]);}catch(e){return error(e);}finally{clearTimeout(timer);c.abort();}}
 async function stage(candidate,{expectedRaw,transaction=null}={}){return bounded(async signal=>{
  try{
   const scope=requestScope(signal),before=load(),d=before.value;if(d.pending&&d.pending.raw!==d.confirmedRaw)return {ok:false,reason:'pending'};
   if(d.confirmedRaw===null||expectedRaw!==d.confirmedRaw)throw Error('conflict');
   const encoded=encodeExpeditionAccount(candidate,{owner});if(!encoded.ok)return encoded;
   if(!same(encoded.record.writer,scope.ticket)||encoded.record.updatedAt>now())throw Error('lease');
   const audited=await permitted(d.confirmedRaw,encoded.record,owner,transaction);if(!audited.ok)return audited;
   await verified(scope);persist(before.raw,{...d,pending:{raw:encoded.raw,transaction:transaction===null?null:clone(audited.transaction)}},scope.ticket);
   return {ok:true,raw:encoded.raw,dirty:true};
  }catch(e){return error(e);}
 });}
 async function fresh(options={}){return bounded(async signal=>{
  try{
   if(!plain(options)||Object.keys(options).some(k=>k!=='idFactory'))throw Error('invalid');const {idFactory}=options;
   const scope=requestScope(signal),before=load();if(before.raw!==null)throw Error('conflict');
   const record=createFreshExpeditionAccount({owner,now:now(),writer:scope.ticket,...(idFactory?{idFactory}:{})}),raw=JSON.stringify(record);
   await freshPermission(scope,raw);persist(before.raw,{...before.value,pending:{raw,transaction:null}},scope.ticket);return {ok:true,raw,dirty:true};
  }catch(e){return error(e);}
 });}
 async function perform({allowPull=false,recoverPending=false}={}){
  const controller=new AbortController();let timer;
  try{
   const work=async()=>{
    const scope=requestScope(controller.signal);let before=load(),d=before.value;
    let lineage=null;
    if(d.pending){
     const p=decodeExpeditionAccount(d.pending.raw,{owner});if(d.pending.raw!==d.confirmedRaw&&!same(p.writer,scope.ticket)&&recoverPending!==true)throw Error('lease');
     if(d.pending.raw!==d.confirmedRaw){
      if(d.confirmedRaw===null){if(p.revision!==0)throw Error('invalid');if(same(p.writer,scope.ticket))await freshPermission(scope,d.pending.raw);}
      else {const audit=await permitted(d.confirmedRaw,p,owner,d.pending.transaction);if(!audit.ok)throw Error('ledger required');if(d.pending.transaction){const receipt=await createExpeditionLineageReceipt(d.confirmedRaw,p,{owner,transaction:d.pending.transaction});if(!receipt.ok)throw Error('ledger required');lineage=receipt.receipt;}}
     }
    }
    await verified(scope);const response=await port.get(scope);await verified(scope);
    if(!keys(response,['raw','etag'])||!tag(response.etag)||!(response.raw===null||typeof response.raw==='string'&&decodeExpeditionAccount(response.raw,{owner})))throw Error('invalid');
    if(stored()!==before.raw)throw Error('conflict');
    const ack=async(raw,etag,{adopt=false}={})=>{
     await verified(scope);if(stored()!==before.raw)throw Error('conflict');
     if(raw===null&&before.raw===null)return {ok:true,kind:'empty',raw:null,dirty:false};
     const next={...d,confirmedRaw:raw,etag,backupRaw:d.confirmedRaw!==raw?d.confirmedRaw:d.backupRaw,...(adopt?{pending:null}:{})};
     // Retain the exact pending receipt even after ACK. It is clean, not an
     // outstanding write. Failure after durable ACK cannot destroy its bytes.
     persist(before.raw,next,scope.ticket);await verified(scope);return {ok:true,kind:raw===null?'empty':'synced',raw,dirty:false};
    };
    const verifyPublication=async()=>{if(!lineage||typeof port.getLineage!=='function')return;await verified(scope);const page=await port.getLineage({...scope,head:{ownerUid:owner,campaignId:lineage.campaignId,writeId:lineage.writeId,revision:lineage.revision,checkpointHash:lineage.checkpointHash},stopAfterRevision:lineage.revision-1,limit:1});await verified(scope);if(!keys(page,['receipts'])||!Array.isArray(page.receipts)||page.receipts.length!==1||!same(page.receipts[0],lineage))throw Error('conflict');};
    if(d.pending&&response.raw===d.pending.raw){await verifyPublication();return ack(response.raw,response.etag);} // Lost PUT response recovery.
    if(response.raw!==d.confirmedRaw){
     if(d.pending&&d.pending.raw!==d.confirmedRaw||!allowPull||response.raw===null)throw Error('conflict');
     if(d.confirmedRaw===null)return ack(response.raw,response.etag,{adopt:true}); // Empty device, authenticated port.
     if(typeof port.getLineage!=='function')throw Error('conflict');
     const audit=await verifyExpeditionAccountLineage(d.confirmedRaw,response.raw,{owner,checkScope:()=>{if(scope.signal.aborted)throw Error('offline');guard(scope.ticket);if(stored()!==before.raw)throw Error('conflict');},readPage:async query=>{await verified(scope);const page=await port.getLineage({...scope,...query});await verified(scope);return page;}});
     if(!audit.ok)throw Error('conflict');
     // Never ACK a stale head observed before a multi-page history fetch.
     const latest=await port.get(scope);await verified(scope);
     if(!keys(latest,['raw','etag'])||latest.raw!==response.raw||latest.etag!==response.etag)throw Error('conflict');
     return ack(response.raw,response.etag,{adopt:true}); // Exact descendant only; dirty forks are never merged.
    }
    if(!d.pending)return ack(response.raw,response.etag);
    if(d.pending.raw===d.confirmedRaw)return ack(response.raw,response.etag);
    // A finite old lease is not write authority. If its exact write was not
    // accepted, only reissue against the same server parent, retaining the
    // original durable pending bytes before changing the local primary.
    const pending=decodeExpeditionAccount(d.pending.raw,{owner});
    if(!same(pending.writer,scope.ticket)){
     if(recoverPending!==true)throw Error('lease');
     const suffix=idFactory();if(!token(suffix)||suffix.length>80)throw Error('invalid');
     const writeId=`write-${pending.revision}-${suffix}`,at=now();
     if(writeId===pending.writeId||at<pending.updatedAt)throw Error('invalid');
     const candidate={...pending,writeId,updatedAt:at,...(pending.revision===0?{createdAt:at}:{}),writer:clone(scope.ticket)};
     const encoded=encodeExpeditionAccount(candidate,{owner});if(!encoded.ok)throw Error('invalid');
     const transaction=d.pending.transaction===null?null:clone(d.pending.transaction);
     if(transaction?.kind==='runtime')transaction.receiptId=writeId;
     if(d.confirmedRaw===null){await freshPermission(scope,encoded.raw);lineage=null;}
     else{
      const audited=await permitted(d.confirmedRaw,encoded.record,owner,transaction);if(!audited.ok)throw Error('ledger required');
      if(transaction){const receipt=await createExpeditionLineageReceipt(d.confirmedRaw,encoded.raw,{owner,transaction});if(!receipt.ok)throw Error('ledger required');lineage=receipt.receipt;}
     }
     await verified(scope);if(stored()!==before.raw)throw Error('conflict');
     const recoveryKey=expeditionAccountRecoveryKey(owner,pending.writeId);
     try{
      const archived=storage.getItem(recoveryKey);if(archived!==null&&archived!==before.raw)throw Error('conflict');
      if(archived===null)storage.setItem(recoveryKey,before.raw);
      if(storage.getItem(recoveryKey)!==before.raw)throw Error('storage');
     }catch(e){throw Error(e?.message==='conflict'?'conflict':'storage');}
     await verified(scope);if(stored()!==before.raw)throw Error('conflict');
     const latest=await port.get(scope);await verified(scope);
     if(!keys(latest,['raw','etag'])||latest.raw!==response.raw||latest.etag!==response.etag)throw Error('conflict');
     const next={...d,pending:{raw:encoded.raw,transaction}};
     persist(before.raw,next,scope.ticket);before={raw:JSON.stringify(next),value:next};d=next;
    }
    await verified(scope);if(stored()!==before.raw)throw Error('conflict');
    const put=await port.put({...scope,raw:d.pending.raw,ifMatch:response.etag,lineage});await verified(scope);
    if(put?.status===412)throw Error('conflict');if(put?.status===401||put?.status===403)throw Error('permission');if(put?.status!==200)throw Error('offline');
    // A 200/lost body is never a write receipt. Confirm exact atomic bytes via
    // a new GET before ACK; a concurrent descendant remains an explicit fork.
    const check=await port.get(scope);await verified(scope);
    if(!keys(check,['raw','etag'])||!tag(check.etag)||check.raw!==d.pending.raw)throw Error('conflict');
    await verifyPublication();
    return ack(check.raw,check.etag);
   };
   return await Promise.race([work(),new Promise((_,reject)=>{timer=setTimeout(()=>{controller.abort();reject(Error('offline'));},timeout);})]);
  }catch(e){return error(e);}finally{clearTimeout(timer);controller.abort();}
 }
 const movementJournal=createExpeditionMovementJournal({storage,owner,allowed:()=>{const a=authority();return a?.uid===owner&&a.isAnonymous===false&&a.enabled===true&&localLease?.key===key&&localLease.active()===true;}});
 return {key,namespace:EXPEDITION_ACCOUNT_NAMESPACE,movementJournal,read,stage,fresh,sync(options={}){if(flight)return flight;flight=perform(options).finally(()=>{flight=null;});return flight;}};
}
