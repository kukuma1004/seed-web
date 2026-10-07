// Original mirrormaze/fullbloom and mirrormaze/starring twins. Automatic
// flower branches never revisit the struck actor; a redirect is separately paid.
const P='twin-prismsiblings',R='twin-mirrorring';
const skill=(name,cooldown,desc)=>Object.freeze({name,cooldown,desc});
export const DUEL_BATCH53=Object.freeze({
 [P]:Object.freeze({id:P,comboId:'prismsiblings',twin:true,inspectionOnly:true,artReady:false,law:'reflect',name:'거울 꽃쌍둥이 각성',role:'다른 친구로 퍼지는 실제 꽃잎 · 살아 있는 두 잎의 유료 접기',hp:174,speed:4.15,reach:2.25,arc:1,comboReach:[1.85,2.2,2.45],comboArc:[.85,1.2,1],comboNames:['거울 테두리 작게 찌르기','꽃잎 노 바깥으로 쓸기','두 손으로 꽃잎 대각선 당기기'],damage:[8,10,12],cadence:.4,heavy:{damage:23,reach:2.7},parry:1,tile:0,ink:'#dfa1b6',skills:[skill('꽃쌍둥이의 거울',6.4,'실제 거울 씨앗 하나가 두 번까지 튕깁니다. 꽃씨를 던져도 이 거울의 길과 수명은 그대로예요.'),skill('꽃씨와 두 잎 접기',6.9,'꽃씨가 맞으면 실제 꽃잎 두 장이 옆으로 퍼져요. 그 잎은 처음 맞은 친구를 다시 때리지 않습니다. 두 공격을 모두 맞힌 뒤 두 잎이 아직 살아 있으면, 이 버튼으로 순환 20을 더 쓰고 .30초 동안 접어 고정한 한 친구에게 보낼 수 있어요.')],ult:skill('두 길을 남긴 꽃',0,'거울과 더 단단한 같은 꽃씨를 따로 준비합니다. 자동 꽃잎은 같은 친구를 다시 때리지 않아요. 두 잎 접기도 별도로 순환 20을 쓰며, 보낸 두 잎의 추가 피해는 합쳐 한 번뿐이에요.'),blurb:'둘이 있다고 피해가 두 배가 되지는 않습니다. 두 잎 접기는 살아 있는 실제 잎 두 장이 필요하며, 준비 중 맞거나 잎의 수명이 끝나면 쓴 순환과 기다림은 돌아오지 않아요.'}),
 [R]:Object.freeze({id:R,comboId:'mirrorring',twin:true,inspectionOnly:true,artReady:false,law:'reflect',name:'거울 성환 각성',role:'작은 별잎 방어점 하나 · 진짜 돌아온 거울 뒤의 짧은 줄',hp:182,speed:3.95,reach:2.3,arc:1,comboReach:[1.9,2.15,2.5],comboArc:[.85,1.15,1],comboNames:['거울 테두리 낮게 톡 치기','별잎 지팡이 옆으로 휘기','두 도구 머리 위로 내리기'],damage:[9,10,12],cadence:.41,heavy:{damage:24,reach:2.8},parry:1,tile:0,ink:'#bdc5df',skills:[skill('돌아오는 성환 거울',6.4,'한 거울 씨앗이 실제 벽을 튕겨요. 벽을 튕긴 뒤 지금의 자기 몸 가까이를 실제로 지나온 거울만 성환과 함께 공명할 수 있어요.'),skill('작은 별잎 한 점',7.2,'별잎 한 점이 몸 주위를 1.55초 동안 돌아요. 그 점에 닿은 일반 탄 하나만 없애며, 보스 탄·몸·다른 각도는 통과합니다. 적에게도 실제 점이 닿아야 한 번 때려요.')],ult:skill('돌아온 빛 뒤 한 줄',0,'같은 거울과 같은 별잎을 따로 준비합니다. 진짜 돌아온 거울과 별잎이 같은 친구를 때리면, 옛 거울 접점 뒤에 짧은 빛줄기 하나가 생겨요. 옛 가운데와 줄 옆은 안전합니다.'),blurb:'방어는 원 전체가 아니라 움직이는 한 점입니다. 탄을 막았다는 이유만으로 공명하지 않으며, 돌아온 길을 실제로 만들지 못하면 추가 빛도 생기지 않아요.'}),
});
export const DUEL_BATCH53_KINDS=Object.freeze(['twinMirrorTell53','twinBudTell53','twinOrbitTell53','twinFoldTell53','twinStarPoint53','twinRearLine53']);
export const DUEL_BATCH53_SHOTS=Object.freeze(['twinMirrorSeed53','twinBloomBud53','twinAutoPetal53','twinFoldPetal53']);
export const DUEL_BATCH53_AUDIO=Object.freeze({twinMirror53:['reflect',{pitch:.96}],twinBud53:['shotPetal',{pitch:.93}],twinPetals53:['shotPetal',{pitch:1.08}],twinFold53:['shotPetal',{pitch:1.2}],twinOrbit53:['shotOrbit',{pitch:1.05}],twinPointBlock53:['reflect',{pitch:1.14}],twinReturned53:['shotReturn',{pitch:1.08}],twinRearLine53:['shotPierce',{pitch:1.08}],twinPair53:['hit',{pitch:1.1}]});
export const DUEL_BATCH53_STORY=Object.freeze([
 {id:'inspect-'+P,enemy:P,inspectionOnly:true,unlockAfter:null,title:'다른 친구에게 갈 꽃잎',difficulty:'hard',before:'네게 닿은 꽃은 옆으로 두 잎을 펴. 그래도 같은 친구에게 두 번 선물했다고 우기고 싶지는 않아. 돌아보게 하려면, 살아 있는 두 잎을 내가 다시 접어야 해.',tip:'자동 꽃잎은 처음 맞은 씨앗을 다시 때리지 않습니다. 거울과 꽃씨를 모두 맞혔고 실제 두 잎이 살아 있을 때만 순환 20을 써 접을 수 있어요. 준비를 끊거나 두 잎의 수명이 끝나기를 기다리세요.',after:'꽃잎을 돌려 보내는 데에도 마음과 시간이 들더라. 그냥 두 잎이 보인다는 이유로 이미 보낸 선물까지 두 번 센 건 아니었어.'},
 {id:'inspect-'+R,enemy:R,inspectionOnly:true,unlockAfter:null,title:'온 원을 막을 수는 없어서',difficulty:'hard',before:'작은 별 하나면 앞을 지킬 수 있을 줄 알았는데, 별이 돌아가면 빈 자리가 생겨. 그러니 거울이 진짜 돌아온 길도 같이 기억해 보려고.',tip:'별잎은 움직이는 한 점으로 일반 탄 하나만 막아요. 보스 탄과 빈 각도는 통과합니다. 거울이 벽을 튕긴 뒤 자기 몸 근처를 실제로 지나오지 않았다면 별잎과 맞아도 추가 빛줄기는 없어요.',after:'별이 지나간 자리를 네가 걸어왔구나. 빈틈이 있어서 우리가 서로 볼 수 있었나 봐. 방어를 온 원으로 늘리는 것보다 돌아온 한 줄을 잘 읽어 볼게.'},
]);
const point=p=>({x:p.x,y:p.y}),dist=(a,b)=>Math.hypot(a.x-b.x,a.y-b.y),unit=(x,y)=>{const d=Math.hypot(x,y)||1;return{x:x/d,y:y/d};};
const lerp=(a,b,t)=>({x:a.x+(b.x-a.x)*t,y:a.y+(b.y-a.y)*t});
export function batch53LinePoint(a,b,p){const dx=b.x-a.x,dy=b.y-a.y,k=Math.max(0,Math.min(1,((p.x-a.x)*dx+(p.y-a.y)*dy)/(dx*dx+dy*dy||1)));return{x:a.x+dx*k,y:a.y+dy*k,k};}
function entry(a,b,p,r){const dx=b.x-a.x,dy=b.y-a.y,x=a.x-p.x,y=a.y-p.y,A=dx*dx+dy*dy,C=x*x+y*y-r*r;if(C<=0)return 0;if(A<1e-14)return null;const B=2*(x*dx+y*dy),D=B*B-4*A*C;if(D<0)return null;const t=(-B-Math.sqrt(D))/(2*A);return t>=0&&t<=1?t:null;}
function init(f){f.twin53Serial??=[0,0];f.twin53Marks??=[null,null];}
function native(s,p){const f=p.caster;return p.host===s&&p.round===s.round&&s.phase==='fight'&&DUEL_BATCH53[f.char]&&p.char===f.char&&s.fighters[f.team]===f&&s.fighters[1-f.team]===p.actor&&f.hp>0&&p.actor.hp>0&&!p.cancelled&&!p.nativeLost&&f.twin53Serial?.[p.index]===p.token;}
function markValid(s,m){return m&&native(s,m.source)&&m.source.stamped&&m.source.receipt===m&&s.time-m.at<=2.6;}
function pairValid(s,p){return p&&p.host===s&&p.round===s.round&&p.sources.length===2&&p.sources[0]&&p.sources[1]&&p.sources.every(x=>native(s,x)&&x.stamped&&x.receipt?.source===x&&x.receipt.actor===p.actor)&&s.fighters[p.caster.team]===p.caster&&s.fighters[1-p.caster.team]===p.actor&&p.char===p.caster.char;}
function front(o,v){return o.shield>0||(-v.x*o.fx-v.y*o.fy>-.2)&&(o.blocking||o.counterShield>0&&o.shieldHits>0);}
function makeArea(s,p,kind,props,ctx,key){const made=ctx.area(s,p.caster,kind,props),h=made||s.hazards.findLast(x=>x.kind===kind&&x.data===props.data);if(h&&s.hazards.includes(h)){if(key)p[key]=h;return h;}p.cancelled=true;return null;}
function shot(s,p,props,ctx,key='physical'){const before=s.shots.length;ctx.shoot(s,p.caster,props);if(s.shots.length>before){const q=s.shots.at(-1);p[key]=q;return q;}p.cancelled=true;return null;}
function clip(a,b,max,ctx){const v=unit(b.x-a.x,b.y-a.y),length=Math.min(max,dist(a,b)),end={x:a.x+v.x*length,y:a.y+v.y*length},w=ctx.surfaceHit(a,end);return w?point(w):end;}
function childLive(s,p,q){return native(s,p)&&q&&q.life>0&&q.kind==='twinAutoPetal53'&&s.shots.includes(q)&&q.owner===p.caster.team&&q.data.group===p&&q.data.physical===q&&p.children[q.data.slot]===q&&!q.foreign&&!q.guardReturned&&!q.hallReturned&&!q.data.nativeLost;}
function foldPair(s,f){const p=f.twin53Pair;return p&&!p.consumed&&pairValid(s,p)&&p.children.length===2&&p.children[0]&&p.children[1]&&p.children.every(q=>childLive(s,p.sources[1],q))?p:null;}
export function batch53CanFold(s,f){return f.char===P&&f.hp>0&&f.stun<=0&&['idle','block'].includes(f.state)&&f.meter>=20&&!!foldPair(s,f)&&!s.hazards.some(h=>h.t>0&&h.kind==='twinFoldTell53'&&h.data.caster===f);}
function pending(s,f,index){return s.hazards.some(h=>h.t>0&&h.data?.caster===f&&h.data.index===index&&(!h.triggered||h.kind==='twinStarPoint53')&&DUEL_BATCH53_KINDS.includes(h.kind))||s.shots.some(q=>q.life>0&&q.data?.caster===f&&q.data.index===index&&!q.data.nativeLost&&['twinMirrorSeed53','twinBloomBud53'].includes(q.kind));}
export function batch53CanAction(s,f,index,ult=false){return s.phase==='fight'&&!!DUEL_BATCH53[f.char]&&f.hp>0&&s.fighters[1-f.team].hp>0&&(ult?!pending(s,f,0)&&!pending(s,f,1)&&!foldPair(s,f):index===1&&foldPair(s,f)?batch53CanFold(s,f):!pending(s,f,index));}
export function batch53Melee(s,f,{step,heavy,hit,guarded}){if(DUEL_BATCH53[f.char]&&hit&&!guarded&&(heavy||step===2)){f.twin53Beat=1;f.twin53BeatTime=4;}}
function prepare(s,f,index,ctx,ult){init(f);const aim=unit(f.fx,f.fy),start=point(f),p={host:s,round:s.round,caster:f,char:f.char,actor:s.fighters[1-f.team],index,token:++f.twin53Serial[index],ult,stamped:false,receipt:null,delivery:false,cancelled:false,nativeLost:false,departure:start,aim,children:[],worldContacts:[],returnProof:null};f.twin53Marks[index]=null;const arm=index===0?.34:(f.char===P?.46:.42)-(f.twin53Beat?.06:0);if(index===1)f.twin53Beat=f.twin53BeatTime=0;const end=clip(start,{x:start.x+aim.x*(index===0?12:6.5),y:start.y+aim.y*(index===0?12:6.5)},index===0?12:6.5,ctx);makeArea(s,p,index===0?'twinMirrorTell53':f.char===P?'twinBudTell53':'twinOrbitTell53',{...start,endX:end.x,endY:end.y,dx:aim.x,dy:aim.y,arm,t:arm+.18,castHp:f.hp,data:p,triggered:false,born:s.time},ctx,'preparation');ctx.event(s,index===0?'twinMirror53':f.char===P?'twinBud53':'twinOrbit53');}
function fold(s,f,ctx){const pair=foldPair(s,f);if(!batch53CanFold(s,f)||!pair)return false;pair.consumed=true;f.twin53Pair=null;f.meter-=20;f.cd[1]=6.9;const captured=point(pair.actor),p={...pair,parent:pair,children:[...pair.children],consumed:true,cancelled:false,spent:false,budget:4,captured,starts:pair.children.map(point),directions:pair.children.map(q=>unit(captured.x-q.x,captured.y-q.y)),castHp:f.hp,emitted:[],payment:20};Object.assign(f,{state:'skill',total:.48,t:.48,blocking:false,inv:0});const h=makeArea(s,p,'twinFoldTell53',{x:p.starts[0].x,y:p.starts[0].y,endX:captured.x,endY:captured.y,lines:p.starts.map((a,i)=>({...a,endX:a.x+p.directions[i].x*3.4,endY:a.y+p.directions[i].y*3.4})),r:.1,arm:.30,t:.46,data:p,castHp:f.hp,triggered:false,born:s.time},ctx,'tell');if(h)for(const q of p.children)q.foldReservation=h;ctx.event(s,'twinFold53');return true;}
export function batch53Action(s,f,index,ctx,ult=false){if(index===1&&!ult&&foldPair(s,f))return fold(s,f,ctx);if(!batch53CanAction(s,f,index,ult))return false;Object.assign(f,{state:'skill',total:ult?.84:.78,t:ult?.84:.78,blocking:false,inv:0});if(ult){prepare(s,f,0,ctx,true);prepare(s,f,1,ctx,true);}else prepare(s,f,index,ctx,false);return true;}
function stamp(s,p,location,v,ctx){if(p.stamped)return;p.stamped=true;const m={source:p,actor:p.actor,at:s.time,location:point(location),direction:point(v)};p.receipt=m;p.caster.twin53Marks[p.index]=m;const a=p.caster.twin53Marks[0],b=p.caster.twin53Marks[1];if(!markValid(s,a)||!markValid(s,b)||a.actor!==b.actor)return;p.caster.twin53Marks=[null,null];const data={host:s,round:s.round,caster:p.caster,char:p.char,actor:p.actor,sources:[a.source,b.source],spent:false,consumed:false,budget:4};
 if(p.char===P){data.children=[...b.source.children];p.caster.twin53Pair=data;}
 else{const start={x:a.location.x+a.direction.x*.65,y:a.location.y+a.direction.y*.65},end={x:start.x+a.direction.x*2.7,y:start.y+a.direction.y*2.7};if(ctx.surfaceHit(a.location,start))return;data.oldContact=point(a.location);data.direction=point(a.direction);makeArea(s,data,'twinRearLine53',{...start,endX:end.x,endY:end.y,dx:a.direction.x,dy:a.direction.y,r:.14,arm:.30,t:.44,data,triggered:false,born:s.time},ctx,'tell');}ctx.event(s,'twinPair53');}
