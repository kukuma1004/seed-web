// 씨앗 맞추기 — 그림과 무관한 3개 맞추기 규칙(PUZZLE_MATCH3_PLAN.md).
// 시드 난수만 쓰므로 같은 단계·시드·이동 기록이면 점수가 글자까지 같다(replayPuzzle).
// 판 좌표: i = r*8 + c (r 0이 맨 위). 칸: {id,law,sp,law2,dir} · sp: null(보통) | 'law'(법칙 씨앗) | 'fusion'(융합 씨앗) | 'sun'(햇살 씨앗).
// 돌은 씨앗이 없는 칸(cells[i]=null, stone[i]>0)이고 떨어지지 않는다. 이끼는 씨앗 밑에 깔려 그 칸이 터지면 걷힌다.
import {LAWS} from './laws.js';
import {FORMS,SOLO_FORMS,soloFormOf} from './forms.js';

export const PUZZLE=Object.freeze({size:8,cellScore:10,createScore:{law:60,fusion:120,sun:200},moveBonus:150,maxSteps:80});
export const PUZZLE_LAW_IDS=Object.freeze(Object.keys(LAWS));
// 법칙 씨앗(4개 한 줄)이 터지는 모양 — 법칙마다 다르다.
export const PUZZLE_SPECIAL_TEXT=Object.freeze({
 burst:'주변 3×3을 터뜨려요',pierce:'한 줄을 꿰뚫어요',chain:'같은 법칙 다섯 칸에 번개',frost:'짧은 십자로 얼려 깨요 · 돌에 2배',
 gravity:'주변을 끌어모아 마름모로 터뜨려요',orbit:'두 칸 떨어진 둘레를 한 바퀴',split:'무작위 세 곳에 파편(십자)',
 reflect:'두 대각선으로 튕겨요',recall:'세로 한 줄 · 채워진 뒤 한 번 더',
});
const N=PUZZLE.size,ALL=N*N;
const rc=i=>[Math.floor(i/N),i%N],at=(r,c)=>r>=0&&r<N&&c>=0&&c<N?r*N+c:-1;
function random(s){s.rng=(Math.imul(s.rng,1664525)+1013904223)>>>0;return s.rng/4294967296;}
const pick=(s,list)=>list[Math.floor(random(s)*list.length)];
const gem=(s,law,extra={})=>({id:s.nextId++,law,sp:null,...extra});
const copyCell=c=>c&&{...c};

// ── 조합 이름(도감과 같은 표): 다른 두 법칙 → 융합, 같은 법칙 둘 → 그 법칙의 단독 진화.
export function puzzleComboForm(a,b){
 if(!LAWS[a]||!LAWS[b])return null;
 if(a===b){const id=soloFormOf(a);return id?{id,name:SOLO_FORMS[id].name}:null;}
 const f=Object.values(FORMS).find(f=>f.requires.length===2&&f.requires.includes(a)&&f.requires.includes(b));
 return f?{id:f.id,name:f.name}:null;
}

