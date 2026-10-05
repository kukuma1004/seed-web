const clone=v=>JSON.parse(JSON.stringify(v));
const bosses=Object.freeze({crosswind:'crosswindKeeper',crystalGorge:'crystalGardener'});
const validEpoch=value=>typeof value==='string'&&/^[\w-]{6,96}$/.test(value);
export const EXPANSION_CAMPAIGN_PENDING_LIMIT=96;
export const EXPANSION_CAMPAIGN_CLEARS=3;
export const expansionCampaignBoss=act=>bosses[act]||null;
const runId=()=>globalThis.crypto?.randomUUID?.()||`${Date.now()}-${Math.floor(Math.random()*1e12)}`;
export function createExpansionPublicCampaign(act,{receiptRunId=runId()}={}){
 const boss=expansionCampaignBoss(act);if(!boss)return null;
 const value={version:1,receiptRunId,lap:0,bossWins:{[boss]:0},bossCleared:false,pendingBossTitles:[]};return validExpansionPublicCampaign(value,act)?value:null;
}
export function validExpansionPublicCampaign(c,act){
 const boss=expansionCampaignBoss(act);if(!boss||!c||c.version!==1||Object.keys(c).some(k=>!['version','receiptRunId','lap','bossWins','bossCleared','pendingBossTitles'].includes(k)))return false;
 if(typeof c.receiptRunId!=='string'||!/^[-\w]{1,90}$/.test(c.receiptRunId)||!Number.isSafeInteger(c.lap)||c.lap<0||c.lap>=EXPANSION_CAMPAIGN_CLEARS||typeof c.bossCleared!=='boolean')return false;
 if(!c.bossWins||Object.keys(c.bossWins).length!==1||!Object.hasOwn(c.bossWins,boss)||!Number.isSafeInteger(c.bossWins[boss])||c.bossWins[boss]!==c.lap+(c.bossCleared?1:0))return false;
 if(!Array.isArray(c.pendingBossTitles)||c.pendingBossTitles.length>EXPANSION_CAMPAIGN_PENDING_LIMIT)return false;
 let previous=0;for(const e of c.pendingBossTitles){if(!e||Object.keys(e).length!==(Object.hasOwn(e,'bossEpoch')?3:2)||Object.keys(e).some(k=>!['boss','ordinal','bossEpoch'].includes(k))||Object.hasOwn(e,'bossEpoch')&&!validEpoch(e.bossEpoch)||e.boss!==boss||!Number.isSafeInteger(e.ordinal)||e.ordinal<=previous||e.ordinal>c.bossWins[boss])return false;previous=e.ordinal;}return true;
}
export function completeExpansionPublicBoss(c,act,bossEpoch=null){
 if(!validExpansionPublicCampaign(c,act)||bossEpoch!==null&&!validEpoch(bossEpoch)||c.bossCleared||c.pendingBossTitles.length>=EXPANSION_CAMPAIGN_PENDING_LIMIT)return null;
 const next=clone(c),boss=expansionCampaignBoss(act),ordinal=++next.bossWins[boss];next.bossCleared=true;next.pendingBossTitles.push({boss,ordinal,...(bossEpoch===null?{}:{bossEpoch})});return validExpansionPublicCampaign(next,act)?next:null;
}
export function advanceExpansionPublicCampaign(c,act){
 if(!validExpansionPublicCampaign(c,act)||!c.bossCleared||c.pendingBossTitles.length||c.bossWins[expansionCampaignBoss(act)]>=EXPANSION_CAMPAIGN_CLEARS)return null;
 const next=clone(c);next.lap++;next.bossCleared=false;return next;
}
export function ackExpansionPublicTitle(c,act){
 if(!validExpansionPublicCampaign(c,act)||!c.pendingBossTitles.length)return null;const next=clone(c);next.pendingBossTitles.shift();return next;
}
// Account acknowledgement is a separate durable write. A failed account write
// or acknowledgement never consumes the FIFO head. The credit callback must
// itself be idempotent (boss ledger); this does not promise garden atomicity.
export function settleExpansionPublicTitles(store,value,credit){
 if(!value?.campaign)return {ok:true,value};
 if(!validExpansionPublicCampaign(value.campaign,value.act))return {ok:false,value,reason:'invalid'};
 let current=value;for(let i=0;i<EXPANSION_CAMPAIGN_PENDING_LIMIT&&current.campaign.pendingBossTitles.length;i++){
  const event=current.campaign.pendingBossTitles[0];let credited=false;
  try{credited=credit(current.campaign.receiptRunId,event)===true;}catch{}
  if(!credited)return {ok:false,value:current,reason:'award'};
  const result=store.ackTitle(current);if(!result.ok)return {ok:false,value:current,reason:result.reason};current=result.value;
 }return {ok:current.campaign.pendingBossTitles.length===0,value:current};
}
export function validExpansionCampaignTransition(before,after,act,{ack=false}={}){
 if(!validExpansionPublicCampaign(after,act))return false;
 if(!before)return after.lap===0&&!after.bossCleared&&!after.pendingBossTitles.length;
 if(!validExpansionPublicCampaign(before,act)||before.receiptRunId!==after.receiptRunId)return false;
 if(JSON.stringify(before)===JSON.stringify(after))return !ack;
 const newEvent=after.pendingBossTitles.at(-1);
 const candidates=ack?[ackExpansionPublicTitle(before,act)]:[completeExpansionPublicBoss(before,act,newEvent?.bossEpoch??null),advanceExpansionPublicCampaign(before,act)];return candidates.some(c=>c&&JSON.stringify(c)===JSON.stringify(after));
}
// A transport choice cannot erase locally durable, unacknowledged receipts or
// silently change this run's account receipt identity. Incompatible branches
// remain an explicit conflict until their own pending receipts are settled.
export function expansionCampaignCanReplace(before,after,act){
 if(!before)return !after||validExpansionPublicCampaign(after,act);
 if(!validExpansionPublicCampaign(before,act)||!validExpansionPublicCampaign(after,act)||before.receiptRunId!==after.receiptRunId)return false;
 const boss=expansionCampaignBoss(act);if(after.bossWins[boss]<before.bossWins[boss])return false;
 return before.pendingBossTitles.every(e=>after.pendingBossTitles.some(q=>q.boss===e.boss&&q.ordinal===e.ordinal&&q.bossEpoch===e.bossEpoch));
}
