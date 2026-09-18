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
// Closed-test emails are stored only as one-way hashes. A player must first
// prove ownership through Firebase Google sign-in before this list is checked.
export const BETA_TESTER_EMAIL_HASHES=Object.freeze([
 'f913e72f48f98926e91ebb6a5a9639252f98d89341cda986fad80912f6f1f7da','7c760bf0097ce50a3eacadaa0037371d30ac720a962661a9a178d2f95f01d97b',
 '3f89a1dcf261600740054b4b27db93f4ef16f7982145b922340ea9a07d497403','75d67572f7037710b734d160100e1c9d2e6caf9be926ca46ef552f8bdce850db',
 '373a7f7772e8714ffdd37f82d08f87f7c4672fc0123ef813bc7e05f353c4ce5b','d20600f2aeb11303dfda123f422e87b6aa61505770a158cf7eb24861100b5050',
 '6b90cf3c228caa1df4ae78bc279094a424752c6b65a59b1b373d103395f1b94d','3fb2710acf97bd1443213882f2fce54a686b39d9ce1807af606a189532dbf16c',
 '473d466603cd1d891c02607f665be1fdce3716d5985420df7138acdfbc68be05','3d80f79ea64349960de727a636a0cfccacf30b91c880549b1c4d258da43041d9',
 '25079473dc423dc27f00aec5af2570e1386f4b972f79daabea8313ea88844ac8','893a8a034c10d5c933ebbe0e3956ac97014c2ceffa868321193e1376f568a649',
 'a2dd6e3107171d2d91e1117f0c9ed9f2768bb73db29baf197ad2217ca49a5a71','83cf4d67716537dd969b1684c9069128cf5728216e56b3ba43c45b63b56053fb',
 'c93efe83ba23349e589d5fc08864b289a48d2b35c98fdcf91b457ac308bd687d','9fb7b51db93cc4b4b50e036c6b96e7daf4990e69ed90064e633f9cb87743c8a8',
 '42c2e6f98c6d4f03410831af56f85ad9bd8b41b86571bf761fe08a26c5165f86','46b8eac599de44dd59faf409421c806628c3067a01dff3afe09de64b6dbc6263',
 '9cad546989d6c3098ab796198a498769e64c7893f64817675ae3c542a2a7ad24','26e595abf387e5df43acae58dcc0820d18d9a574aff951d78b15c46411106a48',
 '74f7dcf78e2d0878433295f7426d34360ae622c34e7ce7eb3125bd4c6ab7eb2f','4a48be76a82dc75a15c21e69a7ff2e7166f750c9e9a74502e8856df8f0bb5aed',
 '23ec03eed7f8a888aa461d124182de32598004f009bada08794e229dd4c8f364',
 '11f0a6b00034d180d0e4ef60a331aa4f842d53425c6269a565dff5e2744835e1','b77faaa491f846a8d4a183e4e9bbcf65ff80412879509d370ed86bd2dfd2b057',
 '0607d3452570b9776eefd4989ecb2e1900e6004d13b4ea59f2a1c333840405c7','13c13f0f05b133e57d39d51a867f9178e6e0d4998276a7c09001c64d11a636b5'
]);
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
export async function isBetaTester(user,digest=accessHash,hashes=BETA_TESTER_EMAIL_HASHES){
 if(!user||user.isAnonymous||typeof user.email!=='string'||!user.email)return false;
 return hashes.includes(await digest(user.email));
}
export function gameplayIsPaused({status=DEFAULT_SEASON_STATUS,native=false,admin=false,dev=false}={}){
 return Boolean(status?.paused)&&!native&&!admin&&!dev;
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