// ── 단계
// goal: score(점수) · collect([{law,count}]) · moss(이끼 모두) · stone(돌 모두). 적힌 것을 모두 채우면 깬다.
// attack: 목표 없이 이동을 다 쓰면 끝(오늘의 단계). stars: 2·3번째 별 점수(첫 별은 깨기).
const box=(r0,c0,r1,c1)=>{const out=[];for(let r=r0;r<=r1;r++)for(let c=c0;c<=c1;c++)out.push(r*N+c);return out;};
const row=(r,cols)=>cols.map(c=>r*N+c);
const stage=(n,o)=>Object.freeze({id:`s${n}`,n,colors:6,moss:[],stones:[],require:[],...o});
export const PUZZLE_STAGES=Object.freeze([
 stage(1,{name:'첫 싹',tip:'이웃한 두 씨앗을 바꿔 같은 법칙 셋을 한 줄로.',colors:5,moves:20,goal:{score:2500},stars:[4000,6000]}),
 stage(2,{name:'네 개 한 줄',tip:'넷을 한 줄로 맞추면 법칙 씨앗이 생겨요. 법칙마다 터지는 모양이 달라요.',colors:5,moves:20,goal:{score:4500},stars:[6500,8000]}),
 stage(3,{name:'이끼 걷기',tip:'이끼 위의 씨앗을 터뜨리면 이끼가 걷혀요.',moves:24,moss:box(2,2,5,5),goal:{moss:true},stars:[3800,5500]}),
 stage(4,{name:'불꽃과 서리',tip:'폭발과 빙결 씨앗을 모아요.',moves:22,require:['burst','frost'],goal:{collect:[{law:'burst',count:24},{law:'frost',count:24}]},stars:[4800,6100]}),
 stage(5,{name:'돌 깨기',tip:'돌 옆에서 맞추거나 특수 씨앗으로 맞히면 돌이 깨져요.',moves:20,stones:[...row(3,[0,1,2,5,6,7]),...row(4,[0,1,6,7])],goal:{stone:true},stars:[3400,4400]}),
 stage(6,{name:'융합의 모양',tip:'T·L 모양 다섯을 맞추면 두 법칙이 섞인 융합 씨앗. 특수 씨앗끼리 바꾸면 조합 효과!',moves:24,goal:{score:6000},stars:[7300,8300]}),
 stage(7,{name:'이끼 정원',tip:'바깥 둘레에 이끼가 덮였어요. 가장자리는 특수 씨앗으로!',moves:32,moss:[...box(0,0,0,7),...box(7,0,7,7),...box(1,0,6,0),...box(1,7,6,7)],goal:{moss:true},stars:[7000,8200]}),
 stage(8,{name:'단단한 돌',tip:'두 번 맞아야 깨지는 돌이에요. 빙결은 한 번에 두 칸을 깎아요.',moves:22,stones:[...row(2,[1,2,5,6]),...row(5,[1,2,5,6]),...row(3,[3,4]),...row(4,[3,4])],stoneHp:2,goal:{stone:true},stars:[3800,4600]}),
 stage(9,{name:'번개 수확',tip:'연쇄를 모으면서 가운데 이끼도 걷어요.',moves:28,require:['chain'],moss:box(3,1,4,6),goal:{collect:[{law:'chain',count:40}],moss:true},stars:[6300,8000]}),
 stage(10,{name:'정원의 심장',tip:'돌·이끼·점수 모두. 조합 효과를 아껴 두었다가 한 번에!',moves:34,moss:[...box(0,2,1,5),...box(6,2,7,5)],stones:[...row(3,[0,3,4,7]),...row(4,[0,3,4,7])],stoneHp:2,goal:{score:9000,moss:true,stone:true},stars:[10500,11500]}),
]);
export const PUZZLE_STAGE_BY_ID=Object.freeze(Object.fromEntries(PUZZLE_STAGES.map(s=>[s.id,s])));
// 오늘의 단계: 날짜(서울 기준 YYYYMMDD)로 시드와 법칙이 정해지는 점수 도전. 누구나 같은 판에서 시작한다.
export function dailyPuzzleStage(day){const d=String(day).replace(/\D/g,'').slice(0,8);return Object.freeze({id:`d${d}`,n:0,daily:d,name:'오늘의 단계',tip:'이동 25번 안에 최고 점수. 오늘 하루 같은 판이에요.',colors:6,moves:25,moss:[],stones:[],require:[],attack:true,goal:{},stars:[5000,9000,12500],seed:Number(d)>>>0});}
export function seoulDay(now=Date.now()){const d=new Date(now+9*3600e3);return `${d.getUTCFullYear()}${String(d.getUTCMonth()+1).padStart(2,'0')}${String(d.getUTCDate()).padStart(2,'0')}`;}

