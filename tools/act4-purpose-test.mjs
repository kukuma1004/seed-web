import assert from 'node:assert/strict';
import {crosswindFormation,crosswindReflectorPanels} from '../src/act-expansion.js';
import {createExpansionCourse,stepExpansionCourse,checkpointExpansionCourse,restoreExpansionCourse,EXPANSION_COURSE_PACKETS} from '../src/act-expansion-runtime.js';
import {createExpansionThreat,stepExpansionThreat} from '../src/expansion-journey.js';
import {reflectMirrorPanels} from '../src/mirror-fighter.js';

const copy=x=>JSON.parse(JSON.stringify(x));
const length=(a,b)=>Math.hypot(a.x-b.x,a.z-b.z);
function packets(room,version=2){
 const course=createExpansionCourse('crosswind',{room,seed:72,encounterVersion:version}),specs=[];
 for(let frame=0;frame<300;frame++)specs.push(...copy(stepExpansionCourse(course,.1,{player:{x:0,z:0}}).spawns));
 return {course,specs};
}

// Actual first thirty seconds produce distinct room formations, bounded single
// shots, and unchanged HP. No synthetic hit/death is needed to prove movement.
const rooms=Array.from({length:5},(_,room)=>packets(room));
for(const [room,{course,specs}] of rooms.entries()){
 assert(specs.length>=9&&specs.length<=15,'idle pressure remains active without spending the whole route at the entrance');
 assert(course.spawnIndex<EXPANSION_COURSE_PACKETS[room],'later packets remain for the rest of the route');
 assert(!course.finishAnnounced,'standing still cannot complete the voyage');
 assert(specs.every(s=>s.behavior==='crosswind'&&s.shots===1&&s.role===['front','rear','split-lanes','pincer','warden'][room]));
 for(const spec of specs){
  assert.equal(spec.hp,spec.type==='charger'?42+room*8:86+room*18);
  assert(spec.position.z>=-4.5&&spec.position.z<=4.5);if(spec.side==='rear')assert(spec.windup>=1.1);
 }
 const r=restoreExpansionCourse(copy(checkpointExpansionCourse(course)));
 for(let f=0;f<15;f++)assert.deepEqual(copy(stepExpansionCourse(course,.1,{player:{x:f*.2,z:1}})),copy(stepExpansionCourse(r,.1,{player:{x:f*.2,z:1}})));
}
assert(rooms[0].specs.every(s=>s.side==='front'));
assert(rooms[1].specs.some(s=>s.side==='rear'));
const splitPair=rooms[2].specs.filter(s=>s.id.startsWith('crosswind-2-1-'));
assert.equal(splitPair.length,2);assert.equal(splitPair[0].position.z,-splitPair[1].position.z);
const pincerPair=rooms[3].specs.filter(s=>s.id.startsWith('crosswind-3-1-'));
assert.deepEqual(pincerPair.map(s=>s.side),['front','rear']);
assert.equal(pincerPair[0].position.z,-pincerPair[1].position.z);
assert.equal(crosswindFormation(5,1).side,'rear');

const spec=rooms[0].specs.find(s=>s.type==='shooter'),moving=createExpansionThreat(spec);
let firstLock=null,firstShot=null,recoveryStart=null,recoveryEnd=null;
for(let f=0;f<110;f++){
 const out=stepExpansionThreat(moving,.05,{player:{x:0,z:0}});
 if(moving.phase==='windup'&&!firstLock)firstLock={position:{...moving.position},aim:{...moving.aim},frame:f};
 if(out.bolts.length&&!firstShot){firstShot=copy(out.bolts[0]);recoveryStart={...moving.position};}
 if(recoveryStart&&moving.phase==='recover')recoveryEnd={...moving.position};
}
assert(firstShot&&firstLock.frame<100);assert(length(firstLock.position,spec.position)>.5,'front actor must close/strafe before locking');
assert(length(recoveryStart,recoveryEnd)>.35,'recovery creates a moving opening instead of a stationary turret');
assert.deepEqual(firstShot.dir,firstLock.aim);
assert(!Object.hasOwn(firstShot.spec,'committedLane'),'ordinary shooter and shared bolts keep their lifetime contract');

