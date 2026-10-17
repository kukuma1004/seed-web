import assert from 'node:assert/strict';
import {
 ARBOR_ARENA,ARBOR_SECTORS,ARBOR_LIMITS,ARBOR_ROOM_CIRCUIT_ARENA,ARBOR_ROOM_CIRCUIT_LIMITS,
 ARBOR_ROOM_CIRCUIT_MAX_KILLS,arborSectorMobQuota,arborRoomMobQuota,arborRoomCircuitMaxKills,arborRunMaxKills,
 arborRoomIndex,arborRoomLayoutIndex,arborArenaFor,createArborJourney,stepArborJourney,creditArborKill,
 advanceArborJourney,checkpointArborJourney,restoreArborJourney
} from '../src/arbor-journey.js';

const clone=value=>JSON.parse(JSON.stringify(value));
const fresh=()=>createArborJourney(null,{roomCircuit:true});
const states={entries:[],normalClears:[],warden:null,bossEntry:null,boss:null,complete:null};
let tests=0,roundtrips=0,maxWorldBytes=0,maxEntryBytes=0;
const test=(name,body)=>{body();tests++;console.log(`PASS ${name}`);};
function roundtrip(s){
 const raw=checkpointArborJourney(s),bytes=JSON.stringify(raw),restored=restoreArborJourney(clone(raw));
 assert(restored,`canonical ${s.round}/${s.sector}/${arborRoomIndex(s)} ${s.phase} must restore`);
 assert.equal(JSON.stringify(checkpointArborJourney(restored)),bytes);
 assert.equal(JSON.stringify(checkpointArborJourney(createArborJourney(clone(raw)))),bytes);
 maxWorldBytes=Math.max(maxWorldBytes,Buffer.byteLength(bytes));
 const entry={version:1,kind:'arbor-room-entry',owner:'engine-fixture-owner',id:'engine-fixture-run',revision:200,savedAt:1,world:raw,
  run:{version:1,cycle:s.round,region:'garden',stage:s.sector,mode:'entry',hp:100,kills:s.kills,elapsed:s.time,rules:[],mutated:[],forms:{},levels:{},inventory:{potion:3,tonic:2,wind:1,shell:0,sprout:0},score:s.kills*25,choicesTaken:0,choiceKills:0,wardens:s.wardens,austins:s.bossWins}};
 const entryBytes=Buffer.byteLength(JSON.stringify(entry));maxEntryBytes=Math.max(maxEntryBytes,entryBytes);
 assert(entryBytes<100000,'a completed receipt ledger fits the existing 100 KB entry envelope');roundtrips++;return raw;
}
function reject(raw,mutations){
 for(const mutate of mutations){const bad=clone(raw);mutate(bad);assert.equal(restoreArborJourney(bad),null,mutate.toString());}
}
function creditPending(s){
 for(const a of [...s.pending]){
  assert.equal(creditArborKill(s,a.id,a.role==='mob'?'boss':'mob'),false,'a wrong role cannot consume a receipt');
  assert.equal(creditArborKill(s,a.id,a.role),true);
  assert.equal(creditArborKill(s,a.id,a.role),false,'a duplicate receipt cannot award another kill');
 }
}

test('legacy default checkpoint bytes and opt-in restoration remain separate',()=>{
 const expected={version:1,encounterVersion:2,act:'arbor',round:0,sector:0,phase:'skirmish',wardens:0,bossWins:0,time:0,sectorTime:0,
  initialSeed:27152,seed:27152,spawnIndex:0,spawnClock:0,kills:0,wardenSpawned:false,bossSpawned:false,lastClear:null,
  roots:[{id:'arbor-root-0',x:-5,z:1,w:3.4,d:1,phase:'rest',t:3,active:false},
   {id:'arbor-root-1',x:4,z:-3,w:3.4,d:1,phase:'rest',t:3.35,active:false},
   {id:'arbor-root-2',x:-5,z:-6,w:1,d:3,phase:'rest',t:3.7,active:false},
   {id:'arbor-root-3',x:6,z:5,w:1,d:3,phase:'rest',t:4.05,active:false}],pending:[],killIds:[]};
 const bytes=JSON.stringify(expected);
 assert.equal(JSON.stringify(checkpointArborJourney(createArborJourney())),bytes);
 assert.equal(JSON.stringify(checkpointArborJourney(createArborJourney(clone(expected),{roomCircuit:true}))),bytes,'options cannot promote a legacy checkpoint');
 delete expected.encounterVersion;
 assert.equal(JSON.stringify(checkpointArborJourney(restoreArborJourney(expected))),JSON.stringify(expected),'the original encounter grammar also remains canonical');
 const old=createArborJourney(),next=fresh();assert.equal(arborArenaFor(old),ARBOR_ARENA);assert.equal(arborArenaFor(next),ARBOR_ROOM_CIRCUIT_ARENA);
 assert.equal(ARBOR_LIMITS.enemies,12);assert.equal(ARBOR_ROOM_CIRCUIT_LIMITS.enemies,14);
 assert.equal(arborSectorMobQuota(0,0),12);assert.equal(arborSectorMobQuota(2,4),24);
 assert.deepEqual([0,1,2].map(round=>arborRunMaxKills(round)),[86,182,288]);
 assert.deepEqual(ARBOR_ROOM_CIRCUIT_MAX_KILLS,[456,952,1488]);
 assert.deepEqual([0,1,2].map(round=>arborRoomCircuitMaxKills(round)),[456,952,1488]);
 assert.equal(arborRunMaxKills(2,{roomCircuit:true}),1488);
 assert(Object.isFrozen(ARBOR_ROOM_CIRCUIT_ARENA)&&Object.isFrozen(ARBOR_ROOM_CIRCUIT_ARENA.polygon)&&Object.isFrozen(ARBOR_ROOM_CIRCUIT_LIMITS));
 assert.equal(ARBOR_ROOM_CIRCUIT_ARENA.halfWidth,18);assert.equal(ARBOR_ROOM_CIRCUIT_ARENA.halfDepth,15);
});

