// Switch only after art/play/device acceptance and exact production rule
// publication. Developer/review sessions never inherit this authority.
export const EXPEDITION_ACCOUNT_RELEASED=false;
export async function readExpeditionAccountRelease({account,databaseURL,clientEnabled=false,fetchImpl=globalThis.fetch,timeout=6000}={}){
 if(clientEnabled!==true||typeof fetchImpl!=='function'||!Number.isFinite(timeout)||timeout<=0||timeout>10000)return false;
 const owner=account?.user?.();if(!owner?.uid||owner.isAnonymous!==false)return false;
 let url;try{url=new URL(databaseURL);}catch{return false;}
 if(url.protocol!=='https:'||url.pathname!=='/'||url.search||url.hash||url.username||url.password||url.port||!/(?:^|\.)(?:firebaseio\.com|firebasedatabase\.app)$/.test(url.hostname))return false;
 const controller=new AbortController(),alarm=setTimeout(()=>controller.abort(),timeout);
 const wait=p=>Promise.race([p,new Promise((_,reject)=>{if(controller.signal.aborted)reject(Error('offline'));else controller.signal.addEventListener('abort',()=>reject(Error('offline')),{once:true});})]);
 try{
  const session=await wait(account.tokenSession());if(account.user()?.uid!==owner.uid||account.user()?.isAnonymous!==false||session?.uid!==owner.uid||!session.idToken)return false;
  url.pathname='/seedExpeditionRelease/accountV1.json';url.searchParams.set('auth',session.idToken);
  const response=await wait(fetchImpl(url.href,{signal:controller.signal,cache:'no-store',redirect:'error'}));
  if(!response.ok||Number(response.headers?.get?.('Content-Length'))>16)return false;
  // The release value is one boolean, not an unrestricted remote document.
  const reader=response.body?.getReader();let text='',bytes=0;
  if(reader){const decoder=new TextDecoder();try{while(true){const chunk=await wait(reader.read());if(chunk.done)break;bytes+=chunk.value.byteLength;if(bytes>16)return false;text+=decoder.decode(chunk.value,{stream:true});}text+=decoder.decode();}finally{await reader.cancel().catch(()=>{});reader.releaseLock();}}
  else{text=await wait(response.text());if(new TextEncoder().encode(text).length>16)return false;}
  return account.user()?.uid===owner.uid&&account.user()?.isAnonymous===false&&JSON.parse(text)===true;
 }catch{return false;}finally{clearTimeout(alarm);controller.abort();}
}

export function expeditionAccountDeviceId(storage,{idFactory=()=>globalThis.crypto.randomUUID()}={}){
 const key='seed-expedition-account-device-v1',valid=v=>typeof v==='string'&&/^[A-Za-z0-9_:-]{1,128}$/.test(v)&&!['guest','__proto__','constructor','prototype'].includes(v);
 const old=storage.getItem(key);if(old!==null){if(!valid(old))throw Error('기기 식별 원본을 보존했어요');return old;}
 const id=idFactory();if(!valid(id))throw Error('기기 식별자를 만들지 못했어요');storage.setItem(key,id);if(storage.getItem(key)!==id)throw Error('기기 식별자 저장을 확인하지 못했어요');return id;
}
