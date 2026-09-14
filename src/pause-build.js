import {relicLoadout} from './relic-ui.js';
import {ITEMS,heldItems} from './inventory.js';
import {LAWS} from './laws.js';
import {FORMS} from './forms.js';
import {lawArt} from './law-art.js';
import {formArt} from './form-art.js';
import './pause-build.css';

// The bag lists what every potion does, so a player can learn them while the game is stopped.
function itemBag(inventory){
 const held=heldItems(inventory);
 const rows=held.map(id=>{const it=ITEMS[id];return `<li><i class="potion-icon ${id}" aria-hidden="true"></i><div><strong>${it.name} <span>×${inventory[id]}</span></strong><p>${it.desc}${it.key?` · ${it.key}번 키`:''}</p></div></li>`;}).join('');
 return `<section class="item-bag"><h3>물약 가방</h3>${rows?`<ul>${rows}</ul>`:'<p>문지기와 오스틴을 이기면 물약을 얻어요 · 작은 물약, 바람 물약, 껍질 물약, 시간의 물약, 다시 싹</p>'}</section>`;
}
export function createPauseBuild(saveButton,resume,relicUI=null,itemsUI=null){
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
   const entries=[...forms].map(([id,level])=>{const f=FORMS[id];return `<article class="pause-item evolved">${formArt(id)}<div><small>완성 진화 · ${f.pair}</small><h3>${f.name} <span>Lv.${level}</span></h3><p>${f.desc}</p></div></article>`;})
    .concat([...levels].map(([id,level])=>{const law=LAWS[id];return `<article class="pause-item">${lawArt(id)}<div><small>법칙</small><h3>${law.name} <span>Lv.${level}</span></h3><p>${law.hint}</p></div></article>`;}));
   root.querySelector('#pause-slots').textContent=`보유 ${levels.size+forms.size}/5칸 · 완성 진화 ${forms.size}개`;
   root.querySelector('#pause-loadout').innerHTML=entries.join('')||'<p class="pause-empty">아직 이름 없는 씨앗이에요.<br>적을 처치하고 첫 법칙을 골라 주세요.</p>';
   if(itemsUI)root.querySelector('#pause-loadout').insertAdjacentHTML('beforeend',itemBag(itemsUI.get()));
   if(relicUI){root.querySelector('#pause-loadout').insertAdjacentHTML('beforeend',relicLoadout(relicUI.get(),relicUI.canSwap(),relicUI.effect));root.querySelectorAll('[data-equip-relic]').forEach(b=>b.onclick=()=>{relicUI.swap(b.dataset.equipRelic);api.show(shownLevels,shownForms);});}
   root.hidden=false;continueButton.focus({preventScroll:true});
  },
  hide(){root.hidden=true;}
 };
 return api;
}
