// Anonymous web/Android usage counts. This Firebase Auth app is separate from
// the player's account: its random UID identifies a browser or app install.
export const WEB_TELEMETRY_ROOT='seedWebTelemetry/v1/days';
const TELEMETRY_APP='seed-web-telemetry';
const PROVIDERS=new Set(['google','apple','guest']);
// 2026-09-28 사용자: "이용 현황에서 뭘 많이 하는지 보고 싶다" — 모드별로 들어간 횟수와 머문 시간(화면이 보일 때만).
export const TELEMETRY_MODES=Object.freeze(['journey','survival','defense','adventure','duel','puzzle']);

export function seoulDay(time=Date.now()){
 return new Date(time+9*60*60*1000).toISOString().slice(0,10).replaceAll('-','');
}

export function loginFailureReason(error){
 const code=String(error?.code||error?.message||error||'').toLowerCase().replace(/[_\s]+/g,'-');
 if(/cancel|popup-closed|12501|user-canceled/.test(code))return null;
 if(/network|offline|timeout|unavailable/.test(code))return 'network';
 if(/unauthorized-domain|configuration-not-found|developer-error|unregistered-on-api-console/.test(code))return 'config';
 if(/popup-blocked/.test(code))return 'popup';
 return 'other';
}

export async function anonymousTelemetrySession(firebaseApp){
 const [appSdk,authSdk]=await Promise.all([import('firebase/app'),import('firebase/auth')]);
 const app=appSdk.getApps().find(candidate=>candidate.name===TELEMETRY_APP)||appSdk.initializeApp(firebaseApp,TELEMETRY_APP);
 const auth=authSdk.getAuth(app);
 try{await authSdk.setPersistence(auth,authSdk.browserLocalPersistence);}
 catch{try{await authSdk.setPersistence(auth,authSdk.browserSessionPersistence);}catch{}}
 await auth.authStateReady();
 const user=auth.currentUser||(await authSdk.signInAnonymously(auth)).user;
 return {uid:user.uid,token:()=>user.getIdToken()};
}

