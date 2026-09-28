// 씨앗 맞추기 — 그림과 무관한 3개 맞추기 규칙.
// 2026-09-28 사용자: "이런류의 가장 좋은 평점과 다운로드를 가진 게임을 참고해서" → 로열 매치(2026년 매출·다운로드 1위) 방식으로 다시 짰다.
// - 특수 씨앗은 법칙(색)이 아니라 맞춘 모양으로 정해지는 네 가지: 넷 한 줄 = 관통(한 줄) · 2×2 = 연쇄(목표로 날아감) · T/L = 폭발(넓게) · 다섯 한 줄 = 햇살(한 법칙 전부).
//   특수 씨앗은 색이 없어 맞춰지지 않고, 눌러서 바로 터뜨리거나(이동 1) 아무 이웃과 바꿔 터뜨린다. 특수끼리 바꾸면 조합 효과(이름은 도감의 융합·단독 진화 이름).
// - 이동을 다 썼는데 못 깼으면 햇살(JP)로 +5 이동(두 번까지). 연승 선물 · 시작 전 부스터 · 판 안 도구(이동을 쓰지 않음).
// 시드 난수만 쓰므로 같은 단계·시드·부스터·행동 기록이면 점수가 글자까지 같다(replayPuzzle).
// 판 좌표: i = r*8 + c (r 0이 맨 위). 칸: {id,law,sp,dir} · sp: null(보통 씨앗) | 'pierce' | 'chain' | 'burst' | 'sun'.
// 구멍(hole)은 판에 없는 칸, 돌(stone 1~3)은 씨앗 없이 자리를 막는 칸, 덩굴(vine)은 씨앗을 묶어 못 움직이게 한다(맞추면 풀린다). 이끼(moss)는 씨앗 밑에 깔린다.
import {LAWS} from './laws.js';
import {FORMS,SOLO_FORMS,soloFormOf} from './forms.js';

export const PUZZLE=Object.freeze({size:8,cellScore:10,createScore:{pierce:60,chain:60,burst:100,sun:200},moveBonus:150,maxSteps:80,extraMoves:5,maxContinues:2});
export const PUZZLE_LAW_IDS=Object.freeze(Object.keys(LAWS));
// 특수 씨앗 네 가지. 도감과 이어지도록 SEED 법칙 이름을 쓴다(햇살은 법칙이 아니다).
export const PUZZLE_POWERS=Object.freeze({
 pierce:Object.freeze({id:'pierce',name:'관통 씨앗',make:'넷 한 줄',text:'가로 또는 세로 한 줄을 꿰뚫어요'}),
 chain:Object.freeze({id:'chain',name:'연쇄 씨앗',make:'네모(2×2)',text:'주변 십자를 치고, 목표(이끼·돌·덩굴·모을 씨앗)로 날아가 한 번 더'}),
 burst:Object.freeze({id:'burst',name:'폭발 씨앗',make:'T·L 모양 다섯',text:'주변 5×5를 터뜨려요'}),
 sun:Object.freeze({id:'sun',name:'햇살 씨앗',make:'다섯 한 줄',text:'바꾼 씨앗과 같은 법칙을 모두 터뜨려요(누르면 가장 많은 법칙)'}),
});
// 햇살(JP)로 사는 것. 모두 판을 이기게 돕는 것이라, 보상(첫 깨기 90~380 JP)보다 싸게 둔다.
export const PUZZLE_SHOP=Object.freeze({
 more:Object.freeze([150,300]),
 boosters:Object.freeze({pierce:60,burst:90,sun:150}),
 tools:Object.freeze({hammer:50,row:80,col:80,shuffle:30}),
});
export const PUZZLE_TOOLS=Object.freeze({
 hammer:Object.freeze({id:'hammer',name:'가지치기 가위',text:'한 칸을 없애요(돌은 한 겹, 덩굴은 풀어요)'}),
 row:Object.freeze({id:'row',name:'가로 바람',text:'고른 가로줄을 모두 쓸어요'}),
 col:Object.freeze({id:'col',name:'세로 빛줄기',text:'고른 세로줄을 모두 쓸어요'}),
 shuffle:Object.freeze({id:'shuffle',name:'섞기 모자',text:'보통 씨앗을 모두 다시 섞어요'}),
});
// 연승 선물(로열 매치 '집사의 선물'): 연속으로 깨면 다음 단계 시작 때 특수 씨앗을 깔아 준다. 지면 처음부터.
export const PUZZLE_STREAK_GIFTS=Object.freeze([[],['pierce'],['pierce','chain'],['pierce','chain','burst']]);
export const puzzleStreakGift=streak=>PUZZLE_STREAK_GIFTS[Math.max(0,Math.min(3,Math.floor(streak)||0))];

const N=PUZZLE.size,ALL=N*N;
const rc=i=>[Math.floor(i/N),i%N],at=(r,c)=>r>=0&&r<N&&c>=0&&c<N?r*N+c:-1;
function random(s){s.rng=(Math.imul(s.rng,1664525)+1013904223)>>>0;return s.rng/4294967296;}
const pick=(s,list)=>list[Math.floor(random(s)*list.length)];
const gem=(s,law,extra={})=>({id:s.nextId++,law,sp:null,...extra});
const copyCell=c=>c&&{...c};
const POWER_IDS=Object.keys(PUZZLE_POWERS);
// 특수 씨앗을 도감 법칙으로 읽기(조합 이름용). 햇살은 법칙이 아니다.
const POWER_LAW={pierce:'pierce',chain:'chain',burst:'burst'};

// ── 조합 이름(도감과 같은 표): 다른 두 법칙 → 융합, 같은 법칙 둘 → 그 법칙의 단독 진화.
export function puzzleComboForm(a,b){
 if(!LAWS[a]||!LAWS[b])return null;
 if(a===b){const id=soloFormOf(a);return id?{id,name:SOLO_FORMS[id].name}:null;}
 const f=Object.values(FORMS).find(f=>f.requires.length===2&&f.requires.includes(a)&&f.requires.includes(b));
 return f?{id:f.id,name:f.name}:null;
}

