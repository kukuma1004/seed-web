// Pure warned attacks; visuals, projectile ownership and HP damage stay in host.
import {ARBOR_ARENA,arborBossHp} from './arbor-journey.js';
export const ARBOR_BOSS_LIMITS=Object.freeze({maxStep:.1,projectiles:48,boltsPerStep:7,zonesPerStep:1});
export const ARBOR_BOSS_MOVES=Object.freeze([
 Object.freeze({id:'branch-fan',name:'가지창 부채',hint:'가지가 향한 쪽을 읽고 옆으로 피하세요'}),
 Object.freeze({id:'root-chase',name:'세 번의 뿌리',hint:'발밑의 금빛 원을 벗어나며 이동하세요'}),
 Object.freeze({id:'core-bloom',name:'열린 꽃심',hint:'꽃심이 열렸어요 · 가까이서 반격하세요'})
]);
const clamp=(n,a,b)=>Math.max(a,Math.min(b,n));
const finite=(n,fallback=0)=>Number.isFinite(n)?n:fallback;
const safeDt=dt=>clamp(finite(dt),0,ARBOR_BOSS_LIMITS.maxStep);
const copy=(to,from)=>{to.x=finite(from?.x);to.z=finite(from?.z);};
const aimAt=(aim,from,to)=>{const x=to.x-from.x,z=to.z-from.z,n=Math.hypot(x,z)||1;aim.x=x/n;aim.z=z/n;};
export function createArborBoss(round=0,{encounterVersion=1}={}){
 const r=clamp(round|0,0,2),hp=arborBossHp(r);
 const sequence=encounterVersion===2?[[0,1,2],[1,0,2],[0,1,0,2]][r]:[0,1,2];
 return {round:r,sequence,sequenceIndex:0,position:{x:0,z:-4.4},hp,maxHp:hp,phase:'approach',pattern:sequence[0],timer:.5,phaseIndex:0,cycles:0,
  rootStep:0,coreOpen:false,aim:{x:0,z:1},target:{x:0,z:0},playerSample:{x:0,z:5},
  cue:{kind:'fan',position:{x:0,z:0},direction:{x:0,z:1},radius:0,remaining:0},out:{bolts:[],zones:[],cue:null}};
}
export const arborBossPatternName=s=>ARBOR_BOSS_MOVES[s.pattern]?.name||ARBOR_BOSS_MOVES[0].name;
function cue(s,kind,radius=0){
 const c=s.cue;c.kind=kind;copy(c.position,kind==='root'?s.target:s.position);copy(c.direction,s.aim);c.radius=radius;c.remaining=Math.max(0,s.timer);s.out.cue=c;
}
function tell(s,player){
 s.phase='windup';s.coreOpen=false;
 if(s.pattern===0){aimAt(s.aim,s.position,player);s.timer=Math.max(.88,1.12-s.phaseIndex*.08-s.round*.025);}
 else if(s.pattern===1){copy(s.target,player);s.target.x=clamp(s.target.x,-13,13);s.target.z=clamp(s.target.z,-11,11);s.timer=Math.max(.85,1.03-s.round*.04-s.phaseIndex*.035);}
 else{s.phase='recover';s.coreOpen=true;s.timer=2.8;}
}
function recover(s,duration){s.phase='recover';s.coreOpen=true;s.timer=duration;}
function fireFan(s,active){
 const count=5+s.phaseIndex,spread=.24-s.phaseIndex*.015;
 for(let i=0;i<count&&s.out.bolts.length<ARBOR_BOSS_LIMITS.boltsPerStep&&active+s.out.bolts.length<ARBOR_BOSS_LIMITS.projectiles;i++){
  const angle=(i-(count-1)/2)*spread,c=Math.cos(angle),n=Math.sin(angle),dir={x:s.aim.x*c-s.aim.z*n,z:s.aim.x*n+s.aim.z*c};
  s.out.bolts.push({position:{x:s.position.x+dir.x*.8,z:s.position.z+dir.z*.8},dir,
   spec:{boss:true,pierce:false,speed:5.8+s.round*.35+s.phaseIndex*.2,damage:18+s.round*3,life:4.1}});
 }
}
export function stepArborBoss(s,dt,{player=ARBOR_ARENA.start,projectiles=0}={}){
 const out=s.out;out.bolts.length=0;out.zones.length=0;out.cue=null;
 if(s.hp<=0){s.phase='dead';s.coreOpen=false;return out;}
 const step=safeDt(dt);if(!step)return out;
 const p=s.playerSample;p.x=clamp(finite(player?.x),-13.5,13.5);p.z=clamp(finite(player?.z),-11.5,11.5);
 const ratio=clamp(s.hp/Math.max(1,s.maxHp),0,1);
 // Low HP changes attack density; surviving several complete cycles also
 // advances the pattern, so an invulnerable stationary build is still tested.
 s.phaseIndex=Math.max(s.phaseIndex,ratio<=.32?2:ratio<=.66?1:0,Math.min(2,Math.floor(s.cycles/3)));
 s.timer=Math.max(0,s.timer-step);
 if(s.phase==='approach'){
  const dx=p.x-s.position.x,dz=p.z-s.position.z,d=Math.hypot(dx,dz);
  if(d>6.4){const travel=Math.min(d-6.4,(1.8+s.round*.15+s.phaseIndex*.12)*step);s.position.x+=dx/d*travel;s.position.z+=dz/d*travel;}
  s.position.x=clamp(s.position.x,-11.8,11.8);s.position.z=clamp(s.position.z,-9.8,9.8);
  if(s.timer<=0&&d<=10.5)tell(s,p);
  return out;
 }
 if(s.phase==='windup'){
  cue(s,s.pattern===0?'fan':'root',s.pattern===1?1.5+s.phaseIndex*.1:0);
  if(s.timer>1e-9)return out;
  if(s.pattern===0){fireFan(s,Math.max(0,finite(projectiles)));recover(s,1.3);}
  else{
   out.zones.push({position:{x:s.target.x,z:s.target.z},radius:1.5+s.phaseIndex*.1,damage:17+s.round*3});s.rootStep++;
   if(s.rootStep<3)tell(s,p);else recover(s,1.85);
  }
  return out;
 }
 if(s.phase==='recover'){
  cue(s,'core-open');if(s.timer>1e-9)return out;
  s.sequenceIndex=(s.sequenceIndex+1)%s.sequence.length;s.pattern=s.sequence[s.sequenceIndex];if(s.sequenceIndex===0)s.cycles++;s.rootStep=0;s.coreOpen=false;s.phase='approach';s.timer=.38;return out;
 }
 return out;
}