// ── 판 만들기
export function createPuzzle(def,seed=1){
 const n=Number.isFinite(seed)?seed>>>0:1;
 const s={version:1,stage:def.id,def,seed:n,rng:n||1,cells:Array(ALL).fill(null),moss:Array(ALL).fill(0),stone:Array(ALL).fill(0),
  laws:[],movesLeft:def.moves,moves:[],score:0,collected:{},phase:'play',nextId:1,pendingRecall:[],combos:[],created:{law:0,fusion:0,sun:0},maxCombo:0,bonus:0};
 const pool=PUZZLE_LAW_IDS.filter(id=>!def.require.includes(id)),laws=[...def.require];
 while(laws.length<def.colors){const id=pick(s,pool);pool.splice(pool.indexOf(id),1);laws.push(id);}
 s.laws=PUZZLE_LAW_IDS.filter(id=>laws.includes(id));
 for(const i of def.moss)s.moss[i]=1;
 for(const i of def.stones)s.stone[i]=def.stoneHp||1;
 fill(s);return s;
}
// 처음 판: 맞춤 없이, 둘 수 있는 수는 있게.
function fill(s){
 for(let tries=0;tries<50;tries++){
  for(let i=0;i<ALL;i++){
   if(s.stone[i]){s.cells[i]=null;continue;}
   const [r,c]=rc(i),bad=new Set();
   if(c>=2&&s.cells[i-1]?.law&&s.cells[i-1].law===s.cells[i-2]?.law)bad.add(s.cells[i-1].law);
   if(r>=2&&s.cells[i-N]?.law&&s.cells[i-N].law===s.cells[i-2*N]?.law)bad.add(s.cells[i-N].law);
   s.cells[i]=gem(s,pick(s,s.laws.filter(l=>!bad.has(l))));
  }
  if(findHint(s))return;
 }
}

// ── 맞춤 찾기
const lawAt=(s,i)=>i>=0&&!s.stone[i]&&s.cells[i]&&s.cells[i].sp!=='sun'?s.cells[i].law:null;
export function findMatches(s){
 const runs=[];
 for(const dir of ['h','v'])for(let a=0;a<N;a++){
  let run=[];
  for(let b=0;b<=N;b++){
   const i=b<N?(dir==='h'?at(a,b):at(b,a)):-1,law=b<N?lawAt(s,i):null;
   if(law&&run.length&&lawAt(s,run[0])===law)run.push(i);
   else{if(run.length>=3)runs.push({dir,cells:run,law:lawAt(s,run[0])});run=law?[i]:[];}
  }
 }
 // 칸을 나눠 가진 줄끼리 한 무리(T·L 모양).
 const groups=[];
 for(const run of runs){
  const hit=groups.filter(g=>run.cells.some(i=>g.cells.has(i)));
  const g=hit[0]||{law:run.law,cells:new Set(),runs:[]};
  for(const other of hit.slice(1)){for(const i of other.cells)g.cells.add(i);g.runs.push(...other.runs);groups.splice(groups.indexOf(other),1);}
  for(const i of run.cells)g.cells.add(i);g.runs.push(run);if(!hit.length)groups.push(g);
 }
 return groups;
}
// 무리가 남기는 특수 씨앗: 5개 한 줄 → 햇살 · T/L 5개 → 융합 · 4개 한 줄 → 법칙 씨앗.
function creationOf(g){
 const longest=Math.max(...g.runs.map(r=>r.cells.length)),dirs=new Set(g.runs.map(r=>r.dir));
 if(longest>=5)return 'sun';
 if(dirs.size===2&&g.cells.size>=5)return 'fusion';
 if(longest===4)return 'law';
 return null;
}
function pivotOf(g,moved){
 for(const i of moved)if(g.cells.has(i))return i;
 const h=g.runs.find(r=>r.dir==='h'),v=g.runs.find(r=>r.dir==='v');
 if(h&&v){const x=h.cells.find(i=>v.cells.includes(i));if(x!==undefined)return x;}
 const r=g.runs.reduce((a,b)=>b.cells.length>a.cells.length?b:a);return r.cells[Math.floor((r.cells.length-1)/2)];
}

