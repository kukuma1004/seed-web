import {createCrystalSiege,harvestCrystalSiege,buildCrystalSiege,stepCrystalSiegeThreat,stepCrystalSiegePaidFacilities,checkpointCrystalSiege,restoreCrystalSiege,clampCrystalSiegePoint} from './crystal-siege-rules.js';
import {survivalEnemySpec} from './survival-rules.js';
import {validSurvivalSave,survivalTitleEvents} from './survival-save.js';
import {survivalObjectiveLegacyProjection} from './survival-objective-save.js';

// Local review adapter: paid original facilities, original Survival actor stats.
// The host still owns attacks, actor HP, kill receipts and the original boss.
export const SURVIVAL_SIEGE=Object.freeze({version:1,prepDuration:15,defenseDuration:35,roundCount:3,populations:Object.freeze([60,72,84]),live:72,spawnsPerStep:3,spawnInterval:.6,maxStep:.1});
const integer=(n,a,b)=>Number.isInteger(n)&&n>=a&&n<=b;
const finite=(n,a,b)=>Number.isFinite(n)&&n>=a&&n<=b;
const point=p=>p&&finite(p.x,-7.5,7.5)&&finite(p.z,-6.5,6.5);
const delta=dt=>Number.isFinite(dt)?Math.max(0,Math.min(.1,dt)):0;
const exact=(o,keys)=>o&&typeof o==='object'&&!Array.isArray(o)&&Object.keys(o).every(k=>keys.includes(k));
const clone=v=>JSON.parse(JSON.stringify(v));
export const SURVIVAL_OBJECTIVE='crystal-defense-v1';
export const survivalSiegeActive=session=>session?.actCount===5&&session.act===4&&!session.finished&&!session.won&&(
 (session.siegeReview===true&&session.lab==='siege')||
 (session.objective===SURVIVAL_OBJECTIVE&&!session.lab&&!session.benchmark&&!session.siegeReview));
