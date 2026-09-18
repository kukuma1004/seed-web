import {relicLoadout} from './relic-ui.js';
import {SLOT_CAP} from './progression.js';
import {ITEMS,heldItems} from './inventory.js';
import {LAWS} from './laws.js';
import {ALL_FORMS as FORMS} from './forms.js';
import {activeSection} from './active-ui.js';
import {itemArt} from './item-art.js';
import {lawArt} from './law-art.js';
import {formArt} from './form-art.js';
import {orbitCore,isOrbitEvolution} from './evolution-family.js';
import {dashEvolutionSummary} from './dash-evolution.js';
import './pause-build.css';

// The bag lists what every potion does, so a player can learn them while the game is stopped.
function itemBag(inventory){
 const held=heldItems(inventory);
 const rows=held.map(id=>{const it=ITEMS[id];return `<li>${itemArt(id)}<div><strong>${it.name} <span>×${inventory[id]}</span></strong><p>${it.desc}${it.kind!=='revive'?' · Q 마시기 · Shift+Q 고르기':''}</p></div></li>`;}).join('');
 return `<section class="item-bag"><h3>물약 가방</h3>${rows?`<ul>${rows}</ul>`:'<p>정시파이터 오스틴을 이기면 물약을 얻어요 · 시간의 물약과 함께 작은 물약·바람 물약·껍질 물약·다시 싹 중 하나</p>'}</section>`;
}
export function createPauseBuild(saveButton,resume,relicUI=null,itemsUI=null,activeUI=null,titleUI=null,dashUI=null,bonusUI=null){
 const root=document.createElement('section');root.id='pause-build';root.hidden=true;
 root.setAttribute('role','dialog');root.setAttribute('aria-modal','true');root.setAttribute('aria-labelledby','pause-title');
 root.innerHTML='<div class="pause-sheet"><header><small>일시 정지</small><h2 id="pause-title">지금의 시드</h2><p id="pause-slots"></p></header><div id="pause-loadout"></div><footer><button id="pause-resume" class="primary">계속하기</button></footer></div>';
 root.querySelector('footer').append(saveButton);document.body.append(root);
 const continueButton=root.querySelector('#pause-resume');continueButton.onclick=resume;
 // Keep keyboard focus in the sheet; P/Escape still use the game's pause handler.
 root.addEventListener('keydown',event=>{
  if(event.key!=='Tab')return;
  const buttons=[...root.querySelectorAll('button:not([disabled]):not([hidden])')];
  if(event.shiftKey&&document.activeElement===buttons[0]){event.preventDefault();buttons.at(-1).focus();}
  else if(!event.shiftKey&&document.activeElement===buttons.at(-1)){event.preventDefault();buttons[0].focus();}
 });
 let shownLevels,shownForms;
 const api={
  show(levels,forms){
   shownLevels=levels;shownForms=forms;
   const core=orbitCore(forms,FORMS);
   const entries=[...forms].map(([id,level])=>{const f=FORMS[id],orbitStatus=isOrbitEvolution(id)?id===core?' · 공전 코어 활성':' · 공전 코어 대기':'';return `<article class="pause-item evolved">${formArt(id)}<div><small>${f.solo?'':f.awakened?'각성 진화 · ':'완성 진화 · '}${f.pair}${orbitStatus}</small><h3>${f.name} <span>Lv.${level}</span></h3><p>${f.desc}</p></div></article>`;})
    .concat([...levels].map(([id,level])=>{const law=LAWS[id];return `<article class="pause-item">${lawArt(id)}<div><small>법칙</small><h3>${law.name} <span>Lv.${level}</span></h3><p>${law.hint}</p></div></article>`;}));
   root.querySelector('#pause-slots').textContent=`보유 ${levels.size+forms.size}/${SLOT_CAP}칸 · 진화 ${forms.size}개`;
   root.querySelector('#pause-loadout').innerHTML=entries.join('')||'<p class="pause-empty">아직 이름 없는 씨앗이에요.<br>적을 처치하고 첫 법칙을 골라 주세요.</p>';
   if(activeUI)root.querySelector('#pause-loadout').insertAdjacentHTML('beforeend',activeSection(forms,activeUI.get()));
   if(dashUI){const section=dashEvolutionSummary(dashUI.get());if(section)root.querySelector('#pause-loadout').insertAdjacentHTML('beforeend',section);}
   if(bonusUI){const lines=bonusUI.summary();if(lines.length)root.querySelector('#pause-loadout').insertAdjacentHTML('beforeend',`<section class="item-bag run-bonus-summary"><h3>이번 여정의 작은 성장</h3><p>${lines.join(' · ')}</p></section>`);}
   if(itemsUI)root.querySelector('#pause-loadout').insertAdjacentHTML('beforeend',itemBag(itemsUI.get()));
   const titles=titleUI?.state();
   if(titles&&(titles.titles.length||titles.next)){
    const runShot=bonusUI?.shotScale?.()||1,totalShot=titles.shotSpeed*runShot;
    const percent=value=>`${Math.round(value*1000)/10}%`;
    const sources=[titles.shotSpeedBonus>0?`영구 칭호 +${percent(titles.shotSpeedBonus)}`:'',runShot>1?`이번 여정 +${percent(runShot-1)}`:''].filter(Boolean).join(' · ');
    root.querySelector('#pause-loadout').insertAdjacentHTML('beforeend',`<section class="item-bag title-perk"><h3>칭호와 현재 능력치</h3><p class="title-total"><strong>탄환 속도 ${percent(totalShot)}</strong>${sources?`<small>${sources}</small>`:''}</p>${titles.titles.map(t=>`<p class="${t.id===titles.equipped?'equipped':''}"><strong>${t.id===titles.equipped?'장착 · ':''}${t.name}</strong> · ${t.perk}</p>`).join('')}${titles.next?`<p class="title-next">도감 ${titles.next.need}개 더 · ${titles.next.reward}</p>`:''}</section>`);
   }
   if(relicUI){root.querySelector('#pause-loadout').insertAdjacentHTML('beforeend',relicLoadout(relicUI.get(),relicUI.canSwap(),relicUI.effect));root.querySelectorAll('[data-equip-relic]').forEach(b=>b.onclick=()=>{relicUI.swap(b.dataset.equipRelic);api.show(shownLevels,shownForms);});}
   root.hidden=false;continueButton.focus({preventScroll:true});
  },
  hide(){root.hidden=true;}
 };
 return api;
}
