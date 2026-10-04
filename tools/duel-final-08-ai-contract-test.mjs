import assert from 'node:assert/strict';
import {createDuel,stepDuel,duelAi,DUEL_ORDER,DUEL_INSPECTION_CHARACTERS} from '../src/seed-duel-rules.js';
import {batch08Ai} from '../src/seed-duel-batch08.js';
const dt=1/60,scene=(id,d=4)=>{const s=createDuel({inspection:true,player:id,enemy:'pierce',seed:51});s.phase='fight';Object.assign(s.fighters[0],{x:15,y:10,fx:1,fy:0});Object.assign(s.fighters[1],{x:15+d,y:10,fx:-1,fy:0,hp:1000,maxHp:1000});return s;};
assert.equal(DUEL_ORDER.length,36);
for(const [id,hp,damage] of [['bigcrunch',178,[8,11,16]],['mirrorhall',176,[9,10,14]]]){const c=DUEL_INSPECTION_CHARACTERS[id];assert.equal(c.hp,hp);assert.deepEqual(c.damage,damage);assert.equal(c.heavy.damage,id==='bigcrunch'?24:23);}

// Same current-position player aim puts one well on the visible foe; it does
// not secretly move the well or remove the corridor after the cast.
{
 const s=scene('bigcrunch');s.ai[0].crunchSeen=.2;const i=duelAi(s,0,dt);assert.equal(i.skill1,true);assert(i.aimY>0);
 stepDuel(s,dt,i,{});const o=s.fighters[1],tells=s.hazards.filter(h=>h.kind==='crunchPlant');assert.equal(tells.length,2);assert(Math.min(...tells.map(h=>Math.hypot(h.x-o.x,h.y-o.y)))<.8);assert.equal(Math.abs(tells[1].y-tells[0].y)>2.5,true);
 const saved=tells.map(h=>[h.x,h.y]);o.y+=2;for(let n=0;n<40;n++)stepDuel(s,dt,{},{});assert.deepEqual(s.hazards.filter(h=>h.kind==='crunchWell').map(h=>[h.x,h.y]),saved);
}
// The shared fallback must not waste a defensive meter without an incoming
// lane. An outgoing projectile is not an observable threat either.
for(const id of ['bigcrunch','mirrorhall']){const s=scene(id,1.5);s.fighters[0].meter=100;const i=duelAi(s,0,dt);assert.equal(i.ult,undefined);assert.equal(s.fighters[0].meter,100);}
{
 const s=scene('mirrorhall');s.fighters[0].meter=100;s.shots.push({owner:1,x:18,y:10,dx:1,dy:0,life:1});s.ai[0].hallSeen=.2;const i=duelAi(s,0,dt);assert.equal(i.ult,undefined);assert.equal(s.ai[0].hallSeen,0);
}
{
 const s=scene('mirrorhall');s.fighters[0].meter=100;s.shots.push({kind:'crystal',owner:1,x:18,y:10,dx:-1,dy:0,speed:5,damage:10,hit:new Set(),life:1,pierce:0,bounces:0});const i={};assert.equal(batch08Ai(s,s.fighters[0],s.fighters[1],i,.1),false);const after={};assert.equal(batch08Ai(s,s.fighters[0],s.fighters[1],after,.15),true);assert.equal(after.ult,true);stepDuel(s,dt,after,{});assert.equal(s.fighters[0].meter,0);assert.equal(s.fighters[0].inv,0);assert.equal(s.hazards[0].budget.ordinary,6);
}
// Observed recovery is crossed with the real player dodge; facing an unspent
// light swing does not invent the same approach or a new invulnerability rule.
for(const id of ['bigcrunch','mirrorhall']){
 const s=scene(id,3),f=s.fighters[0],o=s.fighters[1];Object.assign(o,{state:'attack',t:.25,hitDone:true});s.ai[0].finalRecovery=.2;const i=duelAi(s,0,dt);assert.equal(i.dodge,true);assert(i.x>0);stepDuel(s,dt,i,{});assert.equal(f.state,'dodge');assert(f.inv<=.2);assert.equal(f.dodgeCd,1);
 const fresh=scene(id,3);Object.assign(fresh.fighters[1],{state:'attack',t:.3,hitDone:false});const j={};batch08Ai(fresh,fresh.fighters[0],fresh.fighters[1],j,dt);assert.equal(j.dodge,undefined);
}
// Earned close finishers use that recovery before the dodge can starve every
// valid technique2 window. No free charge or new action is supplied by the AI.
for(const id of ['bigcrunch','mirrorhall']){
 const s=scene(id,2.6),f=s.fighters[0],o=s.fighters[1];Object.assign(o,{state:'attack',t:.25,hitDone:true});s.ai[0].finalRecovery=.2;
 if(id==='mirrorhall'){f.hallStored=2;f.hallStoredTime=4;}else{f.crunchWeight=1;f.crunchWeightTime=5;}
 const i=duelAi(s,0,dt);assert.equal(i.skill2,true);assert.equal(i.dodge,undefined);stepDuel(s,dt,i,{});assert(f.cd[1]>0);assert.equal(f.inv,0);assert.equal(id==='mirrorhall'?f.hallStored:f.crunchWeight,0);
}
// Field reposition observes a CURRENT incoming projectile lane and walks
// toward it. It does not summon more mirrors or reset the interception budget.
{
 const s=scene('mirrorhall');stepDuel(s,dt,{skill1:true},{});for(let n=0;n<40;n++)stepDuel(s,dt,{},{});const h=s.hazards.find(h=>h.kind==='hallOpen');s.shots.push({owner:1,x:18,y:11,dx:-1,dy:0,life:1});const i={};assert(batch08Ai(s,s.fighters[0],s.fighters[1],i,dt));assert(i.y>0);assert.equal(i.skill1,undefined);assert.equal(h.budget.ordinary,3);
}
// A visible projectile outside the old five-unit cutoff must allow time for
// the SAME delayed .32s opening. Outbound/parallel/expired-range projectiles
// and already-returned mirrors cannot spend a defensive meter.
{
 const s=scene('mirrorhall',8),f=s.fighters[0];f.meter=100;
 s.shots.push({owner:1,x:22,y:10,dx:-1,dy:0,speed:14,life:.8,kind:'crystal'});
 const early={};assert.equal(batch08Ai(s,f,s.fighters[1],early,.1),false);
 const ready={};assert.equal(batch08Ai(s,f,s.fighters[1],ready,.15),true);assert.equal(ready.ult,true);assert.equal(f.meter,100,'AI proposes the ordinary action; it does not mutate meter');
}
for(const patch of [{dx:1},{y:13},{life:.1},{hallReturned:true},{kind:'hallReturn'}]){
 const s=scene('mirrorhall',8);s.fighters[0].meter=100;s.ai[0].hallSeen=.3;
 s.shots.push({owner:1,x:22,y:10,dx:-1,dy:0,speed:14,life:.8,kind:'crystal',...patch});
 const i={};batch08Ai(s,s.fighters[0],s.fighters[1],i,dt);assert.equal(i.ult,undefined);assert.equal(s.ai[0].hallSeen,0);
}
// The real blade adapter creates this public warning before its projectile.
// Merely seeing an enemy skill state or a hitscan warning is not equivalent.
{
 const s=scene('mirrorhall',6);s.fighters[1].char='returnblade';stepDuel(s,dt,{}, {skill1:true});
 assert(s.hazards.some(h=>h.kind==='bladeSend'&&h.arm>0));const f=s.fighters[0],o=s.fighters[1];
 const first={};assert.equal(batch08Ai(s,f,o,first,.1),false);
 const second={};assert.equal(batch08Ai(s,f,o,second,.15),true);assert.equal(second.skill1,true);assert.equal(second.ult,undefined);
 for(const kind of ['bloomLanceTell','frostThread','emberRelay','crunchBurst']){
  const miss=scene('mirrorhall',6);miss.fighters[1].state='skill';miss.ai[0].hallSeen=.3;
  miss.hazards.push({owner:1,x:21,y:10,endX:14,endY:10,dx:-1,dy:0,arm:.5,t:.6,kind});
  const i={};batch08Ai(miss,miss.fighters[0],miss.fighters[1],i,dt);assert.equal(i.skill1,undefined);assert.equal(miss.ai[0].hallSeen,0);
 }
}
// A plain fold punishes an OBSERVED long stun; a short spent third swing
// continues to use normal melee/dodge unless a real return charge was earned.
{
 const s=scene('mirrorhall',2.2),f=s.fighters[0],o=s.fighters[1];Object.assign(o,{state:'broken',stun:.8});
 const i=duelAi(s,0,dt);assert.equal(i.skill2,true);stepDuel(s,dt,i,{});
 assert.equal(f.hallStored,0);assert(s.hazards.some(h=>h.kind==='hallFold'&&h.damage===12));assert.equal(f.inv,0);
 const short=scene('mirrorhall',2.2);Object.assign(short.fighters[1],{state:'attack',step:2,hitDone:true,t:.1});short.ai[0].finalRecovery=.3;
 const j={};batch08Ai(short,short.fighters[0],short.fighters[1],j,dt);assert.equal(j.skill2,undefined);
}
console.log('Final08 AI contracts passed: unchanged stats/public36, delayed visible incoming lane and actual blade warning, rejected misses/hitscan, ordinary guard-break fold, offset wells/recovery dodge/finite reposition.');
