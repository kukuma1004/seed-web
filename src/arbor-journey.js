// Renderless Act 6 encounter ledger. The host owns actors, damage and rewards.
// Only an issued actor's unique defeat receipt can advance the encounter.
export const ARBOR_ACT=Object.freeze({id:'arbor',number:6,name:'거목의 숨결',bossName:'녹관의 수호자 아르보',wardensPerBoss:5,bossesToClear:3});
export const ARBOR_LIMITS=Object.freeze({enemies:12,roots:4,spawnsPerStep:2,projectiles:48,minSpawnDistance:4,maxStep:.1});
export const ARBOR_ROOT_TIMING=Object.freeze({rest:3,warn:1.1,active:4.2,lower:.7,playerMargin:.6});
const freezeLayout=(id,name,roots)=>Object.freeze({id,name,roots:Object.freeze(roots.slice(0,ARBOR_LIMITS.roots).map(([x,z,w,d])=>Object.freeze({x,z,w,d})))});
// Short separated cover segments always leave more than one escape route.
export const ARBOR_SECTORS=Object.freeze([
 freezeLayout('threshold','새싹의 문턱',[[-5,1,3.4,1],[4,-3,3.4,1],[-5,-6,1,3],[6,5,1,3]]),
 freezeLayout('fork','갈라진 뿌리길',[[-6,-3,1,4.2],[5,2,1,4.2],[-1,-6,3.5,1],[0,6,3.5,1]]),
 freezeLayout('pool','이슬 고인 뜰',[[-4,-4,3,1],[4,-4,3,1],[-4,4,3,1],[4,4,3,1]]),
 freezeLayout('stair','덩굴 계단',[[-8,5,3.6,1],[-4,1,1,3.4],[0,-3,3.6,1],[5,-6,1,3.4]]),
 freezeLayout('crown','녹관의 안뜰',[[-6,-5,1,3.2],[6,-5,1,3.2],[-6,4,1,3.2],[6,4,1,3.2]])
]);
export const ARBOR_ARENA=Object.freeze({id:'arbor-garden',shape:'rect',halfWidth:14,halfDepth:12,
 polygon:Object.freeze([Object.freeze([-14,12]),Object.freeze([14,12]),Object.freeze([14,-12]),Object.freeze([-14,-12])]),
 start:Object.freeze({x:0,z:5}),exit:Object.freeze({x:0,z:-8,radius:1.7})});
// Opt-in Journey rooms use the same four reusable roots in a larger patrol area.
// Shared/legacy callers retain their original arena, receipts and enemy ceiling.
export const ARBOR_ROOM_CIRCUIT_ARENA=Object.freeze({id:'arbor-room-circuit',shape:'rect',halfWidth:18,halfDepth:15,
 polygon:Object.freeze([Object.freeze([-18,15]),Object.freeze([18,15]),Object.freeze([18,-15]),Object.freeze([-18,-15])]),
 start:Object.freeze({x:0,z:7}),exit:Object.freeze({x:0,z:-11,radius:1.7})});