// ── 터지는 모양
const gemCells=(s,law)=>{const out=[];for(let i=0;i<ALL;i++)if(s.cells[i]&&(!law||s.cells[i].law===law&&s.cells[i].sp!=='sun'))out.push(i);return out;};
function shape(s,law,i,{dir='h',big=false}={}){
 const [r,c]=rc(i),out=new Set([i]),add=(rr,cc)=>{const j=at(rr,cc);if(j>=0)out.add(j);},k=big?1:0;
 switch(law){
  case 'burst':for(let dr=-1-k;dr<=1+k;dr++)for(let dc=-1-k;dc<=1+k;dc++)add(r+dr,c+dc);break;
  case 'pierce':for(let w=-k;w<=k;w++)for(let t=0;t<N;t++)dir==='v'?add(t,c+w):add(r+w,t);break;
  case 'frost':for(let d=1;d<=2+k;d++){add(r+d,c);add(r-d,c);add(r,c+d);add(r,c-d);}if(big){add(r+1,c+1);add(r+1,c-1);add(r-1,c+1);add(r-1,c-1);}break;
  case 'gravity':for(let dr=-2-k;dr<=2+k;dr++)for(let dc=-2-k;dc<=2+k;dc++)if(Math.abs(dr)+Math.abs(dc)<=2+k)add(r+dr,c+dc);break;
  case 'orbit':for(const d of big?[1,2,3]:[2])for(let t=-d;t<=d;t++){add(r-d,c+t);add(r+d,c+t);add(r+t,c-d);add(r+t,c+d);}break;
  case 'reflect':for(let t=-N;t<=N;t++)for(let w=-k;w<=k;w++){add(r+t,c+t+w);add(r+t,c-t+w);}break;
  case 'recall':for(let w=-k;w<=k;w++)for(let t=0;t<N;t++)add(t,c+w);break;
  case 'chain':{const pool=gemCells(s,s.cells[i]?.law||null).filter(j=>j!==i);for(let n=0;n<(big?9:5)&&pool.length;n++)out.add(pool.splice(Math.floor(random(s)*pool.length),1)[0]);break;}
  case 'split':for(let n=0;n<(big?5:3);n++){const j=Math.floor(random(s)*ALL),[jr,jc]=rc(j);add(jr,jc);add(jr+1,jc);add(jr-1,jc);add(jr,jc+1);add(jr,jc-1);}break;
 }
 return [...out];
}
// 시험·도움말용: 법칙 씨앗 하나가 덮는 칸(무작위 법칙은 판의 난수를 쓴다).
export const puzzleShapeCells=(s,law,i,o)=>shape(s,law,i,o);
// 귀환: 그 열이 채워진 뒤 한 번 더 벤다.
function afterShape(s,law,i,{big=false}={}){if(law!=='recall')return;const c=i%N;for(let w=big?-1:0;w<=(big?1:0);w++)if(c+w>=0&&c+w<N)s.pendingRecall.push(c+w);}

// 특수 씨앗 하나가 터질 때: 효과(그림용)와 맞는 칸.
function special(s,cell,i,big=false){
 if(cell.sp==='sun'){const counts={};for(const j of gemCells(s))if(s.cells[j].sp!=='sun')counts[s.cells[j].law]=(counts[s.cells[j].law]||0)+1;
  const law=Object.keys(counts).sort((a,b)=>counts[b]-counts[a]||a.localeCompare(b))[0];const cells=law?[i,...gemCells(s,law)]:[i];return {effect:{kind:'sun',law,i,cells},cells};}
 const laws=cell.sp==='fusion'?[cell.law,cell.law2]:[cell.law],cells=new Set();
 for(const law of laws){for(const j of shape(s,law,i,{dir:cell.dir,big}))cells.add(j);afterShape(s,law,i,{big});}
 const combo=cell.sp==='fusion'?puzzleComboForm(cell.law,cell.law2):null;
 return {effect:{kind:cell.sp,law:cell.law,law2:cell.law2||null,dir:cell.dir||'h',i,cells:[...cells],big,name:combo?.name||null,form:combo?.id||null},cells:[...cells]};
}