function damage(s,p,amount,location,v,ctx,canStamp=true){if(!native(s,p)||p.actor.inv>0)return false;const hp=p.actor.hp,guarded=front(p.actor,v);ctx.strike(s,p.caster,p.actor,amount,{kind:'shot',guardDir:{x:-v.x,y:-v.y},stun:0,knock:0,flinch:false});const real=!guarded&&p.actor.hp<hp&&p.actor.hp>0&&s.phase==='fight';if(real&&canStamp)stamp(s,p,location,v,ctx);return real;}
function retire(h){h.t=0;h.cancelled=true;if(h.data?.index!==undefined)h.data.cancelled=true;}
function lose(q){q.data.nativeLost=true;q.foreign=true;q.life=Math.min(q.life,.5);}
function pointer(s,q){const p=q.data;return p.physical===q&&s.shots.includes(q)&&(p.group?p.group.children[p.slot]===q:p.shared?p.shared.emitted.includes(q):true);}
function owned(s,q){const p=q.data;return(p.group?native(s,p.group):p.sources?pairValid(s,p):native(s,p))&&pointer(s,q)&&q.owner===p.caster.team&&!p.cancelled&&!p.nativeLost&&!q.foreign&&!q.guardReturned&&!q.hallReturned;}
function intercept(s,q,a,seconds,ctx){const owner=q.owner,guard=q.guardReturned,hall=q.hallReturned;return ctx.interceptShot?.(s,q,a.x,a.y,seconds)||q.owner!==owner||!guard&&q.guardReturned||!hall&&q.hallReturned;}
function petals(s,p,location,v,ctx){const normal={x:-v.y,y:v.x};for(let slot=0;slot<2;slot++){const side=slot===0?-1:1,start={x:location.x+normal.x*.36*side,y:location.y+normal.y*.36*side};if(ctx.surfaceHit(location,start))continue;const angle=Math.atan2(v.y,v.x)+side*.7,data={caster:p.caster,char:p.char,actor:p.actor,group:p,slot,excluded:p.actor,nativeLost:false,cancelled:false};const q=shot(s,data,{...start,dx:Math.cos(angle),dy:Math.sin(angle),owner:p.caster.team,originalOwner:p.caster.team,kind:'twinAutoPetal53',speed:5,life:.65,remaining:2.8,radius:.1,damage:3,data,born:s.time},ctx);if(q)p.children[slot]=q;}ctx.event(s,'twinPetals53');}
function returned(s,p,q,a,b){if(p.char!==R||!p.worldContacts.length||p.returnProof||dist(a,b)<1e-8)return;const at=entry(a,b,p.caster,.85);if(at===null)return;const world=p.worldContacts.at(-1);p.returnProof={physical:q,world,start:point(a),end:point(b),owner:point(p.caster),at:s.time,point:lerp(a,b,at)};q.returned53=true;}
function mirrorTick(s,q,dt,ctx){const p=q.data,next=Math.max(0,q.life-dt);let left=Math.min(q.speed*Math.min(dt,q.life),q.remaining);for(let n=0;n<5&&left>1e-8&&q.life>0;n++){const a=point(q),b={x:a.x+q.dx*left,y:a.y+q.dy*left},w=ctx.surfaceHit(a,b),wt=w?.t??1,end=lerp(a,b,wt),body=!p.delivery&&p.actor.inv<=0?entry(a,end,p.actor,.4):null;let at=wt,hit=body!==null&&(!w||body*wt<wt-1e-7);if(hit)at=body*wt;const used=left*at;q.tailX=a.x;q.tailY=a.y;Object.assign(q,lerp(a,b,at));q.remaining=Math.max(0,q.remaining-used);left-=used;
 if(intercept(s,q,a,used/q.speed,ctx)){lose(q);break;}returned(s,p,q,a,q);if(hit){if(p.actor.shield>0){q.owner=p.actor.team;q.dx*=-1;q.dy*=-1;lose(q);ctx.event(s,'reflect');break;}p.delivery=true;const proof=p.returnProof,qualified=p.char!==R||proof?.physical===q&&p.worldContacts.includes(proof.world);damage(s,p,q.damage,point(q),{x:q.dx,y:q.dy},ctx,qualified);continue;}
 if(!w)break;if(q.bounces>=2){q.life=0;break;}q.bounces++;p.worldContacts.push({...point(w),at:s.time});const dot=q.dx*w.nx+q.dy*w.ny;q.dx-=2*dot*w.nx;q.dy-=2*dot*w.ny;const nudge=Math.min(.012,left,q.remaining);q.x=w.x+w.nx*nudge;q.y=w.y+w.ny*nudge;q.remaining-=nudge;left-=nudge;ctx.event(s,'twinReturned53');}q.life=Math.min(q.life,next);if(q.remaining<=1e-8)q.life=0;}
