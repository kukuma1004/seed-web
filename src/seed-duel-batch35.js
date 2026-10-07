import {batch31ReflectionPlan} from './seed-duel-batch31.js';

// Canonical echo-lane branches deliberately disagree about the way home:
// direct-home never consumes old vertices; retrace cannot skip a saved vertex.
const R='final-echolane-reflect',C='final-echolane-recall';
const skill=(name,cooldown,desc)=>Object.freeze({name,cooldown,desc});
export const DUEL_BATCH35=Object.freeze({
 [R]:Object.freeze({id:R,comboId:R,final:true,inspectionOnly:true,artReady:false,law:'reflect',name:'회귀당구',role:'실제 반동 · 마지막 자리에서 곧장 귀환',hp:177,speed:4.2,reach:1.9,arc:1.05,comboReach:[1.7,2.1,2.3],comboArc:[1.15,.45,1.25],comboNames:['당구잎 옆베기','귀환고리 밀기','세 모서리 돌리기'],damage:[9,11,14],cadence:.4,heavy:{damage:24,reach:2.5},parry:1,tile:0,ink:'#d8e3c5',skills:[skill('세 모서리, 하나의 귀환선',7.2,'물리탄 하나가 실제 벽·기둥을 세 번까지 튕깁니다. 출격 1.8초 또는 세 반동 뒤 마지막 자리에서 현재 몸으로 직접 돌아와요. 지난 꼭짓점은 되짚지 않고, 귀환길의 기둥에 막히면 끝납니다.'),skill('지금 모서리에서 일찍 거두기',5.7,'실제 한 번 이상 반사한 자기 출격탄만 .28초 멈춰 준비한 뒤 직접 귀환. 탄의 현재 자리·전체 수명·출격 한 타격과 귀환 한 타격 예산을 그대로 씁니다. 준비 중 맞으면 탄도 사라집니다.')],ult:skill('마지막 면의 빠른 회수',0,'강한 출격탄과 귀환탄. 세 실제 반동·각 길 한 타격·전체 5.8초 상한은 그대로이며, 몸 캐치 뒤 무료 재출격은 없습니다.'),blurb:'3타·강공격의 실제 적중은 다음 첫 피해에 +2. 직접 귀환선은 현재 몸으로 이어지지만 지나온 반사선을 다시 훑지 않아요. 실제 몸을 만나야 거두고, 벽 없는 긴 출격은 시간 안에 끝납니다.'}),
 [C]:Object.freeze({id:C,comboId:C,final:true,inspectionOnly:true,artReady:false,law:'recall',name:'되짚는궤적',role:'실제 꼭짓점 역순 · 마지막 몸 캐치',hp:178,speed:4.1,reach:1.85,arc:1.1,comboReach:[1.8,2.3,2.1],comboArc:[1,.4,1.4],comboNames:['궤적자루 가로긋기','기억끝 찌르기','귀소잎 접기'],damage:[10,10,14],cadence:.42,heavy:{damage:23,reach:2.45},parry:1,tile:1,ink:'#c4dbef',skills:[skill('지나온 두 꼭짓점 되짚기',7.3,'실제 반사점 두 개까지 기억하는 물리탄 하나. 돌아올 때 꼭짓점을 역순으로 밟고 원래 출발점까지 되짚습니다. 그 뒤 마지막 회수 구간만 현재 몸을 따라가요. 출격 한 타격·귀환 한 타격만.'),skill('남은 기억길 서둘러 거두기',5.8,'기록된 꼭짓점을 되짚는 자기 탄이 있을 때만 .28초 고정 준비. 남은 길을 11에서 13.5 속도로 걷습니다. 꼭짓점·원래 수명·피해 예산은 늘리지 않고 준비 중 맞으면 탄도 사라집니다.')],ult:skill('반대 방향으로 지우는 회랑',0,'강한 출격과 귀환. 실제 두 꼭짓점·고정 출발점·마지막 몸 캐치 순서는 그대로. 새 통로나 무료 재타격을 만들지 않습니다.'),blurb:'3타·강공격의 실제 적중은 다음 첫 피해에 +2. 몸을 옮겨도 기록한 모서리는 움직이지 않아요. 오래된 길에서는 미리 피해 가고, 마지막 회수만 현재 몸을 향하는 점을 읽어 주세요.'})
});
export const DUEL_BATCH35_KINDS=Object.freeze(['directSend35','retraceSend35','directRecall35','retraceRush35']);
export const DUEL_BATCH35_SHOTS=Object.freeze(['directEcho35','retraceEcho35']);
export const DUEL_BATCH35_AUDIO=Object.freeze({directSend35:['shotReturn',{pitch:.85}],retraceSend35:['shotCrystal',{pitch:.95}],echoBounce35:['reflect',{pitch:1.05}],directRecall35:['shotReturn',{pitch:1.2}],retraceRush35:['shotReturn',{pitch:1.05}],echoReverse35:['reflect',{pitch:.8}],echoCatch35:['shotReturn',{pitch:1.3}],echoImpact35:['hit',{pitch:.95}]});
export const DUEL_BATCH35_STORY=Object.freeze([
 {id:'inspect-'+R,enemy:R,inspectionOnly:true,unlockAfter:null,title:'마지막 모서리에서 집까지',difficulty:'hard',before:'여러 면을 돌아보고 나면 이제 곧장 집으로 갈래. 예전에 밟은 모서리는 기억해도 다시 걷지 않아. 집 앞에 기둥이 있다면 나도 통과할 수는 없어.',tip:'마지막 반사점에서 현재 몸으로 이어지는 직접 귀환선을 읽으세요. 지난 꺾은선에는 자동 재타격이 없습니다. 일찍 거두는 .28초 준비를 치면 원래 탄도 취소됩니다.',after:'돌아오는 길이 짧아도 지나온 길을 다시 걷는 건 아니구나. 다음 친구는 바로 그 길을 거꾸로 걸어 본대.'},
 {id:'inspect-'+C,enemy:C,inspectionOnly:true,unlockAfter:'inspect-'+R,title:'지나온 모서리를 거꾸로',difficulty:'hard',before:'내 발자국은 네 다음 움직임을 몰라. 마지막 모서리부터 첫 모서리와 출발점까지 그대로 돌아갈 거야. 그때에야 지금의 나를 찾아갈 수 있지.',tip:'실제 반사점과 출발점은 고정입니다. 몸이 이동해도 그 길은 움직이지 않으며, 마지막 구간만 몸을 따라갑니다. 서두르기는 길을 건너뛰는 순간이동이 아닙니다.',after:'집까지 바로 가는 친구와 발자국을 돌아보는 친구. 같은 메아리에서도 서로 다른 귀소법을 찾았네.'}
].map(Object.freeze));