// ── 단계
// map: 8줄 × 8글자. '.' 보통 · '#' 구멍 · 'm' 이끼 · '1'~'3' 돌(겹) · 'v' 덩굴 · 'V' 덩굴+이끼.
// 판에 이끼·돌·덩굴이 있으면 모두 없애는 것이 목표에 들어간다. 그 밖에 goal.score · goal.collect([{law,count}]).
// stars: ★★ · ★★★ 점수(★ 하나는 깨기). attack: 목표 없이 이동을 다 쓰면 끝(오늘의 단계).
// 이동과 별은 tools/seed-puzzle-simulation.mjs 의 보통 봇(절반은 좋은 수)으로 맞췄다: 1~8단계 90%↑ · 보통 80% · 5의 배수 60% · 30단계 45% 깨기.
// 별은 보통 봇이 깬 판 점수의 가운데값(★★)과 상위 20%(★★★, ★★보다 15% 이상 위).
const OPEN=Object.freeze(Array(8).fill('........'));
function parseMap(rows){
 const out={hole:[],moss:[],stones:[],vines:[]};
 rows.forEach((row,r)=>[...row].forEach((ch,c)=>{const i=r*N+c;
  if(ch==='#')out.hole.push(i);if(ch==='m'||ch==='V')out.moss.push(i);if(ch==='v'||ch==='V')out.vines.push(i);if('123'.includes(ch))out.stones.push({i,hp:Number(ch)});}));
 return out;
}
function stage(n,o){
 const map=o.map||OPEN,parsed=parseMap(map),goal={...(o.goal||{})};
 if(parsed.moss.length)goal.moss=true;if(parsed.stones.length)goal.stone=true;if(parsed.vines.length)goal.vine=true;
 return Object.freeze({id:`s${n}`,n,colors:6,require:[],...o,map,...parsed,goal:Object.freeze(goal)});
}
export const PUZZLE_STAGES=Object.freeze([
 // 1~8: 특수 씨앗 네 가지를 하나씩 배운다. 로열 매치처럼 앞 단계는 이동이 넉넉하다.
 stage(1,{name:'첫 싹',tip:'이웃한 두 씨앗을 바꿔 같은 법칙 셋을 한 줄로.',colors:5,moves:30,goal:{score:1500},stars:[5800,6700]}),
 stage(2,{name:'관통 씨앗',tip:'넷을 한 줄로 맞추면 관통 씨앗! 눌러서 바로 터뜨려도 돼요.',colors:5,moves:30,goal:{score:3000},stars:[7100,8200]}),
 stage(3,{name:'이끼 걷기',tip:'이끼 위의 씨앗을 터뜨리면 이끼가 걷혀요.',colors:5,moves:30,map:['........','........','..mmmm..','..mmmm..','..mmmm..','..mmmm..','........','........'],stars:[5700,7200]}),
 stage(4,{name:'연쇄 씨앗',tip:'네모(2×2)로 맞추면 연쇄 씨앗. 남은 목표로 날아가요.',colors:5,moves:30,map:['mm....mm','mm....mm','........','........','........','........','mm....mm','mm....mm'],stars:[6300,8400]}),
 stage(5,{name:'폭발 씨앗',tip:'T·L 모양 다섯을 맞추면 폭발 씨앗. 주변 5×5를 날려요.',moves:30,map:['........','.1....1.','........','...11...','...11...','........','.1....1.','........'],stars:[4900,5700]}),
 stage(6,{name:'햇살 씨앗',tip:'다섯 한 줄이면 햇살 씨앗. 바꾼 씨앗과 같은 법칙이 전부 터져요.',moves:34,goal:{score:6000},stars:[7800,9000]}),
 stage(7,{name:'조합 효과',tip:'특수 씨앗끼리 바꾸면 조합 효과! 관통+폭발은 세 줄씩 가로세로로.',moves:38,goal:{score:7000},stars:[8500,9900]}),
 stage(8,{name:'묶인 씨앗',tip:'덩굴에 묶인 씨앗은 못 움직여요. 그 씨앗을 맞추면 풀려요.',moves:28,map:['........','........','.vv..vv.','........','........','.vv..vv.','........','........'],stars:[4700,5500]}),
 // 9~20: 방해물을 섞는다.
 stage(9,{name:'불꽃과 서리',tip:'폭발과 빙결 씨앗을 모아요.',moves:20,require:['burst','frost'],goal:{collect:[{law:'burst',count:25},{law:'frost',count:25}]},stars:[4000,4900]}),
 stage(10,{name:'돌담',tip:'돌 옆에서 맞추면 돌이 한 겹씩 깨져요.',moves:18,map:['........','........','........','111..111','11....11','........','........','........'],stars:[3300,3900]}),
 stage(11,{name:'구멍 난 정원',tip:'구멍 아래는 바로 밑에서 새 씨앗이 돋아요.',moves:35,map:['........','........','..#..#..','..#..#..','mm#mm#mm','mm#mm#mm','........','........'],stars:[3700,4600]}),
 stage(12,{name:'덩굴 울타리',tip:'묶인 씨앗도 같은 법칙끼리는 맞춰져요.',moves:28,map:['........','........','vvvvvvvv','........','........','vvvvvvvv','........','........'],stars:[4700,5500]}),
 stage(13,{name:'번개 수확',tip:'연쇄 씨앗을 모으면서 가운데 이끼도.',moves:24,require:['chain'],map:['........','........','........','.mmmmmm.','.mmmmmm.','........','........','........'],goal:{collect:[{law:'chain',count:35}]},stars:[5100,6000]}),
 stage(14,{name:'두 겹 돌',tip:'두 번 맞아야 깨지는 돌이에요.',moves:19,map:['........','........','.22..22.','........','........','.22..22.','........','........'],stars:[3300,4000]}),
 stage(15,{name:'모래시계',tip:'가운데가 좁아요. 특수 씨앗으로 뚫어요.',moves:28,map:['........','m......m','#m....m#','##m..m##','##m..m##','#m....m#','m......m','........'],stars:[4100,5500]}),
 stage(16,{name:'정원의 문',tip:'돌과 이끼를 함께.',moves:32,map:['mm....mm','m......m','...22...','..2..2..','..2..2..','...22...','m......m','mm....mm'],stars:[5400,6300]}),
 stage(17,{name:'엉킨 덩굴',tip:'덩굴 아래 이끼까지 걷어야 해요.',moves:20,map:['........','.V.V.V..','........','..V.V.V.','.V.V.V..','........','..V.V.V.','........'],stars:[3200,3800]}),
 stage(18,{name:'바람길',tip:'가운데 구멍 기둥 양쪽을 모두 치워요.',moves:20,map:['...##...','...##...','mm.##.mm','mm.##.mm','11.##.11','...##...','...##...','...##...'],stars:[2300,2800]}),
 stage(19,{name:'세 가지 수확',tip:'세 법칙을 한꺼번에 모아요.',moves:20,require:['orbit','split','reflect'],goal:{collect:[{law:'orbit',count:20},{law:'split',count:20},{law:'reflect',count:20}]},stars:[3900,4900]}),
 stage(20,{name:'첫 번째 성벽',tip:'세 겹 돌! 폭발 씨앗과 조합 효과를 아껴 두세요.',moves:26,map:['........','........','........','3..33..3','3..33..3','........','........','........'],stars:[5000,6200]}),
 // 21~30: 조합을 써야 깨지는 판.
 stage(21,{name:'이끼 바다',tip:'판 절반이 이끼예요. 연쇄 씨앗이 남은 이끼를 찾아가요.',moves:22,map:['mmmmmmmm','mmmmmmmm','mmmmmmmm','mmmmmmmm','........','........','........','........'],stars:[4200,5200]}),
 stage(22,{name:'감옥 정원',tip:'돌 안에 갇힌 이끼. 돌부터 깨요.',moves:18,map:['........','.111111.','.1mmmm1.','.1mmmm1.','.1mmmm1.','.111111.','........','........'],stars:[3100,3700]}),
 stage(23,{name:'덩굴 성',tip:'성벽 덩굴과 가운데 돌. 연쇄 씨앗이 남은 덩굴을 찾아가요.',moves:30,map:['v.v..v.v','........','v......v','...22...','...22...','v......v','........','v.v..v.v'],stars:[5600,6500]}),
 stage(24,{name:'별 모양 정원',tip:'모서리가 없어요. 가운데에서 크게!',moves:18,map:['##....##','#......#','..mmmm..','..mmmm..','..mmmm..','..mmmm..','#......#','##....##'],stars:[3100,3600]}),
 stage(25,{name:'점수 정원',tip:'8,000점! 햇살 씨앗과 조합 효과를 노려요.',moves:36,goal:{score:8000},stars:[9500,11000]}),
 stage(26,{name:'두 갈래 강',tip:'가운데 강(구멍) 양쪽 돌을 모두.',moves:33,map:['........','...##...','.2.##.2.','.2.##.2.','.2.##.2.','.2.##.2.','...##...','........'],stars:[3500,4400]}),
 stage(27,{name:'번개와 불꽃',tip:'연쇄·폭발 씨앗 모으기 + 덩굴.',moves:25,require:['chain','burst'],map:['........','........','v.v..v.v','........','........','v.v..v.v','........','........'],goal:{collect:[{law:'chain',count:25},{law:'burst',count:25}]},stars:[4900,5700]}),
 stage(28,{name:'겹겹의 벽',tip:'1·2·3겹 돌이 차례로. 폭발+폭발은 9×9!',moves:26,map:['........','11111111','........','22222222','........','.333333.','........','........'],stars:[5000,5800]}),
 stage(29,{name:'잠든 숲',tip:'이끼·돌·덩굴이 다 있어요.',moves:36,map:['mm.vv.mm','mm....mm','..2..2..','v......v','v......v','..2..2..','mm....mm','mm.vv.mm'],stars:[6200,7200]}),
 stage(30,{name:'정원의 심장',tip:'마지막 정원. 조합 효과를 아껴 두었다가 한 번에!',moves:36,map:['mm#..#mm','m..22..m','#.1..1.#','.2.VV.2.','.2.VV.2.','#.1..1.#','m..22..m','mm#..#mm'],stars:[5300,6700]}),
]);
export const PUZZLE_STAGE_BY_ID=Object.freeze(Object.fromEntries(PUZZLE_STAGES.map(s=>[s.id,s])));
// 오늘의 단계: 날짜(서울 기준 YYYYMMDD)로 시드가 정해지는 점수 도전. 누구나 같은 판에서 시작한다.
export function dailyPuzzleStage(day){const d=String(day).replace(/\D/g,'').slice(0,8);return Object.freeze({...stage(0,{name:'오늘의 단계',tip:'이동 25번 안에 최고 점수. 오늘 하루 같은 판이에요.',moves:25,attack:true,stars:[4000,6500,9000]}),id:`d${d}`,daily:d,seed:Number(d)>>>0});}
export function seoulDay(now=Date.now()){const d=new Date(now+9*3600e3);return `${d.getUTCFullYear()}${String(d.getUTCMonth()+1).padStart(2,'0')}${String(d.getUTCDate()).padStart(2,'0')}`;}