test('all 75 rooms earn 15 distinct wardens and 3 bosses with canonical entrances and clears',()=>{
 const s=fresh(),rootArray=s.roots,roots=[...s.roots],out=s.out,arena=arborArenaFor(s),ids=new Set();
 let normalRooms=0,wardenRooms=0,bosses=0,mobs=0;
 for(let round=0;round<3;round++){
  for(let sector=0;sector<5;sector++)for(let room=0;room<5;room++){
   assert.equal(s.round,round);assert.equal(s.sector,sector);assert.equal(arborRoomIndex(s),room);assert.equal(s.phase,'skirmish');
   assert.equal(s.wardens,round*5+sector);assert.equal(s.bossWins,round);
   assert.equal(s.spawnIndex,0);assert.equal(s.pending.length,0);
   const entry=roundtrip(s);states.entries.push(entry);
   assert.deepEqual(s.roots.map(({x,z,w,d})=>({x,z,w,d})),ARBOR_SECTORS[(sector+room)%5].roots);
   const quota=arborRoomMobQuota(round,sector,room),before=s.kills;let spawned=0,frames=0;
   while(s.phase!=='cleared'&&frames++<2000){
    const player={x:Math.sin(frames*.13)*16.8,z:Math.cos(frames*.17)*13.8};
    const output=stepArborJourney(s,.1,{player,alive:s.pending.length});assert.equal(output,out);assert(output.spawns.length<=2);assert(s.pending.length<=14);
    for(const actor of output.spawns){
     assert(!ids.has(actor.id));ids.add(actor.id);assert(actor.id.includes(`:p${room}:`));spawned++;
     if(room<4){assert.equal(actor.role,'mob');mobs++;}else{assert.equal(actor.role,'warden');states.warden??=roundtrip(s);}
    }
    if(frames%17===0||room===4)roundtrip(s);
    creditPending(s);
   }
   assert(frames<2000);assert.equal(s.lastClear,room<4?'room':'warden');assert.equal(spawned,room<4?quota:1);
   assert.equal(s.kills-before,room<4?quota:1);assert.equal(s.wardens,round*5+sector+(room===4?1:0));
   const cleared=roundtrip(s);if(room<4){normalRooms++;states.normalClears.push(cleared);}else wardenRooms++;
   assert.equal(advanceArborJourney(s),true);
   assert.equal(s.roots,rootArray);for(let i=0;i<roots.length;i++)assert.equal(s.roots[i],roots[i]);assert.equal(arborArenaFor(s),arena);
  }
  assert.equal(s.phase,'boss');assert.equal(s.wardens,(round+1)*5);assert.equal(s.circuit.room,4);assert.equal(s.sector,4);
  states.bossEntry??=roundtrip(s);
  const output=stepArborJourney(s,.1,{player:{x:17,z:14},alive:0});assert.equal(output.spawns.length,1);const boss=output.spawns[0];
  assert.equal(boss.role,'boss');assert.equal(boss.id,`arbor:r${round}:s4:p4:b`);assert(!ids.has(boss.id));ids.add(boss.id);
  states.boss??=roundtrip(s);creditPending(s);bosses++;
  assert.equal(s.bossWins,round+1);assert.equal(s.kills,ARBOR_ROOM_CIRCUIT_MAX_KILLS[round]);roundtrip(s);
  if(round<2){assert.equal(s.phase,'cleared');assert.equal(advanceArborJourney(s),true);}else{assert.equal(s.phase,'complete');assert.equal(advanceArborJourney(s),false);}
 }
 states.complete=roundtrip(s);
 assert.equal(normalRooms,60);assert.equal(wardenRooms,15);assert.equal(bosses,3);assert.equal(mobs,1470);assert.equal(s.kills,1488);assert.equal(ids.size,1488);
 assert.equal(s.pending.length,0);assert.equal(s.killIds.length,1488);assert.equal(states.entries.length,75);
 assert.equal(states.normalClears.length,60);assert.equal(s.wardens,15);assert.equal(s.bossWins,3);
 console.log(JSON.stringify({normalRooms,wardenRooms,bosses,mobs,killMaxima:ARBOR_ROOM_CIRCUIT_MAX_KILLS,maxWorldBytes,maxEntryBytes,roundtrips}));
});

