// FINAL originals, inspection candidates only. Public roster/story stay at 36.
// bigcrunch = collapse + flarebloom; mirrorhall = mirrorguard + mirrormaze.
const skill=(name,cooldown,desc)=>Object.freeze({name,cooldown,desc});
export const DUEL_BATCH08=Object.freeze({
 bigcrunch:Object.freeze({id:'bigcrunch',comboId:'bigcrunch',final:true,inspectionOnly:true,artReady:false,law:'gravity',name:'대붕괴',role:'두 우물 사이의 공백 · 느린 붕괴구',hp:178,speed:4.05,reach:1.8,arc:1.15,comboReach:[1.5,1.8,2.35],comboArc:[1.2,.65,1.35],comboNames:['돌씨 밀기','붕괴구 찌르기','두 손 내려치기'],damage:[8,11,16],cadence:.4,heavy:{damage:24,reach:2.3},parry:1,tile:7,ink:'#dba85e',skills:[skill('두 붕괴 우물',7.2,'고정된 두 자리를 예고하고 심어요. 사이에는 걸어서 빠질 공백 · 우물마다 한 번만 붕괴'),skill('느린 붕괴구',5.7,'고정한 방향으로 느린 구를 쏘아요. 닿은 자리에서 다시 예고한 뒤 한 번만 붕괴')],ult:skill('쌍우물의 마지막 씨앗',0,'두 우물과 중앙의 느린 씨앗을 차례로 예고해요 · 세 번 적중까지, 준비는 끊을 수 있어요'),blurb:'막히지 않은 3타·강공격은 붕괴의 무게를 두 겹까지 모아요. 우물은 자리를 따라오지 않고 보스를 당기지 않아요. 가운데 공백과 느린 구의 옆으로 들어오면 씨앗의 근접 빈틈을 잡을 수 있어요.'}),
 mirrorhall:Object.freeze({id:'mirrorhall',comboId:'mirrorhall',final:true,inspectionOnly:true,artReady:false,law:'reflect',name:'거울의 전당',role:'거울꽃잎의 실제 접점 · 유한 반환',hp:176,speed:4.2,reach:1.8,arc:1.05,comboReach:[1.65,2,1.9],comboArc:[.7,1.3,.65],comboNames:['방패 모서리','거울꽃잎 베기','유리 끝 찌르기'],damage:[9,10,14],cadence:.37,heavy:{damage:23,reach:2.25},parry:1.2,tile:0,ink:'#e9d888',skills:[skill('세 거울꽃잎',6.6,'실제 거울 접점에서 일반 탄을 세 발까지만 반환. 보스 탄은 한 발을 막고 반환하지 않아요. 몸과 거울 사이에는 빈틈'),skill('전당 접어 베기',5.2,'거울을 거두며 정면을 짧게 베고 물러나요 · 모은 반환 두 겹을 소비, 준비와 뒤쪽에는 무방비')],ult:skill('다섯 문의 전당',0,'다섯 거울을 넓게 펼쳐 일반 탄 여섯 발·보스 탄 세 발까지. 반환된 탄을 다시 반환하지 않아요'),blurb:'막히지 않은 3타·강공격으로 다음 거울에 쓸 한 조각을 모아요. 반환에 성공하면 접어 베기에 두 겹까지 저장해요. 탄막만 막으며 근접·잡기·거울 사이를 통과하는 탄은 직접 피해야 해요.'})
});
export const DUEL_BATCH08_KINDS=Object.freeze(['crunchPlant','crunchWell','crunchSend','crunchBurst','hallOpen','hallFold']);
export const DUEL_BATCH08_SHOTS=Object.freeze(['crunchSeed','hallReturn']);
export const DUEL_BATCH08_AUDIO=Object.freeze({crunchPlant:['bossWarning',{pitch:.7}],crunchSend:['shotGravity',{pitch:.75}],crunchClose:['burstHit',{pitch:.7}],hallOpen:['reflect',{pitch:.8}],hallReturn:['reflect',{pitch:1.25}],hallBlock:['reflect',{pitch:.65}],hallFold:['shotPierce',{pitch:1.1}]});
export const DUEL_BATCH08_STORY=Object.freeze([
 Object.freeze({id:'inspect-bigcrunch',enemy:'bigcrunch',inspectionOnly:true,unlockAfter:null,title:'두 우물 사이에 남긴 길',difficulty:'hard',before:'붕괴가 커져도 네 길까지 지우지는 않을게. 두 우물을 심는 자리는 먼저 보여 줄게. 가운데는 비어 있지만, 느린 씨앗이 그 길을 건널 수도 있어!',tip:'예고된 두 원은 따라오지 않아요. 두 우물 사이의 공백이나 바깥으로 걸으세요. 느린 구가 멈추면 다시 나타나는 붕괴 예고를 피하고, 심는 동작의 근접 빈틈을 노리세요.',after:'두 자리를 채우고도 길 하나를 남길 수 있었네. 비워 둔 그 길로 거울 친구도 만나러 가자.'}),
 Object.freeze({id:'inspect-mirrorhall',enemy:'mirrorhall',inspectionOnly:true,unlockAfter:'inspect-bigcrunch',title:'거울 사이로 들어온 친구',difficulty:'hard',before:'세 거울은 모든 곳을 막지 못해. 날아오는 작은 빛은 돌려주지만, 큰 보스의 빛은 몇 번만 받아낼게. 가까이 오는 너를 비추려면 방패도 내려놓아야겠지.',tip:'일반 탄 반환 횟수는 유한하고 보스 탄은 막기만 해요. 거울 접점 사이와 몸 가까이는 열려 있어요. 근접·잡기로 들어오거나 거울을 접는 준비 동작을 끊으세요.',after:'되돌려주는 것보다 곁에서 마주 보는 일이 더 어려웠어. 이제 거울을 접고 너의 다음 걸음을 함께 볼게.'})
]);
const norm=(x,y)=>{const d=Math.hypot(x,y)||1;return{x:x/d,y:y/d};},dist=(a,b)=>Math.hypot(a.x-b.x,a.y-b.y);
const segment=(a,b,p)=>{const x=b.x-a.x,y=b.y-a.y,k=Math.max(0,Math.min(1,((p.x-a.x)*x+(p.y-a.y)*y)/(x*x+y*y||1)));return Math.hypot(p.x-a.x-x*k,p.y-a.y-y*k);};
const windup=(f,t)=>Object.assign(f,{state:'skill',total:t,t,blocking:false,inv:0});
const activeHall=(s,f)=>s.hazards.find(h=>h.owner===f.team&&h.kind==='hallOpen'&&h.arm<=0&&h.t>0);
function retire(s,f,kinds){for(const h of s.hazards)if(h.owner===f.team&&kinds.includes(h.kind))h.t=0;for(const q of s.shots)if(q.owner===f.team&&kinds.includes(q.kind)){q.life=0;q.crunchSpent=true;}}
export function batch08Melee(s,f,{step,heavy,hit,guarded}){if(!hit||guarded||!heavy&&step!==2)return;if(f.char==='bigcrunch'){f.crunchWeight=Math.min(2,(f.crunchWeight||0)+1);f.crunchWeightTime=5;}if(f.char==='mirrorhall'){f.hallFacet=1;f.hallFacetTime=4;}}
export function batch08Action(s,f,index,ctx,ult=false){
 const cast=f.finalCast=(f.finalCast||0)+1,o=s.fighters[1-f.team];
 if(f.char==='bigcrunch'){
  const weight=f.crunchWeight||0;f.crunchWeight=f.crunchWeightTime=0;
  if(index===0||ult){retire(s,f,['crunchPlant','crunchWell']);const reach=Math.max(2.8,Math.min(5.2,dist(f,o))),x=f.x+f.fx*reach,y=f.y+f.fy*reach,budget={hits:0,max:ult?3:2};
   for(const off of [-1.65,1.65]){const p={x:x-f.fy*off,y:y+f.fx*off};if(ctx.wall(p)||ctx.blocked(f,p))continue;ctx.area(s,f,'crunchPlant',{...p,r:1,arm:.6,t:.72,cast,damage:ult?12:13+weight*2,budget});}
   if(ult){retire(s,f,['crunchSend','crunchSeed']);ctx.area(s,f,'crunchSend',{x:f.x,y:f.y,dx:f.fx,dy:f.fy,endX:f.x+f.fx*7,endY:f.y+f.fy*7,r:.3,arm:.8,t:.87,cast,damage:15,budget});}windup(f,ult?1.15:.95);ctx.event(s,'crunchPlant');
  }else{retire(s,f,['crunchSend','crunchSeed']);windup(f,.78);ctx.area(s,f,'crunchSend',{x:f.x,y:f.y,dx:f.fx,dy:f.fy,endX:f.x+f.fx*7,endY:f.y+f.fy*7,r:.3,arm:.38,t:.46,cast,damage:16+weight*2,budget:{hits:0,max:1}});ctx.event(s,'crunchSend');}
 }else if(f.char==='mirrorhall'){
  const previous=activeHall(s,f);retire(s,f,['hallOpen','hallFold']);
  if(index===0||ult){const facet=f.hallFacet||0;f.hallFacet=f.hallFacetTime=0;windup(f,ult?.9:.62);ctx.area(s,f,'hallOpen',{x:f.x,y:f.y,r:ult?1.85:1.3,arm:ult?.5:.32,t:ult?3.35:2.5,age:0,angle:Math.atan2(f.fy,f.fx),count:ult?5:3,cast,budget:{ordinary:ult?6:3+facet,boss:ult?3:1},returned:0});ctx.event(s,'hallOpen');}
  else{const charge=f.hallStored||0;f.hallStored=f.hallStoredTime=0;windup(f,.8);ctx.area(s,f,'hallFold',{x:f.x,y:f.y,dx:f.fx,dy:f.fy,endX:f.x+f.fx*2.5,endY:f.y+f.fy*2.5,r:.35,arm:.42,t:.52,cast,damage:12+charge*4,hadHall:Boolean(previous)});ctx.event(s,'hallFold');}
 }
}
export function hallPanels(h,f){return Array.from({length:h.count},(_,k)=>{const a=h.angle+h.age*1.6+k*Math.PI*2/h.count;return{x:f.x+Math.cos(a)*h.r,y:f.y+Math.sin(a)*h.r,angle:a};});}
export function batch08InterceptShot(s,q,x0,y0,dt,ctx){
 if(q.life<=0||q.hallReturned||q.kind==='hallReturn')return false;
 const f=s.fighters[1-q.owner],h=activeHall(s,f);if(!h||f.char!=='mirrorhall')return false;
 const boss=q.boss===true||s.boss&&q.owner===1,key=boss?'boss':'ordinary';if(h.budget[key]<=0)return false;
 const p=hallPanels(h,f).find(p=>!ctx.wall(p)&&!ctx.blocked(f,p)&&segment({x:x0,y:y0},q,p)<.4);if(!p)return false;
 h.budget[key]--;q.bloomSpent=q.collapseSpent=q.crunchSpent=true;
 if(boss){q.life=0;ctx.event(s,'hallBlock');}
 else{const previous=s.fighters[q.owner],v=norm(previous.x-p.x,previous.y-p.y);Object.assign(q,{owner:f.team,kind:'hallReturn',x:p.x,y:p.y,dx:v.x,dy:v.y,speed:9,life:Math.min(1.25,q.life),damage:Math.min(12,q.damage||0),pierce:0,bounces:0,hit:new Set(),hallReturned:true,hallTurnAt:s.time,reflections:1,law:'mirrorhall'});f.hallStored=Math.min(2,(f.hallStored||0)+1);f.hallStoredTime=4;h.returned++;ctx.event(s,'hallReturn');}
 ctx.fx(s,'parry',p.x,p.y,{life:.18,max:.18});return true;
}
function burst(s,f,q,ctx){if(q.crunchSpent)return;q.crunchSpent=true;ctx.area(s,f,'crunchBurst',{x:q.x,y:q.y,r:1.15,arm:.26,t:.34,damage:q.damage,budget:q.budget});ctx.event(s,'crunchClose');}
export function batch08Tick(s,dt,ctx){
 for(const f of s.fighters)for(const [value,timer] of [['crunchWeight','crunchWeightTime'],['hallFacet','hallFacetTime'],['hallStored','hallStoredTime']]){f[timer]=Math.max(0,(f[timer]||0)-dt);if(!f[timer])f[value]=0;}
 for(const h of [...s.hazards]){if(!DUEL_BATCH08_KINDS.includes(h.kind)||h.t<=0)continue;const before=h.arm;h.t-=dt;h.arm=Math.max(0,h.arm-dt);const f=s.fighters[h.owner],o=s.fighters[1-h.owner];
  if(before>0&&['crunchPlant','crunchSend','hallOpen','hallFold'].includes(h.kind)&&(f.stun>0||f.state!=='skill'||h.cast!==f.finalCast)){h.t=0;continue;}if(h.arm>0)continue;
  if(h.kind==='hallOpen'){h.age+=Math.max(0,dt-before);h.x=f.x;h.y=f.y;continue;}
  if(h.kind==='crunchWell'){
   h.age+=dt;if(h.age<1.15&&dist(h,o)<h.r+.2&&o.inv<=0&&!(s.boss&&o.team===1)&&!ctx.blocked(h,o)){const v=norm(h.x-o.x,h.y-o.y);o.x+=v.x*(o.blocking?.2:1)*dt;o.y+=v.y*(o.blocking?.2:1)*dt;ctx.clampArena(o);}
   if(h.age>=1.45&&!h.triggered){h.triggered=true;ctx.event(s,'crunchClose');ctx.fx(s,'boom',h.x,h.y,{r:h.r,life:.25,max:.25});if(o.inv<=0&&dist(h,o)<h.r+.3&&!ctx.blocked(h,o)&&h.budget.hits<h.budget.max){h.budget.hits++;ctx.strike(s,f,o,h.damage,{kind:'skill',stun:.18,knock:.3});}}continue;
  }
  if(h.triggered)continue;h.triggered=true;
  if(h.kind==='crunchPlant')ctx.area(s,f,'crunchWell',{x:h.x,y:h.y,r:h.r,arm:0,t:1.7,age:0,damage:h.damage,budget:h.budget});
  else if(h.kind==='crunchSend')ctx.shoot(s,f,{kind:'crunchSeed',x:h.x+h.dx*.6,y:h.y+h.dy*.6,dx:h.dx,dy:h.dy,speed:5.5,life:1.25,damage:h.damage,budget:h.budget});
  else if(h.kind==='crunchBurst'&&o.inv<=0&&dist(h,o)<h.r+.3&&!ctx.blocked(h,o)&&h.budget.hits<h.budget.max){h.budget.hits++;ctx.strike(s,f,o,h.damage,{kind:'skill',stun:.18,knock:.3});}
  else if(h.kind==='hallFold'){if(o.inv<=0&&!ctx.blocked(h,o)&&segment(h,{x:h.endX,y:h.endY},o)<h.r+.35)ctx.strike(s,f,o,h.damage,{kind:'skill',stun:.2,knock:.5});f.x-=h.dx*.45;f.y-=h.dy*.45;ctx.clampArena(f);}
 }
 for(const q of [...s.shots]){if(!DUEL_BATCH08_SHOTS.includes(q.kind)||q.life<=0||q.hallTurnAt===s.time)continue;const before=q.life,moveDt=Math.min(dt,before),start={x:q.x,y:q.y};q.life-=dt;q.x+=q.dx*q.speed*moveDt;q.y+=q.dy*q.speed*moveDt;
  if(ctx.interceptShot(s,q,start.x,start.y,0))continue;const f=s.fighters[q.owner],o=s.fighters[1-q.owner],wall=ctx.wall(q)||ctx.blocked(start,q);
  if(wall){q.x=start.x;q.y=start.y;q.life=0;}
  if(q.kind==='crunchSeed'){if(!wall&&o.inv<=0&&segment(start,q,o)<.6)q.life=0;if(q.life<=0)burst(s,f,q,ctx);}
  else if(!wall&&!q.hit.has(o.team)&&o.inv<=0&&segment(start,q,o)<.5){q.hit.add(o.team);q.life=0;ctx.strike(s,f,o,q.damage,{kind:'shot',stun:.12,knock:.3,dir:{x:q.dx,y:q.dy}});}
 }
}
export function batch08Ai(s,f,o,input,dt){
 const ai=s.ai[f.team],d=dist(f,o),v=norm(o.x-f.x,o.y-f.y),react={easy:.32,normal:.2,hard:.12}[s.difficulty]??.2;
 const body=['attack','heavy'].includes(o.state),spent=body&&o.hitDone&&o.t>.03,free=!['attack','heavy','skill','dash','dodge'].includes(f.state);
 ai.finalRecovery=spent?(ai.finalRecovery||0)+dt:0;
 ai.finalBody=body&&!o.hitDone&&d<3.4?(ai.finalBody||0)+dt:0;
 // Spend an earned close-range finisher BEFORE crossing the same recovery
 // with dodge. Otherwise the dodge takes every eligible charged fold window.
 if(free&&ai.finalRecovery>=react*.65&&d<2.8&&f.cd[1]<=0){
  if(f.char==='mirrorhall'&&f.hallStored){input.skill2=true;return true;}
  if(f.char==='bigcrunch'&&((f.crunchWeight||0)>0||s.hazards.some(h=>h.owner===f.team&&h.kind==='crunchWell'&&h.t>0))){input.skill2=true;return true;}
 }
 // Ordinary player dodge closes an observed missed swing. No forward dash is
 // invented and neither fighter gets extra speed/invulnerability/cooldown.
 if(free&&ai.finalRecovery>=react*.65&&d>2.2&&d<3.6&&f.dodgeCd<=0){input.x=v.x-v.y*.3;input.y=v.y+v.x*.3;input.dodge=true;return true;}
 if(free&&o.state==='heavy'&&ai.finalBody>=react&&d<2.8&&f.dodgeCd<=0){input.x=-v.y;input.y=v.x;input.dodge=true;return true;}
 if(!free)return false;
 if(f.char==='bigcrunch'){
  const wells=s.hazards.filter(h=>h.owner===f.team&&h.kind==='crunchWell'&&h.t>0),open=!body&&o.inv<=0;
  ai.crunchSeen=open&&d>2.8?(ai.crunchSeen||0)+dt:0;
  if(ai.crunchSeen>=react&&d<5.8){
   // A symmetric cast aimed straight at one foe leaves that foe in the safe
   // corridor. Rotate the SAME player aim so one fixed well covers its visible
   // present position; the second well and empty corridor remain unchanged.
   if(!wells.length&&(f.cd[0]<=0||f.meter>=100)&&d>3.3){const a=Math.atan2(v.y,v.x)+Math.asin(1.65/d);input.aimX=Math.cos(a);input.aimY=Math.sin(a);if(f.meter>=100)input.ult=true;else input.skill1=true;return true;}
   if(f.cd[1]<=0&&!s.shots.some(q=>q.owner===f.team&&q.kind==='crunchSeed'&&q.life>0)){input.skill2=true;return true;}
  }
  // Prepare a genuinely interruptible placement outside melee, then approach
  // and fight during both cooldowns instead of orbiting idle wells forever.
  if(f.cd[0]<=0&&!wells.length&&open){if(d<3.4){input.x=-v.x-v.y*.35;input.y=-v.y+v.x*.35;}else if(d>4.8){input.x=v.x;input.y=v.y;}else return false;return true;}
 }else if(f.char==='mirrorhall'){
  // An uncharged fold still has a purpose after a visible guard break; do not
  // replace ordinary jabs with its slow windup after every short recovery.
  if(f.cd[1]<=0&&d<2.5&&o.stun>.55&&o.inv<=0){input.skill2=true;return true;}
  // Opening takes .32s after the ordinary reaction delay. Read a visible
  // projectile earlier than the old five-unit boundary, but only if its
  // current direction/lifetime can reach this finite mirror ring. Parallel
  // misses and returning mirrors are not threats. No future aim is read.
  const lane=q=>{const x=f.x-q.x,y=f.y-q.y,along=x*q.dx+y*q.dy;
   return along>0&&along<=9&&Math.abs(x*q.dy-y*q.dx)<1.65&&(!Number.isFinite(q.speed)||along<=q.speed*q.life+.4);};
  const incoming=s.shots.filter(q=>q.owner!==f.team&&q.life>0&&!q.hallReturned&&q.kind!=='hallReturn'&&lane(q)),hall=activeHall(s,f);
  // These authored lines visibly announce actual projectiles; hitscan beams,
  // area circles and generic skill states are deliberately excluded.
  const tell=s.hazards.find(h=>h.owner!==f.team&&h.t>0&&h.arm>0&&!h.triggered&&['bladeSend','thunderSend','fullSend','rewindSend','crunchSend','mirrorTell'].includes(h.kind)&&Number.isFinite(h.endX)&&segment(h,{x:h.endX,y:h.endY},f)<1.65);
  ai.hallSeen=incoming.length||tell?(ai.hallSeen||0)+dt:0;
  // Do not spend a defensive ultimate on an empty melee exchange. Observe a
  // real incoming lane before opening, then move the finite panel into it.
  if(ai.hallSeen>=react&&!hall&&d>2.4&&!body){if(f.meter>=100)input.ult=true;else if(f.cd[0]<=0)input.skill1=true;else return false;return true;}
  if(f.cd[1]<=0&&d<2.8&&f.hallStored&&ai.finalRecovery>=react*.65){input.skill2=true;return true;}
  if(hall&&incoming.length&&d>2.8&&!body){const q=incoming[0],along=Math.max(0,(f.x-q.x)*q.dx+(f.y-q.y)*q.dy),lane={x:q.x+q.dx*along,y:q.y+q.dy*along},move=norm(lane.x-f.x,lane.y-f.y);if(dist(lane,f)>.35){input.x=move.x;input.y=move.y;return true;}}
 }return false;
}
export function batch08DangerAi(s,f,input,dt){const ai=s.ai[f.team],react={easy:.32,normal:.2,hard:.12}[s.difficulty]??.2;
 const h=s.hazards.find(h=>h.owner!==f.team&&h.t>0&&!h.triggered&&(h.kind==='crunchPlant'||h.kind==='crunchWell'||h.kind==='crunchBurst'?dist(h,f)<h.r+.65:h.kind==='crunchSend'||h.kind==='hallFold'?segment(h,{x:h.endX,y:h.endY},f)<h.r+.4:false));
 if(!h){ai.b08Seen=0;return false;}ai.b08Seen=(ai.b08Seen||0)+dt;if(ai.b08Seen<react)return false;const v=h.dx!=null?{x:-h.dy,y:h.dx}:dist(f,h)>.01?norm(f.x-h.x,f.y-h.y):norm(f.x-s.fighters[h.owner].x,f.y-s.fighters[h.owner].y);input.x=v.x;input.y=v.y;if(f.dodgeCd<=0&&(h.arm<.16||h.kind==='crunchWell'&&h.age>1.2))input.dodge=true;return true;
}
