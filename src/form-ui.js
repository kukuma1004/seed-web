import {FORMS,SOLO_FORMS,SOLO_LEVEL} from './forms.js';
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
export function discoveryBook(profile){
 const total=Object.keys(FORMS).length+Object.keys(SOLO_FORMS).length;
 const entry=f=>{const known=profile.forms.includes(f.id);return `<article class="form-card book-entry ${known?'':'unknown'}" title="${known?f.desc:'아직 발견하지 못한 진화'}">${formArt(f.id,'form-portrait')}<strong>${known?f.name:'？？？'}</strong><p>${f.pair}</p></article>`;};
 return `<p>씨앗의 기억 · ${profile.forms.length}/${total} 발견</p><h2>이번 도전이 남긴 것</h2>
 <p>발견은 쓰러져도 남습니다. 같은 기기·브라우저에 보관해요.<br>첫 발견: 다음 도전의 조합 목표 선택 · 세 가지 발견: 여정마다 선택지 새로고침 1회<br>진화는 재료 두 법칙을 강화할수록 레벨이 오르고, 레벨에는 끝이 없습니다.</p>
 <div class="form-cards book">${Object.values(FORMS).map(entry).join('')}</div>
 <p>단독 진화 · 한 법칙을 Lv.${SOLO_LEVEL}까지 키우면 그 법칙 혼자 진화합니다</p><div class="form-cards book">${Object.values(SOLO_FORMS).map(entry).join('')}</div>
 <p>기억의 문지기 ${profile.bosses.includes('warden')?'격파 기록 있음':'미격파'}</p><button id="close-discoveries" class="primary">돌아가기</button>`;
}

// On a law card: which forms this law would make possible with what is already held.
export function formLawHint(id,held){
 const laws=new Set(held);
 if(laws.has(id))return '';
 const opens=Object.values(FORMS).filter(f=>f.requires.includes(id)&&f.requires.every(r=>r===id||laws.has(r)));
 return opens.length?`진화 가능: ${opens.map(f=>f.name).join(' · ')}`:'';
}
