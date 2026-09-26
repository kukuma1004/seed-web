import {SURVIVAL,readSurvivalRecord} from './survival-rules.js';

export const SURVIVAL_BEST_PATH='seedSurvivalRecords';
export function survivalRecordStorage(storage,uid='guest'){
 const key=SURVIVAL.recordKey+':'+encodeURIComponent(uid||'guest');
 return {getItem:()=>storage.getItem(key),setItem:(_key,value)=>storage.setItem(key,value)};
}
export function bestSurvival(value={}){
 const n=(key,max)=>Number.isFinite(value?.[key])?Math.max(0,Math.min(max,value[key])):0;
 return {version:1,bestKills:Math.floor(n('bestKills',1e7)),bestBosses:Math.floor(n('bestBosses',1000)),bestTime:n('bestTime',86400),fastestClear:n('fastestClear',86400)>=810?n('fastestClear',86400):0};
}
export function mergeSurvivalBest(a,b){
 a=bestSurvival(a);b=bestSurvival(b);const fastest=Math.min(a.fastestClear||Infinity,b.fastestClear||Infinity);return {version:1,bestKills:Math.max(a.bestKills,b.bestKills),bestBosses:Math.max(a.bestBosses,b.bestBosses),bestTime:Math.max(a.bestTime,b.bestTime),fastestClear:Number.isFinite(fastest)?fastest:0};
}
const cacheKey=uid=>'seed-survival-account-best-v1:'+encodeURIComponent(uid||'guest');
export function readSurvivalAccountRecord(storage,uid='guest'){
 const local=readSurvivalRecord(survivalRecordStorage(storage,uid));let cache=null;try{cache=JSON.parse(storage.getItem(cacheKey(uid)));}catch{}
 return {...local,...mergeSurvivalBest(local,cache)};
}
// Personal bests merge monotonically; local run/win counters are explicitly
// device-local. Never sum counters from two copies of the same resumed run.
export function createSurvivalRecordSync({storage,account,databaseURL,fetchImpl=fetch}){
 let flight=null;
 async function perform(){
  const user=account.user();if(!user||user.isAnonymous)return {kind:'guest'};
  const uid=user.uid,local=survivalRecordStorage(storage,uid),controller=new AbortController();
  const alarm=setTimeout(()=>controller.abort(),10000);
  const check=()=>{if(account.user()?.uid!==uid)throw Error('account-changed');};
  try{
   const s=await Promise.race([account.tokenSession(),new Promise((_,reject)=>controller.signal.addEventListener('abort',()=>reject(Error('timeout')),{once:true}))]);check();
   if(s?.uid!==uid||!s.idToken)throw Error('auth');
   const url=`${databaseURL}/${SURVIVAL_BEST_PATH}/${encodeURIComponent(uid)}.json?auth=${encodeURIComponent(s.idToken)}`;
   for(let i=0;i<3;i++){
    const r=await fetchImpl(url,{cache:'no-store',signal:controller.signal,headers:{'X-Firebase-ETag':'true'}});if(!r.ok)throw Error('read');
    const remote=await r.json(),merged=mergeSurvivalBest(readSurvivalAccountRecord(storage,uid),remote),etag=r.headers.get('ETag');check();
    if(JSON.stringify(bestSurvival(remote))!==JSON.stringify(merged)){
     if(!etag)throw Error('etag');
     const put=await fetchImpl(url,{method:'PUT',signal:controller.signal,headers:{'Content-Type':'application/json','if-match':etag},body:JSON.stringify(merged)});check();
     if(put.status===412)continue;if(!put.ok)throw Error('write');
    }
    storage.setItem(cacheKey(uid),JSON.stringify(mergeSurvivalBest(readSurvivalAccountRecord(storage,uid),merged)));
    return {kind:'synced'};
   }return {kind:'retry'};
  }catch{return {kind:'offline'};}finally{clearTimeout(alarm);}
 }
 return {sync(){if(!flight)flight=perform().finally(()=>{flight=null;});return flight;}};
}
