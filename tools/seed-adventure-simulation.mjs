import assert from 'node:assert/strict';
import {performance} from 'node:perf_hooks';
import {createAdventure,startAdventure,stepAdventure,chooseAdventure,adventureOffers,dodgeAdventure,ultimateAdventure} from '../src/seed-adventure-rules.js';

// Real rule progression: no health edits, forced wins, enemy removals or skipped rooms.
const runs=[];
for(const initial of ['recall','pierce','chain','burst','frost','split','reflect','gravity','orbit']){
 const s=createAdventure(67);startAdventure(s,'throw',initial);
 const frames=[];let guard=0,peakShots=0,peakEffects=0;
 while(!['won','lost'].includes(s.phase)&&guard++<60*600){
  if(s.phase==='choice'){
   const offers=adventureOffers(s),form=offers.forms[0];
   const law=['pierce','recall','chain','frost'].find(l=>offers.laws.includes(l));
   if(form)chooseAdventure(s,'form',form.id);else if(law)chooseAdventure(s,'law',law);else chooseAdventure(s,'grow');
  }
  const p=s.player,near=s.enemies.filter(e=>e.hp>0).sort((a,b)=>Math.hypot(a.x-p.x,a.y-p.y)-Math.hypot(b.x-p.x,b.y-p.y))[0];
  const a=s.time*.38,tx=12+Math.cos(a)*6.3,ty=8+Math.sin(a)*4.1;
  const dx=tx-p.x,dy=ty-p.y;
  if(s.enemies.some(e=>e.tell>0&&Math.hypot(e.tx-p.x,e.ty-p.y)<2.2))dodgeAdventure(s,dx,dy);
  if(s.charge>=100&&near&&Math.hypot(near.x-p.x,near.y-p.y)<6)ultimateAdventure(s);
  const before=performance.now();
  stepAdventure(s,1/60,{x:dx,y:dy,aimX:near?near.x-p.x:1,aimY:near?near.y-p.y:0,attack:true});
  frames.push(performance.now()-before);peakShots=Math.max(peakShots,s.shots.length);peakEffects=Math.max(peakEffects,s.effects.length);
 }
 frames.sort((a,b)=>a-b);
 assert.ok(['won','lost'].includes(s.phase),'run must end without a stuck room');
 assert.ok(peakShots<=64&&peakEffects<=100);
 runs.push({initial,result:s.phase,room:s.room+1,seconds:Math.round(s.time),kills:s.kills,hp:s.player.hp,peakShots,peakEffects,p95RulesMs:+frames[Math.floor(frames.length*.95)].toFixed(3)});
}
assert.ok(runs.some(r=>r.result==='won'),'at least one legal build must be able to complete');
console.log(JSON.stringify({note:'Headless rules only; desktop timing excludes rendering and is not mobile FPS.',runs},null,2));
