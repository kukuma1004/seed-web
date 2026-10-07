// Original orbit/recall, orbit/gravity, pierce/gravity fusions. This duel has
// one enemy: the stake's single-target condition is inherently satisfied,
// while original crowd counts and 160 damage are NOT copied to PvP.
const skill=(name,cooldown,desc)=>Object.freeze({name,cooldown,desc});
export const DUEL_BATCH14=Object.freeze({
 ebbring:Object.freeze({id:'ebbring',comboId:'ebbring',inspectionOnly:true,artReady:false,law:'orbit',name:'밀물 고리',role:'지나간 자리의 고리 · 늦게 따라오는 밀물',hp:175,speed:4.3,reach:1.75,arc:1.3,comboReach:[1.55,1.9,2.15],comboArc:[1.4,.65,1.2],comboNames:['물결잎 펼치기','고리자루 밀기','밀물 쓸기'],damage:[9,10,14],cadence:.38,heavy:{damage:23,reach:2.3},parry:1,tile:1,ink:'#b8dbd1',skills:[skill('지나간 고리 남기기',6.4,'옛 중심을 늦게 따라오는 실제 고리. 정지하면 작아지며 두 접촉까지만 · 고리 선을 넘는 일반 탄 한 발 삭제, 보스 탄은 통과'),skill('밀물 거두기',5.2,'옛 고리를 실제로 몸까지 거둬요. 왕복 대신 한 귀환 접촉 · 실제 고리 적중으로 얻은 밀물 한 칸 소비')],ult:skill('넓은 늦물 고리',0,'더 넓은 옛 중심 고리 하나 · 세 접촉·일반 탄 두 발만. 몸 가까운 빈자리와 보스 탄에는 보호가 없어요'),blurb:'실제 3타·강공격은 다음 고리의 첫 접촉만 둘 강화해요. 현재 몸과 지난 고리의 중심이 다르니 그 사이와 고리 안쪽으로 들어오세요.'}),
 accretiondisk:Object.freeze({id:'accretiondisk',comboId:'accretiondisk',inspectionOnly:true,artReady:false,law:'gravity',name:'강착 원반',role:'한 공전 접점 · 실제 포획을 모아 내던지기',hp:177,speed:4.05,reach:1.8,arc:1.2,comboReach:[1.6,1.9,2.05],comboArc:[1,.55,1.45],comboNames:['부스러기 긁기','원반자루 밀기','돌조각 거두기'],damage:[9,10,14],cadence:.4,heavy:{damage:24,reach:2.3},parry:1,tile:7,ink:'#cbb4df',skills:[skill('작은 강착 원반',6.7,'공전하는 한 접점 가까운 일반 탄만 약하게 휘어 두 발까지 포획. 보스 탄·몸·근접은 통과'),skill('모은 부스러기 던지기',5.4,'실제 탄 포획이나 실제 3타 부스러기를 얻은 원반을 소비해야 물리 파편 두 발을 던져요. 빈 원반에서는 아무 탄도 생기지 않아요')],ult:skill('세 조각의 강착',0,'한 접점이 세 발까지만 모으는 원반 · 시간과 틈은 그대로. 자동 폭발·자동 발사는 없어요'),blurb:'3타·강공격의 막히지 않은 적중은 다음 원반에 실제 돌조각 한 개를 보태요. 보스 탄으로 돌조각을 얻지 않으며 원반 반대편과 몸 가까이는 안전하게 접근할 수 있어요.'}),
 gravitystake:Object.freeze({id:'gravitystake',comboId:'gravitystake',inspectionOnly:true,artReady:false,law:'pierce',name:'중력 말뚝',role:'실제 좁은 창 접촉 · 몸에 달린 늦은 내파',hp:173,speed:4.1,reach:2.15,arc:.6,comboReach:[1.95,2.4,2.2],comboArc:[.45,.3,.8],comboNames:['말뚝끝 재기','깊은 못 찌르기','못자루 꺾기'],damage:[9,11,14],cadence:.4,heavy:{damage:24,reach:2.6},parry:1,tile:4,ink:'#c9b8de',skills:[skill('한 몸에 박는 말뚝',6.7,'좁은 실제 창이 막히지 않게 적중해야 몸에 .58초 내파 예고. 시전자가 맞거나 공격·막기·회피하면 집중이 끊겨요 · 표적은 막기/정확한 회피 가능'),skill('말뚝 뽑아 내려찍기',5.1,'내파를 포기하고 실제 박힌 말뚝을 뽑아 짧게 찍어요. 실제 삽입을 얻지 못했으면 약한 찍기만 · 뽑은 내파가 나중에 터지지 않아요')],ult:skill('한 점의 무거운 못',0,'한 물리창과 더 긴 .65초 몸 표식 · 마지막 예고에도 막기·회피 가능하며 보스 동작과 이동은 빼앗지 않아요'),blurb:'1:1에서는 혼자 표적 조건이 항상 충족돼요. 본편의 큰 군중 수치를 복제하지 않고 창4+내파18로 제한했어요. 보행은 유지되지만 다른 행동이나 피격이 집중을 끊어요.'})
});
export const DUEL_BATCH14_KINDS=Object.freeze(['ebbRing','ebbRecall','diskOrbit','diskThrow','stakeSend','stakeMark','stakeSweep']);
export const DUEL_BATCH14_SHOTS=Object.freeze(['ebbReturn','diskDebris','stakeShaft']);
export const DUEL_BATCH14_AUDIO=Object.freeze({ebbOpen:['shotOrbit',{pitch:.85}],ebbContact:['shotOrbit',{pitch:1.1}],ebbRecall:['shotReturn',{pitch:.9}],diskOpen:['shotGravity',{pitch:.85}],diskCatch:['reflect',{pitch:.7}],diskThrow:['shotPierce',{pitch:.8}],stakeTell:['shotPierce',{pitch:.75}],stakeAttach:['shotGravity',{pitch:1.1}],stakeBreak:['shotGravity',{pitch:.6}],stakeExtract:['shotPierce',{pitch:1.1}]});
export const DUEL_BATCH14_STORY=Object.freeze([
 ['ebbring','내 뒤에서 오는 밀물','내 고리는 조금 늦어. 내가 지나온 자리에서 출발하거든. 나를 쫓다 보면 고리를 만날 수도 있지만 안쪽은 비워 둘게!','실제 고리 중심은 현재 씨앗보다 늦게 따라와요. 고리 안과 현재 몸 사이가 비어 있고 정지하면 반경이 작아져요. 거두는 실제 고리도 옆으로 피할 수 있어요.','나를 기다려 주는 옛 자리가 있다는 건 좋은 일이구나. 그 자리에 떨어진 돌조각을 원반 친구에게 보여 줄게.'],
 ['accretiondisk','주워야 던질 수 있는 돌','아무것도 없는 곳에서 돌이 생기지는 않아. 네 탄이나 내가 실제로 깨뜨린 조각을 주워야 해. 큰 보스의 탄까지 욕심내지는 않을게!','공전 접점 가까운 일반 탄만 유한하게 포획해요. 먼저 몸 가까이 들어가거나 다른 각도로 쏘세요. 빈 원반은 던질 수 없고 던진 두 파편도 물리 경로와 기둥을 따라가요.','모은 것을 던지니 원반이 비었어. 힘을 계속 쌓기보다 언제 비울지 배우는 게 중요하겠네.'],
 ['gravitystake','끝까지 바라봐야 하는 한 점','작은 못 하나에 마음을 모아 볼게. 그렇지만 내가 다른 행동을 하거나 너에게 맞으면 끝까지 바라볼 수 없겠지? 마지막 순간에도 피할 길은 있어!','좁은 실제 창을 막거나 피하면 내파 표식이 없어요. 표식이 붙은 뒤에는 시전자를 때려 끊거나 마지막 타이밍에 막기·회피하세요. 시전자도 다른 행동으로 내파를 포기할 수 있어요.','한 점을 바라보는 동안 너는 여러 길을 찾았구나. 꽉 잡아야만 이기는 건 아니라는 걸 배웠어.']
].map(([enemy,title,before,tip,after],i,a)=>Object.freeze({id:'inspect-'+enemy,enemy,inspectionOnly:true,unlockAfter:i?'inspect-'+a[i-1][0]:null,title,difficulty:'hard',before,tip,after})));
const norm=(x,y)=>{const d=Math.hypot(x,y)||1;return{x:x/d,y:y/d};},dist=(a,b)=>Math.hypot(a.x-b.x,a.y-b.y);
const segment=(a,b,p)=>{const x=b.x-a.x,y=b.y-a.y,k=Math.max(0,Math.min(1,((p.x-a.x)*x+(p.y-a.y)*y)/(x*x+y*y||1)));return Math.hypot(p.x-a.x-x*k,p.y-a.y-y*k);};
const guarded=(f,o,guardDir=null)=>{const v=guardDir||norm(f.x-o.x,f.y-o.y);return o.blocking&&v.x*o.fx+v.y*o.fy>-.2;};
const windup=(f,t)=>Object.assign(f,{state:'skill',total:t,t,blocking:false,inv:0});
const own=(s,f,kind)=>s.hazards.find(h=>h.owner===f.team&&h.kind===kind&&h.t>0&&!h.cancelled);
export const ebbRingCenter=h=>({x:h.x,y:h.y});
export const accDiskPoint=(h,f)=>({x:f.x+Math.cos(h.angle)*h.r,y:f.y+Math.sin(h.angle)*h.r});
function retire(s,f,kinds){for(const h of s.hazards)if(h.owner===f.team&&kinds.includes(h.kind)){h.t=0;h.cancelled=true;}for(const q of s.shots)if(q.owner===f.team&&kinds.includes(q.kind))q.life=0;}
export function batch14Melee(s,f,{step,heavy,hit,guarded:block}){if(!hit||block||!heavy&&step!==2)return;const key={ebbring:'ebbEdge',accretiondisk:'diskChip',gravitystake:'stakeResolve'}[f.char];if(key){f[key]=1;f[key+'Time']=4;}}
export function batch14Action(s,f,index,ctx,ult=false){const cast=f.fusion14Cast=(f.fusion14Cast||0)+1;
 if(f.char==='ebbring'){
  const old=own(s,f,'ebbRing');if(index===1&&!ult){const held=f.ebbTide||0;f.ebbTide=f.ebbTideTime=0;windup(f,.76);if(old){const p=ebbRingCenter(old);retire(s,f,['ebbRing']);ctx.area(s,f,'ebbRecall',{...p,r:.8,endX:f.x,endY:f.y,dx:0,dy:0,arm:.36,t:.47,cast,damage:7+held*3});ctx.event(s,'ebbRecall');}return;}
  retire(s,f,['ebbRing','ebbRecall']);const edge=f.ebbEdge||0;f.ebbEdge=f.ebbEdgeTime=0;windup(f,.68);ctx.area(s,f,'ebbRing',{x:f.x,y:f.y,r:.75,wide:ult?1.7:1.35,calm:.75,history:[{x:f.x,y:f.y}],clock:0,arm:.34,t:ult?3.3:2.8,cast,hits:0,max:ult?3:2,ordinary:ult?2:1,damage:ult?8:7,edge,contactCd:0});ctx.event(s,'ebbOpen');
 }else if(f.char==='accretiondisk'){
  const old=own(s,f,'diskOrbit');if(index===1&&!ult){windup(f,.76);if(old?.stored>0){const p=accDiskPoint(old,f),stored=old.stored;retire(s,f,['diskOrbit']);ctx.area(s,f,'diskThrow',{x:f.x,y:f.y,fromX:p.x,fromY:p.y,dx:f.fx,dy:f.fy,endX:f.x+f.fx*7,endY:f.y+f.fy*7,r:.2,arm:.4,t:.5,cast,damage:5+stored*2,budget:{hits:0,max:2}});ctx.event(s,'diskThrow');}return;}
  retire(s,f,['diskOrbit','diskThrow']);const chip=f.diskChip||0;f.diskChip=f.diskChipTime=0;windup(f,.7);ctx.area(s,f,'diskOrbit',{x:f.x,y:f.y,r:1.6,angle:Math.atan2(f.fy,f.fx),arm:.35,t:ult?3.6:3,cast,stored:chip,capacity:ult?3:2,caught:0,catchBudget:ult?3:2,rammed:false});ctx.event(s,'diskOpen');
 }else if(f.char==='gravitystake'){
  const old=own(s,f,'stakeMark');if(index===1&&!ult){const earned=old&&!old.triggered?1:0;retire(s,f,['stakeMark','stakeSend','stakeShaft']);windup(f,.77);ctx.area(s,f,'stakeSweep',{x:f.x,y:f.y,endX:f.x+f.fx*2.25,endY:f.y+f.fy*2.25,dx:f.fx,dy:f.fy,r:.27,arm:.4,t:.5,cast,damage:9+earned*7});ctx.event(s,'stakeExtract');return;}
  retire(s,f,['stakeMark','stakeSend','stakeShaft']);const resolve=f.stakeResolve||0;f.stakeResolve=f.stakeResolveTime=0;const arm=ult?.55:.46;windup(f,arm+.36);ctx.area(s,f,'stakeSend',{x:f.x,y:f.y,dx:f.fx,dy:f.fy,endX:f.x+f.fx*8,endY:f.y+f.fy*8,r:.16,arm,t:arm+.09,cast,damage:ult?6:4,implosion:(ult?24:18)+resolve*2,delay:ult?.65:.58});ctx.event(s,'stakeTell');
 }
}
function circleContact(a,b,c,r){const dx=b.x-a.x,dy=b.y-a.y,x=a.x-c.x,y=a.y-c.y,A=dx*dx+dy*dy;if(A<1e-12)return Math.abs(dist(a,c)-r)<.04?a:null;const B=2*(x*dx+y*dy),C=x*x+y*y-r*r,D=B*B-4*A*C;if(D<0)return null;for(const t of [(-B-Math.sqrt(D))/(2*A),(-B+Math.sqrt(D))/(2*A)])if(t>=0&&t<=1)return{x:a.x+dx*t,y:a.y+dy*t};return null;}
export function batch14InterceptShot(s,q,x0,y0,dt,ctx){if(q.life<=0||q.guardReturned||q.hallReturned||q.wardSpent||q.sunSpent)return false;const f=s.fighters[1-q.owner],boss=q.boss===true||s.boss&&q.owner===1,a={x:x0,y:y0};
 if(f.char==='ebbring'){const h=own(s,f,'ebbRing');if(!h||h.arm>0||h.ordinary<=0||boss)return false;const p=circleContact(a,q,h,h.r);if(!p||ctx.wall(p)||ctx.blocked(a,p))return false;h.ordinary--;q.life=0;q.spent=q.bloomSpent=q.returnSpent=q.collapseSpent=q.crunchSpent=q.wardSpent=true;ctx.fx(s,'parry',p.x,p.y,{life:.16,max:.16});ctx.event(s,'ebbContact');return true;}
 if(f.char==='accretiondisk'){const h=own(s,f,'diskOrbit');if(!h||h.arm>0||h.caught>=h.catchBudget||h.stored>=h.capacity||boss)return false;const p=accDiskPoint(h,f);if(ctx.wall(p)||ctx.blocked(f,p)||ctx.blocked(a,p))return false;
  if(segment(a,q,p)<.42){h.caught++;h.stored++;q.life=0;q.spent=q.bloomSpent=q.returnSpent=q.collapseSpent=q.crunchSpent=q.wardSpent=true;ctx.fx(s,'parry',p.x,p.y,{life:.17,max:.17});ctx.event(s,'diskCatch');return true;}
  if(dist(q,p)<.85){const v=norm(p.x-q.x,p.y-q.y),amount=Math.min(.15,dist(a,q)/(q.speed||11)*4),next=norm(q.dx+v.x*amount,q.dy+v.y*amount);q.dx=next.x;q.dy=next.y;}return false;
 }return false;
}
export function batch14Tick(s,dt,ctx){
 for(const f of s.fighters)for(const key of ['ebbEdge','ebbTide','diskChip','stakeResolve']){f[key+'Time']=Math.max(0,(f[key+'Time']||0)-dt);if(!f[key+'Time'])f[key]=0;}
 for(const h of [...s.hazards]){if(!DUEL_BATCH14_KINDS.includes(h.kind)||h.t<=0)continue;const before=h.arm;h.t-=dt;h.arm=Math.max(0,h.arm-dt);const f=s.fighters[h.owner],o=s.fighters[1-h.owner];
  if(h.kind==='stakeMark'){
   h.x=o.x;h.y=o.y;if(f.fusion14Cast!==h.cast||f.stun>0||f.blocking||['attack','heavy','dash','dodge','hit'].includes(f.state)){h.t=0;h.cancelled=true;continue;}if(h.arm>0||h.triggered)continue;h.triggered=true;if(o.inv<=0){ctx.strike(s,f,o,h.damage,{kind:'shot',stun:s.boss&&o.team===1?0:.18,knock:0,flinch:!(s.boss&&o.team===1),guardDir:h.guardDir});ctx.event(s,'stakeBreak');ctx.fx(s,'pull',o.x,o.y,{life:.18,max:.18});}continue;
  }
  if(before>0&&(f.stun>0||f.state!=='skill'||f.fusion14Cast!==h.cast)){h.t=0;h.cancelled=true;continue;}if(h.arm>0)continue;
  if(h.kind==='ebbRing'){h.clock+=dt;if(h.clock>=.12){h.clock-=.12;h.history.push({x:f.x,y:f.y});if(h.history.length>5)h.history.shift();}const target=h.history[0],d=dist(h,target),v=norm(target.x-h.x,target.y-h.y),move=Math.min(d,3.4*dt);h.x+=v.x*move;h.y+=v.y*move;h.r=dist(h,f)>.28?h.wide:h.calm;h.contactCd=Math.max(0,h.contactCd-dt);if(h.hits<h.max&&h.contactCd<=0&&o.inv<=0&&Math.abs(dist(h,o)-h.r)<.38&&!ctx.blocked(h,o)){h.hits++;h.contactCd=.45;const guardDir=norm(h.x-o.x,h.y-o.y),block=guarded(f,o,guardDir),hit=ctx.strike(s,f,o,h.damage+(h.hits===1?h.edge*2:0),{kind:'shot',stun:.07,knock:0,guardDir});if(hit&&!block){f.ebbTide=1;f.ebbTideTime=4;}ctx.event(s,'ebbContact');}continue;}
  if(h.kind==='diskOrbit'){h.angle+=Math.max(0,dt-before)*1.6;h.x=f.x;h.y=f.y;const p=accDiskPoint(h,f);if(!h.rammed&&o.inv<=0&&dist(p,o)<.45&&!ctx.wall(p)&&!ctx.blocked(f,p)&&!ctx.blocked(p,o)){h.rammed=true;ctx.strike(s,f,o,4,{kind:'shot',stun:.06,knock:0});}continue;}
  if(h.triggered)continue;h.triggered=true;
  if(h.kind==='ebbRecall'){const v=norm(f.x-h.x,f.y-h.y);ctx.shoot(s,f,{kind:'ebbReturn',x:h.x,y:h.y,dx:v.x,dy:v.y,speed:5.5,life:1.3,r:.8,damage:h.damage,originalOwner:f.team,contacts:0});}
  else if(h.kind==='diskThrow')for(const off of [-.09,.09]){const a=Math.atan2(h.dy,h.dx)+off;ctx.shoot(s,f,{kind:'diskDebris',x:h.x,y:h.y,dx:Math.cos(a),dy:Math.sin(a),speed:11,life:.65,damage:h.damage,budget:h.budget,originalOwner:f.team});}
  else if(h.kind==='stakeSend')ctx.shoot(s,f,{kind:'stakeShaft',x:h.x,y:h.y,dx:h.dx,dy:h.dy,speed:13,life:.64,damage:h.damage,implosion:h.implosion,delay:h.delay,cast:h.cast,originalOwner:f.team});
  else if(h.kind==='stakeSweep'&&o.inv<=0&&!ctx.blocked(h,o)&&segment(h,{x:h.endX,y:h.endY},o)<h.r+.35)ctx.strike(s,f,o,h.damage,{kind:'skill',stun:.16,knock:.25});
 }
 for(const q of [...s.shots]){if(!DUEL_BATCH14_SHOTS.includes(q.kind)||q.life<=0||q.guardTurnAt===s.time||q.hallTurnAt===s.time)continue;const f=s.fighters[q.owner],o=s.fighters[1-q.owner],a={x:q.x,y:q.y};q.life-=dt;if(q.kind==='ebbReturn'){const v=norm(f.x-q.x,f.y-q.y);q.dx=v.x;q.dy=v.y;if(dist(q,f)<.3){q.life=0;continue;}}q.x+=q.dx*q.speed*Math.min(dt,Math.max(0,q.life+dt));q.y+=q.dy*q.speed*Math.min(dt,Math.max(0,q.life+dt));if(ctx.interceptShot?.(s,q,a.x,a.y,0))continue;if(ctx.surfaceHit?.(a,q)||ctx.wall(q)||(!ctx.surfaceHit&&ctx.blocked(a,q))){q.life=0;continue;}
  const contact=q.kind==='ebbReturn'?Math.abs(dist(q,o)-q.r)<.35:segment(a,q,o)<.4;if(o.inv>0||q.hit.has(o.team)||!contact||ctx.blocked(a,o))continue;
  if(o.shield>0){q.reflections=(q.reflections||0)+1;if(q.reflections>1||q.kind==='ebbReturn'){q.life=0;ctx.event(s,'reflect');continue;}q.owner=o.team;q.dx*=-1;q.dy*=-1;q.hit.clear();ctx.event(s,'reflect');continue;}
  q.hit.add(o.team);if(q.budget&&q.budget.hits>=q.budget.max){q.life=0;continue;}if(q.budget)q.budget.hits++;const guardDir={x:-q.dx,y:-q.dy},block=guarded(f,o,guardDir),boss=s.boss&&o.team===1,hit=ctx.strike(s,f,o,q.damage,{kind:'shot',stun:.08,knock:0,flinch:!boss,guardDir});
  if(q.kind==='stakeShaft'&&hit&&!block&&f.char==='gravitystake'&&q.originalOwner===f.team&&q.cast===f.fusion14Cast){ctx.area(s,f,'stakeMark',{x:o.x,y:o.y,r:.42,arm:q.delay,t:q.delay+.13,damage:q.implosion,cast:q.cast,guardDir});ctx.event(s,'stakeAttach');}
  if(q.kind==='ebbReturn')q.contacts++;q.life=0;
 }
}
export function batch14Ai(s,f,o,input,dt){const ai=s.ai[f.team],d=dist(f,o),v=norm(o.x-f.x,o.y-f.y),react={easy:.32,normal:.2,hard:.12}[s.difficulty]??.2;ai.fusion14Seen=(ai.fusion14Seen||0)+dt;if(ai.fusion14Seen<react)return false;input.aimX=v.x;input.aimY=v.y;
 if(f.char==='ebbring'){const h=own(s,f,'ebbRing');
  // Read the CURRENT delayed center and the visible rim. Body distance alone
  // is not its range, and an unconditionally circling AI can miss forever.
  if(h&&f.ebbTide&&f.cd[1]<=0&&dist(h,f)>.65&&segment(h,f,o)<1.15&&Math.max(dist(h,o),d)>.45){input.skill2=true;return true;}
  if(!h&&d>2&&d<4.5&&(f.cd[0]<=0||f.meter>=100)){input[f.meter>=100?'ult':'skill1']=true;return true;}
  if(h&&h.arm<=0&&h.hits<h.max){const gap=dist(h,o)-h.r;if(gap>.24){input.x=v.x;input.y=v.y;}else if(gap<-.24){input.x=-v.x;input.y=-v.y;}else{input.x=-v.y;input.y=v.x;}return true;}
 }
 else if(f.char==='accretiondisk'){const h=own(s,f,'diskOrbit'),incoming=s.shots.some(q=>q.owner!==f.team&&q.life>0&&!q.boss&&!q.guardReturned&&segment(q,{x:q.x+q.dx*q.speed*q.life,y:q.y+q.dy*q.speed*q.life},f)<2);ai.diskSeen=incoming?(ai.diskSeen||0)+dt:0;if(h?.stored>0&&f.cd[1]<=0&&d>2.2&&d<7){input.skill2=true;return true;}if(!h&&(ai.diskSeen>=react||f.diskChip)&&f.cd[0]<=0){input[f.meter>=100?'ult':'skill1']=true;return true;}}
 else if(f.char==='gravitystake'){const h=own(s,f,'stakeMark');if(h){if(d<2.4&&f.cd[1]<=0&&o.state==='heavy'){input.skill2=true;return true;}return false;}if(d>3.3&&d<7&&o.state!=='attack'&&(f.cd[0]<=0||f.meter>=100)){input[f.meter>=100?'ult':'skill1']=true;return true;}if(d<2.2&&f.cd[1]<=0&&o.state==='hit'){input.skill2=true;return true;}}
 return false;
}
export function batch14DangerAi(s,f,input,dt){const ai=s.ai[f.team],react={easy:.32,normal:.2,hard:.12}[s.difficulty]??.2,h=s.hazards.find(h=>h.owner!==f.team&&h.t>0&&!h.triggered&&(h.kind==='stakeMark'||['stakeSend','stakeSweep','diskThrow','ebbRecall'].includes(h.kind)&&segment(h,{x:h.endX,y:h.endY},f)<h.r+.4));if(!h){ai.fusion14Danger=0;return false;}ai.fusion14Danger=(ai.fusion14Danger||0)+dt;if(ai.fusion14Danger<react)return false;if(h.kind==='stakeMark'){const o=s.fighters[h.owner],v=norm(o.x-f.x,o.y-f.y);input.aimX=v.x;input.aimY=v.y;if(h.arm<.17&&f.dodgeCd<=0){input.x=-v.y;input.y=v.x;input.dodge=true;}else input.block=true;return true;}const v=h.dx||h.dy?{x:-h.dy,y:h.dx}:norm(f.x-h.x||1,f.y-h.y);input.x=v.x;input.y=v.y;if(h.arm<.16&&f.dodgeCd<=0)input.dodge=true;return true;}
