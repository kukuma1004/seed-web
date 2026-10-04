import {SURVIVAL,survivalActCount} from './survival-rules.js';
import {createBestRanking} from './best-ranking.js';
import {FIREBASE} from './online-ranking.js';
import {cleanName} from './score.js';
import {isBadName} from './name-filter.js';
import {EXPANSION_ACTS,expansionCircuitReleased} from './act-expansion.js';

export const SURVIVAL_RANK_PATH='seedSurvivalRanking/v1';
export function survivalExpansionRankProgress(session,{acts:releaseActs=EXPANSION_ACTS,inspection=false}={}){
 const acts=survivalActCount(session);return {act:Math.max(0,Math.min(acts-1,session?.act||0)),lap:Math.max(0,session?.lap||0),
  bosses:Math.max(0,session?.bossesDefeated||0),completedLaps:Math.max(0,session?.completedLaps||0),legacyCompletedLaps:Math.max(0,session?.legacyCompletedLaps||0),eligible:inspection!==true&&!session?.lab&&!session?.benchmark&&(acts===3||expansionCircuitReleased(releaseActs))};
}
const PENDING='seed-survival-rank-pending-v1:';
const integer=(v,min,max)=>Number.isInteger(v)&&v>=min&&v<=max;
export function validSurvivalRank(e){
 return Boolean(e&&typeof e.uid==='string'&&e.uid&&typeof e.name==='string'&&cleanName(e.name)===e.name&&e.name&&!isBadName(e.name)
  &&integer(e.score,1,1e9)&&integer(e.kills,1,1e7)&&integer(e.bosses,0,1000)&&integer(e.time,1,86400)
  &&e.bosses<=e.kills&&e.time>=e.bosses*SURVIVAL.duration&&e.score<=(e.kills-e.bosses)*30+e.bosses*500
  &&typeof e.laws==='string'&&e.laws.length<=120&&typeof e.forms==='string'&&e.forms.length<=120);
}
// Equal scores share a place. Only the best score per authenticated account is kept.
export const survivalPlaces=rows=>rows.sort((a,b)=>b.score-a.score||a.uid.localeCompare(b.uid)).map((row,i,all)=>({...row,rank:all.findIndex(v=>v.score===row.score)+1}));
export function createSurvivalRanking(options={}){
 return createBestRanking({config:FIREBASE,...options,path:SURVIVAL_RANK_PATH,pendingPrefix:PENDING,valid:validSurvivalRank,places:survivalPlaces});
}
