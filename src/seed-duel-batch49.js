// One slowing outward stone becomes one accelerating homeward attack.
const ID='final-tidepull-recall';
const skill=(name,cooldown,desc)=>Object.freeze({name,cooldown,desc});
export const DUEL_BATCH49=Object.freeze({
 [ID]:Object.freeze({id:ID,comboId:ID,final:true,inspectionOnly:true,artReady:false,law:'recall',name:'중력투석',role:'느린 투석 · 가속하는 한 번의 귀환',hp:183,speed:4.05,reach:2.1,arc:1.15,comboReach:[2.2,1.95,2.35],comboArc:[1.2,.42,1.25],comboNames:['덩굴끈 옆채기','씨앗추 올리기','낮은 사선 거두기'],damage:[10,11,14],cadence:.44,heavy:{damage:25,reach:2.7},parry:1,tile:0,ink:'#d8d4b8',skills:[skill('멀리 쉬는 씨앗추',7.3,'씨앗추 하나가 멀어지며 느려져요. 잠깐 머문 뒤 빠르게 돌아오며 한 번 강하게 맞힙니다. 던질 때는 피해가 없으니 돌아오는 길을 그려 보세요.'),skill('돌아올 자리 고르기',5.8,'멀리 보낸 씨앗추가 아직 남아 있으면, 잠깐 모은 뒤 지금 내 발자리로 빠르게 회수해요. 준비 중 맞으면 끊겨요. 같은 추를 거두는 기술입니다.')],ult:skill('정원의 무거운 귀소',0,'같은 씨앗추 하나를 더 힘 있게 회수해요. 멀리 던지는 준비와 좁은 귀환길은 그대로라, 어디서 돌려받을지가 중요해요.'),blurb:'돌 하나를 멀리 보내고, 돌아올 길을 먼저 찾아요. 서두르는 친구에게는 느린 준비가 약점이지만, 잘 돌아온 한 번은 묵직하죠.'})
});
export const DUEL_BATCH49_KINDS=Object.freeze(['gravitySling49','gravityHold49','gravityReel49']);
export const DUEL_BATCH49_SHOTS=Object.freeze(['gravityStone49']);
export const DUEL_BATCH49_AUDIO=Object.freeze({gravitySling49:['shotGravity',{pitch:.85}],gravityHold49:['shotReturn',{pitch:.78}],gravityReel49:['shotReturn',{pitch:1.1}],gravityHome49:['shotPierce',{pitch:.8}],gravityContact49:['hit',{pitch:.78}]});
export const DUEL_BATCH49_STORY=Object.freeze([{id:'inspect-'+ID,enemy:ID,inspectionOnly:true,unlockAfter:null,title:'서두르지 않는 씨앗추',difficulty:'hard',before:'나도 처음에는 빨리 던지기만 했어. 그런데 무거운 씨앗은 돌아올 때 더 힘이 나더라. 저쪽으로 보낸 뒤, 나는 이쪽 길을 준비할 거야.',tip:'먼 씨앗추가 잠깐 머물면 돌아오는 길을 피하세요. 투석 준비 중 가까이 압박하면 끊을 수 있어요. 돌아올 자리 고르기는 남아 있는 씨앗추만 회수합니다.',after:'천천히 보내고 단단하게 돌아오는 법을 배웠구나. 이번에는 네가 돌아올 길을 골라 봐.'}].map(Object.freeze));
const point=p=>({x:p.x,y:p.y}),dist=(a,b)=>Math.hypot(a.x-b.x,a.y-b.y);
const norm=(x,y)=>{const n=Math.hypot(x,y)||1;return{x:x/n,y:y/n};};
export function batch49LinePoint(a,b,p){const x=b.x-a.x,y=b.y-a.y,k=Math.max(0,Math.min(1,((p.x-a.x)*x+(p.y-a.y)*y)/(x*x+y*y||1)));return{x:a.x+x*k,y:a.y+y*k,k};}
function entry(a,b,p,r){const x=b.x-a.x,y=b.y-a.y,u=a.x-p.x,v=a.y-p.y,A=x*x+y*y,C=u*u+v*v-r*r;if(C<=0)return 0;if(A<1e-14)return null;const B=2*(u*x+v*y),D=B*B-4*A*C;if(D<0)return null;const t=(-B-Math.sqrt(D))/(2*A);return t>=0&&t<=1?t:null;}
const active=s=>s.phase==='fight';
const native=(s,q,f)=>q.kind==='gravityStone49'&&q.owner===q.originalOwner&&q.owner===f.team&&f.char===ID&&q.cast===f.final49Cast&&q.data.caster===f&&q.data.casterChar===f.char&&q.data.actor===s.fighters[1-f.team]&&q.data.stone===q&&!q.foreign&&!q.guardReturned&&!q.hallReturned;
function resource(s,f){return s.shots.find(q=>native(s,q,f)&&q.life>.55&&q.data.deadline>s.time+.55&&!q.data.paid&&q.travelled>=1.5&&(q.mode==='held'||q.mode==='home'&&q.homeAge<.45)&&s.shots.includes(q));}
export function batch49CanAction(s,f,index,ult=false){return active(s)&&f.char===ID&&f.hp>0&&s.fighters[1-f.team].hp>0&&(ult||index!==1||!!resource(s,f));}
export function batch49Melee(s,f,{step,heavy,hit,guarded}){if(f.char===ID&&hit&&!guarded&&(heavy||step===2)){f.stoneEdge49=1;f.stoneEdgeTime49=4;}}
function lose(q){q.foreign=true;q.mode='foreign';q.data.nativeLost=true;q.data.edgeSpent=true;}
function cancel(h){h.t=0;h.cancelled=true;if(h.stone){h.stone.life=0;h.stone.lost=true;}}
export function batch49Action(s,f,index,ctx,ult=false){
 if(!batch49CanAction(s,f,index,ult))return false;
 Object.assign(f,{state:'skill',t:.76,total:.76,blocking:false,inv:0});
 if(index===1&&!ult){
  const q=resource(s,f);q.mode='paused';q.data.paid=true;const home=point(f);
  for(const h of s.hazards)if(h.stone===q&&h.t>0){h.t=0;h.superseded=true;}
  ctx.area(s,f,'gravityReel49',{...point(q),endX:home.x,endY:home.y,r:.12,home,arm:.26,t:.4,cast:q.cast,castHp:f.hp,stone:q,data:q.data});ctx.event(s,'gravityReel49');return true;
 }
 f.final49Cast=(f.final49Cast||0)+1;
 for(const q of s.shots)if(q.kind==='gravityStone49'&&q.originalOwner===f.team&&q.owner===f.team){q.life=0;q.lost=true;}
 for(const h of s.hazards)if(DUEL_BATCH49_KINDS.includes(h.kind)&&h.owner===f.team){h.t=0;h.cancelled=true;}
 const v=norm(f.fx,f.fy),data={caster:f,casterChar:f.char,actor:s.fighters[1-f.team],stone:null,deadline:s.time+3.4,hits:0,paid:false,nativeLost:false,edge:f.stoneEdge49||0,edgeSpent:false,ult};
 f.stoneEdge49=f.stoneEdgeTime49=0;
 ctx.area(s,f,'gravitySling49',{...point(f),endX:f.x+v.x*5.3,endY:f.y+v.y*5.3,dx:v.x,dy:v.y,r:.12,arm:.4,t:.54,cast:f.final49Cast,castHp:f.hp,data});ctx.event(s,'gravitySling49');return true;
}
function hold(s,q,f,ctx){
 if(q.travelled<1.5||q.data.deadline<=s.time+.24||q.life<=.24){q.life=0;q.tooShort=true;return;}
 q.mode='held';const home=point(f);
 ctx.area(s,f,'gravityHold49',{...point(q),endX:home.x,endY:home.y,r:.12,home,arm:.24,t:.38,cast:q.cast,castHp:f.hp,stone:q,data:q.data});ctx.event(s,'gravityHold49');
}
// Integrate each speed ramp analytically, including its cap, before collision.
function ramp(q,dt,a,cap){const old=q.speed,time=(cap-old)/a,part=Math.max(0,Math.min(dt,time));const distance=old*part+a*part*part/2+cap*(dt-part);q.speed=old+a*part;return Math.max(0,distance);}
function contact(s,q,f,o,ctx,isNative){
 if(q.foreignHits||isNative&&q.data.hits||o.inv>0)return;
 const bonus=isNative&&!q.data.edgeSpent?q.data.edge*2:0;
 if(isNative){q.data.hits=1;q.data.edgeSpent=true;}else q.foreignHits=1;
 ctx.strike(s,f,o,(isNative?(q.data.ult?22:16):q.damage)+bonus,{kind:'shot',guardDir:{x:-q.dx,y:-q.dy},stun:0,knock:0,flinch:false});ctx.event(s,'gravityContact49');q.life=0;q.finished=true;
}
export function batch49Tick(s,dt,ctx){
 for(const f of s.fighters)if(f.char===ID){f.stoneEdgeTime49=Math.max(0,(f.stoneEdgeTime49||0)-dt);if(!f.stoneEdgeTime49)f.stoneEdge49=0;}
 if(!active(s)){for(const h of s.hazards)if(DUEL_BATCH49_KINDS.includes(h.kind))cancel(h);for(const q of s.shots)if(q.kind==='gravityStone49')q.life=0;return;}
 for(const h of s.hazards){
  if(h.t<=0||!DUEL_BATCH49_KINDS.includes(h.kind))continue;
  const f=s.fighters[h.owner],o=s.fighters[1-h.owner];h.t-=dt;
  if(h.cast!==f.final49Cast||f.char!==ID||h.data.caster!==f||h.data.actor!==o||f.hp<=0||o.hp<=0||h.data.nativeLost||h.data.deadline<=s.time){cancel(h);continue;}
  h.arm=Math.max(0,h.arm-dt);
  if(!h.triggered&&(f.hp<h.castHp||f.stun>0||h.kind!=='gravityHold49'&&f.state!=='skill')){cancel(h);continue;}
  if(h.arm>0||h.triggered)continue;h.triggered=true;
  if(h.stone){const q=h.stone;if(!native(s,q,f)||!s.shots.includes(q)||q.life-dt<=0){cancel(h);continue;}q.mode=h.kind==='gravityReel49'?'fixedHome':'home';q.fixedHome=h.kind==='gravityReel49'?h.home:null;q.speed=h.kind==='gravityReel49'?6:4;q.homeAge=0;ctx.event(s,'gravityHome49');continue;}
  const before=s.shots.length;
  ctx.shoot(s,f,{kind:'gravityStone49',...point(h),dx:h.dx,dy:h.dy,speed:10,damage:h.data.ult?22:16,life:Math.min(2.9,h.data.deadline-s.time),originalOwner:f.team,cast:h.cast,data:h.data,launch:point(h),tailX:h.x,tailY:h.y,remaining:5.3,travelled:0,born:s.time,mode:'out',homeAge:0});
  if(s.shots.length>before)h.data.stone=s.shots.at(-1);
 }
 for(const q of s.shots){
  if(q.life<=0||q.kind!=='gravityStone49')continue;
  const f=s.fighters[q.owner],o=s.fighters[1-q.owner],own=native(s,q,f);
  if(f.hp<=0||q.owner===q.originalOwner&&!q.foreign&&!q.guardReturned&&!q.hallReturned&&!own||own&&o.hp<=0){q.life=0;continue;}
  if(q.born===s.time||q.guardTurnAt===s.time||q.hallTurnAt===s.time)continue;
  if(!own)lose(q);
  const elapsed=Math.min(dt,q.life,Math.max(0,q.data.deadline-s.time+dt));q.life=Math.min(q.life-dt,q.data.deadline-s.time);
  if(elapsed<=0){q.life=0;continue;}if(q.mode==='held'||q.mode==='paused')continue;
  const returning=own&&(q.mode==='home'||q.mode==='fixedHome'),home=q.mode==='fixedHome'?q.fixedHome:f;
  let distance;
  if(returning){const d=dist(q,home);if(d<=.34){q.life=0;q.caught=true;continue;}const v=norm(home.x-q.x,home.y-q.y);q.dx=v.x;q.dy=v.y;q.homeAge+=elapsed;distance=Math.min(ramp(q,elapsed,16,18),d-.34);}
  else distance=own?Math.min(ramp(q,elapsed,-8,2),q.remaining):q.speed*elapsed;
  const a=point(q),b={x:a.x+q.dx*distance,y:a.y+q.dy*distance},w=ctx.surfaceHit(a,b),wa=w?.t??1,end={x:a.x+(b.x-a.x)*wa,y:a.y+(b.y-a.y)*wa};
  const body=o.hp>0&&o.inv<=0&&(o.shield>0||returning||!own)&&(!own||!q.data.hits)?entry(a,end,o,.4):null;
  const caughtAt=returning?entry(a,end,home,.34):null;let at=wa,kind=w?'world':'travel';
  if(body!==null&&body*wa<at){at=body*wa;kind='body';}if(caughtAt!==null&&caughtAt*wa<=at){at=caughtAt*wa;kind='catch';}
  q.tailX=a.x;q.tailY=a.y;q.x=a.x+(b.x-a.x)*at;q.y=a.y+(b.y-a.y)*at;const moved=distance*at;q.travelled+=moved;if(own&&!returning)q.remaining=Math.max(0,q.remaining-moved);
  const intercepted=ctx.interceptShot?.(s,q,a.x,a.y,moved/Math.max(.001,q.speed)),changed=q.owner!==f.team||q.guardReturned||q.hallReturned;
  if(intercepted||changed){lose(q);continue;}
  if(kind==='catch'){q.life=0;q.caught=true;continue;}
  if(kind==='body'){if(o.shield>0){q.owner=o.team;q.dx*=-1;q.dy*=-1;q.life=Math.min(q.life,.5);lose(q);ctx.event(s,'reflect');continue;}contact(s,q,f,o,ctx,own);continue;}
  if(kind==='world'){q.x=w.x+w.nx*.008;q.y=w.y+w.ny*.008;if(own&&!returning)hold(s,q,f,ctx);else{q.life=0;q.lost=true;}continue;}
  if(own&&!returning&&q.remaining<=1e-8)hold(s,q,f,ctx);
  if(returning&&dist(q,home)<=.34000001){q.life=0;q.caught=true;}
 }
}
export function batch49Ai(s,f,o,input,dt,ctx){
 const ai=s.ai[f.team],react={easy:.32,normal:.2,hard:.12}[s.difficulty]??.2;
 if(ai.stone49SeenAt!==s.time){ai.stone49SeenAt=s.time;ai.stone49Seen=(ai.stone49Seen||0)+dt;}if(ai.stone49Seen<react)return false;
 const v=norm(o.x-f.x,o.y-f.y),d=dist(f,o);input.aimX=v.x;input.aimY=v.y;
 if(batch49DangerAi(s,f,input,dt))return true;
 if(f.state==='attack'&&f.hitDone&&f.step<2&&o.stun>0&&!o.blocking&&d<DUEL_BATCH49[ID].comboReach[f.step+1]){input.attack=true;return true;}
 const q=s.shots.find(q=>native(s,q,f)&&q.life>0);
 if(q){const p=batch49LinePoint(q,f,o);if(f.state==='idle'&&f.cd[1]<=0&&batch49CanAction(s,f,1)&&p.k>0&&p.k<1&&dist(p,o)<.3&&o.inv<=0&&!o.blocking&&!ctx.blocked(q,f)){input.skill2=true;return true;}if(q.mode==='out'&&d>2.8){input.x=-v.y*.5;input.y=v.x*.5;return true;}return false;}
 if(f.state==='idle'&&f.cd[0]<=0&&d>2.9&&d<5.1&&o.inv<=0&&!o.blocking&&o.shield<=0&&!['attack','heavy','dash','dodge'].includes(o.state)&&!s.hazards.some(h=>h.owner===f.team&&DUEL_BATCH49_KINDS.includes(h.kind)&&h.t>0)&&!ctx.surfaceHit(f,{x:f.x+v.x*5.3,y:f.y+v.y*5.3})){input[f.meter>=100?'ult':'skill1']=true;return true;}return false;
}
export function batch49DangerAi(s,f,input,dt){
 const ai=s.ai[f.team],h=s.hazards.find(h=>h.owner!==f.team&&h.t>0&&!h.cancelled&&!h.triggered&&DUEL_BATCH49_KINDS.includes(h.kind)&&dist(batch49LinePoint(h,{x:h.endX,y:h.endY},f),f)<.55);
 if(!h){ai.stone49Danger=0;ai.stone49Threat=null;return false;}if(ai.stone49Threat!==h){ai.stone49Threat=h;ai.stone49Danger=0;ai.stone49DangerAt=undefined;}
 if(ai.stone49DangerAt!==s.time){ai.stone49DangerAt=s.time;ai.stone49Danger=(ai.stone49Danger||0)+dt;}
 if(ai.stone49Danger<({easy:.32,normal:.2,hard:.12}[s.difficulty]??.2))return false;
 const v=norm(-(h.endY-h.y),h.endX-h.x);input.x=v.x;input.y=v.y;if(h.arm<.14&&f.dodgeCd<=0)input.dodge=true;return true;
}
