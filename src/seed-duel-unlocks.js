import {DUEL_STORY_STAGES} from './seed-duel-story.js';
import {normalizeDuelStory} from './seed-duel-story-progress.js';

// Derive unlocks from permanent campaign clears, not a second mutable counter.
// A starter remains playable before the first (mirror) training encounter.
export const DUEL_STARTER='pierce';
const encounters=new Map(DUEL_STORY_STAGES.map(stage=>[stage.enemy,stage]));
export function duelCharacterUnlock(progress,id,{inspection=false}={}){
 const stage=encounters.get(id);
 const starter=id===DUEL_STARTER;
 const unlocked=inspection||starter||Boolean(stage&&normalizeDuelStory(progress).cleared[stage.id]);
 return {unlocked,starter,stage,description:inspection?'로컬 검토':starter?'처음부터 함께하는 씨앗':unlocked?'이야기 승리 · 선택 가능':stage?`이야기 ${stage.number} · ${stage.title} 승리 시 해금`:'이야기 준비 중'};
}
