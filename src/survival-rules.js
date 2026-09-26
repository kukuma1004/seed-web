// Pure rules for the separate survival challenge. The caller owns actors and
// only ticks while playing; menus and law choices therefore freeze the clock.
export const SURVIVAL=Object.freeze({
 duration:270,
 arena:Object.freeze({shape:'rect',halfWidth:24,halfDepth:20,start:Object.freeze({x:0,z:0})}),
 maxEnemies:300,maxBossAdds:60,spawnBatch:6,minSpawnDistance:10,arrivalDistance:11,spawnInset:1.2,killChargeScale:.18,
 bossSpawnInterval:2.4,reliefDuration:6,recordKey:'seed-survival-record-v3'
});

// Shared by rendering and collision: no invisible base triggers.
export const SURVIVAL_BASES=Object.freeze([
 Object.freeze({x:0,z:11,next:1}),Object.freeze({x:11,z:0,next:2}),
 Object.freeze({x:0,z:-11,next:3}),Object.freeze({x:-11,z:0,next:0})
]);
export const SURVIVAL_SLIDE=Object.freeze({speed:18,cooldown:1.8});

const bounded=(value,limit,fallback=0)=>Number.isFinite(value)?Math.max(0,Math.min(limit,value)):fallback;
const count=(value,limit=1000000)=>Math.floor(bounded(value,limit));

export function createSurvivalSession(seed=1){
 const initial=Number.isFinite(seed)?seed>>>0:1;
 return {seed:initial,rngState:initial,time:0,legStartedAt:0,act:0,lap:0,bossesDefeated:0,completedLaps:0,lapStartedAt:0,fastestLap:0,transitionTime:0,spawnTimer:0,spawnIndex:0,kills:0,bossSpawned:false,won:false};
}

export const SURVIVAL_ACTS=Object.freeze([
 Object.freeze({name:'잠든 정원',boss:'정시파이터 오스틴',type:'austin',music:'garden'}),
 Object.freeze({name:'별빛 야구장',boss:'항상초심',type:'alwaysbeginner',music:'stadium'}),
 Object.freeze({name:'폭풍 항로',boss:'폭풍비행사 요한',type:'tempestcarrier',music:'skyway'})
]);
export const survivalAct=session=>SURVIVAL_ACTS[Math.min(2,count(session?.act,2))];
export const survivalActTime=session=>Math.max(0,(session?.time||0)-(session?.legStartedAt||0));
export function survivalScaling(session){
 const act=count(session?.act,2),lap=count(session?.lap,1000);
 return {hp:Math.min(20,(1+act*.18)*(1+lap*.35)),speed:Math.min(1.3,1+act*.025+lap*.035),damage:Math.min(2,1+act*.08+lap*.12),bossHp:Math.min(12,(1+act*.12)*Math.pow(1.35,Math.min(lap,20))),tempo:Math.min(1.4,1+lap*.05),projectile:Math.min(1.3,1+lap*.04)};
}
// An act clear is a transition, never a restart: the caller retains the build,
// inventory, score and choice progress. The world is cleared at this boundary.
export function advanceSurvivalAct(session){
 if(!session?.won||session.finished)return false;
 session.act=(count(session.act,2)+1)%3;
 if(session.act===0){session.lap=count(session.lap)+1;session.lapStartedAt=session.time;}
 session.legStartedAt=session.time;session.bossSpawned=false;session.won=false;
 session.transitionTime=0;session.spawnTimer=2;session.nextSupply=session.time+90;
 return true;
}

// LCG state belongs to the run, never Math.random or a global mutable generator.
function random(session){
 session.rngState=(Math.imul(session.rngState,1664525)+1013904223)>>>0;
 return session.rngState/4294967296;
}

// A higher cap alone did not create crowds: the old late-game feed was cleared
// before enemies accumulated. Compress arrivals to 270s, retaining the fixed pool.
// Durability/speed still rise per minute: more targets must not mean instant tanks.
const PHASES=Object.freeze([
 {cap:96,spawnInterval:.4,label:'첫 물결'},
 {cap:144,spawnInterval:.3,label:'달려드는 무리'},
 {cap:192,spawnInterval:.24,label:'무거운 발걸음'},
 {cap:240,spawnInterval:.21,label:'밀려오는 물결'},
 {cap:276,spawnInterval:.19,label:'포위'},
 {cap:300,spawnInterval:.18,label:'거센 물결'},
 {cap:300,spawnInterval:.17,label:'끝없는 발걸음'},
 {cap:300,spawnInterval:.16,label:'마지막 물결'}
]);

