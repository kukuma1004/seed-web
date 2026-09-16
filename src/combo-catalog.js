// The long-form SEED combination catalogue.
//
// Ten laws create 45 first fusions. Pairing two different first fusions creates
// 990 second fusions. This module deliberately contains data and deterministic
// visual genes only: combat can adopt it in small, testable steps without
// loading hundreds of textures or changing the current live progression.

const law=(id,name,word,trait,color,tile)=>Object.freeze({id,name,word,trait,color,tile});

export const COMBO_LAWS=Object.freeze([
 law('reflect','반사','거울','굴절','#73dfff',0),
 law('split','분열','꽃잎','증식','#ff947b',1),
 law('chain','연쇄','천둥','연결','#ffdc73',2),
 law('orbit','공전','성환','회전','#9ca8ff',3),
 law('pierce','관통','창날','관통','#e1ffad',4),
 law('burst','폭발','불꽃','파열','#ffad58',5),
 law('recall','귀환','회귀','왕복','#8dffcd',6),
 law('gravity','중력','특이점','끌림','#da9aff',7),
 law('frost','빙결','서리','동결','#9af0ff',8),
 law('portal','차원','별문','도약','#9b86ff',9)
]);

export const COMBO_LAW_BY_ID=Object.freeze(Object.fromEntries(COMBO_LAWS.map(v=>[v.id,v])));

// Curated Korean names keep the first 45 memorable. Keys follow COMBO_LAWS order.
const FIRST_NAMES=Object.freeze({
 'reflect+split':'프리즘 꽃',
 'reflect+chain':'천둥 거울',
 'reflect+orbit':'거울 성환',
 'reflect+pierce':'굴절 창',
 'reflect+burst':'태양 거울',
 'reflect+recall':'메아리 회랑',
 'reflect+gravity':'중력 렌즈',
 'reflect+frost':'서리 거울',
 'reflect+portal':'차원경',
 'split+chain':'번개 꽃잎',
 'split+orbit':'꽃잎 후광',
 'split+pierce':'꿰뚫는 꽃비',
 'split+burst':'씨앗 폭풍',
 'split+recall':'돌아오는 꽃',
 'split+gravity':'끌림 꽃밭',
 'split+frost':'서리 꽃잎',
 'split+portal':'문 너머 만개',
 'chain+orbit':'폭풍 왕관',
 'chain+pierce':'천둥 창',
 'chain+burst':'천둥 불꽃',
 'chain+recall':'되감는 번개',
 'chain+gravity':'폭풍의 눈',
 'chain+frost':'얼어붙은 그물',
 'chain+portal':'차원 번개',
 'orbit+pierce':'창날 고리',
 'orbit+burst':'태양 고리',
 'orbit+recall':'밀물 고리',
 'orbit+gravity':'강착 원반',
 'orbit+frost':'서리 위성',
 'orbit+portal':'별문 성환',
 'pierce+burst':'유성창',
 'pierce+recall':'귀환 칼날',
 'pierce+gravity':'중력 창',
 'pierce+frost':'고드름 창',
 'pierce+portal':'차원 관통자',
 'burst+recall':'되돌아오는 불꽃',
 'burst+gravity':'붕괴의 씨앗',
 'burst+frost':'서리 꽃봉오리',
 'burst+portal':'별문 화염',
 'recall+gravity':'귀환 해일',
 'recall+frost':'서리 되감기',
 'recall+portal':'무한 회귀문',
 'gravity+frost':'얼어붙은 블랙홀',
 'gravity+portal':'사건의 지평문',
 'frost+portal':'서리 차원문'
});

const hash=text=>{
 let value=2166136261;
 for(let i=0;i<text.length;i++)value=Math.imul(value^text.charCodeAt(i),16777619);
 return value>>>0;
};
const pad=value=>String(value).padStart(2,'0');

const first=[];
for(let a=0;a<COMBO_LAWS.length;a++)for(let b=a+1;b<COMBO_LAWS.length;b++){
 const A=COMBO_LAWS[a],B=COMBO_LAWS[b],index=first.length;
 const key=`${A.id}+${B.id}`,id=`f${pad(index+1)}-${A.id}-${B.id}`;
 first.push(Object.freeze({
  id,index,name:FIRST_NAMES[key],laws:Object.freeze([A.id,B.id]),
  pair:`${A.name} + ${B.name}`,
  mechanic:`${A.trait} 후 ${B.trait}`,
  visual:Object.freeze({coreTile:A.tile,shellTile:B.tile,projectileTile:hash(`${id}:shot`)%12,accent:A.color,secondary:B.color})
 }));
}

export const FIRST_FUSIONS=Object.freeze(first);
export const FIRST_FUSION_BY_ID=Object.freeze(Object.fromEntries(FIRST_FUSIONS.map(v=>[v.id,v])));

const second=[];
for(let a=0;a<FIRST_FUSIONS.length;a++)for(let b=a+1;b<FIRST_FUSIONS.length;b++){
 const A=FIRST_FUSIONS[a],B=FIRST_FUSIONS[b],shared=A.laws.filter(id=>B.laws.includes(id));
 const laws=[...new Set([...A.laws,...B.laws])];
 const index=second.length,id=`x${String(index+1).padStart(3,'0')}-${pad(a+1)}-${pad(b+1)}`;
 const family=shared.length?'resonance':'convergence';
 const sharedLaw=shared[0]||null;
 const dominant=COMBO_LAW_BY_ID[sharedLaw||laws[hash(`${id}:dominant`)%laws.length]];
 const h=hash(id);
 second.push(Object.freeze({
  id,index,name:`${A.name} × ${B.name}`,
  epithet:family==='resonance'
   ?`${COMBO_LAW_BY_ID[sharedLaw].word} 공명 · ${laws.filter(v=>v!==sharedLaw).map(v=>COMBO_LAW_BY_ID[v].word).join('·')}`
   :`${A.name}과 ${B.name}의 교차`,
  family,sharedLaw,
  parts:Object.freeze([A.id,B.id]),laws:Object.freeze(laws),
  rule:family==='resonance'
   ?`${dominant.trait}이 세 번째 적중마다 증폭되고, 두 조합의 후속 효과가 번갈아 발동합니다.`
   :`${A.name}이 표식을 남기면 ${B.name}이 소비해 교차 효과를 냅니다.`,
  // Only one primary trigger and one follow-up are allowed. This prevents four
  // inherited laws from multiplying every projectile/count bonus together.
  budget:Object.freeze({damage:1+(h%9)/100,interval:.96+((h>>>5)%9)/100,primary:A.id,followUp:B.id}),
  visual:Object.freeze({
   coreTile:hash(`${id}:core`)%12,
   shellTile:hash(`${id}:shell`)%12,
   projectileTile:hash(`${id}:projectile`)%12,
   accent:dominant.color,
   secondary:COMBO_LAW_BY_ID[laws[(laws.indexOf(dominant.id)+1)%laws.length]].color,
   mark:(h>>>12)%6
  })
 }));
}

export const SECOND_FUSIONS=Object.freeze(second);
export const SECOND_FUSION_BY_ID=Object.freeze(Object.fromEntries(SECOND_FUSIONS.map(v=>[v.id,v])));
export const COMBO_COUNTS=Object.freeze({laws:COMBO_LAWS.length,first:FIRST_FUSIONS.length,second:SECOND_FUSIONS.length});

export function secondFusionOf(firstA,firstB){
 if(firstA===firstB)return null;
 return SECOND_FUSIONS.find(v=>v.parts.includes(firstA)&&v.parts.includes(firstB))||null;
}

