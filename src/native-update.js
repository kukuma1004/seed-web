import {AppUpdate,AppUpdateAvailability,AppUpdateResultCode} from '@capawesome/capacitor-app-update';

export function requiresPlayUpdate(info){
 return info?.updateAvailability===AppUpdateAvailability.UPDATE_AVAILABLE&&
  Number(info.availableVersionCode)>Number(info.currentVersionCode);
}

// Only Play can tell whether a reviewed release is available to this tester.
// Do not lock the game for a pending review, unknown status, or a network error.
export function createNativeUpdateGate({enabled=false,doc=globalThis.document,plugin=AppUpdate}={}){
 if(!enabled)return {check:async()=>false};
 const gate=doc.createElement('div');gate.id='app-update-gate';gate.hidden=true;
 gate.innerHTML='<div class="app-update-panel" role="dialog" aria-modal="true" aria-labelledby="app-update-title"><span class="app-update-mark">✦</span><h2 id="app-update-title">새 버전이 나왔어요</h2><p id="app-update-message">최신 버전으로 업데이트한 뒤 이어서 플레이해 주세요. 저장된 기록은 그대로 남아요.</p><div class="app-update-actions"><button type="button" id="app-update-now">지금 업데이트</button><button type="button" id="app-update-store">Play 스토어에서 열기</button></div></div>';
 doc.body.append(gate);
 const now=gate.querySelector('#app-update-now'),store=gate.querySelector('#app-update-store'),message=gate.querySelector('#app-update-message');
 let pending=null,lastChecked=0,current=null;
 const available=()=>requiresPlayUpdate(current);
 now.onclick=async()=>{
  now.disabled=true;
  try{
   if(current?.immediateUpdateAllowed){
    const result=await plugin.performImmediateUpdate();
    message.textContent=result?.code===AppUpdateResultCode.CANCELED?'업데이트를 취소했어요. 최신 버전으로 업데이트한 뒤 플레이해 주세요.':
     result?.code===AppUpdateResultCode.OK?'업데이트가 끝나면 SEED로 돌아와 주세요.':'앱 안에서 업데이트하지 못했어요. Play 스토어에서 업데이트를 눌러 주세요.';
   }else{await plugin.openAppStore();message.textContent='Play 스토어에서 업데이트한 뒤 SEED로 돌아와 주세요.';}
  }catch{
   message.textContent='앱 안에서 업데이트하지 못했어요. Play 스토어에서 업데이트를 눌러 주세요.';
  }finally{now.disabled=false;}
 };
 store.onclick=async()=>{
  try{await plugin.openAppStore();}
  catch{message.textContent='Play 스토어를 열지 못했어요. Play 스토어에서 SEED: 잠든 정원을 찾아 업데이트해 주세요.';}
 };
 async function check({force=false}={}){
  if(pending)return pending;
  if(!force&&Date.now()-lastChecked<5*60_000)return available();
  // A check is made from the entry/menu only; never interrupt active combat.
  gate.hidden=false;now.disabled=true;store.disabled=true;
  message.textContent='Play 스토어에서 새 버전을 확인하는 중이에요…';
  pending=(async()=>{
   try{
    current=await plugin.getAppUpdateInfo();lastChecked=Date.now();
    const needed=available();gate.hidden=!needed;
    if(needed){
     message.textContent='최신 버전으로 업데이트한 뒤 이어서 플레이해 주세요. 저장된 기록은 그대로 남아요.';
     now.textContent=current.immediateUpdateAllowed?'지금 업데이트':'Play 스토어에서 업데이트';
     now.disabled=false;store.disabled=false;
    }
    return needed;
   }catch{current=null;gate.hidden=true;lastChecked=0;return false;}
   finally{pending=null;}
  })();
  return pending;
 }
 return {check};
}
