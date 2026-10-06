import {normalizeRoster} from './roster.js';
import {restoreExpeditionCombat} from './combat.js';
import {EXPEDITION_GARDENS,EXPEDITION_RUN_STEPS} from './world.js';
import {LAW_DNA} from './species.js';
import {emptyExpeditionNursery,EXPEDITION_NURSERY_KEYS,validExpeditionNursery,validExpeditionFind} from './nursery.js';

const clone=v=>JSON.parse(JSON.stringify(v));
const token=v=>typeof v==='string'&&/^[A-Za-z0-9_.:-]{1,128}$/.test(v)&&!['__proto__','constructor','prototype'].includes(v);
const routeToken=v=>token(v)&&v.length<=100;
const highRiskToken=v=>{if(typeof v!=='string')return false;const at=v.lastIndexOf(':');return at>0&&token(v.slice(0,at))&&Object.hasOwn(LAW_DNA,v.slice(at+1));};
const integer=(v,max)=>Number.isSafeInteger(v)&&v>=0&&v<=max;
const object=v=>v&&typeof v==='object'&&!Array.isArray(v);
const keys=(v,allowed)=>object(v)&&Object.keys(v).every(k=>allowed.includes(k));
export function expeditionSessionKey(owner,channel){
 if(!token(owner)||channel!=='review')throw Error('Expedition public account transport is not ready');
 return `seed-expedition:session:v1:${channel}:${owner}`;
}
export function normalizeLegacyExpeditionSession(raw,{owner,channel='review'}={}){
 try{
  const s=typeof raw==='string'?JSON.parse(raw):clone(raw);
  if(!keys(s,['version','revision','owner','channel','screen','roster','route','battle','meta','lastResult'])||s.version!==1||s.owner!==owner||s.channel!==channel||channel!=='review'||!token(owner)||!integer(s.revision,1000000)||!['home','explore','battle','result'].includes(s.screen))return null;
  s.roster=normalizeRoster(s.roster,{owner,channel});if(!s.roster)return null;
  const m=s.meta;
  if(!keys(m,['cores','awakenMaterials','highRisk','returnCount','bossWins','committedRuns'])||!keys(m.cores,Object.keys(LAW_DNA))||Object.keys(m.cores).length!==9||Object.values(m.cores).some(n=>!integer(n,10000))||!integer(m.awakenMaterials,10000)||!integer(m.returnCount,10000)||!integer(m.bossWins,10000)||!Array.isArray(m.highRisk)||m.highRisk.length>256||m.highRisk.some(v=>!highRiskToken(v))||new Set(m.highRisk).size!==m.highRisk.length||!Array.isArray(m.committedRuns)||m.committedRuns.length>1000||m.committedRuns.some(v=>!token(v))||new Set(m.committedRuns).size!==m.committedRuns.length)return null;
  if(s.route!==null){
   const r=s.route;
   if(!keys(r,['version','runId','gardenId','difficulty','partyIds','step','position','status','pendingLoot','completedBattles','restUsed','elapsedSeconds'])||r.version!==1||!routeToken(r.runId)||!Object.hasOwn(EXPEDITION_GARDENS,r.gardenId)||!integer(r.difficulty,5)||r.difficulty<1||!integer(r.step,EXPEDITION_RUN_STEPS.length-1)||!Number.isFinite(r.position)||r.position<0||r.position>18||!Number.isFinite(r.elapsedSeconds)||r.elapsedSeconds<0||r.elapsedSeconds>86400||typeof r.restUsed!=='boolean'||!['exploring','battle','returned','wiped','limit'].includes(r.status)||!Array.isArray(r.partyIds)||r.partyIds.length!==8||r.partyIds.some(v=>v!==null&&(!token(v)||!Object.hasOwn(s.roster.instances,v)))||new Set(r.partyIds.filter(Boolean)).size!==r.partyIds.filter(Boolean).length||!Array.isArray(r.completedBattles)||r.completedBattles.length>4||r.completedBattles.some(v=>!token(v)||!v.startsWith(`${r.runId}:b`))||new Set(r.completedBattles).size!==r.completedBattles.length||!Array.isArray(r.pendingLoot)||r.pendingLoot.length>20)return null;
   for(const l of r.pendingLoot)if(!keys(l,['lawId','amount','material'])||!Object.hasOwn(LAW_DNA,l.lawId)||!integer(l.amount,10)||!integer(l.material,3))return null;
  }
  if(s.battle!==null){
   s.battle=restoreExpeditionCombat(s.battle);
   if(!s.route||!s.battle.battleId.startsWith(`${s.route.runId}:`))return null;
   for(const u of s.battle.units.filter(u=>u.side==='ally')){
    const i=s.roster.instances[u.instanceId];if(!i||i.speciesId!==u.speciesId||u.id!==i.instanceId)return null;
    if(s.battle.phase==='fight'&&(Math.abs(i.hp-u.hp)>.00001||i.maxHp!==u.maxHp||(i.status==='dead')!==u.dead))return null;
   }
  }
  if(s.screen==='battle'&&(!s.battle||s.battle.phase!=='fight'||s.route?.status!=='battle'))return null;
  if(s.screen==='explore'&&(!s.route||s.route.status!=='exploring'||s.battle!==null))return null;
  if(s.screen==='home'&&(s.route!==null||s.battle!==null))return null;
  if(s.screen==='result'&&(!s.route||!s.lastResult||s.battle!==null||s.route.status!==({return:'returned',wipe:'wiped',limit:'limit'}[s.lastResult.kind])||s.route.pendingLoot.length||s.lastResult.gardenId!==s.route.gardenId||s.lastResult.difficulty!==s.route.difficulty))return null;
  if(s.battle!==null&&s.screen!=='battle')return null;
  if(s.lastResult!==null&&(!keys(s.lastResult,['kind','gardenId','difficulty','survivors','lost','loot','boss'])||!['return','wipe','limit'].includes(s.lastResult.kind)||!Object.hasOwn(EXPEDITION_GARDENS,s.lastResult.gardenId)||!integer(s.lastResult.difficulty,5)||!integer(s.lastResult.survivors,8)||!integer(s.lastResult.lost,8)||!integer(s.lastResult.loot,100)||typeof s.lastResult.boss!=='boolean'))return null;
  if(JSON.stringify(s).length>2000000)return null;
  return s;
 }catch{return null;}
}
// Validate the entire old envelope BEFORE adding neutral version2 fields. A
// corrupt old roster or realtime prototype is never reset or promoted.
export function normalizeExpeditionSession(raw,options={}){
 try{
  const s=typeof raw==='string'?JSON.parse(raw):clone(raw);
  if(s?.version===1){const valid=normalizeLegacyExpeditionSession(s,options);if(!valid)return null;valid.version=2;Object.assign(valid.meta,emptyExpeditionNursery());if(valid.route)valid.route.pendingFinds=[];return valid;}
  if(s?.version!==2||!validExpeditionNursery(s.meta))return null;
  const extra=Object.fromEntries(EXPEDITION_NURSERY_KEYS.map(key=>[key,clone(s.meta[key])])),finds=s.route?.pendingFinds??null;
  if(s.route&&(!Array.isArray(finds)||finds.length>1||finds.some(f=>!validExpeditionFind(f,s.route.runId)||f.gardenId!==s.route.gardenId)||['returned','wiped','limit'].includes(s.route.status)&&finds.length))return null;
  const legacy=clone(s);legacy.version=1;for(const key of EXPEDITION_NURSERY_KEYS)delete legacy.meta[key];if(legacy.route)delete legacy.route.pendingFinds;
  const valid=normalizeLegacyExpeditionSession(legacy,options);if(!valid)return null;valid.version=2;Object.assign(valid.meta,extra);if(valid.route)valid.route.pendingFinds=clone(finds);return valid;
 }catch{return null;}
}
// Device-local optimistic conflict detection, not a multi-tab atomic CAS or cloud lease.
// Roster, combat and route are one write so an accepted death cannot be detached
// from its combat action receipt by a reload between independent save keys.
export function createExpeditionSessionStore({storage,owner,currentOwner,channel='review'}){
 const key=expeditionSessionKey(owner,channel);
 const validOwner=()=>currentOwner()===owner;
 function load(){try{if(!validOwner())return {ok:false,reason:'owner changed'};const raw=storage.getItem(key);if(!validOwner())return {ok:false,reason:'owner changed'};if(raw===null)return {ok:true,raw:null,session:null};const session=normalizeExpeditionSession(raw,{owner,channel});return session?{ok:true,raw,session}:{ok:false,reason:'malformed',raw};}catch{return {ok:false,reason:'storage read'};}}
 function save(candidate,expectedRaw){
  const session=normalizeExpeditionSession(candidate,{owner,channel});if(!session)return {ok:false,reason:'invalid session'};
  const declaredVersion=typeof candidate==='string'?JSON.parse(candidate).version:candidate.version;
  if(declaredVersion!==2)return {ok:false,reason:'old client'};
  if(expectedRaw!==null&&typeof expectedRaw!=='string')return {ok:false,reason:'expected bytes required'};
  try{
   if(!validOwner())return {ok:false,reason:'owner changed'};
   if(storage.getItem(key)!==expectedRaw)return {ok:false,reason:'conflict'};
   if(!validOwner())return {ok:false,reason:'owner changed'};
   if(expectedRaw!==null){
    const previous=normalizeExpeditionSession(expectedRaw,{owner,channel});
    if(!previous)return {ok:false,reason:'malformed'};
    if(session.revision<=previous.revision)return {ok:false,reason:'revision'};
    // Exact-current bytes do not authorize rewinding an individual's event
    // history. A restore/retry caller must preserve every death and receipt.
    for(const [id,i]of Object.entries(previous.roster.instances)){
     const next=session.roster.instances[id];
     if(!next||next.originSpeciesId!==i.originSpeciesId)return {ok:false,reason:'history rewind'};
     if(previous.roster.tombstones[id]&&JSON.stringify(previous.roster.tombstones[id])!==JSON.stringify(session.roster.tombstones[id]))return {ok:false,reason:'death rewind'};
     for(const [receipt,event]of Object.entries(i.events))if(JSON.stringify(next.events[receipt])!==JSON.stringify(event))return {ok:false,reason:'receipt rewind'};
    }
    for(const field of ['discoveries','recipes','story'])if(previous.roster[field].some(id=>!session.roster[field].includes(id)))return {ok:false,reason:'record rewind'};
    if(previous.meta.committedRuns.some(id=>!session.meta.committedRuns.includes(id))||previous.meta.highRisk.some(id=>!session.meta.highRisk.includes(id))||session.meta.returnCount<previous.meta.returnCount||session.meta.bossWins<previous.meta.bossWins)return {ok:false,reason:'result rewind'};
    for(const field of ['rewardIds','growthReceipts','resowIds','relics'])if(previous.meta[field].some(id=>!session.meta[field].includes(id)))return {ok:false,reason:'nursery rewind'};
    for(const garden of Object.keys(EXPEDITION_GARDENS))if(session.meta.restoration[garden]<previous.meta.restoration[garden])return {ok:false,reason:'restoration rewind'};
    if(previous.meta.growthCharges-session.meta.growthCharges>session.meta.growthReceipts.length-previous.meta.growthReceipts.length)return {ok:false,reason:'growth rewind'};
    for(const egg of previous.meta.eggs)if(!session.meta.eggs.some(e=>e.eggId===egg.eggId)&&!session.meta.rewardIds.includes(`hatch:${egg.eggId}`))return {ok:false,reason:'egg rewind'};
   }
   if(expectedRaw!==null){storage.setItem(`${key}:backup`,expectedRaw);if(storage.getItem(`${key}:backup`)!==expectedRaw)return {ok:false,reason:'backup readback'};}
   if(!validOwner())return {ok:false,reason:'owner changed'};
   if(storage.getItem(key)!==expectedRaw)return {ok:false,reason:'conflict'};
   if(!validOwner())return {ok:false,reason:'owner changed'};
   const raw=JSON.stringify(session);storage.setItem(key,raw);
   if(!validOwner())return {ok:false,reason:'owner changed'};
   const confirmed=storage.getItem(key);
   if(!validOwner())return {ok:false,reason:'owner changed'};
   if(confirmed!==raw)return {ok:false,reason:'readback'};
   return {ok:true,raw,session};
  }catch{return {ok:false,reason:'storage write'};}
 }
 return Object.freeze({load,save,key});
}
