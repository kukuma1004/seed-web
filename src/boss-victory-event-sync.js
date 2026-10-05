import {bossVictoryEventKey,bossVictoryCloudKey,validBossVictoryLedger,mergeBossVictoryLedgers,BOSS_VICTORY_EVENT_LIMIT} from './boss-victory-events.js';

// Cloud entries carry their migration epoch. The server checks the readable
// tuple key and permits only creation of one immutable event child.
export function decodeBossVictoryCloud(value){
 if(!value||typeof value!=='object'||Array.isArray(value))throw Error('migration');
 const entries=value.events===undefined?[]:Object.entries(value.events||{});
 if(value.events!==undefined&&(!value.events||typeof value.events!=='object'||Array.isArray(value.events))||entries.length>BOSS_VICTORY_EVENT_LIMIT)throw Error('migration');
 const events={};for(const [key,record] of entries){
  if(!record||typeof record!=='object'||Array.isArray(record)||record.epoch!==value.epoch)throw Error('migration');
  const {epoch,...event}=record;
  try{if(key!==bossVictoryCloudKey(event))throw Error('migration');events[bossVictoryEventKey(event)]=event;}catch{throw Error('migration');}
 }
 const ledger={...value,events};if(!validBossVictoryLedger(ledger))throw Error('migration');return ledger;
}

// This channel is intentionally dormant until an authoritative migration epoch
// is established. A missing server ledger never licenses a client baseline.
export function createBossVictoryEventQueue({storage,ownerUid,epoch,currentOwner=()=>ownerUid,practice=()=>false}={}){
 if(typeof ownerUid!=='string'||!ownerUid.length||ownerUid.length>128||typeof epoch!=='string'||! /^[\w-]{6,96}$/.test(epoch))throw Error('migration');
 const prefix=`seed-boss-victory-v2:${encodeURIComponent(ownerUid)}:${epoch}:`;
 const allowed=()=>currentOwner()===ownerUid&&practice()===false;
 const key=event=>prefix+bossVictoryEventKey(event);
 const parse=(raw,path)=>{
  let value;try{value=JSON.parse(raw);}catch{throw Error('invalid');}
  try{if(value?.version!==2||value.ownerUid!==ownerUid||value.epoch!==epoch||Object.keys(value).some(k=>!['version','ownerUid','epoch','event'].includes(k))||path!==key(value.event))throw Error('invalid');return value.event;}catch{throw Error('invalid');}
 };
 const pending=()=>{
  if(!allowed())throw Error('account');if(!Number.isSafeInteger(storage.length)||storage.length<0||storage.length>100000)throw Error('storage');
  const entries=[];for(let i=0;i<storage.length;i++){const path=storage.key(i);if(typeof path==='string'&&path.startsWith(prefix)){const raw=storage.getItem(path);if(raw!==null)entries.push(parse(raw,path));}}
  if(entries.length>BOSS_VICTORY_EVENT_LIMIT)throw Error('queue-full');return entries;
 };
 return {pending,
  enqueue(event){
   try{if(!allowed())return false;const path=key(event),previous=storage.getItem(path);if(previous!==null){parse(previous,path);return true;}
    if(pending().length>=BOSS_VICTORY_EVENT_LIMIT)return false;const raw=JSON.stringify({version:2,ownerUid,epoch,event:{...event}});
    if(!allowed())return false;storage.setItem(path,raw);return storage.getItem(path)===raw;
   }catch{return false;}
  },
  acknowledge(event,confirmed){
   try{if(!allowed()||!validBossVictoryLedger(confirmed)||confirmed.ownerUid!==ownerUid||confirmed.epoch!==epoch||!Object.hasOwn(confirmed.events,bossVictoryEventKey(event)))return false;
    const path=key(event),raw=storage.getItem(path);if(raw===null)return true;parse(raw,path);if(!allowed()||storage.getItem(path)!==raw)return false;storage.removeItem(path);return storage.getItem(path)===null;
   }catch{return false;}
  }
 };
}