// ── 한 단계: 터뜨리고(연쇄 폭발 포함) 특수 씨앗 만들기 → 떨어뜨리기
function detonate(s,start,effects){
 const hit=new Set(),queue=[...start];
 while(queue.length){const i=queue.shift();if(hit.has(i))continue;hit.add(i);const cell=s.cells[i];
  if(cell?.sp&&!cell.spent){cell.spent=true;const r=special(s,cell,i);effects.push(r.effect);for(const j of r.cells)if(!hit.has(j))queue.push(j);}}
 return hit;
}
function clearStep(s,{forced=[],effects=[],moved=[],combo,label=null}){
 const groups=findMatches(s),start=new Set(forced);
 for(const g of groups)for(const i of g.cells)start.add(i);
 if(!start.size)return null;
 const creations=[];
 for(const g of groups){const kind=creationOf(g);if(!kind)continue;const i=pivotOf(g,moved);
  creations.push({i,kind,law:g.law,dir:g.runs.find(r=>r.cells.includes(i))?.dir||g.runs[0].dir,law2:kind==='fusion'?fusionPartner(s,g.law,moved):null});}
 const hit=detonate(s,start,effects);
 const cleared=[],stones=new Map(),moss=[],hurt=new Set();
 const frostHit=new Set(effects.filter(e=>e.law==='frost'||e.law2==='frost').flatMap(e=>e.cells));
 // 직접 맞은 돌 먼저(빙결은 2칸), 그다음 터진 씨앗 옆의 돌을 한 번씩.
 for(const i of hit)if(s.stone[i]){hurt.add(i);stones.set(i,frostHit.has(i)?2:1);}
 for(const i of hit){
  if(s.stone[i])continue;
  const cell=s.cells[i];if(s.moss[i]){s.moss[i]=0;moss.push(i);}
  if(!cell)continue;cleared.push({i,id:cell.id,law:cell.law,sp:cell.sp});s.cells[i]=null;
  if(cell.law&&cell.sp!=='sun')s.collected[cell.law]=(s.collected[cell.law]||0)+1;
  // 맞춤 옆의 돌도 한 번 깎인다(한 단계에 돌마다 한 번).
  const [r,c]=rc(i);for(const j of [at(r-1,c),at(r+1,c),at(r,c-1),at(r,c+1)])if(j>=0&&s.stone[j]&&!hurt.has(j)){hurt.add(j);stones.set(j,(stones.get(j)||0)+1);}
 }
 const stoneOut=[];for(const [i,dmg] of stones){s.stone[i]=Math.max(0,s.stone[i]-dmg);stoneOut.push({i,hp:s.stone[i]});}
 const created=[];
 for(const c of creations){if(s.stone[c.i]||s.cells[c.i])continue;const cell=gem(s,c.kind==='sun'?null:c.law,{sp:c.kind,...(c.kind==='law'?{dir:c.dir}:{}),...(c.kind==='fusion'?{law2:c.law2}:{})});s.cells[c.i]=cell;s.created[c.kind]++;created.push({i:c.i,cell:copyCell(cell)});}
 const gained=cleared.length*PUZZLE.cellScore*combo+created.reduce((n,c)=>n+PUZZLE.createScore[c.cell.sp],0);
 s.score+=gained;s.maxCombo=Math.max(s.maxCombo,combo);
 for(const e of effects)if(e.form&&!s.combos.includes(e.form))s.combos.push(e.form);
 return {type:'clear',combo,cleared,created,stones:stoneOut,moss,effects,gained,label};
}
// 융합 씨앗의 두 번째 법칙: 바꿔 넣은 상대 씨앗의 법칙(다르면). 아니면 판의 다른 법칙 중 하나.
function fusionPartner(s,law,moved){
 for(const i of moved){const l=s.cells[i]?.law;if(l&&l!==law)return l;}
 const others=s.laws.filter(l=>l!==law);return others.length?pick(s,others):law;
}
// 빈칸 채우기: 돌이 없는 열 조각마다 아래로 모으고 맨 위에서 새 씨앗이 떨어진다.
function fallStep(s){
 const moves=[],spawns=[];
 for(let c=0;c<N;c++){
  let bottom=N-1;
  while(bottom>=0){
   while(bottom>=0&&s.stone[at(bottom,c)])bottom--;if(bottom<0)break;
   let top=bottom;while(top-1>=0&&!s.stone[at(top-1,c)])top--;
   let write=bottom;
   for(let r=bottom;r>=top;r--){const i=at(r,c),cell=s.cells[i];if(!cell)continue;if(r!==write){s.cells[at(write,c)]=cell;s.cells[i]=null;moves.push({id:cell.id,from:i,to:at(write,c)});}write--;}
   const count=write-top+1;
   for(let k=0;k<count;k++){const r=write-k,cell=gem(s,pick(s,s.laws));s.cells[at(r,c)]=cell;spawns.push({id:cell.id,to:at(r,c),fromRow:top-1-k,cell:copyCell(cell)});}
   bottom=top-1;
  }
 }
 return {type:'fall',moves,spawns,cells:s.cells.map(copyCell),stone:[...s.stone]};
}
function cascade(s,steps,{forced=[],effects=[],moved=[],label=null}={}){
 let combo=1;
 for(let n=0;n<PUZZLE.maxSteps;n++){
  const recall=s.pendingRecall.splice(0);const extra=[...forced];const fx=[...effects];forced=[];effects=[];
  if(recall.length){const cells=[];for(const c of new Set(recall))for(let r=0;r<N;r++)cells.push(at(r,c));extra.push(...cells);fx.push({kind:'return',law:'recall',i:cells[0],cells});}
  const step=clearStep(s,{forced:extra,effects:fx,moved,combo,label:n===0?label:null});if(!step)break;
  steps.push(step);steps.push(fallStep(s));moved=[];combo++;
 }
}

