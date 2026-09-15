import {FORMS,SOLO_FORMS,SOLO_LEVEL,AWAKEN_FORMS,TWIN_FORMS,ALL_FORMS} from './forms.js';
import {formArt} from './form-art.js';
import {SIGNATURES} from './actives.js';

export function formCard(form,held=[],discovered=false,selectable=true,level=0,current=0){
 const laws=new Set(held);
 return `<${selectable?'button':'article'} class="form-card" ${selectable?`data-form="${form.id}"`:''}>
 ${formArt(form.id,'form-portrait')}
 <small>${discovered?'발견한 진화':'새로운 가능성'}${selectable?' · '+(current?`보유 Lv.${current} → Lv.${level}`:level?'진화 Lv.'+level:form.requires.filter(id=>laws.has(id)).length+'/2 법칙'):''}</small>
 <strong>${form.name}</strong><p>${form.pair}</p><p>${form.desc}</p>
 <small class="form-strength">${form.strength}</small><small class="form-cost">${form.weakness}</small>
 </${selectable?'button':'article'}>`;
}
// Solo evolution offer: the law leaves its slot and the evolution takes it.
export function soloCard(form,lawLevel,current=0,discovered=false){
 const next=current+lawLevel-1;
 return `<button class="form-card solo-card" data-solo="${form.id}">
 ${formArt(form.id,'form-portrait')}
 <small>${discovered?'발견한 단독 진화':'새로운 단독 진화'} · ${current?`보유 Lv.${current} → Lv.${next}`:'진화 Lv.'+next}<span class="solo-tag">단독</span></small>
 <strong>${form.name}</strong><p>${form.pair} · 법칙 Lv.${lawLevel}</p><p>${form.desc}</p>
 <small class="form-strength">${form.strength}</small><small class="form-cost">${form.weakness}</small>
 </button>`;
}
// Awakening offer: two held evolutions (or one feeding an awakened evolution already held) become the awakened evolution.
export function awakenCard(option,forms,level,discovered=false,index=0){
 const form=ALL_FORMS[option.id],current=forms.get(option.id)||0;
 const parts=option.from.map(id=>`${ALL_FORMS[id].name} Lv.${forms.get(id)}`).join(' + ');
 return `<button class="form-card awaken-card" data-awaken="${index}">
 ${formArt(form.id,'form-portrait')}
 <small>${discovered?'발견한 각성 진화':'새로운 각성 진화'} · ${current?`보유 Lv.${current} → Lv.${level}`:'진화 Lv.'+level}<span class="awaken-tag">각성</span></small>
 <strong>${form.name}</strong><p>${parts}</p><p>${form.desc}</p>${form.synergy?`<small class="twin-synergy">${form.synergy.name} · 두 공격이 ${form.synergy.window}초 안에 같은 적을 맞히면 추가 피해와 두 성질이 함께 발동</small>`:''}
 <small class="form-strength">${form.strength}</small><small class="form-cost">${form.weakness}</small>
 </button>`;
}
export function discoveryBook(profile,titles=null){
 const total=Object.keys(ALL_FORMS).length;
 // Every entry opens its page: a found evolution shows its whole description, an unfound one only its recipe.
 const entry=f=>{const known=profile.forms.includes(f.id);return `<button type="button" class="form-card book-entry ${known?'':'unknown'}" data-book="${f.id}" data-known="${known?1:0}" aria-label="${known?f.name:'아직 발견하지 못한 진화'} 자세히 보기">${formArt(f.id,'form-portrait')}<strong>${known?f.name:'？？？'}</strong><p>${f.pair}</p></button>`;};
 const goal=titles?.next?`<p class="codex-goal">도감 ${titles.next.need}개 더 발견하면 ${titles.next.reward}</p>`:'';
 const held=titles?.titles?.length?`<p class="codex-goal">${titles.titles.map(t=>`${t.name} · ${t.perk}`).join('<br>')}</p>`:'';
 const section=(title,list)=>`<h3 class="book-title">${title} <span>${list.filter(f=>profile.forms.includes(f.id)).length}/${list.length}</span></h3><div class="form-cards book">${list.map(entry).join('')}</div>`;
 // One scroll area for every section, so a short phone screen never squeezes the four grids.
 return `<p>씨앗의 도감 · ${profile.forms.length}/${total} 발견</p><h2>씨앗의 도감</h2>${held}${goal}
 <div class="book-scroll">
 ${section('완성 진화 · 두 법칙을 합치기',Object.values(FORMS))}
 ${section(`단독 진화 · 한 법칙을 Lv.${SOLO_LEVEL}까지`,Object.values(SOLO_FORMS))}
 ${section('각성 진화 · 완성 진화 + 재료의 단독 진화, 또는 두 재료의 단독 진화',Object.values(AWAKEN_FORMS))}
 ${section('쌍둥이 각성 · 레시피가 없는 두 단독 진화',Object.values(TWIN_FORMS))}
 </div>
 <p class="form-note">찾은 진화를 누르면 자세한 설명을 볼 수 있어요 · 발견은 쓰러져도 같은 기기·브라우저에 남습니다</p><button id="close-discoveries" class="primary">돌아가기</button>
 <div id="book-detail" class="book-detail" hidden></div>`;
}

