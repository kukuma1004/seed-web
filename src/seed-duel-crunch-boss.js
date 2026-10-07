// Authored stage-boss adapter, private review only. Ordinary fighter data is
// untouched; attacks pass through the same paid skill/hit/guard rules.
export function isCrunchStageBoss(s){return s.boss&&(s.inspection||s.expandedRules)&&s.fighters[1].char==='bigcrunch';}
export function resetCrunchStageBoss(s){Object.assign(s.fighters[1],{hp:300,maxHp:300,bossPhase:1,bossPattern:'',bossPatternIndex:0,bossRecovery:1,bossWindupUntil:s.time,bossActiveUntil:s.time,bossNextAt:s.time+1});}
export const CRUNCH_BOSS_PATTERNS=Object.freeze(['pairedWells','slowSeed','crunchSlam']);
export function canStartCrunchBossPattern(s,f,kind){return kind===CRUNCH_BOSS_PATTERNS[f.bossPatternIndex]&&f.stun<=0&&s.time>=f.bossNextAt&&!s.hazards.some(h=>h.owner===f.team&&h.t>0)&&!s.shots.some(q=>q.owner===f.team&&q.life>0);}
export function commitCrunchBossPattern(s,f,kind){
 const duration={pairedWells:2.4,slowSeed:2.3,crunchSlam:1}[kind];
 f.bossPhase=f.hp<f.maxHp*.5?2:1;f.bossPattern=kind;f.bossActiveUntil=s.time+duration;
 f.bossWindupUntil=s.time+(kind==='pairedWells'?.6:kind==='slowSeed'?.38:.46);
 f.bossNextAt=f.bossActiveUntil+(f.bossPhase===2?.9:1.15);
 f.bossPatternIndex=(f.bossPatternIndex+1)%CRUNCH_BOSS_PATTERNS.length;f.bossRecovery=0;
}
export function crunchBossInput(s,f,o,input,dt){
 f.bossPhase=f.hp<f.maxHp*.5?2:1;
 f.bossRecovery=s.time>=f.bossActiveUntil?Math.max(0,f.bossNextAt-s.time):0;
 if(f.stun>0)return input;
 const dx=o.x-f.x,dy=o.y-f.y,d=Math.hypot(dx,dy)||1;
 if(s.time<f.bossNextAt){
  // The released wells stay fixed while the caster approaches. This pressure
  // ends completely in the displayed recovery window; preparation remains
  // interruptible and ordinary melee is still guard/parry/dodge counterable.
  if(s.time>=f.bossActiveUntil||s.time<f.bossWindupUntil||f.state==='skill'&&f.t>0)return input;
  const ai=s.ai[f.team];ai.crunchBossHeavy=o.state==='heavy'&&!o.hitDone&&d<3?(ai.crunchBossHeavy||0)+dt:0;
  if(ai.crunchBossHeavy>=.2&&f.dodgeCd<=0){input.x=-dy/d;input.y=dx/d;input.dodge=true;return input;}
  if(d>1.95){input.x=dx/d;input.y=dy/d;}else input.attack=true;
  return input;
 }
 // An armed well or a travelling seed finishes before the next pattern. No
 // teleport, tracking warning, invulnerability, free ultimate or charge.
 const kind=CRUNCH_BOSS_PATTERNS[f.bossPatternIndex];
 if(!canStartCrunchBossPattern(s,f,kind))return input;
 if(kind==='crunchSlam'&&d>2.45||kind!=='crunchSlam'&&d>5.2){input.x=dx/d;input.y=dy/d;return input;}
 if(kind==='pairedWells'&&f.cd[0]>0||kind==='slowSeed'&&f.cd[1]>0)return input;
 if(kind==='pairedWells'&&d>3.3){const a=Math.atan2(dy,dx)+Math.asin(1.65/d);input.aimX=Math.cos(a);input.aimY=Math.sin(a);}
 input.bossAttack=kind;return input;
}
export function crunchBossHint(f){return f.bossRecovery>0?'반격할 틈':({pairedWells:'두 붕괴 우물 · 가운데 빈 길로',slowSeed:'느린 붕괴구 · 옆으로 피하세요',crunchSlam:'내려치기 · 준비 중 끊거나 회피하세요'}[f.bossPattern]||'두 우물 사이에 남긴 길');}
