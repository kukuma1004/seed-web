import assert from 'node:assert/strict';
import {readFileSync,existsSync} from 'node:fs';
import {adventureObjective,adventureBossAction,adventureDoorScene} from '../src/adventure-wayfinding.js';
import {createAdventure,startAdventure,stepAdventure,adventureWalkable,adventureRoute} from '../src/seed-adventure-rules.js';
let enemies=0;
for(let act=0;act<3;act++)for(let seed=1;seed<=100;seed++){
 const s=createAdventure(seed);s.room=act*4;startAdventure(s,'slash','recall');const R=s.region;
 for(const e of s.enemies){enemies++;assert.ok(adventureWalkable(s,e.x,e.y,e.r*.8));assert.ok(R.obstacles.every(o=>Math.hypot(e.x-o.x,e.y-o.y)>=e.r+o.r-1e-8),`act${act} seed${seed} enemy${e.id} cannot spawn in cover`);}
 const original=JSON.stringify(s),goal=adventureObjective(s);assert.equal(goal.kind,'guards');assert.equal(goal.label,`출구 수호 무리 · ${s.enemies.filter(e=>e.guard).length}마리 남음`);assert.equal(JSON.stringify(s),original,'presentation does not advance RNG/save/run');
 for(let i=0;i<20;i++)adventureRoute(s,s.player,goal);assert.ok(R.flows.size<=11);
 for(const ev of R.events){ev.state='active';s.player.x=ev.x;s.player.y=ev.y;assert.equal(adventureObjective(s).kind,ev.type);assert.ok(adventureObjective(s).label.startsWith('선택 도전'));ev.state='done';}
 assert.equal(adventureObjective(s).kind,'guards','finished optional message cannot hide main objective');
 R.events[0].state='active';s.player.x=R.start.x;s.player.y=R.start.y;assert.equal(adventureObjective(s).kind,'guards','leaving optional challenge restores the main route');
 R.gate.open=true;assert.equal(adventureObjective(s).kind,'exit');s.phase='choice';assert.equal(adventureObjective(s),null);
}
// Trigger actual raid spawns near cover in all gardens; body placement must remain safe.
for(let act=0;act<3;act++){
 const s=createAdventure(5);s.room=act*4;startAdventure(s,'slash','recall');s.enemies=[];s.player.inv=1000;const raid=s.region.events.find(e=>e.type==='raid');s.player.x=raid.x;s.player.y=raid.y;
 stepAdventure(s,.01);assert.ok(s.enemies.some(e=>e.raid));
 for(const e of s.enemies)assert.ok(s.region.obstacles.every(o=>Math.hypot(e.x-o.x,e.y-o.y)>=e.r+o.r-1e-8));
}
assert.equal(adventureBossAction({tell:.1,tellKind:'pitch',charging:0}), 'pitch');
assert.equal(adventureBossAction({tell:0,tellKind:'',charging:.2}), 'charge');
assert.equal(adventureBossAction({tell:0,charging:0,beam:{t:1}}), 'beam');
assert.equal(adventureBossAction({tell:0,charging:0,beam:null}), '');
for(let act=0;act<3;act++)for(const room of ['combat','elite','treasure','shop','fountain','boss']){
 const file=adventureDoorScene({room},{act});assert.ok(existsSync(new URL('../public/assets/'+file,import.meta.url)));
 assert.ok(file.includes('garden'),'route scenes share the garden world');
}
const view=readFileSync(new URL('../src/seed-adventure-view.js',import.meta.url),'utf8');
assert.ok(!view.includes("load('paving'"),'unused436634-byte floor not downloaded');
assert.ok(!view.includes('vignette=ctx.createRadialGradient'),'unused Canvas vignette removed; existing CSS effect retained');
assert.ok(view.includes('frame.src')&&view.includes('g.files[0]'),'boss doorway uses cropped shipping guardian instead of old boss atlas');
console.log(`PASS Adventure300 map/${enemies}spawn-body audit, event/main route transitions, read-only objective, bounded path reuse, active boss hints and garden door art`);
