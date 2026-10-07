// Private gravity-stake encounter. It spends the playable fighter's skills;
// no parallel damage, free mark, invulnerability or predictive aim lives here.
export const STAKE_BOSS_PATTERNS=Object.freeze(['stakeInsert','stakeExtract']);
export const isStakeStageBoss=s=>Boolean(s.boss&&(s.inspection||s.expandedRules)&&s.fighters[1].char==='gravitystake');
const active=(s,f,kind)=>s.hazards.find(h=>h.owner===f.team&&h.kind===kind&&h.t>0&&!h.cancelled);
const mark=(s,f)=>{const h=active(s,f,'stakeMark');return h&&h.cast===f.fusion14Cast&&!h.triggered?h:null;};
const travelling=(s,f)=>Boolean(active(s,f,'stakeSend')||s.shots.some(q=>q.owner===f.team&&q.kind==='stakeShaft'&&q.life>0));
const broken=f=>f.stun>0||f.blocking||['attack','heavy','dash','dodge','hit','broken','stagger','jailed'].includes(f.state);
const recoveryFor=f=>f.bossPhase===2?.9:1.15;
function recover(s,f,why){
 f.bossStakeStage='recovery';f.bossStakeOutcome=why;f.bossRecovery=recoveryFor(f);
 f.bossActiveUntil=s.time;f.bossNextAt=s.time+f.bossRecovery;
 f.bossWindupUntil=s.time;f.bossPatternIndex=0;f.buffer=null;
}
export function resetStakeStageBoss(s){
 Object.assign(s.fighters[1],{hp:292,maxHp:292,bossPhase:1,bossPattern:'',bossPatternIndex:0,
  bossRecovery:1,bossActiveUntil:s.time,bossWindupUntil:s.time,bossNextAt:s.time+1,
  bossAimX:-1,bossAimY:0,bossSide:1,bossStakeStage:'recovery',bossStakeOutcome:'',
  bossStakeChoice:'',bossStakeSawMark:false,bossStakeStarted:s.time,bossStakeSeen:0,
  bossGapJabUsed:false,bossGapJabPending:false,bossGapJabComboBefore:0});
}
export function canStartStakeBossPattern(s,f,kind){
 if(!isStakeStageBoss(s)||f.team!==1||f.stun>0)return false;
 if(kind==='stakeInsert')return f.bossStakeStage==='recovery'&&s.time>=f.bossNextAt&&f.cd[0]<=0&&
  !s.hazards.some(h=>h.owner===f.team&&h.t>0)&&!s.shots.some(q=>q.owner===f.team&&q.life>0);
 if(kind==='stakeExtract')return f.bossStakeStage==='focus'&&f.bossStakeChoice==='extract'&&
  f.cd[1]<=0&&!broken(f)&&!(f.state==='skill'&&f.t>0)&&Boolean(mark(s,f));
 return false;
}
export function commitStakeBossPattern(s,f,kind){
 f.bossPhase=f.hp<f.maxHp*.5?2:1;f.bossPattern=kind;f.bossRecovery=0;
 if(kind==='stakeInsert'){
  f.bossAimX=f.fx;f.bossAimY=f.fy;f.bossStakeStage='focus';f.bossStakeChoice='';
  f.bossStakeOutcome='';f.bossStakeSawMark=false;f.bossStakeSeen=0;f.bossStakeStarted=s.time;
  f.bossGapJabUsed=false;f.bossGapJabPending=false;f.bossGapJabComboBefore=f.combo;
  // Last possible paid shaft: .46 tell + .64 travel + .58 mark + margin.
  f.bossActiveUntil=s.time+1.85;f.bossWindupUntil=s.time+.46;
  f.bossNextAt=f.bossActiveUntil+recoveryFor(f);f.bossPatternIndex=1;
 }else if(kind==='stakeExtract'){
  f.bossStakeStage='extract';f.bossStakeOutcome='extracted';
  f.bossActiveUntil=s.time+.82;f.bossWindupUntil=s.time+.4;
  f.bossNextAt=f.bossActiveUntil+recoveryFor(f);f.bossPatternIndex=0;
 }
}
export function stakeBossInput(s,f,o,input,dt=1/60){
 // A request is not an executed attack. Settle its actual host combo receipt
 // on the following AI call, including an attack interrupted later that frame.
 if(f.bossGapJabPending){
  if(f.state==='attack'||f.combo!==f.bossGapJabComboBefore)f.bossGapJabUsed=true;
  f.bossGapJabPending=false;
 }
 f.bossPhase=f.hp<f.maxHp*.5?2:1;
 f.bossRecovery=s.time>=f.bossActiveUntil?Math.max(0,f.bossNextAt-s.time):0;
 if(f.bossStakeStage==='extract'){
  if(s.time>=f.bossActiveUntil)f.bossStakeStage='recovery';
  return input;
 }
 if(f.bossStakeStage==='focus'){
  const h=mark(s,f);
  if(broken(f)){recover(s,f,'interrupted');return input;}
  if(h){
   f.bossStakeSawMark=true;
   const dx=o.x-f.x,dy=o.y-f.y,d=Math.hypot(dx,dy)||1;
   // A heavy has a late authentic cancel window. Observe it for .18 seconds
   // so the existing .4-second extraction tell still permits a queued dodge;
   // never change the player's cancellation rules or predict future input.
   // Empty/blocked insertions never reach this choice or request a paid pull.
   const threatening=d<2.65&&!o.hitDone&&(o.state==='heavy'||f.bossPhase===2&&o.state==='attack');
   f.bossStakeSeen=threatening?f.bossStakeSeen+Math.min(dt,.05):0;
   if(!f.bossStakeChoice&&f.bossStakeSeen>=(o.state==='heavy'?.18:.08))f.bossStakeChoice='extract';
   if(canStartStakeBossPattern(s,f,'stakeExtract')){
    input.aimX=dx/d;input.aimY=dy/d;input.bossAttack='stakeExtract';return input;
   }
   // Move on the observed first line's perpendicular. Never dodge or block:
   // either would really break concentration through the normal adapter.
   if(!(f.state==='skill'&&f.t>0)){
    input.x=-f.bossAimY*f.bossSide*.55;input.y=f.bossAimX*f.bossSide*.55;
   }
   input.aimX=f.bossAimX;input.aimY=f.bossAimY;
   return input;
  }
  if(f.bossStakeSawMark||!travelling(s,f)&&s.time-f.bossStakeStarted>.82||s.time>=f.bossActiveUntil){
   recover(s,f,f.bossStakeSawMark?'resolved':'missed');
  }
  return input;
 }
 if(f.stun>0||s.time<f.bossNextAt)return input;
 // The stationary recovery has completely ended. Spend this paid insertion's
 // remaining cooldown on one ordinary jab, then reopen visible spacing.
 // A live mark, another busy action or a queued input takes precedence.
 if(f.bossStakeStage==='recovery'&&f.cd[0]>0){
  if(!STAKE_BOSS_PATTERNS.includes(f.bossPattern))return input;
  if(mark(s,f)||f.blocking||f.buffer||['attack','heavy','skill','dash','leap','dodge'].includes(f.state)&&f.t>0)return input;
  const dx=o.x-f.x,dy=o.y-f.y,d=Math.hypot(dx,dy)||1;
  if(!f.bossGapJabUsed){
   if(d>2.1){input.x=dx/d;input.y=dy/d;}
   else if(!(o.state==='heavy'&&!o.hitDone)){
    input.attack=true;f.bossGapJabPending=true;f.bossGapJabComboBefore=f.combo;
   }
  }else if(d<3.2){input.x=-dx/d;input.y=-dy/d;}
  else if(d>3.6){input.x=dx/d;input.y=dy/d;}
  return input;
 }
 if(!canStartStakeBossPattern(s,f,'stakeInsert'))return input;
 const dx=o.x-f.x,dy=o.y-f.y,d=Math.hypot(dx,dy)||1;
 if(d>5.1){input.x=dx/d;input.y=dy/d;return input;}
 // Phase two changes which observed commitment can provoke extraction,
 // rather than increasing damage or removing the fixed narrow tell.
 f.bossSide*=-1;input.aimX=dx/d;input.aimY=dy/d;input.bossAttack='stakeInsert';
 return input;
}
export function stakeBossHint(f){
 if(f.bossRecovery>0)return '집중이 풀린 틈 · 반격하세요';
 if(f.bossStakeStage==='extract')return '박힌 못을 뽑는 앞선 · 옆으로 피하세요';
 if(f.bossStakeSawMark)return '집중하며 옆길 걷기 · 때려 끊거나 마지막 막기·회피';
 return '좁은 못의 삽입 · 고정된 선에서 벗어나세요';
}
