// Keep ordinary low-FPS frames in real time, while bounding collision steps.
// Long stalls/tab suspension must not replay seconds of combat in one frame.
export const MAX_FRAME_SECONDS=.1;
export const MAX_STEP_SECONDS=1/60;
// A slow device must not run the whole game six times per frame: that makes the next frame slower
// still. Past three substeps the steps grow instead (at most 1/30 s, still shorter than any cover).
export const MAX_SUBSTEPS=3;
// Limit rendering on high-refresh displays without dropping elapsed simulation time.
// Carry the deadline forward (not now + interval), including on 90/144 Hz screens.
// 2026-09-28 사용자: "화면이 살짝 끊긴다" — 예전에는 마감보다 0.5ms만 일찍 와도 그 장면을 건너뛰었다.
// 60Hz 화면의 장면 시각은 1~2ms씩 흔들리고, 60Hz보다 아주 조금 빠른 화면은 마감이 조금씩 밀려
// 주기적으로 한 장면씩 빠졌다(툭 끊김).
// 화면 간격을 재어 목표보다 빠르지 않은 화면은 모두 그리고, 높은 주사율(90·120·144Hz)만 약 60장으로 줄인다.
export function createFramePacer(){
 let next=0,rate=0,prev=0,gap=0;
 return (now,fps)=>{
  if(!Number.isFinite(now)||!Number.isFinite(fps)||fps<=0)return false;
  const interval=1000/fps,step=now-prev;prev=now;if(step>0&&step<250)gap=gap?gap*.9+step*.1:step;
  if(rate!==fps){rate=fps;next=now+interval;return true;}
  // 화면이 목표보다 빠르지 않으면(60Hz 화면에 60장) 한 장도 거르지 않는다.
  if(gap>interval*.8){next=now+interval;return true;}
  const early=Math.min(interval*.25,gap*.5);
  if(now+early<next)return false;
  next+=interval*Math.max(1,Math.floor((now+early-next)/interval)+1);
  return true;
 };
}
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
