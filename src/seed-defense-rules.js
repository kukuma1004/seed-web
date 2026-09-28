import {DEFENSE_FORMS,FUSIONS,defenseFusionOf,defenseFormKind,defenseRankTotal,defenseFormStats,getDefenseEvolutionOptions,validDefenseForm} from './seed-defense-catalog.js';
export {FUSIONS,getDefenseEvolutionOptions};
export {DEFENSE_CATALOG,DEFENSE_FORMS,DEFENSE_CATALOG_COUNTS,defenseDamageMultiplier} from './seed-defense-catalog.js';
// Renderer-independent, seeded tower defence. All distances are garden units.
export const DEFENSE = Object.freeze({width:100,height:60,maxEnemies:120,maxShots:180,maxEffects:100,waves:12,acts:3,defaultSpeed:2,fastSpeed:3,plantCost:30,rerollCost:15,maxSeeds:16,maxStars:12});
export const PATH = Object.freeze([{x:-4,y:12},{x:76,y:12},{x:76,y:30},{x:24,y:30},{x:24,y:48},{x:104,y:48}].map(Object.freeze));
// 2026-09-28 사용자: "배치할 때 안 예쁘다 · 칸막이처럼 영역이 정해져야" — 아무 데나 심던 방식 대신 정해진 화단 칸.
// 가로 8·세로 9 간격이라 이웃 칸의 씨앗이 겹치지 않고, 길에서 7 이상 떨어진 칸만 쓴다(길 사이 두 줄 + 양옆).
export const DEFENSE_CELLS = Object.freeze([
 ...[6,14,22,30,38,46,54,62,86,94].map(x=>({x,y:21})),
 ...[6,14,86,94].map(x=>({x,y:30})),
 ...[6,14,38,46,54,62,70,78,86,94].map(x=>({x,y:39}))
].map(Object.freeze));
export const DEFENSE_CELL_SIZE = Object.freeze({w:8,h:9});
export const PADS = Object.freeze([{x:14,y:21},{x:38,y:21},{x:62,y:21},{x:86,y:21},{x:14,y:39},{x:38,y:39},{x:62,y:39},{x:86,y:39},
 {x:22,y:21},{x:46,y:21},{x:94,y:21},{x:6,y:30},{x:94,y:30},{x:54,y:39},{x:70,y:39},{x:6,y:39}].map(Object.freeze));
