import assert from 'node:assert/strict';
import {createDuel,stepDuel,DUEL_CHARACTERS,DUEL_ORDER} from '../src/seed-duel-rules.js';
import {batch03Reach} from '../src/seed-duel-batch03.js';
import {ALL_FORMS} from '../src/forms.js';
import {DUEL_STORY_STAGES,completeStoryMatch} from '../src/seed-duel-story.js';
import {normalizeDuelStory,mergeDuelStory,nextStoryStage} from '../src/seed-duel-story-progress.js';
const dt=1/60;
const fixture=(id,x=15,y=10,ox=20,oy=10)=>{const s=createDuel({player:id,enemy:'pierce',seed:51});s.phase='fight';Object.assign(s.fighters[0],{x,y,fx:1,fy:0});Object.assign(s.fighters[1],{x:ox,y:oy,fx:-1,fy:0,hp:1000,maxHp:1000});return s;};
const run=(s,sec,p={},e={})=>{for(let t=0;t<sec;t+=dt)stepDuel(s,dt,typeof p==='function'?p(t):p,typeof e==='function'?e(t):e);};
const cast=(s,p={skill1:true})=>stepDuel(s,dt,p,{});
assert.deepEqual(ALL_FORMS.returnblade.requires,['recall','pierce']);
assert.deepEqual(ALL_FORMS.frostguard.requires,['orbit','frost']);
for(const id of ['returnblade','frostguard']){assert.equal(DUEL_CHARACTERS[id].comboId,id);assert.ok(DUEL_ORDER.includes(id));}
// Actual shared-engine shots: hold path, pierce instead of disappearing, a second
// returning leg, finite per-leg contact, caught weapon restores melee reach.
{const s=fixture('returnblade');cast(s);run(s,.25);assert.equal(s.shots.length,0);run(s,.2);const q=s.shots[0];assert.equal(q.kind,'returnSpear');assert.ok(q.pierce>0);assert.equal(batch03Reach(s,s.fighters[0]),.64);run(s,2);assert.equal(1000-s.fighters[1].hp,28);assert.equal(s.shots.length,0);assert.equal(batch03Reach(s,s.fighters[0]),1);}
{const s=fixture('returnblade');cast(s);run(s,.7);const q=s.shots[0],cd=s.fighters[0].cd[0];assert.ok(!q.back&&q.age>.22);cast(s);assert.ok(q.back);assert.ok(s.fighters[0].cd[0]<cd,'repress keeps original cooldown');run(s,2);assert.ok(1000-s.fighters[1].hp<=28);}
// Moving the caster changes the return path. Fixed outbound tell does not follow.
{const s=fixture('returnblade');cast(s);const h=s.hazards[0],xy=[h.x,h.y,h.endX,h.endY];run(s,.7);const q=s.shots[0];s.fighters[0].y=13;run(s,.2);assert.ok(q.dy>0);assert.deepEqual([h.x,h.y,h.endX,h.endY],xy);}
{const s=fixture('returnblade');cast(s);s.fighters[1].y=14;run(s,2.4);assert.equal(s.fighters[1].hp,1000);}
{const s=fixture('returnblade');run(s,.3,{}, {block:true});cast(s);run(s,2.4,{}, {block:true});assert.ok(1000-s.fighters[1].hp<=5.6+.001);}
{const s=fixture('returnblade');cast(s);s.fighters[0].stun=.6;s.fighters[0].state='hit';run(s,.5);assert.equal(s.shots.length,0);}
{const s=fixture('returnblade');s.fighters[0].meter=100;cast(s,{ult:true});assert.equal(s.fighters[0].inv,0);assert.equal(s.hazards.length,3);run(s,3);assert.ok(1000-s.fighters[1].hp<=34);assert.equal(s.shots.length,0);assert.equal(s.hazards.length,0);}
// Satellite interception occurs at its real orbit point, never body-wide immunity.
const ward=(s)=>{cast(s);run(s,.45);return s.hazards.find(h=>h.kind==='frostWard');};
const shotAtWard=(s,h,extra={})=>{const a=h.angle+dt*2.8,q={owner:1,x:h.x+Math.cos(a)*h.r,y:h.y+Math.sin(a)*h.r,dx:0,dy:0,speed:0,life:1,damage:12,pierce:0,bounces:0,hit:new Set(),kind:'petal',...extra};s.shots.push(q);return q;};
{const s=fixture('frostguard'),f=s.fighters[0],h=ward(s);assert.equal(h.charges,2);assert.equal(f.inv,0);let q=shotAtWard(s,h);stepDuel(s,dt,{},{});assert.ok(q.wardSpent);assert.equal(h.charges,1);assert.equal(f.wardCold,1);q=shotAtWard(s,h);stepDuel(s,dt,{},{});assert.equal(h.charges,0);assert.equal(f.wardCold,2);assert.equal(s.hazards.filter(h=>h.kind==='frostWard').length,0);stepDuel(s,dt,{},{});assert.equal(f.wardCold,2,'dead projectile cannot refill');}
{const s=fixture('frostguard'),h=ward(s);const q=shotAtWard(s,h,{boss:true});stepDuel(s,dt,{},{});assert.equal(q.wardSpent,undefined);assert.equal(h.charges,2);assert.equal(s.fighters[0].wardCold,0);}
{const s=fixture('frostguard'),h=ward(s),f=s.fighters[0];s.shots.push({owner:1,x:f.x,y:f.y,dx:0,dy:0,speed:0,life:1,damage:12,pierce:0,bounces:0,hit:new Set(),kind:'petal'});stepDuel(s,dt,{},{});assert.equal(f.hp,f.maxHp-12);assert.equal(h.charges,2,'orbit gap lets a body contact pass');}
{const s=fixture('frostguard');cast(s);s.fighters[0].stun=.5;s.fighters[0].state='hit';run(s,.5);assert.equal(s.hazards.length,0);}
// Earned third hit -> bounded cold, cooldown-bypassing punish, fixed direction,
// genuine warning, ordinary guard/dodge counterplay, no freeze on guarded hit.
{const s=fixture('frostguard',15,10,16.6,10),f=s.fighters[0];f.combo=2;f.comboTime=1;cast(s,{attack:true});run(s,.4);assert.equal(f.wardCold,1);}
{const s=fixture('frostguard',15,10,16.6,10),f=s.fighters[0];run(s,.3,{}, {block:true});f.combo=2;f.comboTime=1;cast(s,{attack:true});run(s,.4,{}, {block:true});assert.equal(f.wardCold,0);}
{const s=fixture('frostguard',15,10,17,10),f=s.fighters[0];f.wardCold=3;f.wardColdTime=5;f.cd[0]=5;cast(s);assert.equal(f.wardCold,0);assert.equal(s.hazards[0].kind,'wardPunish');assert.ok(f.cd[0]>4.9);run(s,.2);assert.equal(s.fighters[1].hp,1000);run(s,.3);assert.equal(1000-s.fighters[1].hp,16);assert.ok(s.fighters[1].slow>0);}
{const s=fixture('frostguard',15,10,17,10),f=s.fighters[0];f.wardCold=3;f.wardColdTime=5;cast(s);s.fighters[1].y=14;run(s,.8);assert.equal(s.fighters[1].hp,1000);}
{const s=fixture('frostguard',15,10,17,10),f=s.fighters[0];run(s,.3,{}, {block:true});f.wardCold=3;f.wardColdTime=5;cast(s);run(s,.8,{}, {block:true});assert.ok(1000-s.fighters[1].hp<=3.2+.001);assert.equal(s.fighters[1].slow,0);}
{const s=fixture('frostguard'),f=s.fighters[0];f.wardCold=3;f.wardColdTime=.1;run(s,.2);assert.equal(f.wardCold,0);f.meter=100;cast(s,{ult:true});assert.equal(f.inv,0);assert.equal(s.hazards.length,2);assert.ok(s.hazards.every(h=>h.charges===3));run(s,4.5);assert.equal(s.hazards.length,0);}
for(const id of ['returnblade','frostguard']){const s=fixture(id);Object.assign(s.fighters[0],{bladeCast:10,bladeCatch:1,wardCold:3,wardColdTime:5});s.phase='roundEnd';s.ready=.01;stepDuel(s,.02,{},{});for(const key of ['bladeCast','bladeCatch','wardCold','wardColdTime'])assert.equal(s.fighters[0][key],0);}
for(const id of ['returnblade','frostguard']){const s=fixture(id);for(let i=0;i<1800;i++){s.fighters[0].cd=[0,0];stepDuel(s,dt,{skill1:true},{});assert.ok(s.shots.length<=64&&s.hazards.length<=32&&s.effects.length<=120);assert.ok(s.fighters.every(f=>Number.isFinite(f.hp+f.x+f.y)));}run(s,5);assert.equal(s.shots.length,0);assert.equal(s.hazards.length,0);}
const legacy={hero:'chainburst',updatedAt:20,cleared:Object.fromEntries(Array.from({length:26},(_,i)=>[`s${i+1}`,{losses:0,at:10}]))};assert.equal(nextStoryStage(legacy),27);let p=legacy;
for(const id of ['returnblade','frostguard']){const stage=DUEL_STORY_STAGES.find(v=>v.enemy===id),m=createDuel({player:id,enemy:id});Object.assign(m,{phase:'over',winner:0,wins:[2,1]});p=completeStoryMatch(p,stage,m,40+stage.number);assert.ok(p);}
assert.equal(Object.keys(mergeDuelStory(legacy,p).cleared).length,28);assert.equal(normalizeDuelStory(p).hero,'frostguard');
console.log('Duel bundle 03 passed: canonical recipes, actual outbound pierce/return legs, finite shared ult budget, orbit-point-only interception, boss exclusion, earned cold, guard/side escape, round reset, and preserved 26-to-28 story.');
