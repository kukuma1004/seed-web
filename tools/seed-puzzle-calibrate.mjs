// 씨앗 맞추기 단계별 이동 수·별 기준 맞추기(2026-09-29).
// 단계마다 이동을 넉넉히(70) 주고 보통 봇(절반은 좋은 수)으로 여러 판 깨 보며 "깨는 데 든 이동" 분포를 잰다.
// 목표 깨기 비율(쉬움 90% · 보통 75%→68% · 어려움 55% · 아주 어려움 40%, 1~9단계는 95%)에 맞는 이동 수를 고르고,
// 별은 그 이동에서 남는 이동: ★★ = 깬 판의 가운데값만큼 남김 · ★★★ = 잘 깬 20%만큼 남김.
// node tools/seed-puzzle-calibrate.mjs 시작 끝 [판 수]  → 한 줄에 하나씩 JSON({n,moves,stars,rate,need})
import {PUZZLE_STAGES} from '../src/seed-puzzle-rules.js';
import {playOut} from './seed-puzzle-simulation.mjs';
// 첫 인자에 쉼표가 있으면 단계 번호 목록(무거운 단계 다시 재기), 아니면 시작·끝.
const args=process.argv.slice(2),list=args[0]?.includes(',')?args[0].split(',').map(Number):null;
const [from=1,to=PUZZLE_STAGES.length]=list?[]:args.map(Number),games=Number(list?args[1]:args[2])||16;
const ROOM=70;
export function targetRate(def){
 if(def.n<=9)return .95;
 const grow=Math.min(1,Math.max(0,(def.n-10)/390));
 return {easy:.9,normal:.75-.07*grow,hard:.55,veryHard:.4}[def.level]??.75;
}
for(const n of list||Array.from({length:to-from+1},(_,k)=>from+k)){
 const def=PUZZLE_STAGES[n-1],roomy={...def,moves:ROOM,stars:[99,99]};
 const need=[];for(let k=0;k<games;k++){const r=playOut(roomy,5000+n*131+k*37,'casual');need.push(r.plain?ROOM-r.left:Infinity);}
 need.sort((a,b)=>a-b);
 const rate=targetRate(def),M=Math.max(12,Math.min(45,need[Math.max(0,Math.ceil(rate*games)-1)]));
 const wins=need.filter(x=>x<=M),q=p=>wins[Math.min(wins.length-1,Math.floor(p*wins.length))];
 const s2=Math.max(2,M-q(.5)),s3=Math.max(s2+2,M-q(.2));
 console.log(JSON.stringify({n,moves:Number.isFinite(M)?M:45,stars:[s2,s3],rate,need:need.map(x=>Number.isFinite(x)?x:-1)}));
}
