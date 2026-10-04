// Original burst+frost / orbit+chain. The host owns damage, guard, meter and
// rounds; these adapters author finite placed blooms and real orbit contacts.
const skill=(name,cooldown,desc)=>Object.freeze({name,cooldown,desc});
export const DUEL_BATCH05=Object.freeze({
 frostbloom:Object.freeze({id:'frostbloom',comboId:'frostbloom',law:'frost',name:'서리 꽃봉오리 씨앗',role:'고정 봉오리 · 머문 냉기와 지연 파쇄',hp:176,speed:4.1,reach:1.85,arc:1.1,comboReach:[1.6,1.85,2.15],comboArc:[1.1,1.3,.65],damage:[9,10,14],cadence:.39,heavy:{damage:23,reach:2.2},parry:1,tile:8,ink:'#bceafa',skills:[skill('봉오리 놓기',6.2,'고정 자리에 봉오리 · 안에 머물면 냉기가 쌓여 짧게 굳고 예고 뒤 파쇄'),skill('꽃잎 접기',5.7,'봉오리를 일찍 깨우되 마지막 예고는 남겨요 · 없으면 짧은 냉기 부채')],ult:skill('세 송이의 겨울',0,'세 고정 봉오리를 차례로 놓아요 · 파쇄는 합쳐 두 번, 짧은 경직은 한 번'),blurb:'막히지 않은 3타나 강공격은 다음 봉오리에 꽃잎 한 장을 보태요. 빠르게 옆으로 나오면 냉기도 파쇄도 피할 수 있어요.'}),
 stormcrown:Object.freeze({id:'stormcrown',comboId:'stormcrown',law:'orbit',name:'폭풍 왕관 씨앗',role:'위성의 실제 접점 · 얻어 내리는 번개',hp:178,speed:4.25,reach:1.7,arc:1.2,comboReach:[1.5,1.8,2],comboArc:[.7,1.4,1.1],damage:[10,9,13],cadence:.37,heavy:{damage:23,reach:2.15},parry:1,tile:6,ink:'#f9dfa3',skills:[skill('잎별의 왕관',6.4,'위성 둘의 실제 접점에서 일반 탄 두 개까지 · 닿은 적에게 고정 예고 번개'),skill('왕관 내리기',5.5,'위성을 거두고 짧은 고정 번개 · 실제 접촉으로 모은 전하 두 칸까지만 강화')],ult:skill('세 별의 둥근 약속',0,'위성 셋 · 일반 탄 세 개, 접점 번개 세 번까지 · 근접과 보스 탄은 남아요'),blurb:'위성의 빈틈은 열려 있어요. 실제 탄 접촉·막히지 않은 3타와 강공격으로 전하를 얻어요. 먼 적에게는 번개가 닿지 않아요.'})
});
export const DUEL_BATCH05_STORY=Object.freeze([
 ['frostbloom','꽃이 피기 전에 한 걸음','어려움','hard','봉오리는 네가 서 있던 자리에 머물러. 겨울을 오래 품으면 조금 굳겠지만, 꽃이 깨지기 전에는 아직 한 걸음이 있어!','봉오리가 내려오는 예고 때 옆으로 나오세요. 막으면 냉기는 쌓이지 않아요. 오래 머물러도 경직은 짧고, 마지막 파쇄 원은 고정돼요.','기다리는 꽃도 누군가를 꼭 붙잡아야 하는 건 아니구나. 네가 지나간 빈 곳에 다음 봄을 심을게.'],
 ['stormcrown','왕관 사이로 열린 길','어려움','hard','내 별은 두 개뿐이야. 닿은 탄만 막고, 네 발걸음이 가까워지면 번개의 자리를 정해. 별 사이로 네가 걸어올 길도 남겨 뒀어.','위성의 실제 접점과 번개 예고를 확인하세요. 반대쪽·근접·잡기·보스 탄은 막지 못해요. 왕관을 거두면 짧은 번개 방향이 고정되니 옆으로 피하세요.','왕관은 멀리 닿는 힘보다 가까운 친구를 살피는 힘이었네. 네가 찾아온 그 길을 별들 사이에 기억할게.']
]);
const norm=(x,y)=>{const d=Math.hypot(x,y)||1;return{x:x/d,y:y/d};};
const dist=(a,b)=>Math.hypot(a.x-b.x,a.y-b.y);
const guarded=(f,o)=>{const v=norm(f.x-o.x,f.y-o.y);return o.blocking&&v.x*o.fx+v.y*o.fy>-.2;};
const segment=(a,b,p)=>{const dx=b.x-a.x,dy=b.y-a.y,k=Math.max(0,Math.min(1,((p.x-a.x)*dx+(p.y-a.y)*dy)/(dx*dx+dy*dy||1)));return Math.hypot(p.x-a.x-dx*k,p.y-a.y-dy*k);};
const buds=(s,f)=>s.hazards.filter(h=>h.owner===f.team&&h.kind==='bloomBud'&&h.t>0&&!h.triggered);
function windup(f,t){f.state='skill';f.t=f.total=t;f.blocking=false;f.inv=0;}
function charge(f){f.crownCharge=Math.min(2,(f.crownCharge||0)+1);f.crownChargeTime=6;}
// Each projectile host supplies its actual travelled segment before damage.
// Special hosts run before this adapter's tick, so their dt projects the same
// final satellite point the tick will draw; the common host passes zero after it.
// Hosts call only for a projectile alive BEFORE its movement: the final travelled
// segment remains interceptible when its lifetime expires during that movement.
export function batch05InterceptShot(s,q,x0,y0,dt,ctx){
 if(q.wardSpent||q.boss||s.boss&&q.owner===1)return false;
 const dx=q.x-x0,dy=q.y-y0,den=dx*dx+dy*dy||1;
 for(const h of s.hazards){
  if(h.kind!=='crownOrbit'||h.owner===q.owner||h.t<=dt||h.arm>dt||h.budget.blocks<=0)continue;
  const f=s.fighters[h.owner];if(h.arm>0&&(f.stun>0||f.state!=='skill'||h.cast!==f.crownCast))continue;
  const a=h.angle+dt*4,rx=f.x+Math.cos(a)*h.r,ry=f.y+Math.sin(a)*h.r;
  const k=Math.max(0,Math.min(1,((rx-x0)*dx+(ry-y0)*dy)/den));
  if(Math.hypot(rx-x0-dx*k,ry-y0-dy*k)>=h.contactR+.16)continue;
  q.wardSpent=true;q.life=0;q.bloomSpent=true;q.collapseSpent=true;h.budget.blocks--;charge(f);
  ctx.fx(s,'crownBlock',rx,ry,{ink:'#f9dfa3',life:.18,max:.18});ctx.event(s,'crownBlock');return true;
 }
 return false;
}
export function batch05Melee(s,f,{step,heavy,hit,guarded}){if((heavy||step===2)&&hit&&!guarded){if(f.char==='frostbloom'){f.bloomPetal=1;f.bloomPetalTime=4;}if(f.char==='stormcrown')charge(f);}}
export function batch05Action(s,f,index,ctx,ult=false){
 const o=s.fighters[1-f.team];
 if(f.char==='frostbloom'){
  const live=buds(s,f);if(!ult&&index===1){if(live.length){for(const h of live)h.shatterIn=Math.min(h.shatterIn,.35);windup(f,.22);ctx.event(s,'bloomFold');}else{windup(f,.5);ctx.area(s,f,'bloomFan',{x:f.x,y:f.y,dx:f.fx,dy:f.fy,r:2.05,arm:.3,t:.43,damage:8});}return;}
  // One placement group at a time. Ultimate retires old buds without breaking
  // them, so a fresh meter cannot produce hidden overlapping free explosions.
  for(const h of live)h.t=0;
  f.bloomCast=(f.bloomCast||0)+1;const budget={hits:0,max:ult?2:1,frozen:false},petal=f.bloomPetal||0;f.bloomPetal=f.bloomPetalTime=0;windup(f,ult?.97:.67);
  const length=Math.min(4,Math.max(2,dist(f,o)));
  for(const [k,off] of (ult?[-.45,0,.45]:[0]).entries()){const a=Math.atan2(f.fy,f.fx)+off,p={x:f.x+Math.cos(a)*length,y:f.y+Math.sin(a)*length};ctx.clampArena(p);
   const arm=.45+k*.17;ctx.area(s,f,'bloomPlant',{...p,fromX:f.x,fromY:f.y,r:ult?1.35:1.45,arm,t:arm+.09,cast:f.bloomCast,cold:petal,damage:ult?10:14,budget});}
 }else if(f.char==='stormcrown'){
  if(!ult&&index===1){const power=f.crownCharge||0;f.crownCharge=f.crownChargeTime=0;for(const h of s.hazards)if(h.owner===f.team&&h.kind==='crownOrbit')h.t=0;windup(f,.57);
   const end={x:f.x+f.fx*2.65,y:f.y+f.fy*2.65};ctx.area(s,f,'crownDrop',{x:f.x,y:f.y,...{endX:end.x,endY:end.y},dx:f.fx,dy:f.fy,r:.35,arm:.35,t:.49,damage:7+power*6});ctx.event(s,'crownDrop');return;}
  for(const h of s.hazards)if(h.owner===f.team&&h.kind==='crownOrbit')h.t=0;f.crownCast=(f.crownCast||0)+1;windup(f,.53);
  const count=ult?3:2,budget={blocks:count,links:count};for(let k=0;k<count;k++)ctx.area(s,f,'crownOrbit',{x:f.x,y:f.y,r:1.2,angle:Math.atan2(f.fy,f.fx)+k*Math.PI*2/count,arm:.32,t:ult?3.6:2.7,cast:f.crownCast,budget,contactR:.3,spent:false});
 }
}
export function batch05Tick(s,dt,ctx){
 for(const f of s.fighters){f.bloomPetalTime=Math.max(0,(f.bloomPetalTime||0)-dt);if(!f.bloomPetalTime)f.bloomPetal=0;f.bloomChillCd=Math.max(0,(f.bloomChillCd||0)-dt);f.crownChargeTime=Math.max(0,(f.crownChargeTime||0)-dt);if(!f.crownChargeTime)f.crownCharge=0;}
 for(const h of s.hazards){if(!['bloomPlant','bloomBud','bloomFan','crownOrbit','crownLink','crownDrop'].includes(h.kind))continue;if(h.t<=0)continue;
  const arming=h.arm>0;h.t-=dt;h.arm=Math.max(0,h.arm-dt);const f=s.fighters[h.owner],o=s.fighters[1-h.owner];
  if(h.kind==='bloomPlant'){
   if(f.stun>0||f.state!=='skill'||h.cast!==f.bloomCast){h.t=0;continue;}if(h.arm<=0&&!h.triggered){h.triggered=true;ctx.area(s,f,'bloomBud',{x:h.x,y:h.y,r:h.r,t:1.28,arm:0,shatterIn:1.15,cold:h.cold,coldTick:.18,damage:h.damage,budget:h.budget});ctx.event(s,'bloomLand');}
  }else if(h.kind==='bloomBud'){
   h.shatterIn-=dt;h.coldTick-=dt;const front=guarded(f,o),inside=dist(h,o)<h.r+.35&&o.inv<=0;
   if(h.shatterIn>.35&&inside&&!front){o.slow=Math.max(o.slow,.1);if(h.coldTick<=0){h.coldTick=.18;h.cold=Math.min(3,h.cold+1);if(h.cold===3&&!h.budget.frozen&&o.bloomChillCd<=0){h.budget.frozen=true;const hit=ctx.strike(s,f,o,2,{kind:'skill',stun:.18,knock:0});if(hit)o.bloomChillCd=2.5;ctx.event(s,'bloomChill');}}}
   if(h.shatterIn<=0&&!h.triggered){h.triggered=true;ctx.fx(s,'bloomShatter',h.x,h.y,{r:h.r,ink:'#bceafa',life:.3,max:.3});ctx.event(s,'bloomShatter');if(inside&&h.budget.hits<h.budget.max){h.budget.hits++;ctx.strike(s,f,o,h.damage+h.cold*3,{kind:'skill',stun:.16,knock:.6,dir:norm(o.x-h.x,o.y-h.y)});}}
  }else if(h.kind==='bloomFan'){
   if(f.stun>0||f.state!=='skill'){h.t=0;continue;}if(h.arm<=0&&!h.triggered){h.triggered=true;const v=norm(o.x-h.x,o.y-h.y),front=guarded(f,o);if(dist(h,o)<h.r+.35&&v.x*h.dx+v.y*h.dy>.55){const hit=ctx.strike(s,f,o,h.damage,{kind:'skill',stun:.1,knock:.3});if(hit&&!front)o.slow=Math.max(o.slow,.16);}ctx.event(s,'bloomFold');}
  }else if(h.kind==='crownOrbit'){
   if(arming&&(f.stun>0||f.state!=='skill'||h.cast!==f.crownCast)){h.t=0;continue;}h.x=f.x;h.y=f.y;if(h.arm>0)continue;h.angle+=dt*4;h.rockX=h.x+Math.cos(h.angle)*h.r;h.rockY=h.y+Math.sin(h.angle)*h.r;
   if(!h.spent&&h.budget.links>0&&o.inv<=0&&dist({x:h.rockX,y:h.rockY},o)<h.contactR+.35){h.spent=true;h.budget.links--;ctx.area(s,f,'crownLink',{x:h.rockX,y:h.rockY,endX:o.x,endY:o.y,dx:o.fx,dy:o.fy,r:.16,arm:.24,t:.38,damage:7});ctx.event(s,'crownLink');}
   // Interception happens in the projectile hosts before their hit/reflect path.
  }else if(h.kind==='crownLink'||h.kind==='crownDrop'){
   if(h.kind==='crownDrop'&&(f.stun>0||f.state!=='skill')){h.t=0;continue;}if(h.arm<=0&&!h.triggered){h.triggered=true;const front=guarded(f,o);if(o.inv<=0&&!ctx.blocked(h,{x:h.endX,y:h.endY})&&segment(h,{x:h.endX,y:h.endY},o)<h.r+.35){const hit=ctx.strike(s,f,o,h.damage,{kind:'skill',stun:.12,knock:.2});if(hit&&!front&&h.kind==='crownLink')charge(f);}ctx.fx(s,'crownFlash',h.endX,h.endY,{fromX:h.x,fromY:h.y,ink:'#f9dfa3',life:.18,max:.18});}
  }
 }
}
export function batch05Ai(s,f,o,input,dt){const ai=s.ai[f.team],d=dist(f,o),v=norm(o.x-f.x,o.y-f.y),react={easy:.32,normal:.2,hard:.12}[s.difficulty]??.2;
 if(f.char==='frostbloom'){
  const live=buds(s,f),ripe=live.find(h=>dist(h,o)<h.r+.35&&h.cold>=2&&h.shatterIn>.35);ai.budSeen=ripe?(ai.budSeen||0)+dt:0;
  if(ripe&&f.cd[1]<=0&&ai.budSeen>=react){input.skill2=true;return true;}
  if(!live.length&&d>2.7&&d<5.2&&!['attack','heavy'].includes(o.state)){if(f.meter>=100)input.ult=true;else if(f.cd[0]<=0)input.skill1=true;else return false;return true;}
  if(f.cd[1]<=0&&!live.length&&d>1.4&&d<2.05&&o.state==='heavy'&&ai.seen>=react){input.skill2=true;return true;}
 }else if(f.char==='stormcrown'){
  const satellites=s.hazards.filter(h=>h.owner===f.team&&h.kind==='crownOrbit'&&h.t>0),active=satellites.length>0;
  // Raise the crown before entering ordinary melee reach, then walk its real
  // contact points into range. Setting it up at1.6 repeatedly lost the startup
  // to the same immediate jab, despite having a visible defensive kit.
  const near=d>2.1&&d<3.4&&o.state!=='attack'&&o.state!=='heavy';ai.crownSeen=near?(ai.crownSeen||0)+dt:0;
  const remaining=satellites.some(h=>!h.spent&&h.budget.links>0);
  if(f.cd[1]<=0&&(f.crownCharge||0)>0&&(!remaining||f.crownCharge===2)&&d<2.65&&!['attack','heavy'].includes(o.state)){input.skill2=true;return true;}
  if(!active&&ai.crownSeen>=react){if(f.meter>=100)input.ult=true;else if(f.cd[0]<=0)input.skill1=true;else return false;return true;}
  // No body-wide shield: only fixed incoming paths that can reach the orbit
  // after setup may motivate a defensive cast; remote misses cannot.
  const q=s.shots.find(q=>{if(q.owner===f.team||q.boss||s.boss&&q.owner===1||q.life<=.5||q.speed<=0||dist(q,f)>=9)return false;const arrival=((f.x-q.x)*q.dx+(f.y-q.y)*q.dy)/q.speed;return arrival>.5&&arrival<q.life&&Math.abs((f.x-q.x)*q.dy-(f.y-q.y)*q.dx)<1.5;});
  ai.crownIncoming=q?(ai.crownIncoming||0)+dt:0;if(!active&&q&&ai.crownIncoming>=react&&(f.cd[0]<=0||f.meter>=100)){const a=Math.atan2(q.y-f.y,q.x-f.x)-4*Math.max(0,(dist(q,f)-1.2)/q.speed-.32);input.aimX=Math.cos(a);input.aimY=Math.sin(a);if(f.meter>=100)input.ult=true;else input.skill1=true;return true;}
 }
 return false;
}
export function batch05DangerAi(s,f,input,dt){const ai=s.ai[f.team],react={easy:.32,normal:.2,hard:.12}[s.difficulty]??.2;
 const h=s.hazards.find(h=>h.owner!==f.team&&h.t>0&&!h.triggered&&(['bloomPlant','bloomBud'].includes(h.kind)&&dist(f,h)<h.r+.35||['bloomFan','crownDrop','crownLink'].includes(h.kind)&&segment(h,{x:h.endX??h.x+h.dx*h.r,y:h.endY??h.y+h.dy*h.r},f)<h.r+.35));
 if(!h){ai.b05Seen=0;return false;}ai.b05Seen=(ai.b05Seen||0)+dt;if(ai.b05Seen<react)return false;
 const v=['bloomPlant','bloomBud'].includes(h.kind)?(dist(f,h)>1e-4?norm(f.x-h.x,f.y-h.y):{x:-f.fy,y:f.fx}):norm(-(h.endY-h.y||h.dy),h.endX-h.x||h.dx);input.x=v.x;input.y=v.y;
 if(f.dodgeCd<=0&&(h.kind==='bloomBud'?h.shatterIn:h.arm)<.2)input.dodge=true;return true;
}
