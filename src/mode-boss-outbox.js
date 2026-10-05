import {MODE_BOSSES} from './mode-boss-titles.js';
import {validBossRunId} from './boss-title-ledger.js';
import {LAWS} from './laws.js';

// Device-local delivery queue, separate from resumable runs. It is not a
// cross-device counter merge or a server acknowledgment. One key per event
// avoids a shared-array overwrite when two tabs earn different bosses.
export const modeBossOutboxKey=owner=>'seed-mode-boss-outbox-v1:'+encodeURIComponent(owner);
const validEpoch=e=>typeof e==='string'&&/^[\w-]{6,96}$/.test(e);
const valid=e=>e&&Object.keys(e).every(k=>['mode','runId','boss','ordinal','bossEpoch'].includes(k))&&(e.bossEpoch===undefined||validEpoch(e.bossEpoch))&&validBossRunId(e.mode+':'+e.runId)&&Object.hasOwn(MODE_BOSSES,e.boss)&&Number.isInteger(e.ordinal)&&e.ordinal>=1&&e.ordinal<=1000000;
const identity=e=>`${e.mode}:${e.runId}:${e.boss}:${e.ordinal}`;
export const modeBossLegacyArchiveKey=(owner,event,{channel='shared'}={})=>{
 if(!['shared','journey'].includes(channel)||typeof owner!=='string'||!owner.length||owner.length>128||!valid(event))throw Error('invalid-boss-archive');
 return `seed-boss-legacy-archive-v1:${encodeURIComponent(owner)}:${channel}:${encodeURIComponent(identity(event))}`;
};
const validTreeContext=v=>v&&typeof v==='object'&&!Array.isArray(v)&&Object.keys(v).length===2&&Object.keys(v).every(k=>['wins','law'].includes(k))&&Number.isSafeInteger(v.wins)&&v.wins>=0&&v.wins<=100000&&(v.law===null||Object.hasOwn(LAWS,v.law));
export function createModeBossOutbox(storage,owner,{currentOwner=()=>owner,practice=()=>false,channel='shared'}={}){
 if(!['shared','journey'].includes(channel))throw Error('invalid-boss-channel');
 const key=channel==='journey'?'seed-journey-boss-outbox-v1:'+encodeURIComponent(owner):modeBossOutboxKey(owner);
 const allowed=()=>{try{return typeof owner==='string'&&owner.length>0&&owner.length<=128&&currentOwner()===owner&&practice()===false;}catch{return false;}};
 const prefix=key+':';
 const eventKey=e=>prefix+encodeURIComponent(identity(e));
 const parse=(bytes,entryKey)=>{
  try{const v=JSON.parse(bytes),schema=v?.version===1&&Object.keys(v).every(k=>['version','owner','event'].includes(k))||v?.version===2&&v.durableTree===true&&Object.keys(v).every(k=>['version','owner','event','durableTree','treeContext'].includes(k))&&(!Object.hasOwn(v,'treeContext')||validTreeContext(v.treeContext))||v?.version===3&&validEpoch(v.bossEpoch)&&typeof v.durableTree==='boolean'&&Object.keys(v).every(k=>['version','owner','event','durableTree','treeContext','bossEpoch'].includes(k))&&(!Object.hasOwn(v,'treeContext')||validTreeContext(v.treeContext));return schema&&v.owner===owner&&valid(v.event)&&entryKey===eventKey(v.event)?v:null;}catch{return null;}
 };
 const pending=()=>{
  try{
   if(!Number.isSafeInteger(storage.length)||storage.length<0||storage.length>100000)return null;
   const keys=Array.from({length:storage.length},(_,i)=>storage.key(i)).filter(k=>typeof k==='string'&&k.startsWith(prefix));
   if(keys.length>2048)return null;const events=[];
   for(const k of keys){const bytes=storage.getItem(k);if(bytes===null)continue;const record=parse(bytes,k);if(!record)return null;events.push(record);}
   return events;
  }catch{return null;}
 };

 return {
  enqueue(event,{durableTree=false,treeContext=null,bossEpoch=event.bossEpoch??null}={}){
   if(!allowed()||!valid(event)||bossEpoch!==null&&!validEpoch(bossEpoch)||treeContext!==null&&!validTreeContext(treeContext))return false;
   try{const k=eventKey(event),old=storage.getItem(k);if(old!==null){const record=parse(old,k);if(!record||(record.bossEpoch??null)!==bossEpoch)return false;if(!durableTree||record.durableTree===true)return true;}
    const events=pending();if(!events||old===null&&events.length>=2048)return false;
    const {mode,runId,boss,ordinal}=event;
    const bytes=JSON.stringify({version:bossEpoch?3:durableTree?2:1,owner,event:{mode,runId,boss,ordinal},...(durableTree||bossEpoch?{durableTree:Boolean(durableTree),...(treeContext?{treeContext:{...treeContext}}:{})}:{}),...(bossEpoch?{bossEpoch}:{})});
    if(!allowed()||storage.getItem(k)!==old)return false;storage.setItem(k,bytes);return storage.getItem(k)===bytes;
   }catch{return false;}
  },
  requiresTree(event){
   if(!allowed()||!valid(event))return false;
   try{const k=eventKey(event),bytes=storage.getItem(k);return bytes!==null&&parse(bytes,k)?.durableTree===true;}catch{return false;}
  },
  treeContext(event){
   if(!allowed()||!valid(event))return null;
   try{const k=eventKey(event),bytes=storage.getItem(k),context=bytes===null?null:parse(bytes,k)?.treeContext;return context?{...context}:null;}catch{return null;}
  },
  ack(event){
   if(!allowed()||!valid(event))return false;
   try{const k=eventKey(event),bytes=storage.getItem(k);if(bytes===null)return true;if(!parse(bytes,k)||!allowed()||storage.getItem(k)!==bytes)return false;storage.removeItem(k);return storage.getItem(k)===null;}catch{return false;}
  },
  archiveLegacy(event){
   if(!allowed()||!valid(event)||event.bossEpoch!==undefined)return false;
   try{
    const source=eventKey(event),archive=modeBossLegacyArchiveKey(owner,event,{channel}),bytes=storage.getItem(source),previous=storage.getItem(archive);
    const legacy=raw=>{const record=parse(raw,source);return Boolean(record&&(record.version===1||record.version===2)&&!Object.hasOwn(record,'bossEpoch')&&!Object.hasOwn(record.event,'bossEpoch'));};
    // An interrupted retry may already have removed the source. Only a valid,
    // exact legacy envelope in this owner's archive licenses that completion.
    if(bytes===null)return previous!==null&&legacy(previous)&&allowed();
    if(!legacy(bytes)||previous!==null&&previous!==bytes)return false;
    if(!allowed()||storage.getItem(source)!==bytes||storage.getItem(archive)!==previous)return false;
    if(previous===null)storage.setItem(archive,bytes);
    if(storage.getItem(archive)!==bytes||!allowed()||storage.getItem(source)!==bytes)return false;
    if(storage.getItem(archive)!==bytes||!allowed())return false;
    storage.removeItem(source);
    return storage.getItem(source)===null&&storage.getItem(archive)===bytes&&allowed();
   }catch{return false;}
  },
  retry(deliver){
   if(!allowed())return false;const events=pending();if(!events)return false;
   for(const record of events){
    if(!allowed())return false;
    let delivered=false;try{delivered=deliver({...record.event,...(record.bossEpoch?{bossEpoch:record.bossEpoch}:{})})===true;}catch{}
    if(!allowed()||!delivered||!this.ack(record.event))return false;
   }
   return true;
  }
 };
}