// A lobber paints a finite wider lane, slower than a shooter, then spends its
// recovery relocating. Moving after the tell cannot drag the committed lane.
const lobSpec=rooms[2].specs.find(s=>s.type==='lobber'),lob=createExpansionThreat(lobSpec);
let lock=null,lobShot=null,tell=null,atCommit=null,afterRecovery=null;
for(let f=0;f<200;f++){
 const player=lock?{x:0,z:4}:{x:0,z:0},out=stepExpansionThreat(lob,.05,{player});
 if(lob.phase==='windup'&&!lock)lock={aim:{...lob.aim},target:{...lob.target}};
 if(out.tell?.kind==='shot'&&!tell)tell=copy(out.tell);
 if(out.bolts.length&&!lobShot){lobShot=copy(out.bolts[0]);atCommit={...lob.position};}
 if(atCommit&&lob.phase==='recover')afterRecovery={...lob.position};
 if(lobShot&&lob.phase==='approach')break;
}
assert(lobShot&&tell);assert.deepEqual(lobShot.dir,lock.aim);assert.deepEqual(lock.target,{x:0,z:0});
assert.equal(lobShot.spec.committedLane,true);
assert.equal(tell.width,.5);assert(tell.length>0&&tell.length<10);
assert(lobShot.spec.speed<lobSpec.bulletSpeed);assert(lobShot.spec.life<3);
assert(length(atCommit,afterRecovery)>.35);
const endpoint={x:atCommit.x+lobShot.dir.x*(1.05+lobShot.spec.speed*lobShot.spec.life),z:atCommit.z+lobShot.dir.z*(1.05+lobShot.spec.speed*lobShot.spec.life)};
assert(Math.abs(length(endpoint,atCommit)-tell.length)<1e-8,'existing bolt spawn offset and life end at the warned lane edge');

// New actor motion is clamped, cannot dump queued attacks after pause/cap, and
// never acquires the player's new position during a committed shot.
for(const {specs} of rooms)for(const actorSpec of specs.slice(0,12)){
 const actor=createExpansionThreat(actorSpec);let total=0;
 for(let f=0;f<300;f++){
  const p={x:f*.03,z:Math.sin(f*.01)*4},out=stepExpansionThreat(actor,f===50?60:.05,{player:p,projectiles:48});
  total+=out.bolts.length;assert(actor.position.z>=actor.laneMin-.01&&actor.position.z<=actor.laneMax+.01||actor.phase==='charge','charges alone follow their locked flight');
  assert(out.bolts.length<=1);
 }
 assert.equal(total,0);
}
// Legacy entrance layouts and generic crystal/survival/defense actors opt out.
assert(packets(2,1).specs.every(s=>!Object.hasOwn(s,'behavior')));
const generic=createExpansionThreat({...spec,behavior:undefined,position:{x:6.8,z:0}}),stationary={...generic.position};
for(let f=0;f<80;f++)stepExpansionThreat(generic,.05,{player:{x:0,z:0}});
assert.deepEqual(generic.position,stationary);

const panels=crosswindReflectorPanels(22,{x:30,z:7});assert.equal(panels.length,4);
assert.deepEqual(panels,crosswindReflectorPanels(27,{x:30,z:7}),'panels stay fixed within their stretch');
assert(panels.every(p=>p.w===3&&p.d===.18&&Math.abs(p.z-7)===4.35));
const pane=panels[0],to={x:pane.x,z:pane.z+1},dir={x:0,z:1};
assert(reflectMirrorPanels({x:pane.x,z:pane.z-1},to,dir,panels));assert.equal(dir.z,-1);
assert.equal(reflectMirrorPanels({x:50,z:7},{x:66,z:7},{x:1,z:0},panels),false,'broad middle firing lane stays open');
console.log('Act 4 purpose: 30-second role formations, moving approach/recovery, opposite-lane/pincer pairs, committed finite lobber lane, caps, old save replay and generic opt-out passed. Model checks; browser/readability remains a host check.');
