// Canonical SOLO adapters. Three finite conductors translate thunderweb's
// decreasing, cover-limited hops; a fixed field translates blackhole's low
// pressure and late compression without taking movement controls away.
const skill=(name,cooldown,desc)=>Object.freeze({name,cooldown,desc});
export const DUEL_BATCH09=Object.freeze({
 thunderweb:Object.freeze({id:'thunderweb',comboId:'thunderweb',solo:true,inspectionOnly:true,artReady:false,law:'chain',name:'천둥 그물',role:'고정 세 매듭 · 약해지는 두 연결',hp:170,speed:4.3,reach:1.8,arc:1.1,comboReach:[1.6,2.15,1.9],comboArc:[1.3,.6,1],comboNames:['실끝 휘두르기','매듭 찌르기','번개실 감기'],damage:[9,11,13],cadence:.37,heavy:{damage:22,reach:2.35},parry:1.1,tile:2,ink:'#eddc82',skills:[skill('세 매듭 잇기',6.8,'보이는 세 자리에 고정한 매듭을 두 선으로 차례로 이어요. 뒤의 번개는 약해지고 벽을 건너뛰지 않아요'),skill('매듭 끊어 베기',5.3,'그물을 거두고 가까운 매듭으로 한 번 베어요. 실제 연결 적중으로 모은 두 겹을 소비 · 그물이 없으면 짧은 실베기')],ult:skill('세 매듭의 세 박자',0,'큰 세 매듭 사이로 약해지는 번개가 세 번만 지나가요. 연결마다 다시 예고하고 끝의 탈출구는 열려 있어요'),blurb:'막히지 않은 3타·강공격은 다음 첫 번개에 쓸 실 한 겹을 모아요. 실제 번개 적중은 끊어 베기에 쓸 두 겹을 모아요. 매듭은 따라오지 않고 벽 뒤·연결선 밖·끝의 바깥은 안전해요.'}),
 blackhole:Object.freeze({id:'blackhole',comboId:'blackhole',solo:true,inspectionOnly:true,artReady:false,law:'gravity',name:'작은 블랙홀',role:'고정 축적장 · 출구를 남긴 늦은 압축',hp:176,speed:4.05,reach:1.85,arc:1.15,comboReach:[1.65,1.85,2.15],comboArc:[.65,1.35,.8],comboNames:['작은 핵 찌르기','경계 휘두르기','두 손 핵 접기'],damage:[9,10,14],cadence:.4,heavy:{damage:23,reach:2.3},parry:1,tile:7,ink:'#bd9edb',skills:[skill('멈춘 작은 별',7.4,'한 자리에 멈춘 장이 약한 압력을 세 번만 쌓고 늦게 압축해요. 표시된 출구에는 끌림과 압축이 없어요 · 보스는 당기지 않아요'),skill('압축 앞당기기',5.6,'지금 장의 축적을 멈추고 다시 예고한 뒤 압축해요. 준비는 끊을 수 있어요. 장이 없으면 짧은 핵 밀기')],ult:skill('출구를 남긴 특이점',0,'큰 고정 장이 네 번까지만 압력을 쌓고 한 번 압축해요. 출구·방어·회피·벽의 빈틈은 그대로'),blurb:'막히지 않은 3타·강공격은 다음 장이나 핵 밀기에 쓸 밀도 한 겹을 모아요. 작은 압력 적중이 압축을 키우지만 시작 피해는 작아요. 장은 움직이지 않고 이동·회피를 잠그지 않아요. 축적 전 준비를 끊거나 출구로 걸어나오세요.'})
});
export const DUEL_BATCH09_KINDS=Object.freeze(['webNet','webPulse','webCut','holeField','holeRelease','holeClose','holePalm']);
export const DUEL_BATCH09_SHOTS=Object.freeze([]);
export const DUEL_BATCH09_AUDIO=Object.freeze({webPlant:['bossWarning',{pitch:1.2}],webHop:['chain',{pitch:1.15}],webSever:['shotPierce',{pitch:1.2}],holePlant:['bossWarning',{pitch:.65}],holePressure:['shotGravity',{pitch:.8}],holeClose:['burstHit',{pitch:.75}],holeRelease:['shotGravity',{pitch:1.05}]});
export const DUEL_BATCH09_STORY=Object.freeze([
 Object.freeze({id:'inspect-thunderweb',enemy:'thunderweb',inspectionOnly:true,unlockAfter:null,title:'세 매듭 끝의 빈 자리',difficulty:'hard',before:'번개는 혼자 멀리 뛰지 못해. 세 매듭을 먼저 놓고 길을 보여 줄게. 두 번째 빛은 조금 약해. 마지막 매듭 너머는 네가 나갈 자리야!',tip:'세 매듭은 움직이지 않아요. 번개는 한 연결씩 다시 예고하고 벽 너머로 건너뛰지 않아요. 선의 옆이나 마지막 매듭 바깥으로 걸으세요. 끊어 베기를 준비할 때는 그물도 사라져요.',after:'이어 놓은 길보다 비워 둔 끝이 더 오래 남네. 작은 별 친구도 출구 하나를 남겨 놓았대.'}),
 Object.freeze({id:'inspect-blackhole',enemy:'blackhole',inspectionOnly:true,unlockAfter:'inspect-thunderweb',title:'작은 별 밖으로 난 출구',difficulty:'hard',before:'처음부터 큰 힘은 내지 않을게. 한 자리에 조금씩 쌓다가 마지막에 접을 거야. 그래도 네 발은 네 것이야. 밝게 비운 출구로 걸어 나와 봐!',tip:'장 안의 약한 압력은 유한해요. 압축 전에 새 원이 다시 예고돼요. 밝은 출구에는 끌림과 압축이 없고 보스는 당기지 않아요. 방어·회피·벽 뒤·축적 전 준비 끊기가 모두 가능해요.',after:'별을 작게 만들어도 길을 남기는 일은 크구나. 네 걸음을 빼앗지 않고 마주 싸울 수 있어서 좋았어.'})
]);
const norm=(x,y)=>{const d=Math.hypot(x,y)||1;return {x:x/d,y:y/d};},dist=(a,b)=>Math.hypot(a.x-b.x,a.y-b.y);
const segment=(a,b,p)=>{const x=b.x-a.x,y=b.y-a.y,k=Math.max(0,Math.min(1,((p.x-a.x)*x+(p.y-a.y)*y)/(x*x+y*y||1)));return Math.hypot(p.x-a.x-x*k,p.y-a.y-y*k);};
const guarded=(f,o)=>{const v=norm(f.x-o.x,f.y-o.y);return o.blocking&&v.x*o.fx+v.y*o.fy>-.2;};
const windup=(f,t)=>Object.assign(f,{state:'skill',total:t,t,blocking:false,inv:0});
export const holeExit=(h,p)=>{const d=dist(h,p);return d>.12&&((p.x-h.x)*h.exitX+(p.y-h.y)*h.exitY)/d>.8;};
const ownField=(s,f)=>s.hazards.find(h=>h.owner===f.team&&h.kind==='holeField'&&h.t>0&&!h.closed&&h.arm<=0);
function retire(s,f,kinds){for(const h of s.hazards)if(h.owner===f.team&&kinds.includes(h.kind)){h.t=0;h.cancelled=true;}}
function fixedCentre(f,o,ctx){let p={x:f.x,y:f.y};const limit=Math.min(5.2,Math.max(2.8,dist(f,o)));for(let n=.2;n<=limit+.001;n+=.2){const next={x:f.x+f.fx*n,y:f.y+f.fy*n};if(ctx.wall(next)||ctx.blocked(p,next))break;p=next;}return p;}
export function batch09Melee(s,f,{step,heavy,hit,guarded:blocked}){if(!hit||blocked||!heavy&&step!==2)return;const name=f.char==='thunderweb'?'webThread':f.char==='blackhole'?'holeDensity':null;if(name){f[name]=1;f[name+'Time']=4;}}
export function batch09Action(s,f,index,ctx,ult=false){
 const cast=f.solo09Cast=(f.solo09Cast||0)+1,o=s.fighters[1-f.team];
 if(f.char==='thunderweb'){
  if(index===1&&!ult){const net=s.hazards.find(h=>h.owner===f.team&&h.kind==='webNet'&&h.t>0&&h.arm<=0),valid=net?.nodes.filter(p=>!p.blocked).sort((a,b)=>dist(f,a)-dist(f,b));let end=valid?.[0];if(!end||dist(f,end)>4.2)end={x:f.x+f.fx*2.4,y:f.y+f.fy*2.4};const charge=f.webSpark||0;f.webSpark=f.webSparkTime=0;retire(s,f,['webNet','webPulse','webCut']);windup(f,.68);const v=norm(end.x-f.x,end.y-f.y);ctx.area(s,f,'webCut',{x:f.x,y:f.y,endX:end.x,endY:end.y,dx:v.x,dy:v.y,r:.35,arm:.34,t:.45,cast,damage:12+charge*3});ctx.event(s,'webSever');return;}
  const ready=f.webThread||0;f.webThread=f.webThreadTime=0;retire(s,f,['webNet','webPulse','webCut']);const centre=fixedCentre(f,o,ctx),spread=ult?1.9:1.45;
  const nodes=[{x:centre.x-f.fy*spread-f.fx*.6,y:centre.y+f.fx*spread-f.fy*.6},{x:centre.x+f.fx*1.1,y:centre.y+f.fy*1.1},{x:centre.x+f.fy*spread-f.fx*.6,y:centre.y-f.fx*spread-f.fy*.6}].map(p=>({...p,blocked:ctx.wall(p)||ctx.blocked(f,p)}));
  const reverse=dist(nodes[2],o)<dist(nodes[0],o),route=reverse?[2,1,0]:[0,1,2];if(ult)route.push(1);windup(f,ult?1:.8);ctx.area(s,f,'webNet',{...centre,r:.2,nodes,route,cursor:0,age:0,nextAt:.2,arm:.46,t:ult?3.35:2.8,cast,damage:ult?12:15+ready*2,budget:{hits:0,max:ult?3:2},cancelled:false});ctx.event(s,'webPlant');
 }else if(f.char==='blackhole'){
  if(index===1&&!ult){const field=ownField(s,f);windup(f,.7);retire(s,f,['holeRelease','holePalm']);if(field){field.paused=true;ctx.area(s,f,'holeRelease',{x:f.x,y:f.y,r:.3,arm:.34,t:.45,cast,field});}
   else{const charge=f.holeDensity||0;f.holeDensity=f.holeDensityTime=0;ctx.area(s,f,'holePalm',{x:f.x,y:f.y,endX:f.x+f.fx*2.35,endY:f.y+f.fy*2.35,dx:f.fx,dy:f.fy,r:.4,arm:.34,t:.46,cast,damage:12+charge*3});}ctx.event(s,'holeRelease');return;}
  const density=f.holeDensity||0;f.holeDensity=f.holeDensityTime=0;retire(s,f,['holeField','holeRelease','holeClose','holePalm']);const centre=fixedCentre(f,o,ctx);windup(f,ult?1.15:.95);ctx.area(s,f,'holeField',{...centre,r:ult?2.15:1.65,arm:.55,t:ult?3.5:3.1,cast,age:0,tick:.4,stacks:0,ticks:0,maxTicks:ult?4:3,pressure:2,damage:(ult?13:10)+density*2,closeAt:ult?1.95:1.65,exitX:f.fx,exitY:f.fy,pull:.75,budget:{hits:0,max:1},closed:false,cancelled:false});ctx.event(s,'holePlant');
 }
}
function compress(s,f,field,ctx){if(field.closed||field.cancelled)return;field.closed=true;ctx.area(s,f,'holeClose',{x:field.x,y:field.y,r:field.r,arm:.4,t:.52,damage:field.damage+field.stacks*3,exitX:field.exitX,exitY:field.exitY,budget:field.budget,field});ctx.event(s,'holeClose');}
export function batch09Tick(s,dt,ctx){
 for(const f of s.fighters)for(const name of ['webThread','webSpark','holeDensity']){f[name+'Time']=Math.max(0,(f[name+'Time']||0)-dt);if(!f[name+'Time'])f[name]=0;}
 for(const h of [...s.hazards]){if(!DUEL_BATCH09_KINDS.includes(h.kind)||h.t<=0)continue;const before=h.arm;h.t-=dt;h.arm=Math.max(0,h.arm-dt);const f=s.fighters[h.owner],o=s.fighters[1-h.owner];
  if(before>0&&['webNet','webCut','holeField','holeRelease','holePalm'].includes(h.kind)&&(f.stun>0||f.state!=='skill'||h.cast!==f.solo09Cast)){h.t=0;h.cancelled=true;if(h.kind==='holeRelease')h.field.paused=false;continue;}if(h.arm>0)continue;
  if(h.kind==='webNet'){
   h.age+=Math.max(0,dt-before);if(h.cursor<h.route.length-1&&h.age>=h.nextAt){const a=h.nodes[h.route[h.cursor]],b=h.nodes[h.route[h.cursor+1]];
    if(a.blocked||b.blocked||ctx.blocked(a,b)){h.broken=true;h.cursor=h.route.length;continue;}
    const v=norm(b.x-a.x,b.y-a.y);ctx.area(s,f,'webPulse',{x:a.x,y:a.y,endX:b.x,endY:b.y,dx:v.x,dy:v.y,r:.27,arm:.32,t:.43,damage:h.damage*Math.pow(.88,h.cursor),budget:h.budget,net:h,hop:h.cursor});h.cursor++;h.nextAt+=.63;ctx.event(s,'webHop');}continue;
  }
  if(h.kind==='holeField'){
   h.age+=Math.max(0,dt-before);if(h.closed||h.paused)continue;if(h.age>=h.closeAt){compress(s,f,h,ctx);continue;}
   if(o.inv<=0&&dist(h,o)<h.r&&!holeExit(h,o)&&!ctx.blocked(h,o)){
    if(!(s.boss&&o.team===1)){const v=norm(h.x-o.x,h.y-o.y),p={x:o.x+v.x*h.pull*(o.blocking?.2:1)*dt,y:o.y+v.y*h.pull*(o.blocking?.2:1)*dt};if(!ctx.wall(p)&&!ctx.blocked(o,p)){o.x=p.x;o.y=p.y;ctx.clampArena(o);}}
   }
   h.tick-=dt;if(h.tick<=0&&h.ticks<h.maxTicks){h.tick+=.4;h.ticks++;if(o.inv<=0&&dist(h,o)<h.r&&!holeExit(h,o)&&!ctx.blocked(h,o)){const blocked=guarded(f,o),hit=ctx.strike(s,f,o,h.pressure,{kind:'shot',stun:0,knock:0,flinch:false});if(hit&&!blocked)h.stacks=Math.min(h.maxTicks,h.stacks+1);ctx.event(s,'holePressure');}}continue;
  }
  if(h.triggered)continue;h.triggered=true;
  if(h.kind==='webPulse'){if(h.net.cancelled||ctx.blocked(h,{x:h.endX,y:h.endY}))continue;if(h.budget.hits<h.budget.max&&o.inv<=0&&segment(h,{x:h.endX,y:h.endY},o)<h.r+.35&&!ctx.blocked(h,o)){h.budget.hits++;const blocked=guarded(f,o),hit=ctx.strike(s,f,o,h.damage,{kind:'skill',stun:.12,knock:.15});if(hit&&!blocked&&f.char==='thunderweb'){f.webSpark=Math.min(2,(f.webSpark||0)+1);f.webSparkTime=4;}}}
  else if(h.kind==='webCut'||h.kind==='holePalm'){if(o.inv<=0&&!ctx.blocked(h,o)&&segment(h,{x:h.endX,y:h.endY},o)<h.r+.35)ctx.strike(s,f,o,h.damage,{kind:'skill',stun:.18,knock:.4});}
  else if(h.kind==='holeRelease')compress(s,f,h.field,ctx);
  else if(h.kind==='holeClose'){if(!h.field.cancelled&&h.budget.hits<h.budget.max&&o.inv<=0&&dist(h,o)<h.r+.3&&!holeExit(h,o)&&!ctx.blocked(h,o)){h.budget.hits++;ctx.strike(s,f,o,h.damage,{kind:'skill',stun:.16,knock:.35});}}
 }
}
export function batch09Ai(s,f,o,input,dt){
 const ai=s.ai[f.team],d=dist(f,o),v=norm(o.x-f.x,o.y-f.y),react={easy:.32,normal:.2,hard:.12}[s.difficulty]??.2,free=!['attack','heavy','skill','dash','dodge'].includes(f.state),spent=['attack','heavy'].includes(o.state)&&o.hitDone;
 ai.solo09Seen=!['attack','heavy'].includes(o.state)&&o.inv<=0?(ai.solo09Seen||0)+dt:0;ai.solo09Recovery=spent?(ai.solo09Recovery||0)+dt:0;if(!free)return false;
 if(f.char==='thunderweb'){
  const net=s.hazards.find(h=>h.owner===f.team&&h.kind==='webNet'&&h.t>0&&!h.cancelled);
  if(ai.solo09Recovery>=react*.65&&f.webSpark&&d<3&&f.cd[1]<=0){input.skill2=true;return true;}
  if(!net&&ai.solo09Seen>=react&&d>3.8&&d<5.7){if(f.meter>=100)input.ult=true;else if(f.cd[0]<=0)input.skill1=true;else return false;return true;}
  // Aim a prepared sever at its visible current path; no future position is read.
  if(net&&f.cd[1]<=0&&ai.solo09Recovery>=react&&d>2.5&&d<4.2&&net.nodes.some(p=>!p.blocked&&segment(f,p,o)<.6)){input.skill2=true;return true;}
 }else if(f.char==='blackhole'){
  const field=ownField(s,f);
  if(field&&f.cd[1]<=0&&field.stacks>0&&field.age>.55&&o.inv<=0&&dist(field,o)<field.r&&!holeExit(field,o)&&ai.solo09Seen>=react){input.skill2=true;return true;}
  if(!field&&ai.solo09Seen>=react&&d>4.2&&d<5.7){if(f.meter>=100)input.ult=true;else if(f.cd[0]<=0)input.skill1=true;else return false;return true;}
  if(!field&&f.holeDensity&&f.cd[1]<=0&&d<2.6&&ai.solo09Recovery>=react*.65){input.skill2=true;return true;}
 }return false;
}
export function batch09DangerAi(s,f,input,dt){
 const ai=s.ai[f.team],react={easy:.32,normal:.2,hard:.12}[s.difficulty]??.2;
 const h=s.hazards.find(h=>h.owner!==f.team&&h.t>0&&!h.triggered&&(h.kind==='webPulse'||h.kind==='webCut'||h.kind==='holePalm'?segment(h,{x:h.endX,y:h.endY},f)<h.r+.5:h.kind==='holeClose'||h.kind==='holeField'&&h.arm<=0&&h.age>.65?dist(h,f)<h.r+.35&&!holeExit(h,f):false));
 if(!h){ai.solo09Danger=0;return false;}ai.solo09Danger=(ai.solo09Danger||0)+dt;if(ai.solo09Danger<react)return false;
 const v=h.dx!=null?{x:-h.dy,y:h.dx}:dist(h,f)>.1?norm(f.x-h.x,f.y-h.y):{x:h.exitX,y:h.exitY};input.x=v.x;input.y=v.y;if(f.dodgeCd<=0&&h.arm<.16)input.dodge=true;return true;
}
