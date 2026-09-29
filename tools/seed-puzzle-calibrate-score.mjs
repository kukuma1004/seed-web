// 씨앗 맞추기 별 점수 맞추기(2026-09-29 사용자: "점수로 별, ★★★는 진짜 잘했을 때 — 운도 조금").
// 보정표의 이동 수 그대로 보통 봇(절반은 좋은 수)으로 여러 판 → 깬 판 점수(햇살 타임 포함)의 가운데값 = ★★, 상위 10% = ★★★.
// node tools/seed-puzzle-calibrate-score.mjs 시작 끝 [판 수]  또는  "n,n,n" [판 수]  → 한 줄에 {n,score:[★★,★★★],wins}
import {PUZZLE_STAGES} from '../src/seed-puzzle-rules.js';
import {playOut} from './seed-puzzle-simulation.mjs';
const args=process.argv.slice(2),list=args[0]?.includes(',')?args[0].split(',').map(Number):null;
const [from=1,to=PUZZLE_STAGES.length]=list?[]:args.map(Number),games=Number(list?args[1]:args[2])||24;
const round=v=>Math.max(100,Math.round(v/100)*100);
for(const n of list||Array.from({length:to-from+1},(_,k)=>from+k)){
 const def=PUZZLE_STAGES[n-1],wins=[];
 for(let k=0;k<games;k++){const r=playOut(def,9000+n*173+k*41,'casual');if(r.plain)wins.push(r.score);}
 wins.sort((a,b)=>a-b);const q=p=>wins.length?wins[Math.min(wins.length-1,Math.floor(p*wins.length))]:0;
 const s2=round(q(.5)),s3=Math.max(s2+300,round(q(.9)));
 console.log(JSON.stringify({n,score:[s2,s3],wins:wins.length}));
}
