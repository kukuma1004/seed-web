import {FORMS} from './forms.js';
import {lawArt} from './law-art.js';

export function formCard(form,held=[],discovered=false,selectable=true){
 const laws=new Set(held);
 return `<${selectable?'button':'article'} class="form-card" ${selectable?`data-form="${form.id}"`:''}>
 <div class="form-pair">${form.requires.map(id=>lawArt(id)).join('<span>＋</span>')}</div>
 <small>${discovered?'발견한 진화':'새로운 가능성'} · ${form.requires.filter(id=>laws.has(id)).length}/2 법칙</small>
 <strong>${form.name}</strong><p>${form.pair}</p><p>${form.desc}</p>
 <small class="form-strength">${form.strength}</small><small class="form-cost">${form.weakness}</small>
 </${selectable?'button':'article'}>`;
}
export function discoveryBook(profile){
 return `<p>씨앗의 기억 · ${profile.forms.length}/3 발견</p><h2>이번 도전이 남긴 것</h2>
 <p>발견은 쓰러져도 남습니다. 같은 기기·브라우저에 보관해요.<br>첫 발견: 다음 도전의 조합 목표 선택 · 세 가지 발견: 여정마다 선택지 새로고침 1회</p>
 <div class="form-cards">${Object.values(FORMS).map(f=>formCard(f,[],profile.forms.includes(f.id),false)).join('')}</div>
 <p>기억의 문지기 ${profile.bosses.includes('warden')?'격파 기록 있음':'미격파'}</p><button id="close-discoveries" class="primary">돌아가기</button>`;
}

export function formLawHint(id,activeForm){
 if(!activeForm)return '';
 if(FORMS[activeForm].requires.includes(id))return '현재 완성 진화의 재료 · 기본 법칙 효과는 진화 공격으로 전환';
 if(['reflect','split','recall','pierce'].includes(id))return '다른 진화의 재료 · 기본 탄환 조합으로 돌아가면 탄도 효과 활성';
 return '현재 진화에 보조 효과로 적용';
}
