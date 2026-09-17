import {Capacitor} from '@capacitor/core';

// Flip this only when the Play closed test is actually available. The native app and local QA
// are never locked; this applies solely to the public GitHub Pages copy students currently open.
export const PUBLIC_WEB_BETA_LOCKED=true;

export function publicWebBetaLocked(locationLike=globalThis.location){
 const host=locationLike?.hostname||'';
 const localPreview=(host==='localhost'||host==='127.0.0.1')&&new URLSearchParams(locationLike?.search||'').has('betaApply');
 return PUBLIC_WEB_BETA_LOCKED&&!Capacitor.isNativePlatform()&&(host==='kukuma1004.github.io'||localPreview);
}

export const BETA_NOTICE=Object.freeze({
 title:'SEED 비공개 베타테스터 모집',
 body:'웹 플레이는 잠시 쉬고, Android 앱에서 다음 버전을 함께 시험합니다.',
 detail:'Android 휴대전화 또는 태블릿이 있는 분만 신청해 주세요. 신청한 Google 계정 이메일은 비공개 테스트 등록과 안내에만 사용합니다.'
});
