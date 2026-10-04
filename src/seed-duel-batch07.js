// Canonical SOLO forms: fullbloom is impact -> five petals -> three fans,
// rewind repeats the original outward direction and returns to the current owner.
// The duel adapter keeps a safe impact centre and explicit turn warnings.
const skill=(name,cooldown,desc)=>Object.freeze({name,cooldown,desc});
export const DUEL_BATCH07=Object.freeze({
 fullbloom:Object.freeze({id:'fullbloom',comboId:'fullbloom',solo:true,law:'split',name:'만개한 꽃 씨앗',role:'꽃부채 · 적중에서 자라는 두 갈래 세대',hp:172,speed:4.2,reach:1.8,arc:1.35,comboReach:[1.65,1.8,2.1],comboArc:[1.35,1.65,.9],damage:[9,10,13],cadence:.38,heavy:{damage:23,reach:2.25},parry:1,tile:3,ink:'#f4a6c4',skills:[skill('만개 씨앗',5.9,'맞힌 자리에서 다섯 꽃잎 · 다시 맞히면 세 갈래, 두 세대까지만. 처음 맞은 중심에는 꽃잎의 빈틈'),skill('미리 심은 꽃받침',5.4,'앞에 꽃받침을 하나 심어요. 내 만개 씨앗이 지나가면 상대를 맞히기 전에 꽃잎이 펼쳐져요')],ult:skill('세 송이의 만개',0,'세 방향을 먼저 예고하고 쏘아요 · 뿌리 두 번과 꽃잎 네 번까지만'),blurb:'막히지 않은 3타나 강공격은 다음 꽃씨의 피해를 2 올려요. 맞은 중심에 머물면 추가 꽃잎을 피할 수 있고, 꽃받침은 꽃이 피는 위치를 바꿔요.'}),
 rewind:Object.freeze({id:'rewind',comboId:'rewind',solo:true,law:'recall',name:'되감기 잎 씨앗',role:'잎부메랑 · 내 걸음으로 바꾸는 두 왕복',hp:174,speed:4.35,reach:1.9,arc:1.1,comboReach:[1.65,1.9,2.2],comboArc:[.8,1.2,.7],damage:[9,10,13],cadence:.37,heavy:{damage:23,reach:2.5},parry:1,tile:7,ink:'#d4bc69',skills:[skill('두 번 돌아오는 잎',5.8,'처음 방향으로 나가고 지금 내 위치로 돌아와요 · 나갈 때 벽에 돌아서고, 돌아올 때는 벽을 넘어 회수해요. 잡은 뒤 같은 방향으로 한 번 더 · 총 세 번 적중까지'),skill('잎의 쉼표',5.3,'날아가는 내 잎을 잠깐 멈춰 왕복 박자를 바꿔요. 잎이 없으면 짧은 부메랑 베기 · 회수 박자가 있으면 강화')],ult:skill('겹쳐 접는 두 왕복',0,'세 잎이 각자의 출발 방향으로 두 번 왕복 · 돌아오는 선도 예고하며 총 네 번 적중까지'),blurb:'회수에 성공하면 쉼표 베기의 피해가 4 늘어요. 나가는 방향은 고정, 돌아오는 목적지는 내 현재 위치예요. 귀환칼날의 조기 회수·무기 빈틈과 달리 여러 왕복의 시간과 내 동선을 조작해요.'})
});
export const DUEL_BATCH07_STORY=Object.freeze([
 ['fullbloom','꽃이 피는 자리의 빈틈','어려움','hard','꽃은 혼자에게 다가갈 때보다 함께 있을 때 더 크게 피어. 네가 서 있는 꽃의 한가운데는 비워 둘게. 하지만 꽃받침을 먼저 심으면 어디서 피어날까?','꽃씨의 고정된 첫 선을 피하세요. 맞은 뒤 생긴 꽃의 중심에는 추가 꽃잎이 닿지 않아요. 미리 심은 꽃받침을 통과하면 다른 자리에서 다섯 갈래가 펼쳐져요.','다 피우는 것보다 한 자리를 비워 두는 게 더 어려웠어. 네가 머무를 수 있는 꽃도 만들어 볼게.'],
 ['rewind','돌아오는 길에 남은 쉼표','어려움','hard','내 잎은 두 번 돌아와. 내가 걸으면 돌아오는 길도 달라지고, 한 박자 멈추면 네 발이 먼저 움직이지. 잎이 향하는 나를 봐 줘!','출발한 방향은 바뀌지 않고 돌아오는 잎은 씨앗을 따라와요. 전환과 재출발의 짧은 선 예고를 보고 길 옆으로 빠지세요. 쉼표로 멈춘 잎도 아직 살아 있어요.','잎이 돌아오기만 기다렸는데 너는 기다리는 동안 길을 만들었구나. 다음 왕복에는 그 길도 따라 걸어 볼게.']
]);
export const DUEL_BATCH07_KINDS=Object.freeze(['fullSend','fullFork','fullBed','rewindSend','rewindBrush']);
export const DUEL_BATCH07_SHOTS=Object.freeze(['fullCore','fullPetal','rewindLeaf']);
export const DUEL_BATCH07_AUDIO=Object.freeze({fullSeed:['shot',{pitch:1.1}],fullOpen:['shot',{pitch:1.35}],fullPlant:['reflect',{pitch:.85}],rewindSend:['shot',{pitch:.9}],rewindTurn:['reflect',{pitch:1.1}],rewindCatch:['reflect',{pitch:1.3}],rewindPause:['shot',{pitch:.7}]});
const norm=(x,y)=>{const n=Math.hypot(x,y)||1;return{x:x/n,y:y/n};},dist=(a,b)=>Math.hypot(a.x-b.x,a.y-b.y);
const segment=(a,b,p)=>{const dx=b.x-a.x,dy=b.y-a.y,k=Math.max(0,Math.min(1,((p.x-a.x)*dx+(p.y-a.y)*dy)/(dx*dx+dy*dy||1)));return Math.hypot(p.x-a.x-dx*k,p.y-a.y-dy*k);};
const guarded=(f,o)=>{const v=norm(f.x-o.x,f.y-o.y);return o.blocking&&v.x*o.fx+v.y*o.fy>-.2;};
const windup=(f,t)=>{f.state='skill';f.total=f.t=t;f.blocking=false;f.inv=0;};
const leaf=(s,f)=>s.shots.find(q=>q.owner===f.team&&q.kind==='rewindLeaf'&&q.life>0);
function retire(s,f,kinds){for(const q of s.shots)if(q.owner===f.team&&kinds.includes(q.kind))q.life=0;for(const h of s.hazards)if(h.owner===f.team&&kinds.includes(h.kind))h.t=0;}
export function batch07Melee(s,f,{step,heavy,hit,guarded:blocked}){if(f.char==='fullbloom'&&(heavy||step===2)&&hit&&!blocked){f.fullReady=1;f.fullReadyTime=4;}}
export function batch07Action(s,f,index,ctx,ult=false){
 if(f.char==='fullbloom'){
  const cast=(f.fullCast=(f.fullCast||0)+1);
  if(!ult&&index===1){for(const h of s.hazards)if(h.owner===f.team&&h.kind==='fullBed')h.t=0;let p={x:f.x,y:f.y};for(let n=.2;n<=2.8+.001;n+=.2){const next={x:f.x+f.fx*n,y:f.y+f.fy*n};if(ctx.wall(next)||ctx.blocked(p,next))break;p=next;}windup(f,.62);ctx.area(s,f,'fullBed',{...p,r:.32,arm:.32,t:3.5,cast,ready:false});ctx.event(s,'fullPlant');return;}
  retire(s,f,['fullSend','fullFork','fullCore','fullPetal']);const damage=ult?10:17+(f.fullReady?2:0);f.fullReady=f.fullReadyTime=0;const budget={roots:0,maxRoots:ult?2:1,petals:0,maxPetals:ult?4:2,petalDamage:ult?3:4};windup(f,ult?1:.72);
  for(const [k,off] of (ult?[-.32,0,.32]:[0]).entries()){const a=Math.atan2(f.fy,f.fx)+off,arm=.42+k*.15;ctx.area(s,f,'fullSend',{x:f.x,y:f.y,dx:Math.cos(a),dy:Math.sin(a),endX:f.x+Math.cos(a)*6.65,endY:f.y+Math.sin(a)*6.65,r:.22,arm,t:arm+.06,cast,budget,damage});}ctx.event(s,'fullSeed');
 }else if(f.char==='rewind'){
  if(!ult&&index===1){const q=leaf(s,f);windup(f,.63);if(q){q.pause=Math.max(q.pause||0,.32);q.tell=true;ctx.event(s,'rewindPause');return;}const beat=f.rewindBeat||0;f.rewindBeat=f.rewindBeatTime=0;const cast=(f.rewindCast=(f.rewindCast||0)+1);ctx.area(s,f,'rewindBrush',{x:f.x,y:f.y,dx:f.fx,dy:f.fy,endX:f.x+f.fx*2.25,endY:f.y+f.fy*2.25,r:.42,arm:.32,t:.46,cast,damage:8+beat*4});ctx.event(s,'rewindPause');return;}
  retire(s,f,['rewindSend','rewindLeaf']);const cast=(f.rewindCast=(f.rewindCast||0)+1),budget={hits:0,max:ult?4:3};windup(f,ult?1:.65);
  for(const [k,off] of (ult?[-.3,0,.3]:[0]).entries()){const a=Math.atan2(f.fy,f.fx)+off,arm=.35+k*.15;ctx.area(s,f,'rewindSend',{x:f.x,y:f.y,dx:Math.cos(a),dy:Math.sin(a),endX:f.x+Math.cos(a)*5.6,endY:f.y+Math.sin(a)*5.6,r:.22,arm,t:arm+.06,cast,budget,damage:ult?9:10});}ctx.event(s,'rewindSend');
 }
}
function fork(s,f,q,x,y,gen,ctx){if(gen>2)return;const angle=Math.atan2(q.dy,q.dx),count=gen===1?5:3,rays=Array.from({length:count},(_,k)=>gen===1?angle+k*Math.PI*2/count:angle+(k-1)*.42);ctx.area(s,f,'fullFork',{x,y,r:.2,rays,gen,arm:.28,t:.34,cast:q.cast,budget:q.budget,skipTeam:1-f.team,skipR:gen===1?1.1:.65,seedX:x,seedY:y});ctx.event(s,'fullOpen');}
function turn(s,f,q,mode,ctx){q.mode=mode;q.pause=.24;q.tell=true;q.age=0;q.hit=new Set();ctx.event(s,'rewindTurn');if(mode==='out'){q.dx=q.outX;q.dy=q.outY;}}
export function batch07Tick(s,dt,ctx){
 for(const f of s.fighters){for(const [value,timer] of [['fullReady','fullReadyTime'],['rewindBeat','rewindBeatTime']]){f[timer]=Math.max(0,(f[timer]||0)-dt);if(!f[timer])f[value]=0;}}
 // Pending launch/brush/plant belongs to the cancellable action, even on the
 // very frame its arm timer crosses zero. Already released forks are independent.
 for(const h of [...s.hazards]){if(!DUEL_BATCH07_KINDS.includes(h.kind)||h.t<=0)continue;const old=h.arm;h.t-=dt;h.arm=Math.max(0,h.arm-dt);const f=s.fighters[h.owner],o=s.fighters[1-h.owner];
  if(old>0&&h.kind!=='fullFork'&&(f.stun>0||f.state!=='skill'||h.cast!==(f.char==='fullbloom'?f.fullCast:f.rewindCast))){h.t=0;continue;}if(h.arm>0)continue;
  if(h.kind==='fullBed'){h.ready=true;continue;}if(h.triggered)continue;h.triggered=true;
  if(h.kind==='fullSend')ctx.shoot(s,f,{kind:'fullCore',x:h.x+h.dx*.6,y:h.y+h.dy*.6,dx:h.dx,dy:h.dy,speed:11,life:.55,damage:h.damage,cast:h.cast,budget:h.budget});
  else if(h.kind==='fullFork')for(const a of h.rays)ctx.shoot(s,f,{kind:'fullPetal',x:h.x,y:h.y,dx:Math.cos(a),dy:Math.sin(a),speed:7,life:.5,damage:h.budget.petalDamage*(h.gen===2?.5:1),gen:h.gen,cast:h.cast,budget:h.budget,skipTeam:h.skipTeam,skipR:h.skipR,seedX:h.seedX,seedY:h.seedY});
  else if(h.kind==='rewindSend')ctx.shoot(s,f,{kind:'rewindLeaf',x:h.x+h.dx*.6,y:h.y+h.dy*.6,dx:h.dx,dy:h.dy,outX:h.dx,outY:h.dy,speed:10,life:5,damage:h.damage,mode:'out',age:0,trips:2,budget:h.budget,pause:0,cast:h.cast});
  else if(h.kind==='rewindBrush'&&o.inv<=0&&!ctx.blocked(h,o)&&segment(h,{x:h.endX,y:h.endY},o)<h.r+.35)ctx.strike(s,f,o,h.damage,{kind:'skill',stun:.15,knock:.5});
 }
 for(const q of [...s.shots]){if(!DUEL_BATCH07_SHOTS.includes(q.kind)||q.life<=0)continue;const life=q.life,moveDt=Math.min(dt,life);q.life-=dt;const f=s.fighters[q.owner],o=s.fighters[1-q.owner];if(q.kind==='rewindLeaf'&&q.pause>0){q.pause=Math.max(0,q.pause-moveDt);if(!q.pause)q.tell=false;continue;}
  const start={x:q.x,y:q.y};if(q.kind==='rewindLeaf'&&q.mode==='back'){const v=norm(f.x-q.x,f.y-q.y);q.dx=v.x;q.dy=v.y;q.speed=12;}
  q.x+=q.dx*q.speed*moveDt;q.y+=q.dy*q.speed*moveDt;
  if(ctx.interceptShot?.(s,q,start.x,start.y,0))continue;
  const wall=ctx.wall(q)||ctx.blocked(start,q);
  if(wall&&!(q.kind==='rewindLeaf'&&q.mode==='back')){if(q.kind==='rewindLeaf'){q.x=start.x;q.y=start.y;turn(s,f,q,'back',ctx);}else q.life=0;continue;}
  if(q.kind==='fullCore'){const bed=s.hazards.find(h=>h.owner===q.owner&&h.kind==='fullBed'&&h.ready&&h.t>0&&segment(start,q,h)<h.r+.12);if(bed){bed.t=0;q.life=0;fork(s,f,q,bed.x,bed.y,1,ctx);continue;}}
  const budget=q.budget,cap=q.kind==='fullCore'?budget.roots<budget.maxRoots:q.kind==='fullPetal'?budget.petals<budget.maxPetals:budget.hits<budget.max;
  const safe=q.kind==='fullPetal'&&q.skipTeam===o.team&&Math.hypot(o.x-q.seedX,o.y-q.seedY)<q.skipR;
  if(cap&&!safe&&!q.hit.has(o.team)&&o.inv<=0&&segment(start,q,o)<.5){q.hit.add(o.team);
   // Match the shared ordinary-projectile shield path: bounded reflection,
   // never the remote melee retaliation used by skill/close-combat strikes.
   if(o.shield>0){q.reflections=(q.reflections||0)+1;if(q.reflections>2){q.life=0;continue;}q.owner=o.team;q.dx*=-1;q.dy*=-1;q.hit.clear();
    if(q.kind==='rewindLeaf'){q.outX=q.dx;q.outY=q.dy;q.mode='out';q.age=0;q.speed=10;q.pause=.24;q.tell=true;}
    ctx.fx(s,'parry',q.x,q.y,{life:.2,max:.2});ctx.event(s,'reflect');continue;
   }
   const block=guarded(f,o);const hit=ctx.strike(s,f,o,q.damage,{kind:'shot',stun:.1,knock:.12,dir:{x:q.dx,y:q.dy}});
   if(q.kind==='rewindLeaf')budget.hits++;else if(q.kind==='fullCore')budget.roots++;else budget.petals++;
   if(q.kind!=='rewindLeaf'){q.life=0;if(hit&&!block)fork(s,f,q,o.x,o.y,q.kind==='fullCore'?1:q.gen+1,ctx);}
  }
  if(q.kind==='rewindLeaf'){
   if(q.mode==='out'){q.age+=moveDt;if(q.age>=.5)turn(s,f,q,'back',ctx);}
   else if(dist(q,f)<.5||segment(start,q,f)<.38){q.x=f.x;q.y=f.y;q.trips--;if(f.char==='rewind'){f.rewindBeat=1;f.rewindBeatTime=4;}ctx.event(s,'rewindCatch');if(q.trips>0){q.speed=10;turn(s,f,q,'out',ctx);}else q.life=0;}
  }
 }
}
export function batch07Ai(s,f,o,input,dt){const ai=s.ai[f.team],d=dist(f,o),safe=!['attack','heavy'].includes(o.state);
 const v=norm(o.x-f.x,o.y-f.y),react={easy:.32,normal:.2,hard:.12}[s.difficulty]??.2;
 // A missed strike is a visible recovery window. Close the real first-hit gap
 // with the player's ordinary dodge, instead of repeatedly jabbing beyond it.
 const spent=['attack','heavy'].includes(o.state)&&o.hitDone&&o.t>.03;
 ai.b07Recovery=spent?(ai.b07Recovery||0)+dt:0;
 if(ai.b07Recovery>=react*.65&&d>2.15&&d<3.6&&f.dodgeCd<=0&&!leaf(s,f)){
  input.x=v.x-v.y*.35;input.y=v.y+v.x*.35;input.dodge=true;return true;
 }
 if(f.char==='fullbloom'){
  const bed=s.hazards.find(h=>h.owner===f.team&&h.kind==='fullBed'&&h.t>0);
  // Plant BEFORE launching: planting on cooldown used to expire before the
  // next core could arrive. The AI observes the same fixed flowerbed as a player.
  if((safe&&o.blocking||spent)&&d>4&&d<5.5&&f.cd[1]<=0&&f.cd[0]<=0&&!bed){input.skill2=true;return true;}
  // Walk across a prepared bed's old approach lane to invite a chase. When a
  // foe is visibly outside its central gap, aim THROUGH the stationary bed.
  if(bed?.ready&&safe&&f.cd[0]<=0&&dist(bed,o)>1.15&&dist(bed,o)<3.2&&d>3.2){
   const aim=norm(bed.x-f.x,bed.y-f.y);input.aimX=aim.x;input.aimY=aim.y;input.skill1=true;return true;
  }
  if((safe||spent)&&d>2.8&&d<5.5&&f.cd[0]<=0){if(f.meter>=100)input.ult=true;else input.skill1=true;return true;}
  if(bed?.ready&&safe&&d>2.8&&d<4.5&&f.cd[0]>.3){input.x=-v.y*.65;input.y=v.x*.65;return true;}
 }else if(f.char==='rewind'){
  const q=leaf(s,f);if(safe&&!q&&d>2.8&&d<5.3){if(f.meter>=100)input.ult=true;else if(f.cd[0]<=0)input.skill1=true;else return false;return true;}
  ai.rewindBodySeen=q?.mode==='out'&&q.trips===1&&q.pause>0&&['attack','heavy'].includes(o.state)?(ai.rewindBodySeen||0)+dt:0;
  if(ai.rewindBodySeen>=react*.65&&d>1.2&&d<3.2&&f.dodgeCd<=0){input.x=-v.y;input.y=v.x;input.dodge=true;return true;}
  if(q&&q.mode==='back'&&!q.pause&&o.state==='dodge'&&o.inv>.07&&f.cd[1]<=0&&segment(q,{x:q.x+q.dx*1.8,y:q.y+q.dy*1.8},o)<.55){input.skill2=true;return true;}
  if(!q&&f.rewindBeat&&d<2.2&&f.cd[1]<=0&&spent){input.skill2=true;return true;}
  if(q&&q.mode==='back'&&safe&&d>2.6&&segment(q,f,o)>.4){
   const path=norm(o.x-q.x,o.y-q.y),target={x:o.x+path.x*2.3,y:o.y+path.y*2.3},move=norm(target.x-f.x,target.y-f.y);
   if(dist(f,target)>.5){input.x=move.x;input.y=move.y;return true;}
  }
  ai.rewindSeen=(ai.rewindSeen||0)+dt;
 }return false;
}
export function batch07DangerAi(s,f,input,dt){const ai=s.ai[f.team],react={easy:.32,normal:.2,hard:.12}[s.difficulty]??.2;
 const h=s.hazards.find(h=>h.owner!==f.team&&h.t>0&&h.arm>0&&(['fullSend','rewindSend','rewindBrush'].includes(h.kind)?segment(h,{x:h.endX,y:h.endY},f)<h.r+.35:h.kind==='fullFork'&&h.rays.some(a=>segment(h,{x:h.x+Math.cos(a)*3.5,y:h.y+Math.sin(a)*3.5},f)<.5)&&dist(h,f)>h.skipR));
 const q=s.shots.find(q=>q.owner!==f.team&&q.kind==='rewindLeaf'&&q.pause>0&&segment(q,q.mode==='back'?s.fighters[q.owner]:{x:q.x+q.outX*5,y:q.y+q.outY*5},f)<.5);
 if(!h&&!q){ai.b07Seen=0;return false;}ai.b07Seen=(ai.b07Seen||0)+dt;if(ai.b07Seen<react)return false;
 const end=q&&(q.mode==='back'?s.fighters[q.owner]:{x:q.x+q.outX*5,y:q.y+q.outY*5}),line=q&&norm(end.x-q.x,end.y-q.y);
 const v=h?{x:-(h.dy??Math.sin(h.rays?.[0]??0)),y:h.dx??Math.cos(h.rays?.[0]??0)}:{x:-line.y,y:line.x};input.x=v.x;input.y=v.y;if(f.dodgeCd<=0&&(h?.arm??q.pause)<.16)input.dodge=true;return true;
}
