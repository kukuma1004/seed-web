import assert from 'node:assert/strict';
import {performance} from 'node:perf_hooks';
import {createAdventure,startAdventure,stepAdventure,chooseAdventure,chooseAttackShape,adventureOffers,dodgeAdventure,ultimateAdventure,chooseAdventureDoor,ROOMS} from '../src/seed-adventure-rules.js';

// Real rule progression: no health edits, forced wins, enemy removals or skipped rooms.
const runs=[];
for(const shape of ['slash','throw'])for(const initial of ['recall','split','orbit']){
 const s=createAdventure(67);startAdventure(s);chooseAttackShape(s,shape);
 const frames=[];let guard=0,peakShots=0,peakEffects=0;
 while(!['won','lost'].includes(s.phase)&&guard++<60*1500){
  if(s.phase==='choice'){
   const offers=adventureOffers(s),form=offers.forms[0];
   const law=[initial,'pierce','recall','chain','frost'].find(l=>offers.laws.includes(l))||offers.laws[0];
   if(offers.shapes.length)chooseAttackShape(s,offers.shapes[0]);
   else if(form)chooseAdventure(s,'form',form.id);else if(law)chooseAdventure(s,'law',law);else if(offers.heal)chooseAdventure(s,'heal');else chooseAdventure(s,'grow');
   continue;
  }
  if(s.phase==='doors'){const p=s.player,rank=d=>d.reward==='heal'&&p.hp<p.maxHp*.55?9:d.reward==='form'?6:d.reward==='grow'?5:d.reward==='law'?4:d.reward==='shape'?3:1;const best=s.doors.map((d,i)=>[rank(d)-(d.elite&&p.hp<p.maxHp*.7?5:0),i]).sort((a,b)=>b[0]-a[0])[0];chooseAdventureDoor(s,best[1]);continue;}
  const p=s.player,near=s.enemies.filter(e=>e.hp>0).sort((a,b)=>Math.hypot(a.x-p.x,a.y-p.y)-Math.hypot(b.x-p.x,b.y-p.y))[0];
  const a=s.time*.38,close=s.weapon==='slash'&&near&&Math.hypot(near.x-p.x,near.y-p.y)>2;
  const tx=close?near.x:12+Math.cos(a)*6.3,ty=close?near.y:8+Math.sin(a)*4.1;
  const dx=tx-p.x,dy=ty-p.y;
  if(s.enemies.some(e=>e.tell>0&&Math.hypot(e.tx-p.x,e.ty-p.y)<2.2))dodgeAdventure(s,dx,dy);
  if(s.charge>=100&&near&&Math.hypot(near.x-p.x,near.y-p.y)<6)ultimateAdventure(s);
  const before=performance.now();
  stepAdventure(s,1/60,{x:dx,y:dy,aimX:near?near.x-p.x:1,aimY:near?near.y-p.y:0,attack:true});
  frames.push(performance.now()-before);peakShots=Math.max(peakShots,s.shots.length);peakEffects=Math.max(peakEffects,s.effects.length);
 }
 frames.sort((a,b)=>a-b);
 assert.ok(['won','lost'].includes(s.phase),'run must end without a stuck room: '+JSON.stringify({phase:s.phase,room:s.room,time:s.time,kind:s.choiceKind,doors:s.doors,enemies:s.enemies.map(e=>[e.type,e.role,Math.round(e.x),Math.round(e.y),Math.round(e.hp)]),hp:s.player.hp,level:s.level,laws:s.laws}));
 assert.ok(peakShots<=72&&peakEffects<=120);
 runs.push({shape,initial,finalShape:s.weapon,result:s.phase,room:s.room+1,rooms:ROOMS.length,level:s.level,bosses:s.bossesDefeated,seconds:Math.round(s.time),kills:s.kills,hp:s.player.hp,peakShots,peakEffects,p95RulesMs:+frames[Math.floor(frames.length*.95)].toFixed(3)});
}
assert.ok(runs.some(r=>r.result==='won'),'at least one legal build must be able to complete');
console.log(JSON.stringify({note:'Headless rules only; desktop timing excludes rendering and is not mobile FPS.',runs},null,2));
