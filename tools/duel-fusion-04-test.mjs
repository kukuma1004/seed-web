import assert from 'node:assert/strict';
import {createDuel,stepDuel,duelAi,DUEL_CHARACTERS,DUEL_ORDER} from '../src/seed-duel-rules.js';
import {ALL_FORMS} from '../src/forms.js';
import {DUEL_STORY_STAGES,completeStoryMatch} from '../src/seed-duel-story.js';
import {normalizeDuelStory,mergeDuelStory,nextStoryStage} from '../src/seed-duel-story-progress.js';
import {batch04Ai,batch04DangerAi} from '../src/seed-duel-batch04.js';
const dt=1/60;
const fixture=(id,x=15,y=10,ox=20,oy=10)=>{const s=createDuel({player:id,enemy:'pierce',seed:17});s.phase='fight';Object.assign(s.fighters[0],{x,y,fx:1,fy:0});Object.assign(s.fighters[1],{x:ox,y:oy,fx:-1,fy:0,hp:1000,maxHp:1000});return s;};
const run=(s,sec,p={},e={})=>{for(let t=0;t<sec;t+=dt)stepDuel(s,dt,typeof p==='function'?p(t):p,typeof e==='function'?e(t):e);};
const cast=(s,p={skill1:true})=>stepDuel(s,dt,p,{});
assert.deepEqual(ALL_FORMS.collapse.requires,['gravity','burst']);assert.deepEqual(ALL_FORMS.thunderlance.requires,['pierce','chain']);
for(const id of ['collapse','thunderlance']){assert.equal(DUEL_CHARACTERS[id].comboId,id);assert.ok(DUEL_ORDER.includes(id));}
// Slow send, no impact damage, genuinely weak pull while movement/dodge/block
// stay available, fixed ending circle with a separate readable detonation.
{const s=fixture('collapse');cast(s);run(s,.3);assert.equal(s.shots.length,0);run(s,.2);assert.equal(s.shots[0].kind,'collapseSeed');assert.equal(s.fighters[1].hp,1000);run(s,.65);assert.equal(s.fighters[1].hp,1000);run(s,1);assert.equal(1000-s.fighters[1].hp,24);assert.equal(s.shots.length,0);assert.equal(s.hazards.length,0);}
{const s=fixture('collapse');cast(s);run(s,.9);const f=s.fighters[1],before=f.x;run(s,.1);assert.ok(before-f.x>0&&before-f.x<.15);assert.equal(f.hp,1000);assert.equal(f.slow,0);assert.ok(!['jailed','broken'].includes(f.state));}
{const s=fixture('collapse');cast(s);run(s,1.3);const h=s.hazards.find(h=>h.kind==='collapseBurst');assert.ok(h);const pos=[h.x,h.y];s.fighters[1].y=14;run(s,1);assert.deepEqual([h.x,h.y],pos);assert.equal(s.fighters[1].hp,1000);}
{const s=fixture('collapse');run(s,.3,{}, {block:true});cast(s);run(s,2.3,{}, {block:true});assert.ok(Math.abs(1000-s.fighters[1].hp-4.8)<1e-6);}
// Early release consumes one live projectile, maintains primary cooldown and
// gives an explicit0.38s final warning. It creates no extra overlapping seed.
{const s=fixture('collapse');cast(s);run(s,.8);assert.ok(s.shots.length);const cd=s.fighters[0].cd[0];cast(s,{skill2:true});const h=s.hazards.find(h=>h.kind==='collapseBurst');assert.ok(h&&h.arm>.35);assert.ok(s.shots.every(q=>q.life<=0));assert.ok(s.fighters[0].cd[0]<cd);assert.equal(s.fighters[0].inv,0);run(s,1);assert.ok(1000-s.fighters[1].hp<=24);}
{const s=fixture('collapse');cast(s,{skill2:true});assert.equal(s.fighters[0].state,'dash');assert.equal(s.fighters[0].inv,0);assert.equal(s.hazards.length,0);}
// Interrupts include the exact frame the tell becomes armed; no last-frame bypass.
for(const id of ['collapse','thunderlance']){const s=fixture(id);cast(s);const h=s.hazards[0];h.arm=.005;s.fighters[0].state='hit';s.fighters[0].stun=.1;stepDuel(s,dt,{},{});assert.equal(s.shots.length,0);}
// Earned finisher charge expires, changes geometry/startup rather than free casts,
// never grants an effect for a guarded strike.
for(const [id,key] of [['collapse','collapseCharge'],['thunderlance','thunderCharge']]){
 const s=fixture(id,15,10,16.5,10),f=s.fighters[0];f.combo=2;f.comboTime=1;cast(s,{attack:true});run(s,.45);assert.equal(f[key],1);s.fighters[1].x=23;run(s,.1);cast(s);assert.equal(f[key],0);assert.ok(id==='collapse'?s.hazards[0].burstR===1.9:s.hazards[0].arm<.32);
 const guarded=fixture(id,15,10,16.5,10),g=guarded.fighters[0];run(guarded,.3,{}, {block:true});g.combo=2;g.comboTime=1;cast(guarded,{attack:true});run(guarded,.45,{}, {block:true});assert.equal(g[key],0);
}
// Long real projectile, one pierced hit per target; only unguarded contact seeds
// delayed arcs from the actual hit point. Arcs do not track the fighter afterward.
{const s=fixture('thunderlance');cast(s);run(s,.4);assert.equal(s.shots.length,0);run(s,.38);assert.equal(1000-s.fighters[1].hp,15);const q=s.shots[0];assert.equal(q.kind,'thunderSpear');assert.equal(q.pierce,1);assert.ok(q.hit.has(1));const h=s.hazards.find(h=>h.kind==='thunderArc');assert.ok(h&&h.arm>0);const pos=[h.x,h.y,h.endX,h.endY];run(s,1);assert.equal(1000-s.fighters[1].hp,22);assert.deepEqual([h.x,h.y,h.endX,h.endY],pos);assert.equal(s.hazards.length,0);}
{const s=fixture('thunderlance');run(s,.3,{}, {block:true});cast(s);run(s,2,{}, {block:true});assert.ok(Math.abs(1000-s.fighters[1].hp-3)<1e-6);assert.equal(s.events.includes('thunderGround'),false);assert.equal(s.hazards.length,0);}
{const s=fixture('thunderlance');cast(s);s.fighters[1].y=14;run(s,2);assert.equal(s.fighters[1].hp,1000);assert.equal(s.events.includes('thunderGround'),false);}
// One grounding leaf redirects a fixed arc, is consumed and never clones chains.
// The warning includes the real muzzle lead, finite travel and contact width.
// At the former8-unit warning tip a stationary opponent could take an unseen hit.
{const s=fixture('thunderlance',15,10,23.9,10);cast(s);const h=s.hazards[0];assert.equal(h.endX,23.6);assert.ok(Math.abs(h.r-.2)<1e-9);s.difficulty='normal';let read=false;for(let n=0;n<20;n++)read=batch04DangerAi(s,s.fighters[1],{},dt)||read;assert.ok(read,'actual distal hit is inside the AI and human warning');run(s,2);assert.equal(1000-s.fighters[1].hp,22);}
{const s=fixture('thunderlance',15,10,20,10.53);cast(s);let read=false;for(let n=0;n<20;n++)read=batch04DangerAi(s,s.fighters[1],{},dt)||read;assert.ok(read,'grazing projectile contact is covered by warning width');run(s,2);assert.ok(s.fighters[1].hp<1000);}
{const s=fixture('thunderlance');cast(s,{skill2:true});const rod=s.hazards[0];assert.equal(rod.kind,'thunderRod');assert.equal(s.fighters[0].inv,0);Object.assign(rod,{x:20,y:11.5});run(s,.2);cast(s);run(s,.8);const arc=s.hazards.find(h=>h.kind==='thunderArc');assert.ok(arc);assert.equal(arc.endX,20);assert.equal(arc.endY,11.5);assert.equal(rod.t,0);run(s,2);assert.equal(s.hazards.length,0);}
// Pillar test sits directly on the line and blocks both spear and secondary arc.
{const s=fixture('thunderlance',8,6.2,13,6.2);cast(s);run(s,2);assert.equal(s.fighters[1].hp,1000);assert.equal(s.events.includes('thunderGround'),false);}
// Extra ultimate nodes share a hard per-cast contact budget, no recursion.
for(const [id,max] of [['collapse',35],['thunderlance',32]]){const s=fixture(id),f=s.fighters[0];f.meter=100;cast(s,{ult:true});assert.equal(f.inv,0);assert.equal(f.meter,0);run(s,3);assert.ok(1000-s.fighters[1].hp<=max);assert.ok(1000-s.fighters[1].hp>0);assert.equal(s.shots.length,0);assert.equal(s.hazards.length,0);}
// A finite reflection changes owner and doesn't become an infinite new cast.
for(const id of ['collapse','thunderlance']){const s=fixture(id);cast(s);run(s,.56);s.fighters[1].shield=2;run(s,3);assert.ok(s.events.includes('reflect'));assert.equal(s.shots.length,0);assert.equal(s.hazards.length,0);}
for(const id of ['collapse','thunderlance']){const s=fixture(id);Object.assign(s.fighters[0],{collapseCast:5,collapseCharge:1,collapseChargeTime:4,thunderCast:5,thunderCharge:1,thunderChargeTime:4});s.phase='roundEnd';s.ready=.01;stepDuel(s,.02,{},{});for(const key of ['collapseCast','collapseCharge','collapseChargeTime','thunderCast','thunderCharge','thunderChargeTime'])assert.equal(s.fighters[0][key],0);}
for(const id of ['collapse','thunderlance']){const s=fixture(id);for(let n=0;n<1800;n++){s.fighters[0].cd=[0,0];stepDuel(s,dt,{skill1:true},{});assert.ok(s.shots.length<=64&&s.hazards.length<=32&&s.effects.length<=120);assert.ok(s.fighters.every(f=>Number.isFinite(f.x+f.y+f.hp)));}run(s,6);assert.equal(s.hazards.length,0);assert.equal(s.shots.length,0);}
// AI actual engine first input can use both authored techniques without a free cast.
for(const id of ['collapse','thunderlance']){const s=fixture(id,15,10,19.5,10);assert.equal(duelAi(s,0,dt).skill1,true);cast(s,duelAi(s,0,dt));assert.ok(s.fighters[0].cd[0]>0);}
// AI release reads its own visible seed for a normal reaction interval, even
// when the opponent is not attacking. Skill2 remains a real cooldown action.
{const s=fixture('collapse');cast(s);run(s,.65);const q=s.shots[0],f=s.fighters[0],o=s.fighters[1];Object.assign(o,{x:q.x,y:q.y});let issued=false;
 for(let i=0;i<15;i++){const input={};batch04Ai(s,f,o,input,dt);if(i<10)assert.equal(Boolean(input.skill2),false);if(input.skill2){cast(s,input);issued=true;break;}}
 assert.ok(issued);assert.ok(f.cd[1]>0);assert.ok(s.hazards.some(h=>h.kind==='collapseBurst'&&h.arm>.35));}
