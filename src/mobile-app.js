export function setupMobileApp(){
 // Inside the Google Play build (Capacitor) the Android activity already runs full screen in landscape,
 // so the web install and full screen buttons and the offline service worker are skipped there.
 const nativeApp=Boolean(window.Capacitor?.isNativePlatform?.());
 if(nativeApp)document.body.classList.add('native-app');
 const touch=matchMedia('(any-pointer:coarse)').matches||navigator.maxTouchPoints>0;
 document.body.insertAdjacentHTML('beforeend','<div id="app-actions"><button id="fullscreen-game" aria-label="전체화면">⛶ <span>전체화면</span></button><button id="install-game">홈 화면 설치</button></div><div id="app-notice" role="status" hidden></div>');
 const full=document.querySelector('#fullscreen-game'),install=document.querySelector('#install-game'),notice=document.querySelector('#app-notice');let prompt;
 function say(text){notice.textContent=text;notice.hidden=false;setTimeout(()=>notice.hidden=true,8000);}
 async function fullscreen(){
  try{
   if(document.fullscreenElement){await document.exitFullscreen();return;}
   if(!document.documentElement.requestFullscreen){say('이 브라우저에서는 공유 메뉴 → 홈 화면에 추가 후 실행해 주세요. 기기를 가로로 돌리면 넓게 플레이할 수 있어요.');return;}
   await document.documentElement.requestFullscreen();
   if(touch&&screen.orientation?.lock)try{await screen.orientation.lock('landscape');}catch{say('기기를 가로로 돌려 주세요. 이 브라우저는 화면 방향 잠금을 지원하지 않아요.');}
  }catch{say('전체화면을 열지 못했어요. 홈 화면에 추가하거나 브라우저 메뉴의 전체화면 기능을 이용해 주세요.');}
 }
 // Starting or continuing a run on a phone goes full screen and asks for landscape. Silent if the browser refuses
 // (iPhone Safari has no full screen for pages); the rotate hint below still asks for landscape.
 async function enterFullscreen(){
  if(!touch||nativeApp)return;
  try{if(!document.fullscreenElement&&document.documentElement.requestFullscreen)await document.documentElement.requestFullscreen({navigationUI:'hide'});}catch{}
  try{if(screen.orientation?.lock)await screen.orientation.lock('landscape');}catch{}
 }
 document.body.insertAdjacentHTML('beforeend','<div id="rotate-hint" role="alert"><div><b>⟳</b><strong>휴대폰을 가로로 돌려 주세요</strong><span>SEED는 가로 화면에서 플레이해요</span></div></div>');
 const markFullscreen=()=>document.body.classList.toggle('is-fullscreen',nativeApp||Boolean(document.fullscreenElement)||Boolean(standalone()));
 document.addEventListener('fullscreenchange',markFullscreen);
 full.onclick=fullscreen;document.addEventListener('fullscreenchange',()=>full.querySelector('span').textContent=document.fullscreenElement?'전체화면 종료':'전체화면');
 window.addEventListener('beforeinstallprompt',e=>{if(nativeApp)return;e.preventDefault();prompt=e;install.hidden=false;});
 const standalone=()=>matchMedia('(display-mode: standalone)').matches||matchMedia('(display-mode: fullscreen)').matches||navigator.standalone;
 install.hidden=nativeApp||Boolean(standalone());markFullscreen();
 install.onclick=async()=>{if(prompt){await prompt.prompt();prompt=null;}else say('iPhone: Safari 공유 메뉴 → 홈 화면에 추가. Android: 브라우저 메뉴 → 앱 설치 또는 홈 화면에 추가. 설치 후 가로로 돌려 실행해 주세요.');};
 window.addEventListener('appinstalled',()=>install.hidden=true);
 if(!nativeApp&&import.meta.env.PROD&&'serviceWorker' in navigator)window.addEventListener('load',()=>navigator.serviceWorker.register(import.meta.env.BASE_URL+'sw.js').catch(()=>{}));
 return {fullscreen,enterFullscreen,nativeApp};
}
