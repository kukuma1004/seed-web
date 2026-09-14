import {ACTIVE,SIGNATURES,STATE_NAMES,activeState,activeSummary,activeReady} from './actives.js';
import {ALL_FORMS} from './forms.js';
import {formArt} from './form-art.js';
import './actives.css';

// The one active button. Art is a placeholder built from the evolution portraits already in the game;
// when dedicated active icons arrive (docs/ART-REQUEST-ACTIVES.md) only activeIcon() changes.
export const ACTIVE_BUTTON_HTML='<button id="active-skill" hidden aria-live="off"><span class="active-fill" aria-hidden="true"></span><span class="active-icon" aria-hidden="true"></span><b class="active-name"></b><small class="active-key">F</small></button>';
export const ACTIVE_EFFECT_HTML='<div id="active-cinematic" hidden aria-live="polite"></div>';

export function announceActive(root,plan){
 if(!root)return;
 const over=plan.state==='OVERDRIVE',names=plan.forms.map(id=>SIGNATURES[id]?.name).filter(Boolean);
 root.innerHTML=`<div class="active-cinematic-art">${activeIcon(plan.forms)}</div><div><small>${over?'두 진화가 공명합니다':'시드의 진화가 폭발합니다'}</small><strong>${over?'OVERDRIVE':names[0]}</strong><span>${over?names.join(' × '):`${plan.seconds}초 시그니처`}</span></div>`;
 root.hidden=false;root.className='';void root.offsetWidth;root.className=`show ${over?'overdrive':'signature'}`;
}

export function announceFinale(root,plan){
 if(!root||plan.state!=='OVERDRIVE')return;
 root.innerHTML='<div class="active-finale-mark">✦</div><div><small>법칙 공명 완성</small><strong>융합 폭발</strong><span>두 진화의 성질이 한 번에 터집니다</span></div>';
 root.hidden=false;root.className='';void root.offsetWidth;root.className='show finale';
}

export function activeIcon(forms){
 if(!forms.length)return '<span class="active-lock">🔒</span>';
 return forms.map(id=>formArt(id,'active-portrait')).join('');
}

// Rewrites the button only when something visible changed.
export function renderActiveButton(button,{forms,gauge,live,touch=false}){
 if(!button)return;
 const s=activeState(forms),running=Boolean(gauge.plan),ready=activeReady(gauge,forms);
 const shownForms=running?gauge.plan.forms:s.forms;
 const fill=running?Math.max(0,gauge.plan.time/gauge.plan.seconds):gauge.value/ACTIVE.max;
 const hide=!live;
 if(button.hidden!==hide)button.hidden=hide;
 if(hide)return;
 const pct=Math.round(fill*100);
 const key=[s.state,shownForms.join('+'),running?'run':ready?'ready':'charge',pct,touch].join('|');
 if(button.__key===key)return;button.__key=key;
 button.style.setProperty('--fill',pct+'%');
 button.classList.toggle('locked',s.state==='LOCKED');
 button.classList.toggle('ready',ready);
 button.classList.toggle('running',running);
 button.classList.toggle('overdrive',(running?gauge.plan.state:s.state)==='OVERDRIVE');
 const iconKey=shownForms.join('+');
 const icon=button.querySelector('.active-icon');if(icon.__forms!==iconKey){icon.innerHTML=activeIcon(shownForms);icon.__forms=iconKey;}
 const name=s.state==='LOCKED'?'궁극기 잠김':running?(gauge.plan.state==='OVERDRIVE'?'오버드라이브':SIGNATURES[shownForms[0]].name):ready?(s.state==='OVERDRIVE'?'오버드라이브':SIGNATURES[s.forms[0]].name):`${pct}%`;
 button.querySelector('.active-name').textContent=name;
 button.querySelector('.active-key').textContent=touch?'':'F';
 button.setAttribute('aria-label',`궁극기 · ${STATE_NAMES[s.state]} · ${ready?'사용 가능':running?'발동 중':'게이지 '+pct+'%'}`);
}

// Pause sheet: what the active will do with this exact build.
export function activeSection(forms,gauge){
 const summary=activeSummary(forms,gauge);
 const art=summary.forms?activeIcon(summary.forms):'';
 const lines=summary.lines.map(line=>`<li>${line}</li>`).join('');
 const detail=summary.state==='OVERDRIVE'?summary.forms.map(id=>`<li><b>${SIGNATURES[id].name}</b> · ${ALL_FORMS[id].name} · ${SIGNATURES[id].desc}</li>`).join(''):'';
 return `<section class="active-sheet ${summary.state.toLowerCase()}"><h3>궁극기 <span>${STATE_NAMES[summary.state]} · 게이지 ${Math.floor(gauge.value)}/${ACTIVE.max}</span></h3>
 <div class="active-sheet-body">${art?`<div class="active-sheet-art">${art}</div>`:''}<div><strong>${summary.title}</strong><ul>${lines}${detail}</ul>
 <p class="active-rule">진화 1개: 그 진화의 시그니처 · 진화 2개 이상: 가장 강한 둘의 오버드라이브 · 적을 처치하면 차고 발동 중에는 차지 않아요 · F 키 또는 궁극기 버튼</p></div></div></section>`;
}
