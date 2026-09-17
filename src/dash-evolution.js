export const BASE_DASH=Object.freeze({charges:1,recharge:2.4,duration:.2,speed:17,invuln:.32});

export const DASH_EVOLUTIONS=Object.freeze({
 twinsprout:Object.freeze({id:'twinsprout',name:'쌍싹 회피',mark:'◇◇',tag:'두 번 연속',desc:'회피를 두 번 저장합니다. 빈 충전은 기본 회피와 같은 2.4초마다 하나씩 돌아옵니다.',strength:'빽빽한 탄막을 연속으로 빠져나감',charges:2,recharge:2.4,duration:.2,speed:17,invuln:.32}),
 longroot:Object.freeze({id:'longroot',name:'긴뿌리 도약',mark:'➶',tag:'거리 증가',desc:'기본 회피와 같은 2.4초마다, 더 빠르고 38% 멀리 뻗어 나갑니다.',strength:'넓은 장판과 문지기 돌진에서 단숨에 벗어남',charges:1,recharge:2.4,duration:.24,speed:19.55,invuln:.34}),
 molt:Object.freeze({id:'molt',name:'허물 벗기',mark:'◈',tag:'무적 증가',desc:'기본 회피와 같은 2.4초마다, 회피가 끝난 뒤에도 무적이 더 오래 이어집니다(0.32초 → 0.5초).',strength:'정확한 순간에 쓰면 겹친 탄환과 폭발까지 넘김',charges:1,recharge:2.4,duration:.2,speed:17,invuln:.5})
});

export const validDashEvolution=id=>id===undefined||id===null||Object.hasOwn(DASH_EVOLUTIONS,id);
export const dashSpec=id=>DASH_EVOLUTIONS[id]||BASE_DASH;

export function createDashState(id=null){
 const evolution=Object.hasOwn(DASH_EVOLUTIONS,id)?id:null,spec=dashSpec(evolution);
 return {id:evolution,charges:spec.charges,recharge:0};
}

export function tickDash(state,dt){
 const spec=dashSpec(state.id);
 if(state.charges>=spec.charges){state.charges=spec.charges;state.recharge=0;return state;}
 state.recharge=Math.max(0,state.recharge-Math.max(0,dt||0));
 if(state.recharge<=0){state.charges++;state.recharge=state.charges<spec.charges?spec.recharge:0;}
 return state;
}

export function spendDash(state){
 const spec=dashSpec(state.id);
 if(state.charges<=0)return null;
 state.charges--;
 if(state.recharge<=0)state.recharge=spec.recharge;
 return spec;
}

export function dashMeter(state){
 const spec=dashSpec(state.id);
 return {id:state.id,charges:state.charges,maxCharges:spec.charges,recharge:state.recharge,rechargeSeconds:spec.recharge,fill:state.charges>=spec.charges?1:Math.max(0,Math.min(1,1-state.recharge/spec.recharge)),ready:state.charges>0};
}

export function dashEvolutionCards(){
 return Object.values(DASH_EVOLUTIONS).map(d=>`<button class="dash-evolution-card" data-dash-evolution="${d.id}"><span class="dash-mark" aria-hidden="true">${d.mark}</span><small>${d.tag}</small><strong>${d.name}</strong><p>${d.desc}</p><b>${d.strength}</b></button>`).join('');
}

export function dashEvolutionSummary(state){
 const d=DASH_EVOLUTIONS[state?.id];if(!d)return '';
 return `<section class="item-bag dash-evolution-summary"><h3>회피 진화 · ${d.name}</h3><p><span class="dash-summary-mark">${d.mark}</span>${d.desc}<br><small>${d.strength}</small></p></section>`;
}
