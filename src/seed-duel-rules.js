// 2026-09-28 사용자: "서바이벌 프로젝트… 막기가 있어서 완전 컨트롤 싸움처럼 느껴졌고 캐릭마다 특징이 다양했다"
// 씨앗 대전 1차: 1:1(AI), 캐릭터 4명. 공격은 막기에, 막기는 강공격·잡기에, 강공격은 공격(끊기)·반격 막기에 진다.
// 그림·렌더러와 무관한 규칙. 계정·저장에 쓰지 않는다(보상 없는 시험 모드).
// 2026-09-28 사용자: "맵은 조금만 더 넓게 · 확대는 조금 더" — 경기장을 넓히고(카메라가 두 씨앗을 따라간다), 기둥 네 개.
export const DUEL_ARENA=Object.freeze({minX:1.5,maxX:33.5,minY:2,maxY:19.5});
export const DUEL_PILLARS=Object.freeze([{x:10.5,y:6.2,r:.85},{x:24.5,y:6.2,r:.85},{x:10.5,y:15.4,r:.85},{x:24.5,y:15.4,r:.85}]);
export const DUEL_SPAWN=Object.freeze([{x:11.5,y:10.8},{x:23.5,y:10.8}]);
export const DUEL_RULES=Object.freeze({roundsToWin:2,roundSeconds:75,guardMax:100,guardRegen:14,blockDamage:.2,parryWindow:.16,guardBreakStun:1.05,dodgeCd:1,meterMax:100});
const skill=(name,cooldown,desc)=>Object.freeze({name,cooldown,desc});
export const DUEL_CHARACTERS=Object.freeze({
 pierce:Object.freeze({id:'pierce',name:'창 씨앗',role:'긴 사거리 · 찌르기',hp:178,speed:4.5,reach:2.5,arc:.62,damage:[11,11,17],cadence:.34,heavy:{damage:22,reach:2.6},parry:1,tile:4,ink:'#dbf6b1',
  skills:[skill('돌진 찌르기',4.5,'앞으로 달려가며 꿰뚫어요'),skill('관통 투창',3.5,'멀리 날아가 둘을 꿰뚫는 창')],ult:skill('천 개의 창',0,'세 줄의 창이 앞을 쓸어요'),
  blurb:'가장 멀리서 찌르지만, 붙으면 약해요.'}),
 burst:Object.freeze({id:'burst',name:'불꽃 씨앗',role:'한 방 · 막기 파괴',hp:146,speed:3.8,reach:1.6,arc:1.1,damage:[11,11,16],cadence:.48,heavy:{damage:26,reach:1.9,breaker:1.25},parry:1,tile:5,ink:'#ffaa65',
  skills:[skill('불씨 심기',5,'잠시 뒤 터지는 불씨를 발밑에'),skill('화염 도약',6,'뛰어올라 내려찍어요 · 막기를 부숴요')],ult:skill('대폭발',0,'둘레를 크게 터뜨려요'),
  blurb:'느리지만 세고, 막고 있는 상대를 잘 부숴요.'}),
 reflect:Object.freeze({id:'reflect',name:'거울 씨앗',role:'막기 전문 · 반격',hp:170,speed:4.3,reach:1.75,arc:.9,damage:[10,10,15],cadence:.34,heavy:{damage:21,reach:1.9},parry:1.9,tile:0,ink:'#91e4ff',
  skills:[skill('거울 방패',6,'잠깐 모든 공격을 막고 탄을 되돌려요'),skill('수정 탄',3,'벽에 두 번 튕기는 수정')],ult:skill('거울 감옥',0,'상대를 거울에 가둬 묶어요'),
  blurb:'반격 막기 판정이 넓고, 날아오는 탄을 되돌려요.'}),
 gravity:Object.freeze({id:'gravity',name:'중력 씨앗',role:'잡기 · 제어',hp:136,speed:3.9,reach:1.7,arc:.9,damage:[9,9,12],cadence:.38,heavy:{damage:21,reach:2},parry:1,tile:7,ink:'#d2a0ff',
  skills:[skill('끌어당기기',6.5,'앞의 상대를 끌어와 묶어요 · 막기 무시'),skill('중력장',7,'둘레의 상대를 느리게')],ult:skill('블랙홀',0,'상대를 빨아들이며 계속 때려요'),
  blurb:'막고 있는 상대도 끌어와 무너뜨려요.'})
 // 2026-09-28 사용자: "캐릭터 추가해 보자" — 나머지 다섯 법칙. 버튼 네 개 방식이라 기술(공격+회피) 하나와 필살 하나씩.
 ,split:Object.freeze({id:'split',name:'분열 씨앗',role:'빠른 연타 · 꽃잎',hp:196,speed:4.9,reach:1.55,arc:1,damage:[9,9,13],cadence:.27,heavy:{damage:21,reach:1.7},parry:1,tile:1,ink:'#b5ec83',
  skills:[skill('꽃잎 부채',2.8,'꽃잎 세 장을 부채꼴로 흩뿌려요'),skill('꽃잎 부채',3.2,'')],ult:skill('꽃잎 폭풍',0,'사방으로 꽃잎을 두 번 터뜨려요'),
  blurb:'가장 빠르게 휘두르고 가볍게 뛰어요. 한 방은 약해요.'})
 ,chain:Object.freeze({id:'chain',name:'연쇄 씨앗',role:'중거리 번개 · 기절',hp:146,speed:4.2,reach:1.7,arc:.95,damage:[9,9,13],cadence:.36,heavy:{damage:21,reach:1.9},parry:1,tile:2,ink:'#ffdd78',
  skills:[skill('번개 사슬',5.5,'앞의 상대에게 번개를 꽂아 잠깐 기절시켜요'),skill('번개 사슬',4.5,'')],ult:skill('낙뢰',0,'상대 자리에 번개가 다섯 번 떨어져요'),
  blurb:'거리를 두고 번개로 끊어 들어가요.'})
 ,recall:Object.freeze({id:'recall',name:'귀환 씨앗',role:'부메랑 · 두 번 베기',hp:200,speed:4.5,reach:1.7,arc:.95,damage:[11,11,16],cadence:.34,heavy:{damage:21,reach:1.8},parry:1,tile:6,ink:'#9cf0ba',
  skills:[skill('귀환 칼날',3.8,'던진 칼날이 갔다가 돌아오며 두 번 베어요'),skill('귀환 칼날',3.8,'')],ult:skill('칼날 회오리',0,'칼날 넷이 사방으로 날아갔다 돌아와요'),
  blurb:'던지고 받으며 앞뒤로 두 번 벨 수 있어요.'})
 ,orbit:Object.freeze({id:'orbit',name:'공전 씨앗',role:'붙어서 싸우기 · 고리',hp:140,speed:4,reach:1.4,arc:1.2,damage:[10,10,14],cadence:.4,heavy:{damage:22,reach:1.7},parry:1,tile:3,ink:'#ffeaa0',
  skills:[skill('공전 고리',7.5,'몸 주위를 도는 구슬이 가까운 상대를 계속 때려요'),skill('공전 고리',6,'')],ult:skill('큰 고리',0,'더 크고 오래 도는 고리'),
  blurb:'튼튼하고, 붙어 있을수록 강해요.'})
 ,frost:Object.freeze({id:'frost',name:'빙결 씨앗',role:'느리게 묶기 · 제어',hp:158,speed:4.1,reach:1.6,arc:1,damage:[9,9,13],cadence:.38,heavy:{damage:21,reach:1.8},parry:1.2,tile:8,ink:'#8ce9ff',
  skills:[skill('서리 숨결',5,'앞쪽 부채꼴에 서리를 뿜어 느리게 해요'),skill('서리 숨결',5,'')],ult:skill('눈보라',0,'주위를 느리게 하다 끝에 얼려요'),
  blurb:'상대를 느리게 만들어 거리를 지배해요.'})
});
export const DUEL_ORDER=Object.freeze(['pierce','burst','reflect','gravity','split','chain','recall','orbit','frost']);
const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
const dist=(a,b)=>Math.hypot(a.x-b.x,a.y-b.y);
const norm=(x,y)=>{const d=Math.hypot(x,y)||1;return {x:x/d,y:y/d};};
function rnd(s){s.seed=(Math.imul(s.seed,1664525)+1013904223)>>>0;return s.seed/4294967296;}