export function createWebTelemetry({enabled=false,platform='web',databaseURL,session,fetchImpl=globalThis.fetch,now=Date.now,eventId=()=>crypto.randomUUID()}={}){
 let sessionPromise=null;
 const visited=new Set();
 const eventCounts=new Map();
 const app=platform==='android';
 let play=null,modePlay=null;
 const currentSession=()=>{
  if(!sessionPromise)sessionPromise=Promise.resolve().then(session).catch(error=>{sessionPromise=null;throw error;});
  return sessionPromise;
 };
 async function put(path,body='true'){
  if(!enabled)return false;
  try{
   const auth=await currentSession(),token=await auth.token();
   const response=await fetchImpl(`${databaseURL}/${WEB_TELEMETRY_ROOT}/${path}.json?auth=${encodeURIComponent(token)}`,{
    method:'PUT',headers:{'Content-Type':'application/json'},body,cache:'no-store'
   });
   return response.ok;
  }catch{return false;}
 }
 async function visit(){
  if(!enabled)return false;
  const day=seoulDay(now());
  if(visited.has(day))return true;
  visited.add(day);
  const auth=await currentSession().catch(()=>null);
  const ok=auth?await put(`${day}/${app?'appVisitors':'visitors'}/${auth.uid}`):false;
  if(!ok)visited.delete(day);
  return ok;
 }
 async function event(path){
  if(!enabled)return false;
  const day=seoulDay(now()),key=day+'-'+path,count=eventCounts.get(key)||0;
  // Avoid accidental UI loops filling the database. The rules still restrict
  // every write to this browser's anonymous Auth UID.
  if(count>=30)return false;
  eventCounts.set(key,count+1);
  const auth=await currentSession().catch(()=>null);
  return auth?put(`${day}/${path}/${auth.uid}/${eventId()}`):false;
 }
 function flushPlay(force=false){
  const current=play;
  if(!enabled||!current)return Promise.resolve(false);
  const seconds=Math.min(86400,Math.floor(current.seconds));
  const outcomeChanged=current.outcome!==current.queuedOutcome;
  if(seconds<=current.queuedSeconds&&!outcomeChanged||(!force&&!outcomeChanged&&seconds-current.queuedSeconds<30))return current.pending;
  current.queuedSeconds=seconds;current.queuedOutcome=current.outcome;
  const outcome=current.outcome;
  current.pending=current.pending.catch(()=>false).then(async()=>{
   const auth=await currentSession().catch(()=>null);
   return auth?put(`${current.day}/sessions/${app?'android':'web'}/${auth.uid}/${current.id}`,JSON.stringify({startedAt:current.startedAt,activeSeconds:seconds,act:current.act,outcome})):false;
  });
  return current.pending;
 }
 function startPlay(act=1){
  if(!enabled)return Promise.resolve(false);
  endPlay();
  const startedAt=now();
  play={id:eventId(),day:seoulDay(startedAt),startedAt,seconds:0,queuedSeconds:0,act:[1,2,3].includes(act)?act:1,outcome:'active',queuedOutcome:'active',pending:Promise.resolve(false)};
  return event(app?'appStarts':'starts');
 }
 function playTick(seconds){
  if(!enabled||!play||!Number.isFinite(seconds)||seconds<=0)return;
  play.seconds+=Math.min(2,seconds);
  if(play.seconds-play.queuedSeconds>=30)void flushPlay();
 }
 function playPause(){return flushPlay(true);}
 function endPlay(outcome='left'){if(play)play.outcome=['cleared','ended','left','closed','restart'].includes(outcome)?outcome:'left';const pending=flushPlay(true);play=null;return pending;}
 // 모드 기록: 들어가는 순간 0초로 한 번(들어간 횟수), 그 뒤 30초마다·나갈 때 머문 시간을 덮어쓴다(늘기만 함).
 function flushMode(force=false){
  const current=modePlay;if(!enabled||!current)return Promise.resolve(false);
  const seconds=Math.min(86400,Math.floor(current.seconds));
  if(seconds<=current.queuedSeconds||(!force&&seconds-current.queuedSeconds<30))return current.pending;
  current.queuedSeconds=seconds;
  current.pending=current.pending.catch(()=>false).then(async()=>{const auth=await currentSession().catch(()=>null);return auth?put(`${current.day}/modeSessions/${app?'android':'web'}/${auth.uid}/${current.id}`,JSON.stringify({mode:current.mode,startedAt:current.startedAt,activeSeconds:seconds})):false;});
  return current.pending;
 }
 function modeEnter(mode){
  if(!enabled||!TELEMETRY_MODES.includes(mode))return Promise.resolve(false);
  if(modePlay?.mode===mode)return modePlay.pending;
  modeLeave();const startedAt=now();
  modePlay={id:eventId(),day:seoulDay(startedAt),startedAt,mode,seconds:0,queuedSeconds:-1,pending:Promise.resolve(false)};
  return flushMode(true);
 }
 function modeTick(seconds){if(!enabled||!modePlay||!Number.isFinite(seconds)||seconds<=0)return;modePlay.seconds+=Math.min(2,seconds);if(modePlay.seconds-modePlay.queuedSeconds>=30)void flushMode();}
 function modeLeave(){const pending=flushMode(true);modePlay=null;return pending;}
 return {
  visit,modeEnter,modeTick,modePause:()=>flushMode(true),modeLeave,
  playStart:startPlay,playTick,playPause,endPlay,
  loginFailure:(provider,error)=>{
   if(app)return Promise.resolve(false);
   const reason=loginFailureReason(error);
   return reason&&PROVIDERS.has(provider)?event(`loginFailures/${provider}/${reason}`):Promise.resolve(false);
  }
 };
}
