import {arborSaveKey} from './arbor-run-save.js';
import {acquireExpansionSaveLease} from './expansion-save-lease.js';
import {ARBOR_ACCOUNT_LIMIT,arborAccountEligible,arborAccountLockKey,validArborAccountRecord,validArborPublicEntry,validArborEnded,arborFollowsEnded,createArborAccountRecords} from './arbor-account-records.js';

const META='seed-arbor-account-sync-v1:';
const bytes=v=>v===null?null:JSON.stringify(v);
const parse=raw=>{try{return JSON.parse(raw);}catch{return null;}};
const same=(a,b)=>bytes(a)===bytes(b);
const revision=v=>Number.isSafeInteger(v)&&v>=0&&v<=1000000000;
export function decodeArborAccountCloud(value,{owner}={}){
 if(value===null)return {revision:0,record:null};
 if(!value||value.version!==1||value.ownerUid!==owner||!revision(value.revision)||value.revision<1||typeof value.checkpoint!=='string'||value.checkpoint.length>ARBOR_ACCOUNT_LIMIT||!value.checkpoint.length||Object.keys(value).some(k=>!['version','ownerUid','revision','checkpoint'].includes(k)))throw Error('invalid');
 const record=parse(value.checkpoint);if(!validArborAccountRecord(record,{owner}))throw Error('invalid');
 return {revision:value.revision,record};
}