// ── 둘 수 있는 수
const adjacent=(a,b)=>{const [ar,ac]=rc(a),[br,bc]=rc(b);return Math.abs(ar-br)+Math.abs(ac-bc)===1;};
const movable=(s,i)=>i>=0&&i<ALL&&!s.stone[i]&&!!s.cells[i];
function swapCells(s,a,b){[s.cells[a],s.cells[b]]=[s.cells[b],s.cells[a]];}
export function swapKind(s,a,b){
 if(!movable(s,a)||!movable(s,b)||!adjacent(a,b))return null;
 const x=s.cells[a],y=s.cells[b];
 if(x.sp==='sun'||y.sp==='sun')return 'sun';
 if(x.sp&&y.sp)return 'combo';
 swapCells(s,a,b);const ok=findMatches(s).some(g=>g.cells.has(a)||g.cells.has(b));swapCells(s,a,b);
 return ok?'match':null;
}
export function findHint(s){
 let best=null,score=-1;
 for(let i=0;i<ALL;i++)for(const j of [i+1,i+N]){if((j===i+1&&i%N===N-1)||j>=ALL)continue;const k=swapKind(s,i,j);if(!k)continue;
  const v=k==='match'?1:3;if(v>score){score=v;best=[i,j];}}
 return best;
}
function shuffle(s){
 const idx=[];for(let i=0;i<ALL;i++)if(s.cells[i])idx.push(i);
 for(let tries=0;tries<60;tries++){
  const cells=idx.map(i=>s.cells[i]);for(let k=cells.length-1;k>0;k--){const j=Math.floor(random(s)*(k+1));[cells[k],cells[j]]=[cells[j],cells[k]];}
  idx.forEach((i,k)=>{s.cells[i]=cells[k];});
  if(!findMatches(s).length&&findHint(s))return true;
 }
 // 섞어도 안 되면 보통 씨앗을 새로 뿌린다(특수 씨앗은 남긴다).
 for(let tries=0;tries<60;tries++){for(const i of idx)if(!s.cells[i].sp)s.cells[i]=gem(s,pick(s,s.laws));if(!findMatches(s).length&&findHint(s))return true;}
 return false;
}

// ── 목표
export function puzzleGoalState(s){
 const g=s.def.goal,parts=[];
 if(g.score)parts.push({kind:'score',have:s.score,need:g.score});
 for(const c of g.collect||[])parts.push({kind:'collect',law:c.law,have:Math.min(c.count,s.collected[c.law]||0),need:c.count});
 if(g.moss){const left=s.moss.reduce((a,b)=>a+b,0);parts.push({kind:'moss',have:s.def.moss.length-left,need:s.def.moss.length});}
 if(g.stone){const left=s.stone.filter(Boolean).length;parts.push({kind:'stone',have:s.def.stones.length-left,need:s.def.stones.length});}
 return parts;
}
export const puzzleGoalMet=s=>!s.def.attack&&puzzleGoalState(s).every(p=>p.have>=p.need);
export function puzzleStars(s){
 if(s.phase!=='won')return 0;const [a,b,c]=s.def.stars;
 return s.def.attack?(s.score>=c?3:s.score>=b?2:s.score>=a?1:0):1+(s.score>=a)+(s.score>=b);
}

