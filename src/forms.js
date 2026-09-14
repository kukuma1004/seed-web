export const FORMS=Object.freeze({
 collapse:Object.freeze({id:'collapse',name:'붕괴의 씨앗',requires:Object.freeze(['gravity','burst']),pair:'중력 + 폭발',desc:'느린 씨앗탄이 적을 모은 뒤 한꺼번에 붕괴합니다.',strength:'밀집한 적을 모아 한 번에 처치',weakness:'발사가 느려 흩어진 적과 빠른 접근에 취약'}),
 frostguard:Object.freeze({id:'frostguard',name:'서리 위성',requires:Object.freeze(['orbit','frost']),pair:'공전 + 빙결',desc:'커다란 서리 위성이 가까운 적을 늦추고 밀어냅니다.',strength:'가까이 몰려드는 적을 제압',weakness:'멀리 떨어진 사격 적을 상대하기 어려움'}),
 returnblade:Object.freeze({id:'returnblade',name:'귀환의 칼날',requires:Object.freeze(['recall','pierce']),pair:'귀환 + 관통',desc:'큰 칼날이 적의 열을 관통하고 씨앗에게 돌아옵니다.',strength:'움직임으로 귀환 경로를 바꾸어 왕복 타격',weakness:'적을 경로에 모으지 못하면 화력 손실'})
});

export function isFormEligible(id,held){
 const form=Object.hasOwn(FORMS,id)?FORMS[id]:null;
 const laws=new Set(Array.isArray(held)||held instanceof Set?held:[]);
 return Boolean(form&&form.requires.every(law=>laws.has(law)));
}

// This reports alternatives. The run owns a single selected form ID.
export function eligibleForms(held){return Object.values(FORMS).filter(form=>isFormEligible(form.id,held));}
