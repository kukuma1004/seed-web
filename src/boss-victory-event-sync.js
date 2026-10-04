import {bossVictoryEventKey,validBossVictoryLedger,mergeBossVictoryLedgers,BOSS_VICTORY_EVENT_LIMIT} from './boss-victory-events.js';

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

export function createBossVictoryEventSync({storage,account,ownerUid,epoch,baseline,databaseURL,practice=()=>false,fetchImpl=globalThis.fetch,timeout=10000}={}){
 const queue=createBossVictoryEventQueue({storage,ownerUid,epoch,currentOwner:()=>account.user()?.uid,practice});let flight=null;
 const current=()=>{if(account.user()?.uid!==ownerUid||account.user()?.isAnonymous||practice()!==false)throw Error('account');};
 const recognized=value=>{
  if(!validBossVictoryLedger(value)||value.ownerUid!==ownerUid||value.epoch!==epoch||Object.keys(value.baseline).some(k=>value.baseline[k]!==baseline?.[k]))throw Error('migration');return {...value,events:value.events||{}};
 };
 async function perform(){
  const controller=new AbortController(),alarm=setTimeout(()=>controller.abort(),timeout);
  try{
   current();queue.pending();const token=await Promise.race([account.tokenSession(),new Promise((_,reject)=>{if(controller.signal.aborted)reject(Error('offline'));else controller.signal.addEventListener('abort',()=>reject(Error('offline')),{once:true});})]);
   current();if(token?.uid!==ownerUid||!token.idToken)throw Error('account');
   const url=databaseURL.replace(/\/$/,'')+'/seedBossVictories/'+encodeURIComponent(ownerUid)+'.json?auth='+encodeURIComponent(token.idToken);
   const read=async()=>{const response=await fetchImpl(url,{headers:{'X-Firebase-ETag':'true'},signal:controller.signal,cache:'no-store'});current();if(!response.ok)throw Error([401,403].includes(response.status)?'permission':'offline');const value=await response.json();current();if(value===null)throw Error('not-migrated');return {value:recognized(value),etag:response.headers?.get?.('ETag')};};
   for(let attempt=0;attempt<3;attempt++){
    const remote=await read(),events=queue.pending();
    const incoming={...remote.value,events:Object.fromEntries(events.map(event=>[bossVictoryEventKey(event),event]))},next=mergeBossVictoryLedgers(remote.value,incoming),changed=Object.keys(next.events).length!==Object.keys(remote.value.events).length;
    let confirmed=remote.value;
    if(changed){
     if(!remote.etag)throw Error('offline');current();
     const response=await fetchImpl(url,{method:'PUT',headers:{'Content-Type':'application/json','if-match':remote.etag},body:JSON.stringify(next),signal:controller.signal,cache:'no-store'});current();
     if(response.status===412)continue;if(!response.ok)throw Error([401,403].includes(response.status)?'permission':'offline');
     // ACK only an observed server readback. A lost response or failed read
     // retains the pending receipt; replay then deduplicates the same event.
     confirmed=(await read()).value;
     mergeBossVictoryLedgers(next,confirmed); // Reject conflicting migrations.
    }
    for(const event of events)if(!queue.acknowledge(event,confirmed))throw Error('ack');
    current();return {ok:true,kind:queue.pending().length?'pending':'synced',ledger:confirmed};
   }
   return {ok:false,kind:'conflict'};
  }catch(error){return {ok:false,kind:['account','migration','not-migrated','permission','invalid','storage','ledger-full','queue-full','ack'].includes(error.message)?error.message:'offline'};}
  finally{clearTimeout(alarm);}
 }
 return {queue,sync(){if(flight)return flight;flight=perform().finally(()=>{flight=null;});return flight;}};
}