export function survivalPressure(seconds){
 const session=typeof seconds==='object'?seconds:null;
 const time=bounded(session?survivalActTime(session):seconds,86400),act=count(session?.act,2),lap=count(session?.lap,1000);
 const phase=Math.min(7,Math.max(act+Math.min(3,lap),Math.floor(time/(SURVIVAL.duration/PHASES.length))));
 if(time>=SURVIVAL.duration)return {cap:SURVIVAL.maxBossAdds,spawnInterval:SURVIVAL.bossSpawnInterval,hpScale:3.45,speedScale:1.49,label:survivalAct(session).boss,formation:'boss',formationLabel:'최종 결전',relief:false};
 const strength=Math.min(7,Math.max(act,Math.floor(time/60)));
 const rules=PHASES[phase],beat=time%60,relief=beat>=60-SURVIVAL.reliefDuration;
 const formation=relief?'relief':time<8?'column':beat<25?'pincer':'surround';
 const formationLabel=relief?'숨 고르기':formation==='column'?'한쪽에서 접근':formation==='pincer'?'양쪽 압박':'사방 포위';
 return {cap:relief?Math.floor(rules.cap*.7):rules.cap,spawnInterval:time<8?1:relief?.65:rules.spawnInterval,hpScale:1+strength*.35,speedScale:1+strength*.07,label:relief?'숨 고르기':rules.label,formation,formationLabel,relief};
}

const ENEMIES=Object.freeze({
 swarm:{hp:12,speed:2.3,damage:8,radius:.28,size:.92,score:10},
 runner:{hp:80,speed:3.7,damage:6,radius:.24,size:.75,score:15},
 brute:{hp:240,speed:1.65,damage:16,radius:.52,size:1.4,score:30}
});

export function survivalEnemySpec(kind,seconds){
 const base=ENEMIES[kind]||ENEMIES.swarm,pressure=survivalPressure(seconds),scale=survivalScaling(typeof seconds==='object'?seconds:null);
 return {...base,hp:Math.round(base.hp*pressure.hpScale*scale.hp),speed:base.speed*pressure.speedScale*scale.speed,damage:base.damage*scale.damage};
}

export function survivalSpawn(session,player,arena=SURVIVAL.arena){
 const width=bounded(arena?.halfWidth,1000,SURVIVAL.arena.halfWidth),depth=bounded(arena?.halfDepth,1000,SURVIVAL.arena.halfDepth);
 const xLimit=Math.max(0,width-SURVIVAL.spawnInset),zLimit=Math.max(0,depth-SURVIVAL.spawnInset);
 const px=Number.isFinite(player?.x)?player.x:0,pz=Number.isFinite(player?.z)?player.z:0;
 const distanceSquared=SURVIVAL.minSpawnDistance**2;
 let x=0,z=0,found=false;
 // Small packets share an approach sector, keeping recognizable gaps.
 // Spawn 11-14 units away instead of waiting at the distant arena perimeter.
 const pressure=survivalPressure(session),index=count(session.spawnIndex),packet=Math.floor(index/SURVIVAL.spawnBatch);
 const turn=(Math.floor(survivalActTime(session)/60)+(session.seed>>>0)%4)%4;
 const sides=pressure.formation==='column'||pressure.relief?1:pressure.formation==='pincer'?2:4;
 const preferred=(turn+(sides===1?0:sides===2?(packet%2)*2:packet%4))%4;
 for(let attempt=0;attempt<16;attempt++){
  const side=(preferred+Math.floor(attempt/4))%4;
  const angle=side*Math.PI/2,forward=SURVIVAL.arrivalDistance+random(session)*3;
  const tangent=(random(session)*2-1)*7.5;
  x=Math.max(-xLimit,Math.min(xLimit,px+Math.cos(angle)*forward-Math.sin(angle)*tangent));
  z=Math.max(-zLimit,Math.min(zLimit,pz+Math.sin(angle)*forward+Math.cos(angle)*tangent));
  if((x-px)**2+(z-pz)**2>=distanceSquared){found=true;break;}
 }
 if(!found){
  x=px>=0?-xLimit:xLimit;z=pz>=0?-zLimit:zLimit;
  if((x-px)**2+(z-pz)**2<distanceSquared)return null;
 }
 session.spawnIndex=index+1;
 const time=bounded(survivalActTime(session),86400),roll=random(session);
 const bruteChance=time>=45?Math.min(.12,.05+Math.floor(time/60)*.01):0;
 const runnerChance=time>=15?Math.min(.15,.08+Math.floor(time/60)*.01):0;
 const kind=roll<bruteChance?'brute':roll<bruteChance+runnerChance?'runner':'swarm';
 return {x,z,kind};
}

// Incremental kills required for the next choice, not a cumulative threshold.
// After eight choices, denser waves must not double the number of upgrades.
export function survivalChoiceKills(choices){return Math.min(300,8+6*count(choices)+20*Math.max(0,count(choices)-8));}

export function tickSurvival(session,dt,alive=0){
 const result={spawn:0,boss:false};
 if(session.finished||session.won||!Number.isFinite(dt)||dt<=0)return result;
 session.time=bounded(session.time+dt,86400);
 if(!session.bossSpawned&&survivalActTime(session)>=SURVIVAL.duration){
  session.bossSpawned=true;session.spawnTimer=SURVIVAL.bossSpawnInterval;
  result.boss=true;return result;
 }
 const pressure=survivalPressure(session);
 // A lighter feed between surges, never eight seconds of an empty arena.
 session.spawnTimer-=dt;
 if(session.spawnTimer<=0){
  // Reset, don't accumulate missed batches after a long frame or a full arena.
  session.spawnTimer=pressure.spawnInterval*(!pressure.relief&&!session.bossSpawned&&survivalActTime(session)>=60&&count(alive)<pressure.cap*.25?.85:1);
  result.spawn=Math.min(SURVIVAL.spawnBatch,Math.max(0,pressure.cap-count(alive)));
 }
 return result;
}