// ── 판 만들기
// boosters: 시작 때 깔 특수 씨앗(연승 선물 + 산 부스터). 기록에 남아 재현에 쓰인다.
export function createPuzzle(def,seed=1,boosters=[]){
 const n=Number.isFinite(seed)?seed>>>0:1;
 const s={version:2,stage:def.id,def,seed:n,rng:n||1,cells:Array(ALL).fill(null),hole:Array(ALL).fill(0),moss:Array(ALL).fill(0),stone:Array(ALL).fill(0),vine:Array(ALL).fill(0),
  laws:[],movesLeft:def.moves,log:[],score:0,collected:{},phase:'play',nextId:1,combos:[],created:{pierce:0,chain:0,burst:0,sun:0},maxCombo:0,bonus:0,continues:0,tools:0,
  boosters:(Array.isArray(boosters)?boosters:[]).filter(id=>POWER_IDS.includes(id)).slice(0,6)};
 const pool=PUZZLE_LAW_IDS.filter(id=>!def.require.includes(id)),laws=[...def.require];
 while(laws.length<def.colors){const id=pick(s,pool);pool.splice(pool.indexOf(id),1);laws.push(id);}
 s.laws=PUZZLE_LAW_IDS.filter(id=>laws.includes(id));
 for(const i of def.hole)s.hole[i]=1;for(const i of def.moss)s.moss[i]=1;for(const i of def.vines)s.vine[i]=1;for(const {i,hp} of def.stones)s.stone[i]=hp;
 fill(s);
 // 부스터는 묶이지 않은 보통 씨앗 자리에 무작위로.
 for(const id of s.boosters){const spots=[];for(let i=0;i<ALL;i++)if(s.cells[i]&&!s.cells[i].sp&&!s.vine[i])spots.push(i);if(!spots.length)break;const i=pick(s,spots);s.cells[i]=gem(s,null,{sp:id,...(id==='pierce'?{dir:random(s)<.5?'h':'v'}:{})});}
 return s;
}
const open=(s,i)=>i>=0&&!s.hole[i]&&!s.stone[i];
// 처음 판: 맞춤 없이, 둘 수 있는 수는 있게.
function fill(s){
 for(let tries=0;tries<60;tries++){
  for(let i=0;i<ALL;i++){
   if(!open(s,i)){s.cells[i]=null;continue;}
   const [r,c]=rc(i),bad=new Set(),l=j=>j>=0&&open(s,j)?s.cells[j]?.law:null;
   if(c>=2&&l(i-1)&&l(i-1)===l(i-2))bad.add(l(i-1));
   if(r>=2&&l(i-N)&&l(i-N)===l(i-2*N))bad.add(l(i-N));
   if(r>=1&&c>=1&&l(i-1)&&l(i-1)===l(i-N)&&l(i-1)===l(i-N-1))bad.add(l(i-1));
   s.cells[i]=gem(s,pick(s,s.laws.filter(x=>!bad.has(x))));
  }
  if(!findMatches(s).length&&findHint(s))return;
 }
}

