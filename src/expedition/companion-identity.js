import {getExpeditionSpecies} from './species.js';
import {expeditionCombatTurn,performExpeditionCombatAction} from './combat.js';

// A read-only advisor for the actions already stored in a battle. It never
// compiles a passive, changes a receipt, unlocks a character, or adds a turn.
// One disposable rule-executor preview per decision; never an animation tick.
const roles=Object.freeze({
 burst:{name:'무리 파괴',tactic:'모인 적에게 불씨를 예약해 다음 라운드에 터뜨려요.',partners:'중력의 집결 · 연쇄의 전도'},
 pierce:{name:'열 관통',tactic:'앞뒤로 겹친 적을 골라 한 열을 꿰뚫어요.',partners:'중력의 집결 · 얼음의 봉쇄'},
 split:{name:'갈래 압박',tactic:'적이 여럿 남았을 때 파편을 나눠 압박해요.',partners:'폭발의 무리 파괴 · 연쇄의 전도'},
 gravity:{name:'진형 흔들기',tactic:'빈 전열로 적을 끌어와 동료가 공격할 길을 열어요.',partners:'관통의 열 공격 · 폭발의 불씨'},
 chain:{name:'전도 연결',tactic:'여러 적에게 전도를 심어 동료의 다음 타격을 연결해요.',partners:'분열의 다중 타격 · 얼음의 봉쇄'},
 frost:{name:'행동 봉쇄',tactic:'냉기가 쌓인 적을 다시 얼려 행동을 늦춰요. 보스는 행동 순서가 밀려요.',partners:'연쇄의 전도망 · 관통의 열 공격'},
 orbit:{name:'동료 호위',tactic:'다친 동료에게 보호막을 보내 다음 공격을 버티게 해요.',partners:'전열의 공격 씨앗 · 반사의 반격'},
 reflect:{name:'예고 반격',tactic:'맞을 차례를 읽고 반격을 준비해요. 위험하면 방어해요.',partners:'공전의 보호막 · 중력의 표식'},
 recall:{name:'예약 유격',tactic:'귀환 공격이 이미 충분한 적을 피해 다른 표적에 다음 타격을 예약해요.',partners:'관통의 열 공격 · 폭발의 시간차 공격'}
});
const identities=new Map();
export function expeditionCompanionIdentity(speciesId){
 if(identities.has(speciesId))return identities.get(speciesId);
 const species=getExpeditionSpecies(speciesId);if(!species)return null;
 const role=roles[species.dominantLaw];if(!role)return null;
 const identity=Object.freeze({speciesId:species.id,law:species.dominantLaw,name:role.name,
  tactic:species.kind==='twin'?'함께 살아 돌아온 두 씨앗이 전투 중 한 번 공명해요.':role.tactic,
  partners:role.partners,signature:species.trigger});
 identities.set(speciesId,identity);return identity;
}
const active=u=>u.hp>0&&!u.dead&&u.slot<5;
const column=u=>u.slot===4?2:u.slot%2;
const order=(a,b)=>a.slot-b.slot||a.id.localeCompare(b.id);
const reserved=(battle,target)=>battle.pending.reduce((sum,p)=>{
 const owner=battle.units.find(u=>u.id===p.ownerId);
 return p.targetId===target.id&&owner&&owner.hp>0&&!owner.dead?sum+Math.max(0,owner.power*p.ratio-target.defense):sum;
},0);
const enemyOps=operations=>operations.filter(o=>!['self','ally'].includes(o.target));
function targetsFor(actor,operations,enemies){
 const ops=enemyOps(operations);
 if(!ops.length)return [];
 // A front blocker still matters. A rear target is considered only when all
 // operations aimed at the other side can legally reach it in the real rules.
 return ops.some(o=>o.target==='single'&&!o.ignoreFront)&&enemies.some(u=>u.slot<2)?enemies.filter(u=>u.slot<2):enemies;
}
function usefulPreview(battle,actor,kind,targetId){
 const preview={...battle};let id=`companion-preview:${battle.actionCount}:${kind}`;
 // Seen contains <=1024 accepted IDs. Finite search also handles maliciously
 // matching imported receipts without touching their immutable identities.
 for(let n=0;battle.seen.includes(id)&&n<=1024;n++)id=`companion-preview:${battle.actionCount}:${kind}:${n}`;
 const result=performExpeditionCombatAction(preview,{id,unitId:actor.id,kind,...(targetId?{targetId}:{})});
 return result.ok&&result.events.some(e=>e.type==='guard'||e.type==='damage'&&(e.amount>0||e.absorbed>0)
  ||e.type==='protection'&&e.amount>0||['returnWarning','counterReady','pull','bossDelay','frozenSkip'].includes(e.type)
  ||['chill','conductive','vulnerable'].includes(e.type)&&e.amount>0);
}

