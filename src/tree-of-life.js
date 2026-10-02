// 생명의 나무 v2 — 희귀한 씨앗을 어렵게 얻어 직접 심고 키운다(기획 TREE_OF_LIFE_V2_PLAN.md, 2026-10-02).
// 사용자: "씨앗도 너무 무작위", "다 초기화하고 진짜 희귀한 걸 어렵게 구해서 만들어지게", "제일 멋지고 웅장하게".
// 결정: 예전 화단(garden.plots·seeds, 자동 심기)은 지우지 않고 그대로 두되 화면에서 쓰지 않는다 → 새 나무는 빈 화단에서 시작(되돌리기 가능).
//       정원 숙련(영구 능력치)은 그대로. 씨앗은 보스·어려운 도전 보상으로만, 자동으로 심기지 않는다.
// 저장: garden.tree = {plots:[{seed,water}|null ×7], bag:{씨앗:개수}, shards:{common,rare}, bloomed:[씨앗], once:{보상 키:true}}
import {LAWS} from './laws.js';
import {FORMS} from './forms.js';

export const TREE_PLOTS=7;
export const TREE_RARITY=Object.freeze({
 common:Object.freeze({id:'common',name:'흔함',growth:1,shardsToCraft:5,color:'#9fe0a0'}),
 rare:Object.freeze({id:'rare',name:'희귀',growth:1.5,shardsToCraft:15,color:'#8fc8ff'}),
 legend:Object.freeze({id:'legend',name:'전설',growth:2.5,shardsToCraft:null,color:'#ffd36b'}),
});
// 자라는 단계: 물방울(던전·퍼즐·수호전을 할 때마다)이 쌓이면 새싹 → 자란 풀 → 개화. 등급만큼 더 필요하다.
export const TREE_STAGES=Object.freeze([
 Object.freeze({id:'seed',name:'심은 씨앗',water:0}),Object.freeze({id:'sprout',name:'새싹',water:1}),
 Object.freeze({id:'grown',name:'자란 풀',water:4}),Object.freeze({id:'bloom',name:'개화',water:9}),
]);
const LAW_SEED_NAMES={reflect:'메아리 씨앗',split:'쌍생 씨앗',chain:'번개 씨앗',orbit:'맴돌이 씨앗',pierce:'꿰뚫는 씨앗',burst:'터지는 씨앗',recall:'돌아오는 씨앗',gravity:'끌어당기는 씨앗',frost:'서리 씨앗'};
// 희귀: 도감 대표 융합 12종(있는 것만).
const RARE_FORMS=['returnblade','tidepull','frostguard','stormcrown','mirrorguard','collapse','prism','thunderlance','frostbloom','chainburst','blastlance','seedstorm'];
const LEGENDS=[
 ['clocktower','시계탑 씨앗','정시파이터 오스틴을 맞지 않고 쓰러뜨리거나 열 번 쓰러뜨리면'],
 ['alwaysbeginner','새싹 왕관 씨앗','항상초심을 맞지 않고 쓰러뜨리거나 열 번 쓰러뜨리면'],
 ['tempestcarrier','폭풍 수정 씨앗','폭풍비행사 요한을 맞지 않고 쓰러뜨리거나 열 번 쓰러뜨리면'],
 ['worldtree','세계수의 씨앗','전설 씨앗 셋을 모두 개화시키면'],
 ['founder','개척자의 별씨앗','SEED 첫 비공개 테스트에 함께한 정원에만'],
];
export const TREE_SEEDS=Object.freeze(Object.fromEntries([
 ...Object.entries(LAW_SEED_NAMES).filter(([law])=>Object.hasOwn(LAWS,law)).map(([law,name])=>[law,Object.freeze({id:law,name,rarity:'common',law,laws:Object.freeze([law]),how:'막 보스를 쓰러뜨리거나, 씨앗 맞추기 아주 어려운 단계(끝자리 0)를 처음 ★★★로 깨면'})]),
 ...RARE_FORMS.filter(id=>FORMS[id]?.requires?.length===2).map(id=>[`f-${id}`,Object.freeze({id:`f-${id}`,name:FORMS[id].name.endsWith('씨앗')?FORMS[id].name:`${FORMS[id].name}의 씨앗`,rarity:'rare',form:id,laws:Object.freeze([...FORMS[id].requires]),how:'2·3막 최종 보스, 수호전 30물결, 씨앗 맞추기 50단계마다 첫 ★★★'})]),
 ...LEGENDS.map(([id,name,how])=>[id,Object.freeze({id,name,rarity:'legend',boss:['clocktower','alwaysbeginner','tempestcarrier'].includes(id)?id:null,laws:Object.freeze([]),how})]),
]));
export const TREE_SEED_IDS=Object.freeze(Object.keys(TREE_SEEDS));
const BOSS_LEGEND={austin:'clocktower',alwaysbeginner:'alwaysbeginner',tempestcarrier:'tempestcarrier'};

