// 2026-09-28 사용자: "서바이벌 프로젝트… 막기가 있어서 완전 컨트롤 싸움처럼 느껴졌고 캐릭마다 특징이 다양했다"
// 씨앗 대전 1차: 1:1(AI), 캐릭터 4명. 공격은 막기에, 막기는 강공격·잡기에, 강공격은 공격(끊기)·반격 막기에 진다.
// 그림·렌더러와 무관한 규칙. 계정·저장에 쓰지 않는다(보상 없는 시험 모드).
export const DUEL_ARENA=Object.freeze({minX:1.5,maxX:22.5,minY:2.2,maxY:13.6});
export const DUEL_PILLARS=Object.freeze([{x:7.5,y:5.4,r:.8},{x:16.5,y:10.4,r:.8}]);
export const DUEL_RULES=Object.freeze({roundsToWin:2,roundSeconds:75,guardMax:100,guardRegen:14,blockDamage:.2,parryWindow:.16,guardBreakStun:1.05,dodgeCd:1,meterMax:100});
const skill=(name,cooldown,desc)=>Object.freeze({name,cooldown,desc});
export const DUEL_CHARACTERS=Object.freeze({
 pierce:Object.freeze({id:'pierce',name:'창 씨앗',role:'긴 사거리 · 찌르기',hp:170,speed:4.5,reach:2.5,arc:.62,damage:[11,11,17],cadence:.34,heavy:{damage:22,reach:2.6},parry:1,tile:4,ink:'#dbf6b1',
  skills:[skill('돌진 찌르기',4.5,'앞으로 달려가며 꿰뚫어요'),skill('관통 투창',3.5,'멀리 날아가 둘을 꿰뚫는 창')],ult:skill('천 개의 창',0,'세 줄의 창이 앞을 쓸어요'),
  blurb:'가장 멀리서 찌르지만, 붙으면 약해요.'}),
 burst:Object.freeze({id:'burst',name:'불꽃 씨앗',role:'한 방 · 막기 파괴',hp:152,speed:3.8,reach:1.6,arc:1.1,damage:[11,11,16],cadence:.48,heavy:{damage:26,reach:1.9,breaker:1.25},parry:1,tile:5,ink:'#ffaa65',
  skills:[skill('불씨 심기',5,'잠시 뒤 터지는 불씨를 발밑에'),skill('화염 도약',6,'뛰어올라 내려찍어요 · 막기를 부숴요')],ult:skill('대폭발',0,'둘레를 크게 터뜨려요'),
  blurb:'느리지만 세고, 막고 있는 상대를 잘 부숴요.'}),
 reflect:Object.freeze({id:'reflect',name:'거울 씨앗',role:'막기 전문 · 반격',hp:160,speed:4.2,reach:1.7,arc:.9,damage:[9,9,14],cadence:.34,heavy:{damage:21,reach:1.9},parry:1.9,tile:0,ink:'#91e4ff',
  skills:[skill('거울 방패',6,'잠깐 모든 공격을 막고 탄을 되돌려요'),skill('수정 탄',3,'벽에 두 번 튕기는 수정')],ult:skill('거울 감옥',0,'상대를 거울에 가둬 묶어요'),
  blurb:'반격 막기 판정이 넓고, 날아오는 탄을 되돌려요.'}),
 gravity:Object.freeze({id:'gravity',name:'중력 씨앗',role:'잡기 · 제어',hp:148,speed:3.9,reach:1.7,arc:.9,damage:[9,9,12],cadence:.38,heavy:{damage:21,reach:2},parry:1,tile:7,ink:'#d2a0ff',
  skills:[skill('끌어당기기',6.5,'앞의 상대를 끌어와 묶어요 · 막기 무시'),skill('중력장',7,'둘레의 상대를 느리게')],ult:skill('블랙홀',0,'상대를 빨아들이며 계속 때려요'),
  blurb:'막고 있는 상대도 끌어와 무너뜨려요.'})
});
export const DUEL_ORDER=Object.freeze(['pierce','burst','reflect','gravity']);
const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
const dist=(a,b)=>Math.hypot(a.x-b.x,a.y-b.y);
const norm=(x,y)=>{const d=Math.hypot(x,y)||1;return {x:x/d,y:y/d};};
function rnd(s){s.seed=(Math.imul(s.seed,1664525)+1013904223)>>>0;return s.seed/4294967296;}

