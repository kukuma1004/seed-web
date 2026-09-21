// 실행 방식은 세 가지다. 앱(Android 네이티브) · 설치된 웹앱(PWA, 홈 화면) · 일반 브라우저.
// 2026-09-21: 설치된 웹앱은 이미 전체 화면으로 열리는데도 '전체화면' 버튼과 안내가 남아 있었고,
// 판을 시작할 때마다 requestFullscreen을 불러 iPhone·Android 설치 앱에서 화면이 한 번 더 흔들렸다.
// 이제 전체화면 API는 일반 브라우저에서만 쓰는 대체 수단이다.
export function launchContext({nativeApp=false,media=globalThis.matchMedia?.bind(globalThis),nav=globalThis.navigator,doc=globalThis.document}={}){
 const matches=q=>{try{return Boolean(media?.(q)?.matches);}catch{return false;}};
 // Fullscreen API로 들어간 일반 탭도 display-mode: fullscreen에 걸리는 브라우저가 있어, 그때는 설치 앱으로 치지 않는다.
 const apiFullscreen=Boolean(doc?.fullscreenElement||doc?.webkitFullscreenElement);
 const installed=!nativeApp&&(nav?.standalone===true||matches('(display-mode: standalone)')||(!apiFullscreen&&matches('(display-mode: fullscreen)'))||matches('(display-mode: minimal-ui)'));
 const fullscreenApi=Boolean(doc?.documentElement?.requestFullscreen);
 return {mode:nativeApp?'native':installed?'pwa':'browser',installed:nativeApp||installed,fullscreenApi};
}
export function setupMobileApp(){
 // The native Android activity enters sensor-landscape immediately and remains resizable.
 const nativeApp=Boolean(window.Capacitor?.isNativePlatform?.());
 if(nativeApp)document.body.classList.add('native-app');
 const touch=matchMedia('(any-pointer:coarse)').matches||navigator.maxTouchPoints>0;
 // 시작할 때 한 번만 판정한다. 뒤에 브라우저가 전체화면에 들어가도 설치 앱으로 바뀌지 않는다.
 const launch=launchContext({nativeApp});
 const browser=launch.mode==='browser';
 document.body.classList.toggle('installed-app',launch.installed);
 document.body.insertAdjacentHTML('beforeend',`<div id="app-actions">${browser?'<button id="fullscreen-game" aria-label="전체화면">⛶ <span>전체화면</span></button><button id="install-game">홈 화면 설치</button>':''}</div><div id="app-notice" role="status" hidden></div>`);
 const full=document.querySelector('#fullscreen-game'),install=document.querySelector('#install-game'),notice=document.querySelector('#app-notice');let prompt;
 function say(text){notice.textContent=text;notice.hidden=false;setTimeout(()=>notice.hidden=true,8000);}
 async function fullscreen(){
  if(!browser)return;
  try{
   if(document.fullscreenElement){await document.exitFullscreen();return;}
   if(!document.documentElement.requestFullscreen){say('이 브라우저에서는 공유 메뉴 → 홈 화면에 추가 후 실행해 주세요. 기기를 가로로 돌리면 넓게 플레이할 수 있어요.');return;}
   await document.documentElement.requestFullscreen();
   if(touch&&screen.orientation?.lock)try{await screen.orientation.lock('landscape');}catch{say('기기를 가로로 돌려 주세요. 이 브라우저는 화면 방향 잠금을 지원하지 않아요.');}
  }catch{say('전체화면을 열지 못했어요. 홈 화면에 추가하거나 브라우저 메뉴의 전체화면 기능을 이용해 주세요.');}
 }
 // 휴대폰 일반 브라우저에서 판을 시작하면 전체 화면과 가로 화면을 조용히 요청한다(거절되면 그대로 둔다).
 // 설치 앱은 매니페스트(display·orientation)가 이미 처리하므로 아무것도 부르지 않는다.
 async function enterFullscreen(){
  if(!touch)return;
  if(nativeApp){try{if(screen.orientation?.lock)await screen.orientation.lock('landscape');}catch{}return;}
  if(!browser)return;
  try{if(!document.fullscreenElement&&document.documentElement.requestFullscreen)await document.documentElement.requestFullscreen({navigationUI:'hide'});}catch{}
  try{if(screen.orientation?.lock)await screen.orientation.lock('landscape');}catch{}
 }
 document.body.insertAdjacentHTML('beforeend','<div id="rotate-hint" role="alert"><div><b>⟳</b><strong>휴대폰을 가로로 돌려 주세요</strong><span>SEED는 가로 화면에서 플레이해요</span></div></div>');
 const markFullscreen=()=>document.body.classList.toggle('is-fullscreen',launch.installed||Boolean(document.fullscreenElement));
 if(browser){
  document.addEventListener('fullscreenchange',()=>{markFullscreen();full.querySelector('span').textContent=document.fullscreenElement?'전체화면 종료':'전체화면';});
  full.onclick=fullscreen;
  window.addEventListener('beforeinstallprompt',e=>{e.preventDefault();prompt=e;install.hidden=false;});
  install.onclick=async()=>{if(prompt){await prompt.prompt();prompt=null;}else say('iPhone: Safari 공유 메뉴 → 홈 화면에 추가. Android: 브라우저 메뉴 → 앱 설치 또는 홈 화면에 추가. 설치 후 가로로 돌려 실행해 주세요.');};
  window.addEventListener('appinstalled',()=>install.hidden=true);
 }
 markFullscreen();
 if(!nativeApp&&import.meta.env.PROD&&'serviceWorker' in navigator)window.addEventListener('load',()=>navigator.serviceWorker.register(import.meta.env.BASE_URL+'sw.js',{updateViaCache:'none'}).then(registration=>{
  registration.update().catch(()=>{});
  setInterval(()=>registration.update().catch(()=>{}),60_000);
 }).catch(()=>{}));
 return {fullscreen,enterFullscreen,nativeApp,launch};
}