// A human-readable fixed warning also lets any opposing bot leave the line
// after its reaction time, never instant prediction. Remote misses are ignored.
for(const kind of ['collapseBurst','thunderSend','thunderArc']){const s=fixture('pierce'),f=s.fighters[0];s.hazards.push({owner:1,kind,x:14,y:10,endX:20,endY:10,dx:1,dy:0,r:kind==='collapseBurst'?2:.2,arm:.5,t:1});
 for(let i=0;i<10;i++)assert.equal(batch04DangerAi(s,f,{},dt),false);let input={},read=false;for(let i=0;i<5;i++)read=batch04DangerAi(s,f,input,dt)||read;assert.ok(read);assert.ok(Number.isFinite(input.x+input.y));assert.equal(input.dodge,undefined);f.y=17;assert.equal(batch04DangerAi(s,f,{},dt),false);}
// Adjacent heavy retaliation uses real skill2 with no invulnerability, not
// an always-on dodge or extra button. Threat observation is supplied by host.
for(const id of ['collapse','thunderlance']){const s=fixture(id,15,10,17,10),f=s.fighters[0];s.fighters[1].state='heavy';s.ai[0].seen=.3;const input={};assert.ok(batch04Ai(s,f,s.fighters[1],input,dt));assert.equal(input.skill2,true);cast(s,input);assert.ok(f.cd[1]>0);assert.equal(f.inv,0);}
const legacy={hero:'frostguard',updatedAt:20,cleared:Object.fromEntries(Array.from({length:28},(_,i)=>[`s${i+1}`,{losses:0,at:10}]))};assert.equal(nextStoryStage(legacy),29);let p=legacy;
for(const id of ['collapse','thunderlance']){const stage=DUEL_STORY_STAGES.find(v=>v.enemy===id),m=createDuel({player:id,enemy:id});Object.assign(m,{phase:'over',winner:0,wins:[2,1]});p=completeStoryMatch(p,stage,m,40+stage.number);assert.ok(p);}
assert.equal(Object.keys(mergeDuelStory(legacy,p).cleared).length,30);assert.equal(normalizeDuelStory(p).hero,'thunderlance');
console.log('Bundle04 canonical recipes, interrupted slow compression, early-release warning, earned finishers, true pierced-hit chain with fixed arcs/cover/guard, finite reflection/ult, actual AI and28-to30 save/story passed.');
