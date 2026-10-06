// A compact local command journal, not a cloud checkpoint or write authority.
// Recovery must still match an authenticated base or audited local receipt.
const keys=(v,names)=>v&&Object.getPrototypeOf(v)===Object.prototype&&Object.keys(v).length===names.length&&names.every(k=>Object.hasOwn(v,k));
const token=v=>typeof v==='string'&&/^[A-Za-z0-9_.:-]{1,128}$/.test(v)&&!['guest','__proto__','constructor','prototype'].includes(v);
export const expeditionMovementJournalKey=owner=>`seed-expedition-account-v1:${encodeURIComponent(owner)}:movement-v1`;
export function validExpeditionMovementJournal(value,owner){
 const b=value?.base;
 return keys(value,['kind','version','ownerUid','base','moves'])&&value.kind==='seed-expedition-movement'&&value.version===1&&value.ownerUid===owner&&token(owner)&&keys(b,['ownerUid','campaignId','writeId','revision','checkpointHash'])&&b.ownerUid===owner&&token(b.campaignId)&&token(b.writeId)&&Number.isSafeInteger(b.revision)&&b.revision>=0&&typeof b.checkpointHash==='string'&&/^[a-f0-9]{64}$/.test(b.checkpointHash)&&Array.isArray(value.moves)&&value.moves.length<=256&&value.moves.every(c=>keys(c,['type','dx','dt'])&&c.type==='move'&&Number.isFinite(c.dx)&&Math.abs(c.dx)<=1&&!Object.is(c.dx,-0)&&Number.isFinite(c.dt)&&c.dt>0&&c.dt<=.1);
}
export function createExpeditionMovementJournal({storage,owner,allowed}={}){
 const key=expeditionMovementJournalKey(owner);
 function read(){
  try{const raw=storage.getItem(key);if(raw===null)return {ok:true,raw:null,value:null};if(typeof raw!=='string'||raw.length>20000)return {ok:false,reason:'invalid movement journal'};const value=JSON.parse(raw);return JSON.stringify(value)===raw&&validExpeditionMovementJournal(value,owner)?{ok:true,raw,value}:{ok:false,reason:'invalid movement journal'};}catch{return {ok:false,reason:'movement storage'};}
 }
 function write(value,expectedRaw){
  try{
   if(!allowed()||!validExpeditionMovementJournal(value,owner))return {ok:false,reason:'movement authority'};
   const original=read();if(!original.ok)return original;if(original.raw!==expectedRaw)return {ok:false,reason:'movement conflict'};
   const raw=JSON.stringify(value);if(raw.length>20000)return {ok:false,reason:'movement limit'};
   storage.setItem(key,raw);if(storage.getItem(key)!==raw)return {ok:false,reason:'movement readback'};
   return {ok:true,raw,value};
  }catch{return {ok:false,reason:'movement storage'};}
 }
 return Object.freeze({key,read,write});
}