export const ARBOR_ROOM_CIRCUIT_LIMITS=Object.freeze({...ARBOR_LIMITS,enemies:14});
const roomCircuit=s=>s?.circuit?.version===1;
export const arborRoomIndex=s=>roomCircuit(s)?s.circuit.room:s?.sector??0;
export const arborRoomLayoutIndex=s=>roomCircuit(s)?(s.sector+s.circuit.room)%5:s?.sector??0;
export const arborArenaFor=s=>roomCircuit(s)?ARBOR_ROOM_CIRCUIT_ARENA:ARBOR_ARENA;
const limitsFor=s=>roomCircuit(s)?ARBOR_ROOM_CIRCUIT_LIMITS:ARBOR_LIMITS;
const ROOM_MOBS=Object.freeze([14,18,20,22,0]);
export const arborRoomMobQuota=(round=0,sector=0,room=0)=>{
 const index=clamp(room|0,0,4);
 return index===4?0:ROOM_MOBS[index]+clamp(round|0,0,2)*2+clamp(sector|0,0,4)*2;
};
const cumulativeKills=(round,rooms)=>{
 let total=0;
 for(let r=0;r<=round;r++)for(let sector=0;sector<5;sector++){
  if(rooms)for(let room=0;room<4;room++)total+=arborRoomMobQuota(r,sector,room);
  else total+=arborSectorMobQuota(r,sector);
  total++;
 }
 return total+round+1;
};
export const arborRoomCircuitMaxKills=(round=2)=>ARBOR_ROOM_CIRCUIT_MAX_KILLS[clamp(round|0,0,2)];
export const arborRunMaxKills=(round=2,{roomCircuit:rooms=false}={})=>rooms?arborRoomCircuitMaxKills(round):cumulativeKills(clamp(round|0,0,2),false);
const quotaFor=s=>roomCircuit(s)?arborRoomMobQuota(s.round,s.sector,s.circuit.room):arborSectorMobQuota(s.round,s.sector);
const CIRCUIT_SPAWN_CORNERS=Object.freeze([[-17,-14],[17,-14],[-17,14],[17,14]].map(Object.freeze));
const VERSION=1,DEFAULT_SEED=0x6a10;
const PHASES=new Set(['skirmish','warden','boss','cleared','complete']);
const ROOT_PHASES=new Set(['rest','warn','active','lower']);
const TYPES=new Set(['swarm','hound','caster','shield','warden']);
const clamp=(n,a,b)=>Math.max(a,Math.min(b,n));
const finite=(n,fallback=0)=>Number.isFinite(n)?n:fallback;
const dtOf=dt=>clamp(finite(dt),0,ARBOR_LIMITS.maxStep);
const uint=n=>Number.isInteger(n)&&n>0&&n<=0xffffffff;
const integer=(n,a,b)=>Number.isInteger(n)&&n>=a&&n<=b;
const mobId=(r,s,i,room=null)=>room===null?`arbor:r${r}:s${s}:m${i}`:`arbor:r${r}:s${s}:p${room}:m${i}`;
const wardenId=(r,s,room=null)=>room===null?`arbor:r${r}:s${s}:w`:`arbor:r${r}:s${s}:p${room}:w`;
const bossId=(r,rooms=false)=>rooms?`arbor:r${r}:s4:p4:b`:`arbor:r${r}:b`;
export const ARBOR_ENCOUNTERS=Object.freeze([
 Object.freeze({name:'정면 유인',hint:'앞에서 오는 무리를 뿌리 옆으로 유인하세요',types:['swarm','swarm','hound','swarm','caster','swarm'],interval:.6}),
 Object.freeze({name:'엇갈린 협공',hint:'좌우에서 번갈아 와요 · 한쪽을 먼저 비우세요',types:['hound','swarm','hound','caster','swarm','shield'],interval:.52}),
 Object.freeze({name:'포위 돌파',hint:'앞뒤 포위를 읽고 빈 옆길로 빠져나가세요',types:['swarm','hound','caster','swarm','hound','swarm'],interval:.46}),
 Object.freeze({name:'방패의 틈',hint:'방패 옆으로 돌아 뒤의 술사를 먼저 끊으세요',types:['shield','caster','swarm','hound','caster','swarm'],interval:.58}),
 Object.freeze({name:'녹관의 시험',hint:'뒤를 돌아보세요 · 뿌리가 오르면 공격을 끊으세요',types:['hound','shield','caster','swarm','hound','caster'],interval:.48})
]);
const mobType=(index,sector,version)=>version===2?ARBOR_ENCOUNTERS[sector].types[index%ARBOR_ENCOUNTERS[sector].types.length]:index%7===6?'shield':index%4===2?'caster':index%3===1?'hound':'swarm';
export const arborSectorMobQuota=(round=0,sector=0)=>12+clamp(round|0,0,2)*2+clamp(sector|0,0,4)*2;
export const arborBossHp=(round=0)=>Math.round(2800*(1+clamp(round|0,0,2)*.48));
export const ARBOR_ROOM_CIRCUIT_MAX_KILLS=Object.freeze([0,1,2].map(round=>cumulativeKills(round,true)));
function random(s){let n=s.seed|0;n^=n<<13;n^=n>>>17;n^=n<<5;s.seed=n>>>0;return s.seed/4294967296;}
function resetOutput(s){s.out.spawns.length=0;s.out.events.length=0;s.out.phaseChanged=false;return s.out;}
function setPhase(s,phase){if(s.phase!==phase){s.phase=phase;s.out.phaseChanged=true;}}
function configureRoots(s){
 const layout=ARBOR_SECTORS[arborRoomLayoutIndex(s)].roots;
 for(let i=0;i<layout.length;i++)Object.assign(s.roots[i],layout[i],{phase:'rest',t:ARBOR_ROOT_TIMING.rest+i*.35,active:false});
}
function fresh(rooms=false){
 const s={version:VERSION,encounterVersion:2,act:'arbor',round:0,sector:0,phase:'skirmish',wardens:0,bossWins:0,time:0,sectorTime:0,
  initialSeed:DEFAULT_SEED,seed:DEFAULT_SEED,spawnIndex:0,spawnClock:0,kills:0,wardenSpawned:false,bossSpawned:false,lastClear:null,
  roots:ARBOR_SECTORS[0].roots.map((r,i)=>({id:`arbor-root-${i}`,...r,phase:'rest',t:0,active:false})),
  pending:[],killIds:[],playerSample:{x:0,z:5},out:{spawns:[],events:[],phaseChanged:false}};
 if(rooms)s.circuit={version:1,room:0};
 configureRoots(s);return s;
}
export function createArborJourney(raw=null,{roomCircuit:rooms=false}={}){return raw===null?fresh(rooms):restoreArborJourney(raw);}
function rootsStep(s,dt,p){
 for(const root of s.roots){
  root.t=Math.max(0,root.t-dt);if(root.t>1e-9)continue;
  if(root.phase==='rest'){root.phase='warn';root.t=ARBOR_ROOT_TIMING.warn;s.out.events.push({type:'root-warn',id:root.id});}
  else if(root.phase==='warn'){
   // A player never gets trapped inside a newly solid root. Keep the tell lit
   // until they leave, rather than pushing/crushing them without a dodge route.
   if(Math.abs(p.x-root.x)<root.w/2+ARBOR_ROOT_TIMING.playerMargin&&Math.abs(p.z-root.z)<root.d/2+ARBOR_ROOT_TIMING.playerMargin)continue;
   root.phase='active';root.t=ARBOR_ROOT_TIMING.active;root.active=true;s.out.events.push({type:'root-rise',id:root.id});
  }else if(root.phase==='active'){root.phase='lower';root.t=ARBOR_ROOT_TIMING.lower;root.active=false;s.out.events.push({type:'root-lower',id:root.id});}
  else{root.phase='rest';root.t=ARBOR_ROOT_TIMING.rest;s.out.events.push({type:'root-rest',id:root.id});}
 }
}
function spawnPoint(s,p){
 const roll=random(s),radius=6.2+random(s)*1.3,arena=arborArenaFor(s),mx=arena.halfWidth-1,mz=arena.halfDepth-1,sector=arborRoomLayoutIndex(s);
 // Exactly two RNG draws per receipt, including legacy saves. Only new runs
 // use directional packets; roots and the arena edge still leave safe spawns.
 let angle=roll*Math.PI*2;
 if(s.encounterVersion===2){const i=s.spawnIndex;
  angle=sector===0?-Math.PI/2+(roll-.5)*1.2:sector===1?(i%2?0:Math.PI)+(roll-.5)*.8:sector===2?(i%2?Math.PI/2:-Math.PI/2)+(roll-.5)*1.1:sector===3?-Math.PI/2+(i%3-1)*.65+(roll-.5)*.3:(i%3===2?Math.PI/2:-Math.PI/2)+(roll-.5)*1.5;
 }
 for(let i=0;i<16;i++){
  const a=angle+i*Math.PI*2/16,x=clamp(p.x+Math.cos(a)*radius,-mx,mx),z=clamp(p.z+Math.sin(a)*radius,-mz,mz);
  if(Math.hypot(x-p.x,z-p.z)<ARBOR_LIMITS.minSpawnDistance)continue;
  let blocked=false;for(const root of s.roots)if(root.active&&Math.abs(x-root.x)<root.w/2+.65&&Math.abs(z-root.z)<root.d/2+.65){blocked=true;break;}
  if(!blocked)return {x,z};
 }
 if(roomCircuit(s)){
  // Every root is near the centre. These fixed outer corners remain unblocked,
  // including when all four roots are raised; choose the nearest safe one.
  let best=Infinity,bx=0,bz=0;
  for(const [x,z] of CIRCUIT_SPAWN_CORNERS){const d=Math.hypot(x-p.x,z-p.z);if(d>=ARBOR_LIMITS.minSpawnDistance&&d<best){best=d;bx=x;bz=z;}}
  return {x:bx,z:bz};
 }
 // The arena's opposite corner is a deterministic safe fallback at its edges.
 return {x:p.x>0?-12:12,z:p.z>0?-10:10};
}
function issue(s,role,p){
 const pos=spawnPoint(s,p),r=s.round,sector=s.sector,index=s.spawnIndex,room=roomCircuit(s)?s.circuit.room:null;
 let type,id,hp,speed,damage;
 if(role==='mob'){
  type=mobType(index,arborRoomLayoutIndex(s),s.encounterVersion);
  id=mobId(r,sector,index,room);hp=({swarm:44,hound:86,caster:108,shield:140}[type]+sector*8)*(1+r*.5);
  speed=({swarm:2.8,hound:3.5,caster:2.1,shield:1.9}[type])*(1+r*.06);damage=10+r*2+Math.floor(sector/2);s.spawnIndex++;
 }else if(role==='warden'){type='warden';id=wardenId(r,sector,room);hp=640+sector*90+r*430;speed=2.3+r*.12;damage=17+r*3;s.wardenSpawned=true;}
 else{type='warden';id=bossId(r,room!==null);hp=arborBossHp(r);speed=1.8+r*.15;damage=18+r*3;s.bossSpawned=true;}
 const actor={id,role,type,...pos,hp:Math.round(hp),speed,damage};s.pending.push(actor);s.out.spawns.push(actor);return actor;
}
export function stepArborJourney(s,dt,{player=ARBOR_ARENA.start,alive=0,projectiles=0}={}){
 const out=resetOutput(s),step=dtOf(dt);if(!step||s.phase==='cleared'||s.phase==='complete')return out;
 const arena=arborArenaFor(s),p=s.playerSample;p.x=clamp(finite(player?.x),-arena.halfWidth+.5,arena.halfWidth-.5);p.z=clamp(finite(player?.z),-arena.halfDepth+.5,arena.halfDepth-.5);
 s.time+=step;s.sectorTime+=step;rootsStep(s,step,p);
 const live=Math.max(s.pending.length,Math.max(0,finite(alive))),quota=quotaFor(s);
 if(s.phase==='boss'){
  if(!s.bossSpawned&&live===0){issue(s,'boss',p);out.events.push({type:'boss-call',round:s.round,name:ARBOR_ACT.bossName});}
  return out;
 }
 if(s.phase!=='skirmish')return out;
 if(s.spawnIndex===quota&&s.pending.length===0&&live===0){
  if(roomCircuit(s)&&s.circuit.room<4){s.lastClear='room';setPhase(s,'cleared');out.events.push({type:'room-clear',sector:s.sector,room:s.circuit.room});return out;}
  setPhase(s,'warden');issue(s,'warden',p);out.events.push({type:'warden-call',sector:s.sector,ordinal:s.wardens+1});return out;
 }
 s.spawnClock=Math.max(0,s.spawnClock-step);if(s.spawnClock>1e-9||s.spawnIndex>=quota)return out;
 // There is no queued catch-up after a crowded frame or a background return.
 s.spawnClock=s.encounterVersion===2?Math.max(.38,ARBOR_ENCOUNTERS[arborRoomLayoutIndex(s)].interval-s.round*.025):Math.max(.38,.64-s.round*.045-s.sector*.025);
 if(projectiles>=ARBOR_LIMITS.projectiles)return out;
 const count=Math.min(ARBOR_LIMITS.spawnsPerStep,limitsFor(s).enemies-live,quota-s.spawnIndex);
 for(let i=0;i<count;i++)issue(s,'mob',p);
 return out;
}
export function creditArborKill(s,id,role){
 if(!['skirmish','warden','boss'].includes(s.phase)||typeof id!=='string'||s.killIds.includes(id))return false;
 const index=s.pending.findIndex(actor=>actor.id===id&&actor.role===role);if(index<0)return false;
 const actor=s.pending[index];
 if(role==='warden'&&s.phase!=='warden'||role==='boss'&&s.phase!=='boss'||role==='mob'&&s.phase!=='skirmish')return false;
 s.pending.splice(index,1);s.killIds.push(actor.id);s.kills++;
 if(role==='warden'){
  s.wardens++;s.lastClear='warden';setPhase(s,'cleared');s.out.events.push({type:'sector-clear',sector:s.sector,wardens:s.wardens});
 }else if(role==='boss'){
  s.bossWins++;s.lastClear='boss';setPhase(s,s.bossWins===ARBOR_ACT.bossesToClear?'complete':'cleared');
  s.out.events.push({type:s.phase==='complete'?'complete':'boss-clear',bossWins:s.bossWins});
 }
 return true;
}
export function advanceArborJourney(s){
 if(s.phase!=='cleared')return false;
 resetOutput(s);
 if(s.lastClear==='warden'&&s.sector===4){setPhase(s,'boss');s.lastClear=null;s.sectorTime=0;return true;}
 if(roomCircuit(s)&&s.lastClear==='room'&&s.circuit.room<4)s.circuit.room++;
 else if(s.lastClear==='warden'){s.sector++;if(roomCircuit(s))s.circuit.room=0;}
 else if(s.lastClear==='boss'&&s.round<2){s.round++;s.sector=0;if(roomCircuit(s))s.circuit.room=0;}
 else return false;
 s.spawnIndex=0;s.spawnClock=0;s.sectorTime=0;s.wardenSpawned=false;s.bossSpawned=false;s.lastClear=null;
 setPhase(s,'skirmish');configureRoots(s);return true;
}
const copyActor=a=>({id:a.id,role:a.role,type:a.type,x:a.x,z:a.z,hp:a.hp,speed:a.speed,damage:a.damage});
export function checkpointArborJourney(s){
 return {version:VERSION,...(s.encounterVersion===2?{encounterVersion:2}:{}),act:'arbor',round:s.round,sector:s.sector,phase:s.phase,wardens:s.wardens,bossWins:s.bossWins,
  time:s.time,sectorTime:s.sectorTime,initialSeed:s.initialSeed,seed:s.seed,spawnIndex:s.spawnIndex,spawnClock:s.spawnClock,kills:s.kills,
  wardenSpawned:s.wardenSpawned,bossSpawned:s.bossSpawned,lastClear:s.lastClear,
  roots:s.roots.map(r=>({id:r.id,x:r.x,z:r.z,w:r.w,d:r.d,phase:r.phase,t:r.t,active:r.active})),
  pending:s.pending.map(copyActor),killIds:[...s.killIds],...(roomCircuit(s)?{circuit:{version:1,room:s.circuit.room}}:{})};
}
function validActor(a){
 return a&&typeof a.id==='string'&&['mob','warden','boss'].includes(a.role)&&TYPES.has(a.type)&&
  Number.isFinite(a.x)&&Math.abs(a.x)<=13&&Number.isFinite(a.z)&&Math.abs(a.z)<=11&&
  Number.isFinite(a.hp)&&a.hp>0&&a.hp<=10000&&Number.isFinite(a.speed)&&a.speed>0&&a.speed<=6&&Number.isFinite(a.damage)&&a.damage>0&&a.damage<=60;
}
function canonicalActor(a,round,sector,encounterVersion,room=null){
 const index=a.role==='mob'?Number(a.id.split(':m')[1]):-1;
 const type=a.role==='mob'?mobType(index,room===null?sector:(sector+room)%5,encounterVersion):'warden';
 const hp=a.role==='mob'?Math.round((({swarm:44,hound:86,caster:108,shield:140}[type])+sector*8)*(1+round*.5)):a.role==='warden'?640+sector*90+round*430:arborBossHp(round);
 const speed=a.role==='mob'?({swarm:2.8,hound:3.5,caster:2.1,shield:1.9}[type])*(1+round*.06):a.role==='warden'?2.3+round*.12:1.8+round*.15;
 const damage=a.role==='mob'?10+round*2+Math.floor(sector/2):a.role==='warden'?17+round*3:18+round*3;
 return a.type===type&&a.hp===hp&&a.speed===speed&&a.damage===damage;
}
// This is schema/progression validation, not an anti-cheat signature. It rejects
// impossible skipped sectors and mismatched receipts without silently healing them.
export function restoreArborJourney(raw){
 if(raw&&Object.hasOwn(raw,'circuit'))return restoreArborRoomCircuit(raw);
 if(!raw||raw.version!==VERSION||![undefined,2].includes(raw.encounterVersion)||raw.act!=='arbor'||!integer(raw.round,0,2)||!integer(raw.sector,0,4)||!PHASES.has(raw.phase)||
  !integer(raw.wardens,0,15)||!integer(raw.bossWins,0,3)||!uint(raw.seed)||!uint(raw.initialSeed)||
  !Number.isFinite(raw.time)||raw.time<0||!Number.isFinite(raw.sectorTime)||raw.sectorTime<0||raw.sectorTime>raw.time+1e-8||
  !Number.isFinite(raw.spawnClock)||raw.spawnClock<0||raw.spawnClock>.64||!integer(raw.spawnIndex,0,arborSectorMobQuota(raw.round,raw.sector))||
  typeof raw.wardenSpawned!=='boolean'||typeof raw.bossSpawned!=='boolean'||![null,'warden','boss'].includes(raw.lastClear)||
  !Array.isArray(raw.killIds)||raw.killIds.length>400||!raw.killIds.every(id=>typeof id==='string')||new Set(raw.killIds).size!==raw.killIds.length||raw.kills!==raw.killIds.length||
  !Array.isArray(raw.pending)||raw.pending.length>ARBOR_LIMITS.enemies||!raw.pending.every(validActor)||
  !Array.isArray(raw.roots)||raw.roots.length!==ARBOR_LIMITS.roots)return null;
 const killed=new Set(raw.killIds),pending=new Map();
 for(const actor of raw.pending){if(pending.has(actor.id)||killed.has(actor.id)||!canonicalActor(actor,raw.round,raw.sector,raw.encounterVersion))return null;pending.set(actor.id,actor);}
 const expected=new Set(),requireDead=id=>{expected.add(id);return killed.has(id);};
 for(let r=0;r<raw.round;r++){
  for(let sector=0;sector<5;sector++){
   for(let i=0;i<arborSectorMobQuota(r,sector);i++)if(!requireDead(mobId(r,sector,i)))return null;
   if(!requireDead(wardenId(r,sector)))return null;
  }
  if(!requireDead(bossId(r)))return null;
 }
 for(let sector=0;sector<raw.sector;sector++){
  for(let i=0;i<arborSectorMobQuota(raw.round,sector);i++)if(!requireDead(mobId(raw.round,sector,i)))return null;
  if(!requireDead(wardenId(raw.round,sector)))return null;
 }
 let mobsDead=0;
 for(let i=0;i<raw.spawnIndex;i++){
  const id=mobId(raw.round,raw.sector,i);expected.add(id);
  if(killed.has(id))mobsDead++;else if(pending.get(id)?.role!=='mob')return null;
 }
 const currentWarden=wardenId(raw.round,raw.sector),currentBoss=bossId(raw.round),wardenDead=killed.has(currentWarden),bossDead=killed.has(currentBoss);
 if(raw.wardenSpawned){expected.add(currentWarden);if(!wardenDead&&pending.get(currentWarden)?.role!=='warden')return null;}
 if(raw.bossSpawned){expected.add(currentBoss);if(!bossDead&&pending.get(currentBoss)?.role!=='boss')return null;}
 if(expected.size!==killed.size+pending.size)return null;
 for(const id of killed)if(!expected.has(id))return null;
 for(const id of pending.keys())if(!expected.has(id))return null;
 const replay={seed:raw.initialSeed};for(let i=0;i<expected.size*2;i++)random(replay);if(replay.seed!==raw.seed)return null;
 const quota=arborSectorMobQuota(raw.round,raw.sector),mobsFinished=raw.spawnIndex===quota&&mobsDead===quota;
 const expectedWardens=raw.round*5+raw.sector+(wardenDead?1:0),expectedWins=raw.round+(bossDead?1:0);
 if(raw.wardens!==expectedWardens||raw.bossWins!==expectedWins||raw.wardenSpawned&&!mobsFinished||raw.bossSpawned&&(!wardenDead||raw.sector!==4))return null;
 if(raw.phase==='skirmish'&&(raw.wardenSpawned||raw.bossSpawned||raw.lastClear!==null)||
  raw.phase==='warden'&&(!raw.wardenSpawned||wardenDead||raw.bossSpawned||raw.lastClear!==null)||
  raw.phase==='boss'&&(!wardenDead||raw.sector!==4||bossDead||raw.lastClear!==null)||
  raw.phase==='cleared'&&(!(wardenDead&&!raw.bossSpawned&&raw.lastClear==='warden'||bossDead&&raw.round<2&&raw.lastClear==='boss')||pending.size!==0)||
  raw.phase==='complete'&&(!bossDead||raw.round!==2||raw.bossWins!==3||raw.lastClear!=='boss'||pending.size!==0))return null;
 for(let i=0;i<ARBOR_LIMITS.roots;i++){
  const root=raw.roots[i],layout=ARBOR_SECTORS[raw.sector].roots[i];
  if(!root||root.id!==`arbor-root-${i}`||!ROOT_PHASES.has(root.phase)||root.active!==(root.phase==='active')||
   !Number.isFinite(root.t)||root.t<0||root.t>(root.phase==='rest'?4.75:ARBOR_ROOT_TIMING[root.phase])+1e-8||
   !['x','z','w','d'].every(key=>root[key]===layout[key]))return null;
 }
 const s=fresh();
 if(raw.encounterVersion!==2)delete s.encounterVersion;
 for(const key of ['round','sector','phase','wardens','bossWins','time','sectorTime','initialSeed','seed','spawnIndex','spawnClock','kills','wardenSpawned','bossSpawned','lastClear'])s[key]=raw[key];
 for(let i=0;i<ARBOR_LIMITS.roots;i++)Object.assign(s.roots[i],raw.roots[i]);
 s.pending.push(...raw.pending.map(copyActor));s.killIds.push(...raw.killIds);return s;
}

