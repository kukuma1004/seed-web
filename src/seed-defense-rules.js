import {DEFENSE_FORMS,FUSIONS,defenseFusionOf,defenseFormKind,defenseRankTotal,defenseFormStats,getDefenseEvolutionOptions,validDefenseForm} from './seed-defense-catalog.js';
export {FUSIONS,getDefenseEvolutionOptions};
export {DEFENSE_CATALOG,DEFENSE_FORMS,DEFENSE_CATALOG_COUNTS,defenseDamageMultiplier} from './seed-defense-catalog.js';
// Renderer-independent, seeded tower defence. All distances are garden units.
export const DEFENSE = Object.freeze({width:100,height:60,maxEnemies:120,maxShots:180,maxEffects:100,waves:12,plantCost:30});
export const PATH = Object.freeze([{x:-4,y:12},{x:76,y:12},{x:76,y:30},{x:24,y:30},{x:24,y:48},{x:104,y:48}].map(Object.freeze));
export const PADS = Object.freeze([{x:18,y:21},{x:42,y:21},{x:63,y:21},{x:85,y:25},{x:14,y:39},{x:37,y:39},{x:59,y:39},{x:82,y:40}].map(Object.freeze));
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
const matchFusion=defenseFusionOf;
function random(s){s.rng=(Math.imul(s.rng,1664525)+1013904223)>>>0;return s.rng/4294967296;}
export function defensePoint(progress){let p=clamp(progress,0,DEFENSE_PATH_LENGTH);for(let i=0;i<SEGMENTS.length;i++){if(p<=SEGMENTS[i]){const t=p/SEGMENTS[i];return {x:PATH[i].x+(PATH[i+1].x-PATH[i].x)*t,y:PATH[i].y+(PATH[i+1].y-PATH[i].y)*t};}p-=SEGMENTS[i];}return {...PATH.at(-1)};}
export function createDefense(seed=1){const n=Number.isFinite(seed)?seed>>>0:1;const s={version:2,seed:n,rng:n,phase:'build',wave:0,coreHp:20,currency:80,time:0,towers:[],enemies:[],shots:[],effects:[],fields:[],offers:[],kills:0,selectedPad:0,draftCredit:1,nextId:1,spawned:0,spawnTimer:0,waveTime:0,leaked:0,stats:{damage:0,shots:0,slows:0,pulls:0,chains:0,blocked:0},lastEvent:'씨앗을 심고 첫 법칙을 선택하세요.'};s.offers=getDefenseOffers(s);return s;}
export function defenseUpgradeCost(t){return t&&t.level<5?25+t.level*15:Infinity;}
export function defenseTowerName(t){return !t?'빈 화단':t.formId?DEFENSE_FORMS[t.formId].name:t.laws.length?`${DEFENSE_LAWS[t.laws[0]].name} 씨앗`:'씨앗';}
export function defenseTowerStats(t){
 if(t.formId)return {...defenseFormStats(t),upgradeCost:defenseUpgradeCost(t)};
 const id=t.laws[0]||'seed',growth=1+(t.level-1)*.42+Math.max(0,defenseRankTotal(t)-t.laws.length)*.12;
 const specs={seed:[14,.8,20],burst:[17,1.1,20],frost:[12,.9,21],chain:[14,1.15,21],pierce:[22,1.2,25],split:[11,1,20],reflect:[17,1.1,22],recall:[20,1.3,23],gravity:[12,1.4,21],orbit:[15,.85,14]};
 const [damage,interval,range]=specs[id]||specs.seed;return {id,damage:damage*growth,interval:interval/(1+(t.level-1)*.04),range:range+(t.level-1)*.6,upgradeCost:defenseUpgradeCost(t)};
}
export function getDefenseOffers(s,towerId){
 const t=s.towers.find(t=>t.id===towerId)||(towerId===undefined?s.towers.find(t=>t.pad===s.selectedPad):null);
 return t?.laws.length===2?[...t.laws]:[...IDS];
}
export function defenseCanChoose(s,towerId,id){const t=s.towers.find(t=>t.id===towerId);return !!(canBuild(s)&&s.draftCredit===1&&t&&DEFENSE_LAWS[id]&&getDefenseOffers(s,towerId).includes(id)&&(t.laws.includes(id)||(t.laws.length<2&&(t.laws.length===0||matchFusion([...t.laws,id])))));}
export function plantDefense(s,padIndex){if(!canBuild(s)||!Number.isInteger(padIndex)||!PADS[padIndex]||s.currency<DEFENSE.plantCost||s.towers.some(t=>t.pad===padIndex))return false;s.currency-=DEFENSE.plantCost;const p=PADS[padIndex];s.towers.push({id:s.nextId++,pad:padIndex,x:p.x,y:p.y,level:1,laws:[],lawRanks:{},formId:null,fusion:null,reinforce:0,ultimateCharge:0,angle:0,shotTime:0,mirrorTime:0});s.selectedPad=padIndex;s.offers=getDefenseOffers(s);return true;}
export function upgradeDefense(s,id){const t=s.towers.find(t=>t.id===id),cost=defenseUpgradeCost(t);if(!canBuild(s)||!t||s.currency<cost||!Number.isFinite(cost))return false;s.currency-=cost;t.level++;return true;}
export function chooseDefenseLaw(s,towerId,id){
 if(!defenseCanChoose(s,towerId,id))return false;
 const t=s.towers.find(t=>t.id===towerId);t.lawRanks??=Object.fromEntries(t.laws.map(l=>[l,1]));
 if(!t.laws.includes(id))t.laws.push(id);t.lawRanks[id]=(t.lawRanks[id]||0)+1;
 t.fusion=matchFusion(t.laws);
 if(t.laws.length===2&&(!t.formId||defenseFormKind(t.formId)==='fusion'))t.formId=t.fusion;
 s.draftCredit=0;s.phase='build';s.offers=[];s.lastEvent=`${defenseTowerName(t)} · ${DEFENSE_LAWS[id].name} ${t.lawRanks[id]}단계`;return true;
}
export function evolveDefense(s,towerId,formId){
 if(!canBuild(s))return false;const t=s.towers.find(t=>t.id===towerId);
 if(!t||!getDefenseEvolutionOptions(t).some(f=>f.id===formId))return false;
 t.formId=formId;t.shotTime=0;s.lastEvent=`${defenseTowerName(t)} 진화 완성`;return true;
}
export function defenseWaveInfo(wave){const w=clamp(Math.floor(wave)||1,1,12);return {wave:w,count:9+w*3+(w%4===0?1:0),boss:w%4===0,interval:Math.max(.27,.76-w*.035),hp:27+w*7+w*w*2.7,title:w%4===0?`${w/4}번째 문지기`:["첫 침입","달리는 그림자","방패 행렬"][(w-1)%3],desc:w%4===0?'문지기는 생명력이 높고 후반 경로에서 핵을 향해 탄을 쏩니다.':w>=3?'빠른 적과 방패 적이 섞여 옵니다. 관통은 방패를 무시합니다.':'경로를 따라오는 무리를 씨앗으로 막으세요.'};}
export function startDefenseWave(s){if(s.phase!=='build'||s.draftCredit||s.wave>=12)return false;s.wave++;s.phase='wave';s.spawned=0;s.spawnTimer=.4;s.waveTime=0;s.shots.length=0;s.fields.length=0;for(const t of s.towers){t.shotTime=0;t.mirrorTime=0;}s.lastEvent=`${s.wave} / 12 웨이브`;return true;}
function effect(s,kind,x,y,color,extra={}){if(s.effects.length>=DEFENSE.maxEffects)return;s.effects.push({kind,x,y,tx:x,ty:y,color,life:.35,maxLife:.35,...extra});}
function compact(a,predicate){let write=0;for(let i=0;i<a.length;i++)if(predicate(a[i]))a[write++]=a[i];a.length=write;}
function slow(s,e,strength=.5,duration=1.6){e.slow=Math.min(e.slow||1,e.kind==='boss'?Math.max(.72,strength):strength);e.slowTime=Math.max(e.slowTime||0,duration);s.stats.slows++;}
function hurt(s,e,damage,ignoreShield=false){if(e.hp<=0||!Number.isFinite(damage)||damage<=0)return;const d=damage*(e.kind==='shield' && !ignoreShield ? .58 : 1);s.stats.damage+=Math.min(e.hp,d);e.hp-=d;if(e.hp<=0){s.kills++;s.currency+=e.kind==='boss'?28:e.kind==='shield'?5:3;effect(s,'death',e.x,e.y,'#e0e9a8',{life:.45,maxLife:.45,radius:e.kind==='boss'?7:2});}}
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
function spawn(s,info){const index=s.spawned++,boss=info.boss&&index===info.count-1,r=random(s),kind=boss?'boss':s.wave>=3&&index%5===3?'shield':s.wave>=2&&index%4===1?'fast':s.wave>=6&&index%7===0?'resilient':'normal';const hp=info.hp*(boss?15:kind==='shield'?1.5:kind==='resilient'?2:kind==='fast'?.65:1);const speed=(7.5+s.wave*.2)*(boss?.68:kind==='fast'?1.65:kind==='resilient'?.8:1);s.enemies.push({id:s.nextId++,x:PATH[0].x,y:PATH[0].y,progress:0,hp,maxHp:hp,kind,speed:speed*(.97+r*.06),slow:1,slowTime:0,attackTime:4,leakDamage:boss?5:kind==='resilient'?2:1});}
function tick(s,dt,combat){s.time+=dt;for(const e of s.effects)e.life-=dt;compact(s.effects,e=>e.life>0);if(s.phase!=='wave')return;
 s.waveTime+=dt;const info=defenseWaveInfo(s.wave);s.spawnTimer-=dt;
 if(s.spawned<info.count&&s.spawnTimer<=0&&s.enemies.length<DEFENSE.maxEnemies){spawn(s,info);s.spawnTimer+=info.interval;}
 for(const e of s.enemies){if(e.hp<=0)continue;e.pullThisTick=0;e.slowTime=Math.max(0,e.slowTime-dt);if(!e.slowTime)e.slow=1;e.progress+=e.speed*e.slow*dt;Object.assign(e,defensePoint(e.progress));
  if(e.kind==='boss'&&e.progress>DEFENSE_PATH_LENGTH*.72){e.attackTime-=dt;if(e.attackTime<=0&&s.shots.length<DEFENSE.maxShots){e.attackTime=5;s.shots.push({id:s.nextId++,x:e.x,y:e.y,tx:104,ty:48,vx:0,vy:0,speed:17,life:12,age:0,law:'hostile',damage:1,hit:[],ownerId:e.id});effect(s,'warning',e.x,e.y,'#ff6677',{radius:5,life:.7,maxLife:.7});}}
  if(e.progress>=DEFENSE_PATH_LENGTH){s.coreHp=Math.max(0,s.coreHp-e.leakDamage);s.leaked++;e.hp=0;effect(s,'core',100,48,'#ff6677',{radius:5});}
 }
 for(const f of s.fields){f.life-=dt;f.tick-=dt;for(const e of s.enemies){if(e.hp<=0||dist2(e,f)>f.radius**2)continue;if(f.kind==='web'){slow(s,e,.5,.3);if(f.tick<=0)hurt(s,e,f.damage*.12,true);}else{slow(s,e,.7,.25);const allowance=dt*(e.kind==='boss'?1.5:Math.min(5,e.speed*.3)),pull=Math.max(0,allowance-(e.pullThisTick||0));e.pullThisTick=(e.pullThisTick||0)+pull;e.progress=Math.max(0,e.progress-pull);Object.assign(e,defensePoint(e.progress));s.stats.pulls++;}}if(f.tick<=0)f.tick=.3;if(f.life<=0&&f.kind==='collapse')blast(s,f,f.damage*2.1,9,'gravity');}
 compact(s.fields,f=>f.life>0);
 for(const t of s.towers){t.shotTime=Math.max(0,t.shotTime-dt);t.mirrorTime=Math.max(0,t.mirrorTime-dt);if(!t.formId&&t.shotTime===0){const stats=defenseTowerStats(t);if(fire(s,t,stats))t.shotTime=stats.interval;}}
 combat?.update(dt);
 moveShots(s,dt);compact(s.enemies,e=>e.hp>0);
 if(s.coreHp<=0){s.phase='lost';s.lastEvent='핵이 무너졌습니다. 위치와 법칙 조합을 바꿔 다시 도전하세요.';return;}
 if(s.spawned===info.count&&!s.enemies.length&&!s.shots.some(q=>q.law==='hostile')){s.currency+=25+s.wave*2;s.shots.length=0;s.fields.length=0;if(s.wave===12){s.phase='won';s.lastEvent='열두 번의 침입을 막았습니다.';}else{s.phase='draft';s.draftCredit=1;s.offers=getDefenseOffers(s);s.lastEvent='한 씨앗에 법칙을 새기거나 기존 법칙을 강화하세요.';}}
}
export function stepDefense(s,dt,combat=null){if(!s||!Number.isFinite(dt)||dt<=0||s.phase==='lost'||s.phase==='won')return s;let remaining=Math.min(.1,dt);while(remaining>1e-8){const step=Math.min(1/60,remaining);tick(s,step,combat);remaining-=step;if(s.phase==='lost'||s.phase==='won')break;}return s;}

