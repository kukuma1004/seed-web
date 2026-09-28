import assert from 'node:assert/strict';
import {PUZZLE,PUZZLE_STAGES,PUZZLE_STAGE_BY_ID,PUZZLE_LAW_IDS,PUZZLE_JP,PUZZLE_SHOP,createPuzzle,findMatches,findHint,playPuzzleMove,tapPuzzle,usePuzzleTool,continuePuzzle,giveUpPuzzle,
 puzzleContinuePrice,swapKind,canTap,puzzlePowerCells,puzzleComboForm,puzzleGoalLeft,puzzleStars,replayPuzzle,puzzleStreakGift,
 dailyPuzzleStage,seoulDay,puzzleSaveKey,normalizePuzzleProgress,readPuzzleProgress,writePuzzleProgress,recordPuzzleResult,puzzleUnlocked,breakPuzzleStreak} from '../src/seed-puzzle-rules.js';
import {measure} from './seed-puzzle-simulation.mjs';

const N=8,at=(r,c)=>r*N+c;
const S1=PUZZLE_STAGE_BY_ID.s1,LAWS6=['burst','chain','frost','gravity','pierce','reflect'];
// 판 그리기: a~f = 판 법칙 순서, '.' = 맞춤이 생기지 않는 바탕, '#' 구멍, '1'~'3' 돌, P/Q 관통(가로/세로) · C 연쇄 · B 폭발 · S 햇살.
function board(rows,{def={...S1,colors:6,goal:{score:1e9}},laws=LAWS6,vines=[],moss=[]}={}){
 const s=createPuzzle(def,9);s.laws=[...laws];s.stone.fill(0);s.moss.fill(0);s.hole.fill(0);s.vine.fill(0);
 for(let r=0;r<N;r++)for(let c=0;c<N;c++){
  const ch=rows[r][c],i=at(r,c);s.cells[i]=null;
  if(ch==='#'){s.hole[i]=1;continue;}if('123'.includes(ch)){s.stone[i]=Number(ch);continue;}
  const power={P:['pierce','h'],Q:['pierce','v'],C:['chain'],B:['burst'],S:['sun']}[ch];
  if(power){s.cells[i]={id:s.nextId++,law:null,sp:power[0],...(power[1]?{dir:power[1]}:{})};continue;}
  const k=ch==='.'?(r*2+c+(c>=4?1:0)*3)%6:'abcdef'.indexOf(ch);
  s.cells[i]={id:s.nextId++,law:laws[(k+6)%6],sp:null};
 }
 for(const i of vines)s.vine[i]=1;for(const i of moss)s.moss[i]=1;
 return s;
}
const blank=Array(8).fill('........');
const put=(rows,r,str,c=0)=>{const out=[...rows];out[r]=out[r].slice(0,c)+str+out[r].slice(c+str.length);return out;};
const firstClear=res=>res.steps.find(x=>x.type==='clear');
const three=()=>{let rows=put(blank,5,'aa',0);rows=put(rows,4,'a',2);return put(rows,5,'b',2);};

{const s=board(blank);assert.equal(findMatches(s).length,0,'blank board has no match');}

