import assert from 'node:assert/strict';
import {LAWS} from '../src/laws.js';
import {BOUNCE_LAWS,BOUNCE_CONFIG,createBounce,launchBounce,stepBounce,chooseBounce,bounceAimPath} from '../src/seed-bounce-rules.js';
assert.deepEqual(BOUNCE_LAWS.map(x=>x.id),Object.keys(LAWS));assert.equal(BOUNCE_LAWS.length,9);assert.ok(!BOUNCE_LAWS.some(x=>x.id==='portal'));
const finish=s=>{for(let i=0;i<50&&s.phase==='flying';i++)stepBounce(s,.2);};
const stable=s=>JSON.stringify({phase:s.phase,turn:s.turn,score:s.score,balls:s.balls,enemies:s.enemies,offers:s.offers});
for(const input of [[NaN,-1],[1,0],[0,1],[Infinity,-1],[100,-.01],[0,0]])assert.equal(launchBounce(createBounce(),...input),false);
const one=createBounce(5),two=createBounce(5);assert.ok(launchBounce(one,.45,-1));assert.ok(launchBounce(two,.45,-1));finish(one);finish(two);assert.equal(stable(one),stable(two),'seed-only inputs reproduce the entire volley');
const preview=createBounce();assert.ok(bounceAimPath(preview,1,-.2).length<=4);assert.deepEqual(bounceAimPath(preview,1,0),[]);for(const p of bounceAimPath(preview,1,-.2))assert.ok(p.x>=0&&p.x<=10&&p.y>=0&&p.y<=8);
function fixture(law,type='shield') {const s=createBounce(11);s.enemies.forEach(e=>e.active=false);Object.assign(s.enemies[0],{active:true,alive:true,id:800,x:5,y:3,w:.92,h:.92,r:.43,type,hp:1000,maxHp:1000,frost:0,orbitAt:-100});s.laws=law?[law]:[];s.volleySize=12;launchBounce(s,0,-1);return s;}
const ordinary=fixture('');finish(ordinary);assert.equal(ordinary.enemies[0].hp,976,'one impact per outbound seed: no overlap phantom hits');
const pierce=fixture('pierce');Object.assign(pierce.enemies[1],{...pierce.enemies[0],id:801,y:1.5,active:true});finish(pierce);assert.ok(pierce.enemies[1].hp<1000,'piercing reaches the second row');
for(const law of ['burst','chain','orbit']){const s=fixture(law);Object.assign(s.enemies[1],{...s.enemies[0],id:801,x:6.02,active:true});finish(s);assert.ok(s.enemies[1].hp<1000,`${law} deals actual nearby damage`);}
const frost=fixture('frost');finish(frost);assert.ok(frost.enemies[0].hp<ordinary.enemies[0].hp,'five-hit frost shatter has damage beyond direct contacts');
const recall=fixture('recall');finish(recall);assert.ok(recall.enemies[0].hp<976,'return trajectory pierces for an additional hit');
const split=fixture('split');for(let i=0;i<35;i++)stepBounce(split,.02);assert.ok(split.balls.some(b=>b.active&&b.child),'split has real child seeds');assert.equal(split.balls.length,32);
const bank=fixture('reflect');finish(bank);const angled=fixture('reflect');angled.phase='aim';launchBounce(angled,-10,-4.4);finish(angled);assert.ok(angled.balls.some(b=>b.banks>0),'bank reflection happens');assert.ok(angled.enemies[0].hp<bank.enemies[0].hp,'banked reflect seeds cause bonus damage');
const gravity=fixture('gravity');gravity.enemies[0].x=5.6;for(let i=0;i<20;i++)stepBounce(gravity,.02);assert.ok(gravity.balls.some(b=>b.active&&b.vx>0),'gravity curves trajectories toward an enemy');
const pool=fixture('split');for(const fx of pool.effects)Object.assign(fx,{active:true,ttl:100});finish(pool);assert.ok(pool.enemies[0].hp<1000,'saturated visuals cannot suppress combat');assert.equal(pool.effects.length,48);
const ringFx=fixture('orbit');stepBounce(ringFx,.25);stepBounce(ringFx,.1);assert.ok(ringFx.effects.some(fx=>fx.active&&fx.type==='orbit'&&fx.x2===undefined),'area effects render a ring, not a zero-length connection');
const choice=createBounce(7);launchBounce(choice,0,-1);finish(choice);launchBounce(choice,0,-1);finish(choice);assert.equal(choice.phase,'choice');const damage=choice.damage;assert.ok(!chooseBounce(choice,'fake'));assert.ok(chooseBounce(choice,'power'));assert.equal(choice.damage,damage+1);assert.equal(choice.turn,3);
const corner=fixture('');corner.enemies[0].x=5.01;corner.enemies[0].y=3;corner.volleySize=1;corner.launched=1;Object.assign(corner.balls[0],{active:true,x:5.55,y:3.54,vx:-.05,vy:-.05,r:.11,banks:0,returning:false,child:false,age:0,pierced:0,split:false,lastHit:0,cooldown:0,recallUsed:false,recallOutbound:false});stepBounce(corner,1/240);assert.equal(corner.enemies[0].hp,1000,'a ball outside a rectangle corner must not create a phantom hit');
const fused=createBounce();fused.phase='choice';fused.offers=[{id:'law:recall',law:'recall'}];chooseBounce(fused,'law:recall');fused.phase='choice';fused.offers=[{id:'law:pierce',law:'pierce'}];chooseBounce(fused,'law:pierce');assert.equal(fused.fusion.name,'귀환의 칼날');assert.deepEqual(fused.fusion.requires,['recall','pierce']);
const idle=createBounce();const idleBefore=JSON.stringify(idle);for(let i=0;i<400;i++)stepBounce(idle,.25);assert.equal(idle.phase,'aim','thinking does not punish an event-driven aim screen');assert.equal(JSON.stringify(idle),idleBefore,'idle cannot advance or win and has no clock');
const stopped=createBounce();stopped.phase='lost';const stopBefore=JSON.stringify(stopped);stepBounce(stopped,1);assert.equal(JSON.stringify(stopped),stopBefore);
const choiceIdle=createBounce();choiceIdle.phase='choice';const choiceBefore=JSON.stringify(choiceIdle);stepBounce(choiceIdle,1);assert.equal(JSON.stringify(choiceIdle),choiceBefore,'growth choices never have an idle timer');
function play(seed,smart,acquire=false){const s=createBounce(seed);let safety=0;while(!['won','lost'].includes(s.phase)&&safety++<80){if(s.phase==='choice'){chooseBounce(s,acquire&&s.offers.some(o=>o.law)?s.offers.find(o=>o.law).id:'power');continue;}if(s.phase==='aim'){let x=0,y=-1;if(smart){const targets=s.enemies.filter(e=>e.active).sort((a,b)=>b.y-a.y||a.hp-b.hp);const e=targets[0];if(e){x=e.x-5;y=e.y-7.4;}}assert.ok(launchBounce(s,x,y));}finish(s);assert.equal(s.balls.length,32);assert.equal(s.enemies.length,32);assert.equal(s.effects.length,48);for(const b of s.balls)if(b.active)assert.ok(Number.isFinite(b.x+b.y+b.vx+b.vy));}assert.ok(['won','lost'].includes(s.phase));if(s.phase==='won')assert.ok(s.boss&&s.bossDefeated);return{seed,phase:s.phase,turn:s.turn,kills:s.kills,score:s.score,laws:s.laws,fusion:s.fusion?.name};}
const straight=Array.from({length:6},(_,i)=>play(i+1,false)),aimed=Array.from({length:6},(_,i)=>play(i+1,true)),lawBuilds=Array.from({length:12},(_,i)=>play(i+1,true,true));console.log(JSON.stringify({note:'Actual launch/choice input CPU simulation; not human/device proof.',straight,aimed,lawBuilds},null,2));
assert.ok(straight.some(x=>x.phase==='lost'),'straight firing is not an automatic win');
assert.ok(aimed.some(x=>x.phase==='won'),'legal skilled aim wins at least some seeds');assert.ok(aimed.filter(x=>x.phase==='won').length>straight.filter(x=>x.phase==='won').length,'changing aim must outperform repeated straight shots with the same power choices');
assert.ok(lawBuilds.some(x=>x.phase==='won'&&x.laws.length===2&&x.fusion),'input-earned two-law/fusion builds can defeat the final boss');
console.log('PASS seed-bounce: deterministic physics, all nine adapters, bounds, meaningful upgrades, idle no-progress and straight-aim failure.');

// Boss entry spacing fixture: regular new rows must not hide its collider.
for(let seed=1;seed<=60;seed++){
 const s=createBounce(seed);s.enemies.forEach(e=>e.active=false);s.turn=6;s.phase='choice';s.offers=[{id:'power'}];chooseBounce(s,'power');
 const boss=s.enemies.find(e=>e.active&&e.type==='boss');assert.ok(boss);
 for(const e of s.enemies)if(e.active&&e!==boss)assert.ok(Math.abs(e.x-boss.x)>=boss.w/2+e.w/2||Math.abs(e.y-boss.y)>=boss.h/2+e.h/2,'guardian remains separated from new rows');
}

for(const before of [4,5]){const s=createBounce(7);s.enemies.forEach(e=>e.active=false);s.turn=before;s.phase='choice';s.offers=[{id:'power'}];chooseBounce(s,'power');for(const e of s.enemies)if(e.active)assert.ok(Math.abs(e.x-5)>=1.8,'frost-slowed arrival lanes remain free');}
