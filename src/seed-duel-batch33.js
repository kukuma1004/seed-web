import {batch31ReflectionPlan as reflectionPlan} from './seed-duel-batch31.js';

// Thunder-mirror completions: a surface relay and an incident-angle relay.
// One-v-one must not invent extra targets just to make chain look stronger.
const R='final-thundermirror-reflect',C='final-thundermirror-chain';
const skill=(name,cooldown,desc)=>Object.freeze({name,cooldown,desc});
export const DUEL_BATCH33=Object.freeze({
 [R]:Object.freeze({id:R,comboId:R,final:true,inspectionOnly:true,artReady:false,law:'reflect',name:'굴절전도',role:'실제 반사점 · 짧은 전류의 옆가지',hp:178,speed:4.15,reach:1.9,arc:1.1,comboReach:[1.7,2.15,2.3],comboArc:[1.1,.5,1.35],comboNames:['전도봉 옆베기','거울끝 밀기','모서리 두드리기'],damage:[9,11,14],cadence:.42,heavy:{damage:24,reach:2.55},parry:1,tile:0,ink:'#cce4db',skills:[skill('두 모서리의 짧은 전류',7.3,'실물 핵이 두 번까지 반사합니다. 각 실제 반사점 근처 1.6거리 안의 적을 향해 .2초 고정 예고 뒤 짧은 전류 한 발. 핵과 가지를 합쳐 전체 세 타격만. 벽 없는 곳에는 가지도 없습니다.'),skill('지나온 접점 다시 잇기',5.8,'실제 반사한 자기 핵을 소비해 마지막 반사점에서 짧은 전류를 보냅니다. .3초 고정 준비, 방향은 누를 때 고정. 남은 세 타격만 사용하며 준비 중 맞으면 끊깁니다.')],ult:skill('세 빛의 굴절전도',0,'강한 핵 하나와 실제 두 접점의 짧은 가지. 반사·거리·전체 세 타격 상한을 늘리지 않습니다.'),blurb:'실제 3타·강공격은 다음 첫 피해만 +2. 짧은 전류는 반사 당시 적의 위치만 겨누므로 옆으로 피할 수 있어요. 넓은 중앙에서는 보조 전류가 줄어듭니다.'}),
 [C]:Object.freeze({id:C,comboId:C,final:true,inspectionOnly:true,artReady:false,law:'chain',name:'반사계전',role:'실제 입사각 · 다음 적이 필요한 전류',hp:176,speed:4.2,reach:1.95,arc:1,comboReach:[1.8,2.25,2.15],comboArc:[1,.45,1.2],comboNames:['계전갈래 베기','입사축 찌르기','갈림끝 접기'],damage:[9,11,14],cadence:.4,heavy:{damage:23,reach:2.45},parry:1,tile:1,ink:'#e2dec0',skills:[skill('입사각으로 잇는 한 전류',7.1,'실제 적 접촉면에서 입사 방향을 반사합니다. 그 방향 안 2.6거리의 아직 맞지 않은 다음 적만 선택. 한 상대만 있으면 자동 연쇄가 끝납니다. 첫 피해8, 후속 피해5, 전체 세 타격.'),skill('남은 반사각 수동 계전',5.7,'막히지 않은 실제 적중 뒤 남은 접점을 소비합니다. 당시 반사 방향의 ±45도 안에서 새 방향을 고르고 .3초 고정 준비 뒤 짧은 전류 한 발. 비용을 내는 별도 조작이며 무료 재연쇄·위치 추적은 없습니다.')],ult:skill('꺾인 세 마디의 약속',0,'첫 전류11·다음 적 전류7. 같은 입사각 조건·다음 적 제외·세 타격 상한. 혼자 상대에게 자동 연쇄를 만들지 않습니다.'),blurb:'실제 3타·강공격은 다음 첫 피해만 +2. 혼자 있는 상대에게는 첫 전류 후 자동 연결이 없어요. 남은 반사각을 보고 자리와 방향을 맞춰 수동 계전하세요.'})
});
export const DUEL_BATCH33_KINDS=Object.freeze(['conductorSend33','incidentSend33','surfaceRelay33','conductorFold33','incidentEcho33','incidentFold33']);
export const DUEL_BATCH33_SHOTS=Object.freeze(['conductorCore33','surfaceBolt33','incidentBolt33']);
export const DUEL_BATCH33_AUDIO=Object.freeze({conductorSend33:['reflect',{pitch:1.05}],incidentSend33:['chain',{pitch:.85}],conductorBounce33:['reflect',{pitch:1.2}],surfaceRelay33:['chain',{pitch:1.15}],incidentEcho33:['chain',{pitch:.7}],incidentFold33:['shotPierce',{pitch:1.05}],conductorImpact33:['hit',{pitch:1.05}]});
export const DUEL_BATCH33_STORY=Object.freeze([
 {id:'inspect-'+R,enemy:R,inspectionOnly:true,unlockAfter:null,title:'모서리에서 돋는 작은 전류',difficulty:'hard',before:'벽에 닿아야 작은 가지가 나와. 네 옆에 벽이 없다면 내 전류도 넓게 자라지 못해. 반사점과 짧은 예고를 보고 길을 골라 줘.',tip:'실제 반사점에서 가까운 전류 하나만 나옵니다. .2초 고정 예고에서 옆으로 나가세요. 마지막 접점을 다시 잇는 준비 중 시전자를 치면 남은 핵도 사라집니다.',after:'벽에서 돌아온 빛이 조금 옆으로 자랐네. 다음 친구는 벽 대신 서로 닿은 각도를 읽는대.'},
 {id:'inspect-'+C,enemy:C,inspectionOnly:true,unlockAfter:'inspect-'+R,title:'다음 친구를 기다리는 갈림길',difficulty:'hard',before:'누군가를 맞혔다고 같은 친구를 공짜로 계속 칠 수는 없어. 닿은 면에서 돌아가는 방향에 새 친구가 있을 때만 이어져. 혼자라면 남은 각도를 내가 다시 골라야 해.',tip:'1대1에서는 자동 후속 적이 없어 전류가 끝납니다. 남은 접점과 반사 방향의 짧은 부채를 보세요. 수동 계전의 고정 선을 옆으로 피하거나 준비 중 끊을 수 있어요.',after:'이어지지 않은 전류도 실패는 아니었어. 다음에 만날 친구와 각도를 기다리는 법을 배웠네.'}
].map(Object.freeze));

