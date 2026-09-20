import {DISCOVERIES_KEY,normalizeDiscoveries} from './discoveries.js';
import {GARDEN_KEY,normalizeGarden,autoPlantSeeds,SEEDS} from './garden.js';
import {SHOP_KEY,normalizeShop,STASH_ITEMS,STARTING_COINS} from './shop.js';
import {SAVE_KEY,validCheckpoint,withoutHidden} from './run-save.js';
import {ACT2_STORAGE_KEYS} from './act2.js';
import {QUALITY_KEY,clampLevel} from './quality.js';
import {THEME_KEY,normalizeTheme} from './themes.js';
import {NAME_KEY,cleanName} from './score.js';
import {ACCOUNT_PROFILE_KEY,normalizeAccountProfile} from './account-profile.js';

export const CLOUD_SCHEMA=1;
export const CLOUD_META_KEY='seed-cloud-meta-v1';
export const CLOUD_OWNER_KEY='seed-cloud-owner-v1';
export const SOUND_KEY='seed-sound-v1';
export const SYNC_KEYS=Object.freeze([
 DISCOVERIES_KEY,GARDEN_KEY,SHOP_KEY,SAVE_KEY,ACT2_STORAGE_KEYS[SAVE_KEY],
 QUALITY_KEY,THEME_KEY,SOUND_KEY,NAME_KEY,ACCOUNT_PROFILE_KEY
]);
const syncSet=new Set(SYNC_KEYS);
const json=(storage,key)=>{try{const raw=storage?.getItem(key);return raw==null?null:JSON.parse(raw);}catch{return null;}};
const checkpoint=value=>{const cleaned=withoutHidden(value);return validCheckpoint(cleaned)?cleaned:null;};
const int=(value,min,max,fallback=0)=>Number.isInteger(value)?Math.max(min,Math.min(max,value)):fallback;

export function normalizeCloudMeta(value){
 return {version:1,ownerUid:typeof value?.ownerUid==='string'?value.ownerUid:'',localRevision:int(value?.localRevision,0,1e12),syncedRevision:int(value?.syncedRevision,0,1e12),updatedAt:int(value?.updatedAt,0,Number.MAX_SAFE_INTEGER)};
}

export function readCloudMeta(storage){return normalizeCloudMeta(json(storage,CLOUD_META_KEY));}

export function collectCloudSnapshot(storage,{revision=0,updatedAt=Date.now()}={}){
 const quality=clampLevel(Number(storage?.getItem(QUALITY_KEY)));
 const shop=json(storage,SHOP_KEY);
 return normalizeCloudSnapshot({
  version:CLOUD_SCHEMA,revision,updatedAt,
  discoveries:json(storage,DISCOVERIES_KEY),garden:json(storage,GARDEN_KEY),shop:shop??{version:2,coins:STARTING_COINS},
  checkpoints:{act1:json(storage,SAVE_KEY),act2:json(storage,ACT2_STORAGE_KEYS[SAVE_KEY])},
  settings:{quality,theme:storage?.getItem(THEME_KEY),sound:storage?.getItem(SOUND_KEY)},
  player:{name:storage?.getItem(NAME_KEY)},account:json(storage,ACCOUNT_PROFILE_KEY)
 });
}

export function normalizeCloudSnapshot(value){
 const quality=clampLevel(value?.settings?.quality);
 return {
  version:CLOUD_SCHEMA,
  revision:int(value?.revision,0,1e12),
  updatedAt:int(value?.updatedAt,0,Number.MAX_SAFE_INTEGER),
  discoveries:normalizeDiscoveries(value?.discoveries),
  garden:autoPlantSeeds(normalizeGarden(value?.garden)),
  shop:normalizeShop(value?.shop??{version:2,coins:STARTING_COINS}),
  checkpoints:{version:1,act1:checkpoint(value?.checkpoints?.act1),act2:checkpoint(value?.checkpoints?.act2)},
  settings:{quality:quality??1,theme:normalizeTheme(value?.settings?.theme),sound:value?.settings?.sound==='off'?'off':'on'},
  player:{name:cleanName(value?.player?.name)},
  account:normalizeAccountProfile(value?.account)
 };
}

