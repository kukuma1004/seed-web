import {FORMS,SOLO_FORMS,SOLO_LEVEL,AWAKEN_FORMS,TWIN_FORMS,ALL_FORMS} from './forms.js';
import {formArt} from './form-art.js';

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
 <strong>${form.name}</strong><p>${parts}</p><p>${form.desc}</p>
 <small class="form-strength">${form.strength}</small><small class="form-cost">${form.weakness}</small>
 </button>`;
}
export function discoveryBook(profile,titles=null){
 const total=Object.keys(ALL_FORMS).length;
 const entry=f=>{const known=profile.forms.includes(f.id);return `<article class="form-card book-entry ${known?'':'unknown'}" title="${known?f.desc:'아직 발견하지 못한 진화'}">${formArt(f.id,'form-portrait')}<strong>${known?f.name:'？？？'}</strong><p>${f.pair}</p></article>`;};
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
 <p class="form-note">발견은 쓰러져도 같은 기기·브라우저에 남습니다</p><button id="close-discoveries" class="primary">돌아가기</button>`;
}

// On a law card: which forms this law would make possible with what is already held.
export function formLawHint(id,held){
 const laws=new Set(held);
 if(laws.has(id))return '';
 const opens=Object.values(FORMS).filter(f=>f.requires.includes(id)&&f.requires.every(r=>r===id||laws.has(r)));
 return opens.length?`진화 가능: ${opens.map(f=>f.name).join(' · ')}`:'';
}