const int=(v,max)=>Number.isInteger(v)?Math.max(0,Math.min(max,v)):0;
export function emptyTree(){return {plots:Array(TREE_PLOTS).fill(null),bag:{},shards:{common:0,rare:0},bloomed:[],once:{},updatedAt:0};}
export function normalizeTree(value){
 const t=emptyTree();if(!value||typeof value!=='object')return t;
 t.updatedAt=Number.isSafeInteger(value.updatedAt)&&value.updatedAt>0?value.updatedAt:0;
 if(Array.isArray(value.plots))for(let i=0;i<TREE_PLOTS;i++){const p=value.plots[i];if(p&&TREE_SEEDS[p.seed])t.plots[i]={seed:p.seed,water:Math.max(0,Math.min(999,Number(p.water)||0))};}
 if(value.bag&&typeof value.bag==='object')for(const [id,n] of Object.entries(value.bag))if(TREE_SEEDS[id]&&int(n,99))t.bag[id]=int(n,99);
 t.shards={common:int(value.shards?.common,9999),rare:int(value.shards?.rare,9999)};
 t.bloomed=Array.isArray(value.bloomed)?TREE_SEED_IDS.filter(id=>value.bloomed.includes(id)):[];
 if(value.once&&typeof value.once==='object')for(const k of Object.keys(value.once))if(value.once[k]===true&&/^[\w:.-]{1,60}$/.test(k))t.once[k]=true;
 return t;
}
const need=(seed,stage)=>Math.ceil(TREE_STAGES.find(s=>s.id===stage).water*TREE_RARITY[TREE_SEEDS[seed].rarity].growth);
export function plotStage(plot){
 if(!plot)return null;let stage='seed';
 for(const s of TREE_STAGES)if(plot.water>=need(plot.seed,s.id))stage=s.id;
 return stage;
}
export function plotNextIn(plot){if(!plot)return 0;for(const s of TREE_STAGES)if(plot.water<need(plot.seed,s.id))return +(need(plot.seed,s.id)-plot.water).toFixed(2);return 0;}