const KIND_NAMES={fusion:'완성 진화',solo:'단독 진화',awakened:'각성 진화',twin:'쌍둥이 각성'};
const kindOf=f=>f.twin?'twin':f.awakened?'awakened':f.solo?'solo':'fusion';
const RECIPES={
 fusion:f=>`${f.pair} 법칙을 함께 가지고 있을 때 합칠 수 있어요`,
 solo:f=>`${f.pair.replace(' 단독 진화','')} 법칙을 Lv.${SOLO_LEVEL}까지 키우면 혼자 진화해요`,
 awakened:f=>{const base=FORMS[f.base],solos=Object.values(SOLO_FORMS).filter(s=>base.requires.includes(s.requires[0])).map(s=>s.name);return `${base.name} + ${solos.join(' 또는 ')}, 또는 ${solos.join(' + ')}`;},
 twin:f=>`${f.pair} (두 단독 진화를 함께 가지고 있을 때)`
};
// The page for one codex entry.
export function bookPage(id,known=true){
 const f=ALL_FORMS[id];if(!f)return '';
 const kind=kindOf(f),recipe=RECIPES[kind](f),sig=SIGNATURES[id];
 if(!known)return `<div class="book-detail-card unknown" role="dialog" aria-modal="true" aria-label="아직 발견하지 못한 진화"><div class="book-detail-art">${formArt(id,'form-portrait')}</div><div class="book-detail-text"><small>${KIND_NAMES[kind]}</small><h3>？？？</h3><p class="book-recipe">얻는 법 · ${recipe}</p><p>아직 발견하지 못했어요. 한 번 얻으면 설명이 열립니다.</p></div><button type="button" class="primary book-detail-close">닫기</button></div>`;
 const lines=[
  `<p class="book-desc">${f.desc}</p>`,
  `<p class="form-strength">강점 · ${f.strength}</p>`,
  `<p class="form-cost">약점 · ${f.weakness}</p>`,
  f.awakened?`<p>10초마다 여는 기술을 스스로 씁니다${f.twin?' (두 진화가 번갈아)':''}.</p>`:'',
  f.synergy?`<p class="book-synergy">${f.synergy.name} · 두 공격이 ${f.synergy.window}초 안에 같은 적을 맞히면 추가 피해 +${Math.round(f.synergy.bonus*100)}%</p>`:'',
  f.passive?'<p>공격 버튼 없이 씨앗 곁에서 스스로 싸웁니다.</p>':'',
  sig?`<p class="book-signature">궁극기 · <strong>${sig.name}</strong><br>${sig.desc}</p>`:''
 ].filter(Boolean).join('');
 return `<div class="book-detail-card" role="dialog" aria-modal="true" aria-label="${f.name}"><div class="book-detail-art">${formArt(id,'form-portrait')}</div><div class="book-detail-text"><small>${KIND_NAMES[kind]} · ${f.pair}</small><h3>${f.name}</h3>${lines}<p class="book-recipe">얻는 법 · ${recipe}</p></div><button type="button" class="primary book-detail-close">닫기</button></div>`;
}
// One listener for the codex pages: open on an entry, close on the button, the dimmed backdrop or Escape.
if(typeof document!=='undefined'&&!document.__seedBookPages){
 document.__seedBookPages=true;
 const close=panel=>{panel.hidden=true;panel.innerHTML='';};
 document.addEventListener('click',event=>{
  const panel=document.querySelector('#book-detail');if(!panel)return;
  if(event.target.closest?.('.book-detail-close')||event.target===panel){close(panel);return;}
  const entry=event.target.closest?.('[data-book]');if(!entry)return;
  panel.innerHTML=bookPage(entry.dataset.book,entry.dataset.known==='1');panel.hidden=false;panel.querySelector('.book-detail-close')?.focus({preventScroll:true});
 });
 document.addEventListener('keydown',event=>{const panel=document.querySelector('#book-detail');if(event.key==='Escape'&&panel&&!panel.hidden){event.stopPropagation();close(panel);}},true);
}

// On a law card: which forms this law would make possible with what is already held.
export function formLawHint(id,held){
 const laws=new Set(held);
 if(laws.has(id))return '';
 const opens=Object.values(FORMS).filter(f=>f.requires.includes(id)&&f.requires.every(r=>r===id||laws.has(r)));
 return opens.length?`진화 가능: ${opens.map(f=>f.name).join(' · ')}`:'';
}
