import {createBestRanking} from './best-ranking.js';
import {FIREBASE} from './online-ranking.js';
import {cleanName} from './score.js';
import {isBadName} from './name-filter.js';
import {ALL_FORMS} from './forms.js';
import {LAWS} from './laws.js';
import {EXPANSION_ACTS,expansionCircuitReleased} from './act-expansion.js';

// 2026-09-28 합체 방식으로 바꾸며 랭킹 초기화(사용자) → v2.
export const DEFENSE_RANK_PATH='seedDefenseRanking/v2';
const integer=(v,min,max)=>Number.isInteger(v)&&v>=min&&v<=max;
// The game unlocks up to16 seeds;16 longest current final IDs need543 bytes.
// Keep the wire format and score unchanged, including historical8-tower rows.
export const DEFENSE_RANK_LIMITS=Object.freeze({towers:16,towerText:560});
// Completed waves dominate core health, which dominates kills. Equal results tie.
export const defenseRankScore=e=>e.cleared*100000+e.hp*1000+Math.min(999,e.kills);
export function parseDefenseTowers(text){
 if(typeof text!=='string'||text.length>DEFENSE_RANK_LIMITS.towerText)return null;
 const rows=text.split(',').map(s=>s.split(':'));
 if(rows.length<1||rows.length>DEFENSE_RANK_LIMITS.towers||rows.some(([id,lv,...extra])=>extra.length||!(id==='seed'||Object.hasOwn(LAWS,id)||Object.hasOwn(ALL_FORMS,id))||! /^[1-5]$/.test(lv||'')))return null;
 return rows.map(([id,lv])=>[id,Number(lv)]);
}
export function validDefenseRank(e){
 return Boolean(e&&typeof e.uid==='string'&&e.uid&&typeof e.name==='string'&&e.name&&cleanName(e.name)===e.name&&!isBadName(e.name)
  &&integer(e.cleared,0,1000000)&&integer(e.hp,0,20)&&integer(e.kills,0,1000000000)&&integer(e.time,1,1e12)
  &&(e.hp===0||e.cleared===12)&&integer(e.score,1,100000020999)&&e.score===defenseRankScore(e)
  &&parseDefenseTowers(e.towers));
}
export function defenseRankEntry(state,{uid,name,acts=EXPANSION_ACTS,inspection=false,practice=false}){
 // Local expansion checkpoints are intentionally excluded from production
 // rankings until 4/5 art, save rules and device QA are promoted together.
 if(inspection||practice||state?.practice||state?.actCount===5&&!expansionCircuitReleased(acts))return null;
 if(!['won','lost'].includes(state.phase))return null;
 if(state.actCount===5&&!integer(state.migratedWaves??0,0,Math.max(0,state.wave-1)))return null;
 if(state.actCount===5&&state.phase==='won')return null; // The promoted route is endless; legacy 12-wave wins stay three-act records.
 const entry={uid,name:cleanName(name),cleared:state.phase==='won'?12:Math.max(0,state.wave-1-(state.actCount===5?state.migratedWaves||0:0)),hp:state.phase==='won'?Math.max(1,Math.floor(state.coreHp)):0,kills:state.kills,time:Math.max(1,Math.ceil(state.time)),towers:state.towers.map(t=>`${t.formId||t.laws[0]||'seed'}:${t.level}`).join(',')};
 entry.score=defenseRankScore(entry);return validDefenseRank(entry)?entry:null;
}
export function defenseExpansionRankProgress(state,{acts=EXPANSION_ACTS,inspection=false,practice=false}={}){
 const wave=Math.max(0,Math.floor(state?.wave||0)),migrated=Math.max(0,Math.floor(state?.migratedWaves||0));
 const cleared=Math.max(0,wave-(state?.phase==='wave'||state?.phase==='lost'?1:0)-migrated);
 return {cleared,act:wave?Math.floor((wave-1)/12)%5:0,lap:wave?Math.floor((wave-1)/60):0,
  bosses:Object.values(state?.bossWins||{}).reduce((n,v)=>n+Math.max(0,Math.floor(v||0)),0),eligible:state?.actCount===5&&inspection!==true&&practice!==true&&!state?.practice&&expansionCircuitReleased(acts)};
}
export const defensePlaces=rows=>rows.sort((a,b)=>b.score-a.score||a.uid.localeCompare(b.uid)).map((e,i,all)=>({...e,rank:all.findIndex(v=>v.score===e.score)+1}));
export function createDefenseRanking(options={}){
 return createBestRanking({config:FIREBASE,...options,path:DEFENSE_RANK_PATH,pendingPrefix:'seed-defense-rank-pending-v2:',valid:validDefenseRank,places:defensePlaces});
}
