import {titleCombatBonuses,titleCriticalMultiplier,TITLE_CRIT_DAMAGE,titleFormCriticalEligible,refreshAdventureTitleHp,checkpointAdventureTitleHp,validAdventureTitleHp,restoreAdventureTitleHp} from './title-combat-bonuses.js';
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
export const REGION=Object.freeze({w:76,h:50,cell:4,path:1.9});

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
function shot(s,x,y,dx,dy,extra={}){if(s.shots.length>=ADVENTURE.maxShots)return;const critical=!extra.hostile&&titleCriticalMultiplier(s,s.formId?titleFormCriticalEligible(s.formId):s.laws.includes('pierce'),()=>random(s))>1;s.shots.push({critical,x,y,px:x,py:y,dx,dy,speed:12,life:1.15,age:0,damage:17+s.level*2,hit:new Set(),bounces:0,remaining:s.laws.includes('pierce')?3:1,...extra});}
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
 const info=adventureRoomInfo(s.room),base=ROLE[role]||ROLE.melee,scale=(1.1+info.act*1.95+info.local*.35)*(s.elite?1.45:1);
 const hp=Math.round(base.hp*scale+(s.elite&&role==='tank'?20:0));
 s.enemies.push({id:++s.serial,type:role==='ranged'?'caster':role==='tank'?'shield':'hound',role,art:ROLE_ART[info.act][role],act:info.act,x,y,hp,maxHp:hp,r:base.r,speed:base.speed*1.3*(1+info.act*.08),cd:1.3+random(s),tell:0,tx:0,ty:0,slow:0,frost:0,flash:0,pattern:0,kx:0,ky:0,stun:0,power:1+info.act*.45+info.local*.08,...extra});
}
function spawnWave(s){
 s.wave++;const info=adventureRoomInfo(s.room),count=Math.min(ADVENTURE.maxEnemies,4+info.local+info.act*2+s.wave+(s.elite?2:0));
 const roles=['melee','melee','ranged','tank','fast'];
 for(let i=0;i<count&&s.enemies.length<ADVENTURE.maxEnemies;i++){const a=i/count*Math.PI*2+.5*s.wave;spawnEnemy(s,roles[(i+s.wave)%roles.length],clamp(12+Math.cos(a)*8,2,22),clamp(7.5+Math.sin(a)*5,2.5,13.5));}
 s.spawn=0;
}
// 넓은 지역 만들기. 같은 씨앗(판 번호)이면 같은 지역이 나온다.
// 2026-09-28 사용자: "맵이 넓은데 넓은 느낌이 아니다 · 단조롭다" → 숲으로 막힌 공터들이 오솔길로 이어진 지형.
// 공터마다 역할: 적 야영지·폐허(상자)·습격지·수호 제단·막다른 길 끝 보물·출구. 숲 속으로는 들어갈 수 없다.
function buildRegion(s,info){
 const W=REGION.w,H=REGION.h,p=s.player,r=()=>random(s),act=info.act;
 s.arena={minX:1.4,maxX:W-1.4,minY:2,maxY:H-1.6};s.wave=2;s.spawn=Infinity;
 const start={x:5,y:H/2+(r()-.5)*10,r:4.2,role:'start'},gateNode={x:W-6,y:H/2+(r()-.5)*10,r:5.2,role:'gate'};
 const nodes=[start,gateNode];
 for(let tries=0;nodes.length<10&&tries<900;tries++){const n={x:9+r()*(W-18),y:7+r()*(H-14),r:4+r()*2.6};if(nodes.every(m=>Math.hypot(m.x-n.x,m.y-n.y)>m.r+n.r+5.5))nodes.push(n);}
 // 길: 가까운 것부터 잇는 나무(MST) + 짧은 고리 두 개.
 const d=(a,b)=>Math.hypot(nodes[a].x-nodes[b].x,nodes[a].y-nodes[b].y),edges=[],inTree=new Set([0]);
 while(inTree.size<nodes.length){let best=null;for(const a of inTree)for(let b=0;b<nodes.length;b++)if(!inTree.has(b)&&(!best||d(a,b)<best[2]))best=[a,b,d(a,b)];edges.push([best[0],best[1]]);inTree.add(best[1]);}
 const extra=[];for(let a=0;a<nodes.length;a++)for(let b=a+1;b<nodes.length;b++)if(!edges.some(([x,y])=>x===a&&y===b||x===b&&y===a))extra.push([a,b,d(a,b)]);extra.sort((x,y)=>x[2]-y[2]);for(const [a,b] of extra.slice(0,2))edges.push([a,b]);
 const degree=nodes.map((_,i)=>edges.filter(e=>e.includes(i)).length);
 // 역할: 막다른 공터(길이 하나)는 보물, 나머지에 습격지·제단·야영지·폐허.
 const free=nodes.map((n,i)=>i).filter(i=>i>1);free.sort((a,b)=>degree[a]-degree[b]||nodes[a].x-nodes[b].x);
 for(const i of free){const n=nodes[i];if(!n.role&&degree[i]===1&&!nodes.some(m=>m.role==='hoard'))n.role='hoard';}
 const pickRole=role=>{const i=free.find(i=>!nodes[i].role&&nodes[i].r>=4.6)??free.find(i=>!nodes[i].role);if(i!==undefined){nodes[i].role=role;if(role==='raid')nodes[i].r=Math.max(nodes[i].r,5.8);}};
 pickRole('raid');pickRole('altar');
 for(const i of free)if(!nodes[i].role)nodes[i].role=r()<.62?'camp':'ruin';
 // 제단: 적은 제단과 이어진 공터 중 하나(문)에서 길을 따라 온다.
 const altarIndex=nodes.findIndex(n=>n.role==='altar'),altar=nodes[altarIndex],portalEdge=edges.find(e=>e.includes(altarIndex)),portalNode=nodes[portalEdge[0]===altarIndex?portalEdge[1]:portalEdge[0]];
 const raid=nodes.find(n=>n.role==='raid');
 const events=[{type:'raid',x:raid.x,y:raid.y,r:3.4,state:'idle',time:0,duration:32+act*4,spawnAt:0},{type:'guard',x:altar.x,y:altar.y,portal:{x:portalNode.x,y:portalNode.y},hp:100,maxHp:100,state:'idle',wave:0,spawned:0,next:0,waves:3,perWave:4+act}];
 const paths=edges.map(([a,b])=>({ax:nodes[a].x,ay:nodes[a].y,bx:nodes[b].x,by:nodes[b].y}));
 // 공터 안의 엄폐물(바위·나무)은 가운데를 비우고 가장자리에만.
 const obstacles=[];for(const n of nodes){if(n.role==='start'||n.role==='raid')continue;const k=n.role==='gate'?1:2+Math.floor(r()*2);for(let t=0;t<k*6&&obstacles.filter(o=>o.node===n).length<k;t++){const a=r()*Math.PI*2,dd=n.r*(.55+r()*.3),x=n.x+Math.cos(a)*dd,y=n.y+Math.sin(a)*dd,rad=.8+r()*.6;if(paths.some(q=>segD(x,y,q)<REGION.path+rad+.4))continue;if(Math.hypot(x-(gateNode.x+1.8),y-gateNode.y)<rad+2.6)continue;if(obstacles.some(o=>Math.hypot(o.x-x,o.y-y)<o.r+rad+1.4))continue;obstacles.push({x,y,r:rad,cell:Math.floor(r()*4),node:n});}}
 for(const o of obstacles)delete o.node;
 const decor=[];for(let i=0;i<70;i++){const n=nodes[Math.floor(r()*nodes.length)],a=r()*Math.PI*2,dd=r()*n.r,x=n.x+Math.cos(a)*dd,y=n.y+Math.sin(a)*dd;decor.push({x,y,cell:Math.floor(r()*12),size:.6+r()*.5});}
 // 숲 가장자리 나무(그림만, 충돌은 걸을 수 있는 땅 밖으로 못 나가는 규칙이 맡는다).
 const trees=[];for(let gx=1;gx<W;gx+=2.4)for(let gy=1.5;gy<H;gy+=2.2){const x=gx+(r()-.5)*1.2,y=gy+(r()-.5)*1.2,edge=walkDist({nodes,paths},x,y);if(edge>.3&&edge<3.2)trees.push({x,y,cell:Math.floor(r()*4),size:1.8+r()*1.3});}
 s.region={w:W,h:H,start,gate:{x:gateNode.x+1.8,y:gateNode.y,open:false,r:1.6},nodes:nodes.map(n=>({x:n.x,y:n.y,r:n.r,role:n.role})),paths,obstacles,decor,trees,events,explored:new Array(Math.ceil(W/REGION.cell)*Math.ceil(H/REGION.cell)).fill(false),message:''};
 p.x=start.x;p.y=start.y;
 const roles=['melee','melee','ranged','tank','fast'];let pack=0;
 const placePack=(cx,cy,count,guard=false)=>{pack++;for(let i=0;i<count&&s.enemies.length<ADVENTURE.maxEnemies;i++){const a=i/count*Math.PI*2+r(),dd=.9+r()*1.4;spawnEnemy(s,guard&&i===0?'tank':roles[Math.floor(r()*roles.length)],cx+Math.cos(a)*dd,cy+Math.sin(a)*dd,{dormant:true,pack,guard});}};
 for(const n of nodes){if(n.role==='camp')placePack(n.x,n.y,3+Math.floor(r()*2)+(info.local>0?1:0)+(s.elite?1:0));if(n.role==='ruin'&&r()<.5)placePack(n.x+1.5,n.y,2+(info.local>0?1:0));if(n.role==='hoard')placePack(n.x-1.5,n.y,3+act);}
 placePack(gateNode.x-1.5,gateNode.y,5+act+(s.elite?2:0),true);
 // 항아리·상자: 폐허와 길가, 막다른 보물 공터에는 작은 보물 상자 둘.
 s.props.length=0;const putProp=(x,y,kind)=>s.props.push({id:++s.serial,kind,x,y,hp:kind==='pot'?1:2,maxHp:kind==='pot'?1:2,flash:0});
 for(const n of nodes){const k=n.role==='ruin'?4:n.role==='hoard'?2:n.role==='camp'?1:0;for(let i=0;i<k;i++){const a=r()*Math.PI*2,dd=n.r*(.3+r()*.5);putProp(n.x+Math.cos(a)*dd,n.y+Math.sin(a)*dd,n.role==='hoard'?'cache':r()<.35?'crate':'pot');}}
 if(!s.props.some(o=>o.kind==='cache')){const n=nodes.find(n=>n.role==='ruin')||gateNode;putProp(n.x,n.y+1.5,'cache');}
 for(const q of paths)if(r()<.5){const t=.3+r()*.4;putProp(q.ax+(q.bx-q.ax)*t,q.ay+(q.by-q.ay)*t,'pot');}
 s.message=info.name+' · 길을 따라 공터를 돌며 출구를 지키는 무리를 찾으세요';
}
const segD=(x,y,q)=>{const dx=q.bx-q.ax,dy=q.by-q.ay,t=clamp(((x-q.ax)*dx+(y-q.ay)*dy)/((dx*dx+dy*dy)||1),0,1);return Math.hypot(x-q.ax-dx*t,y-q.ay-dy*t);};
// 걸을 수 있는 땅(공터·길)까지의 거리(안쪽이면 0 이하).
function walkDist(R,x,y){let best=Infinity;for(const n of R.nodes)best=Math.min(best,Math.hypot(x-n.x,y-n.y)-n.r);for(const q of R.paths)best=Math.min(best,segD(x,y,q)-REGION.path);return best;}
export function adventureWalkable(s,x,y,pad=0){return !s.region||walkDist(s.region,x,y)<=-pad;}
// 숲에 들어가면 가장 가까운 공터·길 가장자리로 되돌린다.
function keepOnGround(s,o,pad=.3){
 const R=s.region;if(!R||walkDist(R,o.x,o.y)<=-pad)return false;let best=null,bestD=Infinity;
 for(const n of R.nodes){const dx=o.x-n.x,dy=o.y-n.y,dd=Math.hypot(dx,dy)||1,rr=n.r-pad,x=n.x+dx/dd*Math.min(dd,rr),y=n.y+dy/dd*Math.min(dd,rr),g=Math.hypot(o.x-x,o.y-y);if(g<bestD){bestD=g;best={x,y};}}
 for(const q of R.paths){const dx=q.bx-q.ax,dy=q.by-q.ay,t=clamp(((o.x-q.ax)*dx+(o.y-q.ay)*dy)/((dx*dx+dy*dy)||1),0,1),cx=q.ax+dx*t,cy=q.ay+dy*t,ox=o.x-cx,oy=o.y-cy,dd=Math.hypot(ox,oy)||1,rr=REGION.path-pad,x=cx+ox/dd*Math.min(dd,rr),y=cy+oy/dd*Math.min(dd,rr),g=Math.hypot(o.x-x,o.y-y);if(g<bestD){bestD=g;best={x,y};}}
 if(best){o.x=best.x;o.y=best.y;}return true;
}
// 길찾기: 1칸 격자에서 목표까지의 거리 지도(흐름장)를 만들어 두고, 먼 목표로 갈 때 다음 칸 방향을 준다.
// 목표 칸마다 한 번만 계산하고 몇 개만 기억한다(적 여럿·봇이 같은 목표를 쓴다).
function flowField(s,tx,ty){
 const R=s.region,cols=Math.ceil(R.w),rows=Math.ceil(R.h),key=Math.floor(tx)+','+Math.floor(ty);R.flows??=new Map();if(R.flows.has(key))return R.flows.get(key);
 if(!R.walk){R.walk=new Uint8Array(cols*rows);for(let y=0;y<rows;y++)for(let x=0;x<cols;x++)R.walk[y*cols+x]=walkDist(R,x+.5,y+.5)<=-.5&&!R.obstacles.some(o=>Math.hypot(x+.5-o.x,y+.5-o.y)<o.r+.55)?1:0;}
 const distMap=new Int32Array(cols*rows).fill(-1),queue=new Int32Array(cols*rows);let start=Math.floor(clamp(ty,0,rows-1))*cols+Math.floor(clamp(tx,0,cols-1));
 if(!R.walk[start]){let best=-1,bd=Infinity;for(let i=0;i<R.walk.length;i++)if(R.walk[i]){const dd=Math.hypot(i%cols+.5-tx,Math.floor(i/cols)+.5-ty);if(dd<bd){bd=dd;best=i;}}start=best;}
 let head=0,tail=0;distMap[start]=0;queue[tail++]=start;
 while(head<tail){const c=queue[head++],cx=c%cols,cy=(c-cx)/cols;for(const [dx,dy] of [[1,0],[-1,0],[0,1],[0,-1]]){const nx=cx+dx,ny=cy+dy;if(nx<0||ny<0||nx>=cols||ny>=rows)continue;const n=ny*cols+nx;if(R.walk[n]&&distMap[n]<0){distMap[n]=distMap[c]+1;queue[tail++]=n;}}}
 const flow={cols,rows,dist:distMap};if(R.flows.size>10)R.flows.delete(R.flows.keys().next().value);R.flows.set(key,flow);return flow;
}
export function adventureRoute(s,from,to){
 const R=s.region;if(!R)return to;const f=flowField(s,to.x,to.y),{cols,rows,dist:dm}=f,cx=Math.floor(clamp(from.x,0,cols-1)),cy=Math.floor(clamp(from.y,0,rows-1));
 let best=null,bd=dm[cy*cols+cx]>=0?dm[cy*cols+cx]:Infinity;
 // 가장자리에 붙어 있어 옆 칸이 모두 막혔으면 조금 더 넓게(3칸까지) 찾는다.
 for(let ring=1;ring<=3&&!best;ring++)for(let dy=-ring;dy<=ring;dy++)for(let dx=-ring;dx<=ring;dx++){if(Math.max(Math.abs(dx),Math.abs(dy))!==ring)continue;const nx=cx+dx,ny=cy+dy;if(nx<0||ny<0||nx>=cols||ny>=rows)continue;const v=dm[ny*cols+nx],cost=v+Math.hypot(dx,dy)*.4;if(v>=0&&cost<bd){bd=cost;best={x:nx+.5,y:ny+.5};}}
 return best||to;
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
   if(ev.spawnAt<=0){ev.spawnAt=2.3;const n=2+(info.act>0?1:0);for(let i=0;i<n&&s.enemies.length<ADVENTURE.maxEnemies;i++){const a=random(s)*Math.PI*2;const node=R.nodes.find(n=>n.role==='raid')||{r:6},rr=Math.max(4,node.r-.6);spawnEnemy(s,random(s)<.25?'ranged':random(s)<.5?'fast':'melee',ev.x+Math.cos(a)*rr,ev.y+Math.sin(a)*rr,{raid:true});}}
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
 austin:Object.freeze({name:'오스틴',hp:3500,patterns:Object.freeze(['charge','slam','punches','triple']),combo:{slam:'punches'}}),
 alwaysbeginner:Object.freeze({name:'항상초심',hp:5600,patterns:Object.freeze(['pitch','swing','curve','rain','swing']),combo:{swing:'pitch',curve:'swing'}}),
 tempestcarrier:Object.freeze({name:'요한',hp:14000,patterns:Object.freeze(['strikes','beam','spiral','chase','slam']),combo:{beam:'strikes',chase:'spiral'}})
});
function spawnBoss(s,info){const b=ADVENTURE_BOSSES[info.actInfo.boss],hp=b.hp*(1+(s.level-1)*.04);s.enemies.push({id:++s.serial,type:'boss',role:'boss',bossId:info.actInfo.boss,art:info.actInfo.boss,act:info.act,x:12,y:6,hp,maxHp:hp,r:1.1,speed:1.5+info.act*.18,cd:1.2,tell:0,tellKind:'',tx:0,ty:0,marks:[],slow:0,frost:0,flash:0,pattern:0,kx:0,ky:0,stun:0,power:1+info.act*.25,charging:0,cx:0,cy:0});}

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
 fx(s,'slash',c.x,c.y,{angle:c.angle,radius:c.radius,returning:Boolean(c.returning),narrow:c.cos>.5,motion:c.motion||'',ring:c.cos<=-1,finisher:Boolean(c.meta?.finisher),life:c.meta?.finisher?.32:.25,max:c.meta?.finisher?.32:.25});
 const inArc=o=>{const a=Math.atan2(o.y-c.y,o.x-c.x)-c.angle;return Math.hypot(o.x-c.x,o.y-c.y)<c.radius+(o.r||.45)&&Math.cos(a)>c.cos;};
 for(const e of s.enemies){if(e.hp>0&&!seen.has(e.id)&&inArc(e)){seen.add(e.id);hit(s,e,c.damage,false,{...c.meta,critical:c.critical??c.meta?.critical,angle:Math.atan2(e.y-c.y,e.x-c.x)});}}
 for(const prop of s.props)if(prop.hp>0&&!seen.has(prop.id)&&inArc(prop)){seen.add(prop.id);hitProp(s,prop);}
}
// 본편 조합 엔진(seed-adventure-combat.js)이 주는 피해. 법칙 효과·밀치기 없이 피해만, 콤보 수에는 들어간다.
export function adventureFormHit(s,e,damage,{criticalEligible=false}={}){if(!e||e.hp<=0||!Number.isFinite(damage)||damage<=0)return false;hit(s,e,damage*titleCriticalMultiplier(s,criticalEligible,()=>random(s)),true,null,true);return true;}
function hit(s,e,damage,secondary=false,meta=null,formHit=false,alreadyTitled=false){
 if(e.hp<=0)return;if(e.dormant)wakePack(s,e);damage*=formHit?1:power(s);if(!alreadyTitled)damage*=titleCombatBonuses(s).power;if(!formHit&&meta?.critical&&titleCombatBonuses(s).critical>0)damage*=TITLE_CRIT_DAMAGE;
 // 방패 적: 정면에서 온 공격은 35%만(막타·뒤·옆은 그대로). 돌아서 치거나 막타로 깨라는 뜻.
 if(e.role==='tank'&&!meta?.finisher){const fx0=s.player.x-e.x,fy0=s.player.y-e.y,fl=Math.hypot(fx0,fy0)||1,face=e.facing||{x:fx0/fl,y:fy0/fl};if((fx0*face.x+fy0*face.y)/fl>.5){damage*=.35;if(!secondary)fx(s,'block',e.x,e.y,{life:.2,max:.2});}}e.hp-=damage;e.flash=.13;const heavy=Boolean(meta?.finisher);
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
  // 2026-09-28 사용자: "공전·폭발을 골랐더니 공전은 그대로 살아 있고 도는 게 또 생겼다 · 융합해야 생기는 것 아닌가"
  // 두 법칙이 융합하면(형태가 생기면) 법칙 하나하나의 덧붙임 효과는 끄고, 그 조합의 공격(본편 엔진)과 휘두르기 모양만 남긴다.
  if(!s.formId){
  const k=id=>1+(rank(s,id)-1)*.3;
  if(s.laws.includes('frost')){e.slow=1.8;e.frost++;if(e.frost>=5){e.frost=0;e.hp-=32*k('frost')*titleCombatBonuses(s).power;fx(s,'frost',e.x,e.y,{radius:1.4});}}
  if(s.laws.includes('burst')){fx(s,'burst',e.x,e.y,{radius:1.5});for(const n of s.enemies)if(n!==e&&n.hp>0&&dist(n,e)<1.5)hit(s,n,damage*.4*k('burst'),true,null,false,true);}
  if(s.laws.includes('chain')){let prev=e;const seen=new Set([e.id]);for(let i=0;i<1+rank(s,'chain');i++){const n=s.enemies.filter(n=>n.hp>0&&!seen.has(n.id)&&dist(n,prev)<3.7).sort((a,b)=>dist(a,prev)-dist(b,prev))[0];if(!n)break;fx(s,'chain',prev.x,prev.y,{tx:n.x,ty:n.y});hit(s,n,damage*.5,true,null,false,true);seen.add(n.id);prev=n;}}
  if(s.laws.includes('gravity')&&s.fields.length<6)s.fields.push({x:e.x,y:e.y,life:.65+rank(s,'gravity')*.15,r:2.5,collapse:rank(s,'gravity')>=3});
  }
 }
 if(e.hp<=0){s.kills++;s.charge=clamp(s.charge+4,0,100);fx(s,'leaf',e.x,e.y,{life:.6,max:.6});
  if(e.type==='boss'){s.bossesDefeated++;s.hitstop=Math.max(s.hitstop,.15);s.shake=.45;event(s,'bossDefeat');dropCoins(s,e.x,e.y,30+e.act*10);drop(s,'potion',e.x,e.y);}
  else if(!e.noDrop&&!e.raid&&(random(s)<.6||s.elite))dropCoins(s,e.x,e.y,(e.role==='tank'?2:1)+(e.act||0)+(s.elite?2:0));}
}
// 적의 공격이 나가는 순간. 근접: 가끔 곧바로 한 번 더(연속 공격). 돌격: 예고한 줄을 따라 돌진해 꿰뚫고 지나감.
// 원거리: 움직이는 쪽을 앞질러 쏘거나 세 발 부채꼴. 방패: 둘레를 내려찍는 충격파.
function enemyStrike(s,e,p){
 const dmg=n=>Math.round(n*e.power),A=s.arena;
 if(e.role==='ranged'){const v=direction(e.tx-e.x,e.ty-e.y),n=e.volley?3:1;for(let i=0;i<n;i++){const a=Math.atan2(v.y,v.x)+(i-(n-1)/2)*.22;shot(s,e.x,e.y,Math.cos(a),Math.sin(a),{hostile:true,damage:dmg(e.volley?15:21),speed:e.volley?6.8:8.4,life:3.5});}e.cd=1.25;return;}
 if(e.role==='fast'){e.dashing=.32;e.dashHit=false;fx(s,'dash',e.x,e.y,{life:.3,max:.3});e.cd=1.6;return;}
 if(e.role==='tank'){fx(s,'enemyRing',e.x,e.y,{radius:2.1});if(dist(e,p)<2.1)hurt(s,dmg(26));s.shake=Math.max(s.shake,.12);e.cd=1.7;return;}
 fx(s,'enemyRing',e.tx,e.ty,{radius:1});if(Math.hypot(p.x-e.tx,p.y-e.ty)<1)hurt(s,dmg(20));
 if(!e.combo&&random(s)<.45){e.combo=true;e.cd=0;}else{e.combo=false;e.cd=1.15;}
}
function hurt(s,n){const p=s.player;if(p.inv>0||s.phase!=='playing')return;if(s.buffs.guard>0){s.buffs.guard=0;p.inv=.5;fx(s,'buff',p.x,p.y,{buff:'guard',radius:1.2,life:.5,max:.5});event(s,'reflect');return;}p.hp=Math.max(0,p.hp-n);p.inv=.7;s.shake=Math.max(s.shake,.2);event(s,'hurt');fx(s,'hurt',p.x,p.y,{radius:1});if(p.hp<=0){s.phase='lost';s.message='회피로 붉은 예고를 벗어나 보세요';}}
export function attackAdventure(s){
 if(s.phase!=='playing'||s.player.attack>0)return false;
 const p=s.player,dashStrike=p.dashStrike>0,step=dashStrike?2:p.combo,c=ADVENTURE_COMBO[step],plan=composeAdventureAttack({weapon:s.weapon,laws:s.laws,form:null,level:s.level}),angle=Math.atan2(p.aimY,p.aimX),seen=new Set();
 const meta={critical:titleCriticalMultiplier(s,s.formId?titleFormCriticalEligible(s.formId):s.laws.includes('pierce'),()=>random(s))>1,knock:c.knock,stop:c.stop,stun:c.stun,finisher:Boolean(c.finisher),damage:c.damage*(dashStrike?1.15:1)};
 p.attack=plan.cooldown*c.cooldown;p.swing=step;p.comboTime=p.attack+COMBO_WINDOW;p.combo=c.finisher?0:step+1;p.dashStrike=0;
 if(p.dashing<=0){p.lx=Math.cos(angle)*c.lunge*12;p.ly=Math.sin(angle)*c.lunge*12;}
 event(s,dashStrike?'dashStrike':'combo'+(step+1));event(s,s.weapon==='throw'?'shot':'shotReturn');
 const mo=MOTIONS[s.laws[0]]||MOTIONS.none;meta.damage*=mo.damage;p.attack*=mo.cooldown/titleCombatBonuses(s).cadence;
 if(mo.pull)for(const e of s.enemies){if(e.hp<=0||e.type==='boss'||e.dormant)continue;const d=dist(e,p),a=Math.atan2(e.y-p.y,e.x-p.x)-angle;if(d<3.8&&d>1&&Math.cos(a)>.2){const v=direction(p.x-e.x,p.y-e.y);e.x+=v.x*Math.min(1.3,d-.9);e.y+=v.y*Math.min(1.3,d-.9);}}
 if(mo.lunge&&p.dashing<=0){p.lx*=mo.lunge;p.ly*=mo.lunge;}
 for(const cc of plan.cuts){const arc=mo.arc===null?cc.cos-c.arc:Math.min(cc.cos-c.arc,mo.arc);cut(s,{...cc,damage:cc.damage*meta.damage,radius:cc.radius*c.radius*mo.radius,cos:arc,x:p.x,y:p.y,angle:angle+cc.offset,meta,motion:mo.id},seen);}
 if(mo.fan&&plan.cuts.length)for(const off of [-.62,.62])cut(s,{...plan.cuts[0],damage:plan.cuts[0].damage*meta.damage*.55,radius:plan.cuts[0].radius*c.radius*.9,cos:.72,x:p.x,y:p.y,angle:angle+off,meta:{...meta,stop:0},motion:mo.id},seen);
 const returnHits=new Set();
 for(const cc of plan.returnCuts)if(s.pendingCuts.length<12)s.pendingCuts.push({...cc,damage:cc.damage*meta.damage,x:p.x,y:p.y,angle:angle+cc.offset,returning:true,critical:meta.critical,seen:returnHits});
 const shots=c.finisher&&plan.shots.length?[...plan.shots,...[-.2,.2].map(o=>({...plan.shots[0],offset:plan.shots[0].offset+o}))]:plan.shots;
 for(const b of shots)shot(s,p.x,p.y,Math.cos(angle+b.offset),Math.sin(angle+b.offset),{...b,damage:b.damage*meta.damage,remaining:b.remaining+(c.finisher?1:0),heavy:Boolean(c.finisher)});
 if(s.laws.includes('orbit')&&!s.formId){s.orbitUntil=s.time+plan.orbitDuration;s.orbitRadius=plan.orbitRadius;}
 lawMotion(s,step,angle,meta);
 return true;
}
export function dodgeAdventure(s,x=0,y=0){const p=s.player;if(s.phase!=='playing'||p.dash>0)return false;const d=direction(x||y?x:p.aimX,x||y?y:p.aimY);p.dx=d.x;p.dy=d.y;p.dashing=.2;p.inv=.28;p.dash=(s.buffs.swift>0?.62:.9)/titleCombatBonuses(s).cadence;p.dashStrike=DASH_STRIKE;p.attack=Math.min(p.attack,.05);p.lx=p.ly=0;fx(s,'dash',p.x,p.y,{life:.35,max:.35});event(s,'dash');return true;}
// 법칙마다 휘두르는 방식(첫 법칙)과 막타 특수 효과(둘째 법칙, 없으면 첫 법칙).
export const MOTIONS=Object.freeze({
 none:{id:'none',name:'잎 칼 베기',radius:1,arc:null,damage:1,cooldown:1},
 pierce:{id:'pierce',name:'찌르며 돌진',radius:1.35,arc:.9,damage:1.05,cooldown:.95,lunge:2.2},
 orbit:{id:'orbit',name:'회전 베기',radius:.95,arc:-1.1,damage:.9,cooldown:1.05},
 burst:{id:'burst',name:'내려찍기',radius:1,arc:null,damage:1.2,cooldown:1.12},
 split:{id:'split',name:'부채꼴 연속 베기',radius:1,arc:null,damage:.9,cooldown:.9,fan:true},
 recall:{id:'recall',name:'칼날 던졌다 받기',radius:1,arc:null,damage:1,cooldown:1},
 chain:{id:'chain',name:'번개 베기',radius:1.05,arc:null,damage:1,cooldown:.92},
 gravity:{id:'gravity',name:'끌어와 베기',radius:1,arc:null,damage:1,cooldown:1.05,pull:true},
 frost:{id:'frost',name:'넓은 냉기 베기',radius:1.12,arc:-.3,damage:.95,cooldown:1},
 reflect:{id:'reflect',name:'튕기는 참격',radius:1,arc:null,damage:1,cooldown:1}
});
export const FINISHERS=Object.freeze({pierce:'꿰뚫는 창',orbit:'두 바퀴 회전',burst:'폭발 내려찍기',split:'꽃잎 부채',recall:'돌아오는 칼날',chain:'낙뢰 셋',gravity:'중력 우물',frost:'서리 파동',reflect:'튕기는 수정'});
function lawMotion(s,step,angle,meta){
 if(!meta.finisher)return;const law=s.laws[1]||s.laws[0];if(!law)return;const p=s.player,dmg=(22+s.level*3)*(1+(rank(s,law)-1)*.25),fx0=p.x+Math.cos(angle)*1.6,fy0=p.y+Math.sin(angle)*1.6;
 const inR=(x,y,r)=>s.enemies.filter(e=>e.hp>0&&Math.hypot(e.x-x,e.y-y)<r+e.r);
 if(law==='burst'){fx(s,'burst',fx0,fy0,{radius:2.4});for(const e of inR(fx0,fy0,2.4))hit(s,e,dmg,true);s.shake=Math.max(s.shake,.3);}
 else if(law==='orbit'){s.pendingCuts.push({x:p.x,y:p.y,angle,radius:2.6,cos:-1,damage:dmg*.8,offset:0,delay:.16,returning:true,seen:new Set()});}
 else if(law==='pierce'){shot(s,p.x,p.y,Math.cos(angle),Math.sin(angle),{damage:dmg,speed:17,life:.7,remaining:6,shape:'lance'});}
 else if(law==='split'){for(let i=-2;i<=2;i++){const a=angle+i*.28;shot(s,p.x,p.y,Math.cos(a),Math.sin(a),{damage:dmg*.45,speed:13,life:.55,remaining:1});}}
 else if(law==='recall'){shot(s,p.x,p.y,Math.cos(angle),Math.sin(angle),{damage:dmg*.7,speed:12,life:1.2,remaining:4,recall:true,blade:true,shape:'returnblade'});}
 else if(law==='chain'){const near=s.enemies.filter(e=>e.hp>0&&!e.dormant&&dist(e,p)<7).sort((a,b)=>dist(a,p)-dist(b,p)).slice(0,3);for(const e of near){fx(s,'bolt',e.x,e.y,{radius:1,life:.35,max:.35});hit(s,e,dmg*.8,true);}}
 else if(law==='gravity'){if(s.fields.length<6)s.fields.push({x:fx0,y:fy0,life:1.1,r:3,collapse:true});}
 else if(law==='frost'){fx(s,'frost',p.x,p.y,{radius:3.2});for(const e of inR(p.x,p.y,3.2)){e.slow=2.2;hit(s,e,dmg*.6,true);}}
 else if(law==='reflect'){shot(s,p.x,p.y,Math.cos(angle),Math.sin(angle),{damage:dmg*.7,speed:14,life:1.4,remaining:3,bounces:-2});}
}
// 궁극기: 씨앗 둘레 폭발 + 진화한 형태가 있으면 본편 궁극기(엔진의 surge)도 함께.
export function ultimateAdventure(s,combat=null){if(s.phase!=='playing'||s.charge<100)return false;s.charge=0;s.player.inv=1;event(s,'ultimate');fx(s,'ultimate',s.player.x,s.player.y,{radius:7,life:.9,max:.9});s.hitstop=.08;s.shake=.35;for(const e of s.enemies)if(dist(e,s.player)<7)hit(s,e,95+s.level*12,false,{knock:2.5,stun:.6,angle:Math.atan2(e.y-s.player.y,e.x-s.player.x)});for(const prop of s.props)if(prop.hp>0&&dist(prop,s.player)<7)breakProp(s,prop);s.shots=s.shots.filter(b=>!b.hostile);s.charge=0;combat?.surge?.();return true;}

