import {decodeExpeditionAccount,encodeExpeditionAccount,expeditionAccountParent} from './account-codec.js';
import {projectExpeditionRuntimeTransaction,auditExpeditionRuntimeTransaction} from './account-runtime.js';
import {projectExpeditionHomeTransaction,auditExpeditionHomeTransaction} from './account-economy.js';

// Compact immutable commands, not an array of full roster snapshots. The
// authenticated transport must supply them; a hash alone is not authority.
export const EXPEDITION_LINEAGE_PROTOCOL='seed-expedition-lineage-v1';
export const EXPEDITION_LINEAGE_PAGE_SIZE=32;
export const EXPEDITION_LINEAGE_MAX_ENTRIES=4096;
const fields=['version','protocol','ownerUid','campaignId','writeId','revision','createdAt','updatedAt','parent','writer','transaction','checkpointHash'];
const plain=v=>v&&typeof v==='object'&&!Array.isArray(v)&&Object.getPrototypeOf(v)===Object.prototype;
const token=v=>typeof v==='string'&&/^[A-Za-z0-9_.:-]{1,128}$/.test(v)&&!['__proto__','constructor','prototype'].includes(v);
const hash=v=>typeof v==='string'&&/^[a-f0-9]{64}$/.test(v);
const same=(a,b)=>JSON.stringify(canonical(a))===JSON.stringify(canonical(b));
function canonical(v){return Array.isArray(v)?v.map(canonical):plain(v)?Object.fromEntries(Object.keys(v).sort().map(k=>[k,canonical(v[k])])):v;}
function safe(v,depth=0){
 if(depth>16)return false;
 if(v===null||typeof v==='boolean')return true;
 if(typeof v==='string')return v.length<=512;
 if(typeof v==='number')return Number.isFinite(v)&&!Object.is(v,-0);
 if(!plain(v)&&!Array.isArray(v)||Object.getOwnPropertySymbols(v).length)return false;
 const descriptors=Object.getOwnPropertyDescriptors(v),names=Object.getOwnPropertyNames(v),enumerable=Object.keys(v);
 if(Object.values(descriptors).some(d=>!Object.hasOwn(d,'value')))return false;
 if(Array.isArray(v)?v.length>128||names.length!==v.length+1||enumerable.some((k,n)=>k!==String(n)):names.length!==enumerable.length||enumerable.length>32)return false;
 return enumerable.every(k=>!['__proto__','constructor','prototype'].includes(k)&&safe(descriptors[k].value,depth+1));
}
function shape(v,owner){
 if(!safe(v)||!plain(v)||Object.keys(v).length!==fields.length||!fields.every(k=>Object.hasOwn(v,k))||v.version!==1||v.protocol!==EXPEDITION_LINEAGE_PROTOCOL||v.ownerUid!==owner||!token(owner)||!token(v.campaignId)||!token(v.writeId)||!Number.isSafeInteger(v.revision)||v.revision<1||!hash(v.checkpointHash)||new TextEncoder().encode(JSON.stringify(v)).length>65536)return false;
 const p=v.parent;
 return plain(p)&&Object.keys(p).length===5&&['ownerUid','campaignId','writeId','revision','checkpointHash'].every(k=>Object.hasOwn(p,k))&&p.ownerUid===owner&&p.campaignId===v.campaignId&&token(p.writeId)&&p.revision===v.revision-1&&hash(p.checkpointHash)&&plain(v.transaction)&&plain(v.writer)&&Number.isSafeInteger(v.createdAt)&&Number.isSafeInteger(v.updatedAt)&&v.createdAt>0&&v.updatedAt>=v.createdAt;
}
export function expeditionLineageIdentity(receipt,{owner}={}){
 return shape(receipt,owner)?{ownerUid:owner,campaignId:receipt.campaignId,writeId:receipt.writeId,revision:receipt.revision,checkpointHash:receipt.checkpointHash}:null;
}
const fail=reason=>({ok:false,reason});
function family(tx){return tx?.kind==='runtime'?{project:projectExpeditionRuntimeTransaction,audit:auditExpeditionRuntimeTransaction}:{project:projectExpeditionHomeTransaction,audit:auditExpeditionHomeTransaction};}
export async function createExpeditionLineageReceipt(previous,candidate,{owner,transaction}={}){
 try{
  if(!safe(transaction))return fail('invalid transaction');
  const a=decodeExpeditionAccount(previous,{owner}),b=decodeExpeditionAccount(candidate,{owner});if(!a||!b)return fail('invalid account');
  const audited=await family(transaction).audit(a,b,{owner,transaction});if(!audited.ok)return audited;
  const receipt={version:1,protocol:EXPEDITION_LINEAGE_PROTOCOL,ownerUid:owner,campaignId:b.campaignId,writeId:b.writeId,revision:b.revision,createdAt:b.createdAt,updatedAt:b.updatedAt,parent:b.parent,writer:b.writer,transaction:audited.transaction,checkpointHash:(await expeditionAccountParent(b,{owner})).checkpointHash};
  return shape(receipt,owner)?{ok:true,receipt,proof:'exact-shared-command-receipt'}:fail('invalid receipt');
 }catch{return fail('invalid receipt');}
}
export async function replayExpeditionLineageReceipt(previous,receipt,{owner}={}){
 try{
  if(!shape(receipt,owner))return fail('invalid receipt');
  const a=decodeExpeditionAccount(previous,{owner});if(!a||a.createdAt!==receipt.createdAt||!same(await expeditionAccountParent(a,{owner}),receipt.parent))return fail('lineage parent conflict');
  const f=family(receipt.transaction),projected=f.project(a,{owner,transaction:receipt.transaction});if(!projected.ok)return projected;
  const encoded=encodeExpeditionAccount({...a,writeId:receipt.writeId,revision:receipt.revision,updatedAt:receipt.updatedAt,parent:receipt.parent,writer:receipt.writer,state:projected.state},{owner});if(!encoded.ok)return encoded;
  const audited=await f.audit(a,encoded.raw,{owner,transaction:receipt.transaction});if(!audited.ok)return audited;
  if(encoded.record.writer.issuedAt>receipt.updatedAt||encoded.record.writer.expiresAt<=receipt.updatedAt||(await expeditionAccountParent(encoded.raw,{owner})).checkpointHash!==receipt.checkpointHash)return fail('lineage result conflict');
  return {...encoded,proof:'exact-shared-command-replay'};
 }catch{return fail('invalid receipt');}
}
export async function verifyExpeditionAccountLineage(previous,remote,{owner,readPage,checkScope=()=>{}}={}){
 try{
  const a=decodeExpeditionAccount(previous,{owner}),b=decodeExpeditionAccount(remote,{owner});
  if(!a||!b||typeof readPage!=='function'||a.campaignId!==b.campaignId||b.revision<=a.revision||b.revision-a.revision>EXPEDITION_LINEAGE_MAX_ENTRIES)return fail('lineage conflict');
  const base=await expeditionAccountParent(a,{owner}),target=await expeditionAccountParent(b,{owner});checkScope();
  let cursor=target;const descending=[];let bytes=0;
  while(cursor.revision>a.revision){
   checkScope();const page=await readPage({head:cursor,stopAfterRevision:a.revision,limit:EXPEDITION_LINEAGE_PAGE_SIZE});checkScope();
   if(!safe(page)||!plain(page)||Object.keys(page).length!==1||!Array.isArray(page.receipts)||!page.receipts.length||page.receipts.length>EXPEDITION_LINEAGE_PAGE_SIZE)return fail('invalid lineage page');
   for(const receipt of page.receipts){
    if(cursor.revision<=a.revision||!same(expeditionLineageIdentity(receipt,{owner}),cursor))return fail('lineage gap or fork');
    descending.push(receipt);bytes+=new TextEncoder().encode(JSON.stringify(receipt)).length;if(bytes>8000000)return fail('lineage budget');cursor=receipt.parent;
   }
  }
  if(!same(cursor,base))return fail('lineage parent conflict');
  let current=a;
  for(const receipt of descending.reverse()){checkScope();const result=await replayExpeditionLineageReceipt(current,receipt,{owner});checkScope();if(!result.ok)return result;current=result.record;}
  const final=await expeditionAccountParent(current,{owner});checkScope();
  return same(final,target)?{ok:true,raw:remote,record:b,steps:descending.length,proof:'exact-shared-lineage-replay'}:fail('lineage result conflict');
 }catch(error){if(['account','lease','ineligible','conflict','offline','permission'].includes(error?.message))throw error;return fail('invalid lineage');}
}
