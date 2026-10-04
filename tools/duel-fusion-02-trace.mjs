import {createDuel,stepDuel,duelAi,DUEL_CHARACTERS} from '../src/seed-duel-rules.js';
import {writeFileSync} from 'node:fs';
const out={},dt=1/60;
for(const id of ['gravitymirror','chainburst'])for(const foe of ['pierce','reflect','split','gravity','blastlance','frostnet']){
 const row={games:0,wins:0,casts:0,melee:{light:0,heavy:0,rangeMiss:0,angleMiss:0,invMiss:0,guard:0,connected:0},marks:0,relays:0,beamContacts:0,burstContacts:0,launches:0,bounces:0,skillDamage:0};
 for(const seat of [0,1])for(let seed=1;seed<=8;seed++){
  const s=createDuel({player:seat===0?id:foe,enemy:seat===0?foe:id,seed,difficulty:'normal'}),budgets=new Set(),seenMarks=new Set();let n=0;
  while(s.phase!=='over'&&n++<60*300){
   const f=s.fighters[seat],o=s.fighters[1-seat],c=DUEL_CHARACTERS[id],before={state:f.state,t:f.t,hitDone:f.hitDone,step:f.step,d:Math.hypot(o.x-f.x,o.y-f.y),vx:o.x-f.x,vy:o.y-f.y,fx:f.fx,fy:f.fy,ohp:o.hp,inv:o.inv,block:o.blocking,ofx:o.fx,ofy:o.fy,cd:f.cd[0],phase:s.phase};
   const p=duelAi(s,0,dt);stepDuel(s,dt,p,null);
   if(before.phase!=='fight'||s.phase!=='fight')continue;
   if(f.cd[0]>before.cd+.1)row.casts++;
   if(['attack','heavy'].includes(before.state)&&!before.hitDone&&f.hitDone){
    const heavy=before.state==='heavy';row.melee[heavy?'heavy':'light']++;
    const r=heavy?c.heavy.reach:(c.comboReach?.[before.step]??c.reach*(before.step===2?1.12:1)),arc=heavy?c.arc*1.1:(c.comboArc?.[before.step]??c.arc*(before.step===2?1.25:1)),v=before.d||1,front=(before.vx*before.fx+before.vy*before.fy)/v;
    if(before.d>r+.45)row.melee.rangeMiss++;else if(front<=Math.cos(arc))row.melee.angleMiss++;else if(before.inv>0)row.melee.invMiss++;else if(before.block&&(-before.vx*before.ofx-before.vy*before.ofy)/v>-.2)row.melee.guard++;else if(o.hp<before.ohp)row.melee.connected++;
   }
   if(o.hp<before.ohp&&!['attack','heavy'].includes(before.state))row.skillDamage+=before.ohp-o.hp;
   for(const h of s.hazards){if(h.owner!==seat)continue;if(h.kind==='emberRelay')budgets.add(h.budget);if(h.kind==='emberMark'&&!seenMarks.has(h)){seenMarks.add(h);row.marks++;}}
   for(const ev of s.events){if(ev==='mirrorLaunch'&&s.fighters[seat].char===id)row.launches++;if(ev==='mirrorBounce'&&s.fighters[seat].char===id)row.bounces++;}
   s.events.length=0;
  }
  row.relays+=budgets.size;for(const b of budgets){if(b.beam)row.beamContacts++;row.burstContacts+=b.bursts.size;}
  row.games++;if(s.winner===seat)row.wins++;
 }
 out[id+'/'+foe]=row;
}
writeFileSync('artifacts/duel-batch-02-trace.json',JSON.stringify(out,null,2));
console.log(JSON.stringify(out));
