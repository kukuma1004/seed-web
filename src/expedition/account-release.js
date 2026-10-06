// Switch only after art/play/device acceptance and exact production rule
// publication. Developer/review sessions never inherit this authority.
export const EXPEDITION_ACCOUNT_RELEASED=false;
export const EXPEDITION_ACCOUNT_RELEASE_POLICY=Object.freeze({enabled:true,runtimeVersion:4,combatVersion:3});
const denied=reason=>Object.freeze({ok:false,reason});
export function expeditionAccountReleaseStatus(value){
 if(value===false||value===null)return denied('closed');
 if(!value||typeof value!=='object'||Array.isArray(value)||Object.keys(value).length!==3||!['enabled','runtimeVersion','combatVersion'].every(k=>Object.hasOwn(value,k))||typeof value.enabled!=='boolean'||!Number.isSafeInteger(value.runtimeVersion)||value.runtimeVersion<1||!Number.isSafeInteger(value.combatVersion)||value.combatVersion<1)return denied('invalid');
 if(!value.enabled)return denied('closed');
 if(value.runtimeVersion!==EXPEDITION_ACCOUNT_RELEASE_POLICY.runtimeVersion||value.combatVersion!==EXPEDITION_ACCOUNT_RELEASE_POLICY.combatVersion)return denied('update');
 return Object.freeze({ok:true,reason:'ready'});
}
export function expeditionAccountReleaseMessage(status){return status?.reason==='update'?'원정대 저장 규칙이 변경됐어요. 게임을 최신 버전으로 업데이트해 주세요. 기록은 그대로 보존했어요.':status?.reason==='unavailable'?'공개 상태를 확인하지 못했어요. 연결을 확인하고 다시 열어 주세요.':'계정 원정대는 아직 공개 준비 중이에요.';}
export async function readExpeditionAccountReleaseStatus({account,databaseURL,clientEnabled=false,fetchImpl=globalThis.fetch,timeout=6000}={}){
 if(clientEnabled!==true)return denied('closed');
 if(typeof fetchImpl!=='function'||!Number.isFinite(timeout)||timeout<=0||timeout>10000)return denied('invalid');
 const owner=account?.user?.();if(!owner?.uid||owner.isAnonymous!==false)return denied('account');
 let url;try{url=new URL(databaseURL);}catch{return denied('invalid');}
 if(url.protocol!=='https:'||url.pathname!=='/'||url.search||url.hash||url.username||url.password||url.port||!/(?:^|\.)(?:firebaseio\.com|firebasedatabase\.app)$/.test(url.hostname))return denied('invalid');
 const controller=new AbortController(),alarm=setTimeout(()=>controller.abort(),timeout);
 const wait=p=>Promise.race([p,new Promise((_,reject)=>{if(controller.signal.aborted)reject(Error('offline'));else controller.signal.addEventListener('abort',()=>reject(Error('offline')),{once:true});})]);
 try{
  const session=await wait(account.tokenSession());if(account.user()?.uid!==owner.uid||account.user()?.isAnonymous!==false||session?.uid!==owner.uid||!session.idToken)return denied('account');
  url.pathname='/seedExpeditionRelease/accountV1.json';url.searchParams.set('auth',session.idToken);
  const response=await wait(fetchImpl(url.href,{signal:controller.signal,cache:'no-store',redirect:'error'}));
  if(!response.ok)return denied('unavailable');
  if(Number(response.headers?.get?.('Content-Length'))>256)return denied('invalid');
  // A bounded version policy deliberately fails the former boolean-only reader.
  const reader=response.body?.getReader();let text='',bytes=0;
  if(reader){const decoder=new TextDecoder();try{while(true){const chunk=await wait(reader.read());if(chunk.done)break;bytes+=chunk.value.byteLength;if(bytes>256)return denied('invalid');text+=decoder.decode(chunk.value,{stream:true});}text+=decoder.decode();}finally{await reader.cancel().catch(()=>{});reader.releaseLock();}}
  else{text=await wait(response.text());if(new TextEncoder().encode(text).length>256)return denied('invalid');}
  if(account.user()?.uid!==owner.uid||account.user()?.isAnonymous!==false)return denied('account');
  try{return expeditionAccountReleaseStatus(JSON.parse(text));}catch{return denied('invalid');}
 }catch{return denied('unavailable');}finally{clearTimeout(alarm);controller.abort();}
}
export async function readExpeditionAccountRelease(options){return (await readExpeditionAccountReleaseStatus(options)).ok;}

export function expeditionAccountDeviceId(storage,{idFactory=()=>globalThis.crypto.randomUUID()}={}){
 const key='seed-expedition-account-device-v1',valid=v=>typeof v==='string'&&/^[A-Za-z0-9_:-]{1,128}$/.test(v)&&!['guest','__proto__','constructor','prototype'].includes(v);
 const old=storage.getItem(key);if(old!==null){if(!valid(old))throw Error('기기 식별 원본을 보존했어요');return old;}
 const id=idFactory();if(!valid(id))throw Error('기기 식별자를 만들지 못했어요');storage.setItem(key,id);if(storage.getItem(key)!==id)throw Error('기기 식별자 저장을 확인하지 못했어요');return id;
}
