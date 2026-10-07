import {batch31ReflectionPlan} from './seed-duel-batch31.js';

// Two translations of the canonical frost-kaleidoscope completions. A world
// contact leaves a stamp; a confirmed victim contact makes a moving shell.
const R='final-frostkaleidoscope-reflect',F='final-frostkaleidoscope-frost';
const skill=(name,cooldown,desc)=>Object.freeze({name,cooldown,desc});
export const DUEL_BATCH34=Object.freeze({
 [R]:Object.freeze({id:R,comboId:R,final:true,inspectionOnly:true,artReady:false,law:'reflect',name:'서리도장',role:'진짜 반사 접점 · 짧은 냉각 길목',hp:177,speed:4.15,reach:1.8,arc:1.1,comboReach:[1.65,2.1,1.95],comboArc:[1.25,.5,1.45],comboNames:['도장 모서리 베기','결정자루 밀기','세 면 찍기'],damage:[9,11,14],cadence:.41,heavy:{damage:24,reach:2.4},parry:1,tile:0,ink:'#bde5e7',skills:[skill('세 접점에 겨울 찍기',7.2,'결정탄 하나가 실제 벽·기둥을 세 번까지 반사합니다. 그 접점에만 작은 서리 도장이 1.6초 남아요. 자국을 밟은 적은 한 시전당 한 번만 .25초 둔화. 자국은 피해가 없고 보스는 둔화되지 않습니다.'),skill('마지막 도장 깨기',5.7,'실제 남은 마지막 도장과 원래 탄을 거둡니다. 도장 위치에 .3초 고정 예고 뒤 작은 파쇄 한 번. 남은 세 타격 예산만 쓰며 준비 중 맞으면 끊겨요.')],ult:skill('차가운 세 모서리',0,'결정탄의 피해가 커집니다. 반사 세 번·도장 세 개·전체 세 타격·한 번의 짧은 둔화 상한은 그대로입니다.'),blurb:'3타·강공격의 실제 적중은 다음 첫 피해에 +2. 열린 곳에서는 도장을 찍을 반사면이 없어요. 이미 지나온 도장만 거둘 수 있고, 적 위치에 새 도장을 만들지 않습니다.'}),
 [F]:Object.freeze({id:F,comboId:F,final:true,inspectionOnly:true,artReady:false,law:'frost',name:'빙각반사면',role:'적에 붙는 결정 껍질 · 다음 자기 탄의 반사',hp:179,speed:4.05,reach:1.9,arc:1,comboReach:[1.85,2.35,2.05],comboArc:[.8,.42,1.35],comboNames:['빙각 가로긋기','결정침 내밀기','껍질 끝 접기'],damage:[10,10,14],cadence:.43,heavy:{damage:23,reach:2.55},parry:1,tile:1,ink:'#c4def3',skills:[skill('먼저 냉각, 다음 반사',7.4,'냉각 결정탄 하나를 보냅니다. 막히지 않은 실제 첫 적중으로 적 몸에 2.6초 결정 껍질이 생겨요. 그 뒤 이 무기의 다음 탄만 실제 껍질 면에서 반사. 반사 자체는 피해가 없고 다른 무기는 통과합니다.'),skill('껍질에 한 탄 더 보내기',5.9,'살아 있는 자기 껍질이 있을 때 한 번만 추가 탄을 보냅니다. .3초 준비 동안 위치·방향을 고정하며 맞으면 취소. 껍질은 버튼이 아니라 실제 다음 탄의 접촉으로 사라집니다.' )],ult:skill('한 생명의 차가운 면',0,'냉각탄과 추가 탄의 피해가 커집니다. 껍질 하나·껍질 반사 한 번·전체 세 타격 상한은 그대로. 보스에게 강제 얼림이나 경직을 만들지 않습니다.'),blurb:'3타·강공격의 실제 적중은 다음 첫 피해에 +2. 껍질은 적을 따라가지만 날아간 탄은 추적하지 않아요. 껍질 반사에는 무료 재타격이 없고, 피격·막기·회피가 냉각 준비를 끊습니다.'})
});
export const DUEL_BATCH34_KINDS=Object.freeze(['stampSend34','shellSend34','stampMark34','stampFracture34','shellFacet34','shellFollow34']);
export const DUEL_BATCH34_SHOTS=Object.freeze(['stampCrystal34','shellCrystal34']);
export const DUEL_BATCH34_AUDIO=Object.freeze({stampSend34:['reflect',{pitch:.95}],stampBounce34:['reflect',{pitch:1.25}],stampCool34:['frostHit',{pitch:.8}],stampFracture34:['hit',{pitch:1.1}],shellSend34:['frostHit',{pitch:1.05}],shellFacet34:['frostHit',{pitch:.7}],shellTurn34:['reflect',{pitch:1.1}],shellFollow34:['shotPierce',{pitch:.9}],crystalImpact34:['hit',{pitch:.95}]});
export const DUEL_BATCH34_STORY=Object.freeze([
 {id:'inspect-'+R,enemy:R,inspectionOnly:true,unlockAfter:null,title:'지나온 겨울의 세 도장',difficulty:'hard',before:'여기 찍힌 겨울은 내가 정말 벽을 만났다는 표시야. 네 발밑에 갑자기 찍을 수는 없어. 지나온 모서리 중 하나만 마지막으로 깨뜨릴게.',tip:'작고 각진 도장은 실제 반사 접점에만 생깁니다. 자국 밖으로 걸으면 냉각을 피하고, 마지막 도장을 깨는 고정 원의 .3초 준비 중 상대를 치면 취소됩니다.',after:'겨울을 곳곳에 찍었지만 전부 내 것은 아니었네. 다음 친구는 네 몸에서 반사면을 찾는대.'},
 {id:'inspect-'+F,enemy:F,inspectionOnly:true,unlockAfter:'inspect-'+R,title:'움직이는 몸의 작은 얼음면',difficulty:'hard',before:'먼저 닿아야 차가운 껍질이 생겨. 그 다음 내 탄이 정말 그 면에 닿아야 방향이 바뀌어. 네 몸의 작은 면을 읽어도 네 다음 걸음까지 알 수는 없어.',tip:'첫 탄을 막거나 피하면 껍질이 없습니다. 몸에 붙은 껍질은 이 무기의 다음 탄 하나만 반사하고 사라집니다. 추가 탄의 고정 예고에서 옆으로 움직이세요.',after:'같은 겨울이 벽에서는 도장이 되고, 너에게는 작은 면이 되었어. 서로 다른 자리에서 돌아오는 빛을 배웠네.'}
].map(Object.freeze));

