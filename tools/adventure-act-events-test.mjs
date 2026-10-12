import assert from 'node:assert/strict';
import {createAdventure,startAdventure,stepAdventure,adventureWalkable,ADVENTURE,adventureCheckpoint} from '../src/seed-adventure-rules.js';

const DT=.05;
function setup(act,seed=17){const s=createAdventure(seed);s.room=act*4;startAdventure(s,'slash','recall');s.player.inv=1e6;return s;}
function isolate(s){s.enemies.length=0;s.shots.length=0;}
function tick(s,seconds,control=()=>({}),before=()=>{}){for(let i=0;i<Math.ceil(seconds/DT)&&s.phase==='playing';i++){before();stepAdventure(s,DT,control());}}
function put(s,q){s.player.x=q.x;s.player.y=q.y;}
function cacheCount(s){return s.props.filter(p=>p.kind==='cache').length;}

// First garden retains its existing stationary optional event and three waves.
{
 const s=setup(0),[raid,guard]=s.region.events;assert.equal(raid.variant,undefined);assert.equal(raid.duration,32);assert.equal(guard.variant,undefined);assert.equal(guard.perWave,4);
 const before=cacheCount(s);put(s,raid);tick(s,33,()=>({}),()=>isolate(s));assert.equal(raid.state,'done');assert.equal(cacheCount(s),before+1);
 tick(s,3,()=>({}),()=>isolate(s));assert.equal(cacheCount(s),before+1);
 const g=setup(0);isolate(g);const ev=g.region.events[1];put(g,ev);tick(g,1.3);assert.equal(ev.spawned,1);ev.spawned=ev.perWave;ev.next=0;stepAdventure(g,DT);assert.equal(ev.next,6);
}

// The flowerlight travels one authored clear path without RNG-derived ordering.
for(let seed=1;seed<=80;seed++){
 const s=setup(1,seed),ev=s.region.events[0];assert.equal(ev.type,'raid');assert.equal(ev.variant,'flowertrail');assert.equal(ev.duration,16);
 for(let i=0;i<=64;i++){const t=i/64,x=ev.origin.x+(ev.trailEnd.x-ev.origin.x)*t,y=ev.origin.y+(ev.trailEnd.y-ev.origin.y)*t;assert.ok(adventureWalkable(s,x,y,.5),'flower trail must stay on player-safe ground');assert.ok(s.region.obstacles.every(o=>Math.hypot(o.x-x,o.y-y)>o.r+.5));}
 assert.ok(Math.hypot(ev.trailEnd.x-ev.origin.x,ev.trailEnd.y-ev.origin.y)>ev.r*2,'must leave origin to finish');
}
{
 const s=setup(1),ev=s.region.events[0];put(s,ev.origin);const before=cacheCount(s);tick(s,25,()=>({}),()=>isolate(s));assert.equal(ev.state,'active');assert.ok(ev.time<16);assert.equal(cacheCount(s),before);
 const stopped=ev.time;tick(s,2,()=>({}),()=>isolate(s));assert.equal(ev.time,stopped,'outside pauses progress');
 // Follow using ordinary movement input after returning to the stopped circle.
 put(s,ev);tick(s,18,()=>{const x=ev.x-s.player.x,y=ev.y-s.player.y;return Math.hypot(x,y)>.15?{x,y}:{};},()=>isolate(s));assert.equal(ev.state,'done');assert.equal(cacheCount(s),before+1);assert.ok(Math.hypot(s.player.x-ev.origin.x,s.player.y-ev.origin.y)>ev.r);
 assert.ok(Math.hypot(ev.x-ev.trailEnd.x,ev.y-ev.trailEnd.y)<1e-9);tick(s,3,()=>({}),()=>isolate(s));assert.equal(cacheCount(s),before+1);
 // Event data is ephemeral, not promoted into the door checkpoint schema.
 s.phase='doors';s.doors=[{room:'combat',reward:'law'}];const cp=adventureCheckpoint(s);assert.ok(!Object.hasOwn(cp,'region')&&!Object.hasOwn(cp,'events'));
}
{
 const s=setup(1),ev=s.region.events[0];put(s,ev.origin);tick(s,17,()=>{const x=ev.x-s.player.x,y=ev.y-s.player.y;return Math.hypot(x,y)>.15?{x,y}:{};},()=>{for(const e of s.enemies.filter(e=>e.raid)){assert.ok(adventureWalkable(s,e.x,e.y,e.r*.8-1e-7));}isolate(s);});assert.equal(ev.state,'done');
 const g=setup(2),altar=g.region.events[1];put(g,altar);isolate(g);stepAdventure(g,DT);altar.spawned=6;altar.next=0;const previous={...altar.portal};stepAdventure(g,DT);assert.equal(altar.wave,1);assert.equal(altar.next,2);assert.deepEqual(altar.portal,previous,'active entrance remains during between-wave preview');tick(g,1.9);assert.equal(altar.spawned,0);assert.deepEqual(altar.portal,previous);tick(g,.2);assert.equal(altar.spawned,1);assert.deepEqual(altar.portal,altar.portals[1]);
}
// Both spawn mechanisms respect the unchanged global cap.
for(const act of [0,1,2])for(const which of [0,1]){
 const s=setup(act),ev=s.region.events[which];put(s,ev);isolate(s);for(let i=0;i<ADVENTURE.maxEnemies;i++)s.enemies.push({id:10000+i,type:'hound',role:'melee',x:s.region.start.x,y:s.region.start.y,hp:1,maxHp:1,r:.4,speed:0,cd:999,stun:999,slow:0,flash:0});
 tick(s,2);assert.equal(s.enemies.length,64);if(which===1)assert.equal(ev.spawned,0,'full budget must not discard a wave spawn');
}