test('skipped rooms, forged progress, receipt identities, statistics and RNG never restore',()=>{
 const initial=states.entries[0];
 reject(initial,[r=>r.circuit=null,r=>r.circuit=[],r=>r.circuit.version=2,r=>r.circuit.room=-1,r=>r.circuit.room=5,r=>r.circuit.room=.5,r=>r.circuit.extra=true,
  r=>r.circuit.room=1,r=>r.circuit.room=4,r=>r.sector=1,r=>r.round=1,r=>r.wardens=1,r=>r.bossWins=1,r=>r.phase='boss',r=>r.phase='complete',
  r=>{r.phase='cleared';r.lastClear='room';},r=>r.wardenSpawned=true,r=>r.bossSpawned=true,r=>r.spawnIndex=1,r=>r.seed++,r=>r.encounterVersion=1,
  r=>{r.killIds=Array.from({length:1489},(_,i)=>`unknown-${i}`);r.kills=r.killIds.length;}]);
 reject(states.normalClears[0],[r=>r.circuit.room=2,r=>r.sector=1,r=>r.lastClear='warden',r=>r.wardenSpawned=true,
  r=>{r.killIds.pop();r.kills--;},r=>{r.killIds.push(r.killIds[0]);r.kills++;},r=>r.seed++,r=>r.roots[0].x++,r=>r.roots[0].active=!r.roots[0].active]);
 reject(states.warden,[r=>r.circuit.room=3,r=>r.pending[0].id='arbor:r0:s0:w',r=>r.pending[0].role='boss',r=>r.pending[0].hp++,
  r=>r.pending[0].speed++,r=>r.pending[0].damage++,r=>r.pending[0].x=18,r=>r.pending[0].z=15,r=>r.wardenSpawned=false,
  r=>{r.pending.push(clone(r.pending[0]));},r=>{r.phase='cleared';r.lastClear='warden';},r=>{r.killIds.push(r.pending[0].id);r.kills++;},
  r=>{delete r.circuit;}]);
 reject(states.bossEntry,[r=>r.wardens--,r=>r.sector=3,r=>r.circuit.room=3,r=>r.wardenSpawned=false,
  r=>{r.killIds=r.killIds.filter(id=>!id.endsWith(':w'));r.kills=r.killIds.length;},r=>r.bossWins=1]);
 reject(states.boss,[r=>r.pending[0].id='arbor:r0:b',r=>r.pending[0].role='warden',r=>r.pending[0].hp=1,r=>r.bossSpawned=false]);
 reject(states.complete,[r=>r.bossWins=2,r=>r.wardens=14,r=>r.lastClear='room',r=>r.circuit.room=0,
  r=>{r.killIds.splice(4,1);r.kills--;},r=>{r.killIds.push('arbor:r2:s4:p4:b');r.kills++;},r=>{delete r.circuit;}]);
});