const dist=(a,b)=>Math.hypot(a.x-b.x,a.y-b.y);
const norm=(x,y)=>{const m=Math.hypot(x,y)||1;return{x:x/m,y:y/m};};
function entry(a,b,p,r){const x=a.x-p.x,y=a.y-p.y,dx=b.x-a.x,dy=b.y-a.y,A=dx*dx+dy*dy,C=x*x+y*y-r*r;if(C<=0)return 0;if(A<1e-14)return null;const B=2*(x*dx+y*dy),D=B*B-4*A*C;if(D<0)return null;const t=(-B-Math.sqrt(D))/(2*A);return t>=0&&t<=1?t:null;}
export function batch33IncidentDirection(dx,dy,nx,ny){const n=norm(nx,ny),v=norm(dx,dy),dot=v.x*n.x+v.y*n.y;return norm(v.x-2*dot*n.x,v.y-2*dot*n.y);}
// Actual candidate selection. A saved direction is not a homing target.
export function batch33NextTarget(origin,direction,candidates,owner,visited,blocked){let best=null,nearest=Infinity;for(const p of candidates){const d=dist(origin,p);if(p.team===owner||p.hp<=0||p.inv>0||visited.has(p.team)||d<.05||d>2.6)continue;const v=norm(p.x-origin.x,p.y-origin.y);if(v.x*direction.x+v.y*direction.y<Math.SQRT1_2||blocked(origin,p))continue;if(d<nearest){best=p;nearest=d;}}return best;}
const owned=(q,f)=>q.owner===f.team&&q.originalOwner===f.team&&q.cast===f.final33Cast&&!q.foreign&&!q.guardReturned&&!q.hallReturned;
const core=(s,f)=>s.shots.find(q=>q.kind==='conductorCore33'&&q.life>0&&owned(q,f));
const echo=(s,f)=>s.hazards.find(h=>h.owner===f.team&&h.kind==='incidentEcho33'&&h.t>0&&h.cast===f.final33Cast);
const wind=f=>Object.assign(f,{state:'skill',t:.88,total:.88,blocking:false,inv:0});
export function batch33Melee(s,f,{step,heavy,hit,guarded}){if(hit&&!guarded&&(heavy||step===2)){f.conductorEdge33=1;f.conductorEdgeTime33=4;}}
function paidLine(s,f,kind,p,v,data,damage,ctx){ctx.area(s,f,kind,{x:p.x,y:p.y,endX:p.x+v.x*1.6,endY:p.y+v.y*1.6,dx:v.x,dy:v.y,r:.13,arm:.3,t:.44,cast:f.final33Cast,data,damage});ctx.event(s,kind==='incidentFold33'?'incidentFold33':'surfaceRelay33');}
export function batch33Action(s,f,index,ctx,ult=false){
 wind(f);
 if(index===1&&!ult){
  if(f.char===R){const q=core(s,f);if(!q?.anchor||q.data.hits>=3)return;q.life=0;paidLine(s,f,'conductorFold33',q.anchor,{x:f.fx,y:f.fy},q.data,q.ult?7:5,ctx);}
  else{const h=echo(s,f);if(!h||h.data.hits>=3||f.fx*h.dx+f.fy*h.dy<Math.SQRT1_2-1e-9)return;h.t=0;paidLine(s,f,'incidentFold33',h,{x:f.fx,y:f.fy},h.data,h.ult?8:6,ctx);}return;
 }
 const cast=f.final33Cast=(f.final33Cast||0)+1,edge=f.conductorEdge33||0;f.conductorEdge33=f.conductorEdgeTime33=0;
 for(const q of s.shots)if(q.owner===f.team&&DUEL_BATCH33_SHOTS.includes(q.kind))q.life=0;
 for(const h of s.hazards)if(h.owner===f.team&&DUEL_BATCH33_KINDS.includes(h.kind)){h.t=0;h.cancelled=true;}
 const kind=f.char===R?'conductorSend33':'incidentSend33';ctx.area(s,f,kind,{x:f.x,y:f.y,endX:f.x+f.fx*4,endY:f.y+f.fy*4,dx:f.fx,dy:f.fy,r:.12,arm:.4,t:.53,cast,edge,ult});ctx.event(s,kind);
}
function hit(s,q,f,o,ctx,lane){if(o.inv>0||q.data.hits>=3||q.data.receipts.has(lane+':'+o.team))return false;q.data.receipts.add(lane+':'+o.team);q.data.hits++;const guarded=o.blocking&&(-q.dx*o.fx-q.dy*o.fy)>-.2,n=q.damage+(q.data.edgeSpent?0:q.data.edge*2);q.data.edgeSpent=true;const ok=ctx.strike(s,f,o,n,{kind:'shot',guardDir:{x:-q.dx,y:-q.dy},stun:0,knock:0,flinch:false});ctx.event(s,'conductorImpact33');return !!ok&&!guarded;}
function emit(s,f,kind,p,v,data,damage,life,cast,ult,ctx,extra={}){if(ctx.wall(p))return;ctx.shoot(s,f,{kind,x:p.x,y:p.y,dx:v.x,dy:v.y,speed:9,life,damage,cast,originalOwner:f.team,data,ult,bouncesDone:0,leg:0,born:s.time,...extra});}
export function batch33Tick(s,dt,ctx){
 for(const f of s.fighters)if(DUEL_BATCH33[f.char]){f.conductorEdgeTime33=Math.max(0,(f.conductorEdgeTime33||0)-dt);if(!f.conductorEdgeTime33)f.conductorEdge33=0;}
 for(const h of [...s.hazards]){if(h.t<=0||!DUEL_BATCH33_KINDS.includes(h.kind))continue;const f=s.fighters[h.owner],before=h.arm;h.arm=Math.max(0,h.arm-dt);h.t-=dt;if(h.cast!==f.final33Cast){h.t=0;continue;}
  if(h.kind==='incidentEcho33')continue;
  if(h.kind!=='surfaceRelay33'&&before>0&&(f.stun>0||f.state!=='skill')){h.t=0;h.cancelled=true;continue;}
  if(h.arm>0||h.triggered||h.data?.hits>=3)continue;h.triggered=true;
  if(h.kind==='conductorSend33'||h.kind==='incidentSend33'){const data={hits:0,edge:h.edge,edgeSpent:false,receipts:new Set(),visited:new Set()};emit(s,f,f.char===R?'conductorCore33':'incidentBolt33',h,{x:h.dx,y:h.dy},data,h.ult?(f.char===R?7:11):(f.char===R?5:8),f.char===R?3:1.1,h.cast,h.ult,ctx);}
  else emit(s,f,h.kind==='incidentFold33'?'incidentBolt33':'surfaceBolt33',h,{x:h.dx,y:h.dy},h.data,h.damage,1.6/9,h.cast,h.ult,ctx,h.kind==='incidentFold33'?{manual:true,leg:1}:{});
 }
 for(const q of [...s.shots]){if(q.life<=0||!DUEL_BATCH33_SHOTS.includes(q.kind)||q.born===s.time||q.guardTurnAt===s.time||q.hallTurnAt===s.time)continue;const f=s.fighters[q.owner],o=s.fighters[1-q.owner],native=owned(q,f)&&!!DUEL_BATCH33[f.char];if(!native)q.foreign=true;if(q.data.hits>=3){q.life=0;continue;}
  let length=9*Math.min(dt,q.life);q.life-=dt;
  for(let k=0;k<3&&length>1e-8&&q.life>-dt;k++){
   const a={x:q.x,y:q.y},b={x:q.x+q.dx*length,y:q.y+q.dy*length},surface=ctx.surfaceHit(a,b),lane=q.kind+':'+q.leg;
   const at=o.inv<=0&&!q.data.receipts.has(lane+':'+o.team)?entry(a,b,o,.46):null;Object.assign(q,b);
   if(ctx.interceptShot?.(s,q,a.x,a.y,dt)){if(q.owner!==f.team){q.foreign=true;q.data.edgeSpent=true;}break;}
   if(at!==null&&(!surface||at<surface.t)&&!ctx.blocked(a,o)){
    const p={x:a.x+(b.x-a.x)*at,y:a.y+(b.y-a.y)*at};
    if(o.shield>0){Object.assign(q,p);q.owner=o.team;q.dx*=-1;q.dy*=-1;q.foreign=true;q.data.edgeSpent=true;q.life=Math.min(q.life,.6);ctx.event(s,'reflect');break;}
    const earned=hit(s,q,f,o,ctx,lane);
    if(q.kind==='incidentBolt33'){
     q.life=0;if(native&&earned){q.data.visited.add(o.team);const normal=dist(p,o)<1e-8?{x:-q.dx,y:-q.dy}:norm(p.x-o.x,p.y-o.y),v=batch33IncidentDirection(q.dx,q.dy,normal.x,normal.y),next=batch33NextTarget(p,v,s.fighters,f.team,q.data.visited,ctx.blocked);
      if(next&&q.data.hits<3){const direction=norm(next.x-p.x,next.y-p.y);emit(s,f,'incidentBolt33',p,direction,q.data,q.ult?7:5,dist(p,next)/9+.08,q.cast,q.ult,ctx);}
      else if(q.data.hits<3&&!q.manual){ctx.area(s,f,'incidentEcho33',{...p,r:.28,arm:0,t:2.2,cast:q.cast,data:q.data,dx:v.x,dy:v.y,ult:q.ult});ctx.event(s,'incidentEcho33');}
     }break;
    }
    if(q.kind==='surfaceBolt33'||q.data.hits>=3){q.life=0;break;}
   }
   if(!surface){Object.assign(q,b);break;}Object.assign(q,{x:surface.x,y:surface.y});
   if(q.kind!=='conductorCore33'||q.foreign||q.bouncesDone>=2){q.life=0;break;}
   const v=batch33IncidentDirection(q.dx,q.dy,surface.nx,surface.ny);q.dx=v.x;q.dy=v.y;q.bouncesDone++;q.leg=q.bouncesDone;q.x+=surface.nx*.004;q.y+=surface.ny*.004;length*=1-surface.t;q.anchor={x:surface.x+surface.nx*.08,y:surface.y+surface.ny*.08};ctx.event(s,'conductorBounce33');
   if(native&&q.data.hits<3&&o.inv<=0&&o.hp>0&&dist(q.anchor,o)<1.6&&!ctx.blocked(q.anchor,o)){const d=norm(o.x-q.anchor.x,o.y-q.anchor.y);ctx.area(s,f,'surfaceRelay33',{...q.anchor,endX:q.anchor.x+d.x*1.6,endY:q.anchor.y+d.y*1.6,dx:d.x,dy:d.y,r:.13,arm:.2,t:.33,cast:q.cast,data:q.data,damage:q.ult?6:4});ctx.event(s,'surfaceRelay33');}
  }
 }
}
export function batch33Ai(s,f,o,input,dt,ctx){const ai=s.ai[f.team],react={easy:.32,normal:.2,hard:.12}[s.difficulty]??.2;ai.final33Seen=(ai.final33Seen||0)+dt;if(ai.final33Seen<react)return false;const d=dist(f,o),v=norm(o.x-f.x,o.y-f.y);input.aimX=v.x;input.aimY=v.y;
 if(s.hazards.some(h=>h.owner!==f.team&&h.t>0&&!h.cancelled&&DUEL_BATCH33_KINDS.includes(h.kind))&&batch33DangerAi(s,f,input,dt))return true;
 if(d<2.8&&['attack','heavy','dash'].includes(o.state)&&!o.hitDone||s.shots.some(q=>q.owner!==f.team&&q.life>0&&dist(q,f)<3.5))return false;
 if(f.state==='idle'&&o.blocking&&d<3.1&&s.time-o.blockSince<.55){const sign=f.team?1:-1;input.x=-v.x*.45-v.y*sign;input.y=-v.y*.45+v.x*sign;return true;}
 if(f.state==='attack'&&f.hitDone&&f.step<2&&o.stun>0&&!o.blocking&&d<DUEL_BATCH33[f.char].comboReach[f.step+1]){input.attack=true;return true;}
 const q=core(s,f),h=echo(s,f);if(f.state==='idle'&&f.cd[1]<=0){if(f.char===R&&q?.anchor&&dist(q.anchor,o)<1.6&&!ctx.blocked(q.anchor,o)){const a=norm(o.x-q.anchor.x,o.y-q.anchor.y);input.aimX=a.x;input.aimY=a.y;input.skill2=true;return true;}if(f.char===C&&h&&dist(h,o)<1.6&&!ctx.blocked(h,o)){const a=norm(o.x-h.x,o.y-h.y);if(a.x*h.dx+a.y*h.dy>=Math.SQRT1_2){input.aimX=a.x;input.aimY=a.y;input.skill2=true;return true;}}}
 if(f.state==='idle'&&f.cd[0]<=0&&d>2.8&&d<8){if(f.char===C&&!ctx.blocked(f,o)){input[f.meter>=100?'ult':'skill1']=true;return true;}if(f.char===R&&!q&&s.time>=(ai.final33PlanAt||0)){ai.final33PlanAt=s.time+.18;const p=reflectionPlan(f,o,ctx,18);if(p){input.aimX=p.aim.x;input.aimY=p.aim.y;input[f.meter>=100?'ult':'skill1']=true;return true;}}}return false;
}
export function batch33DangerAi(s,f,input,dt){const ai=s.ai[f.team],h=s.hazards.find(h=>h.owner!==f.team&&h.t>0&&!h.cancelled&&['surfaceRelay33','conductorFold33','incidentFold33'].includes(h.kind)&&entry(h,{x:h.endX,y:h.endY},f,.65)!==null);if(!h){ai.final33Danger=0;return false;}ai.final33Danger=(ai.final33Danger||0)+dt;const react={easy:.32,normal:.2,hard:.12}[s.difficulty]??.2;if(ai.final33Danger<react)return false;const v=norm(-h.dy,h.dx);input.x=v.x;input.y=v.y;if(h.arm<.12&&f.dodgeCd<=0)input.dodge=true;return true;}
