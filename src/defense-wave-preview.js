import {defenseWaveInfo,defenseSpawnKind} from './seed-defense-rules.js';

// Read the same spawn schedule as combat; no RNG, checkpoint or difficulty edits.
export function defenseWavePreview(state){
 if(!state||state.phase!=='build')return null;
 const info=defenseWaveInfo(state.wave+1,state),counts={normal:0,fast:0,shield:0,resilient:0,boss:0};
 let rear=0;
 for(let i=0;i<info.count;i++){
  const kind=defenseSpawnKind(info.wave,i,info);counts[kind]++;
  if(info.act===3&&kind!=='boss'&&i%6===5)rear++;
 }
 const advice=info.act===5?(info.final?'아르보의 부채탄을 막고, 뿌리가 예고된 씨앗을 옮기세요 · 열린 꽃심이 반격 기회예요':'금빛 뿌리 예고가 뜨면 씨앗을 다른 빈 화단으로 옮겨요 · 그대로면 잠시 공격이 묶여요'):info.boss?'문지기·보스의 후반 심장 공격에 대비하세요':
  rear?'뒤쪽 길에도 씨앗을 나눠 배치하세요':
  counts.shield&&counts.fast?'관통으로 방패를, 빙결로 빠른 적을 대비하세요':
  counts.shield?'방패는 관통으로 무시할 수 있어요':
  counts.fast?'빙결은 빠른 적의 통과를 늦춰요':
  info.wave===1?'입구 쪽부터 심어 적이 사거리 안에 오래 머물게 하세요':'긴 직선은 관통 · 굽은 길은 공전이 유리해요';
 return {wave:info.wave,act:info.act,lap:info.lap,localWave:info.localWave,title:info.title,count:info.count,counts,rear,advice};
}
