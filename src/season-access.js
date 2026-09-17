export const DEFAULT_SEASON_STATUS=Object.freeze({
 paused:true,
 season:'1.1',
 title:'베타 시즌 1.1을 준비하고 있어요',
 body:'시험 기간에는 SEED 플레이를 잠시 쉬어 갑니다.',
 detail:'시즌 1.0 최종 기록은 언제든 볼 수 있어요. 저장된 정원과 도감도 그대로 남아 있습니다.'
});

// The contact address is already public in the privacy policy. Keeping only its
// digest here avoids making the administrator check a plain-text UI convention.
export const ADMIN_EMAIL_HASH='5c9b68f61e83b764def4667d0c96e1ad77ff7d76f377a4a53eb1fd8982dba9e2';
export const SEASON_STATUS_URL='https://kukuma1004.github.io/seed-web/season-status.json';
const hex=bytes=>[...new Uint8Array(bytes)].map(v=>v.toString(16).padStart(2,'0')).join('');
export async function accessHash(value,subtle=globalThis.crypto?.subtle){
 if(!subtle||typeof TextEncoder==='undefined')return '';
 return hex(await subtle.digest('SHA-256',new TextEncoder().encode(String(value).trim().toLowerCase())));
}
export async function isSeasonAdmin(user,digest=accessHash){
 if(!user||user.isAnonymous||typeof user.email!=='string'||!user.email)return false;
 return await digest(user.email)===ADMIN_EMAIL_HASH;
}
export function normalizeSeasonStatus(value){
 const text=(key,fallback)=>typeof value?.[key]==='string'&&value[key].trim()?value[key].trim().slice(0,180):fallback;
 return Object.freeze({paused:value?.paused!==false,season:text('season',DEFAULT_SEASON_STATUS.season),title:text('title',DEFAULT_SEASON_STATUS.title),body:text('body',DEFAULT_SEASON_STATUS.body),detail:text('detail',DEFAULT_SEASON_STATUS.detail)});
}
export async function loadSeasonStatus({fetchImpl=globalThis.fetch,url=SEASON_STATUS_URL,enabled=true,timeoutMs=4000}={}){
 if(!enabled)return Object.freeze({...DEFAULT_SEASON_STATUS,paused:false});
 if(typeof fetchImpl!=='function')return DEFAULT_SEASON_STATUS;
 const controller=typeof AbortController==='function'?new AbortController():null,timer=setTimeout(()=>controller?.abort(),timeoutMs);
 try{
  const response=await fetchImpl(`${url}${url.includes('?')?'&':'?'}t=${Date.now()}`,{cache:'no-store',signal:controller?.signal});
  if(!response.ok)throw new Error(`season-status-${response.status}`);
  return normalizeSeasonStatus(await response.json());
 }catch{return DEFAULT_SEASON_STATUS;}finally{clearTimeout(timer);}
}