// 2026-09-28 사용자: "씨앗 8개가 한계면 순환이 올라가면 못 깨는 거 아니야?" — 순환(36습격)을 넘길 때마다 씨앗 칸 +2(최대 16).
export function defenseSeedCap(s){return Math.min(DEFENSE.maxSeeds,8+2*Math.floor(Math.max(0,s?.wave||0)/36));}
// 누른 곳이 속한 칸(칸 안쪽이면). 없으면 null.
export function defenseCellAt(x,y){return DEFENSE_CELLS.find(c=>Math.abs(c.x-x)<=DEFENSE_CELL_SIZE.w/2&&Math.abs(c.y-y)<=DEFENSE_CELL_SIZE.h/2)||null;}
const law = (id,name,color,desc)=>Object.freeze({id,name,color,desc});
export const DEFENSE_LAWS = Object.freeze({
 burst:law('burst','폭발','#ff986b','적중 지점에서 작은 원으로 함께 터집니다.'),
 frost:law('frost','빙결','#8ce9ff','적을 늦춰 다른 씨앗의 사격 시간을 벌어 줍니다.'),
 chain:law('chain','연쇄','#ffdd78','가까운 적 세 마리를 번개로 잇습니다.'),
 pierce:law('pierce','관통','#b9efff','긴 직선으로 적 넷을 꿰뚫고 방패를 무시합니다.'),
 split:law('split','분열','#b5ec83','꽃잎 세 장이 서로 다른 적을 찾아갑니다.'),
 reflect:law('reflect','반사','#f3d8ff','적을 맞힌 수정탄이 다른 적에게 두 번 튕깁니다.'),
 recall:law('recall','귀환','#9cf0ba','칼날이 날아갔다 돌아오며 두 번 벱니다.'),
 gravity:law('gravity','중력','#b89bff','짧게 남는 중력장이 적을 뒤로 끌어 모읍니다.'),
 orbit:law('orbit','공전','#ffeaa0','짧은 사거리 안의 모든 적을 회전 고리로 벱니다.'),
});
const IDS=Object.keys(DEFENSE_LAWS), SEGMENTS=PATH.slice(1).map((p,i)=>Math.hypot(p.x-PATH[i].x,p.y-PATH[i].y));
export const DEFENSE_PATH_LENGTH=SEGMENTS.reduce((a,b)=>a+b,0);
const dist2=(a,b)=>(a.x-b.x)**2+(a.y-b.y)**2;
const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
const canBuild=s=>s.phase==='build'||s.phase==='draft';
// 2026-09-28 사용자: "진행되면 강화·조합 선택을 못 해서 위험이 크다 · 모으면 합체되는 방식" — 심기·합체·강화·이동은 습격 중에도 된다.
const canAct=s=>s.phase!=='lost'&&s.phase!=='won';
const matchFusion=defenseFusionOf;
function random(s){s.rng=(Math.imul(s.rng,1664525)+1013904223)>>>0;return s.rng/4294967296;}
export function defensePoint(progress){let p=clamp(progress,0,DEFENSE_PATH_LENGTH);for(let i=0;i<SEGMENTS.length;i++){if(p<=SEGMENTS[i]){const t=p/SEGMENTS[i];return {x:PATH[i].x+(PATH[i+1].x-PATH[i].x)*t,y:PATH[i].y+(PATH[i+1].y-PATH[i].y)*t};}p-=SEGMENTS[i];}return {...PATH.at(-1)};}
export function createDefense(seed=1){const n=Number.isFinite(seed)?seed>>>0:1;const s={version:5,runId:globalThis.crypto?.randomUUID?.()||`${Date.now()}-${n}-${Math.floor(Math.random()*1e9)}`,bossWins:{austin:0,alwaysbeginner:0,tempestcarrier:0},pendingBosses:[],pads:PADS.map(p=>({...p})),seed:n,rng:n,phase:'build',wave:0,coreHp:20,currency:90,time:0,towers:[],enemies:[],shots:[],effects:[],fields:[],offers:[],kills:0,selectedPad:0,draftCredit:0,nextId:1,spawned:0,spawnTimer:0,waveTime:0,leaked:0,stats:{damage:0,shots:0,slows:0,pulls:0,chains:0,blocked:0},lastEvent:'땅을 골라 씨앗을 심으세요. 무작위 법칙이 싹터요.'};s.offers=getDefenseOffers(s);return s;}
export function defenseUpgradeCost(t){return t&&t.level<5?25+t.level*15:Infinity;}
export function defenseTowerName(t){return (!t?'빈 화단':t.formId?DEFENSE_FORMS[t.formId].name:t.laws.length?`${DEFENSE_LAWS[t.laws[0]].name} 씨앗`:'씨앗')+(t?.stars?` ★${t.stars}`:'');}
export function defenseTowerStats(t){
 if(t.formId)return {...defenseFormStats(t),upgradeCost:defenseUpgradeCost(t)};
 const id=t.laws[0]||'seed',growth=1+(t.level-1)*.42+Math.max(0,defenseRankTotal(t)-t.laws.length)*.85;
 const specs={seed:[14,.8,20],burst:[17,1.1,20],frost:[12,.9,21],chain:[14,1.15,21],pierce:[22,1.2,25],split:[11,1,20],reflect:[17,1.1,22],recall:[20,1.3,23],gravity:[12,1.4,21],orbit:[15,.85,14]};
 const [damage,interval,range]=specs[id]||specs.seed;return {id,damage:damage*growth,interval:interval/(1+(t.level-1)*.04),range:range+(t.level-1)*.6,upgradeCost:defenseUpgradeCost(t)};
}
export function getDefenseOffers(s,towerId){
 const t=s.towers.find(t=>t.id===towerId)||(towerId===undefined?s.towers.find(t=>t.pad===s.selectedPad):null);
 return t?.laws.length===2?[...t.laws]:[...IDS];
}
export function defenseCanChoose(s,towerId,id){const t=s.towers.find(t=>t.id===towerId);return !!(canBuild(s)&&s.draftCredit===1&&t&&DEFENSE_LAWS[id]&&getDefenseOffers(s,towerId).includes(id)&&(t.laws.includes(id)||(t.laws.length<2&&(t.laws.length===0||matchFusion([...t.laws,id])))));}
// Free positions share the same bounded eight tower slots. Empty slots do not block ground.
export function defensePlacement(s,x,y,pad=-1){
 if(!Number.isFinite(x)||!Number.isFinite(y)||x<0||x>98||y<5||y>55)return '정원 안쪽 땅을 골라 주세요';
 if(!DEFENSE_CELLS.some(c=>c.x===x&&c.y===y))return '화단 칸 안에 심어 주세요';
 for(let i=1;i<PATH.length;i++)if(segmentDistance2({x,y},PATH[i-1].x,PATH[i-1].y,PATH[i].x,PATH[i].y)<36)return '적이 다니는 길에는 심을 수 없어요';
 if(dist2({x,y},PATH.at(-1))<81)return '정원의 심장 주변은 비워 주세요';
 if(s.towers.some(t=>t.pad!==pad&&dist2(t,{x,y})<49))return '이미 씨앗이 자라는 칸이에요';
 return '';
}
export function placeDefensePad(s,pad,x,y){
 if(!canAct(s)||!Number.isInteger(pad)||pad<0||pad>=s.pads.length||defensePlacement(s,x,y,pad))return false;
 s.pads[pad]={x,y};const t=s.towers.find(t=>t.pad===pad);if(t){t.x=x;t.y=y;}s.selectedPad=pad;return true;
}
export function plantDefense(s,padIndex){
 const p=s.pads?.[padIndex];if(s.towers.length>=defenseSeedCap(s)){s.lastEvent=`씨앗은 지금 ${defenseSeedCap(s)}개까지예요 · 순환을 넘기면 늘어나요`;return false;}if(!canAct(s)||!Number.isInteger(padIndex)||!p||s.currency<DEFENSE.plantCost||s.towers.some(t=>t.pad===padIndex)||defensePlacement(s,p.x,p.y,padIndex))return false;
 s.currency-=DEFENSE.plantCost;const law=IDS[Math.floor(random(s)*IDS.length)];s.towers.push({id:s.nextId++,pad:padIndex,x:p.x,y:p.y,level:1,stars:0,laws:[law],lawRanks:{[law]:1},formId:null,fusion:null,reinforce:0,ultimateCharge:0,angle:0,shotTime:0,mirrorTime:0});s.selectedPad=padIndex;s.offers=[];s.lastEvent=`${DEFENSE_LAWS[law].name} 씨앗이 싹텄어요`;return true;
}
export function upgradeDefense(s,id){const t=s.towers.find(t=>t.id===id),cost=defenseUpgradeCost(t);if(!canAct(s)||!t||s.currency<cost||!Number.isFinite(cost))return false;s.currency-=cost;t.level++;return true;}
export function chooseDefenseLaw(s,towerId,id){
 if(!defenseCanChoose(s,towerId,id))return false;
 const t=s.towers.find(t=>t.id===towerId);t.lawRanks??=Object.fromEntries(t.laws.map(l=>[l,1]));
 if(!t.laws.includes(id))t.laws.push(id);t.lawRanks[id]=(t.lawRanks[id]||0)+1;
 t.fusion=matchFusion(t.laws);
 if(t.laws.length===2&&(!t.formId||defenseFormKind(t.formId)==='fusion'))t.formId=t.fusion;
 s.draftCredit=0;s.phase='build';s.offers=[];s.lastEvent=`${defenseTowerName(t)} · ${DEFENSE_LAWS[id].name} ${t.lawRanks[id]}단계`;return true;
}
// 합체: 한 씨앗을 다른 씨앗 위에 놓으면 하나가 된다(놓인 쪽 자리에 남는다).
// 같은 법칙은 단계가 더해지고(최대 3), 다른 법칙끼리는 융합. 가능한 가장 높은 형태로 저절로 진화한다:
// 한 법칙 3단계 = 단독, 두 법칙 = 융합, 융합 + 한쪽 3단계 = 완성, 양쪽 3단계 = 쌍둥이.
function bestForm(t){
 if(t.laws.length===1){const o=getDefenseEvolutionOptions({laws:t.laws,lawRanks:t.lawRanks,formId:null});return o[0]?.id||null;}
 const fusion=defenseFusionOf(t.laws);if(!fusion)return null;const o=getDefenseEvolutionOptions({laws:t.laws,lawRanks:t.lawRanks,formId:fusion});
 return (o.find(f=>f.kind==='twin')||o.find(f=>f.kind==='final'))?.id||fusion;
}
export function defenseMergeResult(s,fromId,toId){
 const a=s.towers.find(t=>t.id===fromId),b=s.towers.find(t=>t.id===toId);if(!a||!b||a===b)return {ok:false,reason:'합칠 씨앗을 골라요'};
 const laws=[...new Set([...b.laws,...a.laws])];if(laws.length>2)return {ok:false,reason:'법칙은 두 가지까지만 합칠 수 있어요'};if(!laws.length)return {ok:false,reason:'법칙이 없는 씨앗이에요'};
 const lawRanks=Object.fromEntries(laws.map(l=>[l,Math.min(3,(a.lawRanks[l]||0)+(b.lawRanks[l]||0))]));
 // 3단계를 넘친 만큼과 합쳐지는 씨앗의 별은 별(★)이 된다(최대 12).
 const overflow=laws.reduce((n,l)=>n+Math.max(0,(a.lawRanks[l]||0)+(b.lawRanks[l]||0)-3),0),stars=Math.min(DEFENSE.maxStars,(b.stars||0)+(a.stars||0)+overflow),gained=stars-(b.stars||0);
 if(laws.length===2&&!defenseFusionOf(laws))return {ok:false,reason:'이 두 법칙은 합칠 수 없어요'};
 const same=laws.every(l=>lawRanks[l]===(b.lawRanks[l]||0))&&laws.length===b.laws.length;if(same&&gained<=0)return {ok:false,reason:(b.stars||0)>=DEFENSE.maxStars?'별이 가득 찼어요':'더 오를 단계가 없어요'};
 const formId=bestForm({laws,lawRanks}),form=formId?DEFENSE_FORMS[formId]:null;
 return {ok:true,laws,lawRanks,formId,stars,gained,level:Math.max(a.level,b.level),name:(form?form.name:`${DEFENSE_LAWS[laws[0]].name} 씨앗 ${lawRanks[laws[0]]}단계`)+(stars?` ★${stars}`:''),kind:form?.kind||'base'};
}
export function mergeDefense(s,fromId,toId){
 if(!canAct(s))return false;const r=defenseMergeResult(s,fromId,toId);if(!r.ok){s.lastEvent=r.reason;return false;}
 const a=s.towers.find(t=>t.id===fromId),b=s.towers.find(t=>t.id===toId);
 Object.assign(b,{laws:r.laws,lawRanks:r.lawRanks,stars:r.stars,formId:r.formId,fusion:r.laws.length===2?defenseFusionOf(r.laws):null,level:r.level,ultimateCharge:Math.max(a.ultimateCharge||0,b.ultimateCharge||0),shotTime:0,mirrorTime:0});
 s.towers.splice(s.towers.indexOf(a),1);s.selectedPad=b.pad;s.merges=(s.merges||0)+1;s.lastEvent=`합체 · ${r.name}`;effect(s,'burst',b.x,b.y,'#fff1b9',{radius:4,life:.6,maxLife:.6});return true;
}
// 한 단계짜리 씨앗은 햇살을 조금 써서 법칙을 다시 뽑을 수 있다.
// 다음에 무엇을 합치면 어떤 형태가 되는지(법칙마다 3단계까지 채웠을 때). 패널·끌기 미리 보기에서 쓴다.
export function defenseNextSteps(t){
 if(!t?.laws?.length)return [];
 return t.laws.filter(l=>(t.lawRanks[l]||0)<3).map(l=>{const ranks={...t.lawRanks,[l]:3},formId=bestForm({laws:t.laws,lawRanks:ranks});return {law:l,need:3-(t.lawRanks[l]||0),formId,name:formId?DEFENSE_FORMS[formId].name:'',kind:formId?DEFENSE_FORMS[formId].kind:''};});
}
// 2026-09-28 사용자: "폐기하고 다시 새롭게 할 수 없나? 조합 올렸다가 맘에 안 들 수도 있잖아"
// 씨앗 뽑기: 들인 햇살(심기 × 합친 씨앗 수 + 강화)의 절반을 돌려받고 자리를 비운다. 습격 중에도 된다.
export function defenseRemoveRefund(t){if(!t)return 0;const seeds=Math.max(1,defenseRankTotal(t)+(t.stars||0));let upgrades=0;for(let l=1;l<t.level;l++)upgrades+=defenseUpgradeCost({level:l});return Math.floor((seeds*DEFENSE.plantCost+upgrades)*.5);}
export function removeDefense(s,id){
 const t=s.towers.find(t=>t.id===id);if(!canAct(s)||!t)return false;const refund=defenseRemoveRefund(t);
 s.towers.splice(s.towers.indexOf(t),1);s.currency+=refund;s.selectedPad=t.pad;s.lastEvent=`${defenseTowerName(t)}을(를) 뽑았어요 · 햇살 ${refund} 돌려받음`;effect(s,'burst',t.x,t.y,'#e9dfae',{radius:3,life:.5,maxLife:.5});return true;
}
export function rerollDefense(s,id){
 const t=s.towers.find(t=>t.id===id);if(!canAct(s)||!t||t.formId||t.laws.length!==1||t.lawRanks[t.laws[0]]!==1||s.currency<DEFENSE.rerollCost)return false;
 const pool=IDS.filter(l=>l!==t.laws[0]),law=pool[Math.floor(random(s)*pool.length)];s.currency-=DEFENSE.rerollCost;t.laws=[law];t.lawRanks={[law]:1};s.lastEvent=`${DEFENSE_LAWS[law].name} 씨앗으로 바뀌었어요`;return true;
}
export function evolveDefense(s,towerId,formId){
 if(!canAct(s))return false;const t=s.towers.find(t=>t.id===towerId);
 if(!t||!getDefenseEvolutionOptions(t).some(f=>f.id===formId))return false;
 t.formId=formId;t.shotTime=0;s.lastEvent=`${defenseTowerName(t)} 진화 완성`;return true;
}
export const DEFENSE_ACTS=Object.freeze([
 Object.freeze({name:'잠든 정원',boss:'오스틴',id:'austin'}),
 Object.freeze({name:'별빛 야구장',boss:'항상초심',id:'alwaysbeginner'}),
 Object.freeze({name:'폭풍 항로',boss:'요한',id:'tempestcarrier'})
]);
export function defenseWaveInfo(wave){
 const w=Math.max(1,Math.floor(Number.isFinite(wave)?wave:1)),localWave=(w-1)%12+1,act=Math.floor((w-1)/12)%3,lap=Math.floor((w-1)/36),tier=act+lap*3,boss=localWave%4===0,final=localWave===12;
 // Pressure rises continuously at act boundaries. Crowd, speed and shot counts
 // stay capped; later loops primarily demand stronger placement and builds.
 const stage=Math.min(36,w),hp=(27+stage*7+stage*stage*2.7)*(1+Math.max(0,w-36)*.055);
 return {wave:w,localWave,act,lap,final,boss,bossId:final?DEFENSE_ACTS[act].id:null,
  count:Math.min(90,9+localWave*3+tier*8)+(boss?1:0),interval:Math.max(.16,.76-localWave*.035-tier*.055),hp,
  bossHp:final?7500*(1+tier*.75):(27+localWave*7+localWave*localWave*2.7)*15*(1+tier*.5),
  speed:Math.min(14,7.5+w*.2),title:final?DEFENSE_ACTS[act].boss:boss?`${act+1}막 ${localWave/4}번째 문지기`:['첫 침입','달리는 그림자','방패 행렬'][(localWave-1)%3],
  desc:final?`${DEFENSE_ACTS[act].boss}를 쓰러뜨리면 공통 칭호 격파 수에 반영돼요. 같은 보스를 한 판에서 세 번 이기면 완주 칭호를 받아요.`:boss?'문지기는 후반 경로에서 정원의 심장을 공격해요.':'빠른 적과 방패 적을 막으세요. 관통은 방패를 무시해요.'};
}
export function startDefenseWave(s){if(s.phase!=='build'||!s.towers.length)return false;s.wave++;s.phase='wave';s.spawned=0;s.spawnTimer=.2;s.waveTime=0;s.shots.length=0;s.fields.length=0;for(const t of s.towers){t.shotTime=0;t.mirrorTime=0;}const info=defenseWaveInfo(s.wave);s.lastEvent=`${info.lap+1}순환 · ${info.act+1}막 ${info.localWave}/12 · ${info.title}`;return true;}
function effect(s,kind,x,y,color,extra={}){if(s.effects.length>=DEFENSE.maxEffects)return;s.effects.push({kind,x,y,tx:x,ty:y,color,life:.35,maxLife:.35,...extra});}
function compact(a,predicate){let write=0;for(let i=0;i<a.length;i++)if(predicate(a[i]))a[write++]=a[i];a.length=write;}
function slow(s,e,strength=.5,duration=1.6){e.slow=Math.min(e.slow||1,e.kind==='boss'?Math.max(.72,strength):strength);e.slowTime=Math.max(e.slowTime||0,duration);s.stats.slows++;}
function hurt(s,e,damage,ignoreShield=false){if(e.hp<=0||!Number.isFinite(damage)||damage<=0)return;const d=damage*(e.kind==='shield' && !ignoreShield ? .58 : 1);s.stats.damage+=Math.min(e.hp,d);e.hp-=d;if(e.hp<=0){s.kills++;if(e.bossId&&Object.hasOwn(s.bossWins,e.bossId)){const ordinal=++s.bossWins[e.bossId];s.pendingBosses.push({boss:e.bossId,ordinal,wave:s.wave});}s.currency+=e.kind==='boss'?28:e.kind==='shield'?5:3;effect(s,'death',e.x,e.y,'#e0e9a8',{life:.45,maxLife:.45,radius:e.kind==='boss'?7:2});}}
function nearest(s,p,range,skip){let best=null,d=range*range;for(const e of s.enemies){if(e.hp<=0||skip?.includes(e.id))continue;const d2=dist2(e,p);if(d2<d){d=d2;best=e;}}return best;}
function front(s,p,range,skip){let best=null;for(const e of s.enemies)if(e.hp>0&&dist2(p,e)<=range*range&&!skip?.includes(e.id)&&(!best||e.progress>best.progress))best=e;return best;}
function chain(s,from,damage,count,icy=false,skip=[]){let prev=from;const hit=[...skip,from.id];if(icy)slow(s,from);for(let i=0;i<count;i++){const next=nearest(s,prev,12,hit);if(!next)break;effect(s,'chain',prev.x,prev.y,icy?'#8ce9ff':'#ffdd78',{tx:next.x,ty:next.y});hurt(s,next,damage,true);if(icy)slow(s,next);s.stats.chains++;hit.push(next.id);prev=next;}}
function blast(s,p,damage,radius,id){effect(s,'burst',p.x,p.y,DEFENSE_LAWS[id]?.color||'#ff986b',{radius,life:.5,maxLife:.5});for(const e of s.enemies)if(e.hp>0&&dist2(e,p)<=radius*radius)hurt(s,e,damage);}
function field(s,p,damage,kind){if(s.fields.length>=24)return;s.fields.push({x:p.x,y:p.y,kind,damage,life:kind==='collapse'?1.25:2.1,maxLife:kind==='collapse'?1.25:2.1,radius:kind==='collapse'?9:kind==='web'?7:6,tick:0});}
function shoot(s,t,e,stats,extra={}){if(s.shots.length>=DEFENSE.maxShots)return;const angle=Math.atan2(e.y-t.y,e.x-t.x),speed=stats.id==='recall'?35:48;const q={id:s.nextId++,x:t.x,y:t.y,tx:e.x,ty:e.y,vx:Math.cos(angle)*speed,vy:Math.sin(angle)*speed,life:2.2,age:0,law:stats.id,damage:stats.damage,towerId:t.id,targetId:e.id,speed,hit:[],bounces:stats.id==='reflect'?2:0,returning:false,originX:t.x,originY:t.y,...extra};s.shots.push(q);s.stats.shots++;}
function fire(s,t,stats){const target=front(s,t,stats.range);if(!target)return false;t.angle=Math.atan2(target.y-t.y,target.x-t.x);const id=stats.id;
 if(id==='orbit'){effect(s,'orbit',t.x,t.y,'#ffeaa0',{radius:stats.range,life:.55,maxLife:.55});for(const e of s.enemies)if(e.hp>0&&dist2(t,e)<=stats.range**2)hurt(s,e,stats.damage);return true;}
 if(id==='split'){const hit=[];for(let i=0;i<3;i++){const e=front(s,t,stats.range,hit);if(!e)break;hit.push(e.id);shoot(s,t,e,stats,{age:-i*.04});}return true;}
 shoot(s,t,target,stats);return true;
}
function impact(s,q,e){const id=q.law;hurt(s,e,q.damage,id==='pierce');effect(s,'hit',e.x,e.y,DEFENSE_LAWS[id]?.color||'#f8e4ac',{radius:2});
 if(id==='frost')slow(s,e);
 if(id==='burst')blast(s,e,q.damage*.6,6,'burst');
 if(id==='chain')chain(s,e,q.damage*.65,2,false,q.hit);
 if(id==='gravity')field(s,e,q.damage,'gravity');
}
function segmentDistance2(p,ax,ay,bx,by){const dx=bx-ax,dy=by-ay,d=dx*dx+dy*dy,t=d?clamp(((p.x-ax)*dx+(p.y-ay)*dy)/d,0,1):0;return (p.x-ax-dx*t)**2+(p.y-ay-dy*t)**2;}
function moveShots(s,dt){const count=s.shots.length;for(let i=0;i<count;i++){const q=s.shots[i];q.life-=dt;q.age+=dt;if(q.life<=0||q.age<0)continue;
 const linear=q.law==='pierce'||q.law==='recall',returning=q.law==='recall';
 if(returning&&!q.returning&&q.age>.68){q.returning=true;q.hit=[];}
 let target=q.returning?{x:q.originX,y:q.originY}:q.law==='hostile'?PATH.at(-1):s.enemies.find(e=>e.id===q.targetId&&e.hp>0);
 if(!linear){if(!target&&q.law!=='hostile'){target=nearest(s,q,15,q.hit);q.targetId=target?.id;}if(!target){q.life=0;continue;}}
 if((!linear||q.returning)&&target){const a=Math.atan2(target.y-q.y,target.x-q.x);q.vx=Math.cos(a)*q.speed;q.vy=Math.sin(a)*q.speed;q.tx=target.x;q.ty=target.y;}
 const ox=q.x,oy=q.y;q.x+=q.vx*dt;q.y+=q.vy*dt;
 if(q.returning&&segmentDistance2({x:q.originX,y:q.originY},ox,oy,q.x,q.y)<1){q.life=0;continue;}
 if(q.law==='hostile'){

  if(q.life>0&&segmentDistance2(PATH.at(-1),ox,oy,q.x,q.y)<2){s.coreHp=Math.max(0,s.coreHp-1);q.life=0;effect(s,'core',100,48,'#ff6677',{radius:5});}continue;
 }
 for(const e of s.enemies){if(e.hp<=0||q.hit.includes(e.id)||segmentDistance2(e,ox,oy,q.x,q.y)>(e.kind==='boss'?3.2:1.5)**2)continue;q.hit.push(e.id);impact(s,q,e);
  if(q.bounces>0){const next=nearest(s,e,17,q.hit);if(next){q.bounces--;q.targetId=next.id;q.x=e.x;q.y=e.y;q.life=Math.max(q.life,.7);effect(s,'reflect',e.x,e.y,'#f3d8ff',{tx:next.x,ty:next.y});break;}}
  if(!linear||(!returning&&q.hit.length>=4)||(q.law==='recall'&&q.hit.length>=3)){q.life=0;break;}
 }
 if(q.x<-15||q.x>115||q.y<-15||q.y>75)q.life=0;
}compact(s.shots,q=>q.life>0);}
function spawn(s,info){const index=s.spawned++,boss=info.boss&&index===info.count-1,r=random(s),kind=boss?'boss':s.wave>=3&&index%5===3?'shield':s.wave>=2&&index%4===1?'fast':s.wave>=6&&index%7===0?'resilient':'normal';const hp=(boss?info.bossHp:info.hp)*(boss?1:kind==='shield'?1.5:kind==='resilient'?2:kind==='fast'?.65:1);const speed=(info.speed)*(boss?.68:kind==='fast'?1.65:kind==='resilient'?.8:1);s.enemies.push({id:s.nextId++,x:PATH[0].x,y:PATH[0].y,progress:0,hp,maxHp:hp,kind,bossId:boss?info.bossId:null,act:info.act,speed:speed*(.97+r*.06),slow:1,slowTime:0,attackTime:4,leakDamage:boss?5:kind==='resilient'?2:1});}
function tick(s,dt,combat){s.time+=dt;for(const e of s.effects)e.life-=dt;compact(s.effects,e=>e.life>0);if(s.phase!=='wave')return;
 s.waveTime+=dt;const info=defenseWaveInfo(s.wave);s.spawnTimer-=dt;
 if(s.spawned<info.count&&s.spawnTimer<=0&&s.enemies.length<DEFENSE.maxEnemies){spawn(s,info);s.spawnTimer+=info.interval;}
 for(const e of s.enemies){if(e.hp<=0)continue;e.pullThisTick=0;e.slowTime=Math.max(0,e.slowTime-dt);if(!e.slowTime)e.slow=1;const rush=e.bossId==='austin'&&e.hp<e.maxHp*.4?1.22:e.bossId==='alwaysbeginner'&&s.waveTime%6<1.4?1.4:1;e.progress+=e.speed*e.slow*rush*dt;Object.assign(e,defensePoint(e.progress));
  if(e.kind==='boss'&&e.progress>DEFENSE_PATH_LENGTH*.72){e.attackTime-=dt;if(e.attackTime<=0&&s.shots.length<DEFENSE.maxShots){e.attackTime=e.bossId==='tempestcarrier'?3:e.bossId==='alwaysbeginner'?4:5;s.shots.push({id:s.nextId++,x:e.x,y:e.y,tx:104,ty:48,vx:0,vy:0,speed:17,life:12,age:0,law:'hostile',damage:1,hit:[],ownerId:e.id});effect(s,'warning',e.x,e.y,'#ff6677',{radius:5,life:.7,maxLife:.7});}}
  if(e.progress>=DEFENSE_PATH_LENGTH){s.coreHp=Math.max(0,s.coreHp-e.leakDamage);s.leaked++;e.hp=0;effect(s,'core',100,48,'#ff6677',{radius:5});}
 }
 for(const f of s.fields){f.life-=dt;f.tick-=dt;for(const e of s.enemies){if(e.hp<=0||dist2(e,f)>f.radius**2)continue;if(f.kind==='web'){slow(s,e,.5,.3);if(f.tick<=0)hurt(s,e,f.damage*.12,true);}else{slow(s,e,.7,.25);const allowance=dt*(e.kind==='boss'?1.5:Math.min(5,e.speed*.3)),pull=Math.max(0,allowance-(e.pullThisTick||0));e.pullThisTick=(e.pullThisTick||0)+pull;e.progress=Math.max(0,e.progress-pull);Object.assign(e,defensePoint(e.progress));s.stats.pulls++;}}if(f.tick<=0)f.tick=.3;if(f.life<=0&&f.kind==='collapse')blast(s,f,f.damage*2.1,9,'gravity');}
 compact(s.fields,f=>f.life>0);
 for(const t of s.towers){t.shotTime=Math.max(0,t.shotTime-dt);t.mirrorTime=Math.max(0,t.mirrorTime-dt);if(!t.formId&&t.shotTime===0){const stats=defenseTowerStats(t);if(fire(s,t,stats))t.shotTime=stats.interval;}}
 combat?.update(dt);
 moveShots(s,dt);compact(s.enemies,e=>e.hp>0);
 if(s.coreHp<=0){s.phase='lost';s.lastEvent='핵이 무너졌습니다. 위치와 법칙 조합을 바꿔 다시 도전하세요.';return;}
 if(s.spawned===info.count&&!s.enemies.length&&!s.shots.some(q=>q.law==='hostile')){s.currency+=25+s.wave*2;s.shots.length=0;s.fields.length=0;s.phase='build';s.draftCredit=0;s.offers=[];s.lastEvent=info.final?`${info.title}의 습격을 막았어요 · 다음 막으로 이어집니다`:'습격을 막았어요 · 씨앗을 더 심고 합체해 보세요';}
}
export function stepDefense(s,dt,combat=null){if(!s||!Number.isFinite(dt)||dt<=0||s.phase==='lost'||s.phase==='won')return s;let remaining=Math.min(.1,dt);while(remaining>1e-8){const step=Math.min(1/60,remaining);tick(s,step,combat);remaining-=step;if(s.phase==='lost'||s.phase==='won')break;}return s;}

