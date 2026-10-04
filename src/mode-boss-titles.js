import {normalizeBossRuns,validBossRunId} from './boss-title-ledger.js';
import {readAccountProfile,writeAccountProfile} from './account-profile.js';

export const MODE_BOSSES=Object.freeze({
 austin:{act:1,counter:'austinWins',veteran:'austinveteran',clear:'austinclear'},
 alwaysbeginner:{act:2,counter:'alwaysWins',veteran:'alwaysveteran',clear:'alwaysclear'},
 tempestcarrier:{act:3,counter:'johanWins',veteran:'johanveteran',clear:'johanclear'},
 crosswindKeeper:{act:4,counter:'crosswindWins',veteran:'crosswindveteran',clear:'crosswindclear'},
 crystalGardener:{act:5,counter:'crystalWins',veteran:'crystalveteran',clear:'crystalclear'}
});
// Each saved run retains a per-boss high-water mark. Restoring an earlier
// preparation screen must never farm account titles from the same boss.
export function recordModeBossVictory(storage,{mode,runId,boss,ordinal,practice=false,now=Date.now()}={}){
 const spec=Object.hasOwn(MODE_BOSSES,boss)?MODE_BOSSES[boss]:null,id=mode+':'+runId;
 if(practice||!spec||mode==='journey'&&spec.act<4||!validBossRunId(id)||!Number.isInteger(ordinal)||ordinal<1||ordinal>1000000)return {saved:false,awards:[],counted:false};
 const account=readAccountProfile(storage),runs=normalizeBossRuns(account.bossRuns),row=runs[id]||{},counted=ordinal>(row[boss]||0);
 if(counted){account[spec.counter]=Math.min(100000,account[spec.counter]+1);runs[id]={...row,[boss]:ordinal,at:now};account.bossRuns=normalizeBossRuns(runs);if(!writeAccountProfile(storage,account))return {saved:false,awards:[],counted:false};}
 // Repair missing discovery flags even on a retry after a partial local write.
 const awards=[boss];if(account[spec.counter]>=10)awards.push(spec.veteran);if(ordinal>=3)awards.push(spec.clear);
 return {saved:true,counted,awards,wins:account[spec.counter]};
}