// ── 맞춤 찾기: 셋 이상 한 줄, 그리고 2×2 네모.
const lawAt=(s,i)=>i>=0&&open(s,i)&&s.cells[i]&&!s.cells[i].sp?s.cells[i].law:null;
export function findMatches(s){
 const shapes=[];
 for(const dir of ['h','v'])for(let a=0;a<N;a++){
  let run=[];
  for(let b=0;b<=N;b++){
   const i=b<N?(dir==='h'?at(a,b):at(b,a)):-1,law=b<N?lawAt(s,i):null;
   if(law&&run.length&&lawAt(s,run[0])===law)run.push(i);
   else{if(run.length>=3)shapes.push({kind:dir,cells:run,law:lawAt(s,run[0])});run=law?[i]:[];}
  }
 }
 for(let r=0;r<N-1;r++)for(let c=0;c<N-1;c++){const q=[at(r,c),at(r,c+1),at(r+1,c),at(r+1,c+1)],law=lawAt(s,q[0]);if(law&&q.every(i=>lawAt(s,i)===law))shapes.push({kind:'sq',cells:q,law});}
 // 칸을 나눠 가진 모양끼리 한 무리(T·L, 네모+줄).
 const groups=[];
 for(const sh of shapes){
  const hit=groups.filter(g=>g.law===sh.law&&sh.cells.some(i=>g.cells.has(i)));
  const g=hit[0]||{law:sh.law,cells:new Set(),shapes:[]};
  for(const other of hit.slice(1)){for(const i of other.cells)g.cells.add(i);g.shapes.push(...other.shapes);groups.splice(groups.indexOf(other),1);}
  for(const i of sh.cells)g.cells.add(i);g.shapes.push(sh);if(!hit.length)groups.push(g);
 }
 return groups;
}
// 무리가 남기는 특수 씨앗: 다섯 한 줄 → 햇살 · T/L(가로와 세로가 만남) → 폭발 · 넷 한 줄 → 관통 · 네모 → 연쇄.
function creationOf(g){
 const lines=g.shapes.filter(x=>x.kind!=='sq'),longest=Math.max(0,...lines.map(x=>x.cells.length)),dirs=new Set(lines.map(x=>x.kind));
 if(longest>=5)return 'sun';
 if(dirs.size===2)return 'burst';
 if(longest===4)return 'pierce';
 if(g.shapes.some(x=>x.kind==='sq'))return 'chain';
 return null;
}
function pivotOf(g,moved){
 for(const i of moved)if(g.cells.has(i))return i;
 const h=g.shapes.find(x=>x.kind==='h'),v=g.shapes.find(x=>x.kind==='v');
 if(h&&v){const x=h.cells.find(i=>v.cells.includes(i));if(x!==undefined)return x;}
 const r=g.shapes.reduce((a,b)=>b.cells.length>a.cells.length?b:a);return r.cells[Math.floor((r.cells.length-1)/2)];
}

// ── 터지는 모양
const pieces=(s,law)=>{const out=[];for(let i=0;i<ALL;i++){const c=s.cells[i];if(c&&open(s,i)&&(law===undefined||!c.sp&&c.law===law))out.push(i);}return out;};
const square=(i,rad)=>{const [r,c]=rc(i),out=[];for(let dr=-rad;dr<=rad;dr++)for(let dc=-rad;dc<=rad;dc++){const j=at(r+dr,c+dc);if(j>=0)out.push(j);}return out;};
const line=(i,dir,w=0)=>{const [r,c]=rc(i),out=[];for(let k=-w;k<=w;k++)for(let t=0;t<N;t++){const j=dir==='v'?at(t,c+k):at(r+k,t);if(j>=0)out.push(j);}return out;};
const plus=i=>{const [r,c]=rc(i);return [i,at(r-1,c),at(r+1,c),at(r,c-1),at(r,c+1)].filter(j=>j>=0);};
// 연쇄 씨앗이 날아갈 곳: 남은 목표(돌·덩굴·이끼·모을 법칙) 중 하나, 없으면 아무 씨앗. 이미 맞은 칸은 피한다.
function chainTarget(s,avoid){
 const want=new Set((s.def.goal.collect||[]).filter(c=>(s.collected[c.law]||0)<c.count).map(c=>c.law));
 const tiers=[[],[],[],[]];
 for(let i=0;i<ALL;i++){if(avoid.has(i)||s.hole[i])continue;
  if(s.stone[i]||s.vine[i])tiers[0].push(i);else if(s.moss[i])tiers[1].push(i);else if(s.cells[i]&&!s.cells[i].sp&&want.has(s.cells[i].law))tiers[2].push(i);else if(s.cells[i])tiers[3].push(i);}
 const list=tiers.find(t=>t.length);return list?pick(s,list):-1;
}
// 특수 씨앗 하나가 덮는 칸과 그림용 효과. carry: 연쇄 씨앗이 싣고 날아간 특수 씨앗.
function powerCells(s,sp,i,{dir='h',avoid=new Set()}={}){
 const fx={kind:sp,i,dir,cells:[],flights:[]};let cells=[];
 if(sp==='pierce')cells=line(i,dir);
 else if(sp==='burst')cells=square(i,2);
 else if(sp==='chain'){cells=plus(i);const t=chainTarget(s,new Set([...avoid,...cells]));if(t>=0){fx.flights.push({to:t,carry:null});cells.push(t);}}
 else if(sp==='sun'){const counts={};for(const j of pieces(s))if(!s.cells[j].sp)counts[s.cells[j].law]=(counts[s.cells[j].law]||0)+1;
  const law=Object.keys(counts).sort((a,b)=>counts[b]-counts[a]||a.localeCompare(b))[0];fx.law=law||null;cells=[i,...(law?pieces(s,law):[])];}
 fx.cells=[...new Set(cells)];return fx;
}
export const puzzlePowerCells=(s,sp,i,o)=>powerCells(s,sp,i,o).cells;

