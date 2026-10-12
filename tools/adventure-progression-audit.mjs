import {writeFileSync} from 'node:fs';
import {createAdventure,startAdventure,stepAdventure,chooseAdventure,chooseAttackShape,adventureOffers,dodgeAdventure,ultimateAdventure,chooseAdventureDoor,buyAdventure,leaveAdventureShop,usePotionAdventure,adventureRoute,adventureCheckpoint,restoreAdventure} from '../src/seed-adventure-rules.js';
import {createAdventureCombat} from '../src/seed-adventure-combat.js';
import {adventureObjective} from '../src/adventure-wayfinding.js';
const fusionFirst=process.argv.includes('--fusion-first'),shopFirst=process.argv.includes('--shop-first');
const results=[],checkpoints=[],choiceSnapshots=[],shopSnapshots=[];
for(const shape of ['slash','throw'])for(const initial of ['recall','split','orbit']){
 const seed=67+results.length+Number(process.argv.find(a=>a.startsWith('--seed-offset='))?.split('=')[1]||0),s=createAdventure(seed);startAdventure(s);chooseAttackShape(s,shape);const combat=createAdventureCombat(s),rooms=[],choices=[];let steps=0,lastRoom=-1,peakShots=0,peakEffects=0;
 try{while(!['won','lost'].includes(s.phase)&&steps++<60*1200){
  if(s.room!==lastRoom){lastRoom=s.room;rooms.push({room:s.room+1,entry:+s.time.toFixed(2),hp:Math.round(s.player.hp),level:s.level,form:s.formId,enemies:s.enemies.length,type:s.roomType});}
  if(s.phase==='choice'){if(shape==='slash'&&initial==='recall'&&s.room>=4)choiceSnapshots.push({room:s.room+1,state:JSON.parse(JSON.stringify(s))});
   const o=adventureOffers(s),evo=o.evolutions[0],law=[initial,'pierce','chain','burst','frost'].find(l=>o.laws.includes(l))||o.laws[0];let kind,id;
   if(o.shapes.length){kind='shape';id=o.shapes[0];}else if(evo){kind='evolve';id=evo.id;}else if(fusionFirst&&law&&s.laws.length===1){kind='law';id=law;}else if(o.upgrades.length){kind='upgrade';id=o.upgrades[0];}else if(law){kind='law';id=law;}else kind='grow';
   choices.push({room:s.room+1,kind,id,level:s.level,form:s.formId});chooseAdventure(s,kind,id);continue;
  }
  if(s.phase==='fountain'){chooseAdventure(s,s.player.hp<s.player.maxHp*.7?'heal':'potion')||chooseAdventure(s,'heal');continue;}
  if(s.phase==='shop'){if(shopFirst||shape==='slash'&&initial==='recall')shopSnapshots.push({room:s.room+1,state:JSON.parse(JSON.stringify(s))});for(let i=0;i<s.shop.length;i++)buyAdventure(s,i);leaveAdventureShop(s);continue;}
  if(s.phase==='doors'){
   const cp=adventureCheckpoint(s);if(!restoreAdventure(cp))throw Error('Illegal earned checkpoint');
   if(shape==='slash'&&initial==='recall'&&s.room>=3)checkpoints.push({seed,shape,initial,room:s.room+1,checkpoint:cp});
   const rank=d=>d.room==='fountain'&&s.player.hp<s.player.maxHp*.6?9:d.room==='boss'?9:d.room==='shop'&&shopFirst&&s.coins>=70?7:d.room==='treasure'?6:d.room==='shop'&&s.coins>=40?5:d.reward==='evolve'?5:d.reward==='law'?4:d.reward==='grow'?3:2;
   const best=s.doors.map((d,i)=>[rank(d)-(d.room==='elite'&&s.player.hp<s.player.maxHp*.7?5:0),i]).sort((a,b)=>b[0]-a[0])[0];chooseAdventureDoor(s,best[1]);continue;
  }
  const p=s.player,nearest=list=>list.sort((a,b)=>Math.hypot(a.x-p.x,a.y-p.y)-Math.hypot(b.x-p.x,b.y-p.y))[0];
  const awake=nearest(s.enemies.filter(e=>e.hp>0&&!e.dormant&&Math.hypot(e.x-p.x,e.y-p.y)<7));const near=awake||nearest(s.enemies.filter(e=>e.hp>0))||s.props[0]||s.pickups[0];let tx=p.x,ty=p.y;
  if(s.region){const goal=awake||adventureObjective(s)||s.region.gate;const d=Math.hypot(goal.x-p.x,goal.y-p.y),reach=awake&&s.weapon!=='slash'?4:1.4;if(d>reach){const route=d>3?adventureRoute(s,p,goal):goal;tx=route.x;ty=route.y;}}
  else{const a=s.time*.38,close=near&&(s.weapon==='slash'||!s.enemies.length)&&Math.hypot(near.x-p.x,near.y-p.y)>1.6;tx=close?near.x:12+Math.cos(a)*6.3;ty=close?near.y:8+Math.sin(a)*4.1;}
  const dx=tx-p.x,dy=ty-p.y;if(s.enemies.some(e=>e.tell>0&&Math.hypot(e.tx-p.x,e.ty-p.y)<2.2))dodgeAdventure(s,dx,dy);
  if(p.hp<p.maxHp*.4)usePotionAdventure(s);if(s.charge>=100&&near&&Math.hypot(near.x-p.x,near.y-p.y)<6)ultimateAdventure(s,combat);
  stepAdventure(s,1/60,{x:dx,y:dy,aimX:near?near.x-p.x:1,aimY:near?near.y-p.y:0,attack:true},combat);peakShots=Math.max(peakShots,s.shots.length);peakEffects=Math.max(peakEffects,s.effects.length);
 }}finally{combat.dispose();}
 const end=s.time;rooms.forEach((r,i)=>r.seconds=+((rooms[i+1]?.entry??end)-r.entry).toFixed(2));
 results.push({seed,shape,initial,result:s.phase,seconds:Math.round(end),bosses:s.bossesDefeated,level:s.level,form:s.formId,hp:Math.round(s.player.hp),peakShots,peakEffects,rooms,choices});
}
const prefix=process.argv[2]||'baseline';writeFileSync(`artifacts/adventure-progression-${prefix}-20261012.json`,JSON.stringify({note:'Renderless main-route legal bot; no HP edits, forced clears, unlocks or skipped rooms. Not human/device/account evidence.',results,checkpoints,choiceSnapshots,shopSnapshots},null,2));
console.log(JSON.stringify(results.map(r=>({shape:r.shape,initial:r.initial,result:r.result,seconds:r.seconds,bosses:r.bosses,form:r.form,act2:r.rooms.filter(x=>x.room>=5&&x.room<=8).map(x=>[x.room,x.seconds]),act3:r.rooms.filter(x=>x.room>=9).map(x=>[x.room,x.seconds])})),null,2));
