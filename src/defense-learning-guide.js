import {DEFENSE,DEFENSE_CELLS,DEFENSE_LAWS,defenseSeedCap,defenseTierOf,defenseMergeResult,defensePath,defensePathLength,defensePlacement,defenseTowerName,defenseTowerStats,defenseUpgradeCost} from './seed-defense-rules.js';
import {defenseRangeSegments} from './defense-tactical-guide.js';

const label=t=>defenseTowerName(t),sun=s=>Math.max(0,Math.floor(s.currency||0));
const direction=(from,to)=>Math.abs(to.x-from.x)>Math.abs(to.y-from.y)?to.x>from.x?'오른쪽':'왼쪽':to.y>from.y?'아래쪽':'위쪽';
function coverage(s,t,x=t.x,y=t.y){return defenseRangeSegments(defensePath(s),x,y,defenseTowerStats(t).range).length;}
function routePosition(s,p){
 const path=defensePath(s);let distance=Infinity,progress=0,travel=0;
 for(let i=1;i<path.length;i++){const a=path[i-1],b=path[i],dx=b.x-a.x,dy=b.y-a.y,len=Math.hypot(dx,dy),f=len?Math.max(0,Math.min(1,((p.x-a.x)*dx+(p.y-a.y)*dy)/(len*len))):0,d=Math.hypot(p.x-a.x-f*dx,p.y-a.y-f*dy);if(d<distance){distance=d;progress=travel+f*len;}travel+=len;}
 return progress<travel*.35?'길 앞쪽':progress>travel*.7?'출구 쪽':'길 중간';
}
function partner(s,t){return s.towers.find(other=>other!==t&&defenseMergeResult(s,t.id,other.id).ok);}
function pairHint(s,t,other){const merge=defenseMergeResult(s,t.id,other.id);return {title:merge.promote?'합치면 지금 진급해요':'합칠 씨앗이 있어요',body:`선택한 ${label(t)}을 ${direction(t,other)} ${label(other)} 위로 끌어 놓으세요 · ${merge.promote?'다음 계급으로 진화':merge.tier===4?'별이 올라가요':`진급 ${merge.merit+1}/3`}`,targetId:other.id};}

// Advice reads the shipping costs, route and merge rule. It never rolls a law,
// upgrades a seed, or invents a range for an empty/random-law planting slot.
export function defenseLearningHint(s,pad){
 const t=s.towers.find(t=>t.pad===pad),p=s.pads?.[pad];
 if(!p||['won','lost'].includes(s.phase))return null;
 if(!t){
  if(s.towers.length>=defenseSeedCap(s))return {title:'지금 씨앗 수가 가득해요',body:'같은 계열·같은 계급 씨앗을 합쳐 심을 자리를 만드세요'};
  if(sun(s)<DEFENSE.plantCost)return {title:`햇살 ${DEFENSE.plantCost-sun(s)} 더 필요해요`,body:'적을 처치하거나 습격을 막으면 햇살을 얻어요 · 지금은 무료로 위치를 옮길 수 있어요'};
  return {title:`${routePosition(s,p)} 자리 · ${s.towers.length?'씨앗 추가':'첫 법칙 선택'}`,body:s.towers.length?`심기 ${DEFENSE.plantCost} 햇살 · 다음 씨앗의 계열은 무작위예요`:'첫 법칙은 직접 선택해요 · 심은 뒤 밝은 길에서 실제 사거리를 확인하세요'};
 }
 const length=coverage(s,t);
 if(length===0)return {title:'이 자리는 길에 사거리가 닿지 않아요',body:'위치 옮기기를 누르고 길 가까운 빈 화단으로 옮겨요 · 밝은 길이 생기는지 확인하세요'};
 const other=partner(s,t);if(other)return pairHint(s,t,other);
 const cost=defenseUpgradeCost(t),line=t.line||t.laws[0],path=defensePath(s),entry=defenseRangeSegments(path.slice(0,2),t.x,t.y,defenseTowerStats(t).range).length;
 if(Number.isFinite(cost)&&sun(s)>=cost)return {title:`${cost} 햇살로 다음 강화가 가능해요`,body:`아래 강화 버튼 · Lv.${t.level} → ${t.level+1}, 피해와 사거리 증가 · ${line==='pierce'?'밝은 직선의 적을 관통해요':entry>0?'입구부터 공격할 수 있는 자리예요':'밝은 길에서 적을 찾는 자리예요'}`};
 if(Number.isFinite(cost))return {title:`강화까지 햇살 ${cost-sun(s)} 더`,body:`${line==='frost'?'빙결은 통과를 늦춰 다른 씨앗의 사격 시간을 벌어요':line==='pierce'?'관통은 방패를 무시해요 · 밝은 직선에서 활용하세요':`${DEFENSE_LAWS[line]?.name||'이'} 씨앗은 밝은 길 안의 적을 찾아 공격해요`} · 같은 계열·같은 계급끼리 합체`};
 return {title:'강화 Lv.5 · 합체로 더 성장해요',body:`${DEFENSE_LAWS[line]?.name||'같은'} 계열 ${defenseTierOf(t)}계급 씨앗을 모으세요 · 서로 다른 계열은 합칠 수 없어요`};
}

