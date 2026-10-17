// Local inspection only. Records the live canvas; never drives gameplay.
function filmAllowed(window){
 try{
  const {hostname,protocol,search}=window.location;
  if(!['http:','https:'].includes(protocol)||!['localhost','127.0.0.1','::1','[::1]'].includes(hostname))return false;
  const query=new URLSearchParams(search);
  return query.getAll('inspect').length===1&&query.getAll('filmCapture').length===1&&query.get('inspect')==='1'&&query.get('filmCapture')==='1';
 }catch{return false;}
}

export function installInspectionFilm({canvas,audio,document=globalThis.document,window=globalThis.window}={}){
 // In particular, don't probe capture/audio/browser APIs on the public game.
 if(!filmAllowed(window))return ()=>{};
 if(!document?.body||document.getElementById('film-capture'))return ()=>{};
 const panel=document.createElement('aside'),button=document.createElement('button'),status=document.createElement('span'),download=document.createElement('a');
 panel.id='film-capture';panel.setAttribute('aria-label','로컬 실제 플레이 녹화');
 panel.style.cssText='position:fixed;left:12px;bottom:12px;z-index:10000;display:flex;align-items:center;gap:8px;flex-wrap:wrap;max-width:calc(100vw - 24px);padding:8px 10px;border:1px solid #b9c994;border-radius:12px;background:#10231eeb;color:#f3f4dd;font:13px/1.4 system-ui,sans-serif';
 button.id='film-record';button.type='button';button.textContent='12초 플레이 녹화';
 button.style.cssText='min-height:36px;padding:6px 12px;border:1px solid #d4dda9;border-radius:8px;background:#d4dda9;color:#15251c;font:inherit;cursor:pointer';
 status.id='film-status';status.setAttribute('role','status');status.setAttribute('aria-live','polite');
 download.id='film-download';download.download='seed-gameplay-actual.webm';download.textContent='영상 내려받기';download.hidden=true;download.style.cssText='color:#e1efb0;text-decoration:underline';
 panel.append(button,status,download);document.body.append(panel);
 let disposed=false,active=null,downloadURL=null;
 const setState=(value,message)=>{if(disposed)return;panel.dataset.state=status.dataset.state=value;status.textContent=message;button.disabled=value==='recording'||value==='stopping';button.textContent=value==='recording'?'녹화 중…':'12초 플레이 녹화';};
 const revokeDownload=()=>{if(downloadURL){try{window.URL.revokeObjectURL(downloadURL);}catch{}downloadURL=null;}download.hidden=true;download.removeAttribute('href');};
 const release=session=>{
  if(session.released)return;session.released=true;
  try{session.tap?.stop();}catch{}
  const tracks=new Set();for(const stream of [session.source,session.stream,session.tap?.stream]){
   try{for(const track of stream?.getTracks?.()||[])tracks.add(track);}catch{}
  }
  for(const track of tracks)if(track.readyState!=='ended')try{track.stop();}catch{}
 };
 const clearTimer=(session,key)=>{if(session[key]!==null){window.clearTimeout(session[key]);session[key]=null;}};
 const finish=session=>{
  if(active!==session)return;
  active=null;clearTimer(session,'deadline');clearTimer(session,'settle');release(session);
  session.recorder.ondataavailable=session.recorder.onstop=session.recorder.onerror=null;
  if(disposed)return;
  if(session.error||!session.chunks.length){setState('error','녹화를 저장하지 못했어요. 다시 시도해 주세요.');return;}
  try{
   const blob=new window.Blob(session.chunks,{type:session.recorder.mimeType||session.mime});
   if(!blob.size)throw new Error('empty recording');
   downloadURL=window.URL.createObjectURL(blob);download.href=downloadURL;download.hidden=false;
   setState('ready',session.hasAudio?'실제 플레이 영상이 준비됐어요.':'영상이 준비됐어요 · 게임 오디오 없이 녹화');
  }catch{setState('error','영상 파일을 만들지 못했어요. 다시 시도해 주세요.');}
 };
 const stop=()=>{
  const session=active;if(!session||session.stopping)return;
  session.stopping=true;clearTimer(session,'deadline');setState('stopping','영상을 마무리하고 있어요…');
  // Stop capture immediately even if a browser delays its final recorder event.
  release(session);
  session.settle=window.setTimeout(()=>{session.error=true;finish(session);},2000);
  try{if(session.recorder.state!=='inactive')session.recorder.stop();}catch{session.error=true;finish(session);}
 };
 const mimeType=()=>{
  const Recorder=window.MediaRecorder;
  if(typeof Recorder!=='function'||typeof canvas?.captureStream!=='function')return null;
  for(const mime of ['video/webm;codecs=vp9,opus','video/webm;codecs=vp8,opus','video/webm']){
   try{if(!Recorder.isTypeSupported||Recorder.isTypeSupported(mime))return mime;}catch{}
  }
  return null;
 };
 const start=()=>{
  if(disposed||active)return;
  if(!filmAllowed(window)){setState('error','로컬 검토 화면에서만 녹화할 수 있어요.');return;}
  if(document.hidden){setState('idle','화면을 다시 열고 녹화해 주세요.');return;}
  const mime=mimeType();
  if(!mime){setState('unsupported','이 브라우저는 WebM 플레이 녹화를 지원하지 않아요.');return;}
  revokeDownload();
  const session={source:null,stream:null,tap:null,recorder:null,chunks:[],mime,hasAudio:false,released:false,stopping:false,error:false,deadline:null,settle:null};
  try{
   session.source=canvas.captureStream(30);
   if(!session.source?.getVideoTracks?.().some(track=>track.readyState!=='ended'))throw new Error('no canvas video track');
   session.stream=session.source;
   try{
    session.tap=audio?.captureOutput?.()||null;
    const tracks=session.tap?.stream?.getAudioTracks?.().filter(track=>track.readyState!=='ended')||[];
    if(tracks.length&&typeof window.MediaStream==='function'){
     session.stream=new window.MediaStream([...session.source.getVideoTracks(),...tracks]);session.hasAudio=true;
    }else{session.tap?.stop();session.tap=null;}
   }catch{try{session.tap?.stop();}catch{}session.tap=null;session.stream=session.source;}
   session.recorder=new window.MediaRecorder(session.stream,{mimeType:mime,videoBitsPerSecond:4_000_000,audioBitsPerSecond:128_000});
   active=session;
   session.recorder.ondataavailable=event=>{if(!disposed&&active===session&&event.data?.size>0)session.chunks.push(event.data);};
   session.recorder.onstop=()=>finish(session);
   session.recorder.onerror=()=>{if(active===session){session.error=true;stop();}};
   session.recorder.start(500);
   if(active!==session||session.stopping)return;
   setState('recording',session.hasAudio?'실제 화면과 게임 오디오를 12초 녹화해요.':'실제 화면을 12초 녹화해요 · 게임 오디오 없이 녹화');
   session.deadline=window.setTimeout(stop,12000);
  }catch{
   if(active===session)active=null;release(session);
   if(session.recorder){session.recorder.ondataavailable=session.recorder.onstop=session.recorder.onerror=null;try{if(session.recorder.state!=='inactive')session.recorder.stop();}catch{}}
   setState('error','녹화를 시작하지 못했어요. 다시 시도해 주세요.');
  }
 };
 const hidden=()=>{if(document.hidden)stop();};
 button.addEventListener('click',start);document.addEventListener('visibilitychange',hidden);window.addEventListener('pagehide',stop);
 setState('idle','게임을 플레이하면서 녹화해 주세요.');
 return ()=>{
  if(disposed)return;disposed=true;
  button.removeEventListener('click',start);document.removeEventListener('visibilitychange',hidden);window.removeEventListener('pagehide',stop);
  if(active){const session=active;active=null;clearTimer(session,'deadline');clearTimer(session,'settle');session.recorder.ondataavailable=session.recorder.onstop=session.recorder.onerror=null;try{if(session.recorder.state!=='inactive')session.recorder.stop();}catch{}release(session);}
  revokeDownload();panel.remove();
 };
}
