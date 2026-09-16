// 변이 · 새 기술을 만들지 않고 이미 가진 법칙의 성격만 바꾼다.
// 반사·분열·연쇄 세 법칙에만 있고, 법칙 하나당 변이 하나만 붙는다.
// 정원에서 그 법칙의 "꽃" 갈래를 키워야 여정 중에 변이 선택지가 열린다.
import {LAWS} from './laws.js';

export const MUTATION_LAWS=Object.freeze(['reflect','split','chain']);
export const KINDS=Object.freeze(['speed','rune','burst']);
export const KIND_INFO=Object.freeze({
 speed:{name:'빠름',badge:'⚡',tint:'speed'},
 rune:{name:'룬',badge:'❖',tint:'rune'},
 burst:{name:'폭발',badge:'✸',tint:'burst'}
});
export const MUTATION_PREFIX='mut:';
// 화면에 쓸 수치와 전투에서 쓰는 수치를 한곳에 둔다.
export const RUNE=Object.freeze({life:3,radius:1.5,every:.4,damage:9,max:8});
export const TUNE=Object.freeze({
 reflectSpeed:{perBounce:.25,cap:2,lifePerBounce:.35},
 reflectBurst:{radius:2,damage:24},
 splitSpeed:{scale:1.4,life:.5},
 splitBurst:{radius:1.4,damage:13},
 chainSpeed:{range:6,falloff:.62},
 chainBurst:{radius:1.8,damage:17}
});
export const MAX_SHOTS=150;

const M=(law,kind,name,desc)=>[`${law}:${kind}`,{id:`${law}:${kind}`,law,kind,name,desc,
 badge:KIND_INFO[kind].badge,lawName:LAWS[law].name,kindName:KIND_INFO[kind].name}];
export const MUTATIONS=Object.freeze(Object.fromEntries([
 M('reflect','speed','빠른 반사','튕길 때마다 탄이 빨라지고 더 멀리 날아갑니다'),
 M('reflect','rune','반사 룬','튕긴 자리에 룬이 남아 주변 적을 계속 태웁니다'),
 M('reflect','burst','반사 폭발','마지막으로 튕긴 자리에서 터집니다'),
 M('split','speed','빠른 분열','파편이 훨씬 빠르고 오래 날아갑니다'),
 M('split','rune','분열 룬','갈라진 자리에 룬이 남습니다'),
 M('split','burst','분열 폭발','파편이 사라질 때 작게 터집니다'),
 M('chain','speed','먼 연쇄','연쇄가 더 멀리 튀고 피해가 덜 줄어듭니다'),
 M('chain','rune','연쇄 룬','연쇄로 맞은 적 자리에 룬이 남습니다'),
 M('chain','burst','연쇄 폭발','마지막 연쇄 대상이 터집니다')
]));
export const MUTATION_IDS=Object.keys(MUTATIONS);

export const mutationChoice=id=>MUTATION_PREFIX+id;
export function parseMutationChoice(choice){
 if(typeof choice!=='string'||!choice.startsWith(MUTATION_PREFIX))return null;
 const id=choice.slice(MUTATION_PREFIX.length);
 return MUTATIONS[id]||null;
}
export const mutationOf=(mutations,law)=>{
 const kind=mutations instanceof Map?mutations.get(law):mutations?.[law];
 return kind&&MUTATIONS[`${law}:${kind}`]?MUTATIONS[`${law}:${kind}`]:null;
};
export const hasMutation=(mutations,law,kind)=>mutationOf(mutations,law)?.kind===kind;
// 그 법칙의 세 갈래 변이. 이미 붙어 있으면 더 제안하지 않는다.
export function mutationOffersFor(law){return KINDS.map(kind=>MUTATIONS[`${law}:${kind}`]).filter(Boolean);}
// 변이가 열리는 조건: 그 법칙을 어느 정도 키웠고(기본 Lv.2), 정원에서 그 법칙의 꽃이 자라 있고, 아직 변이가 없다.
export function eligibleMutationLaws({levels,mutations,gardenLaws=[],minLevel=2}={}){
 const level=id=>levels instanceof Map?levels.get(id)||0:levels?.[id]||0;
 return MUTATION_LAWS.filter(law=>gardenLaws.includes(law)&&level(law)>=minLevel&&!mutationOf(mutations,law));
}
// 선택지 세 장 중 한 장을 변이로 바꾼다(고를 수 있는 게 없으면 그대로).
export function withMutationOffer(offered,{levels,mutations,gardenLaws=[],random=Math.random,minLevel=2}={}){
 const laws=eligibleMutationLaws({levels,mutations,gardenLaws,minLevel});
 if(!laws.length)return offered;
 const law=laws[Math.floor(random()*laws.length)%laws.length];
 const pool=mutationOffersFor(law);
 const pick=pool[Math.floor(random()*pool.length)%pool.length];
 const next=[...offered];
 if(next.length<3)next.push(mutationChoice(pick.id));else next[next.length-1]=mutationChoice(pick.id);
 return next;
}
export function applyMutation(mutations,id){
 const info=MUTATIONS[id];
 if(!info)return false;
 if(mutations instanceof Map){if(mutationOf(mutations,info.law))return false;mutations.set(info.law,info.kind);return true;}
 return false;
}
// 저장/복원: {reflect:'rune'} 모양으로만 남긴다.
export function validMutations(value){
 if(value===undefined)return true;
 if(!value||typeof value!=='object'||Array.isArray(value))return false;
 return Object.entries(value).every(([law,kind])=>MUTATION_LAWS.includes(law)&&KINDS.includes(kind)&&MUTATIONS[`${law}:${kind}`]);
}
export function mutationsToSave(mutations){
 const out={};
 for(const law of MUTATION_LAWS){const info=mutationOf(mutations,law);if(info)out[law]=info.kind;}
 return out;
}
export function mutationsFromSave(value){
 const map=new Map();
 if(validMutations(value)&&value)for(const [law,kind] of Object.entries(value))map.set(law,kind);
 return map;
}
export function mutationLabel(mutations,law){
 const info=mutationOf(mutations,law);
 return info?`${info.badge} ${info.name}`:'';
}
// 전투에서 쓰는 값들. 변이가 없으면 원래 값 그대로다.
export function reflectBounceSpeed(mutations,bounces){
 if(!hasMutation(mutations,'reflect','speed'))return 1;
 return Math.min(TUNE.reflectSpeed.cap,1+TUNE.reflectSpeed.perBounce*Math.max(0,bounces));
}
export function chainRange(mutations,base=4){return hasMutation(mutations,'chain','speed')?TUNE.chainSpeed.range:base;}
export function chainFalloff(mutations,base=.5){return hasMutation(mutations,'chain','speed')?TUNE.chainSpeed.falloff:base;}
export function fragmentSpeedScale(mutations){return hasMutation(mutations,'split','speed')?TUNE.splitSpeed.scale:1;}
export function fragmentExtraLife(mutations){return hasMutation(mutations,'split','speed')?TUNE.splitSpeed.life:0;}
