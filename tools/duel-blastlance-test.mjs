import assert from 'node:assert/strict';
import {createDuel,stepDuel,DUEL_CHARACTERS} from '../src/seed-duel-rules.js';
const tick=1/60;
const fixture=(x=20,y=10)=>{const s=createDuel({player:'blastlance',enemy:'pierce',seed:42});s.phase='fight';const [a,b]=s.fighters;a.x=15;a.y=10;b.x=x;b.y=y;a.fx=1;a.fy=0;b.fx=-1;b.fy=0;return s;};
const run=(s,seconds,p={},e={})=>{for(let t=0;t<seconds;t+=tick)stepDuel(s,tick,p,e);};
const cast=s=>stepDuel(s,tick,{skill1:true,aimX:1,aimY:0},{});
assert.equal(DUEL_CHARACTERS.blastlance.comboId,'blastlance');
// Windup locks the original aim and position; moving the opponent cannot retarget it.
{const s=fixture();const [a,b]=s.fighters;cast(s);run(s,.3,{x:1,aimX:0,aimY:1});assert.equal(s.shots.length,0);assert.equal(a.x,15);assert.equal(b.hp,b.maxHp);
 b.y=13;run(s,.16);assert.equal(s.shots.length,1);assert.equal(s.shots[0].dy,0);run(s,1);assert.equal(b.hp,b.maxHp,'side step avoids both lance and bloom');assert.equal(s.hazards.length,0);assert.equal(s.shots.length,0);}
// A real enemy hit during the windup cancels the future shot.
{const s=fixture(16.5);cast(s);run(s,.22,{}, {attack:true});assert.ok(s.fighters[0].hp<s.fighters[0].maxHp);run(s,1);assert.equal(s.shots.length,0);assert.equal(s.fighters[1].hp,s.fighters[1].maxHp);assert.equal(s.events.includes('bloomLaunch'),false);}
// Tip-only hit is delayed, bounded, and occurs once even after its visual expires.
{const s=fixture(23.2);cast(s);run(s,.65);assert.equal(s.fighters[1].hp,s.fighters[1].maxHp);run(s,.5);assert.equal(s.fighters[1].maxHp-s.fighters[1].hp,12);const hp=s.fighters[1].hp;run(s,1);assert.equal(s.fighters[1].hp,hp);}
// Facing guard chips the distant bloom; a close impact alone doesn't spawn repeat blooms.
{const s=fixture(23.2);run(s,.3,{}, {block:true});cast(s);run(s,1.5,{}, {block:true});assert.ok(s.fighters[1].maxHp-s.fighters[1].hp<=12*.2+.01);}
{const s=fixture(18);cast(s);run(s,1.5);const hp=s.fighters[1].hp;assert.ok(hp<s.fighters[1].maxHp);assert.ok(s.fighters[1].maxHp-hp<=28);run(s,2);assert.equal(s.fighters[1].hp,hp);}
// Secondary action remains a rules-level action; the four-button UI uses skill1.
{const s=fixture(15,11);stepDuel(s,tick,{skill2:true,aimX:1},{});assert.equal(s.fighters[0].inv,0);run(s,.2);assert.ok(s.fighters[0].x<14);run(s,1);assert.equal(s.hazards.length,0);assert.ok(s.fighters[1].maxHp-s.fighters[1].hp<=10);}
// Ultimate schedules three launches instead of instant arena-wide damage.
{const s=fixture(25);s.fighters[0].meter=100;stepDuel(s,tick,{ult:true,aimX:1},{});assert.equal(s.fighters[0].meter,0);assert.equal(s.shots.length,0);assert.equal(s.hazards.length,3);assert.equal(s.fighters[1].hp,s.fighters[1].maxHp);
 run(s,.63);assert.equal(s.shots.length,1);run(s,.22);assert.equal(s.shots.length,2);run(s,.22);assert.equal(s.events.filter(e=>e==='bloomLaunch').length,3);assert.ok(s.shots.length<=3);run(s,2);assert.equal(s.shots.length,0);assert.equal(s.hazards.length,0);}
{const s=fixture(16.5);s.fighters[0].meter=100;stepDuel(s,tick,{ult:true},{});run(s,.25,{}, {attack:true});assert.ok(s.fighters[0].hp<s.fighters[0].maxHp);run(s,2);assert.equal(s.shots.length,0);assert.equal(s.fighters[1].hp,s.fighters[1].maxHp);}
// Deliberately reset cooldowns: pending actions/visuals still expire within fixed budgets.
{const s=fixture(25);for(let i=0;i<1200;i++){s.fighters[0].cd[0]=0;stepDuel(s,tick,{skill1:true},{});assert.ok(s.shots.length<=64);assert.ok(s.hazards.length<=32);for(const f of s.fighters)assert.ok(Number.isFinite(f.x+f.y+f.hp));}run(s,2);assert.equal(s.shots.length,0);assert.equal(s.hazards.length,0);}
console.log('Blastlance: fixed windup, lateral evasion, real interruption, delayed one-shot bloom, guard, finite three-wave ultimate and resource expiry passed.');
