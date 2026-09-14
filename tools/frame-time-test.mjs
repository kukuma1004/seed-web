import assert from 'node:assert/strict';
import {advanceFrame,MAX_STEP_SECONDS} from '../src/frame-time.js';
import {segmentHitsCover} from '../src/collision.js';

// At 20 fps the old .04-second clamp ran only eight seconds of gameplay
// during ten real seconds. Verify wall-clock travel and cooldowns instead.
for(const fps of [10,15,20,24,30,60,120]){
 let elapsed=0,x=0,cooldown=2.4,readyAt=null,previousTime=0,wallHit=false;
 for(let frame=1;frame<=fps*10;frame++)advanceFrame(1/fps,frame/fps,(dt,time)=>{
  assert(dt<=MAX_STEP_SECONDS+1e-12);
  assert(time>previousTime);previousTime=time;
  const before=x;x+=12*dt;elapsed+=dt;cooldown=Math.max(0,cooldown-dt);
  if(!cooldown&&readyAt===null)readyAt=elapsed;
  wallHit ||= segmentHitsCover({x:before,z:0},{x,z:0},[{x:5,z:0,w:.05,d:1}]);
 });
 assert(Math.abs(elapsed-10)<1e-9,`${fps} fps loses game time`);
 assert(Math.abs(x-120)<1e-8,`${fps} fps slows projectiles`);
 assert(Math.abs(readyAt-2.4)<=MAX_STEP_SECONDS+1e-9);
 assert(wallHit,`${fps} fps skips a thin obstacle`);
}
let calls=0,total=0;
advanceFrame(60,100,dt=>{calls++;total+=dt;});
assert(calls<=6);assert(Math.abs(total-.1)<1e-12);
for(const raw of [0,-1,NaN,Infinity])assert.equal(advanceFrame(raw,0,()=>assert.fail('Invalid delta stepped')),0);
console.log('Frame timing: real-time travel/cooldowns at 10–120 fps, bounded collision steps and long-stall protection passed.');
