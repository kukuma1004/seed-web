import assert from 'node:assert/strict';
import * as THREE from 'three';
import {AUSTIN,PHASES,austinPhase,hourDirection,bellDirections,beatsToHour,sweepTime,createAustin,tickAustin,damageAustin,volleyDirections,austinHint,austinPatternName,createClockFloor} from '../src/austin.js';
const V=THREE.Vector3;
const angleTo=(a,b)=>Math.acos(Math.max(-1,Math.min(1,a.dot(b))));

// Phases follow health, and each one is faster than the last.
assert.equal(austinPhase(7000,7000),'normal');assert.equal(austinPhase(3500,7000),'overtime');assert.equal(austinPhase(1400,7000),'deadline');
assert.equal(austinPatternName({state:'jabTell',bellWarn:false,pendingRing:0,alarms:[]}),'연속 스트레이트');
assert.ok(PHASES.normal.tempo>PHASES.overtime.tempo&&PHASES.overtime.tempo>PHASES.deadline.tempo);

// Twelve o'clock is the top of the screen, three o'clock is right.
assert.ok(hourDirection(0).distanceTo(new V(0,0,-1))<1e-9);assert.ok(hourDirection(3).distanceTo(new V(1,0,0))<1e-9);

// Both bell rings leave the same open gap around the hour hand, wide enough to stand in near the boss.
for(const phase of ['normal','overtime']){
 for(const hour of [0,4,8]){
  const toward=hourDirection(hour),step=Math.PI*2/PHASES[phase].bolts;
  const first=bellDirections(hour,phase,0),second=bellDirections(hour,phase,step/2);
  const nearest=Math.min(...[...first,...second].map(d=>angleTo(d,toward)));
  assert.ok(nearest>=PHASES[phase].gapHalf-1e-9,`${phase} hour ${hour}: bolt inside the gap (${nearest.toFixed(2)})`);
  assert.ok(2*3*Math.sin(nearest)-2*.6>1,`${phase}: the gap is wider than the seed at three units`);
  // Everywhere else is covered: away from the gap no direction has a hole wider than one bolt step.
  const away=hourDirection(hour+6);assert.ok(Math.min(...first.map(d=>angleTo(d,away)))<=step/2+1e-9,'the far side is closed');
 }
}
assert.ok(bellDirections(0,'overtime').length>bellDirections(0,'normal').length,'overtime rings are denser');

// A test arena: a boss and a seed, recording every hook call.
function rig(playerPos){
 const scene=new THREE.Scene(),e=createAustin(scene),player=playerPos.clone();
 const log={bolts:[],hits:[],bursts:0,pulses:0};
 const hooks={player,collide:(p,r)=>{const lim=AUSTIN_LIMIT-r,d=Math.hypot(p.x,p.z);if(d>lim){p.x*=lim/d;p.z*=lim/d;}},bolt:(pos,dir,spec)=>log.bolts.push({pos:pos.clone(),dir:dir.clone(),...spec}),hit:a=>{log.hits.push(a);return true;},burst:()=>log.bursts++,pulse:()=>log.pulses++};
 return {scene,e,player,log,hooks};
}
const AUSTIN_LIMIT=7.6;
function run(r,seconds,step=1/60,each=()=>{}){for(let t=0;t<seconds;t+=step){tickAustin(r.e,step,r.hooks);each(r);}}

