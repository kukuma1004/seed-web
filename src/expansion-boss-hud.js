import {expansionBossMove} from './act-expansion-runtime.js';

// Read the same authored move as the attack engine. All copy is allocated once;
// the HUD selects a shared immutable record, never a second combat state.
const copy=(move,hint,intent)=>Object.freeze({move,hint,intent});
const fallback={
 crosswindKeeper:copy('횡풍의 움직임','공격 예고를 읽고 옆으로 피하세요','preparing'),
 crystalGardener:copy('수정의 움직임','공격 예고를 읽고 꽃심이 열리는 틈을 살피세요','preparing')
};
const opening={
 crosswindKeeper:copy('결전 시작','사선과 뒤쪽 잎배의 예고를 살피세요','preparing'),
 crystalGardener:copy('결전 시작','수정의 예고를 읽고 꽃심이 열리는 틈을 살피세요','preparing')
};
const moves={};
for(const id of ['crosswindKeeper','crystalGardener']){
 const crystal=id==='crystalGardener';moves[id]=[];
 for(let pattern=0;pattern<3;pattern++){
  const move=expansionBossMove({id,pattern});
  const tellHint=crystal&&pattern===2?'빈 줄로 이동 · 꽃심이 열리면 반격하세요':move.hint;
  const recovery=crystal?'다음 예고를 살피세요 · 꽃심은 아직 닫혀 있어요':'회복 중 피해 +35% · 남은 탄환은 계속 피하세요';
  moves[id].push(Object.freeze({
   tell:copy(move.name+' · 준비',tellHint,'preparing'),
   attack:copy(move.name+' · 공격',move.hint,'attack'),
   recover:copy(move.name+' · 회복',recovery,crystal?'preparing':'recovery'),
   // Open-core attack still emits real projectiles. Do not call it a safe
   // recovery, or infer the +30% window from pattern/name alone.
   openAttack:copy(move.name+' · 공격','탄막을 피하며 반격 · 꽃심 피해 +30%','open'),
   openRecover:copy('꽃심 개방 · 반격','열린 꽃심 피해 +30% · 남은 탄환 주의','open'),
   siegeAttack:copy(move.name+' · 공격','자라난 수정과 습격대 · 정원의 심장도 살피세요','attack'),
   siegeRecover:copy(move.name+' · 회복','재생 습격대는 심장 전에 끊으세요 · 꽃심은 닫혀 있어요','preparing')
  }));
 }
 Object.freeze(moves[id]);
}
Object.freeze(moves);
const unknown=copy('보스의 움직임','보스의 공격 예고를 살피세요','preparing');

export function expansionBossHud(actor,siege=false){
 const model=actor?.expansionMotion,id=model?.id||actor?.type;
 if(!Object.hasOwn(moves,id))return unknown;
 if(!model||!Number.isInteger(model.pattern)||model.pattern<0||model.pattern>2)return model?.pattern===-1?opening[id]:fallback[id];
 const move=moves[id][model.pattern],state=model.state;
 if(state==='tell')return move.tell;
 if(state==='attack')return id==='crystalGardener'&&model.out?.coreOpen===true?move.openAttack:siege&&id==='crystalGardener'&&model.pattern===1?move.siegeAttack:move.attack;
 if(state==='recover')return id==='crystalGardener'&&model.out?.coreOpen===true?move.openRecover:siege&&id==='crystalGardener'&&model.pattern===1?move.siegeRecover:move.recover;
 return fallback[id];
}
