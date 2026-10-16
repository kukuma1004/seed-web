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
const VERSION=1,DEFAULT_SEED=0x6a10;
const PHASES=new Set(['skirmish','warden','boss','cleared','complete']);
const ROOT_PHASES=new Set(['rest','warn','active','lower']);
const TYPES=new Set(['swarm','hound','caster','shield','warden']);
const clamp=(n,a,b)=>Math.max(a,Math.min(b,n));
const finite=(n,fallback=0)=>Number.isFinite(n)?n:fallback;
const dtOf=dt=>clamp(finite(dt),0,ARBOR_LIMITS.maxStep);
const uint=n=>Number.isInteger(n)&&n>0&&n<=0xffffffff;
const integer=(n,a,b)=>Number.isInteger(n)&&n>=a&&n<=b;
const mobId=(r,s,i)=>`arbor:r${r}:s${s}:m${i}`;
const wardenId=(r,s)=>`arbor:r${r}:s${s}:w`;
const bossId=r=>`arbor:r${r}:b`;
export const arborSectorMobQuota=(round=0,sector=0)=>12+clamp(round|0,0,2)*2+clamp(sector|0,0,4)*2;
export const arborBossHp=(round=0)=>Math.round(2800*(1+clamp(round|0,0,2)*.48));
function random(s){let n=s.seed|0;n^=n<<13;n^=n>>>17;n^=n<<5;s.seed=n>>>0;return s.seed/4294967296;}
function resetOutput(s){s.out.spawns.length=0;s.out.events.length=0;s.out.phaseChanged=false;return s.out;}
function setPhase(s,phase){if(s.phase!==phase){s.phase=phase;s.out.phaseChanged=true;}}
function configureRoots(s){
 const layout=ARBOR_SECTORS[s.sector].roots;
 for(let i=0;i<layout.length;i++)Object.assign(s.roots[i],layout[i],{phase:'rest',t:ARBOR_ROOT_TIMING.rest+i*.35,active:false});
}
function fresh(){
 const s={version:VERSION,act:'arbor',round:0,sector:0,phase:'skirmish',wardens:0,bossWins:0,time:0,sectorTime:0,
  initialSeed:DEFAULT_SEED,seed:DEFAULT_SEED,spawnIndex:0,spawnClock:0,kills:0,wardenSpawned:false,bossSpawned:false,lastClear:null,
  roots:ARBOR_SECTORS[0].roots.map((r,i)=>({id:`arbor-root-${i}`,...r,phase:'rest',t:0,active:false})),
  pending:[],killIds:[],playerSample:{x:0,z:5},out:{spawns:[],events:[],phaseChanged:false}};
 configureRoots(s);return s;
}
export function createArborJourney(raw=null){return raw===null?fresh():restoreArborJourney(raw);}
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
 const angle=random(s)*Math.PI*2,radius=6.2+random(s)*1.3;
 for(let i=0;i<16;i++){
  const a=angle+i*Math.PI*2/16,x=clamp(p.x+Math.cos(a)*radius,-13,13),z=clamp(p.z+Math.sin(a)*radius,-11,11);
  if(Math.hypot(x-p.x,z-p.z)<ARBOR_LIMITS.minSpawnDistance)continue;
  let blocked=false;for(const root of s.roots)if(root.active&&Math.abs(x-root.x)<root.w/2+.65&&Math.abs(z-root.z)<root.d/2+.65){blocked=true;break;}
  if(!blocked)return {x,z};
 }
 // The arena's opposite corner is a deterministic safe fallback at its edges.
 return {x:p.x>0?-12:12,z:p.z>0?-10:10};
}
function issue(s,role,p){
 const pos=spawnPoint(s,p),r=s.round,sector=s.sector,index=s.spawnIndex;
 let type,id,hp,speed,damage;
 if(role==='mob'){
  type=index%7===6?'shield':index%4===2?'caster':index%3===1?'hound':'swarm';
  id=mobId(r,sector,index);hp=({swarm:44,hound:86,caster:108,shield:140}[type]+sector*8)*(1+r*.5);
  speed=({swarm:2.8,hound:3.5,caster:2.1,shield:1.9}[type])*(1+r*.06);damage=10+r*2+Math.floor(sector/2);s.spawnIndex++;
 }else if(role==='warden'){type='warden';id=wardenId(r,sector);hp=640+sector*90+r*430;speed=2.3+r*.12;damage=17+r*3;s.wardenSpawned=true;}
 else{type='warden';id=bossId(r);hp=arborBossHp(r);speed=1.8+r*.15;damage=18+r*3;s.bossSpawned=true;}
 const actor={id,role,type,...pos,hp:Math.round(hp),speed,damage};s.pending.push(actor);s.out.spawns.push(actor);return actor;
}
export function stepArborJourney(s,dt,{player=ARBOR_ARENA.start,alive=0,projectiles=0}={}){
 const out=resetOutput(s),step=dtOf(dt);if(!step||s.phase==='cleared'||s.phase==='complete')return out;
 const p=s.playerSample;p.x=clamp(finite(player?.x),-13.5,13.5);p.z=clamp(finite(player?.z),-11.5,11.5);
 s.time+=step;s.sectorTime+=step;rootsStep(s,step,p);
 const live=Math.max(s.pending.length,Math.max(0,finite(alive))),quota=arborSectorMobQuota(s.round,s.sector);
 if(s.phase==='boss'){
  if(!s.bossSpawned&&live===0){issue(s,'boss',p);out.events.push({type:'boss-call',round:s.round,name:ARBOR_ACT.bossName});}
  return out;
 }
 if(s.phase!=='skirmish')return out;
 if(s.spawnIndex===quota&&s.pending.length===0&&live===0){
  setPhase(s,'warden');issue(s,'warden',p);out.events.push({type:'warden-call',sector:s.sector,ordinal:s.wardens+1});return out;
 }
 s.spawnClock=Math.max(0,s.spawnClock-step);if(s.spawnClock>1e-9||s.spawnIndex>=quota)return out;
 // There is no queued catch-up after a crowded frame or a background return.
 s.spawnClock=Math.max(.38,.64-s.round*.045-s.sector*.025);
 if(projectiles>=ARBOR_LIMITS.projectiles)return out;
 const count=Math.min(ARBOR_LIMITS.spawnsPerStep,ARBOR_LIMITS.enemies-live,quota-s.spawnIndex);
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
 if(s.lastClear==='warden')s.sector++;
 else if(s.lastClear==='boss'&&s.round<2){s.round++;s.sector=0;}
 else return false;
 s.spawnIndex=0;s.spawnClock=0;s.sectorTime=0;s.wardenSpawned=false;s.bossSpawned=false;s.lastClear=null;
 setPhase(s,'skirmish');configureRoots(s);return true;
}
const copyActor=a=>({id:a.id,role:a.role,type:a.type,x:a.x,z:a.z,hp:a.hp,speed:a.speed,damage:a.damage});
export function checkpointArborJourney(s){
 return {version:VERSION,act:'arbor',round:s.round,sector:s.sector,phase:s.phase,wardens:s.wardens,bossWins:s.bossWins,
  time:s.time,sectorTime:s.sectorTime,initialSeed:s.initialSeed,seed:s.seed,spawnIndex:s.spawnIndex,spawnClock:s.spawnClock,kills:s.kills,
  wardenSpawned:s.wardenSpawned,bossSpawned:s.bossSpawned,lastClear:s.lastClear,
  roots:s.roots.map(r=>({id:r.id,x:r.x,z:r.z,w:r.w,d:r.d,phase:r.phase,t:r.t,active:r.active})),
  pending:s.pending.map(copyActor),killIds:[...s.killIds]};
}
function validActor(a){
 return a&&typeof a.id==='string'&&['mob','warden','boss'].includes(a.role)&&TYPES.has(a.type)&&
  Number.isFinite(a.x)&&Math.abs(a.x)<=13&&Number.isFinite(a.z)&&Math.abs(a.z)<=11&&
  Number.isFinite(a.hp)&&a.hp>0&&a.hp<=10000&&Number.isFinite(a.speed)&&a.speed>0&&a.speed<=6&&Number.isFinite(a.damage)&&a.damage>0&&a.damage<=60;
}
function canonicalActor(a,round,sector){
 const index=a.role==='mob'?Number(a.id.split(':m')[1]):-1;
 const type=a.role==='mob'?(index%7===6?'shield':index%4===2?'caster':index%3===1?'hound':'swarm'):'warden';
 const hp=a.role==='mob'?Math.round((({swarm:44,hound:86,caster:108,shield:140}[type])+sector*8)*(1+round*.5)):a.role==='warden'?640+sector*90+round*430:arborBossHp(round);
 const speed=a.role==='mob'?({swarm:2.8,hound:3.5,caster:2.1,shield:1.9}[type])*(1+round*.06):a.role==='warden'?2.3+round*.12:1.8+round*.15;
 const damage=a.role==='mob'?10+round*2+Math.floor(sector/2):a.role==='warden'?17+round*3:18+round*3;
 return a.type===type&&a.hp===hp&&a.speed===speed&&a.damage===damage;
}
// This is schema/progression validation, not an anti-cheat signature. It rejects
// impossible skipped sectors and mismatched receipts without silently healing them.
export function restoreArborJourney(raw){
 if(!raw||raw.version!==VERSION||raw.act!=='arbor'||!integer(raw.round,0,2)||!integer(raw.sector,0,4)||!PHASES.has(raw.phase)||
  !integer(raw.wardens,0,15)||!integer(raw.bossWins,0,3)||!uint(raw.seed)||!uint(raw.initialSeed)||
  !Number.isFinite(raw.time)||raw.time<0||!Number.isFinite(raw.sectorTime)||raw.sectorTime<0||raw.sectorTime>raw.time+1e-8||
  !Number.isFinite(raw.spawnClock)||raw.spawnClock<0||raw.spawnClock>.64||!integer(raw.spawnIndex,0,arborSectorMobQuota(raw.round,raw.sector))||
  typeof raw.wardenSpawned!=='boolean'||typeof raw.bossSpawned!=='boolean'||![null,'warden','boss'].includes(raw.lastClear)||
  !Array.isArray(raw.killIds)||raw.killIds.length>400||!raw.killIds.every(id=>typeof id==='string')||new Set(raw.killIds).size!==raw.killIds.length||raw.kills!==raw.killIds.length||
  !Array.isArray(raw.pending)||raw.pending.length>ARBOR_LIMITS.enemies||!raw.pending.every(validActor)||
  !Array.isArray(raw.roots)||raw.roots.length!==ARBOR_LIMITS.roots)return null;
 const killed=new Set(raw.killIds),pending=new Map();
 for(const actor of raw.pending){if(pending.has(actor.id)||killed.has(actor.id)||!canonicalActor(actor,raw.round,raw.sector))return null;pending.set(actor.id,actor);}
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
 for(const key of ['round','sector','phase','wardens','bossWins','time','sectorTime','initialSeed','seed','spawnIndex','spawnClock','kills','wardenSpawned','bossSpawned','lastClear'])s[key]=raw[key];
 for(let i=0;i<ARBOR_LIMITS.roots;i++)Object.assign(s.roots[i],raw.roots[i]);
 s.pending.push(...raw.pending.map(copyActor));s.killIds.push(...raw.killIds);return s;
}
