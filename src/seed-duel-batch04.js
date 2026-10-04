// Original gravity+burst / pierce+chain adapters. Damage/block/KO always goes
// through the host strike; fixed geometry and finite contacts live here.
const skill=(name,cooldown,desc)=>Object.freeze({name,cooldown,desc});
const THUNDER_FLIGHT=Object.freeze({lead:.6,speed:16,life:.5,contactRadius:.55});
export const DUEL_BATCH04=Object.freeze({
 collapse:Object.freeze({id:'collapse',comboId:'collapse',law:'gravity',name:'붕괴의 씨앗',role:'느린 씨앗 · 압축과 한 번의 붕괴',hp:172,speed:3.9,reach:1.8,arc:1.1,comboReach:[1.6,1.85,2.15],comboArc:[1.1,.75,.65],damage:[10,11,15],cadence:.4,heavy:{damage:24,reach:2.15},parry:1,tile:7,ink:'#d7a0fa',skills:[skill('무거운 씨앗 보내기',6,'방향을 고정해 느린 씨앗을 보내요 · 약한 당김 뒤 한 번만 붕괴'),skill('손 놓기',5.5,'날아가는 씨앗을 일찍 멈추고 예고 뒤 붕괴 · 없으면 무적 없이 뒤로 물러나요')],ult:skill('가라앉은 별',0,'느린 큰 씨앗 하나 · 준비 중 끊기거나 붕괴 원 밖으로 나올 수 있어요'),blurb:'3타나 강공격을 막히지 않게 맞히면 4초 동안 한 칸 압축해요. 다음 씨앗의 붕괴가 조금 넓어져요. 당김은 회피·막기를 빼앗지 않아요.'}),
 thunderlance:Object.freeze({id:'thunderlance',comboId:'thunderlance',law:'chain',name:'천둥 창 씨앗',role:'긴 관통 · 맞힌 자리에서 퍼지는 전류',hp:168,speed:4.2,reach:2.3,arc:.6,comboReach:[2.1,2.4,2.75],comboArc:[.65,.5,.4],damage:[9,11,14],cadence:.38,heavy:{damage:23,reach:2.85},parry:1,tile:4,ink:'#ffe596',skills:[skill('벼락 꿰뚫기',5.8,'고정한 창이 적을 관통하면 맞힌 자리에서 지연 전류 · 막힌 창에는 연쇄 없음'),skill('피뢰 잎 심기',5.6,'옆으로 물러나며 잎 하나를 고정해요 · 가까운 적중점의 전류 방향을 바꿔요')],ult:skill('갈라진 번개 줄기',0,'긴 창 하나와 세 갈래 지연 전류 · 창20+전류 최대12 피해'),blurb:'3타나 강공격 적중 후 다음 창은 준비만 조금 빨라져요. 창과 전류 모두 기둥에 막히고 방향을 고정하므로 옆으로 피할 수 있어요.'})
});
export const DUEL_BATCH04_STORY=Object.freeze([
 ['collapse','돌의 무게를 놓는 날','어려움','hard','작은 씨앗 하나에 마음을 꾹 모았어. 하지만 네 발을 붙잡지는 않을게. 내 손이 무거워지는 동안 네가 먼저 다가올 수도 있겠지?','느린 씨앗이 다가오면 옆으로 지나가세요. 약한 당김 속에서도 회피·막기가 가능해요. 씨앗이 멈춘 뒤 보이는 마지막 붕괴 원을 벗어나거나 준비 중 끊으세요.','모은 힘을 꼭 쥐고 있는 것보다 놓는 순간이 어려웠네. 네가 남겨 준 빈틈으로 빛이 새어 들어왔어.'],
 ['thunderlance','잎맥을 타는 천둥','어려움','hard','내 창은 곧게 가고 전류는 맞힌 자리에서 자라. 피뢰 잎을 보면 다음 번개의 길이 보일 거야. 움직임을 멈추지만 않는다면 틈을 찾을 수 있어!','창을 옆으로 피하거나 막으면 전류가 생기지 않아요. 맞았어도 고정 전류의 예고 동안 옆으로 나오세요. 피뢰 잎과 창 사이에 기둥을 두면 길이 끊겨요.','천둥도 같은 길만 고집하지 않는구나. 네가 바꾼 발걸음의 박자를 다음 잎맥에 새길게.']
]);
const norm=(x,y)=>{const d=Math.hypot(x,y)||1;return{x:x/d,y:y/d};};
const dist=(a,b)=>Math.hypot(a.x-b.x,a.y-b.y);
const front=(f,o)=>{const v=norm(f.x-o.x,f.y-o.y);return o.blocking&&v.x*o.fx+v.y*o.fy>-.2;};
const segment=(a,b,p)=>{const dx=b.x-a.x,dy=b.y-a.y,k=Math.max(0,Math.min(1,((p.x-a.x)*dx+(p.y-a.y)*dy)/(dx*dx+dy*dy||1)));return Math.hypot(p.x-a.x-dx*k,p.y-a.y-dy*k);};
const ownSeed=(s,f)=>s.shots.find(q=>q.kind==='collapseSeed'&&q.owner===f.team&&q.life>0);
function windup(f,t){f.state='skill';f.t=f.total=t;f.blocking=false;f.inv=0;}
export function batch04Melee(s,f,{step,heavy,hit,guarded}){if((heavy||step===2)&&hit&&!guarded){if(f.char==='collapse'){f.collapseCharge=1;f.collapseChargeTime=4;}if(f.char==='thunderlance'){f.thunderCharge=1;f.thunderChargeTime=4;}}}
function endSeed(s,q,ctx,early=false){if(q.collapseSpent||q.wardSpent)return;q.collapseSpent=true;q.life=0;const f=s.fighters[q.owner];ctx.area(s,f,'collapseBurst',{x:q.x,y:q.y,r:q.burstR,arm:early?.38:.3,t:early?.52:.44,damage:q.damage,budget:q.budget});ctx.event(s,'collapseStop');}
export function batch04Action(s,f,index,ctx,ult=false){
 if(f.char==='collapse'){
  const q=ownSeed(s,f);if(!ult&&index===1){if(q){endSeed(s,q,ctx,true);windup(f,.32);}else{f.state='dash';f.t=f.total=.16;f.dx=-f.fx;f.dy=-f.fy;f.hitDone=true;}return;}
  if(q&&!ult)return;if(q)q.life=0;
  const charged=(f.collapseCharge||0)>0;f.collapseCharge=f.collapseChargeTime=0;f.collapseCast=(f.collapseCast||0)+1;const arm=ult?.65:.45;windup(f,arm+.2);
  ctx.area(s,f,'collapseSend',{x:f.x,y:f.y,dx:f.fx,dy:f.fy,arm,t:arm+.08,cast:f.collapseCast,r:ult?2.1:1.5,burstR:ult?2.3:charged?1.9:1.65,damage:ult?35:charged?28:24,speed:ult?4.5:5.8,budget:{spent:false}});
 }else if(f.char==='thunderlance'){
  if(!ult&&index===1){s.hazards=s.hazards.filter(h=>h.owner!==f.team||h.kind!=='thunderRod');const p={x:f.x-f.fy*1.7,y:f.y+f.fx*1.7};ctx.clampArena(p);ctx.area(s,f,'thunderRod',{...p,r:.2,arm:0,t:3.5});f.state='dash';f.t=f.total=.13;f.dx=-f.fy;f.dy=f.fx;f.hitDone=true;return;}
  const charged=(f.thunderCharge||0)>0;f.thunderCharge=f.thunderChargeTime=0;f.thunderCast=(f.thunderCast||0)+1;const arm=ult?.6:charged?.32:.5;windup(f,arm+.2);
  const range=THUNDER_FLIGHT.lead+THUNDER_FLIGHT.speed*THUNDER_FLIGHT.life;
  ctx.area(s,f,'thunderSend',{x:f.x,y:f.y,dx:f.fx,dy:f.fy,endX:f.x+f.fx*range,endY:f.y+f.fy*range,r:THUNDER_FLIGHT.contactRadius-.35,arm,t:arm+.08,cast:f.thunderCast,damage:ult?20:15,ult});
 }
}
function chainFromHit(s,f,q,point,ctx){const rod=s.hazards.find(h=>h.owner===f.team&&h.kind==='thunderRod'&&h.t>0&&dist(h,point)<3.2&&!ctx.blocked(point,h));
 const base=rod?Math.atan2(rod.y-point.y,rod.x-point.x):Math.atan2(q.dy,q.dx),count=q.ult?3:1,budget={hits:0,max:q.ult?2:1};
 for(let k=0;k<count;k++){const a=base+(k-(count-1)/2)*.7,end=rod&&k===Math.floor(count/2)?{x:rod.x,y:rod.y}:{x:point.x+Math.cos(a)*1.8,y:point.y+Math.sin(a)*1.8};
  ctx.area(s,f,'thunderArc',{x:point.x,y:point.y,endX:end.x,endY:end.y,dx:Math.cos(a),dy:Math.sin(a),r:.2,arm:.35+k*.17,t:.49+k*.17,damage:q.ult?6:7,budget});
 }
 if(rod)rod.t=0;ctx.event(s,'thunderGround');
}
export function batch04Tick(s,dt,ctx){
 for(const f of s.fighters){f.collapseChargeTime=Math.max(0,(f.collapseChargeTime||0)-dt);f.thunderChargeTime=Math.max(0,(f.thunderChargeTime||0)-dt);if(!f.collapseChargeTime)f.collapseCharge=0;if(!f.thunderChargeTime)f.thunderCharge=0;}
 for(const h of s.hazards){if(!['collapseSend','collapseBurst','thunderSend','thunderRod','thunderArc'].includes(h.kind))continue;h.t-=dt;h.arm=Math.max(0,h.arm-dt);const f=s.fighters[h.owner],o=s.fighters[1-h.owner];
  if(h.kind==='collapseSend'||h.kind==='thunderSend'){
   const cast=h.kind==='collapseSend'?f.collapseCast:f.thunderCast;
   if(f.stun>0||f.state!=='skill'||h.cast!==cast){h.t=0;continue;}
   if(h.arm<=0&&!h.triggered){h.triggered=true;
    if(h.kind==='collapseSend'){ctx.shoot(s,f,{kind:'collapseSeed',law:'gravity',x:h.x+h.dx*.6,y:h.y+h.dy*.6,dx:h.dx,dy:h.dy,speed:h.speed,life:.8,damage:h.damage,burstR:h.burstR,r:h.r,budget:h.budget,pull:.9});ctx.event(s,'collapseLaunch');}
    else{ctx.shoot(s,f,{kind:'thunderSpear',law:'pierce',x:h.x+h.dx*THUNDER_FLIGHT.lead,y:h.y+h.dy*THUNDER_FLIGHT.lead,dx:h.dx,dy:h.dy,speed:THUNDER_FLIGHT.speed,life:THUNDER_FLIGHT.life,damage:h.damage,pierce:1,ult:h.ult});ctx.event(s,'thunderLaunch');}
   }
  }
  if(h.kind==='collapseBurst'&&h.arm<=0&&!h.triggered){h.triggered=true;ctx.fx(s,'boom',h.x,h.y,{r:h.r,ink:'#e3b493',life:.28,max:.28});ctx.event(s,'collapseBurst');if(!h.budget.spent&&dist(h,o)<h.r+.35&&o.inv<=0){h.budget.spent=true;ctx.strike(s,f,o,h.damage,{kind:'skill',stun:.22,knock:.65,dir:norm(o.x-h.x,o.y-h.y)});}}
  if(h.kind==='thunderArc'&&h.arm<=0&&!h.triggered){h.triggered=true;ctx.fx(s,'bolt',h.endX,h.endY,{fromX:h.x,fromY:h.y,ink:'#ffe596',life:.2,max:.2});ctx.event(s,'thunderArc');if(h.budget.hits<h.budget.max&&!ctx.blocked(h,{x:h.endX,y:h.endY})&&segment(h,{x:h.endX,y:h.endY},o)<h.r+.35&&o.inv<=0){h.budget.hits++;ctx.strike(s,f,o,h.damage,{kind:'skill',stun:.08,knock:.15,dir:norm(o.x-h.x,o.y-h.y)});}}
 }
 for(const q of s.shots){if(!['collapseSeed','thunderSpear'].includes(q.kind)||q.life<=0)continue;const old={x:q.x,y:q.y};q.life-=dt;q.x+=q.dx*q.speed*dt;q.y+=q.dy*q.speed*dt;const f=s.fighters[q.owner],o=s.fighters[1-q.owner];
  if(q.kind==='collapseSeed'){
   if(dist(q,o)<.55&&o.shield>0){q.reflections=(q.reflections||0)+1;if(q.reflections>2){q.life=0;q.collapseSpent=true;continue;}q.owner=o.team;q.dx*=-1;q.dy*=-1;ctx.event(s,'reflect');continue;}
   if(q.life<=0||ctx.wall(q)){ctx.clampArena(q);endSeed(s,q,ctx);continue;}
   if(dist(q,o)<q.r&&o.inv<=0){const v=norm(q.x-o.x,q.y-o.y),pull=q.pull*(o.blocking?.25:1);o.x+=v.x*pull*dt;o.y+=v.y*pull*dt;ctx.clampArena(o);}
  }else{
   if(ctx.wall(q)||ctx.blocked(old,q)){q.life=0;continue;}
   if(q.life>0&&!q.hit.has(o.team)&&segment(old,q,o)<THUNDER_FLIGHT.contactRadius&&o.inv<=0){
    if(o.shield>0){q.reflections=(q.reflections||0)+1;if(q.reflections>2){q.life=0;continue;}q.owner=o.team;q.dx*=-1;q.dy*=-1;q.hit.clear();ctx.event(s,'reflect');continue;}
    q.hit.add(o.team);const guarded=front(f,o),hit=ctx.strike(s,f,o,q.damage,{kind:'shot',stun:.12,knock:.15,dir:{x:q.dx,y:q.dy}});if(hit&&!guarded)chainFromHit(s,f,q,{x:o.x,y:o.y},ctx);
   }
  }
 }
}
export function batch04Ai(s,f,o,input,dt){const d=dist(f,o),v=norm(o.x-f.x,o.y-f.y),ai=s.ai[f.team],react={easy:.32,normal:.2,hard:.12}[s.difficulty]??.2;
 if(f.char==='collapse'){
  // Observe our visible seed entering the opponent's radius, independently of
  // their melee threat. The shared melee timer resets against a stationary
  // opponent and previously made deliberate early release unreachable.
  const q=ownSeed(s,f),near=q&&dist(q,o)<q.burstR*.8;ai.seedSeen=near?(ai.seedSeen||0)+dt:0;
  if(near&&f.cd[1]<=0&&ai.seedSeen>=react){input.skill2=true;return true;}
  if(!q&&f.cd[1]<=0&&d<2.4&&o.state==='heavy'&&(ai.seen||0)>=react){input.skill2=true;return true;}
  if(!q&&f.cd[0]<=0&&d>3.2&&d<5.5&&o.state!=='attack'){input.skill1=true;return true;}
  if(f.meter>=100&&d>3.2&&d<5.5&&o.state!=='attack'){input.ult=true;return true;}
 }else if(f.char==='thunderlance'){
  if(f.cd[1]<=0&&d<3.2&&o.state==='heavy'&&(ai.seen||0)>=react){input.skill2=true;return true;}
  if(f.cd[0]<=0&&d>3.8&&d<7.8&&o.state!=='attack'){input.skill1=true;return true;}
  if(f.meter>=100&&d>3.5&&d<7.5&&o.state!=='attack'){input.ult=true;return true;}
 }
 return false;
}
// Opponents read the same fixed warnings that are drawn for the human player.
// No aim prediction or future position is sampled; reaction time and dodge
// cooldown remain the shared player limits. Both seats use this function.
export function batch04DangerAi(s,f,input,dt){
 const ai=s.ai[f.team],react={easy:.32,normal:.2,hard:.12}[s.difficulty]??.2;
 const h=s.hazards.find(h=>h.owner!==f.team&&h.t>0&&!h.triggered&&(
  h.kind==='collapseBurst'&&dist(h,f)<h.r+.35||
  ['thunderSend','thunderArc'].includes(h.kind)&&segment(h,{x:h.endX,y:h.endY},f)<h.r+.35));
 if(!h){ai.b04DangerSeen=0;return false;}
 ai.b04DangerSeen=(ai.b04DangerSeen||0)+dt;if(ai.b04DangerSeen<react)return false;
 const v=h.kind==='collapseBurst'?norm(f.x-h.x,f.y-h.y):{x:-h.dy,y:h.dx};input.x=v.x;input.y=v.y;
 if(f.dodgeCd<=0&&h.arm<.2)input.dodge=true;return true;
}
