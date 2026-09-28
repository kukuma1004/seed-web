// 씨앗 맞추기 단계 난이도 측정: 보통(절반은 좋은 수·절반은 아무 수 — 사람 대신 보정용)과 욕심쟁이(한 수 앞을 보고 목표에 가장 가까운 수).
// 로열 매치처럼 "아깝게 진 판"이 많도록 맞춘다 → 진 판이 목표를 얼마나 남겼는지(near)와 +5 이동을 샀을 때 깨는 비율(plus)도 잰다.
// node tools/seed-puzzle-simulation.mjs [판 수] [단계 id,...]
import {PUZZLE_STAGES,createPuzzle,playPuzzleMove,tapPuzzle,continuePuzzle,swapKind,canTap,puzzleGoalState,puzzleGoalLeft,puzzleStars,dailyPuzzleStage} from '../src/seed-puzzle-rules.js';

const N=8;
export function validActions(s){const out=[];for(let i=0;i<N*N;i++){if(canTap(s,i))out.push(['t',i]);for(const j of [i+1,i+N]){if((j===i+1&&i%N===N-1)||j>=N*N)continue;if(swapKind(s,i,j))out.push(['s',i,j]);}}return out;}
const act=(s,a)=>a[0]==='t'?tapPuzzle(s,a[1]):playPuzzleMove(s,a[1],a[2]);
const progress=s=>puzzleGoalState(s).reduce((v,p)=>v+(p.kind==='score'?Math.min(p.have,p.need)/10:Math.min(p.have,p.need)*(p.kind==='collect'?30:120)),0)+s.score/200;
const clone=s=>({...structuredClone({...s,def:null}),def:s.def});
export function greedyAction(s){let best=null,value=-Infinity;for(const a of validActions(s)){const t=clone(s);act(t,a);const v=(t.phase==='won'?1e6:0)+progress(t)-(a[0]==='t'?15:0);if(v>value){value=v;best=a;}}return best;}
export function randomAction(s,rand){const all=validActions(s).filter(a=>a[0]==='s');return all[Math.floor(rand()*all.length)];}
// 사람 대신(보정용): 절반은 가장 좋은 수, 절반은 아무 수. 한 수 앞을 빠짐없이 계산하는 욕심쟁이는 아이들보다 훨씬 세다.
export function casualAction(s,rand){if(rand()<.5)return greedyAction(s);const all=validActions(s);return all[Math.floor(rand()*all.length)];}
export function playOut(def,seed,player,{continues=0}={}){
 const s=createPuzzle(def,seed);let r=seed*7919>>>0;const rand=()=>(r=(Math.imul(r,1103515245)+12345)>>>0)/4294967296;let near=null;
 for(;;){
  while(s.phase==='play'){const a=player==='greedy'?greedyAction(s):player==='casual'?casualAction(s,rand):randomAction(s,rand);if(!a)break;act(s,a);}
  if(s.phase!=='out')break;if(near===null)near=puzzleGoalLeft(s);
  if(s.continues>=continues){s.phase='lost';break;}continuePuzzle(s);
 }
 return {won:s.phase==='won',plain:s.phase==='won'&&s.continues===0,stars:puzzleStars(s),score:s.score,near,created:s.created};
}
export function measure(def,games,player,o){
 const rows=Array.from({length:games},(_,k)=>playOut(def,1000+k*37,player,o));
 const stars=[0,0,0,0];for(const r of rows)stars[r.stars]++;const lost=rows.filter(r=>r.near!==null);
 const q=(a,p)=>{const b=[...a].sort((x,y)=>x-y);return b.length?b[Math.min(b.length-1,Math.floor(p*b.length))]:0;},wonScores=rows.filter(r=>r.plain).map(r=>r.score);
 return {rate:rows.filter(r=>r.plain).length/games,plus:rows.filter(r=>r.won).length/games,stars,avg:Math.round(rows.reduce((a,r)=>a+r.score,0)/games),
  near:lost.length?lost.filter(r=>r.near<=.15).length/lost.length:null,p50:q(wonScores,.5),p80:q(wonScores,.8),specials:rows.reduce((a,r)=>a+Object.values(r.created).reduce((x,y)=>x+y,0),0)/games};
}
if(import.meta.url===`file://${process.argv[1]}`){
 const games=Number(process.argv[2])||20,only=process.argv[3]?.split(',');
 for(const def of [...PUZZLE_STAGES,dailyPuzzleStage('20260928')]){
  if(only&&!only.includes(def.id))continue;
  const g=measure(def,games,'casual',{continues:2}),r=measure(def,games,'greedy');
  console.log(`${def.id.padEnd(9)} ${def.name.padEnd(8)} 이동${String(def.moves).padStart(3)} 보통 ${String(Math.round(g.rate*100)).padStart(3)}% (+5이동 ${Math.round(g.plus*100)}%) 아깝게진판 ${g.near===null?'-':Math.round(g.near*100)+'%'} 점수 p50 ${g.p50} p80 ${g.p80} | 욕심 ${Math.round(r.rate*100)}%`);
 }
}
