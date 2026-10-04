import {EXPANSION_ACTS} from './act-expansion.js';
import {createExpansionAccountSaveStore,expansionAccountEligible,validExpansionAccountSave,EXPANSION_ACCOUNT_SAVE_LIMIT} from './expansion-account-save.js';
import {acquireExpansionSaveLease} from './expansion-save-lease.js';

const META='seed-expansion-account-sync-v1:';
const bytes=value=>value===null?null:JSON.stringify(value);
const committed=(value,owner,act)=>validExpansionAccountSave(value,{owner,act})&&value.entry.revision>0&&Number.isSafeInteger(value.entry.savedAt)&&value.entry.savedAt>0;
export function decodeExpansionAccountCloud(value,{owner,act}={}){
 if(value===null)return {revision:0,record:null};
 if(!value||value.version!==1||value.ownerUid!==owner||value.act!==act||!Number.isSafeInteger(value.revision)||value.revision<1||typeof value.checkpoint!=='string'||value.checkpoint.length>EXPANSION_ACCOUNT_SAVE_LIMIT||Object.keys(value).some(k=>!['version','ownerUid','act','revision','checkpoint'].includes(k)))throw Error('invalid');
 let record;try{record=JSON.parse(value.checkpoint);}catch{throw Error('invalid');}
 if(!committed(record,owner,act))throw Error('invalid');
 return {revision:value.revision,record};
}