// Circuit checkpoints are a separate progression grammar. The legacy decoder
// above stays unchanged, so old entrance bytes keep their original meaning.
function restoreArborRoomCircuit(raw){
 const c=raw.circuit;
 if(!c||typeof c!=='object'||Array.isArray(c)||Object.keys(c).length!==2||!Object.hasOwn(c,'version')||!Object.hasOwn(c,'room')||c.version!==1||!integer(c.room,0,4)||
  raw.version!==VERSION||raw.encounterVersion!==2||raw.act!=='arbor'||!integer(raw.round,0,2)||!integer(raw.sector,0,4)||!PHASES.has(raw.phase)||
  !integer(raw.wardens,0,15)||!integer(raw.bossWins,0,3)||!uint(raw.seed)||!uint(raw.initialSeed)||
  !Number.isFinite(raw.time)||raw.time<0||!Number.isFinite(raw.sectorTime)||raw.sectorTime<0||raw.sectorTime>raw.time+1e-8||
  !Number.isFinite(raw.spawnClock)||raw.spawnClock<0||raw.spawnClock>.64||!integer(raw.spawnIndex,0,arborRoomMobQuota(raw.round,raw.sector,c.room))||
  typeof raw.wardenSpawned!=='boolean'||typeof raw.bossSpawned!=='boolean'||![null,'room','warden','boss'].includes(raw.lastClear)||
  !Array.isArray(raw.killIds)||raw.killIds.length>arborRoomCircuitMaxKills()||!raw.killIds.every(id=>typeof id==='string')||new Set(raw.killIds).size!==raw.killIds.length||raw.kills!==raw.killIds.length||
  !Array.isArray(raw.pending)||raw.pending.length>ARBOR_ROOM_CIRCUIT_LIMITS.enemies||!Array.isArray(raw.roots)||raw.roots.length!==ARBOR_LIMITS.roots)return null;
 const killed=new Set(raw.killIds),pending=new Map();
 for(const a of raw.pending){
  if(!a||typeof a.id!=='string'||!['mob','warden','boss'].includes(a.role)||!TYPES.has(a.type)||
   !Number.isFinite(a.x)||Math.abs(a.x)>17||!Number.isFinite(a.z)||Math.abs(a.z)>14||
   !Number.isFinite(a.hp)||a.hp<=0||a.hp>10000||!Number.isFinite(a.speed)||a.speed<=0||a.speed>6||!Number.isFinite(a.damage)||a.damage<=0||a.damage>60||
   pending.has(a.id)||killed.has(a.id)||!canonicalActor(a,raw.round,raw.sector,raw.encounterVersion,c.room))return null;
  pending.set(a.id,a);
 }
 const expected=new Set(),requireDead=id=>{expected.add(id);return killed.has(id);};
 const previousGate=(round,sector)=>{
  for(let room=0;room<4;room++)for(let i=0;i<arborRoomMobQuota(round,sector,room);i++)if(!requireDead(mobId(round,sector,i,room)))return false;
  return requireDead(wardenId(round,sector,4));
 };
 for(let r=0;r<raw.round;r++){
  for(let sector=0;sector<5;sector++)if(!previousGate(r,sector))return null;
  if(!requireDead(bossId(r,true)))return null;
 }
 for(let sector=0;sector<raw.sector;sector++)if(!previousGate(raw.round,sector))return null;
 for(let room=0;room<c.room;room++)for(let i=0;i<arborRoomMobQuota(raw.round,raw.sector,room);i++)if(!requireDead(mobId(raw.round,raw.sector,i,room)))return null;
 let mobsDead=0;
 for(let i=0;i<raw.spawnIndex;i++){
  const id=mobId(raw.round,raw.sector,i,c.room);expected.add(id);
  if(killed.has(id))mobsDead++;else if(pending.get(id)?.role!=='mob')return null;
 }
 const currentWarden=wardenId(raw.round,raw.sector,4),currentBoss=bossId(raw.round,true),wardenDead=killed.has(currentWarden),bossDead=killed.has(currentBoss);
 if(raw.wardenSpawned){expected.add(currentWarden);if(c.room!==4||!wardenDead&&pending.get(currentWarden)?.role!=='warden')return null;}
 if(raw.bossSpawned){expected.add(currentBoss);if(!wardenDead||raw.sector!==4||c.room!==4||!bossDead&&pending.get(currentBoss)?.role!=='boss')return null;}
 if(expected.size!==killed.size+pending.size)return null;
 for(const id of killed)if(!expected.has(id))return null;
 for(const id of pending.keys())if(!expected.has(id))return null;
 const replay={seed:raw.initialSeed};for(let i=0;i<expected.size*2;i++)random(replay);if(replay.seed!==raw.seed)return null;
 const quota=arborRoomMobQuota(raw.round,raw.sector,c.room),mobsFinished=raw.spawnIndex===quota&&mobsDead===quota;
 if(raw.wardens!==raw.round*5+raw.sector+(wardenDead?1:0)||raw.bossWins!==raw.round+(bossDead?1:0)||c.room===4&&raw.spawnClock!==0)return null;
 if(raw.phase==='skirmish'&&(raw.wardenSpawned||raw.bossSpawned||raw.lastClear!==null)||
  raw.phase==='warden'&&(c.room!==4||!raw.wardenSpawned||wardenDead||raw.bossSpawned||raw.lastClear!==null)||
  raw.phase==='boss'&&(!wardenDead||raw.sector!==4||c.room!==4||bossDead||raw.lastClear!==null)||
  raw.phase==='cleared'&&(!(c.room<4&&!raw.wardenSpawned&&!raw.bossSpawned&&mobsFinished&&raw.lastClear==='room'||wardenDead&&!raw.bossSpawned&&raw.lastClear==='warden'||bossDead&&raw.round<2&&raw.lastClear==='boss')||pending.size!==0)||
  raw.phase==='complete'&&(!bossDead||raw.round!==2||raw.bossWins!==3||raw.lastClear!=='boss'||pending.size!==0))return null;
 const layout=ARBOR_SECTORS[(raw.sector+c.room)%5].roots;
 for(let i=0;i<ARBOR_LIMITS.roots;i++){
  const root=raw.roots[i];
  if(!root||root.id!==`arbor-root-${i}`||!ROOT_PHASES.has(root.phase)||root.active!==(root.phase==='active')||
   !Number.isFinite(root.t)||root.t<0||root.t>(root.phase==='rest'?4.75:ARBOR_ROOT_TIMING[root.phase])+1e-8||
   !['x','z','w','d'].every(key=>root[key]===layout[i][key]))return null;
 }
 const s=fresh(true);s.circuit.room=c.room;
 for(const key of ['round','sector','phase','wardens','bossWins','time','sectorTime','initialSeed','seed','spawnIndex','spawnClock','kills','wardenSpawned','bossSpawned','lastClear'])s[key]=raw[key];
 for(let i=0;i<ARBOR_LIMITS.roots;i++)Object.assign(s.roots[i],raw.roots[i]);
 s.pending.push(...raw.pending.map(copyActor));s.killIds.push(...raw.killIds);return s;
}