function linearTick(s,q,dt,ctx){const p=q.data,next=Math.max(0,q.life-dt);if(q.kind==='twinAutoPetal53'&&q.foldReservation?.t>0&&!q.foldReservation.cancelled&&!q.foldReservation.triggered){q.life=next;return;}const a=point(q),travel=Math.min(q.speed*Math.min(dt,q.life),q.remaining),b={x:a.x+q.dx*travel,y:a.y+q.dy*travel},w=ctx.surfaceHit(a,b),wt=w?.t??1,end=lerp(a,b,wt),target=p.actor,allowed=q.kind!=='twinAutoPetal53'&&target!==p.excluded,body=allowed?entry(a,end,target,.3+(q.radius||.1)):null;let at=wt,hit=body!==null&&(!w||body*wt<wt-1e-7);if(hit)at=body*wt;const used=travel*at;q.tailX=a.x;q.tailY=a.y;Object.assign(q,lerp(a,b,at));q.remaining=Math.max(0,q.remaining-used);
 if(intercept(s,q,a,used/q.speed,ctx)){lose(q);q.life=Math.min(q.life,next);return;}if(hit){if(target.shield>0){q.owner=target.team;q.dx*=-1;q.dy*=-1;lose(q);ctx.event(s,'reflect');return;}if(q.kind==='twinBloomBud53'){p.delivery=true;if(damage(s,p,q.damage,point(q),{x:q.dx,y:q.dy},ctx,false)){petals(s,p,point(q),{x:q.dx,y:q.dy},ctx);stamp(s,p,point(q),{x:q.dx,y:q.dy},ctx);}}
 else if(!(p.shared||p).spent){(p.shared||p).spent=p.spent=true;if(target.inv<=0&&!front(target,{x:q.dx,y:q.dy}))ctx.strike(s,p.caster,target,4,{kind:'shot',guardDir:{x:-q.dx,y:-q.dy},stun:0,knock:0,flinch:false});}q.life=0;}else if(w)q.life=0;q.life=Math.min(q.life,next);if(q.remaining<=1e-8)q.life=0;}