const active=survivalSiegeActive;
const output=()=>({spawns:[],hits:[],snares:[],tells:[],bossReady:false,failed:false});
export const survivalSiegeReviewKey=owner=>'seed-survival-siege-review-v1:'+encodeURIComponent(owner);
export function createSurvivalSiege(session){
 if(!active(session)||!integer(session.seed,0,4294967295)||!finite(session.time,0,1e12))throw Error('Invalid local survival siege session');
 const seed=session.rngState>>>0||session.seed||1;return{version:1,round:0,phase:'prep',elapsed:0,spawned:0,spawnClock:.35,rng:seed,lap:session.lap||0,startedAt:session.time,time:session.time,bossReadySent:false,crystal:createCrystalSiege(0,seed)};
}
export const survivalSiegeState=s=>s?.crystal??null;
export function harvestSurvivalSiege(s,id,player){return s?.phase==='prep'?harvestCrystalSiege(s.crystal,id,player):{ok:false,reason:'phase'};}
export function buildSurvivalSiege(s,id,kind,player){return s?.phase==='prep'?buildCrystalSiege(s.crystal,id,kind,player):{ok:false,reason:'phase'};}
export function startSurvivalSiege(s){if(s?.phase!=='prep'||s.crystal.core.hp<=0)return false;s.phase=s.crystal.phase='defense';s.elapsed=0;return true;}
function random(s){s.rng=(Math.imul(s.rng,1664525)+1013904223)>>>0;return s.rng/4294967296;}
function liveActors(enemies){const live=[],seen=new Set();for(const e of enemies){if(!e||typeof e.id!=='string'||!finite(e.x,-1000,1000)||!finite(e.z,-1000,1000)||!finite(e.hp,Number.MIN_VALUE,1e12)||seen.has(e.id))continue;seen.add(e.id);live.push(e);}return live;}
function nextRound(s){
 const old=s.crystal,next=createCrystalSiege(s.round+1,s.rng||1);next.core.hp=old.core.hp;next.resources=old.resources;next.pads=old.pads.map(p=>({...p}));s.round++;s.crystal=next;s.phase='prep';s.elapsed=0;s.spawned=0;s.spawnClock=.35;
}
export function stepSurvivalSiege(s,dt,{player,enemies=[],session}={}){
 const out=output(),d=delta(dt);if(!s||!active(session)||!d)return out;
 if(s.crystal.core.hp<=0||s.phase==='failed'){s.phase=s.crystal.phase='failed';out.failed=true;return out;}
 session.time+=d;s.time=session.time;const live=liveActors(enemies);
 if(s.phase==='prep'){s.elapsed=Math.min(15,s.elapsed+d);if(s.elapsed>=15-1e-8)startSurvivalSiege(s);return out;}
 const facilities=stepCrystalSiegePaidFacilities(s.crystal,d,live,{boss:s.phase==='boss'});out.hits.push(...facilities.hits);out.snares.push(...facilities.snares);
 if(s.phase==='boss')return out;
 s.elapsed=Math.min(1e6,s.elapsed+d);s.spawnClock-=d;
 if(s.spawned<SURVIVAL_SIEGE.populations[s.round]&&s.spawnClock<=0){
  // Consume one bounded packet attempt even at capacity; never retain backlog.
  s.spawnClock=.6;const n=Math.min(3,SURVIVAL_SIEGE.populations[s.round]-s.spawned,Math.max(0,72-live.length));
  for(let i=0;i<n;i++){
   const index=s.spawned++,side=Math.floor(random(s)*4),offset=-5.3+random(s)*10.6;
   const p=clampCrystalSiegePoint(side===0?{x:-7.2,z:offset}:side===1?{x:7.2,z:offset}:side===2?{x:offset,z:-6.2}:{x:offset,z:6.2});
   const kind=index%9===8?'brute':index%3===2?'runner':'swarm',id=`survival-siege-${s.lap}-${s.round}-${index}`,spec=survivalEnemySpec(kind,session);
   out.spawns.push({id,x:p.x,z:p.z,kind,spec});out.tells.push({kind:'entry',id,position:p,remaining:.75});
  }
 }
 if(s.elapsed>=35&&s.spawned===SURVIVAL_SIEGE.populations[s.round]&&!live.length&&!out.spawns.length){
  if(s.round<2)nextRound(s);
  else{s.phase=s.crystal.phase='boss';if(!s.bossReadySent){s.bossReadySent=true;if(!session.bossSpawned)out.bossReady=true;}}
 }return out;
}
export function createSurvivalSiegeThreat(packet){
 const spec=packet?.spec;if(typeof packet?.id!=='string'||!point(packet)||!spec||!finite(spec.hp,1,1e12)||!finite(spec.speed,.1,100)||!finite(spec.damage,0,100))throw Error('Invalid survival siege threat');
 return{id:packet.id,position:{x:packet.x,z:packet.z},hp:spec.hp,speed:spec.speed,damage:spec.damage,phase:'entry',timer:.75,target:null,aim:{x:0,z:0},slowFor:0,slowFactor:1};
}
export function stepSurvivalSiegeThreat(s,threat,dt,{player}={}){return stepCrystalSiegeThreat(threat,dt,s.crystal,{player});}

