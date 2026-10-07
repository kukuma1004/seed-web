// Private stage encounter: two paid shafts share a visible, locked firing line.
// The ordinary fighter keeps its own stats, cooldowns and personal-mark rules.
export const ICICLE_BOSS_PATTERNS=Object.freeze(['firstShaft','secondShaft','sideStep','iceSweep']);
export const isIcicleStageBoss=s=>Boolean(s.boss&&(s.inspection||s.expandedRules)&&s.fighters[1].char==='icicle');
export function resetIcicleStageBoss(s){Object.assign(s.fighters[1],{hp:285,maxHp:285,bossPhase:1,bossPattern:'',bossPatternIndex:0,bossRecovery:1,bossActiveUntil:s.time,bossWindupUntil:s.time,bossNextAt:s.time+1,bossAimX:-1,bossAimY:0,bossSide:1});}
export function canStartIcicleBossPattern(s,f,kind){
 if(kind!==ICICLE_BOSS_PATTERNS[f.bossPatternIndex]||f.stun>0||s.time<f.bossNextAt)return false;
 if(kind==='firstShaft'&&f.cd[0]>0||kind==='secondShaft'&&f.cd[1]>0)return false;
 // The second paid shaft can follow a still travelling first shaft. Other
 // phases wait for their finite physical projectiles and warning to finish.
 return kind==='secondShaft'||!s.hazards.some(h=>h.owner===f.team&&h.t>0)&&!s.shots.some(q=>q.owner===f.team&&q.life>0);
}
export function commitIcicleBossPattern(s,f,kind){
 f.bossPhase=f.hp<f.maxHp*.5?2:1;f.bossPattern=kind;
 if(kind==='firstShaft'){f.bossAimX=f.fx;f.bossAimY=f.fy;}
 const duration={firstShaft:.8,secondShaft:.8,sideStep:1.05,iceSweep:1}[kind];
 const recovery={firstShaft:.18,secondShaft:f.bossPhase===2?.42:.55,sideStep:f.bossPhase===2?.45:.6,iceSweep:f.bossPhase===2?.75:.95}[kind];
 f.bossActiveUntil=s.time+duration;f.bossNextAt=f.bossActiveUntil+recovery;
 f.bossWindupUntil=s.time+({firstShaft:.4,secondShaft:.38,sideStep:0,iceSweep:.46}[kind]);
 f.bossPatternIndex=(f.bossPatternIndex+1)%ICICLE_BOSS_PATTERNS.length;f.bossRecovery=0;
 if(kind==='iceSweep')f.bossSide*=-1;
}
export function icicleBossInput(s,f,o,input){
 f.bossPhase=f.hp<f.maxHp*.5?2:1;f.bossRecovery=s.time>=f.bossActiveUntil?Math.max(0,f.bossNextAt-s.time):0;
 if(f.stun>0)return input;
 if(s.time<f.bossNextAt){
  if(s.time<f.bossActiveUntil&&f.bossPattern==='sideStep'){input.x=-f.bossAimY*f.bossSide;input.y=f.bossAimX*f.bossSide;}
  return input;
 }
 const kind=ICICLE_BOSS_PATTERNS[f.bossPatternIndex],dx=o.x-f.x,dy=o.y-f.y,d=Math.hypot(dx,dy)||1;
 if(!canStartIcicleBossPattern(s,f,kind))return input;
 if(kind==='firstShaft'&&d>5.2||kind==='iceSweep'&&d>2.45){input.x=dx/d;input.y=dy/d;return input;}
 // Observe the opponent once for the first tell; the follow-up keeps that
 // direction even if the target has moved. No predictive retarget or free ult.
 if(kind==='secondShaft'){input.aimX=f.bossAimX;input.aimY=f.bossAimY;}
 input.bossAttack=kind;return input;
}
export function icicleBossHint(f){return f.bossRecovery>0?'반격할 틈':({firstShaft:'첫 창 · 좁은 겨울의 선',secondShaft:'두 번째 창 · 같은 선에서 옆으로',sideStep:'겨울의 옆걸음 · 무적 없는 이동',iceSweep:'가까운 얼음끝 · 준비 중 끊거나 회피하세요'}[f.bossPattern]||'겨울 약속의 파수꾼');}
