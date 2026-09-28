import assert from 'node:assert/strict';
import {PUZZLE,PUZZLE_STAGES,PUZZLE_STAGE_BY_ID,PUZZLE_LAW_IDS,PUZZLE_JP,createPuzzle,findMatches,findHint,playPuzzleMove,swapKind,puzzleShapeCells,puzzleComboForm,puzzleGoalState,puzzleStars,replayPuzzle,
 dailyPuzzleStage,seoulDay,puzzleSaveKey,normalizePuzzleProgress,readPuzzleProgress,writePuzzleProgress,recordPuzzleResult,puzzleUnlocked} from '../src/seed-puzzle-rules.js';
import {measure} from './seed-puzzle-simulation.mjs';

const N=8,at=(r,c)=>r*N+c;
const S1=PUZZLE_STAGE_BY_ID.s1;
// 판 그리기: 글자 a~f = 판 법칙 순서, '.' = 맞춤이 생기지 않는 바탕, '#' = 돌. 대문자 = 법칙 씨앗(4개 맞춤 모양, 가로).
function board(rows,{def={...S1,colors:6},laws=['burst','chain','frost','gravity','pierce','reflect']}={}){
 const s=createPuzzle(def,9);s.laws=[...laws];s.stone.fill(0);s.moss.fill(0);
 for(let r=0;r<N;r++)for(let c=0;c<N;c++){
  const ch=rows[r][c],i=at(r,c);
  if(ch==='#'){s.stone[i]=1;s.cells[i]=null;continue;}
  const k=ch==='.'?(r*2+c+(c>=4?1:0)*3)%6:'abcdef'.indexOf(ch.toLowerCase());
  s.cells[i]={id:s.nextId++,law:laws[(k+6)%6],sp:ch!=='.'&&ch===ch.toUpperCase()?'law':null,...(ch!=='.'&&ch===ch.toUpperCase()?{dir:'h'}:{})};
 }
 return s;
}
const blank=Array(8).fill('........');
const put=(rows,r,str,c=0)=>{const out=[...rows];out[r]=out[r].slice(0,c)+str+out[r].slice(c+str.length);return out;};
const firstClear=res=>res.steps.find(x=>x.type==='clear');

// 바탕 판에는 맞춤이 없다.
{const s=board(blank);assert.equal(findMatches(s).length,0,'blank board has no match');}

// 새 판: 맞춤 없이 시작하고, 둘 수 있는 수가 있고, 필요한 법칙이 들어 있다.
for(const def of [...PUZZLE_STAGES,dailyPuzzleStage('20260928')])for(let seed=1;seed<=25;seed++){
 const s=createPuzzle(def,seed);
 assert.equal(findMatches(s).length,0,`${def.id} ${seed} starts without matches`);assert.ok(findHint(s),`${def.id} ${seed} has a move`);
 assert.equal(s.laws.length,def.colors);for(const l of def.require)assert.ok(s.laws.includes(l));
 for(const i of def.stones)assert.ok(s.stone[i]>0&&!s.cells[i]);for(const i of def.moss)assert.equal(s.moss[i],1);
}

// 3개 맞춤: 바꾸면 그 셋이 터지고, 위 씨앗이 내려오고, 이동 수가 준다.
{let rows=put(blank,5,'aa',0);rows=put(rows,4,'a',2);rows=put(rows,5,'b',2);
 const s=board(rows);const above=s.cells[at(3,2)].id,moves=s.movesLeft;
 assert.equal(swapKind(s,at(4,2),at(5,2)),'match');
 const res=playPuzzleMove(s,at(4,2),at(5,2));assert.ok(res.ok);assert.equal(s.movesLeft,moves-1);
 const clear=firstClear(res);assert.deepEqual(clear.cleared.map(c=>c.i).sort((a,b)=>a-b),[at(5,0),at(5,1),at(5,2)]);assert.equal(clear.gained,3*PUZZLE.cellScore);
 const fall=res.steps.find(x=>x.type==='fall');assert.ok(fall.moves.some(m=>m.id===above&&m.to===at(4,2)),'gem above falls into the gap');assert.equal(fall.spawns.length,3,'three new seeds drop in');
 assert.ok(s.cells.every(Boolean),'board refilled');}

// 안 맞는 바꾸기와 떨어진 칸은 되돌리고 이동 수를 쓰지 않는다.
{const s=board(blank),m=s.movesLeft;const r=playPuzzleMove(s,at(0,0),at(0,1));assert.equal(r.ok,false);assert.equal(s.movesLeft,m);assert.equal(r.steps[0].ok,false);
 assert.equal(playPuzzleMove(s,at(0,0),at(2,0)).ok,false);}