export {hurt as defenseHurt,effect as defenseEffect,slow as defenseSlow};

// Between-wave snapshots only. A combat adapter is never serialized.
export function checkpointDefense(s){if(!canBuild(s))return null;return {version:5,runId:s.runId,bossWins:{...s.bossWins},pendingBosses:s.pendingBosses.map(e=>({...e})),pads:s.pads.map(p=>({...p})),seed:s.seed,rng:s.rng,phase:s.phase,wave:s.wave,coreHp:s.coreHp,currency:s.currency,time:s.time,kills:s.kills,leaked:s.leaked,selectedPad:s.selectedPad,draftCredit:s.draftCredit,nextId:s.nextId,towers:s.towers.map(t=>({id:t.id,pad:t.pad,level:t.level,laws:[...t.laws],lawRanks:{...t.lawRanks},formId:t.formId,stars:t.stars||0,reinforce:t.reinforce,ultimateCharge:t.ultimateCharge})),stats:{...s.stats}};}
export function restoreDefense(raw){
 // 합체 방식(v5)부터는 예전 준비 저장(법칙 고르기 방식)을 불러오지 않는다.
 try{const r=typeof raw==='string'?JSON.parse(raw):raw;if(!r||r.version!==5||r.phase!=='build')return null;
 const integer=(v,a,b)=>Number.isInteger(v)&&v>=a&&v<=b,finite=(v,a,b)=>Number.isFinite(v)&&v>=a&&v<=b;
 if(!integer(r.seed,0,4294967295)||!integer(r.rng,0,4294967295)||!integer(r.wave,0,1000000)||!integer(r.coreHp,1,20)||!integer(r.currency,0,1e12)||!finite(r.time,0,1e12)||!integer(r.kills,0,1e9)||!integer(r.leaked,0,1e9)||!integer(r.selectedPad,0,DEFENSE.maxSeeds-1)||!integer(r.draftCredit,0,1)||!integer(r.nextId,1,1e12))return null;
 if(r.draftCredit!==0||!Array.isArray(r.towers)||r.towers.length>defenseSeedCap({wave:r.wave}))return null;
 if((Array.isArray(r.enemies)&&r.enemies.length)||(Array.isArray(r.shots)&&r.shots.length)||(Array.isArray(r.fields)&&r.fields.length))return null;
 const s=createDefense(r.seed);
 if(r.version>=4){if(typeof r.runId!=='string'||! /^[\w-]{1,90}$/.test(r.runId)||!r.bossWins||Object.keys(s.bossWins).some((id,i)=>!integer(r.bossWins[id],0,Math.max(0,Math.floor((r.wave-12*(i+1))/36)+1))))return null;s.runId=r.runId;s.bossWins=Object.fromEntries(Object.keys(s.bossWins).map(id=>[id,r.bossWins[id]]));if(!Array.isArray(r.pendingBosses)||r.pendingBosses.length>90||r.pendingBosses.some(e=>!e||!Object.hasOwn(s.bossWins,e.boss)||!integer(e.ordinal,1,s.bossWins[e.boss])||!integer(e.wave,1,r.wave)||defenseWaveInfo(e.wave).bossId!==e.boss))return null;s.pendingBosses=r.pendingBosses.map(e=>({boss:e.boss,ordinal:e.ordinal,wave:e.wave}));}
 else s.runId=`legacy-${r.seed}`;
 for(const key of ['rng','phase','wave','coreHp','currency','time','kills','leaked','selectedPad','draftCredit','nextId'])s[key]=r[key];
 if(r.version>=3){if(!Array.isArray(r.pads)||![8,DEFENSE.maxSeeds].includes(r.pads.length)||r.pads.some(p=>!p||!finite(p.x,0,98)||!finite(p.y,5,55)))return null;s.pads=r.pads.map(p=>({x:p.x,y:p.y}));while(s.pads.length<DEFENSE.maxSeeds)s.pads.push({...PADS[s.pads.length]});}
 // 화단 칸이 생기기 전 저장: 심은 씨앗부터 가장 가까운 빈 칸으로 옮겨 앉힌다.
 {const used=new Set(),planted=new Set(r.towers.map(t=>t?.pad));const order=[...s.pads.keys()].sort((a,b)=>Number(planted.has(b))-Number(planted.has(a)));
  for(const i of order){const p=s.pads[i],cell=DEFENSE_CELLS.filter(c=>!used.has(c)).sort((a,b)=>dist2(a,p)-dist2(b,p))[0];used.add(cell);s.pads[i]={x:cell.x,y:cell.y};}}
 const pads=new Set(),ids=new Set();for(const t of r.towers){
  if(!t||!integer(t.id,1,r.nextId-1)||ids.has(t.id)||!integer(t.pad,0,DEFENSE.maxSeeds-1)||pads.has(t.pad)||!integer(t.level,1,5)||!integer(t.reinforce,0,r.wave+1)||!Array.isArray(t.laws)||t.laws.length>2||new Set(t.laws).size!==t.laws.length||t.laws.some(l=>!IDS.includes(l))||t.laws.length===2&&!matchFusion(t.laws))return null;
  // v1 did not record which ingredient received repeats. Preserve those points
  // as generic reinforcement, not invented law ranks or free branch eligibility.
  const ranks=r.version===1?Object.fromEntries(t.laws.map(l=>[l,1])):t.lawRanks;
  if(!ranks||typeof ranks!=='object'||Array.isArray(ranks)||Object.keys(ranks).length!==t.laws.length||Object.keys(ranks).some(l=>!t.laws.includes(l)||!integer(ranks[l],1,3)))return null;
  const formId=r.version===1?matchFusion(t.laws):t.formId;
  if(formId!==null&&typeof formId!=='string')return null;
  const ultimateCharge=r.version===1?0:t.ultimateCharge;if(!finite(ultimateCharge,0,30))return null;
  const stars=t.stars??0;if(!integer(stars,0,DEFENSE.maxStars))return null;
  const tower={id:t.id,pad:t.pad,...s.pads[t.pad],level:t.level,stars,laws:[...t.laws],lawRanks:{...ranks},formId,fusion:matchFusion(t.laws),reinforce:t.reinforce,ultimateCharge,angle:0,shotTime:0,mirrorTime:0};
  // 합체 방식에서는 늘 가능한 가장 높은 형태로 진화해 있다. 다른 형태·단계 조작은 받지 않는다.
  if(!validDefenseForm(tower)||tower.formId!==bestForm(tower)||defensePlacement(s,tower.x,tower.y,tower.pad))return null;pads.add(t.pad);ids.add(t.id);s.towers.push(tower);
 }
 // 단계 합은 심은 씨앗 수로 정해지지 않으니(합체) 따로 세지 않는다. 씨앗 하나의 단계는 최대 3.
 if(r.stats)for(const key of Object.keys(s.stats)){if(!finite(r.stats[key],0,1e9))return null;s.stats[key]=r.stats[key];}
 s.offers=r.draftCredit?getDefenseOffers(s):[];s.lastEvent=r.version===1?'이전 저장의 강화점을 보존해 불러왔습니다.':'웨이브 사이 저장을 불러왔습니다.';return s;
 }catch{return null;}
}
