import {Capacitor} from '@capacitor/core';

// Flip this only when the Play closed test is actually available. The native app and local QA
// are never locked; this applies solely to the public GitHub Pages copy students currently open.
export const PUBLIC_WEB_BETA_LOCKED=false;

export function publicWebBetaLocked(locationLike=globalThis.location){
 const host=locationLike?.hostname||'';
 return PUBLIC_WEB_BETA_LOCKED&&!Capacitor.isNativePlatform()&&host==='kukuma1004.github.io';
}

export const BETA_NOTICE=Object.freeze({
 title:'SEED는 베타 테스트 중이에요',
 body:'더 안정적인 앱을 만들기 위해 웹 플레이를 잠시 닫았습니다. 등록된 테스터는 Google Play에서 SEED를 설치해 주세요.',
 detail:'베타가 끝나면 정식 앱 출시 소식을 이곳에서 알려 드릴게요.'
});
