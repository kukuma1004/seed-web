// Canonical gravity-stake completions: moving tractor shaft versus an earned,
// fixed suture corridor. Neither shape changes enemy attack/state or teleports.
const P='final-gravitystake-pierce',G='final-gravitystake-gravity';
const skill=(name,cooldown,desc)=>Object.freeze({name,cooldown,desc});
export const DUEL_BATCH36=Object.freeze({
 [P]:Object.freeze({id:P,comboId:P,final:true,inspectionOnly:true,artReady:false,law:'pierce',name:'견인창',role:'움직이는 좁은 창 옆 · 실제 창날 관통',hp:176,speed:4.15,reach:2.1,arc:.75,comboReach:[1.95,2.45,2.2],comboArc:[.6,.32,.95],comboNames:['견인자루 옆베기','긴 창 내밀기','창옆 당겨 긋기'],damage:[9,11,14],cadence:.41,heavy:{damage:24,reach:2.65},parry:1,tile:0,ink:'#b9dfd7',skills:[skill('앞으로 움직이는 견인창',7.2,'실제 긴 창 하나가 7.5거리까지 전진해요. 살아 있는 창 옆의 좁은 통로만 옆으로 조금 당깁니다. 일반 적 한 시전 총 .4거리·보스 .06거리 상한, 막기·회피·기둥으로 피하고 지나간 곳에는 장이 남지 않아요.'),skill('실제 창자루 당겨 빼기',5.8,'막히지 않은 실제 관통을 얻은 살아 있는 자기 창만 .28초 고정 준비. 같은 창을 원래 출발점까지 직선으로 당겨 빼며 유료 두 번째 실제 관통 한 번. 새 창·추적·무한 귀환은 없고 피격 준비 취소는 원래 창도 지웁니다.')],ult:skill('무거운 좁은 견인선',0,'더 강한 창 하나. 실제 출격·유료 당겨빼기 합쳐 두 타격, 2.2초 수명과 좁은 견인·보스 상한을 그대로 지킵니다.'),blurb:'3타·강공격의 실제 적중은 다음 첫 피해에 +2. 몸을 붙잡거나 공격 동작을 뺏지 않아요. 창이 지나간 통로를 벗어나면 당김도 끝나고, 당겨빼기의 옛 출발점은 현재 몸을 따라가지 않습니다.'}),
 [G]:Object.freeze({id:G,comboId:G,final:true,inspectionOnly:true,artReady:false,law:'gravity',name:'중력봉합',role:'실제 관통 뒤 · 두 끝점의 고정 흡인 통로',hp:179,speed:4.05,reach:1.95,arc:1,comboReach:[1.8,2.3,2.05],comboArc:[1,.38,1.3],comboNames:['봉합바늘 가로긋기','선끝 꿰기','중력실 접기'],damage:[10,10,14],cadence:.43,heavy:{damage:23,reach:2.5},parry:1,tile:1,ink:'#cebddd',skills:[skill('지나간 직선 봉합하기',7.4,'물리창이 실제 막히지 않은 관통을 얻고 .8거리 이상 지나가야 짧은 고정 통로가 남아요. 원래 출발점과 실제 기둥·벽·거리 끝으로만 이어집니다. 1.6초 동안 피해 없이 옆으로 당기고 일반 적 .4·보스 .06거리까지만.'),skill('남은 봉합실 거꾸로 꿰기',5.9,'실제로 얻은 자기 통로를 소비하고 .3초 고정 예고. 실제 끝점에서 원래 시작점으로 물리 바늘 한 번을 보내요. 전체 두 타격 예산을 공유하고 새 통로·자동 표적 추적을 만들지 않습니다.')],ult:skill('한 통로의 무거운 실',0,'강한 관통과 유료 역방향 바늘. 통로 하나·1.6초·전체 두 타격·보스 견인 상한은 그대로이며, 보스 이동과 공격은 계속됩니다.'),blurb:'3타·강공격의 실제 적중은 다음 첫 피해에 +2. 막히거나 빗나간 창은 통로를 얻지 못해요. 적과 몸이 움직여도 통로의 두 끝점은 움직이지 않습니다.'})
});
export const DUEL_BATCH36_KINDS=Object.freeze(['tractorSend36','sutureSend36','tractorRush36','sutureCorridor36','sutureFold36']);
export const DUEL_BATCH36_SHOTS=Object.freeze(['tractorSpear36','sutureSpear36','sutureReturn36']);
export const DUEL_BATCH36_AUDIO=Object.freeze({tractorSend36:['shotPierce',{pitch:.85}],tractorRush36:['shotPierce',{pitch:1.15}],sutureSend36:['shotGravity',{pitch:1.05}],sutureCorridor36:['shotGravity',{pitch:.7}],sutureFold36:['shotPierce',{pitch:.95}],pinImpact36:['hit',{pitch:.85}],pinPull36:['shotGravity',{pitch:.65}]});
export const DUEL_BATCH36_STORY=Object.freeze([
 {id:'inspect-'+P,enemy:P,inspectionOnly:true,unlockAfter:null,title:'창과 함께 움직이는 작은 길',difficulty:'hard',before:'내 창 옆으로 기운 실은 멀리까지 뻗지 않아. 창이 지나가면 길도 사라져. 네 몸을 붙잡는 대신 실제 창날 가까이 조금 모아 볼게.',tip:'당김은 살아 있는 창 옆의 좁은 구간에만 있어요. 옆으로 벗어나거나 창을 막으면 얻는 힘이 없습니다. 당겨빼기는 옛 출발점까지 고정된 선이고 .28초 준비를 때려 끊을 수 있어요.',after:'지나간 곳을 전부 내 길로 만들 필요는 없네. 다음 친구는 실제로 꿰뚫은 한 선만 잠깐 남겨 본대.'},
 {id:'inspect-'+G,enemy:G,inspectionOnly:true,unlockAfter:'inspect-'+P,title:'두 끝점 사이의 짧은 봉합',difficulty:'hard',before:'아직 걷지 않은 선을 봉합하지는 않을게. 정말 창이 지나가고 닿은 뒤에야 두 끝을 묶을 수 있어. 네가 다른 길로 가면 내 선은 그 자리에 남아 있겠지.',tip:'막히지 않은 실제 관통을 얻어야 고정 통로가 생깁니다. 두 끝점 밖으로 피하고, 실을 거꾸로 꿰는 .3초 고정 준비에서 옆으로 움직이세요. 실은 다른 위치에 새 통로를 만들지 않습니다.',after:'움직이는 창과 남겨진 실이 같은 길을 서로 다르게 다뤘네. 붙잡는 힘도 작은 약속 안에서만 써야겠어.'}
].map(Object.freeze));
const norm=(x,y)=>{const m=Math.hypot(x,y)||1;return{x:x/m,y:y/m};},dist=(a,b)=>Math.hypot(a.x-b.x,a.y-b.y);
function entry(a,b,p,r){const x=a.x-p.x,y=a.y-p.y,dx=b.x-a.x,dy=b.y-a.y,A=dx*dx+dy*dy,C=x*x+y*y-r*r;if(C<=0)return 0;if(A<1e-14)return null;const B=2*(x*dx+y*dy),D=B*B-4*A*C;if(D<0)return null;const t=(-B-Math.sqrt(D))/(2*A);return t>=0&&t<=1?t:null;}
export function batch36LinePoint(a,b,p){const dx=b.x-a.x,dy=b.y-a.y,k=Math.max(0,Math.min(1,((p.x-a.x)*dx+(p.y-a.y)*dy)/(dx*dx+dy*dy||1)));return{x:a.x+dx*k,y:a.y+dy*k,k};}
const owned=(q,f)=>q.owner===f.team&&q.originalOwner===f.team&&q.cast===f.final36Cast&&!q.foreign&&!q.guardReturned&&!q.hallReturned;
const shaft=(s,f)=>s.shots.find(q=>q.kind==='tractorSpear36'&&q.life>0&&q.mode==='out'&&!q.paid&&owned(q,f));
const corridor=(s,f)=>s.hazards.find(h=>h.kind==='sutureCorridor36'&&h.owner===f.team&&h.cast===f.final36Cast&&h.t>0&&!h.cancelled);
const guarded=(o,v)=>o.blocking&&(-v.x*o.fx-v.y*o.fy)>-.2;
export function batch36CanAction(s,f,index,ult=false){if(ult||index!==1)return true;const h=f.char===P?shaft(s,f):corridor(s,f);return !!h&&h.data.earned>0&&h.data.hits<2&&(f.char!==P||h.life>.28);}
export function batch36Melee(s,f,{step,heavy,hit,guarded:front}){if(hit&&!front&&(heavy||step===2)){f.pinEdge36=1;f.pinEdgeTime36=4;}}
export function batch36Action(s,f,index,ctx,ult=false){if(!batch36CanAction(s,f,index,ult))return false;Object.assign(f,{state:'skill',t:.78,total:.78,blocking:false,inv:0});
 if(index===1&&!ult){if(f.char===P){const q=shaft(s,f);q.mode='paused';q.paid=true;ctx.area(s,f,'tractorRush36',{x:q.x,y:q.y,endX:q.launch.x,endY:q.launch.y,dx:q.dx,dy:q.dy,r:.14,arm:.28,t:.41,cast:q.cast,castHp:f.hp,shot:q});ctx.event(s,'tractorRush36');}
  else{const h=corridor(s,f);h.t=0;ctx.area(s,f,'sutureFold36',{x:h.endX,y:h.endY,endX:h.x,endY:h.y,dx:-h.dx,dy:-h.dy,r:.14,arm:.3,t:.43,cast:h.cast,castHp:f.hp,data:h.data,damage:h.ult?10:8});ctx.event(s,'sutureFold36');}return true;}
 f.final36Cast=(f.final36Cast||0)+1;for(const q of s.shots)if(q.owner===f.team&&DUEL_BATCH36_SHOTS.includes(q.kind))q.life=0;for(const h of s.hazards)if(h.owner===f.team&&DUEL_BATCH36_KINDS.includes(h.kind)){h.t=0;h.cancelled=true;}
 const kind=f.char===P?'tractorSend36':'sutureSend36';ctx.area(s,f,kind,{x:f.x,y:f.y,endX:f.x+f.fx*5,endY:f.y+f.fy*5,dx:f.fx,dy:f.fy,r:.14,arm:.4,t:.53,cast:f.final36Cast,castHp:f.hp,edge:f.pinEdge36||0,ult});f.pinEdge36=f.pinEdgeTime36=0;ctx.event(s,kind);return true;
}
function pull(s,f,o,a,b,data,width,dt,ctx){if(o.inv>0||o.hp<=0||o.shield>0||guarded(o,norm(b.x-a.x,b.y-a.y)))return;const p=batch36LinePoint(a,b,o),distance=dist(p,o),boss=s.boss&&o.team===1,cap=boss?.06:.4,spent=data.pulled[o.team]||0;if(p.k<=0||p.k>=1||distance<.006||distance>width||spent>=cap||ctx.blocked(p,o))return;const amount=Math.min(distance,(boss?.18:1.4)*dt,cap-spent),v=norm(p.x-o.x,p.y-o.y),next={x:o.x+v.x*amount,y:o.y+v.y*amount},clamped={...next};ctx.clampArena?.(clamped);if(dist(next,clamped)>1e-7||ctx.wall(next)||ctx.blocked(o,next))return;o.x=next.x;o.y=next.y;data.pulled[o.team]=spent+amount;if(!data.pullSound){data.pullSound=true;ctx.event(s,'pinPull36');}}
function hit(s,q,f,o,ctx){const key=q.leg+':'+o.team;if(o.inv>0||q.data.hits>=2||q.data.receipts.has(key))return;q.data.receipts.add(key);q.data.hits++;const front=guarded(o,{x:q.dx,y:q.dy}),damage=q.damage+(q.foreign||q.data.edgeSpent?0:q.data.edge*2);q.data.edgeSpent=true;const ok=ctx.strike(s,f,o,damage,{kind:'shot',guardDir:{x:-q.dx,y:-q.dy},stun:0,knock:0,flinch:false});if(ok&&!front&&!q.foreign)q.data.earned++;ctx.event(s,'pinImpact36');}
function finish(s,q,f,ctx,native){if(q.finished)return;q.finished=true;q.life=0;const obstruction=ctx.surfaceHit(q.launch,q);if(native&&q.kind==='sutureSpear36'&&q.data.earned>0&&dist(q.launch,q)>=.8&&(!obstruction||obstruction.t>=1-1e-8)){ctx.area(s,f,'sutureCorridor36',{x:q.launch.x,y:q.launch.y,endX:q.x,endY:q.y,dx:q.dx,dy:q.dy,r:.72,arm:0,t:1.6,cast:q.cast,data:q.data,ult:q.ult});ctx.event(s,'sutureCorridor36');}}
export function batch36Tick(s,dt,ctx){
 for(const f of s.fighters)if(DUEL_BATCH36[f.char]){f.pinEdgeTime36=Math.max(0,(f.pinEdgeTime36||0)-dt);if(!f.pinEdgeTime36)f.pinEdge36=0;}
 for(const h of s.hazards){if(h.t<=0||!DUEL_BATCH36_KINDS.includes(h.kind))continue;const f=s.fighters[h.owner],o=s.fighters[1-h.owner];h.t-=dt;if(h.cast!==f.final36Cast||f.hp<=0){h.t=0;h.cancelled=true;if(h.shot)h.shot.life=0;continue;}
  if(h.kind==='sutureCorridor36'){if(h.t>0)pull(s,f,o,h,{x:h.endX,y:h.endY},h.data,h.r,Math.min(dt,h.t+dt),ctx);continue;}
  h.arm=Math.max(0,h.arm-dt);if(!h.triggered&&(f.stun>0||f.state!=='skill'||f.hp<h.castHp)){h.t=0;h.cancelled=true;if(h.shot)h.shot.life=0;continue;}if(h.arm>0||h.triggered)continue;h.triggered=true;
  if(h.kind==='tractorRush36'){const q=h.shot;if(!owned(q,f)||q.life<=0||q.mode!=='paused'){h.cancelled=true;continue;}q.mode='return';q.leg=1;q.legTravelled=0;q.speed=10.5;q.remaining=dist(q,q.launch);const v=norm(q.launch.x-q.x,q.launch.y-q.y);q.dx=v.x;q.dy=v.y;continue;}
  if(ctx.wall(h))continue;const p=h.kind==='tractorSend36',back=h.kind==='sutureFold36',data=h.data||{hits:0,receipts:new Set(),earned:0,pulled:{},edge:h.edge,edgeSpent:false};
  ctx.shoot(s,f,{kind:p?'tractorSpear36':back?'sutureReturn36':'sutureSpear36',x:h.x,y:h.y,dx:h.dx,dy:h.dy,speed:p?7.5:10.5,life:p?2.2:back?dist(h,{x:h.endX,y:h.endY})/10.5+.08:.8,damage:back?h.damage:h.ult?11:8,cast:h.cast,originalOwner:f.team,data,launch:{x:h.x,y:h.y},mode:'out',leg:back?1:0,remaining:p?7.5:back?dist(h,{x:h.endX,y:h.endY}):8.4,travelled:0,legTravelled:0,born:s.time,paid:false,ult:h.ult});
 }
 for(const q of s.shots){if(q.life<=0||!DUEL_BATCH36_SHOTS.includes(q.kind))continue;const f=s.fighters[q.owner],o=s.fighters[1-q.owner];if(f.hp<=0){q.life=0;q.finished=true;q.deadOwner=true;continue;}if(q.born===s.time||q.guardTurnAt===s.time||q.hallTurnAt===s.time)continue;const native=owned(q,f)&&!!DUEL_BATCH36[f.char];if(!native){q.foreign=true;q.mode='foreign';q.data.edgeSpent=true;}const elapsed=Math.min(dt,q.life);q.life-=dt;if(q.mode==='paused')continue;
  // Pull at the shaft's currently existing body, before advancing its head.
  // The reverse stroke grows a NEW physical tail from its paid turn point.
  const tailLength=native&&q.kind==='tractorSpear36'?Math.min(1.1,q.legTravelled||0):0,tail={x:q.x-q.dx*tailLength,y:q.y-q.dy*tailLength};
  if(native&&q.kind==='tractorSpear36')pull(s,f,o,tail,q,q.data,.72,elapsed,ctx);
  let remaining=Math.min(q.remaining,q.speed*elapsed),intercepted=false;
  for(let k=0;k<3&&remaining>1e-8;k++){
   const a={x:q.x,y:q.y},b={x:q.x+q.dx*remaining,y:q.y+q.dy*remaining},world=ctx.surfaceHit(a,b),worldAt=world?.t??1,worldEnd={x:a.x+(b.x-a.x)*worldAt,y:a.y+(b.y-a.y)*worldAt};
   const shaftLength=native&&q.kind==='tractorSpear36'?Math.min(1.1,q.legTravelled||0):0,contactStart={x:a.x-q.dx*shaftLength,y:a.y-q.dy*shaftLength};
   const body=o.hp>0&&o.inv<=0&&q.data.hits<2&&!q.data.receipts.has(q.leg+':'+o.team)&&!ctx.blocked(contactStart,o)?entry(contactStart,worldEnd,o,.46):null;
   let at=worldAt,kind=world?'world':'travel';
   if(body!==null){const point={x:contactStart.x+(worldEnd.x-contactStart.x)*body,y:contactStart.y+(worldEnd.y-contactStart.y)*body},bodyAt=Math.max(0,((point.x-a.x)*q.dx+(point.y-a.y)*q.dy)/(remaining||1));if(bodyAt<at){at=bodyAt;kind='body';}}
   Object.assign(q,{x:a.x+q.dx*remaining*at,y:a.y+q.dy*remaining*at});const travelled=remaining*at;q.travelled+=travelled;q.legTravelled=(q.legTravelled||0)+travelled;q.remaining-=travelled;remaining-=travelled;
   const caught=ctx.interceptShot?.(s,q,a.x,a.y,travelled/q.speed),changed=q.owner!==f.team||q.guardReturned||q.hallReturned;if(caught||changed){intercepted=true;if(changed){q.foreign=true;q.mode='foreign';q.data.edgeSpent=true;}break;}
   if(kind==='body'){if(o.shield>0){q.owner=o.team;q.dx*=-1;q.dy*=-1;q.foreign=true;q.mode='foreign';q.data.edgeSpent=true;q.life=Math.min(q.life,.6);intercepted=true;ctx.event(s,'reflect');break;}hit(s,q,f,o,ctx);continue;}
   if(kind==='world'){q.x=world.x+world.nx*.006;q.y=world.y+world.ny*.006;finish(s,q,f,ctx,native);break;}
   break;
  }
  if(!intercepted&&!q.finished&&(q.remaining<=1e-8||q.life<=0))finish(s,q,f,ctx,native);
 }
}
export function batch36Ai(s,f,o,input,dt,ctx){const ai=s.ai[f.team],react={easy:.32,normal:.2,hard:.12}[s.difficulty]??.2;if(ai.final36SeenAt!==s.time){ai.final36SeenAt=s.time;ai.final36Seen=(ai.final36Seen||0)+dt;}if(ai.final36Seen<react)return false;const d=dist(f,o),v=norm(o.x-f.x,o.y-f.y);input.aimX=v.x;input.aimY=v.y;if(batch36DangerAi(s,f,input,dt))return true;
 if(d<2.8&&['attack','heavy','dash'].includes(o.state)&&!o.hitDone||s.shots.some(q=>q.owner!==f.team&&q.life>0&&dist(q,f)<3.5))return false;
 if(f.state==='idle'&&o.blocking&&d<3.1&&s.time-o.blockSince<.55){const side=f.team?1:-1;input.x=-v.x*.45-v.y*side;input.y=-v.y*.45+v.x*side;return true;}
 if(f.state==='attack'&&f.hitDone&&f.step<2&&o.stun>0&&!o.blocking&&d<DUEL_BATCH36[f.char].comboReach[f.step+1]){input.attack=true;return true;}
 if(f.state==='idle'&&f.cd[1]<=0&&batch36CanAction(s,f,1)){const h=f.char===P?shaft(s,f):corridor(s,f),end=f.char===P?h.launch:{x:h.endX,y:h.endY};if(!ctx.blocked(h,o)&&dist(batch36LinePoint(h,end,o),o)<.6){input.skill2=true;return true;}}
 if(f.state==='idle'&&f.cd[0]<=0&&d>2.8&&d<7&&!shaft(s,f)&&!corridor(s,f)&&!s.shots.some(q=>q.owner===f.team&&DUEL_BATCH36_SHOTS.includes(q.kind)&&q.life>0)&&!ctx.blocked(f,o)){input[f.meter>=100?'ult':'skill1']=true;return true;}return false;
}
export function batch36DangerAi(s,f,input,dt){const ai=s.ai[f.team],h=s.hazards.find(h=>h.owner!==f.team&&h.t>0&&!h.cancelled&&DUEL_BATCH36_KINDS.includes(h.kind)&&(!h.triggered||h.kind==='sutureCorridor36')&&dist(batch36LinePoint(h,{x:h.endX,y:h.endY},f),f)<(h.kind==='sutureCorridor36'?h.r+.2:.65));if(!h){ai.final36Danger=0;ai.final36DangerThreat=null;return false;}if(ai.final36DangerThreat!==h){ai.final36DangerThreat=h;ai.final36Danger=0;ai.final36DangerAt=undefined;}if(ai.final36DangerAt!==s.time){ai.final36DangerAt=s.time;ai.final36Danger=(ai.final36Danger||0)+dt;}const react={easy:.32,normal:.2,hard:.12}[s.difficulty]??.2;if(ai.final36Danger<react)return false;const v=norm(-(h.endY-h.y),h.endX-h.x);input.x=v.x;input.y=v.y;if(h.kind!=='sutureCorridor36'&&h.arm<.14&&f.dodgeCd<=0)input.dodge=true;return true;}
