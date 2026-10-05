import {EXPANSION_OBJECTIVES,defenseObjectiveEligible} from './defense-objective.js';
import {EXPANSION_ACTS,expansionCircuitReleased} from './act-expansion.js';
import {createDefenseAccountStore,validDefenseAccountRecord,DEFENSE_ACCOUNT_LIMIT} from './defense-account-save.js';

const bytes=value=>JSON.stringify(value);
export function decodeDefenseAccountCloud(value,owner,circuit){
 if(value===null)return {revision:0,record:null};
 if(!value||value.version!==1||value.ownerUid!==owner||value.circuit!==circuit||!Number.isSafeInteger(value.revision)||value.revision<1||typeof value.checkpoint!=='string'||value.checkpoint.length>DEFENSE_ACCOUNT_LIMIT||Object.keys(value).some(k=>!['version','ownerUid','circuit','revision','checkpoint'].includes(k)))throw Error('invalid');
 let record;try{record=JSON.parse(value.checkpoint);}catch{throw Error('invalid');}
 if(!validDefenseAccountRecord(record,owner,circuit))throw Error('invalid');return {revision:value.revision,record};
}
export function defenseAccountLabel(state){return ({synced:'계정에 저장됐어요 · 다른 기기에서도 준비를 이어할 수 있어요',empty:'저장된 준비가 없어요',local:'이 기기에 저장했어요 · 계정 전송 대기',checking:'계정 준비 저장을 확인하고 있어요…',conflict:'두 기기에서 따로 준비했어요 · 이어갈 기록을 선택하세요',remote:'다른 기기 기록이 바뀌었어요 · 나간 뒤 다시 확인하세요',offline:'연결이 끊겼어요 · 이 기기 저장은 보존돼요',permission:'계정 저장 권한 확인이 필요해요 · 이 기기 저장은 보존돼요',invalid:'읽을 수 없는 저장이 있어요 · 원본을 보존합니다',storage:'저장 공간을 확인해 주세요 · 계정 기록은 덮지 않았어요',account:'계정이 바뀌었어요 · 기록을 덮지 않았어요',lease:'다른 창에서 수호전을 진행 중이에요',ineligible:'이 기기에만 저장해요'})[state?.kind]||'계정 저장 확인이 필요해요';}

