import {FIREBASE_APP} from './account-auth.js';

export const BETA_TEST_URL='https://play.google.com/apps/testing/com.jpmathlab.seed';
export const BETA_CONSENT_VERSION='2026-09-18';
const EMAIL=/^[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}$/i;

export function betaApplicant(email,{android=false,consent=false,now=Date.now}={}){
 const clean=String(email||'').trim().toLowerCase();
 if(!clean)throw new Error('EMAIL_REQUIRED');
 if(clean.length>254||!EMAIL.test(clean))throw new Error('EMAIL_INVALID');
 if(!android)throw new Error('ANDROID_REQUIRED');
 if(!consent)throw new Error('CONSENT_REQUIRED');
 return Object.freeze({
  email:clean,
  displayName:'',
  android:true,
  consentVersion:BETA_CONSENT_VERSION,
  appliedAt:Number(now()),
  status:'pending',
  source:'public-web'
 });
}

export async function submitBetaApplication({account,email,android,consent,fetchImpl=globalThis.fetch,now=Date.now}={}){
 const applicant=betaApplicant(email,{android,consent,now});
 const user=account?.user?.();
 if(!user||user.isAnonymous||String(user.email||'').trim().toLowerCase()!==applicant.email)throw new Error('ACCOUNT_EMAIL_REQUIRED');
 const session=await account.tokenSession();
 if(!user?.uid||!session?.uid||!session.idToken||session.uid!==user.uid)throw new Error('APPLICATION_SESSION_REQUIRED');
 const base=FIREBASE_APP.databaseURL.replace(/\/$/,'');
 const response=await fetchImpl(`${base}/seedBetaApplicants/${encodeURIComponent(session.uid)}.json?auth=${encodeURIComponent(session.idToken)}`,{
  method:'PUT',headers:{'Content-Type':'application/json'},body:JSON.stringify(applicant)
 });
 if(!response.ok)throw new Error(`BETA_APPLICATION_${response.status}`);
 return applicant;
}

export function betaApplicationMessage(error){
 const code=String(error?.code||error?.message||'');
 if(code.includes('ANDROID_REQUIRED'))return 'Android 기기 보유 확인이 필요해요.';
 if(code.includes('CONSENT_REQUIRED'))return '이메일 수집·이용 동의가 필요해요.';
 if(code.includes('EMAIL_REQUIRED'))return 'Google Play에서 사용하는 이메일 주소를 적어 주세요.';
 if(code.includes('EMAIL_INVALID'))return '이메일 주소 형식을 다시 확인해 주세요.';
 if(code.includes('ACCOUNT_EMAIL_REQUIRED'))return '신청할 Google Play 이메일로 먼저 로그인해 주세요.';
 if(code.includes('popup-closed'))return 'Google 로그인 창이 닫혔어요. 다시 눌러 주세요.';
 if(code.includes('popup-blocked'))return '팝업이 차단됐어요. 브라우저에서 팝업을 허용해 주세요.';
 if(code.includes('unauthorized-domain'))return '이 웹 주소가 Firebase 로그인 허용 목록에 없어요. 관리자에게 알려 주세요. (AUTH-DOMAIN)';
 if(code.includes('APPLICATION_SESSION_REQUIRED'))return '신청 번호를 만들지 못했어요. 페이지를 새로 열고 다시 시도해 주세요.';
 return '신청을 저장하지 못했어요. 잠시 뒤 다시 시도해 주세요.';
}