function validTree(value){
 let count=0;function visit(v){if(++count>40000)return false;if(!v||typeof v!=='object')return typeof v!=='number'||Number.isFinite(v);if(!Array.isArray(v)){const p=Object.getPrototypeOf(v);if(p!==null&&p!==Object.prototype)return false;}for(const [k,x]of Object.entries(v)){if(['__proto__','prototype','constructor'].includes(k)||!visit(x))return false;}return true;}
 return visit(value);
}
function restoreWrapper(raw){
 if(!exact(raw,['version','round','phase','elapsed','spawned','spawnClock','rng','lap','startedAt','time','bossReadySent','crystal'])||raw.version!==1||!integer(raw.round,0,2)||!['prep','defense','boss','failed'].includes(raw.phase)||!finite(raw.elapsed,0,1e6)||!integer(raw.spawned,0,SURVIVAL_SIEGE.populations[raw.round])||!finite(raw.spawnClock,-.1,.6)||!integer(raw.rng,0,4294967295)||!integer(raw.lap,0,1000)||!finite(raw.startedAt,0,1e12)||!finite(raw.time,raw.startedAt,1e12)||typeof raw.bossReadySent!=='boolean')return null;
 const inner=raw.crystal;if(!inner||inner.room!==raw.round||inner.phase!==raw.phase||inner.elapsed!==0||inner.spawnIndex!==0||inner.spawned!==0||inner.spawnClock!==.35)return null;
 if(raw.time-raw.startedAt+1e-6<raw.round*35+raw.elapsed)return null;
 if(raw.phase==='prep'&&(raw.elapsed>=15||raw.spawned!==0)||raw.phase==='boss'&&(raw.round!==2||raw.spawned!==84||raw.elapsed<35||!raw.bossReadySent)||!['boss','failed'].includes(raw.phase)&&raw.bossReadySent||raw.bossReadySent&&(raw.round!==2||raw.spawned!==84||raw.elapsed<35)||raw.phase==='failed'&&inner.core?.hp!==0||raw.phase!=='failed'&&inner.core?.hp<=0)return null;
 const crystal=restoreCrystalSiege({...inner,phase:raw.phase==='boss'?'defense':raw.phase});crystal.phase=raw.phase;return{...clone(raw),crystal};
}
export function checkpointSurvivalSiege(s){try{const raw={...s,crystal:checkpointCrystalSiege(s.crystal)};return validTree(raw)&&restoreWrapper(raw)?clone(raw):null;}catch{return null;}}
export function restoreSurvivalSiege(raw){try{return validTree(raw)?restoreWrapper(raw):null;}catch{return null;}}
function validThreat(t,s){
 if(!exact(t,['id','position','hp','speed','damage','phase','timer','target','aim','slowFor','slowFactor','siegeSnares'])||typeof t.id!=='string'||!new RegExp(`^survival-siege-${s.lap}-${s.round}-(\\d+)$`).test(t.id)||!point(t.position)||!exact(t.position,['x','z'])||!finite(t.hp,Number.MIN_VALUE,1e12)||!finite(t.speed,.1,100)||!finite(t.damage,0,100)||!['entry','approach','windup','recover'].includes(t.phase)||!finite(t.timer,0,3)||!exact(t.aim,['x','z'])||!finite(t.aim.x,-1,1)||!finite(t.aim.z,-1,1)||!finite(t.slowFor,0,4)||!finite(t.slowFactor,.1,1))return false;
 const index=Number(t.id.split('-').at(-1));if(!integer(index,0,s.spawned-1)||t.id!==`survival-siege-${s.lap}-${s.round}-${index}`)return false;
 const aimLength=Math.hypot(t.aim.x,t.aim.z);if(aimLength>1e-8&&Math.abs(aimLength-1)>1e-8||t.phase==='windup'&&Math.abs(aimLength-1)>1e-8)return false;
 if(t.phase==='windup'){
  if(!exact(t.target,['id','x','z'])||!point(t.target))return false;const p=t.target.id===undefined?s.crystal.core:s.crystal.pads.find(p=>p.id===t.target.id);if(!p||p.x!==t.target.x||p.z!==t.target.z)return false;
 }else if(t.target!==null)return false;
 const slots=t.siegeSnares??[];if(!Array.isArray(slots)||slots.length>4||new Set(slots.map(e=>e?.id)).size!==slots.length||slots.some(e=>!exact(e,['id','factor','remaining'])||!/^pad-[0-3]$/.test(e.id)||!finite(e.factor,.1,1)||!finite(e.remaining,Number.MIN_VALUE,4)))return false;
 const slow=slots.reduce((n,e)=>Math.min(n,e.factor),1),remaining=slots.reduce((n,e)=>Math.max(n,e.remaining),0);return Math.abs(slow-t.slowFactor)<1e-8&&Math.abs(remaining-t.slowFor)<1e-8;
}
function validWorld(world,s,threats){
 const session=world?.session;if(session?.siegeReview!==true||session.lab!=='siege'||session.act!==4||session.actCount!==5||session.lap!==s.lap||session.time!==s.time||survivalTitleEvents(session)?.length!==0||session.titleBoss!==undefined||session.titleOrdinal!==undefined||!Array.isArray(threats)||threats.length>72)return false;
 if(s.phase==='boss'&&!session.bossSpawned)return false;
 if(s.phase!=='boss'&&(session.bossSpawned||world.enemies?.some(e=>e.fields?.survivalBoss)))return false;
 const normalized={...world,session:{...session,act:0,lab:null,siegeReview:false}};delete normalized.expansion;delete normalized.owner;if(!validSurvivalSave(normalized))return false;
 if(['prep','boss'].includes(s.phase)&&threats.length)return false;if(s.phase==='prep'&&world.enemies.length)return false;
 const actors=world.enemies.filter(e=>!e.fields.survivalBoss),ids=new Set();if(actors.length!==threats.length)return false;
 for(const t of threats){if(!validThreat(t,s)||ids.has(t.id))return false;ids.add(t.id);const actor=actors.find(e=>e.fields.survivalSiegeId===t.id);if(!actor||actor.fields.hp!==t.hp||actor.position[0]!==t.position.x||actor.position[2]!==t.position.z)return false;}
 if(new Set(actors.map(e=>e.fields.survivalSiegeId)).size!==actors.length)return false;
 return true;
}
// The public route validates the *actual* five-act world. Unlike the review
// route it must never rewrite lab/review markers to make a fixture acceptable.
export function validSurvivalPublicSiegeWorld(world,s,threats){
 const session=world?.session;
 if(!session||session.objective!==SURVIVAL_OBJECTIVE||session.lab||session.benchmark||session.siegeReview||session.act!==4||session.actCount!==5||session.lap!==s?.lap||session.time!==s.time||!Array.isArray(threats)||threats.length>72)return false;
 if(!validSurvivalSave(survivalObjectiveLegacyProjection(world))||survivalTitleEvents(session)===null)return false;
 if(s.phase==='failed'||s.crystal.core.hp<=0)return false;
 if(s.phase==='boss'&&!session.bossSpawned||s.phase!=='boss'&&(session.bossSpawned||world.enemies?.some(e=>e.fields?.survivalBoss)))return false;
 if(['prep','boss'].includes(s.phase)&&threats.length||s.phase==='prep'&&world.enemies.length)return false;
 const actors=world.enemies.filter(e=>!e.fields.survivalBoss),ids=new Set();
 if(actors.length!==threats.length)return false;
 for(const t of threats){
  if(!validThreat(t,s)||ids.has(t.id))return false;ids.add(t.id);
  const actor=actors.find(e=>e.fields.survivalSiegeId===t.id);
  if(!actor||actor.fields.hp!==t.hp||actor.position[0]!==t.position.x||actor.position[2]!==t.position.z)return false;
 }
 return new Set(actors.map(e=>e.fields.survivalSiegeId)).size===actors.length;
}
export function checkpointSurvivalSiegeReview(s,world,threats,owner){
 try{if(typeof owner!=='string'||!owner||!validTree(world)||!validTree(threats))return null;const saved=checkpointSurvivalSiege(s);if(!saved||!validWorld(world,s,threats))return null;return{version:1,kind:'survival-siege-review',owner,siege:saved,world:clone(world),threats:clone(threats)};}catch{return null;}
}
export function restoreSurvivalSiegeReview(raw,owner){
 try{if(typeof owner!=='string'||!owner||typeof raw==='string'&&raw.length>800000)return null;const r=typeof raw==='string'?JSON.parse(raw):raw;if(!validTree(r)||!exact(r,['version','kind','owner','siege','world','threats'])||r.version!==1||r.kind!=='survival-siege-review'||r.owner!==owner)return null;const siege=restoreSurvivalSiege(r.siege);if(!siege||!validWorld(r.world,siege,r.threats))return null;return{siege,world:clone(r.world),threats:clone(r.threats)};}catch{return null;}
}
