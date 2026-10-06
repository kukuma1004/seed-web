import {decodeExpeditionAccount,expeditionAccountParent,EXPEDITION_ACCOUNT_MAX_BYTES,EXPEDITION_ACCOUNT_MAX_LEASE_MS} from './account-codec.js';
import {createExpeditionLineageReceipt,expeditionLineageIdentity,EXPEDITION_LINEAGE_PAGE_SIZE} from './account-lineage.js';
import {EXPEDITION_ACCOUNT_NAMESPACE,expeditionAccountStoreKey} from './account-store.js';

// Real Firebase REST wire format. Nothing opens the public mode or imports a
// review save. Server rules and main/controller integration are separate gates.
const plain=v=>v&&typeof v==='object'&&!Array.isArray(v)&&Object.getPrototypeOf(v)===Object.prototype;
const keys=(v,list)=>plain(v)&&Object.keys(v).length===list.length&&list.every(k=>Object.hasOwn(v,k));
const token=v=>typeof v==='string'&&/^[A-Za-z0-9_:-]{1,128}$/.test(v)&&!['__proto__','constructor','prototype','guest'].includes(v);
const etag=v=>typeof v==='string'&&v.length>0&&v.length<=512&&!/[\u0000-\u001f]/.test(v);
const canonical=v=>Array.isArray(v)?v.map(canonical):plain(v)?Object.fromEntries(Object.keys(v).sort().map(k=>[k,canonical(v[k])])):v;
const same=(a,b)=>JSON.stringify(canonical(a))===JSON.stringify(canonical(b));
const copy=v=>JSON.parse(JSON.stringify(v));
const utf8=new TextEncoder();
// Account identities permit periods, which are illegal in Firebase keys.
export const expeditionWireKey=value=>Array.from(utf8.encode(value),n=>n.toString(16).padStart(2,'0')).join('');
function writer(w){return keys(w,['deviceId','leaseId','issuedAt','expiresAt'])&&token(w.deviceId)&&token(w.leaseId)&&Number.isSafeInteger(w.issuedAt)&&w.issuedAt>0&&Number.isSafeInteger(w.expiresAt)&&w.expiresAt>w.issuedAt&&w.expiresAt-w.issuedAt<=EXPEDITION_ACCOUNT_MAX_LEASE_MS;}
function lease(v,owner){return keys(v,['version','ownerUid','closed','writer'])&&v.version===1&&v.ownerUid===owner&&typeof v.closed==='boolean'&&writer(v.writer);}
function database(value,allowEmulator){
 const u=new URL(value),local=allowEmulator===true&&u.protocol==='http:'&&u.hostname==='127.0.0.1'&&/^demo-[A-Za-z0-9_-]+$/.test(u.searchParams.get('ns')||'');
 if(u.username||u.password||u.hash||u.pathname!=='/'||[...u.searchParams.keys()].some(k=>k!=='ns')||(!local&&(u.protocol!=='https:'||!/(?:^|\.)(?:firebaseio\.com|firebasedatabase\.app)$/.test(u.hostname)||u.port||u.search)))throw TypeError('Explicit Firebase database origin required');
 return u;
}
export async function encodeExpeditionCloudHead(raw,{owner}={}){
 const a=decodeExpeditionAccount(raw,{owner});if(!a)throw Error('invalid');
 const identity=await expeditionAccountParent(a,{owner});
 // Firebase removes null children. The wire parent is false at birth; nulls
 // and sparse party slots stay intact inside the JSON checkpoint string.
 return {version:1,...identity,campaignKey:expeditionWireKey(a.campaignId),writeKey:expeditionWireKey(a.writeId),parent:a.parent??false,writer:a.writer,createdAt:a.createdAt,updatedAt:a.updatedAt,checkpoint:raw};
}
export async function decodeExpeditionCloudHead(v,{owner}={}){
 if(v===null)return null;
 if(!keys(v,['version','ownerUid','campaignId','writeId','revision','checkpointHash','campaignKey','writeKey','parent','writer','createdAt','updatedAt','checkpoint'])||v.version!==1||v.ownerUid!==owner||typeof v.checkpoint!=='string'||utf8.encode(v.checkpoint).length>=EXPEDITION_ACCOUNT_MAX_BYTES)throw Error('invalid');
 const a=decodeExpeditionAccount(v.checkpoint,{owner});if(!a)throw Error('invalid');
 const identity=await expeditionAccountParent(a,{owner});
 if(!same(v,{version:1,...identity,campaignKey:expeditionWireKey(a.campaignId),writeKey:expeditionWireKey(a.writeId),parent:a.parent??false,writer:a.writer,createdAt:a.createdAt,updatedAt:a.updatedAt,checkpoint:v.checkpoint}))throw Error('invalid');
 return v.checkpoint;
}
export function encodeExpeditionCloudReceipt(receipt,{owner}={}){
 const identity=expeditionLineageIdentity(receipt,{owner});if(!identity)throw Error('invalid');
 return {version:1,...identity,campaignKey:expeditionWireKey(receipt.campaignId),writeKey:expeditionWireKey(receipt.writeId),parent:receipt.parent,writer:receipt.writer,createdAt:receipt.createdAt,updatedAt:receipt.updatedAt,payload:JSON.stringify(receipt)};
}
export function decodeExpeditionCloudReceipt(v,{owner}={}){
 if(v===null)return null;
 if(!keys(v,['version','ownerUid','campaignId','writeId','revision','checkpointHash','campaignKey','writeKey','parent','writer','createdAt','updatedAt','payload'])||typeof v.payload!=='string'||utf8.encode(v.payload).length>65536)throw Error('invalid');
 let receipt;try{receipt=JSON.parse(v.payload);}catch{throw Error('invalid');}
 if(!same(v,encodeExpeditionCloudReceipt(receipt,{owner})))throw Error('invalid');return receipt;
}

