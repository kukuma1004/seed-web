// Keep ordinary low-FPS frames in real time, while bounding collision steps.
// Long stalls/tab suspension must not replay seconds of combat in one frame.
export const MAX_FRAME_SECONDS=.1;
export const MAX_STEP_SECONDS=1/60;
// A slow device must not run the whole game six times per frame: that makes the next frame slower
// still. Past three substeps the steps grow instead (at most 1/30 s, still shorter than any cover).
export const MAX_SUBSTEPS=3;
export function advanceFrame(rawSeconds,endTime,step){
 const duration=Number.isFinite(rawSeconds)?Math.min(Math.max(0,rawSeconds),MAX_FRAME_SECONDS):0;
 if(!duration)return 0;
 const count=Math.min(MAX_SUBSTEPS,Math.ceil(duration/MAX_STEP_SECONDS)),dt=duration/count;
 for(let i=0;i<count;i++)step(dt,endTime-duration+dt*(i+1));
 return duration;
}

// 속도를 바꾸는 도구 알아채기. 화면 갱신 시각(requestAnimationFrame·performance.now)으로 잰 시간과
// 실제 시계(Date.now)로 잰 시간은 보통 같다. 기기가 느려 끊겨도 둘 다 실제로 흐른 시간이라 같다.
// 게임을 느리게(또는 빠르게) 돌리는 도구는 화면 쪽 시계를 바꾸므로 둘의 비율이 크게 어긋난다.
export const PACE_MIN=.8,PACE_MAX=1.25,PACE_SAMPLE_SECONDS=30;
export function paceTrusted(gameSeconds,realSeconds){
 if(!(realSeconds>=PACE_SAMPLE_SECONDS))return true;
 const pace=gameSeconds/realSeconds;
 return pace>=PACE_MIN&&pace<=PACE_MAX;
}
