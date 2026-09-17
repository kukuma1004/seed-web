// Shared ranking on the jpmathlab Firebase project (the same web app as jpmath-lab).
// Plain REST calls: anonymous sign-in, then one push per finished run into seedRanking/runs.
// The web config below is a public project identifier, not a secret; the database rules
// (docs/FIREBASE-RANKING.md) decide who may read and write.
import {cleanName} from './score.js';
import {isBadName} from './name-filter.js';
import {validBuild} from './ranking-build.js';
export const FIREBASE=Object.freeze({
 apiKey:'AIzaSyD9mHiQ8Cyh4zJKbyhW_oYZkcu3WPMYw3k',
 databaseURL:'https://jpmathlab-default-rtdb.asia-southeast1.firebasedatabase.app'
});
export const AUTH_KEY='seed-firebase-auth-v1',PENDING_KEY='seed-ranking-pending-v2',RUNS_PATH='seedRanking/runs',BUILDS_PATH='seedRanking/builds',FETCH_RUNS=100,FETCH_RECENT=500,PENDING_MAX=10;
// Seasons: the board starts over without deleting anything. Runs before SEASON.start stay in the database but are not shown.
// (The database rules allow no extra fields, so the season is decided by the server timestamp `at`.)
export const SEASON=Object.freeze({id:'1.1',name:'베타 시즌 1.1 · 균형의 정원',start:1789662000000});
export const ARCHIVE_SEASON=Object.freeze({id:'1.0',name:'베타 시즌 1.0 · 첫 정원',start:0,end:SEASON.start});
export const inSeason=(run,season=SEASON)=>Number.isFinite(run?.at)&&run.at>=season.start&&(!Number.isFinite(season.end)||run.at<season.end);
// Firebase push IDs begin with their creation time, so a key range finds every run since the season began without a new index.
const PUSH_CHARS='-0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ_abcdefghijklmnopqrstuvwxyz';
export function pushKeyPrefix(ms){let n=Math.floor(ms),out='';for(let i=0;i<8;i++){out=PUSH_CHARS[n%64]+out;n=Math.floor(n/64);}return out;}
const int=(v,max)=>Number.isInteger(v)&&v>=0&&v<=max;
// Late journeys can now contain up to 166 legitimate kills while still drawing
// only fourteen enemies at once. Keep a small margin for future hand-tuned rooms.
export const MAX_KILLS_PER_JOURNEY=180;
export function validRun(e){
 if(!(e&&typeof e.uid==='string'&&e.uid&&typeof e.name==='string'&&e.name&&cleanName(e.name)===e.name&&int(e.score,1e9)&&e.score>0&&int(e.cycle,1e5)&&int(e.stage,4)&&int(e.kills,1e7)&&int(e.time,1e7)&&Number.isFinite(e.at)))return false;
 const multiplier=1+e.cycle*.5;
 return e.kills<=(e.cycle+1)*MAX_KILLS_PER_JOURNEY&&e.score<=(e.kills+12)*50*multiplier&&e.time>=e.cycle*15&&e.time>=e.kills/6;
}
// One line per player (same device and same name keep only their best), highest first, earliest wins ties.
export function bestPerPlayer(data,limit=20,season=SEASON){
 const runs=Object.entries(data&&typeof data==='object'?data:{}).map(([id,v])=>({id,...v})).filter(validRun).filter(run=>!season||inSeason(run,season)).sort((a,b)=>b.score-a.score||a.at-b.at);
 const seen=new Set(),out=[];
 for(const run of runs){const key=run.uid+'\n'+run.name;if(seen.has(key))continue;seen.add(key);out.push(run);if(out.length>=limit)break;}
 return out;
}
export function createOnlineRanking({config=FIREBASE,storage=null,fetchImpl=(...a)=>fetch(...a),now=()=>Date.now(),timeoutMs=12000,authProvider=null}={}){
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
 // Reads are safe to repeat, so a slow school network or a phone waking from sleep gets one more try before the board gives up.
 // (2026-09-15: a failed read showed only this device's runs and players thought the ranking was wiped.)
 async function read(url){try{return await request(url);}catch(error){if(error.status>=400&&error.status<500)throw error;return request(url);}}
 function remember(next){session=next;try{storage?.setItem(AUTH_KEY,JSON.stringify({uid:next.uid,refreshToken:next.refreshToken}));}catch{}return next;}
 function saved(){try{const s=JSON.parse(storage?.getItem(AUTH_KEY));return s?.refreshToken?s:null;}catch{return null;}}
 // Keeps the same anonymous player on this browser by refreshing the stored token; signs up once otherwise.
 async function signIn(){
  // Once the player chooses Google, Apple or the new guest account, rankings use that same Firebase uid.
  // The old REST-only anonymous session remains as a fallback so existing published builds and offline QA keep working.
  if(authProvider){
   try{const external=await authProvider();if(external?.uid&&external?.idToken){session=external;return external;}if(session?.account)session=null;}catch{}
  }
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
 // Two reads merged: the highest scores overall (old seasons are filtered out) and every recent run since the season began,
 // so new runs are found even while old high scores fill the score query.
 const keyRange=season=>{
  const start=pushKeyPrefix(Math.max(0,Number(season?.start)||0));
  const end=Number.isFinite(season?.end)?`${pushKeyPrefix(Math.max(0,season.end-1))}\uf8ff`:'';
  return `orderBy=${encodeURIComponent('"$key"')}&startAt=${encodeURIComponent(JSON.stringify(start))}&${end?`endAt=${encodeURIComponent(JSON.stringify(end))}&`:''}limitToLast=${FETCH_RECENT}&`;
 };
 async function top(limit=20,playerName='',season=SEASON){
  const s=await signIn();
  const [best,recent]=await Promise.all([
   read(runsURL(s,`orderBy=${encodeURIComponent('"score"')}&limitToLast=${FETCH_RUNS}&`)),
   read(runsURL(s,keyRange(season)))
  ]);
  const board=bestPerPlayer({...(best&&typeof best==='object'?best:{}),...(recent&&typeof recent==='object'?recent:{})},limit,season);
  // Builds live beside the runs under the same push id. Load the recent batch first, then recover any
  // displayed old high score (and this player's line) that has fallen outside that moving window.
  try{
   const builds=await request(`${config.databaseURL}/${BUILDS_PATH}.json?${keyRange(season)}auth=${encodeURIComponent(s.idToken)}`);
   for(const run of board)if(builds&&validBuild(builds[run.id])&&builds[run.id].uid===run.uid)run.build=builds[run.id];
   const cleanPlayer=cleanName(playerName),wanted=[...board.slice(0,10),...board.filter(run=>cleanPlayer&&run.uid===s.uid&&run.name===cleanPlayer)];
   const missing=[...new Map(wanted.filter(run=>!run.build).map(run=>[run.id,run])).values()];
   const recovered=await Promise.allSettled(missing.map(run=>request(`${config.databaseURL}/${BUILDS_PATH}/${encodeURIComponent(run.id)}.json?auth=${encodeURIComponent(s.idToken)}`)));
   recovered.forEach((result,i)=>{const run=missing[i],build=result.status==='fulfilled'?result.value:null;if(validBuild(build)&&build.uid===run.uid)run.build=build;});
  }catch{}
  return board;
 }
 async function post({name,score,cycle,stage,kills,time,build=null}){
  const shaped={uid:'check',name:cleanName(name),score:Math.floor(score),cycle,stage,kills,time:Math.floor(time),at:0};
  if(!validRun(shaped)||isBadName(shaped.name))throw new Error('invalid-run');
  const s=await signIn();
  const created=await request(runsURL(s),{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({...shaped,uid:s.uid,at:{'.sv':'timestamp'}})});
  // The build is extra: if it cannot be written (older rules), the run still counts.
  if(created?.name&&validBuild(build)){
   try{await request(`${config.databaseURL}/${BUILDS_PATH}/${encodeURIComponent(created.name)}.json?auth=${encodeURIComponent(s.idToken)}`,{method:'PUT',headers:{'Content-Type':'application/json'},body:JSON.stringify({uid:s.uid,laws:build.laws,forms:build.forms,relic:build.relic,wardens:build.wardens,austins:build.austins})});}catch{}
  }
  return {id:created?.name,uid:s.uid,name:shaped.name};
 }
 function pending(){try{const list=JSON.parse(storage?.getItem(PENDING_KEY));return Array.isArray(list)?list:[];}catch{return [];}}
 function keepPending(list){try{storage?.setItem(PENDING_KEY,JSON.stringify(list.slice(-PENDING_MAX)));}catch{}}
 // Returns the board after the run, the run's place on it (0 if it is not this player's best or below the board)
 // and the place of this player's best line. A run that could not be sent waits in this browser for flush().
 async function submit(entry,limit=20){
  let sent;
  try{sent=await post(entry);}
  catch(error){if(error.message!=='invalid-run')keepPending([...pending(),{name:entry.name,score:entry.score,cycle:entry.cycle,stage:entry.stage,kills:entry.kills,time:entry.time,build:validBuild(entry.build)?entry.build:null}]);throw error;}
  const board=await top(limit,sent.name);
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
 async function remove(id){const s=await signIn();try{await request(`${config.databaseURL}/${BUILDS_PATH}/${encodeURIComponent(id)}.json?auth=${encodeURIComponent(s.idToken)}`,{method:'DELETE'});}catch{}await request(`${config.databaseURL}/${RUNS_PATH}/${encodeURIComponent(id)}.json?auth=${encodeURIComponent(s.idToken)}`,{method:'DELETE'});return true;}
 return {signIn,top,submit,flush,remove,pendingCount:()=>pending().length,uid:()=>session?.uid||null};
}
