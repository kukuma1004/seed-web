import assert from 'node:assert/strict';
import {advanceFrame,MAX_STEP_SECONDS,MAX_SUBSTEPS,MAX_FRAME_SECONDS} from '../src/frame-time.js';
import {segmentHitsCover} from '../src/collision.js';

// At 20 fps the old .04-second clamp ran only eight seconds of gameplay
// during ten real seconds. Verify wall-clock travel and cooldowns instead.
for(const fps of [10,15,20,24,30,60,120]){
 let elapsed=0,x=0,cooldown=2.4,readyAt=null,previousTime=0,wallHit=false,stepSize=0,calls=0;
 for(let frame=1;frame<=fps*10;frame++)advanceFrame(1/fps,frame/fps,(dt,time)=>{
  // Small steps at ordinary rates; at very low rates at most three steps, each no longer than 1/30 s.
  assert(dt<=Math.max(MAX_STEP_SECONDS,MAX_FRAME_SECONDS/MAX_SUBSTEPS)+1e-12);stepSize=Math.max(stepSize,dt);calls++;
  assert(time>previousTime);previousTime=time;
  const before=x;x+=12*dt;elapsed+=dt;cooldown=Math.max(0,cooldown-dt);
  if(!cooldown&&readyAt===null)readyAt=elapsed;
  wallHit ||= segmentHitsCover({x:before,z:0},{x,z:0},[{x:5,z:0,w:.05,d:1}]);
 });
 assert(Math.abs(elapsed-10)<1e-9,`${fps} fps loses game time`);
 assert(Math.abs(x-120)<1e-8,`${fps} fps slows projectiles`);
 assert(Math.abs(readyAt-2.4)<=stepSize+1e-9);
 assert(calls<=fps*10*MAX_SUBSTEPS,`${fps} fps runs too many substeps`);
 assert(wallHit,`${fps} fps skips a thin obstacle`);
}
let calls=0,total=0;
advanceFrame(60,100,dt=>{calls++;total+=dt;});
assert(calls<=MAX_SUBSTEPS);assert(Math.abs(total-.1)<1e-12);
for(const raw of [0,-1,NaN,Infinity])assert.equal(advanceFrame(raw,0,()=>assert.fail('Invalid delta stepped')),0);
console.log('Frame timing: real-time travel/cooldowns at 10–120 fps, bounded collision steps and long-stall protection passed.');

// 속도를 바꾸는 도구: 화면 시계와 실제 시계의 비율로 알아챈다.
{
 const {paceTrusted,PACE_SAMPLE_SECONDS}=await import('../src/frame-time.js');
 assert.equal(paceTrusted(120,120),true,'보통 판');
 assert.equal(paceTrusted(118,120),true,'조금 끊기는 기기');
 assert.equal(paceTrusted(60,120),false,'절반 속도로 느리게 돌림');
 assert.equal(paceTrusted(240,120),false,'두 배 속도로 빠르게 돌림');
 assert.equal(paceTrusted(5,PACE_SAMPLE_SECONDS-1),true,'너무 짧은 판은 판단하지 않는다');
 assert.equal(paceTrusted(NaN,120),false);
 assert.equal(paceTrusted(0,0),true);
 console.log('속도 도구 알아채기: 보통·끊김·느리게·빠르게·짧은 판 통과');
}
