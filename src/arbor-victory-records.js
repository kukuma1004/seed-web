import {arborAccountEligible} from './arbor-account-eligibility.js';

export const ARBOR_VICTORY_KEY='seed-arbor-victory-records-v1';
export const arborVictoryKey=uid=>`${ARBOR_VICTORY_KEY}:${encodeURIComponent(uid)}`;
const MAX_RUNS=8192,MAX_BYTES=4000000;
const copy=v=>JSON.parse(JSON.stringify(v));
const parse=raw=>{try{return JSON.parse(raw);}catch{return null;}};
const object=v=>v&&typeof v==='object'&&!Array.isArray(v);
const only=(v,keys)=>object(v)&&Object.keys(v).every(k=>keys.includes(k));
const integer=(v,a,b)=>Number.isSafeInteger(v)&&v>=a&&v<=b;
export const validArborVictoryRunId=id=>typeof id==='string'&&/^[A-Za-z0-9_-]{1,96}$/.test(id)&&!['__proto__','constructor','prototype'].includes(id);
export function validArborVictory(v,owner=v?.uid,runId=v?.runId){
 return only(v,['uid','runId','ordinal','cleared','at'])&&Object.keys(v).length===5&&typeof owner==='string'&&owner.length>0&&owner.length<=128&&v.uid===owner&&validArborVictoryRunId(runId)&&v.runId===runId&&integer(v.ordinal,1,3)&&v.cleared===(v.ordinal===3)&&integer(v.at,1,Number.MAX_SAFE_INTEGER);
}
export function decodeArborVictories(value,owner){
 if(value===null)return {};
 if(!object(value)||Object.keys(value).length>MAX_RUNS||JSON.stringify(value).length>MAX_BYTES||!Object.entries(value).every(([id,v])=>validArborVictory(v,owner,id)))throw Error('invalid');
 return copy(value);
}
const empty=owner=>({version:1,ownerUid:owner,cache:{},pending:{}});
function validLocal(v,owner){
 try{return only(v,['version','ownerUid','cache','pending'])&&Object.keys(v).length===4&&v.version===1&&v.ownerUid===owner&&object(v.cache)&&object(v.pending)&&Boolean(decodeArborVictories(v.cache,owner))&&Boolean(decodeArborVictories(v.pending,owner))&&JSON.stringify(v).length<=MAX_BYTES;}catch{return false;}
}
const combined=v=>{
 const records={...v.cache};for(const [id,p] of Object.entries(v.pending)){const old=records[id];if(!old||p.ordinal>old.ordinal||p.ordinal===old.ordinal&&p.at>old.at)records[id]=p;}return records;
};

