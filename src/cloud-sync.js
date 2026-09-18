import {FIREBASE_APP} from './account-auth.js';
import {CLOUD_META_KEY,CLOUD_OWNER_KEY,collectCloudSnapshot,normalizeCloudSnapshot,mergeCloudSnapshots,applyRewardGrants,applyCloudSnapshot,isSyncKey,readCloudMeta,normalizeCloudMeta,clearCloudLocalData} from './cloud-save.js';

const encode=value=>encodeURIComponent(value);
const wait=ms=>new Promise(resolve=>setTimeout(resolve,ms));
const requestError=async response=>{let detail='';try{detail=(await response.json())?.error||'';}catch{}const error=new Error(`Firebase ${response.status}${detail?`: ${detail}`:''}`);error.status=response.status;throw error;};

export function createCloudSync({storage,account,fetchImpl=globalThis.fetch,now=Date.now,debounceMs=1800}={}){
 let active=false,timer=null,running=null,dirty=false,lastRewards=[];
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

 async function firebase(path,{method='GET',body}={}){
  const session=await account.tokenSession();if(!session?.uid||!session.idToken)throw new Error('AUTH_REQUIRED');
  const response=await fetchImpl(`${base}/${path}.json?auth=${encode(session.idToken)}`,{method,headers:body===undefined?undefined:{'Content-Type':'application/json'},body:body===undefined?undefined:JSON.stringify(body)});
  if(!response.ok)await requestError(response);
  return response.status===204?null:response.json();
 }

 async function perform({startup=false}={}){
  const session=await account.tokenSession();if(!session?.uid)return {ok:false,reason:'signed-out',changed:false,rewards:[]};
  const uid=session.uid,previousOwner=owner(),m=meta(),migration=account.pendingMigration?.(),migrating=Boolean(migration?.fromUid&&migration?.toUid===uid&&(!previousOwner||previousOwner===migration.fromUid));
  let remote=null,rewards=null;
  try{[remote,rewards]=await Promise.all([firebase(`seedUsers/${uid}/save`),firebase(`seedUserRewards/${uid}`)]);}catch(error){return {ok:false,reason:'offline',error,changed:false,rewards:[]};}
  const local=collectCloudSnapshot(raw,{revision:m.localRevision,updatedAt:m.updatedAt||now()});
  const sameOwner=!previousOwner||previousOwner===uid;
  const localDirty=sameOwner&&m.localRevision>m.syncedRevision;
  let merged;
  if(remote)merged=mergeCloudSnapshots(local,remote,{prefer:migrating||localDirty?'local':'remote'});
  else if(sameOwner||migrating)merged=local;
  else merged=normalizeCloudSnapshot({version:1,updatedAt:now()});
  const rewardResult=applyRewardGrants(merged,rewards,now());merged=rewardResult.snapshot;lastRewards=rewardResult.applied;
  const shouldUpload=!remote||migrating||localDirty||lastRewards.length>0;
  const nextRevision=shouldUpload?Math.max(Number(remote?.revision)||0,m.localRevision,merged.revision)+1:Math.max(Number(remote?.revision)||0,merged.revision);
  merged={...merged,revision:nextRevision,updatedAt:shouldUpload?now():(Number(remote?.updatedAt)||merged.updatedAt)};
  active=false;const changed=applyCloudSnapshot(raw,merged);active=true;
  if(shouldUpload)try{await firebase(`seedUsers/${uid}/save`,{method:'PUT',body:merged});}
  catch(error){dirty=true;return {ok:false,reason:'upload',error,changed,rewards:lastRewards};}
  setOwner(uid);writeMeta({ownerUid:uid,localRevision:nextRevision,syncedRevision:nextRevision,updatedAt:merged.updatedAt});dirty=false;
  if(migrating)account.finishMigration?.();
  if(lastRewards.length)try{globalThis.sessionStorage?.setItem('seed-cloud-reward-notice-v1',JSON.stringify(lastRewards));}catch{}
  try{raw?.setItem('seed-cloud-last-sync-v1',String(now()));}catch{}
  return {ok:true,changed,rewards:lastRewards,startup,migrated:migrating};
 }

 async function syncNow(options={}){if(running)return running;clearTimeout(timer);timer=null;running=perform(options).finally(()=>{running=null;});return running;}
 function schedule(){clearTimeout(timer);timer=setTimeout(()=>syncNow().catch(()=>{}),debounceMs);}
 async function start(){
  await account.ready();active=true;
  if(!account.user())return {ok:false,reason:'signed-out',changed:false,rewards:[]};
  return syncNow({startup:true});
 }
 async function retry({attempts=2}={}){let result;for(let i=0;i<attempts;i++){result=await syncNow();if(result.ok)return result;await wait(350*(i+1));}return result;}
 function signOutCleanup(){active=false;clearTimeout(timer);timer=null;clearCloudLocalData(raw);dirty=false;lastRewards=[];}
 function consumeRewardNotice(){try{const value=JSON.parse(globalThis.sessionStorage?.getItem('seed-cloud-reward-notice-v1')||'[]');globalThis.sessionStorage?.removeItem('seed-cloud-reward-notice-v1');return Array.isArray(value)?value:[];}catch{return [];}}
 return {storage:tracked,start,syncNow,retry,signOutCleanup,consumeRewardNotice,isDirty:()=>dirty,lastRewards:()=>[...lastRewards]};
}
