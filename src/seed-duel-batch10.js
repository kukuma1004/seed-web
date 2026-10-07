const skill=(name,cooldown,desc)=>Object.freeze({name,cooldown,desc});
export const DUEL_BATCH10=Object.freeze({
 mirrormaze:Object.freeze({id:'mirrormaze',comboId:'mirrormaze',solo:true,inspectionOnly:true,artReady:false,law:'reflect',name:'거울 미궁',role:'벽을 타는 유한 거울탄 · 반사 뒤 성장',hp:173,speed:4.25,reach:1.85,arc:1.1,comboReach:[1.6,2.1,1.9],comboArc:[.7,1.25,.85],comboNames:['거울 모서리','미궁 잎 베기','반사핵 찌르기'],damage:[9,10,14],cadence:.37,heavy:{damage:23,reach:2.3},parry:1.15,tile:0,ink:'#b5d5df',skills:[skill('벽을 찾는 거울핵',6.1,'한 물리탄이 벽·기둥에서 세 번까지만 튕겨요. 튕길수록 속도와 피해 증가 · 한 비행 구간 한 적중'),skill('거울핵 거두기',5.2,'날아가는 핵을 거두고 짧게 베어요. 실제 벽 반사 적중으로 얻은 한 겹을 소비 · 상대 탄을 막지는 않아요')],ult:skill('엇갈린 두 미궁',0,'예고된 두 거울탄 · 탄마다 네 반사, 둘이 함께 네 적중까지만. 벽이 없으면 첫 피해는 작아요'),blurb:'막히지 않은 3타·강공격은 다음 첫 핵의 피해를 두 올려요. 실제로 벽을 튕긴 뒤 맞혀야 회수 베기가 강해져요. 실탄이 움직이는 경로라 옆으로 피하거나 방어할 수 있어요.'}),
 flarebloom:Object.freeze({id:'flarebloom',comboId:'flarebloom',solo:true,inspectionOnly:true,artReady:false,law:'burst',name:'불꽃 꽃다발',role:'느린 비행 · 착탄 뒤 세 불씨',hp:168,speed:4.1,reach:1.8,arc:1.25,comboReach:[1.7,1.9,2.2],comboArc:[1.35,.65,1.15],comboNames:['불씨 쓸기','꽃줄기 찌르기','꽃다발 내려치기'],damage:[9,10,15],cadence:.41,heavy:{damage:24,reach:2.3},parry:1,tile:5,ink:'#efa263',skills:[skill('늦게 피는 꽃다발',7,'긴 준비 뒤 느린 꽃씨. 멈춘 착탄 위치를 다시 예고해 크게 터뜨리고 세 불씨가 차례로 흩어져요'),skill('불씨 거두어 휘두르기',5.4,'남은 꽃씨·불씨를 취소하고 가까이 휘둘러요. 실제 작은 불씨 적중으로 얻은 한 겹을 소비')],ult:skill('세 불씨의 큰 꽃',0,'큰 꽃씨 한 발과 세 불씨 · 합쳐 네 적중까지만. 긴 준비·착탄 예고·불씨 예고 모두 피할 수 있어요'),blurb:'막히지 않은 3타·강공격은 다음 착탄 폭발을 두 올려요. 작은 불씨에 직접 맞혀야 회수 공격이 강해져요. 착탄점은 추적하지 않고 중심에 머물면 바깥 불씨가 닿지 않아요.'}),
 winterbreath:Object.freeze({id:'winterbreath',comboId:'winterbreath',solo:true,inspectionOnly:true,artReady:false,law:'frost',name:'겨울 숨결',role:'짧고 넓은 부채 · 다섯 냉기 뒤 즉시 파쇄',hp:174,speed:4.2,reach:1.85,arc:1.15,comboReach:[1.55,2.1,2],comboArc:[1.35,.65,1.2],comboNames:['찬 잎 베기','서리끝 찌르기','숨결 접기'],damage:[9,11,13],cadence:.38,heavy:{damage:22,reach:2.35},parry:1.1,tile:8,ink:'#bddde8',skills:[skill('다섯 박자 숨결',6.6,'넓고 짧은 부채 숨결 다섯 번. 실제 막히지 않은 냉기 다섯 적중이면 잠깐 얼었다 즉시 파쇄 · 뒤쪽은 열려 있어요'),skill('한 점의 서리',5.1,'한 번의 좁고 긴 한숨으로 마지막 냉기를 쌓아요. 실제 3타·강공격으로 모은 한 겹을 소비')],ult:skill('긴 겨울의 여덟 숨',0,'여덟 유한 부채 적중. 냉기와 파쇄 재사용 대기 유지 · 보스는 동작을 얼리지 않고 피해만 받아요'),blurb:'냉기는 세 초 동안만 남고 파쇄 뒤 비워져요. 다섯 적중 뒤의 잠깐 동결은 즉시 깨지고 재사용 대기가 있어요. 방어·회피·옆·등 뒤·기둥으로 숨결을 피할 수 있어요. 이미 느린 상대는 작은 숨결 피해가 하나 늘어요.'})
});
export const DUEL_BATCH10_KINDS=Object.freeze(['mazeSend','mazeCut','flareSend','flareImpact','flareEmber','flarePalm','winterCone']);
export const DUEL_BATCH10_SHOTS=Object.freeze(['mazeShard','flareSeed']);
export const DUEL_BATCH10_AUDIO=Object.freeze({mazeSend:['shotCrystal',{pitch:.9}],mazeBounce:['reflect',{pitch:1.15}],mazeCatch:['shotPierce',{pitch:.85}],flareSend:['bossWarning',{pitch:.9}],flareImpact:['burstHit',{pitch:.85}],flareEmber:['shotBurst',{pitch:1.1}],flareCatch:['shotBurst',{pitch:.8}],winterTell:['shotFrost',{pitch:.85}],winterTick:['shotFrost',{pitch:1.1}],winterFreeze:['frostHit',{pitch:.7}],winterShatter:['frostHit',{pitch:1.25}]});
export const DUEL_BATCH10_STORY=Object.freeze([
 ['mirrormaze','벽이 남긴 다음 길','한 번의 빛보다 벽에 남는 길이 좋아. 작은 거울이 정말로 튕기는 걸 봐 줘. 아무 벽도 만나지 못하면 아직 약해!','반사탄은 실제 벽과 기둥에서 튕겨요. 첫 구간은 약하고 다음 구간은 빠르고 강해요. 옆으로 비키거나 방어하세요. 거두는 순간 미궁의 탄도 사라져요.','벽이 길을 막는 줄 알았는데 다음 길을 가르쳐 주었네. 늦게 피는 꽃 친구도 만나러 가자.'],
 ['flarebloom','늦게 피어난 세 불씨','급하게 던지면 꽃이 피지 않아. 먼저 준비하고 천천히 날려, 닿은 자리를 다시 보여 줄게. 바깥의 세 작은 꽃은 조금 늦게 피어!','준비를 끊거나 느린 꽃씨를 피하세요. 착탄 예고 뒤 중심 폭발과 바깥 세 불씨가 순서대로 생겨요. 불씨 중심은 따로 고정되며 재추적하지 않아요.','기다린 만큼 예쁘게 피었어. 그래도 네가 빠져나올 자리까지 태우지는 않을게.'],
 ['winterbreath','다섯 숨 끝의 작은 겨울','다섯 번의 숨을 모으면 작은 겨울이 돼. 꽁꽁 오래 묶어 두는 대신 바로 깨서 길을 돌려줄게. 내 등 뒤엔 찬 숨도 닿지 않아!','넓은 부채지만 짧아요. 실제 다섯 냉기 적중 후만 동결·파쇄가 되고 방어·회피는 냉기를 주지 않아요. 삼 초 쉬면 냉기가 풀려요. 보스 동작은 얼리지 않아요.','너를 멈추는 겨울보다 다시 움직일 수 있는 겨울이 좋구나. 다음 계절에도 같이 걸어 보자.']
].map(([enemy,title,before,tip,after],i,a)=>Object.freeze({id:'inspect-'+enemy,enemy,inspectionOnly:true,unlockAfter:i?'inspect-'+a[i-1][0]:null,title,difficulty:'hard',before,tip,after})));
const norm=(x,y)=>{const d=Math.hypot(x,y)||1;return {x:x/d,y:y/d};},dist=(a,b)=>Math.hypot(a.x-b.x,a.y-b.y);
const segment=(a,b,p)=>{const x=b.x-a.x,y=b.y-a.y,k=Math.max(0,Math.min(1,((p.x-a.x)*x+(p.y-a.y)*y)/(x*x+y*y||1)));return Math.hypot(p.x-a.x-x*k,p.y-a.y-y*k);};
const guarded=(f,o)=>{const v=norm(f.x-o.x,f.y-o.y);return o.blocking&&v.x*o.fx+v.y*o.fy>-.2;};
export const winterContact=(h,o)=>{const d=dist(h,o);return d<=h.range&&((o.x-h.x)*h.dx+(o.y-h.y)*h.dy)/(d||1)>Math.cos(h.arc);};
const windup=(f,t)=>Object.assign(f,{state:'skill',total:t,t,blocking:false,inv:0});
function retire(s,f,kinds){for(const h of s.hazards)if(h.owner===f.team&&kinds.includes(h.kind)){h.t=0;h.cancelled=true;}for(const q of s.shots)if(q.owner===f.team&&kinds.includes(q.kind)){q.life=0;q.spent=true;}}
function cold(s,f,o,ctx){f.winterCold=Math.min(5,(f.winterCold||0)+1);f.winterColdTime=3;if(f.winterCold<5||(f.winterBreakCd||0)>0)return;f.winterCold=f.winterColdTime=0;f.winterBreakCd=1.4;const boss=s.boss&&o.team===1;ctx.event(s,'winterFreeze');ctx.fx(s,'jail',o.x,o.y,{life:.14,max:.14});ctx.strike(s,f,o,10,{kind:boss?'shot':'skill',stun:boss?0:.18,knock:0,flinch:!boss});ctx.event(s,'winterShatter');}
export function batch10Melee(s,f,{step,heavy,hit,guarded:blocked},ctx){if(!hit||blocked)return;if(f.char==='winterbreath'&&ctx)cold(s,f,s.fighters[1-f.team],ctx);if(!heavy&&step!==2)return;const key={mirrormaze:'mazeFacet',flarebloom:'flareHeat',winterbreath:'winterRime'}[f.char];if(key){f[key]=1;f[key+'Time']=4;}}
export function batch10Action(s,f,index,ctx,ult=false){
 const cast=f.solo10Cast=(f.solo10Cast||0)+1;
 if(f.char==='mirrormaze'){
  if(index===1&&!ult){retire(s,f,['mazeSend','mazeShard','mazeCut']);const charge=f.mazeEcho||0;f.mazeEcho=f.mazeEchoTime=0;windup(f,.65);ctx.area(s,f,'mazeCut',{x:f.x,y:f.y,endX:f.x+f.fx*2.4,endY:f.y+f.fy*2.4,dx:f.fx,dy:f.fy,r:.35,arm:.32,t:.44,cast,damage:12+charge*4});ctx.event(s,'mazeCatch');return;}
  retire(s,f,['mazeSend','mazeShard']);const ready=f.mazeFacet||0,budget={hits:0,max:ult?4:3};f.mazeFacet=f.mazeFacetTime=0;windup(f,ult?1.02:.78);
  for(const [k,off] of (ult?[-.3,.3]:[0]).entries()){const angle=Math.atan2(f.fy,f.fx)+off,arm=.4+k*.17;ctx.area(s,f,'mazeSend',{x:f.x,y:f.y,dx:Math.cos(angle),dy:Math.sin(angle),endX:f.x+Math.cos(angle)*8,endY:f.y+Math.sin(angle)*8,r:.22,arm,t:arm+.08,cast,damage:ult?7:8+ready*2,budget,bounces:ult?4:3});}ctx.event(s,'mazeSend');
 }else if(f.char==='flarebloom'){
  if(index===1&&!ult){retire(s,f,['flareSend','flareSeed','flareImpact','flareEmber','flarePalm']);const gather=f.flareGather||0;f.flareGather=f.flareGatherTime=0;windup(f,.65);ctx.area(s,f,'flarePalm',{x:f.x,y:f.y,dx:f.fx,dy:f.fy,range:2.3,arc:.9,r:.2,arm:.32,t:.45,cast,damage:11+gather*4});ctx.event(s,'flareCatch');return;}
  retire(s,f,['flareSend','flareSeed','flareImpact','flareEmber']);const heat=f.flareHeat||0;f.flareHeat=f.flareHeatTime=0;windup(f,ult?1.28:1.08);ctx.area(s,f,'flareSend',{x:f.x,y:f.y,dx:f.fx,dy:f.fy,endX:f.x+f.fx*7.2,endY:f.y+f.fy*7.2,r:.22,arm:ult?.8:.65,t:ult?.9:.75,cast,damage:(ult?18:14)+heat*2,budget:{hits:0,max:ult?4:3},ult});ctx.event(s,'flareSend');
 }else if(f.char==='winterbreath'){
  const rime=f.winterRime||0;f.winterRime=f.winterRimeTime=0;retire(s,f,['winterCone']);const single=index===1&&!ult,count=ult?8:single?1:5,arm=ult?.38:single?.3:.28,spacing=ult?.15:.18;windup(f,arm+spacing*(count-1)+.22);ctx.area(s,f,'winterCone',{x:f.x,y:f.y,dx:f.fx,dy:f.fy,range:ult?3.15:single?3:2.6,arc:ult?.95:single?.45:.82,r:.2,arm,t:arm+spacing*(count-1)+.18,cast,ticks:0,count,tick:0,spacing,damage:(ult?2:single?8+rime*3:3+rime)});ctx.event(s,'winterTell');
 }
}
function bloom(s,f,q,ctx){if(q.spent)return;q.spent=true;ctx.area(s,f,'flareImpact',{x:q.x,y:q.y,r:q.ult?1.4:1.15,arm:.38,t:.5,damage:q.damage,budget:q.budget,angle:Math.atan2(q.dy,q.dx),ult:q.ult});ctx.event(s,'flareImpact');}
export function batch10Tick(s,dt,ctx){
 for(const f of s.fighters){for(const key of ['mazeFacet','mazeEcho','flareHeat','flareGather','winterRime','winterCold']){f[key+'Time']=Math.max(0,(f[key+'Time']||0)-dt);if(!f[key+'Time'])f[key]=0;}f.winterBreakCd=Math.max(0,(f.winterBreakCd||0)-dt);}
 for(const h of [...s.hazards]){if(!DUEL_BATCH10_KINDS.includes(h.kind)||h.t<=0)continue;const before=h.arm;h.t-=dt;h.arm=Math.max(0,h.arm-dt);const f=s.fighters[h.owner],o=s.fighters[1-h.owner];
  if(before>0&&['mazeSend','mazeCut','flareSend','flarePalm','winterCone'].includes(h.kind)&&(f.stun>0||f.state!=='skill'||f.solo10Cast!==h.cast)){h.t=0;h.cancelled=true;continue;}if(h.arm>0)continue;
  if(h.kind==='winterCone'){
   // Each emitted breath is still the current interruptible action.
   if(f.stun>0||f.state!=='skill'||f.solo10Cast!==h.cast){h.t=0;continue;}h.x=f.x;h.y=f.y;h.tick-=Math.max(0,dt-before);if(h.tick<=0&&h.ticks<h.count){h.tick+=h.spacing;h.ticks++;ctx.event(s,'winterTick');if(o.inv<=0&&winterContact(h,o)&&!ctx.blocked(h,o)){const block=guarded(f,o),boss=s.boss&&o.team===1,damage=h.damage+(o.slow>0?1:0),hit=ctx.strike(s,f,o,damage,{kind:'shot',stun:0,knock:0,flinch:false});if(hit&&!block){if(!boss)o.slow=Math.max(o.slow,.32);cold(s,f,o,ctx);}}}continue;
  }
  if(h.triggered)continue;h.triggered=true;
  // A legal caster beside a wall/pillar must not spawn beyond that surface.
  if(h.kind==='mazeSend')ctx.shoot(s,f,{kind:'mazeShard',x:h.x,y:h.y,dx:h.dx,dy:h.dy,speed:9,life:3.6,damage:h.damage,remaining:h.bounces,turns:0,budget:h.budget});
  else if(h.kind==='mazeCut'){if(o.inv<=0&&!ctx.blocked(h,o)&&segment(h,{x:h.endX,y:h.endY},o)<h.r+.35)ctx.strike(s,f,o,h.damage,{kind:'skill',stun:.18,knock:.4});}
  else if(h.kind==='flareSend')ctx.shoot(s,f,{kind:'flareSeed',x:h.x,y:h.y,dx:h.dx,dy:h.dy,speed:7,life:1,damage:h.damage,budget:h.budget,ult:h.ult});
  else if(h.kind==='flareImpact'){
   if(o.inv<=0&&dist(h,o)<h.r+.3&&!ctx.blocked(h,o)&&h.budget.hits<h.budget.max){h.budget.hits++;ctx.strike(s,f,o,h.damage,{kind:'skill',stun:.2,knock:.2});}
   for(let k=0;k<3;k++){const a=h.angle+k*Math.PI*2/3,arm=.28+k*.15,p={x:h.x+Math.cos(a)*1.7,y:h.y+Math.sin(a)*1.7};if(ctx.wall(p)||ctx.blocked(h,p))continue;ctx.area(s,f,'flareEmber',{...p,r:.65,arm,t:arm+.12,damage:4,budget:h.budget});}ctx.event(s,'flareEmber');
  }else if(h.kind==='flareEmber'){if(o.inv<=0&&dist(h,o)<h.r+.3&&!ctx.blocked(h,o)&&h.budget.hits<h.budget.max){h.budget.hits++;const block=guarded(f,o),hit=ctx.strike(s,f,o,h.damage,{kind:'skill',stun:.12,knock:.1});if(hit&&!block){f.flareGather=1;f.flareGatherTime=4;}}}
  else if(h.kind==='flarePalm'&&o.inv<=0&&winterContact(h,o)&&!ctx.blocked(h,o))ctx.strike(s,f,o,h.damage,{kind:'skill',stun:.18,knock:.4});
 }
 for(const q of [...s.shots]){if(!DUEL_BATCH10_SHOTS.includes(q.kind)||q.life<=0||q.hallTurnAt===s.time)continue;const moveDt=Math.min(dt,q.life),a={x:q.x,y:q.y},b={x:q.x+q.dx*q.speed*moveDt,y:q.y+q.dy*q.speed*moveDt},f=s.fighters[q.owner],o=s.fighters[1-q.owner];q.life-=dt;
  const surface=ctx.surfaceHit?.(a,b);Object.assign(q,b);if(ctx.interceptShot?.(s,q,a.x,a.y,0))continue;
  if(q.kind==='mazeShard'){
   // Physical ray contacts use the actual circular surface. The generic cover
   // query has a wider visibility margin and would kill a just-reflected ray.
   if(surface||ctx.wall(q)||(!ctx.surfaceHit&&ctx.blocked(a,b))){if(!surface||q.remaining<=0){q.life=0;continue;}const dot=q.dx*surface.nx+q.dy*surface.ny;q.dx-=2*dot*surface.nx;q.dy-=2*dot*surface.ny;q.x=surface.x+surface.nx*.025;q.y=surface.y+surface.ny*.025;q.remaining--;q.turns++;q.hit.clear();q.speed=Math.min(16,q.speed*1.16);q.damage=Math.min(18,q.damage*1.2);ctx.event(s,'mazeBounce');ctx.fx(s,'parry',q.x,q.y,{life:.16,max:.16});continue;}
   if(q.budget.hits<q.budget.max&&!q.hit.has(o.team)&&o.inv<=0&&segment(a,q,o)<.5){q.hit.add(o.team);if(o.shield>0){q.reflections=(q.reflections||0)+1;if(q.reflections>2){q.life=0;continue;}q.owner=o.team;q.dx*=-1;q.dy*=-1;q.hit.clear();ctx.event(s,'reflect');continue;}q.budget.hits++;const block=guarded(f,o),hit=ctx.strike(s,f,o,q.damage,{kind:'shot',stun:.12,knock:.15});if(hit&&!block&&q.turns>0&&f.char==='mirrormaze'){f.mazeEcho=1;f.mazeEchoTime=4;}}
  }else{const wall=surface||ctx.wall(q)||(!ctx.surfaceHit&&ctx.blocked(a,b));if(wall){q.x=surface?surface.x+surface.nx*.1:a.x;q.y=surface?surface.y+surface.ny*.1:a.y;q.life=0;}if(!wall&&o.inv<=0&&segment(a,q,o)<.6)q.life=0;if(q.life<=0)bloom(s,f,q,ctx);}
 }
}
export function batch10Ai(s,f,o,input,dt,ctx){const ai=s.ai[f.team],d=dist(f,o),v=norm(o.x-f.x,o.y-f.y),react={easy:.32,normal:.2,hard:.12}[s.difficulty]??.2,free=!['attack','heavy','skill','dash','dodge'].includes(f.state),spent=['attack','heavy'].includes(o.state)&&o.hitDone;
 ai.solo10Seen=!['attack','heavy'].includes(o.state)&&o.inv<=0?(ai.solo10Seen||0)+dt:0;ai.solo10Recovery=spent?(ai.solo10Recovery||0)+dt:0;if(!free)return false;
 if(f.char==='mirrormaze'){
  const q=s.shots.find(q=>q.owner===f.team&&q.kind==='mazeShard'&&q.life>0);
  if(f.mazeEcho&&f.cd[1]<=0&&d<2.6&&ai.solo10Recovery>=react*.65){input.skill2=true;return true;}
  if(!q&&ai.solo10Seen>=react&&d>3.5&&d<6.5&&(f.cd[0]<=0||f.meter>=100)){
   // Evaluate a few visible one-surface paths toward the foe's PRESENT point.
   // No future movement/inputs are read; the shot must physically travel there.
   if(ctx?.surfaceHit)for(const off of [-1.2,-.8,-.4,.4,.8,1.2]){const angle=Math.atan2(v.y,v.x)+off,dx=Math.cos(angle),dy=Math.sin(angle),end={x:f.x+dx*22,y:f.y+dy*22},hit=ctx.surfaceHit(f,end);if(!hit)continue;const dot=dx*hit.nx+dy*hit.ny,rx=dx-2*dot*hit.nx,ry=dy-2*dot*hit.ny,target={x:hit.x+rx*10,y:hit.y+ry*10};if(segment(hit,target,o)<.65&&!ctx.blocked({x:hit.x+hit.nx*.03,y:hit.y+hit.ny*.03},o)){input.aimX=dx;input.aimY=dy;break;}}
   if(f.meter>=100)input.ult=true;else input.skill1=true;return true;
  }
 }else if(f.char==='flarebloom'){
  if(f.flareGather&&f.cd[1]<=0&&d<2.5&&ai.solo10Recovery>=react*.65){input.skill2=true;return true;}
  if(ai.solo10Seen>=react&&d>4.5&&d<6.5&&!s.shots.some(q=>q.owner===f.team&&q.kind==='flareSeed'&&q.life>0)){if(f.meter>=100)input.ult=true;else if(f.cd[0]<=0)input.skill1=true;else return false;return true;}
 }else if(f.char==='winterbreath'){
  if(f.winterCold>=4&&f.cd[1]<=0&&d<3&&ai.solo10Seen>=react){input.skill2=true;return true;}
  if(d<2.6&&o.inv<=0&&(o.stun>.55||ai.solo10Recovery>=react*.65)){if(f.meter>=100)input.ult=true;else if(f.cd[0]<=0)input.skill1=true;else return false;return true;}
 }return false;
}
export function batch10DangerAi(s,f,input,dt){const ai=s.ai[f.team],react={easy:.32,normal:.2,hard:.12}[s.difficulty]??.2;
 const h=s.hazards.find(h=>h.owner!==f.team&&h.t>0&&!h.triggered&&(h.kind==='winterCone'?winterContact(h,f):h.kind==='flareImpact'||h.kind==='flareEmber'?dist(h,f)<h.r+.5:['mazeSend','mazeCut','flareSend'].includes(h.kind)&&segment(h,{x:h.endX,y:h.endY},f)<h.r+.4));
 const q=s.shots.find(q=>q.owner!==f.team&&q.life>0&&DUEL_BATCH10_SHOTS.includes(q.kind)&&(f.x-q.x)*q.dx+(f.y-q.y)*q.dy>0&&segment(q,{x:q.x+q.dx*3,y:q.y+q.dy*3},f)<.7);
 if(!h&&!q){ai.solo10Danger=0;return false;}ai.solo10Danger=(ai.solo10Danger||0)+dt;if(ai.solo10Danger<react)return false;const item=h||q,v=item.dx!=null?{x:-item.dy,y:item.dx}:dist(f,item)<.001?{x:-f.fy,y:f.fx}:norm(f.x-item.x,f.y-item.y);input.x=v.x;input.y=v.y;if(f.dodgeCd<=0&&(h?.arm??dist(q,f)/q.speed)<.16)input.dodge=true;return true;
}
