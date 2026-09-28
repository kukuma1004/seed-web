import {LAWS} from './laws.js';
import {DEFENSE_FORMS,defenseFusionOf,getDefenseEvolutionOptions,validDefenseForm} from './seed-defense-catalog.js';
import {availableAttacks,composeAdventureAttack} from './seed-adventure-attacks.js';

// This deliberately small manual-combat adapter shares identities, not the
// automatic journey simulation. It never reads or writes an account/save.
export const ADVENTURE_LAWS=LAWS;
// 2026-09-28 사용자: "조합은?? 162개 가능해??" — 수호전과 같은 성장 규칙으로 본편 162가지(기본 9·단독 9·융합 36·완성 72·쌍둥이 36)를 모두 연다.
// 법칙은 두 개까지, 법칙마다 1~3단계. 두 법칙 = 융합, 한 법칙 3단계 = 단독 진화, 융합 + 한쪽 3단계 = 완성 진화, 양쪽 3단계 = 쌍둥이.
export const ADVENTURE_FORMS=DEFENSE_FORMS;
export const ADVENTURE={width:24,height:16,maxShots:72,maxEffects:140,maxEnemies:64,maxPickups:48,maxPotions:3};
// 보스 방·보물 방은 한 화면짜리 작은 방, 전투·정예는 넓은 지역(아래 REGION).
export const ADVENTURE_ARENA=Object.freeze({minX:1.4,maxX:22.6,minY:2,maxY:14.4});
// 2026-09-28 사용자: "디아블로같이 광활한 맵" → B안(넓은 지역을 자유롭게 돌아다니고, 지역 끝 출구에서 다음 문을 고른다).
// 지역 하나는 화면 서너 장 크기. 적 무리는 가까이 가야 깨어나고, 습격지·수호 제단은 원하면 들르는 이벤트다.
// 출구는 그 앞을 지키는 무리를 물리치면 열린다.
export const REGION=Object.freeze({w:64,h:40,cell:4});

// 한 판 = 세 막 × (방 다섯 + 보스 방). 방을 깨면 들어가기 전에 고른 문의 보상을 받고 다음 문을 고른다(하데스식).
// 2026-09-28 사용자: "방이 많아야" · "물약 얻는 상자·부서지는 것·버프" — 보물 방·상점·샘물, 항아리·나무 상자, 버프 구슬.
export const ADVENTURE_ACTS=Object.freeze([
 Object.freeze({id:'garden',name:'잊힌 정원',boss:'austin',bossName:'오스틴',rooms:Object.freeze(['이끼 낀 들판','무너진 온실','시계탑 광장'])}),
 Object.freeze({id:'stadium',name:'별빛 야구장',boss:'alwaysbeginner',bossName:'항상초심',rooms:Object.freeze(['외야 잔디밭','관중석 아래','투수 마운드'])}),
 Object.freeze({id:'skyway',name:'폭풍 항로',boss:'tempestcarrier',bossName:'요한',rooms:Object.freeze(['구름 선착장','뇌운 갑판','폭풍의 눈'])})
]);
export const ROOMS_PER_ACT=4;
export const ROOMS=Object.freeze(ADVENTURE_ACTS.flatMap(a=>[...a.rooms,a.bossName+'의 방']));
export function adventureRoomInfo(room){const act=Math.floor(room/ROOMS_PER_ACT),local=room%ROOMS_PER_ACT;return {act,local,boss:local===ROOMS_PER_ACT-1,name:ROOMS[room],actInfo:ADVENTURE_ACTS[act]};}

// ① 3단 콤보. 막타는 넓게 휘둘러 적을 밀쳐 내고 잠깐 멈춘다. 회피 중·직후 공격은 막타와 같은 '회피 베기'.
export const ADVENTURE_COMBO=Object.freeze([
 // 2026-09-28 사용자: "랙 걸리는 것처럼" — 일반 타격의 멈춤을 없애고 막타만 짧게(0.11→0.06초), 흔들림도 줄였다.
 Object.freeze({damage:1,radius:1,arc:0,cooldown:1,knock:.8,stop:0,lunge:.25,stun:.12}),
 Object.freeze({damage:1.15,radius:1.06,arc:0,cooldown:1,knock:1,stop:0,lunge:.3,stun:.14}),
 Object.freeze({damage:1.85,radius:1.25,arc:.35,cooldown:1.4,knock:3.2,stop:.06,lunge:.6,stun:.5,finisher:true})
]);
const COMBO_WINDOW=.45,BUFFER=.2,DASH_STRIKE=.45;
export const ROOM_TYPES=Object.freeze({
 combat:Object.freeze({name:'전투 방',icon:'⚔'}),elite:Object.freeze({name:'정예 방',icon:'✸'}),treasure:Object.freeze({name:'보물 방',icon:'◈'}),
 shop:Object.freeze({name:'떠돌이 상인',icon:'✿'}),fountain:Object.freeze({name:'맑은 샘',icon:'♥'}),boss:Object.freeze({name:'보스',icon:'☠'})
});
export const REWARDS=Object.freeze({
 law:Object.freeze({name:'법칙',icon:'✦',desc:'새 법칙 또는 법칙 강화'}),
 evolve:Object.freeze({name:'진화',icon:'✣',desc:'지금 법칙으로 열리는 진화'}),
 grow:Object.freeze({name:'성장',icon:'▲',desc:'공격력과 최대 체력'}),
 coins:Object.freeze({name:'햇살 주머니',icon:'●',desc:'햇살 40'}),
 shape:Object.freeze({name:'두 번째 공격 형태',icon:'➶',desc:'베기와 던지기를 섞어요'}),
 boss:Object.freeze({name:'수호자의 보물',icon:'☠',desc:'막의 수호자'})
});
// 버프 구슬·상점 물건. 그림은 본편 아이템 아틀라스(물약·강장제·바람·껍질·새싹)를 쓴다.
export const BUFFS=Object.freeze({
 power:Object.freeze({name:'분노의 새싹',desc:'25초 동안 모든 피해 +30%',seconds:25,icon:'sprout'}),
 swift:Object.freeze({name:'바람 깃',desc:'25초 동안 이동 +30% · 회피 대기 −30%',seconds:25,icon:'wind'}),
 guard:Object.freeze({name:'단단한 껍질',desc:'다음 피해 한 번을 막아요',seconds:0,icon:'shell'}),
 focus:Object.freeze({name:'맑은 강장제',desc:'궁극기 +35',seconds:0,icon:'tonic'})
});
export const SHOP_WARES=Object.freeze({
 potion:Object.freeze({name:'회복 물약',desc:'체력 35% 회복 · 최대 3개',price:25,icon:'potion'}),
 power:Object.freeze({name:'분노의 새싹',desc:BUFFS.power.desc,price:30,icon:'sprout'}),
 guard:Object.freeze({name:'단단한 껍질',desc:BUFFS.guard.desc,price:25,icon:'shell'}),
 upgrade:Object.freeze({name:'법칙 강화',desc:'가진 법칙 하나를 한 단계 올려요',price:70,icon:'tonic'}),
 vitality:Object.freeze({name:'튼튼한 뿌리',desc:'최대 체력 +15',price:45,icon:'sprout'}),
 grow:Object.freeze({name:'성장의 비료',desc:'Lv +1',price:80,icon:'wind'})
});

