// Private stage encounter. Every attack spends the playable pulsegravity's
// existing skill or ordinary melee; no second well, free pulse or homing tell.
export const isPulseStageBoss=s=>Boolean(s.boss&&(s.inspection||s.expandedRules)&&s.fighters[1].char==='pulsegravity');
const ownWell=(s,f)=>s.hazards.find(h=>h.kind==='pulseWell20'&&h.owner===f.team&&h.cast===f.final20Cast&&h.t>0);
const live=(s,f)=>s.hazards.some(h=>h.owner===f.team&&h.t>0&&!h.cancelled)||s.shots.some(q=>q.owner===f.team&&q.life>0);
const idle=f=>f.stun<=0&&!f.blocking&&!(f.state==='skill'&&f.t>0)&&!['attack','heavy','dodge','dash','hit','broken','stagger','jailed'].includes(f.state);
function recover(s,f,why){
 f.bossPulseStage='recovery';f.bossPulseOutcome=why;f.bossActiveUntil=s.time;
 f.bossRecovery=f.bossPhase===2?.85:1.1;f.bossNextAt=s.time+f.bossRecovery;
 f.bossWindupUntil=s.time;f.buffer=null;
}
export function resetPulseStageBoss(s){Object.assign(s.fighters[1],{
 hp:288,maxHp:288,bossPhase:1,bossPattern:'',bossRecovery:1,
 bossActiveUntil:s.time,bossNextAt:s.time+1,bossWindupUntil:s.time,
 bossPulseStage:'recovery',bossPulseOutcome:'',bossPulseStarted:s.time,
 bossPulseSide:1,bossPulseSeen:0,bossPulseJabUsed:false,bossPulseJabPending:false,
 bossPulseComboBefore:0,bossAimX:-1,bossAimY:0,bossPatternIndex:0
});}
export function canStartPulseBossPattern(s,f,kind){
 if(!isPulseStageBoss(s)||f.team!==1||!idle(f))return false;
 if(kind==='pulsePlant')return f.bossPulseStage==='recovery'&&s.time>=f.bossNextAt&&f.cd[0]<=0&&!live(s,f);
 if(kind==='pulseClose'){const h=ownWell(s,f);return f.bossPulseStage==='watch'&&f.cd[1]<=0&&Boolean(h&&h.earned>0&&h.pulses<3);}
 return false;
}
export function commitPulseBossPattern(s,f,kind){
 f.bossPhase=f.hp<f.maxHp*.5?2:1;f.bossPattern=kind;f.bossRecovery=0;
 f.bossPulseStage=kind==='pulsePlant'?'watch':'closing';f.bossPulseOutcome='';
 if(kind==='pulsePlant'){
  f.bossPulseStarted=s.time;f.bossPulseSeen=0;f.bossPulseJabUsed=false;f.bossPulseJabPending=false;
  f.bossAimX=f.fx;f.bossAimY=f.fy;f.bossPulseSide*=-1;
  f.bossWindupUntil=s.time+.4;f.bossActiveUntil=s.time+2.85;f.bossNextAt=f.bossActiveUntil+1.1;
 }else{f.bossWindupUntil=s.time+.3;f.bossActiveUntil=s.time+.75;f.bossNextAt=f.bossActiveUntil+1.1;}
}
export function pulseBossInput(s,f,o,input,dt=1/60){
 if(f.bossPulseJabPending){if(f.state==='attack'||f.combo!==f.bossPulseComboBefore)f.bossPulseJabUsed=true;f.bossPulseJabPending=false;}
 f.bossPhase=f.hp<f.maxHp*.5?2:1;
 f.bossRecovery=s.time>=f.bossActiveUntil?Math.max(0,f.bossNextAt-s.time):0;
 const dx=o.x-f.x,dy=o.y-f.y,d=Math.hypot(dx,dy)||1;
 if(f.bossPulseStage==='closing'){
  if(s.time>=f.bossActiveUntil&&!live(s,f))recover(s,f,'closed');
  return input;
 }
 if(f.bossPulseStage==='watch'){
  if(!live(s,f)&&s.time-f.bossPulseStarted>.5){recover(s,f,'resolved-or-interrupted');return input;}
  const h=ownWell(s,f);
  if(h){
   // Observe an actual committed heavy, not future input. Phase2 can also
   // observe a light swing. The .3 tell remains fixed and legally escapable.
   const near=Math.hypot(o.x-h.x,o.y-h.y)<.55;
   const committed=!o.hitDone&&(o.state==='heavy'||f.bossPhase===2&&o.state==='attack');
   f.bossPulseSeen=near&&committed?f.bossPulseSeen+Math.min(dt,.05):0;
   // .58 heavy becomes cancellable with .06 remaining. Observe .26 before
   // the fixed .3 closing tell so a queued legal dodge can execute first.
   // A phase2 light windup is much shorter; observe it before its real hit.
   const observedFor=o.state==='attack'?.08:.26;
   if(f.bossPulseSeen>=observedFor&&canStartPulseBossPattern(s,f,'pulseClose')){input.bossAttack='pulseClose';return input;}
   // Circle the already released position. Its center never follows this
   // movement and movement itself grants no dodge, invulnerability or hit.
   if(idle(f)){input.x=-f.bossAimY*f.bossPulseSide*.5;input.y=f.bossAimX*f.bossPulseSide*.5;}
  }
  return input;
 }
 if(f.stun>0||s.time<f.bossNextAt||!idle(f))return input;
 if(canStartPulseBossPattern(s,f,'pulsePlant')){
  if(d>4.8){input.x=dx/d;input.y=dy/d;return input;}
  // A close approach should create an interruptible planting opportunity,
  // rather than an endless retreat against a faster melee opponent.
  if(d<1.8){input.x=-dx/d;input.y=-dy/d;return input;}
  input.aimX=dx/d;input.aimY=dy/d;input.bossAttack='pulsePlant';return input;
 }
 // An ended paid cycle gives one real melee attempt during its remaining
 // cooldown. Observed execution, rather than a request, spends that attempt.
 if(f.bossPattern==='pulsePlant'||f.bossPattern==='pulseClose'){
  if(!f.bossPulseJabUsed&&f.cd[0]>.7){
   input.aimX=dx/d;input.aimY=dy/d;
   if(d>1.7){input.x=dx/d;input.y=dy/d;}
   else{input.attack=true;f.bossPulseJabPending=true;f.bossPulseComboBefore=f.combo;}
  }else if(d<3.2){input.x=-dx/d;input.y=-dy/d;}
 }
 return input;
}
export function pulseBossHint(f){return f.bossRecovery>0?'반격할 틈':f.bossPulseStage==='closing'?'맥동을 포기한 닫힘 · 좁은 원을 벗어나세요':f.bossPulseStage==='watch'?'세 박자의 고정 원 · 점점 좁아져요':'세 박자의 정원사 · 씨앗의 낙점을 보세요';}