export function createDefenseAccountSync({storage,account,owner,circuit=3,lease,databaseURL,acts=EXPANSION_ACTS,objectives=EXPANSION_OBJECTIVES,practice=()=>false,isActive=()=>false,fetchImpl=globalThis.fetch,timeout=10000,onState=()=>{}}={}){
 let state={kind:'local',owner},flight=null;
 const eligible=()=>account.user()?.uid===owner&&!account.user()?.isAnonymous&&practice()===false&&(circuit===3||circuit===5&&expansionCircuitReleased(acts));
 const current=()=>{if(!eligible())throw Error('account');if(!lease?.active())throw Error('lease');};
 const store=createDefenseAccountStore({storage,owner,circuit,currentOwner:()=>account.user()?.uid,lease,acts,objectives});
 const metaKey=store.key+':sync',set=(kind,extra={})=>{state={kind,owner,...extra};onState(state);return state;};
 const persist=(key,text)=>{storage.setItem(key,text);if(storage.getItem(key)!==text)throw Error('storage');};
 function meta(){const raw=storage.getItem(metaKey);if(raw===null)return {version:1,revision:0,record:null};let m;try{m=JSON.parse(raw);}catch{throw Error('invalid');}if(m?.version!==1||!Number.isSafeInteger(m.revision)||m.revision<0||!(m.record===null||typeof m.record==='string'&&m.record.length<=DEFENSE_ACCOUNT_LIMIT)||Object.keys(m).some(k=>!['version','revision','record'].includes(k)))throw Error('invalid');return m;}
 const ack=(revision,record)=>persist(metaKey,bytes({version:1,revision,record:record===null?null:bytes(record)}));
 async function perform({allowPull=false,choice=null,expected=null}={}){
  if(!eligible())return set('ineligible');set('checking');const controller=new AbortController(),alarm=setTimeout(()=>controller.abort(),timeout);
  try{
   current();store.readRecord();const before=meta();
   const session=await Promise.race([account.tokenSession(),new Promise((_,reject)=>{if(controller.signal.aborted)reject(Error('offline'));else controller.signal.addEventListener('abort',()=>reject(Error('offline')),{once:true});})]);
   current();if(session?.uid!==owner||!session.idToken)throw Error('account');
   const url=databaseURL.replace(/\/$/,'')+'/seedDefenseSaves/'+encodeURIComponent(owner)+'/'+circuit+'.json?auth='+encodeURIComponent(session.idToken);
   const response=await fetchImpl(url,{headers:{'X-Firebase-ETag':'true'},signal:controller.signal,cache:'no-store'});
   if(!response.ok)throw Error([401,403].includes(response.status)?'permission':'offline');
   const remote=decodeDefenseAccountCloud(await response.json(),owner,circuit),etag=response.headers?.get?.('ETag');current();
   const local=store.readRecord(),localBytes=bytes(local),remoteBytes=bytes(remote.record);
   const objectiveCurrent=()=>{for(const r of [local,remote.record])if(r&&!defenseObjectiveEligible({actCount:r.circuit,objective:r.version===2?r.objective:null},{owner,currentOwner:account.user()?.uid,practice:practice(),objectives:typeof objectives==='function'?objectives():objectives}))throw Error('ineligible');};objectiveCurrent();
   const conflict=()=>set('conflict',{local,remote:remote.record,expected:{revision:remote.revision,local:localBytes,etag}});
   const verifiedFreshPull=Boolean(local?.version===1&&local.ended&&remote.record?.version===2&&remote.record.id!==local.id&&remote.record.previousObjective===localBytes&&before.record===localBytes);
   if(local&&remote.record&&(local.version===2?local.objective:null)!==(remote.record.version===2?remote.record.objective:null)&&!(remote.record.ended&&local.id!==remote.record.id&&local.previousObjective===remoteBytes&&before.record===remoteBytes)&&!verifiedFreshPull)return conflict();
   if(local&&remote.record&&local.id===remote.record.id&&local.previousObjective!==remote.record.previousObjective)return conflict();
   if(remote.revision<before.revision)return conflict();
   if(localBytes===remoteBytes){ack(remote.revision,local);return set(local?'synced':'empty');}
   if(choice!==null&&!['local','remote'].includes(choice))throw Error('invalid');
   if(choice&&(!expected||expected.revision!==remote.revision||expected.local!==localBytes||expected.etag!==etag))return conflict();
   const clean=(local===null?null:localBytes)===before.record,dead=remote.record?.ended&&remote.record.id===local?.id;
   if(choice==='remote'||dead||!choice&&(!local||clean)){
    if(!remote.record)return conflict();if(!allowPull||isActive())return set('remote');
    const result=verifiedFreshPull?store.adoptFresh(local,remote.record):store.replace(local,remote.record);if(!result.ok)return result.reason==='conflict'?conflict():set(result.reason);current();ack(remote.revision,remote.record);return set('synced',{pulled:true});
   }
   if(!local)return set('empty');if(choice!=='local'&&remote.revision!==before.revision)return conflict();
   if(!etag)throw Error('offline');
   if(remote.record){const previous=storage.getItem(store.key+':previous-cloud');if(previous!==null&&!validDefenseAccountRecord(JSON.parse(previous),owner,circuit))throw Error('invalid');persist(store.key+':previous-cloud',remoteBytes);}
   current();objectiveCurrent();if(bytes(store.readRecord())!==localBytes)return set('local');
   const payload={version:1,ownerUid:owner,circuit,revision:remote.revision+1,checkpoint:localBytes};
   const put=await fetchImpl(url,{method:'PUT',headers:{'Content-Type':'application/json','if-match':etag},body:bytes(payload),signal:controller.signal,cache:'no-store'});current();objectiveCurrent();
   if(put.status===412)return conflict();if(!put.ok)throw Error([401,403].includes(put.status)?'permission':'offline');
   ack(payload.revision,local);return set(bytes(store.readRecord())===localBytes?'synced':'local');
  }catch(error){return set(['account','lease','permission','storage','invalid','ineligible'].includes(error.message)?error.message:'offline');}finally{clearTimeout(alarm);}
 }
 const sync=options=>{if(flight)return flight;flight=perform(options).finally(()=>{flight=null;});return flight;};
 return {store,state:()=>state,sync,changed:()=>set('local'),async flush(options={}){let result;for(let i=0;i<3;i++){result=await sync(options);if(result.kind!=='local')break;}return result;}};
}