const union=(a,b,limit=100)=>[...new Set([...(a||[]),...(b||[])])].slice(0,limit);
export function mergeCloudSnapshots(localValue,remoteValue,{prefer='remote'}={}){
 const local=normalizeCloudSnapshot(localValue),remote=normalizeCloudSnapshot(remoteValue);
 const winner=prefer==='local'?local:remote;
 const recordIds=new Set([...Object.keys(local.discoveries.records||{}),...Object.keys(remote.discoveries.records||{})]),records={};
 for(const id of recordIds){const a=local.discoveries.records?.[id],b=remote.discoveries.records?.[id];records[id]=!a?b:!b?a:a.dps>=b.dps?a:b;}
 return normalizeCloudSnapshot({
  ...winner,
  revision:Math.max(local.revision,remote.revision),updatedAt:Math.max(local.updatedAt,remote.updatedAt),
  discoveries:{version:1,forms:union(local.discoveries.forms,remote.discoveries.forms,2000),bosses:union(local.discoveries.bosses,remote.discoveries.bosses,20),records},
  account:{...winner.account,badges:union(local.account.badges,remote.account.badges,40),skins:union(local.account.skins,remote.account.skins,80),appliedGrants:union(local.account.appliedGrants,remote.account.appliedGrants,100),lastRewardAt:Math.max(local.account.lastRewardAt,remote.account.lastRewardAt)}
 });
}

function normalizedRewards(value){
 const rewards=value?.rewards&&typeof value.rewards==='object'?value.rewards:{};
 const items={};for(const [id,n] of Object.entries(rewards.items||{}))if(Object.hasOwn(STASH_ITEMS,id)&&Number.isInteger(n)&&n>0)items[id]=Math.min(99,n);
 const seeds={};for(const [id,n] of Object.entries(rewards.seeds||{}))if(Object.hasOwn(SEEDS,id)&&Number.isInteger(n)&&n>0)seeds[id]=Math.min(99,n);
 return {jp:int(rewards.jp,0,9_999_999),badges:Array.isArray(rewards.badges)?rewards.badges:[],skins:Array.isArray(rewards.skins)?rewards.skins:[],items,seeds};
}

export function applyRewardGrants(snapshotValue,grantMap,now=Date.now()){
 const snapshot=normalizeCloudSnapshot(snapshotValue),applied=[];
 const grants=grantMap&&typeof grantMap==='object'?Object.entries(grantMap).sort(([a],[b])=>a.localeCompare(b)):[];
 for(const [id,grant] of grants){
  if(typeof id!=='string'||id.length>48||snapshot.account.appliedGrants.includes(id)||grant?.status==='revoked')continue;
  const reward=normalizedRewards(grant);
  snapshot.shop.coins=Math.min(9_999_999,snapshot.shop.coins+reward.jp);
  for(const [item,n] of Object.entries(reward.items))snapshot.shop.stash[item]=Math.min(STASH_ITEMS[item].max,(snapshot.shop.stash[item]||0)+n);
  for(const [seed,n] of Object.entries(reward.seeds))snapshot.garden.seeds[seed]=Math.min(99,(snapshot.garden.seeds[seed]||0)+n);
  snapshot.account.badges=union(snapshot.account.badges,reward.badges,40);
  snapshot.account.skins=union(snapshot.account.skins,reward.skins,80);
  snapshot.account.appliedGrants.push(id);snapshot.account.appliedGrants=snapshot.account.appliedGrants.slice(-100);
  snapshot.account.lastRewardAt=now;applied.push({id,label:typeof grant?.label==='string'?grant.label:'선물',rewards:reward});
 }
 return {snapshot:normalizeCloudSnapshot(snapshot),applied};
}

const same=(a,b)=>JSON.stringify(a)===JSON.stringify(b);
export function applyCloudSnapshot(storage,value){
 const next=normalizeCloudSnapshot(value),before=collectCloudSnapshot(storage,{revision:next.revision,updatedAt:next.updatedAt});
 const put=(key,val)=>storage?.setItem(key,typeof val==='string'?val:JSON.stringify(val));
 put(DISCOVERIES_KEY,next.discoveries);put(GARDEN_KEY,next.garden);put(SHOP_KEY,next.shop);put(ACCOUNT_PROFILE_KEY,next.account);
 const save=(key,val)=>val?put(key,val):storage?.removeItem(key);
 save(SAVE_KEY,next.checkpoints.act1);save(ACT2_STORAGE_KEYS[SAVE_KEY],next.checkpoints.act2);
 put(QUALITY_KEY,String(next.settings.quality));put(THEME_KEY,next.settings.theme);put(SOUND_KEY,next.settings.sound);
 if(next.player.name)put(NAME_KEY,next.player.name);else storage?.removeItem(NAME_KEY);
 return !same(before,next);
}

export function isSyncKey(key){return syncSet.has(key);}

export function clearCloudLocalData(storage){
 for(const key of SYNC_KEYS)try{storage?.removeItem(key);}catch{}
 try{storage?.removeItem(CLOUD_META_KEY);storage?.removeItem(CLOUD_OWNER_KEY);}catch{}
}