export function settleSurvivalKill(session,{boss=false}={}){
 if(session.finished||session.won)return session;
 if(boss&&!session.bossSpawned)return session;
 session.kills=count(session.kills+1);
 if(boss){
  session.won=true;session.transitionTime=0;session.bossesDefeated=count(session.bossesDefeated)+1;
  if(session.act===2){session.completedLaps=count(session.completedLaps)+1;const duration=session.time-(session.lapStartedAt||0);session.fastestLap=Math.min(session.fastestLap||duration,duration);}
 }
 return session;
}

// Arrival and victory are separate milestones. A failed boss attempt must not
// look like a 100% clear; keep positive fractional HP visible as at least 1%.
export function survivalOutcome(session,{left=false,boss=null}={}){
 const time=bounded(survivalActTime(session),86400),won=(session?.completedLaps||0)>0;
 const reached=session?.bossSpawned===true,bossName=survivalAct(session).boss;
 const remaining=boss&&Number.isFinite(boss.hp)&&Number.isFinite(boss.maxHp)&&boss.maxHp>0
  ?Math.max(1,Math.min(100,Math.ceil(boss.hp/boss.maxHp*100))):null;
 return {won,status:won?'cleared':left?'left':reached?'boss-defeat':'defeat',
  title:won?'세 전장을 넘어선 씨앗':left?'다음 씨앗을 기약하며':reached?`${bossName} 앞에서 멈춘 씨앗`:'씨앗은 다시 자랍니다',
  value:won?`${session.completedLaps}순환`:reached?(remaining===null?'도달':`${remaining}%`):`${Math.min(99,Math.floor(time/SURVIVAL.duration*100))}%`,
  label:won?'세 막 완주':reached?(remaining===null?`${bossName} 미격파`:`${bossName} 남은 체력`):'보스까지 생존 진행',
  bossSeconds:reached?Math.max(0,time-SURVIVAL.duration):0};
}

function normalizeRecord(value){
 const source=value&&typeof value==='object'?value:{};
 const runs=count(source.runs);
 const wins=count(source.wins),clear=bounded(source.fastestClear,86400);
 return {bestKills:count(source.bestKills),bestTime:bounded(source.bestTime,86400),wins,runs,fastestClear:wins&&clear>=SURVIVAL.duration*3?clear:0,bestBosses:count(source.bestBosses)};
}

export function readSurvivalRecord(storage){
 try{return normalizeRecord(JSON.parse(storage?.getItem(SURVIVAL.recordKey)||'null'));}
 catch{return normalizeRecord(null);}
}

// A device-local personal best, independent of accounts, rankings and saves.
// bestTime is longest survival time, including the final boss battle.
export function recordSurvivalResult(storage,result={}){
 const previous=readSurvivalRecord(storage),source=result&&typeof result==='object'?result:{};
 const loops=count(source.completedLaps),clearTime=loops&&source.fastestLap>=SURVIVAL.duration*3?bounded(source.fastestLap,86400):0;
 const record=normalizeRecord({bestKills:Math.max(previous.bestKills,count(source.kills)),bestTime:Math.max(previous.bestTime,bounded(source.time,86400)),wins:previous.wins+loops,bestBosses:Math.max(previous.bestBosses,count(source.bossesDefeated)),runs:previous.runs+1,fastestClear:clearTime?Math.min(previous.fastestClear||clearTime,clearTime):previous.fastestClear});
 try{storage?.setItem(SURVIVAL.recordKey,JSON.stringify(record));}catch{/* Storage may be disabled or full. */}
 return record;
}

// Runners aim once, visibly brace, rush along that locked vector, then recover.
// No bullets, teleporting, homing during the rush, or hidden idle-player penalty.
export function tickSurvivalRush(e,dt,player,activeRushes=0){
 if(e.survivalKind!=='runner'||dt<=0)return false;
 const dx=player.x-e.g.position.x,dz=player.z-e.g.position.z,d=Math.hypot(dx,dz);
 e.rushClock=(e.rushClock??(.8+Math.abs(e.phase||0)%1.4))-dt;
 if(e.rushState==='brace'&&e.rushClock<=0){e.rushState='rush';e.rushClock=.72;}
 else if(e.rushState==='rush'&&e.rushClock<=0){e.rushState='recover';e.rushClock=.8;}
 else if(e.rushState==='recover'&&e.rushClock<=0){e.rushState=null;e.rushClock=2.4;}
 else if(!e.rushState&&e.rushClock<=0&&d>2&&d<7&&activeRushes<3){
  e.rushState='brace';e.rushClock=.65;e.rushX=dx/d;e.rushZ=dz/d;return true;
 }
 return false;
}
