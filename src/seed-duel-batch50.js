// Original twins: two independent actual courses, one consumed same-actor pair.
const skill=(name,cooldown,desc)=>Object.freeze({name,cooldown,desc});
const L='twin-lightningmirror',G='twin-glassmaze';
export const DUEL_BATCH50=Object.freeze({
 [L]:Object.freeze({id:L,comboId:'lightningmirror',twin:true,inspectionOnly:true,artReady:false,law:'reflect',name:'번개 거울방 각성',role:'두 갈래 회로 · 실제 반사점의 짧은 전류',hp:176,speed:4.15,reach:2.05,arc:1.1,comboReach:[1.8,2.05,2.25],comboArc:[1.25,.8,1.1],comboNames:['거울 낮게 채기','도선 올려 걸기','두 손 교차 내밀기'],damage:[9,10,13],cadence:.4,heavy:{damage:23,reach:2.6},parry:1,tile:0,ink:'#e4d6a4',skills:[skill('거울 씨앗 한 조각',6.4,'방향을 정한 거울 씨앗 하나가 벽을 두 번까지 튕겨요. 한 친구에게 피해는 한 번, 번개 준비와 함께 남아 있어요.'),skill('짧은 번개 도선',6.8,'별도로 겨눈 좁은 번개를 준비해요. 거울과 번개가 같은 친구를 실제로 맞혔다면, 거울이 튕겼던 자리에서 짧은 고정 도선이 한 번 이어져요.')],ult:skill('둘이 만나는 회로',0,'거울과 번개를 각각 준비해요. 벽의 실제 반사점과 두 공격의 실제 만남이 있어야 작은 공명이 남아요.'),blurb:'불꽃을 더 많이 켜기보다 두 길이 어디서 만났는지 보세요. 도선은 자리를 먼저 보여 주고, 그 자리에서 벗어난 친구를 따라가지 않아요.'}),
 [G]:Object.freeze({id:G,comboId:'glassmaze',twin:true,inspectionOnly:true,artReady:false,law:'reflect',name:'유리 미궁 각성',role:'거울 길과 곧은 창 · 맞았던 자리 뒤의 빈틈',hp:171,speed:4,reach:2.3,arc:.85,comboReach:[1.85,2.45,2.9],comboArc:[1.2,.38,.7],comboNames:['작은 거울 쓸기','유리날 곧게 찌르기','앞뒤 교차 베기'],damage:[8,10,14],cadence:.42,heavy:{damage:24,reach:3.2},parry:1,tile:0,ink:'#d3e6df',skills:[skill('미궁의 거울 조각',6.4,'거울 씨앗 하나가 벽을 두 번까지 튕겨요. 창은 다른 준비로 나가고, 어느 한쪽도 다른 공격을 새로 만들지는 않아요.'),skill('미궁의 곧은 창',7.2,'고정한 긴 유리선을 펼쳐요. 두 공격이 같은 친구를 맞혔으면, 예전 거울 접점 뒤에 짧은 줄이 한 번 더 열려요. 옆이나 접점 앞은 안전해요.')],ult:skill('엇갈리는 유리 길',0,'거울과 창을 서로 다른 박자로 펼쳐요. 실제 접점이 없으면 짧은 추가 길도 생기지 않아요.'),blurb:'완벽한 한 줄에도 곁은 남아 있어요. 거울이 맞았던 자리 뒤만 열리므로, 가까이 멈추거나 옆으로 돌아오면 미궁 밖에 설 수 있어요.'}),
});
export const DUEL_BATCH50_KINDS=Object.freeze(['twinMirrorTell50','twinCourseTell50','twinArc50','twinBehind50']);
export const DUEL_BATCH50_SHOTS=Object.freeze(['twinMirrorSeed50']);
export const DUEL_BATCH50_AUDIO=Object.freeze({twinMirror50:['reflect',{pitch:1.05}],twinCourse50:['chain',{pitch:.95}],twinGlass50:['shotPierce',{pitch:1.1}],twinPair50:['hit',{pitch:1.2}]});
export const DUEL_BATCH50_STORY=Object.freeze([
 {id:'inspect-'+L,enemy:L,inspectionOnly:true,unlockAfter:null,title:'두 번 만나는 회로',difficulty:'hard',before:'반짝임 하나로는 회로가 아니야. 거울도 번개도 정말 네게 닿아야 하거든. …어느 길로 올래?',tip:'두 공격은 따로 준비합니다. 벽을 튕긴 자리에서 고정 도선이 보이면 옆으로 벗어나세요. 막은 공격은 공명을 만들지 않아요.',after:'내가 켠 불빛보다 네가 비워 준 길이 더 잘 보였어. 이번 회로에는 그 여백도 남길게.'},
 {id:'inspect-'+G,enemy:G,inspectionOnly:true,unlockAfter:null,title:'곧은 길 옆의 자리',difficulty:'hard',before:'거울 길과 창 길은 서로 다른 길이야. 둘 다 맞아도 네가 서 있을 작은 곁은 꼭 남겨 둘게.',tip:'긴 창은 방향을 바꾸지 않습니다. 두 공격이 맞은 다음에도 옛 거울 접점 앞과 줄 옆은 안전해요. 추가 줄은 피해를 즉시 주지 않아요.',after:'나는 길을 곧게만 그렸는데 넌 곁을 찾아 걸었네. 미궁에도 문이 있다는 걸 배웠어.'},
]);
const point=p=>({x:p.x,y:p.y}),dist=(a,b)=>Math.hypot(a.x-b.x,a.y-b.y);
const norm=(x,y)=>{const n=Math.hypot(x,y)||1;return{x:x/n,y:y/n};};
export function batch50LinePoint(a,b,p){const x=b.x-a.x,y=b.y-a.y,k=Math.max(0,Math.min(1,((p.x-a.x)*x+(p.y-a.y)*y)/(x*x+y*y||1)));return{x:a.x+x*k,y:a.y+y*k,k};}
function entry(a,b,p,r){const x=b.x-a.x,y=b.y-a.y,u=a.x-p.x,v=a.y-p.y,A=x*x+y*y,C=u*u+v*v-r*r;if(C<=0)return 0;if(A<1e-14)return null;const B=2*(u*x+v*y),D=B*B-4*A*C;if(D<0)return null;const t=(-B-Math.sqrt(D))/(2*A);return t>=0&&t<=1?t:null;}
function init(f){f.twin50Serial??=[0,0];f.twin50Marks??=[null,null];}
function native(s,p){const f=p.caster;return !!DUEL_BATCH50[f.char]&&f.char===p.char&&s.fighters[f.team]===f&&s.fighters[1-f.team]===p.actor&&f.hp>0&&p.actor.hp>0&&!p.cancelled&&!p.nativeLost&&f.twin50Serial?.[p.index]===p.token&&s.phase==='fight';}
function validMark(s,m){return m&&native(s,m.source)&&m.source.hit&&m.source.receipt===m&&s.time-m.at<=2.6;}
function clipped(a,v,length,ctx){const b={x:a.x+v.x*length,y:a.y+v.y*length},w=ctx.surfaceHit(a,b);return w?{x:w.x,y:w.y}:b;}
function pending(s,f,index){return s.hazards.some(h=>h.t>0&&h.data?.caster===f&&h.data.index===index&&DUEL_BATCH50_KINDS.includes(h.kind)&&!h.triggered)||index===0&&s.shots.some(q=>q.life>0&&q.kind==='twinMirrorSeed50'&&q.data.caster===f&&!q.data.nativeLost);}
export function batch50CanAction(s,f,index,ult=false){return s.phase==='fight'&&!!DUEL_BATCH50[f.char]&&f.hp>0&&s.fighters[1-f.team].hp>0&&(ult?!pending(s,f,0)&&!pending(s,f,1):!pending(s,f,index));}
export function batch50Melee(s,f,{step,heavy,hit,guarded}){if(DUEL_BATCH50[f.char]&&hit&&!guarded&&(heavy||step===2)){f.twin50Beat=1;f.twin50BeatTime=4;}}
function prepare(s,f,index,ctx,ult){init(f);const p={caster:f,char:f.char,actor:s.fighters[1-f.team],index,token:++f.twin50Serial[index],hit:false,receipt:null,nativeLost:false,cancelled:false,ult};f.twin50Marks[index]=null;
 const v=norm(f.fx,f.fy),glass=f.char===G,arm=index===0?.34:ult?.56:(glass?.48:.38)-(f.twin50Beat?.06:0),start=point(f),end=clipped(start,v,index===0?8:glass?8:6.2,ctx);if(index===1)f.twin50Beat=f.twin50BeatTime=0;
 ctx.area(s,f,index===0?'twinMirrorTell50':'twinCourseTell50',{...start,endX:end.x,endY:end.y,dx:v.x,dy:v.y,r:index===0?.13:glass?.14:.23,arm,t:arm+.18,castHp:f.hp,data:p,triggered:false});ctx.event(s,index===0?'twinMirror50':glass?'twinGlass50':'twinCourse50');
}
export function batch50Action(s,f,index,ctx,ult=false){if(!batch50CanAction(s,f,index,ult))return false;Object.assign(f,{state:'skill',t:ult?.84:.76,total:ult?.84:.76,blocking:false,inv:0});if(ult){prepare(s,f,0,ctx,true);prepare(s,f,1,ctx,true);}else prepare(s,f,index,ctx,false);return true;}
function stamp(s,p,location,direction,bounce,ctx){const f=p.caster,m={source:p,at:s.time,actor:p.actor,location:point(location),direction:point(direction),bounce:bounce?point(bounce):null};p.receipt=m;f.twin50Marks[p.index]=m;
 const a=f.twin50Marks[0],b=f.twin50Marks[1];if(!validMark(s,a)||!validMark(s,b)||a.actor!==b.actor)return;
 f.twin50Marks=[null,null];if(s.hazards.some(h=>h.t>0&&h.owner===f.team&&['twinArc50','twinBehind50'].includes(h.kind)))return;
 let start,end,kind,arm,damage,r;if(f.char===L){if(!a.bounce||dist(a.bounce,p.actor)>3.5)return;start=point(a.bounce);const v=norm(p.actor.x-start.x,p.actor.y-start.y);end=clipped(start,v,dist(start,p.actor),ctx);kind='twinArc50';arm=.23;damage=5;r=.2;}
 else{const v=b.direction;start={x:a.location.x+v.x*.65,y:a.location.y+v.y*.65};if(ctx.surfaceHit(a.location,start))return;end=clipped(start,v,2.7,ctx);kind='twinBehind50';arm=.28;damage=6;r=.14;}
 const sources=[a.source,b.source],resDirection=norm(end.x-start.x,end.y-start.y);ctx.area(s,f,kind,{...start,endX:end.x,endY:end.y,dx:resDirection.x,dy:resDirection.y,r,arm,t:arm+.13,damage,data:{caster:f,char:f.char,actor:p.actor,sources},triggered:false});ctx.event(s,'twinPair50');
}
function receipt(s,p,damage,dir,location,bounce,ctx){const o=p.actor;if(!native(s,p)||p.hit||o.inv>0)return;p.hit=true;const before=o.hp,v=norm(dir.x,dir.y),guarded=o.shield>0||o.counterShield>0&&o.shieldHits>0||o.blocking&&(-v.x*o.fx-v.y*o.fy>-.2);
 ctx.strike(s,p.caster,o,damage,{kind:'shot',guardDir:{x:-v.x,y:-v.y},knock:0,stun:0,flinch:false});if(!guarded&&o.hp<before&&o.hp>0&&s.phase==='fight')stamp(s,p,location,v,bounce,ctx);
}
function retire(h){h.t=0;h.cancelled=true;if(h.data?.index!==undefined)h.data.cancelled=true;}
function lineHit(s,h,ctx){const p=h.data,o=p.actor,b={x:h.endX,y:h.endY},x=batch50LinePoint(h,b,o);if(dist(x,o)>h.r+.3||o.inv>0)return;if(p.sources){if(p.sources.every(x=>native(s,x))&&s.fighters[1-p.caster.team]===o&&s.fighters[p.caster.team]===p.caster)ctx.strike(s,p.caster,o,h.damage,{kind:'shot',guardDir:{x:-h.dx,y:-h.dy},stun:0,knock:0,flinch:false});}else receipt(s,p,p.ult?20:18,{x:h.dx,y:h.dy},point(o),null,ctx);}
function mirrorTick(s,q,dt,ctx){const p=q.data,f=s.fighters[q.owner],o=s.fighters[1-q.owner],own=native(s,p)&&p.mirror===q&&s.shots.includes(q)&&q.owner===p.caster.team&&!q.foreign&&!q.guardReturned&&!q.hallReturned;
 if(f.hp<=0||q.owner===q.originalOwner&&!q.foreign&&!q.guardReturned&&!q.hallReturned&&!own){q.life=0;return;}
 if(!own){p.nativeLost=true;q.foreign=true;q.life=Math.min(q.life,.5);}if(q.born===s.time||q.guardTurnAt===s.time||q.hallTurnAt===s.time)return;
 const elapsed=Math.min(dt,q.life),nextLife=Math.max(0,q.life-dt);let distance=Math.min(q.speed*elapsed,own?q.remaining:Infinity);
 for(let n=0;n<3&&distance>1e-8&&q.life>0;n++){
  const a=point(q),b={x:a.x+q.dx*distance,y:a.y+q.dy*distance},w=ctx.surfaceHit(a,b),wt=w?.t??1,end={x:a.x+(b.x-a.x)*wt,y:a.y+(b.y-a.y)*wt};let t=wt,body=false;
  const target=o.hp>0&&o.inv<=0&&!(own?p.hit:q.foreignHit)?entry(a,end,o,.4):null;if(target!==null&&target*wt<t-1e-7){t=target*wt;body=true;}
  q.tailX=a.x;q.tailY=a.y;q.x=a.x+(b.x-a.x)*t;q.y=a.y+(b.y-a.y)*t;if(own)q.remaining=Math.max(0,q.remaining-distance*t);
  if(ctx.interceptShot?.(s,q,a.x,a.y,elapsed)||q.owner!==f.team||!q.foreign&&(q.guardReturned||q.hallReturned)){p.nativeLost=true;q.foreign=true;break;}
  if(body){if(o.shield>0){q.owner=o.team;q.dx*=-1;q.dy*=-1;p.nativeLost=true;q.foreign=true;q.life=Math.min(q.life,.5);ctx.event(s,'reflect');break;}
   if(own)receipt(s,p,p.ult?10:8,{x:q.dx,y:q.dy},point(o),q.lastBounce,ctx);else{q.foreignHit=true;ctx.strike(s,f,o,8,{kind:'shot',guardDir:{x:-q.dx,y:-q.dy},stun:0,knock:0,flinch:false});q.life=0;}distance*=1-t;continue;
  }
  if(!w)break;if(!own||q.bounces>=2){q.life=0;break;}q.bounces++;q.lastBounce={x:w.x,y:w.y};const k=q.dx*w.nx+q.dy*w.ny;q.dx-=2*k*w.nx;q.dy-=2*k*w.ny;const nudge=Math.min(.012,q.remaining,distance*(1-t));q.x=w.x+w.nx*nudge;q.y=w.y+w.ny*nudge;q.remaining=Math.max(0,q.remaining-nudge);distance=Math.max(0,distance*(1-t)-nudge);
 }q.life=Math.min(q.life,nextLife);if(own&&q.remaining<=1e-8)q.life=0;
}
export function batch50Tick(s,dt,ctx){
 for(const f of s.fighters)if(DUEL_BATCH50[f.char]){init(f);f.twin50BeatTime=Math.max(0,(f.twin50BeatTime||0)-dt);if(!f.twin50BeatTime)f.twin50Beat=0;f.twin50Marks=f.twin50Marks.map(m=>validMark(s,m)?m:null);}
 if(s.phase!=='fight'){for(const h of s.hazards)if(DUEL_BATCH50_KINDS.includes(h.kind))retire(h);for(const q of s.shots)if(DUEL_BATCH50_SHOTS.includes(q.kind))q.life=0;return;}
 for(const h of s.hazards){if(h.t<=0||!DUEL_BATCH50_KINDS.includes(h.kind))continue;h.t-=dt;const p=h.data,f=p.caster;
  if(p.sources?!p.sources.every(x=>native(s,x))||p.char!==f.char||p.actor!==s.fighters[1-f.team]:!native(s,p)){retire(h);continue;}
  h.arm=Math.max(0,h.arm-dt);if(!h.triggered&&!p.sources&&(f.hp<h.castHp||f.stun>0||f.state!=='skill')){retire(h);continue;}if(h.triggered||h.arm>0)continue;h.triggered=true;
  if(h.kind==='twinMirrorTell50'){const before=s.shots.length;ctx.shoot(s,f,{kind:'twinMirrorSeed50',x:h.x,y:h.y,dx:h.dx,dy:h.dy,speed:8,life:2.1,remaining:12,damage:p.ult?10:8,bounces:0,originalOwner:f.team,data:p,born:s.time});if(s.shots.length>before)p.mirror=s.shots.at(-1);else p.cancelled=true;}
  else lineHit(s,h,ctx);
 }
 for(const q of s.shots)if(q.life>0&&q.kind==='twinMirrorSeed50')mirrorTick(s,q,dt,ctx);
}
export function batch50DangerAi(s,f,input,dt){const ai=s.ai[f.team],h=s.hazards.find(h=>h.owner!==f.team&&h.t>0&&!h.triggered&&DUEL_BATCH50_KINDS.includes(h.kind)&&dist(batch50LinePoint(h,{x:h.endX,y:h.endY},f),f)<h.r+.5);if(!h){ai.twin50Threat=null;ai.twin50Danger=0;return false;}if(ai.twin50Threat!==h){ai.twin50Threat=h;ai.twin50Danger=0;ai.twin50DangerAt=undefined;}if(ai.twin50DangerAt!==s.time){ai.twin50DangerAt=s.time;ai.twin50Danger=(ai.twin50Danger||0)+dt;}if(ai.twin50Danger<({easy:.32,normal:.2,hard:.12}[s.difficulty]??.2))return false;const v=norm(-(h.endY-h.y),h.endX-h.x);input.x=v.x;input.y=v.y;if(h.arm<.13&&f.dodgeCd<=0)input.dodge=true;return true;}
export function batch50Ai(s,f,o,input,dt,ctx){
 const ai=s.ai[f.team];if(ai.twin50At!==s.time){ai.twin50At=s.time;ai.twin50Seen=(ai.twin50Seen||0)+dt;}
 if(ai.twin50Seen<({easy:.32,normal:.2,hard:.12}[s.difficulty]??.2))return false;
 if(batch50DangerAi(s,f,input,dt))return true;
 const v=norm(o.x-f.x,o.y-f.y),d=dist(f,o);input.aimX=v.x;input.aimY=v.y;
 // Casts are stationary in the shared host. Do not buffer another melee
 // action while one of the independently prepared courses is committed.
 if(f.state==='skill')return true;
 // Keep the shared reaction/guard logic for a visible nearby swing or missile.
 // No new action, invulnerability, damage bonus or hidden future-position read.
 if(!['idle','block'].includes(f.state)||d<3.3&&(o.state==='attack'||o.state==='heavy'||o.state==='dash')||s.shots.some(q=>q.owner!==f.team&&dist(q,f)<3))return false;
 const exposed=['stagger','broken','hit'].includes(o.state)||o.state==='attack'&&o.hitDone&&o.cancelAt<0;
 if(d<2.8&&exposed){ai.guarding=false;input.attack=true;return true;}
 if(d<3&&o.blocking&&s.time-o.blockSince>.45){ai.guarding=false;input.heavy=true;return true;}
 const mirrorReady=f.cd[0]<=0&&batch50CanAction(s,f,0),courseReady=f.cd[1]<=0&&batch50CanAction(s,f,1);
 if(d>3.2&&d<5.6&&!ctx.blocked(f,o)&&o.inv<=0&&!o.blocking){
  if(f.meter>=100&&batch50CanAction(s,f,0,true)){ai.guarding=false;input.ult=true;return true;}
  // The live mirror/its genuine receipt comes first; the second course does
  // not replace it. Direct mirror damage still requires a physical collision.
  if(mirrorReady){ai.guarding=false;input.skill1=true;return true;}
  if(courseReady){ai.guarding=false;input.skill2=true;return true;}
 }
 const approachingCourse=Math.min(f.cd[0],f.cd[1])<1.2||pending(s,f,0);
 if(!approachingCourse)return false; // Cooldown is a real close-combat window.
 if(d<3.8){
  let escape={x:-v.x,y:-v.y};
  if(ctx.surfaceHit(f,{x:f.x+escape.x*.8,y:f.y+escape.y*.8})){
   const left={x:-v.y,y:v.x},right={x:v.y,y:-v.x};
   const a=ctx.surfaceHit(f,{x:f.x+left.x*.8,y:f.y+left.y*.8}),b=ctx.surfaceHit(f,{x:f.x+right.x*.8,y:f.y+right.y*.8});
   escape=!a?left:!b?right:null;
  }
  if(!escape)return false; // Both exits blocked: shared guard/melee remains.
  input.x=escape.x;input.y=escape.y;
 }
 else if(d>4.8){input.x=v.x;input.y=v.y;}
 else{input.x=-v.y*.55;input.y=v.x*.55;}
 return true;
}
