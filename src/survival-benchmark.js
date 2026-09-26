// Local QA policy only. Uses the real game's attacks, damage, pickups and AI.
// A prescribed draft is not a random-card playthrough or a human clear rate.
export const SURVIVAL_BENCHES=Object.freeze({
 'compare-still':{label:'정지 생존',stationary:true,forms:['chainburst','icicle','returnflare']},
 'compare-area':{label:'광역형',forms:['chainburst','icicle','returnflare']},
 'compare-frost':{label:'빙결형',forms:['frostnet','icicle','returnflare']},
 'compare-orbit':{label:'공전형',forms:['stormcrown','icicle','returnflare']}
});
export function createSurvivalBenchmark(id){
 const preset=SURVIVAL_BENCHES[id];
 return preset?{id,label:preset.label,stationary:!!preset.stationary,forms:preset.forms,picks:0,potions:0,ultimates:0,peakEnemies:0,peakShots:0,shotMetric:'base-and-enemy-only',windowPeak:0,nextSample:0,samples:[],timedOut:false}:null;
}
export function survivalBenchmarkPick(bench,levels,forms,catalog){
 for(const id of bench.forms){
  if(forms.has(id))continue;
  const law=catalog[id].requires.find(law=>!levels.has(law));
  return law?{law}:{fusion:id};
 }
 const id=bench.forms.reduce((a,b)=>(forms.get(a)||0)<=(forms.get(b)||0)?a:b);
 return {law:'form:'+id};
}
// Identical steering for every build. Bounded actor scan, no pathfinding grid.
// Runs around a broad loop; repulsion does not inspect future enemy attacks.
export function survivalBenchmarkMove(time,position,enemies,out){
 const angle=time*.16,targetX=Math.cos(angle)*9,targetZ=Math.sin(angle)*8;
 let x=targetX-position.x,z=targetZ-position.z,length=Math.hypot(x,z)||1;
 x/=length;z/=length;let danger=false;
 for(const e of enemies){
  if(e.dead)continue;
  const dx=position.x-e.g.position.x,dz=position.z-e.g.position.z,d=Math.hypot(dx,dz),range=e.survivalBoss?3:1.8;
  if(d<range&&d>.001){const push=(range-d)/range*1.5;x+=dx/d*push;z+=dz/d*push;if(d<1.2)danger=true;}
 }
 length=Math.max(1,Math.hypot(x,z));out.x=x/length;out.z=z/length;
 return danger;
}
export function sampleSurvivalBenchmark(bench,{time,hp,kills,choices,enemies,shots,bossHp,force=false}){
 bench.peakEnemies=Math.max(bench.peakEnemies,enemies);bench.peakShots=Math.max(bench.peakShots,shots);
 bench.windowPeak=Math.max(bench.windowPeak,enemies);
 if((force||time>=bench.nextSample)&&bench.samples.length<14){
  bench.samples.push({time:+time.toFixed(2),hp:+Math.max(0,hp).toFixed(1),kills,choices,enemies,windowPeak:bench.windowPeak,shots,bossHp});bench.windowPeak=0;bench.nextSample=(Math.floor(time/60)+1)*60;
 }
}