// Moonaltar entrances rotate once per wave, never once per enemy.
{
 const s=setup(2),ev=s.region.events[1];put(s,ev);assert.equal(ev.type,'guard');assert.equal(ev.variant,'moonaltar');assert.equal(ev.perWave,6);assert.equal(ev.portals.length,3);
 const before=cacheCount(s),seen=[],spawnTimes=[],portals=new Map();let previous=0;
 tick(s,23,()=>({}),()=>{
  for(const e of s.enemies.filter(e=>e.march)){if(e.id<=previous)continue;previous=e.id;seen.push({wave:ev.wave,portal:{...ev.portal}});spawnTimes.push(s.time);portals.set(ev.wave,ev.portal);assert.deepEqual(ev.nextPortal,ev.portals[(ev.wave+1)%3]);}
  isolate(s);
 });
 assert.equal(seen.length,18);for(let wave=0;wave<3;wave++){assert.equal(seen.filter(q=>q.wave===wave).length,6);assert.deepEqual(portals.get(wave),ev.portals[wave]);const group=spawnTimes.slice(wave*6,wave*6+6);for(let j=1;j<6;j++)assert.ok(group[j]-group[j-1]>=.74&&group[j]-group[j-1]<=.81);}
 assert.equal(ev.state,'done');assert.equal(cacheCount(s),before+1);tick(s,3,()=>({}),()=>isolate(s));assert.equal(cacheCount(s),before+1);
 const failed=setup(2),g=failed.region.events[1];put(failed,g);const original=cacheCount(failed);stepAdventure(failed,DT);g.hp=0;stepAdventure(failed,DT);assert.equal(g.state,'failed');tick(failed,25,()=>({}),()=>isolate(failed));assert.equal(cacheCount(failed),original);
}

// Actual event-spawned marching enemies follow ground and cover, and reach altar.
let marches=0;
for(const act of [0,1,2])for(let seed=1;seed<=12;seed++)for(let entrance=0;entrance<(act===2?3:1);entrance++){
 const s=setup(act,seed),ev=s.region.events[1];put(s,ev);isolate(s);ev.wave=entrance;tick(s,1.3);const e=s.enemies.find(e=>e.march);assert.ok(e);ev.state='test-disabled';s.enemies=[e];put(s,s.region.start);const hp=ev.hp;
 for(let frame=0;frame<1600&&e.hp>0;frame++){stepAdventure(s,DT);assert.ok(adventureWalkable(s,e.x,e.y,e.r*.8-1e-7),`act${act} seed${seed} marching on ground`);assert.ok(s.region.obstacles.every(o=>Math.hypot(o.x-e.x,o.y-e.y)>=o.r+e.r-1e-7),'march does not cut through cover');}
 assert.equal(e.hp,0,`act${act} seed${seed} march reaches altar`);assert.ok(ev.hp<hp);assert.ok(s.region.flows.size<=11);marches++;
}
console.log(`PASS authored optional events: Act1 preserved,80 walkable flower paths, moving/stationary completion,64enemy cap,18 moon spawns/3 entrances/one reward, failure,${marches} actual grounded marches. Rule simulation only; not human/device/deployment evidence.`);
