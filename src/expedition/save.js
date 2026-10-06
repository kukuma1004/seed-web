import {normalizeRoster,mergeRosters} from './roster.js';

export const ROSTER_SAVE_VERSION=1;
const channels=new Set(['account','guest','review']);
const ownerOK=v=>typeof v==='string'&&/^[A-Za-z0-9_.:-]{1,128}$/.test(v)&&!['__proto__','constructor','prototype'].includes(v);
export function rosterSaveKey(owner,channel='account'){
  if(!ownerOK(owner)||!channels.has(channel))throw TypeError('Invalid expedition storage scope');
  return `seed-expedition:roster:v1:${channel}:${owner}`;
}
// This is device-local storage only. It is deliberately not a cloud transport.
// Every write requires exact expected bytes, including null for first creation.
export function createRosterStore({storage,currentOwner,channel='account'}={}) {
  if(!storage||typeof storage.getItem!=='function'||typeof storage.setItem!=='function'||typeof currentOwner!=='function'||!channels.has(channel))throw TypeError('Invalid expedition storage adapter');
  const result=(ok,reason,extra={})=>({ok,reason,...extra});
  function load(){
    const owner=currentOwner();if(!ownerOK(owner))return result(false,'owner');
    const key=rosterSaveKey(owner,channel);let raw,backupRaw;
    try{raw=storage.getItem(key);if(currentOwner()!==owner)return result(false,'owner changed');backupRaw=storage.getItem(`${key}:backup`);}catch{return result(false,'storage read');}
    if(currentOwner()!==owner)return result(false,'owner changed');
    if(raw===null)return result(true,'empty',{raw:null,roster:null});
    const roster=normalizeRoster(raw,{owner,channel});
    // A malformed primary is never repaired or deleted automatically. Expose a
    // separately validated backup for an explicit recovery UI to choose later.
    if(!roster)return result(false,'malformed',{raw,backupRaw,backup:normalizeRoster(backupRaw,{owner,channel})});
    return result(true,'loaded',{raw,roster});
  }
  function save(candidate,{expectedRaw}={}){
    const owner=currentOwner();if(!ownerOK(owner))return result(false,'owner');
    if(expectedRaw!==null&&typeof expectedRaw!=='string')return result(false,'expected bytes required');
    const roster=normalizeRoster(candidate,{owner,channel});if(!roster)return result(false,'invalid');
    const key=rosterSaveKey(owner,channel);let before;
    try{before=storage.getItem(key);}catch{return result(false,'storage read');}
    if(currentOwner()!==owner)return result(false,'owner changed');
    if(before!==expectedRaw)return result(false,'conflict',{raw:before});
    let final=roster;
    if(before!==null){
      const old=normalizeRoster(before,{owner,channel});if(!old)return result(false,'malformed',{raw:before});
      const merged=mergeRosters(old,roster);if(!merged.ok)return result(false,merged.reason);final=merged.roster;
      // Exact-byte CAS establishes an intentional party edit, unlike a detached
      // branch merge. Death still wins and leaves the affected slot empty.
      final.party=roster.party.map(id=>final.instances[id]?.status==='alive'?id:null);
    }
    const raw=JSON.stringify(final);
    try{
      if(before!==null){
        if(currentOwner()!==owner||storage.getItem(key)!==before)return result(false,'conflict');
        storage.setItem(`${key}:backup`,before);
        if(storage.getItem(`${key}:backup`)!==before)return result(false,'backup readback');
      }
      if(currentOwner()!==owner)return result(false,'owner changed');
      if(storage.getItem(key)!==before)return result(false,'conflict');
      if(currentOwner()!==owner)return result(false,'owner changed');
      storage.setItem(key,raw);
      const confirmed=storage.getItem(key);
      if(currentOwner()!==owner)return result(false,'owner changed');
      if(confirmed!==raw||!normalizeRoster(confirmed,{owner,channel}))return result(false,'readback');
      return result(true,'saved',{raw,roster:final});
    }catch{return result(false,'storage write');}
  }
  return Object.freeze({load,save});
}
