import assert from 'node:assert/strict';
import {createDuel,stepDuel,duelAi} from '../src/seed-duel-rules.js';
const dt=1/60,fixture=()=>{const s=createDuel({player:'frostnet',enemy:'pierce',seed:57});s.phase='fight';const[a,b]=s.fighters;a.x=15;a.y=10;b.x=18;b.y=10;return s;},run=(s,t,p={},e={})=>{for(let n=0;n<t;n+=dt)stepDuel(s,dt,p,e);},cast=s=>stepDuel(s,dt,{skill1:true,aimX:1,aimY:0},{});
// Two fixed knots are a visible preparation before one cold contact.
{const s=fixture();cast(s);const h=s.hazards[0],coords=[h.x,h.y,h.endX,h.endY];run(s,.4);assert.equal(s.fighters[1].hp,s.fighters[1].maxHp);s.fighters[1].x=20;run(s,.3);assert.deepEqual([h.x,h.y,h.endX,h.endY],coords);assert.equal(s.fighters[1].hp,s.fighters[1].maxHp);s.fighters[1].x=18;run(s,.1);assert.equal(s.fighters[1].maxHp-s.fighters[1].hp,18);assert.equal(s.fighters[1].netCold,1);const hp=s.fighters[1].hp;run(s,.6);assert.equal(s.fighters[1].hp,hp,'one edge has only one damage contact');}
// Walk around a knot before the edge arms. No infinite arena-wide wall.
{const s=fixture();cast(s);s.fighters[1].y=12.8;run(s,2);assert.equal(s.fighters[1].hp,s.fighters[1].maxHp);assert.equal(s.hazards.length,0);}
// A real melee hit interrupts the pending weave before it arms.
{const s=fixture();s.fighters[1].x=16.5;cast(s);run(s,.23,{}, {attack:true});assert.ok(s.fighters[0].hp<s.fighters[0].maxHp);run(s,1.8);assert.equal(s.hazards.length,0);assert.equal(s.events.includes('frostWeave'),false);}
// Guard is valid protection, not a way to accumulate a free freeze on the defender.
{const s=fixture();run(s,.3,{}, {block:true});cast(s);run(s,1.9,{}, {block:true});assert.ok(s.fighters[1].maxHp-s.fighters[1].hp<=18*.2+.001);assert.equal(s.fighters[1].netCold,0);assert.equal(s.fighters[1].slow,0);}
// Distinct edges can build a short slow; moving the same body on one edge cannot.
{const s=fixture();cast(s);run(s,.68);const b=s.fighters[1];assert.equal(b.netCold,1);s.fighters[0].cd[0]=0;run(s,.3);b.x=18;b.y=10;b.kx=0;b.ky=0;cast(s);run(s,.65);assert.ok(b.slow>0&&b.slow<=.65);assert.equal(b.netCold,0);run(s,1);assert.equal(b.slow,0);}
// The secondary contraction never refreshes an already spent edge's hit budget.
{const s=fixture();cast(s);run(s,.85);const hp=s.fighters[1].hp;s.fighters[1].x=18;s.fighters[1].kx=0;stepDuel(s,dt,{skill2:true},{});run(s,.7);assert.equal(s.fighters[1].hp,hp);}
// Triangle activation is staged. Damage is avoidable and no immediate global freeze occurs.
{const s=fixture();s.fighters[1].x=25;s.fighters[0].meter=100;stepDuel(s,dt,{ult:true,aimX:1},{});assert.equal(s.hazards.length,3);run(s,.5);assert.equal(s.hazards.filter(h=>h.triggered).length,0);run(s,.18);assert.equal(s.hazards.filter(h=>h.triggered).length,1);run(s,.25);assert.equal(s.hazards.filter(h=>h.triggered).length,2);run(s,.25);assert.equal(s.hazards.filter(h=>h.triggered).length,3);assert.equal(s.fighters[1].hp,s.fighters[1].maxHp);run(s,2);assert.equal(s.hazards.length,0);}
// AI exits across the narrow line after its ordinary reaction time.
{const s=fixture();cast(s);let input;for(let i=0;i<14;i++)input=duelAi(s,1,dt);assert.ok(Math.abs(input.x)>.5);}
// Clear all status between rounds and prove bounded lifetime under cooldown resets.
{const s=fixture();s.fighters[1].netCold=1;s.fighters[1].netColdTime=4;s.phase='roundEnd';s.ready=.01;run(s,.03);assert.equal(s.fighters[1].netCold,0);assert.equal(s.fighters[1].netColdTime,0);}
{const s=fixture();s.fighters[1].x=25;for(let i=0;i<900;i++){s.fighters[0].cd[0]=0;stepDuel(s,dt,{skill1:true},{});assert.ok(s.hazards.length<=32);for(const f of s.fighters)assert.ok(Number.isFinite(f.x+f.y+f.hp));}run(s,3);assert.equal(s.hazards.length,0);}
console.log('Frostnet: two fixed knots, arming/interruption, end escape, one contact per edge, guard, capped cold, staggered triangle, AI exits and round reset passed.');