export function createDefenseLearningGuide(){
 let key='',cached=null;
 return (s,pad)=>{
  let next=s.phase+':'+pad+':'+sun(s)+':'+s.wave+':'+(s.migratedWaves||0)+':'+(s.actCount||3)+':'+s.pads?.[pad]?.x+':'+s.pads?.[pad]?.y;
  for(const t of s.towers){next+='|'+t.id+':'+t.pad+':'+t.x+':'+t.y+':'+t.level+':'+t.line+':'+t.formId+':'+defenseTierOf(t)+':'+(t.merit||0)+':'+(t.stars||0)+':'+(t.reinforce||0);for(const id of t.laws)next+=':'+id+':'+(t.lawRanks?.[id]||1);}
  if(next!==key){key=next;cached=defenseLearningHint(s,pad);}return cached;
 };
}

// One bounded scratch list, reused around the real shipping simulation step.
// Compacting enemies removes references from state, so retain them until the
// step ends. Only a real core HP decrease creates a transient receipt; it is
// deliberately absent from saves, rankings and title/boss award ledgers.
export function createDefenseLossObserver(){
 const refs=[];let hp=0,leaked=0,count=0,last=null,runId=null;
 return {
  before(s){if(runId!==s.runId){runId=s.runId;last=null;}hp=s.coreHp;leaked=s.leaked;count=Math.min(s.enemies.length,DEFENSE.maxEnemies);for(let i=0;i<count;i++)refs[i]=s.enemies[i];refs.length=count;},
  after(s){
   const damage=hp-s.coreHp;if(damage<=0)return;
   const leaks=Math.max(0,s.leaked-leaked),end=defensePathLength(s);let boss=false,kind=null,observed=0,leakDamage=0;
   if(leaks)for(let i=0;i<count;i++){const e=refs[i];if(e.progress>=end&&e.hp<=0){boss||=Boolean(e.bossId);kind=observed?null:e.kind;observed++;leakDamage+=e.leakDamage||0;}}
   last={wave:s.wave,damage,leaks,kind:leaks?(observed!==leaks?'leak':leakDamage<damage?'mixed':boss?'boss-leak':'enemy-leak'):'core-attack',enemyKind:observed===1?kind:null};
  },
  last:()=>last,
  reset(){refs.length=0;count=0;last=null;runId=null;}
 };
}

function betterSite(s){
 let best=null,gain=0;
 for(const t of s.towers){const now=coverage(s,t);for(const cell of DEFENSE_CELLS){if(defensePlacement(s,cell.x,cell.y,t.pad))continue;const improvement=coverage(s,t,cell.x,cell.y)-now;if(improvement>gain+.5){gain=improvement;best={t,cell};}}}
 return best;
}