// 4개 한 줄 → 법칙 씨앗(바꾼 자리), 5개 한 줄 → 햇살, T·L → 융합(두 번째 법칙 = 바꿔 넣은 상대).
{let rows=put(blank,5,'aa',0);rows=put(rows,5,'ba',2);rows=put(rows,4,'a',2);
 const s=board(rows);const res=playPuzzleMove(s,at(4,2),at(5,2));const c=firstClear(res).created;
 assert.equal(c.length,1);assert.equal(c[0].i,at(5,2));assert.equal(c[0].cell.sp,'law');assert.equal(c[0].cell.law,'burst');assert.equal(c[0].cell.dir,'h');}
{let rows=put(blank,5,'aabaa',0);rows=put(rows,4,'a',2);
 const s=board(rows);const res=playPuzzleMove(s,at(4,2),at(5,2));const c=firstClear(res).created;
 assert.equal(c[0].cell.sp,'sun');assert.equal(c[0].cell.law,null);}
{let rows=put(blank,5,'aab',0);rows=put(rows,6,'..a',0);rows=put(rows,7,'..a',0);rows=put(rows,4,'..a',0);
 const s=board(rows);const res=playPuzzleMove(s,at(4,2),at(5,2));const c=firstClear(res).created;
 assert.equal(c[0].cell.sp,'fusion');assert.equal(c[0].cell.law,'burst');assert.equal(c[0].cell.law2,'chain');}

// 법칙마다 터지는 모양.
{const s=board(blank),mid=at(3,3),count=(law,o)=>puzzleShapeCells(s,law,mid,o).length;
 assert.equal(count('burst'),9);assert.equal(count('burst',{big:true}),25);
 assert.equal(count('pierce',{dir:'h'}),8);assert.ok(puzzleShapeCells(s,'pierce',mid,{dir:'v'}).every(i=>i%N===3));
 assert.equal(count('frost'),9);assert.equal(count('gravity'),13);assert.equal(count('orbit'),17);
 assert.equal(count('reflect'),14);assert.equal(count('recall'),8);
 s.cells[mid].law='chain';const chain=puzzleShapeCells(s,'chain',mid);assert.equal(chain.length,6);assert.ok(chain.every(i=>s.cells[i].law==='chain'));
 assert.ok(count('split')>=4&&count('split')<=16);}

// 특수 씨앗이 맞춤에 끼면 터진다(폭발 3×3).
{let rows=put(blank,5,'aA',0);rows=put(rows,4,'a',2);rows=put(rows,5,'b',2);
 const s=board(rows);const res=playPuzzleMove(s,at(4,2),at(5,2));const cl=firstClear(res).cleared.map(c=>c.i);
 for(const i of [at(4,0),at(4,1),at(4,2),at(6,0),at(6,1),at(6,2)])assert.ok(cl.includes(i),'burst clears around');
 assert.ok(firstClear(res).effects.some(e=>e.kind==='law'&&e.law==='burst'));}

// 귀환은 채워진 뒤 같은 열을 한 번 더.
{let rows=put(blank,5,'eE',0);rows=put(rows,4,'e',2);rows=put(rows,5,'b',2);
 const s=board(rows);const res=playPuzzleMove(s,at(4,2),at(5,2));
 const clears=res.steps.filter(x=>x.type==='clear');assert.ok(clears.length>=1);}
{const laws=['burst','chain','frost','gravity','recall','reflect'];let rows=put(blank,5,'eE',0);rows=put(rows,4,'e',2);rows=put(rows,5,'b',2);
 const s=board(rows,{laws});const res=playPuzzleMove(s,at(4,2),at(5,2));const clears=res.steps.filter(x=>x.type==='clear');
 assert.ok(clears.length>=2,'recall returns in a later step');assert.ok(clears.slice(1).some(c=>c.effects.some(e=>e.kind==='return')),'return effect');
 assert.deepEqual(s.pendingRecall,[],'no recall left after the move');}

// 특수 씨앗끼리 바꾸면 조합 효과. 이름은 도감의 조합 이름이고 처음 쓴 조합이 남는다.
{assert.equal(puzzleComboForm('gravity','burst').name,'붕괴의 씨앗');assert.equal(puzzleComboForm('burst','burst').name,'불꽃 꽃다발');assert.equal(puzzleComboForm('burst','nope'),null);
 const laws=['burst','chain','frost','gravity','pierce','reflect'];let rows=put(blank,3,'AD',2);
 const s=board(rows,{laws});s.cells[at(3,3)].law='gravity';
 assert.equal(swapKind(s,at(3,2),at(3,3)),'combo');const res=playPuzzleMove(s,at(3,2),at(3,3));
 const e=firstClear(res).effects.find(x=>x.kind==='combo');assert.ok(e);assert.equal(e.name,'붕괴의 씨앗');assert.ok(s.combos.includes(puzzleComboForm('gravity','burst').id));
 assert.ok(firstClear(res).cleared.length>=25,'combo is big');}

