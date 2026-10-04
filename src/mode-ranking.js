// Online best records for the three game modes that were missing a board.
// Each mode keeps one best line per authenticated account, just like survival
// and defence. The score is derived from the mode result so it cannot be
// chosen independently by the client.
import {createBestRanking} from './best-ranking.js';
import {FIREBASE} from './online-ranking.js';
import {cleanName} from './score.js';
import {isBadName} from './name-filter.js';
import {DUEL_STORY_STAGE_COUNT} from './seed-duel-story-progress.js';

export const MODE_RANK_PATHS=Object.freeze({
 adventure:'seedModeRanking/adventure',
 duel:'seedModeRanking/duel',
 puzzle:'seedModeRanking/puzzle'
});
const integer=(v,min,max)=>Number.isInteger(v)&&v>=min&&v<=max;
const text=(v,max)=>typeof v==='string'&&v.length<=max;
const nameOk=e=>typeof e?.uid==='string'&&e.uid&&typeof e.name==='string'&&e.name&&cleanName(e.name)===e.name&&!isBadName(e.name);
const placeRows=rows=>rows.sort((a,b)=>b.score-a.score||a.uid.localeCompare(b.uid)).map((e,i,all)=>({...e,rank:all.findIndex(v=>v.score===e.score)+1}));
const clamp=(v,min,max)=>Math.max(min,Math.min(max,v));

export function adventureRankScore(e){
 return e.room*1_000_000+e.bosses*100_000+e.kills*100+e.level*100+clamp(10_000-e.time,0,10_000);
}
export function validAdventureRank(e){
 return Boolean(nameOk(e)&&integer(e.room,1,12)&&integer(e.kills,0,100_000)&&integer(e.bosses,0,3)&&integer(e.level,1,100)&&integer(e.time,1,86_400)&&text(e.weapon,12)&&text(e.laws,120)&&text(e.form,80)&&integer(e.score,1,30_000_000)&&e.score===adventureRankScore(e));
}
export function adventureRankEntry(state,{uid,name}){
 if(!state||!['won','lost'].includes(state.phase))return null;
 const e={uid,name:cleanName(name),room:state.phase==='won'?12:Math.max(1,Math.min(12,state.room+1)),kills:Math.max(0,Math.floor(state.kills||0)),bosses:Math.max(0,Math.min(3,Math.floor(state.bossesDefeated||0))),level:Math.max(1,Math.floor(state.level||1)),time:Math.max(1,Math.ceil(state.time||1)),weapon:state.weapon||'',laws:Array.isArray(state.laws)?state.laws.join(','):String(state.laws||''),form:state.formId||''};
 e.score=adventureRankScore(e);return validAdventureRank(e)?e:null;
}

const difficultyValue=Object.freeze({easy:1,normal:2,hard:3});
export function duelRankScore(e){
 return e.storyStage*100_000+e.wins*10_000+Math.max(0,e.wins-e.losses)*1_000+e.difficulty*100+clamp(1_000-e.time,0,1_000);
}
export function validDuelRank(e){
 return Boolean(nameOk(e)&&integer(e.storyStage,0,DUEL_STORY_STAGE_COUNT)&&integer(e.wins,0,2)&&integer(e.losses,0,2)&&e.wins+e.losses>=1&&integer(e.difficulty,1,3)&&integer(e.time,1,1_000)&&text(e.character,20)&&text(e.opponent,20)&&integer(e.score,1,DUEL_STORY_STAGE_COUNT*100_000+23_300)&&e.score===duelRankScore(e));
}
export function duelRankEntry(state,{uid,name,storyStage=0}){
 if(!state||state.phase!=='over'||state.winner<0)return null;
 const e={uid,name:cleanName(name),storyStage:Math.max(0,Math.min(DUEL_STORY_STAGE_COUNT,Math.floor((state.winner===0?storyStage:Math.max(0,storyStage-1))||0))),wins:Math.max(0,Math.min(2,Math.floor(state.wins?.[0]||0))),losses:Math.max(0,Math.min(2,Math.floor(state.wins?.[1]||0))),difficulty:difficultyValue[state.difficulty]||2,time:Math.max(1,Math.ceil(state.time||1)),character:state.fighters?.[0]?.char||'',opponent:state.fighters?.[1]?.char||''};
 e.score=duelRankScore(e);return validDuelRank(e)?e:null;
}

export function puzzleRankScore(e){return e.totalStars*100_000+e.bestStreak*1_000+clamp(e.latestScore,0,99_999);}
export function validPuzzleRank(e){
 return Boolean(nameOk(e)&&integer(e.totalStars,0,2_997)&&integer(e.bestStreak,0,999)&&integer(e.latestStage,1,999)&&integer(e.latestStars,0,3)&&integer(e.latestScore,0,99_999)&&integer(e.score,1,400_000_000)&&e.score===puzzleRankScore(e));
}
export function puzzleRankEntry(progress,{uid,name,stage=1,stars=0,score=0}){
 const stages=progress&&typeof progress.stages==='object'?progress.stages:{};
 const totalStars=Object.values(stages).reduce((sum,v)=>sum+Math.max(0,Math.min(3,Math.floor(v?.stars||0))),0);
 const e={uid,name:cleanName(name),totalStars,bestStreak:Math.max(0,Math.min(999,Math.floor(progress?.bestStreak||0))),latestStage:Math.max(1,Math.min(999,Math.floor(stage||1))),latestStars:Math.max(0,Math.min(3,Math.floor(stars||0))),latestScore:Math.max(0,Math.min(99_999,Math.floor(score||0)))};
 e.score=puzzleRankScore(e);return validPuzzleRank(e)?e:null;
}

const create=(kind,valid,prefix,options={})=>createBestRanking({config:FIREBASE,path:MODE_RANK_PATHS[kind],pendingPrefix:prefix,valid,places:placeRows,...options});
export const createAdventureRanking=options=>create('adventure',validAdventureRank,'seed-adventure-rank-pending-v1:',options);
export const createDuelRanking=options=>create('duel',validDuelRank,'seed-duel-rank-pending-v1:',options);
export const createPuzzleRanking=options=>create('puzzle',validPuzzleRank,'seed-puzzle-rank-pending-v1:',options);
