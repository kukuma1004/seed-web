// Very small, allocation-bounded combat telemetry. The game records only sums and
// one-second buckets: no per-hit history, DOM writes or floating damage numbers.
const cleanNumber=(value,min=0,max=1e12)=>Number.isFinite(value)?Math.max(min,Math.min(max,value)):0;
const sourceId=value=>typeof value==='string'&&value.length<=64?value:'seed';

export function createCombatAnalysis(){
 let room=null;
 return {
  begin(start=0,meta={}){room={start:cleanNumber(start),meta:{...meta},damage:0,kills:0,sources:new Map(),sourceBuckets:new Map(),buckets:new Map(),utility:{freeze:0,pull:0,blocked:0,critical:0}};},
  damage(source,amount,now=0){
   if(!room)return 0;const value=cleanNumber(amount);if(value<=0)return 0;
   const id=sourceId(source),second=Math.max(0,Math.floor(cleanNumber(now)-room.start));
   room.damage+=value;room.sources.set(id,(room.sources.get(id)||0)+value);room.buckets.set(second,(room.buckets.get(second)||0)+value);let sourceSeconds=room.sourceBuckets.get(id);if(!sourceSeconds){sourceSeconds=new Map();room.sourceBuckets.set(id,sourceSeconds);}sourceSeconds.set(second,(sourceSeconds.get(second)||0)+value);return value;
  },
  utility(kind,amount=1){if(room&&Object.hasOwn(room.utility,kind))room.utility[kind]+=cleanNumber(amount,0,1e6);},
  kill(){if(room)room.kills++;},
  active(){return Boolean(room);},
  finish(now=0){
   if(!room)return null;const duration=Math.max(.1,cleanNumber(now)-room.start),total=room.damage;
   const sources=[...room.sources].map(([id,damage])=>({id,damage,dps:damage/duration,peak:Math.max(0,...(room.sourceBuckets.get(id)?.values()||[])),share:total?damage/total:0})).sort((a,b)=>b.damage-a.damage);
   const report={...room.meta,duration,total,dps:total/duration,peak:Math.max(0,...room.buckets.values()),kills:room.kills,utility:{...room.utility},sources};room=null;return report;
  },
  cancel(){room=null;}
 };
}

export function recordPersonalBests(profile,report,now=Date.now()){
 const next={...profile,records:{...(profile?.records||{})}};
 if(!report)return next;
 for(const source of report.sources||[]){
  if(source.id==='seed'||!(source.dps>0))continue;
  const before=next.records[source.id];
  if(!before||source.dps>before.dps)next.records[source.id]={dps:Math.round(source.dps*10)/10,peak:Math.round(source.peak*10)/10,total:Math.round(source.damage),duration:Math.round(report.duration*10)/10,at:Math.floor(now)};
 }
 return next;
}

export function combatGrade(dps){return dps>=900?'S':dps>=500?'A':dps>=260?'B':dps>=120?'C':'D';}
