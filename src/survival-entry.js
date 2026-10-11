// One bounded launch owns asynchronous preparation. Never touches saved data.
export function createSurvivalEntry({owner,start,onBusy=()=>{},onError=()=>{},timeoutMs=20000,setTimer=setTimeout,clearTimer=clearTimeout}){
 let active=null;
 const valid=token=>Boolean(token&&active===token&&!token.cancelled&&token.owner===owner());
 function cancel(){const token=active;if(!token)return;token.cancelled=true;active=null;clearTimer(token.timer);token.stop?.();onBusy(false);}
 function run(...args){
  if(active)return active.promise;
  const token={owner:owner(),cancelled:false};active=token;onBusy(true);
  const stopped=new Promise(resolve=>{token.stop=()=>resolve(false);});
  token.timer=setTimer(()=>{if(active!==token)return;cancel();onError(new Error('survival-entry-timeout'));},timeoutMs);
  const launch=Promise.resolve().then(()=>valid(token)?start(...args,token):false).catch(error=>{if(valid(token))onError(error);return false;});
  token.promise=Promise.race([launch,stopped]).finally(()=>{if(active!==token)return;active=null;clearTimer(token.timer);onBusy(false);});
  return token.promise;
 }
 return {run,cancel,valid};
}
