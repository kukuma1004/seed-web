// 씨앗 맞추기 단계별 이동 수·별 점수 맞추기(2026-09-29 2차).
// 1) 이동을 넉넉히(70) 주고 보통 봇(절반은 좋은 수)으로 32판 → "깨는 데 든 이동" 분포에서 목표 비율에 맞는 이동 M.
// 2) M으로 다시 24판 두어 실제 깨기 비율을 확인하고, 목표보다 많이 잘 깨면 이동을 줄여 한 번 더 확인한다
//    (1차는 표본이 작고 같은 값이 겹쳐 실제로는 목표보다 20%p 넘게 쉬웠다 — 사용자도 "쉽다").
// 3) 별 점수: 확인 판에서 깬 판 점수(햇살 타임 포함)의 가운데값 = ★★, 상위 10% = ★★★("진짜 잘했을 때, 운도 조금").
// 목표 비율: 1~9단계 92% · 쉬움 85% · 보통 65%→58% · 어려움 50% · 아주 어려움 35%.
// node tools/seed-puzzle-calibrate.mjs 시작 끝  또는  "n,n,n"  → 한 줄에 {n,moves,score:[★★,★★★],rate,actual}
import {PUZZLE_STAGES} from '../src/seed-puzzle-rules.js';
import {playOut} from './seed-puzzle-simulation.mjs';
const args=process.argv.slice(2),list=args[0]?.includes(',')?args[0].split(',').map(Number):null;
const [from=1,to=PUZZLE_STAGES.length]=list?[]:args.map(Number);
const ROOM=70,NEED_GAMES=32,CHECK_GAMES=24,MIN=10,MAX=45;
export function targetRate(def){
 if(def.n<=9)return .92;
 const grow=Math.min(1,Math.max(0,(def.n-10)/390));
 return {easy:.85,normal:.65-.07*grow,hard:.5,veryHard:.35}[def.level]??.65;
}
const round=v=>Math.max(100,Math.round(v/100)*100);
function check(def,M,n){
 const d={...def,moves:M},wins=[];
 for(let k=0;k<CHECK_GAMES;k++){const r=playOut(d,9000+n*173+k*41+M*7,'casual');if(r.plain)wins.push(r.score);}
 return {rate:wins.length/CHECK_GAMES,wins:wins.sort((a,b)=>a-b)};
}
for(const n of list||Array.from({length:to-from+1},(_,k)=>from+k)){
 const def=PUZZLE_STAGES[n-1],roomy={...def,moves:ROOM},need=[];
 for(let k=0;k<NEED_GAMES;k++){const r=playOut(roomy,5000+n*131+k*37,'casual');need.push(r.plain?ROOM-r.left:Infinity);}
 need.sort((a,b)=>a-b);
 const rate=targetRate(def);let M=Math.max(MIN,Math.min(MAX,need[Math.max(0,Math.ceil(rate*NEED_GAMES)-1)]));if(!Number.isFinite(M))M=MAX;
 let c=check(def,M,n);
 for(let t=0;t<2&&c.rate>rate+.12&&M>MIN;t++){M=Math.max(MIN,M-Math.max(1,Math.round((c.rate-rate)*M*.6)));c=check(def,M,n);}
 const q=p=>c.wins.length?c.wins[Math.min(c.wins.length-1,Math.floor(p*c.wins.length))]:0;
 const s2=round(q(.5)),s3=Math.max(s2+300,round(q(.9)));
 console.log(JSON.stringify({n,moves:M,score:[s2,s3],rate,actual:Math.round(c.rate*100)/100,fails:need.filter(x=>!Number.isFinite(x)).length}));
}