// ── 한 수 두기. 돌려주는 steps 를 화면이 차례로 그린다.
export function playPuzzleMove(s,a,b){
 if(s.phase!=='play')return {ok:false,reason:'끝난 판이에요',steps:[]};
 const kind=swapKind(s,a,b);
 if(!kind)return {ok:false,reason:movable(s,a)&&movable(s,b)&&adjacent(a,b)?'맞춰지지 않아요':'옆 칸끼리만 바꿀 수 있어요',steps:[{type:'swap',a,b,ok:false}]};
 const steps=[{type:'swap',a,b,ok:true}];
 swapCells(s,a,b);s.moves.push([a,b]);s.movesLeft--;
 // 옮긴 씨앗은 이제 b, 상대는 a. 효과의 가운데는 옮긴 씨앗이 내려앉은 b.
 if(kind==='sun')sunSwap(s,steps,b,a);
 else if(kind==='combo')comboSwap(s,steps,b,a);
 else cascade(s,steps,{moved:[b,a]});
 settle(s,steps);
 return {ok:true,kind,steps};
}
function settle(s,steps){
 if(puzzleGoalMet(s)){s.phase='won';s.bonus=s.movesLeft*PUZZLE.moveBonus;s.score+=s.bonus;steps.push({type:'bonus',moves:s.movesLeft,gained:s.bonus});}
 else if(s.movesLeft<=0)s.phase=s.def.attack?'won':'lost';
 else if(!findHint(s)){shuffle(s);steps.push({type:'shuffle',cells:s.cells.map(copyCell)});}
 if(s.phase!=='play')steps.push({type:'end',phase:s.phase,stars:puzzleStars(s),score:s.score});
}
// 햇살 씨앗: 보통 씨앗과 바꾸면 그 법칙 전부, 특수 씨앗과 바꾸면 그 법칙이 전부 같은 특수 씨앗이 되어 터지고, 햇살끼리는 판 전체.
function sunSwap(s,steps,sunAt,otherAt){
 let sun=sunAt,other=otherAt;if(s.cells[sun].sp!=='sun')[sun,other]=[other,sun];
 const o=s.cells[other],effects=[];let forced=[sun,other];
 if(o.sp==='sun'){forced=gemCells(s);effects.push({kind:'sun',law:null,i:sun,cells:forced,big:true});}
 else if(!o.sp){forced.push(...gemCells(s,o.law));effects.push({kind:'sun',law:o.law,i:sun,cells:[...forced]});}
 else{const targets=gemCells(s,o.law);let flip=false;
  for(const i of targets)if(!s.cells[i].sp){s.cells[i]={...s.cells[i],sp:o.sp,dir:(flip=!flip)?'h':'v',...(o.sp==='fusion'?{law2:o.law2}:{})};}
  forced.push(...targets);effects.push({kind:'sun',law:o.law,i:sun,cells:targets,infuse:o.sp});}
 s.cells[sun].spent=true;if(o.sp==='sun')o.spent=true;
 cascade(s,steps,{forced,effects,label:'햇살'});
}
// 특수 씨앗끼리: 두 법칙 모양을 크게 합친다. 이름은 도감의 조합 이름.
function comboSwap(s,steps,center,other){
 const x=s.cells[center],y=s.cells[other],laws=[...new Set([x.law,x.law2,y.law,y.law2].filter(Boolean))],cells=new Set([center,other]);
 x.spent=y.spent=true;
 for(const law of laws){const dir=law===x.law?x.dir:y.dir;for(const j of shape(s,law,center,{dir,big:true}))cells.add(j);afterShape(s,law,center,{big:true});}
 // 관통끼리는 가로와 세로 모두.
 if(x.law==='pierce'&&y.law==='pierce')for(const j of shape(s,'pierce',center,{dir:x.dir==='h'?'v':'h',big:true}))cells.add(j);
 const form=puzzleComboForm(x.law,y.law);
 cascade(s,steps,{forced:[...cells],effects:[{kind:'combo',law:x.law,law2:y.law,i:center,cells:[...cells],big:true,name:form?.name||null,form:form?.id||null}],label:form?.name||'조합'});
}

// ── 재현: 같은 단계·시드·이동 기록이면 같은 점수.
export function replayPuzzle(def,seed,moves){
 const s=createPuzzle(def,seed);
 for(const m of Array.isArray(moves)?moves:[]){if(s.phase!=='play'||!Array.isArray(m))break;if(!playPuzzleMove(s,m[0],m[1]).ok)return null;}
 return s;
}

