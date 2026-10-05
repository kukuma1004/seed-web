import assert from 'node:assert/strict';
import {createDefense,plantDefense,mergeDefense,defenseMergeResult,rerollDefense,upgradeDefense,startDefenseWave,stepDefense,checkpointDefense,restoreDefense,defenseWaveInfo} from '../src/seed-defense-rules.js';
import {createDefenseCombat} from '../src/seed-defense-combat.js';

// Real seeded economy, random laws, earned merges/charge and authored attacks.
// No direct damage, free currency, supplied forms, skipped waves or fake kills.
function prepare(s){
 for(let round=0;round<30;round++){
  for(let pad=0;pad<16;pad++)plantDefense(s,pad);
  let best=null;
  for(const a of s.towers)for(const b of s.towers){
   if(a===b)continue;const r=defenseMergeResult(s,a.id,b.id);if(!r.ok)continue;
   const score=(r.promote?100:0)+r.tier*10+(r.gained||0)*5+b.level-a.level;
   if(!best||score>best.score)best={a,b,score};
  }
  if(best){assert(mergeDefense(s,best.a.id,best.b.id));continue;}
  const lonely=s.towers.find(t=>(t.tier||1)===1&&!t.merit&&!s.towers.some(o=>o!==t&&o.line===t.line&&(o.tier||1)===1));
  if(lonely&&s.currency>=60&&rerollDefense(s,lonely.id))continue;
  break;
 }
 for(const t of [...s.towers].sort((a,b)=>(b.tier||1)-(a.tier||1)||a.level-b.level))upgradeDefense(s,t.id);
}
const goal=Number(process.argv[3]||61),loops=Math.floor((goal-1)/60);
assert([61,121].includes(goal),'bounded course goal is 61 or121');
function play(seed,reload){
 let s=createDefense(seed,{actCount:5}),combat=createDefenseCombat(s),ticks=0,peakShots=0,peakVisuals=0;
 const routes=[],coreLosses=[],patterns={crosswindKeeper:new Set(),crystalGardener:new Set()};
 try{
  while(s.phase!=='lost'&&(s.wave<goal||s.phase==='wave')){
   assert(++ticks<65000,'bounded five-act simulation stalled');
   if(s.phase!=='wave'){
    combat.reset();
    if(reload){const save=checkpointDefense(s);combat.dispose();s=restoreDefense(save);assert(s);combat=createDefenseCombat(s);}
    prepare(s);assert(startDefenseWave(s));
    if((s.wave-1)%12===0)routes.push({wave:s.wave,act:defenseWaveInfo(s.wave,s).act,lap:defenseWaveInfo(s.wave,s).lap,hp:s.coreHp});
   }
   const previousHp=s.coreHp,previousLeak=s.leaked;stepDefense(s,.1,combat);
   if(s.coreHp<previousHp)coreLosses.push({wave:s.wave,time:Math.round(s.waveTime*100)/100,damage:previousHp-s.coreHp,leaks:s.leaked-previousLeak,hp:s.coreHp,boss:s.enemies.filter(e=>e.bossId).map(e=>({hp:Math.round(e.hp),progress:Math.round(e.progress),pattern:e.expansionPattern}))});
   for(const t of s.towers)if(t.ultimateCharge>=30)combat.surge(t.id);
   for(const e of s.enemies)if(patterns[e.bossId]&&e.expansionPattern)patterns[e.bossId].add(e.expansionPattern);
   peakShots=Math.max(peakShots,s.shots.length);peakVisuals=Math.max(peakVisuals,combat.visuals().length);
   assert(s.enemies.length<=120&&s.shots.length<=180&&s.effects.length<=100);
  }
  return {seed,reload,phase:s.phase,wave:s.wave,hp:s.coreHp,kills:s.kills,currency:s.currency,time:s.time,bossWins:s.bossWins,rng:s.rng,routes,coreLosses,patterns:Object.fromEntries(Object.entries(patterns).map(([k,v])=>[k,[...v].sort()])),peakShots,peakVisuals};
 }finally{combat.dispose();}
}
const seed=Number(process.argv[2]||2),live=play(seed,false),resumed=play(seed,true);
console.log('Authored five-act defense',JSON.stringify(live));
console.log('Reloaded five-act defense',JSON.stringify(resumed));
for(const key of ['phase','wave','hp','kills','currency','time','bossWins','rng','routes','patterns'])assert.deepEqual(resumed[key],live[key],`between-wave reload ${key}`);
assert(live.wave>=goal,'earned merge strategy must reach 5->1 without synthetic damage');
assert.deepEqual(live.routes.map(r=>[r.act,r.lap]),Array.from({length:loops*5+1},(_,i)=>[i%5,Math.floor(i/5)]));
for(const boss of ['austin','alwaysbeginner','tempestcarrier','crosswindKeeper','crystalGardener'])assert.equal(live.bossWins[boss],loops);
console.log('Real authored 1->2->3->4->5->1 tower-defense simulation and every-wave reload agree. Node combat/economy only; no input/browser/device/render/account claim.');
