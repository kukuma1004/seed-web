// 랭킹에 올라온 기록을 내려받아 앞뒤가 안 맞는 것을 찾는다. 읽기만 하고 아무것도 바꾸지 않는다.
//   node tools/ranking-audit.mjs            최근 시즌 전체
//   node tools/ranking-audit.mjs 20         살펴볼 기록을 20건까지
// 판단 근거는 두 가지다.
//  1) 산수: 점수는 게임이 '처치 점수 × 여정 배수'로 더한 값이라, 점수÷처치÷여정배수가 거의 고정이다(22~28).
//     이 값이 벗어나면 점수나 처치를 손으로 고쳤다는 뜻이다.
//  2) 속도: 방마다 나오는 적 수가 정해져 있어(여정당 무리 90 + 고정 적) 여정당 처치 수는 125를 넘을 수 없고,
//     무리는 0.85초에 2마리씩만 나오므로 여정 하나를 무리만 치워도 최소 24.7초가 걸린다.
//     속도는 빌드에 따라 크게 달라지므로 '거부'가 아니라 '살펴볼 것'으로만 표시한다.
//     같은 기기의 다른 판과 비교하는 것이 가장 확실하다. 기기가 느려 시간이 덜 찍힌 경우라면 그 기기의 모든 판이 함께 빠르다.
import {FIREBASE,RUNS_PATH,BUILDS_PATH,SEASON,inSeason,validRun} from '../src/online-ranking.js';

const LIMIT=Number(process.argv[2])||12;
const journey=cycle=>1+Math.max(0,cycle)*.5;
const index=run=>run.kills?run.score/run.kills/journey(run.cycle):0;
const killsPerMin=run=>run.time?run.kills/run.time*60:0;
const secPerCycle=run=>run.time/(run.cycle+1);
const when=run=>new Date(run.at).toISOString().slice(0,16).replace('T',' ');
const pct=(list,p)=>list.length?list[Math.min(list.length-1,Math.floor((list.length-1)*p))]:0;

// 게임이 정한 한계. 넘을 수 없는 것만 '불가능'으로 본다.
export const IMPOSSIBLE=[
 {name:'처치가 여정 수로 낼 수 있는 양을 넘음',ok:r=>r.kills<=(r.cycle+1)*160},
 {name:'점수가 처치로 낼 수 있는 양을 넘음',ok:r=>r.score<=(r.kills+12)*50*journey(r.cycle)},
 {name:'여정 수에 비해 시간이 너무 짧음',ok:r=>r.time>=r.cycle*15},
 {name:'시간에 비해 처치가 너무 많음',ok:r=>r.time>=r.kills/6}
];