function foreignTick(s,q,dt,ctx){const f=s.fighters[q.owner],o=s.fighters[1-q.owner];if(!f||!o||f.hp<=0||o.hp<=0){q.life=0;return;}const a=point(q),elapsed=Math.min(dt,q.life),next=Math.max(0,q.life-dt),b={x:a.x+q.dx*q.speed*elapsed,y:a.y+q.dy*q.speed*elapsed},w=ctx.surfaceHit(a,b),wt=w?.t??1,end=lerp(a,b,wt),body=!q.foreignHit&&o!==q.data.excluded?entry(a,end,o,.4):null,hit=body!==null&&(!w||body*wt<wt-1e-7),at=hit?body*wt:wt;Object.assign(q,lerp(a,b,at));if(intercept(s,q,a,elapsed*at,ctx)){q.life=Math.min(q.life,next,.5);return;}if(hit){q.foreignHit=true;const p=q.data,budget=p.shared||p;if(o.inv<=0&&(!p.sources||!budget.spent)){if(p.sources)budget.spent=p.spent=true;ctx.strike(s,f,o,q.damage,{kind:'shot',guardDir:{x:-q.dx,y:-q.dy},stun:0,knock:0,flinch:false});}q.life=0;}else if(w)q.life=0;q.life=Math.min(q.life,next);}
export function batch53ProjectileTick(s,dt,ctx){if(!Number.isFinite(dt)||dt<=0)return;for(const q of s.shots){if(q.life<=0||!DUEL_BATCH53_SHOTS.includes(q.kind)||q.born===s.time||q.updatedAt53===s.time||q.guardTurnAt===s.time||q.hallTurnAt===s.time)continue;q.updatedAt53=s.time;if(!pointer(s,q)){q.life=0;continue;}if(!owned(s,q)){if(q.foreign||q.guardReturned||q.hallReturned||q.owner!==q.originalOwner){lose(q);foreignTick(s,q,dt,ctx);}else q.life=0;continue;}if(q.kind==='twinMirrorSeed53')mirrorTick(s,q,dt,ctx);else linearTick(s,q,dt,ctx);}}
function orbitTick(s,h,dt,ctx,frameDt){const p=h.data;if(p.orbit!==h){retire(h);return;}h.frameDt=frameDt;h.activeFraction=dt/frameDt;h.sweepAt=s.time;h.sweeps=[];const steps=Math.max(1,Math.ceil(3.4*dt/.10));for(let n=0;n<steps;n++){const a=point(h);h.angle+=3.4*dt/steps;const want=clip(p.caster,{x:p.caster.x+Math.cos(h.angle)*1.45,y:p.caster.y+Math.sin(h.angle)*1.45},1.45,ctx),w=ctx.surfaceHit(a,want),end=w?point(w):want;h.sweeps.push({a,b:point(end),lo:n/steps*h.activeFraction,hi:(n+1)/steps*h.activeFraction});const body=!h.contactSpent?entry(a,end,p.actor,.48):null,world=ctx.surfaceHit(a,end);Object.assign(h,end);if(body!==null&&(!world||body<world.t-1e-7)&&!ctx.surfaceHit(p.caster,lerp(a,end,body))){h.contactSpent=true;damage(s,p,p.ult?8:6,lerp(a,end,body),unit(end.x-a.x,end.y-a.y),ctx);}}h.cx=p.caster.x;h.cy=p.caster.y;}
// Hook must be called by the shared host on ACTUAL moved hostile shot segments.
// Relative sweeps use the point's measured piecewise path in this same frame.
export function batch53InterceptShot(s,q,x0,y0,dt,ctx){if(!s.shots.includes(q)||q.life<=0||q.boss||s.boss&&q.owner===1||!Number.isFinite(q.owner))return false;const f=s.fighters[1-q.owner],h=s.hazards.find(h=>h.kind==='twinStarPoint53'&&h.owner===f?.team&&(h.t>0||h.sweepAt===s.time&&h.activeFraction>0)&&h.data.orbit===h&&h.budget>0&&native(s,h.data));if(!h||h.sweepAt!==s.time||!h.sweeps.length)return false;const a={x:x0,y:y0},b=point(q),duration=dt>0?dt:h.frameDt;if(q.guard53At!==s.time){q.guard53At=s.time;q.guard53Elapsed=0;}const lo=Math.min(1,q.guard53Elapsed/h.frameDt),hi=Math.min(1,(q.guard53Elapsed+duration)/h.frameDt);q.guard53Elapsed+=duration;if(hi<=lo)return false;let first=null;for(const g of h.sweeps){const u=Math.max(lo,g.lo),v=Math.min(hi,g.hi);if(v<=u)continue;const qa=lerp(a,b,(u-lo)/(hi-lo)),qb=lerp(a,b,(v-lo)/(hi-lo)),ga=lerp(g.a,g.b,(u-g.lo)/(g.hi-g.lo)),gb=lerp(g.a,g.b,(v-g.lo)/(g.hi-g.lo)),at=entry({x:qa.x-ga.x,y:qa.y-ga.y},{x:qb.x-gb.x,y:qb.y-gb.y},{x:0,y:0},.18+Math.min(.2,q.radius??.1));if(at===null)continue;const t=(u+(v-u)*at-lo)/(hi-lo),where=lerp(a,b,t),guard=lerp(ga,gb,at),wall=ctx.surfaceHit(a,b);if(wall&&t>=wall.t-1e-7||ctx.surfaceHit(guard,where)||ctx.surfaceHit(f,guard))continue;if(first===null||t<first)first=t;}if(first===null)return false;h.budget--;h.guardFlash=.15;q.life=0;ctx.event(s,'twinPointBlock53');return true;}
function line(s,h,ctx){const p=h.data;if(p.tell!==h||p.spent)return;p.spent=true;const a=point(h),b={x:h.endX,y:h.endY},w=ctx.surfaceHit(a,b),wt=w?.t??1,end=lerp(a,b,wt),at=entry(a,end,p.actor,.44);if(at!==null&&(!w||at*wt<wt-1e-7)&&p.actor.inv<=0&&!front(p.actor,{x:h.dx,y:h.dy}))ctx.strike(s,p.caster,p.actor,4,{kind:'shot',guardDir:{x:-h.dx,y:-h.dy},stun:0,knock:0,flinch:false});ctx.event(s,'twinRearLine53');}
function emitFold(s,h,ctx,delay){const p=h.data;if(p.tell!==h||!p.children.every(q=>childLive(s,p.sources[1],q)&&q.foldReservation===h&&q.life>delay+1e-8))return;for(const q of p.children)q.life=0;for(let slot=0;slot<2;slot++){const start=p.starts[slot],v=p.directions[slot];if(ctx.surfaceHit(start,{x:start.x+v.x*.001,y:start.y+v.y*.001}))continue;const before=s.shots.length;ctx.shoot(s,p.caster,{...start,dx:v.x,dy:v.y,owner:p.caster.team,originalOwner:p.caster.team,kind:'twinFoldPetal53',speed:7,life:.55,remaining:3.4,radius:.1,damage:4,data:p,born:s.time});if(s.shots.length>before){const q=s.shots.at(-1);const data={...p,physical:q};data.shared=p;q.data=data;p.emitted.push(q);}}if(p.emitted.length!==2){p.cancelled=true;for(const q of p.emitted)q.life=0;}}
// Both emitted petals consult their one shared paid HP budget.
function normalizeFold(s){for(const q of s.shots)if(q.kind==='twinFoldPetal53'&&q.data.shared){const shared=q.data.shared;if(shared.spent)q.data.spent=true;}}
export function batch53Tick(s,dt,ctx){if(!Number.isFinite(dt)||dt<=0)return;for(const f of s.fighters){if(f.twin53Pair&&!foldPair(s,f))f.twin53Pair=null;if(!DUEL_BATCH53[f.char])continue;init(f);f.twin53BeatTime=Math.max(0,(f.twin53BeatTime||0)-dt);if(!f.twin53BeatTime)f.twin53Beat=0;f.twin53Marks=f.twin53Marks.map(m=>markValid(s,m)?m:null);if(f.twin53Pair&&!foldPair(s,f))f.twin53Pair=null;}
 if(s.phase!=='fight'){for(const f of s.fighters){f.twin53Pair=null;}for(const h of s.hazards)if(DUEL_BATCH53_KINDS.includes(h.kind))retire(h);for(const q of s.shots)if(DUEL_BATCH53_SHOTS.includes(q.kind))q.life=0;return;}
 for(const h of s.hazards){if(h.t<=0||h.born===s.time||h.updatedAt53===s.time||!DUEL_BATCH53_KINDS.includes(h.kind))continue;h.updatedAt53=s.time;const p=h.data,elapsed=Math.min(dt,h.t),oldArm=h.arm;h.t=Math.max(0,h.t-dt);h.arm=Math.max(0,h.arm-dt);if(p.sources?!pairValid(s,p):!native(s,p)){retire(h);continue;}if(h.kind==='twinStarPoint53'){h.guardFlash=Math.max(0,(h.guardFlash||0)-elapsed);orbitTick(s,h,elapsed,ctx,dt);continue;}if(!h.triggered&&h.kind!=='twinRearLine53'&&(p.sources?p.tell!==h:p.preparation!==h||p.caster.hp<h.castHp||p.caster.stun>0||p.caster.state!=='skill')){retire(h);continue;}if(h.kind==='twinFoldTell53'&&!h.triggered&&(p.caster.hp<h.castHp||p.caster.stun>0||p.caster.state!=='skill')){retire(h);continue;}if(h.triggered||h.arm>0)continue;h.triggered=true;
 if(h.kind==='twinFoldTell53')emitFold(s,h,ctx,Math.min(dt,oldArm));else if(h.kind==='twinRearLine53')line(s,h,ctx);else if(h.kind==='twinOrbitTell53'){const pos=clip(p.caster,{x:p.caster.x+p.aim.x*1.45,y:p.caster.y+p.aim.y*1.45},1.45,ctx);makeArea(s,p,'twinStarPoint53',{...pos,cx:p.caster.x,cy:p.caster.y,r:1.45,pointRadius:.18,angle:Math.atan2(p.aim.y,p.aim.x),arm:0,t:1.55,contactSpent:false,budget:1,data:p,triggered:true,born:s.time},ctx,'orbit');}else shot(s,p,{x:h.x,y:h.y,dx:h.dx,dy:h.dy,owner:p.caster.team,originalOwner:p.caster.team,kind:h.kind==='twinMirrorTell53'?'twinMirrorSeed53':'twinBloomBud53',speed:h.kind==='twinMirrorTell53'?8:6,life:h.kind==='twinMirrorTell53'?2.1:1.25,remaining:h.kind==='twinMirrorTell53'?12:6.5,radius:.12,bounces:0,damage:h.kind==='twinMirrorTell53'?(p.ult?10:8):(p.ult?12:8),data:p,born:s.time},ctx);
 }normalizeFold(s);batch53ProjectileTick(s,dt,ctx);for(const q of s.shots)if(q.kind==='twinFoldPetal53'&&q.data.shared&&q.data.spent)q.data.shared.spent=true;
}
export function batch53DangerAi(s,f,input,dt){const ai=s.ai[f.team],h=s.hazards.find(h=>h.owner!==f.team&&h.t>0&&!h.triggered&&!h.cancelled&&DUEL_BATCH53_KINDS.includes(h.kind)&&dist(batch53LinePoint(h,{x:h.endX,y:h.endY},f),f)<.6);if(!h){ai.twin53Threat=null;ai.twin53Danger=0;return false;}if(ai.twin53Threat!==h){ai.twin53Threat=h;ai.twin53Danger=0;}if(ai.twin53DangerAt!==s.time){ai.twin53DangerAt=s.time;ai.twin53Danger=(ai.twin53Danger||0)+dt;}if(ai.twin53Danger<({easy:.32,normal:.2,hard:.12}[s.difficulty]??.2))return false;const v=unit(-(h.endY-h.y),h.endX-h.x);input.x=v.x;input.y=v.y;if(h.arm<.14&&f.dodgeCd<=0)input.dodge=true;return true;}
function bankAim(f,o,ctx){
// AI-only route planning. These helpers never create combat receipts, move an
// actor, change a timer/resource, or consult future input/hidden enemy cooldowns.
 if(!ctx.arena)return null;
 let best=null;
 for(const [axis,wall] of [['x',ctx.arena.minX],['x',ctx.arena.maxX],['y',ctx.arena.minY],['y',ctx.arena.maxY]]){
  if(Math.abs(f[axis]-wall)>2.5)continue;
  const reflected=point(o);reflected[axis]=2*wall-o[axis];
  const v=unit(reflected.x-f.x,reflected.y-f.y),w=ctx.surfaceHit(f,{x:f.x+v.x*12,y:f.y+v.y*12});
  if(!w||Math.abs(w[axis]-wall)>1e-6||dist(f,w)<.025||ctx.surfaceHit(w,o))continue;
  const direction=unit(o.x-w.x,o.y-w.y),beforeBody={x:o.x-direction.x*.4,y:o.y-direction.y*.4};
  const length=dist(f,w)+dist(w,o);
  if(length<=12&&dist(batch53LinePoint(w,beforeBody,f),f)<.84&&(!best||length<best.length))best={...v,length,wall:point(w)};
 }
 return best;
}
function bankPosition(f,o,ctx){
 if(!ctx.arena)return null;
 const A=ctx.arena;let best=null;
 for(const [axis,wall,sign] of [['x',A.minX,1],['x',A.maxX,-1],['y',A.minY,1],['y',A.maxY,-1]]){
  const other=axis==='x'?'y':'x',lo=other==='x'?A.minX:A.minY,hi=other==='x'?A.maxX:A.maxY;
  for(const side of [-1,0,1]){
   const goal=point(o);goal[axis]=wall+sign*.28;goal[other]=Math.max(lo+.6,Math.min(hi-.6,o[other]+side*1.2));
   const route=bankAim(goal,o,ctx);if(!route)continue;
   const score=dist(f,goal)+route.length*.25;
   if(!best||score<best.score)best={...goal,score};
  }
 }
 return best;
}
function steer53(f,input,v,ctx){
 let direction=unit(v.x,v.y);
 if(ctx.surfaceHit(f,{x:f.x+direction.x*.8,y:f.y+direction.y*.8})){
  const sides=[{x:-direction.y,y:direction.x},{x:direction.y,y:-direction.x}];
  direction=sides.find(a=>!ctx.surfaceHit(f,{x:f.x+a.x*.8,y:f.y+a.y*.8}));
  if(!direction)return false;
 }
 input.x=direction.x;input.y=direction.y;return true;
}
function liveMirror53(s,f){return s.shots.find(q=>q.kind==='twinMirrorSeed53'&&q.life>0&&owned(s,q)&&q.data.caster===f);}
function liveStar53(s,f){return s.hazards.find(h=>h.kind==='twinStarPoint53'&&h.t>0&&h.owner===f.team&&h.data.orbit===h&&native(s,h.data));}
export function batch53Ai(s,f,o,input,dt,ctx){
 const ai=s.ai[f.team];
 if(ai.twin53At!==s.time){
  ai.twin53At=s.time;ai.twin53Seen=(ai.twin53Seen||0)+dt;
  if(ai.twin53OpponentState!==o.state&&['dodge','attack','heavy'].includes(ai.twin53OpponentState)&&o.state==='idle')ai.twin53OpeningAt=s.time;
  ai.twin53OpponentState=o.state;
 }
 if(ai.twin53Seen<({easy:.32,normal:.2,hard:.12}[s.difficulty]??.2))return false;
 const d=dist(f,o),v=unit(o.x-f.x,o.y-f.y);input.aimX=v.x;input.aimY=v.y;
 if(f.state==='skill')return true;
 if(batch53DangerAi(s,f,input,dt))return true;
 if(!['idle','block'].includes(f.state))return false;
 // A visible incoming body attack belongs to the shared reaction/guard reader.
 const incoming=['dash','leap'].includes(o.state)||['attack','heavy'].includes(o.state)&&!o.hitDone;
 if(d<3.2&&incoming)return false;
 const clear=!ctx.blocked(f,o)&&o.inv<=0&&!o.blocking;
 const exposure=['hit','stagger','broken'].includes(o.state)||['attack','heavy'].includes(o.state)&&o.hitDone||o.state==='idle'&&s.time-(ai.twin53OpeningAt??-9)<.75;
 const opening=exposure||o.state==='idle'&&d>2.7;
 const mirror=liveMirror53(s,f),star=liveStar53(s,f),receipt=f.twin53Marks?.[0];
 const readySecond=f.cd[1]<=0&&batch53CanAction(s,f,1);
 const commit=key=>{ai.guarding=false;input[key]=true;return true;};
 if(batch53CanFold(s,f))return commit('skill2');
 if(f.char===P&&clear&&readySecond&&mirror&&d>1&&d<4.6&&
   (markValid(s,receipt)&&receipt.source===mirror.data||exposure&&d<3.4))return commit('skill2');
 if(ai.guarding&&d<3.2&&!exposure)return false;
 if(f.char===R&&star){
  // Keep the current *point* near the current target, not an aura at range4.2.
  const radial=unit(star.x-f.x,star.y-f.y),goal={x:o.x-radial.x*1.45,y:o.y-radial.y*1.45};
  if(dist(f,goal)>.18)return steer53(f,input,{x:goal.x-f.x,y:goal.y-f.y},ctx);
  return true;
 }
 if(f.char===R&&clear&&readySecond&&d>1&&d<2.25&&exposure&&
   mirror&&(mirror.data.returnProof||mirror.data.worldContacts.length>0))return commit('skill2');
 if(d<2.8&&['hit','stagger','broken'].includes(o.state))return commit('attack');
 if(d<3&&o.blocking&&s.time-o.blockSince>.45)return commit('heavy');
 if(f.char===P){
  if(clear&&opening&&f.meter>=100&&d>1.3&&d<3.3&&batch53CanAction(s,f,0,true))return commit('ult');
  if(clear&&opening&&f.cd[0]<=0&&d>1.5&&d<4.5&&batch53CanAction(s,f,0))return commit('skill1');
  if(clear&&exposure&&readySecond&&!mirror&&f.cd[0]>1.5&&d>1.3&&d<3.3)return commit('skill2');
  if(mirror&&readySecond){
   if(d>2.5)return steer53(f,input,v,ctx);
   if(d<1.4)return steer53(f,input,{x:-v.x,y:-v.y},ctx);
   return false;
  }
 }else{
  const bank=bankAim(f,o,ctx);
  if(clear&&opening&&bank&&f.meter>=100&&d>1.2&&d<2.4&&batch53CanAction(s,f,0,true)){
   input.aimX=bank.x;input.aimY=bank.y;return commit('ult');
  }
  if(clear&&opening&&bank&&f.cd[0]<=0&&d>1.2&&d<5.5&&batch53CanAction(s,f,0)){
   input.aimX=bank.x;input.aimY=bank.y;return commit('skill1');
  }
  if(clear&&readySecond&&mirror&&d>1&&d<2.25&&
    (markValid(s,receipt)&&receipt.source===mirror.data&&mirror.data.returnProof||exposure&&mirror.data.returnProof))return commit('skill2');
  if(mirror){
   if(d>1.9)return steer53(f,input,v,ctx);
   if(d<1.2)return steer53(f,input,{x:-v.x,y:-v.y},ctx);
   return false;
  }
  if(f.cd[0]<=1.2&&batch53CanAction(s,f,0)){
   const goal=bankPosition(f,o,ctx);
   if(goal&&dist(f,goal)>.22)return steer53(f,input,{x:goal.x-f.x,y:goal.y-f.y},ctx);
  }
 }
 // Ordinary close combat and guards remain responsible when a course is spent.
 if(d<3.2||Math.min(f.cd[0],f.cd[1])>=1.2)return false;
 return steer53(f,input,v,ctx);
}
