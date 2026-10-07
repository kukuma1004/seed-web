const skill=(name,cooldown,desc)=>Object.freeze({name,cooldown,desc});
export const DUEL_BATCH12=Object.freeze({
 mirrorguard:Object.freeze({id:'mirrorguard',comboId:'mirrorguard',inspectionOnly:true,artReady:false,law:'orbit',name:'거울 수호',role:'한 거울의 실제 접점 · 몸과 각도의 공백',hp:175,speed:4.1,reach:1.8,arc:1.15,comboReach:[1.55,1.95,2.15],comboArc:[.65,1.3,.8],comboNames:['거울 모서리','수호 잎 펼치기','거울자루 밀기'],damage:[9,10,14],cadence:.38,heavy:{damage:23,reach:2.3},parry:1.1,tile:0,ink:'#dfdcab',skills:[skill('한 거울의 수호',6.6,'거울 한 장의 실제 공전 접점만 일반 탄 두 발을 반환해요. 보스 탄은 한 발 삭제하고 힘은 얻지 않아요. 몸·거울 사이·근접은 열려 있어요'),skill('받은 빛 접어 베기',5.2,'거울을 접고 짧은 고정 선을 예고해 베어요. 실제 일반 탄 반환으로 모은 두 겹까지 소비 · 반환탄을 또 반환하지 않아요')],ult:skill('먼 거울 한 바퀴',0,'더 넓은 반경의 거울 한 장 · 일반 탄 세 발·보스 탄 두 발까지만. 근접 무적과 다중 방패는 없어요'),blurb:'실제 막히지 않은 3타·강공격으로 다음 거울의 일반 탄 예산을 한 발만 보태요. 보스 탄 삭제는 베기 강화가 되지 않아요. 거울의 반대 각도와 몸 가까이로 들어오세요.'}),
 frostkaleidoscope:Object.freeze({id:'frostkaleidoscope',comboId:'frostkaleidoscope',inspectionOnly:true,artReady:false,law:'reflect',name:'서리 만화경',role:'실제 두 반동의 냉기 · 접촉 뒤 한 파쇄',hp:172,speed:4.15,reach:1.85,arc:1.05,comboReach:[1.7,2,1.8],comboArc:[1.25,.65,1.35],comboNames:['얼음면 베기','서리핵 찌르기','만화경 펼치기'],damage:[9,11,13],cadence:.39,heavy:{damage:23,reach:2.3},parry:1,tile:8,ink:'#c8e6e7',skills:[skill('두 반동의 서리핵',6.4,'실제 벽·기둥을 튕기는 냉기탄 하나. 두 반동 이상 뒤 실제 적 접촉이면 그 자리에서 예고하고 한 번 파쇄 · 세 접촉 상한'),skill('얼음면 거두기',5.1,'남은 서리핵을 지우고 짧게 베어요. 실제 반동 뒤 적중으로 얻은 한 면을 소비하며 파쇄를 새로 만들지는 않아요')],ult:skill('엇갈린 두 얼음면',0,'두 물리탄이 네 번까지 반동하지만 세 접촉·한 파쇄 예산을 함께 써요. 벽 없는 곳에서는 약해요'),blurb:'실제 3타·강공격은 다음 첫 냉기탄의 피해를 둘 보태요. 벽을 두 번 맞기 전에는 큰 파쇄가 없고, 얼음탄은 빠르게 이동하는 실체라 옆걸음과 기둥으로 피할 수 있어요.'}),
 icicle:Object.freeze({id:'icicle',comboId:'icicle',inspectionOnly:true,artReady:false,law:'pierce',name:'고드름 창',role:'내가 만든 냉기 · 다음 좁은 창의 파쇄',hp:174,speed:4.15,reach:2.1,arc:.65,comboReach:[1.95,2.35,2.1],comboArc:[.5,.35,.65],comboNames:['얼음자루 찌르기','긴 고드름 찌르기','얼음끝 베기'],damage:[9,11,14],cadence:.39,heavy:{damage:23,reach:2.65},parry:1,tile:4,ink:'#c4e9ee',skills:[skill('내 냉기 새기기',6.5,'좁고 긴 물리창 하나. 실제 막히지 않은 적중만 자신의 냉기를 2.6초 남겨요. 보스는 얼리지 않고 표식만 남아요'),skill('내 얼음 다시 꿰기',5.3,'좁은 후속 창을 따로 예고해 쏘아요. 자신이 남긴 냉기가 아직 있는 대상에 실제 맞혀야 한 번 파쇄하고 표식을 소비'),],ult:skill('두 고드름의 약속',0,'첫 창·후속 창을 시간차로 고정한 방향에 보내요. 두 실제 적중과 자기 냉기 조건을 지켜야 파쇄 · 추적과 반복 동결은 없어요'),blurb:'다른 냉기나 둔화는 내 파쇄 조건이 아니에요. 실제 3타·강공격은 다음 첫 창의 피해만 둘 올려요. 첫 창 이후 보이는 두 번째 예고를 옆으로 피하거나 막으면 냉기는 시간이 지나 풀려요.'})
});
export const DUEL_BATCH12_KINDS=Object.freeze(['guardOrbit','guardFold','kaleidoSend','kaleidoBurst','kaleidoFold','icicleSend']);
export const DUEL_BATCH12_SHOTS=Object.freeze(['guardReturn','kaleidoIce','icicleShaft']);
export const DUEL_BATCH12_AUDIO=Object.freeze({guardOpen:['reflect',{pitch:.8}],guardReturn:['reflect',{pitch:1.2}],guardBoss:['reflect',{pitch:.65}],guardFold:['shotPierce',{pitch:.9}],kaleidoSend:['shotFrost',{pitch:.9}],kaleidoBounce:['reflect',{pitch:1.1}],kaleidoBreak:['frostHit',{pitch:1.2}],kaleidoFold:['shotPierce',{pitch:.9}],icicleTell:['shotPierce',{pitch:1.05}],icicleCold:['shotFrost',{pitch:1.1}],icicleShatter:['frostHit',{pitch:.8}]});
export const DUEL_BATCH12_STORY=Object.freeze([
 ['mirrorguard','한 장으로 남겨 둔 틈','거울은 한 장뿐이야. 네 빛이 닿으면 돌려주겠지만 내가 서 있는 자리까지 막아 주지는 않아. 큰 빛은 조금만 받아낼게!','반환 접점은 실제로 공전하는 한 거울이에요. 반대 각도·몸 가까이·근접은 열려 있어요. 일반 반환과 보스 삭제 예산이 따로 있으며 반환된 탄을 다시 반환하지 않아요.','모든 길을 막는 대신 한 길만 바라봐도 좋구나. 남겨 둔 틈으로 작은 겨울 친구가 들어왔네.'],
 ['frostkaleidoscope','두 번 돌아본 작은 겨울','처음 튕긴 겨울은 아직 작아. 두 번째 벽을 만난 뒤에야 크게 깨질 수 있어. 그렇다고 네가 있던 곳으로 갑자기 뛰어가진 못해!','서리핵이 실제 두 벽·기둥을 튕긴 뒤 맞혀야 파쇄돼요. 벽 없는 곳에서는 작은 타격뿐이고 파쇄 예고의 중심은 고정돼요. 마지막 준비와 거두는 빈틈을 노리세요.','같은 벽도 두 번 돌아보니 다른 길을 보여 줬어. 그 길의 끝에서 고드름 친구의 약속을 들으러 가자.'],
 ['icicle','내가 남긴 겨울의 약속','내 창으로 남긴 겨울만 알아볼 수 있어. 처음과 다음 사이에 네가 움직이면 약속은 깨져도 좋아. 네 발까지 오래 얼려 두진 않을게!','첫 좁은 창의 실제 적중으로 생긴 자기 표식은 2.6초뿐이에요. 다음 유료 창이 실제로 다시 맞아야 파쇄해요. 다른 둔화·막기·회피는 표식을 주지 않고 보스 동작은 얼리지 않아요.','두 번 같은 길을 바라보는 사이 너는 새 길을 찾았구나. 얼음이 깨진 자리에도 걸어갈 공간은 남겨 둘게.']
].map(([enemy,title,before,tip,after],i,a)=>Object.freeze({id:'inspect-'+enemy,enemy,inspectionOnly:true,unlockAfter:i?'inspect-'+a[i-1][0]:null,title,difficulty:'hard',before,tip,after})));
const norm=(x,y)=>{const d=Math.hypot(x,y)||1;return{x:x/d,y:y/d};},dist=(a,b)=>Math.hypot(a.x-b.x,a.y-b.y);
const segment=(a,b,p)=>{const x=b.x-a.x,y=b.y-a.y,k=Math.max(0,Math.min(1,((p.x-a.x)*x+(p.y-a.y)*y)/(x*x+y*y||1)));return Math.hypot(p.x-a.x-x*k,p.y-a.y-y*k);};
const guarded=(f,o)=>{const v=norm(f.x-o.x,f.y-o.y);return o.blocking&&v.x*o.fx+v.y*o.fy>-.2;};
const windup=(f,t)=>Object.assign(f,{state:'skill',total:t,t,blocking:false,inv:0});
const guard=(s,f)=>s.hazards.find(h=>h.owner===f.team&&h.kind==='guardOrbit'&&h.t>0&&h.arm<=0);
export const mirrorGuardPoint=(h,f)=>({x:f.x+Math.cos(h.angle)*h.r,y:f.y+Math.sin(h.angle)*h.r});
function retire(s,f,kinds){for(const h of s.hazards)if(h.owner===f.team&&kinds.includes(h.kind)){h.t=0;h.cancelled=true;}for(const q of s.shots)if(q.owner===f.team&&kinds.includes(q.kind)){q.life=0;q.spent=true;}}
export function batch12Melee(s,f,{step,heavy,hit,guarded:blocked}){if(!hit||blocked||!heavy&&step!==2)return;const key={mirrorguard:'guardFacet',frostkaleidoscope:'kaleidoFacet',icicle:'icicleEdge'}[f.char];if(key){f[key]=1;f[key+'Time']=4;}}
export function batch12Action(s,f,index,ctx,ult=false){const cast=f.fusion12Cast=(f.fusion12Cast||0)+1;
 if(f.char==='mirrorguard'){
  retire(s,f,['guardOrbit','guardFold']);if(index===1&&!ult){const stored=f.guardStored||0;f.guardStored=f.guardStoredTime=0;windup(f,.76);ctx.area(s,f,'guardFold',{x:f.x,y:f.y,endX:f.x+f.fx*2.4,endY:f.y+f.fy*2.4,dx:f.fx,dy:f.fy,r:.32,arm:.4,t:.52,cast,damage:10+stored*3});ctx.event(s,'guardFold');return;}
  const facet=f.guardFacet||0;f.guardFacet=f.guardFacetTime=0;const arm=ult?.5:.34;windup(f,arm+.25);ctx.area(s,f,'guardOrbit',{x:f.x,y:f.y,r:ult?2.2:1.9,angle:Math.atan2(f.fy,f.fx),arm,t:arm+(ult?3:2.5),cast,ordinary:(ult?3:2)+facet,bossBlocks:ult?2:1,rammed:false});ctx.event(s,'guardOpen');
 }else if(f.char==='frostkaleidoscope'){
  retire(s,f,['kaleidoSend','kaleidoIce','kaleidoFold']);if(index===1&&!ult){const stored=f.kaleidoStored||0;f.kaleidoStored=f.kaleidoStoredTime=0;windup(f,.7);ctx.area(s,f,'kaleidoFold',{x:f.x,y:f.y,endX:f.x+f.fx*2.3,endY:f.y+f.fy*2.3,dx:f.fx,dy:f.fy,r:.32,arm:.35,t:.48,cast,damage:11+stored*4});ctx.event(s,'kaleidoFold');return;}
  const facet=f.kaleidoFacet||0;f.kaleidoFacet=f.kaleidoFacetTime=0;const budget={hits:0,max:3,burst:false};windup(f,ult?1.03:.75);for(const [k,off] of (ult?[-.3,.3]:[0]).entries()){const a=Math.atan2(f.fy,f.fx)+off,arm=.4+k*.17;ctx.area(s,f,'kaleidoSend',{x:f.x,y:f.y,dx:Math.cos(a),dy:Math.sin(a),endX:f.x+Math.cos(a)*8,endY:f.y+Math.sin(a)*8,r:.22,arm,t:arm+.08,cast,damage:(ult?5:6)+(k===0?facet*2:0),budget});}ctx.event(s,'kaleidoSend');
 }else if(f.char==='icicle'){
  const edge=ult||index===0?f.icicleEdge||0:0;if(ult||index===0)f.icicleEdge=f.icicleEdgeTime=0;retire(s,f,['icicleSend']);const budget={hits:0,max:ult?2:1};windup(f,ult?1.26:.72);for(const [k,second] of (ult?[false,true]:[index===1]).entries()){const arm=ult?.5+k*.4:second?.38:.4;ctx.area(s,f,'icicleSend',{x:f.x,y:f.y,dx:f.fx,dy:f.fy,endX:f.x+f.fx*8,endY:f.y+f.fy*8,r:.16,arm,t:arm+.09,cast,second,damage:ult?second?10:9+edge*2:second?8:10+edge*2,budget});}ctx.event(s,'icicleTell');
 }
}
export function batch12InterceptShot(s,q,x0,y0,dt,ctx){
 if(q.life<=0||q.guardReturned||q.hallReturned||q.wardSpent||q.sunSpent||q.kind==='guardReturn'||q.kind==='hallReturn')return false;
 const f=s.fighters[1-q.owner],h=guard(s,f);if(!h||f.char!=='mirrorguard')return false;const boss=q.boss===true||s.boss&&q.owner===1,key=boss?'bossBlocks':'ordinary';if(h[key]<=0)return false;const p=mirrorGuardPoint(h,f);
 if(ctx.wall(p)||ctx.blocked(f,p)||ctx.blocked({x:x0,y:y0},p)||segment({x:x0,y:y0},q,p)>=.43)return false;h[key]--;q.spent=q.returnSpent=q.bloomSpent=q.collapseSpent=q.crunchSpent=true;
 if(boss){q.life=0;q.wardSpent=true;ctx.event(s,'guardBoss');}else{
  const shooter=s.fighters[q.owner],v=norm(shooter.x-p.x,shooter.y-p.y);Object.assign(q,{owner:f.team,kind:'guardReturn',x:p.x,y:p.y,dx:v.x,dy:v.y,speed:9,life:Math.min(1.1,q.life),damage:Math.min(8,q.damage||0),hit:new Set(),pierce:0,bounces:0,guardReturned:true,guardTurnAt:s.time,returnHits:0,reflections:0});f.guardStored=Math.min(2,(f.guardStored||0)+1);f.guardStoredTime=4;ctx.event(s,'guardReturn');
 }ctx.fx(s,'parry',p.x,p.y,{life:.18,max:.18});return true;
}
export function batch12Tick(s,dt,ctx){
 for(const f of s.fighters){for(const key of ['guardFacet','guardStored','kaleidoFacet','kaleidoStored','icicleEdge','icicleMark']){f[key+'Time']=Math.max(0,(f[key+'Time']||0)-dt);if(!f[key+'Time'])f[key]=0;}}
 for(const h of [...s.hazards]){if(!DUEL_BATCH12_KINDS.includes(h.kind)||h.t<=0)continue;const before=h.arm;h.t-=dt;h.arm=Math.max(0,h.arm-dt);const f=s.fighters[h.owner],o=s.fighters[1-h.owner];
  if(before>0&&h.kind!=='kaleidoBurst'&&(f.stun>0||f.state!=='skill'||f.fusion12Cast!==h.cast)){h.t=0;h.cancelled=true;continue;}if(h.arm>0)continue;
  if(h.kind==='guardOrbit'){h.x=f.x;h.y=f.y;h.angle+=Math.max(0,dt-before)*1.8;const p=mirrorGuardPoint(h,f);h.rockX=p.x;h.rockY=p.y;if(!h.rammed&&o.inv<=0&&!ctx.wall(p)&&!ctx.blocked(f,p)&&!ctx.blocked(p,o)&&dist(p,o)<.45){h.rammed=true;ctx.strike(s,f,o,3,{kind:'shot',stun:.06,knock:.1});}continue;}
  if(h.triggered)continue;h.triggered=true;
  if(h.kind==='kaleidoSend')ctx.shoot(s,f,{kind:'kaleidoIce',x:h.x,y:h.y,dx:h.dx,dy:h.dy,speed:10,life:4,remaining:4,turns:0,damage:h.damage,budget:h.budget});
  else if(h.kind==='icicleSend')ctx.shoot(s,f,{kind:'icicleShaft',x:h.x,y:h.y,dx:h.dx,dy:h.dy,speed:15,life:.55,damage:h.damage,second:h.second,budget:h.budget});
  else if(h.kind==='kaleidoBurst'){if(o.inv<=0&&dist(h,o)<h.r+.3&&!ctx.blocked(h,o))ctx.strike(s,f,o,h.damage,{kind:'skill',stun:.14,knock:.2});}
  else if(o.inv<=0&&!ctx.blocked(h,o)&&segment(h,{x:h.endX,y:h.endY},o)<h.r+.35)ctx.strike(s,f,o,h.damage,{kind:'skill',stun:.17,knock:.35});
 }
 for(const q of [...s.shots]){if(!DUEL_BATCH12_SHOTS.includes(q.kind)||q.life<=0||q.guardTurnAt===s.time||q.hallTurnAt===s.time)continue;const f=s.fighters[q.owner],o=s.fighters[1-q.owner],a={x:q.x,y:q.y},b={x:q.x+q.dx*q.speed*Math.min(dt,q.life),y:q.y+q.dy*q.speed*Math.min(dt,q.life)},surface=ctx.surfaceHit?.(a,b);q.life-=dt;Object.assign(q,b);if(ctx.interceptShot?.(s,q,a.x,a.y,0))continue;
  if(surface||ctx.wall(q)||(!ctx.surfaceHit&&ctx.blocked(a,b))){if(q.kind!=='kaleidoIce'||!surface||q.remaining<=0){q.life=0;continue;}const dot=q.dx*surface.nx+q.dy*surface.ny;q.dx-=2*dot*surface.nx;q.dy-=2*dot*surface.ny;q.x=surface.x+surface.nx*.025;q.y=surface.y+surface.ny*.025;q.remaining--;q.turns++;q.hit.clear();q.damage=Math.min(12,q.damage*1.1);ctx.event(s,'kaleidoBounce');continue;}
  const hitR=q.kind==='icicleShaft'?.38:.48;if(o.inv>0||q.hit.has(o.team)||segment(a,q,o)>=hitR||ctx.blocked(a,o))continue;
  if(o.shield>0){q.reflections=(q.reflections||0)+1;if(q.reflections>1){q.life=0;continue;}q.owner=o.team;q.dx*=-1;q.dy*=-1;q.hit.clear();ctx.event(s,'reflect');continue;}
  q.hit.add(o.team);const block=guarded(f,o),boss=s.boss&&o.team===1;
  if(q.kind==='guardReturn'){if(q.returnHits>=1)continue;q.returnHits++;ctx.strike(s,f,o,q.damage,{kind:'shot',stun:.08,knock:.15});q.life=0;}
  else if(q.budget.hits<q.budget.max){q.budget.hits++;const accepted=ctx.strike(s,f,o,q.damage,{kind:'shot',stun:q.kind==='icicleShaft'&&!q.second&&!boss?.24:.08,knock:0,flinch:!boss});
   if(accepted&&!block){
    if(q.kind==='kaleidoIce'){if(!boss)o.slow=Math.max(o.slow,.3);if(q.turns>0&&f.char==='frostkaleidoscope'){f.kaleidoStored=1;f.kaleidoStoredTime=4;}if(q.turns>=2&&!q.budget.burst){q.budget.burst=true;ctx.area(s,f,'kaleidoBurst',{x:q.x,y:q.y,r:1,arm:.35,t:.48,damage:14});q.life=0;ctx.event(s,'kaleidoBreak');}}
    else if(f.char==='icicle'){
     if(q.second){if(f.icicleMark>0&&f.icicleMarkTime>0){f.icicleMark=f.icicleMarkTime=0;ctx.strike(s,f,o,10,{kind:'shot',stun:0,knock:0,flinch:false});ctx.fx(s,'jail',o.x,o.y,{life:.12,max:.12});ctx.event(s,'icicleShatter');}}
     else{f.icicleMark=1;f.icicleMarkTime=2.6;if(!boss){o.slow=Math.max(o.slow,.45);ctx.fx(s,'jail',o.x,o.y,{life:.24,max:.24});}ctx.event(s,'icicleCold');}
    }
   }if(q.kind==='icicleShaft')q.life=0;
  }
 }
}
export function batch12Ai(s,f,o,input,dt,ctx){const ai=s.ai[f.team],d=dist(f,o),v=norm(o.x-f.x,o.y-f.y),react={easy:.32,normal:.2,hard:.12}[s.difficulty]??.2,free=!['attack','heavy','skill','dodge','dash'].includes(f.state);if(!free)return false;ai.fusion12Seen=!['attack','heavy'].includes(o.state)&&o.inv<=0?(ai.fusion12Seen||0)+dt:0;
 if(f.char==='mirrorguard'){const h=guard(s,f),incoming=s.shots.some(q=>q.owner!==f.team&&q.life>0&&!q.guardReturned&&segment(q,{x:q.x+q.dx*q.speed*q.life,y:q.y+q.dy*q.speed*q.life},f)<1.9);ai.guardSeen=incoming?(ai.guardSeen||0)+dt:0;if(f.guardStored&&f.cd[1]<=0&&d<2.5&&ai.fusion12Seen>=react){input.skill2=true;return true;}if(!h&&incoming&&ai.guardSeen>=react&&d>2.5){if(f.meter>=100)input.ult=true;else if(f.cd[0]<=0)input.skill1=true;else return false;return true;}}
 else if(f.char==='frostkaleidoscope'){if(f.kaleidoStored&&f.cd[1]<=0&&d<2.4&&ai.fusion12Seen>=react){input.skill2=true;return true;}if(!s.shots.some(q=>q.owner===f.team&&q.kind==='kaleidoIce'&&q.life>0)&&d>3.5&&d<6.5&&ai.fusion12Seen>=react&&(f.cd[0]<=0||f.meter>=100)){
   // Current, visible two-surface ray only; actual projectile must still travel.
   if(ctx?.surfaceHit)for(const off of [-1.25,-.9,-.5,.5,.9,1.25]){let p={x:f.x,y:f.y},a=Math.atan2(v.y,v.x)+off,dx=Math.cos(a),dy=Math.sin(a),okay=true;for(let k=0;k<2;k++){const h=ctx.surfaceHit(p,{x:p.x+dx*35,y:p.y+dy*35});if(!h){okay=false;break;}const dot=dx*h.nx+dy*h.ny;dx-=2*dot*h.nx;dy-=2*dot*h.ny;p={x:h.x+h.nx*.03,y:h.y+h.ny*.03};}if(okay&&segment(p,{x:p.x+dx*14,y:p.y+dy*14},o)<.65&&!ctx.blocked(p,o)){input.aimX=Math.cos(a);input.aimY=Math.sin(a);break;}}
   if(f.meter>=100)input.ult=true;else input.skill1=true;return true;
  }}else if(f.char==='icicle'&&d>3&&d<7&&ai.fusion12Seen>=react){if(f.icicleMark&&f.cd[1]<=0){input.skill2=true;return true;}if(f.meter>=100){input.ult=true;return true;}if(f.cd[0]<=0){input.skill1=true;return true;}}
 return false;
}
export function batch12DangerAi(s,f,input,dt){const ai=s.ai[f.team],react={easy:.32,normal:.2,hard:.12}[s.difficulty]??.2,h=s.hazards.find(h=>h.owner!==f.team&&h.t>0&&!h.triggered&&(h.kind==='kaleidoBurst'?dist(h,f)<h.r+.45:['icicleSend','guardFold','kaleidoFold','kaleidoSend'].includes(h.kind)&&segment(h,{x:h.endX,y:h.endY},f)<h.r+.4));if(!h){ai.fusion12Danger=0;return false;}ai.fusion12Danger=(ai.fusion12Danger||0)+dt;if(ai.fusion12Danger<react)return false;const v=h.dx!=null?{x:-h.dy,y:h.dx}:dist(h,f)>.01?norm(f.x-h.x,f.y-h.y):{x:-f.fy,y:f.fx};input.x=v.x;input.y=v.y;if(h.arm<.16&&f.dodgeCd<=0)input.dodge=true;return true;}
