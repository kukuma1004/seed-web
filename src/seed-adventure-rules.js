import {LAWS} from './laws.js';
import {CURATED_FORMS} from './forms.js';
import {availableAttacks,composeAdventureAttack} from './seed-adventure-attacks.js';

// This deliberately small manual-combat adapter shares identities, not the
// automatic journey simulation. It never reads or writes an account/save.
export const ADVENTURE_LAWS=LAWS;
export const ADVENTURE_FORMS=Object.freeze(Object.fromEntries(['returnblade','thunderlance','collapse'].map(id=>[id,CURATED_FORMS[id]])));
export const ADVENTURE={width:24,height:16,maxShots:72,maxEffects:120,maxEnemies:22};

// 2026-09-28 사용자: "순서대로 쭉 가보자" — ① 3단 콤보·타격감 ② 방 선택과 보상 ③ 막별 배경·보스.
// 한 판 = 세 막 × (전투 방 셋 + 보스 방). 방을 깨면 들어가기 전에 고른 문의 보상을 받고, 다음 문을 고른다(하데스식).
// 적의 역할(근접·원거리·방패·돌격)은 막마다 같고 그림만 그 막의 적으로 바뀐다.
export const ADVENTURE_ACTS=Object.freeze([
 Object.freeze({id:'garden',name:'잊힌 정원',boss:'austin',bossName:'오스틴',rooms:Object.freeze(['이끼 낀 문턱','달빛 회랑','잊힌 화단'])}),
 Object.freeze({id:'stadium',name:'별빛 야구장',boss:'alwaysbeginner',bossName:'항상초심',rooms:Object.freeze(['외야 잔디','더그아웃 통로','투수 마운드'])}),
 Object.freeze({id:'skyway',name:'폭풍 항로',boss:'tempestcarrier',bossName:'요한',rooms:Object.freeze(['구름 선착장','번개 회랑','폭풍의 눈'])})
]);
export const ROOMS=Object.freeze(ADVENTURE_ACTS.flatMap(a=>[...a.rooms,a.bossName+'의 방']));
export const ROOMS_PER_ACT=4;
export function adventureRoomInfo(room){const act=Math.floor(room/ROOMS_PER_ACT),local=room%ROOMS_PER_ACT;return {act,local,boss:local===ROOMS_PER_ACT-1,name:ROOMS[room],actInfo:ADVENTURE_ACTS[act]};}

// ① 3단 콤보. 막타는 넓게 휘둘러 적을 밀쳐 내고 잠깐 멈춘다. 회피 중·직후 공격은 막타와 같은 '회피 베기'.
export const ADVENTURE_COMBO=Object.freeze([
 Object.freeze({damage:1,radius:1,arc:0,cooldown:1,knock:.8,stop:.045,lunge:.25,stun:.12}),
 Object.freeze({damage:1.15,radius:1.06,arc:0,cooldown:1,knock:1,stop:.055,lunge:.3,stun:.14}),
 Object.freeze({damage:1.85,radius:1.25,arc:.35,cooldown:1.4,knock:3.2,stop:.11,lunge:.6,stun:.5,finisher:true})
]);
const COMBO_WINDOW=.45,BUFFER=.2,DASH_STRIKE=.45;
export const REWARDS=Object.freeze({
 law:Object.freeze({name:'새 법칙',icon:'✦',desc:'공격을 바꾸는 법칙 하나'}),
 form:Object.freeze({name:'융합',icon:'✣',desc:'가진 두 법칙이 하나로'}),
 grow:Object.freeze({name:'성장',icon:'▲',desc:'공격력과 최대 체력'}),
 heal:Object.freeze({name:'샘물',icon:'♥',desc:'체력 회복'}),
 shape:Object.freeze({name:'두 번째 공격 형태',icon:'➶',desc:'베기와 던지기를 섞어요'}),
 boss:Object.freeze({name:'보스',icon:'☠',desc:'막의 수호자'})
});

