import {BREAKTHROUGH_ROSTER,BREAKTHROUGH_LIMITS} from './seed-breakthrough-rules.js';
import {DUEL_BASE_CHARACTERS} from './duel-base-characters.js';

// A result describes earned choices only; it neither creates progress nor rewards.
export function breakthroughRunSummary(run){
 const character=run?.player?.char;
 if(!BREAKTHROUGH_ROSTER.includes(character))return null;
 const next=BREAKTHROUGH_ROSTER[(BREAKTHROUGH_ROSTER.indexOf(character)+1)%BREAKTHROUGH_ROSTER.length];
 const camps=(run.camps||[]).filter(c=>c.captured).length;
 return {character,name:DUEL_BASE_CHARACTERS[character].name,next,nextName:DUEL_BASE_CHARACTERS[next].name,
  growth:(run.growth||[]).map(g=>({name:g.name,description:g.description})),camps,
  seconds:Math.floor(Math.max(0,Math.min(BREAKTHROUGH_LIMITS.seconds,run.time||0))),
  note:run.phase==='won'?'두 거점과 마지막 장수를 돌파했어요.':
   run.time>=BREAKTHROUGH_LIMITS.seconds?'시간이 끝났어요 · 다음엔 거점의 장수를 먼저 노려 보세요.':
   camps===0?'첫 거점의 장수를 쓰러뜨리면 싸움법을 고를 수 있어요.':
   camps===1?'두 번째 거점을 탈환하면 마지막 장수가 나타나요.':'장수의 붉은 예고를 피하고 빈틈에 기술을 써 보세요.'};
}
