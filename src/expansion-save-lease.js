import {EXPANSION_SAVE_KEY} from './expansion-run-save.js';

// One same-origin tab owns this inspection save for the entire run. The sync
// store stays unchanged; callers must hold an active lease before every write.
// Unsupported browsers fail closed rather than emulate a non-atomic lock.
export function acquireExpansionSaveLease(act,owner,{locks=globalThis.navigator?.locks}={}){
 const key=`${EXPANSION_SAVE_KEY}:${encodeURIComponent(owner)}:${act}`;
 let resolveAcquire,resolveHold,resolveDone,active=false,answered=false;
 const acquired=new Promise(resolve=>{resolveAcquire=resolve;});
 const hold=new Promise(resolve=>{resolveHold=resolve;});
 const done=new Promise(resolve=>{resolveDone=resolve;});
 const answer=value=>{if(!answered){answered=true;resolveAcquire(value);}};
 const denied=reason=>({ok:false,reason,key,active:()=>false,release:()=>done});
 const lease={ok:true,key,active:()=>active,release:()=>{
  active=false;resolveHold();return done;
 }};
 try{
  if(typeof locks?.request!=='function'){
   answer(denied('unsupported'));resolveDone();return acquired;
  }
  const request=locks.request(key,{mode:'exclusive',ifAvailable:true},async lock=>{
   if(!lock){answer(denied('busy'));return;}
   active=true;answer(lease);
   await hold;
   active=false;
  });
  Promise.resolve(request).then(()=>{
   active=false;answer(denied('unavailable'));resolveDone();
  },()=>{
   active=false;resolveHold();answer(denied('unavailable'));resolveDone();
  });
 }catch{
  active=false;resolveHold();answer(denied('unavailable'));resolveDone();
 }
 return acquired;
}
