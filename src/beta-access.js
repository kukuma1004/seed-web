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
 title:'SEED 비공개 테스트',
 body:'등록된 베타테스터는 Google 계정으로 PC 웹과 Android 앱에서 플레이할 수 있습니다.',
 detail:'아직 등록되지 않은 계정은 게임에 입장할 수 없습니다.'
});