export function createExpeditionAccountTransport({account,owner,deviceId,localLease,databaseURL,enabled=()=>false,fetchImpl=globalThis.fetch,now=Date.now,idFactory=()=>globalThis.crypto.randomUUID(),leaseMs=90000,timeout=10000,allowEmulator=false}={}){
 if(!token(owner)||!token(deviceId)||typeof account?.user!=='function'||typeof account?.tokenSession!=='function'||typeof fetchImpl!=='function'||typeof enabled!=='function'||typeof now!=='function'||typeof idFactory!=='function'||!Number.isSafeInteger(leaseMs)||leaseMs<1000||leaseMs>EXPEDITION_ACCOUNT_MAX_LEASE_MS||!Number.isFinite(timeout)||timeout<=0||timeout>60000)throw TypeError('Explicit authenticated transport required');
 const base=database(databaseURL,allowEmulator),prefix=`${EXPEDITION_ACCOUNT_NAMESPACE}/${encodeURIComponent(owner)}`;
 let ticket=null,proposed=null,acquiring=null;
 function guard(expected){
  const u=account.user();if(u?.uid!==owner||u.isAnonymous!==false)throw Error('account');
  if(enabled()!==true)throw Error('ineligible');
  if(localLease?.key!==expeditionAccountStoreKey(owner)||localLease.active()!==true)throw Error('lease');
  const t=now();if(!Number.isSafeInteger(t)||t<=0)throw Error('invalid');
  if(expected&&(!writer(expected)||!same(expected,ticket)||expected.issuedAt>t||expected.expiresAt<=t))throw Error('lease');
 }
 async function json(response,limit,signal){
  const declared=Number(response.headers?.get?.('Content-Length'));if(declared>limit)throw Error('invalid');
  let text='';
  if(response.body?.getReader){
   const reader=response.body.getReader(),decoder=new TextDecoder();let bytes=0;
   try{while(true){if(signal.aborted)throw Error('offline');const chunk=await reader.read();if(chunk.done)break;bytes+=chunk.value.byteLength;if(bytes>limit)throw Error('invalid');text+=decoder.decode(chunk.value,{stream:true});}text+=decoder.decode();}
   finally{await reader.cancel().catch(()=>{});reader.releaseLock();}
  }else{text=await response.text();if(utf8.encode(text).length>limit)throw Error('invalid');}
  try{return JSON.parse(text);}catch{throw Error('invalid');}
 }
 async function request(path,{method='GET',body,match,signal,expected,query,limit=8500000,withEtag=true}={}){
  guard(expected);const controller=new AbortController(),abort=()=>controller.abort();if(signal?.aborted)throw Error('offline');signal?.addEventListener('abort',abort,{once:true});const alarm=setTimeout(abort,timeout);
  try{
   const wait=p=>Promise.race([p,new Promise((_,reject)=>{if(controller.signal.aborted)reject(Error('offline'));else controller.signal.addEventListener('abort',()=>reject(Error('offline')),{once:true});})]);
   const session=await wait(account.tokenSession());guard(expected);
   if(session?.uid!==owner||typeof session.idToken!=='string'||!session.idToken)throw Error('account');
   const url=new URL(base);url.pathname=`/${prefix}/${path}.json`;url.searchParams.set('auth',session.idToken);
   for(const [k,v] of Object.entries(query||{}))url.searchParams.set(k,String(v));
   const headers=method==='GET'?(withEtag?{'X-Firebase-ETag':'true'}:{}):{'Content-Type':'application/json'};
   if(match!==undefined){if(!etag(match))throw Error('invalid');headers['if-match']=match;}
   const response=await wait(fetchImpl(url.href,{method,headers,...(body===undefined?{}:{body:JSON.stringify(body)}),signal:controller.signal,cache:'no-store',redirect:'error'}));guard(expected);
   if(response.status===412)return {status:412};
   if(!response.ok)throw Error(response.status===401||response.status===403?'permission':'offline');
   const value=await wait(json(response,limit,controller.signal));guard(expected);
   const tag=response.headers?.get?.('ETag');if(method==='GET'&&withEtag&&!etag(tag))throw Error('offline');
   return {status:response.status,value,etag:tag};
  }catch(error){throw Error(['account','ineligible','lease','invalid','permission','conflict'].includes(error?.message)?error.message:'offline');}
  finally{clearTimeout(alarm);signal?.removeEventListener('abort',abort);controller.abort();}
 }
 function scope(s){if(s?.owner!==owner||s.namespace!==EXPEDITION_ACCOUNT_NAMESPACE)throw Error('account');guard(s.ticket);if(s.signal?.aborted)throw Error('offline');return {signal:s.signal,expected:s.ticket};}
 async function acquire(){
  if(acquiring)return acquiring;
  acquiring=(async()=>{
   try{
    guard();const response=await request('lease',{limit:2048});
    if(response.value!==null&&!lease(response.value,owner))throw Error('invalid');
    const prior=response.value;
    if(prior&&!prior.closed&&prior.writer.expiresAt>now()){
     if(prior.writer.issuedAt>now())throw Error('lease');
     if(same(prior.writer,ticket)||same(prior.writer,proposed)){ticket=copy(prior.writer);proposed=null;return {ok:true,writer:copy(ticket)};}
     return {ok:false,reason:'busy'};
    }
    const leaseId=idFactory();if(!token(leaseId))throw Error('invalid');
    const at=now();proposed={deviceId,leaseId,issuedAt:at,expiresAt:at+leaseMs};
    const value={version:1,ownerUid:owner,closed:false,writer:copy(proposed)},put=await request('lease',{method:'PUT',body:value,match:response.etag,limit:2048});
    if(put.status===412)return {ok:false,reason:'busy'};
    const check=await request('lease',{limit:2048});if(!same(check.value,value)||proposed.expiresAt<=now())throw Error('lease');
    ticket=copy(proposed);proposed=null;return {ok:true,writer:copy(ticket)};
   }catch(error){return {ok:false,reason:error.message};}
  })().finally(()=>{acquiring=null;});return acquiring;
 }
 async function readHead(s){const opts=scope(s),response=await request('head',opts),raw=await decodeExpeditionCloudHead(response.value,{owner});guard(s.ticket);return {raw,etag:response.etag};}
 async function verifyLease(s){
  const response=await request('lease',{...scope(s),limit:2048});return lease(response.value,owner)&&!response.value.closed&&same(response.value.writer,s.ticket)&&response.value.writer.expiresAt>now();
 }
 async function authorizeFresh(s){const a=decodeExpeditionAccount(s.raw,{owner});if(!a||a.revision!==0||!same(a.writer,s.ticket))return false;return (await readHead(s)).raw===null;}
 async function publishReceipt(s,receipt){
  const opts=scope(s),path=`receipts/${expeditionWireKey(receipt.campaignId)}/${expeditionWireKey(receipt.writeId)}`;
  const wire=encodeExpeditionCloudReceipt(receipt,{owner});
  const existing=await request(path,{...opts,limit:140000});
  if(existing.value!==null){if(!same(decodeExpeditionCloudReceipt(existing.value,{owner}),receipt))throw Error('conflict');return;}
  const written=await request(path,{...opts,method:'PUT',body:wire,match:existing.etag,limit:140000});
  // A race may have published exactly our immutable receipt. Read it back even
  // after 412; never replace an existing different receipt.
  const check=await request(path,{...opts,limit:140000});if(!same(decodeExpeditionCloudReceipt(check.value,{owner}),receipt))throw Error(written.status===412?'conflict':'invalid');
 }
 async function put(s){
  scope(s);const a=decodeExpeditionAccount(s.raw,{owner});if(!a||!same(a.writer,s.ticket)||a.updatedAt>now())throw Error('invalid');
  const before=await readHead(s);if(before.etag!==s.ifMatch)return {status:412};
  if(a.revision===0){if(before.raw!==null||s.lineage!==null)throw Error('conflict');}
  else{
   if(!before.raw||!s.lineage)throw Error('invalid');
   const audited=await createExpeditionLineageReceipt(before.raw,s.raw,{owner,transaction:s.lineage.transaction});guard(s.ticket);
   if(!audited.ok||!same(audited.receipt,s.lineage))throw Error('invalid');
   await publishReceipt(s,audited.receipt);
  }
  if(await verifyLease(s)!==true)throw Error('lease');
  const head=await encodeExpeditionCloudHead(s.raw,{owner});guard(s.ticket);
  return {status:(await request('head',{...scope(s),method:'PUT',body:head,match:s.ifMatch})).status};
 }
 async function getLineage(s){
  const opts=scope(s),head=s.head;
  if(!keys(head,['ownerUid','campaignId','writeId','revision','checkpointHash'])||head.ownerUid!==owner||!Number.isSafeInteger(head.revision)||head.revision<1||!Number.isSafeInteger(s.stopAfterRevision)||s.stopAfterRevision<0||s.stopAfterRevision>=head.revision||!Number.isSafeInteger(s.limit)||s.limit<1||s.limit>EXPEDITION_LINEAGE_PAGE_SIZE||typeof head.campaignId!=='string'||!head.campaignId.length||head.campaignId.length>128||typeof head.writeId!=='string'||!head.writeId.length||head.writeId.length>128||typeof head.checkpointHash!=='string'||!/^\w{64}$/.test(head.checkpointHash)||!/^[a-f0-9]+$/.test(head.checkpointHash))throw Error('invalid');
  const path=`receipts/${expeditionWireKey(head.campaignId)}`;
  const page=await request(path,{...opts,query:{orderBy:JSON.stringify('revision'),endAt:head.revision,limitToLast:s.limit*2},limit:9000000,withEtag:false});
  if(page.value!==null&&!plain(page.value))throw Error('invalid');
  const receipts=[];let cursor=head;
  while(receipts.length<s.limit&&cursor.revision>s.stopAfterRevision){
   const key=expeditionWireKey(cursor.writeId);let receipt=Object.hasOwn(page.value||{},key)?page.value[key]:null;
   if(!receipt&&receipts.length===0)receipt=(await request(`${path}/${key}`,{...opts,limit:140000})).value;
   if(!receipt)break;
   receipt=decodeExpeditionCloudReceipt(receipt,{owner});
   if(!same(expeditionLineageIdentity(receipt,{owner}),cursor))throw Error('invalid');
   receipts.push(receipt);cursor=receipt.parent;
  }
  return {receipts};
 }
 async function release(){
  const held=ticket;if(!held)return {ok:true};
  try{
   // Client clock expiry permits local cleanup, but cannot prove the server
   // or another device has observed expiry. Do not promise a ready handoff.
   if(held.expiresAt<=now())return {ok:true,handoff:false};
   const response=await request('lease',{expected:held,limit:2048});
   if(!lease(response.value,owner)||response.value.closed||!same(response.value.writer,held))return {ok:false,reason:'lease'};
   const result=await request('lease',{expected:held,method:'PUT',body:{...response.value,closed:true},match:response.etag,limit:2048});
   if(result.status!==200)return {ok:false,reason:'conflict'};
   const check=await request('lease',{expected:held,limit:2048});return same(check.value,{...response.value,closed:true})?{ok:true}:{ok:false,reason:'lease'};
  }catch(error){return {ok:false,reason:error.message};}
  finally{ticket=null;proposed=null;}
 }
 return {acquire,release,writer:()=>ticket?copy(ticket):null,authority:()=>({uid:account.user()?.uid,isAnonymous:account.user()?.isAnonymous,enabled:enabled()===true,writer:ticket?copy(ticket):null}),port:{get:readHead,put,verifyLease,authorizeFresh,getLineage}};
}