// Client receipts for newly marked ordinary runs, not anti-cheat proof. The
// host invokes record only after an actual boss death and keeps its run lease.
// This module never reads legacy profile/Boss V2 data or awards old samples.
export function createArborVictoryRecords({storage,account,databaseURL,context=()=>({}),fetchImpl=globalThis.fetch,onState=()=>{},timeout=10000,now=Date.now}={}){
 let flight=null,state={kind:'idle'};
 const user=()=>account.user();
 const facts=()=>({...context(),currentOwner:user()?.uid,anonymous:user()?.isAnonymous!==false});
 const eligible=owner=>arborAccountEligible(owner,facts());
 const current=owner=>{if(user()?.uid!==owner)throw Error('account');if(!eligible(owner))throw Error('ineligible');};
 const set=(kind,owner,extra={})=>{state={kind,owner,...extra};try{onState(state);}catch{}return state;};
 const get=owner=>{let raw;try{raw=storage.getItem(arborVictoryKey(owner));}catch{throw Error('storage');}if(raw===null)return {raw,value:empty(owner)};const value=parse(raw);if(!validLocal(value,owner))throw Error('invalid');return {raw,value};};
 function write(owner,value,expected,normalRunId=null){
  current(owner);if(!validLocal(value,owner))throw Error('invalid');
  const key=arborVictoryKey(owner),raw=JSON.stringify(value);try{if(storage.getItem(key)!==expected)throw Error('conflict');current(owner);if(normalRunId!==null&&facts().normalRunId!==normalRunId)throw Error('ineligible');storage.setItem(key,raw);if(storage.getItem(key)!==raw)throw Error('storage');}catch(e){throw Error(['account','ineligible','conflict'].includes(e.message)?e.message:'storage');}
 }
 const totals=value=>{const list=Object.values(combined(value));return {wins:list.reduce((sum,v)=>sum+v.ordinal,0),clears:list.filter(v=>v.ordinal===3).length,pending:Object.keys(value.pending).length};};
 const read=()=>{const owner=user()?.uid;try{return eligible(owner)?totals(get(owner).value):{wins:0,clears:0,pending:0};}catch{return {wins:0,clears:0,pending:0,invalid:true};}};
 function record({runId,ordinal,at=now()}={}){
  const owner=user()?.uid;
  try{
   current(owner);if(facts().normalRunId!==runId||!validArborVictoryRunId(runId)||!integer(ordinal,1,3)||!integer(at,1,Number.MAX_SAFE_INTEGER))return false;
   const before=get(owner),prior=combined(before.value)[runId];
   if(prior&&ordinal<=prior.ordinal)return true; // Repeat callbacks do not add wins.
   if(ordinal!==(prior?.ordinal||0)+1)return false;
   const value=copy(before.value);value.pending[runId]={uid:owner,runId,ordinal,cleared:ordinal===3,at:Math.max(at,prior?.at||1)};
   if(facts().normalRunId!==runId)return false;write(owner,value,before.raw,runId);set('pending',owner);return true;
  }catch(error){set(['account','ineligible','invalid','storage','conflict'].includes(error.message)?error.message:'storage',owner);return false;}
 }
 function accept(owner,remote){
  const before=get(owner),value=copy(before.value),old=value.cache[remote.runId];
  if(old&&(remote.ordinal<old.ordinal||remote.at<old.at))throw Error('conflict');value.cache[remote.runId]=copy(remote);
  const pending=value.pending[remote.runId];if(pending&&pending.ordinal<=remote.ordinal)delete value.pending[remote.runId];
  write(owner,value,before.raw);
 }
 async function perform(){
  const owner=user()?.uid;if(!eligible(owner))return set('ineligible',owner);set('checking',owner);
  const controller=new AbortController(),alarm=setTimeout(()=>controller.abort(),timeout);
  const aborted=new Promise((_,reject)=>controller.signal.addEventListener('abort',()=>reject(Error('offline')),{once:true}));
  const wait=promise=>Promise.race([promise,aborted]);
  try{
   get(owner);const session=await wait(account.tokenSession());current(owner);if(session?.uid!==owner||!session.idToken)throw Error('account');
   const root=databaseURL.replace(/\/$/,'')+'/seedArborVictories/'+encodeURIComponent(owner),auth='?auth='+encodeURIComponent(session.idToken);
   const request=async(url,options={})=>{const r=await wait(fetchImpl(url,{headers:{'X-Firebase-ETag':'true',...options.headers},...options,signal:controller.signal,cache:'no-store'}));current(owner);if(r.status===412)throw Error('conflict');if(!r.ok)throw Error(r.status===401||r.status===403?'permission':'offline');return r;};
   const collection=decodeArborVictories(await wait((await request(root+'.json'+auth)).json()),owner);current(owner);
   // Missing/lower acknowledged server entries are a rollback, not permission
   // to delete the local cache or replay old wins against an empty namespace.
   const before=get(owner);for(const [id,old] of Object.entries(before.value.cache)){const remote=collection[id];if(!remote||remote.ordinal<old.ordinal||remote.at<old.at)throw Error('conflict');}
   const merged=copy(before.value);merged.cache=collection;
   for(const [id,pending] of Object.entries(merged.pending))if(collection[id]?.ordinal>=pending.ordinal)delete merged.pending[id];
   write(owner,merged,before.raw);
   // At most three real victories per run. A bounded loop drains an offline
   // ordinal-3 receipt as 1→2→3; never jumps over the server's expected ordinal.
   const ids=Object.keys(get(owner).value.pending);
   for(const runId of ids){
    for(let attempt=0;attempt<3;attempt++){
     current(owner);const pending=get(owner).value.pending[runId];if(!pending)break;
     const url=root+'/'+encodeURIComponent(runId)+'.json'+auth,response=await request(url),raw=await wait(response.json());current(owner);
     if(raw!==null&&!validArborVictory(raw,owner,runId))throw Error('invalid');
     if(raw){accept(owner,raw);if(raw.ordinal>=pending.ordinal)break;}
     const etag=response.headers?.get?.('ETag');if(!etag)throw Error('offline');
     const latest=get(owner).value.pending[runId];if(!latest)break;
     const ordinal=(raw?.ordinal||0)+1;if(ordinal>latest.ordinal)break;
     const next={uid:owner,runId,ordinal,cleared:ordinal===3,at:Math.max(latest.at,raw?.at||1)};current(owner);
     const put=await request(url,{method:'PUT',headers:{'Content-Type':'application/json','if-match':etag},body:JSON.stringify(next)});
     current(owner);if(!put.ok)throw Error('offline');accept(owner,next);
    }
   }
   const pending=Object.keys(get(owner).value.pending).length;return set(pending?'pending':'synced',owner,read());
  }catch(error){return set(['account','ineligible','storage','invalid','permission','conflict'].includes(error.message)?error.message:'offline',owner);}
  finally{clearTimeout(alarm);}
 }
 function sync(){if(flight)return flight;flight=perform().finally(()=>{flight=null;});return flight;}
 return {record,sync,read,state:()=>eligible(user()?.uid)&&state.owner===user()?.uid?state:{kind:'ineligible'}};
}