async function main(){
 const auth=await post(`https://identitytoolkit.googleapis.com/v1/accounts:signUp?key=${FIREBASE.apiKey}`,{returnSecureToken:true});
 if(!auth?.idToken)throw new Error('로그인 실패');
 const [runs,builds]=await Promise.all([get(RUNS_PATH,auth.idToken),get(BUILDS_PATH,auth.idToken)]);
 const all=Object.entries(runs||{}).map(([id,v])=>({id,...v,build:(builds||{})[id]||null}));
 const list=all.filter(validRun).filter(r=>inSeason(r));
 if(!list.length){console.log('기록이 없습니다.');return;}

 const devices=new Map();
 for(const run of list){if(!devices.has(run.uid))devices.set(run.uid,[]);devices.get(run.uid).push(run);}
 for(const runs of devices.values())runs.sort((a,b)=>a.at-b.at);
 console.log(`${SEASON.name} · 기록 ${list.length}건 · 기기 ${devices.size}대 · ${when(list.reduce((a,b)=>a.at<b.at?a:b))} ~ ${when(list.reduce((a,b)=>a.at>b.at?a:b))}`);
 if(all.length>list.length)console.log(`(지난 시즌이거나 형식이 깨진 기록 ${all.length-list.length}건은 뺐습니다)`);

 // 1) 산수가 안 맞는 기록
 const broken=[];
 for(const run of list)for(const rule of IMPOSSIBLE)if(!rule.ok(run))broken.push({run,why:rule.name});
 console.log(`\n■ 산수가 안 맞는 기록 ${broken.length}건 ${broken.length?'(점수나 처치를 고친 흔적)':'— 점수를 꾸며낸 사람은 없습니다'}`);
 for(const {run,why} of broken.slice(0,LIMIT))console.log('  '+describe(run)+'\n     └ '+why);

 // 2) 점수 지수가 무리에서 벗어난 기록
 const indexes=list.filter(r=>r.kills>0).map(index).sort((a,b)=>a-b);
 const low=pct(indexes,.005),high=pct(indexes,.995);
 console.log(`\n■ 점수 지수(점수÷처치÷여정배수) 중앙 ${pct(indexes,.5).toFixed(1)} · 0.5% ${low.toFixed(1)} · 99.5% ${high.toFixed(1)}`);
 const odd=list.filter(r=>r.kills>=100&&(index(r)>Math.max(30,high*1.15)||index(r)<Math.min(15,low*.85)));
 console.log(`  벗어난 기록 ${odd.length}건${odd.length?'':' — 모두 게임이 계산한 값과 맞습니다'}`);
 for(const run of odd.slice(0,LIMIT))console.log('  '+describe(run)+`\n     └ 지수 ${index(run).toFixed(1)} · ${index(run)>high?'점수만 부풀린 흔적':'판 도중에 점수가 0으로 돌아간 흔적'}`);

 // 3) 속도가 무리에서 벗어난 기록 — 같은 기기의 다른 판과 비교한다
 const long=list.filter(r=>r.time>=120&&r.kills>0);
 const rates=long.map(killsPerMin).sort((a,b)=>a-b);
 const ceiling=Math.max(pct(rates,.995)*1.2,120);
 console.log(`\n■ 분당 처치 중앙 ${pct(rates,.5).toFixed(0)} · 99.5% ${pct(rates,.995).toFixed(0)} · 살펴볼 선 ${ceiling.toFixed(0)}`);
 const fast=long.filter(r=>killsPerMin(r)>ceiling).sort((a,b)=>killsPerMin(b)-killsPerMin(a));
 console.log(`  살펴볼 기록 ${fast.length}건${fast.length?'':' — 유난히 빠른 판은 없습니다'}`);
 for(const run of fast.slice(0,LIMIT)){
  const mine=devices.get(run.uid).filter(r=>r.time>=120&&r.id!==run.id).map(killsPerMin).sort((a,b)=>a-b);
  const usual=mine.length?`이 기기의 다른 ${mine.length}판은 ${pct(mine,0).toFixed(0)}~${pct(mine,1).toFixed(0)}킬/분`:'이 기기의 다른 판이 없어 비교 불가';
  const verdict=!mine.length?'판단 보류'
   :killsPerMin(run)>pct(mine,1)*1.4?'이 판만 유난히 빠름 — 도구를 썼을 가능성'
   :'이 기기는 평소에도 빠름 — 기기가 느려 시간이 덜 찍혔을 수 있음';
  console.log('  '+describe(run)+`\n     └ ${killsPerMin(run).toFixed(0)}킬/분 · 여정당 ${secPerCycle(run).toFixed(0)}초 · ${usual} · ${verdict}`);
 }
}

function describe(run){
 const b=run.build;
 return `${when(run)} ${String(run.name).padEnd(9)} ${String(run.score).padStart(8)}점 여정${String(run.cycle).padStart(2)} 처치${String(run.kills).padStart(4)} ${String(Math.round(run.time)).padStart(4)}초 기기 ${String(run.uid).slice(0,6)}`
  +(b?` [${b.laws||'-'}|${b.forms||'-'}]`:'');
}
async function get(path,token){
 const r=await fetch(`${FIREBASE.databaseURL}/${path}.json?auth=${encodeURIComponent(token)}`,{cache:'no-store'});
 if(!r.ok)throw new Error(`${path}: http-${r.status}`);
 return r.json();
}
async function post(url,body){
 const r=await fetch(url,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(body)});
 return r.json();
}

main().catch(error=>{console.error('실패:',error.message);process.exitCode=1;});
