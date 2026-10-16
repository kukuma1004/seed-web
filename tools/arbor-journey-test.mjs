import assert from 'node:assert/strict';
import {ARBOR_ACT,ARBOR_ARENA,ARBOR_SECTORS,ARBOR_LIMITS,ARBOR_ROOT_TIMING,arborSectorMobQuota,createArborJourney,stepArborJourney,creditArborKill,advanceArborJourney,checkpointArborJourney,restoreArborJourney} from '../src/arbor-journey.js';
import {ARBOR_BOSS_LIMITS,createArborBoss,stepArborBoss,arborBossPatternName} from '../src/arbor-boss.js';

let checks=0;
const test=(name,body)=>{body();checks++;console.log(`PASS ${name}`);};
const clone=value=>JSON.parse(JSON.stringify(value));
const p={x:0,z:5};
function killPending(s,role=null){for(const a of [...s.pending])if(role===null||a.role===role)assert.equal(creditArborKill(s,a.id,a.role),true);}
function reachWarden(s){
 for(let i=0;i<2000&&s.phase==='skirmish';i++){
  stepArborJourney(s,.1,{player:p,alive:s.pending.length});killPending(s,'mob');
 }
 assert.equal(s.phase,'warden');assert.equal(s.pending.length,1);assert.equal(s.pending[0].role,'warden');
}
test('Act 6 keeps five actual wardens per boss and three bosses per clear',()=>{
 assert.equal(ARBOR_ACT.wardensPerBoss,5);assert.equal(ARBOR_ACT.bossesToClear,3);
 assert.equal(ARBOR_ARENA.halfWidth*2,28);assert.equal(ARBOR_ARENA.halfDepth*2,24);
 assert.equal(ARBOR_ARENA.shape,'rect');assert.equal(ARBOR_LIMITS.roots,4);assert.ok(ARBOR_SECTORS.every(s=>s.roots.length===4));
 assert.equal(ARBOR_SECTORS.length,5);assert.equal(new Set(ARBOR_SECTORS.map(s=>JSON.stringify(s.roots))).size,5);
});
test('opening pressure, safe entries and no background catch-up',()=>{
 for(const player of [p,{x:-13.5,z:-11.5},{x:13.5,z:11.5},{x:-13.5,z:11.5},{x:13.5,z:-11.5}]){
  const s=createArborJourney(),out=stepArborJourney(s,999,{player});assert.equal(out.spawns.length,2);assert.equal(s.time,.1);
  for(const a of out.spawns){assert.ok(Math.hypot(a.x-player.x,a.z-player.z)>=4);assert.ok(Math.abs(a.x)<=13&&Math.abs(a.z)<=11);}
 }
 const s=createArborJourney(),before=checkpointArborJourney(s),out=s.out;
 for(const dt of [0,-1,NaN,Infinity,undefined]){assert.equal(stepArborJourney(s,dt),out);assert.deepEqual(checkpointArborJourney(s),before);}
});
test('strict live, projectile and per-step caps spend only accepted packets',()=>{
 let s=createArborJourney();assert.equal(stepArborJourney(s,.1,{alive:12}).spawns.length,0);assert.equal(s.spawnIndex,0);
 s=createArborJourney();assert.equal(stepArborJourney(s,.1,{alive:11}).spawns.length,1);assert.equal(s.spawnIndex,1);
 s=createArborJourney();assert.equal(stepArborJourney(s,.1,{projectiles:48}).spawns.length,0);assert.equal(s.spawnIndex,0);
 for(let i=0;i<10000;i++){const out=stepArborJourney(s,.1,{alive:s.pending.length});assert.ok(out.spawns.length<=2);assert.ok(s.pending.length<=12);}
 assert.equal(s.pending.length,12);assert.equal(s.phase,'skirmish');assert.equal(s.wardens,0);
});
test('timers, unissued IDs, wrong roles and repeated receipts cannot award progress',()=>{
 const s=createArborJourney();for(let i=0;i<10000;i++)stepArborJourney(s,.1,{alive:s.pending.length});
 assert.equal(s.phase,'skirmish');assert.equal(s.wardens,0);assert.equal(advanceArborJourney(s),false);
 assert.equal(creditArborKill(s,'arbor:r0:s0:w','warden'),false);
 assert.equal(creditArborKill(s,s.pending[0].id,'boss'),false);
 const id=s.pending[0].id;assert.equal(creditArborKill(s,id,'mob'),true);assert.equal(creditArborKill(s,id,'mob'),false);
 reachWarden(s);for(let i=0;i<10000;i++)stepArborJourney(s,.1,{alive:1});
 assert.equal(s.phase,'warden');assert.equal(s.wardens,0);assert.equal(s.bossWins,0);
 assert.equal(creditArborKill(s,'arbor:r0:b','boss'),false);assert.equal(advanceArborJourney(s),false);
});
test('15 real warden receipts and 3 boss receipts complete a finite 288-actor CPU host',()=>{
 const s=createArborJourney(),roots=s.roots,root0=s.roots[0],spawns=[],phaseEntries=[];
 let frames=0,previousPhase=s.phase;
 while(s.phase!=='complete'&&frames<40000){
  const player={x:Math.sin(frames*.013)*10,z:Math.cos(frames*.017)*8};
  const out=stepArborJourney(s,.05,{player,alive:s.pending.length});spawns.push(...out.spawns.map(a=>({...a})));
  assert.ok(out.spawns.length<=2);assert.ok(s.pending.length<=12);
  if(frames%5===0)killPending(s,'mob');
  if(frames%13===0)killPending(s,'warden');
  if(frames%19===0)killPending(s,'boss');
  if(s.phase==='cleared'){
   if(s.lastClear==='warden'&&s.sector===4)assert.equal(s.wardens,(s.round+1)*5);
   assert.equal(advanceArborJourney(s),true);
  }
  if(previousPhase!==s.phase){phaseEntries.push(s.phase);previousPhase=s.phase;}
  assert.equal(s.roots,roots);assert.equal(s.roots[0],root0);
  if(frames%47===0){const raw=checkpointArborJourney(s),restored=restoreArborJourney(clone(raw));assert.ok(restored);assert.deepEqual(checkpointArborJourney(restored),raw);}
  frames++;
 }
 assert.equal(s.phase,'complete');assert.equal(s.wardens,15);assert.equal(s.bossWins,3);
 assert.equal(s.killIds.length,288);assert.equal(new Set(s.killIds).size,288);assert.equal(spawns.length,288);
 assert.equal(spawns.filter(a=>a.role==='mob').length,270);assert.equal(spawns.filter(a=>a.role==='warden').length,15);assert.equal(spawns.filter(a=>a.role==='boss').length,3);
 assert.equal(s.pending.length,0);assert.ok(phaseEntries.includes('boss'));assert.equal(advanceArborJourney(s),false);
 assert.ok(restoreArborJourney(checkpointArborJourney(s)));console.log(`  CPU receipts: ${frames} frames, 270 mobs + 15 wardens + 3 bosses; not natural/device play`);
});
test('checkpoint resume preserves pending actors, future packets, roots and RNG exactly',()=>{
 const a=createArborJourney();for(let i=0;i<55;i++){stepArborJourney(a,.05,{player:p,alive:a.pending.length});if(i%8===0&&a.pending[0])creditArborKill(a,a.pending[0].id,a.pending[0].role);}
 const raw=clone(checkpointArborJourney(a)),b=restoreArborJourney(raw);assert.ok(b);assert.ok(b.pending.length>0);
 for(let i=0;i<1500;i++){
  const input={player:{x:Math.sin(i*.07)*11,z:Math.cos(i*.04)*9},alive:a.pending.length,projectiles:i%20};
  const x=stepArborJourney(a,.04,input),y=stepArborJourney(b,.04,input);assert.deepEqual(y,x);
  if(i%7===0){killPending(a);killPending(b);}
  if(a.phase==='cleared'){assert.equal(advanceArborJourney(a),advanceArborJourney(b));}
  assert.deepEqual(checkpointArborJourney(a),checkpointArborJourney(b));
 }
 raw.pending[0].x=900;assert.notEqual(b.pending[0]?.x,900);
});
test('later rounds strengthen the same roles while quotas stay finite at 12 through 24',()=>{
 const s=createArborJourney(),opening=[],wardens=[],bosses=[];
 for(let guard=0;guard<20000&&s.phase!=='complete';guard++){
  const out=stepArborJourney(s,.1,{player:p,alive:s.pending.length});
  for(const a of out.spawns){if(a.role==='mob'&&a.id.endsWith(':s0:m0'))opening.push({...a});if(a.role==='warden'&&s.sector===0)wardens.push({...a});if(a.role==='boss')bosses.push({...a});}
  killPending(s);if(s.phase==='cleared')advanceArborJourney(s);
 }
 for(const group of [opening,wardens,bosses]){assert.equal(group.length,3);assert.ok(group[2].hp>group[1].hp&&group[1].hp>group[0].hp);assert.ok(group[2].damage>group[0].damage);}
 assert.equal(arborSectorMobQuota(0,0),12);assert.equal(arborSectorMobQuota(2,4),24);
 assert.ok(opening[2].speed>opening[0].speed);
});
test('malformed skips, forged stats, duplicate receipts and inconsistent roots reject restore',()=>{
 const fresh=checkpointArborJourney(createArborJourney());
 const mutations=[
  r=>{r.phase='boss';},r=>{r.round=2;},r=>{r.sector=4;},r=>{r.wardens=5;},r=>{r.bossWins=3;},r=>{r.phase='complete';},
  r=>{r.version=2;},r=>{r.seed=0;},r=>{r.seed++;},r=>{r.time=NaN;},r=>{r.sectorTime=2;},r=>{r.spawnIndex=4;},
  r=>{r.pending.push({});},r=>{r.killIds.push('arbor:r2:b');r.kills=1;},r=>{r.roots[0].x++;},r=>{r.roots[0].active=true;},r=>{r.roots[0].t=100;}
 ];
 for(const mutation of mutations){const raw=clone(fresh);mutation(raw);assert.equal(restoreArborJourney(raw),null);}
 const active=createArborJourney();stepArborJourney(active,.1,{player:p});const raw=checkpointArborJourney(active);
 for(const mutation of [r=>{r.pending[0].hp=1;},r=>{r.pending[0].role='boss';},r=>{r.pending[0].type='shield';},r=>{r.pending.push({...r.pending[0]});},r=>{r.killIds.push(r.pending[0].id);r.kills=1;}]){
  const invalid=clone(raw);mutation(invalid);assert.equal(restoreArborJourney(invalid),null);
 }
 assert.equal(createArborJourney({}),null);assert.equal(restoreArborJourney(null),null);
});
test('roots visibly warn, defer rise around player and retain stable allocation',()=>{
 const s=createArborJourney(),root=s.roots[0],rootArray=s.roots;
 for(let i=0;i<31;i++)stepArborJourney(s,.1,{player:{x:root.x,z:root.z},alive:12});
 assert.equal(root.phase,'warn');assert.equal(root.active,false);
 for(let i=0;i<200;i++)stepArborJourney(s,.1,{player:{x:root.x,z:root.z},alive:12});
 assert.equal(root.phase,'warn');assert.equal(root.t,0);assert.equal(root.active,false);
 stepArborJourney(s,.1,{player:p,alive:12});assert.equal(root.phase,'active');assert.equal(root.active,true);assert.equal(root.t,ARBOR_ROOT_TIMING.active);
 for(let i=0;i<42;i++)stepArborJourney(s,.1,{player:p,alive:12});assert.equal(root.phase,'lower');assert.equal(root.active,false);
 assert.equal(s.roots,rootArray);assert.equal(s.roots[0],root);
 const warned=createArborJourney();let elapsed=0,started=null;
 for(let i=0;i<100;i++){
  const out=stepArborJourney(warned,.05,{player:p,alive:12});elapsed+=.05;
  if(out.events.some(e=>e.type==='root-warn'&&e.id===warned.roots[0].id))started=elapsed;
  if(out.events.some(e=>e.type==='root-rise'&&e.id===warned.roots[0].id)){assert.ok(elapsed-started>=ARBOR_ROOT_TIMING.warn-1e-7);break;}
 }
});
test('all five fully raised root layouts keep every walkable grid cell connected',()=>{
 for(const sector of ARBOR_SECTORS){
  const open=new Set();for(let x=-13;x<=13;x++)for(let z=-11;z<=11;z++){
   if(!sector.roots.some(r=>Math.abs(x-r.x)<r.w/2+.4&&Math.abs(z-r.z)<r.d/2+.4))open.add(`${x},${z}`);
  }
  const first=open.values().next().value,seen=new Set([first]),queue=[first];
  for(let i=0;i<queue.length;i++){
   const [x,z]=queue[i].split(',').map(Number);for(const [dx,dz] of [[1,0],[-1,0],[0,1],[0,-1]]){const key=`${x+dx},${z+dz}`;if(open.has(key)&&!seen.has(key)){seen.add(key);queue.push(key);}}
  }
  assert.equal(seen.size,open.size,sector.name);
 }
});
test('boss locks fan aim, warns every root hit and exposes a real recovery window',()=>{
 const s=createArborBoss();let locked=null,fanTell=0,fanShots=0,rootTells=0,rootHits=0,open=0,lastKind=null;
 for(let i=0;i<5000&&s.cycles<1;i++){
  const player={x:i%100<50?8:-8,z:3},out=stepArborBoss(s,.02,{player});
  if(out.cue?.kind==='fan'){
   if(!locked)locked={...out.cue.direction};assert.deepEqual(out.cue.direction,locked);fanTell+=.02;
  }
  if(out.bolts.length){fanShots+=out.bolts.length;assert.ok(fanTell>=.88-.021);}
  if(out.cue?.kind==='root'&&lastKind!=='root')rootTells++;
  if(out.zones.length){rootHits++;assert.equal(out.zones.length,1);assert.ok(out.cue?.kind==='root');assert.ok(out.zones[0].radius<=1.7);lastKind=null;}
  else lastKind=out.cue?.kind||null;
  if(s.coreOpen){open+=.02;assert.equal(s.phase,'recover');}
 }
 assert.ok(fanShots>=5);assert.equal(rootHits,3);assert.ok(rootTells>=3);assert.ok(open>=5);assert.ok(s.cycles>=1);assert.equal(typeof arborBossPatternName(s),'string');
});
test('boss pursuits cross-map targets, changes phases, obeys caps and never catches up',()=>{
 const s=createArborBoss(2),start={...s.position};for(let i=0;i<300;i++)stepArborBoss(s,.02,{player:{x:13,z:11}});
 assert.ok(Math.hypot(s.position.x-start.x,s.position.z-start.z)>2);
 s.hp=s.maxHp*.2;let bolts=0,zones=0;
 for(let i=0;i<7000;i++){
  const active=i%2===0?48:46,out=stepArborBoss(s,.02,{player:p,projectiles:active});
  assert.ok(out.bolts.length<=ARBOR_BOSS_LIMITS.boltsPerStep);assert.ok(out.bolts.length+active<=48);assert.ok(out.zones.length<=1);bolts+=out.bolts.length;zones+=out.zones.length;
 }
 assert.equal(s.phaseIndex,2);assert.ok(zones>0);
 const paused=createArborBoss(),timer=paused.timer;for(const dt of [0,-1,NaN,Infinity]){assert.equal(stepArborBoss(paused,dt).bolts.length,0);assert.equal(paused.timer,timer);}
 stepArborBoss(paused,100000);assert.ok(paused.timer>=timer-.1-1e-8);assert.equal(paused.out.bolts.length,0);
 paused.hp=0;assert.equal(stepArborBoss(paused,.1).zones.length,0);assert.equal(paused.phase,'dead');
 const enduring=createArborBoss();for(let i=0;i<30000&&enduring.phaseIndex<1;i++)stepArborBoss(enduring,.05,{player:p});assert.ok(enduring.phaseIndex>=1);assert.equal(enduring.hp,enduring.maxHp);
 console.log(`  Bounded boss CPU output: ${bolts} bolts / ${zones} warned zones; no browser/device claim`);
});
test('each root strike hits its warned location and saturated fans never queue a delayed volley',()=>{
 const s=createArborBoss();let lastRoot=null,hits=0,blockedFan=false;
 for(let i=0;i<4000&&hits<3;i++){
  const player={x:Math.sin(i*.09)*7,z:Math.cos(i*.07)*6},out=stepArborBoss(s,.02,{player,projectiles:48});
  assert.equal(out.bolts.length,0);
  if(out.cue?.kind==='fan'&&out.cue.remaining===0)blockedFan=true;
  if(out.cue?.kind==='root')lastRoot={...out.cue.position};
  if(out.zones.length){assert.deepEqual(out.zones[0].position,lastRoot);hits++;}
  if(s.phase==='recover'&&s.pattern===0){const next=stepArborBoss(s,.02,{player,projectiles:0});assert.equal(next.bolts.length,0);}
 }
 assert.equal(hits,3);assert.equal(blockedFan,true);
});
console.log(`arbor-journey: ${checks} checks passed`);
