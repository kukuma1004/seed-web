// Original catalog adapters: recall+pierce and orbit+frost. Shared strike owns
// block/parry/KO/meter; this module owns finite attack geometry, not a second engine.
const skill=(name,cooldown,desc)=>Object.freeze({name,cooldown,desc});
export const DUEL_BATCH03=Object.freeze({
 returnblade:Object.freeze({id:'returnblade',comboId:'returnblade',law:'recall',name:'귀환 칼날 씨앗',role:'왕복 관통 · 몸으로 그리는 귀로',hp:170,speed:4.55,reach:2.1,arc:.8,comboReach:[1.9,2.15,2.55],comboArc:[1.1,.65,.5],damage:[9,11,14],cadence:.36,heavy:{damage:23,reach:2.65},parry:1,tile:4,ink:'#d8efae',skills:[skill('잎창 왕복',5.2,'관통 창을 보내요 · 기술을 다시 누르면 일찍 회수 · 왕복 한 번씩'),skill('귀로 비켜서기',5.8,'무적 없이 옆으로 움직여 돌아오는 길을 바꿔요')],ult:skill('세 잎의 귀향',0,'세 방향의 창을 차례로 보내요 · 모든 창의 피해는 왕복 한 번씩 공유'),blurb:'창이 밖에 있으면 평타 사거리가 줄어요. 받아 낸 직후 강공격은 잠시 더 길어져요.'}),
 frostguard:Object.freeze({id:'frostguard',comboId:'frostguard',law:'frost',name:'서리 위성 씨앗',role:'한 위성의 틈 · 얻어 내는 냉기 반격',hp:184,speed:4,reach:1.7,arc:1.1,comboReach:[1.45,1.65,1.95],comboArc:[.75,1.2,.95],damage:[10,10,13],cadence:.4,heavy:{damage:24,reach:2},parry:1.1,tile:8,ink:'#b8e7fa',skills:[skill('두 겹의 서리 위성',6.3,'도는 위성이 일반 탄 두 개만 막아요 · 냉기 세 칸이면 다시 눌러 짧은 반격'),skill('낮게 밀어내기',5.9,'고정 방향으로 짧은 서리 부채 · 멀리 닿지 않아요')],ult:skill('겨울의 작은 성',0,'위성 둘이 탄 세 개씩 막아요 · 빈틈·근접·보스 탄은 남아요'),blurb:'3타·강공격 적중과 실제 위성 접촉으로 냉기를 모아요. 막힌 타격에는 쌓이지 않고, 반격 예고는 피할 수 있어요.'})
});
export const DUEL_BATCH03_STORY=Object.freeze([
 ['returnblade','돌아오는 잎의 약속','어려움','hard','내 창을 보고 내 자리까지 봐 줘. 잎이 돌아오는 길은 내가 어디로 걷느냐에 달렸거든. 창을 보낸 동안 작은 손은 짧아져!','기술 다시 누르기로 일찍 회수해요. 왕복 경로에서 옆으로 나오거나 양쪽 타격을 막으세요. 창이 없는 때는 가까이 들어갈 기회예요.','나에게 돌아오는 길에도 너를 향한 마음이 있었네. 멀리 보내고 잘 받아 낸 잎을 다음 씨앗에게 보여 줄게.'],
 ['frostguard','겨울 도토리의 빈틈','어려움','hard','도토리 하나가 내 둘레를 돌아. 어디든 막아 주지는 못하고 두 번이면 지쳐. 네가 그 틈으로 들어올 때 나도 발걸음을 배워!','위성에 닿은 일반 탄만 사라져요. 위성의 반대쪽·근접·잡기가 틈이에요. 냉기 세 칸의 짧은 반격은 예고 뒤 옆으로 피하거나 막으세요.','막아 주는 친구도 쉬어야 하는구나. 영원한 성 대신 네가 걸어올 작은 길을 남겨 둘게.']
]);
const norm=(x,y)=>{const d=Math.hypot(x,y)||1;return{x:x/d,y:y/d};};
const dist=(a,b)=>Math.hypot(a.x-b.x,a.y-b.y);
const guarded=(f,o)=>{const v=norm(f.x-o.x,f.y-o.y);return o.blocking&&v.x*o.fx+v.y*o.fy>-.2;};
const segment=(a,b,p)=>{const dx=b.x-a.x,dy=b.y-a.y,k=Math.max(0,Math.min(1,((p.x-a.x)*dx+(p.y-a.y)*dy)/(dx*dx+dy*dy||1)));return Math.hypot(p.x-a.x-dx*k,p.y-a.y-dy*k);};
const ownBlades=(s,f)=>s.shots.filter(q=>q.kind==='returnSpear'&&q.owner===f.team&&q.life>0);
export const batch03Repress=(s,f)=>f.char==='returnblade'?ownBlades(s,f).some(q=>!q.back&&q.age>=.22):f.char==='frostguard'&&(f.wardCold||0)>=3;
export function batch03Reach(s,f,heavy=false){if(f.char==='returnblade'){if(ownBlades(s,f).length)return .64;if(heavy&&(f.bladeCatch||0)>0)return 1.13;}return 1;}
function addCold(f){f.wardCold=Math.min(3,(f.wardCold||0)+1);f.wardColdTime=5;}
export function batch03Melee(s,f,{step,heavy,hit,guarded}){if(f.char==='frostguard'&&(heavy||step===2)&&hit&&!guarded)addCold(f);}
function windup(f,t){f.state='skill';f.t=t;f.total=t;f.blocking=false;}
export function batch03Action(s,f,index,ctx,ult=false){
 if(f.char==='returnblade'){
  const live=ownBlades(s,f);
  if(!ult&&index===0&&live.length){for(const q of live)if(q.age>=.22&&!q.back){q.back=true;q.hit.clear();ctx.event(s,'bladeRecall');}windup(f,.18);return;}
  if(!ult&&index===1){f.state='dash';f.t=f.total=.16;f.dx=-f.fy;f.dy=f.fx;f.hitDone=true;return;}
  // One weapon cast at a time, including ultimate: no overlapping free weapons.
  if(live.length)return;
  f.bladeCast=(f.bladeCast||0)+1;windup(f,ult?.95:.52);f.inv=0;
  const budget={out:new Set(),back:new Set()};
  for(const [k,off] of (ult?[-.22,0,.22]:[0]).entries()){
   const a=Math.atan2(f.fy,f.fx)+off,arm=.3+k*.18;
   ctx.area(s,f,'bladeSend',{x:f.x,y:f.y,dx:Math.cos(a),dy:Math.sin(a),endX:f.x+Math.cos(a)*7,endY:f.y+Math.sin(a)*7,r:.18,arm,t:arm+.1,cast:f.bladeCast,budget,damage:ult?17:14});
  }
 }else if(f.char==='frostguard'){
  if(!ult&&index===0&&(f.wardCold||0)>=3){f.wardCold=0;f.wardColdTime=0;windup(f,.55);ctx.area(s,f,'wardPunish',{x:f.x,y:f.y,dx:f.fx,dy:f.fy,r:2.45,arm:.35,t:.48,damage:16});return;}
  if(!ult&&index===1){windup(f,.55);ctx.area(s,f,'wardFan',{x:f.x,y:f.y,dx:f.fx,dy:f.fy,r:2.65,arm:.3,t:.43,damage:11});return;}
  windup(f,.45);f.inv=0;const count=ult?2:1;
  s.hazards=s.hazards.filter(h=>h.owner!==f.team||h.kind!=='frostWard');
  for(let k=0;k<count;k++)ctx.area(s,f,'frostWard',{x:f.x,y:f.y,r:1.35,angle:Math.atan2(f.fy,f.fx)+k*Math.PI,arm:.3,t:ult?3.8:2.8,charges:ult?3:2,contact:false,contactR:.32});
 }
}
export function batch03Tick(s,dt,ctx){
 for(const f of s.fighters){f.bladeCatch=Math.max(0,(f.bladeCatch||0)-dt);f.wardColdTime=Math.max(0,(f.wardColdTime||0)-dt);if(!f.wardColdTime)f.wardCold=0;}
 for(const h of s.hazards){if(!['bladeSend','frostWard','wardPunish','wardFan'].includes(h.kind))continue;h.t-=dt;h.arm=Math.max(0,h.arm-dt);const f=s.fighters[h.owner],o=s.fighters[1-h.owner];
  if(h.kind==='bladeSend'){if(f.stun>0||f.state!=='skill'||f.bladeCast!==h.cast){h.t=0;continue;}if(h.arm<=0&&!h.triggered){h.triggered=true;ctx.shoot(s,f,{kind:'returnSpear',law:'pierce',x:h.x+h.dx*.6,y:h.y+h.dy*.6,dx:h.dx,dy:h.dy,speed:14,life:2,age:0,damage:h.damage,pierce:8,budget:h.budget});ctx.event(s,'bladeSend');}}
  if(h.kind==='frostWard'){
   // Setup can be interrupted; once active it is a finite independent satellite.
   if(h.arm>0&&(f.stun>0||f.state!=='skill')){h.t=0;continue;}h.x=f.x;h.y=f.y;if(h.arm>0||h.charges<=0)continue;
   h.angle+=dt*2.8;h.rockX=h.x+Math.cos(h.angle)*h.r;h.rockY=h.y+Math.sin(h.angle)*h.r;
   if(!h.contact&&dist({x:h.rockX,y:h.rockY},o)<h.contactR+.4&&o.inv<=0){h.contact=true;const front=guarded(f,o);const hit=ctx.strike(s,f,o,6,{kind:'skill',stun:.1,knock:.2});if(hit&&!front)addCold(f);}
   for(const q of s.shots){if(q.owner===h.owner||q.life<=0||q.wardSpent||q.boss||s.boss&&q.owner===1)continue;
    const end={x:q.x+q.dx*q.speed*dt,y:q.y+q.dy*q.speed*dt};if(segment(q,end,{x:h.rockX,y:h.rockY})<h.contactR+.16){q.wardSpent=true;q.life=0;h.charges--;addCold(f);ctx.fx(s,'wardBlock',h.rockX,h.rockY,{ink:'#b8e7fa',life:.2,max:.2});ctx.event(s,'wardBlock');if(h.charges<=0){h.t=0;break;}}
   }
  }
  if((h.kind==='wardPunish'||h.kind==='wardFan')&&h.arm<=0&&!h.triggered){h.triggered=true;if(f.stun>0||f.state!=='skill')continue;ctx.fx(s,'breath',h.x,h.y,{ink:'#b8e7fa',r:h.r,angle:Math.atan2(h.dy,h.dx),life:.25,max:.25});const v=norm(o.x-h.x,o.y-h.y),front=guarded(f,o);
   if(dist(h,o)<h.r+.35&&v.x*h.dx+v.y*h.dy>.5){const hit=ctx.strike(s,f,o,h.damage,{kind:'skill',stun:.14,knock:.5,dir:{x:h.dx,y:h.dy}});if(hit&&!front)o.slow=Math.max(o.slow,h.kind==='wardPunish'?.75:.3);}
  }
 }
 for(const q of s.shots){if(q.kind!=='returnSpear'||q.life<=0)continue;q.life-=dt;q.age+=dt;const f=s.fighters[q.owner],o=s.fighters[1-q.owner];
  if(!q.back&&(q.age>=.57||ctx.wall?.(q))){q.back=true;q.hit.clear();ctx.event(s,'bladeRecall');}
  if(q.back){const v=norm(f.x-q.x,f.y-q.y);q.dx=v.x;q.dy=v.y;q.speed=13;}
  const start={x:q.x,y:q.y};q.x+=q.dx*q.speed*dt;q.y+=q.dy*q.speed*dt;
  if(q.back&&segment(start,q,f)<.5){q.life=0;f.bladeCatch=.7;ctx.event(s,'bladeCatch');continue;}
  const budget=q.back?q.budget.back:q.budget.out;
  if(!q.hit.has(o.team)&&!budget.has(o.team)&&segment(start,q,o)<.55&&o.inv<=0){
   if(o.shield>0){q.reflections=(q.reflections||0)+1;if(q.reflections>2){q.life=0;continue;}q.owner=o.team;q.dx*=-1;q.dy*=-1;q.back=false;q.age=0;q.hit.clear();ctx.event(s,'reflect');continue;}
   q.hit.add(o.team);budget.add(o.team);ctx.strike(s,f,o,q.damage,{kind:'shot',stun:.15,knock:.2,dir:{x:q.dx,y:q.dy}});}
 }
}
export function batch03Ai(s,f,o,input,dt){const d=dist(f,o),v=norm(o.x-f.x,o.y-f.y);
 if(f.char==='returnblade'){
  const q=ownBlades(s,f)[0];if(q){const behind=(q.x-o.x)*(f.x-o.x)+(q.y-o.y)*(f.y-o.y)<0;if(!q.back&&q.age>.22&&behind){input.skill1=true;return true;}if(q.back&&d>2.4){if(f.cd[1]<=0&&(s.ai[f.team].seen||0)>=.2){input.skill2=true;return true;}input.x=-v.y;input.y=v.x;return true;}}
  if(!q&&f.cd[0]<=0&&d>3.5&&d<8){input.skill1=true;return true;}
  if(!q&&f.meter>=100&&d>4&&d<8){input.ult=true;return true;}
 }else if(f.char==='frostguard'){
  if((f.wardCold||0)>=3&&d<2.4&&o.state!=='attack'){input.skill1=true;return true;}
  const incoming=s.shots.find(q=>q.owner!==f.team&&q.life>.3&&dist(q,f)<10&&(f.x-q.x)*q.dx+(f.y-q.y)*q.dy>0&&dist(q,f)/(q.speed||1)>.4);
  const ai=s.ai[f.team];ai.wardSeen=incoming?(ai.wardSeen||0)+dt:0;const react={easy:.32,normal:.2,hard:.12}[s.difficulty]??.2;
  if(incoming&&ai.wardSeen>=react&&f.cd[0]<=0){
   // The AI aims the same cast as a player: lead only the visible, fixed shot
   // velocity to put one finite orbit point on its path after the real startup.
   const a=Math.atan2(incoming.y-f.y,incoming.x-f.x)-2.8*Math.max(0,(dist(incoming,f)-1.35)/(incoming.speed||1)-.3);
   input.aimX=Math.cos(a);input.aimY=Math.sin(a);input.skill1=true;return true;}
  if(f.meter>=100&&incoming&&ai.wardSeen>=react&&d>2){input.ult=true;return true;}
  if(f.cd[1]<=0&&d>1.8&&d<2.5&&o.state==='heavy'&&(ai.seen||0)>=react){input.skill2=true;return true;}
 }
 return false;
}