// Only a separately marked new public run reaches this namespace. Local run
// revisions do not order independent devices: ETag CAS plus the acknowledged
// bytes determine ancestry; forks require a current, explicit selection.
export function createArborAccountSync({storage,account,databaseURL,fetchImpl=globalThis.fetch,context=()=>({}),isActive=()=>false,activeLease=()=>null,acquireLease=acquireExpansionSaveLease,timeout=10000,onState=()=>{}}={}){
 let flight=null,state={kind:'idle',act:'arbor'};
 const user=()=>account.user();
 const facts=()=>({...context(),currentOwner:user()?.uid,anonymous:user()?.isAnonymous!==false});
 const eligible=owner=>arborAccountEligible(owner,facts());
 const getItem=key=>{try{return storage.getItem(key);}catch{throw Error('storage');}};
 const current=owner=>{if(user()?.uid!==owner)throw Error('account');if(!eligible(owner))throw Error('ineligible');};
 const set=(kind,owner,extra={})=>{state={kind,owner,act:'arbor',...extra};try{onState(state);}catch{}return state;};
 const persist=(key,value)=>{try{storage.setItem(key,value);if(storage.getItem(key)!==value)throw Error();}catch{throw Error('storage');}};
 const metaKey=owner=>`${META}${encodeURIComponent(owner)}`;
 function meta(owner){
  const raw=getItem(metaKey(owner));if(raw===null)return {version:1,revision:0,record:null};
  const value=parse(raw);
  if(!value||value.version!==1||!revision(value.revision)||!Object.keys(value).every(k=>['version','revision','record'].includes(k))||!(value.record===null||typeof value.record==='string'&&value.record.length<=ARBOR_ACCOUNT_LIMIT&&validArborAccountRecord(parse(value.record),{owner}))||value.revision===0&&value.record!==null||value.revision>0&&value.record===null)throw Error('invalid');
  return value;
 }
 const ack=(owner,rev,record)=>persist(metaKey(owner),JSON.stringify({version:1,revision:rev,record:bytes(record)}));
 async function perform({allowPull=false,choice=null,expected=null}={}){
  const owner=user()?.uid;if(!eligible(owner))return set('ineligible',owner);
  if(choice!==null&&!['local','remote'].includes(choice))return set('invalid',owner);
  set('checking',owner);let lease=null,borrowed=false;
  const controller=new AbortController(),alarm=setTimeout(()=>controller.abort(),timeout);
  const aborted=new Promise((_,reject)=>controller.signal.addEventListener('abort',()=>reject(Error('offline')),{once:true}));
  const wait=promise=>Promise.race([promise,aborted]);
  try{
   lease=activeLease();borrowed=Boolean(lease?.ok&&lease.active());
   if(!borrowed)lease=await acquireLease('arbor',owner);current(owner);
   if(!lease?.ok||!lease.active())return set(lease?.reason==='unsupported'?'unsupported':'busy',owner);
   if(lease.key!==arborAccountLockKey(owner))throw Error('lease');
   const records=createArborAccountRecords(storage,owner,{context:facts,lease});
   const repair=records.prepare();if(!repair.ok)throw Error(repair.reason==='storage'?'storage':repair.reason==='conflict'?'conflict':'invalid');
   const read=()=>{
    const raw=getItem(records.key),entryRaw=getItem(records.entryKey),record=records.read(),entry=parse(entryRaw);
    if(raw!==null&&!record||entryRaw!==null&&!validArborPublicEntry(entry,owner))throw Error('invalid');
    if(record&&!same(record.entry,entry)){
     if(!entry||entry.id!==record.entry.id)throw Error('invalid');
     const captured=validArborEnded(entry)?records.finish(entry):records.capture(entry);
     if(!captured.ok)throw Error(captured.reason==='storage'?'storage':'invalid');return captured.value;
    }
    return record;
   };
   read();const beforeMeta=meta(owner);
   const session=await wait(account.tokenSession());current(owner);if(session?.uid!==owner||!session.idToken)throw Error('account');
   const url=databaseURL.replace(/\/$/,'')+'/seedArborSaves/'+encodeURIComponent(owner)+'.json?auth='+encodeURIComponent(session.idToken);
   const response=await wait(fetchImpl(url,{headers:{'X-Firebase-ETag':'true'},signal:controller.signal,cache:'no-store'}));
   if(!response.ok)throw Error(response.status===401||response.status===403?'permission':'offline');
   const remote=decodeArborAccountCloud(await wait(response.json()),{owner}),etag=response.headers?.get?.('ETag');current(owner);if(!lease.active())throw Error('lease');
   const local=read(),localBytes=bytes(local),remoteBytes=bytes(remote.record),legacyRaw=getItem(arborSaveKey(owner));
   const legacy=local===null&&legacyRaw!==null;
   const conflict=()=>set('conflict',owner,{local,remote:remote.record,legacy,expected:{revision:remote.revision,local:localBytes,remote:remoteBytes,entry:legacyRaw,etag}});
   if(remote.revision<beforeMeta.revision)return conflict();
   if(legacy&&!remote.record)return set('legacy',owner);
   if(legacy&&remote.record&&choice!=='remote')return conflict();
   if(localBytes===remoteBytes&&!legacy){ack(owner,remote.revision,local);return set(local?'synced':'empty',owner,{recovered:repair.recovered});}
   if(choice&&(!expected||expected.revision!==remote.revision||expected.local!==localBytes||expected.remote!==remoteBytes||expected.entry!==legacyRaw||expected.etag!==etag))return conflict();
   const clean=localBytes===beforeMeta.record,dead=remote.record&&local&&remote.record.entry.id===local.entry.id&&validArborEnded(remote.record.entry);
   const freshPull=local&&remote.record&&arborFollowsEnded(remote.record,local)&&beforeMeta.record===localBytes;
   const freshPush=local&&remote.record&&arborFollowsEnded(local,remote.record)&&beforeMeta.record===remoteBytes;
   const sameRun=local&&remote.record&&local.entry.id===remote.record.entry.id;
   if(sameRun&&!same(local.previousRun,remote.record.previousRun))return conflict();
   if(sameRun&&validArborEnded(local.entry)&&!validArborEnded(remote.record.entry)&&!clean&&choice==='remote')return conflict();
   if(local&&remote.record&&!sameRun&&!freshPull&&!freshPush&&!choice&&!clean)return conflict();
   const pull=choice==='remote'||dead||!choice&&(!local||clean||freshPull);
   if(pull){
    if(!remote.record)return conflict(); // Server absence must not erase a run.
    if(!allowPull||isActive())return set('remote',owner,{legacy});
    const installed=records.replace(local,remote.record,{allowDifferentRun:choice==='remote'||freshPull||clean,allowEnded:dead,allowFork:choice==='remote'||clean});
    if(!installed.ok)return ['conflict','legacy'].includes(installed.reason)?conflict():set(installed.reason==='storage'?'storage':'invalid',owner);
    current(owner);if(!lease.active())throw Error('lease');ack(owner,remote.revision,remote.record);return set('synced',owner,{pulled:true});
   }
   if(!local)return set(legacy?'legacy':'empty',owner);
   // A known terminal on either side can never be replaced by a live branch of
   // the same run, even when the player selected the local conflict card.
   if(sameRun&&validArborEnded(remote.record.entry)&&!validArborEnded(local.entry))return conflict();
   if(choice!=='local'&&remote.revision!==beforeMeta.revision)return conflict();
   if(!etag||remote.revision>=1000000000)throw Error('offline');
   if(remote.record){
    const backup=getItem(records.key+':previous-cloud');if(backup!==null&&!validArborAccountRecord(parse(backup),{owner}))throw Error('invalid');persist(records.key+':previous-cloud',remoteBytes);
   }
   current(owner);if(!lease.active())throw Error('lease');
   if(bytes(read())!==localBytes||getItem(records.entryKey)!==legacyRaw)return set('local',owner);
   const nextRevision=remote.revision+1,body={version:1,ownerUid:owner,revision:nextRevision,checkpoint:localBytes};
   const put=await wait(fetchImpl(url,{method:'PUT',headers:{'Content-Type':'application/json','if-match':etag},body:JSON.stringify(body),signal:controller.signal,cache:'no-store'}));
   current(owner);if(!lease.active())throw Error('lease');
   if(put.status===412)return conflict();if(!put.ok)throw Error(put.status===401||put.status===403?'permission':'offline');
   ack(owner,nextRevision,local);return set(bytes(read())===localBytes?'synced':'local',owner);
  }catch(error){return set(['account','ineligible','storage','invalid','permission','lease','conflict'].includes(error.message)?error.message:'offline',owner);}
  finally{clearTimeout(alarm);if(lease&&!borrowed)await lease.release();}
 }
 function sync(options={}){if(flight)return flight;flight=perform(options).finally(()=>{flight=null;});return flight;}
 return {state:()=>eligible(user()?.uid)&&state.owner===user()?.uid?state:{kind:'ineligible',act:'arbor'},sync,prepare:options=>sync({...options,allowPull:true}),
  async flush(options={}){let result;for(let i=0;i<3;i++){result=await sync(options);if(result.kind!=='local')break;}return result;}
 };
}
