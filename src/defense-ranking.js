import {createBestRanking} from './best-ranking.js';
import {FIREBASE} from './online-ranking.js';
import {cleanName} from './score.js';
import {isBadName} from './name-filter.js';
import {ALL_FORMS} from './forms.js';
import {LAWS} from './laws.js';

export const DEFENSE_RANK_PATH='seedDefenseRanking/v1';
const integer=(v,min,max)=>Number.isInteger(v)&&v>=min&&v<=max;
// Completed waves dominate core health, which dominates kills. Equal results tie.
export const defenseRankScore=e=>e.cleared*100000+e.hp*1000+e.kills;
export function parseDefenseTowers(text){
 if(typeof text!=='string'||text.length>400)return null;
 const rows=text.split(',').map(s=>s.split(':'));
 if(rows.length<1||rows.length>8||rows.some(([id,lv,...extra])=>extra.length||!(id==='seed'||Object.hasOwn(LAWS,id)||Object.hasOwn(ALL_FORMS,id))||! /^[1-5]$/.test(lv||'')))return null;
 return rows.map(([id,lv])=>[id,Number(lv)]);
}
export function validDefenseRank(e){
 return Boolean(e&&typeof e.uid==='string'&&e.uid&&typeof e.name==='string'&&e.name&&cleanName(e.name)===e.name&&!isBadName(e.name)
  &&integer(e.cleared,0,12)&&integer(e.hp,0,20)&&integer(e.kills,0,345)&&integer(e.time,1,100000)
  &&(e.cleared===12?e.hp>0:e.hp===0)&&integer(e.score,1,1220345)&&e.score===defenseRankScore(e)
  &&parseDefenseTowers(e.towers));
}
export function defenseRankEntry(state,{uid,name}){
 if(!['won','lost'].includes(state.phase))return null;
 const entry={uid,name:cleanName(name),cleared:state.phase==='won'?12:Math.max(0,state.wave-1),hp:state.phase==='won'?Math.max(1,Math.floor(state.coreHp)):0,kills:state.kills,time:Math.max(1,Math.ceil(state.time)),towers:state.towers.map(t=>`${t.formId||t.laws[0]||'seed'}:${t.level}`).join(',')};
 entry.score=defenseRankScore(entry);return validDefenseRank(entry)?entry:null;
}
export const defensePlaces=rows=>rows.sort((a,b)=>b.score-a.score||a.uid.localeCompare(b.uid)).map((e,i,all)=>({...e,rank:all.findIndex(v=>v.score===e.score)+1}));
export function createDefenseRanking(options={}){
 return createBestRanking({config:FIREBASE,...options,path:DEFENSE_RANK_PATH,pendingPrefix:'seed-defense-rank-pending-v1:',valid:validDefenseRank,places:defensePlaces});
}
