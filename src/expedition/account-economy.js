import {decodeExpeditionAccount,expeditionAccountParent} from './account-codec.js';
import {recruitInstance,setParty,grantInstanceXP,evolveInstance} from './roster.js';
import {getExpeditionSpecies,LAW_DNA} from './species.js';
import {canResowExpedition,nurseryGrowthCandidates,NURSERY_GROWTH_XP} from './nursery.js';

// Pure one-parent HOME audit. No union/max/sum, storage, cloud authority,
// account promotion, return settlement, hidden repair or gameplay mutation.
export const EXPEDITION_HOME_TRANSACTION_VERSION=1;
export const EXPEDITION_HOME_TRANSACTION_KINDS=Object.freeze(['hatch','grow','resow','evolve']);
const copy=v=>JSON.parse(JSON.stringify(v));
const token=v=>typeof v==='string'&&/^[A-Za-z0-9_.:-]{1,128}$/.test(v)&&!['__proto__','constructor','prototype'].includes(v);
const plain=v=>v&&typeof v==='object'&&!Array.isArray(v)&&Object.getPrototypeOf(v)===Object.prototype;
function canonical(v){return Array.isArray(v)?v.map(canonical):plain(v)?Object.fromEntries(Object.keys(v).sort().map(k=>[k,canonical(v[k])])):v;}
const equal=(a,b)=>JSON.stringify(canonical(a))===JSON.stringify(canonical(b));
function transactionShape(tx){
 if(!plain(tx)||Object.getOwnPropertySymbols(tx).length||Object.getOwnPropertyNames(tx).length!==Object.keys(tx).length)return false;
 const d=Object.getOwnPropertyDescriptors(tx);if(Object.values(d).some(v=>!Object.hasOwn(v,'value')))return false;
 const kind=d.kind?.value,extra=kind==='hatch'?['eggId','instanceId']:kind==='evolve'?['instanceId','to']:['instanceId'],names=['version','kind','receiptId',...extra];
 return EXPEDITION_HOME_TRANSACTION_KINDS.includes(kind)&&Object.keys(tx).length===names.length&&names.every(k=>Object.hasOwn(tx,k))&&tx.version===1&&token(tx.receiptId)&&token(tx.instanceId)&&extra.every(k=>token(tx[k]));
}
function receiptUsed(state,id){
 return Object.values(state.roster.instances).some(i=>Object.hasOwn(i.events,id))||['rewardIds','growthReceipts','resowIds','committedRuns'].some(k=>state.meta[k].includes(id));
}
const fail=reason=>({ok:false,reason});
function project(record,tx){
 if(!transactionShape(tx))return fail('invalid transaction');
 const state=copy(record.state),r=state.roster,m=state.meta;
 if(state.screen!=='home'||state.route!==null||state.battle!==null)return fail('HOME required');
 if(receiptUsed(state,tx.receiptId))return fail('receipt already used');
 if(tx.kind==='hatch'||tx.kind==='resow'){
  if(!tx.instanceId.startsWith('born-'))return fail('fresh birth identity required');
  let speciesId='pierce';
  if(tx.kind==='hatch'){
   const egg=m.eggs.find(e=>e.eggId===tx.eggId);if(!egg)return fail('confirmed egg required');
   if(tx.receiptId!==`hatch:${egg.eggId}`||m.rewardIds.length>=2000)return fail('hatch receipt/capacity');
   speciesId=egg.speciesId;
  }else if(!tx.receiptId.startsWith('resow:')||tx.receiptId.length<=6||!canResowExpedition(r,m)||m.resowIds.length>=256)return fail('resow eligibility/receipt');
  if(!recruitInstance(r,{instanceId:tx.instanceId,speciesId}))return fail('birth identity/capacity');
  if(tx.kind==='hatch'){m.eggs=m.eggs.filter(e=>e.eggId!==tx.eggId);m.rewardIds.push(tx.receiptId);}else m.resowIds.push(tx.receiptId);
  if(!r.party.slice(0,5).some(Boolean)){const slots=[...r.party];slots[0]=tx.instanceId;if(!setParty(r,slots))return fail('fresh party');}
 }else if(tx.kind==='grow'){
  if(!tx.receiptId.startsWith('growth:')||tx.receiptId.length<=7||m.growthCharges<1||m.growthReceipts.length>=1000||!nurseryGrowthCandidates(r).some(i=>i.instanceId===tx.instanceId))return fail('growth eligibility/receipt');
  if(!grantInstanceXP(r,tx.instanceId,NURSERY_GROWTH_XP,tx.receiptId))return fail('growth XP receipt');
  if(m.cores.chain>=10000)return fail('chain storage cap');
  m.growthCharges--;m.growthReceipts.push(tx.receiptId);m.cores.chain++;
 }else{
  if(!tx.receiptId.startsWith('evolve:')||tx.receiptId.length<=7)return fail('evolution receipt');
  const i=r.instances[tx.instanceId],from=getExpeditionSpecies(i?.speciesId),to=getExpeditionSpecies(tx.to);if(!from||!to)return fail('species');
  const law=to.kind==='solo'?from.laws[0]:to.kind==='fusion'?to.laws.find(l=>l!==from.laws[0]):to.dominantLaw,cost=to.kind==='final'?2:1;
  if(!Object.hasOwn(LAW_DNA,law)||m.cores[law]<cost||to.kind==='final'&&(!m.awakenMaterials||!m.highRisk.includes(`${i.instanceId}:${law}`)))return fail('canonical material/risk');
  if(!evolveInstance(r,i.instanceId,to.id,{receiptId:tx.receiptId,home:true,validateEvolution:()=>true}))return fail('canonical parent/level');
  m.cores[law]-=cost;if(to.kind==='final')m.awakenMaterials--;
 }
 return {ok:true,state,transaction:copy(tx),proof:'single-home-transaction-only'};
}
export function projectExpeditionHomeTransaction(previous,{owner,transaction}={}){
 const record=decodeExpeditionAccount(previous,{owner});if(!record)return fail('invalid previous account');
 return project(record,transaction);
}
export async function auditExpeditionHomeTransaction(previous,candidate,{owner,transaction}={}){
 try{
  const a=decodeExpeditionAccount(previous,{owner}),b=decodeExpeditionAccount(candidate,{owner});if(!a||!b)return fail('invalid account');
  const parent=await expeditionAccountParent(a,{owner});
  if(!equal(b.parent,parent)||b.createdAt!==a.createdAt||b.updatedAt<a.updatedAt)return fail('parent conflict');
  const expected=project(a,transaction);if(!expected.ok)return expected;
  // The ENTIRE state must be the result of exactly this one operation. This
  // preserves all previous deaths/discovery/XP, unrelated bodies and receipts,
  // and prevents attaching another payment/result/party edit to a valid hatch.
  if(!equal(expected.state,b.state))return fail('transaction result mismatch');
  return {ok:true,record:b,transaction:expected.transaction,proof:'single-home-transaction-only',receipt:{version:1,ownerUid:owner,campaignId:a.campaignId,previousWriteId:a.writeId,nextWriteId:b.writeId,parentHash:parent.checkpointHash,transaction:expected.transaction}};
 }catch{return fail('audit unavailable');}
}
