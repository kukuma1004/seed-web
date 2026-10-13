import assert from 'node:assert/strict';
import {performance} from 'node:perf_hooks';
import {CHALLENGE,createGardenChallenge,stepGardenChallenge,chooseGardenChallenge,gardenChallengeSummary} from '../src/garden-challenge-rules.js';
import {LAWS} from '../src/laws.js';
import {FORMS} from '../src/forms.js';
const dt=1/30;
function growth(s,id){s.kills=s._growthKills;stepGardenChallenge(s,dt);assert.equal(s.phase,'choice');assert(chooseGardenChallenge(s,id));}
function target(s,{type='sprout',x=3,y=0,hp=1000}={}){const e=s.enemies.find(e=>!e.active);Object.assign(e,{active:true,type,x,y,hp,maxHp:hp,r:.4,frost:0,flash:0,attackTime:999});return e;}
for(const id of Object.keys(LAWS)){
 const s=createGardenChallenge(33);growth(s,id);assert.equal(s.levels[id],1);assert.equal(s._laws.length,1);const e=target(s),n=target(s,{x:3.6,y:.5}),before=e.hp;
 let evidence=false;for(let i=0;i<120;i++){stepGardenChallenge(s,dt,{x:0,y:0});if(s.phase==='choice')chooseGardenChallenge(s,'tempo');
  evidence ||= id==='reflect'?s.shots.some(q=>q.active&&q._bounces>0):id==='pierce'?s.shots.some(q=>q.active&&q._budget>1):id==='recall'?s.shots.some(q=>q.active&&q._return):id==='split'?s.shots.some(q=>q.active&&q._child):id==='gravity'?s.hazards.some(h=>h.active&&h.kind==='gravity'):id==='chain'?s.effects.some(f=>f.active&&f.kind==='chain'):id==='burst'?s.effects.some(f=>f.active&&f.kind==='burst'):id==='frost'?e.frost>0:s.effects.some(f=>f.active&&f.kind==='orbit');
 }
 assert(evidence,`${id}: actual bounded behavior exists`);assert(e.hp<before||n.hp<before,`${id}: actual combat damage`);
}
{
 const s=createGardenChallenge(1);growth(s,'burst');growth(s,'chain');s.kills=s._growthKills;stepGardenChallenge(s,dt);const pair=s.offers.find(o=>o.id.startsWith('fusion:'));assert(pair);assert(!pair.description.includes('undefined'));assert(chooseGardenChallenge(s,pair.id));assert.equal(s.fusion.name,FORMS[s.fusion.id].name);assert(s._power>=1.28);assert(s.events.some(e=>e.type==='growth'&&e.law==='fusion'));
 while(s.choices<CHALLENGE.choices)growth(s,'tempo');assert.equal(s._growthKills,Infinity);s.kills=100000;stepGardenChallenge(s,dt);assert.equal(s.phase,'playing','short run never opens more than six choices');
 const copy=JSON.stringify(s);assert.equal(chooseGardenChallenge(s,'vigor'),false);assert.equal(JSON.stringify(s),copy);
}
{
 const a=createGardenChallenge(73),b=createGardenChallenge(73);for(let i=0;i<300;i++){const input={x:Math.cos(i*.02),y:Math.sin(i*.02),dash:i%90===0};stepGardenChallenge(a,dt,input);stepGardenChallenge(b,dt,input);if(a.phase==='choice'){assert(chooseGardenChallenge(a,'pierce'));assert(chooseGardenChallenge(b,'pierce'));}}assert.deepEqual(a,b);
 const at=JSON.stringify(a);for(const n of [NaN,Infinity,-1,0])stepGardenChallenge(a,n);assert.equal(JSON.stringify(a),at);
}
{
 const s=createGardenChallenge(3);stepGardenChallenge(s,dt,{x:NaN,y:Infinity,dash:true});assert(Number.isFinite(s.player.x));const cd=s.player.dashCd;stepGardenChallenge(s,dt,{dash:true});assert(s.player.dashCd<cd,'held dash is not re-triggered');
 s.time=125;s.player.x=11.45;s.player.y=6.45;for(const e of s.enemies)Object.assign(e,{active:true,type:'sprout',x:-9,y:-5,hp:100,maxHp:100,attackTime:99});stepGardenChallenge(s,dt);assert.equal(s.bossSpawned,false);s.enemies[0].active=false;stepGardenChallenge(s,dt);assert(s.bossSpawned&&s.enemies.some(e=>e.active&&e.type==='boss'),'boss retries after a saturated pool');
}
{
 const s=createGardenChallenge(2);s.time=179.99;stepGardenChallenge(s,.5);assert.equal(s.phase,'lost');assert.equal(s.time,180);assert.match(s.reason,/時間|시간/);const old=JSON.stringify(s);stepGardenChallenge(s,dt);assert.equal(JSON.stringify(s),old,'terminal state immutable');
 const win=createGardenChallenge(4);win.time=125;win._spawn=999;stepGardenChallenge(win,dt);const e=win.enemies.find(e=>e.type==='boss'&&e.active);e.x=1;e.y=0;e.hp=1;for(let i=0;i<60&&win.phase==='playing';i++)stepGardenChallenge(win,dt);assert.equal(win.phase,'won');assert(win.bossDefeated);assert.equal(gardenChallengeSummary(win).won,true);
}
{
 const s=createGardenChallenge(91);s.player.x=11.4;s.player.y=6.4;for(let i=0;i<1000&&s.phase==='playing';i++){const active=new Set(s.enemies.filter(e=>e.active));stepGardenChallenge(s,dt,{x:-1,y:0});for(const e of s.enemies)if(e.active&&!active.has(e))assert(Math.hypot(e.x-s.player.x,e.y-s.player.y)>4,'new boundary enemies give readable approach time');if(s.phase==='choice')chooseGardenChallenge(s,'burst');}
}
// Review regression fixtures mutate setup only; these are not native playtests.
{
 const s=createGardenChallenge(5);growth(s,'orbit');s.time=125;s._spawn=999;stepGardenChallenge(s,dt);
 const boss=s.enemies.find(e=>e.active&&e.type==='boss');Object.assign(boss,{x:s.player.x+.2,y:s.player.y,hp:1,attackTime:999});
 s.player.hp=1;s.player.inv=0;s._fire=999;s._hazardClock=999;s.shots.forEach(b=>b.active=false);
 stepGardenChallenge(s,dt);assert.equal(s.phase,'lost');assert.equal(s.player.hp,0);assert.equal(s.bossDefeated,false);assert(!s.events.some(e=>e.type==='won'),'contact death cannot be overwritten by an orbit finisher');
 const frozen=JSON.stringify(s);stepGardenChallenge(s,dt);assert.equal(JSON.stringify(s),frozen);
}
{
 const s=createGardenChallenge(6);s.time=125;s._spawn=999;stepGardenChallenge(s,dt);const boss=s.enemies.find(e=>e.active&&e.type==='boss');boss.x=2;boss.y=0;boss.hp=1;s.player.hp=1;s.player.inv=0;s._fire=999;s._hazardClock=999;
 const shot=s.shots[0];Object.assign(shot,{active:true,owner:'player',x:2,y:0,vx:0,vy:0,life:1,_damage:100,_budget:1});
 Object.assign(s.hazards[0],{active:true,kind:'danger',x:0,y:0,r:2,warning:0,ttl:1,_damage:100,_fired:false});
 stepGardenChallenge(s,dt);assert.equal(s.phase,'won');assert.equal(s.player.hp,1,'earlier boss kill cannot be followed by post-victory hazard damage');assert(s.events.some(e=>e.type==='won'));assert(!s.events.some(e=>e.type==='lost'));
}
{
 const s=createGardenChallenge(7);growth(s,'reflect');s.shots.forEach(b=>b.active=false);s._fire=s._spawn=s._hazardClock=999;
 Object.assign(s.shots[0],{active:true,owner:'player',x:11.79,y:0,vx:9,vy:0,life:1,_bounces:s._stats.reflectBounces,_budget:1});const b=s.shots[0],before=b._bounces;
 stepGardenChallenge(s,dt);assert.equal(b.vx,-9);assert.equal(b._bounces,before-1);assert(s.events.some(e=>e.type==='reflect'),'reflection must actually occur at the wall');
}
{
 const s=createGardenChallenge(9);s.time=125;s._spawn=999;stepGardenChallenge(s,dt);const boss=s.enemies.find(e=>e.active&&e.type==='boss');boss.x=2;boss.y=0;boss.hp=1;s.player.hp=1;s.player.inv=0;s._fire=s._hazardClock=999;
 Object.assign(s.shots[0],{active:true,owner:'enemy',law:'thorn',x:0,y:0,vx:0,vy:0,life:1,_damage:100});
 Object.assign(s.shots[1],{active:true,owner:'player',x:2,y:0,vx:0,vy:0,life:1,_damage:100,_budget:1});
 stepGardenChallenge(s,dt);assert.equal(s.phase,'lost');assert.equal(s.player.hp,0);assert.equal(boss.hp,1,'later player shot cannot overturn an earlier lethal enemy shot');assert(!s.events.some(e=>e.type==='won'));
}
{
 const s=createGardenChallenge(8);growth(s,'pierce');s._spawn=s._hazardClock=999;const a=target(s,{x:2,y:0}),b=target(s,{x:3,y:0});
 for(let i=0;i<18;i++)stepGardenChallenge(s,dt);assert(a.hp<1000&&b.hp<1000,'piercing must actually damage two different enemies');
 growth(s,'tempo');growth(s,'vigor');assert.deepEqual(gardenChallengeSummary(s).supportGrowth,{tempo:1,vigor:1});
}
// Legal control policies: no player HP, enemy, time or resource mutation.
export function simulate(seed,difficulty,style='moving',pair=['burst','chain']){
 const s=createGardenChallenge(seed,difficulty);let frames=0,firstChoice=null,travel=0,peakShots=0,peakEffects=0,peakHazards=0,last={x:0,y:0};
 while(s.phase==='playing'||s.phase==='choice'){
  if(s.phase==='choice'){firstChoice??=s.time;const id=!s.levels[pair[0]]?pair[0]:!s.levels[pair[1]]?pair[1]:s.offers.find(o=>o.id.startsWith('fusion:'))?.id||pair[s.choices%2];assert(chooseGardenChallenge(s,s.offers.find(o=>o.id===id)?.id||s.offers[0].id));continue;}
  let x=0,y=0,dash=false;
  if(style!=='idle'){
   const p=s.player,pick=style==='collector'?s.pickups.find(pick=>pick.active&&p.hp<p.maxHp-20):null,angle=s.time*.43,tx=pick?pick.x:Math.cos(angle)*7.5,ty=pick?pick.y:Math.sin(angle)*4.2;
   x=tx-p.x;y=ty-p.y;const l=Math.hypot(x,y)||1;x/=l;y/=l;
   const danger=s.hazards.find(h=>h.active&&h.kind!=='gravity'&&h.warning<.45&&Math.hypot(h.x-p.x,h.y-p.y)<h.r+.5);
   if(danger){const a=Math.atan2(p.y-danger.y,p.x-danger.x);x=Math.cos(a);y=Math.sin(a);dash=p.dashCd<=0;}
   else dash=p.dashCd<=0&&s.enemies.some(e=>e.active&&Math.hypot(e.x-p.x,e.y-p.y)<1.4);
  }
  if(style==='smart'){
   const p=s.player,goal=s.pickups.find(q=>q.active&&p.hp<p.maxHp-15);let best=-Infinity;
   for(let i=0;i<24;i++){const a=i*Math.PI/12,vx=Math.cos(a),vy=Math.sin(a),qx=p.x+vx*2.4,qy=p.y+vy*2.4;let score=0,clear=6;
    if(Math.abs(qx)>10.7||Math.abs(qy)>5.8)score-=20;
    for(const e of s.enemies)if(e.active){const d=Math.hypot(qx-e.x,qy-e.y);clear=Math.min(clear,d-e.r);if(d<e.r+1)score-=12;}
    score+=clear*1.6;
    for(const h of s.hazards)if(h.active&&h.kind!=='gravity'&&Math.hypot(qx-h.x,qy-h.y)<h.r+.5)score-=20;
    if(goal)score-=Math.hypot(qx-goal.x,qy-goal.y)*.18;
    if(score>best){best=score;x=vx;y=vy;}
   }
   dash=p.dashCd<=0&&(s.hazards.some(h=>h.active&&h.kind!=='gravity'&&h.warning<.4&&Math.hypot(p.x-h.x,p.y-h.y)<h.r+.5)||s.enemies.some(e=>e.active&&Math.hypot(p.x-e.x,p.y-e.y)<1.2));
  }
  stepGardenChallenge(s,dt,{x,y,dash});frames++;travel+=Math.hypot(s.player.x-last.x,s.player.y-last.y);last.x=s.player.x;last.y=s.player.y;
  peakShots=Math.max(peakShots,s.shots.filter(q=>q.active).length);peakEffects=Math.max(peakEffects,s.effects.filter(q=>q.active).length);peakHazards=Math.max(peakHazards,s.hazards.filter(q=>q.active).length);
  assert(frames<=5402);assert(s.enemies.length===CHALLENGE.enemies&&s.shots.length===CHALLENGE.shots&&s.effects.length===CHALLENGE.effects);assert(s.events.length<=32);
 }
 return {...gardenChallengeSummary(s),firstChoice,frames,travel:Math.round(travel),peakEnemies:s.peakEnemies,peakShots,peakEffects,peakHazards};
}
const began=performance.now(),metrics=[];
for(const difficulty of ['normal','expert'])for(const seed of [1,7,33,413])for(const style of ['idle','moving','smart'])metrics.push({...simulate(seed,difficulty,style),style});
console.log(JSON.stringify({evidence:'CPU policies, not human/device play',milliseconds:Math.round(performance.now()-began),metrics}));
assert(metrics.filter(m=>m.style==='idle').every(m=>!m.won),'waiting alone must not complete the garden');
assert(metrics.some(m=>m.style==='moving'&&m.difficulty==='normal'&&m.won),'normal has a genuine legal-input win path');
assert(metrics.some(m=>m.difficulty==='expert'&&m.won),'expert has a genuine legal-input win path');
assert(metrics.every(m=>m.time<=180&&m.choices<=6));

console.log('Garden Challenge rules PASS: nine real law behaviors, actual recipe/fusion, six growth cap, deterministic bounded pools, invalid/terminal boundaries, dash edge, safe spawn, boss retry/win/time-out and legal policies.');