const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
const dist=(a,b)=>Math.hypot(a.x-b.x,a.y-b.y);
const direction=(x,y)=>{const d=Math.hypot(x,y)||1;return {x:x/d,y:y/d};};
function random(s){s.seed=(Math.imul(s.seed,1664525)+1013904223)>>>0;return s.seed/4294967296;}
export function createAdventure(seed=1){return {seed:seed>>>0,phase:'setup',time:0,room:0,kills:0,serial:0,weapon:'slash',shapes:[],choiceKind:null,roomReward:'law',elite:false,doors:[],bonus:'',pendingCuts:[],orbitUntil:0,orbitRadius:1.9,laws:[],form:null,level:1,charge:35,events:[],enemies:[],shots:[],effects:[],fields:[],spawn:0,wave:0,hitstop:0,stopReady:0,shake:0,hits:0,hitsTime:0,bossesDefeated:0,summoned:false,player:{x:12,y:10,hp:100,maxHp:100,aimX:1,aimY:0,attack:0,dash:0,inv:0,dashing:0,dx:0,dy:0,combo:0,comboTime:0,buffer:0,dashStrike:0,lx:0,ly:0,swing:-1},message:'작은 씨앗, 나만의 전투'};}
function event(s,type){s.events.push(type);if(s.events.length>16)s.events.shift();}
function fx(s,type,x,y,extra={}){if(s.effects.length>=ADVENTURE.maxEffects)s.effects.shift();s.effects.push({type,x,y,life:.35,max:.35,...extra});}
function shot(s,x,y,dx,dy,extra={}){if(s.shots.length>=ADVENTURE.maxShots)return;s.shots.push({x,y,px:x,py:y,dx,dy,speed:12,life:1.15,age:0,damage:17+s.level*2,hit:new Set(),bounces:0,remaining:s.laws.includes('pierce')?3:1,...extra});}
export function startAdventure(s,weapon,law){
 if(s.phase!=='setup')return false;
 // Optional explicit loadout is for rule tests; the real entry has neither.
 if(weapon){s.shapes=[weapon==='throw'?'throw':'slash'];s.weapon=s.shapes[0];s.laws=Object.hasOwn(LAWS,law)?[law]:[];s.roomReward=s.laws.length?'grow':'law';spawnRoom(s);}
 else{s.phase='awakening';s.message='처음 돋아나는 힘';}
 return true;
}
export function chooseAttackShape(s,id){
 if(!['slash','throw'].includes(id)||s.shapes.includes(id))return false;
 if(s.phase==='awakening'){s.shapes.push(id);s.weapon=id;s.roomReward='law';spawnRoom(s);return true;}
 return chooseAdventure(s,'shape',id);
}
export function cycleAdventureAttack(s){if(s.phase!=='playing')return false;const modes=availableAttacks(s.shapes);if(modes.length<2)return false;s.weapon=modes[(modes.indexOf(s.weapon)+1)%modes.length];return true;}

