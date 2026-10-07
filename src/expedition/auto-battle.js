import {expeditionCombatTurn,performExpeditionCombatAction} from './combat.js';

const active=u=>u.hp>0&&!u.dead&&u.slot<5;

// Four bounded, disposable previews per paid turn, never per animation frame.
// Use the real rule executor so conditional follow-ups, exact recipients,
// shield caps and pending-return limits cannot drift into a second combat rule.
function actionScore(before,after,actor){
 let score=0;
 const scale=Math.max(1,actor.power);
 for(const unit of before.units){
  const next=after.units.find(u=>u.id===unit.id);
  if(!next)continue;
  if(unit.side==='enemy'){
   score+=(unit.hp-next.hp)/scale;
   // Breaking protection advances the fight even when HP is unchanged.
   score+=(unit.status.protection-next.status.protection)/scale*.75;
   if(unit.hp>0&&next.hp===0)score+=.65;
   score+=Math.max(0,next.status.chill-unit.status.chill)*.2;
   score+=Math.max(0,next.status.vulnerable-unit.status.vulnerable)*.18;
   if(!unit.status.conductive&&next.status.conductive&&before.units.some(u=>u.side==='enemy'&&u.id!==unit.id&&active(u)))score+=.18;
   if(!before.delayed.includes(unit.id)&&after.delayed.includes(unit.id))score+=.25;
  }else{
   score+=(next.hp-unit.hp)/scale;
   if(unit.hp>0&&next.hp===0)score-=4;
   // A full shield is worth zero; useful new protection is less valuable
   // than dealing damage, preventing an indefinite defensive cast loop.
   score+=(next.status.protection-unit.status.protection)/scale*.2;
   if(next.counter.uses&&!unit.counter.uses)score+=next.counter.ratio*.3;
  }
 }
 for(const pending of after.pending){
  if(pending.ownerId!==actor.id||before.pending.some(p=>p.ownerId===pending.ownerId&&p.targetId===pending.targetId&&p.dueRound===pending.dueRound&&p.op===pending.op&&p.kind===pending.kind))continue;
  const target=after.units.find(u=>u.id===pending.targetId);
  if(!target||!active(target)||target.side!=='enemy')continue;
  const raw=Math.max(0,actor.power===0||pending.ratio===0?0:Math.max(1,Math.round(actor.power*pending.ratio-target.defense)));
  // Do not keep reserving damage on a body already covered by returns.
  const reserved=before.pending.filter(p=>p.targetId===target.id).reduce((sum,p)=>{
   const owner=before.units.find(u=>u.id===p.ownerId);
   return sum+(owner&&owner.hp>0&&!owner.dead?Math.max(0,owner.power*p.ratio-target.defense):0);
  },0);
  score+=Math.min(raw,Math.max(0,target.hp+target.status.protection-reserved))/scale*.7;
 }
 return score;
}

// Choose an ordinary paid action. Previews commit no damage, extra turns,
// stat boost or result shortcut; the controller validates and saves the choice.
export function expeditionAutoBattleIntent(battle,{targetId}={}){
 const actor=battle&&expeditionCombatTurn(battle);
 if(!actor||actor.side!=='ally')return null;
 const enemies=battle.units.filter(u=>u.side==='enemy'&&active(u));
 if(!enemies.length)return {type:'action',kind:'guard'};
 const front=enemies.filter(u=>u.slot<2),pool=front.length?front:enemies;
 const target=pool.find(u=>u.id===targetId)||pool.reduce((best,u)=>u.hp<best.hp?u:best,pool[0]);
 const warned=battle.warnings?.some(w=>w.targetId===actor.id&&w.readyRound<=battle.round);
 if(warned&&actor.hp/actor.maxHp<.45)return {type:'action',kind:'guard'};
 let best={kind:'attack',score:-1};
 for(const kind of ['attack','skill1','skill2','awaken']){
  if(kind==='skill2'&&actor.level<5||kind==='awaken'&&(actor.level<8||actor.awakenUsed))continue;
  // The rule executor restores a deep copy before executing any operation.
  // A shallow disposable envelope avoids an unnecessary extra full copy.
  const preview={...battle};
  let id=`auto-preview:${battle.actionCount}:${kind}`;
  while(battle.seen.includes(id))id+='x';
  const result=performExpeditionCombatAction(preview,{id,unitId:actor.id,kind,targetId:target.id});
  if(!result.ok)continue;
  let score=actionScore(battle,preview,actor);
  // Keep a one-use awakening for the boss or a surviving crowd.
  if(kind==='awaken'&&!enemies.some(u=>u.boss)&&enemies.length<3)score*=.45;
  if(score>best.score){best={kind,score};}
 }
 return {type:'action',kind:best.kind,targetId:target.id};
}