function fighter(team,char,x,y){const c=DUEL_CHARACTERS[char];return {team,char,x,y,hp:c.hp,maxHp:c.hp,guard:DUEL_RULES.guardMax,meter:0,fx:team===0?1:-1,fy:0,state:'idle',t:0,combo:0,comboTime:0,blockSince:-9,blocking:false,stun:0,inv:0,dodgeCd:0,cd:[0,0],kx:0,ky:0,shield:0,slow:0,heldBy:0,hitDone:false,dx:0,dy:0,step:0,lastHitBy:0};}
export function createDuel({player='pierce',enemy='burst',seed=1,difficulty='normal'}={}){
 const s={seed:seed>>>0,phase:'ready',round:1,wins:[0,0],time:0,roundTime:DUEL_RULES.roundSeconds,difficulty,fighters:[fighter(0,player,6,7.9),fighter(1,enemy,18,7.9)],shots:[],hazards:[],effects:[],events:[],message:'1라운드',ready:1.2,winner:-1,ai:[{},{}]};
 return s;
}
function event(s,type){s.events.push(type);if(s.events.length>24)s.events.shift();}
function fx(s,type,x,y,extra={}){if(s.effects.length>=120)s.effects.shift();s.effects.push({type,x,y,life:.35,max:.35,...extra});}
function resetRound(s){const [a,b]=s.fighters;for(const [f,x] of [[a,6],[b,18]]){const c=DUEL_CHARACTERS[f.char];Object.assign(f,fighter(f.team,f.char,x,7.9),{meter:f.meter*.5});f.hp=c.hp;}s.shots.length=0;s.hazards.length=0;s.roundTime=DUEL_RULES.roundSeconds;s.phase='ready';s.ready=1.2;s.message=`${s.round}라운드`;}
const facingHit=(def,att)=>{const v=norm(att.x-def.x,att.y-def.y);return v.x*def.fx+v.y*def.fy>-.2;};
// 한 번의 피해. kind: light|heavy|skill|shot|grab. 막기·반격 막기·막기 파괴를 여기서 가른다.
function strike(s,att,def,damage,{kind='light',knock=1,stun=.25,unblockable=false,breaker=1,dir=null}={}){
 if(def.hp<=0||def.inv>0)return false;const c=DUEL_CHARACTERS[def.char];
 if(def.shield>0&&kind!=='grab'){fx(s,'parry',def.x,def.y,{ink:c.ink});event(s,'reflect');if(kind!=='shot'){strike(s,def,att,10,{kind:'skill',stun:.35,knock:.8});}return false;}
 const front=facingHit(def,att);
 if(def.blocking&&front&&!unblockable){
  // 반격 막기: 막기를 누른 직후(짧은 창) 맞으면 공격한 쪽이 크게 흔들린다.
  if(s.time-def.blockSince<=DUEL_RULES.parryWindow*c.parry&&kind!=='shot'){att.state='stagger';att.t=.85;att.stun=.85;def.meter=clamp(def.meter+22,0,100);fx(s,'parry',def.x,def.y,{ink:c.ink});event(s,'parry');s.message='반격 막기!';return false;}
  if(kind==='heavy'||kind==='skill'&&breaker>1){def.guard-=45*breaker;}
  def.guard-=damage*1.3;const chip=damage*DUEL_RULES.blockDamage;def.hp-=chip;event(s,'block');fx(s,'block',def.x,def.y,{ink:c.ink});
  if(def.guard<=0){def.guard=0;def.blocking=false;def.state='broken';def.t=DUEL_RULES.guardBreakStun;def.stun=DUEL_RULES.guardBreakStun;event(s,'guardBreak');fx(s,'guardBreak',def.x,def.y,{});s.message='막기 파괴!';}
  att.meter=clamp(att.meter+3,0,100);checkKo(s);return true;
 }
 def.hp-=damage;def.stun=Math.max(def.stun,stun);def.state='hit';def.t=stun;def.blocking=false;const v=dir||norm(def.x-att.x,def.y-att.y);def.kx+=v.x*knock*5;def.ky+=v.y*knock*5;
 att.meter=clamp(att.meter+8,0,100);def.meter=clamp(def.meter+5,0,100);def.lastHitBy=att.team;event(s,kind==='heavy'?'heavyHit':'hit');fx(s,kind==='heavy'?'heavy':'hit',def.x,def.y,{ink:DUEL_CHARACTERS[att.char].ink,text:Math.round(damage)});
 checkKo(s);return true;
}
function checkKo(s){for(const f of s.fighters)if(f.hp<=0&&s.phase==='fight'){f.hp=0;endRound(s,1-f.team,'쓰러뜨렸어요');}}
function endRound(s,winner,why){s.wins[winner]++;s.phase='roundEnd';s.ready=1.8;s.message=`${winner===0?'승리':'패배'} · ${why}`;event(s,winner===0?'win':'lose');if(s.wins[winner]>=DUEL_RULES.roundsToWin){s.phase='over';s.winner=winner;s.message=winner===0?'대전 승리!':'대전 패배';}}
function melee(s,f,reach,arc,damage,opts={}){const o=s.fighters[1-f.team],v=norm(o.x-f.x,o.y-f.y),front=v.x*f.fx+v.y*f.fy;if(dist(f,o)<=reach+.45&&front>Math.cos(arc))return strike(s,f,o,damage,opts);return false;}
function shoot(s,f,extra){s.shots.push({owner:f.team,x:f.x+f.fx*.6,y:f.y+f.fy*.6,dx:f.fx,dy:f.fy,speed:11,life:1.2,damage:12,pierce:0,bounces:0,hit:new Set(),law:f.char,...extra});}
function useSkill(s,f,i){
 const c=DUEL_CHARACTERS[f.char],o=s.fighters[1-f.team];if(f.cd[i]>0||f.stun>0||['attack','heavy','skill','dodge'].includes(f.state))return false;
 f.cd[i]=c.skills[i].cooldown;f.state='skill';f.t=.35;f.hitDone=false;event(s,'skill');
 if(f.char==='pierce'){if(i===0){f.state='dash';f.t=.3;f.dx=f.fx;f.dy=f.fy;f.hitDone=false;}else shoot(s,f,{damage:16,pierce:1,speed:14,kind:'lance'});}
 if(f.char==='burst'){if(i===0)s.hazards.push({kind:'mine',owner:f.team,x:f.x,y:f.y,t:.9,r:2.1});else{f.state='leap';f.t=.55;f.tx=clamp(o.x,DUEL_ARENA.minX,DUEL_ARENA.maxX);f.ty=clamp(o.y,DUEL_ARENA.minY,DUEL_ARENA.maxY);s.hazards.push({kind:'tell',owner:f.team,x:f.tx,y:f.ty,t:.55,r:2.1});}}
 if(f.char==='reflect'){if(i===0){f.shield=1.1;f.state='idle';f.t=0;fx(s,'shield',f.x,f.y,{ink:c.ink,life:1.1,max:1.1});}else shoot(s,f,{damage:12,bounces:2,speed:10,kind:'crystal'});}
 if(f.char==='gravity'){if(i===0){const v=norm(o.x-f.x,o.y-f.y);if(dist(f,o)<5.5&&v.x*f.fx+v.y*f.fy>.35&&o.inv<=0){o.x=f.x+f.fx*1.1;o.y=f.y+f.fy*1.1;strike(s,f,o,8,{kind:'grab',unblockable:true,stun:.6,knock:.2});fx(s,'pull',o.x,o.y,{ink:c.ink});}else fx(s,'miss',f.x+f.fx*2,f.y+f.fy*2,{});}else s.hazards.push({kind:'well',owner:f.team,x:f.x+f.fx*1.5,y:f.y+f.fy*1.5,t:2.6,r:2.6});}
 return true;
}
function useUlt(s,f){
 const o=s.fighters[1-f.team],c=DUEL_CHARACTERS[f.char];if(f.meter<DUEL_RULES.meterMax||f.stun>0)return false;f.meter=0;f.inv=.5;event(s,'ultimate');fx(s,'ult',f.x,f.y,{ink:c.ink,life:.8,max:.8});s.message=c.ult.name;
 if(f.char==='pierce')for(const off of [-.35,0,.35]){const a=Math.atan2(f.fy,f.fx)+off;s.shots.push({owner:f.team,x:f.x,y:f.y,dx:Math.cos(a),dy:Math.sin(a),speed:15,life:1.4,damage:16,pierce:3,bounces:0,hit:new Set(),law:'pierce',kind:'lance',unblockable:false,breaker:1.5});}
 if(f.char==='burst'){if(dist(f,o)<4.2)strike(s,f,o,40,{kind:'skill',breaker:2,stun:.8,knock:2});fx(s,'boom',f.x,f.y,{r:4.2,ink:c.ink,life:.6,max:.6});}
 if(f.char==='reflect'){if(dist(f,o)<8){o.state='jailed';o.t=1.6;o.stun=1.6;o.blocking=false;fx(s,'jail',o.x,o.y,{ink:c.ink,life:1.6,max:1.6});}}
 if(f.char==='gravity')s.hazards.push({kind:'hole',owner:f.team,x:f.x+f.fx*3,y:f.y+f.fy*3,t:2.2,r:3.4,tick:0});
 return true;
}
// 입력: {x,y 이동, aimX,aimY, attack, heavy, block(누르는 중), dodge, skill1, skill2, ult}
function act(s,f,input,dt){
 const c=DUEL_CHARACTERS[f.char],A=DUEL_ARENA;
 for(const k of ['t','stun','inv','dodgeCd','comboTime','shield','slow'])f[k]=Math.max(0,f[k]-dt);f.cd[0]=Math.max(0,f.cd[0]-dt);f.cd[1]=Math.max(0,f.cd[1]-dt);
 if(!f.blocking)f.guard=Math.min(DUEL_RULES.guardMax,f.guard+DUEL_RULES.guardRegen*dt);if(f.comboTime<=0)f.combo=0;
 f.x+=f.kx*dt;f.y+=f.ky*dt;const k=Math.exp(-8*dt);f.kx*=k;f.ky*=k;
 const busy=f.stun>0||['attack','heavy','skill','dash','leap','dodge'].includes(f.state)&&f.t>0;
 if(!busy&&f.stun<=0&&['hit','broken','stagger','jailed'].includes(f.state))f.state='idle';
 // 방향: 이동 중이면 이동 쪽, 아니면 조준 쪽(없으면 상대 쪽).
 const o=s.fighters[1-f.team];
 if(!busy){const aim=Math.hypot(input.aimX||0,input.aimY||0)>.1?norm(input.aimX,input.aimY):norm(o.x-f.x,o.y-f.y);f.fx=aim.x;f.fy=aim.y;}
 // 행동 끝(공격 판정은 시작 뒤 잠깐 있다가 나간다).
 if(f.state==='attack'&&!f.hitDone&&f.t<=f.hitAt){f.hitDone=true;const step=f.step;melee(s,f,c.reach*(step===2?1.12:1),c.arc*(step===2?1.25:1),c.damage[step],{kind:'light',stun:step===2?.45:.24,knock:step===2?1.4:.5});}
 if(f.state==='heavy'&&!f.hitDone&&f.t<=.12){f.hitDone=true;melee(s,f,c.heavy.reach,c.arc*1.1,c.heavy.damage,{kind:'heavy',stun:.6,knock:2.2,breaker:c.heavy.breaker||1});fx(s,'swing',f.x,f.y,{ink:c.ink,angle:Math.atan2(f.fy,f.fx),r:c.heavy.reach,life:.25,max:.25});}
 if(f.state==='dash'){f.x+=f.dx*13*dt;f.y+=f.dy*13*dt;if(!f.hitDone&&dist(f,o)<1.1){f.hitDone=true;strike(s,f,o,20,{kind:'skill',stun:.5,knock:1.6,dir:{x:f.dx,y:f.dy}});}}
 if(f.state==='leap'&&f.t<=0.02&&!f.hitDone){f.hitDone=true;f.x=f.tx;f.y=f.ty;fx(s,'boom',f.x,f.y,{r:2.1,ink:c.ink,life:.4,max:.4});if(dist(f,o)<2.1)strike(s,f,o,18,{kind:'skill',breaker:2,stun:.55,knock:1.8});event(s,'heavyHit');}
 if(f.state==='dodge'){f.x+=f.dx*12*dt;f.y+=f.dy*12*dt;}
 if(busy){clampArena(f);return;}
 // 새 행동.
 f.blocking=Boolean(input.block)&&f.stun<=0;if(f.blocking&&f.state!=='block'){f.blockSince=s.time;f.state='block';}if(!f.blocking&&f.state==='block')f.state='idle';
 if(input.dodge&&f.dodgeCd<=0){const d=Math.hypot(input.x||0,input.y||0)>.1?norm(input.x,input.y):{x:-f.fx,y:-f.fy};f.state='dodge';f.t=.24;f.inv=.2;f.dodgeCd=DUEL_RULES.dodgeCd;f.dx=d.x;f.dy=d.y;f.blocking=false;event(s,'dash');clampArena(f);return;}
 if(input.ult&&useUlt(s,f)){clampArena(f);return;}
 if(input.skill1&&useSkill(s,f,0)){clampArena(f);return;}
 if(input.skill2&&useSkill(s,f,1)){clampArena(f);return;}
 if(input.heavy){f.state='heavy';f.t=.58;f.hitDone=false;f.blocking=false;event(s,'charge');clampArena(f);return;}
 if(input.attack){f.step=f.combo%3;f.combo++;f.comboTime=c.cadence+.4;f.state='attack';f.t=c.cadence*(f.step===2?1.3:1);f.hitAt=f.t-.1;f.hitDone=false;f.blocking=false;event(s,'swing'+f.step);fx(s,'swing',f.x,f.y,{ink:c.ink,angle:Math.atan2(f.fy,f.fx),r:c.reach,life:.2,max:.2});clampArena(f);return;}
 const mv=norm(input.x||0,input.y||0),moving=Math.hypot(input.x||0,input.y||0)>.1,speed=c.speed*(f.blocking?.45:1)*(f.slow>0?.55:1);
 if(moving){f.x+=mv.x*speed*dt;f.y+=mv.y*speed*dt;}
 clampArena(f);
}
function clampArena(f){const A=DUEL_ARENA;f.x=clamp(f.x,A.minX,A.maxX);f.y=clamp(f.y,A.minY,A.maxY);for(const p of DUEL_PILLARS){const d=dist(f,p),m=p.r+.45;if(d<m&&d>1e-6){f.x=p.x+(f.x-p.x)/d*m;f.y=p.y+(f.y-p.y)/d*m;}}}
export function startDuelRound(s){if(s.phase==='ready'){s.phase='fight';s.message='';return true;}return false;}
export function stepDuel(s,dt,playerInput={},enemyInput=null){
 if(!Number.isFinite(dt)||dt<=0)return;dt=Math.min(dt,.05);s.events.length=Math.min(s.events.length,24);
 for(const e of s.effects)e.life-=dt;s.effects=s.effects.filter(e=>e.life>0);
 if(s.phase==='ready'){s.ready-=dt;if(s.ready<=0){s.phase='fight';s.message='';event(s,'start');}return;}
 if(s.phase==='roundEnd'){s.ready-=dt;if(s.ready<=0){s.round++;resetRound(s);}return;}
 if(s.phase!=='fight')return;
 s.time+=dt;s.roundTime-=dt;
 const [a,b]=s.fighters;act(s,a,playerInput,dt);act(s,b,enemyInput||duelAi(s,1,dt),dt);
 // 서로 겹치지 않게.
 const d=dist(a,b);if(d<.9&&d>1e-6){const push=(.9-d)/2,v=norm(b.x-a.x,b.y-a.y);a.x-=v.x*push;a.y-=v.y*push;b.x+=v.x*push;b.y+=v.y*push;clampArena(a);clampArena(b);}
 for(const q of s.shots){q.life-=dt;q.x+=q.dx*q.speed*dt;q.y+=q.dy*q.speed*dt;const A=DUEL_ARENA;
  if(q.x<A.minX-.5||q.x>A.maxX+.5||q.y<A.minY-.5||q.y>A.maxY+.5||DUEL_PILLARS.some(p=>Math.hypot(q.x-p.x,q.y-p.y)<p.r)){if(q.bounces>0){q.bounces--;if(q.x<A.minX||q.x>A.maxX)q.dx*=-1;else q.dy*=-1;q.x=clamp(q.x,A.minX,A.maxX);q.y=clamp(q.y,A.minY,A.maxY);}else q.life=0;}
  const target=s.fighters[1-q.owner];if(q.life>0&&!q.hit.has(target.team)&&Math.hypot(q.x-target.x,q.y-target.y)<.6){
   if(target.shield>0){q.owner=target.team;q.dx*=-1;q.dy*=-1;q.hit.clear();fx(s,'parry',q.x,q.y,{ink:DUEL_CHARACTERS[target.char].ink});event(s,'reflect');continue;}
   q.hit.add(target.team);strike(s,s.fighters[q.owner],target,q.damage,{kind:'shot',stun:.3,knock:.8,breaker:q.breaker||1,dir:{x:q.dx,y:q.dy}});if(--q.pierce<0)q.life=0;}
 }
 s.shots=s.shots.filter(q=>q.life>0);
 for(const h of s.hazards){h.t-=dt;const owner=s.fighters[h.owner],o=s.fighters[1-h.owner];
  if(h.kind==='well'&&dist(h,o)<h.r){o.slow=.3;}
  if(h.kind==='hole'){if(dist(h,o)<h.r&&o.inv<=0){const v=norm(h.x-o.x,h.y-o.y);o.x+=v.x*2.6*dt;o.y+=v.y*2.6*dt;clampArena(o);h.tick-=dt;if(h.tick<=0){h.tick=.4;strike(s,owner,o,5,{kind:'skill',unblockable:true,stun:.2,knock:0});}}}
  if(h.kind==='mine'&&h.t<=0){fx(s,'boom',h.x,h.y,{r:h.r,ink:'#ffaa65',life:.4,max:.4});if(dist(h,o)<h.r)strike(s,owner,o,20,{kind:'skill',breaker:1.5,stun:.5,knock:1.6,dir:norm(o.x-h.x,o.y-h.y)});event(s,'heavyHit');}
 }
 s.hazards=s.hazards.filter(h=>h.t>0);
 if(s.phase==='fight'&&s.roundTime<=0){const ra=a.hp/a.maxHp,rb=b.hp/b.maxHp;endRound(s,ra>=rb?0:1,'시간 종료 · 체력이 더 많아요');}
}
// AI: 사거리를 재며 다가가고, 상대가 휘두르면 (반응 늦음·확률로) 막거나 반격 막기, 오래 막고 있으면 강공격·잡기로 부순다.
export const DUEL_AI=Object.freeze({easy:{react:.32,block:.35,parry:.05,heavyRead:.2,aggro:.5},normal:{react:.2,block:.6,parry:.18,heavyRead:.5,aggro:.75},hard:{react:.12,block:.8,parry:.38,heavyRead:.75,aggro:.9}});
export function duelAi(s,team,dt){
 const f=s.fighters[team],o=s.fighters[1-team],c=DUEL_CHARACTERS[f.char],cfg=DUEL_AI[s.difficulty]||DUEL_AI.normal,ai=s.ai[team],d=dist(f,o),v=norm(o.x-f.x,o.y-f.y),input={aimX:v.x,aimY:v.y};
 const threat=(o.state==='attack'&&o.t>.08)||(o.state==='heavy'&&o.t>.15)||(o.state==='dash')||s.shots.some(q=>q.owner!==team&&Math.hypot(q.x-f.x,q.y-f.y)<3.5);
 if(threat&&d<(DUEL_CHARACTERS[o.char].reach+2.2)){ai.seen=(ai.seen||0)+dt;
  if(ai.seen>=cfg.react){if(o.state==='heavy'&&rnd(s)<cfg.heavyRead*dt*8){input.dodge=true;input.x=-v.y;input.y=v.x;ai.seen=0;return input;}
   if(!ai.guarding&&rnd(s)<cfg.block){ai.guarding=true;ai.guardFor=.35+rnd(s)*.3;ai.parryTry=rnd(s)<cfg.parry;}}}
 else ai.seen=0;
 if(ai.guarding){ai.guardFor-=dt;input.block=!(ai.parryTry&&f.blocking&&s.time-f.blockSince>.2);if(ai.guardFor<=0)ai.guarding=false;if(f.stun<=0)return input;}
 if(f.stun>0)return input;
 // 오래 막는 상대에게는 강공격·잡기.
 if(o.blocking&&s.time-o.blockSince>.45&&d<c.heavy.reach+.4&&rnd(s)<cfg.aggro*dt*6){if(f.char==='gravity'&&f.cd[0]<=0){input.skill1=true;return input;}input.heavy=true;return input;}
 if(f.meter>=100&&d<(f.char==='pierce'?9:4)){input.ult=true;return input;}
 if(f.cd[1]<=0&&((f.char==='pierce'||f.char==='reflect')&&d>3&&d<10||f.char==='gravity'&&d<3||f.char==='burst'&&d<6)&&rnd(s)<dt*2){input.skill2=true;return input;}
 if(f.cd[0]<=0&&(f.char==='pierce'&&d>2.5&&d<5.5||f.char==='burst'&&d<2||f.char==='gravity'&&d<5&&d>1.6||f.char==='reflect'&&threat)&&rnd(s)<dt*2.5){input.skill1=true;return input;}
 const want=c.reach*.85;
 if(d>want+.3){input.x=v.x;input.y=v.y;}else if(d<want-.9&&f.char==='pierce'){input.x=-v.x;input.y=-v.y;}
 else{input.x=-v.y*Math.sin(s.time*1.3);input.y=v.x*Math.sin(s.time*1.3);if(rnd(s)<cfg.aggro*dt*5)input.attack=true;}
 return input;
}