export {hurt as defenseHurt,effect as defenseEffect,slow as defenseSlow};

// Between-wave snapshots only. A combat adapter is never serialized.
export function checkpointDefense(s){if(!canBuild(s))return null;return {version:2,seed:s.seed,rng:s.rng,phase:s.phase,wave:s.wave,coreHp:s.coreHp,currency:s.currency,time:s.time,kills:s.kills,leaked:s.leaked,selectedPad:s.selectedPad,draftCredit:s.draftCredit,nextId:s.nextId,towers:s.towers.map(t=>({id:t.id,pad:t.pad,level:t.level,laws:[...t.laws],lawRanks:{...t.lawRanks},formId:t.formId,reinforce:t.reinforce,ultimateCharge:t.ultimateCharge})),stats:{...s.stats}};}
export function restoreDefense(raw){
 try{const r=typeof raw==='string'?JSON.parse(raw):raw;if(!r||![1,2].includes(r.version)||!['build','draft'].includes(r.phase))return null;
 const integer=(v,a,b)=>Number.isInteger(v)&&v>=a&&v<=b,finite=(v,a,b)=>Number.isFinite(v)&&v>=a&&v<=b;
 if(!integer(r.seed,0,4294967295)||!integer(r.rng,0,4294967295)||!integer(r.wave,0,11)||!integer(r.coreHp,1,20)||!integer(r.currency,0,10000)||!finite(r.time,0,100000)||!integer(r.kills,0,1000)||!integer(r.leaked,0,1000)||!integer(r.selectedPad,0,7)||!integer(r.draftCredit,0,1)||!integer(r.nextId,1,1000000))return null;
 if(r.phase==='draft'&&(r.draftCredit!==1||r.wave===0)||r.phase==='build'&&r.wave>0&&r.draftCredit!==0||!Array.isArray(r.towers)||r.towers.length>8)return null;
 if((Array.isArray(r.enemies)&&r.enemies.length)||(Array.isArray(r.shots)&&r.shots.length)||(Array.isArray(r.fields)&&r.fields.length))return null;
 const s=createDefense(r.seed);for(const key of ['rng','phase','wave','coreHp','currency','time','kills','leaked','selectedPad','draftCredit','nextId'])s[key]=r[key];
 const pads=new Set(),ids=new Set();for(const t of r.towers){
  if(!t||!integer(t.id,1,r.nextId-1)||ids.has(t.id)||!integer(t.pad,0,7)||pads.has(t.pad)||!integer(t.level,1,5)||!integer(t.reinforce,0,12)||!Array.isArray(t.laws)||t.laws.length>2||new Set(t.laws).size!==t.laws.length||t.laws.some(l=>!IDS.includes(l))||t.laws.length===2&&!matchFusion(t.laws))return null;
  // v1 did not record which ingredient received repeats. Preserve those points
  // as generic reinforcement, not invented law ranks or free branch eligibility.
  const ranks=r.version===1?Object.fromEntries(t.laws.map(l=>[l,1])):t.lawRanks;
  if(!ranks||typeof ranks!=='object'||Array.isArray(ranks)||Object.keys(ranks).length!==t.laws.length||Object.keys(ranks).some(l=>!t.laws.includes(l)||!integer(ranks[l],1,12)))return null;
  const formId=r.version===1?matchFusion(t.laws):t.formId;
  if(formId!==null&&typeof formId!=='string')return null;
  const ultimateCharge=r.version===1?0:t.ultimateCharge;if(!finite(ultimateCharge,0,30))return null;
  const tower={id:t.id,pad:t.pad,...PADS[t.pad],level:t.level,laws:[...t.laws],lawRanks:{...ranks},formId,fusion:matchFusion(t.laws),reinforce:t.reinforce,ultimateCharge,angle:0,shotTime:0,mirrorTime:0};
  if(!validDefenseForm(tower))return null;pads.add(t.pad);ids.add(t.id);s.towers.push(tower);
 }
 const spent=s.towers.reduce((n,t)=>n+defenseRankTotal(t),0);if(spent!==r.wave+1-r.draftCredit)return null;
 if(r.stats)for(const key of Object.keys(s.stats)){if(!finite(r.stats[key],0,1e9))return null;s.stats[key]=r.stats[key];}
 s.offers=r.draftCredit?getDefenseOffers(s):[];s.lastEvent=r.version===1?'이전 저장의 강화점을 보존해 불러왔습니다.':'웨이브 사이 저장을 불러왔습니다.';return s;
 }catch{return null;}
}