// 막마다 같은 역할, 다른 그림. art는 화면이 고르는 그림 이름이다.
const ROLE_ART=[{melee:'hound',ranged:'caster',tank:'shield',fast:'runner'},{melee:'batter',ranged:'pitcher',tank:'catcher',fast:'runner'},{melee:'glider',ranged:'gunner',tank:'hull',fast:'dart'}];
const ROLE={melee:{hp:44,speed:1.65,r:.42},ranged:{hp:36,speed:1.05,r:.42},tank:{hp:78,speed:.95,r:.5},fast:{hp:28,speed:2.55,r:.38}};
function spawnRoom(s){
 const info=adventureRoomInfo(s.room),p=s.player;
 s.phase='playing';s.enemies.length=0;s.shots.length=0;s.fields.length=0;s.pendingCuts.length=0;s.orbitUntil=0;s.summoned=false;
 p.x=12;p.y=10;p.inv=1;p.attack=.4;p.combo=0;p.comboTime=0;p.buffer=0;p.lx=p.ly=0;s.wave=0;s.spawn=1.2;s.message=info.name;
 if(info.boss){spawnBoss(s,info);s.spawn=Infinity;event(s,'bossWarning');}else spawnWave(s);
}
function spawnEnemy(s,role,x,y){
 const info=adventureRoomInfo(s.room),base=ROLE[role]||ROLE.melee,scale=(1+info.act*.75+info.local*.12)*(s.elite?1.45:1);
 const hp=Math.round(base.hp*scale+(s.elite&&role==='tank'?20:0));
 s.enemies.push({id:++s.serial,type:role==='ranged'?'caster':role==='tank'?'shield':'hound',role,art:ROLE_ART[info.act][role],act:info.act,x,y,hp,maxHp:hp,r:base.r,speed:base.speed*(1+info.act*.08),cd:1.3+random(s),tell:0,tx:0,ty:0,slow:0,frost:0,flash:0,pattern:0,kx:0,ky:0,stun:0,power:1+info.act*.25});
}
function spawnWave(s){
 s.wave++;const info=adventureRoomInfo(s.room),count=Math.min(ADVENTURE.maxEnemies,3+info.local*2+info.act+s.wave+(s.elite?2:0));
 const roles=['melee','melee','ranged','tank','fast'];
 for(let i=0;i<count&&s.enemies.length<ADVENTURE.maxEnemies;i++){const a=i/count*Math.PI*2+.5*s.wave;spawnEnemy(s,roles[(i+s.wave)%roles.length],clamp(12+Math.cos(a)*8,2,22),clamp(7.5+Math.sin(a)*5,2.5,13.5));}
 s.spawn=0;
}
// ③ 막의 수호자. 막마다 다른 공격 세 가지를 돌려 쓴다. 체력 절반에서 부하를 부르고(한 번) 조금 빨라진다.
export const ADVENTURE_BOSSES=Object.freeze({
 austin:Object.freeze({name:'오스틴',hp:1500,patterns:Object.freeze(['charge','slam','punches'])}),
 alwaysbeginner:Object.freeze({name:'항상초심',hp:2600,patterns:Object.freeze(['pitch','swing','pitch','rain'])}),
 tempestcarrier:Object.freeze({name:'요한',hp:3700,patterns:Object.freeze(['strikes','spiral','slam','strikes'])})
});
function spawnBoss(s,info){const b=ADVENTURE_BOSSES[info.actInfo.boss],hp=b.hp*(1+(s.level-1)*.04);s.enemies.push({id:++s.serial,type:'boss',role:'boss',bossId:info.actInfo.boss,art:info.actInfo.boss,act:info.act,x:12,y:6,hp,maxHp:hp,r:1.1,speed:1.05+info.act*.12,cd:1.6,tell:0,tellKind:'',tx:0,ty:0,marks:[],slow:0,frost:0,flash:0,pattern:0,kx:0,ky:0,stun:0,power:1+info.act*.25,charging:0,cx:0,cy:0});}

// ② 문과 보상.
function lawChoices(s){const newLaws=Object.keys(LAWS).filter(id=>!s.laws.includes(id));if(s.laws.length>=4)return [];if(!s.laws.length)return ['recall','split','orbit'];const out=[];const pool=[...newLaws];while(out.length<3&&pool.length){const i=Math.floor(random(s)*pool.length);out.push(pool.splice(i,1)[0]);}return out;}
function eligibleForms(s){return Object.values(ADVENTURE_FORMS).filter(f=>f.requires.every(l=>s.laws.includes(l))&&s.form!==f.id);}
export function adventureOffers(s){
 const kind=s.choiceKind,first=!s.laws.length,treasure=kind==='boss';
 return {kind,
  laws:kind==='law'||treasure?(s.offerLaws||[]):[],
  forms:(kind==='form'||treasure)&&!first?eligibleForms(s):[],
  shapes:kind==='shape'?['slash','throw'].filter(id=>!s.shapes.includes(id)):[],
  canGrow:kind==='grow'||treasure||(kind==='law'&&!first&&!(s.offerLaws||[]).length),
  heal:kind==='heal'};
}
function openReward(s){
 let kind=s.roomReward||'law';
 if(kind==='form'&&!eligibleForms(s).length)kind='law';
 if(kind==='shape'&&s.shapes.length>1)kind='grow';
 s.choiceKind=kind;s.offerLaws=kind==='law'||kind==='boss'?lawChoices(s):[];
 s.phase='choice';s.shots.length=0;s.pendingCuts.length=0;event(s,'pickup');
 s.message=kind==='boss'?`${adventureRoomInfo(s.room).actInfo.bossName}를 쓰러뜨렸어요`:'방을 지켜 냈어요';
}
export function chooseAdventure(s,kind,id){
 if(s.phase!=='choice')return false;const offers=adventureOffers(s);
 if(kind==='law'&&offers.laws.includes(id))s.laws.push(id);
 else if(kind==='form'&&offers.forms.some(f=>f.id===id))s.form=id;
 else if(kind==='shape'&&offers.shapes.includes(id)){s.shapes.push(id);s.weapon='hybrid';}
 else if(kind==='grow'&&offers.canGrow){s.level++;s.player.maxHp+=10;}
 else if(kind==='heal'&&offers.heal){s.player.maxHp+=5;s.player.hp+=s.player.maxHp*.4;}
 else return false;
 const p=s.player;p.hp=Math.min(p.maxHp,p.hp+(s.choiceKind==='boss'?p.maxHp:12));
 // 정예 방을 깨면 보상에 성장 한 번이 덤으로 붙는다.
 s.bonus='';if(s.elite){s.level++;p.maxHp+=10;p.hp=Math.min(p.maxHp,p.hp+10);s.bonus='정예 보너스 · Lv.'+s.level;}
 s.choiceKind=null;s.offerLaws=[];
 if(s.room>=ROOMS.length-1){s.phase='won';s.message='세 막의 수호자를 모두 이겼어요';return true;}
 s.doors=makeDoors(s);s.phase='doors';return true;
}
function makeDoors(s){
 const next=adventureRoomInfo(s.room+1);
 if(next.boss)return [{reward:'boss',elite:false}];
 const pool=['law','law','grow'];
 if(eligibleForms(s).length)pool.push('form','form');
 if(s.shapes.length===1&&s.room>=1)pool.push('shape');
 if(s.player.hp<s.player.maxHp*.8)pool.push('heal','heal');
 const doors=[],count=next.local===0||random(s)<.35?3:2;
 while(doors.length<count&&pool.length){const i=Math.floor(random(s)*pool.length),reward=pool[i];for(let k=pool.length-1;k>=0;k--)if(pool[k]===reward)pool.splice(k,1);doors.push({reward,elite:false});}
 // 막의 두 번째 방부터는 문 하나가 정예 방(더 세지만 성장 한 번이 덤).
 if(next.local>=1&&doors.length>1&&random(s)<.6){const d=doors.find(d=>d.reward!=='heal');if(d)d.elite=true;}
 return doors;
}
export function adventureDoors(s){return s.phase==='doors'?s.doors:[];}
export function chooseAdventureDoor(s,index){
 if(s.phase!=='doors')return false;const door=s.doors[index];if(!door)return false;
 s.roomReward=door.reward==='boss'?'boss':door.reward;s.elite=Boolean(door.elite);s.doors=[];s.room++;
 // 보스 방 앞에서는 숨을 고른다.
 if(door.reward==='boss'){const p=s.player;p.hp=Math.min(p.maxHp,p.hp+p.maxHp*.25);}
 spawnRoom(s);return true;
}

