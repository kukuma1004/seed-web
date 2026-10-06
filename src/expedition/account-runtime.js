import {decodeExpeditionAccount,encodeExpeditionAccount,expeditionAccountParent} from './account-codec.js';
import {projectExpeditionRuntime} from './controller.js';
export const EXPEDITION_RUNTIME_TRANSACTION_VERSION=3;

// A deterministic, exact-parent gameplay receipt. This does not grant a
// Firebase lease, turn review records into accounts or merge independent runs.
const token=(v,max=128)=>typeof v==='string'&&v.length<=max&&/^[A-Za-z0-9_.:-]+$/.test(v)&&!['__proto__','constructor','prototype'].includes(v);
const plain=v=>v&&typeof v==='object'&&!Array.isArray(v)&&Object.getPrototypeOf(v)===Object.prototype;
const keys=(v,required,optional=[])=>plain(v)&&required.every(k=>Object.hasOwn(v,k))&&Object.keys(v).every(k=>required.includes(k)||optional.includes(k));
function safe(v,depth=0){
 if(depth>16)return false;
 if(v===null||typeof v==='boolean')return true;
 if(typeof v==='number')return Number.isFinite(v);
 if(typeof v==='string')return v.length<=512;
 if(!plain(v)&&!Array.isArray(v)||Object.getOwnPropertySymbols(v).length)return false;
 const descriptors=Object.getOwnPropertyDescriptors(v);
 if(Object.values(descriptors).some(d=>!Object.hasOwn(d,'value')))return false;
 const names=Object.getOwnPropertyNames(v),enumerable=Object.keys(v);
 if(Array.isArray(v)?v.length>128||names.length!==v.length+1||enumerable.some((k,n)=>k!==String(n)):names.length!==enumerable.length||enumerable.length>32)return false;
 return enumerable.every(k=>!['__proto__','constructor','prototype'].includes(k)&&safe(descriptors[k].value,depth+1));
}
const same=(a,b)=>JSON.stringify(canonical(a))===JSON.stringify(canonical(b));
function canonical(v){return Array.isArray(v)?v.map(canonical):plain(v)?Object.fromEntries(Object.keys(v).sort().map(k=>[k,canonical(v[k])])):v;}
const fail=reason=>({ok:false,reason});
function command(c){
 if(!plain(c)||typeof c.type!=='string')return false;
 if(['checkpoint','interact','rest','boss','return','skipBoss','home','enemy','resow'].includes(c.type))return keys(c,['type']);
 if(c.type==='move')return keys(c,['type','dx','dt'])&&Number.isFinite(c.dx)&&Math.abs(c.dx)<=1&&Number.isFinite(c.dt)&&c.dt>0&&c.dt<=.1;
 if(c.type==='depart')return keys(c,['type','gardenId','difficulty'])&&token(c.gardenId)&&Number.isInteger(c.difficulty)&&c.difficulty>=1&&c.difficulty<=5;
 if(c.type==='choice')return keys(c,['type','lawId'],['mode'])&&token(c.lawId)&&(!Object.hasOwn(c,'mode')||['core','egg','rescue'].includes(c.mode));
 if(c.type==='party')return keys(c,['type','ids'])&&Array.isArray(c.ids)&&c.ids.length===8&&c.ids.every(id=>id===null||token(id));
 if(c.type==='grow')return keys(c,['type','instanceId'])&&token(c.instanceId);
 if(c.type==='rename')return keys(c,['type','instanceId','name'])&&token(c.instanceId)&&typeof c.name==='string'&&c.name.length<=160;
 if(c.type==='hatch')return keys(c,['type','eggId'])&&token(c.eggId);
 if(c.type==='evolve')return keys(c,['type','instanceId','to'])&&token(c.instanceId)&&token(c.to);
 if(c.type==='twin')return keys(c,['type','a','b','speciesId'])&&token(c.a)&&token(c.b)&&token(c.speciesId);
 if(c.type==='resonance')return keys(c,['type','resonanceId','targetId'])&&token(c.resonanceId,384)&&token(c.targetId);
 if(c.type==='action'){
  if(c.kind==='guard')return keys(c,['type','kind']);
  if(c.kind==='switch')return keys(c,['type','kind','reserveId'])&&token(c.reserveId);
  return ['attack','skill1','skill2','awaken'].includes(c.kind)&&keys(c,['type','kind','targetId'])&&token(c.targetId);
 }
 return false;
}
function validTransaction(tx,revision){
 if(!safe(tx)||!keys(tx,['version','kind','receiptId','commands','generatedIds'])||![1,2,3].includes(tx.version)||tx.kind!=='runtime'||!token(tx.receiptId,100)||!tx.receiptId.startsWith(`write-${revision+1}-`)||!token(tx.receiptId.slice(`write-${revision+1}-`.length),80))return false;
 if(!Array.isArray(tx.commands)||!tx.commands.length||tx.commands.length>128||!tx.commands.every(command)||tx.commands.length>1&&!tx.commands.every(c=>c.type==='move'))return false;
 return Array.isArray(tx.generatedIds)&&tx.generatedIds.length<=3&&new Set(tx.generatedIds).size===tx.generatedIds.length&&tx.generatedIds.every(id=>token(id,80));
}
export function projectExpeditionRuntimeTransaction(previous,{owner,transaction}={}){
 const a=decodeExpeditionAccount(previous,{owner});if(!a)return fail('invalid previous account');
 if(!validTransaction(transaction,a.revision))return fail('invalid runtime transaction');
 let state=a.state,index=0;const events=[];
 const idFactory=()=>{if(index>=transaction.generatedIds.length)throw Error('missing generated identity');return transaction.generatedIds[index++];};
 for(const intent of transaction.commands){
  const result=projectExpeditionRuntime(state,intent,{idFactory,combatRelics:transaction.version>=2,combatVersion:transaction.version>=3?2:1});if(!result.ok)return fail(result.reason);
  state=result.state;events.push(...result.events);
 }
 if(index!==transaction.generatedIds.length)return fail('unused generated identity');
 return {ok:true,state,events,transaction:JSON.parse(JSON.stringify(transaction)),proof:'exact-shared-runtime-projection'};
}
export async function auditExpeditionRuntimeTransaction(previous,candidate,{owner,transaction}={}){
 try{
  const a=decodeExpeditionAccount(previous,{owner}),b=decodeExpeditionAccount(candidate,{owner});if(!a||!b)return fail('invalid account');
  if(!validTransaction(transaction,a.revision)||transaction.receiptId!==b.writeId)return fail('runtime receipt mismatch');
  const parent=await expeditionAccountParent(a,{owner});if(!same(parent,b.parent)||b.createdAt!==a.createdAt||b.updatedAt<a.updatedAt)return fail('parent conflict');
  const expected=projectExpeditionRuntimeTransaction(a,{owner,transaction});if(!expected.ok)return expected;
  if(!same(expected.state,b.state))return fail('runtime result mismatch');
  return {ok:true,record:b,transaction:expected.transaction,events:expected.events,proof:expected.proof};
 }catch{return fail('invalid runtime transaction');}
}
export async function nextExpeditionRuntimeAccount(previous,{owner,transaction,now,writer}={}){
 const a=decodeExpeditionAccount(previous,{owner}),projected=projectExpeditionRuntimeTransaction(previous,{owner,transaction});if(!a||!projected.ok)return projected;
 const candidate={...a,writeId:transaction.receiptId,revision:a.revision+1,parent:await expeditionAccountParent(a,{owner}),updatedAt:now,writer,state:projected.state};
 const encoded=encodeExpeditionAccount(candidate,{owner});if(!encoded.ok)return encoded;
 if(!Number.isSafeInteger(now)||now<a.updatedAt||!writer||writer.issuedAt>now||writer.expiresAt<=now)return fail('invalid runtime writer/time');
 const audit=await auditExpeditionRuntimeTransaction(a,encoded.raw,{owner,transaction});return audit.ok?{...encoded,transaction:audit.transaction,events:audit.events}:audit;
}
