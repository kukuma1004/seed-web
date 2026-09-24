import {FIREBASE_APP} from './account-auth.js';
import {CLOUD_META_KEY,CLOUD_OWNER_KEY,collectCloudSnapshot,normalizeCloudSnapshot,mergeCloudSnapshots,applyRewardGrants,applyCloudSnapshot,isSyncKey,readCloudMeta,normalizeCloudMeta,clearCloudLocalData,replacedRuns,rememberReplacedRuns,snapshotAdds} from './cloud-save.js';

const encode=value=>encodeURIComponent(value);
const wait=ms=>new Promise(resolve=>setTimeout(resolve,ms));
const requestError=async response=>{let detail='';try{detail=(await response.json())?.error||'';}catch{}const error=new Error(`Firebase ${response.status}${detail?`: ${detail}`:''}`);error.status=response.status;throw error;};

export function createCloudSync({storage,account,fetchImpl=globalThis.fetch,now=Date.now,debounceMs=1800,onSynced=()=>{}}={}){
 let active=false,timer=null,running=null,dirty=false,lastRewards=[],retryDelayMs=10_000;
 const base=FIREBASE_APP.databaseURL.replace(/\/$/,'');
 const raw=storage;
 const meta=()=>readCloudMeta(raw);
 const writeMeta=value=>raw?.setItem(CLOUD_META_KEY,JSON.stringify(normalizeCloudMeta(value)));
 const owner=()=>{try{return raw?.getItem(CLOUD_OWNER_KEY)||'';}catch{return '';}};
 const setOwner=uid=>{try{raw?.setItem(CLOUD_OWNER_KEY,uid);}catch{}};
 const markDirty=()=>{if(!active)return;const m=meta();writeMeta({...m,ownerUid:account.user()?.uid||m.ownerUid,localRevision:m.localRevision+1,updatedAt:now()});dirty=true;schedule();};
 const tracked={
  getItem:key=>raw?.getItem(key)??null,
  setItem(key,value){raw?.setItem(key,value);if(isSyncKey(key))markDirty();},
  removeItem(key){raw?.removeItem(key);if(isSyncKey(key))markDirty();}
 };

 async function firebase(path,{method='GET',body,etag=false,ifMatch=null}={}){
  const session=await account.tokenSession();if(!session?.uid||!session.idToken)throw new Error('AUTH_REQUIRED');
  const headers={};if(body!==undefined)headers['Content-Type']='application/json';
  if(etag)headers['X-Firebase-ETag']='true';
  if(ifMatch)headers['if-match']=ifMatch;
  const response=await fetchImpl(`${base}/${path}.json?auth=${encode(session.idToken)}`,{method,headers:Object.keys(headers).length?headers:undefined,body:body===undefined?undefined:JSON.stringify(body)});
  if(!response.ok)await requestError(response);
  const value=response.status===204?null:await response.json();
  return etag?{value,etag:response.headers?.get?.('etag')||null}:value;
 }

 async function perform({startup=false,conflictRetries=2,carriedRewards=[]}={}){
  const session=await account.tokenSession();if(!session?.uid)return {ok:false,reason:'signed-out',changed:false,rewards:[]};
  const uid=session.uid,previousOwner=owner(),m=meta(),migration=account.pendingMigration?.(),migrating=Boolean(migration?.fromUid&&migration?.toUid===uid&&(!previousOwner||previousOwner===migration.fromUid));
  let remote=null,remoteEtag=null,rewards=null;
  try{const [save,result]=await Promise.all([firebase(`seedUsers/${uid}/save`,{etag:true}),firebase(`seedUserRewards/${uid}`)]);remote=save.value;remoteEtag=save.etag;rewards=result;}catch(error){if(error.status!==401&&error.status!==403&&(dirty||meta().localRevision>meta().syncedRevision))scheduleRetry();return {ok:false,reason:'offline',error,changed:false,rewards:[]};}
  // 2026-09-21: 서버에서 받아 오는 동안 새로 저장한 것이 있으면 그것도 '올려야 할 것'으로 본다.
  // (예전에는 시작할 때 읽은 표시만 봐서, 그 사이 저장을 서버의 옛 저장으로 덮어쓸 수 있었다.)
  const fresh=meta(),local=collectCloudSnapshot(raw,{revision:fresh.localRevision,updatedAt:fresh.updatedAt||now()});
  const sameOwner=!previousOwner||previousOwner===uid;
  const localDirty=sameOwner&&fresh.localRevision>fresh.syncedRevision;
  let merged;
  if(remote)merged=mergeCloudSnapshots(local,remote,{prefer:migrating||localDirty?'local':'remote'});
  else if(sameOwner||migrating)merged=local;
  else merged=normalizeCloudSnapshot({version:1,updatedAt:now()});
  const rewardResult=applyRewardGrants(merged,rewards,now());merged=rewardResult.snapshot;lastRewards=[...carriedRewards,...rewardResult.applied];
  // 2026-09-23: 이 기기에만 있던 것(도감·더 최근 판)이 병합에 들어갔으면, 이 기기에 새 저장이 없어도 올린다.
  // 예전에는 올리지 않아서, 다른 기기가 그 도감을 받지 못한 채 계속 옛 저장을 보았다.
  const shouldUpload=!remote||migrating||localDirty||lastRewards.length>0||(sameOwner&&snapshotAdds(merged,remote));
  const nextRevision=shouldUpload?Math.max(Number(remote?.revision)||0,m.localRevision,merged.revision)+1:Math.max(Number(remote?.revision)||0,merged.revision);
  merged={...merged,revision:nextRevision,updatedAt:shouldUpload?now():(Number(remote?.updatedAt)||merged.updatedAt)};
  if(sameOwner)rememberReplacedRuns(raw,replacedRuns(local,merged),now());
  active=false;const changed=applyCloudSnapshot(raw,merged);active=true;
  if(shouldUpload)try{await firebase(`seedUsers/${uid}/save`,{method:'PUT',body:merged,ifMatch:remoteEtag});}
  catch(error){
   // Another device saved between our read and write. Fetch and merge its new
   // state instead of blindly replacing it with the stale snapshot.
   if(error.status===412&&conflictRetries>0)return perform({startup,conflictRetries:conflictRetries-1,carriedRewards:lastRewards});
   dirty=true;if(error.status!==401&&error.status!==403)scheduleRetry();return {ok:false,reason:error.status===412?'conflict':'upload',error,changed,rewards:lastRewards};
  }
  // 2026-09-21: 올리는 사이에 저장한 것(방 저장·코인 등)은 이번 업로드에 들어가지 않았다. 예전에는 여기서 '다 올림'으로
  // 덮어써서, 다음 실행 때 서버의 옛 저장이 기기의 최신 저장을 이겨 진행이 되돌아갔다. 그 경우 '아직 안 올림'으로 남기고 곧 다시 올린다.
  const wroteDuring=meta().localRevision>fresh.localRevision;
  setOwner(uid);writeMeta({ownerUid:uid,localRevision:wroteDuring?nextRevision+1:nextRevision,syncedRevision:nextRevision,updatedAt:wroteDuring?now():merged.updatedAt});dirty=wroteDuring;
  retryDelayMs=10_000;
  if(wroteDuring)schedule();
  if(migrating)account.finishMigration?.();
  if(lastRewards.length)try{globalThis.sessionStorage?.setItem('seed-cloud-reward-notice-v1',JSON.stringify(lastRewards));}catch{}
  try{raw?.setItem('seed-cloud-last-sync-v1',String(now()));}catch{}
  if(!dirty)try{onSynced();}catch{}
  return {ok:true,changed,rewards:lastRewards,startup,migrated:migrating};
 }

 async function syncNow(options={}){if(running)return running;clearTimeout(timer);timer=null;running=perform(options).finally(()=>{running=null;});return running;}
 function schedule(delay=debounceMs){clearTimeout(timer);timer=setTimeout(()=>syncNow().catch(()=>{}),delay);}
 function scheduleRetry(){schedule(retryDelayMs);retryDelayMs=Math.min(retryDelayMs*2,60_000);}
 // A saved run must be on the server before another device can continue it.
 // If another write lands during an upload, wait for that revision as well.
 async function flush({attempts=3}={}){let result;for(let i=0;i<attempts;i++){result=await syncNow();if(!result.ok||!dirty)return result;}return {...result,ok:false,reason:'pending'};}
 async function start(){
  await account.ready();active=true;
  if(!account.user())return {ok:false,reason:'signed-out',changed:false,rewards:[]};
  return syncNow({startup:true});
 }
 async function retry({attempts=2}={}){let result;for(let i=0;i<attempts;i++){result=await syncNow();if(result.ok)return result;await wait(350*(i+1));}return result;}
 function signOutCleanup(){active=false;clearTimeout(timer);timer=null;clearCloudLocalData(raw);dirty=false;lastRewards=[];}
 function consumeRewardNotice(){try{const value=JSON.parse(globalThis.sessionStorage?.getItem('seed-cloud-reward-notice-v1')||'[]');globalThis.sessionStorage?.removeItem('seed-cloud-reward-notice-v1');return Array.isArray(value)?value:[];}catch{return [];}}
 return {storage:tracked,start,syncNow,flush,retry,signOutCleanup,consumeRewardNotice,isDirty:()=>dirty,lastRewards:()=>[...lastRewards]};
}
