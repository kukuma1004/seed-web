import {DUEL_BASE_CHARACTERS} from './duel-base-characters.js';
// A distinct crowd-combat adapter; Duel timing/damage/identities stay shared,
// while battlefield skills explicitly translate to multi-target encounters.
export const BREAKTHROUGH_ROSTER=Object.freeze(['pierce','burst','frost']);
export const BREAKTHROUGH_LIMITS=Object.freeze({enemies:96,effects:40,seconds:240});
const clamp=(v,a,b)=>Math.max(a,Math.min(b,v)),distance=(a,b)=>Math.hypot(a.x-b.x,a.y-b.y);
const random=s=>{s.seed=(Math.imul(s.seed,1664525)+1013904223)>>>0;return s.seed/4294967296;};
// Run-only choices use authored costs, not changes to the shared Duel catalog.
const growthOffer=(id,name,description,changes)=>Object.freeze({id,name,description,changes:Object.freeze(changes)});
const FIRST_GROWTH=Object.freeze([
 growthOffer('wide-leaf','넓어진 잎날','기본 공격 사거리 +22% · 모든 피해 -10%',{reach:1.22,damage:.9}),
 growthOffer('sharp-heart','날카로운 씨앗','모든 피해 +22% · 최대 생명력 -15%',{damage:1.22,hp:.85}),
 growthOffer('deep-roots','깊은 뿌리','최대 생명력 +20% · 이동 속도 -8% (회복 없음)',{hp:1.2,speed:.92})
]);
const SECOND_GROWTH=Object.freeze({
 pierce:Object.freeze([
  growthOffer('quick-lance','빠른 찌르기','기술 재사용 시간 -28% · 회피 재사용 시간 +35%',{skillCd:.72,dashCd:1.35}),
  growthOffer('long-lance','곧게 뻗은 창','기술 길이 +25% · 기술 재사용 시간 +20%',{skillRange:1.25,skillCd:1.2}),
  growthOffer('charged-lance','응축된 창심','궁극기 충전 +35% · 기본 공격 간격 +12%',{meter:1.35,cadence:1.12})
 ]),
 burst:Object.freeze([
  growthOffer('quick-petal','빠른 꽃불','기술 재사용 시간 -25% · 회피 재사용 시간 +35%',{skillCd:.75,dashCd:1.35}),
  growthOffer('wide-petal','퍼지는 꽃불','기술 폭발 반경 +25% · 기술 피해 -15%',{skillRange:1.25,skillDamage:.85}),
  growthOffer('heavy-petal','묵직한 꽃불','기술 피해 +35% · 폭발 대기 시간 +40%',{skillDamage:1.35,skillDelay:1.4})
 ]),
 frost:Object.freeze([
  growthOffer('quick-winter','짧은 겨울','기술 재사용 시간 -30% · 회피 재사용 시간 +35%',{skillCd:.7,dashCd:1.35}),
  growthOffer('lasting-winter','긴 겨울','기술 냉기 지속 +40% · 기술 피해 -15%',{skillSlow:1.4,skillDamage:.85}),
  growthOffer('charged-winter','차오르는 서리','궁극기 충전 +40% · 기본 공격 간격 +12%',{meter:1.4,cadence:1.12})
 ])
});
export function createBreakthrough(character='pierce',seed=1){
 if(!BREAKTHROUGH_ROSTER.includes(character))throw Error('Unsupported battlefield character');const c=DUEL_BASE_CHARACTERS[character];
 const s={phase:'playing',seed:seed>>>0,time:0,kills:0,comboHits:0,serial:0,events:[],effects:[],pending:[],units:Array.from({length:96},()=>({active:false})),spawnAt:0,bossAppeared:false,
  growth:[],offers:[],choiceCamp:null,upgrades:{reach:1,damage:1,speed:1,cadence:1,skillCd:1,dashCd:1,skillRange:1,skillDamage:1,skillSlow:1,skillDelay:1,meter:1},
  player:{char:character,x:6,y:20,hp:c.hp,maxHp:c.hp,aimX:1,aimY:0,attack:0,contact:0,hitDone:true,step:0,combo:0,comboTime:0,dash:0,dashing:0,inv:1,skill:0,ultimateCd:0,meter:35,motion:0},
  camps:[{x:18,y:11,name:'온실 전초지',captured:false,leaderDead:false,progress:0,spawn:0},{x:33,y:28,name:'꽃물결 진지',captured:false,leaderDead:false,progress:0,spawn:0}],boss:null};
 for(let camp=0;camp<2;camp++){spawn(s,camp,true);for(let i=0;i<22;i++)spawn(s,camp);}return s;
}
function beginGrowth(s,camp){
 s.phase='choice';s.choiceCamp=camp;s.offers=[...(s.growth.length===0?FIRST_GROWTH:SECOND_GROWTH[s.player.char])];s.events.push('growthChoice');
}
function summonBoss(s){
 if(!s.bossAppeared&&s.growth.length===2&&s.camps.every(c=>c.captured)){
  s.bossAppeared=true;s.boss=spawn(s,2,true,true);s.events.push('bossWarning');
 }
}
export function chooseBreakthrough(s,id){
 if(s.phase!=='choice'||s.growth.length>=2)return false;
 const offer=s.offers.find(o=>o.id===id);if(!offer||s.growth.some(o=>o.id===id))return false;
 for(const [key,value] of Object.entries(offer.changes)){
  if(key==='hp'){s.player.maxHp*=value;s.player.hp=Math.min(s.player.hp,s.player.maxHp);}
  else s.upgrades[key]*=value;
 }
 s.growth.push({id:offer.id,name:offer.name,description:offer.description});s.offers=[];s.choiceCamp=null;s.phase='playing';s.events.push('growthChosen');summonBoss(s);return true;
}
function spawn(s,camp,leader=false,boss=false){if(!leader&&s.units.filter(u=>u.active).length>=95)return null;const u=s.units.find(u=>!u.active);if(!u)return null;const site=camp===2?{x:47,y:18}:s.camps[camp],a=random(s)*Math.PI*2,r=leader?0:2+random(s)*4;
 Object.assign(u,{active:true,id:++s.serial,camp,leader,boss,x:site.x+Math.cos(a)*r,y:site.y+Math.sin(a)*r,hp:boss?900:leader?520:30,maxHp:boss?900:leader?520:30,slow:0,stun:0,flash:0,cd:1+random(s),tell:0,tx:0,ty:0,fx:-1,fy:0});return u;
}
function effect(s,kind,x,y,r,extra={}){if(s.effects.length>=40)return;s.effects.push({kind,x,y,r,life:.32,max:.32,...extra});}
function hit(s,u,damage,slow=0){if(!u.active)return;u.hp=Math.max(0,u.hp-damage*s.upgrades.damage);u.flash=.15;u.slow=Math.max(u.slow,slow);s.comboHits++;s.player.meter=clamp(s.player.meter+1.5*s.upgrades.meter,0,100);if(!u.hp){u.active=false;s.kills++;s.player.meter=clamp(s.player.meter+3*s.upgrades.meter,0,100);if(u.boss){s.phase='won';s.events.push('bossDefeat');}else if(u.leader){s.camps[u.camp].leaderDead=true;s.events.push('evolve');}}}
function hurt(s,damage){const p=s.player;if(s.phase!=='playing'||p.inv>0)return;p.hp=Math.max(0,p.hp-damage);p.inv=.55;s.events.push('hurt');if(!p.hp)s.phase='lost';}
function sweep(s,x,y,r,damage,arc=-2,slow=0){const p=s.player;for(const u of s.units){if(!u.active)continue;const dx=u.x-x,dy=u.y-y,d=Math.hypot(dx,dy);if(d>r+.35||arc>-2&&d>.3&&(dx*p.aimX+dy*p.aimY)/d<arc)continue;hit(s,u,damage,slow);}}
export function breakthroughObjective(s){if(s.phase==='choice'){const goal=s.camps[s.choiceCamp];return {x:goal.x,y:goal.y,label:'진지 점령 · 이번 판에 쓸 성장 하나를 선택하세요'};}const remaining=s.camps.filter(c=>!c.captured);if(remaining.length){const goal=remaining.reduce((a,b)=>distance(s.player,a)<distance(s.player,b)?a:b);return {x:goal.x,y:goal.y,label:goal.leaderDead?'깃발 안의 적을 정리하고 3초 머무르면 성장 선택':goal.name+' · 대장을 쓰러뜨리면 증원 중단'};}return {x:47,y:18,label:'적 본진 · 마지막 장수를 쓰러뜨리세요'};}
export function dodgeBreakthrough(s,x=0,y=0){const p=s.player;if(s.phase!=='playing'||p.dash>0)return false;let d=Math.hypot(x,y);p.dx=d?x/d:p.aimX;p.dy=d?y/d:p.aimY;p.dashing=.2;p.inv=.28;p.dash=.8*s.upgrades.dashCd;s.events.push('dash');return true;}
export function skillBreakthrough(s){const p=s.player,g=s.upgrades;if(s.phase!=='playing'||p.skill>0)return false;p.skill=DUEL_BASE_CHARACTERS[p.char].skills[0].cooldown*g.skillCd;p.motion=.5;
 if(p.char==='pierce'){p.dx=p.aimX;p.dy=p.aimY;p.dashing=.24;p.inv=.18;for(const u of s.units){if(!u.active)continue;const dx=u.x-p.x,dy=u.y-p.y,along=dx*p.aimX+dy*p.aimY,side=Math.abs(dx*p.aimY-dy*p.aimX);if(along>=-.5&&along<7*g.skillRange&&side<1)hit(s,u,52*g.skillDamage);}effect(s,'lance',p.x,p.y,7*g.skillRange,{ax:p.aimX,ay:p.aimY});}
 else if(p.char==='burst'){const r=3.8*g.skillRange,delay=.7*g.skillDelay;s.pending.push({x:p.x+p.aimX*2,y:p.y+p.aimY*2,r,delay,damage:54*g.skillDamage});effect(s,'bomb',p.x+p.aimX*2,p.y+p.aimY*2,r,{life:delay,max:delay});}
 else{const r=5.8*g.skillRange;sweep(s,p.x,p.y,r,14*g.skillDamage,.25,3*g.skillSlow);for(const u of s.units)if(u.active&&distance(u,p)<r&&u.slow>0)u.stun=Math.max(u.stun,u.boss?.2:1);effect(s,'frost',p.x,p.y,r,{ax:p.aimX,ay:p.aimY});}s.events.push('skill');return true;
}
export function ultimateBreakthrough(s){const p=s.player;if(s.phase!=='playing'||p.meter<100||p.ultimateCd>0)return false;p.meter=0;p.ultimateCd=8;p.inv=Math.max(p.inv,.45);p.motion=.8;
 if(p.char==='pierce'){for(const u of s.units){if(!u.active)continue;const dx=u.x-p.x,dy=u.y-p.y,a=dx*p.aimX+dy*p.aimY,b=Math.abs(dx*p.aimY-dy*p.aimX);if(a>-.5&&a<11&&b<3.4)hit(s,u,110);}effect(s,'lance',p.x,p.y,11,{ax:p.aimX,ay:p.aimY,life:.6,max:.6,wide:true});}
 else{sweep(s,p.x,p.y,7.5,p.char==='burst'?120:70,-2,p.char==='frost'?4:0);effect(s,p.char==='burst'?'burst':'frost',p.x,p.y,7.5,{life:.65,max:.65});}s.events.push('ultimate');return true;
}
export function stepBreakthrough(s,dt,input={}){
 if(s.phase!=='playing'||!Number.isFinite(dt)||dt<=0)return;dt=Math.min(dt,.05);s.time+=dt;const p=s.player,c=DUEL_BASE_CHARACTERS[p.char];
 for(const key of ['attack','contact','comboTime','dash','dashing','inv','skill','ultimateCd','motion'])p[key]=Math.max(0,p[key]-dt);if(!p.comboTime)p.combo=0;
 const dx=input.x||0,dy=input.y||0,d=Math.hypot(dx,dy);if(d){p.aimX=dx/d;p.aimY=dy/d;}if(Number.isFinite(input.aimX)&&Math.hypot(input.aimX,input.aimY)>.1){const a=Math.hypot(input.aimX,input.aimY);p.aimX=input.aimX/a;p.aimY=input.aimY/a;}
 p.x=clamp(p.x+(p.dashing>0?p.dx*19:d?dx/d*c.speed*1.5*s.upgrades.speed:0)*dt,2,52);p.y=clamp(p.y+(p.dashing>0?p.dy*19:d?dy/d*c.speed*1.5*s.upgrades.speed:0)*dt,3,35);
 if(input.attack&&p.attack===0){
  // There is no second aiming stick. Stationary attacks face a nearby enemy;
  // movement or an explicit adapter aim always keeps the player's direction.
  if(!d&&!Number.isFinite(input.aimX)){let closest=null,best=c.reach*1.9*s.upgrades.reach+1;for(const u of s.units){if(!u.active)continue;const range=distance(p,u);if(range<best){best=range;closest=u;}}if(closest&&best>.01){p.aimX=(closest.x-p.x)/best;p.aimY=(closest.y-p.y)/best;}}
  p.step=p.combo;p.combo=(p.combo+1)%3;p.comboTime=1;p.attack=c.cadence*s.upgrades.cadence;p.contact=.08;p.hitDone=false;s.events.push('shot');
 }
 if(!p.hitDone&&p.contact===0){p.hitDone=true;const reach=c.reach*1.9*s.upgrades.reach;sweep(s,p.x,p.y,reach,c.damage[p.step]*2.1,Math.cos(c.arc*1.15),p.char==='frost'?1.4:0);effect(s,'slash',p.x,p.y,reach,{ax:p.aimX,ay:p.aimY,color:c.ink});if(p.char==='burst'&&p.step===2){sweep(s,p.x+p.aimX*2,p.y+p.aimY*2,2.2,18);effect(s,'burst',p.x+p.aimX*2,p.y+p.aimY*2,2.2);}}
 for(let i=s.pending.length-1;i>=0;i--){const f=s.pending[i];f.delay-=dt;if(f.delay<=0){sweep(s,f.x,f.y,f.r,f.damage);effect(s,'burst',f.x,f.y,f.r);s.events.push('burstHit');s.pending.splice(i,1);}}
 for(let i=s.effects.length-1;i>=0;i--){const f=s.effects[i];f.life-=dt;if(f.life<=0)s.effects.splice(i,1);}
 for(const u of s.units){if(!u.active)continue;u.flash=Math.max(0,u.flash-dt);u.slow=Math.max(0,u.slow-dt);u.stun=Math.max(0,u.stun-dt);u.cd-=dt;if(u.stun>0)continue;const dx=p.x-u.x,dy=p.y-u.y,d=Math.hypot(dx,dy);u.fx=dx/(d||1);u.fy=dy/(d||1);
  if(u.tell>0){u.tell-=dt;if(u.tell<=0){if(u.leader||u.boss){const tx=p.x-u.tx,ty=p.y-u.ty;if(Math.hypot(tx,ty)<(u.boss?3.2:2.3))hurt(s,u.boss?22:15);effect(s,'danger',u.tx,u.ty,u.boss?3.2:2.3);}else if(d<1.5)hurt(s,6);u.cd=u.boss?1.3:1.7;}continue;}
  if(d>(u.leader?1.9:1.05)&&d<16){const speed=(u.boss?2.3:u.leader?1.7:2.3)*(u.slow>0?.45:1),side=u.leader?0:((u.id%5)-2)*.16;u.x=clamp(u.x+(u.fx-u.fy*side)*speed*dt,2,52);u.y=clamp(u.y+(u.fy+u.fx*side)*speed*dt,3,35);}else if(d<4&&u.cd<=0){u.tell=u.leader||u.boss?.75:.55;u.tx=p.x;u.ty=p.y;}
 }
 // A lethal tick cannot also capture a camp and replace 'lost' with a choice.
 if(s.phase!=='playing')return;
 for(let i=0;i<2;i++){const camp=s.camps[i];if(camp.captured)continue;camp.spawn-=dt;if(!camp.leaderDead&&camp.spawn<=0&&distance(p,camp)<14){camp.spawn=2.2;spawn(s,i);spawn(s,i);}if(camp.leaderDead&&distance(p,camp)<3.4){const contested=s.units.some(u=>u.active&&u.camp===i&&distance(u,camp)<4);if(!contested)camp.progress+=dt;if(camp.progress>=3){camp.captured=true;p.hp=Math.min(p.maxHp,p.hp+35);p.meter=Math.min(100,p.meter+25);s.events.push('evolve');beginGrowth(s,i);return;}}}
 s.spawnAt-=dt;if(s.bossAppeared&&s.boss?.active&&s.spawnAt<=0&&distance(p,s.boss)<14){s.spawnAt=3;for(let i=0;i<3;i++)spawn(s,2);}
 if(s.time>=240&&s.phase==='playing')s.phase='lost';
}
