// Web-only, anonymous usage counts. This Firebase Auth app is separate from the
// player's account: its random UID identifies a browser, never a game profile.
export const WEB_TELEMETRY_ROOT='seedWebTelemetry/v1/days';
const TELEMETRY_APP='seed-web-telemetry';
const PROVIDERS=new Set(['google','apple','guest']);

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

export function createWebTelemetry({enabled=false,databaseURL,session,fetchImpl=globalThis.fetch,now=Date.now,eventId=()=>crypto.randomUUID()}={}){
 let sessionPromise=null;
 const visited=new Set();
 const eventCounts=new Map();
 const currentSession=()=>{
  if(!sessionPromise)sessionPromise=Promise.resolve().then(session).catch(error=>{sessionPromise=null;throw error;});
  return sessionPromise;
 };
 async function put(path){
  if(!enabled)return false;
  try{
   const auth=await currentSession(),token=await auth.token();
   const response=await fetchImpl(`${databaseURL}/${WEB_TELEMETRY_ROOT}/${path}.json?auth=${encodeURIComponent(token)}`,{
    method:'PUT',headers:{'Content-Type':'application/json'},body:'true',cache:'no-store'
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
  const ok=auth?await put(`${day}/visitors/${auth.uid}`):false;
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
 return {
  visit,
  playStart:()=>event('starts'),
  loginFailure:(provider,error)=>{
   const reason=loginFailureReason(error);
   return reason&&PROVIDERS.has(provider)?event(`loginFailures/${provider}/${reason}`):Promise.resolve(false);
  }
 };
}
