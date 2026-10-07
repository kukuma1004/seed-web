// Canonical fusion translation for a two-fighter arena. Original multi-enemy
// counts are bounded here: three short seeds, one tangent fold, one path echo.
const skill=(name,cooldown,desc)=>Object.freeze({name,cooldown,desc});
export const DUEL_BATCH13=Object.freeze({
 seedstorm:Object.freeze({id:'seedstorm',comboId:'seedstorm',inspectionOnly:true,artReady:false,law:'split',name:'씨앗 폭풍',role:'가까운 부채 · 흩어진 씨앗의 짧은 폭발',hp:176,speed:4.25,reach:1.7,arc:1.4,comboReach:[1.5,1.85,2],comboArc:[1.4,.7,1.5],comboNames:['씨앗 주머니 털기','잎자루 밀기','부채 펼치기'],damage:[9,10,14],cadence:.37,heavy:{damage:23,reach:2.15},parry:1,tile:6,ink:'#eac478',skills:[skill('가까운 씨앗 부채',5.9,'짧게 날아가는 실제 씨앗 셋. 최대 두 접촉·한 폭발 · 멀리 도망가면 닿지 않아요'),skill('터진 씨앗 모아 찍기',5,'짧은 앞 원을 예고해 찍어요. 실제 막히지 않은 폭발로 얻은 씨앗 한 개만 소비')],ult:skill('두 겹의 작은 폭풍',0,'다섯 씨앗의 좁은 부채 · 세 접촉·두 고정 폭발을 공유하며 끝없이 분열하지 않아요'),blurb:'3타나 강공격을 실제 맞히면 다음 부채 첫 씨앗에만 힘을 보태요. 씨앗은 짧은 거리에서 멈추고 폭발 중심도 따라오지 않아요.'}),
 refractlance:Object.freeze({id:'refractlance',comboId:'refractlance',inspectionOnly:true,artReady:false,law:'pierce',name:'굴절 창',role:'벽을 타는 접선 · 실제 한 굴절의 깊이',hp:171,speed:4.15,reach:2.2,arc:.55,comboReach:[2,2.45,2.25],comboArc:[.45,.3,.8],comboNames:['창끝 재기','깊게 꿰기','벽날 쓸기'],damage:[9,11,14],cadence:.39,heavy:{damage:24,reach:2.75},parry:1,tile:4,ink:'#d8dfb5',skills:[skill('벽을 타는 창',6.1,'좁은 실제 창이 첫 벽·기둥 표면을 따라 옆으로 꺾여요. 일반 반동이 아니며 한 굴절 뒤 피해 +22%'),skill('꺾인 창끝 거두기',5.3,'짧은 가로 창끝을 예고해요. 실제 굴절 후 적중으로 얻은 한 면을 소비 · 벽에 닿기만 해서는 힘을 얻지 않아요')],ult:skill('엇갈린 벽의 두 창',0,'서로 다른 각도로 두 창. 창마다 한 번만 접선 굴절하고 총 두 접촉까지만 · 벽에서 떨어지면 안전해요'),blurb:'3타나 강공격의 실제 적중은 다음 첫 창만 둘 강화해요. 굴절은 실제 표면 법선으로 정해지며 적 위치로 순간 이동하지 않아요.'}),
 rewindbolt:Object.freeze({id:'rewindbolt',comboId:'rewindbolt',inspectionOnly:true,artReady:false,law:'chain',name:'되감는 번개',role:'실제로 지나간 길 · 움직여 얻는 역순 전류',hp:170,speed:4.35,reach:1.9,arc:1,comboReach:[1.7,2.15,1.95],comboArc:[.8,.55,1.35],comboNames:['잎맥 긋기','전류 밀기','기억 매듭 맺기'],damage:[9,11,13],cadence:.38,heavy:{damage:23,reach:2.4},parry:1,tile:2,ink:'#f2db83',skills:[skill('지나간 번개 기억',6.4,'실제 번개가 막히지 않게 적중해야 지나간 길을 3.2초 기억해요. 그 접촉에 짧은 지연 전류 한 번'),skill('걸어서 얻은 되감기',4.9,'기억이 있는 동안 스스로 2.2 거리 걸어 출발점에서 1.8 이상 멀어진 뒤 사용. 과거 길만 역순 재생하며 적을 추적하지 않아요')],ult:skill('발걸음의 두 번개',0,'큰 번개 하나와 기억. 같은 실제 이동 조건을 벌면 고정 길의 예고 뒤 한 번만 자동 되감아요'),blurb:'가만히 있거나 밀려난 이동은 되감기 자격이 아니에요. 막힌 첫 타격은 기억을 주지 않고, 적은 기억한 길에서 벗어나 역순 번개를 피할 수 있어요.'})
});
export const DUEL_BATCH13_KINDS=Object.freeze(['stormSend','stormPop','stormGather','lanceSend','lanceFold','boltSend','boltLink','boltMemory','boltEcho']);
export const DUEL_BATCH13_SHOTS=Object.freeze(['stormSeed','tangentLance','memoryBolt','memoryEcho']);
export const DUEL_BATCH13_AUDIO=Object.freeze({stormTell:['shotBurst',{pitch:1.1}],stormPop:['shotBurst',{pitch:.8}],stormGather:['shotBurst',{pitch:.7}],lanceTell:['shotPierce',{pitch:.9}],lanceTurn:['reflect',{pitch:1.15}],lanceFold:['shotPierce',{pitch:1.2}],boltTell:['chain',{pitch:.8}],boltLink:['chain',{pitch:1.15}],boltEcho:['chain',{pitch:1.3}]});
export const DUEL_BATCH13_STORY=Object.freeze([
 ['seedstorm','멀리 못 가는 작은 폭풍','씨앗은 멀리 가지 못해. 대신 가까운 자리에서 짧고 힘차게 터질 거야. 내 부채 바깥으로 걸어 나가 봐!','부채는 짧고 실제 씨앗 사이에는 틈이 있어요. 멈춘 폭발 중심에서 벗어나세요. 폭발 적중을 얻기 전에 준비를 끊거나 막으면 다음 찍기가 약해져요.','내 작은 폭풍 밖에도 길이 넓구나. 이번에는 그 길의 벽을 따라 창 친구를 만나 보자.'],
 ['refractlance','벽이 알려 준 옆길','창은 벽에서 돌아오지 않아. 벽을 따라 옆길을 찾지. 벽 가까이 서 있어도 다른 쪽으로 나오면 괜찮아!','굴절 창은 실제 벽·기둥에서 한 번 접선 방향으로 꺾여요. 멀리 떨어지거나 기둥 반대편으로 가면 맞지 않아요. 꺾인 창을 실제 맞히기 전에는 강화 창끝을 얻지 못해요.','벽이 막다른 곳인 줄 알았는데 옆길도 있었네. 네가 남긴 발걸음은 번개 친구가 기억해 줄 거야.'],
 ['rewindbolt','돌아오는 것은 과거의 길','네가 아니라 내가 걸어야 번개가 돌아와. 그것도 네 새 자리가 아니라 지나온 길로만! 기다리면 기억은 잊혀도 좋아.','첫 실제 적중이 남긴 경로 안에서만 전류가 돌아요. 시전자가 스스로 움직여야 되감기를 얻어요. 지연 전류와 역순 예고를 보고 옆으로 벗어나거나 막으세요.','같은 길을 두 번 지나가도 넌 새로운 곳에 있구나. 기억을 쫓기보다 내 발걸음부터 바꿔 보겠어.']
].map(([enemy,title,before,tip,after],i,a)=>Object.freeze({id:'inspect-'+enemy,enemy,inspectionOnly:true,unlockAfter:i?'inspect-'+a[i-1][0]:null,title,difficulty:'hard',before,tip,after})));
const norm=(x,y)=>{const d=Math.hypot(x,y)||1;return{x:x/d,y:y/d};},dist=(a,b)=>Math.hypot(a.x-b.x,a.y-b.y);
const segment=(a,b,p)=>{const x=b.x-a.x,y=b.y-a.y,k=Math.max(0,Math.min(1,((p.x-a.x)*x+(p.y-a.y)*y)/(x*x+y*y||1)));return Math.hypot(p.x-a.x-x*k,p.y-a.y-y*k);};
const guarded=(f,o,guardDir=null)=>{const v=guardDir||norm(f.x-o.x,f.y-o.y);return o.blocking&&v.x*o.fx+v.y*o.fy>-.2;};
const windup=(f,t)=>Object.assign(f,{state:'skill',total:t,t,blocking:false,inv:0});
const memory=(s,f)=>s.hazards.find(h=>h.owner===f.team&&h.kind==='boltMemory'&&h.t>0&&!h.used);
const qualified=(h,f)=>h.walk>=2.2&&dist(h.origin,f)>=1.8;
function retire(s,f,kinds){for(const h of s.hazards)if(h.owner===f.team&&kinds.includes(h.kind)){h.t=0;h.cancelled=true;}for(const q of s.shots)if(q.owner===f.team&&kinds.includes(q.kind))q.life=0;}
export function batch13Melee(s,f,{step,heavy,hit,guarded:block}){if(!hit||block||!heavy&&step!==2)return;const key={seedstorm:'stormPod',refractlance:'lanceEdge',rewindbolt:'boltKnot'}[f.char];if(key){f[key]=1;f[key+'Time']=4;}}
function echo(s,f,h,ctx,cast,paid){h.used=true;h.t=0;const nodes=h.nodes.slice().reverse().map(p=>({...p}));const p=nodes[0],end=nodes.at(-1),v=norm(end.x-p.x,end.y-p.y);ctx.area(s,f,'boltEcho',{x:p.x,y:p.y,endX:end.x,endY:end.y,dx:v.x,dy:v.y,r:.3,nodes,arm:.4,t:.51,cast,paid,damage:h.echoDamage});ctx.event(s,'boltEcho');}
export function batch13Action(s,f,index,ctx,ult=false){const cast=f.fusion13Cast=(f.fusion13Cast||0)+1;
 if(f.char==='seedstorm'){
  if(index===1&&!ult){const held=f.stormStored||0;f.stormStored=f.stormStoredTime=0;windup(f,.78);ctx.area(s,f,'stormGather',{x:f.x+f.fx*1.6,y:f.y+f.fy*1.6,r:.8,arm:.44,t:.55,cast,damage:8+held*4});ctx.event(s,'stormGather');return;}
  retire(s,f,['stormSend']);const pod=f.stormPod||0;f.stormPod=f.stormPodTime=0;const budget={hits:0,max:ult?3:2,pops:0,maxPops:ult?2:1};windup(f,.9);ctx.area(s,f,'stormSend',{x:f.x,y:f.y,dx:f.fx,dy:f.fy,endX:f.x+f.fx*3.2,endY:f.y+f.fy*3.2,r:.23,arm:.42,t:.5,cast,offsets:ult?[-.5,-.25,0,.25,.5]:[-.4,0,.4],pod,damage:3,popDamage:9,budget});ctx.event(s,'stormTell');
 }else if(f.char==='refractlance'){
  if(index===1&&!ult){const edge=f.lanceStored||0;f.lanceStored=f.lanceStoredTime=0;windup(f,.77);const p={x:f.x+f.fx*1.4,y:f.y+f.fy*1.4};ctx.area(s,f,'lanceFold',{x:p.x-f.fy*.85,y:p.y+f.fx*.85,endX:p.x+f.fy*.85,endY:p.y-f.fx*.85,dx:f.fy,dy:-f.fx,r:.2,arm:.4,t:.5,cast,damage:11+edge*4});ctx.event(s,'lanceFold');return;}
  retire(s,f,['lanceSend']);const edge=f.lanceEdge||0;f.lanceEdge=f.lanceEdgeTime=0;const budget={hits:0,max:ult?2:1};windup(f,ult?.98:.78);for(const [k,off] of (ult?[-.35,.35]:[0]).entries()){const a=Math.atan2(f.fy,f.fx)+off,arm=.43+k*.16;ctx.area(s,f,'lanceSend',{x:f.x,y:f.y,dx:Math.cos(a),dy:Math.sin(a),endX:f.x+Math.cos(a)*9,endY:f.y+Math.sin(a)*9,r:.15,arm,t:arm+.08,cast,hand:k?-1:1,damage:(ult?8:9)+(k===0?edge*2:0),budget});}ctx.event(s,'lanceTell');
 }else if(f.char==='rewindbolt'){
  if(index===1&&!ult){windup(f,.79);const h=memory(s,f);if(h&&qualified(h,f))echo(s,f,h,ctx,cast,true);else{ctx.event(s,'boltEcho');ctx.fx(s,'chain',f.x,f.y,{life:.16,max:.16});}return;}
  retire(s,f,['boltSend','boltMemory','memoryBolt']);const knot=f.boltKnot||0;f.boltKnot=f.boltKnotTime=0;windup(f,.84);ctx.area(s,f,'boltSend',{x:f.x,y:f.y,dx:f.fx,dy:f.fy,endX:f.x+f.fx*8,endY:f.y+f.fy*8,r:.22,arm:.45,t:.53,cast,damage:(ult?14:11)+knot*2,echoDamage:ult?11:9,auto:ult});ctx.event(s,'boltTell');
 }
}
export function batch13Tick(s,dt,ctx){
 for(const f of s.fighters)for(const key of ['stormPod','stormStored','lanceEdge','lanceStored','boltKnot']){f[key+'Time']=Math.max(0,(f[key+'Time']||0)-dt);if(!f[key+'Time'])f[key]=0;}
 for(const h of [...s.hazards]){if(!DUEL_BATCH13_KINDS.includes(h.kind)||h.t<=0)continue;const before=h.arm;h.t-=dt;h.arm=Math.max(0,h.arm-dt);const f=s.fighters[h.owner],o=s.fighters[1-h.owner];
  // The host records only actual input walking after arena clamping. Position
  // deltas include enemy pull/knock/collision and must never fund this skill.
  if(h.kind==='boltMemory'){h.walk+=Math.max(0,Math.min(dt*7,f.boltWalkFrame||0));h.last={x:f.x,y:f.y};h.ready=qualified(h,f);if(h.auto&&h.ready)echo(s,f,h,ctx,0,false);continue;}
  if(before>0&&!['stormPop','boltLink'].includes(h.kind)&&!(h.kind==='boltEcho'&&!h.paid)&&(f.stun>0||f.state!=='skill'||f.fusion13Cast!==h.cast)){h.t=0;h.cancelled=true;continue;}if(h.arm>0||h.triggered)continue;h.triggered=true;
  if(h.kind==='stormSend'){for(const [k,off] of h.offsets.entries()){const a=Math.atan2(h.dy,h.dx)+off;ctx.shoot(s,f,{kind:'stormSeed',x:h.x,y:h.y,dx:Math.cos(a),dy:Math.sin(a),speed:7,life:.44,damage:h.damage+(k===0?h.pod*2:0),popDamage:h.popDamage,budget:h.budget,originalOwner:f.team});}}
  else if(h.kind==='lanceSend')ctx.shoot(s,f,{kind:'tangentLance',x:h.x,y:h.y,dx:h.dx,dy:h.dy,speed:13,life:.85,damage:h.damage,hand:h.hand,turns:0,budget:h.budget,originalOwner:f.team});
  else if(h.kind==='boltSend')ctx.shoot(s,f,{kind:'memoryBolt',x:h.x,y:h.y,dx:h.dx,dy:h.dy,speed:12,life:.67,damage:h.damage,nodes:[{x:h.x,y:h.y}],origin:{x:h.x,y:h.y},echoDamage:h.echoDamage,auto:h.auto,originalOwner:f.team});
  else if(h.kind==='boltEcho'){const p=h.nodes[0],v=norm(h.nodes[1].x-p.x,h.nodes[1].y-p.y);ctx.shoot(s,f,{kind:'memoryEcho',x:p.x,y:p.y,dx:v.x,dy:v.y,speed:12,life:1,nodes:h.nodes,node:1,damage:h.damage,originalOwner:f.team});}
  else if(h.kind==='lanceFold'){if(o.inv<=0&&!ctx.blocked(h,o)&&segment(h,{x:h.endX,y:h.endY},o)<h.r+.35)ctx.strike(s,f,o,h.damage,{kind:'skill',stun:.15,knock:.25});}
  else if(o.inv<=0&&dist(h,o)<h.r+.3&&!ctx.blocked(h,o)){const block=guarded(f,o),hit=ctx.strike(s,f,o,h.damage,{kind:h.kind==='boltLink'?'shot':'skill',stun:h.kind==='boltLink'?.06:.15,knock:0});if(hit&&!block&&h.kind==='stormPop'&&f.char==='seedstorm'){f.stormStored=1;f.stormStoredTime=4;}}
 }
 for(const q of [...s.shots]){if(!DUEL_BATCH13_SHOTS.includes(q.kind)||q.life<=0||q.hallTurnAt===s.time||q.guardTurnAt===s.time)continue;const f=s.fighters[q.owner],o=s.fighters[1-q.owner],a={x:q.x,y:q.y};let travel=q.speed*Math.min(dt,q.life);q.life-=dt;
  if(q.kind==='memoryEcho'){while(travel>0&&q.node<q.nodes.length){const p=q.nodes[q.node],d=dist(q,p),v=norm(p.x-q.x,p.y-q.y),take=Math.min(d,travel);q.x+=v.x*take;q.y+=v.y*take;travel-=take;q.dx=v.x;q.dy=v.y;if(d<=take+.00001)q.node++;else break;}if(q.node>=q.nodes.length)q.life=0;}
  else{q.x+=q.dx*travel;q.y+=q.dy*travel;}
  const surface=ctx.surfaceHit?.(a,q);if(ctx.interceptShot?.(s,q,a.x,a.y,0))continue;
  if(surface||ctx.wall(q)||(!ctx.surfaceHit&&ctx.blocked(a,q))){if(q.kind==='tangentLance'&&surface&&q.turns===0){const tangent={x:-surface.ny,y:surface.nx},dot=q.dx*tangent.x+q.dy*tangent.y,sign=Math.abs(dot)>.05?Math.sign(dot):q.hand;q.dx=tangent.x*sign;q.dy=tangent.y*sign;q.x=surface.x+surface.nx*.12;q.y=surface.y+surface.ny*.12;q.turns=1;q.hit.clear();q.damage*=1.22;ctx.event(s,'lanceTurn');continue;}q.life=0;continue;}
  if(q.kind==='memoryBolt'&&q.nodes.length<16&&dist(q.nodes.at(-1),q)>.5)q.nodes.push({x:q.x,y:q.y});
  if(q.kind==='stormSeed'&&q.life<=0){if(q.budget.pops<q.budget.maxPops){q.budget.pops++;ctx.area(s,f,'stormPop',{x:q.x,y:q.y,r:.7,arm:.3,t:.42,damage:q.popDamage});ctx.event(s,'stormPop');}continue;}
  if(o.inv>0||q.hit.has(o.team)||segment(a,q,o)>=(q.kind==='tangentLance'?.36:.44)||ctx.blocked(a,o))continue;
  if(o.shield>0){q.reflections=(q.reflections||0)+1;if(q.reflections>1){q.life=0;continue;}q.owner=o.team;q.dx*=-1;q.dy*=-1;q.hit.clear();if(q.kind==='memoryEcho'){q.life=0;ctx.event(s,'reflect');continue;}ctx.event(s,'reflect');continue;}
  const guardDir={x:-q.dx,y:-q.dy};
  q.hit.add(o.team);const block=guarded(f,o,guardDir);if(q.budget&&q.budget.hits>=q.budget.max){q.life=0;continue;}if(q.budget)q.budget.hits++;const accepted=ctx.strike(s,f,o,q.damage,{kind:'shot',stun:.08,knock:0,guardDir});
  if(q.kind==='stormSeed'){if(q.budget.pops<q.budget.maxPops){q.budget.pops++;ctx.area(s,f,'stormPop',{x:q.x,y:q.y,r:.7,arm:.3,t:.42,damage:q.popDamage});ctx.event(s,'stormPop');}}
  else if(q.kind==='tangentLance'&&accepted&&!block&&q.turns&&q.originalOwner===f.team&&f.char==='refractlance'){f.lanceStored=1;f.lanceStoredTime=4;}
  else if(q.kind==='memoryBolt'&&accepted&&!block&&q.originalOwner===f.team&&f.char==='rewindbolt'){
   q.nodes.push({x:q.x,y:q.y});ctx.area(s,f,'boltLink',{x:q.x,y:q.y,r:.6,arm:.25,t:.38,damage:3});ctx.area(s,f,'boltMemory',{x:q.x,y:q.y,r:.3,arm:0,t:3.2,nodes:q.nodes,origin:q.origin,last:{x:f.x,y:f.y},walk:0,ready:false,auto:q.auto,echoDamage:q.echoDamage});ctx.event(s,'boltLink');
  }q.life=0;
 }
}
export function batch13Ai(s,f,o,input,dt,ctx){const ai=s.ai[f.team],d=dist(f,o),v=norm(o.x-f.x,o.y-f.y),react={easy:.32,normal:.2,hard:.12}[s.difficulty]??.2;ai.fusion13Seen=(ai.fusion13Seen||0)+dt;if(ai.fusion13Seen<react)return false;input.aimX=v.x;input.aimY=v.y;
 if(f.char==='seedstorm'){if(f.stormStored&&d<2.5&&f.cd[1]<=0){input.skill2=true;return true;}if(d>1.9&&d<3.2&&(f.cd[0]<=0||f.meter>=100)){input[f.meter>=100?'ult':'skill1']=true;return true;}}
 else if(f.char==='refractlance'){if(f.lanceStored&&d<2.3&&f.cd[1]<=0){input.skill2=true;return true;}if(d>3&&d<9&&f.cd[0]<=0){if(ctx?.surfaceHit)for(const off of [-1.3,-.9,-.5,.5,.9,1.3]){const a=Math.atan2(v.y,v.x)+off,dx=Math.cos(a),dy=Math.sin(a),h=ctx.surfaceHit(f,{x:f.x+dx*9,y:f.y+dy*9});if(!h)continue;const tx=-h.ny,ty=h.nx,dot=dx*tx+dy*ty,sign=Math.abs(dot)>.05?Math.sign(dot):1,p={x:h.x+h.nx*.12,y:h.y+h.ny*.12};if(segment(p,{x:p.x+tx*sign*7,y:p.y+ty*sign*7},o)<.55&&!ctx.blocked(p,o)){input.aimX=dx;input.aimY=dy;break;}}input[f.meter>=100?'ult':'skill1']=true;return true;}}
 else if(f.char==='rewindbolt'){const h=memory(s,f);if(h){if(h.ready&&f.cd[1]<=0){input.skill2=true;return true;}if(!h.ready){input.x=-v.y;input.y=v.x;return true;}}else if(d>3&&d<7&&(f.cd[0]<=0||f.meter>=100)){input[f.meter>=100?'ult':'skill1']=true;return true;}}
 return false;
}
export function batch13DangerAi(s,f,input,dt){const ai=s.ai[f.team],react={easy:.32,normal:.2,hard:.12}[s.difficulty]??.2,h=s.hazards.find(h=>h.owner!==f.team&&h.t>0&&!h.triggered&&h.kind!=='boltMemory'&&(['stormPop','stormGather','boltLink'].includes(h.kind)?dist(h,f)<h.r+.45:DUEL_BATCH13_KINDS.includes(h.kind)&&segment(h,{x:h.endX,y:h.endY},f)<h.r+.4));if(!h){ai.fusion13Danger=0;return false;}ai.fusion13Danger=(ai.fusion13Danger||0)+dt;if(ai.fusion13Danger<react)return false;const v=h.dx||h.dy?{x:-h.dy,y:h.dx}:norm(f.x-h.x||1,f.y-h.y);input.x=v.x;input.y=v.y;if(h.arm<.16&&f.dodgeCd<=0)input.dodge=true;return true;}