// 햇살 + 보통 씨앗 = 그 법칙 전부. 햇살끼리 = 판 전체.
{const s=board(blank);s.cells[at(4,4)]={id:s.nextId++,law:null,sp:'sun'};const law=s.cells[at(4,5)].law,count=s.cells.filter(c=>c?.law===law).length;
 const res=playPuzzleMove(s,at(4,4),at(4,5));assert.ok(res.ok);const cl=firstClear(res);
 assert.ok(cl.cleared.filter(c=>c.law===law).length>=count,'every seed of that law');assert.ok(cl.effects.some(e=>e.kind==='sun'));}
{const s=board(blank);s.cells[at(4,4)]={id:s.nextId++,law:null,sp:'sun'};s.cells[at(4,5)]={id:s.nextId++,law:null,sp:'sun'};
 const res=playPuzzleMove(s,at(4,4),at(4,5));assert.equal(firstClear(res).cleared.length,64,'sun + sun clears the board');}
// 햇살 + 법칙 씨앗 = 그 법칙이 모두 법칙 씨앗이 되어 터진다.
{const s=board(blank);s.cells[at(4,4)]={id:s.nextId++,law:null,sp:'sun'};s.cells[at(4,5)]={...s.cells[at(4,5)],sp:'law',dir:'h'};
 const res=playPuzzleMove(s,at(4,4),at(4,5));assert.ok(firstClear(res).effects.filter(e=>e.kind==='law').length>=3);}

// 돌: 옆에서 맞추면 한 번 깎이고, 두 칸짜리 돌은 두 번. 깨진 칸도 다시 채워진다.
{let rows=put(blank,5,'aa',0);rows=put(rows,4,'a',2);rows=put(rows,5,'b',2);rows=put(rows,6,'#',1);
 const s=board(rows);s.stone[at(6,1)]=2;const res=playPuzzleMove(s,at(4,2),at(5,2));
 assert.equal(s.stone[at(6,1)],1,'adjacent match chips a stone once');assert.deepEqual(firstClear(res).stones,[{i:at(6,1),hp:1}]);}
{let rows=put(blank,5,'aa',0);rows=put(rows,4,'a',2);rows=put(rows,5,'b',2);rows=put(rows,6,'#',0);
 const s=board(rows);playPuzzleMove(s,at(4,2),at(5,2));assert.equal(s.stone[at(6,0)],0);assert.ok(s.cells[at(6,0)],'broken stone cell is refilled');}
// 돌은 떨어지지 않고, 돌 아래 칸은 돌 바로 밑에서 새로 채운다.
{let rows=put(blank,2,'#',1);rows=put(rows,5,'aa',0);rows=put(rows,4,'a',2);rows=put(rows,5,'b',2);
 const s=board(rows);const res=playPuzzleMove(s,at(4,2),at(5,2));assert.equal(s.stone[at(2,1)],1);assert.equal(s.cells[at(2,1)],null);
 assert.ok(res.steps.find(x=>x.type==='fall').spawns.some(p=>p.to%N===1&&p.fromRow>=2),'column under a stone refills below it');}

// 이끼는 그 칸이 터지면 걷힌다 → 목표.
{let rows=put(blank,5,'aa',0);rows=put(rows,4,'a',2);rows=put(rows,5,'b',2);
 const def={...S1,moss:[at(5,0),at(5,1)],goal:{moss:true},stars:[1e9,1e9]};const s=board(rows,{def});s.moss[at(5,0)]=s.moss[at(5,1)]=1;
 const res=playPuzzleMove(s,at(4,2),at(5,2));assert.deepEqual(firstClear(res).moss.sort(),[at(5,0),at(5,1)].sort());
 assert.equal(s.phase,'won');assert.equal(s.bonus,s.movesLeft*PUZZLE.moveBonus,'left moves become bonus');assert.equal(puzzleStars(s),1);
 assert.equal(res.steps.at(-1).type,'end');assert.equal(playPuzzleMove(s,0,1).ok,false,'finished board refuses moves');}
// 이동을 다 쓰면 진다(점수 도전은 그대로 끝).
{let rows=put(blank,5,'aa',0);rows=put(rows,4,'a',2);rows=put(rows,5,'b',2);
 const s=board(rows,{def:{...S1,goal:{score:1e9}}});s.movesLeft=1;playPuzzleMove(s,at(4,2),at(5,2));assert.equal(s.phase,'lost');assert.equal(puzzleStars(s),0);
 const d=board(rows,{def:dailyPuzzleStage('20260928')});d.movesLeft=1;playPuzzleMove(d,at(4,2),at(5,2));assert.equal(d.phase,'won');}
