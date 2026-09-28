// 씨앗 맞추기 단계 난이도 측정: 욕심쟁이(한 수 앞을 보고 목표에 가장 가까운 수)와 아무 수나 두는 사람.
// node tools/seed-puzzle-simulation.mjs [판 수]
import {PUZZLE_STAGES,createPuzzle,playPuzzleMove,swapKind,puzzleGoalState,puzzleStars,dailyPuzzleStage} from '../src/seed-puzzle-rules.js';

const N=8;
export function validMoves(s){const out=[];for(let i=0;i<N*N;i++)for(const j of [i+1,i+N]){if((j===i+1&&i%N===N-1)||j>=N*N)continue;if(swapKind(s,i,j))out.push([i,j]);}return out;}
const progress=s=>puzzleGoalState(s).reduce((v,p)=>v+(p.kind==='score'?Math.min(p.have,p.need)/10:Math.min(p.have,p.need)*(p.kind==='collect'?30:120)),0)+s.score/200;
const clone=s=>({...structuredClone({...s,def:null}),def:s.def});
export function greedyMove(s){let best=null,value=-Infinity;for(const m of validMoves(s)){const t=clone(s);playPuzzleMove(t,m[0],m[1]);const v=(t.phase==='won'?1e6:0)+progress(t);if(v>value){value=v;best=m;}}return best;}
export function randomMove(s,rand){const all=validMoves(s);return all[Math.floor(rand()*all.length)];}
export function playOut(def,seed,player){
 const s=createPuzzle(def,seed);let r=seed*7919>>>0;const rand=()=>(r=(Math.imul(r,1103515245)+12345)>>>0)/4294967296;
 while(s.phase==='play'){const m=player==='greedy'?greedyMove(s):randomMove(s,rand);if(!m)break;playPuzzleMove(s,m[0],m[1]);}
 return {won:s.phase==='won',stars:puzzleStars(s),score:s.score,combos:s.combos.length,created:s.created};
}
export function measure(def,games,player){
 const rows=Array.from({length:games},(_,k)=>playOut(def,1000+k*37,player));
 const won=rows.filter(r=>r.won).length,stars=[0,0,0,0];for(const r of rows)stars[r.stars]++;
 return {rate:won/games,stars,avg:Math.round(rows.reduce((a,r)=>a+r.score,0)/games),specials:rows.reduce((a,r)=>a+r.created.law+r.created.fusion+r.created.sun,0)/games};
}
if(import.meta.url===`file://${process.argv[1]}`){
 const games=Number(process.argv[2])||20;
 for(const def of [...PUZZLE_STAGES,dailyPuzzleStage('20260928')]){
  const g=measure(def,games,'greedy'),r=measure(def,games,'random');
  console.log(`${def.id.padEnd(9)} ${def.name.padEnd(8)} 욕심 ${String(Math.round(g.rate*100)).padStart(3)}% 별${g.stars.join('/')} 평균 ${g.avg} 특수 ${g.specials.toFixed(1)} | 무작위 ${String(Math.round(r.rate*100)).padStart(3)}% 별${r.stars.join('/')} 평균 ${r.avg}`);
 }
}
