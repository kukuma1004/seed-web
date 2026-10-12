import assert from 'node:assert/strict';
import {createAdventure,startAdventure,adventureRoute,adventureWalkable,ADVENTURE_ACTS,ADVENTURE_BOSSES,adventureCheckpoint,restoreAdventure,chooseAdventureDoor,stepAdventure} from '../src/seed-adventure-rules.js';
for(let act=0;act<3;act++)for(let seed=1;seed<=40;seed++){
 const s=createAdventure(seed);s.room=act*4;startAdventure(s,'slash','recall');const R=s.region;
 assert.ok(R&&R.pathWidth>=3.4&&R.w===54&&R.h===38);
 assert.ok(R.obstacles.length>0&&R.trees.length<=64&&s.enemies.length<=64);
 assert.equal(new Set(R.events.map(e=>e.type)).size,2);
 adventureRoute(s,R.start,R.gate);const f=R.flows.values().next().value;
 const reachable=(x,y)=>{for(let dy=-1;dy<=1;dy++)for(let dx=-1;dx<=1;dx++){const cx=Math.floor(x)+dx,cy=Math.floor(y)+dy;if(cx>=0&&cy>=0&&cx<f.cols&&cy<f.rows&&f.dist[cy*f.cols+cx]>=0)return true;}return false;};
 for(const n of R.nodes)assert.ok(reachable(n.x,n.y),`seed ${seed} act ${act} ${n.role} connected after cover placement`);
 for(const ev of R.events)assert.ok(reachable(ev.x,ev.y));
 assert.ok(adventureWalkable(s,R.gate.x,R.gate.y,.4));
 assert.ok(s.enemies.every(e=>['hound','caster','shield'].includes(e.art)),'all acts share garden creature silhouettes');
 const guard=s.enemies.find(e=>e.guard);assert.ok(guard&&reachable(guard.x,guard.y));
}
// Existing version-1 door saves transition into the new gardens; no terrain in account schema.
for(let room of [3,7]){
 const s=createAdventure(17);startAdventure(s,'slash','recall');s.room=room;s.phase='doors';s.doors=[{room:'combat',reward:'law'}];s.bossesDefeated=(room+1)/4;
 s.bossEpochs=Object.fromEntries(Array.from({length:s.bossesDefeated},(_,a)=>[a,'epoch-test-'+a]));
 const cp=adventureCheckpoint(s),restored=restoreAdventure(JSON.stringify(cp));assert.ok(restored);
 assert.equal(cp.version,1);assert.ok(!Object.hasOwn(cp,'region'));assert.equal(restored.runId,s.runId);
 assert.deepEqual(restored.bossEpochs,s.bossEpochs);assert.ok(chooseAdventureDoor(restored,0));assert.equal(restored.region.theme,room===3?'blossom-terrace':'moonroot-sanctuary');
}
assert.deepEqual(ADVENTURE_ACTS.map(a=>a.boss),['austin','alwaysbeginner','tempestcarrier']);
assert.deepEqual(Object.values(ADVENTURE_BOSSES).map(b=>b.hp),[3500,5600,14000]);
// A sidestep during windup must not cause a 90-degree unannounced retarget at release.
for(const [room,kind] of [[3,'punches'],[7,'pitch'],[11,'beam']]){
 const s=createAdventure(17);s.room=room;startAdventure(s,'slash','recall');const e=s.enemies[0];
 s.player.x=12;s.player.y=10;s.player.inv=100;e.tx=18;e.ty=6;e.tell=.001;e.tellKind=kind;
 stepAdventure(s,.001);
 if(kind==='beam')assert.equal(e.beam.a,-1.3);else{const mid=s.shots.filter(b=>b.boss).find(b=>Math.abs(b.dy)<1e-9);assert.ok(mid&&mid.dx===1,'central projectile follows warned target');}
}
console.log('PASS 120 generated host gardens, obstacles/routes, legacy door save and guardian telegraph direction');