// 씨앗 넣기: 처음 얻는 씨앗은 가방에, 이미 가진(가방·화단·개화 기록) 씨앗이면 조각(흔함 1 · 희귀 3). 전설은 겹치지 않는다(조각 없음).
function give(t,id,notes){
 const s=TREE_SEEDS[id];if(!s)return;
 const owned=(t.bag[id]||0)>0||t.plots.some(p=>p?.seed===id)||t.bloomed.includes(id);
 if(owned&&s.rarity!=='legend'){t.shards[s.rarity]+=s.rarity==='rare'?3:1;notes.push({type:'shard',seed:id,rarity:s.rarity,count:s.rarity==='rare'?3:1});return;}
 if(owned)return;
 t.bag[id]=Math.min(99,(t.bag[id]||0)+1);notes.push({type:'seed',seed:id,rarity:s.rarity});
}
const pickOf=(list,rng)=>list[Math.min(list.length-1,Math.floor((Number(rng?.())||0)*list.length))];
const COMMON_IDS=()=>TREE_SEED_IDS.filter(id=>TREE_SEEDS[id].rarity==='common');
const RARE_IDS=()=>TREE_SEED_IDS.filter(id=>TREE_SEEDS[id].rarity==='rare');
const touchTree=t=>{t.updatedAt=Math.max(Date.now(),t.updatedAt+1);return t;};
// 보상 확률(시험 뒤 조정). 막 보스는 그 판에서 가장 깊게 키운 법칙 씨앗을 우선한다.
export const TREE_DROPS=Object.freeze({actBoss:.25,finalBossRare:.08,defense30Rare:.1});
/**
 * 보상 굴리기. event:
 *  {type:'boss',boss:'austin'|'alwaysbeginner'|'tempestcarrier'|'warden',act:1|2|3,final:bool,noHit:bool,wins:누적 격파 수,law:가장 키운 법칙}
 *  {type:'puzzle',stage:n,stars:0~3,firstThree:bool}  {type:'defense',wave:n}
 * 같은 사건으로 두 번 주지 않게 once 키를 쓴다(보장 보상만).
 */
