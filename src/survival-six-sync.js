import {routeSurvivalSaveStore,survivalRecordId} from './survival-save.js';
import {createSurvivalSync} from './survival-sync.js';
import {validSurvivalSixRecord,sixEnabled,sameSurvivalSixParent} from './survival-six-save.js';

export const SURVIVAL_SIX_CLOUD_PATH='seedSurvivalSixSaves';
const META='seed-survival-sync-six-v1:';
const identity=s=>s?.writeId||survivalRecordId(s);
export function decodeSurvivalSixCloud(value,{owner}={}){
 if(value===null)return {revision:0,record:null};
 if(value?.version!==3||value.circuit!=='arbor-six-v1'||!Number.isSafeInteger(value.revision)||value.revision<1||typeof value.checkpoint!=='string'||value.checkpoint.length>800000)throw Error('invalid');
 let record;try{record=JSON.parse(value.checkpoint);}catch{throw Error('invalid');}
 if(!validSurvivalSixRecord(record,{owner,enabled:true}))throw Error('invalid');return {revision:value.revision,record};
}
export function createSurvivalSixSync(options){
 const {storage,account,databaseURL,fetchImpl=fetch,delay=30000,timeout=10000,isActive=()=>false,onState=()=>{},objectives=false,sixActs=false,currentOwner=()=>account.user()?.uid,inspection=()=>false}=options;
 let state={kind:'idle'},flight=null,timer=null;
 const user=()=>account.user(),eligible=u=>u?.uid&&!u.isAnonymous;
 const set=(kind,extra={})=>{state={kind,owner:user()?.uid,...extra};onState(state);return state;};
 // Old active saves stay on their original CAS channel and are never promoted.
 const legacy=createSurvivalSync({...options,sixActs:false,ignoreSix:true,onState:()=>{}});
 const meta=uid=>{try{return JSON.parse(storage.getItem(META+encodeURIComponent(uid)))||{};}catch{return {};}};
 const persist=(key,value)=>{try{storage.setItem(key,value);}catch{throw Error('storage');}};
 const ack=(uid,revision,record)=>persist(META+encodeURIComponent(uid),JSON.stringify({revision,writeId:identity(record),recordId:survivalRecordId(record)}));
 const unchanged=uid=>{if(user()?.uid!==uid||!eligible(user())||currentOwner()!==uid||inspection()||!sixEnabled(sixActs))throw Error('account');};
 async function perform({allowPull=false,choice=null,expected=null}={}){
  const u=user();if(!eligible(u))return set('guest');const uid=u.uid;
  if(!sixEnabled(sixActs))return set('invalid');set('checking');
  let route=routeSurvivalSaveStore(storage,uid,{objectives,sixActs,currentOwner,inspection});
  if(!route.kind.startsWith('six')){const result=await legacy.sync({allowPull,choice,expected});return set(result.kind,{...result,owner:uid});}
  if(['six-locked','six-invalid'].includes(route.kind))return set('invalid');
  // Read the predecessor's actual server timeline before first adoption. A
  // copied terminal or an empty local slot alone cannot hide another device.
  let prior;try{prior=await legacy.sync({allowPull});unchanged(uid);}catch{return set('account');}
  if(!['empty','synced'].includes(prior.kind))return set(prior.kind,{...prior,predecessor:true});
  route=routeSurvivalSaveStore(storage,uid,{objectives,sixActs,currentOwner,inspection});
  if(!route.kind.startsWith('six'))return set('synced',{pulled:true,legacy:true});
  const store=route.store,controller=new AbortController(),alarm=setTimeout(()=>controller.abort(),timeout);
  try{
   const session=await Promise.race([account.tokenSession(),new Promise((_,reject)=>controller.signal.addEventListener('abort',()=>reject(Error('offline')),{once:true}))]);
   unchanged(uid);if(session?.uid!==uid||!session.idToken)throw Error('account');
   const url=databaseURL.replace(/\/$/,'')+'/'+SURVIVAL_SIX_CLOUD_PATH+'/'+encodeURIComponent(uid)+'.json?auth='+encodeURIComponent(session.idToken);
   const response=await fetchImpl(url,{headers:{'X-Firebase-ETag':'true'},signal:controller.signal,cache:'no-store'});
   if(!response.ok)throw Error([401,403].includes(response.status)?'permission':'offline');
   const remote=decodeSurvivalSixCloud(await response.json(),{owner:uid}),etag=response.headers.get('ETag');unchanged(uid);
   const local=store.readRecord(),m=meta(uid),localId=survivalRecordId(local);
   const conflict=()=>set('conflict',{local,remote:remote.record,expected:{revision:remote.revision,localId}});
   if(remote.revision<(m.revision||0))return conflict();
   if(remote.record&&!sameSurvivalSixParent(remote.record.parent,route.legacy)||local&&!sameSurvivalSixParent(local.parent,route.legacy))return conflict();
   if(local&&remote.record&&local.id===remote.record.id&&survivalRecordId(local.parent)!==survivalRecordId(remote.record.parent))return conflict();
   if(survivalRecordId(local)===survivalRecordId(remote.record)){ack(uid,remote.revision,local);return set(local?'synced':'empty');}
   if(choice&&(!expected||expected.revision!==remote.revision||expected.localId!==localId))return conflict();
   const dead=remote.record?.ended&&remote.record.id===local?.id,clean=identity(local)===m.writeId;
   if(choice==='remote'||dead||!choice&&(!local||clean)){
    if(!remote.record)return conflict();if(!allowPull||isActive())return set('remote');
    const result=store.replace(local,remote.record);if(!result.ok)return result.reason==='conflict'?conflict():set('storage');
    ack(uid,remote.revision,remote.record);return set('synced',{pulled:true});
   }
   if(!local)return set('empty');if(choice!=='local'&&remote.revision!==(m.revision||0))return conflict();
   if(!etag)throw Error('offline');if(choice==='local'&&remote.record)persist(store.key+':previous-cloud',JSON.stringify(remote.record));
   unchanged(uid);if(survivalRecordId(store.readRecord())!==localId)return set('local');
   const payload={version:3,circuit:'arbor-six-v1',revision:remote.revision+1,updatedAt:{'.sv':'timestamp'},checkpoint:JSON.stringify(local)};
   const put=await fetchImpl(url,{method:'PUT',headers:{'Content-Type':'application/json','if-match':etag},body:JSON.stringify(payload),signal:controller.signal});unchanged(uid);
   if(put.status===412)return set('remote');if(!put.ok)throw Error([401,403].includes(put.status)?'permission':'offline');
   ack(uid,payload.revision,local);return set(survivalRecordId(store.readRecord())===localId?'synced':'local');
  }catch(error){return set(['account','permission','invalid','storage'].includes(error.message)?error.message:'offline');}finally{clearTimeout(alarm);}
 }
 function sync(options={}){if(flight)return flight;clearTimeout(timer);timer=null;flight=perform(options).finally(()=>{flight=null;});return flight;}
 return {state:()=>eligible(user())?(state.owner===user().uid?state:{kind:'idle'}):{kind:'guest'},sync,
  changed(){set(eligible(user())?'local':'guest');if(!eligible(user())||timer)return;timer=setTimeout(()=>{timer=null;void sync();},delay);},
  stop(){clearTimeout(timer);timer=null;legacy.stop();},
  async flush(options={}){let result;for(let i=0;i<3;i++){result=await sync(options);if(result.kind!=='local')break;}return result;}
 };
}
