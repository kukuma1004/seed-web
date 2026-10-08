// Lazy mode imports and account checks keep a visible, cancellable entry screen.
export function showModeEntryLoading({overlay,title,isCurrent,onBack,onReload=()=>location.reload(),setTimer=setTimeout,clearTimer=clearTimeout}){
 let cancelled=false,finished=false;
 overlay.hidden=false;
 overlay.innerHTML=`<div class="menu-panel mode-entry-panel"><p class="eyebrow">SEED · PLAY</p><h2>${title}</h2><p data-entry-status role="status" aria-live="polite">게임을 준비하고 있어요…</p><div class="mode-entry-actions"><button data-entry-reload hidden>최신 화면으로 다시 열기</button><button data-entry-back>돌아가기</button></div></div>`;
 const status=overlay.querySelector('[data-entry-status]'),reload=overlay.querySelector('[data-entry-reload]'),back=overlay.querySelector('[data-entry-back]');
 const current=()=>!cancelled&&isCurrent();
 const timer=setTimer(()=>{if(!current()||finished||!overlay.contains(status))return;status.textContent='불러오기가 지연되고 있어요. 연결을 확인하거나 다시 열어 주세요. 저장 기록은 지우지 않아요.';reload.hidden=false;},12000);
 back.onclick=()=>{if(cancelled||finished||!overlay.contains(status))return;cancelled=true;clearTimer(timer);onBack();};
 reload.onclick=()=>{if(current()&&!finished)onReload();};
 return {current,finish(){clearTimer(timer);if(!current())return false;finished=true;if(overlay.contains(status))overlay.hidden=true;return true;},dispose(){if(!finished)cancelled=true;clearTimer(timer);}};
}
