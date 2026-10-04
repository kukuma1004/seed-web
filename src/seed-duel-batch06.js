// Original SOLO forms: a breathing contact ring and a fixed, cover-clipped
// hitscan spear. Shared host owns guard/parry/HP/meter/rounds and input chords.
const skill=(name,cooldown,desc)=>Object.freeze({name,cooldown,desc});
export const DUEL_BATCH06=Object.freeze({
 starring:Object.freeze({id:'starring',comboId:'starring',solo:true,law:'orbit',name:'별의 고리 씨앗',role:'숨 쉬는 고리 · 안과 밖의 거리 재기',hp:178,speed:4.2,reach:1.9,arc:1.2,comboReach:[1.6,1.95,2.3],comboArc:[1.4,1.1,1.5],damage:[9,10,13],cadence:.38,heavy:{damage:23,reach:2.6},parry:1,tile:6,ink:'#c7edbd',skills:[skill('별 숨 들이쉬기',5.8,'1.5→3.2→1.5 반경을 2.4초 동안 숨 쉬는 꽃잎 · 실제 접점과 일반 탄 두 개까지만'),skill('고리 접기',4.9,'펼친 반경을 예고 후 안으로 접어요 · 고리 안쪽에는 안전한 빈틈')],ult:skill('초신성 한 호흡',0,'여섯 꽃잎이 빠르게 한 번 숨 쉬어요 · 일반 탄 세 개와 접촉 세 번까지'),blurb:'3타나 강공격을 막히지 않게 맞히면 접을 때 쓸 박자를 하나 얻어요. 별의 반경을 따라 걷거나 안쪽 빈 공간으로 들어오면 고리를 피할 수 있어요.'}),
 glassspear:Object.freeze({id:'glassspear',comboId:'glassspear',solo:true,law:'pierce',name:'유리 창날 씨앗',role:'고정한 긴 한 줄 · 옆과 회수의 빈틈',hp:172,speed:4.05,reach:2.6,arc:.4,comboReach:[2.25,2.6,3],comboArc:[.35,.4,.28],damage:[8,10,14],cadence:.4,heavy:{damage:24,reach:3.4},parry:1,tile:4,ink:'#d5eeff',skills:[skill('긴 유리 전개',6,'방향을 고정해 예고한 뒤 창이 빠르게 뻗어요 · 벽에 멈춰요 · 위성 탄막은 통과, 막기·회피는 유효'),skill('창자루 거두기',5.2,'짧은 전방 예고 뒤 창자루를 밀며 조금 물러나요 · 회수 중 무적은 없어요')],ult:skill('유리 폭우의 틈',0,'세 긴 줄을 먼저 고정해 펼쳐요 · 겹쳐 맞아도 피해는 한 번, 옆에는 탈출구'),blurb:'막히지 않은 3타·강공격·전개 적중은 다음 관통을 12%씩, 두 겹까지만 보태요. 먼 줄에는 강하지만 준비와 회수 사이에는 근접·측면 공격을 피하지 못해요.'})
});
export const DUEL_BATCH06_STORY=Object.freeze([
 ['starring','별이 숨을 고르는 자리','어려움','hard','내 고리는 계속 커지는 게 아니야. 밖으로 한 번, 안으로 한 번. 별 사이에도, 내 발 곁에도 네가 설 자리는 남아 있어!','1.5→3.2 반경 변화를 살피세요. 꽃잎의 실제 접점만 베거나 탄을 막고, 몸 가까이는 열려 있어요. 접기 예고 때 안쪽으로 들어오거나 바깥으로 나오세요.','같은 별을 돌았는데 너는 다른 길을 걸었네. 다음 숨은 그 길을 비워 두고 시작할게.'],
 ['glassspear','투명한 길의 끝','어려움','hard','아주 길게 볼 수는 있지만 한 번 정한 길은 바꾸지 못해. 유리가 뻗기 전에 보이는 한 줄, 그 옆이 네 길이야.','긴 선이 고정되면 옆으로 피하거나 기둥 뒤에 서세요. 창은 벽에 멈춰요. 가까이 붙으면 준비를 끊거나 회수하는 빈틈을 노릴 수 있어요.','먼 곳만 보다가 네가 가까이 와 있는 줄도 몰랐어. 이제 길의 끝보다 곁의 작은 발소리를 먼저 들을게.']
]);
export const DUEL_BATCH06_KINDS=Object.freeze(['starBreath','starFold','glassLine','glassWithdraw']);
export const DUEL_BATCH06_AUDIO=Object.freeze({starOpen:['shot',{pitch:.95}],starFold:['reflect',{pitch:1.15}],starContact:['hit',{pitch:1.1}],starIntercept:['reflect',{pitch:1.25}],glassExtend:['shotPierce',{pitch:1.15}],glassWithdraw:['shot',{pitch:.85}]});
const norm=(x,y)=>{const d=Math.hypot(x,y)||1;return{x:x/d,y:y/d};};
const dist=(a,b)=>Math.hypot(a.x-b.x,a.y-b.y);
const front=(f,o)=>{const v=norm(f.x-o.x,f.y-o.y);return o.blocking&&v.x*o.fx+v.y*o.fy>-.2;};
const segment=(a,b,p)=>{const dx=b.x-a.x,dy=b.y-a.y,k=Math.max(0,Math.min(1,((p.x-a.x)*dx+(p.y-a.y)*dy)/(dx*dx+dy*dy||1)));return Math.hypot(p.x-a.x-dx*k,p.y-a.y-dy*k);};
const activeRing=(s,f)=>s.hazards.find(h=>h.owner===f.team&&h.kind==='starBreath'&&h.t>0);
const radius=(h,t)=>1.5+1.7*(.5-.5*Math.cos(Math.PI*2*Math.min(t,h.period)/h.period));
function windup(f,t){f.state='skill';f.total=f.t=t;f.blocking=false;f.inv=0;}
function clipped(s,f,dx,dy,length,ctx){let p={x:f.x,y:f.y};for(let n=.2;n<=length+.001;n+=.2){const q={x:f.x+dx*n,y:f.y+dy*n};if(ctx.wall(q)||ctx.blocked(p,q))break;p=q;}return p;}
export function batch06Melee(s,f,{step,heavy,hit,guarded}){if((heavy||step===2)&&hit&&!guarded){if(f.char==='starring'){f.starBeat=1;f.starBeatTime=4;}if(f.char==='glassspear'){f.glassFacet=Math.min(2,(f.glassFacet||0)+1);f.glassFacetTime=5;}}}
export function batch06Action(s,f,index,ctx,ult=false){
 if(f.char==='starring'){
  const ring=activeRing(s,f);if(!ult&&index===1){const r=ring?.r??2.15;if(ring)ring.t=0;const beat=f.starBeat||0;f.starBeat=f.starBeatTime=0;windup(f,.72);ctx.area(s,f,'starFold',{x:f.x,y:f.y,r,outer:r,inner:1.5,arm:.35,t:.62,age:0,damage:12+beat*3,cast:(f.starCast=(f.starCast||0)+1),triggered:false});ctx.event(s,'starFold');return;}
  if(ring)ring.t=0;const arm=ult?.55:.4;windup(f,arm+.22);const period=ult?1.2:2.4;ctx.area(s,f,'starBreath',{x:f.x,y:f.y,r:1.5,arm,t:arm+period+.05,age:0,period,count:ult?6:5,angle:Math.atan2(f.fy,f.fx),cast:(f.starCast=(f.starCast||0)+1),budget:{hits:0,max:ult?3:2,blocks:ult?3:2},damage:ult?10:9,contacts:new Set()});ctx.event(s,'starOpen');
 }else if(f.char==='glassspear'){
  const cast=(f.glassCast=(f.glassCast||0)+1);if(!ult&&index===1){windup(f,.71);const end=clipped(s,f,f.fx,f.fy,2.4,ctx);ctx.area(s,f,'glassWithdraw',{x:f.x,y:f.y,endX:end.x,endY:end.y,dx:f.fx,dy:f.fy,r:.3,arm:.35,t:.52,damage:10,cast});ctx.event(s,'glassWithdraw');return;}
  const facets=f.glassFacet||0;f.glassFacet=f.glassFacetTime=0;const arm=ult?.65:.52;windup(f,arm+.48);const budget={hits:0,max:1};
  for(const off of (ult?[-.32,0,.32]:[0])){const a=Math.atan2(f.fy,f.fx)+off,dx=Math.cos(a),dy=Math.sin(a),end=clipped(s,f,dx,dy,8.4,ctx);ctx.area(s,f,'glassLine',{x:f.x,y:f.y,endX:end.x,endY:end.y,dx,dy,r:.2,arm,t:arm+.16,age:0,length:dist(f,end),damage:ult?32:18*(1+.12*facets),cast,budget,earned:false});}
 }
}
export function batch06InterceptShot(s,q,x0,y0,dt,ctx){
 if(q.wardSpent||q.boss||s.boss&&q.owner===1)return false;
 for(const h of s.hazards){if(h.kind!=='starBreath'||h.owner===q.owner||h.t<=dt||h.arm>dt||h.budget.blocks<=0)continue;const f=s.fighters[h.owner];if(h.arm>0&&(f.stun>0||f.state!=='skill'||h.cast!==f.starCast))continue;
  const age=Math.min(h.period,h.age+Math.max(0,dt-h.arm)),r=radius(h,age);for(let k=0;k<h.count;k++){const a=h.angle+age*2.2+k*Math.PI*2/h.count,p={x:f.x+Math.cos(a)*r,y:f.y+Math.sin(a)*r};if(ctx.wall(p)||ctx.blocked?.(f,p)||segment({x:x0,y:y0},q,p)>=.46)continue;q.wardSpent=true;q.life=0;q.bloomSpent=q.collapseSpent=true;h.budget.blocks--;ctx.fx(s,'starBlock',p.x,p.y,{ink:'#c7edbd',life:.16,max:.16});ctx.event(s,'starIntercept');return true;}
 }return false;
}
export function batch06Tick(s,dt,ctx){
 for(const f of s.fighters){f.starBeatTime=Math.max(0,(f.starBeatTime||0)-dt);if(!f.starBeatTime)f.starBeat=0;f.glassFacetTime=Math.max(0,(f.glassFacetTime||0)-dt);if(!f.glassFacetTime)f.glassFacet=0;}
 for(const h of s.hazards){if(!DUEL_BATCH06_KINDS.includes(h.kind)||h.t<=0)continue;const oldArm=h.arm,arming=oldArm>0;h.t-=dt;h.arm=Math.max(0,h.arm-dt);const f=s.fighters[h.owner],o=s.fighters[1-h.owner];
  // Keep final arming-frame interruption checks before making damage active.
  if((arming||h.kind!=='starBreath')&&(f.stun>0||f.state!=='skill'||h.cast!==(f.char==='starring'?f.starCast:f.glassCast))){h.t=0;continue;}
  if(h.arm>0)continue;const activeDt=Math.max(0,dt-oldArm);
  if(h.kind==='starBreath'){
   h.age=Math.min(h.period,h.age+activeDt);h.x=f.x;h.y=f.y;h.r=radius(h,h.age);for(let k=0;k<h.count;k++){const a=h.angle+h.age*2.2+k*Math.PI*2/h.count,p={x:h.x+Math.cos(a)*h.r,y:h.y+Math.sin(a)*h.r};if(h.contacts.has(k)||h.budget.hits>=h.budget.max||o.inv>0||dist(p,o)>=.5||ctx.blocked(h,p)||ctx.blocked(p,o))continue;h.contacts.add(k);h.budget.hits++;ctx.strike(s,f,o,h.damage,{kind:'skill',stun:.1,knock:.25});ctx.fx(s,'starCut',p.x,p.y,{ink:'#c7edbd',life:.2,max:.2});ctx.event(s,'starContact');}
  }else if(h.kind==='starFold'){
   const previous=h.r;h.age+=activeDt;h.r=h.outer+(h.inner-h.outer)*Math.min(1,h.age/.2);const d=dist(h,o);if(!h.triggered&&o.inv<=0&&d>=Math.min(previous,h.r)-.45&&d<=Math.max(previous,h.r)+.45&&!ctx.blocked(h,o)){h.triggered=true;ctx.strike(s,f,o,h.damage,{kind:'skill',stun:.16,knock:.45});}ctx.fx(s,'starFoldTrace',h.x,h.y,{r:h.r,ink:'#c7edbd',life:.04,max:.04});
  }else if(h.kind==='glassLine'){
   const before=h.age;h.age=Math.min(.12,h.age+activeDt);const n=h.length*h.age/.12,end={x:h.x+h.dx*n,y:h.y+h.dy*n};h.drawEndX=end.x;h.drawEndY=end.y;
   if(h.budget.hits<h.budget.max&&o.inv<=0&&!ctx.blocked(h,o)&&segment(h,end,o)<h.r+.35){h.budget.hits++;const guarded=front(f,o),hit=ctx.strike(s,f,o,h.damage,{kind:'skill',stun:.18,knock:.6});if(hit&&!guarded){f.glassFacet=Math.min(2,(f.glassFacet||0)+1);f.glassFacetTime=5;}ctx.fx(s,'glassImpact',o.x,o.y,{ink:'#d5eeff',life:.18,max:.18});}
   if(before===0)ctx.event(s,'glassExtend');
  }else if(!h.triggered){h.triggered=true;if(o.inv<=0&&!ctx.blocked(h,o)&&segment(h,{x:h.endX,y:h.endY},o)<h.r+.35)ctx.strike(s,f,o,h.damage,{kind:'skill',stun:.12,knock:.8});f.x-=h.dx*.65;f.y-=h.dy*.65;ctx.clampArena(f);ctx.fx(s,'glassRetract',h.x,h.y,{endX:h.endX,endY:h.endY,ink:'#d5eeff',life:.2,max:.2});}
 }
}
export function batch06Ai(s,f,o,input,dt){const ai=s.ai[f.team],d=dist(f,o),react={easy:.32,normal:.2,hard:.12}[s.difficulty]??.2;
 if(f.char==='starring'){
  const ring=activeRing(s,f),safe=!['attack','heavy'].includes(o.state);ai.starSeen=d>2.35&&d<4&&safe?(ai.starSeen||0)+dt:0;
  if(ring&&ring.arm===0&&ring.r>2.4&&d>1.8&&d<ring.r+.2&&f.cd[1]<=0&&o.state==='heavy'){input.skill2=true;return true;}
  if(!ring&&ai.starSeen>=react){if(f.meter>=100)input.ult=true;else if(f.cd[0]<=0)input.skill1=true;else return false;return true;}
  if(!ring&&f.cd[1]<=0&&(f.starBeat||0)&&d>1.6&&d<2.4&&safe){input.skill2=true;return true;}
 }else if(f.char==='glassspear'){
  if(d>3.9&&d<7.6&&!['attack','heavy'].includes(o.state)){if(f.meter>=100)input.ult=true;else if(f.cd[0]<=0)input.skill1=true;else return false;return true;}
  ai.glassThreat=d<2.6&&(o.state==='attack'&&o.hitDone||o.state==='heavy'&&o.hitDone)?(ai.glassThreat||0)+dt:0;if(f.cd[1]<=0&&ai.glassThreat>=react){input.skill2=true;return true;}
 }return false;
}
export function batch06DangerAi(s,f,input,dt){const ai=s.ai[f.team],react={easy:.32,normal:.2,hard:.12}[s.difficulty]??.2;
 const h=s.hazards.find(h=>h.owner!==f.team&&h.t>0&&h.arm>0&&(h.kind==='glassLine'||h.kind==='glassWithdraw'?segment(h,{x:h.endX,y:h.endY},f)<h.r+.35:h.kind==='starFold'&&dist(h,f)>h.inner-.45&&dist(h,f)<h.outer+.45));
 if(!h){ai.b06Seen=0;return false;}ai.b06Seen=(ai.b06Seen||0)+dt;if(ai.b06Seen<react)return false;
 const v=h.kind==='starFold'?norm(f.x-h.x,f.y-h.y):{x:-h.dy,y:h.dx};input.x=v.x;input.y=v.y;if(f.dodgeCd<=0&&h.arm<.18)input.dodge=true;return true;
}