// ── 한 단계: 터뜨리고(맞은 특수 씨앗도 연달아) 특수 씨앗 만들기 → 떨어뜨리기
function detonate(s,start,effects){
 const hit=new Set(),queue=[...start];
 while(queue.length){const i=queue.shift();if(hit.has(i)||i<0||s.hole[i])continue;hit.add(i);const cell=s.cells[i];
  if(cell?.sp&&!cell.spent&&!s.vine[i]){cell.spent=true;const fx=powerCells(s,cell.sp,i,{dir:cell.dir,avoid:hit});effects.push(fx);for(const j of fx.cells)if(!hit.has(j))queue.push(j);}}
 return hit;
}
function clearStep(s,{forced=[],effects=[],moved=[],combo,label=null}){
 const groups=findMatches(s),start=new Set(forced);
 for(const g of groups)for(const i of g.cells)start.add(i);
 if(!start.size)return null;
 const creations=[];
 for(const g of groups){const kind=creationOf(g);if(!kind)continue;const i=pivotOf(g,moved);const run=g.shapes.find(x=>x.kind!=='sq'&&x.cells.includes(i))||g.shapes.find(x=>x.kind!=='sq');
  creations.push({i,kind,dir:run?.kind==='h'?'v':'h'});}
 const matched=new Set(groups.flatMap(g=>[...g.cells]));
 const hit=detonate(s,start,effects);
 const cleared=[],stones=new Map(),vines=[],moss=[],hurt=new Set();
 // 직접 맞은 돌 먼저, 그다음 맞춤으로 터진 씨앗 옆의 돌을 한 번씩.
 for(const i of hit)if(s.stone[i]){hurt.add(i);stones.set(i,1);}
 for(const i of hit){
  if(s.stone[i])continue;
  if(s.moss[i]){s.moss[i]=0;moss.push(i);}
  // 덩굴에 묶인 씨앗은 맞으면 덩굴만 풀리고 씨앗은 남는다.
  if(s.vine[i]){s.vine[i]=0;vines.push(i);continue;}
  const cell=s.cells[i];if(!cell)continue;cleared.push({i,id:cell.id,law:cell.law,sp:cell.sp});s.cells[i]=null;
  if(cell.law&&!cell.sp)s.collected[cell.law]=(s.collected[cell.law]||0)+1;
  if(matched.has(i)){const [r,c]=rc(i);for(const j of [at(r-1,c),at(r+1,c),at(r,c-1),at(r,c+1)])if(j>=0&&s.stone[j]&&!hurt.has(j)){hurt.add(j);stones.set(j,1);}}
 }
 const stoneOut=[];for(const [i,dmg] of stones){s.stone[i]=Math.max(0,s.stone[i]-dmg);stoneOut.push({i,hp:s.stone[i]});}
 const created=[];
 for(const c of creations){if(!open(s,c.i)||s.cells[c.i])continue;const cell=gem(s,null,{sp:c.kind,...(c.kind==='pierce'?{dir:c.dir}:{})});s.cells[c.i]=cell;s.created[c.kind]++;created.push({i:c.i,cell:copyCell(cell)});}
 const gained=cleared.length*PUZZLE.cellScore*combo+created.reduce((n,c)=>n+PUZZLE.createScore[c.cell.sp],0)+(stoneOut.length+vines.length)*20;
 s.score+=gained;s.maxCombo=Math.max(s.maxCombo,combo);
 for(const e of effects)if(e.form&&!s.combos.includes(e.form))s.combos.push(e.form);
 return {type:'clear',combo,cleared,created,stones:stoneOut,vines,moss,effects,gained,label};
}
// 빈칸 채우기: 구멍·돌·묶인 씨앗에서 끊기는 열 조각마다 아래로 모으고, 조각 맨 위에서 새 씨앗이 돋는다.
function fallStep(s){
 const moves=[],spawns=[],fixed=i=>!open(s,i)||s.vine[i]&&s.cells[i];
 for(let c=0;c<N;c++){
  let bottom=N-1;
  while(bottom>=0){
   while(bottom>=0&&fixed(at(bottom,c)))bottom--;if(bottom<0)break;
   let top=bottom;while(top-1>=0&&!fixed(at(top-1,c)))top--;
   let write=bottom;
   for(let r=bottom;r>=top;r--){const i=at(r,c),cell=s.cells[i];if(!cell)continue;if(r!==write){s.cells[at(write,c)]=cell;s.cells[i]=null;moves.push({id:cell.id,from:i,to:at(write,c)});}write--;}
   const count=write-top+1;
   for(let k=0;k<count;k++){const r=write-k,cell=gem(s,pick(s,s.laws));s.cells[at(r,c)]=cell;spawns.push({id:cell.id,to:at(r,c),fromRow:top-1-k,cell:copyCell(cell)});}
   bottom=top-1;
  }
 }
 return {type:'fall',moves,spawns,cells:s.cells.map(copyCell),stone:[...s.stone],vine:[...s.vine]};
}
function cascade(s,steps,{forced=[],effects=[],moved=[],label=null}={}){
 let combo=1;
 for(let n=0;n<PUZZLE.maxSteps;n++){
  const step=clearStep(s,{forced,effects,moved,combo,label:n===0?label:null});forced=[];effects=[];if(!step)break;
  steps.push(step);steps.push(fallStep(s));moved=[];combo++;
 }
}

