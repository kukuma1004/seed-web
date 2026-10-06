import {getExpeditionSpecies, expeditionStats, XP_THRESHOLDS} from './species.js';
import {validateExpeditionName} from './names.js';

export const ROSTER_VERSION = 1;
export const ROSTER_KIND = 'seed-expedition-roster';
export const PARTY_SIZE = 8;
export const ACTIVE_SIZE = 5;
const LIMIT = 256, EVENT_LIMIT = 8192;
const channels = new Set(['account','guest','review']);
const own = (o,k) => Object.prototype.hasOwnProperty.call(o,k);
const plain = o => !!o && typeof o==='object' && !Array.isArray(o) && [Object.prototype,null].includes(Object.getPrototypeOf(o));
const token = s => typeof s==='string' && /^[A-Za-z0-9_.:-]{1,128}$/.test(s) && !['__proto__','constructor','prototype'].includes(s);
// Derived receipts encode both complete immutable IDs with lengths. Colons are
// legal inside IDs, so raw delimiter concatenation must not identify a pair.
const derivedReceipt=(kind,a,b)=>`${kind}:${a.length}:${a}:${b.length}:${b}`;
function receiptParts(value){
  if(typeof value!=='string'||value.length>275)return null;
  const prefix=/^(xp|survival|heal:(?:rest|camp)):(\d{1,3}):/.exec(value);if(!prefix)return null;
  const n=Number(prefix[2]),at=prefix[0].length,a=value.slice(at,at+n);
  const suffix=/^:(\d{1,3}):/.exec(value.slice(at+n));if(!suffix)return null;
  const b=value.slice(at+n+suffix[0].length);
  return token(a)&&token(b)&&b.length===Number(suffix[1])&&value===derivedReceipt(prefix[1],a,b)?{kind:prefix[1].startsWith('heal:')?'heal':prefix[1],...(prefix[1].startsWith('heal:')?{phase:prefix[1].slice(5)}:{}),a,b}:null;
}
export function expeditionHealReceipt(runId,instanceId,phase){
  if(!token(runId)||!token(instanceId)||!['rest','camp'].includes(phase))throw new TypeError('Invalid expedition heal receipt identity/phase');
  return derivedReceipt(`heal:${phase}`,runId,instanceId);
}
const receiptToken=value=>token(value)||receiptParts(value)!==null;
const text = s => typeof s==='string' && s.length<=160;
const integer = (n,max=1000000) => Number.isSafeInteger(n) && n>=0 && n<=max;
const amountOK = n => Number.isFinite(n)&&n>0&&n<=10000;
const hpRound=n=>Math.round(n*1000000)/1000000;
const copy = o => JSON.parse(JSON.stringify(o));
const same = (a,b) => JSON.stringify(a)===JSON.stringify(b);
const keys = (o,allowed) => plain(o) && Object.keys(o).every(k=>allowed.includes(k));
export const instanceLevel = xp => XP_THRESHOLDS.reduce((lv,n,i)=>xp>=n?i+1:lv,1);
export function createRoster({owner,channel='account'}={}) {
  if(!token(owner)||!channels.has(channel)) throw new TypeError('Invalid expedition roster owner/channel');
  return {kind:ROSTER_KIND,version:1,owner,channel,revision:0,instances:{},party:Array(8).fill(null),discoveries:[],recipes:[],story:[],tombstones:{}};
}
function derive(i,tombstone=null) {
  let xp=0,damage=0,healing=0,survivals=0,bossSurvivals=0; const evolution=[];
  for(const e of Object.values(i.events)) {
    if(e.kind==='xp') xp+=e.amount;
    if(e.kind==='damage') damage+=e.amount;
    if(e.kind==='heal') healing+=e.amount;
    if(e.kind==='survival'){survivals++;if(e.boss)bossSurvivals++;}
    if(e.kind==='evolution') evolution.push(e);
  }
  evolution.sort((a,b)=>a.stage-b.stage);
  const speciesId=evolution.at(-1)?.speciesId??i.originSpeciesId;
  const level=instanceLevel(xp),maxHp=expeditionStats(speciesId,level)?.hp;
  return {xp,level,maxHp,hp:tombstone?0:hpRound(Math.max(0,Math.min(maxHp,maxHp-damage+healing))),speciesId,survivals,bossSurvivals,status:tombstone?'dead':'alive',deathRecord:tombstone?copy(tombstone):null};
}
function refresh(r,id){Object.assign(r.instances[id],derive(r.instances[id],r.tombstones[id]??null));}
function event(r,id,receiptId,e) {
  const i=r.instances[id]; if(!i||i.status!=='alive'||!receiptToken(receiptId))return false;
  const derived=receiptParts(receiptId);if(receiptId.length>128&&derived&&(derived.b!==id||derived.kind!==e.kind||derived.kind==='survival'&&derived.a!==e.expeditionId))return false;
  // Receipts are globally unique, even when a caller attempts to reuse one for another individual.
  for(const j of Object.values(r.instances))if(own(j.events,receiptId))return false;
  if(Object.values(r.instances).reduce((n,j)=>n+Object.keys(j.events).length,0)>=EVENT_LIMIT)return false;
  if(e.kind==='xp'&&i.xp+e.amount>1000000)return false;
  i.events[receiptId]=e;refresh(r,id);r.revision++;return true;
}
export function recruitInstance(r,{instanceId,speciesId,nickname='',maxHp=expeditionStats(speciesId,1)?.hp}={}) {
  const s=getExpeditionSpecies(speciesId);
  if(!token(instanceId)||!s||s.kind==='twin'||!text(nickname)||maxHp!==expeditionStats(speciesId,1).hp||own(r.instances,instanceId)||own(r.tombstones,instanceId)||Object.keys(r.instances).length>=LIMIT)return false;
  r.instances[instanceId]={instanceId,originSpeciesId:speciesId,speciesId,nickname,maxHp,hp:maxHp,xp:0,level:1,survivals:0,bossSurvivals:0,status:'alive',deathRecord:null,events:{}};
  if(!r.discoveries.includes(speciesId))r.discoveries.push(speciesId);
  r.discoveries.sort();r.revision++;return true;
}
export function setParty(r,slots) {
  if(!Array.isArray(slots)||slots.length!==8)return false;
  const used=new Set();for(const id of slots){if(id===null)continue;if(!token(id)||used.has(id)||r.instances[id]?.status!=='alive')return false;used.add(id);}
  r.party=slots.slice();r.revision++;return true;
}
// A personal name belongs to this individual, not its shared species. Death
// records keep the name at the time of loss; they can never be renamed.
export function renameInstance(r,id,value) {
 const i=r.instances[id],checked=validateExpeditionName(value);
 if(!i||i.status!=='alive'||r.tombstones[id]||!checked.ok)return false;
 if(i.nickname!==checked.name){i.nickname=checked.name;r.revision++;}
 return true;
}
export function grantInstanceXP(r,id,amount,receiptId){return integer(amount,10000)&&amount>0&&event(r,id,receiptId,{kind:'xp',amount});}
export function awardExpeditionXP(r,{receiptId,activeIds=[],reserveIds=[],kind='normal'}={}) {
  const amount={normal:10,elite:18,boss:30,return:15}[kind];
  if(!token(receiptId)||!amount||!Array.isArray(activeIds)||!Array.isArray(reserveIds)||activeIds.length>5||reserveIds.length>3)return false;
  const ids=[...activeIds,...reserveIds];if(new Set(ids).size!==ids.length||ids.some(id=>r.instances[id]?.status!=='alive'))return false;
  if(ids.some(id=>!token(id)||r.instances[id].xp+amount>1000000)||Object.values(r.instances).reduce((n,i)=>n+Object.keys(i.events).length,0)+ids.length>EVENT_LIMIT)return false;
  // Atomic award: an already applied member prevents a partial replay with an altered party.
  if(Object.values(r.instances).some(i=>Object.keys(i.events).some(k=>k.startsWith(`${receiptId}:xp:`)||(receiptParts(k)?.kind==='xp'&&receiptParts(k).a===receiptId))))return false;
  let changed=false;for(const id of activeIds)changed=grantInstanceXP(r,id,amount,derivedReceipt('xp',receiptId,id))||changed;
  for(const id of reserveIds)changed=grantInstanceXP(r,id,Math.floor(amount*.4),derivedReceipt('xp',receiptId,id))||changed;
  return changed;
}
function deathRecord(i,receiptId,place) {
  return {instanceId:i.instanceId,receiptId,speciesId:i.speciesId,name:i.nickname||getExpeditionSpecies(i.speciesId).name,level:i.level,survivals:i.survivals,bossSurvivals:i.bossSurvivals,place};
}
export function markInstanceDead(r,id,{receiptId,place='알 수 없는 장소'}={}) {
  const i=r.instances[id];if(!i||i.status!=='alive'||!token(receiptId)||!text(place)||own(r.tombstones,id))return false;
  const record=deathRecord(i,receiptId,place);
  if(!event(r,id,receiptId,{kind:'death',record}))return false;
  r.tombstones[id]=record;refresh(r,id);r.party=r.party.map(v=>v===id?null:v);return true;
}
export function damageInstance(r,id,amount,{receiptId,place='알 수 없는 장소'}={}) {
  const i=r.instances[id];if(!i||i.status!=='alive'||!amountOK(amount)||!token(receiptId)||!text(place))return false;
  amount=hpRound(amount);if(amount===0)return false;
  const record=amount>=i.hp?deathRecord(i,receiptId,place):null;
  if(!event(r,id,receiptId,{kind:'damage',amount,...(record?{record}:{})}))return false;
  if(record){r.tombstones[id]=record;refresh(r,id);r.party=r.party.map(v=>v===id?null:v);}return true;
}
export function healInstance(r,id,amount,receiptId) {
  const i=r.instances[id];if(!i||i.status!=='alive'||!amountOK(amount)||!receiptToken(receiptId))return false;
  // New receipts and legacy rest/camp strings represent the same single heal.
  // Do not rewrite either stored format or grant it again after imported reload.
  const parts=receiptParts(receiptId);
  if(parts?.kind==='heal'&&(parts.b!==id||own(i.events,`${parts.a}:${parts.phase}:${parts.b}`)))return false;
  for(const previous of Object.keys(i.events)){const old=receiptParts(previous);if(old?.kind==='heal'&&`${old.a}:${old.phase}:${old.b}`===receiptId)return false;}
  amount=hpRound(amount);if(amount===0)return false;
  const actual=Math.min(amount,i.maxHp-i.hp);return actual>0&&event(r,id,receiptId,{kind:'heal',amount:actual});
}
export function recordSurvival(r,id,{expeditionId,boss=false}={}) {
  if(!token(expeditionId)||typeof boss!=='boolean')return false;
  const i=r.instances[id];if(!token(id)||!i||Object.values(i.events).some(e=>e.kind==='survival'&&e.expeditionId===expeditionId))return false;
  return event(r,id,derivedReceipt('survival',expeditionId,id),{kind:'survival',expeditionId,boss});
}
export function evolveInstance(r,id,speciesId,{receiptId,home=false,validateEvolution}={}) {
  const i=r.instances[id],from=getExpeditionSpecies(i?.speciesId),to=getExpeditionSpecies(speciesId);
  if(!i||i.status!=='alive'||!home||!to||!from||typeof validateEvolution!=='function')return false;
  const initial=from.kind==='base'&&['solo','fusion'].includes(to.kind)&&i.level>=5;
  const final=from.kind==='fusion'&&to.kind==='final'&&i.level>=8;
  if(!(initial||final)||!to.parents.includes(from.id))return false;
  const stage=initial?1:2;if(Object.values(i.events).some(e=>e.kind==='evolution'&&e.stage===stage))return false;
  // P6 owns material/high-risk/home authorization; do not expose a bare evolution bypass.
  if(validateEvolution({instance:copy(i),from,to,stage,home:true})!==true)return false;
  if(!event(r,id,receiptId,{kind:'evolution',speciesId,stage,xpAtEvolution:i.xp}))return false;
  if(!r.discoveries.includes(speciesId))r.discoveries.push(speciesId);
  if(!r.recipes.includes(speciesId))r.recipes.push(speciesId);r.discoveries.sort();r.recipes.sort();return true;
}
export function unlockTwin(r,a,b,speciesId) {
  const i=r.instances[a],j=r.instances[b],s=getExpeditionSpecies(speciesId);
  if(!i||!j||a===b||i.status!=='alive'||j.status!=='alive'||i.level<8||j.level<8||getExpeditionSpecies(i.speciesId)?.kind!=='solo'||getExpeditionSpecies(j.speciesId)?.kind!=='solo'||i.speciesId===j.speciesId||s?.kind!=='twin'||!s.parents.includes(i.speciesId)||!s.parents.includes(j.speciesId))return false;
  const aa=Object.values(i.events).filter(e=>e.kind==='survival'),bb=Object.values(j.events).filter(e=>e.kind==='survival');
  const shared=aa.filter(e=>bb.some(v=>v.expeditionId===e.expeditionId));
  if(shared.length<3||!shared.some(e=>e.boss&&bb.some(v=>v.expeditionId===e.expeditionId&&v.boss)))return false;
  if(r.recipes.includes(speciesId))return false;r.recipes.push(speciesId);r.discoveries.push(speciesId);r.recipes.sort();r.discoveries=[...new Set(r.discoveries)].sort();r.revision++;return true;
}
export function recordStory(r,id){if(!token(id)||r.story.includes(id))return false;r.story.push(id);r.story.sort();r.revision++;return true;}
export function rosterMemorials(r) {
  // Preserve every concurrent death receipt; the primary tombstone is only a
  // deterministic display choice, not a timestamp-based replacement of history.
  const records=[];
  for(const [id,i] of Object.entries(r.instances))if(r.tombstones[id]){
    for(const e of Object.values(i.events))if(e.record)records.push(copy(e.record));
  }
  return records.sort((a,b)=>a.instanceId.localeCompare(b.instanceId)||a.receiptId.localeCompare(b.receiptId));
}
function validRecord(v,id) {
  return keys(v,['instanceId','receiptId','speciesId','name','level','survivals','bossSurvivals','place'])&&v.instanceId===id&&token(v.receiptId)&&!!getExpeditionSpecies(v.speciesId)&&text(v.name)&&integer(v.level,10)&&v.level>=1&&integer(v.survivals)&&integer(v.bossSurvivals)&&v.bossSurvivals<=v.survivals&&text(v.place);
}
function validEvent(e,id,origin) {
  if(!plain(e))return false;
  if(e.kind==='xp')return keys(e,['kind','amount'])&&integer(e.amount,10000)&&e.amount>0;
  if(e.kind==='heal')return keys(e,['kind','amount'])&&amountOK(e.amount);
  if(e.kind==='damage')return keys(e,['kind','amount','record'])&&amountOK(e.amount)&&(!own(e,'record')||validRecord(e.record,id));
  if(e.kind==='death')return keys(e,['kind','record'])&&validRecord(e.record,id);
  if(e.kind==='survival')return keys(e,['kind','expeditionId','boss'])&&token(e.expeditionId)&&typeof e.boss==='boolean';
  if(e.kind==='evolution'){const s=getExpeditionSpecies(e.speciesId);return keys(e,['kind','speciesId','stage','xpAtEvolution'])&&[1,2].includes(e.stage)&&integer(e.xpAtEvolution)&&instanceLevel(e.xpAtEvolution)>=(e.stage===1?5:8)&&!!s&&(e.stage===1?['solo','fusion'].includes(s.kind)&&s.parents.includes(origin):s.kind==='final');}
  return false;
}
export function normalizeRoster(raw,{owner,channel}={}) {
  try {
    const r=typeof raw==='string'?JSON.parse(raw):raw;
    owner??=r?.owner;channel??=r?.channel;
    if(!keys(r,['kind','version','owner','channel','revision','instances','party','discoveries','recipes','story','tombstones'])||r.kind!==ROSTER_KIND||r.version!==1||!token(owner)||r.owner!==owner||r.channel!==channel||!channels.has(channel)||!integer(r.revision)||!plain(r.instances)||!plain(r.tombstones)||Object.keys(r.instances).length>LIMIT)return null;
    if(!Array.isArray(r.party)||r.party.length!==8)return null;
    for(const key of ['discoveries','recipes','story'])if(!Array.isArray(r[key])||r[key].length>1024||new Set(r[key]).size!==r[key].length||r[key].some(v=>!token(v)||(key!=='story'&&!getExpeditionSpecies(v))))return null;
    let count=0;const receiptIds=new Set();
    for(const [id,i] of Object.entries(r.instances)) {
      if(!token(id)||!keys(i,['instanceId','originSpeciesId','speciesId','nickname','maxHp','hp','xp','level','survivals','bossSurvivals','status','deathRecord','events'])||i.instanceId!==id||!getExpeditionSpecies(i.originSpeciesId)||getExpeditionSpecies(i.originSpeciesId).kind==='twin'||!getExpeditionSpecies(i.speciesId)||getExpeditionSpecies(i.speciesId).kind==='twin'||!text(i.nickname)||!integer(i.maxHp,10000)||i.maxHp<1||!plain(i.events))return null;
      const survivalIds=new Set(),stages=new Set();
      for(const [eid,e] of Object.entries(i.events)){
        if(!receiptToken(eid)||receiptIds.has(eid)||!validEvent(e,id,i.originSpeciesId))return null;
        const derived=receiptParts(eid);if(eid.length>128&&derived&&(derived.b!==id||derived.kind!==e.kind||derived.kind==='survival'&&derived.a!==e.expeditionId))return null;receiptIds.add(eid);count++;
        if(e.record&&e.record.receiptId!==eid)return null;
        if(e.kind==='survival'){if(survivalIds.has(e.expeditionId))return null;survivalIds.add(e.expeditionId);}
        if(e.kind==='evolution'){if(stages.has(e.stage))return null;stages.add(e.stage);}
      }
      const first=Object.values(i.events).find(e=>e.kind==='evolution'&&e.stage===1),last=Object.values(i.events).find(e=>e.kind==='evolution'&&e.stage===2);
      if(last&&(!first||!getExpeditionSpecies(last.speciesId).parents.includes(first.speciesId)))return null;
      const tomb=r.tombstones[id];if(tomb&&(!validRecord(tomb,id)||!Object.values(i.events).some(e=>e.record&&same(e.record,tomb))))return null;
      const d=derive(i,tomb??null);if(d.xp>1000000||Object.values(i.events).some(e=>e.kind==='evolution'&&e.xpAtEvolution>d.xp)||i.maxHp!==d.maxHp||i.hp!==d.hp||i.level!==d.level||i.xp!==d.xp||i.speciesId!==d.speciesId||i.status!==d.status||i.survivals!==d.survivals||i.bossSurvivals!==d.bossSurvivals||!same(i.deathRecord,d.deathRecord)||(!tomb&&d.hp===0)||!r.discoveries.includes(i.originSpeciesId)||!r.discoveries.includes(i.speciesId))return null;
      const history=new Set([i.originSpeciesId,...Object.values(i.events).filter(e=>e.kind==='evolution').map(e=>e.speciesId)]);
      if(Object.values(i.events).some(e=>e.record&&(!history.has(e.record.speciesId)||e.record.level>d.level||e.record.survivals>d.survivals||e.record.bossSurvivals>d.bossSurvivals)))return null;
      if(Object.values(i.events).some(e=>e.record)&&!tomb)return null;
    }
    if(count>EVENT_LIMIT||Object.keys(r.tombstones).some(id=>!own(r.instances,id)))return null;
    const party=new Set();for(const id of r.party){if(id===null)continue;if(!token(id)||party.has(id)||r.instances[id]?.status!=='alive')return null;party.add(id);}
    return copy(r);
  }catch{return null;}
}
export function mergeRosters(a,b) {
  const x=normalizeRoster(a),y=normalizeRoster(b);if(!x||!y)return {ok:false,reason:'invalid'};
  if(x.owner!==y.owner||x.channel!==y.channel)return {ok:false,reason:'owner/channel'};
  const r=copy(x);
  for(const [id,j] of Object.entries(y.instances)) {
    if(!own(r.instances,id)){r.instances[id]=copy(j);continue;}
    const i=r.instances[id];if(i.originSpeciesId!==j.originSpeciesId||i.nickname!==j.nickname)return {ok:false,reason:'immutable identity'};
    for(const [eid,e] of Object.entries(j.events)){if(own(i.events,eid)&&!same(i.events[eid],e))return {ok:false,reason:'receipt conflict'};i.events[eid]=copy(e);}
    // Divergent irreversible evolutions are conflicts, never a later timestamp winner.
    for(const stage of [1,2])if(Object.values(i.events).filter(e=>e.kind==='evolution'&&e.stage===stage).length>1)return {ok:false,reason:'evolution conflict'};
  }
  for(const [id,t] of Object.entries(y.tombstones))if(!r.tombstones[id]||t.receiptId.localeCompare(r.tombstones[id].receiptId)<0)r.tombstones[id]=copy(t);
  for(const key of ['discoveries','recipes','story'])r[key]=[...new Set([...x[key],...y[key]])].sort();
  for(const id of Object.keys(r.instances)) {
    refresh(r,id);
    // Concurrent nonfatal damage can be fatal together. Record that death deterministically.
    if(r.instances[id].hp===0&&!r.tombstones[id]){
      const causal=[id,...Object.keys(r.instances[id].events).sort()].join('|');let hash=2166136261;
      for(let n=0;n<causal.length;n++)hash=Math.imul(hash^causal.charCodeAt(n),16777619)>>>0;
      markInstanceDead(r,id,{receiptId:`merge-death:${hash.toString(16)}:${id.slice(0,48)}`,place:'동시 전투 기록'});
    }
  }
  // Equipment conflicts do not silently choose a party: retain slots only if both agree.
  r.party=x.party.map((id,n)=>id===y.party[n]&&r.instances[id]?.status==='alive'?id:null);
  r.revision=Math.max(x.revision,y.revision)+1;
  const valid=normalizeRoster(r);return valid?{ok:true,roster:valid}:{ok:false,reason:'merged schema conflict'};
}
