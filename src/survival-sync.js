import {routeSurvivalSaveStore,validSurvivalRecord,survivalRecordId,SURVIVAL_OBJECTIVE_SAVE_KEY} from './survival-save.js';
import {validSurvivalObjectiveRecord,objectiveEnabled,sameSurvivalObjectiveParent} from './survival-objective-save.js';

const META='seed-survival-sync-v1:';
const identity=s=>s?.writeId||survivalRecordId(s);
export function decodeSurvivalCloud(value,{objectives=false,owner}={}){
 if(value===null)return {revision:0,record:null};
 if(![1,2].includes(value?.version)||!Number.isSafeInteger(value.revision)||value.revision<1||typeof value.checkpoint!=='string'||value.checkpoint.length>800000)throw Error('invalid');
 let record;try{record=JSON.parse(value.checkpoint);}catch{throw Error('invalid');}
 if(!objectiveEnabled(objectives)){
  if(value.version!==1||!validSurvivalRecord(record))throw Error('invalid');
  return {revision:value.revision,record};
 }
 if(value.version===1){
  if(!validSurvivalRecord(record))throw Error('invalid');
  return {revision:value.revision,record:null,legacyRecord:record};
 }
 if(!validSurvivalObjectiveRecord(record,{owner,enabled:objectives}))throw Error('invalid');
 return {revision:value.revision,record};
}
export function survivalSyncLabel(state){
 return ({guest:'게스트 기록은 이 기기에 저장돼요. Google 계정으로 플레이하면 계정 저장을 사용할 수 있어요.',idle:'계정 저장을 확인해 주세요.',checking:'계정 저장 확인 중…',synced:'계정에 저장됐어요. 같은 계정으로 다른 기기에서 이어할 수 있어요.',empty:'저장된 생존전이 없어요.',conflict:'두 기기에서 따로 진행한 기록이 있어요. 이어갈 기록을 선택해 주세요.',remote:'다른 기기에서 바뀐 기록이 있어요. 나간 뒤 이어갈 기록을 확인해 주세요.',offline:'계정에 연결하지 못했어요. 이 기기의 저장은 유지됩니다. 다시 시도해 주세요.',permission:'계정 저장 권한을 확인하지 못했어요. 현재는 이 기기에만 저장돼요.',invalid:'계정 기록을 읽지 못했어요. 이 기기 기록은 변경하지 않았어요.',storage:'기기에 저장할 공간이 부족해요. 계정 기록을 덮어쓰지 않았어요.',account:'로그인 계정이 바뀌었어요. 다시 확인해 주세요.',local:'이 기기에 저장했어요. 계정 저장 확인이 필요해요.'})[state?.kind]||'이 기기에 저장했어요.';
}