// ── 진행 저장. 햇살 보상은 첫 깨기와 새 별에만.
// 계정 동기화(cloud-save SYNC_KEYS)는 서버 규칙이 필요해 아직 붙이지 않았다 → 이 기기에, 계정(uid)마다 따로 둔다.
// 그래야 한 기기를 두 계정이 써도 서로의 별 때문에 첫 깨기 햇살을 못 받는 일이 없다.
export const PUZZLE_SAVE_KEY='seed-puzzle-v1';
export const puzzleSaveKey=(owner='guest')=>`${PUZZLE_SAVE_KEY}:${encodeURIComponent(owner||'guest')}`;
export const PUZZLE_JP=Object.freeze({firstClear:n=>100+20*n,newStar:50,daily:100});
export function normalizePuzzleProgress(raw){
 const out={version:1,stages:{},daily:{day:'',best:0,stars:0,rewarded:false}};
 if(!raw||typeof raw!=='object')return out;
 for(const def of PUZZLE_STAGES){const v=raw.stages?.[def.id];if(!v||typeof v!=='object')continue;
  const best=Number.isFinite(v.best)?Math.max(0,Math.min(1e7,Math.floor(v.best))):0,stars=Number.isInteger(v.stars)?Math.max(0,Math.min(3,v.stars)):0,clears=Number.isInteger(v.clears)?Math.max(0,Math.min(1e6,v.clears)):0;
  out.stages[def.id]={best,stars,clears};}
 const d=raw.daily;if(d&&typeof d==='object'&&/^\d{8}$/.test(d.day||''))out.daily={day:d.day,best:Number.isFinite(d.best)?Math.max(0,Math.min(1e7,Math.floor(d.best))):0,stars:Number.isInteger(d.stars)?Math.max(0,Math.min(3,d.stars)):0,rewarded:d.rewarded===true};
 return out;
}
export function readPuzzleProgress(storage,owner){try{return normalizePuzzleProgress(JSON.parse(storage?.getItem(puzzleSaveKey(owner))||'null'));}catch{return normalizePuzzleProgress(null);}}
export function writePuzzleProgress(storage,p,owner){const next=normalizePuzzleProgress(p);try{storage?.setItem(puzzleSaveKey(owner),JSON.stringify(next));return true;}catch{return false;}}
export function puzzleUnlocked(progress,def){if(def.daily)return true;if(def.n<=1)return true;return (progress.stages[`s${def.n-1}`]?.stars||0)>0;}
// 판이 끝났을 때 진행을 갱신하고 이번에 줄 햇살을 센다(같은 결과를 두 번 넣어도 두 번 주지 않는다).
export function recordPuzzleResult(progress,s){
 const p=normalizePuzzleProgress(progress),stars=puzzleStars(s);let jp=0;const notes=[];
 if(s.def.daily){
  if(p.daily.day!==s.def.daily)p.daily={day:s.def.daily,best:0,stars:0,rewarded:false};
  p.daily.best=Math.max(p.daily.best,s.score);p.daily.stars=Math.max(p.daily.stars,stars);
  if(stars>0&&!p.daily.rewarded){p.daily.rewarded=true;jp+=PUZZLE_JP.daily;notes.push('오늘의 단계 첫 별');}
  return {progress:p,jp,notes,stars};
 }
 const prev=p.stages[s.def.id]||{best:0,stars:0,clears:0};
 // 첫 별은 첫 깨기 보상에 들어 있다. 그 위의 별은 처음 얻을 때 하나씩.
 if(stars>0){if(!prev.stars){jp+=PUZZLE_JP.firstClear(s.def.n);notes.push('첫 깨기');}const more=Math.max(0,stars-Math.max(1,prev.stars));if(more){jp+=more*PUZZLE_JP.newStar;notes.push(`새 별 ${more}개`);}}
 p.stages[s.def.id]={best:Math.max(prev.best,s.phase==='won'?s.score:0),stars:Math.max(prev.stars,stars),clears:prev.clears+(stars>0?1:0)};
 return {progress:p,jp,notes,stars};
}
