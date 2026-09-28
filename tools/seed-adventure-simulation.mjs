import assert from 'node:assert/strict';
import {performance} from 'node:perf_hooks';
import {createAdventure,startAdventure,stepAdventure,chooseAdventure,chooseAttackShape,adventureOffers,dodgeAdventure,ultimateAdventure,chooseAdventureDoor,buyAdventure,leaveAdventureShop,usePotionAdventure,ROOMS,ADVENTURE,ADVENTURE_FORMS} from '../src/seed-adventure-rules.js';
import {createAdventureCombat} from '../src/seed-adventure-combat.js';

// Real rule progression: no health edits, forced wins, enemy removals or skipped rooms.
// The authored form engines run exactly as in the browser (renderless adapter).
const runs=[];
for(const shape of ['slash','throw'])for(const initial of ['recall','split','orbit']){
 const s=createAdventure(67+runs.length);startAdventure(s);chooseAttackShape(s,shape);
 const combat=createAdventureCombat(s),frames=[];let guard=0,peakShots=0,peakEffects=0;const rooms=new Set();
 try{
 while(!['won','lost'].includes(s.phase)&&guard++<60*2400){
  if(s.phase==='choice'){
   const o=adventureOffers(s),evo=o.evolutions[0],law=[initial,'pierce','chain','burst','frost'].find(l=>o.laws.includes(l))||o.laws[0];
   if(o.shapes.length)chooseAttackShape(s,o.shapes[0]);
   else if(evo)chooseAdventure(s,'evolve',evo.id);else if(o.upgrades.length)chooseAdventure(s,'upgrade',o.upgrades[0]);else if(law)chooseAdventure(s,'law',law);else chooseAdventure(s,'grow');
   continue;
  }
  if(s.phase==='fountain'){chooseAdventure(s,s.player.hp<s.player.maxHp*.7?'heal':'potion')||chooseAdventure(s,'heal');continue;}
  if(s.phase==='shop'){rooms.add('shop');for(let i=0;i<s.shop.length;i++)buyAdventure(s,i);leaveAdventureShop(s);continue;}
  if(s.phase==='doors'){const p=s.player,rank=d=>d.room==='fountain'&&p.hp<p.maxHp*.6?9:d.room==='boss'?9:d.room==='treasure'?6:d.room==='shop'&&s.coins>=40?5:d.reward==='evolve'?5:d.reward==='law'?4:d.reward==='grow'?3:2;const best=s.doors.map((d,i)=>[rank(d)-(d.room==='elite'&&p.hp<p.maxHp*.7?5:0),i]).sort((a,b)=>b[0]-a[0])[0];rooms.add(s.doors[best[1]].room);chooseAdventureDoor(s,best[1]);continue;}
  const p=s.player,near=s.enemies.filter(e=>e.hp>0).sort((a,b)=>Math.hypot(a.x-p.x,a.y-p.y)-Math.hypot(b.x-p.x,b.y-p.y))[0]||s.props[0]||s.pickups[0];
  const a=s.time*.38,close=near&&(s.weapon==='slash'||!s.enemies.length)&&Math.hypot(near.x-p.x,near.y-p.y)>1.6;
  const tx=close?near.x:12+Math.cos(a)*6.3,ty=close?near.y:8+Math.sin(a)*4.1;
  const dx=tx-p.x,dy=ty-p.y;
  if(s.enemies.some(e=>e.tell>0&&Math.hypot(e.tx-p.x,e.ty-p.y)<2.2))dodgeAdventure(s,dx,dy);
  if(p.hp<p.maxHp*.4)usePotionAdventure(s);
  if(s.charge>=100&&near&&Math.hypot(near.x-p.x,near.y-p.y)<6)ultimateAdventure(s,combat);
  const before=performance.now();
  stepAdventure(s,1/60,{x:dx,y:dy,aimX:near?near.x-p.x:1,aimY:near?near.y-p.y:0,attack:true},combat);
  frames.push(performance.now()-before);peakShots=Math.max(peakShots,s.shots.length);peakEffects=Math.max(peakEffects,s.effects.length);
 }
 }finally{combat.dispose();}
 frames.sort((a,b)=>a-b);
 assert.ok(['won','lost'].includes(s.phase),'run must end without a stuck room: '+JSON.stringify({phase:s.phase,room:s.room,type:s.roomType,kind:s.choiceKind,enemies:s.enemies.length,props:s.props.length,pickups:s.pickups.length}));
 assert.ok(peakShots<=ADVENTURE.maxShots&&peakEffects<=ADVENTURE.maxEffects);
 runs.push({shape,initial,result:s.phase,room:s.room+1,rooms:ROOMS.length,level:s.level,bosses:s.bossesDefeated,form:s.formId?`${ADVENTURE_FORMS[s.formId].kind}:${s.formId}`:null,laws:s.laws.map(l=>l+s.ranks[l]).join('+'),coins:s.coins,potions:s.potions,visited:[...rooms].sort().join(','),seconds:Math.round(s.time),kills:s.kills,hp:Math.round(s.player.hp),peakShots,peakEffects,p95RulesMs:+frames[Math.floor(frames.length*.95)].toFixed(3)});
}
assert.ok(runs.some(r=>r.result==='won'),'at least one legal build must be able to complete');
assert.ok(runs.some(r=>r.form),'runs evolve into authored forms');
console.log(JSON.stringify({note:'Headless rules + authored form engines; desktop timing excludes rendering and is not mobile FPS.',runs},null,2));