const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
const dist=(a,b)=>Math.hypot(a.x-b.x,a.y-b.y);
const direction=(x,y)=>{const d=Math.hypot(x,y)||1;return {x:x/d,y:y/d};};
function random(s){s.seed=(Math.imul(s.seed,1664525)+1013904223)>>>0;return s.seed/4294967296;}
const pick=(s,list)=>list[Math.floor(random(s)*list.length)];
export function createAdventure(seed=1){return {runId:globalThis.crypto?.randomUUID?.()||`${Date.now()}-${seed>>>0}-${Math.floor(Math.random()*1e9)}`,earned:0,credited:0,seed:seed>>>0,phase:'setup',time:0,room:0,kills:0,serial:0,weapon:'slash',shapes:[],choiceKind:null,roomType:'combat',roomReward:'law',elite:false,doors:[],bonus:'',offerLaws:[],actFlags:{},shop:[],pendingCuts:[],orbitUntil:0,orbitRadius:1.9,laws:[],ranks:{},formId:null,level:1,charge:35,coins:0,potions:2,buffs:{power:0,swift:0,guard:0},props:[],pickups:[],clearTimer:0,cleared:false,arena:{...ADVENTURE_ARENA},region:null,events:[],enemies:[],shots:[],effects:[],fields:[],spawn:0,wave:0,hitstop:0,stopReady:0,shake:0,hits:0,hitsTime:0,bossesDefeated:0,summoned:false,player:{x:12,y:10,hp:100,maxHp:100,aimX:1,aimY:0,attack:0,dash:0,inv:0,dashing:0,dx:0,dy:0,combo:0,comboTime:0,buffer:0,dashStrike:0,lx:0,ly:0,swing:-1,moving:false},message:'작은 씨앗, 나만의 전투'};}
function event(s,type){s.events.push(type);if(s.events.length>16)s.events.shift();}
function fx(s,type,x,y,extra={}){if(s.effects.length>=ADVENTURE.maxEffects)s.effects.shift();s.effects.push({type,x,y,life:.35,max:.35,...extra});}
export function adventureEffect(s,type,x,y,extra={}){fx(s,type,x,y,extra);}
function shot(s,x,y,dx,dy,extra={}){if(s.shots.length>=ADVENTURE.maxShots)return;s.shots.push({x,y,px:x,py:y,dx,dy,speed:12,life:1.15,age:0,damage:17+s.level*2,hit:new Set(),bounces:0,remaining:s.laws.includes('pierce')?3:1,...extra});}
const rank=(s,id)=>s.ranks[id]||0;
const power=s=>s.buffs.power>0?1.3:1;
export function adventureForm(s){return s.formId?DEFENSE_FORMS[s.formId]:null;}
export function adventureEvolutions(s){return getDefenseEvolutionOptions({laws:s.laws,lawRanks:s.ranks,formId:s.formId});}

