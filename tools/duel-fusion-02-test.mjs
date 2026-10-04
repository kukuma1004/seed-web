import assert from 'node:assert/strict';
import {createDuel,stepDuel,duelAi,DUEL_CHARACTERS,DUEL_ORDER} from '../src/seed-duel-rules.js';
import {DEFENSE_CATALOG} from '../src/seed-defense-catalog.js';
import {DUEL_STORY_STAGES,completeStoryMatch} from '../src/seed-duel-story.js';
import {normalizeDuelStory,mergeDuelStory,nextStoryStage,storyUnlocked} from '../src/seed-duel-story-progress.js';
const dt=1/60;
const fixture=(id,x=15,y=10,bx=20,by=10)=>{const s=createDuel({player:id,enemy:'pierce',seed:53});s.phase='fight';Object.assign(s.fighters[0],{x,y,fx:1,fy:0});Object.assign(s.fighters[1],{x:bx,y:by,fx:-1,fy:0,hp:1000,maxHp:1000});return s;};
const run=(s,t,p={},e={})=>{for(let n=0;n<t;n+=dt)stepDuel(s,dt,p,e);};
const cast=(s,input={})=>stepDuel(s,dt,{skill1:true,aimX:1,aimY:0,...input},{});
for(const id of ['gravitymirror','chainburst']){assert.equal(DUEL_CHARACTERS[id].comboId,id);assert.equal(DEFENSE_CATALOG[id].kind,'fusion');assert.ok(DUEL_ORDER.includes(id));}
// Mirrors prepare in place and retain the original aim; central misses create no free well.
{const s=fixture('gravitymirror');cast(s);run(s,.3,{aimX:0,aimY:1,x:1});assert.equal(s.shots.length,0);assert.equal(s.fighters[0].x,15);run(s,.25);assert.equal(s.shots[0].dy,0);run(s,1.5);assert.equal(s.hazards.some(h=>h.kind==='mirrorAnchor'),false);assert.ok(1000-s.fighters[1].hp<=16);}
// A real guard or sidestep protects against the projectile without planting damage ticks.
{const s=fixture('gravitymirror');run(s,.3,{}, {block:true});cast(s);run(s,1.7,{}, {block:true});assert.ok(1000-s.fighters[1].hp<=16*.2+.001);}
{const s=fixture('gravitymirror');cast(s);s.fighters[1].y=13;run(s,2);assert.equal(s.fighters[1].hp,1000);}
// Correct pillar normal reverses the aimed core once. Pull is continuous and finite, not stun/teleport.
{const s=fixture('gravitymirror',21,6.2,22.1,7.5);cast(s);run(s,.65);const h=s.hazards.find(h=>h.kind==='mirrorAnchor');assert.ok(h);assert.equal(s.shots[0].bounces,0);assert.ok(s.shots[0].dx<0);const b=s.fighters[1];b.x=h.x;b.y=h.y+1.1;b.kx=b.ky=0;const y=b.y,hp=b.hp;run(s,.15);assert.ok(b.y<y&&y-b.y<.3);assert.equal(b.hp,hp);assert.equal(b.stun,0);run(s,2);assert.equal(s.hazards.length,0);assert.equal(s.shots.length,0);}
// Empty folding is a recoverable miss. A placed core yields one narrow, delayed, blockable return path.
{const s=fixture('gravitymirror');stepDuel(s,dt,{skill2:true},{});assert.equal(s.hazards.length,0);assert.equal(s.fighters[0].inv,0);}
{const s=fixture('gravitymirror',21,6.2,22,9);cast(s);run(s,.85);const h=s.hazards.find(h=>h.kind==='mirrorAnchor');assert.ok(h);Object.assign(s.fighters[1],{x:(h.x+21)/2,y:6.2,kx:0,ky:0});stepDuel(s,dt,{skill2:true},{});assert.ok(s.hazards.some(h=>h.kind==='mirrorFold'));const hp=s.fighters[1].hp;run(s,.2);assert.equal(s.fighters[1].hp,hp);run(s,.4);assert.ok(hp-s.fighters[1].hp<=14);run(s,2);assert.equal(s.hazards.length,0);}
// Four-button users can actually fold: primary re-press consumes a live anchor,
// preserves the original cooldown, and cannot fold repeatedly after spending it.
{const s=fixture('gravitymirror',21,6.2,22,9);cast(s);run(s,.85);assert.ok(s.hazards.some(h=>h.kind==='mirrorAnchor'));const cd=s.fighters[0].cd[0];cast(s);assert.ok(s.hazards.some(h=>h.kind==='mirrorFold'));assert.ok(s.fighters[0].cd[0]<cd);run(s,.6);cast(s);assert.equal(s.hazards.some(h=>h.kind==='mirrorTell'),false);}
// Windups are interrupted by actual combat hits, including the two-stage ultimate.
for(const id of ['gravitymirror','chainburst']){const s=fixture(id,15,10,16.5,10);cast(s);run(s,.23,{}, {attack:true});assert.ok(s.fighters[0].hp<s.fighters[0].maxHp);run(s,2);assert.equal(s.shots.length,0);assert.equal(s.hazards.filter(h=>h.kind!=='emberMark').length,0);assert.equal(s.events.includes(id==='gravitymirror'?'mirrorLaunch':'emberRelay'),false);}
{const s=fixture('gravitymirror',15,10,27,10);s.fighters[0].meter=100;cast(s,{skill1:false,ult:true});assert.equal(s.hazards.length,2);assert.equal(s.shots.length,0);run(s,.5);assert.equal(s.events.filter(x=>x==='mirrorLaunch').length,1);run(s,.33);assert.equal(s.events.filter(x=>x==='mirrorLaunch').length,2);run(s,3);assert.equal(s.hazards.length,0);}
// A connected finisher tags the fighter until placement, then locks the warning.
// The marker itself deals no damage or slow; movement/block/dodge remain valid.
{const s=fixture('chainburst',15,10,16.6,10);s.fighters[0].cd[0]=5;s.fighters[0].combo=2;s.fighters[0].comboTime=1;run(s,.15,{attack:true});const h=s.hazards.find(h=>h.kind==='emberMark');assert.ok(h);assert.ok(s.fighters[0].cd[0]<=.6);const old=h.x;s.fighters[1].x=21;run(s,.7);assert.ok(h.x>old+3);cast(s);const relay=s.hazards.find(h=>h.kind==='emberRelay');assert.ok(relay);assert.ok(relay.arm<=.3);const xy=[relay.endX,relay.endY];s.fighters[1].y=14;run(s,.5);assert.deepEqual([relay.endX,relay.endY],xy);run(s,4);assert.equal(s.hazards.length,0);}
{const s=fixture('chainburst',15,10,16.6,10);run(s,.3,{}, {block:true});s.fighters[0].combo=2;s.fighters[0].comboTime=1;run(s,.5,{attack:true}, {block:true});assert.equal(s.hazards.some(h=>h.kind==='emberMark'),false);}
// A mark/refund never carries into the next round.
{const s=fixture('chainburst');s.fighters[0].relayRefundUntil=90;s.fighters[0].relayCast=4;s.phase='roundEnd';s.ready=.01;run(s,.03);assert.equal(s.fighters[0].relayRefundUntil,0);assert.equal(s.fighters[0].relayCast,0);assert.equal(s.hazards.length,0);}
// Three hops activate in order, retain fixed points and share one beam/one explosion hit budget.
{const s=fixture('chainburst',15,10,18.5,10);cast(s);assert.equal(s.hazards.length,3);const points=s.hazards.map(h=>[h.x,h.y,h.endX,h.endY]);run(s,.4);assert.equal(s.fighters[1].hp,1000);run(s,.14);assert.equal(s.hazards.filter(h=>h.triggered).length,1);run(s,1.2);assert.ok(1000-s.fighters[1].hp<=16);assert.ok(s.events.includes('emberRelay'));run(s,2);assert.equal(s.hazards.length,0);assert.ok(points.every(p=>p.every(Number.isFinite)));}
{const s=fixture('chainburst',15,10,18.5,10);cast(s);s.fighters[1].y=14;run(s,2);assert.equal(s.fighters[1].hp,1000);}
{const s=fixture('chainburst',15,10,18.5,10);run(s,.3,{}, {block:true});cast(s);run(s,2,{}, {block:true});assert.ok(1000-s.fighters[1].hp<=16*.2+.01);}
{const s=fixture('chainburst',15,10,27,10);s.fighters[0].meter=100;cast(s,{skill1:false,ult:true});assert.equal(s.fighters[0].meter,0);assert.equal(s.hazards.length,3);assert.equal(s.fighters[1].hp,1000);run(s,.4);assert.equal(s.events.includes('emberRelay'),false);run(s,2);assert.equal(s.events.filter(v=>v==='emberRelay').length,3);assert.equal(s.hazards.length,0);}
// Genuine limits hold even under deliberate repeated cooldown resets.
for(const id of ['gravitymirror','chainburst']){const s=fixture(id,15,10,27,10);for(let i=0;i<1800;i++){s.fighters[0].cd=[0,0];stepDuel(s,dt,{skill1:true},{});assert.ok(s.shots.length<=64&&s.hazards.length<=32&&s.effects.length<=120);for(const f of s.fighters)assert.ok(Number.isFinite(f.x+f.y+f.hp));}run(s,4);assert.equal(s.shots.length,0);assert.equal(s.hazards.length,0);}
// The same UID keeps every old clear. Only a genuine won campaign match progresses new stages.
const legacy={hero:'frostnet',updatedAt:20,cleared:Object.fromEntries(Array.from({length:24},(_,i)=>[`s${i+1}`,{losses:0,at:10}]))};
assert.equal(nextStoryStage(legacy),25);let p=legacy;
for(const id of ['gravitymirror','chainburst']){const stage=DUEL_STORY_STAGES.find(s=>s.enemy===id),m=createDuel({player:id,enemy:id});Object.assign(m,{phase:'over',winner:0,wins:[2,1]});assert.ok(storyUnlocked(p,stage.number));const n=completeStoryMatch(p,stage,m,40+stage.number);assert.ok(n);assert.equal(n.hero,id);assert.equal(Object.keys(n.cleared).length,stage.number);assert.equal(completeStoryMatch(p,stage,{...m,practice:true}),null);p=n;}
const saved=mergeDuelStory(legacy,p);assert.equal(Object.keys(saved.cleared).length,26);assert.equal(normalizeDuelStory(saved).hero,'chainburst');
console.log('Duel fusion bundle 02: canonical recipes, finite mirror bounce/pull/fold, interrupted fixed relays, guard/escape, mark expiry, staggered ultimates, bounded resources, and 24-to-26 story preservation passed.');