// ── 둘 수 있는 수
const adjacent=(a,b)=>{const [ar,ac]=rc(a),[br,bc]=rc(b);return Math.abs(ar-br)+Math.abs(ac-bc)===1;};
const movable=(s,i)=>i>=0&&i<ALL&&open(s,i)&&!s.vine[i]&&!!s.cells[i];
function swapCells(s,a,b){[s.cells[a],s.cells[b]]=[s.cells[b],s.cells[a]];}
export function swapKind(s,a,b){
 if(!movable(s,a)||!movable(s,b)||!adjacent(a,b))return null;
 const x=s.cells[a],y=s.cells[b];
 if(x.sp&&y.sp)return 'combo';
 if(x.sp||y.sp)return 'power';
 swapCells(s,a,b);const ok=findMatches(s).some(g=>g.cells.has(a)||g.cells.has(b));swapCells(s,a,b);
 return ok?'match':null;
}
export const canTap=(s,i)=>s.phase==='play'&&movable(s,i)&&!!s.cells[i].sp;
export function findHint(s){
 let best=null,score=-1;
 for(let i=0;i<ALL;i++)for(const j of [i+1,i+N]){if((j===i+1&&i%N===N-1)||j>=ALL)continue;const k=swapKind(s,i,j);if(!k)continue;
  const v=k==='combo'?3:k==='power'?2:1;if(v>score){score=v;best=[i,j];}}
 return best;
}
function shuffle(s){
 const idx=[];for(let i=0;i<ALL;i++)if(s.cells[i]&&!s.cells[i].sp&&!s.vine[i]&&open(s,i))idx.push(i);
 for(let tries=0;tries<60;tries++){
  const cells=idx.map(i=>s.cells[i]);for(let k=cells.length-1;k>0;k--){const j=Math.floor(random(s)*(k+1));[cells[k],cells[j]]=[cells[j],cells[k]];}
  idx.forEach((i,k)=>{s.cells[i]=cells[k];});
  if(!findMatches(s).length&&findHint(s))return true;
 }
 for(let tries=0;tries<60;tries++){for(const i of idx)s.cells[i]=gem(s,pick(s,s.laws));if(!findMatches(s).length&&findHint(s))return true;}
 return false;
}

// ── 목표
export function puzzleGoalState(s){
 const g=s.def.goal,parts=[];
 if(g.score)parts.push({kind:'score',have:s.score,need:g.score});
 for(const c of g.collect||[])parts.push({kind:'collect',law:c.law,have:Math.min(c.count,s.collected[c.law]||0),need:c.count});
 if(g.moss){const left=s.moss.reduce((a,b)=>a+b,0);parts.push({kind:'moss',have:s.def.moss.length-left,need:s.def.moss.length});}
 if(g.stone){const left=s.stone.filter(Boolean).length;parts.push({kind:'stone',have:s.def.stones.length-left,need:s.def.stones.length});}
 if(g.vine){const left=s.vine.filter(Boolean).length;parts.push({kind:'vine',have:s.def.vines.length-left,need:s.def.vines.length});}
 return parts;
}
export const puzzleGoalMet=s=>!s.def.attack&&puzzleGoalState(s).every(p=>p.have>=p.need);
// 목표까지 남은 정도(0~1). 이어하기(+5 이동) 화면에서 얼마나 아까운지 보여 줄 때 쓴다.
export function puzzleGoalLeft(s){const parts=puzzleGoalState(s);if(!parts.length)return 0;return parts.reduce((a,p)=>a+Math.max(0,p.need-p.have)/Math.max(1,p.need),0)/parts.length;}
export function puzzleStars(s){
 if(s.phase!=='won')return 0;const [a,b,c]=s.def.stars;
 return s.def.attack?(s.score>=c?3:s.score>=b?2:s.score>=a?1:0):1+(s.score>=a)+(s.score>=b);
}

