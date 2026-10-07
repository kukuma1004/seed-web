import assert from 'node:assert/strict';
import {createDuel,stepDuel,duelAi,DUEL_ORDER,DUEL_INSPECTION_CHARACTERS} from '../src/seed-duel-rules.js';
import {batch08Ai} from '../src/seed-duel-batch08.js';
import {createFinal08Observer} from './duel-final-08-ai.mjs';
const dt=1/60,scene=(id,d=4)=>{const s=createDuel({inspection:true,player:id,enemy:'pierce',seed:51});s.phase='fight';Object.assign(s.fighters[0],{x:15,y:10,fx:1,fy:0});Object.assign(s.fighters[1],{x:15+d,y:10,fx:-1,fy:0,hp:1000,maxHp:1000});return s;};
assert.equal(DUEL_ORDER.length,36);
for(const [id,hp,damage] of [['bigcrunch',178,[8,11,16]],['mirrorhall',176,[9,10,14]]]){const c=DUEL_INSPECTION_CHARACTERS[id];assert.equal(c.hp,hp);assert.deepEqual(c.damage,damage);assert.equal(c.heavy.damage,id==='bigcrunch'?24:23);}

// Same current-position player aim puts one well on the visible foe; it does
// not secretly move the well or remove the corridor after the cast.
{
 const s=scene('bigcrunch',4.8);s.ai[0].crunchSeen=.2;const i=duelAi(s,0,dt);assert.equal(i.skill1,true);assert(i.aimY>0);
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
 const s=scene('mirrorhall');s.fighters[0].meter=100;s.shots.push({kind:'crystal',owner:1,x:18,y:10,dx:-1,dy:0,speed:5,damage:10,hit:new Set(),life:1,pierce:0,bounces:0});const i={};assert.equal(batch08Ai(s,s.fighters[0],s.fighters[1],i,.1),false);const after={};assert.equal(batch08Ai(s,s.fighters[0],s.fighters[1],after,.15),true);assert.equal(after.skill1,true);assert.equal(after.ult,undefined);stepDuel(s,dt,after,{});assert.equal(s.fighters[0].meter,100,'Too late for the slower ultimate; ordinary action keeps earned meter');assert.equal(s.fighters[0].inv,0);assert.equal(s.hazards[0].budget.ordinary,3);
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
// Field reposition aligns a CURRENT forward panel, not the body. The actual
// shared step must produce a return, earn stored charge, and spend one budget.
{
 const s=scene('mirrorhall',8),f=s.fighters[0],o=s.fighters[1],observe=createFinal08Observer(0),step=i=>{observe.before(s);stepDuel(s,dt,i,{});observe.after(s);};
 step({skill1:true});for(let n=0;n<40;n++)step({});const h=s.hazards.find(h=>h.kind==='hallOpen'),hp=f.hp;
 const q={owner:1,x:22,y:11,dx:-1,dy:0,speed:7,damage:10,hit:new Set(),life:2,pierce:0,bounces:0,kind:'crystal'};s.shots.push(q);
 for(let n=0;n<100&&!q.hallReturned&&q.life>0;n++){const i={};batch08Ai(s,f,o,i,dt);assert.equal(i.skill1,undefined);assert.equal(i.ult,undefined);step(i);}
 assert.equal(q.hallReturned,true);assert.equal(q.owner,0);assert.equal(q.kind,'hallReturn');assert.equal(h.budget.ordinary,2);assert.equal(h.returned,1);assert.equal(f.hallStored,1);assert.equal(f.hp,hp);assert.equal(observe.metrics.returns,1);assert.equal(observe.metrics.armedHalls,1);
 Object.assign(o,{x:f.x+2.6,y:f.y,state:'attack',t:.25,hitDone:true});s.ai[0].finalRecovery=.2;const fold=duelAi(s,0,dt);assert.equal(fold.skill2,true);step(fold);assert.equal(f.hallStored,0);assert(s.hazards.some(h=>h.kind==='hallFold'&&h.damage===16));assert.equal(observe.metrics.chargedFolds,1);assert.equal(h.budget.ordinary,2,'Retiring a field never refills its spent budget');
}
// A visible projectile outside the old five-unit cutoff must allow time for
// the SAME delayed .32s opening. Outbound/parallel/expired-range projectiles
// and already-returned mirrors cannot spend a defensive meter.
{
 const s=scene('mirrorhall',8),f=s.fighters[0];f.meter=100;
 s.shots.push({owner:1,x:22,y:10,dx:-1,dy:0,speed:14,life:.8,kind:'crystal'});
 const early={};assert.equal(batch08Ai(s,f,s.fighters[1],early,.1),false);
 const ready={};assert.equal(batch08Ai(s,f,s.fighters[1],ready,.15),true);assert.equal(ready.skill1,true);assert.equal(ready.ult,undefined);assert.equal(f.meter,100,'AI proposes an action; it does not mutate meter');
}
// A genuinely early incoming shot still allows the unchanged five-panel
// ultimate. No resource is supplied by the decision or arrival calculation.
{
 const s=scene('mirrorhall',8),f=s.fighters[0];f.meter=100;s.ai[0].hallSeen=.3;
 s.shots.push({owner:1,x:22,y:10,dx:-1,dy:0,speed:5,life:2,kind:'crystal',hit:new Set(),damage:10,pierce:0,bounces:0});
 const i={};assert(batch08Ai(s,f,s.fighters[1],i,dt));assert.equal(i.ult,true);assert.equal(f.meter,100);stepDuel(s,dt,i,{});assert.equal(f.meter,0);assert.equal(s.hazards[0].budget.ordinary,6);assert.equal(f.inv,0);
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
// A shot already between a front panel and the body bypasses the ring. A boss
// shot at a real panel is removed rather than returned and earns no free charge.
for(const boss of [false,true]){
 const s=scene('mirrorhall',8),f=s.fighters[0],o=s.fighters[1],observer=createFinal08Observer(0),step=i=>{observer.before(s);stepDuel(s,dt,i,{});observer.after(s);};
 step({skill1:true});for(let n=0;n<40;n++)step({});const h=s.hazards.find(h=>h.kind==='hallOpen'),hp=f.hp;
 const q={owner:1,x:boss?22:15.7,y:boss?11:10,dx:-1,dy:0,speed:boss?7:5,damage:10,hit:new Set(),life:2,pierce:0,bounces:0,kind:'crystal',boss};s.shots.push(q);
 for(let n=0;n<100&&q.life>0;n++){const i={};if(boss)batch08Ai(s,f,o,i,dt);step(i);}
 assert.equal(q.hallReturned,undefined);assert.equal(f.hallStored,0);assert.equal(h.budget.ordinary,3);
 if(boss){assert.equal(h.budget.boss,0);assert.equal(observer.metrics.bossBlocks,1);assert.equal(f.hp,hp);}
 else{assert(f.hp<hp,'The body gap remains vulnerable');assert.equal(h.budget.boss,1);}
}
// A stationary fixed well is honestly escaped with ordinary opponent movement;
// the observer records the two closures and no shared-budget damage contact.
{
 const s=scene('bigcrunch',4.8),o=s.fighters[1],observe=createFinal08Observer(0),step=(i,j)=>{observe.before(s);stepDuel(s,dt,i,j);observe.after(s);};
 s.ai[0].crunchSeen=.2;step(duelAi(s,0,dt),{});const planted=s.hazards.filter(h=>h.kind==='crunchPlant').map(h=>[h.x,h.y]),hp=o.hp;
 for(let n=0;n<150;n++)step({},{y:1});assert.equal(o.hp,hp);assert.equal(observe.metrics.plants,2);assert.equal(observe.metrics.wells,2);assert.equal(observe.metrics.wellClosures,2);assert.equal(observe.metrics.wellEscapes,2);assert.equal(observe.metrics.wellContacts,0);assert.equal(observe.metrics.cancelledPlants,0);assert(planted.every(p=>Number.isFinite(p[0])&&Number.isFinite(p[1])));
}
// A real hostile shot interrupts the unarmed placement through shared strike;
// no test writes stun/state or pretends that a cancelled well was armed.
{
 const s=scene('bigcrunch',4.8),f=s.fighters[0],observe=createFinal08Observer(0),step=i=>{observe.before(s);stepDuel(s,dt,i,{});observe.after(s);};
 s.ai[0].crunchSeen=.2;step(duelAi(s,0,dt));const hp=f.hp;
 s.shots.push({owner:1,x:f.x+.8,y:f.y,dx:-1,dy:0,speed:6,damage:10,hit:new Set(),life:.5,pierce:0,bounces:0,kind:'crystal'});
 for(let n=0;n<60;n++)step({});assert(f.hp<hp);assert.equal(observe.metrics.plants,2);assert.equal(observe.metrics.cancelledPlants,2);assert.equal(observe.metrics.wells,0);assert.equal(observe.metrics.wellContacts,0);
}
// When a long fixed placement is not yet safe, the same player move creates
// separation. No well teleports and no free cooldown/invulnerability is given.
{
 const s=scene('bigcrunch'),f=s.fighters[0],o=s.fighters[1];s.ai[0].crunchSeen=.2;f.cd[1]=2;
 const i={};assert(batch08Ai(s,f,o,i,dt));assert(i.x<0);assert.equal(i.skill1,undefined);assert.equal(i.skill2,undefined);assert.equal(i.dodge,undefined);const d=Math.hypot(f.x-o.x,f.y-o.y);stepDuel(s,dt,i,{});assert(Math.hypot(f.x-o.x,f.y-o.y)>d);assert.equal(s.hazards.length,0);assert.equal(f.inv,0);assert(f.cd[1]<2);
}
// The diagnostic is observational: the same authored inputs produce byte-
// equivalent game data with/without recording, including Sets/shared budgets.
{
 const a=scene('bigcrunch'),b=scene('bigcrunch'),observer=createFinal08Observer(0);
 for(let n=0;n<160;n++){const i=n===0?{skill1:true}:n===70?{skill2:true}:{},j=n>50?{y:1}:{};stepDuel(a,dt,i,j);observer.before(b);stepDuel(b,dt,i,j);observer.after(b);}
 assert.deepEqual(b,a);assert.equal(observer.metrics.plants,2);assert.equal(observer.metrics.wellClosures,2);
}
console.log('Final08 AI contracts passed: unchanged stats/public36, delayed observed threats, actual returned shot and earned charged fold, body gap/boss block budgets, escaped and shot-interrupted fixed wells, safe fixed-placement distance.');