function cut(s,c,seen=new Set()){
 fx(s,'slash',c.x,c.y,{angle:c.angle,radius:c.radius,returning:Boolean(c.returning),narrow:c.cos>.5,finisher:Boolean(c.meta?.finisher),life:c.meta?.finisher?.32:.25,max:c.meta?.finisher?.32:.25});
 for(const e of s.enemies){const a=Math.atan2(e.y-c.y,e.x-c.x)-c.angle;if(e.hp>0&&!seen.has(e.id)&&Math.hypot(e.x-c.x,e.y-c.y)<c.radius+e.r&&Math.cos(a)>c.cos){seen.add(e.id);hit(s,e,c.damage,false,{...c.meta,angle:Math.atan2(e.y-c.y,e.x-c.x)});}}
}
function hit(s,e,damage,secondary=false,meta=null){
 if(e.hp<=0)return;e.hp-=damage;e.flash=.13;const heavy=Boolean(meta?.finisher);
 fx(s,'number',e.x,e.y,{text:Math.round(damage),heavy,life:heavy?.8:.6,max:heavy?.8:.6});
 if(meta){
  const boss=e.type==='boss',angle=Number.isFinite(meta.angle)?meta.angle:Math.atan2(e.y-s.player.y,e.x-s.player.x),push=(meta.knock||0)*4*(boss?.15:1);
  e.kx=(e.kx||0)+Math.cos(angle)*push;e.ky=(e.ky||0)+Math.sin(angle)*push;e.stun=Math.max(e.stun||0,boss?(heavy?.12:0):meta.stun||0);
  // 막타는 보스가 아닌 적의 공격 예고를 끊는다.
  if(heavy&&!boss&&e.tell>0){e.tell=0;e.cd=1.2;fx(s,'spark',e.x,e.y,{angle,heavy:true,life:.3,max:.3});}
  fx(s,'spark',e.x,e.y,{angle,heavy,life:heavy?.28:.2,max:heavy?.28:.2});
  if(meta.stop&&(s.time>=s.stopReady||heavy)){s.hitstop=Math.max(s.hitstop,meta.stop);s.stopReady=s.time+.09;}
  s.shake=Math.max(s.shake,heavy?.36:.12);
 }
 if(!secondary){s.hits++;s.hitsTime=2;s.charge=clamp(s.charge+2.8,0,100);event(s,heavy?'finisher':'hit');if(s.laws.includes('frost')){e.slow=1.8;e.frost++;if(e.frost>=5){e.frost=0;e.hp-=32;fx(s,'frost',e.x,e.y,{radius:1.4});}}
 if(s.laws.includes('burst')){fx(s,'burst',e.x,e.y,{radius:1.5});for(const n of s.enemies)if(n!==e&&n.hp>0&&dist(n,e)<1.5)hit(s,n,damage*.4,true);}
 if(s.laws.includes('chain')){let prev=e;const seen=new Set([e.id]);for(let i=0;i<2;i++){const n=s.enemies.filter(n=>n.hp>0&&!seen.has(n.id)&&dist(n,prev)<3.7).sort((a,b)=>dist(a,prev)-dist(b,prev))[0];if(!n)break;fx(s,'chain',prev.x,prev.y,{tx:n.x,ty:n.y});hit(s,n,damage*.5,true);seen.add(n.id);prev=n;}}
 if(s.laws.includes('gravity')&&s.fields.length<6)s.fields.push({x:e.x,y:e.y,life:s.form==='collapse'?1.25:.65,r:2.5,collapse:s.form==='collapse'});
 }if(e.hp<=0){s.kills++;s.charge=clamp(s.charge+4,0,100);fx(s,'leaf',e.x,e.y,{life:.6,max:.6});if(e.type==='boss'){s.bossesDefeated++;s.hitstop=Math.max(s.hitstop,.25);s.shake=.6;event(s,'bossDefeat');}}}
