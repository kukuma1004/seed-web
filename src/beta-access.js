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
 body:'등록된 베타테스터는 Google 계정으로 PC 웹과 Android 앱에서 플레이할 수 있습니다.',
 detail:'새 신청은 Google Play 비공개 테스트를 위해 Android 기기가 있는 분에게 받고 있습니다. 이메일은 테스트 등록과 안내에만 사용합니다.'
});