export function defenseResultLearning(s,loss,{autoSkill=true}={}){
 const cause=s.phase==='won'?'마지막 습격을 막고 정원을 지켰어요':loss?
  loss.kind==='core-attack'?`마지막 심장 피해 −${loss.damage} · 적 통과 없이 보스의 심장 공격을 받았어요`:
  loss.kind==='mixed'?`마지막 심장 피해 −${loss.damage} · 적 ${loss.leaks}마리 통과와 심장 공격이 겹쳤어요`:
  `마지막 심장 피해 −${loss.damage} · ${loss.kind==='boss-leak'?'보스를 포함한 적': '적'} ${loss.leaks}마리가 길 끝을 통과했어요`:
  '마지막 타격의 세부 기록은 없어요 · 현재 배치를 기준으로 다음 전략을 골라요';
 let next='';const off=s.towers.find(t=>coverage(s,t)===0);
 if(off)next=`다음에는 ${label(off)}을 길 가까이 옮겨요 · 이번 자리에서는 길에 탐색 사거리가 닿지 않았어요`;
 if(!next&&!autoSkill){const ready=s.towers.find(t=>t.formId&&(t.ultimateCharge||0)>=30);if(ready)next=`${label(ready)}의 궁극기가 준비돼 있었어요 · 다음에는 사용하거나 스킬 자동을 켜 보세요`;}
 if(!next&&loss?.enemyKind==='fast'&&!s.towers.some(t=>t.laws.includes('frost')))next='빠른 적이 통과했어요 · 다음에는 입구에 빙결 씨앗을 두어 사격 시간을 벌어요';
 if(!next&&loss?.enemyKind==='shield'&&!s.towers.some(t=>t.laws.includes('pierce')))next='방패 적이 통과했어요 · 다음에는 방패를 무시하는 관통 씨앗을 긴 직선에 두세요';
 if(!next&&loss?.kind==='core-attack'){const site=betterSite(s);next=site?`다음에는 ${label(site.t)}의 위치를 ${direction(site.t,site.cell)} 빈 화단으로 옮겨 공격 가능한 길을 늘려요`:'다음에는 보스가 심장을 공격하기 전에 궁극기를 모아 집중하세요 · 이번 마지막 피해는 적 통과가 아니었어요';}
 if(!next)for(const t of s.towers){const other=partner(s,t);if(other){next=`다음에는 ${label(t)}을 ${direction(t,other)} 같은 계열·같은 계급 씨앗과 합쳐요 · 이번 배치에 합체 가능한 한 쌍이 있었어요`;break;}}
 if(!next){const t=s.towers.find(t=>t.level<5&&sun(s)>=defenseUpgradeCost(t));if(t)next=`남은 햇살 ${sun(s)} · 쓸 여력이 있었어요 · 다음에는 ${label(t)} 강화 Lv.${t.level} → ${t.level+1}에 ${defenseUpgradeCost(t)} 햇살을 먼저 써 보세요`;}
 if(!next&&sun(s)>=DEFENSE.plantCost&&s.towers.length<defenseSeedCap(s))next=`남은 햇살 ${sun(s)} · 쓸 여력이 있었어요 · 다음에는 길 가까운 빈 화단에 씨앗 하나를 더 심어요`;
 if(!next){const site=betterSite(s);if(site)next=`다음에는 ${label(site.t)}을 ${direction(site.t,site.cell)} 빈 화단으로 옮겨요 · 이번 자리보다 사거리에 들어오는 길이 길어요`;}
 if(!next){const t=s.towers.find(t=>t.level<5);next=t?`다음에는 씨앗을 더 심기 전에 ${label(t)} 강화에 ${defenseUpgradeCost(t)} 햇살을 남겨 두세요 · 이번 강화 Lv.${t.level}/5`:`이번 ${s.wave}차 습격에서 ${s.leaked||0}마리가 통과했어요 · 다음에는 입구와 출구로 화력을 나눠 통과에 대비해 보세요`;}
 return {cause,next,summary:`씨앗 ${s.towers.length}개 · 진화 ${s.towers.filter(t=>t.formId).length}개 · 통과 ${s.leaked||0}마리`};
}