// ── 행동. 모두 {ok,reason,steps}를 돌려주고, 화면은 steps 를 차례로 그린다.
// 기록(s.log): ['s',a,b] 바꾸기 · ['t',i] 누르기 · ['k',도구,i] 도구 · ['+'] 이어하기.
function blocked(s){return s.phase==='play'?null:{ok:false,reason:s.phase==='out'?'이동을 다 썼어요':'끝난 판이에요',steps:[]};}
export function playPuzzleMove(s,a,b){
 const stop=blocked(s);if(stop)return stop;
 const kind=swapKind(s,a,b);
 if(!kind)return {ok:false,reason:s.vine[a]||s.vine[b]?'덩굴에 묶여 움직일 수 없어요':movable(s,a)&&movable(s,b)&&adjacent(a,b)?'맞춰지지 않아요':'옆 칸끼리만 바꿀 수 있어요',steps:[{type:'swap',a,b,ok:false}]};
 const steps=[{type:'swap',a,b,ok:true}];
 swapCells(s,a,b);s.log.push(['s',a,b]);s.movesLeft--;
 // 옮긴 씨앗은 이제 b, 상대는 a. 조합 효과의 가운데는 옮긴 씨앗이 내려앉은 b.
 if(kind==='combo')comboSwap(s,steps,b,a);
 else if(kind==='power'){const p=s.cells[b].sp?b:a,o=p===b?a:b;
  if(s.cells[p].sp==='sun'){const law=s.cells[o].law,cells=[p,...pieces(s,law)];s.cells[p].spent=true;cascade(s,steps,{forced:cells,effects:[{kind:'sun',law,i:p,cells,flights:[]}],moved:[o],label:PUZZLE_POWERS.sun.name});}
  else cascade(s,steps,{forced:[p],moved:[o]});}
 else cascade(s,steps,{moved:[b,a]});
 settle(s,steps);
 return {ok:true,kind,steps};
}
// 특수 씨앗 누르기(로열 매치처럼 아무 때나 · 이동 1).
export function tapPuzzle(s,i){
 const stop=blocked(s);if(stop)return stop;
 if(!canTap(s,i))return {ok:false,reason:'특수 씨앗만 눌러서 터뜨릴 수 있어요',steps:[]};
 s.log.push(['t',i]);s.movesLeft--;const steps=[];cascade(s,steps,{forced:[i]});settle(s,steps);return {ok:true,kind:'tap',steps};
}
// 판 안 도구(이동을 쓰지 않는다). 값은 화면이 햇살로 받고 부른다.
export function usePuzzleTool(s,tool,i=0){
 const stop=blocked(s);if(stop)return stop;
 if(!PUZZLE_TOOLS[tool])return {ok:false,reason:'없는 도구예요',steps:[]};
 if(tool!=='shuffle'&&(!Number.isInteger(i)||i<0||i>=ALL||s.hole[i]))return {ok:false,reason:'판 안의 칸을 골라요',steps:[]};
 s.log.push(['k',tool,i]);s.tools++;const steps=[];
 if(tool==='shuffle'){shuffle(s);steps.push({type:'shuffle',cells:s.cells.map(copyCell)});cascade(s,steps,{});}
 else{const cells=tool==='hammer'?[i]:line(i,tool==='row'?'h':'v');cascade(s,steps,{forced:cells,effects:[{kind:'tool',tool,i,cells,dir:tool==='col'?'v':'h',flights:[]}],label:PUZZLE_TOOLS[tool].name});}
 settle(s,steps);return {ok:true,kind:'tool',steps};
}
// 이동을 다 쓴 뒤 +5 이동(두 번까지). 값(puzzleContinuePrice)은 화면이 받는다.
export const puzzleContinuePrice=s=>s.continues<PUZZLE.maxContinues?PUZZLE_SHOP.more[s.continues]:null;
export function continuePuzzle(s){
 if(s.phase!=='out'||s.continues>=PUZZLE.maxContinues)return {ok:false,reason:'이어할 수 없어요',steps:[]};
 s.continues++;s.movesLeft+=PUZZLE.extraMoves;s.phase='play';s.log.push(['+']);return {ok:true,steps:[]};
}
export function giveUpPuzzle(s){if(s.phase!=='out')return {ok:false,steps:[]};s.phase='lost';return {ok:true,steps:[{type:'end',phase:'lost',stars:0,score:s.score}]};}
function settle(s,steps){
 if(puzzleGoalMet(s)){s.phase='won';s.bonus=s.movesLeft*PUZZLE.moveBonus;s.score+=s.bonus;steps.push({type:'bonus',moves:s.movesLeft,gained:s.bonus});}
 else if(s.movesLeft<=0)s.phase=s.def.attack?'won':s.continues<PUZZLE.maxContinues?'out':'lost';
 else if(!findHint(s)){shuffle(s);steps.push({type:'shuffle',cells:s.cells.map(copyCell)});}
 if(s.phase==='out')steps.push({type:'out',continues:s.continues,price:puzzleContinuePrice(s),left:puzzleGoalLeft(s)});
 else if(s.phase!=='play')steps.push({type:'end',phase:s.phase,stars:puzzleStars(s),score:s.score});
}
// 특수 씨앗끼리: 로열 매치의 조합표를 SEED 법칙으로. 이름은 도감 이름. p·q 는 이름순(burst < chain < pierce < sun).
function comboSwap(s,steps,center,other){
 const x=s.cells[center],y=s.cells[other],[p,q]=[x.sp,y.sp].sort();x.spent=y.spent=true;
 const cells=new Set([center,other]),fx={kind:'combo',i:center,a:p,b:q,cells:[],flights:[],big:true};let label;
 const add=list=>{for(const j of list)cells.add(j);};
 if(p==='sun'&&q==='sun'){add(pieces(s));for(let i=0;i<ALL;i++)if(s.stone[i]||s.vine[i])cells.add(i);label='햇살 + 햇살';}
 else if(q==='sun'){
  // 햇살 + 특수: 가장 많은 법칙이 모두 그 특수 씨앗이 되어 터진다.
  const power=p,counts={};for(const j of pieces(s))if(!s.cells[j].sp)counts[s.cells[j].law]=(counts[s.cells[j].law]||0)+1;
  const law=Object.keys(counts).sort((a,b)=>counts[b]-counts[a]||a.localeCompare(b))[0];let flip=false;
  for(const j of law?pieces(s,law):[])if(!s.vine[j]){s.cells[j]={...s.cells[j],law:null,sp:power,...(power==='pierce'?{dir:(flip=!flip)?'h':'v'}:{})};cells.add(j);}
  fx.law=law;fx.infuse=power;label=`햇살 + ${PUZZLE_POWERS[power].name}`;
 }
 else if(p==='chain'||q==='chain'){
  // 연쇄 + 무엇: 연쇄 씨앗이 상대 특수 씨앗을 싣고 목표로 날아가 거기서 터뜨린다(연쇄끼리는 세 갈래).
  add(plus(center));const q2=p==='chain'?q:p;
  if(q2==='chain'){for(let k=0;k<3;k++){const t=chainTarget(s,cells);if(t<0)break;fx.flights.push({to:t,carry:null});add(plus(t));}}
  else{const t=chainTarget(s,cells);if(t>=0){fx.flights.push({to:t,carry:q2});add(q2==='burst'?square(t,2):line(t,(x.sp===q2?x:y).dir||'h'));}}
 }
 else if(p==='burst'&&q==='burst')add(square(center,4));
 else if(p==='burst'&&q==='pierce'){add(line(center,'h',1));add(line(center,'v',1));}
 else{add(line(center,'h'));add(line(center,'v'));}
 const form=POWER_LAW[p]&&POWER_LAW[q]?puzzleComboForm(POWER_LAW[p],POWER_LAW[q]):null;
 fx.cells=[...cells];fx.name=form?.name||label||null;fx.form=form?.id||null;
 cascade(s,steps,{forced:[...cells],effects:[fx],label:fx.name});
}

// ── 재현: 같은 단계·시드·부스터·기록이면 같은 점수.
export function replayPuzzle(def,seed,boosters,log){
 const s=createPuzzle(def,seed,boosters);
 for(const m of Array.isArray(log)?log:[]){if(!Array.isArray(m))return null;let r;
  if(m[0]==='s')r=playPuzzleMove(s,m[1],m[2]);else if(m[0]==='t')r=tapPuzzle(s,m[1]);else if(m[0]==='k')r=usePuzzleTool(s,m[1],m[2]);else if(m[0]==='+')r=continuePuzzle(s);else return null;
  if(!r.ok)return null;}
 return s;
}

