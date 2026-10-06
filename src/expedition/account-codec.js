import {createRoster,recruitInstance,setParty,normalizeRoster} from './roster.js';
import {LAW_DNA,expeditionStats} from './species.js';
import {restoreExpeditionCombat} from './combat.js';
import {EXPEDITION_GARDENS,EXPEDITION_RUN_STEPS,expeditionEncounter} from './world.js';
import {emptyExpeditionNursery,EXPEDITION_NURSERY_KEYS,validExpeditionNursery,validExpeditionFind} from './nursery.js';

// Isolated structural codec. No local storage, review decoder, auth, network,
// release gate, server lease authority, balance merge or automatic migration.
export const EXPEDITION_ACCOUNT_KIND='seed-expedition-account';
export const EXPEDITION_ACCOUNT_PROTOCOL='seed-expedition-account-v1';
export const EXPEDITION_ACCOUNT_VERSION=1;
export const EXPEDITION_ACCOUNT_MAX_BYTES=4000000;
export const EXPEDITION_ACCOUNT_MAX_LEASE_MS=120000;
const own=(v,k)=>Object.hasOwn(v,k),copy=v=>JSON.parse(JSON.stringify(v));
const token=(v,max=128)=>typeof v==='string'&&v.length<=max&&/^[A-Za-z0-9_.:-]+$/.test(v)&&!['__proto__','constructor','prototype'].includes(v);
const ownerOK=v=>token(v)&&v!=='guest';
const int=(v,max=1000000000)=>Number.isSafeInteger(v)&&v>=0&&v<=max;
const timestamp=v=>int(v,8640000000000000)&&v>0;
const writeIdentity=(id,revision)=>typeof id==='string'&&id.startsWith(`write-${revision}-`)&&token(id.slice(`write-${revision}-`.length),80);
const plain=v=>v&&typeof v==='object'&&!Array.isArray(v)&&Object.getPrototypeOf(v)===Object.prototype;
const keys=(v,list)=>plain(v)&&Object.keys(v).length===list.length&&list.every(k=>own(v,k));
const tokens=(v,max=1000,predicate=token)=>Array.isArray(v)&&v.length<=max&&new Set(v).size===v.length&&v.every(x=>predicate(x));
const baseKeys=['cores','awakenMaterials','highRisk','returnCount','bossWins','committedRuns'];
const accountKeys=['kind','version','protocol','ownerUid','channel','campaignId','writeId','revision','createdAt','updatedAt','parent','writer','state'];
const stateKeys=['screen','roster','route','battle','meta','lastResult'];
const encounters=EXPEDITION_RUN_STEPS.flatMap((s,n)=>['normal1','normal2','elite','boss'].includes(s)?[n]:[]);
function jsonSafe(v,depth=0){
 if(depth>64)return false;
 if(v===null||typeof v==='string'||typeof v==='boolean')return true;
 if(typeof v==='number')return Number.isFinite(v)&&!Object.is(v,-0);
 if(!v||typeof v!=='object'||Object.getOwnPropertySymbols(v).length)return false;
 if(Array.isArray(v)){if(Object.getPrototypeOf(v)!==Array.prototype||Object.keys(v).length!==v.length||Object.getOwnPropertyNames(v).length!==v.length+1||Object.keys(v).some((k,n)=>k!==String(n)))return false;}
 else if(!plain(v)||Object.getOwnPropertyNames(v).length!==Object.keys(v).length)return false;
 for(const k of Object.keys(v)){if(['__proto__','constructor','prototype'].includes(k))return false;const d=Object.getOwnPropertyDescriptor(v,k);if(!d||!own(d,'value')||!jsonSafe(d.value,depth+1))return false;}
 return true;
}
const size=v=>new TextEncoder().encode(typeof v==='string'?v:JSON.stringify(v)).byteLength;
function uniqueJSONKeys(raw){
 const stack=[];
 for(let i=0;i<raw.length;i++){
  const c=raw[i];if(c==='{'||c==='['){stack.push(c==='{'?new Set():null);if(stack.length>64)return false;}
  else if(c==='}'||c===']')stack.pop();
  else if(c==='"'){
   const start=i;for(i++;i<raw.length;i++){if(raw[i]==='\\')i++;else if(raw[i]==='"')break;}
   let next=i+1;while(/\s/.test(raw[next]??'')&&next<raw.length)next++;
   if(raw[next]===':'&&stack.at(-1) instanceof Set){const key=JSON.parse(raw.slice(start,i+1)),used=stack.at(-1);if(used.has(key))return false;used.add(key);}
  }
 }
 return true;
}
function validWriter(w){return keys(w,['deviceId','leaseId','issuedAt','expiresAt'])&&token(w.deviceId)&&token(w.leaseId)&&timestamp(w.issuedAt)&&timestamp(w.expiresAt)&&w.expiresAt>w.issuedAt&&w.expiresAt-w.issuedAt<=EXPEDITION_ACCOUNT_MAX_LEASE_MS;}
function validParent(p,s){return keys(p,['ownerUid','campaignId','writeId','revision','checkpointHash'])&&p.ownerUid===s.ownerUid&&p.campaignId===s.campaignId&&writeIdentity(p.writeId,p.revision)&&p.writeId!==s.writeId&&int(p.revision)&&p.revision+1===s.revision&&typeof p.checkpointHash==='string'&&/^[a-f0-9]{64}$/.test(p.checkpointHash);}
function validState(s,owner){
 if(!keys(s,stateKeys)||!['home','explore','battle','result'].includes(s.screen))return false;
 const roster=normalizeRoster(s.roster,{owner,channel:'account'});if(!roster)return false;
 const m=s.meta;
 if(!keys(m,[...baseKeys,...EXPEDITION_NURSERY_KEYS])||!keys(m.cores,Object.keys(LAW_DNA))||Object.values(m.cores).some(v=>!int(v,10000))||!int(m.awakenMaterials,10000)||!int(m.returnCount,10000)||!int(m.bossWins,10000)||m.bossWins>m.returnCount||!tokens(m.committedRuns)||m.committedRuns.length!==m.returnCount||!tokens(m.highRisk,256,v=>{const at=typeof v==='string'?v.lastIndexOf(':'):-1;return at>0&&token(v.slice(0,at))&&own(roster.instances,v.slice(0,at))&&own(LAW_DNA,v.slice(at+1));})||!validExpeditionNursery(m))return false;
 const r=s.route;
 if(r!==null){
  if(!keys(r,['version','runId','gardenId','difficulty','partyIds','step','position','status','pendingLoot','pendingFinds','completedBattles','restUsed','elapsedSeconds'])||r.version!==1||!token(r.runId,100)||!own(EXPEDITION_GARDENS,r.gardenId)||!int(r.difficulty,5)||r.difficulty<1||!int(r.step,EXPEDITION_RUN_STEPS.length-1)||!Number.isFinite(r.position)||r.position<0||r.position>18||!Number.isFinite(r.elapsedSeconds)||r.elapsedSeconds<0||r.elapsedSeconds>86400||typeof r.restUsed!=='boolean'||!['exploring','battle','returned','wiped','limit'].includes(r.status)||!Array.isArray(r.partyIds)||r.partyIds.length!==8||r.partyIds.some(v=>v!==null&&(!token(v)||!own(roster.instances,v)))||new Set(r.partyIds.filter(Boolean)).size!==r.partyIds.filter(Boolean).length||!r.partyIds.some(Boolean))return false;
  const allowed=encounters.filter(n=>n<=r.step).map(n=>`${r.runId}:b${n}`);
  if(!tokens(r.completedBattles,4,v=>allowed.includes(v))||!Array.isArray(r.pendingLoot)||r.pendingLoot.length>20||r.pendingLoot.some(l=>!keys(l,['lawId','amount','material'])||!own(LAW_DNA,l.lawId)||!int(l.amount,10)||l.amount<1||!int(l.material,3)))return false;
  if(!Array.isArray(r.pendingFinds)||r.pendingFinds.length>1||r.pendingFinds.some(f=>!validExpeditionFind(f,r.runId)||f.gardenId!==r.gardenId))return false;
  if(['returned','wiped','limit'].includes(r.status)&&(r.pendingLoot.length||r.pendingFinds.length))return false;
  if(['exploring','battle'].includes(r.status)&&m.committedRuns.includes(r.runId)||r.status==='returned'&&!m.committedRuns.includes(r.runId)||['wiped','limit'].includes(r.status)&&m.committedRuns.includes(r.runId))return false;
 }
 let battle=null;
 if(s.battle!==null){
  try{battle=restoreExpeditionCombat(s.battle);}catch{return false;}
  if(s.screen!=='battle'||!r||r.status!=='battle'||!encounters.includes(r.step)||battle.phase!=='fight'||battle.battleId!==`${r.runId}:b${r.step}`||r.completedBattles.includes(battle.battleId))return false;
  const allies=battle.units.filter(u=>u.side==='ally');
  if(allies.some(u=>{const i=roster.instances[u.instanceId],stats=i?expeditionStats(i.speciesId,i.level):null;return !i||!stats||!r.partyIds.includes(i.instanceId)||u.id!==i.instanceId||u.speciesId!==i.speciesId||u.maxHp!==i.maxHp||u.level!==i.level||u.power!==stats.power||u.defense!==stats.defense||u.speed!==stats.speed||Math.abs(u.hp-i.hp)>.000001||u.dead!==(i.status==='dead');}))return false;
  const step=EXPEDITION_RUN_STEPS[r.step],expected=expeditionEncounter(r.gardenId,{difficulty:r.difficulty,kind:step==='boss'?'boss':step==='elite'?'elite':'normal',battleId:battle.battleId}),enemies=battle.units.filter(u=>u.side==='enemy');
  if(enemies.length!==expected.length||enemies.some(u=>{const e=expected.find(v=>v.id===u.id);return !e||u.instanceId!==u.id||['speciesId','maxHp','power','defense','speed','level','boss'].some(k=>u[k]!==e[k]);}))return false;
  for(let slot=0;slot<8;slot++)if(roster.party[slot]!== (allies.find(u=>u.slot===slot&&!u.dead)?.instanceId??null))return false;
 }
 const result=s.lastResult;
 if(result!==null&&(!keys(result,['kind','gardenId','difficulty','survivors','lost','loot','boss'])||!['return','wipe','limit'].includes(result.kind)||!own(EXPEDITION_GARDENS,result.gardenId)||!int(result.difficulty,5)||result.difficulty<1||!int(result.survivors,8)||!int(result.lost,8)||!int(result.loot,100)||typeof result.boss!=='boolean'))return false;
 if(s.screen==='home')return r===null&&battle===null;
 if(s.screen==='explore')return r?.status==='exploring'&&battle===null&&result===null;
 if(s.screen==='battle')return !!battle&&result===null;
 if(!r||!result||battle||r.status!==({return:'returned',wipe:'wiped',limit:'limit'}[result.kind])||result.gardenId!==r.gardenId||result.difficulty!==r.difficulty)return false;
 const living=r.partyIds.filter(id=>roster.instances[id]?.status==='alive').length,total=r.partyIds.filter(Boolean).length;
 return result.survivors===living&&result.lost===total-living&&result.boss===r.completedBattles.includes(`${r.runId}:b${EXPEDITION_RUN_STEPS.indexOf('boss')}`)&&(result.kind==='return'||result.loot===0)&&!(result.kind==='wipe'&&living);
}
function pristine(s){
 const {roster:r,meta:m}=s.state,list=Object.values(r.instances),laws=['orbit','reflect','pierce','split','frost','burst','gravity','recall','chain'];
 return s.createdAt===s.updatedAt&&s.state.screen==='home'&&s.state.lastResult===null&&r.revision===10&&list.length===9&&new Set(list.map(i=>i.speciesId)).size===9&&laws.every(l=>list.some(i=>i.speciesId===l))&&list.every(i=>i.instanceId.startsWith('seed-')&&i.speciesId===i.originSpeciesId&&i.xp===0&&i.hp===i.maxHp&&i.status==='alive'&&!Object.keys(i.events).length&&!i.nickname)&&r.party.slice(0,8).every(Boolean)&&!r.party.includes(list.find(i=>i.speciesId==='chain').instanceId)&&!Object.keys(r.tombstones).length&&!r.story.length&&!r.recipes.length&&Object.keys(m.cores).every(l=>m.cores[l]===0)&&m.awakenMaterials===0&&!m.highRisk.length&&m.returnCount===0&&m.bossWins===0&&!m.committedRuns.length&&JSON.stringify(canonical(Object.fromEntries(EXPEDITION_NURSERY_KEYS.map(k=>[k,m[k]]))))===JSON.stringify(canonical(emptyExpeditionNursery()));
}
export function decodeExpeditionAccount(raw,{owner}={}){
 try{
  if(!ownerOK(owner)||typeof raw==='string'&&(size(raw)>=EXPEDITION_ACCOUNT_MAX_BYTES||!uniqueJSONKeys(raw)))return null;
  const s=typeof raw==='string'?JSON.parse(raw):raw;
  if(!jsonSafe(s)||size(s)>=EXPEDITION_ACCOUNT_MAX_BYTES||!keys(s,accountKeys)||s.kind!==EXPEDITION_ACCOUNT_KIND||s.version!==1||s.protocol!==EXPEDITION_ACCOUNT_PROTOCOL||s.channel!=='account'||s.ownerUid!==owner||!token(s.campaignId,100)||!token(s.writeId,100)||!writeIdentity(s.writeId,s.revision)||s.campaignId===s.writeId||!int(s.revision)||!timestamp(s.createdAt)||!timestamp(s.updatedAt)||s.updatedAt<s.createdAt||!validWriter(s.writer)||s.writer.issuedAt>s.updatedAt||!(s.revision===0?s.parent===null:validParent(s.parent,s))||!validState(s.state,owner)||s.revision===0&&!pristine(s))return null;
  return copy(s);
 }catch{return null;}
}
export function encodeExpeditionAccount(candidate,{owner}={}){
 const record=decodeExpeditionAccount(candidate,{owner});return record?{ok:true,raw:JSON.stringify(record),record}:{ok:false,reason:'invalid account or byte budget'};
}
const uuid=()=>{if(!globalThis.crypto?.randomUUID)throw Error('Secure identity unavailable');return globalThis.crypto.randomUUID();};
export function createFreshExpeditionAccount(options={}){
 if(!keys(options,['owner','now','writer','idFactory'])&&!keys(options,['owner','now','writer']))throw TypeError('Fresh account factory accepts no imported state');
 const {owner,now,writer,idFactory=uuid}=options;if(!ownerOK(owner)||!timestamp(now)||!validWriter(writer)||writer.issuedAt>now||writer.expiresAt<=now||typeof idFactory!=='function')throw TypeError('Invalid fresh account identity/time');
 const used=new Set(),fresh=prefix=>{const suffix=idFactory();if(!token(suffix,80))throw TypeError('Invalid generated identity');const id=`${prefix}-${suffix}`;if(used.has(suffix)||used.has(id))throw TypeError('Repeated generated identity');used.add(suffix);used.add(id);return id;};
 const campaignId=fresh('campaign'),writeId=fresh('write-0'),roster=createRoster({owner,channel:'account'});
 for(const law of ['orbit','reflect','pierce','split','frost','burst','gravity','recall','chain'])if(!recruitInstance(roster,{instanceId:fresh('seed'),speciesId:law}))throw Error('Fresh birth failed');
 if(!setParty(roster,Object.keys(roster.instances).slice(0,8)))throw Error('Fresh party failed');
 const record={kind:EXPEDITION_ACCOUNT_KIND,version:1,protocol:EXPEDITION_ACCOUNT_PROTOCOL,ownerUid:owner,channel:'account',campaignId,writeId,revision:0,createdAt:now,updatedAt:now,parent:null,writer:copy(writer),state:{screen:'home',roster,route:null,battle:null,lastResult:null,meta:{cores:Object.fromEntries(Object.keys(LAW_DNA).map(k=>[k,0])),awakenMaterials:0,highRisk:[],returnCount:0,bossWins:0,committedRuns:[],...emptyExpeditionNursery()}}};
 const valid=decodeExpeditionAccount(record,{owner});if(!valid)throw Error('Fresh account validation failed');return valid;
}
function canonical(v){return Array.isArray(v)?v.map(canonical):plain(v)?Object.fromEntries(Object.keys(v).sort().map(k=>[k,canonical(v[k])])):v;}
export async function expeditionAccountParent(previous,{owner}={}){
 const p=decodeExpeditionAccount(previous,{owner});if(!p||!globalThis.crypto?.subtle)throw TypeError('Invalid account parent or SHA256 unavailable');
 const digest=await globalThis.crypto.subtle.digest('SHA-256',new TextEncoder().encode(JSON.stringify(canonical(p))));
 return {ownerUid:owner,campaignId:p.campaignId,writeId:p.writeId,revision:p.revision,checkpointHash:Array.from(new Uint8Array(digest),b=>b.toString(16).padStart(2,'0')).join('')};
}
export async function validateExpeditionAccountTransition(previous,candidate,{owner}={}){
 const a=decodeExpeditionAccount(previous,{owner}),b=decodeExpeditionAccount(candidate,{owner});if(!a||!b)return {ok:false,reason:'invalid account'};
 const expected=await expeditionAccountParent(a,{owner});
 if(JSON.stringify(canonical(b.parent))!==JSON.stringify(canonical(expected))||b.createdAt!==a.createdAt||b.updatedAt<a.updatedAt)return {ok:false,reason:'parent conflict'};
 const x=a.state.roster,y=b.state.roster;
 for(const [id,i]of Object.entries(x.instances)){
  const next=y.instances[id];if(!next||next.originSpeciesId!==i.originSpeciesId||next.nickname!==i.nickname)return {ok:false,reason:'identity rewind'};
  if(x.tombstones[id]&&JSON.stringify(canonical(x.tombstones[id]))!==JSON.stringify(canonical(y.tombstones[id])))return {ok:false,reason:'death rewind'};
  for(const [key,event]of Object.entries(i.events))if(JSON.stringify(canonical(event))!==JSON.stringify(canonical(next.events[key])))return {ok:false,reason:'receipt rewind'};
 }
 const m=a.state.meta,n=b.state.meta;
 // There is no cloud transaction ledger yet. A structural codec must not
 // pretend max/union of balances, hatch births or return rewards is authority.
 if(JSON.stringify(canonical(m))!==JSON.stringify(canonical(n)))return {ok:false,reason:'economy ledger required'};
 if(Object.keys(y.instances).some(id=>!own(x.instances,id)))return {ok:false,reason:'birth ledger required'};
 for(const key of ['discoveries','recipes','story'])if(x[key].some(id=>!y[key].includes(id)))return {ok:false,reason:'history rewind'};
 for(const key of ['committedRuns','highRisk','rewardIds','growthReceipts','resowIds','relics'])if(m[key].some(id=>!n[key].includes(id)))return {ok:false,reason:'result rewind'};
 if(n.returnCount<m.returnCount||n.bossWins<m.bossWins||Object.keys(m.restoration).some(k=>n.restoration[k]<m.restoration[k]))return {ok:false,reason:'result rewind'};
 for(const egg of m.eggs)if(!n.eggs.some(e=>JSON.stringify(canonical(e))===JSON.stringify(canonical(egg)))&&!n.rewardIds.includes(`hatch:${egg.eggId}`))return {ok:false,reason:'egg rewind'};
 return {ok:true,record:b,proof:'structural-history-only'};
}
export async function nextExpeditionAccount(previous,options={}){
 if(!keys(options,['owner','state','now','writer','idFactory'])&&!keys(options,['owner','state','now','writer']))return {ok:false,reason:'invalid next options'};
 const {owner,state,now,writer,idFactory=uuid}=options,a=decodeExpeditionAccount(previous,{owner});if(!a||!timestamp(now)||now<a.updatedAt||!validWriter(writer)||writer.issuedAt>now||writer.expiresAt<=now||typeof idFactory!=='function')return {ok:false,reason:'invalid next scope'};
 const suffix=idFactory();if(!token(suffix,80))return {ok:false,reason:'invalid write identity'};
 const candidate={...a,writeId:`write-${a.revision+1}-${suffix}`,revision:a.revision+1,updatedAt:now,parent:await expeditionAccountParent(a,{owner}),writer:copy(writer),state};
 const valid=await validateExpeditionAccountTransition(a,candidate,{owner});return valid.ok?encodeExpeditionAccount(valid.record,{owner}):valid;
}
