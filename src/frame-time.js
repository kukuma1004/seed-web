// Keep ordinary low-FPS frames in real time, while bounding collision steps.
// Long stalls/tab suspension must not replay seconds of combat in one frame.
export const MAX_FRAME_SECONDS=.1;
export const MAX_STEP_SECONDS=1/60;
export function advanceFrame(rawSeconds,endTime,step){
 const duration=Number.isFinite(rawSeconds)?Math.min(Math.max(0,rawSeconds),MAX_FRAME_SECONDS):0;
 if(!duration)return 0;
 const count=Math.ceil(duration/MAX_STEP_SECONDS),dt=duration/count;
 for(let i=0;i<count;i++)step(dt,endTime-duration+dt*(i+1));
 return duration;
}
