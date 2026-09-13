export const LAWS={
 reflect:{name:'반사',form:'거울 껍질',icon:'◈',color:0x73dfff,desc:'벽에서 두 번 튕겨 돌아오는 탄환',upgrade:'반사 2 → 4회',hint:'벽을 이용해 뒤쪽 적까지 맞히세요'},
 split:{name:'분열',form:'갈라진 꽃',icon:'✣',color:0xff947b,desc:'적중하면 세 갈래 파편으로 퍼집니다',upgrade:'파편 3 → 5개',hint:'앞의 적을 맞혀 뒤쪽 무리로 파편을 보내세요'},
 chain:{name:'연쇄',form:'번개 가지',icon:'ϟ',color:0xffdc73,desc:'가까운 두 적에게 절반 피해의 번개가 연결됩니다',upgrade:'연쇄 2 → 3명',hint:'가까이 모인 적들 사이로 번개를 이어보세요'},
 orbit:{name:'공전',form:'위성 꽃잎',icon:'◎',color:0x9ca8ff,desc:'두 꽃잎이 주위를 돌며 가까운 적을 때립니다',upgrade:'꽃잎 2 → 3개 · 반경 확대',hint:'주위를 도는 꽃잎으로 가까이 붙은 적을 밀어내세요'},
 pierce:{name:'관통',form:'유리 가시',icon:'➶',color:0xe1ffad,desc:'탄환 하나가 서로 다른 적 세 명을 관통합니다',upgrade:'관통 3 → 5명',hint:'적들을 한 줄로 모아 꿰뚫으세요'},
 burst:{name:'폭발',form:'불꽃 열매',icon:'✺',color:0xffad58,desc:'적중점 주변에 폭발 피해를 줍니다',upgrade:'폭발 반경 1.5 → 2.1',hint:'무리의 가운데를 맞혀 주변까지 터뜨리세요'},
 recall:{name:'귀환',form:'돌아오는 잎',icon:'↶',color:0x8dffcd,desc:'날아간 탄환이 돌아오며 한 번 더 적을 맞힙니다',upgrade:'귀환 피해 +50%',hint:'탄환이 돌아오는 길에 적을 놓으세요'},
 gravity:{name:'중력',form:'밤의 씨방',icon:'◉',color:0xda9aff,desc:'적중점에 작은 소용돌이를 남겨 적을 모읍니다',upgrade:'흡인 반경 2.2 → 3',hint:'적을 모아 분열·폭발·연쇄를 이어보세요'},
 frost:{name:'빙결',form:'서리 봉오리',icon:'❄',color:0x9af0ff,desc:'맞은 적의 움직임과 공격을 1.3초 동안 늦춥니다',upgrade:'둔화 40% → 60% · 지속 연장',hint:'빠른 적을 늦춰 포위망에 틈을 만드세요'}
};
export const SYNERGIES=[
 ['gravity','burst','모인 적을 한꺼번에 폭발'],['gravity','chain','모은 무리 사이에 번개 연결'],['pierce','split','관통할 때마다 갈라지는 파편'],['recall','pierce','왕복하며 적의 열을 관통'],['orbit','frost','가까운 적을 꽃잎으로 둔화'],['burst','frost','폭발 범위의 적에게 서리'],['reflect','recall','벽을 튕긴 뒤 다시 귀환'],['split','burst','퍼진 파편에도 작은 폭발']
];
export function synergyHint(id,held){return SYNERGIES.filter(([a,b])=>a===id&&held.includes(b)||b===id&&held.includes(a)).map(x=>x[2]).slice(0,2).join(' · ')||LAWS[id].hint;}
export function offerLaws(held,mutated=[],{mutation=false,random=Math.random}={}){
 const known=[...held],upgraded=[...mutated];
 let pool=Object.keys(LAWS).filter(id=>known.includes(id)?!upgraded.includes(id):!mutation&&known.length<5);
 if(mutation&&pool.length===0)pool=Object.keys(LAWS).filter(id=>!known.includes(id)&&known.length<5);
 for(let i=pool.length-1;i>0;i--){const j=Math.floor(random()*(i+1));[pool[i],pool[j]]=[pool[j],pool[i]];}
 // A fresh law is always offered while there is room to grow.
 if(!mutation&&known.length<5&&!pool.slice(0,3).some(id=>!known.includes(id))){const at=pool.findIndex(id=>!known.includes(id));if(at>=0)[pool[0],pool[at]]=[pool[at],pool[0]];}
 return pool.slice(0,3);
}
export function hitBudget(held,mutated){return held.has('pierce')?(mutated.has('pierce')?5:3):1;}
export function acquireTarget(player,enemies,covers,blocked,maxDistance=13){
 return enemies.filter(e=>!e.dead&&Math.hypot(e.g.position.x-player.x,e.g.position.z-player.z)<maxDistance&&!blocked(player,e.g.position,covers,.1)).sort((a,b)=>a.g.position.distanceToSquared(player)-b.g.position.distanceToSquared(player))[0]||null;
}