// Separate from progression merges: an active combat timeline is never unioned.
// No wall-clock last-writer-wins. Only the server revision read by this device
// may be replaced, using Firebase's ETag conditional write.
export function createSurvivalSync({storage,account,databaseURL,fetchImpl=fetch,delay=30000,timeout=10000,isActive=()=>false,onState=()=>{},objectives=false,currentOwner=()=>account.user()?.uid,inspection=()=>false}){
 let state={kind:'idle'},flight=null,timer=null;
 const user=()=>account.user();
 const eligible=u=>u?.uid&&!u.isAnonymous;
 const set=(kind,extra={})=>{state={kind,owner:user()?.uid,...extra};onState(state);return state;};
 const metaKey=(uid,modern)=>META+(modern?'objective-v2:':'')+encodeURIComponent(uid);
 const meta=(uid,modern)=>{try{return JSON.parse(storage.getItem(metaKey(uid,modern)))||{};}catch{return {};}};
 const persist=(key,value)=>{try{storage.setItem(key,value);}catch{throw Error('storage');}};
 const ack=(uid,revision,record,modern)=>persist(metaKey(uid,modern),JSON.stringify({revision,writeId:identity(record),recordId:survivalRecordId(record)}));
 const unchanged=(uid,modern)=>{if(user()?.uid!==uid||!eligible(user())||currentOwner()!==uid||inspection()||modern&&!objectiveEnabled(objectives))throw Error('account');};
 async function perform({allowPull=false,choice=null,expected=null}={}){
  const u=user();if(!eligible(u))return set('guest');const uid=u.uid,route=routeSurvivalSaveStore(storage,uid,{objectives,currentOwner,inspection}),store=route.store,modern=Boolean(store?.key?.startsWith(SURVIVAL_OBJECTIVE_SAVE_KEY));if(route.kind==='objective-locked')return set('invalid');
  set('checking');const controller=new AbortController(),alarm=setTimeout(()=>controller.abort(),timeout);
  try{
   // Token acquisition also has a deadline: an auth popup must not hang save/exit.
   const session=await Promise.race([account.tokenSession(),new Promise((_,reject)=>controller.signal.addEventListener('abort',()=>reject(Error('offline')),{once:true}))]);
   unchanged(uid,modern);if(session?.uid!==uid||!session.idToken)throw Error('account');
   const url=databaseURL.replace(/\/$/,'')+'/seedSurvivalSaves/'+encodeURIComponent(uid)+'.json?auth='+encodeURIComponent(session.idToken);
   const response=await fetchImpl(url,{headers:{'X-Firebase-ETag':'true'},signal:controller.signal,cache:'no-store'});
   if(!response.ok)throw Error(response.status===401||response.status===403?'permission':'offline');
   const remote=decodeSurvivalCloud(await response.json(),{objectives:modern,owner:uid}),etag=response.headers.get('ETag');unchanged(uid,modern);
   const local=store.readRecord(),m=meta(uid,modern),localId=survivalRecordId(local);
   if(modern&&local&&remote.record&&local.id===remote.record.id&&survivalRecordId(local.parent)!==survivalRecordId(remote.record.parent))return set('conflict',{local,remote:remote.record,expected:{revision:remote.revision,localId}});
   if(modern&&!local&&remote.record?.parent){
    const legacy=routeSurvivalSaveStore(storage,uid,{currentOwner,inspection}).legacy,receipt=meta(uid,false);
    if(!sameSurvivalObjectiveParent(remote.record.parent,legacy)||!Number.isSafeInteger(receipt.revision)||receipt.revision<1||receipt.writeId!==identity(legacy)||receipt.recordId&&receipt.recordId!==survivalRecordId(legacy))return set('conflict',{local,remote:remote.record,expected:{revision:remote.revision,localId}});
   }
   if(modern&&remote.legacyRecord){
    // A new circuit may replace a terminal legacy parent only if the exact
    // cloud terminal is its ancestor and this device already acknowledged it.
    // A matching copied local file without a cloud receipt is not authority.
    const receipt=meta(uid,false);
    if(!local||!sameSurvivalObjectiveParent(local.parent,remote.legacyRecord)||receipt.revision!==remote.revision||receipt.writeId!==identity(remote.legacyRecord)||receipt.recordId&&receipt.recordId!==survivalRecordId(remote.legacyRecord))return set('conflict',{local,remote:remote.legacyRecord,expected:{revision:remote.revision,localId}});
   }
   const conflict=()=>set('conflict',{local,remote:remote.record,expected:{revision:remote.revision,localId}});
   if(remote.revision<(m.revision||0))return conflict();
   if(!remote.legacyRecord&&survivalRecordId(local)===survivalRecordId(remote.record)){ack(uid,remote.revision,local,modern);return set(local?'synced':'empty');}
   if(choice&&(!expected||expected.revision!==remote.revision||expected.localId!==localId))return conflict();
   const clean=identity(local)===m.writeId;
   // A death marker wins over the same run's old combat save even after a
   // deliberate conflict choice. Starting an explicitly new run remains valid.
   const dead=remote.record?.ended&&remote.record.id===local?.id;
   const pull=choice==='remote'||dead||(!choice&&(!local||clean));
   if(pull){
    if(!remote.record)return conflict(); // A missing cloud record cannot erase local progress.
    if(!allowPull||isActive())return set('remote');
    const result=store.replace(local,remote.record);if(!result.ok)return result.reason==='conflict'?conflict():set('storage');
    ack(uid,remote.revision,remote.record,modern);return set('synced',{pulled:true});
   }
   if(!local)return set('empty');
   if(choice!=='local'&&!remote.legacyRecord&&remote.revision!==(m.revision||0))return conflict();
   if(!etag)throw Error('offline'); // Never fall back to an unconditional write.
   if(choice==='local'&&remote.record)persist(store.key+':previous-cloud',JSON.stringify(remote.record));
   unchanged(uid,modern);if(survivalRecordId(store.readRecord())!==localId)return set('local');
   const payload={version:modern?2:1,revision:remote.revision+1,updatedAt:{'.sv':'timestamp'},checkpoint:JSON.stringify(local)};
   const put=await fetchImpl(url,{method:'PUT',headers:{'Content-Type':'application/json','if-match':etag},body:JSON.stringify(payload),signal:controller.signal});
   unchanged(uid,modern);
   if(put.status===412)return set('remote');
   if(!put.ok)throw Error(put.status===401||put.status===403?'permission':'offline');
   ack(uid,payload.revision,local,modern);
   // A save/consumption that happened during upload stays dirty for the next flush.
   return set(survivalRecordId(store.readRecord())===localId?'synced':'local');
  }catch(error){return set(['account','permission','invalid','storage'].includes(error.message)?error.message:'offline');}
  finally{clearTimeout(alarm);}
 }
 function sync(options={}){if(flight)return flight;clearTimeout(timer);timer=null;flight=perform(options).finally(()=>{flight=null;});return flight;}
 return {
  state:()=>eligible(user())?(state.owner===user().uid?state:{kind:'idle'}):{kind:'guest'},sync,
  changed(){set(eligible(user())?'local':'guest');if(!eligible(user())||timer)return;timer=setTimeout(()=>{timer=null;void sync();},delay);},
  stop(){clearTimeout(timer);timer=null;},
  async flush(options={}){let result;for(let i=0;i<3;i++){result=await sync(options);if(result.kind!=='local')break;}return result;}
 };
}