function bossAct(s,e,p,dt){
 const b=ADVENTURE_BOSSES[e.bossId],enraged=e.hp<e.maxHp*.5;
 if(enraged&&!s.summoned){s.summoned=true;event(s,'bossWarning');for(const [x,y] of [[4,8],[20,8]])spawnEnemy(s,e.bossId==='tempestcarrier'?'fast':'melee',x,y);}
 if(e.beam){const bm=e.beam;bm.t-=dt;const a=bm.a+bm.sweep*(1-bm.t/bm.max),rel=Math.atan2(p.y-e.y,p.x-e.x)-a,d=dist(p,e);if(!bm.hit&&d<9&&Math.abs(Math.sin(rel))*d<.6&&Math.cos(rel)>0){bm.hit=true;hurt(s,Math.round(30*e.power));}bm.angle=a;if(bm.t<=0)e.beam=null;else return true;}
 if(e.charging>0){e.charging-=dt;e.x=clamp(e.x+e.cx*13*dt,2,22);e.y=clamp(e.y+e.cy*13*dt,2.5,14);if(dist(e,p)<1.4)hurt(s,Math.round(24*e.power));if(e.charging<=0)fx(s,'enemyRing',e.x,e.y,{radius:1.4});return true;}
 if(e.tell>0){e.tell-=dt;if(e.tell>0)return true;
  const kind=e.tellKind,dmg=n=>Math.round(n*e.power);event(s,'bossAttack');
  if(kind==='charge'||kind==='triple'){e.charging=.5;const v=direction(e.tx-e.x,e.ty-e.y);e.cx=v.x;e.cy=v.y;if(kind==='triple'&&--e.charges>0){e.nextKind='triple';}}
  else if(kind==='curve'){const base=Math.atan2(p.y-e.y,p.x-e.x);for(let i=0;i<(enraged?4:3);i++){const a=base+(i-1)*.7;shot(s,e.x,e.y,Math.cos(a),Math.sin(a),{hostile:true,boss:true,art:'ball',damage:dmg(13),speed:6.2,life:3.2,homing:1.4});}}
  else if(kind==='beam'){e.beam={a:Math.atan2(p.y-e.y,p.x-e.x)-1.3,sweep:2.6,t:1.3,max:1.3,hit:false};}
  else if(kind==='chase'){fx(s,'bolt',e.tx,e.ty,{radius:1.3,life:.35,max:.35});if(Math.hypot(p.x-e.tx,p.y-e.ty)<1.3)hurt(s,dmg(20));if(--e.chases>0)e.nextKind='chase';}
  else if(kind==='slam'){fx(s,'enemyRing',e.tx,e.ty,{radius:2.1});if(Math.hypot(p.x-e.tx,p.y-e.ty)<2.1)hurt(s,dmg(30));e.x=e.tx;e.y=e.ty;s.shake=Math.max(s.shake,.3);}
  else if(kind==='punches'||kind==='pitch'){const base=Math.atan2(p.y-e.y,p.x-e.x),n=kind==='pitch'?3:5,spread=kind==='pitch'?.16:.28;for(let i=0;i<n;i++){const a=base+(i-(n-1)/2)*spread;shot(s,e.x,e.y,Math.cos(a),Math.sin(a),{hostile:true,boss:true,art:kind==='pitch'?'ball':'glove',damage:dmg(kind==='pitch'?20:18),speed:kind==='pitch'?8.5:5.8,life:4});}}
  else if(kind==='swing'){const a=Math.atan2(e.ty-e.y,e.tx-e.x);fx(s,'enemyArc',e.x,e.y,{angle:a,radius:3.4,life:.3,max:.3});const pa=Math.atan2(p.y-e.y,p.x-e.x)-a;if(dist(p,e)<3.4+.3&&Math.cos(pa)>.35)hurt(s,dmg(32));}
  else if(kind==='rain'||kind==='spiral'){const rings=kind==='spiral'?2:1;for(let r=0;r<rings;r++)for(let i=0;i<12;i++){const a=i/12*Math.PI*2+r*.26;shot(s,e.x,e.y,Math.cos(a),Math.sin(a),{hostile:true,boss:true,art:e.bossId==='alwaysbeginner'?'ball':'',damage:dmg(19),speed:4.2-r*.9,life:4.5});}fx(s,'enemyRing',e.x,e.y,{radius:3});if(dist(p,e)<3)hurt(s,dmg(25));}
  else if(kind==='strikes'){for(const m of e.marks){fx(s,'bolt',m.x,m.y,{radius:m.r,life:.35,max:.35});if(Math.hypot(p.x-m.x,p.y-m.y)<m.r)hurt(s,dmg(25));}s.shake=Math.max(s.shake,.25);}
  const follow=e.nextKind||(b.combo&&b.combo[kind]);e.nextKind='';e.cd=follow?.08:(enraged?.72:1.0);e.queued=follow||'';e.tellKind='';e.marks=[];return true;
 }
 const range=5;if(dist(e,p)>range){const v=direction(p.x-e.x,p.y-e.y);e.x+=v.x*e.speed*(e.slow>0?.5:1)*dt;e.y+=v.y*e.speed*(e.slow>0?.5:1)*dt;}
 if(e.cd<=0){
  const kind=e.queued||b.patterns[e.pattern%b.patterns.length];if(!e.queued)e.pattern++;e.queued='';e.tellKind=kind;e.tx=p.x;e.ty=p.y;e.marks=[];
  const speed=enraged?.85:1;
  e.tell={charge:.72,slam:.85,punches:.62,pitch:.52,swing:.62,rain:.85,spiral:.9,strikes:.95,triple:.62,curve:.7,beam:.9,chase:.5}[kind]*speed;if(kind==='triple')e.charges=enraged?3:2;if(kind==='chase')e.chases=enraged?7:5;
  if(kind==='strikes'){e.marks.push({x:p.x,y:p.y,r:1.4});for(let i=0;i<(enraged?4:3);i++)e.marks.push({x:clamp(p.x+(random(s)-.5)*9,2,22),y:clamp(p.y+(random(s)-.5)*6,2.5,14),r:1.4});}
 }
 return false;
}
export function stepAdventure(s,dt,input={},combat=null){
 refreshAdventureTitleHp(s);if(s.phase!=='playing'||!Number.isFinite(dt)||dt<=0)return;dt=clamp(dt,0,.05);const p=s.player,A=s.arena;
 s.shake=Math.max(0,s.shake-dt*2.2);
 if(input.attack&&p.attack>0)p.buffer=BUFFER;
 // 타격 멈춤: 짧게 세상이 멈춘다. 입력은 기억해 두었다가 멈춤이 끝나면 이어진다.
 if(s.hitstop>0){s.hitstop=Math.max(0,s.hitstop-dt);return;}
 s.time+=dt;for(const k of ['attack','dash','inv','dashing','comboTime','buffer','dashStrike'])p[k]=Math.max(0,p[k]-dt);
 for(const k of ['power','swift'])s.buffs[k]=Math.max(0,s.buffs[k]-dt);
 if(p.comboTime<=0)p.combo=0;if(p.attack<=0)p.swing=-1;
 s.hitsTime=Math.max(0,s.hitsTime-dt);if(s.hitsTime<=0)s.hits=0;
 if(Number.isFinite(input.aimX)&&Math.hypot(input.aimX,input.aimY)>.05){const d=direction(input.aimX,input.aimY);p.aimX=d.x;p.aimY=d.y;}
 const d=direction(input.x||0,input.y||0),moving=Boolean(input.x||input.y),speed=(p.dashing>0?18:p.attack>.29?3.1:5.6)*(s.buffs.swift>0&&p.dashing<=0?1.3:1)*titleCombatBonuses(s).move;p.moving=moving;
 const lunge=Math.exp(-14*dt),px0=p.x,py0=p.y;p.x+=p.lx*dt;p.y+=p.ly*dt;p.lx*=lunge;p.ly*=lunge;
 p.x=clamp(p.x+(p.dashing>0?p.dx:moving?d.x:0)*speed*dt,A.minX,A.maxX);p.y=clamp(p.y+(p.dashing>0?p.dy:moving?d.y:0)*speed*dt,A.minY,A.maxY);
 blockCircle(s,p,.4);keepOnGround(s,p,.35);p.vx=(p.x-px0)/dt;p.vy=(p.y-py0)/dt;
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
  // 2026-09-28 사용자: "적 체력만 올려서는 안 된다 · 속도와 공격 패턴을 바꿔야" — 역할마다 다른 공격.
  if(e.dashing>0){e.dashing-=dt;const step=16*dt;e.x=clamp(e.x+e.dx*step,A.minX,A.maxX);e.y=clamp(e.y+e.dy*step,A.minY,A.maxY);if(!e.dashHit&&dist(e,p)<.8){e.dashHit=true;hurt(s,Math.round(20*e.power));}keepOnGround(s,e,e.r*.8);continue;}
  if(e.tell>0){e.tell-=dt;if(e.tell<=0)enemyStrike(s,e,p);continue;}
  if(e.stun>0)continue;
  if(e.role==='tank'){const want=direction(p.x-e.x,p.y-e.y),f=e.facing||want,t=Math.min(1,dt*1.6);e.facing=direction(f.x+(want.x-f.x)*t,f.y+(want.y-f.y)*t);}
  const d0=dist(e,p),range=e.role==='ranged'?7:e.role==='fast'?4.6:e.role==='tank'?1.7:1.35;
  if(e.role==='ranged'&&d0<3.2){const v=direction(e.x-p.x,e.y-p.y);e.x+=v.x*e.speed*dt;e.y+=v.y*e.speed*dt;}
  else if(d0>range){const way=s.region&&d0>6?adventureRoute(s,e,p):p,v=direction(way.x-e.x,way.y-e.y),side=e.role==='melee'?(e.id%2?1:-1)*.35:0;e.x+=(v.x-v.y*side)*e.speed*(e.slow>0?.5:1)*dt;e.y+=(v.y+v.x*side)*e.speed*(e.slow>0?.5:1)*dt;}
  else if(e.cd<=0){e.pattern++;e.tx=p.x;e.ty=p.y;const lead=.45;
   if(e.role==='ranged'){e.volley=e.pattern%2===0;e.tx=p.x+(p.lx||0)*0+((p.vx||0)*lead);e.ty=p.y+((p.vy||0)*lead);e.tell=.55;}
   else if(e.role==='fast'){e.tell=.42;const v=direction(p.x-e.x,p.y-e.y);e.dx=v.x;e.dy=v.y;}
   else if(e.role==='tank'){e.tell=.8;e.tx=e.x;e.ty=e.y;}
   else{e.tell=e.combo?.26:.48;}}
  blockCircle(s,e,e.r);keepOnGround(s,e,e.r*.8);
  // Keep a readable ring around the seed instead of stacking sprites.
  for(const n of s.enemies)if(n.id<e.id&&n.hp>0){const gap=dist(e,n),r=e.r+n.r;if(gap<r&&gap>.001){e.x+=(e.x-n.x)/gap*dt;e.y+=(e.y-n.y)/gap*dt;}}
 }
 combat?.update?.(dt);
 for(const b of s.shots){b.life-=dt;b.age+=dt;b.px=b.x;b.py=b.y;if(!b.hostile&&b.recall&&b.age>.48){if(!b.returning){b.returning=true;b.hit.clear();b.remaining=s.laws.includes('pierce')?3:1;b.spent=false;b.life=.9;}const v=direction(p.x-b.x,p.y-b.y);b.dx=v.x;b.dy=v.y;if(dist(b,p)<.45){b.life=0;continue;}}
 if(b.homing&&b.age<b.homing){const v=direction(p.x-b.x,p.y-b.y),t=Math.min(1,dt*2.2);const nd=direction(b.dx+(v.x-b.dx)*t,b.dy+(v.y-b.dy)*t);b.dx=nd.x;b.dy=nd.y;}
 b.x+=b.dx*b.speed*dt;b.y+=b.dy*b.speed*dt;const x0=A.minX-.1,x1=A.maxX+.1,y0=A.minY-.2,y1=A.maxY+.3;if(b.x<x0||b.x>x1||b.y<y0||b.y>y1){if(!b.hostile&&(s.laws.includes('reflect')||b.bounces<0)&&b.bounces<2){if(b.x<x0||b.x>x1)b.dx*=-1;else b.dy*=-1;b.bounces++;b.x=clamp(b.x,x0,x1);b.y=clamp(b.y,y0,y1);fx(s,'frost',b.x,b.y,{radius:.7});}else b.life=0;}
 if(insideObstacle(s,b.x,b.y)||s.region&&!adventureWalkable(s,b.x,b.y,-.8)){b.life=0;fx(s,'hit',b.x,b.y,{radius:.5,life:.2,max:.2});continue;}
 if(b.hostile){if(s.laws.includes('orbit')&&!b.boss&&dist(b,p)<1.6){b.life=0;fx(s,'frost',b.x,b.y,{radius:.5});}else if(dist(b,p)<.45){hurt(s,b.damage);b.life=0;}}
 else{for(const e of s.enemies){if(e.hp<=0||b.spent||b.hit.has(e.id))continue;const vx=b.x-b.px,vy=b.y-b.py,len=vx*vx+vy*vy,t=clamp(((e.x-b.px)*vx+(e.y-b.py)*vy)/(len||1),0,1);if(Math.hypot(e.x-b.px-vx*t,e.y-b.py-vy*t)<e.r+.22){b.hit.add(e.id);hit(s,e,b.damage,false,{critical:b.critical,knock:b.heavy?1.4:.35,stun:b.heavy?.3:.06,stop:b.heavy?.03:0,finisher:b.heavy,angle:Math.atan2(b.dy,b.dx)});if(--b.remaining<=0){if(b.recall&&!b.returning)b.spent=true;else b.life=0;break;}}}
  if(b.life>0&&!b.spent)for(const prop of s.props)if(prop.hp>0&&!b.hit.has(prop.id)&&dist(prop,b)<.7){b.hit.add(prop.id);hitProp(s,prop);if(--b.remaining<=0){b.life=0;break;}}}}
 s.shots=s.shots.filter(b=>b.life>0);if(s.laws.includes('orbit')&&!s.formId&&s.time<s.orbitUntil){for(const e of s.enemies)if(e.hp>0&&dist(e,p)<s.orbitRadius){e.orbitTick=(e.orbitTick||0)-dt;if(e.orbitTick<=0){e.orbitTick=.5;hit(s,e,9*(1+(rank(s,'orbit')-1)*.3),true);}}}
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
 if(s?.phase!=='doors'||!Array.isArray(s.doors)||!s.doors.length)return null;
 return {version:ADVENTURE_SAVE_VERSION,runId:s.runId,seed:s.seed,room:s.room,doors:s.doors.map(d=>({room:d.room,reward:d.reward??null})),actFlags:{...s.actFlags},
  shapes:[...s.shapes],weapon:s.weapon,laws:[...s.laws],ranks:{...s.ranks},formId:s.formId,level:s.level,coins:s.coins,potions:s.potions,charge:Math.floor(s.charge),
  ...checkpointAdventureTitleHp(s),kills:s.kills,time:Math.round(s.time*10)/10,bossesDefeated:s.bossesDefeated,earned:s.earned,credited:s.credited,savedAt:Date.now()};
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
  if(!validAdventureTitleHp(r.titleHp,r.maxHp,r.hp))return null;
  const bossRooms=ADVENTURE_ACTS.map((_,a)=>a*ROOMS_PER_ACT+ROOMS_PER_ACT-1).filter(i=>i<=r.room).length;if(r.bossesDefeated!==bossRooms)return null;
  const flags=r.actFlags&&typeof r.actFlags==='object'?r.actFlags:{};
  const s=createAdventure(r.seed);Object.assign(s,{runId:r.runId,seed:r.seed,room:r.room,phase:'doors',doors:r.doors.map(d=>({room:d.room,reward:d.reward})),actFlags:{act:int(flags.act,0,2)?flags.act:next.act,treasure:flags.treasure===true,shop:flags.shop===true,fountain:flags.fountain===true},
   shapes:[...r.shapes],weapon:r.weapon,laws:[...r.laws],ranks:{...r.ranks},formId:r.formId,level:r.level,coins:r.coins,potions:r.potions,charge:r.charge,kills:r.kills,time:r.time,bossesDefeated:r.bossesDefeated,earned:r.earned,credited:r.credited,message:'저장한 문 앞에서 이어가요'});
  s.player.hp=r.hp;s.player.maxHp=r.maxHp;restoreAdventureTitleHp(s,r.titleHp);return s;
 }catch{return null;}
}
// 계정에 쌓을 햇살(JP): 이번 판에 새로 번 만큼, 방 하나·판 하나 상한 안에서만. 같은 저장을 다시 불러와도 두 번 쌓이지 않는다.
export function adventureCredit(s){
 const due=Math.max(0,s.earned-s.credited),room=Math.min(due,ADVENTURE_JP.perRoomMax),left=Math.max(0,ADVENTURE_JP.perRunMax-s.credited);
 const jp=Math.min(room,left);s.credited=s.earned;return jp;
}
