// Deterministic terrain pressure. Existing course time/origin are sufficient
// to restore the exact phase; no RNG, reward, actor HP or checkpoint mutation.
export const CROSSWIND_UNDERTOW=Object.freeze({radius:2.65,period:10,warning:1,active:2.8,maxSpeed:1.2,maxFields:2});
const cache=new WeakMap();
export function crosswindUndertowFields(course){
 if(!course||course.act!=='crosswind'||course.encounterVersion!==3||course.finishAnnounced||!Number.isFinite(course.time)||course.time<0)return null;
 let fields=cache.get(course);if(!fields){fields=[0,1].map(i=>({x:0,z:0,radius:CROSSWIND_UNDERTOW.radius,phase:'off',pull:0,progress:0,index:i}));cache.set(course,fields);}
 const section=Math.floor(Math.max(0,course.distance||0)/18),origin=course.origin||{x:0,z:0};
 for(const f of fields){
  f.x=origin.x+section*18+(f.index?14:6);f.z=origin.z+(f.index?-1.8:1.8);
  const t=(course.time+f.index*5+(course.room||0)*.6)%CROSSWIND_UNDERTOW.period;
  const end=CROSSWIND_UNDERTOW.warning+CROSSWIND_UNDERTOW.active;
  f.phase=t<CROSSWIND_UNDERTOW.warning?'warning':t<end?'pull':'off';f.progress=t<CROSSWIND_UNDERTOW.warning?t/CROSSWIND_UNDERTOW.warning:t<end?(t-CROSSWIND_UNDERTOW.warning)/CROSSWIND_UNDERTOW.active:0;
  f.pull=f.phase==='pull'?Math.sin(f.progress*Math.PI)*CROSSWIND_UNDERTOW.maxSpeed:0;
 }
 return fields;
}
export function applyCrosswindUndertow(course,player,dt){
 if(!player||!Number.isFinite(player.x)||!Number.isFinite(player.z)||!Number.isFinite(dt)||dt<=0)return false;
 const fields=crosswindUndertowFields(course);if(!fields)return false;const step=Math.min(dt,.1);let pulled=false;
 for(const f of fields){
  if(f.pull<=0)continue;const x=f.x-player.x,z=f.z-player.z,d=Math.hypot(x,z);if(d<.08||d>=f.radius)continue;
  const speed=f.pull*Math.min(1,d/.8)*(.35+.65*(1-d/f.radius)),move=Math.min(d-.08,speed*step);
  player.x+=x/d*move;player.z+=z/d*move;pulled ||= move>0;
 }
 return pulled;
}
