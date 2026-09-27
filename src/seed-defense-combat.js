import {Group,Vector3} from 'three';
import {createFormCombat} from './form-combat.js';
import {DISCOVERY_FORMS,TWIN_FORMS} from './forms.js';
import {createTwinInteractionEngine} from './twin-interactions.js';
import {DEFENSE,defensePoint,defenseHurt,defenseEffect,defenseSlow,defenseTowerStats,defenseDamageMultiplier} from './seed-defense-rules.js';

// Reuse the authored action-game attacks, not a second list of lookalikes.
// Only world scale, rooted movement charge and path-constrained control adapt to TD.
export const DEFENSE_COMBAT={scale:5,damage:.55,ultimateSeconds:30,maxBolts:24,maxVisuals:256};
const K=DEFENSE_COMBAT.scale,V=Vector3;
const INK={burst:'#ffaa65',frost:'#b2f1ff',chain:'#ffe391',pierce:'#dbf6b1',split:'#ffa88f',reflect:'#91e4ff',recall:'#a0ebc9',gravity:'#d2a0ff',orbit:'#f4db9e'};
const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
const vector=v=>v&&Number.isFinite(v.x)&&Number.isFinite(v.z);

export function createDefenseCombat(state,{sound=()=>{}}={}){
 const scene=new Group(),instances=new Map(),wrappers=new WeakMap(),shotWrappers=new WeakMap();
 const list=[],hostiles=[],bodies=[],grid=new Map(),empty=[],direction=new V();
 let step=1/60,lastSound=-1,disposed=false,resonances=0;
 const bucketKey=(x,z)=>(x+16)*64+z+16;
 function enemies(){return list;}
 function nearby(pos,r,out){out.length=0;for(let x=Math.floor((pos.x-r)/3);x<=Math.floor((pos.x+r)/3);x++)for(let z=Math.floor((pos.z-r)/3);z<=Math.floor((pos.z+r)/3);z++)for(const e of grid.get(bucketKey(x,z))||empty)if(!e.dead&&(e.g.position.x-pos.x)**2+(e.g.position.z-pos.z)**2<=r*r)out.push(e);return out;}
 function sync(){
  list.length=0;hostiles.length=0;for(const bucket of grid.values())bucket.length=0;
  for(const e of state.enemies){if(e.hp<=0)continue;let w=wrappers.get(e);if(!w){w={source:e,g:{position:new V()},slow:0,type:e.kind==='boss'?'warden':e.kind==='shield'?'shield':'hound'};Object.defineProperties(w,{dead:{get:()=>e.hp<=0},hp:{get:()=>e.hp},maxHp:{get:()=>e.maxHp}});wrappers.set(e,w);}
   w.g.position.set(e.x/K,0,e.y/K);w.slow=Math.max(0,w.slow-step);list.push(w);const key=bucketKey(Math.floor(w.g.position.x/3),Math.floor(w.g.position.z/3));if(!grid.has(key))grid.set(key,[]);grid.get(key).push(w);
  }
  for(const q of state.shots){if(q.law!=='hostile'||q.life<=0)continue;let w=shotWrappers.get(q);if(!w){w={ob:{position:new V()},boss:true,dir:new V(),struck:false};Object.defineProperty(w,'life',{get:()=>q.life,set:v=>{if(q.life>0&&v<=0)state.stats.blocked++;q.life=v;}});shotWrappers.set(q,w);}w.ob.position.set(q.x/K,0,q.y/K);w.dir.set(q.vx||0,0,q.vy||0).normalize();hostiles.push(w);}
 }
 function boundary(a,b,d){let hit=false;if(b.x<-1||b.x>21){b.x=clamp(b.x,-1,21);d.x*=-1;hit=true;}if(b.z<0||b.z>12){b.z=clamp(b.z,0,12);d.z*=-1;hit=true;}return hit;}
 function constrain(pos){pos.x=clamp(pos.x,-1,21);pos.z=clamp(pos.z,0,12);}
 function emit(entry,kind,args){
  const a=args.find(vector);if(!a)return;
  const line=['arc','trail','lance','rewindTrace','frostWeb'].includes(kind),b=line?args.slice(args.indexOf(a)+1).find(vector):null;
  const law=args.find(x=>typeof x==='string'&&INK[x])||entry.form.requires[0],ink=INK[law]||'#e2e9b5';
  // Decorative trails may drop first; attack simulation never depends on VFX.
  const interval=kind==='trail'?.16:kind==='muzzle'?.09:.035;
  if(state.time-(entry.fxAt[kind]??-99)<interval||state.effects.length>=DEFENSE.maxEffects)return;entry.fxAt[kind]=state.time;
  let radius=1.7;if(['pulse','explosion','gardenVortex','sunburst'].includes(kind)){const n=args.slice(args.indexOf(a)+1).find(x=>typeof x==='number');if(Number.isFinite(n))radius=clamp(n*K,1,16);}
  const life=line?.28:kind==='explosion'||kind==='sunburst'?.6:.4;
  defenseEffect(state,line?'line':law==='gravity'?'well':kind,a.x*K,a.z*K,ink,{tx:(b?.x??a.x)*K,ty:(b?.z??a.z)*K,radius,life,maxLife:life,law,formId:entry.form.id});
 }
 function make(t){
  const form=DISCOVERY_FORMS[t.formId];if(!form)return null;
  const entry={tower:t,form,player:{position:new V(t.x/K,0,t.y/K)},parts:[],timers:[],fxAt:{},marks:new WeakMap(),twins:createTwinInteractionEngine(),signature:t.formId+':'+t.level};
  const fx=Object.fromEntries(['muzzle','pulse','burst','flame','explosion','trail','lance','frostWeb','rewindTrace','mirrorArc','gardenVortex','sunburst','arc','reflect','split','portal'].map(kind=>[kind,(...args)=>emit(entry,kind,args)]));
  const multiplier=()=>defenseDamageMultiplier(t);
  function damage(w,amount,meta={}){if(w.dead||!Number.isFinite(amount)||amount<0)return false;const law=DISCOVERY_FORMS[meta.kind]?.requires||form.requires;defenseHurt(state,w.source,amount*multiplier(),law.includes('pierce')||meta.indirect===true);return true;}
  function hit(w,amount,meta){
   if(!damage(w,amount,meta))return false;
   const twin=TWIN_FORMS[t.formId];if(twin){const last=entry.marks.get(w);if(last&&last.kind!==meta.kind&&state.time-last.time<=twin.synergy.window){entry.marks.delete(w);const bonus=amount*twin.synergy.bonus*multiplier();defenseHurt(state,w.source,bonus,true);if(entry.twins.apply({id:twin.id,target:w,enemies:list,player:entry.player.position,now:state.time,bonus,damage:(other,d)=>defenseHurt(state,other.source,d,true),fx,isBoss:e=>e.type==='warden',collide:constrain}))resonances++;}else entry.marks.set(w,{kind:meta.kind,time:state.time});}
   return true;
  }
  const twin=TWIN_FORMS[t.formId],ids=twin?twin.parts:[t.formId];
  for(let i=0;i<ids.length;i++){
   const combat=createFormCombat(scene,{player:entry.player,enemies,nearby,hit,blocked:()=>false,boundary,constrain,vfx:fx,enemyShots:()=>hostiles,renderless:true,maxBolts:DEFENSE_COMBAT.maxBolts,
    // Rooted comet towers gather charge while enemies move within firing range.
    motionSpeed:()=>list.some(e=>!e.dead&&(e.g.position.x-entry.player.position.x)**2+(e.g.position.z-entry.player.position.z)**2<44)?1.3:0,
    sound:id=>{if(state.time-lastSound>.09){lastSound=state.time;sound(id);}}
   });combat.set(ids[i],t.level,{twin:Boolean(twin),twinId:twin?.id,openingDelay:2+i*1.5});entry.parts.push(combat);entry.timers.push(0);
  }
  instances.set(t.id,entry);return entry;
 }
 function reconcile(){
  for(const [id,e] of instances)if(!state.towers.includes(e.tower)||e.signature!==e.tower.formId+':'+e.tower.level){e.parts.forEach(p=>p.dispose());instances.delete(id);}
  for(const t of state.towers)if(t.formId&&!instances.has(t.id))make(t);
 }
 function applyControls(){
  for(const w of list){if(w.dead)continue;const e=w.source;if(w.slow>0)defenseSlow(state,e,e.kind==='boss'?.8:.5,Math.min(3,w.slow));
   if(e.kind==='boss')continue;
   const next=defensePoint(e.progress+.1),dx=next.x-e.x,dy=next.y-e.y,len=Math.hypot(dx,dy)||1;
   const move=((w.g.position.x*K-e.x)*dx+(w.g.position.z*K-e.y)*dy)/len;
   const change=clamp(move,-Math.min(5,e.speed*.4)*step,2*step);
   if(Math.abs(change)>.00001){e.progress=Math.max(0,e.progress+change);Object.assign(e,defensePoint(e.progress));state.stats.pulls++;}
  }
 }
 function update(dt){if(disposed||state.phase!=='wave')return;step=dt;reconcile();sync();
  for(const entry of instances.values()){
   const t=entry.tower,range=defenseTowerStats(t).range/K;let target=null;
   for(const e of list)if(!e.dead&&(e.g.position.x-entry.player.position.x)**2+(e.g.position.z-entry.player.position.z)**2<=range*range&&(!target||e.source.progress>target.source.progress))target=e;
   if(target){direction.copy(target.g.position).sub(entry.player.position).setY(0).normalize();t.angle=Math.atan2(direction.z,direction.x);t.ultimateCharge=clamp((t.ultimateCharge||0)+dt,0,DEFENSE_COMBAT.ultimateSeconds);}
   for(let i=0;i<entry.parts.length;i++){entry.timers[i]=Math.max(0,entry.timers[i]-dt);if(target&&entry.timers[i]<=0){const cadence=entry.parts[i].fire(entry.player.position,direction,target.g.position);entry.timers[i]=Number.isFinite(cadence)?Math.max(.12,cadence):.15;if(Number.isFinite(cadence))state.stats.shots++;}entry.parts[i].update(dt);}
  }
  applyControls();
 }
 function surge(id){if(disposed||state.phase!=='wave')return false;reconcile();const e=instances.get(id);if(!e||(e.tower.ultimateCharge||0)<DEFENSE_COMBAT.ultimateSeconds)return false;sync();e.tower.ultimateCharge=0;const aim=new V(Math.cos(e.tower.angle),0,Math.sin(e.tower.angle));e.parts.forEach(p=>p.surge(3,{aim}));applyControls();return true;}
 function visuals(out=[]){out.length=0;bodies.length=0;for(const e of instances.values()){const start=bodies.length;e.parts.forEach(p=>p.projectileBodies(bodies));for(let i=start;i<bodies.length&&out.length<DEFENSE_COMBAT.maxVisuals;i++){const b=bodies[i];if(!b.ob?.position)continue;const v=b.defenseVisual||(b.defenseVisual={});const p=b.ob.position;Object.assign(v,{x:p.x*K,y:p.z*K,angle:b.dir?Math.atan2(b.dir.z,b.dir.x):0,cell:b.kind==='orbit'?b.orbitSpriteCell??0:b.spriteCell??b.ob.userData?.spriteCell??0,size:clamp((b.visualScale||1)*3.1,1.8,7),kind:b.kind,formId:e.form.id,law:e.form.requires[0],spriteKey:b.kind==='orbit'?(b.orbitAtlas==='advanced-orbit'?'advancedOrbit':b.orbitAtlas):b.spriteKey,orbit:b.kind==='orbit'});out.push(v);}}return out;}
 function reset(){for(const e of instances.values())e.parts.forEach(p=>p.dispose());instances.clear();list.length=0;hostiles.length=0;bodies.length=0;grid.clear();}
 function diagnostics(){return {engines:[...instances.values()].reduce((n,e)=>n+e.parts.length,0),bolts:[...instances.values()].reduce((n,e)=>n+e.parts.reduce((sum,p)=>sum+p.state().bolts,0),0),resonances,forms:[...instances.values()].map(e=>e.form.id),maxVisuals:DEFENSE_COMBAT.maxVisuals};}
 return {update,surge,visuals,reset,diagnostics,dispose(){reset();disposed=true;}};
}
