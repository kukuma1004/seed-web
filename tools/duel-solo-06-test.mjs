import assert from 'node:assert/strict';
import {createDuel,stepDuel,duelAi,duelCharacterKind,DUEL_CHARACTERS,DUEL_ORDER} from '../src/seed-duel-rules.js';
import {SOLO_FORMS} from '../src/forms.js';
import {batch06Ai,batch06DangerAi} from '../src/seed-duel-batch06.js';
import {DUEL_STORY_STAGES,completeStoryMatch} from '../src/seed-duel-story.js';
import {normalizeDuelStory,mergeDuelStory,nextStoryStage} from '../src/seed-duel-story-progress.js';
const dt=1/60,fixture=(id,d=5,seat=0)=>{const s=createDuel({player:seat?'pierce':id,enemy:seat?id:'pierce',seed:37});s.phase='fight';Object.assign(s.fighters[seat],{x:15,y:10,fx:1,fy:0});Object.assign(s.fighters[1-seat],{x:15+d,y:10,fx:-1,fy:0,hp:1000,maxHp:1000});return s;};
const run=(s,t,p={},e={})=>{for(let n=0;n<t;n+=dt)stepDuel(s,dt,p,e);};
const cast=(s,input={skill1:true},seat=0)=>stepDuel(s,dt,seat?{}:input,seat?input:{});
const ring=s=>s.hazards.find(h=>h.kind==='starBreath');
for(const [id,law] of [['starring','orbit'],['glassspear','pierce']]){assert.deepEqual(SOLO_FORMS[id].requires,[law]);assert.equal(DUEL_CHARACTERS[id].comboId,id);assert.equal(DUEL_CHARACTERS[id].solo,true);assert.ok(DUEL_ORDER.includes(id));}
assert.ok(DUEL_ORDER.filter(id=>duelCharacterKind(id)==='solo').length>=2);assert.equal(DUEL_ORDER.filter(id=>duelCharacterKind(id)==='fusion').length,10);for(const id of ['starring','glassspear'])assert.equal(duelCharacterKind(id),'solo');
// The real point ring breathes out then in. It neither fills the inner gap nor
// damages before its setup, and the shared budget is two contacts, not per-petal.
{const s=fixture('starring',8);cast(s);run(s,.35);assert.equal(ring(s).age,0);run(s,.7);const r=ring(s).r;assert.ok(r>2&&r<3.2);run(s,.6);assert.ok(ring(s).r>3);run(s,1.35);assert.equal(s.hazards.length,0);}
for(const seat of [0,1]){const s=fixture('starring',1.5,seat);cast(s,{skill1:true},seat);run(s,.3);assert.equal(s.fighters[1-seat].hp,1000);run(s,3);assert.equal(1000-s.fighters[1-seat].hp,18);assert.equal(s.fighters[seat].inv,0);}
{const s=fixture('starring',.95);cast(s);run(s,3.2);assert.equal(s.fighters[1].hp,1000,'body-adjacent hole stays open');}
{const s=fixture('starring',1.5);run(s,.3,{}, {block:true});cast(s);run(s,3.2,{}, {block:true});assert.ok(Math.abs(1000-s.fighters[1].hp-3.6)<1e-6);}
// Fold has its own final tell, fixed annular sweep and one-hit budget.
{const s=fixture('starring',2);cast(s,{skill2:true});run(s,.3);assert.equal(s.fighters[1].hp,1000);run(s,.6);assert.equal(1000-s.fighters[1].hp,12);}
{const s=fixture('starring',.95);cast(s,{skill2:true});run(s,1);assert.equal(s.fighters[1].hp,1000);}
{const s=fixture('starring',8);cast(s);run(s,.85);s.fighters[1].x=17;const r=ring(s).r;assert.ok(r>1.8);cast(s,{skill2:true});assert.ok(!s.hazards.some(h=>h.kind==='starBreath'&&h.t>0));const h=s.hazards.find(h=>h.kind==='starFold');assert.equal(h.outer,r);assert.ok(h.arm>.3);s.fighters[1].y=15;run(s,.8);assert.equal(s.fighters[1].hp,1000);}
// A stationary straight spear actually expands, is narrow, stops at cover and
// has no travelling projectile or acquired homing target.
for(const seat of [0,1]){const s=fixture('glassspear',5,seat);cast(s,{skill1:true},seat);const h=s.hazards[0],end=[h.endX,h.endY];run(s,.46);assert.equal(s.fighters[1-seat].hp,1000);assert.equal(s.shots.length,0);run(s,.6);assert.equal(1000-s.fighters[1-seat].hp,18);assert.deepEqual([h.endX,h.endY],end);assert.equal(s.fighters[seat].glassFacet,1);assert.equal(s.hazards.length,0);}
{const s=fixture('glassspear',5);cast(s);s.fighters[1].y=12;run(s,1.2);assert.equal(s.fighters[1].hp,1000);assert.equal(s.fighters[0].glassFacet,0);}
{const s=fixture('glassspear',5);run(s,.3,{}, {block:true});cast(s);run(s,1.2,{}, {block:true});assert.ok(Math.abs(1000-s.fighters[1].hp-3.6)<1e-6);assert.equal(s.fighters[0].glassFacet,0);}
{const s=fixture('glassspear',8);s.fighters[0].y=s.fighters[1].y=6.2;s.fighters[0].x=20;s.fighters[1].x=28;cast(s);assert.ok(s.hazards[0].endX<24);run(s,1.2);assert.equal(s.fighters[1].hp,1000);}
{const s=fixture('glassspear',5);s.fighters[0].glassFacet=2;s.fighters[0].glassFacetTime=5;cast(s);run(s,1.2);assert.ok(Math.abs(1000-s.fighters[1].hp-22.32)<1e-6);assert.equal(s.fighters[0].glassFacet,1);run(s,6);assert.equal(s.fighters[0].glassFacet,0);}
// A real final-arming-frame jab cancels setup before any outgoing strike.
for(const [id,kind] of [['starring','starBreath'],['glassspear','glassLine']]){const s=fixture(id,1.5);cast(s);s.hazards[0].arm=.005;const o=s.fighters[1];Object.assign(o,{state:'attack',step:0,t:.11,total:.36,hitAt:.095,hitDone:false});stepDuel(s,dt,{},{});assert.ok(s.fighters[0].stun>0);assert.ok(!s.hazards.some(h=>h.kind===kind&&h.t>0));assert.equal(s.fighters[1].hp,1000);assert.equal(s.fighters[0].inv,0);}
{const s=fixture('glassspear',2);cast(s,{skill2:true});const x=s.fighters[0].x;run(s,.3);assert.equal(s.fighters[0].x,x);assert.equal(s.fighters[1].hp,1000);run(s,.65);assert.equal(1000-s.fighters[1].hp,10);assert.ok(s.fighters[0].x<x-.5);assert.equal(s.fighters[0].inv,0);}
// Actual projectile paths cross a finite petal point. Same bullet and boss
// bullets are excluded; a close body shot inside the ring is still dangerous.
const shot=(x,y,extra={})=>({owner:1,x,y,dx:-1,dy:0,speed:30,life:1,damage:12,pierce:0,bounces:0,hit:new Set(),law:'pierce',...extra});
{const s=fixture('starring',8);cast(s);run(s,.5);let h=ring(s),a=h.angle+(h.age+dt)*2.2,r=1.5+1.7*(.5-.5*Math.cos(Math.PI*2*(h.age+dt)/h.period)),x=15+Math.cos(a)*r,y=10+Math.sin(a)*r;const q=shot(x+.2,y);s.shots.push(q);stepDuel(s,dt,{},{});assert.equal(q.wardSpent,true);assert.equal(h.budget.blocks,1);q.life=1;s.shots.push(q);stepDuel(s,dt,{},{});assert.equal(h.budget.blocks,1);}
{const s=fixture('starring',8);cast(s);run(s,.5);const h=ring(s),q=shot(15.3,10,{speed:6});s.shots.push(q);stepDuel(s,dt,{},{});assert.equal(s.fighters[0].hp,DUEL_CHARACTERS.starring.hp-12);assert.equal(h.budget.blocks,2);}
{const s=fixture('starring',8);cast(s);run(s,.5);const h=ring(s),a=h.angle+(h.age+dt)*2.2,r=1.5+1.7*(.5-.5*Math.cos(Math.PI*2*(h.age+dt)/h.period));s.shots.push(shot(15+Math.cos(a)*r+.2,10+Math.sin(a)*r,{boss:true}));stepDuel(s,dt,{},{});assert.equal(h.budget.blocks,2);}
{const s=fixture('starring',8);cast(s);run(s,.5);const h=ring(s),a=h.angle+(h.age+dt)*2.2,r=1.5+1.7*(.5-.5*Math.cos(Math.PI*2*(h.age+dt)/h.period)),qs=Array.from({length:5},()=>shot(15+Math.cos(a)*r+.2,10+Math.sin(a)*r));s.shots.push(...qs);stepDuel(s,dt,{},{});assert.equal(h.budget.blocks,0);assert.equal(qs.filter(q=>q.wardSpent).length,2,'global budget, not two blocks for each of five petals');}
{const s=createDuel({player:'glassspear',enemy:'starring'});s.phase='fight';Object.assign(s.fighters[0],{x:15,y:10,fx:1,fy:0});Object.assign(s.fighters[1],{x:20,y:10,fx:-1,fy:0,hp:1000,maxHp:1000});cast(s,{skill1:true},1);run(s,.7);const h=ring(s);cast(s);run(s,1.2);assert.equal(1000-s.fighters[1].hp,18,'hitscan is not an interceptible projectile');assert.equal(h.budget.blocks,2);}
for(const [id,limit,d] of [['starring',30,2],['glassspear',32,5]]){const s=fixture(id,d);s.fighters[0].meter=100;cast(s,{ult:true});run(s,4);assert.ok(1000-s.fighters[1].hp<=limit);assert.ok(1000-s.fighters[1].hp>0);assert.equal(s.fighters[0].inv,0);assert.equal(s.shots.length,0);assert.equal(s.hazards.length,0);}
// Original finisher earnings, expiration and clean round state.
for(const id of ['starring','glassspear']){const s=fixture(id,1.5),f=s.fighters[0];f.combo=2;f.comboTime=1;cast(s,{attack:true});run(s,.35);assert.equal(id==='starring'?f.starBeat:f.glassFacet,1);run(s,6);assert.equal(id==='starring'?f.starBeat:f.glassFacet,0);s.phase='roundEnd';s.ready=0;stepDuel(s,dt,{},{});assert.equal(f.starBeat,0);assert.equal(f.glassFacet,0);assert.equal(f.starCast,0);assert.equal(f.glassCast,0);}
{const s=fixture('glassspear',5),input={};assert.equal(batch06Ai(s,s.fighters[0],s.fighters[1],input,dt),true);assert.equal(input.skill1,true);}
{const s=fixture('glassspear',2),o=s.fighters[1];Object.assign(o,{state:'heavy',t:.3,total:.6,hitDone:true});s.ai[0].glassThreat=1;const input=duelAi(s,0,dt);assert.equal(input.skill2,true,'actual AI can use authored recovery technique');cast(s,input);assert.ok(s.fighters[0].cd[1]>0);assert.equal(s.fighters[0].inv,0);}
for(const id of ['starring','glassspear']){const s=fixture(id,8);for(let n=0;n<1800;n++){if(n%90===0){s.fighters[0].cd=[0,0];cast(s,{skill1:true});}stepDuel(s,dt,{},{});assert.ok(s.shots.length<=64&&s.hazards.length<=32&&s.effects.length<=120);assert.ok(s.hazards.every(h=>Number.isFinite(h.x)&&Number.isFinite(h.y)));}run(s,6);assert.equal(s.hazards.length,0);}
{const s=fixture('glassspear',5);cast(s);const o=s.fighters[1],i={};assert.equal(batch06DangerAi(s,o,i,.1),false);assert.equal(batch06DangerAi(s,o,i,.15),true);assert.ok(Math.abs(i.y)>0);}
{const old={hero:'stormcrown',updatedAt:20,cleared:Object.fromEntries(Array.from({length:32},(_,i)=>[`s${i+1}`,{losses:0,at:10}]))};assert.equal(nextStoryStage(old),33);let next=old;for(const id of ['starring','glassspear']){const stage=DUEL_STORY_STAGES.find(v=>v.enemy===id),m=createDuel({player:id,enemy:id});Object.assign(m,{phase:'over',winner:0,wins:[2,1]});next=completeStoryMatch(next,stage,m,50+stage.number);assert.ok(next);}assert.equal(Object.keys(mergeDuelStory(old,next).cleared).length,34);assert.equal(normalizeDuelStory(next).hero,'glassspear');assert.equal(DUEL_STORY_STAGES[33].enemy,'glassspear');}
console.log('Bundle06 actual breathing ring/annular fold/contact-only finite interception, fixed cover-clipped hitscan/side escape/guard/final interruption/withdraw/facets/ult ceilings/both seats/cleanup/AI and32-to34 story passed.');