const dist=(a,b)=>Math.hypot(a.x-b.x,a.y-b.y);
const norm=(x,y)=>{const m=Math.hypot(x,y)||1;return{x:x/m,y:y/m};};
function entry(a,b,p,r){const x=a.x-p.x,y=a.y-p.y,dx=b.x-a.x,dy=b.y-a.y,A=dx*dx+dy*dy,C=x*x+y*y-r*r;if(C<=0)return 0;if(A<1e-14)return null;const B=2*(x*dx+y*dy),D=B*B-4*A*C;if(D<0)return null;const t=(-B-Math.sqrt(D))/(2*A);return t>=0&&t<=1?t:null;}
const owned=(q,f)=>q.owner===f.team&&q.originalOwner===f.team&&q.cast===f.final35Cast&&!q.foreign&&!q.guardReturned&&!q.hallReturned;
const own=(s,f)=>s.shots.find(q=>DUEL_BATCH35_SHOTS.includes(q.kind)&&q.life>0&&owned(q,f));
const point=p=>({x:p.x+p.nx*.006,y:p.y+p.ny*.006});
function home(q,f){q.leg=1;if(q.kind==='directEcho35')q.mode='home';else{q.cursor=q.points.length-1;if(q.cursor>=0&&dist(q,point(q.points[q.cursor]))<.012)q.cursor--;q.mode=q.cursor>=0?'trace':'launch';}q.returned=true;}
export function batch35CanAction(s,f,index,ult=false){if(ult||index!==1)return true;const q=own(s,f);return !!q&&q.data.hits<2&&!q.paid&&(f.char===R?q.mode==='out'&&q.bouncesDone>0:q.mode==='trace'&&q.cursor>=0)&&q.life>.28;}
export function batch35Melee(s,f,{step,heavy,hit,guarded}){if(hit&&!guarded&&(heavy||step===2)){f.echoEdge35=1;f.echoEdgeTime35=4;}}
export function batch35Action(s,f,index,ctx,ult=false){
 if(!batch35CanAction(s,f,index,ult))return false;
 Object.assign(f,{state:'skill',t:.78,total:.78,blocking:false,inv:0});
 if(index===1&&!ult){const q=own(s,f),kind=f.char===R?'directRecall35':'retraceRush35',end=f.char===R?f:point(q.points[q.cursor]);q.paid=true;q.resumeMode=q.mode;q.mode='paused';ctx.area(s,f,kind,{x:q.x,y:q.y,endX:end.x,endY:end.y,dx:q.dx,dy:q.dy,r:.15,arm:.28,t:.41,cast:q.cast,castHp:f.hp,shot:q});ctx.event(s,kind);return true;}
 f.final35Cast=(f.final35Cast||0)+1;
 for(const q of s.shots)if(q.owner===f.team&&DUEL_BATCH35_SHOTS.includes(q.kind))q.life=0;
 for(const h of s.hazards)if(h.owner===f.team&&DUEL_BATCH35_KINDS.includes(h.kind)){h.t=0;h.cancelled=true;}
 const kind=f.char===R?'directSend35':'retraceSend35',edge=f.echoEdge35||0;f.echoEdge35=f.echoEdgeTime35=0;
 ctx.area(s,f,kind,{x:f.x,y:f.y,dx:f.fx,dy:f.fy,endX:f.x+f.fx*5,endY:f.y+f.fy*5,r:.15,arm:.4,t:.53,cast:f.final35Cast,castHp:f.hp,edge,ult});ctx.event(s,kind);return true;
}
function turn(q,nx,ny){const d=q.dx*nx+q.dy*ny,v=norm(q.dx-2*d*nx,q.dy-2*d*ny);q.dx=v.x;q.dy=v.y;}
function hit(s,q,f,o,ctx){const key=q.leg+':'+o.team;if(o.inv>0||q.data.hits>=2||q.data.receipts.has(key))return;q.data.receipts.add(key);q.data.hits++;const damage=(q.leg===0?q.damage:q.backDamage)+(q.foreign||q.data.edgeSpent?0:q.data.edge*2);q.data.edgeSpent=true;ctx.strike(s,f,o,damage,{kind:'shot',guardDir:{x:-q.dx,y:-q.dy},stun:0,knock:0,flinch:false});ctx.event(s,'echoImpact35');}
export function batch35Tick(s,dt,ctx){
 for(const f of s.fighters)if(DUEL_BATCH35[f.char]){f.echoEdgeTime35=Math.max(0,(f.echoEdgeTime35||0)-dt);if(!f.echoEdgeTime35)f.echoEdge35=0;}
 for(const h of s.hazards){if(h.t<=0||!DUEL_BATCH35_KINDS.includes(h.kind))continue;const f=s.fighters[h.owner];h.t-=dt;h.arm=Math.max(0,h.arm-dt);if(h.cast!==f.final35Cast||f.hp<=0||!h.triggered&&(f.stun>0||f.state!=='skill'||f.hp<h.castHp)){h.t=0;h.cancelled=true;if(h.shot)h.shot.life=0;continue;}if(h.arm>0||h.triggered)continue;h.triggered=true;
  if(h.shot){const q=h.shot;if(!owned(q,f)||q.life<=0||q.mode!=='paused'){h.cancelled=true;continue;}if(h.kind==='directRecall35')home(q,f);else{q.mode=q.resumeMode;q.speed=13.5;}continue;}
  if(ctx.wall(h))continue;
  ctx.shoot(s,f,{kind:f.char===R?'directEcho35':'retraceEcho35',x:h.x,y:h.y,dx:h.dx,dy:h.dy,speed:11,life:5.8,damage:h.ult?9:7,backDamage:h.ult?8:6,originalOwner:f.team,cast:h.cast,data:{hits:0,receipts:new Set(),edge:h.edge,edgeSpent:false},points:[],launch:{x:h.x,y:h.y},cursor:-1,mode:'out',leg:0,bouncesDone:0,outAge:0,deadline:f.char===R?1.8:1.55,born:s.time,paid:false});
 }
 for(const q of s.shots){if(q.life<=0||!DUEL_BATCH35_SHOTS.includes(q.kind)||q.born===s.time||q.guardTurnAt===s.time||q.hallTurnAt===s.time)continue;const f=s.fighters[q.owner],o=s.fighters[1-q.owner];let native=owned(q,f)&&!!DUEL_BATCH35[f.char];if(!native){q.foreign=true;q.mode='foreign';q.data.edgeSpent=true;}let time=Math.min(dt,q.life);q.life-=dt;if(q.mode==='paused')continue;
  for(let k=0;k<8&&time>1e-8&&q.life>-dt;k++){
   const target=native?(q.mode==='trace'?point(q.points[q.cursor]):q.mode==='launch'?q.launch:['home','catch'].includes(q.mode)?f:null):null;
   if(target){const v=norm(target.x-q.x,target.y-q.y);q.dx=v.x;q.dy=v.y;}
   let elapsed=time;if(q.mode==='out')elapsed=Math.min(elapsed,Math.max(0,q.deadline-q.outAge));
   const toTarget=target?dist(q,target):Infinity,length=Math.min(q.speed*elapsed,toTarget),a={x:q.x,y:q.y},b={x:q.x+q.dx*length,y:q.y+q.dy*length},world=ctx.surfaceHit(a,b);
   let at=1,kind='travel';if(world){at=world.t;kind='world';}
   const body=o.hp>0&&o.inv<=0&&q.data.hits<2&&!q.data.receipts.has(q.leg+':'+o.team)?entry(a,b,o,.46):null;
   if(body!==null&&body<at){at=body;kind='body';}
   const catchAt=native&&['home','catch'].includes(q.mode)?entry(a,b,f,.34):null;if(catchAt!==null&&catchAt<at){at=catchAt;kind='catch';}
   const used=length/q.speed*at;Object.assign(q,{x:a.x+(b.x-a.x)*at,y:a.y+(b.y-a.y)*at});time=Math.max(0,time-used);if(q.mode==='out')q.outAge+=used;
   const intercepted=ctx.interceptShot?.(s,q,a.x,a.y,used),changed=q.owner!==f.team||q.guardReturned||q.hallReturned;
   if(intercepted||changed){if(changed){q.foreign=true;q.mode='foreign';q.data.edgeSpent=true;}break;}
   if(kind==='catch'){q.life=0;q.caught=true;ctx.event(s,'echoCatch35');break;}
   if(kind==='body'){if(o.shield>0){q.owner=o.team;q.dx*=-1;q.dy*=-1;q.foreign=true;q.mode='foreign';q.data.edgeSpent=true;q.life=Math.min(q.life,.6);ctx.event(s,'reflect');break;}hit(s,q,f,o,ctx);q.x+=q.dx*.004;q.y+=q.dy*.004;continue;}
   if(kind==='world'){if(!native||q.mode!=='out'){q.life=0;q.blockedReturn=q.leg===1;break;}q.points.push({x:world.x,y:world.y,nx:world.nx,ny:world.ny});q.bouncesDone++;turn(q,world.nx,world.ny);q.x+=world.nx*.006;q.y+=world.ny*.006;ctx.event(s,'echoBounce35');if(q.bouncesDone>=(q.kind==='directEcho35'?3:2)){home(q,f);ctx.event(s,q.kind==='directEcho35'?'directRecall35':'echoReverse35');}continue;}
   if(target&&length>=toTarget-1e-8){if(q.mode==='trace'){q.cursor--;q.mode=q.cursor>=0?'trace':'launch';}else if(q.mode==='launch'){q.mode='catch';}else{q.life=0;q.caught=true;ctx.event(s,'echoCatch35');break;}continue;}
   if(q.mode==='out'&&q.outAge>=q.deadline-1e-8){if(q.bouncesDone){home(q,f);ctx.event(s,q.kind==='directEcho35'?'directRecall35':'echoReverse35');}else q.life=0;continue;}
   // No event remains on this physically swept segment. This consumes the
   // remaining frame even when a zero-length target has already been handled.
   break;
  }
 }
}
export function batch35Ai(s,f,o,input,dt,ctx){const ai=s.ai[f.team],react={easy:.32,normal:.2,hard:.12}[s.difficulty]??.2;if(ai.final35SeenAt!==s.time){ai.final35SeenAt=s.time;ai.final35Seen=(ai.final35Seen||0)+dt;}if(ai.final35Seen<react)return false;const d=dist(f,o),v=norm(o.x-f.x,o.y-f.y);input.aimX=v.x;input.aimY=v.y;
 if(batch35DangerAi(s,f,input,dt))return true;
 if(d<2.8&&['attack','heavy','dash'].includes(o.state)&&!o.hitDone||s.shots.some(q=>q.owner!==f.team&&q.life>0&&dist(q,f)<3.5))return false;
 if(f.state==='idle'&&o.blocking&&d<3.1&&s.time-o.blockSince<.55){const side=f.team?1:-1;input.x=-v.x*.45-v.y*side;input.y=-v.y*.45+v.x*side;return true;}
 if(f.state==='attack'&&f.hitDone&&f.step<2&&o.stun>0&&!o.blocking&&d<DUEL_BATCH35[f.char].comboReach[f.step+1]){input.attack=true;return true;}
 const q=own(s,f);if(q&&f.state==='idle'&&f.cd[1]<=0&&batch35CanAction(s,f,1)){if(f.char===R&&dist(q,f)>3&&!ctx.blocked(q,f)||f.char===C&&q.cursor>=0&&dist(q,point(q.points[q.cursor]))>2){input.skill2=true;return true;}}
 if(!q&&f.state==='idle'&&f.cd[0]<=0&&d>2.8&&d<8&&s.time>=(ai.final35PlanAt||0)){ai.final35PlanAt=s.time+.18;const p=batch31ReflectionPlan(f,o,ctx,17);if(p){input.aimX=p.aim.x;input.aimY=p.aim.y;input[f.meter>=100?'ult':'skill1']=true;return true;}if(!ctx.blocked(f,o)){input[f.meter>=100?'ult':'skill1']=true;return true;}}return false;
}
export function batch35DangerAi(s,f,input,dt){const ai=s.ai[f.team],h=s.hazards.find(h=>h.owner!==f.team&&h.t>0&&!h.cancelled&&!h.triggered&&DUEL_BATCH35_KINDS.includes(h.kind)&&entry(h,{x:h.endX,y:h.endY},f,.65)!==null);if(!h){ai.final35Danger=0;ai.final35DangerThreat=null;return false;}if(ai.final35DangerThreat!==h){ai.final35DangerThreat=h;ai.final35Danger=0;ai.final35DangerAt=undefined;}if(ai.final35DangerAt!==s.time){ai.final35DangerAt=s.time;ai.final35Danger=(ai.final35Danger||0)+dt;}const react={easy:.32,normal:.2,hard:.12}[s.difficulty]??.2;if(ai.final35Danger<react)return false;const v=norm(-(h.endY-h.y),h.endX-h.x);input.x=v.x;input.y=v.y;if(h.arm<.14&&f.dodgeCd<=0)input.dodge=true;return true;}
