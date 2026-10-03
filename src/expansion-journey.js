import {EXPANSION_ACTS} from './act-expansion.js';
import {createExpansionCourse,stepExpansionCourse,checkpointExpansionCourse,createExpansionBoss,stepExpansionBoss,checkpointExpansionBoss,restoreExpansionCourse,restoreExpansionBoss,EXPANSION_RUNTIME_LIMITS} from './act-expansion-runtime.js';
export {createCrystalCombatBridge,traceCrystalProjectile} from './crystal-combat-bridge.js';
export {EXPANSION_ACTS};

const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
const point=p=>({x:p.x,z:p.z});
const direction=(a,b)=>{const x=b.x-a.x,z=b.z-a.z,n=Math.hypot(x,z)||1;return {x:x/n,z:z/n};};
const safeDt=dt=>clamp(Number.isFinite(dt)?dt:0,0,.1);

// The existing journey owns the seed, attack/choice engine, damage and visuals.
// This adapter owns world course progress and warned enemy intent only. It never
// writes account, title or ranking data; preview checkpoints are kept separately.
export function createExpansionJourney(act='crosswind',room=0,seed=1){
 if(!Object.hasOwn(EXPANSION_ACTS,act))throw new Error('Unknown expansion journey');
 return {act,room:clamp(room|0,0,4),seed:seed>>>0||1,course:createExpansionCourse(act,{room,seed}),boss:null,phase:'course',bossId:EXPANSION_ACTS[act].bossId};
}
export function advanceExpansionJourney(s){
 if(s.phase==='finished')return false;
 if(s.room===4){s.phase='boss';s.boss=createExpansionBoss(s.bossId,{seed:s.course.seed});return true;}
 s.room++;s.seed=s.course.seed;s.course=createExpansionCourse(s.act,{room:s.room,seed:s.seed});s.phase='course';return true;
}
export function checkpointExpansionJourney(s){return {version:1,act:s.act,room:s.room,seed:s.seed,phase:s.phase,course:checkpointExpansionCourse(s.course),boss:s.boss?checkpointExpansionBoss(s.boss):null};}
export function restoreExpansionJourney(raw){
 if(raw?.version!==1||!Object.hasOwn(EXPANSION_ACTS,raw.act)||!Number.isInteger(raw.room)||raw.room<0||raw.room>4||!['course','boss','finished'].includes(raw.phase)||raw.course?.version!==1||raw.course?.act!==raw.act||raw.course?.room!==raw.room)return null;
 if(raw.phase==='boss'&&!raw.boss)return null;
 const s=createExpansionJourney(raw.act,raw.room,raw.seed);s.course=restoreExpansionCourse(raw.course);s.phase=raw.phase;
 if(raw.boss){if(raw.boss.version!==1||raw.boss.id!==s.bossId)return null;s.boss=restoreExpansionBoss(raw.boss,s.bossId);}return s;
}
export function stepExpansionJourney(s,dt,context){
 if(s.phase==='course')return stepExpansionCourse(s.course,dt,context);
 if(s.phase==='boss')return stepExpansionBoss(s.boss,dt,context);
 return null;
}
export function createExpansionThreat(spec){
 return {id:spec.id,type:spec.type,position:point(spec.position),hp:spec.hp,maxHp:spec.hp,side:spec.side,
  speed:spec.speed,cooldown:spec.cooldown,bulletSpeed:spec.bulletSpeed,damage:spec.damage,shots:clamp(spec.shots|0,1,2),windup:Math.max(.65,spec.windup),
  phase:'entry',timer:Math.max(.7,spec.windup),aim:{x:0,z:0},flight:0,contactHit:false,out:{bolts:[],tell:null,contact:null}};
}
// One entry warning, then approach -> locked aim -> shot/charge -> recovery.
// No timer catch-up after backgrounding and no firing through a saturated cap.
export function stepExpansionThreat(s,dt,{player,projectiles=0}={}){
 const out=s.out;out.bolts.length=0;out.tell=null;out.contact=null;const step=safeDt(dt);if(!step||s.hp<=0)return out;
 s.timer-=step;
 if(s.phase==='entry'){out.tell={kind:'entry',position:point(s.position),remaining:Math.max(0,s.timer)};if(s.timer<=0){s.phase='approach';s.timer=.3;}return out;}
 if(s.phase==='windup'){
  out.tell={kind:s.type==='charger'?'charge':'shot',position:point(s.position),direction:point(s.aim),remaining:Math.max(0,s.timer)};
  if(s.timer>0)return out;
  if(s.type==='charger'){s.phase='charge';s.timer=.65;s.flight++;s.contactHit=false;return out;}
  for(let k=0;k<s.shots&&projectiles+out.bolts.length<EXPANSION_RUNTIME_LIMITS.projectiles;k++){
   const a=s.shots===1?0:(k?1:-1)*.14,c=Math.cos(a),n=Math.sin(a);
   out.bolts.push({position:point(s.position),dir:{x:s.aim.x*c-s.aim.z*n,z:s.aim.x*n+s.aim.z*c},spec:{speed:s.bulletSpeed,damage:s.damage,life:3,boss:false}});
  }
  s.phase='recover';s.timer=s.cooldown;return out;
 }
 if(s.phase==='charge'){
  const from=point(s.position);s.position.x+=s.aim.x*9*step;s.position.z+=s.aim.z*9*step;
  out.contact={from,to:point(s.position),radius:.7,damage:s.damage,hitId:`${s.id}-${s.flight}`};
  if(s.timer<=0){s.phase='recover';s.timer=1;}return out;
 }
 if(s.phase==='recover'){if(s.timer<=0){s.phase='approach';s.timer=.35;}return out;}
 const d=Math.hypot(player.x-s.position.x,player.z-s.position.z),aim=direction(s.position,player);
 const reach=s.type==='charger'?5:7.5;
 if(d>reach){s.position.x+=aim.x*s.speed*step;s.position.z+=aim.z*s.speed*step;}
 if(d<=reach&&s.timer<=0){s.phase='windup';s.timer=s.windup;s.aim=aim;}
 return out;
}
export function expansionContactHits(contact,p,radius=.4){
 const a=contact.from,b=contact.to,dx=b.x-a.x,dz=b.z-a.z,n=dx*dx+dz*dz;
 const t=n?clamp(((p.x-a.x)*dx+(p.z-a.z)*dz)/n,0,1):0;
 return Math.hypot(p.x-a.x-dx*t,p.z-a.z-dz*t)<contact.radius+radius;
}
// The sprite communicates the committed attack, not a freshly tracked target.
export function expansionFacing(model,position,player){
 return ['windup','charge','tell','attack'].includes(model.phase||model.state)?model.aim:direction(position,player);
}
export function expansionBossDamageMultiplier(act,state,coreOpen){
 return act==='crystalGorge'?(coreOpen?1.3:1):state==='recover'?1.35:1;
}
