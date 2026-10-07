import {batch31ReflectionPlan as reflectionPlan} from './seed-duel-batch31.js';
// Gravity-mirror branches: short footprints vs a confined physical pinball.
const R='final-gravitymirror-reflect',G='final-gravitymirror-gravity';
const skill=(name,cooldown,desc)=>Object.freeze({name,cooldown,desc});
export const DUEL_BATCH32=Object.freeze({
 [R]:Object.freeze({id:R,comboId:R,final:true,inspectionOnly:true,artReady:false,law:'reflect',name:'낙성반사',role:'지나온 반사점 · 짧고 작은 중력 흔적',hp:179,speed:4.1,reach:1.85,arc:1.15,comboReach:[1.65,2.1,2.2],comboArc:[1.15,.5,1.4],comboNames:['거울추 옆베기','낙성 자루 밀기','모서리 내려베기'],damage:[9,11,14],cadence:.43,heavy:{damage:24,reach:2.5},parry:1,tile:0,ink:'#c5c3df',skills:[skill('지나온 두 모서리의 무게',7.4,'실제 두 반사마다 작은 중력 흔적. .25초 예고 뒤 짧게 남으며 각 흔적 한 접촉만. 핵과 흔적을 합쳐 전체 세 타격. 반사면 없이 쏘면 흔적도 없어요.'),skill('현재 별의 무게 내려놓기',5.9,'실제 한 반사 뒤 살아 있는 자기 핵을 소비합니다. 현재 핵 자리에서 .3초 준비 뒤 작은 흔적을 내려놓아요. 준비 중 맞으면 취소되고 남은 세 타격 기록은 그대로예요.')],ult:skill('지나온 길의 무거운 약속',0,'강한 한 핵과 두 작은 반사 흔적. 두 반사·세 타격·고정된 짧은 예고 유지.'),blurb:'실제 3타·강공격은 다음 첫 피해만 +2. 여러 반사점의 당김을 합쳐도 일반 상대 최대 .45 거리, 보스 이동·무적·공격 준비를 빼앗지 않아요. 작은 흔적 바깥은 안전해요.'}),
 [G]:Object.freeze({id:G,comboId:G,final:true,inspectionOnly:true,artReady:false,law:'gravity',name:'중력핀볼',role:'한 작은 포획 구역 · 접촉면에서 튀는 실물 핵',hp:182,speed:4.05,reach:1.9,arc:1,comboReach:[1.75,2.15,2.25],comboArc:[1,.6,1.35],comboNames:['핀볼추 밀기','포획면 찌르기','중심 접어베기'],damage:[9,11,14],cadence:.42,heavy:{damage:24,reach:2.5},parry:1,tile:1,ink:'#c2bfdf',skills:[skill('작은 구역 안의 핀볼',7.5,'앞 3거리에 반경1.8 고정 구역을 .4초 준비합니다. 안의 실물 핵이 몸 접촉과 구역 경계에서 실제 반사해요. .55초 접촉 간격·세 타격·세 경계 반사·2.3초만. 엄폐면에서 끝나며 밖은 안전해요.'),skill('맞힌 현재 핵을 중심으로 접기',6,'실제 막히지 않은 적중과 자기 핵이 필요합니다. 현재 핵과 장을 소비하고 .3초 고정 예고 뒤 그 자리에서 기존 장 중심으로 핵을 보내요. 같은 남은 세 타격만 쓰고 몸을 추적하지 않아요.')],ult:skill('한 구역의 무거운 핀볼',0,'강한 한 핵. 동일한 작은 구역·접촉 간격·세 타격·세 반사·시간 상한을 유지해요.'),blurb:'실제 3타·강공격은 다음 첫 피해만 +2. 구역 안의 일반 상대만 전체 .45거리 당기며 보스는 당기지 않아요. 혼자 있는 상대가 떠나거나 엄폐하면 추가 핀볼 접촉을 낭비해요.'})
});
export const DUEL_BATCH32_KINDS=Object.freeze(['fallSend32','pinballSend32','fallStop32','fallGround32','pinballWell32','pinballLink32']);
export const DUEL_BATCH32_SHOTS=Object.freeze(['fallSeed32','pinballSeed32','pinballBridge32']);
export const DUEL_BATCH32_AUDIO=Object.freeze({fallSend32:['shotGravity',{pitch:.8}],pinballSend32:['reflect',{pitch:.85}],fallBounce32:['reflect',{pitch:.8}],pinballBounce32:['reflect',{pitch:1.1}],fallGround32:['shotGravity',{pitch:1.2}],fallImpact32:['hit',{pitch:.9}],pinballWell32:['shotGravity',{pitch:1.1}],pinballContact32:['hit',{pitch:.9}],pinballLink32:['shotPierce',{pitch:.8}]});
export const DUEL_BATCH32_STORY=Object.freeze([
 {id:'inspect-'+R,enemy:R,inspectionOnly:true,unlockAfter:null,title:'지나온 모서리의 작은 별',difficulty:'hard',before:'별은 네 머리 위에 갑자기 나타나지 않아. 내 거울이 실제 모서리를 만난 자리에 짧은 무게를 남겨. 지나온 길이라도 너무 오래 서 있지는 마.',tip:'실제 반사핵과 지나온 작은 흔적을 구별하세요. 흔적은 따라오지 않고 짧게 사라집니다. 핵을 내려놓는 준비 중 시전자를 공격해서 끊거나 작은 원 바깥으로 피하세요.',after:'별이 머물던 자리는 벽이 알려 줬네. 다음 친구는 작은 구역 안에서 무게를 튀기는 법을 배웠대.'},
 {id:'inspect-'+G,enemy:G,inspectionOnly:true,unlockAfter:'inspect-'+R,title:'작은 구역 안에서 튀는 마음',difficulty:'hard',before:'내 무게가 네게 닿으면 실제 접촉면에서 튀어 나가. 하지만 작은 정원을 떠나면 더는 붙잡을 수 없어. 혼자 남은 공이 어디로 굴러가는지 봐 줘.',tip:'고정 구역 밖으로 나오거나 핵을 막고 회피하세요. 핵은 실제 몸 접촉과 구역 경계에서만 튀며 엄폐에 막힙니다. 맞힌 핵을 중심으로 접는 점선도 고정돼 있어 옆으로 피할 수 있어요.',after:'끌어오는 힘도 서로 닿는 시간이 필요하구나. 같은 중력 거울이 지나온 흔적과 작은 핀볼 정원으로 다른 길을 만들었어.'}
].map(Object.freeze));
const norm=(x,y)=>{const d=Math.hypot(x,y)||1;return{x:x/d,y:y/d};},dist=(a,b)=>Math.hypot(a.x-b.x,a.y-b.y);
function entry(a,b,p,r){const x=a.x-p.x,y=a.y-p.y,dx=b.x-a.x,dy=b.y-a.y,C=x*x+y*y-r*r;if(C<=0)return 0;const A=dx*dx+dy*dy,B=2*(x*dx+y*dy),D=B*B-4*A*C;if(A<1e-14||D<0)return null;const t=(-B-Math.sqrt(D))/(2*A);return t>=0&&t<=1?t:null;}
// Exit from the actual swept segment's fixed circle, not a visual orbit snap.
function boundary(a,b,p,r){const dx=b.x-a.x,dy=b.y-a.y,x=a.x-p.x,y=a.y-p.y,A=dx*dx+dy*dy;if(A<1e-14)return null;const B=2*(x*dx+y*dy),D=B*B-4*A*(x*x+y*y-r*r);if(D<0)return null;const t=(-B+Math.sqrt(D))/(2*A);if(t<0||t>1)return null;const point={x:a.x+dx*t,y:a.y+dy*t},v=norm(p.x-point.x,p.y-point.y);return{...point,t,nx:v.x,ny:v.y};}
const wind=(f,t)=>Object.assign(f,{state:'skill',t,total:t,blocking:false,inv:0});
const owned=(q,f)=>q.originalOwner===f.team&&q.cast===f.final32Cast&&!q.foreign&&!q.guardReturned&&!q.hallReturned;
const shot=(s,f)=>s.shots.find(q=>DUEL_BATCH32_SHOTS.includes(q.kind)&&q.owner===f.team&&owned(q,f)&&q.life>0);
function contact(s,f,o,data,n,v,ctx,earn=true){if(o.inv>0||data.hits>=3)return false;data.hits++;const guarded=o.blocking&&v.x*o.fx+v.y*o.fy>-.2,damage=n+(data.edgeSpent?0:data.edge*2);data.edgeSpent=true;const ok=ctx.strike(s,f,o,damage,{kind:'shot',guardDir:v,knock:0,stun:0,flinch:false});if(ok&&!guarded&&earn)data.earned++;return !!ok&&!guarded;}
function ground(s,f,q,p,ctx){if(ctx.wall(p))return;ctx.area(s,f,'fallGround32',{x:p.x,y:p.y,r:.8,arm:.25,t:1.15,cast:q.cast,data:q.data,damage:q.ult?4:3});ctx.event(s,'fallGround32');}
function pull(s,o,h,dt,ctx){const d=dist(h,o),data=h.data;if(o.inv>0||s.boss&&o.team===1||d<=.5||d>h.r||data.pull<=0||ctx.blocked(h,o))return;const v=norm(h.x-o.x,h.y-o.y),m=Math.min(.6*dt,data.pull,d-.5),p={x:o.x+v.x*m,y:o.y+v.y*m};if(!ctx.wall(p)&&!ctx.blocked(o,p)){o.x=p.x;o.y=p.y;data.pull-=m;}}
export function batch32Melee(s,f,{step,heavy,hit,guarded}){if(hit&&!guarded&&(heavy||step===2)){f.mirrorEdge32=1;f.mirrorEdgeTime32=4;}}
export function batch32Action(s,f,index,ctx,ult=false){
 wind(f,.84);
 if(index===1&&!ult){const q=shot(s,f);if(!q||q.data.hits>=3)return;
  if(f.char===R){if(!q.bouncesDone)return;q.life=0;ctx.area(s,f,'fallStop32',{x:q.x,y:q.y,r:.1,arm:.3,t:.42,cast:q.cast,q});ctx.event(s,'fallGround32');}
  else{if(!q.data.earned||!q.field||q.field.t<=0)return;q.life=0;q.field.t=0;ctx.area(s,f,'pinballLink32',{x:q.x,y:q.y,endX:q.field.x,endY:q.field.y,r:.15,arm:.3,t:.42,cast:q.cast,data:q.data,damage:q.ult?8:6});ctx.event(s,'pinballLink32');}return;
 }
 const cast=f.final32Cast=(f.final32Cast||0)+1,edge=f.mirrorEdge32||0;f.mirrorEdge32=f.mirrorEdgeTime32=0;
 for(const q of s.shots)if(q.owner===f.team&&DUEL_BATCH32_SHOTS.includes(q.kind))q.life=0;
 for(const h of s.hazards)if(h.owner===f.team&&DUEL_BATCH32_KINDS.includes(h.kind)){h.t=0;h.cancelled=true;}
 const kind=f.char===R?'fallSend32':'pinballSend32',x=f.x+(f.char===G?f.fx*3:0),y=f.y+(f.char===G?f.fy*3:0);
 ctx.area(s,f,kind,{x,y,endX:x+f.fx*4,endY:y+f.fy*4,dx:f.fx,dy:f.fy,r:f.char===G?1.8:.1,arm:.4,t:.52,cast,edge,ult});ctx.event(s,kind);
}
export function batch32Tick(s,dt,ctx){
 for(const f of s.fighters)if(DUEL_BATCH32[f.char]){f.mirrorEdgeTime32=Math.max(0,(f.mirrorEdgeTime32||0)-dt);if(!f.mirrorEdgeTime32)f.mirrorEdge32=0;}
 for(const h of [...s.hazards]){if(h.t<=0||!DUEL_BATCH32_KINDS.includes(h.kind))continue;const f=s.fighters[h.owner],o=s.fighters[1-h.owner],before=h.arm;h.arm=Math.max(0,h.arm-dt);h.t-=dt;if(h.cast!==f.final32Cast){h.t=0;continue;}
  if(h.kind==='fallGround32'||h.kind==='pinballWell32'){
   if(h.arm<=0)pull(s,o,h,dt,ctx);
   if(h.kind==='fallGround32'&&h.arm<=0&&!h.triggered&&o.inv<=0&&dist(h,o)<=h.r+.35&&!ctx.wall(o)&&!ctx.blocked(h,o)){h.triggered=true;contact(s,f,o,h.data,h.damage,norm(h.x-o.x,h.y-o.y),ctx);ctx.event(s,'fallImpact32');}continue;
  }
  if(before>0&&(f.stun>0||f.state!=='skill')){h.t=0;h.cancelled=true;continue;}if(h.arm>0||h.triggered)continue;h.triggered=true;
  if(h.kind==='fallStop32'){ground(s,f,h.q,h,ctx);continue;}
  if(h.kind==='pinballLink32'){const v=norm(h.endX-h.x,h.endY-h.y),length=dist(h,{x:h.endX,y:h.endY});if(!ctx.wall(h)&&length>.05)ctx.shoot(s,f,{kind:'pinballBridge32',x:h.x,y:h.y,dx:v.x,dy:v.y,speed:8,life:length/8,damage:h.damage,cast:h.cast,originalOwner:f.team,data:h.data,bouncesDone:0,leg:0,receipts:new Set()});continue;}
  if(ctx.wall(h)||ctx.blocked(f,h))continue;
  const data={hits:0,earned:0,pull:.45,edge:h.edge,edgeSpent:false};let field=null;
  if(f.char===G){field=ctx.area(s,f,'pinballWell32',{x:h.x,y:h.y,r:1.8,arm:0,t:2.3,cast:h.cast,data});ctx.event(s,'pinballWell32');}
  ctx.shoot(s,f,{kind:f.char===R?'fallSeed32':'pinballSeed32',x:h.x,y:h.y,dx:h.dx,dy:h.dy,speed:f.char===G?7:8,life:f.char===G?2.3:3,damage:h.ult?(f.char===G?7:6):(f.char===G?5:4),cast:h.cast,originalOwner:f.team,ult:h.ult,bouncesDone:0,leg:0,data,field,bodyCd:0,receipts:new Set()});
 }
 for(const q of [...s.shots]){if(q.life<=0||!DUEL_BATCH32_SHOTS.includes(q.kind)||q.guardTurnAt===s.time||q.hallTurnAt===s.time)continue;const f=s.fighters[q.owner],o=s.fighters[1-q.owner],native=owned(q,f)&&!!DUEL_BATCH32[f.char];if(!native)q.foreign=true;if(q.field&&native&&q.field.t<=0){q.life=0;continue;}
  let remaining=q.speed*Math.min(dt,q.life);q.life-=dt;q.bodyCd=Math.max(0,(q.bodyCd||0)-dt);
  for(let n=0;n<4&&remaining>1e-8;n++){
   const a={x:q.x,y:q.y},b={x:a.x+q.dx*remaining,y:a.y+q.dy*remaining},surface=ctx.surfaceHit(a,b),circle=q.field&&native?boundary(a,b,q.field,1.65):null;
   const at=o.inv<=0&&q.bodyCd<=0&&(!q.receipts.has(q.leg)||q.kind==='pinballSeed32'&&native)?entry(a,b,o,.48):null;
   let wall=surface;if(circle&&(!wall||circle.t<wall.t))wall={...circle,field:true};Object.assign(q,b);
   if(ctx.interceptShot?.(s,q,a.x,a.y,dt)){if(q.owner!==f.team){q.foreign=true;q.data.edgeSpent=true;}break;}
   if(at!==null&&(!wall||at<wall.t)&&!ctx.blocked(a,o)){
    if(o.shield>0){q.owner=o.team;q.dx*=-1;q.dy*=-1;q.foreign=true;q.life=Math.min(q.life,.6);q.data.edgeSpent=true;Object.assign(q,{x:a.x+(b.x-a.x)*at,y:a.y+(b.y-a.y)*at});ctx.event(s,'reflect');break;}
    q.receipts.add(q.leg);contact(s,f,o,q.data,q.damage,{x:-q.dx,y:-q.dy},ctx,native);ctx.event(s,'pinballContact32');
    if(q.kind==='pinballSeed32'&&native){const p={x:a.x+(b.x-a.x)*at,y:a.y+(b.y-a.y)*at},v=dist(p,o)<1e-8?{x:-q.dx,y:-q.dy}:norm(p.x-o.x,p.y-o.y),dot=q.dx*v.x+q.dy*v.y;q.dx-=2*dot*v.x;q.dy-=2*dot*v.y;q.bodyCd=.55;Object.assign(q,{x:p.x+v.x*.003,y:p.y+v.y*.003});remaining*=1-at;if(q.data.hits>=3){q.life=0;break;}continue;}
   }
   if(!wall){Object.assign(q,b);break;}Object.assign(q,{x:wall.x,y:wall.y});remaining*=1-wall.t;
   const limit=q.kind==='pinballSeed32'?3:2;
   if(q.foreign||q.kind==='pinballBridge32'||q.bouncesDone>=limit||q.field&&!wall.field){q.life=0;break;}
   const dot=q.dx*wall.nx+q.dy*wall.ny;q.dx-=2*dot*wall.nx;q.dy-=2*dot*wall.ny;q.bouncesDone++;q.leg=q.bouncesDone;q.x+=wall.nx*.002;q.y+=wall.ny*.002;
   if(q.kind==='fallSeed32')ground(s,f,q,{x:wall.x+wall.nx*.5,y:wall.y+wall.ny*.5},ctx);ctx.event(s,q.kind==='fallSeed32'?'fallBounce32':'pinballBounce32');
  }
 }
}
export function batch32Ai(s,f,o,input,dt,ctx){const ai=s.ai[f.team],react={easy:.32,normal:.2,hard:.12}[s.difficulty]??.2;ai.final32Seen=(ai.final32Seen||0)+dt;if(ai.final32Seen<react)return false;const d=dist(f,o),v=norm(o.x-f.x,o.y-f.y);input.aimX=v.x;input.aimY=v.y;if(d<2.8&&['attack','heavy','dash'].includes(o.state)&&!o.hitDone)return false;
 // Visible incoming danger precedes a fresh paid action. This is the same
 // finite reaction reader available to both seats, not future-input access.
 if(s.hazards.some(h=>h.owner!==f.team&&h.t>0&&!h.cancelled&&DUEL_BATCH32_KINDS.includes(h.kind))&&batch32DangerAi(s,f,input,dt))return true;
 if(s.shots.some(q=>q.owner!==f.team&&q.life>0&&dist(q,f)<3.5))return false;
 if(f.state==='idle'&&o.blocking&&d<3.1&&s.time-o.blockSince<.55){const side=f.team?1:-1;input.x=-v.x*.45-v.y*side;input.y=-v.y*.45+v.x*side;return true;}
 // Only a real confirmed opening licenses an ordinary follow-up; retain
 // the existing combo, recovery, guard and reach checks in the action engine.
 if(f.state==='attack'&&f.hitDone&&f.step<2&&o.stun>0&&!o.blocking&&d<DUEL_BATCH32[f.char].comboReach[f.step+1]){input.attack=true;return true;}
 if(f.state==='idle'&&o.stun>0&&!o.blocking&&d<DUEL_BATCH32[f.char].comboReach[0]+.15){input.attack=true;return true;}
 const q=shot(s,f);if(f.state==='idle'&&f.cd[1]<=0&&q&&q.data.hits<3){if(f.char===R&&q.bouncesDone&&dist(q,o)<1){input.skill2=true;return true;}if(f.char===G&&q.data.earned&&q.field?.t>0&&entry(q,q.field,o,.6)!==null&&!ctx.blocked(q,q.field)){input.skill2=true;return true;}}
 if(!q&&f.state==='idle'&&f.cd[0]<=0){if(f.char===G&&d>2.8&&d<4.6&&!ctx.blocked(f,o)){input[f.meter>=100?'ult':'skill1']=true;return true;}if(f.char===R&&d>2.8&&d<9&&s.time>=(ai.final32PlanAt||0)){ai.final32PlanAt=s.time+.18;const plan=reflectionPlan(f,o,ctx,18);if(plan){input.aimX=plan.aim.x;input.aimY=plan.aim.y;input[f.meter>=100?'ult':'skill1']=true;return true;}}}return false;
}
export function batch32DangerAi(s,f,input,dt){const ai=s.ai[f.team],react={easy:.32,normal:.2,hard:.12}[s.difficulty]??.2;const h=s.hazards.find(h=>h.owner!==f.team&&h.t>0&&!h.cancelled&&(['fallGround32','pinballWell32','pinballSend32'].includes(h.kind)?dist(h,f)<h.r+.6:h.kind==='pinballLink32'&&entry(h,{x:h.endX,y:h.endY},f,.7)!==null));if(!h){ai.final32Danger=0;return false;}ai.final32Danger=(ai.final32Danger||0)+dt;if(ai.final32Danger<react)return false;const v=h.kind==='pinballLink32'?norm(h.y-h.endY,h.endX-h.x):dist(f,h)<1e-8?{x:0,y:1}:norm(f.x-h.x,f.y-h.y);input.x=v.x;input.y=v.y;if(h.arm<.16&&f.dodgeCd<=0)input.dodge=true;return true;}
