import {MODE_BOSSES} from './mode-boss-titles.js';
import {validBossRunId} from './boss-title-ledger.js';

// Device-local delivery queue, separate from resumable runs. It is not a
// cross-device counter merge or a server acknowledgment. One key per event
// avoids a shared-array overwrite when two tabs earn different bosses.
export const modeBossOutboxKey=owner=>'seed-mode-boss-outbox-v1:'+encodeURIComponent(owner);
const valid=e=>e&&Object.keys(e).every(k=>['mode','runId','boss','ordinal'].includes(k))&&validBossRunId(e.mode+':'+e.runId)&&Object.hasOwn(MODE_BOSSES,e.boss)&&!(e.mode==='journey'&&MODE_BOSSES[e.boss].act<4)&&Number.isInteger(e.ordinal)&&e.ordinal>=1&&e.ordinal<=1000000;
const identity=e=>`${e.mode}:${e.runId}:${e.boss}:${e.ordinal}`;
export function createModeBossOutbox(storage,owner,{currentOwner=()=>owner,practice=()=>false}={}){
 const key=modeBossOutboxKey(owner);
 const allowed=()=>{try{return typeof owner==='string'&&owner.length>0&&owner.length<=128&&currentOwner()===owner&&practice()===false;}catch{return false;}};
 const prefix=key+':';
 const eventKey=e=>prefix+encodeURIComponent(identity(e));
 const parse=(bytes,entryKey)=>{
  try{const v=JSON.parse(bytes);return v?.version===1&&v.owner===owner&&Object.keys(v).every(k=>['version','owner','event'].includes(k))&&valid(v.event)&&entryKey===eventKey(v.event)?v.event:null;}catch{return null;}
 };
 const pending=()=>{
  try{
   if(!Number.isSafeInteger(storage.length)||storage.length<0||storage.length>100000)return null;
   const keys=Array.from({length:storage.length},(_,i)=>storage.key(i)).filter(k=>typeof k==='string'&&k.startsWith(prefix));
   if(keys.length>2048)return null;const events=[];
   for(const k of keys){const bytes=storage.getItem(k);if(bytes===null)continue;const event=parse(bytes,k);if(!event)return null;events.push(event);}
   return events;
  }catch{return null;}
 };

 return {
  enqueue(event){
   if(!allowed()||!valid(event))return false;
   try{const k=eventKey(event),old=storage.getItem(k);if(old!==null)return Boolean(parse(old,k));
    const events=pending();if(!events||events.length>=2048)return false;
    const bytes=JSON.stringify({version:1,owner,event:{...event}});
    if(!allowed())return false;storage.setItem(k,bytes);return storage.getItem(k)===bytes;
   }catch{return false;}
  },
  ack(event){
   if(!allowed()||!valid(event))return false;
   try{const k=eventKey(event),bytes=storage.getItem(k);if(bytes===null)return true;if(!parse(bytes,k)||!allowed()||storage.getItem(k)!==bytes)return false;storage.removeItem(k);return storage.getItem(k)===null;}catch{return false;}
  },
  retry(deliver){
   if(!allowed())return false;const events=pending();if(!events)return false;
   for(const event of events){
    if(!allowed())return false;
    let delivered=false;try{delivered=deliver({...event})===true;}catch{}
    if(!allowed()||!delivered||!this.ack(event))return false;
   }
   return true;
  }
 };
}