function fighter(team,char,x,y){const c=DUEL_CHARACTERS[char];return {team,char,x,y,hp:c.hp,maxHp:c.hp,guard:DUEL_RULES.guardMax,meter:0,fx:team===0?1:-1,fy:0,state:'idle',t:0,combo:0,comboTime:0,blockSince:-9,blocking:false,stun:0,inv:0,dodgeCd:0,cd:[0,0],kx:0,ky:0,shield:0,slow:0,heldBy:0,hitDone:false,dx:0,dy:0,step:0,lastHitBy:0,total:0,cancelAt:0,buffer:null,linked:false,chain:0,chainTime:0,flash:0};}
// practice: 콤보 연습(쓰러지지 않고 체력이 다시 차며, 시간이 흐르지 않는다).
export function createDuel({player='pierce',enemy='burst',seed=1,difficulty='normal',practice=false}={}){
 const s={seed:seed>>>0,practice:Boolean(practice),phase:'ready',round:1,wins:[0,0],time:0,roundTime:DUEL_RULES.roundSeconds,difficulty,fighters:[fighter(0,player,DUEL_SPAWN[0].x,DUEL_SPAWN[0].y),fighter(1,enemy,DUEL_SPAWN[1].x,DUEL_SPAWN[1].y)],shots:[],hazards:[],effects:[],events:[],message:'1라운드',ready:1.2,winner:-1,ai:[{},{}]};
 return s;
}
function event(s,type){s.events.push(type);if(s.events.length>24)s.events.shift();}
function fx(s,type,x,y,extra={}){if(s.effects.length>=120)s.effects.shift();s.effects.push({type,x,y,life:.35,max:.35,...extra});}
function resetRound(s){for(const f of s.fighters){const c=DUEL_CHARACTERS[f.char],p=DUEL_SPAWN[f.team];Object.assign(f,fighter(f.team,f.char,p.x,p.y),{meter:f.meter*.5});f.hp=c.hp;}s.shots.length=0;s.hazards.length=0;s.roundTime=DUEL_RULES.roundSeconds;s.phase='ready';s.ready=1.2;s.message=`${s.round}라운드`;}
const facingHit=(def,att)=>{const v=norm(att.x-def.x,att.y-def.y);return v.x*def.fx+v.y*def.fy>-.2;};
// 한 번의 피해. kind: light|heavy|skill|shot|grab. 막기·반격 막기·막기 파괴를 여기서 가른다.
function strike(s,att,def,damage,{kind='light',knock=1,stun=.25,unblockable=false,breaker=1,dir=null}={}){
 if(def.hp<=0||def.inv>0)return false;const c=DUEL_CHARACTERS[def.char];
 if(def.shield>0&&kind!=='grab'){fx(s,'parry',def.x,def.y,{ink:c.ink});event(s,'reflect');if(kind!=='shot'){strike(s,def,att,10,{kind:'skill',stun:.35,knock:.8});}return false;}
 const front=facingHit(def,att);
 if(def.blocking&&front&&!unblockable){
  // 반격 막기: 막기를 누른 직후(짧은 창) 맞으면 공격한 쪽이 크게 흔들린다.
  if(s.time-def.blockSince<=DUEL_RULES.parryWindow*c.parry&&kind!=='shot'){att.state='stagger';att.t=.85;att.stun=.85;att.buffer=null;def.meter=clamp(def.meter+22,0,100);s.freeze=.08;s.shake=Math.max(s.shake||0,.3);fx(s,'parry',def.x,def.y,{ink:c.ink});event(s,'parry');s.message='반격 막기!';return false;}
  if(kind==='heavy'||kind==='skill'&&breaker>1){def.guard-=45*breaker;}
  def.guard-=damage*1.3;const chip=damage*DUEL_RULES.blockDamage;def.hp-=chip;event(s,'block');fx(s,'block',def.x,def.y,{ink:c.ink});
  if(def.guard<=0){def.guard=0;def.blocking=false;def.state='broken';def.t=DUEL_RULES.guardBreakStun;def.stun=DUEL_RULES.guardBreakStun;event(s,'guardBreak');fx(s,'guardBreak',def.x,def.y,{});s.message='막기 파괴!';s.freeze=.08;s.shake=.45;}
  // 막힌 평타는 공격한 쪽이 튕겨 연타가 끊긴다(막은 쪽이 먼저 움직일 수 있다).
  if(kind==='light'&&att.state==='attack'){att.cancelAt=-1;att.t=Math.max(att.t,.24);att.buffer=null;att.combo=0;const v=norm(att.x-def.x,att.y-def.y);att.kx+=v.x*2.2;att.ky+=v.y*2.2;}
  att.meter=clamp(att.meter+3,0,100);checkKo(s);return true;
 }
 def.hp-=damage;def.stun=Math.max(def.stun,stun);def.state='hit';def.t=stun;def.blocking=false;def.buffer=null;def.flash=.14;att.chain=(att.chainTime>0?att.chain:0)+1;att.chainTime=.9;
 // 멈칫(히트스톱)은 강공격·스킬에만 아주 짧게 — 모험에서 과하면 끊겨 보였다.
 if(kind==='heavy'||kind==='skill')s.freeze=Math.max(s.freeze||0,.055);s.shake=Math.max(s.shake||0,kind==='heavy'?.35:kind==='skill'?.25:.08);const v=dir||norm(def.x-att.x,def.y-att.y);def.kx+=v.x*knock*5;def.ky+=v.y*knock*5;
 att.meter=clamp(att.meter+8,0,100);def.meter=clamp(def.meter+5,0,100);def.lastHitBy=att.team;event(s,kind==='heavy'?'heavyHit':'hit');fx(s,kind==='heavy'?'heavy':'hit',def.x,def.y,{ink:DUEL_CHARACTERS[att.char].ink,text:Math.round(damage)});
 checkKo(s);return true;
}
function checkKo(s){for(const f of s.fighters)if(f.hp<=0&&s.phase==='fight'){if(s.practice){f.hp=f.maxHp;f.guard=DUEL_RULES.guardMax;continue;}f.hp=0;endRound(s,1-f.team,'쓰러뜨렸어요');}}
function endRound(s,winner,why){s.wins[winner]++;s.phase='roundEnd';s.ready=1.8;s.message=`${winner===0?'승리':'패배'} · ${why}`;event(s,winner===0?'win':'lose');if(s.wins[winner]>=DUEL_RULES.roundsToWin){s.phase='over';s.winner=winner;s.message=winner===0?'대전 승리!':'대전 패배';}}
function melee(s,f,reach,arc,damage,opts={}){const o=s.fighters[1-f.team],v=norm(o.x-f.x,o.y-f.y),front=v.x*f.fx+v.y*f.fy;if(dist(f,o)<=reach+.45&&front>Math.cos(arc))return strike(s,f,o,damage,opts);return false;}
function shoot(s,f,extra){s.shots.push({owner:f.team,x:f.x+f.fx*.6,y:f.y+f.fy*.6,dx:f.fx,dy:f.fy,speed:11,life:1.2,damage:12,pierce:0,bounces:0,hit:new Set(),law:f.char,...extra});}
function useSkill(s,f,i){
 const c=DUEL_CHARACTERS[f.char],o=s.fighters[1-f.team];if(f.cd[i]>0||f.stun>0||['attack','heavy','skill','dodge'].includes(f.state))return false;
 f.cd[i]=c.skills[i].cooldown;f.state='skill';f.t=.35;f.hitDone=false;event(s,'skill');
 if(f.char==='pierce'){if(i===0){f.state='dash';f.t=.3;f.dx=f.fx;f.dy=f.fy;f.hitDone=false;}else shoot(s,f,{damage:16,pierce:1,speed:14,kind:'lance'});}
 if(f.char==='burst'){if(i===0)s.hazards.push({kind:'mine',owner:f.team,x:f.x,y:f.y,t:.9,r:2.1});else{f.state='leap';f.t=.55;f.tx=clamp(o.x,DUEL_ARENA.minX,DUEL_ARENA.maxX);f.ty=clamp(o.y,DUEL_ARENA.minY,DUEL_ARENA.maxY);s.hazards.push({kind:'tell',owner:f.team,x:f.tx,y:f.ty,t:.55,r:2.1});}}
 if(f.char==='reflect'){if(i===0){f.shield=1.1;f.state='idle';f.t=0;fx(s,'shield',f.x,f.y,{ink:c.ink,life:1.1,max:1.1});}else shoot(s,f,{damage:12,bounces:2,speed:10,kind:'crystal'});}
 if(f.char==='split')for(const off of [-.32,0,.32]){const a=Math.atan2(f.fy,f.fx)+off;s.shots.push({owner:f.team,x:f.x+f.fx*.5,y:f.y+f.fy*.5,dx:Math.cos(a),dy:Math.sin(a),speed:10,life:.6,damage:10,pierce:0,bounces:0,hit:new Set(),law:'split',kind:'petal'});}
 if(f.char==='chain'){const v=norm(o.x-f.x,o.y-f.y);if(dist(f,o)<5.8&&v.x*f.fx+v.y*f.fy>.3&&o.inv<=0){strike(s,f,o,10,{kind:'skill',stun:.35,knock:.3});fx(s,'bolt',o.x,o.y,{ink:c.ink,fromX:f.x,fromY:f.y,life:.3,max:.3});}else fx(s,'bolt',f.x+f.fx*5,f.y+f.fy*5,{ink:c.ink,fromX:f.x,fromY:f.y,life:.3,max:.3});}
 if(f.char==='recall')s.shots.push({owner:f.team,x:f.x+f.fx*.5,y:f.y+f.fy*.5,dx:f.fx,dy:f.fy,speed:11,life:1.6,damage:15,pierce:1,bounces:0,hit:new Set(),law:'recall',kind:'blade',turn:.55,age:0});
 if(f.char==='orbit')s.hazards.push({kind:'ring',owner:f.team,x:f.x,y:f.y,t:2.2,r:1.6,tick:0,follow:true,damage:3});
 if(f.char==='frost'){const v=norm(o.x-f.x,o.y-f.y);fx(s,'breath',f.x,f.y,{ink:c.ink,angle:Math.atan2(f.fy,f.fx),r:3.6,life:.4,max:.4});if(dist(f,o)<3.9&&v.x*f.fx+v.y*f.fy>.5){strike(s,f,o,9,{kind:'skill',stun:.25,knock:.4});o.slow=Math.max(o.slow,1.1);}}
 if(f.char==='gravity'){if(i===0){const v=norm(o.x-f.x,o.y-f.y);if(dist(f,o)<5.5&&v.x*f.fx+v.y*f.fy>.35&&o.inv<=0){o.x=f.x+f.fx*1.1;o.y=f.y+f.fy*1.1;strike(s,f,o,8,{kind:'grab',unblockable:true,stun:.6,knock:.2});fx(s,'pull',o.x,o.y,{ink:c.ink});}else fx(s,'miss',f.x+f.fx*2,f.y+f.fy*2,{});}else s.hazards.push({kind:'well',owner:f.team,x:f.x+f.fx*1.5,y:f.y+f.fy*1.5,t:2.6,r:2.6});}
 return true;
}
function useUlt(s,f){
 const o=s.fighters[1-f.team],c=DUEL_CHARACTERS[f.char];if(f.meter<DUEL_RULES.meterMax||f.stun>0)return false;f.meter=0;f.inv=.5;event(s,'ultimate');fx(s,'ult',f.x,f.y,{ink:c.ink,life:.8,max:.8});s.message=c.ult.name;
 if(f.char==='pierce')for(const off of [-.35,0,.35]){const a=Math.atan2(f.fy,f.fx)+off;s.shots.push({owner:f.team,x:f.x,y:f.y,dx:Math.cos(a),dy:Math.sin(a),speed:15,life:1.4,damage:16,pierce:3,bounces:0,hit:new Set(),law:'pierce',kind:'lance',unblockable:false,breaker:1.5});}
 if(f.char==='burst'){if(dist(f,o)<4.2)strike(s,f,o,40,{kind:'skill',breaker:2,stun:.8,knock:2});fx(s,'boom',f.x,f.y,{r:4.2,ink:c.ink,life:.6,max:.6});}
 if(f.char==='reflect'){if(dist(f,o)<8){o.state='jailed';o.t=1.6;o.stun=1.6;o.blocking=false;fx(s,'jail',o.x,o.y,{ink:c.ink,life:1.6,max:1.6});}}
 if(f.char==='split')for(const wave of [0,1])for(let k=0;k<8;k++){const a=k/8*Math.PI*2+wave*.39;s.shots.push({owner:f.team,x:f.x,y:f.y,dx:Math.cos(a),dy:Math.sin(a),speed:wave?8:10,life:.9,damage:9,pierce:0,bounces:0,hit:new Set(),law:'split',kind:'petal'});}
 if(f.char==='chain')for(let k=0;k<5;k++)s.hazards.push({kind:'strike',owner:f.team,x:o.x,y:o.y,t:.45+k*.3,r:1.35,aim:true});
 if(f.char==='recall')for(let k=0;k<4;k++){const a=Math.atan2(f.fy,f.fx)+k*Math.PI/2;s.shots.push({owner:f.team,x:f.x,y:f.y,dx:Math.cos(a),dy:Math.sin(a),speed:10,life:1.8,damage:11,pierce:1,bounces:0,hit:new Set(),law:'recall',kind:'blade',turn:.6,age:0});}
 if(f.char==='orbit')s.hazards.push({kind:'ring',owner:f.team,x:f.x,y:f.y,t:3.5,r:2.8,tick:0,follow:true,damage:5});
 if(f.char==='frost')s.hazards.push({kind:'blizzard',owner:f.team,x:f.x,y:f.y,t:2.6,r:4.4,tick:0,follow:true});
 if(f.char==='gravity')s.hazards.push({kind:'hole',owner:f.team,x:f.x+f.fx*3,y:f.y+f.fy*3,t:2.2,r:3.4,tick:0});
 return true;
}
// 입력: {x,y 이동, aimX,aimY, attack, heavy, block(누르는 중), dodge, skill1, skill2, ult}
function act(s,f,input,dt){
 const c=DUEL_CHARACTERS[f.char],A=DUEL_ARENA;
 for(const k of ['t','stun','inv','dodgeCd','comboTime','shield','slow','chainTime','flash'])f[k]=Math.max(0,f[k]-dt);
 // 2026-09-28 사용자: "평타 1·2타가 이어지는 맛 · 공격과 강공격이 끊어져 연계가 없다 · 모션이 답답하다"
 // 누른 행동은 잠깐(0.3초) 기억해 두었다가, 지금 동작이 끝나거나 끊을 수 있는 순간에 바로 이어서 낸다.
 for(const a of ['attack','heavy','dodge','skill1','skill2','ult'])if(input[a]){f.buffer={act:a,t:.3};break;}
 if(f.buffer){f.buffer.t-=dt;if(f.buffer.t<=0)f.buffer=null;}f.cd[0]=Math.max(0,f.cd[0]-dt);f.cd[1]=Math.max(0,f.cd[1]-dt);
 if(!f.blocking)f.guard=Math.min(DUEL_RULES.guardMax,f.guard+DUEL_RULES.guardRegen*dt);if(f.comboTime<=0)f.combo=0;
 f.x+=f.kx*dt;f.y+=f.ky*dt;const k=Math.exp(-8*dt);f.kx*=k;f.ky*=k;
 // 공격이 나간 뒤(맞든 안 맞든) 끊는 순간부터는 다음 공격·연계 강공격·회피로 이어 갈 수 있다.
 // 2026-09-28 사용자: "기본 공격만 계속 누르면 (상대가) 죽는다" — 1→2→3타 뒤에 곧바로 다시 1타로 이어져 끝없이 묶였다.
 // 3타 뒤에는 강공격·회피로만 끊을 수 있고, 다시 평타를 치려면 3타 동작이 끝나야 한다.
 const cancel=Boolean(f.stun<=0&&f.buffer&&(f.state==='attack'||f.state==='heavy')&&f.hitDone&&f.t<=f.cancelAt&&f.t>0&&!(f.state==='attack'&&f.step===2&&f.buffer.act==='attack'));
 const busy=!cancel&&(f.stun>0||['attack','heavy','skill','dash','leap','dodge'].includes(f.state)&&f.t>0);
 const wants=a=>Boolean(input[a])||f.buffer?.act===a;
 // 2026-09-28 사용자: "회피를 누르면 쭉 밀린다" — 회피·돌진이 끝나도 상태가 남아 매 장면 계속 미끄러졌다. 끝난 동작은 모두 대기로.
 if(!busy&&f.stun<=0&&(['hit','broken','stagger','jailed'].includes(f.state)||f.t<=0&&['dodge','dash','leap','skill','attack','heavy'].includes(f.state)))f.state='idle';
 // 방향: 이동 중이면 이동 쪽, 아니면 조준 쪽(없으면 상대 쪽).
 const o=s.fighters[1-f.team];
 if(!busy){const aim=Math.hypot(input.aimX||0,input.aimY||0)>.1?norm(input.aimX,input.aimY):norm(o.x-f.x,o.y-f.y);f.fx=aim.x;f.fy=aim.y;}
 // 행동 끝(공격 판정은 시작 뒤 잠깐 있다가 나간다).
 if(f.state==='attack'&&!f.hitDone&&f.t<=f.hitAt){f.hitDone=true;const step=f.step;fx(s,'swing',f.x,f.y,{ink:c.ink,char:f.char,step,angle:Math.atan2(f.fy,f.fx),r:c.reach*(step===2?1.12:1),life:.26,max:.26,team:f.team});melee(s,f,c.reach*(step===2?1.12:1),c.arc*(step===2?1.25:1),c.damage[step],{kind:'light',stun:step===2?.3:.24,knock:step===2?1.7:.5});}
 if(f.state==='heavy'&&!f.hitDone&&f.t<=.12){f.hitDone=true;fx(s,'heavySwing',f.x,f.y,{ink:c.ink,char:f.char,linked:f.linked,angle:Math.atan2(f.fy,f.fx),r:c.heavy.reach,life:.34,max:.34,team:f.team});melee(s,f,c.heavy.reach,c.arc*1.1,Math.round(c.heavy.damage*(f.linked?1.15:1)),{kind:'heavy',stun:.6,knock:2.2,breaker:c.heavy.breaker||1});}
 if(f.state==='dash'&&f.t>0){f.x+=f.dx*13*dt;f.y+=f.dy*13*dt;if(!f.hitDone&&dist(f,o)<1.1){f.hitDone=true;strike(s,f,o,20,{kind:'skill',stun:.5,knock:1.6,dir:{x:f.dx,y:f.dy}});}}
 if(f.state==='leap'&&f.t<=0.02&&!f.hitDone){f.hitDone=true;f.x=f.tx;f.y=f.ty;fx(s,'boom',f.x,f.y,{r:2.1,ink:c.ink,life:.4,max:.4});if(dist(f,o)<2.1)strike(s,f,o,18,{kind:'skill',breaker:2,stun:.55,knock:1.8});event(s,'heavyHit');}
 if(f.state==='dodge'&&f.t>0){f.x+=f.dx*12*dt;f.y+=f.dy*12*dt;}
 // 휘두르는 동안에도 조금은 움직일 수 있다(발이 묶인 답답함 줄이기).
 if(busy&&(f.state==='attack'||f.state==='heavy')&&f.stun<=0){const m=Math.hypot(input.x||0,input.y||0);if(m>.1){f.x+=(input.x/m)*c.speed*.28*dt;f.y+=(input.y/m)*c.speed*.28*dt;}}
 if(busy){clampArena(f);return;}
 const was=cancel?f.state:'';if(cancel){f.state='idle';f.t=0;}
 // 새 행동.
 f.blocking=Boolean(input.block)&&f.stun<=0;if(f.blocking&&f.state!=='block'){f.blockSince=s.time;f.state='block';}if(!f.blocking&&f.state==='block')f.state='idle';
 if(wants('dodge')&&f.dodgeCd<=0){f.buffer=null;const d=Math.hypot(input.x||0,input.y||0)>.1?norm(input.x,input.y):{x:-f.fx,y:-f.fy};f.state='dodge';f.t=.24;f.inv=.2;f.dodgeCd=DUEL_RULES.dodgeCd;f.dx=d.x;f.dy=d.y;f.blocking=false;event(s,'dash');clampArena(f);return;}
 if(wants('ult')&&useUlt(s,f)){f.buffer=null;clampArena(f);return;}
 if(wants('skill1')&&useSkill(s,f,0)){f.buffer=null;clampArena(f);return;}
 if(wants('skill2')&&useSkill(s,f,1)){f.buffer=null;clampArena(f);return;}
 // 연계 강공격: 평타가 나간 직후 이어 누르면 준비가 짧고(0.24초) 조금 더 세다.
 if(wants('heavy')){const link=was==='attack';f.buffer=null;f.state='heavy';f.linked=link;f.total=f.t=link?.36:.58;f.cancelAt=.06;f.hitDone=false;f.blocking=false;f.combo=0;lunge(s,f,link?5.5:3.2);event(s,link?'link':'charge');clampArena(f);return;}
 if(wants('attack')){f.buffer=null;f.step=f.combo%3;f.combo++;f.comboTime=c.cadence+.45;f.state='attack';f.total=f.t=c.cadence*(f.step===2?1.3:1)+(f.step===2?.16:0);f.hitAt=f.t-.1;f.cancelAt=f.t-.17;f.hitDone=false;f.blocking=false;lunge(s,f,f.step===2?4.2:2.6);event(s,'swing'+f.step);clampArena(f);return;}
 const mv=norm(input.x||0,input.y||0),moving=Math.hypot(input.x||0,input.y||0)>.1,speed=c.speed*(f.blocking?.45:1)*(f.slow>0?.55:1);
 if(moving){f.x+=mv.x*speed*dt;f.y+=mv.y*speed*dt;}
 clampArena(f);
}
// 휘두를 때 앞으로 한 걸음(상대가 코앞이면 덜 나간다).
function lunge(s,f,speed){const o=s.fighters[1-f.team],d=dist(f,o),v=norm(o.x-f.x,o.y-f.y),front=v.x*f.fx+v.y*f.fy>.5,k=front?clamp((d-1)/1.6,0,1):1;f.kx+=f.fx*speed*k;f.ky+=f.fy*speed*k;}
function clampArena(f){const A=DUEL_ARENA;f.x=clamp(f.x,A.minX,A.maxX);f.y=clamp(f.y,A.minY,A.maxY);for(const p of DUEL_PILLARS){const d=dist(f,p),m=p.r+.45;if(d<m&&d>1e-6){f.x=p.x+(f.x-p.x)/d*m;f.y=p.y+(f.y-p.y)/d*m;}}}
export function startDuelRound(s){if(s.phase==='ready'){s.phase='fight';s.message='';return true;}return false;}
export function stepDuel(s,dt,playerInput={},enemyInput=null){
 if(!Number.isFinite(dt)||dt<=0)return;dt=Math.min(dt,.05);s.events.length=Math.min(s.events.length,24);
 for(const e of s.effects)e.life-=dt;s.effects=s.effects.filter(e=>e.life>0);
 if(s.phase==='ready'){s.ready-=dt;if(s.ready<=0){s.phase='fight';s.message='';event(s,'start');}return;}
 if(s.phase==='roundEnd'){s.ready-=dt;if(s.ready<=0){s.round++;resetRound(s);}return;}
 if(s.phase!=='fight')return;
 s.shake=Math.max(0,(s.shake||0)-dt*1.6);
 if(s.freeze>0){s.freeze-=dt;return;}
 s.time+=dt;if(!s.practice)s.roundTime-=dt;
 const [a,b]=s.fighters;act(s,a,playerInput,dt);act(s,b,enemyInput||duelAi(s,1,dt),dt);
 // 서로 겹치지 않게.
 const d=dist(a,b);if(d<.9&&d>1e-6){const push=(.9-d)/2,v=norm(b.x-a.x,b.y-a.y);a.x-=v.x*push;a.y-=v.y*push;b.x+=v.x*push;b.y+=v.y*push;clampArena(a);clampArena(b);}
 for(const q of s.shots){q.life-=dt;
  // 귀환 칼날: 잠깐 날아간 뒤 던진 씨앗에게 돌아온다(돌아오는 길에 한 번 더 벨 수 있다). 받으면 사라진다.
  if(q.kind==='blade'){q.age+=dt;if(q.age>=q.turn){const home=s.fighters[q.owner],v=norm(home.x-q.x,home.y-q.y);if(!q.back){q.back=true;q.hit.clear();q.pierce=1;}q.dx=v.x;q.dy=v.y;q.speed=12;if(Math.hypot(home.x-q.x,home.y-q.y)<.6)q.life=0;}}
  q.x+=q.dx*q.speed*dt;q.y+=q.dy*q.speed*dt;const A=DUEL_ARENA;
  if(q.kind!=='blade'&&(q.x<A.minX-.5||q.x>A.maxX+.5||q.y<A.minY-.5||q.y>A.maxY+.5||DUEL_PILLARS.some(p=>Math.hypot(q.x-p.x,q.y-p.y)<p.r))){if(q.bounces>0){q.bounces--;if(q.x<A.minX||q.x>A.maxX)q.dx*=-1;else q.dy*=-1;q.x=clamp(q.x,A.minX,A.maxX);q.y=clamp(q.y,A.minY,A.maxY);}else q.life=0;}
  const target=s.fighters[1-q.owner];if(q.life>0&&!q.hit.has(target.team)&&Math.hypot(q.x-target.x,q.y-target.y)<.6){
   if(target.shield>0){q.owner=target.team;q.dx*=-1;q.dy*=-1;q.hit.clear();fx(s,'parry',q.x,q.y,{ink:DUEL_CHARACTERS[target.char].ink});event(s,'reflect');continue;}
   q.hit.add(target.team);strike(s,s.fighters[q.owner],target,q.damage,{kind:'shot',stun:.3,knock:.8,breaker:q.breaker||1,dir:{x:q.dx,y:q.dy}});if(--q.pierce<0)q.life=0;}
 }
 s.shots=s.shots.filter(q=>q.life>0);
 for(const h of s.hazards){h.t-=dt;const owner=s.fighters[h.owner],o=s.fighters[1-h.owner];
  if(h.follow){h.x=owner.x;h.y=owner.y;}
  if(h.kind==='well'&&dist(h,o)<h.r){o.slow=.3;}
  if(h.kind==='ring'){h.tick-=dt;if(h.tick<=0&&dist(h,o)<h.r+.3&&o.inv<=0){h.tick=.45;strike(s,owner,o,h.damage,{kind:'skill',stun:.15,knock:.5});}}
  if(h.kind==='blizzard'){if(dist(h,o)<h.r){o.slow=Math.max(o.slow,.3);h.tick-=dt;if(h.tick<=0){h.tick=.5;strike(s,owner,o,3,{kind:'skill',unblockable:true,stun:.08,knock:0});}}if(h.t<=dt&&dist(h,o)<h.r&&o.inv<=0){o.state='jailed';o.t=.8;o.stun=.8;o.blocking=false;fx(s,'jail',o.x,o.y,{ink:'#8ce9ff',life:1.1,max:1.1});}}
  if(h.kind==='strike'){if(h.aim&&h.t>.25){h.x+=(o.x-h.x)*Math.min(1,dt*3);h.y+=(o.y-h.y)*Math.min(1,dt*3);}if(h.t<=0){fx(s,'bolt',h.x,h.y,{ink:'#ffdd78',fromX:h.x,fromY:h.y-6,life:.3,max:.3});if(dist(h,o)<h.r&&o.inv<=0)strike(s,owner,o,7,{kind:'skill',stun:.3,knock:.4,breaker:1.2});event(s,'hit');}}
  if(h.kind==='hole'){if(dist(h,o)<h.r&&o.inv<=0){const v=norm(h.x-o.x,h.y-o.y);o.x+=v.x*2.6*dt;o.y+=v.y*2.6*dt;clampArena(o);h.tick-=dt;if(h.tick<=0){h.tick=.4;strike(s,owner,o,5,{kind:'skill',unblockable:true,stun:.2,knock:0});}}}
  if(h.kind==='mine'&&h.t<=0){fx(s,'boom',h.x,h.y,{r:h.r,ink:'#ffaa65',life:.4,max:.4});if(dist(h,o)<h.r)strike(s,owner,o,20,{kind:'skill',breaker:1.5,stun:.5,knock:1.6,dir:norm(o.x-h.x,o.y-h.y)});event(s,'heavyHit');}
 }
 s.hazards=s.hazards.filter(h=>h.t>0);
 if(s.phase==='fight'&&s.roundTime<=0){const ra=a.hp/a.maxHp,rb=b.hp/b.maxHp;endRound(s,ra>=rb?0:1,'시간 종료 · 체력이 더 많아요');}
}
// AI: 사거리를 재며 다가가고, 상대가 휘두르면 (반응 늦음·확률로) 막거나 반격 막기, 오래 막고 있으면 강공격·잡기로 부순다.
export const DUEL_AI=Object.freeze({easy:{react:.32,block:.35,parry:.05,heavyRead:.2,aggro:.5,link:.1},normal:{react:.2,block:.6,parry:.18,heavyRead:.5,aggro:.75,link:.3},hard:{react:.12,block:.8,parry:.38,heavyRead:.75,aggro:.9,link:.55}});
export function duelAi(s,team,dt){
 const f=s.fighters[team],o=s.fighters[1-team],c=DUEL_CHARACTERS[f.char],cfg=DUEL_AI[s.difficulty]||DUEL_AI.normal,ai=s.ai[team],d=dist(f,o),v=norm(o.x-f.x,o.y-f.y),input={aimX:v.x,aimY:v.y};
 const threat=(o.state==='attack'&&o.t>.08)||(o.state==='heavy'&&o.t>.15)||(o.state==='dash')||s.shots.some(q=>q.owner!==team&&Math.hypot(q.x-f.x,q.y-f.y)<3.5);
 // 방금 맞았으면(1.5초) 더 빨리·자주 막는다. 막아서 상대가 튕기면 바로 반격.
 if(f.hp<(ai.hp??f.hp))ai.hurtAt=s.time;ai.hp=f.hp;const wary=s.time-(ai.hurtAt??-9)<1.5,react=wary?cfg.react*.55:cfg.react,block=wary?Math.min(.95,cfg.block+.3):cfg.block;
 if(o.state==='attack'&&o.cancelAt<0&&d<c.reach+.6&&f.stun<=0){ai.guarding=false;input.attack=true;return input;}
 if(threat&&d<(DUEL_CHARACTERS[o.char].reach+2.2)){ai.seen=(ai.seen||0)+dt;
  if(ai.seen>=react){if(o.state==='heavy'&&rnd(s)<cfg.heavyRead*dt*8){input.dodge=true;input.x=-v.y;input.y=v.x;ai.seen=0;return input;}
   if(!ai.guarding&&rnd(s)<block){ai.guarding=true;ai.guardFor=.35+rnd(s)*.3;ai.parryTry=rnd(s)<cfg.parry;}}}
 else ai.seen=0;
 if(ai.guarding){ai.guardFor-=dt;input.block=!(ai.parryTry&&f.blocking&&s.time-f.blockSince>.2);if(ai.guardFor<=0)ai.guarding=false;if(f.stun<=0)return input;}
 if(f.stun>0)return input;
 // 평타가 맞았으면 가끔 연계 강공격으로 잇는다.
 if(f.state==='attack'&&f.hitDone&&f.chainTime>.6&&ai.rolled!==f.combo){ai.rolled=f.combo;if(rnd(s)<cfg.link){input.heavy=true;return input;}}
 // 오래 막는 상대에게는 강공격·잡기.
 if(o.blocking&&s.time-o.blockSince>.45&&d<c.heavy.reach+.4&&rnd(s)<cfg.aggro*dt*6){if(f.char==='gravity'&&f.cd[0]<=0){input.skill1=true;return input;}input.heavy=true;return input;}
 const ultRange={pierce:9,chain:12,recall:7,split:4.5,frost:4.2,orbit:2.6}[f.char]||4;if(f.meter>=100&&d<ultRange){input.ult=true;return input;}
 // 2026-09-28 사용자: "키가 너무 많다 · 공격·회피·방어·궁만" — 두 번째 스킬은 쓰지 않는다(사람과 같은 조작).
 if(f.cd[0]<=0&&(f.char==='pierce'&&d>2.5&&d<5.5||f.char==='burst'&&d<2||f.char==='gravity'&&d<5&&d>1.6||f.char==='reflect'&&threat||f.char==='split'&&d<3.6||f.char==='chain'&&d<5.5&&d>1.4||f.char==='recall'&&d>2&&d<6.5||f.char==='orbit'&&d<2.4||f.char==='frost'&&d<3.6)&&rnd(s)<dt*2.5){input.skill1=true;return input;}
 const want=c.reach*.85;
 if(d>want+.3){input.x=v.x;input.y=v.y;}else if(d<want-.9&&f.char==='pierce'){input.x=-v.x;input.y=-v.y;}
 else{input.x=-v.y*Math.sin(s.time*1.3);input.y=v.x*Math.sin(s.time*1.3);if(rnd(s)<cfg.aggro*dt*5)input.attack=true;}
 return input;
}
