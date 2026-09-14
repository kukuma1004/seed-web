// Shared ranking on the jpmathlab Firebase project (the same web app as jpmath-lab).
// Plain REST calls: anonymous sign-in, then one push per finished run into seedRanking/runs.
// The web config below is a public project identifier, not a secret; the database rules
// (docs/FIREBASE-RANKING.md) decide who may read and write.
import {cleanName} from './score.js';
export const FIREBASE=Object.freeze({
 apiKey:'AIzaSyD9mHiQ8Cyh4zJKbyhW_oYZkcu3WPMYw3k',
 databaseURL:'https://jpmathlab-default-rtdb.asia-southeast1.firebasedatabase.app'
});
export const AUTH_KEY='seed-firebase-auth-v1',PENDING_KEY='seed-ranking-pending-v1',RUNS_PATH='seedRanking/runs',FETCH_RUNS=100,PENDING_MAX=10;
const int=(v,max)=>Number.isInteger(v)&&v>=0&&v<=max;
export function validRun(e){
 return Boolean(e&&typeof e.uid==='string'&&e.uid&&typeof e.name==='string'&&e.name&&cleanName(e.name)===e.name&&int(e.score,1e9)&&e.score>0&&int(e.cycle,1e5)&&int(e.stage,4)&&int(e.kills,1e7)&&int(e.time,1e7)&&Number.isFinite(e.at));
}
// One line per player (same device and same name keep only their best), highest first, earliest wins ties.
export function bestPerPlayer(data,limit=20){
 const runs=Object.entries(data&&typeof data==='object'?data:{}).map(([id,v])=>({id,...v})).filter(validRun).sort((a,b)=>b.score-a.score||a.at-b.at);
 const seen=new Set(),out=[];
 for(const run of runs){const key=run.uid+'\n'+run.name;if(seen.has(key))continue;seen.add(key);out.push(run);if(out.length>=limit)break;}
 return out;
}
export function createOnlineRanking({config=FIREBASE,storage=null,fetchImpl=(...a)=>fetch(...a),now=()=>Date.now(),timeoutMs=7000}={}){
 let session=null;
 async function request(url,options={}){
  const controller=typeof AbortController==='function'?new AbortController():null;
  const timer=setTimeout(()=>controller?.abort(),timeoutMs);
  try{
   const response=await fetchImpl(url,{...options,cache:'no-store',signal:controller?.signal});
   let body=null;try{body=await response.json();}catch{}
   if(!response.ok){const error=new Error(body?.error?.message||body?.error||`http-${response.status}`);error.status=response.status;throw error;}
   return body;
  }finally{clearTimeout(timer);}
 }
 function remember(next){session=next;try{storage?.setItem(AUTH_KEY,JSON.stringify({uid:next.uid,refreshToken:next.refreshToken}));}catch{}return next;}
 function saved(){try{const s=JSON.parse(storage?.getItem(AUTH_KEY));return s?.refreshToken?s:null;}catch{return null;}}
 // Keeps the same anonymous player on this browser by refreshing the stored token; signs up once otherwise.
 async function signIn(){
  if(session&&session.expiresAt-now()>60000)return session;
  const previous=session||saved();
  if(previous?.refreshToken){
   try{
    const b=await request(`https://securetoken.googleapis.com/v1/token?key=${encodeURIComponent(config.apiKey)}`,{method:'POST',headers:{'Content-Type':'application/x-www-form-urlencoded'},body:`grant_type=refresh_token&refresh_token=${encodeURIComponent(previous.refreshToken)}`});
    return remember({uid:b.user_id,idToken:b.id_token,refreshToken:b.refresh_token,expiresAt:now()+Number(b.expires_in||3600)*1000});
   }catch(error){if(!(error.status>=400&&error.status<500))throw error;}
  }
  const b=await request(`https://identitytoolkit.googleapis.com/v1/accounts:signUp?key=${encodeURIComponent(config.apiKey)}`,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({returnSecureToken:true})});
  return remember({uid:b.localId,idToken:b.idToken,refreshToken:b.refreshToken,expiresAt:now()+Number(b.expiresIn||3600)*1000});
 }
 const runsURL=(s,query='')=>`${config.databaseURL}/${RUNS_PATH}.json?${query}auth=${encodeURIComponent(s.idToken)}`;
 async function top(limit=20){
  const s=await signIn();
  const data=await request(runsURL(s,`orderBy=${encodeURIComponent('"score"')}&limitToLast=${FETCH_RUNS}&`));
  return bestPerPlayer(data,limit);
 }
 async function post({name,score,cycle,stage,kills,time}){
  const shaped={uid:'check',name:cleanName(name),score:Math.floor(score),cycle,stage,kills,time:Math.floor(time),at:0};
  if(!validRun(shaped))throw new Error('invalid-run');
  const s=await signIn();
  const created=await request(runsURL(s),{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({...shaped,uid:s.uid,at:{'.sv':'timestamp'}})});
  return {id:created?.name,uid:s.uid,name:shaped.name};
 }
 function pending(){try{const list=JSON.parse(storage?.getItem(PENDING_KEY));return Array.isArray(list)?list:[];}catch{return [];}}
 function keepPending(list){try{storage?.setItem(PENDING_KEY,JSON.stringify(list.slice(-PENDING_MAX)));}catch{}}
 // Returns the board after the run, the run's place on it (0 if it is not this player's best or below the board)
 // and the place of this player's best line. A run that could not be sent waits in this browser for flush().
 async function submit(entry,limit=20){
  let sent;
  try{sent=await post(entry);}
  catch(error){if(error.message!=='invalid-run')keepPending([...pending(),{name:entry.name,score:entry.score,cycle:entry.cycle,stage:entry.stage,kills:entry.kills,time:entry.time}]);throw error;}
  const board=await top(limit);
  const mine=board.findIndex(e=>e.id===sent.id),best=board.findIndex(e=>e.uid===sent.uid&&e.name===sent.name);
  return {id:sent.id,board,rank:mine+1,bestRank:best+1};
 }
 // Sends runs that failed earlier (offline, or before the database rules were published). Stops at the first failure.
 async function flush(){
  const list=pending();let sent=0;
  while(list.length){
   try{await post(list[0]);sent++;list.shift();}
   catch(error){if(error.message==='invalid-run'){list.shift();continue;}break;}
  }
  keepPending(list);return sent;
 }
 // Only the player who wrote a run may remove it (used to clean up live checks).
 async function remove(id){const s=await signIn();await request(`${config.databaseURL}/${RUNS_PATH}/${encodeURIComponent(id)}.json?auth=${encodeURIComponent(s.idToken)}`,{method:'DELETE'});return true;}
 return {signIn,top,submit,flush,remove,pendingCount:()=>pending().length,uid:()=>session?.uid||null};
}