const dist=(a,b)=>Math.hypot(a.x-b.x,a.y-b.y);
const norm=(x,y)=>{const n=Math.hypot(x,y)||1;return{x:x/n,y:y/n};};
function entry(a,b,p,r){const x=a.x-p.x,y=a.y-p.y,dx=b.x-a.x,dy=b.y-a.y,A=dx*dx+dy*dy,C=x*x+y*y-r*r;if(C<=0)return 0;if(A<1e-14)return null;const B=2*(x*dx+y*dy),D=B*B-4*A*C;if(D<0)return null;const t=(-B-Math.sqrt(D))/(2*A);return t>=0&&t<=1?t:null;}
const owned=(q,f)=>q.owner===f.team&&q.originalOwner===f.team&&q.cast===f.final34Cast&&!q.foreign&&!q.guardReturned&&!q.hallReturned;
const shell=(s,f)=>s.hazards.find(h=>h.kind==='shellFacet34'&&h.owner===f.team&&h.cast===f.final34Cast&&h.t>0&&!h.cancelled);
const stamp=(s,f)=>s.hazards.filter(h=>h.kind==='stampMark34'&&h.owner===f.team&&h.cast===f.final34Cast&&h.t>0&&!h.cancelled).at(-1);
const boss=(s,o)=>!!s.boss&&o.team===1;
const guarded=(o,dx,dy)=>o.blocking&&(-dx*o.fx-dy*o.fy)>-.2;
const wind=f=>Object.assign(f,{state:'skill',t:f.char===R?.84:.72,total:f.char===R?.84:.72,blocking:false,inv:0});
function budget(edge,ult){return{hits:0,edge,edgeSpent:false,ult,cooled:new Set(),shellCreated:false,serial:0};}
export function batch34CanAction(s,f,index,ult=false){if(ult||index!==1)return true;const h=f.char===R?stamp(s,f):shell(s,f);return !!h&&h.data.hits<3&&(f.char===R||!h.followUsed);}
export function batch34Melee(s,f,{step,heavy,hit,guarded:front}){if(hit&&!front&&(heavy||step===2)){f.crystalEdge34=1;f.crystalEdgeTime34=4;}}
function tell(s,f,kind,data,arm,ctx,extra={}){return ctx.area(s,f,kind,{x:f.x,y:f.y,dx:f.fx,dy:f.fy,endX:f.x+f.fx*4,endY:f.y+f.fy*4,r:.12,arm,t:arm+.14,cast:f.final34Cast,data,...extra});}
export function batch34Action(s,f,index,ctx,ult=false){
 if(!batch34CanAction(s,f,index,ult))return false;
 wind(f);
 if(index===1&&!ult){const h=f.char===R?stamp(s,f):shell(s,f);if(f.char===R){h.t=0;for(const q of s.shots)if(q.kind==='stampCrystal34'&&owned(q,f))q.life=0;ctx.area(s,f,'stampFracture34',{x:h.x,y:h.y,r:.85,arm:.3,t:.46,cast:h.cast,data:h.data,damage:h.data.ult?10:8});ctx.event(s,'stampFracture34');}
  else{h.followUsed=true;tell(s,f,'shellFollow34',h.data,.3,ctx,{shellSerial:h.createdSerial});ctx.event(s,'shellFollow34');}return true;}
 f.final34Cast=(f.final34Cast||0)+1;
 for(const q of s.shots)if(q.owner===f.team&&DUEL_BATCH34_SHOTS.includes(q.kind))q.life=0;
 for(const h of s.hazards)if(h.owner===f.team&&DUEL_BATCH34_KINDS.includes(h.kind)){h.t=0;h.cancelled=true;}
 const data=budget(f.crystalEdge34||0,ult);f.crystalEdge34=f.crystalEdgeTime34=0;
 if(f.char===R){tell(s,f,'stampSend34',data,.4,ctx);ctx.event(s,'stampSend34');}
 else{tell(s,f,'shellSend34',data,.4,ctx);ctx.event(s,'shellSend34');}return true;
}
function emit(s,f,h,ctx){if(ctx.wall(h))return;const isR=f.char===R;ctx.shoot(s,f,{kind:isR?'stampCrystal34':'shellCrystal34',x:h.x,y:h.y,dx:h.dx,dy:h.dy,speed:8.5,life:2.65,damage:h.data.ult?(isR?9:11):(isR?7:8),serial:++h.data.serial,originalOwner:f.team,cast:h.cast,data:h.data,bouncesDone:0,shellTurns:0,born:s.time,hit:new Set()});}
function damage(s,q,f,o,ctx){if(q.data.hits>=3||q.hit.has(o.team)||o.inv>0)return false;q.hit.add(o.team);q.data.hits++;const front=guarded(o,q.dx,q.dy),amount=q.damage+(q.foreign||q.data.edgeSpent?0:q.data.edge*2);q.data.edgeSpent=true;const hit=ctx.strike(s,f,o,amount,{kind:'shot',guardDir:{x:-q.dx,y:-q.dy},stun:0,knock:0,flinch:false});ctx.event(s,'crystalImpact34');return !!hit&&!front;}
function turn(q,nx,ny){const dot=q.dx*nx+q.dy*ny;q.dx-=2*dot*nx;q.dy-=2*dot*ny;const v=norm(q.dx,q.dy);q.dx=v.x;q.dy=v.y;}
export function batch34Tick(s,dt,ctx){
 for(const f of s.fighters)if(DUEL_BATCH34[f.char]){f.crystalEdgeTime34=Math.max(0,(f.crystalEdgeTime34||0)-dt);if(!f.crystalEdgeTime34)f.crystalEdge34=0;}
 for(const h of [...s.hazards]){if(h.t<=0||!DUEL_BATCH34_KINDS.includes(h.kind))continue;const f=s.fighters[h.owner],o=s.fighters[1-h.owner];h.t-=dt;if(h.cast!==f.final34Cast||f.hp<=0){h.t=0;h.cancelled=true;continue;}
  if(h.kind==='shellFacet34'){const target=s.fighters[h.target];if(!target||target.hp<=0){h.t=0;continue;}h.x=target.x;h.y=target.y;continue;}
  h.arm=Math.max(0,h.arm-dt);
  if(h.kind==='stampMark34'){const v=norm(o.x-h.x,o.y-h.y);if(h.arm===0&&o.hp>0&&o.inv<=0&&!boss(s,o)&&!h.data.cooled.has(o.team)&&dist(h,o)<h.r+.4&&!ctx.blocked(h,o)&&!guarded(o,v.x,v.y)){h.data.cooled.add(o.team);o.slow=Math.max(o.slow,.25);ctx.event(s,'stampCool34');}continue;}
  if(!h.triggered&&(f.stun>0||f.state!=='skill')){h.t=0;h.cancelled=true;continue;}
  if(h.arm>0||h.triggered||h.data.hits>=3)continue;h.triggered=true;
  if(h.kind==='stampFracture34'){if(o.inv<=0&&dist(h,o)<h.r+.4&&!ctx.blocked(h,o)){const v=norm(o.x-h.x,o.y-h.y);damage(s,{dx:v.x,dy:v.y,damage:h.damage,data:h.data,hit:new Set()},f,o,ctx);}ctx.fx(s,'boom',h.x,h.y,{r:h.r,ink:DUEL_BATCH34[f.char].ink,life:.25,max:.25});}
  else{if(h.kind==='shellFollow34'&&!shell(s,f)){h.cancelled=true;continue;}emit(s,f,h,ctx);}
 }
 for(const q of [...s.shots]){if(q.life<=0||!DUEL_BATCH34_SHOTS.includes(q.kind)||q.born===s.time||q.guardTurnAt===s.time||q.hallTurnAt===s.time)continue;const f=s.fighters[q.owner],o=s.fighters[1-q.owner];let native=owned(q,f)&&!!DUEL_BATCH34[f.char];if(!native){q.foreign=true;q.data.edgeSpent=true;}if(q.data.hits>=3){q.life=0;continue;}
  let length=q.speed*Math.min(dt,q.life);q.life-=dt;
  for(let k=0;k<5&&length>1e-8;k++){
   const a={x:q.x,y:q.y},b={x:q.x+q.dx*length,y:q.y+q.dy*length},world=ctx.surfaceHit(a,b),h=native&&q.kind==='shellCrystal34'&&!q.shellTurns?shell(s,f):null;
   const shellAt=h&&q.serial>h.createdSerial&&h.target===o.team?entry(a,b,o,h.r):null;
   const bodyAt=o.hp>0&&o.inv<=0&&!q.hit.has(o.team)?entry(a,b,o,.46):null;
   let at=1,kind='travel';if(world&&world.t<=at){at=world.t;kind='world';}if(bodyAt!==null&&bodyAt<at){at=bodyAt;kind='body';}if(shellAt!==null&&shellAt<=at){at=shellAt;kind='shell';}
   const p={x:a.x+(b.x-a.x)*at,y:a.y+(b.y-a.y)*at};Object.assign(q,p);
   // Interceptors receive only the physically travelled segment, never the
   // untravelled extension beyond a pillar or the actual shell contact.
   const intercepted=ctx.interceptShot?.(s,q,a.x,a.y,dt*at),ownershipChanged=q.owner!==f.team||q.guardReturned||q.hallReturned;
   if(intercepted||ownershipChanged){if(ownershipChanged){q.foreign=true;q.data.edgeSpent=true;}break;}
   length*=1-at;
   if(kind==='travel')break;
   if(kind==='shell'){const n=norm(p.x-o.x,p.y-o.y);turn(q,n.x,n.y);q.shellTurns=1;h.t=0;h.consumed=true;q.x+=n.x*.004;q.y+=n.y*.004;ctx.event(s,'shellTurn34');continue;}
   if(kind==='body'){
    if(o.shield>0){q.owner=o.team;q.dx*=-1;q.dy*=-1;q.foreign=true;q.data.edgeSpent=true;q.life=Math.min(q.life,.6);ctx.event(s,'reflect');break;}
    const earned=damage(s,q,f,o,ctx);
    if(native&&earned&&q.kind==='shellCrystal34'&&!q.data.shellCreated&&o.hp>0){q.data.shellCreated=true;if(!boss(s,o))o.slow=Math.max(o.slow,.18);ctx.area(s,f,'shellFacet34',{x:o.x,y:o.y,target:o.team,r:.56,t:2.6,arm:0,cast:q.cast,data:q.data,createdSerial:q.serial,followUsed:false});ctx.event(s,'shellFacet34');}
    // The first shell-preparation bullet ends here. Ordinary stamped crystals
    // may continue to a real wall, but never hit that victim again for free.
    if(q.kind==='shellCrystal34'||q.data.hits>=3){q.life=0;break;}q.x+=q.dx*.004;q.y+=q.dy*.004;continue;
   }
   if(!native||q.bouncesDone>=(q.kind==='stampCrystal34'?3:1)){q.life=0;break;}
   turn(q,world.nx,world.ny);q.bouncesDone++;q.x+=world.nx*.004;q.y+=world.ny*.004;
   if(q.kind==='stampCrystal34'){ctx.area(s,f,'stampMark34',{x:world.x+world.nx*.04,y:world.y+world.ny*.04,bounceX:world.x,bounceY:world.y,nx:world.nx,ny:world.ny,r:.62,arm:.12,t:1.6,cast:q.cast,data:q.data});ctx.event(s,'stampBounce34');}
   else ctx.event(s,'shellTurn34');
  }
 }
}
export function batch34Ai(s,f,o,input,dt,ctx){const ai=s.ai[f.team],react={easy:.32,normal:.2,hard:.12}[s.difficulty]??.2;ai.final34Seen=(ai.final34Seen||0)+dt;if(ai.final34Seen<react)return false;const d=dist(f,o),v=norm(o.x-f.x,o.y-f.y);input.aimX=v.x;input.aimY=v.y;
 if(batch34DangerAi(s,f,input,dt))return true;
 if(d<2.8&&['attack','heavy','dash'].includes(o.state)&&!o.hitDone||s.shots.some(q=>q.owner!==f.team&&q.life>0&&dist(q,f)<3.5))return false;
 if(f.state==='idle'&&o.blocking&&d<3.1&&s.time-o.blockSince<.55){const side=f.team?1:-1;input.x=-v.x*.45-v.y*side;input.y=-v.y*.45+v.x*side;return true;}
 if(f.state==='attack'&&f.hitDone&&f.step<2&&o.stun>0&&!o.blocking&&d<DUEL_BATCH34[f.char].comboReach[f.step+1]){input.attack=true;return true;}
 if(f.state==='idle'&&f.cd[1]<=0&&batch34CanAction(s,f,1)){const h=f.char===R?stamp(s,f):shell(s,f);if(f.char===R&&dist(h,o)<h.r+.4&&!ctx.blocked(h,o)){input.skill2=true;return true;}if(f.char===F&&d>2&&d<7&&!ctx.blocked(f,o)&&!s.shots.some(q=>q.owner===f.team&&q.kind==='shellCrystal34'&&q.life>0)){input.skill2=true;return true;}}
 if(f.state==='idle'&&f.cd[0]<=0&&d>2.8&&d<8&&!s.shots.some(q=>q.owner===f.team&&DUEL_BATCH34_SHOTS.includes(q.kind)&&q.life>0)){if(f.char===R&&s.time>=(ai.final34PlanAt||0)){ai.final34PlanAt=s.time+.18;const p=batch31ReflectionPlan(f,o,ctx,18);if(p){input.aimX=p.aim.x;input.aimY=p.aim.y;input[f.meter>=100?'ult':'skill1']=true;return true;}}if(!ctx.blocked(f,o)){input[f.meter>=100?'ult':'skill1']=true;return true;}}return false;
}
export function batch34DangerAi(s,f,input,dt){const ai=s.ai[f.team],h=s.hazards.find(h=>h.owner!==f.team&&h.t>0&&!h.cancelled&&((h.kind==='stampFracture34'&&dist(h,f)<h.r+.6)||(['stampSend34','shellSend34','shellFollow34'].includes(h.kind)&&!h.triggered&&entry(h,{x:h.endX,y:h.endY},f,.65)!==null)));if(!h){ai.final34Danger=0;ai.final34DangerThreat=null;return false;}
 // The specialized controller and shared danger dispatcher both query this
 // decision. Their queries must not make a normal opponent react twice as fast.
 if(ai.final34DangerThreat!==h){ai.final34DangerThreat=h;ai.final34Danger=0;ai.final34DangerAt=undefined;}
 if(ai.final34DangerAt!==s.time){ai.final34DangerAt=s.time;ai.final34Danger=(ai.final34Danger||0)+dt;}
 const react={easy:.32,normal:.2,hard:.12}[s.difficulty]??.2;if(ai.final34Danger<react)return false;const v=h.kind==='stampFracture34'?norm(f.x-h.x,f.y-h.y):norm(-h.dy,h.dx);input.x=v.x;input.y=v.y;if(h.arm<.14&&f.dodgeCd<=0)input.dodge=true;return true;}
