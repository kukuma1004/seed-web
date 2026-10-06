// A slow provider/persistence response is not a failed login. Keep the same
// operation alive and make its phase visible; never create a second login,
// clear a UID, or report saved/account-ready on a notification timeout.
export function createAccountLoginFlow({onState=()=>{},waitMs=10000,setTimer=setTimeout,clearTimer=clearTimeout}={}){
 let pending=null,timer=null,state=Object.freeze({busy:false,phase:'idle',waiting:false});
 const stop=()=>{if(timer!==null){clearTimer(timer);timer=null;}};
 const publish=(phase,waiting=false)=>{state=Object.freeze({busy:phase!=='idle',phase,waiting});onState(state);};
 const phase=name=>{stop();publish(name);timer=setTimer(()=>{timer=null;publish(name,true);},waitMs);};
 function run(authenticate,synchronize){
  if(pending)return pending;
  // Reserve the operation synchronously: re-render/click cannot start another
  // account picker while the first response is still outstanding.
  pending=Promise.resolve().then(async()=>{
   try{phase('auth');await authenticate();phase('sync');return await synchronize();}
   finally{stop();pending=null;publish('idle');}
  });
  return pending;
 }
 return Object.freeze({run,state:()=>state});
}
