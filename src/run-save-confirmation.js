// A local checkpoint is not proof that another device can resume it. Keep the
// caller's screen alive until the same account's cloud write is acknowledged.
export async function confirmRunSave({owner,currentOwner,required,flush,accepted,timeoutMs=10000,setTimer=setTimeout,clearTimer=clearTimeout}){
 if(currentOwner()!==owner)return {ok:false,reason:'account'};
 if(!required)return {ok:true,localOnly:true};
 let timer;
 try{
  const saved=await Promise.race([
   Promise.resolve().then(flush),
   new Promise(resolve=>{timer=setTimer(()=>resolve(null),timeoutMs);})
  ]);
  if(currentOwner()!==owner)return {ok:false,reason:'account'};
  if(!saved)return {ok:false,reason:'timeout'};
  return accepted(saved)?{ok:true}:{ok:false,reason:saved.kind||saved.reason||'pending'};
 }catch{return {ok:false,reason:currentOwner()!==owner?'account':'offline'};}
 finally{if(timer!==undefined)clearTimer(timer);}
}
