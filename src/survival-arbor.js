import {createArborBoss,stepArborBoss,ARBOR_BOSS_LIMITS} from './arbor-boss.js';
import {SURVIVAL} from './survival-rules.js';

// Survival reuses Arbo's real fan / three warned roots / open-flower cycle.
// It does not import Journey's room ledger, extra ranged enemies or rewards.
const keys=['round','sequence','sequenceIndex','position','hp','maxHp','phase','pattern','timer','phaseIndex','cycles','rootStep','coreOpen','aim','target','playerSample'];
const integer=(n,a,b)=>Number.isInteger(n)&&n>=a&&n<=b;
const finite=(n,a,b)=>Number.isFinite(n)&&n>=a&&n<=b;
const point=p=>p&&Object.keys(p).length===2&&finite(p.x,-1000,1000)&&finite(p.z,-1000,1000);
const expectedRound=lap=>Math.min(2,Math.max(0,Math.floor(lap||0)));
export function checkpointSurvivalArbor(model){
 const value={version:1};for(const key of keys)value[key]=typeof model[key]==='object'?structuredClone(model[key]):model[key];return value;
}
export function restoreSurvivalArbor(value,lap=0){
 if(!value||Object.keys(value).length!==keys.length+1||value.version!==1||keys.some(k=>!Object.hasOwn(value,k))||value.round!==expectedRound(lap))return null;
 const fresh=createArborBoss(value.round,{encounterVersion:2});
 if(JSON.stringify(value.sequence)!==JSON.stringify(fresh.sequence)||!integer(value.sequenceIndex,0,fresh.sequence.length-1)||value.pattern!==fresh.sequence[value.sequenceIndex])return null;
 if(!['approach','windup','recover','dead'].includes(value.phase)||!integer(value.phaseIndex,0,2)||!integer(value.cycles,0,1000000)||!integer(value.rootStep,0,3)||typeof value.coreOpen!=='boolean'||!finite(value.timer,0,2.8))return null;
 if(!finite(value.hp,0,fresh.maxHp)||value.maxHp!==fresh.maxHp||['position','aim','target','playerSample'].some(k=>!point(value[k])))return null;
 if(value.coreOpen!==(value.phase==='recover')||value.phase==='dead'&&value.hp>0||value.phase!=='dead'&&value.hp<=0||value.phase==='windup'&&value.pattern===2)return null;
 const aim=Math.hypot(value.aim.x,value.aim.z);if(Math.abs(aim-1)>1e-7)return null;
 for(const key of keys)fresh[key]=typeof value[key]==='object'?structuredClone(value[key]):value[key];return fresh;
}
export function survivalArborBossArt({mobile=false}={}){
 return {file:'arbor/arbo-motion-v1'+(mobile?'-mobile':'')+'.webp',size:4.5,baseline:.07,atlasColumns:2,atlasRows:2,
  atlasFrame:actor=>actor.expansionMotion?.phase==='windup'?1:actor.arborAttackTime>0?2:actor.expansionMotion?.phase==='recover'?3:0,occlusion:false,lighting:false};
}
export function createSurvivalArbor(session,saved=null){
 const model=saved?restoreSurvivalArbor(saved,session.lap):createArborBoss(expectedRound(session.lap),{encounterVersion:2});
 if(!model)return null;
 // Reused bounded output and context: the 300 contact-only crowd keeps its
 // existing instance buffers; only this one boss can create up to 48 bolts.
 const out={move:{x:0,z:0},state:'recover',coreOpen:false,telegraphs:[],contacts:[],terrain:[],bolts:[],zones:[],arborCue:null};
 const context={player:null,projectiles:0,arena:SURVIVAL.arena};
 return {model,
  step(dt,{position,player,activeProjectiles=0,hpRatio=1}={}){
   const x=position?.x??model.position.x,z=position?.z??model.position.z;model.position.x=x;model.position.z=z;
   model.hp=Math.max(0,Math.min(1,hpRatio))*model.maxHp;context.player=player;context.projectiles=activeProjectiles;
   const result=stepArborBoss(model,Math.min(ARBOR_BOSS_LIMITS.maxStep,Math.max(0,dt)),context);
   out.move.x=model.position.x-x;out.move.z=model.position.z-z;out.state=model.phase==='windup'?'tell':model.phase;
   out.coreOpen=model.coreOpen;out.bolts=result.bolts;out.zones=result.zones;out.arborCue=result.cue;
   return out;
  },checkpoint:()=>checkpointSurvivalArbor(model)
 };
}
