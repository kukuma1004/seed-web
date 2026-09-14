import {FORMS} from './forms.js';
import {lawArt} from './law-art.js';

export function formCard(form,held=[],discovered=false,selectable=true,level=0){
 const laws=new Set(held);
 return `<${selectable?'button':'article'} class="form-card" ${selectable?`data-form="${form.id}"`:''}>
 <div class="form-pair">${form.requires.map(id=>lawArt(id)).join('<span>＋</span>')}</div>
 <small>${discovered?'발견한 진화':'새로운 가능성'}${selectable?' · '+(level?'진화 Lv.'+level:form.requires.filter(id=>laws.has(id)).length+'/2 법칙'):''}</small>
 <strong>${form.name}</strong><p>${form.pair}</p><p>${form.desc}</p>
 <small class="form-strength">${form.strength}</small><small class="form-cost">${form.weakness}</small>
 </${selectable?'button':'article'}>`;
}
export function discoveryBook(profile){
 const total=Object.keys(FORMS).length;
 return `<p>씨앗의 기억 · ${profile.forms.length}/${total} 발견</p><h2>이번 도전이 남긴 것</h2>
 <p>발견은 쓰러져도 남습니다. 같은 기기·브라우저에 보관해요.<br>첫 발견: 다음 도전의 조합 목표 선택 · 세 가지 발견: 여정마다 선택지 새로고침 1회<br>진화는 재료 두 법칙을 강화할수록 레벨이 오르고, 레벨에는 끝이 없습니다.</p>
 <div class="form-cards book">${Object.values(FORMS).map(f=>{const known=profile.forms.includes(f.id);return `<article class="form-card book-entry ${known?'':'unknown'}" title="${known?f.desc:'아직 발견하지 못한 진화'}"><div class="form-pair">${f.requires.map(id=>lawArt(id)).join('<span>＋</span>')}</div><strong>${known?f.name:'？？？'}</strong><p>${f.pair}</p></article>`;}).join('')}</div>
 <p>기억의 문지기 ${profile.bosses.includes('warden')?'격파 기록 있음':'미격파'}</p><button id="close-discoveries" class="primary">돌아가기</button>`;
}

export function formLawHint(id,activeForm,level=0){
 if(!activeForm)return '';
 if(FORMS[activeForm].requires.includes(id))return `${FORMS[activeForm].name}의 재료 · 강화하면 진화 Lv.${level} → ${level+1}`;
 if(['reflect','split','recall','pierce'].includes(id))return '진화 중에는 쉬는 탄도 법칙 · 다른 진화의 재료';
 return '현재 진화에 보조 효과로 적용';
}
