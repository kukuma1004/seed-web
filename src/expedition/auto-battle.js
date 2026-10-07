import {expeditionCombatTurn} from './combat.js';

const active=u=>u.hp>0&&!u.dead&&u.slot<5;
const columns=[[0,2],[1,3],[4]];

// Choose an ordinary paid action. No extra turns, simulated damage, hidden
// stat boost, or result shortcut; the controller still validates and saves it.
export function expeditionAutoBattleIntent(battle,{targetId}={}){
 const actor=battle&&expeditionCombatTurn(battle);
 if(!actor||actor.side!=='ally')return null;
 const allies=battle.units.filter(u=>u.side==='ally'&&active(u));
 const enemies=battle.units.filter(u=>u.side==='enemy'&&active(u));
 if(!enemies.length)return {type:'action',kind:'guard'};
 const front=enemies.filter(u=>u.slot<2),pool=front.length?front:enemies;
 const target=pool.find(u=>u.id===targetId)||pool.reduce((best,u)=>u.hp<best.hp?u:best,pool[0]);
 const warned=battle.warnings?.some(w=>w.targetId===actor.id&&w.readyRound<=battle.round);
 if(warned&&actor.hp/actor.maxHp<.45)return {type:'action',kind:'guard'};
 let best={kind:'attack',score:-1};
 for(const kind of ['attack','skill1','skill2','awaken']){
  if(kind==='skill2'&&actor.level<5||kind==='awaken'&&(actor.level<8||actor.awakenUsed))continue;
  let score=0;
  for(const op of actor.actions?.[kind]||[]){
   if(actor.gauge<op.gaugeSpend)continue;
   if(op.when==='chilled'&&!target.status.chill||op.when==='conductive'&&!target.status.conductive||op.when==='marked'&&!target.status.vulnerable&&!actor.gauge||op.when==='protected'&&!actor.status.protection&&!target.status.protection||op.when==='crowded'&&enemies.length<2||op.when==='alone'&&enemies.length!==1||op.when==='guarded'&&!target.guarding&&!actor.guardedReceipt)continue;
   const own=op.target==='self'||op.target==='ally';
   const count=Math.min(op.maxTargets??5,op.target==='all'?(own?allies:enemies).length:op.target==='column'?enemies.filter(u=>columns[op.column??columns.findIndex(c=>c.includes(target.slot))].includes(u.slot)).length:op.target==='adjacent'?Math.min(3,enemies.length):1);
   if(['damage','split','return'].includes(op.type))score+=(op.ratio||0)*count*(op.type==='return'?.8:1);
   else if(op.type==='protection')score+=allies.reduce((n,u)=>n+Math.min(actor.power*(op.ratio||0),u.maxHp-u.status.protection)/Math.max(1,actor.power),0)*.35;
   else if(op.type==='counter')score+=actor.counter?.uses?0:.55;
   else if(op.type==='chill')score+=(target.status.chill<3?.5:.1)*count;
   else score+=.25*count;
  }
  // Keep a one-use awakening for the boss or a surviving crowd.
  if(kind==='awaken'&&!enemies.some(u=>u.boss)&&enemies.length<3)score*=.45;
  if(score>best.score){best={kind,score};}
 }
 return {type:'action',kind:best.kind,targetId:target.id};
}
