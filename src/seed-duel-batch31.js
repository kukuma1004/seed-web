// Two original refractlance completions. Geometry, body/cover ordering and
// damage receipts remain physical; a turn never creates a fresh carrier budget.
const R='final-refractlance-reflect',P='final-refractlance-pierce';
const skill=(name,cooldown,desc)=>Object.freeze({name,cooldown,desc});
export const DUEL_BATCH31=Object.freeze({
 [R]:Object.freeze({id:R,comboId:R,final:true,inspectionOnly:true,artReady:false,law:'reflect',name:'각도연장',role:'세 반사 · 긴 꺾은 길 · 현재 창끝 방향 조절',hp:179,speed:4.1,reach:1.95,arc:1.1,comboReach:[1.8,2.3,2.05],comboArc:[1.1,.45,1.25],comboNames:['거울자루 베기','각진 창끝 밀기','세 면 접어 베기'],damage:[9,11,14],cadence:.42,heavy:{damage:24,reach:2.6},parry:1,tile:0,ink:'#c5ddc1',skills:[skill('세 벽을 잇는 긴 창',7.2,'실제 벽·기둥에서 최대 세 번 튕기고 적은 관통해요. 각 직선에서 한 번·전체 세 타격만. 넓은 중앙에서는 돌아올 반사면이 없어요.'),skill('현재 창끝의 각도 바꾸기',5.8,'한 번 이상 실제 반사한 자기 창이 필요해요. 현재 창끝을 멈추고 .3초 점선 준비 뒤 새 방향으로 잇습니다. 원래 남은 수명·반사·타격 기록은 유지되고, 준비 중 맞으면 창까지 사라져요.')],ult:skill('세 모서리에 남긴 약속',0,'강한 창 하나. 세 반사·세 타격·실제 꺾인 경로를 유지하며 분열이나 무한 반사는 없습니다.'),blurb:'3타·강공격의 실제 막히지 않은 적중은 다음 창 첫 접촉만 +2. 머리를 돌리는 동안 이동 경로가 멈추며 보스 탄을 지우지 않습니다.'}),
 [P]:Object.freeze({id:P,comboId:P,final:true,inspectionOnly:true,artReady:false,law:'pierce',name:'굴절송곳',role:'첫 반사에서 긴 송곳 · 좁은 반사축 · 적중 뒤 추격 찌르기',hp:176,speed:4.15,reach:2.15,arc:.8,comboReach:[1.9,2.55,2.7],comboArc:[.8,.35,.4],comboNames:['유리자루 밀기','송곳 앞끝 찌르기','긴 축 마무리'],damage:[9,11,15],cadence:.44,heavy:{damage:25,reach:2.85},parry:1,tile:1,ink:'#c5d9ec',skills:[skill('첫 모서리에서 펴지는 송곳',7.3,'처음에는 작은 씨앗으로 3 피해. 실제 첫 반사에서 긴 창으로 펴져 10 피해를 줍니다. 한 번만 반사·각 구간 한 번·좁은 .18 접촉. 반사면 없이 쏘면 긴 창이 되지 않아요.'),skill('맞힌 축으로 뒤따라 찌르기',5.9,'긴 반사창의 실제 막히지 않은 적중과 남은 창이 필요해요. 창을 소비하고 내 현재 자리에서 .3초 고정 준비 뒤 반사창 방향으로 2.8 거리·6 피해의 좁은 찌르기. 상대를 추적하지 않고 엄폐에 막히며 세 번째 타격 예산만 씁니다.')],ult:skill('한 번 꺾인 깊은 창',0,'작은 씨앗 4·첫 반사 뒤 긴 창 13·후속 찌르기 8. 한 반사와 세 타격 상한 그대로, 궁극기 비용을 먼저 냅니다.'),blurb:'3타·강공격의 실제 적중은 다음 첫 접촉만 +2. 첫 반사면과 방향을 잘 고르면 강하지만 넓은 중앙과 옆걸음에 약합니다. 몸 이동·무적·보스 경직을 얻지 않아요.'})
});
export const DUEL_BATCH31_KINDS=Object.freeze(['angleSend31','pinSend31','angleTurn31','pinFollow31']);
export const DUEL_BATCH31_SHOTS=Object.freeze(['angleSpear31','pinSpear31']);
export const DUEL_BATCH31_AUDIO=Object.freeze({angleSend31:['reflect',{pitch:.85}],angleBounce31:['reflect',{pitch:1.12}],angleTurn31:['reflect',{pitch:.72}],pinSend31:['shotPierce',{pitch:.8}],pinOpen31:['evolve',{pitch:1.2}],pinFollow31:['shotPierce',{pitch:1.15}],angleContact31:['hit',{pitch:.9}],pinContact31:['hit',{pitch:1.1}]});
export const DUEL_BATCH31_STORY=Object.freeze([
 {id:'inspect-'+R,enemy:R,inspectionOnly:true,unlockAfter:null,title:'세 모서리를 잇는 창',difficulty:'hard',before:'창은 벽에서 길을 배워. 세 번까지 방향을 바꾸지만, 없는 벽을 만들어 튕기지는 않을게. 창끝을 멈춰 돌릴 때는 나도 빈틈을 남겨.',tip:'긴 창은 실제 벽과 기둥을 세 번까지 튕깁니다. 옆으로 움직여 꺾은 직선을 피하세요. 점선 방향 조절 때 시전자를 공격하면 남은 창도 끊을 수 있어요.',after:'정원 모서리는 길을 막기만 하는 게 아니었네. 다음 친구는 여러 길보다 한 번 꺾인 길을 깊게 본대.'},
 {id:'inspect-'+P,enemy:P,inspectionOnly:true,unlockAfter:'inspect-'+R,title:'한 번 꺾여 깊어지는 길',difficulty:'hard',before:'작은 씨앗만 보고 안심하지 마. 첫 반사면을 만나면 긴 송곳으로 펴져. 대신 반사 뒤 방향은 바꾸지 않을게. 네 옆걸음에는 내 창도 쉬어야 해.',tip:'첫 반사 뒤 긴 창이 되는 순간을 보세요. 반사축의 옆으로 피하거나 실제 오는 방향을 막으세요. 후속 찌르기는 내 현재 자리에서 같은 축으로만 나가며 엄폐에 막힙니다.',after:'여러 모서리를 찾는 친구와 한 길을 깊게 읽는 나. 같은 창도 서로 다른 정원을 지킬 수 있겠구나.'}
].map(Object.freeze));
const norm=(x,y)=>{const d=Math.hypot(x,y)||1;return{x:x/d,y:y/d};},dist=(a,b)=>Math.hypot(a.x-b.x,a.y-b.y);
function entry(a,b,p,r){const x=a.x-p.x,y=a.y-p.y,dx=b.x-a.x,dy=b.y-a.y,C=x*x+y*y-r*r;if(C<=0)return 0;const A=dx*dx+dy*dy,B=2*(x*dx+y*dy),D=B*B-4*A*C;if(A<1e-14||D<0)return null;const t=(-B-Math.sqrt(D))/(2*A);return t>=0&&t<=1?t:null;}
const own=(s,f)=>s.shots.find(q=>DUEL_BATCH31_SHOTS.includes(q.kind)&&q.owner===f.team&&q.originalOwner===f.team&&q.cast===f.final31Cast&&q.life>0&&!q.foreign),wind=(f,t)=>Object.assign(f,{state:'skill',t,total:t,blocking:false,inv:0});
export function batch31Melee(s,f,{step,heavy,hit,guarded}){if(hit&&!guarded&&(heavy||step===2)){f.angleEdge31=1;f.angleEdgeTime31=4;}}
export function batch31Action(s,f,index,ctx,ult=false){
 wind(f,.82);
 if(index===1&&!ult){const q=own(s,f);if(!q||!q.bouncesDone||q.data.hits>=3||q.held)return;
  if(f.char===R){q.held=true;ctx.area(s,f,'angleTurn31',{x:q.x,y:q.y,endX:q.x+f.fx*3,endY:q.y+f.fy*3,dx:f.fx,dy:f.fy,r:.15,arm:.3,t:.42,cast:q.cast,q});ctx.event(s,'angleTurn31');}
  else if(q.data.afterEarned){q.life=0;ctx.area(s,f,'pinFollow31',{x:f.x,y:f.y,endX:f.x+q.dx*2.8,endY:f.y+q.dy*2.8,dx:q.dx,dy:q.dy,r:.18,arm:.3,t:.42,cast:q.cast,data:q.data,damage:q.ult?8:6});ctx.event(s,'pinFollow31');}return;
 }
 const cast=f.final31Cast=(f.final31Cast||0)+1;for(const q of s.shots)if(q.owner===f.team&&DUEL_BATCH31_SHOTS.includes(q.kind))q.life=0;for(const h of s.hazards)if(h.owner===f.team&&DUEL_BATCH31_KINDS.includes(h.kind))h.t=0;
 const kind=f.char===R?'angleSend31':'pinSend31',edge=f.angleEdge31||0;f.angleEdge31=f.angleEdgeTime31=0;
 ctx.area(s,f,kind,{x:f.x,y:f.y,endX:f.x+f.fx*5,endY:f.y+f.fy*5,dx:f.fx,dy:f.fy,r:.15,arm:.4,t:.52,cast,edge,ult});ctx.event(s,kind);
}
function contact(s,f,o,data,damage,v,leg,ctx){if(o.inv>0||data.hits>=3||data.legs[leg].has(o.team))return false;data.legs[leg].add(o.team);data.hits++;const block=o.blocking&&v.x*o.fx+v.y*o.fy>-.2,extra=data.edgeSpent?0:data.edge*2;data.edgeSpent=true;const ok=ctx.strike(s,f,o,damage+extra,{kind:'shot',guardDir:v,knock:0,stun:0,flinch:false});return !!ok&&!block;}
export function batch31Tick(s,dt,ctx){
 for(const f of s.fighters)if(DUEL_BATCH31[f.char]){f.angleEdgeTime31=Math.max(0,(f.angleEdgeTime31||0)-dt);if(!f.angleEdgeTime31)f.angleEdge31=0;}
 for(const h of s.hazards){if(h.t<=0||!DUEL_BATCH31_KINDS.includes(h.kind))continue;const f=s.fighters[h.owner],o=s.fighters[1-h.owner],before=h.arm;h.arm=Math.max(0,h.arm-dt);h.t-=dt;if(h.cast!==f.final31Cast||before>0&&(f.stun>0||f.state!=='skill')){h.t=0;h.cancelled=true;if(h.q)h.q.life=0;continue;}if(h.arm>0||h.triggered)continue;h.triggered=true;
  if(h.kind==='angleTurn31'){const q=h.q;if(q.life>0&&q.owner===f.team&&!q.foreign){q.dx=h.dx;q.dy=h.dy;q.held=false;}continue;}
  if(h.kind==='pinFollow31'){const b={x:h.endX,y:h.endY},at=entry(h,b,o,h.r+.35),wall=ctx.surfaceHit(h,b);if(at!==null&&(!wall||at<wall.t)&&!ctx.blocked(h,o))contact(s,f,o,h.data,h.damage,{x:-h.dx,y:-h.dy},2,ctx);continue;}
  if(ctx.wall(h))continue;ctx.shoot(s,f,{kind:f.char===R?'angleSpear31':'pinSpear31',x:h.x,y:h.y,dx:h.dx,dy:h.dy,speed:f.char===R?8:10,life:f.char===R?2.5:1.5,damage:h.ult?6:4,ult:h.ult,bouncesDone:0,leg:0,cast:h.cast,originalOwner:f.team,held:false,foreign:false,data:{hits:0,edge:h.edge,edgeSpent:false,afterEarned:0,legs:[new Set(),new Set(),new Set(),new Set()]}});
 }
 for(const q of s.shots){if(q.life<=0||!DUEL_BATCH31_SHOTS.includes(q.kind))continue;if(q.guardTurnAt===s.time||q.hallTurnAt===s.time)continue;const f=s.fighters[q.owner],o=s.fighters[1-q.owner];q.life-=dt;if(q.life<=0)continue;if(q.held)continue;const native=q.originalOwner===f.team&&q.cast===f.final31Cast&&!!DUEL_BATCH31[f.char]&&!q.foreign&&!q.guardReturned&&!q.hallReturned;if(!native)q.foreign=true;
  let remaining=q.speed*dt;
  // At most four actual surface contacts per frame; the first contact's
  // residual distance is consumed, rather than dropping low-FPS travel.
  for(let n=0;n<4&&remaining>1e-8&&q.life>0;n++){
   const a={x:q.x,y:q.y},b={x:a.x+q.dx*remaining,y:a.y+q.dy*remaining},surface=ctx.surfaceHit(a,b),at=o.inv<=0&&!q.data.legs[q.leg].has(o.team)?entry(a,b,o,(q.kind==='pinSpear31'&&q.bouncesDone?.18:.14)+.35):null;
   Object.assign(q,b);if(ctx.interceptShot?.(s,q,a.x,a.y,dt)){if(q.owner!==f.team){q.foreign=true;q.held=false;q.data.edgeSpent=true;}break;}
   if(at!==null&&(!surface||at<surface.t)&&!ctx.blocked(a,o)){
    if(o.shield>0){const p={x:a.x+(b.x-a.x)*at,y:a.y+(b.y-a.y)*at};Object.assign(q,p);if(q.foreign){q.life=0;break;}q.owner=o.team;q.dx=-q.dx;q.dy=-q.dy;q.foreign=true;q.held=false;q.life=Math.min(q.life,.6);q.data.edgeSpent=true;q.data.legs[q.leg].add(o.team);ctx.event(s,'reflect');break;}
    const damage=q.kind==='angleSpear31'?q.damage:q.bouncesDone?(q.ult?13:10):(q.ult?4:3),ok=contact(s,f,o,q.data,damage,{x:-q.dx,y:-q.dy},q.leg,ctx);if(ok&&native&&q.kind==='pinSpear31'&&q.bouncesDone)q.data.afterEarned++;ctx.event(s,q.kind==='angleSpear31'?'angleContact31':'pinContact31');
   }
   if(!surface){Object.assign(q,b);break;}
   Object.assign(q,{x:surface.x,y:surface.y});remaining*=1-surface.t;const max=q.kind==='angleSpear31'?3:1;
   if(q.foreign||q.bouncesDone>=max||q.data.hits>=3){q.life=0;break;}
   const dot=q.dx*surface.nx+q.dy*surface.ny;q.dx-=2*dot*surface.nx;q.dy-=2*dot*surface.ny;q.bouncesDone++;q.leg=q.bouncesDone;q.x+=surface.nx*.002;q.y+=surface.ny*.002;q.bouncePoint={x:q.x,y:q.y};ctx.event(s,q.kind==='angleSpear31'?'angleBounce31':'pinOpen31');
  }
 }
}
// Find a physical one-reflection route to the currently visible body. Circle
// roots are bounded (16 intervals, 8 bisections); surfaceHit remains authority.
export function batch31ReflectionPlan(f,o,ctx,maxLength){let best=null;
 const accept=aim=>{const surface=ctx.surfaceHit(f,{x:f.x+aim.x*40,y:f.y+aim.y*40});if(!surface)return;const dot=aim.x*surface.nx+aim.y*surface.ny,back={x:aim.x-2*dot*surface.nx,y:aim.y-2*dot*surface.ny},p={x:surface.x+surface.nx*.1,y:surface.y+surface.ny*.1},length=dist(f,surface)+dist(surface,o),to=dist(p,o);if(length>maxLength||ctx.blocked(p,o)||entry(p,{x:p.x+back.x*to,y:p.y+back.y*to},o,.4)===null)return;if(!best||length<best.length)best={aim,length,surface};};
 const arena=ctx.arena;if(arena)for(const [axis,bound] of [['x',arena.minX],['x',arena.maxX],['y',arena.minY],['y',arena.maxY]]){const image={x:o.x,y:o.y};image[axis]=2*bound-o[axis];accept(norm(image.x-f.x,image.y-f.y));}
 for(const c of ctx.pillars||[]){if(dist(f,c)+dist(o,c)-2*c.r>maxLength)continue;const sample=a=>{const nx=Math.cos(a),ny=Math.sin(a),p={x:c.x+nx*c.r,y:c.y+ny*c.r},aim=norm(p.x-f.x,p.y-f.y),dot=aim.x*nx+aim.y*ny,rx=aim.x-2*dot*nx,ry=aim.y-2*dot*ny,tx=o.x-p.x,ty=o.y-p.y;return{aim,error:rx*ty-ry*tx,visible:dot<-.001&&rx*tx+ry*ty>0};};let a=0,left=sample(a);for(let i=1;i<=16;i++){const end=i*Math.PI/8,right=sample(end);if(left.visible&&right.visible&&left.error*right.error<=0){let lo=a,hi=end,l=left;for(let j=0;j<8;j++){const mid=(lo+hi)/2,m=sample(mid);if(l.error*m.error<=0)hi=mid;else{lo=mid;l=m;}}accept(sample((lo+hi)/2).aim);}a=end;left=right;}}
 return best;
}
export function batch31Ai(s,f,o,input,dt,ctx){const ai=s.ai[f.team],react={easy:.32,normal:.2,hard:.12}[s.difficulty]??.2;ai.final31Seen=(ai.final31Seen||0)+dt;if(ai.final31Seen<react)return false;const d=dist(f,o);if(d<2.8&&['attack','heavy','dash'].includes(o.state)&&!o.hitDone)return false;
 // A visible incoming tell outranks a new paid cast. Waiting through the
 // normal reaction delay does not provide immediate hidden foresight.
 if(s.hazards.some(h=>h.owner!==f.team&&h.t>0&&!h.cancelled&&DUEL_BATCH31_KINDS.includes(h.kind)&&entry(h,{x:h.endX,y:h.endY},f,.65)!==null)){batch31DangerAi(s,f,input,dt);return true;}
 if(s.shots.some(q=>q.owner!==f.team&&q.life>0&&dist(q,f)<3.5))return false;
 const q=own(s,f),v=norm(o.x-f.x,o.y-f.y);input.aimX=v.x;input.aimY=v.y;
 // Do not feed a freshly raised visible guard with a front jab. Ordinary
 // sidestepping opens a different angle; no direct state/guard mutation.
 if(f.state==='idle'&&o.blocking&&d<3.1&&s.time-o.blockSince<.55){const side=f.team?1:-1;input.x=-v.x*.45-v.y*side;input.y=-v.y*.45+v.x*side;return true;}
 // Continue a real confirmed opening with the next existing melee action,
 // instead of randomly abandoning it for a slower heavy windup.
 if(f.state==='attack'&&f.hitDone&&f.step<2&&o.stun>0&&!o.blocking&&d<DUEL_BATCH31[f.char].comboReach[f.step+1]){input.attack=true;return true;}
 if(f.state==='idle'&&o.stun>0&&!o.blocking&&d<DUEL_BATCH31[f.char].comboReach[0]+.15){input.attack=true;return true;}
 if(q&&f.state==='idle'&&f.cd[1]<=0&&q.bouncesDone&&q.data.hits<3){if(f.char===R&&d>3&&q.life>.3+dist(q,o)/q.speed+.08&&!ctx.blocked(q,o)){const aim=norm(o.x-q.x,o.y-q.y);input.aimX=aim.x;input.aimY=aim.y;input.skill2=true;return true;}if(f.char===P&&q.data.afterEarned&&d<2.8&&Math.abs(v.x*q.dy-v.y*q.dx)<.18&&v.x*q.dx+v.y*q.dy>0&&!ctx.blocked(f,o)){input.skill2=true;return true;}}
 if(!q&&f.state==='idle'&&f.cd[0]<=0&&d>2.8&&d<9){
  // Plan at most once per reaction interval; never read future input or state.
  if(s.time>=(ai.final31PlanAt||0)){ai.final31PlanAt=s.time+.18;const plan=batch31ReflectionPlan(f,o,ctx,f.char===R?18:13);if(plan){input.aimX=plan.aim.x;input.aimY=plan.aim.y;input[f.meter>=100?'ult':'skill1']=true;return true;}}
 }return false;
}
export function batch31DangerAi(s,f,input,dt){const ai=s.ai[f.team],react={easy:.32,normal:.2,hard:.12}[s.difficulty]??.2;let ray;for(const h of s.hazards)if(h.owner!==f.team&&h.t>0&&DUEL_BATCH31_KINDS.includes(h.kind)){const at=entry(h,{x:h.endX,y:h.endY},f,.65);if(at!==null){ray=h;break;}}if(!ray){ai.final31Danger=0;return false;}ai.final31Danger=(ai.final31Danger||0)+dt;if(ai.final31Danger<react)return false;input.x=-ray.dy;input.y=ray.dx;if(ray.arm<.16&&f.dodgeCd<=0)input.dodge=true;return true;}
