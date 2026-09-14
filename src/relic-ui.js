import {RELICS,RELIC_STORAGE,ownedRelics,keepRelic} from './relics.js';
import {lawArt} from './law-art.js';
import './relics.css';
// fx: relicEffect(...) for the current build. Stored relics say what they WOULD do, never '적용'.
const effectLine=(fx,stored=false)=>{if(!fx)return '';const text=fx.state==='missing'?fx.note:(stored?'장착하면 ':'지금 적용 · ')+fx.lines.join(' · ');return `<em class="relic-fx ${fx.state}">${text}</em>`;};
const tile=(id,fx=null,stored=false)=>`${lawArt(RELICS[id].law)}<div><strong>${RELICS[id].name}</strong><p>${RELICS[id].desc}</p>${effectLine(fx,stored)}</div>`;
export function relicLoadout(r,canSwap,effectOf=null){const fx=id=>effectOf?effectOf(id):null;
 return `<section class="relic-loadout"><h3>유물 · 장착 1개 / 보관 ${r.stored.length}/${RELIC_STORAGE}</h3><p>${canSwap?'방을 정리했습니다 · 보관 유물을 눌러 장착을 바꿀 수 있어요':'전투 중에는 확인만 · 방을 정리한 뒤 장착을 바꿀 수 있어요'}<br>보관 중에는 효과 없음 · 쓰러지면 이번 도전의 유물이 사라집니다</p><div class="relic-equipped">${r.equipped?'<small>장착 중</small>'+tile(r.equipped,fx(r.equipped)):'<strong>장착한 유물 없음</strong><p>정시파이터 오스틴을 이기면 유물을 고를 수 있어요</p>'}</div><div class="relic-storage">${Array.from({length:RELIC_STORAGE},(_,i)=>r.stored[i]?`<button data-equip-relic="${r.stored[i]}" ${canSwap?'':'disabled'}><small>보관 · 눌러서 장착</small>${tile(r.stored[i],fx(r.stored[i]),true)}</button>`:'<div class="relic-empty">빈 보관 칸</div>').join('')}</div></section>`;
}
export function showRelicChoice(root,r,offers,onDone,effectOf=null){const fx=id=>effectOf?effectOf(id):null;
 const choose=id=>{
  root.innerHTML=`<p>유물 획득</p><h2>${RELICS[id].name}</h2><div class="relic-detail">${tile(id,fx(id),true)}</div><p>장착한 1개만 효과가 있어요. 현재 유물 ${ownedRelics(r).length}/4개</p><div class="relic-actions"><button class="primary" data-keep="equip">${r.equipped?(r.stored.length<RELIC_STORAGE?'새 유물 장착 · 기존 유물 보관':'장착 유물을 버리고 교체'):'지금 장착하기'}</button>${r.stored.length<RELIC_STORAGE?'<button data-keep="store">보관하기 · 효과 없음</button>':r.stored.map(old=>`<button data-replace="${old}">${RELICS[old].name}을 버리고 보관</button>`).join('')}<button id="relic-back">다른 후보 보기</button></div>`;
  root.querySelectorAll('[data-keep]').forEach(b=>b.onclick=()=>{if(keepRelic(r,id,b.dataset.keep,b.dataset.keep==='equip'?r.equipped:null))onDone(id);});
  root.querySelectorAll('[data-replace]').forEach(b=>b.onclick=()=>{if(keepRelic(r,id,'store',b.dataset.replace))onDone(id);});
  root.querySelector('#relic-back').onclick=draw;
 };
 const draw=()=>{
  root.hidden=false;root.innerHTML=`<p>오스틴의 유물함</p><h2>이번 조합을 더 특별하게</h2><p>하나를 골라 장착하거나 보관하세요 · 장착 1개 + 보관 최대 3개</p><div class="relic-cards" style="--n:${offers.length}">${offers.map(id=>`<button data-relic="${id}" class="fx-${fx(id)?.state||'none'}">${tile(id,fx(id),true)}<small>선택하기</small></button>`).join('')}</div><button id="skip-relic">받지 않고 계속하기</button>`;
  root.querySelectorAll('[data-relic]').forEach(b=>b.onclick=()=>choose(b.dataset.relic));
  root.querySelector('#skip-relic').onclick=()=>onDone(null);
 };
 draw();
}