// Independent combat timelines require an explicit choice. Local revision
// numbers and device clocks cannot establish ancestry across two devices.
// This adapter is dormant while the real content release gates are closed.
export function createExpansionAccountSync({storage,account,act,databaseURL,fetchImpl=globalThis.fetch,context=()=>({}),acts=EXPANSION_ACTS,isActive=()=>false,activeLease=()=>null,acquireLease=acquireExpansionSaveLease,timeout=10000,onState=()=>{}}={}){
 let flight=null,state={kind:'idle'};
 const user=()=>account.user();
 const facts=owner=>({...context(),currentOwner:user()?.uid,acts});
 const eligible=owner=>!user()?.isAnonymous&&expansionAccountEligible(act,owner,facts(owner));
 const set=(kind,owner,extra={})=>{state={kind,owner,act,...extra};onState(state);return state;};
 const current=owner=>{if(user()?.uid!==owner)throw Error('account');if(!eligible(owner))throw Error('ineligible');};
 const metaKey=owner=>`${META}${encodeURIComponent(owner)}:${act}`;
 const persist=(key,value)=>{try{storage.setItem(key,value);if(storage.getItem(key)!==value)throw Error('storage');}catch{throw Error('storage');}};
 function meta(owner){
  let raw;try{raw=storage.getItem(metaKey(owner));}catch{throw Error('storage');}
  if(raw===null)return {version:1,revision:0,record:null};
  try{const v=JSON.parse(raw);if(v?.version!==1||!Number.isSafeInteger(v.revision)||v.revision<0||!(v.record===null||typeof v.record==='string'&&v.record.length<=EXPANSION_ACCOUNT_SAVE_LIMIT)||Object.keys(v).some(k=>!['version','revision','record'].includes(k)))throw Error();return v;}catch{throw Error('invalid');}
 }
 const ack=(owner,revision,record)=>persist(metaKey(owner),JSON.stringify({version:1,revision,record:bytes(record)}));
 async function perform({allowPull=false,choice=null,expected=null}={}){
  const owner=user()?.uid;if(!eligible(owner))return set('ineligible',owner);
  set('checking',owner);
  let lease=null,borrowed=false;const controller=new AbortController(),alarm=setTimeout(()=>controller.abort(),timeout);
  try{
   lease=activeLease();borrowed=Boolean(lease?.ok&&lease.active());
   if(!borrowed)lease=await acquireLease(act,owner);
   current(owner);
   if(!lease?.ok||!lease.active())return set(lease?.reason==='unsupported'?'unsupported':'busy',owner);
   const store=createExpansionAccountSaveStore(storage,act,owner,{context:()=>facts(owner),lease});
   if(lease.key!==store.lockKey)throw Error('lease');
   const read=()=>{let raw;try{raw=storage.getItem(store.key);}catch{throw Error('storage');}const record=store.read();if(raw!==null&&!record)throw Error('invalid');return record;};
   // Unknown local or metadata bytes must survive without any network write.
   read();const beforeMeta=meta(owner);
   const session=await Promise.race([account.tokenSession(),new Promise((_,reject)=>{if(controller.signal.aborted)reject(Error('offline'));else controller.signal.addEventListener('abort',()=>reject(Error('offline')),{once:true});})]);
   current(owner);if(session?.uid!==owner||!session.idToken)throw Error('account');
   const url=databaseURL.replace(/\/$/,'')+'/seedExpansionSaves/'+encodeURIComponent(owner)+'/'+encodeURIComponent(act)+'.json?auth='+encodeURIComponent(session.idToken);
   const response=await fetchImpl(url,{headers:{'X-Firebase-ETag':'true'},signal:controller.signal,cache:'no-store'});
   if(!response.ok)throw Error(response.status===401||response.status===403?'permission':'offline');
   const remote=decodeExpansionAccountCloud(await response.json(),{owner,act}),etag=response.headers?.get?.('ETag');current(owner);
   if(!lease.active())throw Error('lease');
   const local=read(),localBytes=bytes(local),remoteBytes=bytes(remote.record);
   const conflict=()=>set('conflict',owner,{local,remote:remote.record,expected:{revision:remote.revision,local:localBytes,etag}});
   if(remote.revision<beforeMeta.revision)return conflict();
   if(localBytes===remoteBytes){ack(owner,remote.revision,local);return set(local?'synced':'empty',owner);}
   if(choice!==null&&!['local','remote'].includes(choice))throw Error('invalid');
   if(choice&&(!expected||expected.revision!==remote.revision||expected.local!==localBytes||expected.etag!==etag))return conflict();
   const clean=localBytes===beforeMeta.record;
   const dead=remote.record?.entry.ended===true&&remote.record.entry.id===local?.entry.id;
   const pull=choice==='remote'||dead||(!choice&&(!local||clean));
   if(pull){
    if(!remote.record)return conflict(); // Missing server data cannot erase a local run.
    if(!allowPull||isActive())return set('remote',owner);
    const replaced=store.replace(local,remote.record,{allowDifferentRun:choice==='remote',allowEnded:dead,allowFork:choice==='remote'||clean});
    if(!replaced.ok)return replaced.reason==='conflict'?conflict():set(replaced.reason==='storage'?'storage':'invalid',owner);
    current(owner);ack(owner,remote.revision,remote.record);return set('synced',owner,{pulled:true});
   }
   if(!local)return set('empty',owner);
   if(choice!=='local'&&remote.revision!==beforeMeta.revision)return conflict();
   if(!etag)throw Error('offline');
   if(remote.record){
    let previous;try{previous=storage.getItem(store.key+':previous-cloud');}catch{throw Error('storage');}
    if(previous!==null){let value;try{value=JSON.parse(previous);}catch{throw Error('invalid');}if(!committed(value,owner,act))throw Error('invalid');}
    persist(store.key+':previous-cloud',remoteBytes);
   }
   current(owner);if(!lease.active())throw Error('lease');
   // Saving during GET/backup never licenses uploading a stale local snapshot.
   if(bytes(read())!==localBytes)return set('local',owner);
   const revision=remote.revision+1;
   const body={version:1,ownerUid:owner,act,revision,checkpoint:localBytes};
   const put=await fetchImpl(url,{method:'PUT',headers:{'Content-Type':'application/json','if-match':etag},body:JSON.stringify(body),signal:controller.signal,cache:'no-store'});
   current(owner);
   if(put.status===412)return conflict();
   if(!put.ok)throw Error(put.status===401||put.status===403?'permission':'offline');
   ack(owner,revision,local);return set(bytes(read())===localBytes?'synced':'local',owner);
  }catch(error){return set(['account','ineligible','storage','invalid','permission','lease'].includes(error.message)?error.message:'offline',owner);}
  finally{clearTimeout(alarm);if(lease&&!borrowed)await lease.release();}
 }
 function sync(options={}){if(flight)return flight;flight=perform(options).finally(()=>{flight=null;});return flight;}
 return {state:()=>eligible(user()?.uid)&&state.owner===user()?.uid?state:{kind:'ineligible',act},sync,async flush(options={}){let result;for(let i=0;i<3;i++){result=await sync(options);if(result.kind!=='local')break;}return result;}};
}