test('new rooms follow outer players safely with active roots and reuse the five layouts',()=>{
 const fifthLayouts=new Set();let spawns=0,minDistance=Infinity,maxDistance=0;
 const players=[{x:17.5,z:14.5},{x:-17.5,z:14.5},{x:17.5,z:-14.5},{x:-17.5,z:-14.5},{x:0,z:14.5},{x:17.5,z:0}];
 for(const entry of states.entries){
  if(entry.round===0&&entry.circuit.room===4)fifthLayouts.add(arborRoomLayoutIndex(entry));
  for(const player of players){
   const s=restoreArborJourney(clone(entry));for(const root of s.roots)Object.assign(root,{phase:'active',active:true,t:1});
   const roots=s.roots,root0=roots[0],arena=arborArenaFor(s),output=s.out,actors=stepArborJourney(s,999,{player});
   assert.equal(actors,output);assert.equal(s.roots,roots);assert.equal(s.roots[0],root0);assert.equal(arborArenaFor(s),arena);
   assert(actors.spawns.length>0);assert(actors.spawns.length<=2);
   for(const a of actors.spawns){
    const distance=Math.hypot(a.x-player.x,a.z-player.z);minDistance=Math.min(minDistance,distance);maxDistance=Math.max(maxDistance,distance);
    assert(distance>=4);assert(distance<=9,'the actual outer player owns the entry vicinity');assert(Math.abs(a.x)<=17&&Math.abs(a.z)<=14);
    assert(!s.roots.some(root=>root.active&&Math.abs(a.x-root.x)<root.w/2+.65&&Math.abs(a.z-root.z)<root.d/2+.65));spawns++;
   }
  }
 }
 assert.equal(fifthLayouts.size,5,'all five independent warden rooms rotate real root footprints');
 assert.equal(new Set(ARBOR_SECTORS.map(s=>JSON.stringify(s.roots))).size,5);
 for(const source of ARBOR_SECTORS){
  const open=new Set();for(let x=-17;x<=17;x++)for(let z=-14;z<=14;z++)if(!source.roots.some(r=>Math.abs(x-r.x)<r.w/2+.4&&Math.abs(z-r.z)<r.d/2+.4))open.add(`${x},${z}`);
  const start=open.values().next().value,seen=new Set([start]),queue=[start];
  for(let i=0;i<queue.length;i++){const [x,z]=queue[i].split(',').map(Number);for(const [dx,dz] of [[1,0],[-1,0],[0,1],[0,-1]]){const key=`${x+dx},${z+dz}`;if(open.has(key)&&!seen.has(key)){seen.add(key);queue.push(key);}}}
  assert.equal(seen.size,open.size,source.name+' leaves every sampled free cell connected');
 }
 console.log(JSON.stringify({safeOuterSpawns:spawns,minDistance,maxDistance,fifthLayouts:[...fifthLayouts]}));
});

test('14 actors is a hard new ceiling, caps do not spend receipts, and waiting never clears a room',()=>{
 const full=fresh();for(let i=0;i<500;i++)assert(stepArborJourney(full,.1,{alive:full.pending.length}).spawns.length<=2);
 assert.equal(full.pending.length,14);assert.equal(full.phase,'skirmish');assert.equal(full.wardens,0);assert.equal(advanceArborJourney(full),false);roundtrip(full);
 let s=fresh();assert.equal(stepArborJourney(s,.1,{alive:14}).spawns.length,0);assert.equal(s.spawnIndex,0);
 s=fresh();assert.equal(stepArborJourney(s,.1,{alive:13}).spawns.length,1);assert.equal(s.spawnIndex,1);
 s=fresh();assert.equal(stepArborJourney(s,.1,{projectiles:48}).spawns.length,0);assert.equal(s.spawnIndex,0);
 assert.equal(creditArborKill(s,'arbor:r0:s0:p4:w','warden'),false);
 for(const dt of [0,-1,NaN,Infinity,undefined]){const before=checkpointArborJourney(s);assert.equal(stepArborJourney(s,dt),s.out);assert.deepEqual(checkpointArborJourney(s),before);}
 const entry=states.entries.find(e=>e.circuit.room===4),gate=restoreArborJourney(clone(entry));
 assert.equal(stepArborJourney(gate,.1).spawns[0].role,'warden');const before=gate.kills;
 for(let i=0;i<500;i++)assert.equal(stepArborJourney(gate,.1,{alive:1}).spawns.length,0);
 assert.equal(gate.kills,before);assert.equal(gate.wardens,entry.wardens);assert.equal(gate.phase,'warden');assert.equal(advanceArborJourney(gate),false);
});

test('a pending circuit resume reproduces future packets, roots and receipts exactly',()=>{
 const a=restoreArborJourney(clone(states.entries.find(e=>e.round===1&&e.sector===2&&e.circuit.room===2)));
 for(let i=0;i<55;i++){stepArborJourney(a,.05,{player:{x:16,z:13},alive:a.pending.length});if(i%7===0&&a.pending.length)creditArborKill(a,a.pending[0].id,a.pending[0].role);}
 assert(a.pending.length>0);const b=restoreArborJourney(clone(checkpointArborJourney(a)));assert(b);
 for(let i=0;i<1000;i++){
  const input={player:{x:Math.sin(i*.09)*17,z:Math.cos(i*.07)*14},alive:a.pending.length,projectiles:i%49};
  assert.deepEqual(stepArborJourney(a,.04,input),stepArborJourney(b,.04,input));
  if(i%7===0){creditPending(a);creditPending(b);}
  if(a.phase==='cleared')assert.equal(advanceArborJourney(a),advanceArborJourney(b));
  assert.deepEqual(checkpointArborJourney(a),checkpointArborJourney(b));
 }
 roundtrip(a);roundtrip(b);
});

console.log(`arbor-room-circuit: ${tests} checks passed; ${roundtrips} canonical roundtrips. CPU engine evidence only; no natural play, account, browser or device claim.`);
