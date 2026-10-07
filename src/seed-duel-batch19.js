// Canonical FUSION19: echolane wall/body shuttles; rimepetal's passive
// passed[first] exclusion is strict. Manual three-petal focusing is a NEW PAID
// technique, not a covert passive bloom or duplicate enemy registry.
const skill=(name,cooldown,desc)=>Object.freeze({name,cooldown,desc});
export const DUEL_BATCH19=Object.freeze({
 echolane:Object.freeze({id:'echolane',comboId:'echolane',inspectionOnly:true,artReady:false,law:'reflect',name:'메아리 회랑',role:'실제 벽 · 현재 몸을 스치는 유한 왕복',hp:175,speed:4.2,reach:1.9,arc:1,comboReach:[1.65,2.05,2.2],comboArc:[1.1,.55,1.25],comboNames:['회랑잎 베기','귀환고리 밀기','벽향 자루 돌리기'],damage:[9,10,14],cadence:.39,heavy:{damage:24,reach:2.4},parry:1,tile:0,ink:'#c4d5d9',skills:[skill('벽과 몸 사이의 메아리',6.5,'물리 탄 하나가 실제 벽에 닿아야 현재 몸으로 귀환. 실제로 몸을 스쳐야 처음 방향으로 재출발하며 왕복 전환 세 번·적중 총 네 번만 허용'),skill('돌아오는 메아리 방향 바꾸기',5.2,'자기 탄이 실제 돌아오는 동안 .28초 준비. 현재 몸에서 다시 나갈 방향만 바꾸며 탄을 손으로 옮기거나 몸 캐치를 건너뛰지 않아요')],ult:skill('네 방향의 짧은 메아리',0,'실제 네 물리 탄과 몸 캐치 경로. 탄마다 전환 세 번, 네 탄이 적중 총 네 번을 공유하므로 벽이 멀면 살아 있는 경로가 적어요'),blurb:'3타·강공격은 다음 탄 무리의 첫 접촉만 +2. 벽 없는 곳에서는 귀환이 늦고, 몸을 벗어나거나 방어 방향을 바꾸면 실제 왕복이 어긋나요.'}),
 rimepetal:Object.freeze({id:'rimepetal',comboId:'rimepetal',inspectionOnly:true,artReady:false,law:'frost',name:'서리 꽃잎',role:'첫 상대를 제외한 꽃잎 · 유료 세 꽃잎 재조준',hp:174,speed:4.1,reach:1.85,arc:1.15,comboReach:[1.7,1.9,2.2],comboArc:[1.15,.5,1.25],comboNames:['서리봉오리 베기','꽃대 모서리 찌르기','세 잎자루 펼치기'],damage:[9,11,14],cadence:.4,heavy:{damage:23,reach:2.4},parry:1,tile:5,ink:'#cad5dc',skills:[skill('첫 상대를 지나치는 서리꽃잎',6.7,'물리 봉오리의 실제 막히지 않은 접촉 뒤 네 물리 꽃잎. 원본처럼 첫 상대를 제외하므로 상대가 하나면 자동 꽃잎 재적중·자동 만개 없음'),skill('남은 세 꽃잎 수동 모으기',5.5,'새 유료 기술. 실제 남은 자기 꽃잎 세 장을 소비해 각자의 현재 자리에서 .32초 고정 예고 뒤 조준점으로 물리 냉기탄. 서로 다른 세 탄이 1.5초 안에 막히지 않고 실제로 맞아야 늦은 고정 서리꽃')],ult:skill('큰 봉오리와 남은 서리잎',0,'강한 봉오리 하나와 네 유한 꽃잎도 첫 상대 제외를 유지해요. 수동 세 꽃잎은 별도 유료 기술이고 보스 동결·준비 방해는 없어요'),blurb:'3타·강공격은 다음 봉오리 첫 접촉만 +2. 자동 꽃잎은 혼자 상대에게 만개하지 않아요. 새 유료 기술의 세 탄도 막기·회피·엄폐·준비 취소로 연결을 끊을 수 있어요.'})
});
export const DUEL_BATCH19_KINDS=Object.freeze(['echoSend19','echoAim19','rimeSend19','rimeSplit19','rimeFocus19','rimeBloom19']);
export const DUEL_BATCH19_SHOTS=Object.freeze(['echoLane19','rimeBud19','rimePetal19','rimeFocusBolt19']);
export const DUEL_BATCH19_AUDIO=Object.freeze({echoSend19:['shotReturn',{pitch:.85}],echoWall19:['reflect',{pitch:.9}],echoCatch19:['shotReturn',{pitch:1.1}],echoAim19:['shotCrystal',{pitch:1.1}],rimeSend19:['shotFrost',{pitch:.9}],rimeSplit19:['split',{pitch:1.1}],rimeFocus19:['shotFrost',{pitch:1.1}],rimeBloom19:['frostHit',{pitch:.8}]});
export const DUEL_BATCH19_STORY=Object.freeze([
 ['echolane','몸을 만나야 다시 열리는 회랑','벽만 만났다고 다음 길이 생기지는 않아. 돌아온 메아리가 지금의 나를 실제로 스쳐야 처음 길을 열지. 나도 돌아오는 탄에서 벗어날 수 있겠지?','실제 벽과 현재 몸을 잇는 유한 경로예요. 귀환탄의 방향을 보고 막거나 움직여 피하세요. 몸 캐치가 없는 곳에서는 재출발도 없고 재조준 준비는 공격으로 끊을 수 있어요.','같은 길이라도 내가 움직이면 다른 회랑이 되는구나. 다음 서리꽃도 없는 접촉을 세어서는 안 되겠지?'],
 ['rimepetal','자동 꽃과 수동 꽃 사이','처음 맞힌 친구는 내 꽃잎이 다시 세지 않아. 혼자라면 꽃이 자동으로 피지 않는 거야. 실제 남은 세 잎을 손수 조준해 볼게, 물론 그동안 내 꽃대는 비어 있겠지!','첫 상대 제외라는 원본 약점을 유지했어요. 세 꽃잎 수동 모으기는 별도 유료 기술이고 실제 세 탄 접촉을 요구해요. 예고를 보고 걷거나 막거나 준비를 끊으면 늦은 고정 꽃을 얻지 못해요.','혼자 있는 친구에게 자동 만개를 약속하는 대신 남은 세 잎을 소중히 골랐어. 실제로 맞지 않으면 꽃도 피지 않는다는 걸 기억할게.']
].map(([enemy,title,before,tip,after],i,a)=>Object.freeze({id:'inspect-'+enemy,enemy,inspectionOnly:true,unlockAfter:i?'inspect-'+a[i-1][0]:null,title,difficulty:'hard',before,tip,after})));
const norm=(x,y)=>{const d=Math.hypot(x,y)||1;return{x:x/d,y:y/d};},dist=(a,b)=>Math.hypot(a.x-b.x,a.y-b.y);
const segment=(a,b,p)=>{const x=b.x-a.x,y=b.y-a.y,k=Math.max(0,Math.min(1,((p.x-a.x)*x+(p.y-a.y)*y)/(x*x+y*y||1)));return Math.hypot(p.x-a.x-x*k,p.y-a.y-y*k);};
const guarded=(o,v)=>o.blocking&&v.x*o.fx+v.y*o.fy>-.2;
const windup=(f,t)=>Object.assign(f,{state:'skill',total:t,t,blocking:false,inv:0});
const ownShots=(s,f,kind)=>s.shots.filter(q=>q.kind===kind&&q.life>0&&q.owner===f.team&&q.originalOwner===f.team&&q.cast===f.fusion19Cast&&!q.guardReturned&&!q.hallReturned);
const EDGES=Object.freeze(['echoEdge19','rimeEdge19']);
const strike=(s,f,o,damage,dir,ctx,flinch=true)=>ctx.strike(s,f,o,damage,{kind:'shot',guardDir:dir,knock:0,stun:s.boss&&o.team===1||!flinch?0:.06,flinch:!(s.boss&&o.team===1)&&flinch});
export function batch19Melee(s,f,{step,heavy,hit,guarded:block}){if(!hit||block||!heavy&&step!==2)return;const key={echolane:'echoEdge19',rimepetal:'rimeEdge19'}[f.char];if(key){f[key]=1;f[key+'Time']=4;}}
export function batch19Action(s,f,index,ctx,ult=false){
 if(index===1&&!ult){
  if(f.char==='echolane'){windup(f,.67);const q=ownShots(s,f,'echoLane19').find(q=>q.toSeed);if(q){ctx.area(s,f,'echoAim19',{x:f.x,y:f.y,fromX:q.x,fromY:q.y,dx:f.fx,dy:f.fy,endX:f.x+f.fx*7,endY:f.y+f.fy*7,r:.16,arm:.28,t:.39,cast:f.fusion19Cast,shot:q});ctx.event(s,'echoAim19');}}
  else if(f.char==='rimepetal'){windup(f,.74);const petals=ownShots(s,f,'rimePetal19').slice(0,3);if(petals.length===3){const o=s.fighters[1-f.team],d=dist(f,o),end={x:f.x+f.fx*d,y:f.y+f.fy*d};for(const q of petals)q.life=0;ctx.area(s,f,'rimeFocus19',{x:f.x,y:f.y,r:.16,origins:petals.map(q=>({x:q.x,y:q.y})),endX:end.x,endY:end.y,arm:.32,t:.43,cast:f.fusion19Cast,family:{hits:0,firstAt:0,expires:0,bloomed:false,spawns:0,maxHits:3}});ctx.event(s,'rimeFocus19');}}return;
 }
 const cast=f.fusion19Cast=(f.fusion19Cast||0)+1,key=f.char==='echolane'?'echoEdge19':'rimeEdge19',edge=f[key]||0;f[key]=f[key+'Time']=0;
 for(const h of s.hazards)if(h.owner===f.team&&DUEL_BATCH19_KINDS.includes(h.kind)){h.t=0;h.cancelled=true;}
 for(const q of s.shots)if(q.owner===f.team&&DUEL_BATCH19_SHOTS.includes(q.kind))q.life=0;
 if(f.char==='echolane'){windup(f,.78);ctx.area(s,f,'echoSend19',{x:f.x,y:f.y,dx:f.fx,dy:f.fy,endX:f.x+f.fx*8,endY:f.y+f.fy*8,r:.18,arm:.4,t:.51,cast,ult,edge});ctx.event(s,'echoSend19');}
 else if(f.char==='rimepetal'){windup(f,.76);ctx.area(s,f,'rimeSend19',{x:f.x,y:f.y,dx:f.fx,dy:f.fy,endX:f.x+f.fx*8,endY:f.y+f.fy*8,r:.2,arm:.41,t:.52,cast,ult,edge});ctx.event(s,'rimeSend19');}
}
export function batch19InterceptShot(){return false;}
export function batch19Tick(s,dt,ctx){
 for(const f of s.fighters)for(const key of EDGES){f[key+'Time']=Math.max(0,(f[key+'Time']||0)-dt);if(!f[key+'Time'])f[key]=0;}
 for(const h of [...s.hazards]){if(!DUEL_BATCH19_KINDS.includes(h.kind)||h.t<=0)continue;const before=h.arm;h.arm=Math.max(0,h.arm-dt);h.t-=dt;const f=s.fighters[h.owner],o=s.fighters[1-h.owner];if(before>0&&!['rimeSplit19','rimeBloom19'].includes(h.kind)&&(f.stun>0||f.state!=='skill'||f.fusion19Cast!==h.cast)){h.cancelled=true;h.t=0;continue;}if(h.arm>0||h.triggered)continue;h.triggered=true;
  if(h.kind==='echoSend19'){const family={hits:0,maxHits:4,spawns:0,edge:h.edge,edgeSpent:false};for(const off of h.ult?[0,Math.PI*.5,Math.PI,Math.PI*1.5]:[0]){const a=Math.atan2(h.dy,h.dx)+off,dx=Math.cos(a),dy=Math.sin(a),count=s.shots.length;ctx.shoot(s,f,{kind:'echoLane19',x:h.x,y:h.y,dx,dy,outX:dx,outY:dy,speed:10,life:3.3,damage:h.ult?8:6,pass:0,maxPass:3,toSeed:false,originalOwner:f.team,cast:h.cast,family});if(s.shots.length>count)family.spawns++;}}
  else if(h.kind==='echoAim19'){const q=h.shot;if(q.kind==='echoLane19'&&q.life>0&&q.toSeed&&q.owner===h.owner&&q.originalOwner===h.owner&&q.cast===h.cast&&!q.guardReturned&&!q.hallReturned){q.outX=h.dx;q.outY=h.dy;q.aimChanged=true;}}
  else if(h.kind==='rimeSend19')ctx.shoot(s,f,{kind:'rimeBud19',x:h.x,y:h.y,dx:h.dx,dy:h.dy,speed:10,life:.85,damage:(h.ult?10:8)+h.edge*2,originalOwner:f.team,cast:h.cast,ult:h.ult});
  else if(h.kind==='rimeSplit19'){if(f.fusion19Cast!==h.cast)continue;h.generated=0;for(let i=0;i<4;i++){const a=Math.atan2(h.dy,h.dx)+(i-1.5)*(Math.PI*1.2/3),count=s.shots.length;ctx.shoot(s,f,{kind:'rimePetal19',x:h.x,y:h.y,dx:Math.cos(a),dy:Math.sin(a),speed:9,life:.8,damage:4,originalOwner:f.team,cast:h.cast,generation:1,firstTarget:h.firstTarget});if(s.shots.length>count)h.generated++;}ctx.event(s,'rimeSplit19');}
  else if(h.kind==='rimeFocus19'){for(let i=0;i<h.origins.length;i++){const p=h.origins[i],v=norm(h.endX-p.x,h.endY-p.y),count=s.shots.length;ctx.shoot(s,f,{kind:'rimeFocusBolt19',x:p.x,y:p.y,dx:v.x,dy:v.y,speed:9,life:.85,damage:4,originalOwner:f.team,cast:h.cast,focusId:i,family:h.family});if(s.shots.length>count)h.family.spawns++;}}
  else if(h.kind==='rimeBloom19'){const dir=norm(h.x-o.x,h.y-o.y);if(o.inv<=0&&dist(h,o)<h.r&&!ctx.blocked(h,o)){const block=guarded(o,dir);if(strike(s,f,o,10,dir,ctx,false)&&!block&&!(s.boss&&o.team===1))o.slow=Math.max(o.slow,.22);}ctx.event(s,'rimeBloom19');}
 }
 for(const q of [...s.shots]){if(!DUEL_BATCH19_SHOTS.includes(q.kind)||q.life<=0||q.guardTurnAt===s.time||q.hallTurnAt===s.time)continue;const f=s.fighters[q.owner],o=s.fighters[1-q.owner],owned=q.originalOwner===f.team&&q.cast===f.fusion19Cast&&!!DUEL_BATCH19[f.char],a={x:q.x,y:q.y};q.life-=dt;
  if(q.kind==='echoLane19'&&q.toSeed&&owned){const v=norm(f.x-q.x,f.y-q.y);q.dx=v.x;q.dy=v.y;}
  const b={x:q.x+q.dx*q.speed*dt,y:q.y+q.dy*q.speed*dt};Object.assign(q,b);if(ctx.interceptShot?.(s,q,a.x,a.y,0))continue;const surface=ctx.surfaceHit?.(a,b);
  if(surface||ctx.wall(q)||ctx.blocked(a,q)){if(q.kind==='echoLane19'&&!q.toSeed&&owned&&surface&&q.pass<q.maxPass){q.x=surface.x+surface.nx*.12;q.y=surface.y+surface.ny*.12;q.toSeed=true;q.pass++;q.hit.clear();ctx.event(s,'echoWall19');}else q.life=0;continue;}
  if(q.kind==='echoLane19'&&q.toSeed&&owned&&segment(a,q,f)<.35){if(q.pass>=q.maxPass){q.life=0;continue;}q.toSeed=false;q.pass++;q.hit.clear();q.dx=q.outX;q.dy=q.outY;ctx.event(s,'echoCatch19');continue;}
  if(q.kind==='rimePetal19'&&q.firstTarget===o.team)continue;
  if(o.inv>0||q.hit.has(o.team)||segment(a,q,o)>=.4||ctx.blocked(a,o))continue;
  if(o.shield>0){q.reflections=(q.reflections||0)+1;if(q.reflections>1){q.life=0;continue;}q.owner=o.team;q.dx*=-1;q.dy*=-1;q.life=Math.min(q.life,.6);q.hit.clear();ctx.event(s,'reflect');continue;}
  if(q.family&&q.family.hits>=q.family.maxHits){q.life=0;continue;}const dir={x:-q.dx,y:-q.dy},block=guarded(o,dir);let damage=q.damage;if(q.kind==='echoLane19'){q.family.hits++;damage*=1+.1*q.pass;if(!q.family.edgeSpent){damage+=q.family.edge*2;q.family.edgeSpent=true;}}
  q.hit.add(o.team);const ok=strike(s,f,o,damage,dir,ctx);
  if(ok&&!block&&owned&&q.kind==='rimeBud19'){if(!(s.boss&&o.team===1))o.slow=Math.max(o.slow,.16);ctx.area(s,f,'rimeSplit19',{x:q.x,y:q.y,dx:q.dx,dy:q.dy,r:.2,arm:.22,t:.33,cast:q.cast,firstTarget:o.team});}
  if(q.kind==='rimeFocusBolt19'&&ok&&!block&&owned){const g=q.family;if(!g.firstAt){g.firstAt=s.time;g.expires=s.time+1.5;}if(s.time<=g.expires&&!g.bloomed){g.hits++;if(!(s.boss&&o.team===1))o.slow=Math.max(o.slow,.12);if(g.hits===3){g.bloomed=true;ctx.area(s,f,'rimeBloom19',{x:q.x,y:q.y,r:1,arm:.25,t:.36,cast:q.cast});}}}
  if(q.kind!=='echoLane19')q.life=0;
 }
}
export function batch19Ai(s,f,o,input,dt,ctx){const ai=s.ai[f.team],d=dist(f,o),v=norm(o.x-f.x,o.y-f.y),react={easy:.32,normal:.2,hard:.12}[s.difficulty]??.2;ai.fusion19Seen=(ai.fusion19Seen||0)+dt;if(ai.fusion19Seen<react)return false;input.aimX=v.x;input.aimY=v.y;
 if(f.char==='echolane'){const q=ownShots(s,f,'echoLane19').find(q=>q.toSeed&&dist(q,f)>3.5);if(q&&f.cd[1]<=0){input.skill2=true;return true;}if(d>3&&d<7&&(f.cd[0]<=0||f.meter>=100)){if(ctx?.surfaceHit){let best=Infinity;for(const off of [0,.8,-.8]){const a=Math.atan2(v.y,v.x)+off,dx=Math.cos(a),dy=Math.sin(a),p=ctx.surfaceHit(f,{x:f.x+dx*12,y:f.y+dy*12});if(p&&segment(f,p,o)<.4&&!ctx.blocked(f,p)){const score=dist(f,p);if(score<best){best=score;input.aimX=dx;input.aimY=dy;}}}}input[f.meter>=100?'ult':'skill1']=true;return true;}}
 else if(f.char==='rimepetal'){const petals=ownShots(s,f,'rimePetal19');if(petals.length>=3&&f.cd[1]<=0&&d>2.7&&d<6){input.skill2=true;return true;}if(d>2.9&&d<7&&(f.cd[0]<=0||f.meter>=100)){input[f.meter>=100?'ult':'skill1']=true;return true;}}return false;
}
export function batch19DangerAi(s,f,input,dt){const ai=s.ai[f.team],react={easy:.32,normal:.2,hard:.12}[s.difficulty]??.2,h=s.hazards.find(h=>h.owner!==f.team&&h.t>0&&!h.triggered&&DUEL_BATCH19_KINDS.includes(h.kind)&&(h.kind==='rimeBloom19'?dist(h,f)<h.r:h.kind==='rimeFocus19'?h.origins.some(p=>segment(p,{x:h.endX,y:h.endY},f)<.4):Number.isFinite(h.endX)&&segment(h,{x:h.endX,y:h.endY},f)<.5));if(!h){ai.fusion19Danger=0;return false;}ai.fusion19Danger=(ai.fusion19Danger||0)+dt;if(ai.fusion19Danger<react)return false;if(h.kind==='rimeBloom19'){const v=norm(f.x-h.x,f.y-h.y);input.x=v.x||1;input.y=v.y;}else if(h.kind==='rimeFocus19'){let closest=h.origins[0],best=Infinity;const end={x:h.endX,y:h.endY};for(const p of h.origins){const d=segment(p,end,f);if(d<best){best=d;closest=p;}}const v=norm(end.x-closest.x,end.y-closest.y);input.x=-v.y;input.y=v.x;if(!input.x&&!input.y)input.x=1;}else{input.x=-(h.dy||0);input.y=h.dx||1;}if(h.arm<.16&&f.dodgeCd<=0)input.dodge=true;return true;}