// The bell rings exactly on the hour, warns three beats before, and moves its gap by four hours each time.
{
 const r=rig(new V(0,0,4));r.e.state='recover';r.e.timer=999;
 const hourSeconds=AUSTIN.beat*AUSTIN.hourBeats;let warnedAt=null;
 run(r,hourSeconds-AUSTIN.beat*AUSTIN.bell.warnBeats+.02,1/60,x=>{if(x.e.bellWarn&&warnedAt===null)warnedAt=true;});
 assert.ok(r.e.bellWarn,'warned before the hour');assert.equal(r.log.bolts.length,0,'no bolts before the hour');
 assert.ok(r.e.parts.wedge.visible,'the gold wedge shows the gap during the warning');
 run(r,AUSTIN.beat*AUSTIN.bell.warnBeats);
 assert.equal(r.log.bolts.length,bellDirections(0,'normal').length,'first ring on the hour');
 assert.equal(r.e.hour,AUSTIN.hourStep,'the next gap has moved');
 run(r,AUSTIN.bell.ringDelay+.05);
 assert.equal(r.log.bolts.length,bellDirections(0,'normal').length+bellDirections(0,'normal',Math.PI/PHASES.normal.bolts).length,'second ring follows, offset by half a step');
 assert.ok(r.log.bolts.every(b=>b.speed===AUSTIN.bell.speed&&b.damage===AUSTIN.bell.damage));
 assert.ok(!r.e.parts.wedge.visible,'the wedge clears after both rings');
}

// One-two: a telegraphed lane, then two dashes; standing in the lane is punished, stepping aside is not.
{
 const inLane=rig(new V(0,0,4));inLane.e.g.position.set(0,0,-2);inLane.e.state='stalk';inLane.e.timer=0;inLane.e.pattern=0;
 tickAustin(inLane.e,1/60,inLane.hooks);
 assert.equal(inLane.e.state,'jabTell');assert.ok(inLane.e.parts.lane.visible,'lane tell is visible');assert.ok(inLane.e.parts.tellRing.visible,'the boss flashes an attack ring');assert.ok(inLane.e.body.scale.x>inLane.e.body.scale.y,'the sprite visibly braces before the dash');
 run(inLane,AUSTIN.jab.tell+AUSTIN.jab.dash+.05);
 assert.ok(inLane.log.hits.includes(AUSTIN.jab.contact),'the jab lands on a seed that stayed in the lane');
 const aside=rig(new V(0,0,4));aside.e.g.position.set(0,0,-2);aside.e.state='stalk';aside.e.timer=0;aside.e.pattern=0;
 tickAustin(aside.e,1/60,aside.hooks);aside.player.set(4.5,0,-1);
 run(aside,AUSTIN.jab.tell+AUSTIN.jab.dash*.5);
 assert.equal(aside.log.hits.length,0,'a seed that stepped out of the lane is safe from the first dash');
}

// Sweep: the hand starts on the seed after a tell; it is never started when the bell would interrupt it.
{
 const r=rig(new V(3,0,0));r.e.state='stalk';r.e.timer=0;r.e.pattern=1;
 tickAustin(r.e,1/60,r.hooks);assert.equal(r.e.state,'sweepTell');
 assert.ok(r.e.parts.beams[0].visible&&!r.e.parts.beams[1].visible,'one hand in normal time');
 r.player.set(0,0,-3);run(r,AUSTIN.sweep.tell+.05);assert.equal(r.log.hits.length,0,'moving off the tell line avoids the start');
 run(r,sweepTime('normal'));assert.ok(r.log.hits.includes(AUSTIN.sweep.damage),'a full turn sweeps over a seed that stands still');
 const late=rig(new V(3,0,0));late.e.state='stalk';late.e.timer=0;late.e.pattern=1;late.e.beats=AUSTIN.hourBeats-2;
 tickAustin(late.e,1/60,late.hooks);assert.equal(late.e.kind,'jab','too close to the hour for a sweep');
 const over=rig(new V(3,0,0));over.e.hp=over.e.maxHp*.4;over.e.phase='overtime';over.e.state='stalk';over.e.timer=0;over.e.pattern=2;
 tickAustin(over.e,1/60,over.hooks);assert.equal(over.e.state,'sweepTell');assert.ok(over.e.parts.beams[1].visible,'two hands in overtime');
}

