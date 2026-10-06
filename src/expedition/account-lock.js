import {expeditionAccountStoreKey} from './account-store.js';

// Same Web Locks lifetime used by existing mode saves, with the new account
// namespace. Hold across gameplay, async upload and the final close flush.
// An unsupported browser cannot substitute a non-atomic localStorage flag.
export function acquireExpeditionAccountLock(owner,{locks=globalThis.navigator?.locks}={}){
 if(typeof owner!=='string'||!/^[A-Za-z0-9_:-]{1,128}$/.test(owner)||['guest','__proto__','constructor','prototype'].includes(owner))return Promise.resolve({ok:false,reason:'account'});
 const key=expeditionAccountStoreKey(owner);let active=false,answered=false,resolveAcquired,resolveHold,resolveDone;
 const acquired=new Promise(resolve=>{resolveAcquired=resolve;}),hold=new Promise(resolve=>{resolveHold=resolve;}),done=new Promise(resolve=>{resolveDone=resolve;});
 const answer=value=>{if(!answered){answered=true;resolveAcquired(value);}};
 const denied=reason=>({ok:false,reason,key,active:()=>false,release:()=>done});
 const lease={ok:true,key,active:()=>active,release:()=>{active=false;resolveHold();return done;}};
 try{
  if(typeof locks?.request!=='function'){answer(denied('unsupported'));resolveDone();return acquired;}
  const request=locks.request(key,{mode:'exclusive',ifAvailable:true},async lock=>{
   if(!lock){answer(denied('busy'));return;}
   active=true;answer(lease);await hold;active=false;
  });
  Promise.resolve(request).then(()=>{active=false;answer(denied('unavailable'));resolveDone();},()=>{active=false;resolveHold();answer(denied('unavailable'));resolveDone();});
 }catch{active=false;resolveHold();answer(denied('unavailable'));resolveDone();}
 return acquired;
}