export function expeditionCompanionIntent(battle,actor= battle&&expeditionCombatTurn(battle)){
 if(!battle||!Array.isArray(battle.units)||battle.units.length>16||battle.phase!=='fight'
  ||!actor||actor.side!=='ally'||!active(actor)||expeditionCombatTurn(battle)?.id!==actor.id)return null;
 const species=getExpeditionSpecies(actor.speciesId);if(!species||species.kind==='twin')return null;
 const enemies=battle.units.filter(u=>u.side==='enemy'&&active(u)).sort(order);
 const allies=battle.units.filter(u=>u.side==='ally'&&active(u)).sort(order);
 if(!enemies.length)return null;
 const law=species.dominantLaw,warned=battle.warnings.some(w=>w.targetId===actor.id&&w.readyRound<=battle.round);
 if(warned&&actor.hp/actor.maxHp<.45)return {type:'action',kind:'guard'};
 let chosen=null,best=-Infinity;
 for(const kind of ['skill1','skill2']){
  if(kind==='skill2'&&actor.level<5)continue;
  const ops=actor.actions?.[kind];if(!Array.isArray(ops)||!ops.length||ops.length>8)continue;
  const pool=enemyOps(ops).length?targetsFor(actor,ops,enemies):ops.every(o=>o.target==='self')?[actor]:allies;
  for(const target of pool){
   let score=-Infinity;
   if(law==='orbit'&&!enemyOps(ops).length&&ops.some(o=>o.type==='protection'&&o.target==='ally')
    &&target.hp/target.maxHp<.7&&target.status.protection<actor.power*.7)
    score=(1-target.hp/target.maxHp)*4+Number(battle.warnings.some(w=>w.targetId===target.id));
   if(law==='pierce'&&ops.some(o=>o.type==='damage'&&o.target==='column')){
    const count=enemies.filter(u=>column(u)===column(target)).length;if(count>=2)score=count+ops.filter(o=>o.type==='damage').reduce((n,o)=>n+o.ratio,0);
   }
   if(law==='split'&&enemies.length>=2&&ops.some(o=>o.type==='split'))score=enemies.length+ops.filter(o=>o.type==='split').reduce((n,o)=>n+o.ratio,0);
   if(law==='burst'&&enemies.length>=3&&ops.some(o=>o.type==='return'&&['all','adjacent'].includes(o.target))
    &&reserved(battle,target)<target.hp+target.status.protection)score=3-reserved(battle,target)/Math.max(1,target.hp);
   if(law==='gravity'&&!target.boss&&target.slot>=2&&target.slot<4&&ops.some(o=>o.type==='pull')
    &&!enemies.some(u=>u.slot===target.slot%2))score=3+Number(!target.status.vulnerable);
   if(law==='chain'&&enemies.length>=2&&ops.some(o=>o.type==='conductive')&&target.status.conductive<3)
    score=2+Number(target.status.conductive===0)+Number(enemies.some(u=>u.id!==target.id&&u.status.conductive>0));
   if(law==='frost'&&target.status.chill>0&&ops.some(o=>o.type==='chill')){
    const added=ops.filter(o=>o.type==='chill').reduce((n,o)=>n+(o.amount??o.stacks??1),0);
    if(target.status.chill+added>=3)score=3+Number(target.boss);
   }
   if(law==='reflect'&&(warned||actor.guardedReceipt)&&!actor.counter.uses&&ops.some(o=>o.type==='counter'))score=3;
   if(law==='recall'&&ops.some(o=>o.type==='return')&&target.hp+target.status.protection-reserved(battle,target)>actor.power)
    score=(target.hp+target.status.protection-reserved(battle,target))/Math.max(1,target.maxHp)+ops.filter(o=>o.type==='return').reduce((n,o)=>n+o.ratio,0);
   if(score>best){best=score;chosen={type:'action',kind,targetId:target.id};}
  }
 }
 return chosen&&usefulPreview(battle,actor,chosen.kind,chosen.targetId)?chosen:null;
}