// Alarm clocks: placed on and around the seed, they burst after the countdown; leaving the circle is safe.
{
 const r=rig(new V(1,0,2));r.e.state='stalk';r.e.timer=0;r.e.pattern=2;
 tickAustin(r.e,1/60,r.hooks);
 assert.equal(r.e.alarms.length,PHASES.normal.alarms);assert.ok(r.e.alarms[0].pos.distanceTo(new V(1,0,2))<1e-6,'first alarm under the seed');
 const stay=r.e.alarms[0].pos.clone();r.player.copy(stay);
 run(r,AUSTIN.alarm.countdown+.5);
 assert.equal(r.e.alarms.length,0,'all alarms burst');assert.ok(r.log.hits.includes(AUSTIN.alarm.damage),'standing on an alarm hurts');
 assert.equal(r.e.world.children.length,0,'burst alarms leave nothing behind');
}

// A long fight keeps the boss inside the arena, never produces NaN and keeps ringing.
{
 const r=rig(new V(0,0,5));let t=0;
 run(r,90,1/30,x=>{t+=1/30;x.player.set(Math.cos(t*.7)*5,0,Math.sin(t*.7)*5);if(t>30)x.e.hp=x.e.maxHp*.45;if(t>60)x.e.hp=x.e.maxHp*.1;
  assert.ok(Number.isFinite(x.e.g.position.x)&&Number.isFinite(x.e.g.position.z));assert.ok(Math.hypot(x.e.g.position.x,x.e.g.position.z)<=AUSTIN_LIMIT+1e-6);});
 assert.ok(r.e.bells>=2*Math.floor(90/(AUSTIN.beat*AUSTIN.hourBeats)),'bells ring through every phase');
 assert.equal(r.e.phase,'deadline');assert.ok(typeof austinHint(r.e)==='string'&&austinHint(r.e).length>0);
 assert.ok(beatsToHour(r.e)>=1&&beatsToHour(r.e)<=AUSTIN.hourBeats);
}

// The floor clock hand points where the next gap will open.
{const parent=new THREE.Group(),floor=createClockFloor(parent);floor.point(4);
 const tip=new V(0,0,-1).applyAxisAngle(new V(0,1,0),floor.hand.rotation.y);assert.ok(tip.distanceTo(hourDirection(4))<1e-9);}

console.log('Austin bell gaps, one-two, sweeps, alarms, phases and floor clock passed.');

// A burst cannot skip the two phase changes, and transitional shielding expires.
{
 const r=rig(new V(0,0,5));
 assert.equal(damageAustin(r.e,1e9),r.e.maxHp*.5);
 tickAustin(r.e,1/60,r.hooks);assert.equal(r.e.state,'phaseShift');
 assert.equal(damageAustin(r.e,1e9),0);assert.ok(austinHint(r.e).includes('피해'));
 run(r,AUSTIN.transition+.05);assert.equal(r.e.phase,'overtime');
 damageAustin(r.e,1e9);assert.equal(r.e.hp,r.e.maxHp*.2);
 tickAustin(r.e,1/60,r.hooks);run(r,AUSTIN.transition+.05);
 assert.equal(r.e.phase,'deadline');assert.equal(damageAustin(r.e,1e9),r.e.maxHp*.2);assert.equal(r.e.hp,0);
}
// Every fan is telegraphed and locks its aim. Retargeting happens only before the next visible tell.
{
 const r=rig(new V(0,0,5));r.e.pattern=3;r.e.timer=0;
 tickAustin(r.e,1/60,r.hooks);assert.equal(r.e.state,'volleyTell');assert.ok(r.e.parts.fan.visible);
 const locked=r.e.dir.clone();r.player.set(4,0,2);
 run(r,.2);assert.ok(locked.distanceTo(r.e.dir)<1e-8);assert.equal(r.log.bolts.length,0);
 run(r,AUSTIN.volley.tell);assert.ok(r.log.bolts.length>=5);
 assert.ok(r.log.bolts.slice(0,5).every(b=>b.damage===AUSTIN.volley.damage));
 assert.equal(volleyDirections(new V(0,0,1)).length,5);
}
console.log('Austin phase gates and visible predictive fan passed.');

for(const max of [20763.6,21999.17,1e6+.17])assert.equal(austinPhase(max*AUSTIN.deadline,max),'deadline','fractional scaled HP crosses the exact phase gate');
