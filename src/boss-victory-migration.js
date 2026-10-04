import {BOSS_EVENT_COUNTERS,createBossVictoryLedger} from './boss-victory-events.js';
import {decodeBossVictoryCloud} from './boss-victory-event-sync.js';

// Dormant, server-admin migration contract. Never infer historical victories
// from title flags, ordinals, local inspection or a high-water gap.
const fields=Object.values(BOSS_EVENT_COUNTERS),object=v=>v&&typeof v==='object'&&!Array.isArray(v);
const clone=v=>JSON.parse(JSON.stringify(v));
const owner=id=>typeof id==='string'&&/^[\w-]{1,128}$/.test(id);
const epoch=id=>typeof id==='string'&&/^[\w-]{6,96}$/.test(id);
export function legacyBossBaseline(save){
 if(!object(save)||save.version!==1||!object(save.account)||save.account.version!==1)throw Error('invalid-server-save');
 return Object.fromEntries(fields.map(field=>{const value=save.account[field]===undefined?0:save.account[field];if(!Number.isSafeInteger(value)||value<0||value>100000)throw Error('invalid-server-count');return [field,value];}));
}
export function createBossMigrationSeal(ownerUid,migrationEpoch,save,sealedAt=Date.now()){
 if(!owner(ownerUid)||!epoch(migrationEpoch)||!Number.isSafeInteger(sealedAt)||sealedAt<=0)throw Error('invalid-migration-context');
 if(save.bossProtocol!==undefined)throw Error('unsealed-protocol');
 const baseline=legacyBossBaseline(save),archive={save:clone(save)};
 if(JSON.stringify(archive).length>1000000)throw Error('archive-too-large');
 const flags=save.discoveries?.bosses??[];
 if(!Array.isArray(flags)||flags.length>2000||flags.some(id=>typeof id!=='string'||!id.length||id.length>64))throw Error('invalid-server-titles');
 // Preserve entitlements even when the historical count is lower than ten.
 // The complete original save is archived separately, without normalization.
 return {version:2,ownerUid,epoch:migrationEpoch,sealedAt,baseline,legacyEntitlements:{version:1,bosses:[...new Set(flags)]},archive};
}
export function validBossMigrationSeal(value){
 try{
  if(!object(value)||Object.keys(value).length!==7||Object.keys(value).some(k=>!['version','ownerUid','epoch','sealedAt','baseline','legacyEntitlements','archive'].includes(k))||value.version!==2||!object(value.archive)||Object.keys(value.archive).length!==1||!object(value.legacyEntitlements)||value.legacyEntitlements.version!==1||Object.keys(value.legacyEntitlements).some(k=>!['version','bosses'].includes(k)))return false;
  const expected=createBossMigrationSeal(value.ownerUid,value.epoch,value.archive.save,value.sealedAt);
  const flags=value.legacyEntitlements.bosses??[];
  return object(value.baseline)&&Object.keys(value.baseline).length===5&&fields.every(k=>value.baseline[k]===expected.baseline[k])&&Array.isArray(flags)&&flags.length===expected.legacyEntitlements.bosses.length&&flags.every((id,i)=>id===expected.legacyEntitlements.bosses[i]);
 }catch{return false;}
}
export function sealBossMigrationUser(user,ownerUid,migrationEpoch,sealedAt=Date.now()){
 if(!object(user))throw Error('invalid-server-user');
 if(user.bossMigration!==undefined){
  if(!validBossMigrationSeal(user.bossMigration)||user.bossMigration.ownerUid!==ownerUid||user.bossMigration.epoch!==migrationEpoch)throw Error('migration-conflict');
  return clone(user);
 }
 return {...clone(user),bossMigration:createBossMigrationSeal(ownerUid,migrationEpoch,user.save,sealedAt)};
}
export function initializeBossLedgerFromSeal(existing,seal){
 if(!validBossMigrationSeal(seal))throw Error('invalid-seal');
 if(existing!==null&&existing!==undefined){
  const ledger=decodeBossVictoryCloud(existing);
  if(ledger.ownerUid!==seal.ownerUid||ledger.epoch!==seal.epoch||fields.some(k=>ledger.baseline[k]!==seal.baseline[k]))throw Error('migration-conflict');
  return clone(existing); // An idempotent retry never removes actual events.
 }
 const {events,...metadata}=createBossVictoryLedger(seal.ownerUid,seal.epoch,seal.baseline);return metadata;
}
export function withBossMigrationProtocol(save,seal,ownerUid){
 if(!validBossMigrationSeal(seal)||ownerUid!==seal.ownerUid||!object(save)||save.version!==1||!object(save.account))throw Error('migration-conflict');
 const protocol={version:2,ownerUid,epoch:seal.epoch};
 if(save.bossProtocol!==undefined&&(!object(save.bossProtocol)||Object.keys(save.bossProtocol).length!==3||Object.keys(protocol).some(k=>save.bossProtocol[k]!==protocol[k])))throw Error('migration-conflict');
 return {...clone(save),account:{...clone(save.account),...seal.baseline},bossProtocol:protocol};
}