export function createBossVictoryEventSync({storage,account,ownerUid,epoch,baseline,databaseURL,practice=()=>false,fetchImpl=globalThis.fetch,timeout=10000,onConfirmed=()=>true}={}){
 const queue=createBossVictoryEventQueue({storage,ownerUid,epoch,currentOwner:()=>account.user()?.uid,practice});let flight=null;
 const current=()=>{if(account.user()?.uid!==ownerUid||account.user()?.isAnonymous||practice()!==false)throw Error('account');};
 const recognized=value=>{
  const ledger=decodeBossVictoryCloud(value);
  if(ledger.ownerUid!==ownerUid||ledger.epoch!==epoch||Object.keys(ledger.baseline).some(k=>ledger.baseline[k]!==baseline?.[k]))throw Error('migration');return ledger;
 };
 async function perform(){
  const controller=new AbortController(),alarm=setTimeout(()=>controller.abort(),timeout);
  try{
   current();queue.pending();const token=await Promise.race([account.tokenSession(),new Promise((_,reject)=>{if(controller.signal.aborted)reject(Error('offline'));else controller.signal.addEventListener('abort',()=>reject(Error('offline')),{once:true});})]);
   current();if(token?.uid!==ownerUid||!token.idToken)throw Error('account');
   const base=databaseURL.replace(/\/$/,'')+'/seedBossVictories/'+encodeURIComponent(ownerUid),auth='.json?auth='+encodeURIComponent(token.idToken);
   const request=async(path,options={})=>{current();const response=await fetchImpl(base+path+auth,{...options,signal:controller.signal,cache:'no-store'});current();if(!response.ok&&response.status!==412)throw Error([401,403].includes(response.status)?'permission':'offline');return response;};
   const read=async()=>{const response=await request('');const value=await response.json();current();if(value===null)throw Error('not-migrated');return recognized(value);};
   const remote=await read(),events=queue.pending().slice(0,32);
   const incoming={...remote,events:Object.fromEntries(events.map(event=>[bossVictoryEventKey(event),event]))};mergeBossVictoryLedgers(remote,incoming); // Check capacity before any writes.
   for(const event of events){
    if(Object.hasOwn(remote.events,bossVictoryEventKey(event)))continue;
    const path='/events/'+encodeURIComponent(bossVictoryCloudKey(event)),payload={epoch,...event};
    let stored=false;
    for(let attempt=0;attempt<3;attempt++){
     const response=await request(path,{headers:{'X-Firebase-ETag':'true'}}),value=await response.json();current();
     if(value!==null){
      const checked=decodeBossVictoryCloud({...remote,events:{[bossVictoryCloudKey(event)]:value}});
      if(!Object.hasOwn(checked.events,bossVictoryEventKey(event)))throw Error('migration');stored=true;break;
     }
     const etag=response.headers?.get?.('ETag');if(!etag)throw Error('offline');
     const put=await request(path,{method:'PUT',headers:{'Content-Type':'application/json','if-match':etag},body:JSON.stringify(payload)});
     if(put.status===412)continue;stored=true;break;
    }
    if(!stored)return {ok:false,kind:'conflict'};
   }
   // A PUT success alone never removes a receipt. Check immutable metadata and
   // all delivered events again; a lost readback leaves the entire batch safe.
   const confirmed=events.length?await read():remote;mergeBossVictoryLedgers(remote,confirmed);
   // Persist the confirmed projection before removing pending receipts. A
   // failed cache write keeps the queue available for an idempotent retry.
   if(await onConfirmed(confirmed)===false)throw Error('storage');current();
   for(const event of events)if(!queue.acknowledge(event,confirmed))throw Error('ack');
   current();return {ok:true,kind:queue.pending().length?'pending':'synced',ledger:confirmed};
  }catch(error){return {ok:false,kind:['account','migration','not-migrated','permission','invalid','storage','ledger-full','queue-full','ack'].includes(error.message)?error.message:'offline'};}
  finally{clearTimeout(alarm);}
 }
 return {queue,sync(){if(flight)return flight;flight=perform().finally(()=>{flight=null;});return flight;}};
}
