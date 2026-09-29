// .calib/*.jsonl(보정 결과) → src/seed-puzzle-tuning.js.
// 이동 45번으로도 목표 비율을 못 채운 단계(너무 무거운 판)는 목표 배율을 0.75배로 적어 두고 → 그 단계만 다시 재서 덮어쓴다.
// node tools/seed-puzzle-tuning-build.mjs  → 무거운 단계 번호를 쉼표로 출력(다시 잴 목록)
import {readFileSync,readdirSync,writeFileSync} from 'node:fs';
import {PUZZLE_TUNING} from '../src/seed-puzzle-tuning.js';
const rows=new Map();
for(const f of readdirSync('.calib').filter(f=>f.endsWith('.jsonl')).sort())for(const line of readFileSync('.calib/'+f,'utf8').split('\n')){if(!line.trim())continue;const r=JSON.parse(line);rows.set(r.n,r);}
const out={...PUZZLE_TUNING},heavy=[];
for(const [n,r] of rows){
 const scale=PUZZLE_TUNING[n]?.[3]??1,need=r.need.filter(x=>x>=0),fails=r.need.length-need.length;
 const tooHeavy=n>10&&(r.moves>=45||fails>r.need.length*(1-r.rate));
 if(tooHeavy&&scale>.35){out[n]=[r.moves,r.stars[0],r.stars[1],Math.round(scale*.75*100)/100];heavy.push(n);}
 else out[n]=scale<1?[r.moves,r.stars[0],r.stars[1],scale]:[r.moves,r.stars[0],r.stars[1]];
}
const keys=Object.keys(out).map(Number).sort((a,b)=>a-b);
const body=keys.map(n=>`${n}:[${out[n].join(',')}]`).join(',');
writeFileSync('src/seed-puzzle-tuning.js',`// 씨앗 맞추기 단계별 보정표(자동 생성: node tools/seed-puzzle-calibrate.mjs → tools/seed-puzzle-tuning-build.mjs).\n// n → [이동, ★★ 남은 이동, ★★★ 남은 이동, 목표 배율(없으면 1)]. 보통 봇(절반은 좋은 수)이 단계 난이도별 목표 비율로 깨도록 맞췄다.\nexport const PUZZLE_TUNING=Object.freeze({${body}});\n`);
console.error(`${rows.size}단계 반영 · 무거운 단계 ${heavy.length}`);
console.log(heavy.join(','));