function hurt(s,n){const p=s.player;if(p.inv>0||s.phase!=='playing')return;p.hp=Math.max(0,p.hp-n);p.inv=.7;s.shake=Math.max(s.shake,.2);event(s,'hurt');fx(s,'hurt',p.x,p.y,{radius:1});if(p.hp<=0){s.phase='lost';s.message='회피로 붉은 예고를 벗어나 보세요';}}
export function attackAdventure(s){
 if(s.phase!=='playing'||s.player.attack>0)return false;
 const p=s.player,dashStrike=p.dashStrike>0,step=dashStrike?2:p.combo,c=ADVENTURE_COMBO[step],plan=composeAdventureAttack(s),angle=Math.atan2(p.aimY,p.aimX),seen=new Set();
 const meta={knock:c.knock,stop:c.stop,stun:c.stun,finisher:Boolean(c.finisher),damage:c.damage*(dashStrike?1.15:1)};
 p.attack=plan.cooldown*c.cooldown;p.swing=step;p.comboTime=p.attack+COMBO_WINDOW;p.combo=c.finisher?0:step+1;p.dashStrike=0;
 if(p.dashing<=0){p.lx=Math.cos(angle)*c.lunge*12;p.ly=Math.sin(angle)*c.lunge*12;}
 event(s,dashStrike?'dashStrike':'combo'+(step+1));event(s,s.weapon==='throw'?'shot':'shotReturn');
 for(const cc of plan.cuts)cut(s,{...cc,damage:cc.damage*meta.damage,radius:cc.radius*c.radius,cos:cc.cos-c.arc,x:p.x,y:p.y,angle:angle+cc.offset,meta},seen);
 const returnHits=new Set();
 for(const cc of plan.returnCuts)if(s.pendingCuts.length<12)s.pendingCuts.push({...cc,damage:cc.damage*meta.damage,x:p.x,y:p.y,angle:angle+cc.offset,returning:true,seen:returnHits});
 const shots=c.finisher&&plan.shots.length?[...plan.shots,...[-.2,.2].map(o=>({...plan.shots[0],offset:plan.shots[0].offset+o}))]:plan.shots;
 for(const b of shots)shot(s,p.x,p.y,Math.cos(angle+b.offset),Math.sin(angle+b.offset),{...b,damage:b.damage*meta.damage,remaining:b.remaining+(c.finisher?1:0),heavy:Boolean(c.finisher)});
 if(s.laws.includes('orbit')){s.orbitUntil=s.time+plan.orbitDuration;s.orbitRadius=plan.orbitRadius;}
 return true;
}
export function dodgeAdventure(s,x=0,y=0){const p=s.player;if(s.phase!=='playing'||p.dash>0)return false;const d=direction(x||y?x:p.aimX,x||y?y:p.aimY);p.dx=d.x;p.dy=d.y;p.dashing=.2;p.inv=.28;p.dash=1.25;p.dashStrike=DASH_STRIKE;p.attack=Math.min(p.attack,.05);p.lx=p.ly=0;fx(s,'dash',p.x,p.y,{life:.35,max:.35});event(s,'dash');return true;}
export function ultimateAdventure(s){if(s.phase!=='playing'||s.charge<100)return false;s.charge=0;s.player.inv=1;event(s,'ultimate');fx(s,'ultimate',s.player.x,s.player.y,{radius:7,life:.9,max:.9});s.hitstop=.14;s.shake=.5;for(const e of s.enemies)if(dist(e,s.player)<7)hit(s,e,95+s.level*12,false,{knock:2.5,stun:.6,angle:Math.atan2(e.y-s.player.y,e.x-s.player.x)});s.shots=s.shots.filter(b=>!b.hostile);s.charge=0;return true;}