// 목표 표시.
{const s=createPuzzle(PUZZLE_STAGE_BY_ID.s10,3);const g=puzzleGoalState(s);assert.deepEqual(g.map(p=>p.kind),['score','moss','stone']);assert.ok(g.every(p=>p.have===0));}

// 재현: 같은 단계·시드·이동 기록이면 점수와 판이 같다.
{const s=createPuzzle(PUZZLE_STAGE_BY_ID.s6,77);for(let k=0;k<12&&s.phase==='play';k++){const h=findHint(s);playPuzzleMove(s,h[0],h[1]);}
 const r=replayPuzzle(PUZZLE_STAGE_BY_ID.s6,77,s.moves);assert.equal(r.score,s.score);assert.deepEqual(r.cells.map(c=>c&&c.law+c.sp),s.cells.map(c=>c&&c.law+c.sp));
 assert.equal(replayPuzzle(PUZZLE_STAGE_BY_ID.s6,77,[[0,63]]),null,'impossible record is rejected');}
// 오늘의 단계는 날짜로 같은 판.
{const a=dailyPuzzleStage('20260928'),b=dailyPuzzleStage('2026-09-28');assert.equal(a.id,b.id);assert.equal(seoulDay(Date.UTC(2026,8,27,16)),'20260928');
 assert.deepEqual(createPuzzle(a,a.seed).cells.map(c=>c.law),createPuzzle(b,b.seed).cells.map(c=>c.law));}

// 진행 저장·보상: 첫 깨기 + 새 별만, 같은 결과를 다시 넣으면 0.
{const mem=new Map(),storage={getItem:k=>mem.get(k)??null,setItem:(k,v)=>mem.set(k,v)};
 assert.deepEqual(normalizePuzzleProgress({stages:{s1:{best:-5,stars:9,clears:'x'},zz:{}},daily:{day:'bad'}}).stages,{s1:{best:0,stars:3,clears:0}});
 let p=readPuzzleProgress(storage,'u1');assert.equal(puzzleUnlocked(p,PUZZLE_STAGE_BY_ID.s2),false);assert.equal(puzzleUnlocked(p,PUZZLE_STAGE_BY_ID.s1),true);
 const fake=(def,score,phase='won')=>({def,score,phase});
 let r=recordPuzzleResult(p,fake(S1,4500));assert.equal(r.stars,2);assert.equal(r.jp,PUZZLE_JP.firstClear(1)+PUZZLE_JP.newStar);p=r.progress;
 r=recordPuzzleResult(p,fake(S1,4500));assert.equal(r.jp,0,'no double reward');
 r=recordPuzzleResult(p,fake(S1,9000));assert.equal(r.jp,PUZZLE_JP.newStar);p=r.progress;assert.equal(p.stages.s1.stars,3);assert.equal(p.stages.s1.clears,2);
 r=recordPuzzleResult(p,fake(S1,100,'lost'));assert.equal(r.jp,0);assert.equal(r.progress.stages.s1.best,9000);
 assert.ok(writePuzzleProgress(storage,p,'u1'));assert.ok(mem.has(puzzleSaveKey('u1')));assert.equal(readPuzzleProgress(storage,'u2').stages.s1,undefined,'accounts keep separate progress');p=readPuzzleProgress(storage,'u1');assert.equal(puzzleUnlocked(p,PUZZLE_STAGE_BY_ID.s2),true);assert.equal(puzzleUnlocked(p,PUZZLE_STAGE_BY_ID.s3),false);
 const d=dailyPuzzleStage('20260928');r=recordPuzzleResult(p,fake(d,6000));assert.equal(r.jp,PUZZLE_JP.daily);r=recordPuzzleResult(r.progress,fake(d,13000));assert.equal(r.jp,0);assert.equal(r.progress.daily.stars,3);
 r=recordPuzzleResult(r.progress,fake(dailyPuzzleStage('20260929'),6000));assert.equal(r.jp,PUZZLE_JP.daily,'next day rewards again');
 assert.ok(PUZZLE_LAW_IDS.length===9);}

// 난이도 지킴이(짧게): 한 수 앞을 보는 사람은 앞 단계를 거의 다 깨고, 어느 단계도 막히지 않는다.
// 자세한 측정: node tools/seed-puzzle-simulation.mjs 20
for(const def of PUZZLE_STAGES){const g=measure(def,4,'greedy');assert.ok(def.n<=5?g.rate>=.75:g.rate>=.25,`${def.id} greedy win ${g.rate}`);}
console.log('seed puzzle rules ok');
