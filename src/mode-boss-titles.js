import {normalizeBossRuns,validBossRunId} from './boss-title-ledger.js';
import {readAccountProfile,writeAccountProfile} from './account-profile.js';
import {readBossVictoryAccount,queueBossAccountVictory} from './boss-victory-account.js';
import {bossVictoryEventKey} from './boss-victory-events.js';
import {createBossVictoryEventQueue} from './boss-victory-event-sync.js';

export const MODE_BOSSES=Object.freeze({
 austin:{act:1,counter:'austinWins',veteran:'austinveteran',clear:'austinclear'},
 alwaysbeginner:{act:2,counter:'alwaysWins',veteran:'alwaysveteran',clear:'alwaysclear'},
 tempestcarrier:{act:3,counter:'johanWins',veteran:'johanveteran',clear:'johanclear'},
 crosswindKeeper:{act:4,counter:'crosswindWins',veteran:'crosswindveteran',clear:'crosswindclear'},
 crystalGardener:{act:5,counter:'crystalWins',veteran:'crystalveteran',clear:'crystalclear'}
});
// Refresh titles on another device from verified account events, never from
// ranking guesses or a newer local high-water counter.
export function bossAccountAwards(storage,ownerUid){
 const state=readBossVictoryAccount(storage,ownerUid);if(!state)return [];
 const profile=readAccountProfile(storage,ownerUid),awards=new Set(state.context.legacyEntitlements.bosses);
 for(const [boss,spec] of Object.entries(MODE_BOSSES)){if(profile[spec.counter]>0)awards.add(boss);if(profile[spec.counter]>=10)awards.add(spec.veteran);}
 for(const event of Object.values(state.ledger.events)){const spec=MODE_BOSSES[event.boss];if(event.ordinal>=3&&!(event.mode==='journey'&&spec.act<4))awards.add(spec.clear);}
 return [...awards];
}
// Each saved run retains a per-boss high-water mark. Restoring an earlier
// preparation screen must never farm account titles from the same boss.
export function recordModeBossVictory(storage,{mode,runId,boss,ordinal,practice=false,now=Date.now(),bossEpoch=null}={}){
 const spec=Object.hasOwn(MODE_BOSSES,boss)?MODE_BOSSES[boss]:null,id=mode+':'+runId;
 if(practice||!spec||!validBossRunId(id)||!Number.isInteger(ordinal)||ordinal<1||ordinal>1000000)return {saved:false,awards:[],counted:false};
 try{
  const ownerUid=storage.getItem('seed-cloud-owner-v1'),state=ownerUid?readBossVictoryAccount(storage,ownerUid):null;
  if(state){
   if(bossEpoch!==state.context.epoch)return {saved:false,awards:[],counted:false,kind:'legacy-receipt'};
   const event={mode,runId,boss,ordinal},key=bossVictoryEventKey(event),queue=createBossVictoryEventQueue({storage,ownerUid,epoch:bossEpoch});
   const counted=!Object.hasOwn(state.ledger.events||{},key)&&!queue.pending().some(e=>bossVictoryEventKey(e)===key);
   if(!queueBossAccountVictory(storage,{ownerUid,event,practice}))return {saved:false,awards:[],counted:false};
   const account=readAccountProfile(storage,ownerUid),awards=[boss];if(account[spec.counter]>=10)awards.push(spec.veteran);if(ordinal>=3&&!(mode==='journey'&&spec.act<4))awards.push(spec.clear);
   return {saved:true,counted,awards,wins:account[spec.counter]};
  }
  if(bossEpoch!==null)return {saved:false,awards:[],counted:false,kind:'migration'};
 }catch{return {saved:false,awards:[],counted:false,kind:'migration'};}
 const account=readAccountProfile(storage),runs=normalizeBossRuns(account.bossRuns),row=runs[id]||{},counted=ordinal>(row[boss]||0);
 if(counted){account[spec.counter]=Math.min(100000,account[spec.counter]+1);runs[id]={...row,[boss]:ordinal,at:now};account.bossRuns=normalizeBossRuns(runs);if(!writeAccountProfile(storage,account))return {saved:false,awards:[],counted:false};
  const confirmed=readAccountProfile(storage);if((confirmed.bossRuns[id]?.[boss]||0)<ordinal||confirmed[spec.counter]<account[spec.counter])return {saved:false,awards:[],counted:false};
 }
 // Repair missing discovery flags even on a retry after a partial local write.
 const awards=[boss];if(account[spec.counter]>=10)awards.push(spec.veteran);if(ordinal>=3&&!(mode==='journey'&&spec.act<4))awards.push(spec.clear);
 return {saved:true,counted,awards,wins:account[spec.counter]};
}
