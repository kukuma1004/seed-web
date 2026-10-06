import {LAW_DNA,getExpeditionSpecies} from './species.js';
import {EXPEDITION_GARDENS} from './world.js';

const token=v=>typeof v==='string'&&/^[A-Za-z0-9_.:-]{1,128}$/.test(v)&&!['__proto__','constructor','prototype'].includes(v);
const keys=(v,list)=>v&&typeof v==='object'&&!Array.isArray(v)&&Object.keys(v).every(k=>list.includes(k));
const integer=(v,max)=>Number.isSafeInteger(v)&&v>=0&&v<=max;
const tokens=(v,max)=>Array.isArray(v)&&v.length<=max&&v.every(token)&&new Set(v).size===v.length;
export function emptyExpeditionNursery(){return {eggs:[],rewardIds:[],growthCharges:0,growthReceipts:[],restoration:Object.fromEntries(Object.keys(EXPEDITION_GARDENS).map(id=>[id,0])),relics:[],resowIds:[]};}
export const EXPEDITION_NURSERY_KEYS=Object.freeze(Object.keys(emptyExpeditionNursery()));
export function validExpeditionFind(find,runId){
 return keys(find,['rewardId','kind','speciesId','gardenId'])&&token(find.rewardId)&&find.rewardId===`${runId}:find:choice`&&['egg','rescue'].includes(find.kind)&&Object.hasOwn(EXPEDITION_GARDENS,find.gardenId)&&getExpeditionSpecies(find.speciesId)?.kind==='base'&&find.speciesId===EXPEDITION_GARDENS[find.gardenId].law;
}
export function validExpeditionNursery(meta){
 if(!Array.isArray(meta.eggs)||meta.eggs.length>128||!tokens(meta.rewardIds,2000)||!integer(meta.growthCharges,1000)||!tokens(meta.growthReceipts,1000)||!tokens(meta.resowIds,256))return false;
 if(!keys(meta.restoration,Object.keys(EXPEDITION_GARDENS))||Object.keys(meta.restoration).length!==8||Object.values(meta.restoration).some(v=>!integer(v,5)))return false;
 if(!Array.isArray(meta.relics)||meta.relics.length>8||new Set(meta.relics).size!==meta.relics.length||meta.relics.some(id=>!Object.hasOwn(EXPEDITION_GARDENS,id)))return false;
 const eggIds=new Set();for(const egg of meta.eggs){
  if(!keys(egg,['eggId','speciesId','sourceRun','gardenId'])||!token(egg.eggId)||!token(egg.sourceRun)||egg.eggId!==`${egg.sourceRun}:find:choice`||!meta.rewardIds.includes(egg.eggId)||meta.rewardIds.includes(`hatch:${egg.eggId}`)||eggIds.has(egg.eggId)||getExpeditionSpecies(egg.speciesId)?.kind!=='base'||!Object.hasOwn(EXPEDITION_GARDENS,egg.gardenId)||egg.speciesId!==EXPEDITION_GARDENS[egg.gardenId].law)return false;
  eggIds.add(egg.eggId);
 }return true;
}
export function canResowExpedition(roster,meta){return !Object.values(roster.instances).some(i=>i.status==='alive')&&!meta.eggs.length;}
export function nurseryGrowthCandidates(roster){const party=new Set(roster.party.filter(Boolean));return Object.values(roster.instances).filter(i=>i.status==='alive'&&i.level<10&&!party.has(i.instanceId));}
export const NURSERY_GROWTH_XP=10;
// Local 1.0 candidate policy: an earned two-battle return grants one growth
// charge; a base egg hatches freely. Recovery creates one NEW level1 body only
// when no living body/egg remains. These are tuning choices, not ZIP numbers.