function bossAct(s,e,p,dt){
 const b=ADVENTURE_BOSSES[e.bossId],enraged=e.hp<e.maxHp*.5;
 if(enraged&&!s.summoned){s.summoned=true;event(s,'bossWarning');for(const [x,y] of [[4,8],[20,8]])spawnEnemy(s,e.bossId==='tempestcarrier'?'fast':'melee',x,y);}
 if(e.charging>0){e.charging-=dt;e.x=clamp(e.x+e.cx*13*dt,2,22);e.y=clamp(e.y+e.cy*13*dt,2.5,14);if(dist(e,p)<1.4)hurt(s,Math.round(20*e.power));if(e.charging<=0)fx(s,'enemyRing',e.x,e.y,{radius:1.4});return true;}
 if(e.tell>0){e.tell-=dt;if(e.tell>0)return true;
  const kind=e.tellKind,dmg=n=>Math.round(n*e.power);event(s,'bossAttack');
  if(kind==='charge'){e.charging=.55;const v=direction(e.tx-e.x,e.ty-e.y);e.cx=v.x;e.cy=v.y;}
  else if(kind==='slam'){fx(s,'enemyRing',e.tx,e.ty,{radius:2.1});if(Math.hypot(p.x-e.tx,p.y-e.ty)<2.1)hurt(s,dmg(22));e.x=e.tx;e.y=e.ty;s.shake=Math.max(s.shake,.3);}
  else if(kind==='punches'||kind==='pitch'){const base=Math.atan2(p.y-e.y,p.x-e.x),n=kind==='pitch'?3:5,spread=kind==='pitch'?.16:.28;for(let i=0;i<n;i++){const a=base+(i-(n-1)/2)*spread;shot(s,e.x,e.y,Math.cos(a),Math.sin(a),{hostile:true,boss:true,art:kind==='pitch'?'ball':'glove',damage:dmg(kind==='pitch'?15:13),speed:kind==='pitch'?8.5:5.8,life:4});}}
  else if(kind==='swing'){const a=Math.atan2(e.ty-e.y,e.tx-e.x);fx(s,'enemyArc',e.x,e.y,{angle:a,radius:3.4,life:.3,max:.3});const pa=Math.atan2(p.y-e.y,p.x-e.x)-a;if(dist(p,e)<3.4+.3&&Math.cos(pa)>.35)hurt(s,dmg(24));}
  else if(kind==='rain'||kind==='spiral'){const rings=kind==='spiral'?2:1;for(let r=0;r<rings;r++)for(let i=0;i<12;i++){const a=i/12*Math.PI*2+r*.26;shot(s,e.x,e.y,Math.cos(a),Math.sin(a),{hostile:true,boss:true,art:e.bossId==='alwaysbeginner'?'ball':'',damage:dmg(14),speed:4.2-r*.9,life:4.5});}fx(s,'enemyRing',e.x,e.y,{radius:3});if(dist(p,e)<3)hurt(s,dmg(18));}
  else if(kind==='strikes'){for(const m of e.marks){fx(s,'bolt',m.x,m.y,{radius:m.r,life:.35,max:.35});if(Math.hypot(p.x-m.x,p.y-m.y)<m.r)hurt(s,dmg(18));}s.shake=Math.max(s.shake,.25);}
  e.cd=(enraged?1.05:1.4);e.tellKind='';e.marks=[];return true;
 }
 const range=5;if(dist(e,p)>range){const v=direction(p.x-e.x,p.y-e.y);e.x+=v.x*e.speed*(e.slow>0?.5:1)*dt;e.y+=v.y*e.speed*(e.slow>0?.5:1)*dt;}
 if(e.cd<=0){
  const kind=b.patterns[e.pattern%b.patterns.length];e.pattern++;e.tellKind=kind;e.tx=p.x;e.ty=p.y;e.marks=[];
  const speed=enraged?.85:1;
  e.tell={charge:.8,slam:.95,punches:.7,pitch:.6,swing:.75,rain:.9,spiral:.95,strikes:1.05}[kind]*speed;
  if(kind==='strikes'){e.marks.push({x:p.x,y:p.y,r:1.4});for(let i=0;i<(enraged?4:3);i++)e.marks.push({x:clamp(p.x+(random(s)-.5)*9,2,22),y:clamp(p.y+(random(s)-.5)*6,2.5,14),r:1.4});}
 }
 return false;
}
export function stepAdventure(s,dt,input={}){
 if(s.phase!=='playing'||!Number.isFinite(dt)||dt<=0)return;dt=clamp(dt,0,.05);const p=s.player;
 s.shake=Math.max(0,s.shake-dt*2.2);
 if(input.attack&&p.attack>0)p.buffer=BUFFER;
 // 타격 멈춤: 짧게 세상이 멈춘다. 입력은 기억해 두었다가 멈춤이 끝나면 이어진다.
 if(s.hitstop>0){s.hitstop=Math.max(0,s.hitstop-dt);return;}
 s.time+=dt;for(const k of ['attack','dash','inv','dashing','comboTime','buffer','dashStrike'])p[k]=Math.max(0,p[k]-dt);
 if(p.comboTime<=0)p.combo=0;if(p.attack<=0)p.swing=-1;
 s.hitsTime=Math.max(0,s.hitsTime-dt);if(s.hitsTime<=0)s.hits=0;
 if(Number.isFinite(input.aimX)&&Math.hypot(input.aimX,input.aimY)>.05){const d=direction(input.aimX,input.aimY);p.aimX=d.x;p.aimY=d.y;}
 const d=direction(input.x||0,input.y||0),moving=Boolean(input.x||input.y),speed=p.dashing>0?15:p.attack>.29?2.15:4.3;
 const lunge=Math.exp(-14*dt);p.x+=p.lx*dt;p.y+=p.ly*dt;p.lx*=lunge;p.ly*=lunge;
 p.x=clamp(p.x+(p.dashing>0?p.dx:moving?d.x:0)*speed*dt,1.4,22.6);p.y=clamp(p.y+(p.dashing>0?p.dy:moving?d.y:0)*speed*dt,2,14.4);
 if(input.attack||p.buffer>0){if(attackAdventure(s))p.buffer=0;}
 for(const c of s.pendingCuts){c.delay-=dt;if(c.delay<=0)cut(s,c,c.seen);}s.pendingCuts=s.pendingCuts.filter(c=>c.delay>0);
 for(const f of s.fields){f.life-=dt;for(const e of s.enemies)if(e.type!=='boss'&&e.hp>0&&dist(e,f)<f.r){const v=direction(f.x-e.x,f.y-e.y);e.x+=v.x*dt*2.8;e.y+=v.y*dt*2.8;}if(f.life<=0&&f.collapse){fx(s,'burst',f.x,f.y,{radius:2.8});for(const e of s.enemies)if(e.hp>0&&dist(e,f)<2.8)hit(s,e,28,true);}}s.fields=s.fields.filter(f=>f.life>0);
 const knock=Math.exp(-9*dt);
 for(const e of s.enemies){if(e.hp<=0)continue;e.kx||=0;e.ky||=0;e.stun||=0;e.power||=1;e.role||=(e.type==='caster'?'ranged':e.type==='shield'?'tank':e.type==='boss'?'boss':'melee');
  e.x=clamp(e.x+e.kx*dt,1.4,22.6);e.y=clamp(e.y+e.ky*dt,2,14.4);e.kx*=knock;e.ky*=knock;
  e.cd-=dt;e.slow=Math.max(0,e.slow-dt);e.flash=Math.max(0,e.flash-dt);e.stun=Math.max(0,e.stun-dt);
  if(e.type==='boss'){bossAct(s,e,p,dt);continue;}
  if(e.tell>0){e.tell-=dt;if(e.tell<=0){if(e.role==='ranged'){const v=direction(e.tx-e.x,e.ty-e.y);shot(s,e.x,e.y,v.x,v.y,{hostile:true,damage:Math.round(12*e.power),speed:5.5,life:4});}else{fx(s,'enemyRing',e.tx,e.ty,{radius:1});if(Math.hypot(p.x-e.tx,p.y-e.ty)<1)hurt(s,Math.round(12*e.power));if(e.role==='fast'){e.x=clamp(e.tx,1.4,22.6);e.y=clamp(e.ty,2,14.4);}}e.cd=e.role==='fast'?2.1:1.7;}continue;}
  if(e.stun>0)continue;
  const range=e.role==='ranged'?7:e.role==='fast'?2.6:1.35;if(dist(e,p)>range){const v=direction(p.x-e.x,p.y-e.y);e.x+=v.x*e.speed*(e.slow>0?.5:1)*dt;e.y+=v.y*e.speed*(e.slow>0?.5:1)*dt;}else if(e.cd<=0){e.tell=e.role==='fast'?.55:.68;e.tx=p.x;e.ty=p.y;e.pattern++;}
  // Keep a readable ring around the seed instead of stacking sprites.
  for(const n of s.enemies)if(n.id<e.id&&n.hp>0){const gap=dist(e,n),r=e.r+n.r;if(gap<r&&gap>.001){e.x+=(e.x-n.x)/gap*dt;e.y+=(e.y-n.y)/gap*dt;}}
 }
 for(const b of s.shots){b.life-=dt;b.age+=dt;b.px=b.x;b.py=b.y;if(!b.hostile&&b.recall&&b.age>.48){if(!b.returning){b.returning=true;b.hit.clear();b.remaining=s.form==='returnblade'?6:s.laws.includes('pierce')?3:1;b.spent=false;b.life=.9;}const v=direction(p.x-b.x,p.y-b.y);b.dx=v.x;b.dy=v.y;if(dist(b,p)<.45){b.life=0;continue;}}
 b.x+=b.dx*b.speed*dt;b.y+=b.dy*b.speed*dt;if(b.x<1.3||b.x>22.7||b.y<1.8||b.y>14.7){if(!b.hostile&&s.laws.includes('reflect')&&b.bounces<2){if(b.x<1.3||b.x>22.7)b.dx*=-1;else b.dy*=-1;b.bounces++;b.x=clamp(b.x,1.3,22.7);b.y=clamp(b.y,1.8,14.7);fx(s,'frost',b.x,b.y,{radius:.7});}else b.life=0;}
 if(b.hostile){if(s.laws.includes('orbit')&&!b.boss&&dist(b,p)<1.6){b.life=0;fx(s,'frost',b.x,b.y,{radius:.5});}else if(dist(b,p)<.45){hurt(s,b.damage);b.life=0;}}else for(const e of s.enemies){if(e.hp<=0||b.spent||b.hit.has(e.id))continue;const vx=b.x-b.px,vy=b.y-b.py,len=vx*vx+vy*vy,t=clamp(((e.x-b.px)*vx+(e.y-b.py)*vy)/(len||1),0,1);if(Math.hypot(e.x-b.px-vx*t,e.y-b.py-vy*t)<e.r+.22){b.hit.add(e.id);hit(s,e,b.damage,false,{knock:b.heavy?1.4:.35,stun:b.heavy?.3:.06,stop:b.heavy?.05:0,finisher:b.heavy,angle:Math.atan2(b.dy,b.dx)});if(--b.remaining<=0){if(b.recall&&!b.returning)b.spent=true;else b.life=0;break;}}}}
 s.shots=s.shots.filter(b=>b.life>0);if(s.laws.includes('orbit')&&s.time<s.orbitUntil){for(const e of s.enemies)if(e.hp>0&&dist(e,p)<s.orbitRadius){e.orbitTick=(e.orbitTick||0)-dt;if(e.orbitTick<=0){e.orbitTick=.5;hit(s,e,9,true);}}}
 for(const f of s.effects)f.life-=dt;s.effects=s.effects.filter(f=>f.life>0);s.enemies=s.enemies.filter(e=>e.hp>0);
 if(s.phase==='playing'&&!s.enemies.length){const info=adventureRoomInfo(s.room);if(info.boss)openReward(s);else if(s.wave<2){s.spawn+=dt;if(s.spawn>1.0)spawnWave(s);}else openReward(s);}
}
