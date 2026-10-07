// Encounter pacing uses the playable fighter's paid actions. It creates no
// attacks, receipts, invulnerability or cooldown refunds of its own.
export const TWIN_STAGE_BOSSES=Object.freeze({
 'twin-gravityspear':Object.freeze({name:'낙성의 창지기',hp:292,range:2.35,batch:63,orders:[[1,0],[0,1]],followDelay:.16,recovery:[1.15,.95],hint:['중력씨앗을 향하는 창 · 옆으로 피하세요','비껴 박힌 중력씨앗 · 중심 밖으로 걸으세요']}),
 'twin-frozenhole':Object.freeze({name:'겨울핵의 파수꾼',hp:300,range:2.05,batch:65,orders:[[0,1],[1,0]],followDelay:.24,recovery:[1.2,1.0],hint:['고정된 겨울핵 · 중심을 벗어나세요','겨울핵을 가로지르는 냉기 · 빈틈을 찾으세요']}),
 'twin-returningspear':Object.freeze({name:'왕복의 수문장',hp:285,range:2.9,batch:66,orders:[[0,1],[0,1]],followDelay:.18,recovery:[1.15,.95],hint:['먼저 지나가는 창 · 창 옆에 서세요','지나온 길로 돌아오는 잎 · 같은 길을 비우세요']})
});
const plans=new WeakMap();
export const isTwinStageBoss=s=>Boolean(s.boss&&(s.inspection||s.expandedRules)&&TWIN_STAGE_BOSSES[s.fighters?.[1]?.char]);
const neutral=f=>f.stun<=0&&['idle','block'].includes(f.state);
const direction=(a,b)=>{const x=b.x-a.x,y=b.y-a.y,n=Math.hypot(x,y)||1;return{x:x/n,y:y/n};};
const serial=(f,c)=>f['twin'+c.batch+'Serial']||[0,0];
function genuineActive(s,f){
 return s.shots.some(q=>q.life>0&&q.owner===1&&q.originalOwner===1&&!q.cancelled&&q.data?.caster===f&&q.data.round===s.round&&q.data.char===f.char)
  ||s.hazards.some(h=>h.t>0&&h.owner===1&&!h.cancelled&&h.data?.caster===f&&h.data.round===s.round&&h.data.char===f.char);
}
function recover(s,f,p,c){
 p.stage='recovery';p.until=s.time+c.recovery[f.bossPhase-1];p.issued=null;p.cycle++;
 f.bossActiveUntil=s.time;f.bossNextAt=p.until;f.bossRecovery=p.until-s.time;f.bossPattern='recovery';f.buffer=null;
}
export function resetTwinStageBoss(s){
 if(!isTwinStageBoss(s))return false;
 const f=s.fighters[1],c=TWIN_STAGE_BOSSES[f.char];
 Object.assign(f,{hp:c.hp,maxHp:c.hp,bossPhase:1,bossPattern:'recovery',bossRecovery:1,bossActiveUntil:s.time,bossWindupUntil:s.time,bossNextAt:s.time+1});
 plans.set(s,{round:s.round,caster:f,stage:'recovery',until:s.time+1,issued:null,cycle:0,index:0,aim:{x:-1,y:0},started:s.time,accepted:s.time});
 return true;
}
export function twinBossInput(s,f,o){
 if(!isTwinStageBoss(s)||f!==s.fighters[1])return{};
 const p=plans.get(s),c=TWIN_STAGE_BOSSES[f.char];
 if(!p||p.round!==s.round||p.caster!==f||f.hp<=0||o.hp<=0||s.phase!=='fight')return{};
 f.bossPhase=f.hp<f.maxHp*.5?2:1;
 const v=direction(f,o),input={aimX:p.aim.x,aimY:p.aim.y};
 if(p.issued){
  if(serial(f,c)[p.issued.slot]>p.issued.serial){p.accepted=s.time;p.stage=p.index===0?'first':'last';p.issued=null;}
  else if(!neutral(f)||s.time-p.issued.at>.16){recover(s,f,p,c);return{};}
  else return input;
 }
 if(p.stage==='recovery'){
  f.bossRecovery=Math.max(0,p.until-s.time);
  if(s.time<p.until||!neutral(f))return{};
  if(genuineActive(s,f))return{};
  if(Math.hypot(o.x-f.x,o.y-f.y)>c.range){return{aimX:v.x,aimY:v.y,x:v.x,y:v.y};}
  p.aim=v;p.order=c.orders[f.bossPhase-1];p.index=0;p.started=s.time;p.stage='ready';
 }
 if(p.stage==='first'){
  if(f.stun>0||f.hp<=0||!genuineActive(s,f)){recover(s,f,p,c);return{};}
  if(!neutral(f)||s.time-p.accepted<c.followDelay)return input;
  p.index=1;p.stage='ready';
 }
 if(p.stage==='last'){
  if(f.stun>0||!genuineActive(s,f)||s.time-p.started>4){recover(s,f,p,c);return{};}
  return input;
 }
 if(p.stage==='ready'&&neutral(f)){
  const slot=p.order[p.index];
  if(f.cd[slot]>0){recover(s,f,p,c);return{};}
  p.issued={slot,serial:serial(f,c)[slot],at:s.time};
  f.bossPattern='skill'+slot;f.bossRecovery=0;f.bossWindupUntil=s.time+.3;f.bossActiveUntil=s.time+4;
  return{aimX:p.aim.x,aimY:p.aim.y,[slot?'skill2':'skill1']:true};
 }
 return input;
}
export function twinBossHint(f){
 const c=TWIN_STAGE_BOSSES[f.char];if(!c)return'';
 return f.bossPattern==='recovery'?'힘을 거두는 동안 반격하세요':c.hint[Number(f.bossPattern==='skill1')];
}