export function rollTreeReward(tree,event,rng=Math.random){
 const t=normalizeTree(tree),notes=[],before=JSON.stringify(t);const r=()=>Number(rng?.())||0;
 if(event?.type==='boss'){
  const law=Object.hasOwn(TREE_SEEDS,event.law)?event.law:pickOf(COMMON_IDS(),rng);
  if(event.act===1&&!t.once['act1-first']){t.once['act1-first']=true;give(t,law,notes);}
  else if(r()<TREE_DROPS.actBoss)give(t,law,notes);
  if(event.final&&(event.act||1)>=2&&r()<TREE_DROPS.finalBossRare)give(t,pickOf(RARE_IDS(),rng),notes);
  const legend=BOSS_LEGEND[event.boss];
  if(legend&&(event.noHit||(event.wins||0)>=10))give(t,legend,notes);
 }else if(event?.type==='puzzle'&&event.firstThree&&event.stars>=3&&Number.isInteger(event.stage)&&event.stage>0&&!t.once[`puzzle-${event.stage}`]){
  if(event.stage%10===0)t.once[`puzzle-${event.stage}`]=true;
  if(event.stage%50===0)give(t,pickOf(RARE_IDS(),rng),notes);
  else if(event.stage%10===0)give(t,pickOf(COMMON_IDS(),rng),notes);
 }else if(event?.type==='defense'&&(event.wave||0)>=30){
  const run=typeof event.runId==='string'&&/^[\w-]{1,40}$/.test(event.runId)?`${event.runId}-`:'';
  const key=`defense-${run}${Math.floor(event.wave/10)*10}`;
  if(!t.once[key]){t.once[key]=true;if(r()<TREE_DROPS.defense30Rare*Math.min(3,event.wave/30))give(t,pickOf(RARE_IDS(),rng),notes);}
 }
 if(JSON.stringify(t)!==before)touchTree(t);
 return {tree:t,notes};
}
// 조각으로 원하는 씨앗 만들기(흔함 5 · 희귀 15). 이미 가진 씨앗도 만들 수 있다(다른 화단에 또 심으려고).
export function craftTreeSeed(tree,id){
 const t=normalizeTree(tree),s=TREE_SEEDS[id];
 if(!s||s.rarity==='legend')return {ok:false,reason:'seed',tree:t};
 if((t.bag[id]||0)>=99)return {ok:false,reason:'full',tree:t};
 const cost=TREE_RARITY[s.rarity].shardsToCraft;if(t.shards[s.rarity]<cost)return {ok:false,reason:'shards',need:cost,tree:t};
 t.shards[s.rarity]-=cost;t.bag[id]=Math.min(99,(t.bag[id]||0)+1);return {ok:true,tree:touchTree(t)};
}
// 심기: 가방의 씨앗을 빈 화단에. 가운데 큰 화단(0번)은 전설 씨앗만.
export function plantTreeSeed(tree,id,index){
 const t=normalizeTree(tree),s=TREE_SEEDS[id];
 if(!s||!(t.bag[id]>0))return {ok:false,reason:'bag',tree:t};
 if(!Number.isInteger(index)||!(index>=0&&index<TREE_PLOTS)||t.plots[index])return {ok:false,reason:'plot',tree:t};
 if(index===0&&s.rarity!=='legend')return {ok:false,reason:'legend-only',tree:t};
 if(index!==0&&s.rarity==='legend')return {ok:false,reason:'center-only',tree:t};
 t.bag[id]--;if(!t.bag[id])delete t.bag[id];t.plots[index]={seed:id,water:0};return {ok:true,tree:touchTree(t)};
}
// 비우기: 씨앗은 사라진다(개화 기록은 남는다). 되돌릴 수 없어 화면이 한 번 더 묻는다.
export function clearTreePlot(tree,index){const t=normalizeTree(tree);if(!Number.isInteger(index)||!t.plots[index])return {ok:false,tree:t};t.plots[index]=null;return {ok:true,tree:touchTree(t)};}
// 물 주기: 놀고 오면 심은 씨앗 모두에. 개화하면 bloomed에 남고, 전설 셋이 모두 피면 세계수의 씨앗을 한 번 준다.
export function waterTree(tree,amount=1){
 const t=normalizeTree(tree),notes=[],before=JSON.stringify(t),a=Math.max(0,Math.min(5,Number(amount)||0));
 t.plots.forEach((p,i)=>{if(!p)return;const before=plotStage(p);p.water=Math.min(999,+(p.water+a).toFixed(2));const after=plotStage(p);
  if(after!==before)notes.push({type:'grow',plot:i,seed:p.seed,stage:after});if(after==='bloom'&&!t.bloomed.includes(p.seed))t.bloomed.push(p.seed);});
 if(['clocktower','alwaysbeginner','tempestcarrier'].every(id=>t.bloomed.includes(id))&&!t.once['worldtree']){t.once['worldtree']=true;give(t,'worldtree',notes);}
 if(JSON.stringify(t)!==before)touchTree(t);
 return {tree:t,notes};
}
// 예전 정원에서 넘어올 때: 개척자의 별씨앗(테스터 기념)만 가방에 한 번 넣어 준다.
export function migrateTree(tree,oldGarden){
 const t=normalizeTree(tree);if(t.once.migrated)return t;t.once.migrated=true;
 const hadFounder=(oldGarden?.plots||[]).some(p=>p?.seed==='founder')||(oldGarden?.seeds?.founder||0)>0;
 if(hadFounder&&!t.bag.founder&&!t.plots.some(p=>p?.seed==='founder'))t.bag.founder=1;
 return t;
}
// 화단·가방·조각은 소비 가능한 상태: 클라우드가 정한 최신 쪽을 함께 선택한다.
// max로 합치면 심은 씨앗/사용한 조각/뽑은 식물이 다른 기기에서 되살아난다.
// 새 설치의 빈 나무는 기존 나무를 덮지 않는다. 개화·일회 보상 기록은 합친다.
export function mergeTree(a,b,{prefer='remote'}={}){
 const x=normalizeTree(a),y=normalizeTree(b);
 const initialized=t=>t.updatedAt||t.once.migrated||t.plots.some(Boolean)||Object.keys(t.bag).length||t.shards.common||t.shards.rare||t.bloomed.length;
 const latest=x.updatedAt>y.updatedAt?'local':y.updatedAt>x.updatedAt?'remote':prefer;
 const winner=latest==='local'?x:y,other=latest==='local'?y:x;
 const t=normalizeTree(initialized(winner)?winner:other);
 t.bloomed=TREE_SEED_IDS.filter(id=>x.bloomed.includes(id)||y.bloomed.includes(id));t.once={...x.once,...y.once};
 return t;
}
