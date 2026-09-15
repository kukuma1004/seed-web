import {FORMS,SOLO_FORMS,SOLO_LEVEL,AWAKEN_FORMS,ALL_FORMS} from './forms.js';
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
 const form=AWAKEN_FORMS[option.id],current=forms.get(option.id)||0;
 const parts=option.from.map(id=>`${ALL_FORMS[id].name} Lv.${forms.get(id)}`).join(' + ');
 return `<button class="form-card awaken-card" data-awaken="${index}">
 ${formArt(form.id,'form-portrait')}
 <small>${discovered?'발견한 각성 진화':'새로운 각성 진화'} · ${current?`보유 Lv.${current} → Lv.${level}`:'진화 Lv.'+level}<span class="awaken-tag">각성</span></small>
 <strong>${form.name}</strong><p>${parts}</p><p>${form.desc}</p>
 <small class="form-strength">${form.strength}</small><small class="form-cost">${form.weakness}</small>
 </button>`;
}
export function discoveryBook(profile){
 const total=Object.keys(ALL_FORMS).length;
 const entry=f=>{const known=profile.forms.includes(f.id);return `<article class="form-card book-entry ${known?'':'unknown'}" title="${known?f.desc:'아직 발견하지 못한 진화'}">${formArt(f.id,'form-portrait')}<strong>${known?f.name:'？？？'}</strong><p>${f.pair}</p></article>`;};
 return `<p>씨앗의 기억 · ${profile.forms.length}/${total} 발견</p><h2>이번 도전이 남긴 것</h2>
 <p>발견은 쓰러져도 남습니다. 같은 기기·브라우저에 보관해요.<br>첫 발견: 다음 도전의 조합 목표 선택 · 세 가지 발견: 여정마다 선택지 새로고침 1회<br>진화는 재료 두 법칙을 강화할수록 레벨이 오르고, 레벨에는 끝이 없습니다.</p>
 <div class="form-cards book">${Object.values(FORMS).map(entry).join('')}</div>
 <p>단독 진화 · 한 법칙을 Lv.${SOLO_LEVEL}까지 키우면 그 법칙 혼자 진화합니다</p><div class="form-cards book">${Object.values(SOLO_FORMS).map(entry).join('')}</div>
 <p>각성 진화 · 완성 진화와 그 재료 법칙의 단독 진화(또는 두 재료의 단독 진화)를 합치면 깨어납니다</p><div class="form-cards book">${Object.values(AWAKEN_FORMS).map(entry).join('')}</div>
 <p>기억의 문지기 ${profile.bosses.includes('warden')?'격파 기록 있음':'미격파'}</p><button id="close-discoveries" class="primary">돌아가기</button>`;
}

// On a law card: which forms this law would make possible with what is already held.
export function formLawHint(id,held){
 const laws=new Set(held);
 if(laws.has(id))return '';
 const opens=Object.values(FORMS).filter(f=>f.requires.includes(id)&&f.requires.every(r=>r===id||laws.has(r)));
 return opens.length?`진화 가능: ${opens.map(f=>f.name).join(' · ')}`:'';
}