// ── 진행 저장. 햇살 보상은 첫 깨기와 새 별에만.
// 계정 동기화(cloud-save SYNC_KEYS)는 서버 규칙이 필요해 아직 붙이지 않았다 → 이 기기에, 계정(uid)마다 따로 둔다.
// 그래야 한 기기를 두 계정이 써도 서로의 별 때문에 첫 깨기 햇살을 못 받는 일이 없다.
export const PUZZLE_SAVE_KEY='seed-puzzle-v1';
export const puzzleSaveKey=(owner='guest')=>`${PUZZLE_SAVE_KEY}:${encodeURIComponent(owner||'guest')}`;
export const PUZZLE_JP=Object.freeze({firstClear:n=>80+10*n,newStar:40,daily:100});
const int=(v,max)=>Number.isFinite(v)?Math.max(0,Math.min(max,Math.floor(v))):0;
// 도전 씨앗(로열 매치의 하트). 2026-09-28 사용자: "하트를 씨앗으로"
// 단계를 시작할 때 하나 쓰고, 깨면 돌려받는다 → 지거나 도중에 그만두면 하나가 줄어든다. 10분마다 하나씩 다시 돋고, 햇살로 한 번에 채울 수 있다.
// 오늘의 단계와 연습은 쓰지 않는다. 시계는 기기 시각(Date.now)이다.
// 2026-09-28 사용자: 돋는 시간 30분 → 10분(수업 한 시간 안에 여러 번 도전할 수 있게).
export const PUZZLE_LIVES=Object.freeze({max:5,regenMs:10*60e3,refill:120});
export function puzzleLives(progress,now=Date.now()){
 const p=progress||{},max=PUZZLE_LIVES.max;let lives=Number.isInteger(p.lives)?Math.max(0,Math.min(max,p.lives)):max,at=Number.isFinite(p.livesAt)?p.livesAt:0;
 if(lives>=max)return {lives:max,livesAt:0,nextIn:0,full:true};
 if(!at||at>now)at=now;
 const grown=Math.floor((now-at)/PUZZLE_LIVES.regenMs);lives=Math.min(max,lives+grown);at+=grown*PUZZLE_LIVES.regenMs;
 return lives>=max?{lives:max,livesAt:0,nextIn:0,full:true}:{lives,livesAt:at,nextIn:at+PUZZLE_LIVES.regenMs-now,full:false};
}
const setLives=(p,{lives,livesAt})=>{p.lives=lives;p.livesAt=livesAt;return p;};
export function takePuzzleLife(progress,now=Date.now()){
 const p=normalizePuzzleProgress(progress),l=puzzleLives(p,now);if(l.lives<=0)return {ok:false,progress:setLives(p,l)};
 return {ok:true,progress:setLives(p,{lives:l.lives-1,livesAt:l.full?now:l.livesAt})};
}
export function refundPuzzleLife(progress,now=Date.now()){const p=normalizePuzzleProgress(progress),l=puzzleLives(p,now),lives=Math.min(PUZZLE_LIVES.max,l.lives+1);return setLives(p,{lives,livesAt:lives>=PUZZLE_LIVES.max?0:l.livesAt});}
export function refillPuzzleLives(progress){return setLives(normalizePuzzleProgress(progress),{lives:PUZZLE_LIVES.max,livesAt:0});}
// 정원 가꾸기에 쓰는 별: 단계마다 가장 많이 딴 별 + 오늘의 단계에서 날마다 딴 별.
export function puzzleStarsEarned(progress){const p=normalizePuzzleProgress(progress);return Object.values(p.stages).reduce((a,s)=>a+s.stars,0)+p.dailyStars;}
export function normalizePuzzleProgress(raw){
 const out={version:2,stages:{},daily:{day:'',best:0,stars:0,rewarded:false},streak:0,bestStreak:0,lives:PUZZLE_LIVES.max,livesAt:0,dailyStars:0};
 if(!raw||typeof raw!=='object')return out;
 if(Number.isInteger(raw.lives))out.lives=Math.max(0,Math.min(PUZZLE_LIVES.max,raw.lives));
 if(Number.isFinite(raw.livesAt)&&raw.livesAt>0&&out.lives<PUZZLE_LIVES.max)out.livesAt=Math.floor(raw.livesAt);
 out.dailyStars=int(raw.dailyStars,1e6);
 for(const def of PUZZLE_STAGES){const v=raw.stages?.[def.id];if(!v||typeof v!=='object')continue;out.stages[def.id]={best:int(v.best,1e7),stars:int(v.stars,3),clears:int(v.clears,1e6)};}
 const d=raw.daily;if(d&&typeof d==='object'&&/^\d{8}$/.test(d.day||''))out.daily={day:d.day,best:int(d.best,1e7),stars:int(d.stars,3),rewarded:d.rewarded===true};
 out.streak=int(raw.streak,999);out.bestStreak=Math.max(out.streak,int(raw.bestStreak,999));
 return out;
}
export function readPuzzleProgress(storage,owner){try{return normalizePuzzleProgress(JSON.parse(storage?.getItem(puzzleSaveKey(owner))||'null'));}catch{return normalizePuzzleProgress(null);}}
export function writePuzzleProgress(storage,p,owner){const next=normalizePuzzleProgress(p);try{storage?.setItem(puzzleSaveKey(owner),JSON.stringify(next));return true;}catch{return false;}}
export function puzzleUnlocked(progress,def){if(def.daily||def.n<=1)return true;return (progress.stages[`s${def.n-1}`]?.stars||0)>0;}
// 한 번이라도 둔 판을 그만두면 진 것으로 쳐서 연승이 끊긴다(로열 매치와 같다). 오늘의 단계는 연승과 무관.
export function breakPuzzleStreak(progress){const p=normalizePuzzleProgress(progress);p.streak=0;return p;}
// 판이 끝났을 때 진행을 갱신하고 이번에 줄 햇살을 센다(같은 결과를 두 번 넣어도 두 번 주지 않는다).
export function recordPuzzleResult(progress,s){
 const p=normalizePuzzleProgress(progress),stars=puzzleStars(s);let jp=0;const notes=[];
 if(s.def.daily){
  if(p.daily.day!==s.def.daily)p.daily={day:s.def.daily,best:0,stars:0,rewarded:false};
  // 그날 새로 딴 별만큼 정원 가꾸기 별이 는다(같은 날 더 잘해도 늘어난 만큼만).
  p.dailyStars+=Math.max(0,stars-p.daily.stars);
  p.daily.best=Math.max(p.daily.best,s.score);p.daily.stars=Math.max(p.daily.stars,stars);
  if(stars>0&&!p.daily.rewarded){p.daily.rewarded=true;jp+=PUZZLE_JP.daily;notes.push('오늘의 단계 첫 별');}
  return {progress:p,jp,notes,stars};
 }
 const prev=p.stages[s.def.id]||{best:0,stars:0,clears:0};
 // 첫 별은 첫 깨기 보상에 들어 있다. 그 위의 별은 처음 얻을 때 하나씩.
 if(stars>0){if(!prev.stars){jp+=PUZZLE_JP.firstClear(s.def.n);notes.push('첫 깨기');}const more=Math.max(0,stars-Math.max(1,prev.stars));if(more){jp+=more*PUZZLE_JP.newStar;notes.push(`새 별 ${more}개`);}}
 p.stages[s.def.id]={best:Math.max(prev.best,s.phase==='won'?s.score:0),stars:Math.max(prev.stars,stars),clears:prev.clears+(stars>0?1:0)};
 if(s.phase==='won'){p.streak++;p.bestStreak=Math.max(p.bestStreak,p.streak);if(p.streak>=2)notes.push(`${p.streak}연승`);}else p.streak=0;
 return {progress:p,jp,notes,stars};
}
