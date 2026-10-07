// Three canonical FUSION laws, finite 1:1 translations. No public promotion.
const skill=(name,cooldown,desc)=>Object.freeze({name,cooldown,desc});
export const DUEL_BATCH11=Object.freeze({
 sunmirror:Object.freeze({id:'sunmirror',comboId:'sunmirror',inspectionOnly:true,artReady:false,law:'reflect',name:'태양 거울',role:'느린 정면 흡수핵 · 받은 빛만 폭발 강화',hp:172,speed:4.1,reach:1.8,arc:1.1,comboReach:[1.55,1.9,2.15],comboArc:[.65,1.3,.8],comboNames:['거울 모서리','햇살 펼치기','태양핵 밀기'],damage:[9,10,14],cadence:.39,heavy:{damage:23,reach:2.3},parry:1.1,tile:0,ink:'#efd585',skills:[skill('나아가는 태양핵',6.8,'느린 정면 거울 하나. 실제 일반 탄 두 발까지 흡수하면 멈춘 자리의 지연 폭발이 강해져요. 보스 탄 한 발은 막지만 충전은 없어요'),skill('햇살 접어 터뜨리기',5.3,'날아가는 태양핵을 현재 자리에서 멈춰 다시 예고하고 터뜨려요. 핵이 없으면 짧게 베어요')],ult:skill('세 빛의 작은 태양',0,'거울 하나가 일반 탄 세 발·보스 탄 두 발까지만 받으며 한 번 터져요. 몸·옆·뒤·근접은 보호하지 않아요'),blurb:'막히지 않은 3타·강공격은 다음 핵에 작은 열 하나를 더해요. 정면으로 실제 날아오는 탄만 모으고, 빈 핵은 작은 폭발로 끝나요. 폭발 자리는 고정돼요.'}),
 comethalo:Object.freeze({id:'comethalo',comboId:'comethalo',inspectionOnly:true,artReady:false,law:'orbit',name:'혜성 화관',role:'한 혜성의 각도 공백 · 걸어서 모은 열',hp:175,speed:4.3,reach:1.75,arc:1.2,comboReach:[1.65,1.8,2.25],comboArc:[1.35,.65,1.15],comboNames:['화관 쓸기','봉오리 찌르기','혜성 내려치기'],damage:[9,11,13],cadence:.38,heavy:{damage:22,reach:2.35},parry:1,tile:3,ink:'#eec091',skills:[skill('걷는 혜성 한 송이',6.5,'혜성 하나가 몸에서 떨어져 공전해요. 실제로 걸어 열을 모아야 접점에서 지연 폭발해요. 일반 탄 한 발만 막고 보스 탄은 지나가요'),skill('모은 혜성 내려놓기',5.2,'충전된 실제 혜성의 현재 자리에만 고정 지연 폭발을 놓아요. 열이 부족하면 조용히 화관을 접어요')],ult:skill('넓게 도는 큰 봉오리',0,'큰 반경의 혜성 하나. 이동 충전·한 번의 폭발·일반 탄 한 발 상한을 지켜요. 몸 가까이와 각도 사이에는 틈이 있어요'),blurb:'서 있으면 열이 빠져요. 실제 3타·강공격은 다음 봉오리에 첫 걸음의 열 .25만 보태고, 나머지는 걸어야 해요. 폭발 예고를 보고 공전의 안쪽이나 반대 각도로 피하세요.'}),
 returnflare:Object.freeze({id:'returnflare',comboId:'returnflare',inspectionOnly:true,artReady:false,law:'recall',name:'귀환 불씨',role:'몸으로 바꾸는 귀로 · 목표와 도착의 늦은 폭발',hp:174,speed:4.25,reach:1.85,arc:1.05,comboReach:[1.6,2.15,1.9],comboArc:[1.25,.6,1.2],comboNames:['따뜻한 잎 베기','불씨길 찌르기','귀로 접기'],damage:[9,11,14],cadence:.37,heavy:{damage:23,reach:2.3},parry:1,tile:6,ink:'#efb27a',skills:[skill('불씨 한 번 보내기',6.6,'불씨 한 개가 나갈 때·돌아올 때 각 한 번 긁어요. 실제 목표 지점과 실제 잡은 지점에 지연 폭발 하나씩 · 둘까지만'),skill('귀로 일찍 접기',5.1,'회수 예고를 거친 유료 회수. 준비를 맞으면 현재 비행은 그대로 이어져요. 이미 돌아오는 불씨는 더 빨라지지 않아요')],ult:skill('두 자리의 큰 온기',0,'불씨 하나의 왕복. 목표·실제 도착 두 폭발을 강화하지만 합쳐 두 번까지만. 이동하며 잡는 위치를 바꿔요'),blurb:'막히지 않은 3타·강공격은 다음 두 폭발의 열을 둘 보태요. 실제 왕복 적중 뒤 잡아야 다음 짧은 접기가 강해져요. 기둥·회피·옆걸음은 왕복과 늦은 폭발 모두 피할 수 있어요.'})
});
export const DUEL_BATCH11_KINDS=Object.freeze(['sunSend','sunBurst','sunFold','cometOrbit','cometBurst','returnSend','returnRecall','returnBurst','returnFold']);
export const DUEL_BATCH11_SHOTS=Object.freeze(['sunCore','returnCoal']);
export const DUEL_BATCH11_AUDIO=Object.freeze({sunOpen:['reflect',{pitch:.85}],sunAbsorb:['reflect',{pitch:1.15}],sunBlock:['reflect',{pitch:.7}],sunClose:['burstHit',{pitch:.9}],cometOpen:['shot',{pitch:.9}],cometWarm:['shotBurst',{pitch:1.1}],cometBlock:['reflect',{pitch:1.2}],cometDrop:['burstHit',{pitch:.8}],cometDry:['shot',{pitch:.75}],coalSend:['shotBurst',{pitch:.85}],coalRecall:['shotReturn',{pitch:.9}],coalCatch:['shotReturn',{pitch:1.2}],coalBurst:['burstHit',{pitch:.85}]});
export const DUEL_BATCH11_STORY=Object.freeze([
 ['sunmirror','빌려온 햇살의 무게','햇살은 혼자 모으는 게 아니야. 네가 날려 준 작은 빛을 받으면 한 번 더 환해져. 그렇지만 내 옆과 뒤까지 밝히지는 못해!','느린 거울의 정면 접점에 닿은 일반 탄만 충전돼요. 빈 거울은 약하고 큰 보스의 탄은 유한하게 막기만 해요. 가까이 들어가거나 고정 폭발 예고에서 벗어나세요.','받은 빛만큼만 돌려주는 게 좋구나. 이제 화관 친구의 작은 걸음을 따라가 보자.'],
 ['comethalo','걷는 동안 자라는 꽃','가만히 있으면 내 꽃도 식어. 한 송이뿐이라 네가 들어올 틈은 많아. 내가 걷는 길을 보면 꽃을 내려놓을 자리도 알 수 있을 거야!','공전하는 실제 한 봉오리만 닿아요. 이동을 멈추면 충전이 빠지고, 안쪽·반대 각도는 열려 있어요. 내려놓은 자리의 지연 폭발은 따라오지 않아요.','많이 걷는 것보다 네 길을 남기는 일이 더 어렵네. 따뜻한 불씨가 돌아오는 길도 보고 싶어.'],
 ['returnflare','다시 만나는 두 자리','불씨는 네가 있던 곳에서 한 번, 내가 잡은 곳에서 한 번 피어나. 돌아오는 동안 내가 걸으면 마지막 자리가 달라져. 그래도 네 발밑을 따라가지는 않아!','왕복 경로는 실제로 움직여요. 목표와 잡는 자리에 먼저 생기는 폭발 예고를 피하고, 회수 준비를 맞히면 비행을 끊지 않고 계속 보낼 수 있어요.','멀리 보냈던 온기를 다른 자리에서 다시 만났네. 돌아오는 길에도 우리 둘의 자리가 남아 있어서 다행이야.']
].map(([enemy,title,before,tip,after],i,a)=>Object.freeze({id:'inspect-'+enemy,enemy,inspectionOnly:true,unlockAfter:i?'inspect-'+a[i-1][0]:null,title,difficulty:'hard',before,tip,after})));
const norm=(x,y)=>{const d=Math.hypot(x,y)||1;return{x:x/d,y:y/d};},dist=(a,b)=>Math.hypot(a.x-b.x,a.y-b.y);
const segment=(a,b,p)=>{const dx=b.x-a.x,dy=b.y-a.y,k=Math.max(0,Math.min(1,((p.x-a.x)*dx+(p.y-a.y)*dy)/(dx*dx+dy*dy||1)));return Math.hypot(p.x-a.x-dx*k,p.y-a.y-dy*k);};
const front=(f,o)=>{const v=norm(f.x-o.x,f.y-o.y);return o.blocking&&v.x*o.fx+v.y*o.fy>-.2;};
const windup=(f,t)=>Object.assign(f,{state:'skill',total:t,t,blocking:false,inv:0});
const live=(s,f,kind)=>s.shots.find(q=>q.owner===f.team&&q.kind===kind&&q.life>0);
const orbit=(s,f)=>s.hazards.find(h=>h.owner===f.team&&h.kind==='cometOrbit'&&h.t>0);
function retire(s,f,kinds){for(const h of s.hazards)if(h.owner===f.team&&kinds.includes(h.kind)){h.t=0;h.cancelled=true;}for(const q of s.shots)if(q.owner===f.team&&kinds.includes(q.kind)){q.life=0;q.spent=true;}}
export const cometPoint=(h,f)=>({x:f.x+Math.cos(h.angle)*h.r,y:f.y+Math.sin(h.angle)*h.r});
export function batch11Melee(s,f,{step,heavy,hit,guarded}){if(!hit||guarded||!heavy&&step!==2)return;const key={sunmirror:'sunHeat',comethalo:'cometStride',returnflare:'returnHeat'}[f.char];if(key){f[key]=f.char==='comethalo'?.25:1;f[key+'Time']=4;}}
function sunBurst(s,f,q,ctx,paid=false){if(q.spent)return;q.spent=true;ctx.area(s,f,'sunBurst',{x:q.x,y:q.y,r:1.1+q.charge*.12,arm:.4,t:.52,damage:q.damage+q.charge*4,paid,cast:f.fusion11Cast});ctx.event(s,'sunClose');}
function returnBurst(s,f,q,p,home,ctx){if(q.spent||q.budget.bursts>=2)return;q.budget.bursts++;ctx.area(s,f,'returnBurst',{...p,r:home?1.3:1.05,arm:home?.42:.38,t:home?.55:.51,damage:(home?q.ult?14:10:q.ult?12:8)+q.heat*2,budget:q.budget});ctx.event(s,'coalBurst');}
export function batch11Action(s,f,index,ctx,ult=false){
 const cast=f.fusion11Cast=(f.fusion11Cast||0)+1;
 if(f.char==='sunmirror'){
  const q=live(s,f,'sunCore');if(index===1&&!ult){windup(f,.6);if(q){q.life=0;sunBurst(s,f,q,ctx,true);}else{const heat=f.sunHeat||0;f.sunHeat=f.sunHeatTime=0;ctx.area(s,f,'sunFold',{x:f.x,y:f.y,endX:f.x+f.fx*2.2,endY:f.y+f.fy*2.2,dx:f.fx,dy:f.fy,r:.3,arm:.3,t:.42,cast,damage:11+heat*3});}ctx.event(s,'sunClose');return;}
  retire(s,f,['sunSend','sunCore']);const heat=f.sunHeat||0;f.sunHeat=f.sunHeatTime=0;windup(f,ult?.95:.75);const arm=ult?.55:.38;ctx.area(s,f,'sunSend',{x:f.x,y:f.y,dx:f.fx,dy:f.fy,endX:f.x+f.fx*5,endY:f.y+f.fy*5,r:.35,arm,t:arm+.1,cast,damage:(ult?14:10)+heat*2,ordinary:ult?3:2,boss:ult?2:1});ctx.event(s,'sunOpen');
 }else if(f.char==='comethalo'){
  const h=orbit(s,f);if(index===1&&!ult){windup(f,.62);if(h){const p=cometPoint(h,f);h.t=0;if(h.charge>=.7&&!ctx.wall(p)&&!ctx.blocked(f,p)){ctx.area(s,f,'cometBurst',{...p,r:1.25,arm:.38,t:.52,cast,damage:10+Math.min(1,h.charge)*4,paid:true});ctx.event(s,'cometDrop');}else ctx.event(s,'cometDry');}else ctx.event(s,'cometDry');return;}
  retire(s,f,['cometOrbit']);const stride=f.cometStride||0;f.cometStride=f.cometStrideTime=0;const arm=ult?.5:.35;windup(f,arm+.28);ctx.area(s,f,'cometOrbit',{x:f.x,y:f.y,r:ult?2.1:1.7,angle:Math.atan2(f.fy,f.fx),arm,t:arm+(ult?3.1:2.6),cast,charge:stride,prevX:f.x,prevY:f.y,contact:false,blocks:1,ult});ctx.event(s,'cometOpen');
 }else if(f.char==='returnflare'){
  const q=live(s,f,'returnCoal');if(index===1&&!ult){windup(f,.5);if(q&&!q.back)ctx.area(s,f,'returnRecall',{x:q.x,y:q.y,r:.3,arm:.24,t:.36,cast,q,qCast:q.cast,qReflections:q.reflections||0});else if(!q){const warm=f.returnWarm||0;f.returnWarm=f.returnWarmTime=0;ctx.area(s,f,'returnFold',{x:f.x,y:f.y,endX:f.x+f.fx*2.2,endY:f.y+f.fy*2.2,dx:f.fx,dy:f.fy,r:.3,arm:.3,t:.43,cast,damage:10+warm*3});}ctx.event(s,'coalRecall');return;}
  // Recovery leaves a real .13s input window before the automatic .55s turn,
  // enough for the paid .24s recall warning to finish earlier than auto-return.
  retire(s,f,['returnSend','returnCoal','returnRecall']);const heat=f.returnHeat||0;f.returnHeat=f.returnHeatTime=0;const arm=ult?.55:.35;windup(f,arm+.18);ctx.area(s,f,'returnSend',{x:f.x,y:f.y,dx:f.fx,dy:f.fy,endX:f.x+f.fx*5,endY:f.y+f.fy*5,r:.25,arm,t:arm+.09,cast,heat,ult,budget:{out:0,back:0,bursts:0}});ctx.event(s,'coalSend');
 }
}
// Only actual swept projectile contact at the physical object intercepts.
// Side/rear lanes, melee, grabs and boss rays through the orbit stay legal.
export function batch11InterceptShot(s,q,x0,y0,dt,ctx){
 if(q.life<=0||q.wardSpent||q.sunSpent||q.hallReturned||q.kind==='hallReturn')return false;
 const f=s.fighters[1-q.owner],boss=q.boss||s.boss&&q.owner===1,start={x:x0,y:y0},core=live(s,f,'sunCore');
 if(core&&core!==q&&core[boss?'bossBlocks':'ordinary']>0&&q.dx*core.dx+q.dy*core.dy<-.25&&segment(start,q,core)<.43&&!ctx.blocked(start,core)){
  core[boss?'bossBlocks':'ordinary']--;if(!boss)core.charge++;q.life=0;q.wardSpent=q.sunSpent=q.spent=q.returnSpent=q.bloomSpent=q.collapseSpent=q.crunchSpent=true;ctx.event(s,boss?'sunBlock':'sunAbsorb');ctx.fx(s,'parry',core.x,core.y,{life:.16,max:.16});return true;
 }
 const h=orbit(s,f);if(!boss&&h&&h.arm<=0&&h.blocks>0){const p=cometPoint(h,f);if(!ctx.wall(p)&&!ctx.blocked(f,p)&&!ctx.blocked(start,p)&&segment(start,q,p)<.45){h.blocks--;q.life=0;q.wardSpent=q.sunSpent=q.spent=q.returnSpent=q.bloomSpent=q.collapseSpent=q.crunchSpent=true;ctx.event(s,'cometBlock');ctx.fx(s,'parry',p.x,p.y,{life:.16,max:.16});return true;}}
 return false;
}
export function batch11Tick(s,dt,ctx){
 for(const f of s.fighters)for(const key of ['sunHeat','cometStride','returnHeat','returnWarm']){f[key+'Time']=Math.max(0,(f[key+'Time']||0)-dt);if(!f[key+'Time'])f[key]=0;}
 for(const h of [...s.hazards]){if(!DUEL_BATCH11_KINDS.includes(h.kind)||h.t<=0)continue;const before=h.arm;h.t-=dt;h.arm=Math.max(0,h.arm-dt);const f=s.fighters[h.owner],o=s.fighters[1-h.owner];
  // A physical shield or mirror may hand this same object to another owner.
  // Old paid callbacks cannot control the handed-off shot, even if it returns
  // to the first team later: launch and reflection identities must still match.
  if(h.kind==='returnRecall'&&(h.q.owner!==h.owner||h.q.kind!=='returnCoal'||h.q.cast!==h.qCast||(h.q.reflections||0)!==h.qReflections)){h.t=0;h.cancelled=true;continue;}
  const pending=h.paid||['sunSend','sunFold','cometOrbit','returnSend','returnRecall','returnFold'].includes(h.kind);if(before>0&&pending&&(f.stun>0||f.state!=='skill'||f.fusion11Cast!==h.cast)){h.t=0;h.cancelled=true;continue;}if(h.arm>0)continue;
  if(h.kind==='cometOrbit'){
   const previous={x:h.rockX??h.prevX+Math.cos(h.angle)*h.r,y:h.rockY??h.prevY+Math.sin(h.angle)*h.r},moved=f.stun<=0&&!['hit','broken','stagger'].includes(f.state)?Math.min(dist({x:h.prevX,y:h.prevY},f),DUEL_BATCH11.comethalo.speed*dt*1.4):0,activeDt=Math.max(0,dt-before);h.prevX=f.x;h.prevY=f.y;h.angle+=activeDt*2.4;h.charge=Math.min(1,Math.max(0,h.charge+moved*.75-activeDt*.34));h.x=f.x;h.y=f.y;const p=cometPoint(h,f);h.rockX=p.x;h.rockY=p.y;
   if(ctx.wall(p)||ctx.blocked(f,p)||ctx.blocked(p,o)||o.inv>0||segment(previous,p,o)>.48)continue;
   if(!h.contact){h.contact=true;ctx.strike(s,f,o,4,{kind:'shot',stun:.08,knock:.1});}
   if(h.charge>=.7){h.t=0;ctx.area(s,f,'cometBurst',{...p,r:1.25,arm:.38,t:.52,damage:h.ult?18:12});ctx.event(s,'cometWarm');}continue;
  }
  if(h.triggered)continue;h.triggered=true;
  if(h.kind==='sunSend')ctx.shoot(s,f,{kind:'sunCore',x:h.x,y:h.y,dx:h.dx,dy:h.dy,speed:3.1,life:1.4,damage:h.damage,ordinary:h.ordinary,bossBlocks:h.boss,charge:0});
  else if(h.kind==='returnSend')ctx.shoot(s,f,{kind:'returnCoal',x:h.x,y:h.y,dx:h.dx,dy:h.dy,speed:9,life:2.6,age:0,back:false,heat:h.heat,ult:h.ult,budget:h.budget,earned:false,cast:h.cast});
  else if(h.kind==='returnRecall'){if(h.q.life>0&&!h.q.spent&&!h.q.back){returnBurst(s,f,h.q,{x:h.q.x,y:h.q.y},false,ctx);h.q.back=true;ctx.event(s,'coalRecall');}}
  else if(h.kind==='sunFold'||h.kind==='returnFold'){if(o.inv<=0&&!ctx.blocked(h,o)&&segment(h,{x:h.endX,y:h.endY},o)<h.r+.35)ctx.strike(s,f,o,h.damage,{kind:'skill',stun:.17,knock:.3});}
  else if(o.inv<=0&&dist(h,o)<h.r+.3&&!ctx.blocked(h,o))ctx.strike(s,f,o,h.damage,{kind:'skill',stun:.16,knock:.3});
 }
 for(const q of [...s.shots]){if(!DUEL_BATCH11_SHOTS.includes(q.kind)||q.life<=0||q.hallTurnAt===s.time)continue;const f=s.fighters[q.owner],o=s.fighters[1-q.owner],moveDt=Math.min(dt,q.life);q.life-=dt;
  if(q.kind==='returnCoal'){q.age+=moveDt;if(!q.back&&q.age>=.55){returnBurst(s,f,q,{x:q.x,y:q.y},false,ctx);q.back=true;ctx.event(s,'coalRecall');}if(q.back){const v=norm(f.x-q.x,f.y-q.y);q.dx=v.x;q.dy=v.y;q.speed=8.5;}}
  const a={x:q.x,y:q.y},b={x:q.x+q.dx*q.speed*moveDt,y:q.y+q.dy*q.speed*moveDt},surface=ctx.surfaceHit?.(a,b);Object.assign(q,b);if(ctx.interceptShot?.(s,q,a.x,a.y,0))continue;
  if(surface||ctx.wall(q)||(!ctx.surfaceHit&&ctx.blocked(a,b))){q.x=surface?surface.x+surface.nx*.1:a.x;q.y=surface?surface.y+surface.ny*.1:a.y;if(q.kind==='sunCore')q.life=0;else if(!q.back){returnBurst(s,f,q,{x:q.x,y:q.y},false,ctx);q.back=true;ctx.event(s,'coalRecall');}else q.life=0;}
  if(q.kind==='sunCore'){if(o.inv<=0&&segment(a,q,o)<.5)q.life=0;if(q.life<=0)sunBurst(s,f,q,ctx);continue;}
  if(q.back&&segment(a,q,f)<.45){q.life=0;returnBurst(s,f,q,{x:f.x,y:f.y},true,ctx);q.spent=true;if(q.earned&&f.char==='returnflare'){f.returnWarm=1;f.returnWarmTime=4;}ctx.event(s,'coalCatch');continue;}
  const leg=q.back?'back':'out';if(q.life>0&&q.budget[leg]<1&&o.inv<=0&&segment(a,q,o)<.5&&!ctx.blocked(a,o)){
   if(o.shield>0){q.reflections=(q.reflections||0)+1;if(q.reflections>2){q.life=0;q.spent=true;continue;}q.owner=o.team;q.dx*=-1;q.dy*=-1;q.back=false;q.age=0;ctx.event(s,'reflect');continue;}
   q.budget[leg]++;const guarded=front(f,o),accepted=ctx.strike(s,f,o,q.ult?9:q.back?6:7,{kind:'shot',stun:.1,knock:.1,dir:{x:q.dx,y:q.dy}});if(accepted&&!guarded)q.earned=true;if(!q.back){returnBurst(s,f,q,{x:q.x,y:q.y},false,ctx);q.back=true;ctx.event(s,'coalRecall');}
  }
 }
}
export function batch11Ai(s,f,o,input,dt){const ai=s.ai[f.team],d=dist(f,o),v=norm(o.x-f.x,o.y-f.y),react={easy:.32,normal:.2,hard:.12}[s.difficulty]??.2,free=!['attack','heavy','skill','dodge','dash'].includes(f.state);if(!free)return false;
 const shot=s.shots.find(q=>q.owner!==f.team&&q.life>0&&(f.x-q.x)*q.dx+(f.y-q.y)*q.dy>0&&segment(q,{x:q.x+q.dx*q.speed*q.life,y:q.y+q.dy*q.speed*q.life},f)<.7);ai.fusion11Seen=shot?(ai.fusion11Seen||0)+dt:0;ai.fusion11Open=!['attack','heavy'].includes(o.state)&&o.inv<=0?(ai.fusion11Open||0)+dt:0;
 if(f.char==='sunmirror'){const q=live(s,f,'sunCore');if(q&&q.charge&&f.cd[1]<=0&&dist(q,o)<1.4&&ai.fusion11Open>=react){input.skill2=true;return true;}if(!q&&d>3.2&&shot&&ai.fusion11Seen>=react){const towards=norm(shot.x-f.x,shot.y-f.y);input.aimX=towards.x;input.aimY=towards.y;if(f.meter>=100)input.ult=true;else if(f.cd[0]<=0)input.skill1=true;else return false;return true;}}
 else if(f.char==='comethalo'){const h=orbit(s,f);if(h&&h.arm<=0){const p=cometPoint(h,f);if(h.charge>=.7&&dist(p,o)<1.3&&f.cd[1]<=0&&ai.fusion11Open>=react){input.skill2=true;return true;}if(d>2.4){input.x=v.x-v.y*.5;input.y=v.y+v.x*.5;}else{input.x=-v.y;input.y=v.x;}return true;}if(!h&&d>2.5&&d<5&&ai.fusion11Open>=react){if(f.meter>=100)input.ult=true;else if(f.cd[0]<=0)input.skill1=true;else return false;return true;}}
 else if(f.char==='returnflare'){const q=live(s,f,'returnCoal');if(q){if(!q.back&&q.age>.2&&(q.x-o.x)*v.x+(q.y-o.y)*v.y>0&&f.cd[1]<=0&&ai.fusion11Open>=react){input.skill2=true;return true;}if(q.back&&d>2.2){input.x=-v.y;input.y=v.x;return true;}}else if(d>3.5&&d<6&&ai.fusion11Open>=react){if(f.meter>=100)input.ult=true;else if(f.cd[0]<=0)input.skill1=true;else return false;return true;}}
 return false;
}
export function batch11DangerAi(s,f,input,dt){const ai=s.ai[f.team],react={easy:.32,normal:.2,hard:.12}[s.difficulty]??.2,h=s.hazards.find(h=>h.owner!==f.team&&h.t>0&&!h.triggered&&['sunBurst','cometBurst','returnBurst'].includes(h.kind)&&dist(h,f)<h.r+.45);if(!h){ai.fusion11Danger=0;return false;}ai.fusion11Danger=(ai.fusion11Danger||0)+dt;if(ai.fusion11Danger<react)return false;const v=dist(h,f)>.01?norm(f.x-h.x,f.y-h.y):{x:-f.fy,y:f.fx};input.x=v.x;input.y=v.y;if(h.arm<.16&&f.dodgeCd<=0)input.dodge=true;return true;}