// 단계 30개 + 오늘의 단계: 판 모양이 맞고, 맞춤 없이 시작하고, 둘 수 있는 수가 있다.
assert.ok(PUZZLE_STAGES.length>=30);
for(const def of [...PUZZLE_STAGES,dailyPuzzleStage('20260928')]){
 assert.equal(def.map.length,8,def.id);assert.ok(def.map.every(r=>r.length===8&&/^[.#m123vV]+$/.test(r)),`${def.id} map`);
 assert.ok(def.stars.length>=2&&def.stars[0]<def.stars[1],`${def.id} stars`);
 for(let seed=1;seed<=8;seed++){
  const s=createPuzzle(def,seed);
  assert.equal(findMatches(s).length,0,`${def.id} ${seed} starts without matches`);assert.ok(findHint(s),`${def.id} ${seed} has a move`);
  assert.equal(s.laws.length,def.colors);for(const l of def.require)assert.ok(s.laws.includes(l));
  for(const i of def.hole)assert.ok(s.hole[i]&&!s.cells[i]);for(const {i,hp} of def.stones)assert.ok(s.stone[i]===hp&&!s.cells[i]);for(const i of def.vines)assert.ok(s.vine[i]&&s.cells[i]);
 }
}

// 3개 맞춤: 셋이 터지고, 위 씨앗이 내려오고, 이동 수가 준다.
{const s=board(three());const above=s.cells[at(3,2)].id,moves=s.movesLeft;
 assert.equal(swapKind(s,at(4,2),at(5,2)),'match');
 const res=playPuzzleMove(s,at(4,2),at(5,2));assert.ok(res.ok);assert.equal(s.movesLeft,moves-1);
 const clear=firstClear(res);assert.deepEqual(clear.cleared.map(c=>c.i).sort((a,b)=>a-b),[at(5,0),at(5,1),at(5,2)]);assert.equal(clear.gained,3*PUZZLE.cellScore);
 const fall=res.steps.find(x=>x.type==='fall');assert.ok(fall.moves.some(m=>m.id===above&&m.to===at(4,2)));assert.equal(fall.spawns.length,3);
 assert.deepEqual(s.log,[['s',at(4,2),at(5,2)]]);}
// 안 맞는 바꾸기는 이동 수를 쓰지 않는다.
{const s=board(blank),m=s.movesLeft;const r=playPuzzleMove(s,at(0,0),at(0,1));assert.equal(r.ok,false);assert.equal(s.movesLeft,m);assert.equal(playPuzzleMove(s,at(0,0),at(2,0)).ok,false);}

// 모양 → 특수 씨앗: 넷 한 줄 = 관통(수직 방향), 2×2 = 연쇄, T·L = 폭발, 다섯 한 줄 = 햇살.
const made=rows=>{const s=board(rows);return firstClear(playPuzzleMove(s,at(4,2),at(5,2))).created;};
{let rows=put(blank,5,'aaba',0);rows=put(rows,4,'a',2);const c=made(rows);assert.equal(c.length,1);assert.equal(c[0].i,at(5,2));assert.equal(c[0].cell.sp,'pierce');assert.equal(c[0].cell.dir,'v');assert.equal(c[0].cell.law,null);}
{let rows=put(blank,5,'ab',1);rows=put(rows,6,'aa',1);rows=put(rows,4,'a',2);assert.equal(made(rows)[0].cell.sp,'chain','square makes chain');}
{let rows=put(blank,5,'aab',0);rows=put(rows,6,'..a',0);rows=put(rows,7,'..a',0);rows=put(rows,4,'..a',0);assert.equal(made(rows)[0].cell.sp,'burst');}
{let rows=put(blank,5,'aabaa',0);rows=put(rows,4,'a',2);assert.equal(made(rows)[0].cell.sp,'sun');}
// 특수 씨앗은 색이 없어 맞춰지지 않는다.
{const s=board(put(blank,3,'aPa',0));assert.ok(!findMatches(s).some(g=>g.cells.has(at(3,1))));}

// 덮는 칸.
{const s=board(blank),mid=at(3,3);
 assert.equal(puzzlePowerCells(s,'pierce',mid,{dir:'h'}).length,8);assert.ok(puzzlePowerCells(s,'pierce',mid,{dir:'v'}).every(i=>i%N===3));
 assert.equal(puzzlePowerCells(s,'burst',mid).length,25);assert.equal(puzzlePowerCells(s,'chain',mid).length,6,'plus + one flight');
 assert.ok(puzzlePowerCells(s,'sun',mid).length>=10);}

// 누르기: 특수 씨앗만, 이동 1.
{const s=board(put(blank,3,'P',3)),m=s.movesLeft;assert.ok(canTap(s,at(3,3)));assert.equal(canTap(s,at(0,0)),false);
 const res=tapPuzzle(s,at(3,3));assert.ok(res.ok);assert.equal(s.movesLeft,m-1);assert.ok(firstClear(res).cleared.filter(c=>Math.floor(c.i/N)===3).length>=8);
 assert.equal(tapPuzzle(s,at(0,0)).ok,false);}
// 특수 씨앗을 아무 이웃과 바꾸면 터진다(맞춤이 없어도).
{const s=board(put(blank,3,'B',3));assert.equal(swapKind(s,at(3,3),at(3,4)),'power');const res=playPuzzleMove(s,at(3,3),at(3,4));assert.ok(firstClear(res).cleared.length>=20);}
// 햇살 + 보통 = 그 법칙 전부.
{const s=board(put(blank,4,'S',4));const law=s.cells[at(4,5)].law,count=s.cells.filter(c=>c?.law===law).length;
 const cl=firstClear(playPuzzleMove(s,at(4,4),at(4,5)));assert.ok(cl.cleared.filter(c=>c.law===law).length>=count);assert.ok(cl.effects.some(e=>e.kind==='sun'&&e.law===law));}
// 조합: 이름은 도감 이름, 처음 쓴 조합이 남는다.
{assert.equal(puzzleComboForm('burst','burst').name,'불꽃 꽃다발');assert.equal(puzzleComboForm('burst','nope'),null);
 const combo=(a,b)=>{const s=board(put(blank,3,a+b,2));assert.equal(swapKind(s,at(3,2),at(3,3)),'combo');const cl=firstClear(playPuzzleMove(s,at(3,2),at(3,3)));return {s,cl,fx:cl.effects.find(e=>e.kind==='combo')};};
 {const {cl,fx,s}=combo('B','B');assert.ok(cl.cleared.length>=60,'burst+burst 9x9');assert.equal(fx.name,'불꽃 꽃다발');assert.ok(s.combos.includes(fx.form));}
 {const {cl}=combo('P','B');assert.equal(new Set(cl.cleared.map(c=>Math.floor(c.i/N))).size,8);assert.equal(cl.cleared.length,39,'pierce+burst 3 rows 3 cols');}
 {const {cl}=combo('P','Q');assert.ok(cl.cleared.length>=15);}
 {const {fx}=combo('C','C');assert.equal(fx.flights.length,3);}
 {const {fx}=combo('C','B');assert.equal(fx.flights[0].carry,'burst');}
 {const {cl}=combo('S','S');assert.equal(cl.cleared.length,64);}
 {const {cl}=combo('S','P');assert.ok(cl.effects.filter(e=>e.kind==='pierce').length>=4,'sun turns a law into piercers');}}
// 연쇄 씨앗은 남은 목표로 날아간다.
{const s=board(put(put(blank,3,'C',1),7,'2',7));const fx=firstClear(tapPuzzle(s,at(3,1))).effects.find(e=>e.kind==='chain');assert.equal(fx.flights[0].to,at(7,7));assert.equal(s.stone[at(7,7)],1);}

// 돌: 맞춤 옆에서 한 겹. 돌 칸은 비고, 깨지면 다시 채운다.
{const s=board(put(three(),6,'2',1));const res=playPuzzleMove(s,at(4,2),at(5,2));assert.equal(s.stone[at(6,1)],1);assert.deepEqual(firstClear(res).stones,[{i:at(6,1),hp:1}]);}
{const s=board(put(three(),6,'1',0));playPuzzleMove(s,at(4,2),at(5,2));assert.equal(s.stone[at(6,0)],0);assert.ok(s.cells[at(6,0)]);}
// 구멍은 비어 있고, 구멍 아래는 바로 밑에서 채운다.
{const s=board(put(three(),2,'#',1));const res=playPuzzleMove(s,at(4,2),at(5,2));assert.equal(s.cells[at(2,1)],null);
 assert.ok(res.steps.find(x=>x.type==='fall').spawns.some(p=>p.to%N===1&&p.fromRow>=2));}
// 덩굴: 묶인 씨앗은 못 움직인다. 맞춤에 끼면 덩굴만 풀리고 씨앗은 남는다.
{const s=board(three(),{vines:[at(5,0)]});assert.equal(swapKind(s,at(5,0),at(4,0)),null);assert.match(playPuzzleMove(s,at(5,0),at(4,0)).reason,/덩굴/);
 const id=s.cells[at(5,0)].id;const res=playPuzzleMove(s,at(4,2),at(5,2));assert.equal(s.vine[at(5,0)],0);assert.deepEqual(firstClear(res).vines,[at(5,0)]);assert.equal(s.cells[at(5,0)].id,id,'vined seed stays');}
// 이끼는 그 칸이 터지면 걷힌다 → 목표 → 남은 이동은 보너스.
{const def={...S1,moss:[at(5,0),at(5,1)],goal:{moss:true},stars:[1e9,1e9]};const s=board(three(),{def,moss:[at(5,0),at(5,1)]});
 playPuzzleMove(s,at(4,2),at(5,2));assert.equal(s.phase,'won');assert.equal(s.bonus,s.movesLeft*PUZZLE.moveBonus);assert.equal(puzzleStars(s),1);}

// 이동을 다 쓰면 +5 이동(두 번까지) → 그다음은 진다. 포기하면 바로 진다.
{const s=board(three());s.movesLeft=1;const r=playPuzzleMove(s,at(4,2),at(5,2));
 assert.equal(s.phase,'out');assert.equal(r.steps.at(-1).type,'out');assert.equal(puzzleContinuePrice(s),PUZZLE_SHOP.more[0]);assert.ok(puzzleGoalLeft(s)>.9);
 assert.equal(playPuzzleMove(s,0,1).ok,false);assert.ok(continuePuzzle(s).ok);assert.equal(s.movesLeft,PUZZLE.extraMoves);assert.equal(s.phase,'play');
 s.movesLeft=1;let h=findHint(s);playPuzzleMove(s,h[0],h[1]);assert.equal(s.phase,'out');assert.equal(puzzleContinuePrice(s),PUZZLE_SHOP.more[1]);continuePuzzle(s);
 s.movesLeft=1;h=findHint(s);playPuzzleMove(s,h[0],h[1]);assert.equal(s.phase,'lost','third time is final');assert.equal(continuePuzzle(s).ok,false);}
{const s=board(three());s.movesLeft=1;playPuzzleMove(s,at(4,2),at(5,2));assert.ok(giveUpPuzzle(s).ok);assert.equal(s.phase,'lost');}
{const d=board(three(),{def:dailyPuzzleStage('20260928')});d.movesLeft=1;playPuzzleMove(d,at(4,2),at(5,2));assert.equal(d.phase,'won','score attack just ends');}

// 도구: 이동을 쓰지 않는다.
{const s=board(blank),m=s.movesLeft;assert.ok(usePuzzleTool(s,'row',at(2,0)).ok);assert.equal(s.movesLeft,m);assert.equal(s.tools,1);
 const t=board(put(blank,4,'2',4));usePuzzleTool(t,'hammer',at(4,4));assert.equal(t.stone[at(4,4)],1);
 const u=board(blank);assert.equal(firstClear(usePuzzleTool(u,'col',at(0,3))).cleared.filter(c=>c.i%N===3).length,8);
 const v=board(blank);assert.equal(usePuzzleTool(v,'shuffle').steps[0].type,'shuffle');assert.equal(usePuzzleTool(v,'nope',0).ok,false);}

// 부스터·연승 선물: 시작할 때 특수 씨앗이 깔린다(묶인 칸에는 안 깐다).
{assert.deepEqual(puzzleStreakGift(0),[]);assert.deepEqual(puzzleStreakGift(2),['pierce','chain']);assert.deepEqual(puzzleStreakGift(9),['pierce','chain','burst']);
 const s=createPuzzle(PUZZLE_STAGE_BY_ID.s12,4,['pierce','burst','sun']);assert.deepEqual(s.cells.filter(c=>c?.sp).map(c=>c.sp).sort(),['burst','pierce','sun']);
 assert.ok(s.cells.every((c,i)=>!c?.sp||!s.vine[i]));}

// 재현: 같은 단계·시드·부스터·기록이면 점수와 판이 같다(누르기·도구 포함).
{const def=PUZZLE_STAGE_BY_ID.s7,boosters=['pierce','chain'];const s=createPuzzle(def,77,boosters);
 for(let k=0;k<10&&s.phase==='play';k++){const tap=s.cells.findIndex((c,i)=>c?.sp&&canTap(s,i));if(k%3===1&&tap>=0)tapPuzzle(s,tap);else if(k===5)usePuzzleTool(s,'hammer',at(4,4));else{const h=findHint(s);playPuzzleMove(s,h[0],h[1]);}}
 const r=replayPuzzle(def,77,boosters,s.log);assert.equal(r.score,s.score);assert.deepEqual(r.cells.map(c=>c&&c.law+c.sp),s.cells.map(c=>c&&c.law+c.sp));
 assert.equal(replayPuzzle(def,77,boosters,[['s',0,63]]),null);assert.equal(replayPuzzle(def,77,boosters,[['x']]),null);}
{const a=dailyPuzzleStage('20260928'),b=dailyPuzzleStage('2026-09-28');assert.equal(a.id,b.id);assert.equal(seoulDay(Date.UTC(2026,8,27,16)),'20260928');
 assert.deepEqual(createPuzzle(a,a.seed).cells.map(c=>c.law),createPuzzle(b,b.seed).cells.map(c=>c.law));}

// 진행 저장·보상·연승.
{const mem=new Map(),storage={getItem:k=>mem.get(k)??null,setItem:(k,v)=>mem.set(k,v)};
 assert.deepEqual(normalizePuzzleProgress({stages:{s1:{best:-5,stars:9,clears:'x'},zz:{}},daily:{day:'bad'},streak:-3}).stages,{s1:{best:0,stars:3,clears:0}});
 let p=readPuzzleProgress(storage,'u1');assert.equal(puzzleUnlocked(p,PUZZLE_STAGE_BY_ID.s2),false);assert.equal(puzzleUnlocked(p,S1),true);
 const fake=(def,score,phase='won')=>({def,score,phase});const [a,b]=S1.stars;
 let r=recordPuzzleResult(p,fake(S1,a));assert.equal(r.stars,2);assert.equal(r.jp,PUZZLE_JP.firstClear(1)+PUZZLE_JP.newStar);p=r.progress;assert.equal(p.streak,1);
 r=recordPuzzleResult(p,fake(S1,a));assert.equal(r.jp,0,'no double reward');
 r=recordPuzzleResult(p,fake(S1,b));assert.equal(r.jp,PUZZLE_JP.newStar);p=r.progress;assert.equal(p.stages.s1.stars,3);assert.equal(p.streak,2);assert.ok(r.notes.includes('2연승'));
 r=recordPuzzleResult(p,fake(S1,100,'lost'));assert.equal(r.jp,0);assert.equal(r.progress.streak,0,'loss breaks the streak');assert.equal(r.progress.bestStreak,2);assert.equal(r.progress.stages.s1.best,b);
 assert.equal(breakPuzzleStreak(p).streak,0);
 assert.ok(writePuzzleProgress(storage,p,'u1'));assert.ok(mem.has(puzzleSaveKey('u1')));assert.equal(readPuzzleProgress(storage,'u2').stages.s1,undefined,'accounts keep separate progress');
 p=readPuzzleProgress(storage,'u1');assert.equal(puzzleUnlocked(p,PUZZLE_STAGE_BY_ID.s2),true);assert.equal(puzzleUnlocked(p,PUZZLE_STAGE_BY_ID.s3),false);
 const d=dailyPuzzleStage('20260928');r=recordPuzzleResult(p,fake(d,d.stars[0]));assert.equal(r.jp,PUZZLE_JP.daily);assert.equal(r.progress.streak,p.streak,'daily does not touch the streak');
 r=recordPuzzleResult(r.progress,fake(d,d.stars[2]));assert.equal(r.jp,0);assert.equal(r.progress.daily.stars,3);
 r=recordPuzzleResult(r.progress,fake(dailyPuzzleStage('20260929'),d.stars[0]));assert.equal(r.jp,PUZZLE_JP.daily,'next day rewards again');
 assert.ok(PUZZLE_LAW_IDS.length===9);}

// 난이도 지킴이(짧게): 가르치는 앞 단계는 한 수 앞을 보는 사람이 다 깨고, 뒤 단계도 +5 이동 두 번이면 대부분 깬다.
// 자세한 측정: node tools/seed-puzzle-simulation.mjs 20
if(process.env.SKIP_BALANCE!=='1')for(const def of PUZZLE_STAGES.filter(d=>d.n<=4||d.n%6===0||d.n===30)){const g=measure(def,4,'greedy',{continues:2});assert.ok(def.n<=4?g.rate>=.75:g.plus>=.5,`${def.id} greedy ${g.rate} / +5 ${g.plus}`);}
console.log('seed puzzle rules ok');