export function startAdventure(s,weapon,law){
 if(s.phase!=='setup')return false;
 // Optional explicit loadout is for rule tests; the real entry has neither.
 if(weapon){s.shapes=[weapon==='throw'?'throw':'slash'];s.weapon=s.shapes[0];if(Object.hasOwn(LAWS,law)){s.laws=[law];s.ranks={[law]:1};}s.roomReward=s.laws.length?'grow':'law';spawnRoom(s);}
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
// 부서지는 물건은 방 가장자리 자리 중에서 고른다(가운데 전투를 막지 않게).
const PROP_SPOTS=[[3,3.4],[21,3.4],[3,13.2],[21,13.2],[7.5,2.8],[16.5,2.8],[2.6,8.2],[21.4,8.2],[7.5,13.6],[16.5,13.6],[12,2.6],[12,13.8]];
function spawnProps(s,count,chest=false){
 s.props.length=0;const spots=[...PROP_SPOTS];
 if(chest)s.props.push({id:++s.serial,kind:'chest',x:12,y:6.2,hp:3,maxHp:3,flash:0});
 for(let i=0;i<count&&spots.length;i++){const [x,y]=spots.splice(Math.floor(random(s)*spots.length),1)[0];const kind=random(s)<.35?'crate':'pot';s.props.push({id:++s.serial,kind,x,y,hp:kind==='crate'?2:1,maxHp:kind==='crate'?2:1,flash:0});}
}
function spawnRoom(s){
 const info=adventureRoomInfo(s.room),p=s.player;
 s.phase='playing';s.enemies.length=0;s.shots.length=0;s.fields.length=0;s.pendingCuts.length=0;s.pickups.length=0;s.props.length=0;s.orbitUntil=0;s.summoned=false;s.clearTimer=0;s.cleared=false;
 p.x=12;p.y=10;p.inv=1;p.attack=.4;p.combo=0;p.comboTime=0;p.buffer=0;p.lx=p.ly=0;s.wave=0;s.spawn=1.2;s.message=info.name;
 s.arena={...ADVENTURE_ARENA};s.region=null;
 if(info.boss){s.roomType='boss';spawnBoss(s,info);s.spawn=Infinity;event(s,'bossWarning');return;}
 if(s.roomType!=='treasure'){buildRegion(s,info);return;}
 if(s.roomType==='treasure'){spawnProps(s,4,true);s.wave=2;s.message=info.name+' · 보물 상자';return;}
 spawnProps(s,3+Math.floor(random(s)*3));spawnWave(s);
}
function spawnEnemy(s,role,x,y,extra={}){
 const info=adventureRoomInfo(s.room),base=ROLE[role]||ROLE.melee,scale=(1+info.act*1.1+info.local*.2)*(s.elite?1.45:1);
 const hp=Math.round(base.hp*scale+(s.elite&&role==='tank'?20:0));
 s.enemies.push({id:++s.serial,type:role==='ranged'?'caster':role==='tank'?'shield':'hound',role,art:ROLE_ART[info.act][role],act:info.act,x,y,hp,maxHp:hp,r:base.r,speed:base.speed*(1+info.act*.08),cd:1.3+random(s),tell:0,tx:0,ty:0,slow:0,frost:0,flash:0,pattern:0,kx:0,ky:0,stun:0,power:1+info.act*.45+info.local*.08,...extra});
}
function spawnWave(s){
 s.wave++;const info=adventureRoomInfo(s.room),count=Math.min(ADVENTURE.maxEnemies,4+info.local+info.act*2+s.wave+(s.elite?2:0));
 const roles=['melee','melee','ranged','tank','fast'];
 for(let i=0;i<count&&s.enemies.length<ADVENTURE.maxEnemies;i++){const a=i/count*Math.PI*2+.5*s.wave;spawnEnemy(s,roles[(i+s.wave)%roles.length],clamp(12+Math.cos(a)*8,2,22),clamp(7.5+Math.sin(a)*5,2.5,13.5));}
 s.spawn=0;
}
// 넓은 지역 만들기. 같은 씨앗(판 번호)이면 같은 지역이 나온다.
function buildRegion(s,info){
 const W=REGION.w,H=REGION.h,p=s.player,r=()=>random(s),act=info.act;
 s.arena={minX:1.4,maxX:W-1.4,minY:2,maxY:H-1.6};s.wave=2;s.spawn=Infinity;
 const start={x:4.5,y:H/2},gate={x:W-4,y:H/2,open:false,r:1.6};
 const top=r()<.5,raidAt={x:W*.42,y:top?H*.26:H*.74},altar={x:W*.6,y:top?H*.76:H*.24},portal={x:Math.min(W-6,W*.6+13),y:top?H*.76-4:H*.24+4};
 const events=[{type:'raid',x:raidAt.x,y:raidAt.y,r:3.4,state:'idle',time:0,duration:32+act*4,spawnAt:0},{type:'guard',x:altar.x,y:altar.y,portal,hp:100,maxHp:100,state:'idle',wave:0,spawned:0,next:0,waves:3,perWave:4+act}];
 // 길과 이벤트 둘레는 비워 둔다.
 const segDist=(q,a,b)=>{const dx=b.x-a.x,dy=b.y-a.y,t=clamp(((q.x-a.x)*dx+(q.y-a.y)*dy)/((dx*dx+dy*dy)||1),0,1);return Math.hypot(q.x-a.x-dx*t,q.y-a.y-dy*t);};
 const keep=[{...start,r:5},{...gate,r:6},{...raidAt,r:5.5},{...altar,r:4},{...portal,r:3}];
 const free=(x,y,pad)=>keep.every(k=>Math.hypot(x-k.x,y-k.y)>k.r+pad)&&segDist({x,y},portal,altar)>2.2+pad;
 const obstacles=[];for(let tries=0;obstacles.length<24&&tries<600;tries++){const x=4+r()*(W-8),y=4+r()*(H-8),rad=.9+r()*1.1;if(!free(x,y,rad))continue;if(obstacles.some(o=>Math.hypot(o.x-x,o.y-y)<o.r+rad+2.4))continue;obstacles.push({x,y,r:rad,cell:Math.floor(r()*4)});}
 const decor=[];for(let i=0;i<44;i++){const x=2+r()*(W-4),y=2.5+r()*(H-4);if(obstacles.some(o=>Math.hypot(o.x-x,o.y-y)<o.r+.6))continue;decor.push({x,y,cell:Math.floor(r()*12),size:.7+r()*.6});}
 s.region={w:W,h:H,start,gate,obstacles,decor,events,explored:new Array(Math.ceil(W/REGION.cell)*Math.ceil(H/REGION.cell)).fill(false),message:''};
 p.x=start.x;p.y=start.y;
 // 적 무리: 지역 곳곳에 자고 있다가 가까이 가면 깨어난다. 출구 앞 무리는 출구를 지킨다.
 const roles=['melee','melee','ranged','tank','fast'];let pack=0;
 const placePack=(cx,cy,count,guard=false)=>{pack++;for(let i=0;i<count&&s.enemies.length<ADVENTURE.maxEnemies;i++){const a=i/count*Math.PI*2+r(),d=.9+r()*1.4;spawnEnemy(s,guard&&i===0?'tank':roles[Math.floor(r()*roles.length)],clamp(cx+Math.cos(a)*d,3,W-3),clamp(cy+Math.sin(a)*d,3,H-3),{dormant:true,pack,guard});}};
 const packs=[];for(let tries=0;packs.length<5+(s.elite?1:0)&&tries<400;tries++){const x=13+r()*(W-26),y=5+r()*(H-10);if(!free(x,y,1.5))continue;if(packs.some(q=>Math.hypot(q.x-x,q.y-y)<9))continue;if(obstacles.some(o=>Math.hypot(o.x-x,o.y-y)<o.r+2.2))continue;packs.push({x,y});}
 for(const q of packs)placePack(q.x,q.y,3+Math.floor(r()*2)+(info.local>0?1:0)+(s.elite?1:0));
 placePack(W-10,H/2,5+act+(s.elite?2:0),true);
 // 항아리·나무 상자·작은 보물 상자(열면 물건만, 보상 화면 없음).
 s.props.length=0;for(let tries=0;s.props.length<16&&tries<500;tries++){const x=3+r()*(W-6),y=3+r()*(H-6);if(!free(x,y,.4)||obstacles.some(o=>Math.hypot(o.x-x,o.y-y)<o.r+1))continue;const cache=s.props.length<2,kind=cache?'cache':r()<.35?'crate':'pot';s.props.push({id:++s.serial,kind,x,y,hp:cache?2:kind==='crate'?2:1,maxHp:cache?2:kind==='crate'?2:1,flash:0});}
 s.message=info.name+' · 출구를 지키는 무리를 물리치세요';
}
// 지역 이벤트. 습격지: 원 안에 서 있는 동안 시간이 흐르고, 사방에서 적이 몰려온다. 끝까지 버티면 보물 상자.
// 수호 제단: 가까이 가면 문에서 적이 줄지어 나와 제단으로 걸어간다. 씨앗이 움직이는 포탑이 되어 막는다.
function eventLoot(s,ev,big=false){s.props.push({id:++s.serial,kind:'cache',x:ev.x,y:ev.y,hp:1,maxHp:1,flash:0,big});event(s,'evolve');fx(s,'buff',ev.x,ev.y,{buff:'focus',radius:2,life:.8,max:.8});}
function updateEvents(s,dt){
 const R=s.region,p=s.player,info=adventureRoomInfo(s.room);if(!R)return;
 for(const ev of R.events){
  if(ev.type==='raid'){
   const inside=Math.hypot(p.x-ev.x,p.y-ev.y)<ev.r;
   if(ev.state==='idle'&&inside){ev.state='active';R.message='습격지 · 원 안에서 버티세요';event(s,'bossWarning');}
   if(ev.state!=='active')continue;
   if(inside)ev.time+=dt;ev.spawnAt-=dt;
   if(ev.spawnAt<=0){ev.spawnAt=2.3;const n=2+(info.act>0?1:0);for(let i=0;i<n&&s.enemies.length<ADVENTURE.maxEnemies;i++){const a=random(s)*Math.PI*2;spawnEnemy(s,random(s)<.25?'ranged':random(s)<.5?'fast':'melee',clamp(ev.x+Math.cos(a)*9,3,R.w-3),clamp(ev.y+Math.sin(a)*7,3,R.h-3),{raid:true});}}
   if(ev.time>=ev.duration){ev.state='done';R.message='습격지를 지켜 냈어요 · 보물 상자';for(const e of s.enemies)if(e.raid)e.hp=Math.min(e.hp,1);eventLoot(s,ev);}
  }else if(ev.type==='guard'){
   if(ev.state==='idle'&&Math.hypot(p.x-ev.x,p.y-ev.y)<6){ev.state='active';ev.next=1.2;R.message='수호 제단 · 줄지어 오는 적을 막으세요';event(s,'bossWarning');}
   if(ev.state!=='active')continue;
   ev.next-=dt;
   if(ev.next<=0&&ev.wave<ev.waves){if(ev.spawned<ev.perWave){ev.spawned++;ev.next=.75;spawnEnemy(s,ev.spawned%3===0?'tank':'melee',ev.portal.x,ev.portal.y,{march:true,target:{x:ev.x,y:ev.y}});fx(s,'enemyRing',ev.portal.x,ev.portal.y,{radius:1});}else{ev.wave++;ev.spawned=0;ev.next=ev.wave<ev.waves?6:0;}}
   const marching=s.enemies.some(e=>e.march&&e.hp>0);
   if(ev.hp<=0){ev.state='failed';R.message='제단이 무너졌어요';for(const e of s.enemies)if(e.march){e.march=false;e.dormant=false;}}
   else if(ev.wave>=ev.waves&&!marching){ev.state='done';R.message='제단을 지켜 냈어요 · 보물 상자';eventLoot(s,ev,true);}
  }
 }
}
function blockCircle(s,o,r){const R=s.region;if(!R)return false;let hitAny=false;for(const b of R.obstacles){const dx=o.x-b.x,dy=o.y-b.y,d=Math.hypot(dx,dy),m=b.r+r;if(d<m&&d>1e-6){o.x=b.x+dx/d*m;o.y=b.y+dy/d*m;hitAny=true;}}return hitAny;}
const insideObstacle=(s,x,y)=>Boolean(s.region&&s.region.obstacles.some(b=>Math.hypot(x-b.x,y-b.y)<b.r));
function wakePack(s,e){if(!e.dormant)return;for(const n of s.enemies)if(n.pack===e.pack&&n.dormant){n.dormant=false;n.cd=Math.max(n.cd,.6+random(s)*.6);}}
// ③ 막의 수호자. 막마다 다른 공격 세 가지를 돌려 쓴다. 체력 절반에서 부하를 부르고(한 번) 조금 빨라진다.
export const ADVENTURE_BOSSES=Object.freeze({
 austin:Object.freeze({name:'오스틴',hp:2300,patterns:Object.freeze(['charge','slam','punches'])}),
 alwaysbeginner:Object.freeze({name:'항상초심',hp:4900,patterns:Object.freeze(['pitch','swing','pitch','rain'])}),
 tempestcarrier:Object.freeze({name:'요한',hp:7200,patterns:Object.freeze(['strikes','spiral','slam','strikes'])})
});
function spawnBoss(s,info){const b=ADVENTURE_BOSSES[info.actInfo.boss],hp=b.hp*(1+(s.level-1)*.04);s.enemies.push({id:++s.serial,type:'boss',role:'boss',bossId:info.actInfo.boss,art:info.actInfo.boss,act:info.act,x:12,y:6,hp,maxHp:hp,r:1.1,speed:1.05+info.act*.12,cd:1.6,tell:0,tellKind:'',tx:0,ty:0,marks:[],slow:0,frost:0,flash:0,pattern:0,kx:0,ky:0,stun:0,power:1+info.act*.25,charging:0,cx:0,cy:0});}

// ② 보상. 법칙은 두 개까지, 같은 법칙을 다시 고르면 단계가 오른다.
function lawChoices(s){if(s.laws.length>=2)return [];if(!s.laws.length)return ['recall','split','orbit'];const pool=Object.keys(LAWS).filter(id=>!s.laws.includes(id)),out=[];while(out.length<3&&pool.length)out.push(pool.splice(Math.floor(random(s)*pool.length),1)[0]);return out;}
function upgradeChoices(s){return s.laws.filter(id=>rank(s,id)<3);}
export function adventureOffers(s){
 const kind=s.choiceKind,treasure=kind==='boss',lawy=kind==='law'||treasure;
 const laws=lawy?(s.offerLaws||[]):[],upgrades=lawy?upgradeChoices(s):[],evolutions=['law','evolve','grow','boss'].includes(kind)?adventureEvolutions(s):[];
 return {kind,laws,upgrades,evolutions,forms:evolutions,
  shapes:kind==='shape'?['slash','throw'].filter(id=>!s.shapes.includes(id)):[],
  canGrow:kind==='grow'||treasure||(lawy&&!laws.length&&!upgrades.length)||(kind==='evolve'&&!evolutions.length),
  heal:kind==='fountain',potion:kind==='fountain'&&s.potions<ADVENTURE.maxPotions};
}
function openReward(s){
 let kind=s.roomReward||'law';
 if(kind==='evolve'&&!adventureEvolutions(s).length)kind='law';
 if(kind==='shape'&&s.shapes.length>1)kind='grow';
 if(kind==='coins'){s.coins+=40;s.earned+=40;finishReward(s,'햇살 +40');return;}
 s.choiceKind=kind;s.offerLaws=kind==='law'||kind==='boss'?lawChoices(s):[];
 s.phase='choice';s.shots.length=0;s.pendingCuts.length=0;event(s,'pickup');
 s.message=kind==='boss'?`${adventureRoomInfo(s.room).actInfo.bossName}를 쓰러뜨렸어요`:'방을 지켜 냈어요';
}
function learn(s,id){
 if(!s.laws.includes(id))s.laws.push(id);s.ranks[id]=Math.min(3,(s.ranks[id]||0)+1);
 // 두 번째 법칙이 들어오면 융합으로(단독 진화를 고른 씨앗은 그대로 두어 쌍둥이 길을 남긴다).
 if(s.laws.length===2&&(!s.formId||DEFENSE_FORMS[s.formId]?.kind==='fusion'))s.formId=defenseFusionOf(s.laws);
}
export function chooseAdventure(s,kind,id){
 if(s.phase!=='choice'&&s.phase!=='fountain')return false;const offers=adventureOffers(s),p=s.player;let note='';
 if(kind==='law'&&offers.laws.includes(id)){learn(s,id);note=`${LAWS[id].name} 1단계`;}
 else if(kind==='upgrade'&&offers.upgrades.includes(id)){learn(s,id);note=`${LAWS[id].name} ${rank(s,id)}단계`;}
 else if((kind==='evolve'||kind==='form')&&offers.evolutions.some(f=>f.id===id)){s.formId=id;note=DEFENSE_FORMS[id].name+' 진화';event(s,'evolve');}
 else if(kind==='shape'&&offers.shapes.includes(id)){s.shapes.push(id);s.weapon='hybrid';}
 else if(kind==='grow'&&offers.canGrow){s.level++;p.maxHp+=10;note='Lv.'+s.level;}
 else if(kind==='heal'&&offers.heal){p.maxHp+=5;p.hp+=p.maxHp*.6;note='체력 회복';}
 else if(kind==='potion'&&offers.potion){s.potions++;note='물약 +1';}
 else return false;
 p.hp=Math.min(p.maxHp,p.hp+(s.choiceKind==='boss'?p.maxHp*.4:s.phase==='choice'?5:0));
 finishReward(s,note);return true;
}
function finishReward(s,note=''){
 const p=s.player;
 // 정예 방을 깨면 보상에 성장 한 번이 덤으로 붙는다.
 s.bonus=note;if(s.elite){s.level++;p.maxHp+=10;p.hp=Math.min(p.maxHp,p.hp+10);s.bonus=(note?note+' · ':'')+'정예 보너스 Lv.'+s.level;s.elite=false;}
 s.choiceKind=null;s.offerLaws=[];
 if(s.room>=ROOMS.length-1){s.phase='won';s.message='세 막의 수호자를 모두 이겼어요';return;}
 s.doors=makeDoors(s);s.phase='doors';
}
const rewardFor=(s,exclude=[])=>{const pool=['law','law','grow','coins'];if(adventureEvolutions(s).length)pool.push('evolve','evolve','evolve');if(s.shapes.length===1&&s.room>=1)pool.push('shape');const left=pool.filter(r=>!exclude.includes(r));return pick(s,left.length?left:pool);};
function makeDoors(s){
 const next=adventureRoomInfo(s.room+1);
 if(s.actFlags.act!==next.act)s.actFlags={act:next.act};
 if(next.boss)return [{room:'boss',reward:'boss'}];
 const doors=[],used=[];
 const combat=(elite=false)=>{const reward=rewardFor(s,used);used.push(reward);doors.push({room:elite?'elite':'combat',reward});};
 combat();
 if(next.local>=1){
  const flags=s.actFlags,options=[];
  if(!flags.treasure)options.push('treasure');
  if(next.local>=1&&!flags.shop)options.push('shop');
  if(!flags.fountain&&s.player.hp<s.player.maxHp*.75)options.push('fountain','fountain');
  if(next.local>=1)options.push('elite');
  if(options.length&&random(s)<.8){const room=pick(s,options);if(room==='elite')combat(true);else doors.push({room,reward:room==='treasure'?'law':null});}
 }
 if(doors.length<3&&random(s)<.45)combat();
 if(doors.length<2)combat();
 return doors;
}
export function adventureDoors(s){return s.phase==='doors'?s.doors:[];}
export function chooseAdventureDoor(s,index){
 if(s.phase!=='doors')return false;const door=s.doors[index];if(!door)return false;
 s.roomType=door.room||'combat';s.roomReward=door.reward||'law';s.elite=door.room==='elite';s.doors=[];s.room++;
 const info=adventureRoomInfo(s.room),p=s.player;if(s.actFlags.act!==info.act)s.actFlags={act:info.act};
 if(['treasure','shop','fountain'].includes(s.roomType))s.actFlags[s.roomType]=true;
 // 보스 방 앞에서는 숨을 고른다.
 if(door.room==='boss')p.hp=Math.min(p.maxHp,p.hp+p.maxHp*.25);
 if(s.roomType==='shop'){s.phase='shop';s.message=info.name+' · 떠돌이 상인';s.enemies.length=0;s.props.length=0;s.pickups.length=0;const wares=['potion','guard','power','vitality','upgrade','grow'],chosen=[];while(chosen.length<4){const id=pick(s,wares);if(!chosen.includes(id))chosen.push(id);}s.shop=chosen.map(id=>({id,price:SHOP_WARES[id].price+info.act*10,sold:false}));return true;}
 if(s.roomType==='fountain'){s.phase='fountain';s.choiceKind='fountain';s.message=info.name+' · 맑은 샘';s.enemies.length=0;s.props.length=0;s.pickups.length=0;return true;}
 spawnRoom(s);return true;
}
// 상점: 햇살로 산다. 떠나면 다음 문.
export function buyAdventure(s,index){
 if(s.phase!=='shop')return false;const ware=s.shop[index],p=s.player;if(!ware||ware.sold||s.coins<ware.price)return false;
 const id=ware.id;
 if(id==='potion'){if(s.potions>=ADVENTURE.maxPotions)return false;s.potions++;}
 else if(id==='power'||id==='guard')applyBuff(s,id);
 else if(id==='upgrade'){const up=upgradeChoices(s);if(!up.length)return false;learn(s,pick(s,up));}
 else if(id==='vitality'){p.maxHp+=15;p.hp+=15;}
 else if(id==='grow'){s.level++;p.maxHp+=10;}
 s.coins-=ware.price;ware.sold=true;event(s,'pickup');return true;
}
export function leaveAdventureShop(s){if(s.phase!=='shop'&&s.phase!=='fountain')return false;finishReward(s,'');return true;}
export function usePotionAdventure(s){const p=s.player;if(s.phase!=='playing'||s.potions<=0||p.hp>=p.maxHp)return false;s.potions--;p.hp=Math.min(p.maxHp,p.hp+p.maxHp*.35);fx(s,'heal',p.x,p.y,{radius:1.2,life:.6,max:.6});event(s,'pickup');return true;}
function applyBuff(s,id){const b=BUFFS[id];if(!b)return;if(id==='guard')s.buffs.guard=1;else if(id==='focus')s.charge=clamp(s.charge+35,0,100);else s.buffs[id]=b.seconds;fx(s,'buff',s.player.x,s.player.y,{buff:id,radius:1.3,life:.7,max:.7});event(s,'pickup');}

// 떨어진 물건: 햇살(동전)·물약·버프 구슬. 가까이 가면 빨려 와서 먹는다.
function drop(s,kind,x,y,extra={}){if(s.pickups.length>=ADVENTURE.maxPickups)return;const a=random(s)*Math.PI*2,v=1.5+random(s)*2;s.pickups.push({id:++s.serial,kind,x,y,vx:Math.cos(a)*v,vy:Math.sin(a)*v,age:0,value:1,...extra});}
function dropCoins(s,x,y,total){const n=Math.min(6,Math.max(1,Math.ceil(total/5)));for(let i=0;i<n;i++)drop(s,'coin',x,y,{value:Math.max(1,Math.round(total/n))});}
const BUFF_DROPS=['power','swift','guard','focus'];
function breakProp(s,prop){
 prop.hp=0;fx(s,'break',prop.x,prop.y,{kind:prop.kind,radius:prop.kind==='chest'?1.4:.9,life:.5,max:.5});event(s,prop.kind==='chest'?'evolve':'hit');
 const act=adventureRoomInfo(s.room).act,r=random(s);
 if(prop.kind==='chest'){dropCoins(s,prop.x,prop.y,20+act*10);drop(s,'potion',prop.x,prop.y);drop(s,'buff',prop.x,prop.y,{buff:pick(s,BUFF_DROPS)});s.clearTimer=1.4;return;}
 if(prop.kind==='cache'){dropCoins(s,prop.x,prop.y,(prop.big?16:10)+act*5);drop(s,random(s)<.35?'potion':'buff',prop.x,prop.y,{buff:pick(s,BUFF_DROPS)});drop(s,'buff',prop.x,prop.y,{buff:pick(s,BUFF_DROPS)});if(prop.big)s.charge=clamp(s.charge+25,0,100);return;}
 if(prop.kind==='crate'){dropCoins(s,prop.x,prop.y,3+act*2);if(r<.3)drop(s,'buff',prop.x,prop.y,{buff:pick(s,BUFF_DROPS)});else if(r<.4)drop(s,'potion',prop.x,prop.y);return;}
 if(r<.55)dropCoins(s,prop.x,prop.y,2+act);else if(r<.62)drop(s,'potion',prop.x,prop.y);else if(r<.85)drop(s,'buff',prop.x,prop.y,{buff:pick(s,BUFF_DROPS)});
}
function hitProp(s,prop){if(prop.hp<=0)return;prop.hp--;prop.flash=.15;if(prop.hp<=0)breakProp(s,prop);else event(s,'hit');}
function collect(s,item){const p=s.player;
 if(item.kind==='coin'){s.coins+=item.value;s.earned+=item.value;event(s,'coin');}
 else if(item.kind==='potion'){if(s.potions<ADVENTURE.maxPotions)s.potions++;else p.hp=Math.min(p.maxHp,p.hp+15);event(s,'pickup');}
 else if(item.kind==='buff')applyBuff(s,item.buff);
 fx(s,'collect',item.x,item.y,{kind:item.kind,life:.3,max:.3});}

function cut(s,c,seen=new Set()){
 fx(s,'slash',c.x,c.y,{angle:c.angle,radius:c.radius,returning:Boolean(c.returning),narrow:c.cos>.5,finisher:Boolean(c.meta?.finisher),life:c.meta?.finisher?.32:.25,max:c.meta?.finisher?.32:.25});
 const inArc=o=>{const a=Math.atan2(o.y-c.y,o.x-c.x)-c.angle;return Math.hypot(o.x-c.x,o.y-c.y)<c.radius+(o.r||.45)&&Math.cos(a)>c.cos;};
 for(const e of s.enemies){if(e.hp>0&&!seen.has(e.id)&&inArc(e)){seen.add(e.id);hit(s,e,c.damage,false,{...c.meta,angle:Math.atan2(e.y-c.y,e.x-c.x)});}}
 for(const prop of s.props)if(prop.hp>0&&!seen.has(prop.id)&&inArc(prop)){seen.add(prop.id);hitProp(s,prop);}
}
// 본편 조합 엔진(seed-adventure-combat.js)이 주는 피해. 법칙 효과·밀치기 없이 피해만, 콤보 수에는 들어간다.
export function adventureFormHit(s,e,damage){if(!e||e.hp<=0||!Number.isFinite(damage)||damage<=0)return false;hit(s,e,damage,true,null,true);return true;}
function hit(s,e,damage,secondary=false,meta=null,formHit=false){
 if(e.hp<=0)return;if(e.dormant)wakePack(s,e);damage*=formHit?1:power(s);e.hp-=damage;e.flash=.13;const heavy=Boolean(meta?.finisher);
 if(!formHit||damage>=8)fx(s,'number',e.x,e.y,{text:Math.round(damage),heavy,form:formHit,life:heavy?.8:.6,max:heavy?.8:.6});
 if(formHit){s.hits++;s.hitsTime=2;s.charge=clamp(s.charge+.6,0,100);}
 if(meta){
  const boss=e.type==='boss',angle=Number.isFinite(meta.angle)?meta.angle:Math.atan2(e.y-s.player.y,e.x-s.player.x),push=(meta.knock||0)*4*(boss?.15:1);
  e.kx=(e.kx||0)+Math.cos(angle)*push;e.ky=(e.ky||0)+Math.sin(angle)*push;e.stun=Math.max(e.stun||0,boss?(heavy?.12:0):meta.stun||0);
  // 막타는 보스가 아닌 적의 공격 예고를 끊는다.
  if(heavy&&!boss&&e.tell>0){e.tell=0;e.cd=1.2;fx(s,'spark',e.x,e.y,{angle,heavy:true,life:.3,max:.3});}
  fx(s,'spark',e.x,e.y,{angle,heavy,life:heavy?.28:.2,max:heavy?.28:.2});
  if(meta.stop&&(s.time>=s.stopReady||heavy)){s.hitstop=Math.max(s.hitstop,meta.stop);s.stopReady=s.time+.09;}
  s.shake=Math.max(s.shake,heavy?.22:.04);
 }
 if(!secondary){s.hits++;s.hitsTime=2;s.charge=clamp(s.charge+2.8,0,100);event(s,heavy?'finisher':'hit');
  const k=id=>1+(rank(s,id)-1)*.3;
  if(s.laws.includes('frost')){e.slow=1.8;e.frost++;if(e.frost>=5){e.frost=0;e.hp-=32*k('frost');fx(s,'frost',e.x,e.y,{radius:1.4});}}
  if(s.laws.includes('burst')){fx(s,'burst',e.x,e.y,{radius:1.5});for(const n of s.enemies)if(n!==e&&n.hp>0&&dist(n,e)<1.5)hit(s,n,damage*.4*k('burst'),true);}
  if(s.laws.includes('chain')){let prev=e;const seen=new Set([e.id]);for(let i=0;i<1+rank(s,'chain');i++){const n=s.enemies.filter(n=>n.hp>0&&!seen.has(n.id)&&dist(n,prev)<3.7).sort((a,b)=>dist(a,prev)-dist(b,prev))[0];if(!n)break;fx(s,'chain',prev.x,prev.y,{tx:n.x,ty:n.y});hit(s,n,damage*.5,true);seen.add(n.id);prev=n;}}
  if(s.laws.includes('gravity')&&s.fields.length<6)s.fields.push({x:e.x,y:e.y,life:.65+rank(s,'gravity')*.15,r:2.5,collapse:rank(s,'gravity')>=3});
 }
 if(e.hp<=0){s.kills++;s.charge=clamp(s.charge+4,0,100);fx(s,'leaf',e.x,e.y,{life:.6,max:.6});
  if(e.type==='boss'){s.bossesDefeated++;s.hitstop=Math.max(s.hitstop,.15);s.shake=.45;event(s,'bossDefeat');dropCoins(s,e.x,e.y,30+e.act*10);drop(s,'potion',e.x,e.y);}
  else if(!e.noDrop&&!e.raid&&(random(s)<.6||s.elite))dropCoins(s,e.x,e.y,(e.role==='tank'?2:1)+(e.act||0)+(s.elite?2:0));}
}
function hurt(s,n){const p=s.player;if(p.inv>0||s.phase!=='playing')return;if(s.buffs.guard>0){s.buffs.guard=0;p.inv=.5;fx(s,'buff',p.x,p.y,{buff:'guard',radius:1.2,life:.5,max:.5});event(s,'reflect');return;}p.hp=Math.max(0,p.hp-n);p.inv=.7;s.shake=Math.max(s.shake,.2);event(s,'hurt');fx(s,'hurt',p.x,p.y,{radius:1});if(p.hp<=0){s.phase='lost';s.message='회피로 붉은 예고를 벗어나 보세요';}}
export function attackAdventure(s){
 if(s.phase!=='playing'||s.player.attack>0)return false;
 const p=s.player,dashStrike=p.dashStrike>0,step=dashStrike?2:p.combo,c=ADVENTURE_COMBO[step],plan=composeAdventureAttack({weapon:s.weapon,laws:s.laws,form:null,level:s.level}),angle=Math.atan2(p.aimY,p.aimX),seen=new Set();
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
export function dodgeAdventure(s,x=0,y=0){const p=s.player;if(s.phase!=='playing'||p.dash>0)return false;const d=direction(x||y?x:p.aimX,x||y?y:p.aimY);p.dx=d.x;p.dy=d.y;p.dashing=.2;p.inv=.28;p.dash=s.buffs.swift>0?.88:1.25;p.dashStrike=DASH_STRIKE;p.attack=Math.min(p.attack,.05);p.lx=p.ly=0;fx(s,'dash',p.x,p.y,{life:.35,max:.35});event(s,'dash');return true;}
// 궁극기: 씨앗 둘레 폭발 + 진화한 형태가 있으면 본편 궁극기(엔진의 surge)도 함께.
export function ultimateAdventure(s,combat=null){if(s.phase!=='playing'||s.charge<100)return false;s.charge=0;s.player.inv=1;event(s,'ultimate');fx(s,'ultimate',s.player.x,s.player.y,{radius:7,life:.9,max:.9});s.hitstop=.08;s.shake=.35;for(const e of s.enemies)if(dist(e,s.player)<7)hit(s,e,95+s.level*12,false,{knock:2.5,stun:.6,angle:Math.atan2(e.y-s.player.y,e.x-s.player.x)});for(const prop of s.props)if(prop.hp>0&&dist(prop,s.player)<7)breakProp(s,prop);s.shots=s.shots.filter(b=>!b.hostile);s.charge=0;combat?.surge?.();return true;}

function bossAct(s,e,p,dt){
 const b=ADVENTURE_BOSSES[e.bossId],enraged=e.hp<e.maxHp*.5;
 if(enraged&&!s.summoned){s.summoned=true;event(s,'bossWarning');for(const [x,y] of [[4,8],[20,8]])spawnEnemy(s,e.bossId==='tempestcarrier'?'fast':'melee',x,y);}
 if(e.charging>0){e.charging-=dt;e.x=clamp(e.x+e.cx*13*dt,2,22);e.y=clamp(e.y+e.cy*13*dt,2.5,14);if(dist(e,p)<1.4)hurt(s,Math.round(24*e.power));if(e.charging<=0)fx(s,'enemyRing',e.x,e.y,{radius:1.4});return true;}
 if(e.tell>0){e.tell-=dt;if(e.tell>0)return true;
  const kind=e.tellKind,dmg=n=>Math.round(n*e.power);event(s,'bossAttack');
  if(kind==='charge'){e.charging=.55;const v=direction(e.tx-e.x,e.ty-e.y);e.cx=v.x;e.cy=v.y;}
  else if(kind==='slam'){fx(s,'enemyRing',e.tx,e.ty,{radius:2.1});if(Math.hypot(p.x-e.tx,p.y-e.ty)<2.1)hurt(s,dmg(30));e.x=e.tx;e.y=e.ty;s.shake=Math.max(s.shake,.3);}
  else if(kind==='punches'||kind==='pitch'){const base=Math.atan2(p.y-e.y,p.x-e.x),n=kind==='pitch'?3:5,spread=kind==='pitch'?.16:.28;for(let i=0;i<n;i++){const a=base+(i-(n-1)/2)*spread;shot(s,e.x,e.y,Math.cos(a),Math.sin(a),{hostile:true,boss:true,art:kind==='pitch'?'ball':'glove',damage:dmg(kind==='pitch'?20:18),speed:kind==='pitch'?8.5:5.8,life:4});}}
  else if(kind==='swing'){const a=Math.atan2(e.ty-e.y,e.tx-e.x);fx(s,'enemyArc',e.x,e.y,{angle:a,radius:3.4,life:.3,max:.3});const pa=Math.atan2(p.y-e.y,p.x-e.x)-a;if(dist(p,e)<3.4+.3&&Math.cos(pa)>.35)hurt(s,dmg(32));}
  else if(kind==='rain'||kind==='spiral'){const rings=kind==='spiral'?2:1;for(let r=0;r<rings;r++)for(let i=0;i<12;i++){const a=i/12*Math.PI*2+r*.26;shot(s,e.x,e.y,Math.cos(a),Math.sin(a),{hostile:true,boss:true,art:e.bossId==='alwaysbeginner'?'ball':'',damage:dmg(19),speed:4.2-r*.9,life:4.5});}fx(s,'enemyRing',e.x,e.y,{radius:3});if(dist(p,e)<3)hurt(s,dmg(25));}
  else if(kind==='strikes'){for(const m of e.marks){fx(s,'bolt',m.x,m.y,{radius:m.r,life:.35,max:.35});if(Math.hypot(p.x-m.x,p.y-m.y)<m.r)hurt(s,dmg(25));}s.shake=Math.max(s.shake,.25);}
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
export function stepAdventure(s,dt,input={},combat=null){
 if(s.phase!=='playing'||!Number.isFinite(dt)||dt<=0)return;dt=clamp(dt,0,.05);const p=s.player,A=s.arena;
 s.shake=Math.max(0,s.shake-dt*2.2);
 if(input.attack&&p.attack>0)p.buffer=BUFFER;
 // 타격 멈춤: 짧게 세상이 멈춘다. 입력은 기억해 두었다가 멈춤이 끝나면 이어진다.
 if(s.hitstop>0){s.hitstop=Math.max(0,s.hitstop-dt);return;}
 s.time+=dt;for(const k of ['attack','dash','inv','dashing','comboTime','buffer','dashStrike'])p[k]=Math.max(0,p[k]-dt);
 for(const k of ['power','swift'])s.buffs[k]=Math.max(0,s.buffs[k]-dt);
 if(p.comboTime<=0)p.combo=0;if(p.attack<=0)p.swing=-1;
 s.hitsTime=Math.max(0,s.hitsTime-dt);if(s.hitsTime<=0)s.hits=0;
 if(Number.isFinite(input.aimX)&&Math.hypot(input.aimX,input.aimY)>.05){const d=direction(input.aimX,input.aimY);p.aimX=d.x;p.aimY=d.y;}
 const d=direction(input.x||0,input.y||0),moving=Boolean(input.x||input.y),speed=(p.dashing>0?15:p.attack>.29?2.15:4.3)*(s.buffs.swift>0&&p.dashing<=0?1.3:1);p.moving=moving;
 const lunge=Math.exp(-14*dt);p.x+=p.lx*dt;p.y+=p.ly*dt;p.lx*=lunge;p.ly*=lunge;
 p.x=clamp(p.x+(p.dashing>0?p.dx:moving?d.x:0)*speed*dt,A.minX,A.maxX);p.y=clamp(p.y+(p.dashing>0?p.dy:moving?d.y:0)*speed*dt,A.minY,A.maxY);
 blockCircle(s,p,.4);
 if(s.region){const R=s.region,c=REGION.cell,cols=Math.ceil(R.w/c);for(let dx=-2;dx<=2;dx++)for(let dy=-2;dy<=2;dy++){const cx=Math.floor(p.x/c)+dx,cy=Math.floor(p.y/c)+dy;if(cx>=0&&cy>=0&&cx<cols&&cy<Math.ceil(R.h/c))R.explored[cy*cols+cx]=true;}}
 if(input.attack||p.buffer>0){if(attackAdventure(s))p.buffer=0;}
 for(const c of s.pendingCuts){c.delay-=dt;if(c.delay<=0)cut(s,c,c.seen);}s.pendingCuts=s.pendingCuts.filter(c=>c.delay>0);
 for(const f of s.fields){f.life-=dt;for(const e of s.enemies)if(e.type!=='boss'&&e.hp>0&&dist(e,f)<f.r){const v=direction(f.x-e.x,f.y-e.y);e.x+=v.x*dt*2.8;e.y+=v.y*dt*2.8;}if(f.life<=0&&f.collapse){fx(s,'burst',f.x,f.y,{radius:2.8});for(const e of s.enemies)if(e.hp>0&&dist(e,f)<2.8)hit(s,e,28,true);}}s.fields=s.fields.filter(f=>f.life>0);
 const knock=Math.exp(-9*dt);
 for(const e of s.enemies){if(e.hp<=0)continue;e.kx||=0;e.ky||=0;e.stun||=0;e.power||=1;e.role||=(e.type==='caster'?'ranged':e.type==='shield'?'tank':e.type==='boss'?'boss':'melee');
  e.x=clamp(e.x+e.kx*dt,A.minX,A.maxX);e.y=clamp(e.y+e.ky*dt,A.minY,A.maxY);e.kx*=knock;e.ky*=knock;
  e.cd-=dt;e.slow=Math.max(0,e.slow-dt);e.flash=Math.max(0,e.flash-dt);e.stun=Math.max(0,e.stun-dt);
  if(e.type==='boss'){bossAct(s,e,p,dt);continue;}
  // 자는 무리: 가까이 오면 무리 전체가 깨어난다. 멀리 있는 자는 적은 계산하지 않는다.
  if(e.dormant){if(dist(e,p)<8.5)wakePack(s,e);else continue;}
  // 수호 제단으로 행진하는 적: 씨앗은 보지 않고 제단으로만 간다. 닿으면 제단이 깎이고 사라진다.
  if(e.march){if(e.stun>0)continue;const t=e.target,v=direction(t.x-e.x,t.y-e.y);e.x+=v.x*e.speed*.85*(e.slow>0?.5:1)*dt;e.y+=v.y*e.speed*.85*(e.slow>0?.5:1)*dt;if(Math.hypot(t.x-e.x,t.y-e.y)<1.2){const ev=s.region?.events.find(ev=>ev.type==='guard');if(ev){ev.hp=Math.max(0,ev.hp-Math.round(10*e.power));fx(s,'hurt',t.x,t.y,{radius:1.4});event(s,'hurt');}e.hp=0;e.noDrop=true;}continue;}
  if(e.tell>0){e.tell-=dt;if(e.tell<=0){if(e.role==='ranged'){const v=direction(e.tx-e.x,e.ty-e.y);shot(s,e.x,e.y,v.x,v.y,{hostile:true,damage:Math.round(18*e.power),speed:6.5,life:4});}else{fx(s,'enemyRing',e.tx,e.ty,{radius:1});if(Math.hypot(p.x-e.tx,p.y-e.ty)<1)hurt(s,Math.round(20*e.power));if(e.role==='fast'){e.x=clamp(e.tx,A.minX,A.maxX);e.y=clamp(e.ty,A.minY,A.maxY);}}e.cd=e.role==='fast'?1.8:1.4;}continue;}
  if(e.stun>0)continue;
  const range=e.role==='ranged'?7:e.role==='fast'?2.6:1.35;if(dist(e,p)>range){const v=direction(p.x-e.x,p.y-e.y);e.x+=v.x*e.speed*(e.slow>0?.5:1)*dt;e.y+=v.y*e.speed*(e.slow>0?.5:1)*dt;}else if(e.cd<=0){e.tell=e.role==='fast'?.5:.6;e.tx=p.x;e.ty=p.y;e.pattern++;}
  blockCircle(s,e,e.r);
  // Keep a readable ring around the seed instead of stacking sprites.
  for(const n of s.enemies)if(n.id<e.id&&n.hp>0){const gap=dist(e,n),r=e.r+n.r;if(gap<r&&gap>.001){e.x+=(e.x-n.x)/gap*dt;e.y+=(e.y-n.y)/gap*dt;}}
 }
 combat?.update?.(dt);
 for(const b of s.shots){b.life-=dt;b.age+=dt;b.px=b.x;b.py=b.y;if(!b.hostile&&b.recall&&b.age>.48){if(!b.returning){b.returning=true;b.hit.clear();b.remaining=s.laws.includes('pierce')?3:1;b.spent=false;b.life=.9;}const v=direction(p.x-b.x,p.y-b.y);b.dx=v.x;b.dy=v.y;if(dist(b,p)<.45){b.life=0;continue;}}
 b.x+=b.dx*b.speed*dt;b.y+=b.dy*b.speed*dt;const x0=A.minX-.1,x1=A.maxX+.1,y0=A.minY-.2,y1=A.maxY+.3;if(b.x<x0||b.x>x1||b.y<y0||b.y>y1){if(!b.hostile&&s.laws.includes('reflect')&&b.bounces<2){if(b.x<x0||b.x>x1)b.dx*=-1;else b.dy*=-1;b.bounces++;b.x=clamp(b.x,x0,x1);b.y=clamp(b.y,y0,y1);fx(s,'frost',b.x,b.y,{radius:.7});}else b.life=0;}
 if(insideObstacle(s,b.x,b.y)){b.life=0;fx(s,'hit',b.x,b.y,{radius:.5,life:.2,max:.2});continue;}
 if(b.hostile){if(s.laws.includes('orbit')&&!b.boss&&dist(b,p)<1.6){b.life=0;fx(s,'frost',b.x,b.y,{radius:.5});}else if(dist(b,p)<.45){hurt(s,b.damage);b.life=0;}}
 else{for(const e of s.enemies){if(e.hp<=0||b.spent||b.hit.has(e.id))continue;const vx=b.x-b.px,vy=b.y-b.py,len=vx*vx+vy*vy,t=clamp(((e.x-b.px)*vx+(e.y-b.py)*vy)/(len||1),0,1);if(Math.hypot(e.x-b.px-vx*t,e.y-b.py-vy*t)<e.r+.22){b.hit.add(e.id);hit(s,e,b.damage,false,{knock:b.heavy?1.4:.35,stun:b.heavy?.3:.06,stop:b.heavy?.03:0,finisher:b.heavy,angle:Math.atan2(b.dy,b.dx)});if(--b.remaining<=0){if(b.recall&&!b.returning)b.spent=true;else b.life=0;break;}}}
  if(b.life>0&&!b.spent)for(const prop of s.props)if(prop.hp>0&&!b.hit.has(prop.id)&&dist(prop,b)<.7){b.hit.add(prop.id);hitProp(s,prop);if(--b.remaining<=0){b.life=0;break;}}}}
 s.shots=s.shots.filter(b=>b.life>0);if(s.laws.includes('orbit')&&s.time<s.orbitUntil){for(const e of s.enemies)if(e.hp>0&&dist(e,p)<s.orbitRadius){e.orbitTick=(e.orbitTick||0)-dt;if(e.orbitTick<=0){e.orbitTick=.5;hit(s,e,9*(1+(rank(s,'orbit')-1)*.3),true);}}}
 for(const prop of s.props)prop.flash=Math.max(0,prop.flash-dt);s.props=s.props.filter(prop=>prop.hp>0);
 // 떨어진 물건: 튀어 나간 뒤 멈추고, 가까우면(방을 다 깨면 어디서든) 씨앗에게 빨려 온다.
 const cleared=!s.enemies.length&&s.clearTimer>0;
 for(const item of s.pickups){item.age+=dt;const f=Math.exp(-5*dt);item.x=clamp(item.x+item.vx*dt,A.minX,A.maxX);item.y=clamp(item.y+item.vy*dt,A.minY,A.maxY);item.vx*=f;item.vy*=f;
  const d=dist(item,p);if(item.age>.35&&(d<2.4||cleared)){const v=direction(p.x-item.x,p.y-item.y),pull=cleared?16:9;item.vx+=v.x*pull*dt*4;item.vy+=v.y*pull*dt*4;}
  if(item.age>.25&&d<.7){item.taken=true;collect(s,item);}}
 s.pickups=s.pickups.filter(item=>!item.taken);
 for(const f of s.effects)f.life-=dt;s.effects=s.effects.filter(f=>f.life>0);s.enemies=s.enemies.filter(e=>e.hp>0);
 if(s.phase!=='playing')return;
 // 방을 다 깨면 떨어진 물건을 모으는 짧은 틈을 두고 보상으로 넘어간다.
 const info=adventureRoomInfo(s.room);
 if(s.roomType==='treasure'&&!info.boss){if(!s.props.some(prop=>prop.kind==='chest')){if(!s.cleared){s.cleared=true;s.clearTimer=Math.max(s.clearTimer,1.4);}s.clearTimer-=dt;if(s.clearTimer<=0){for(const item of s.pickups)collect(s,item);s.pickups.length=0;s.cleared=false;openReward(s);}}return;}
 if(s.region){updateEvents(s,dt);const R=s.region;
  if(!R.gate.open&&!s.enemies.some(e=>e.guard&&e.hp>0)){R.gate.open=true;R.message='출구가 열렸어요 · 빛나는 문으로 가세요';event(s,'pickup');}
  if(R.gate.open&&Math.hypot(p.x-R.gate.x,p.y-R.gate.y)<R.gate.r+.4){for(const item of s.pickups)collect(s,item);s.pickups.length=0;s.enemies.length=0;openReward(s);}
  return;}
 if(!s.enemies.length){
  if(!info.boss&&s.wave<2){s.spawn+=dt;if(s.spawn>1.0)spawnWave(s);return;}
  if(!s.cleared){s.cleared=true;s.clearTimer=1.1;}
  s.clearTimer-=dt;if(s.clearTimer<=0){for(const item of s.pickups)collect(s,item);s.pickups.length=0;s.cleared=false;openReward(s);}
 }
}

// 2026-09-28 사용자: "모험에도 저장이 필요하고 부정기록 방지도 있어야 해 · 조합은 도감에, 햇살도 계정에".
// 저장은 문 앞(방과 방 사이)에서만 한다. 방 안에서 나가면 마지막 문 앞부터 다시 한다(본편 '방 입구 저장'과 같은 원칙).
// 불러올 때는 규칙상 가능한 범위인지 모두 검사하고, 하나라도 어긋나면 저장을 버린다.
export const ADVENTURE_SAVE_VERSION=1;
// 계정 저장(클라우드 동기화)에 실리는 칸. 계정마다 따로이고, 로그아웃하면 이 기기에서 지워진다.
export const ADVENTURE_SAVE_KEY='seed-adventure-run-v1';
// Firebase 저장 규칙(seedUsers/$uid/save)은 모르는 칸이 있으면 저장 전체를 거부한다. 'adventure' 칸을 허용하는 규칙
// (docs/firebase-rules-with-seed.json)이 콘솔에 게시되기 전에는 false로 두고, 계정별 이 기기 저장만 쓴다.
// 2026-09-28 사용자가 콘솔에 save.adventure 규칙을 게시함 → 켬.
export const ADVENTURE_CLOUD_READY=true;
export const adventureTombstone=(now=Date.now())=>({version:1,cleared:true,savedAt:now});
export const ADVENTURE_JP=Object.freeze({perRoomMax:400,perRunMax:4000});
export function adventureCheckpoint(s){
 if(s?.phase!=='doors'||!Array.isArray(s.doors)||!s.doors.length)return null;const p=s.player;
 return {version:ADVENTURE_SAVE_VERSION,runId:s.runId,seed:s.seed,room:s.room,doors:s.doors.map(d=>({room:d.room,reward:d.reward??null})),actFlags:{...s.actFlags},
  shapes:[...s.shapes],weapon:s.weapon,laws:[...s.laws],ranks:{...s.ranks},formId:s.formId,level:s.level,coins:s.coins,potions:s.potions,charge:Math.floor(s.charge),
  hp:Math.round(p.hp*10)/10,maxHp:p.maxHp,kills:s.kills,time:Math.round(s.time*10)/10,bossesDefeated:s.bossesDefeated,earned:s.earned,credited:s.credited,savedAt:Date.now()};
}
const int=(v,a,b)=>Number.isInteger(v)&&v>=a&&v<=b;
export function restoreAdventure(raw){
 try{
  const r=typeof raw==='string'?JSON.parse(raw):raw;
  if(!r||r.version!==ADVENTURE_SAVE_VERSION||typeof r.runId!=='string'||!/^[\w-]{1,90}$/.test(r.runId)||!int(r.seed,0,4294967295)||!int(r.room,0,ROOMS.length-2))return null;
  const next=adventureRoomInfo(r.room+1);
  if(!Array.isArray(r.doors)||r.doors.length<1||r.doors.length>3||r.doors.some(d=>!d||!Object.hasOwn(ROOM_TYPES,d.room)||(d.reward!==null&&!Object.hasOwn(REWARDS,d.reward))))return null;
  if(next.boss!==(r.doors.length===1&&r.doors[0].room==='boss'))return null;if(!next.boss&&r.doors.some(d=>d.room==='boss'))return null;
  if(!Array.isArray(r.shapes)||r.shapes.length<1||r.shapes.length>2||new Set(r.shapes).size!==r.shapes.length||r.shapes.some(x=>!['slash','throw'].includes(x)))return null;
  if(!availableAttacks(r.shapes).includes(r.weapon))return null;
  if(!Array.isArray(r.laws)||r.laws.length>2||new Set(r.laws).size!==r.laws.length||r.laws.some(l=>!Object.hasOwn(LAWS,l)))return null;
  if(!r.ranks||typeof r.ranks!=='object'||Object.keys(r.ranks).length!==r.laws.length||r.laws.some(l=>!int(r.ranks[l],1,3)))return null;
  const rankTotal=r.laws.reduce((n,l)=>n+r.ranks[l],0),rooms=r.room+1;
  // 방마다 법칙 보상 하나 + 상인의 법칙 강화(막마다 한 번)를 넘을 수 없다.
  if(rankTotal>rooms+ADVENTURE_ACTS.length)return null;
  if(r.formId!==null&&!(typeof r.formId==='string'&&DEFENSE_FORMS[r.formId]&&validDefenseForm({laws:r.laws,lawRanks:r.ranks,formId:r.formId})))return null;
  if(r.formId===null&&r.laws.length===2)return null;
  if(!int(r.level,1,rooms*2+2)||!int(r.coins,0,20000)||!int(r.potions,0,ADVENTURE.maxPotions)||!int(r.charge,0,100)||!int(r.kills,0,5000)||!int(r.earned,0,1e6)||!int(r.credited,0,r.earned))return null;
  if(!Number.isFinite(r.time)||r.time<0||r.time>1e6||!Number.isFinite(r.maxHp)||r.maxHp<100||r.maxHp>100+r.level*10+rooms*25||!Number.isFinite(r.hp)||r.hp<=0||r.hp>r.maxHp)return null;
  const bossRooms=ADVENTURE_ACTS.map((_,a)=>a*ROOMS_PER_ACT+ROOMS_PER_ACT-1).filter(i=>i<=r.room).length;if(r.bossesDefeated!==bossRooms)return null;
  const flags=r.actFlags&&typeof r.actFlags==='object'?r.actFlags:{};
  const s=createAdventure(r.seed);Object.assign(s,{runId:r.runId,seed:r.seed,room:r.room,phase:'doors',doors:r.doors.map(d=>({room:d.room,reward:d.reward})),actFlags:{act:int(flags.act,0,2)?flags.act:next.act,treasure:flags.treasure===true,shop:flags.shop===true,fountain:flags.fountain===true},
   shapes:[...r.shapes],weapon:r.weapon,laws:[...r.laws],ranks:{...r.ranks},formId:r.formId,level:r.level,coins:r.coins,potions:r.potions,charge:r.charge,kills:r.kills,time:r.time,bossesDefeated:r.bossesDefeated,earned:r.earned,credited:r.credited,message:'저장한 문 앞에서 이어가요'});
  s.player.hp=r.hp;s.player.maxHp=r.maxHp;return s;
 }catch{return null;}
}
// 계정에 쌓을 햇살(JP): 이번 판에 새로 번 만큼, 방 하나·판 하나 상한 안에서만. 같은 저장을 다시 불러와도 두 번 쌓이지 않는다.
export function adventureCredit(s){
 const due=Math.max(0,s.earned-s.credited),room=Math.min(due,ADVENTURE_JP.perRoomMax),left=Math.max(0,ADVENTURE_JP.perRunMax-s.credited);
 const jp=Math.min(room,left);s.credited=s.earned;return jp;
}
